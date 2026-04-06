const { Telegraf } = require('telegraf');
const Anthropic    = require('@anthropic-ai/sdk');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const bot      = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ai       = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ALLOWED  = (process.env.TELEGRAM_ALLOWED_IDS || '').split(',').map(s => parseInt(s)).filter(Boolean);
const PROJ     = process.env.PROJECT_DIR || '/root/solbid';
const MODEL    = 'claude-sonnet-4-6';

// Per-chat conversation history (last 40 messages)
const history  = new Map();

// ── Tools ─────────────────────────────────────────────────────────
const tools = [
  {
    name: 'bash',
    description: 'Run a shell command in the project directory. Use for git, npm, pm2, etc.',
    input_schema: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a file. Path relative to project root.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write or overwrite a file. Path relative to project root.',
    input_schema: {
      type: 'object',
      properties: {
        path:    { type: 'string' },
        content: { type: 'string' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files in a directory. Path relative to project root.',
    input_schema: {
      type: 'object',
      properties: { dir: { type: 'string' } },
      required: ['dir'],
    },
  },
];

function runTool(name, input) {
  try {
    if (name === 'bash') {
      const out = execSync(input.command, {
        cwd: PROJ,
        timeout: 120_000,
        encoding: 'utf8',
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return (out || '(no output)').slice(0, 8000);
    }
    if (name === 'read_file') {
      const abs = path.resolve(PROJ, input.path);
      if (!abs.startsWith(PROJ)) return 'Error: path outside project';
      return fs.readFileSync(abs, 'utf8').slice(0, 20000);
    }
    if (name === 'write_file') {
      const abs = path.resolve(PROJ, input.path);
      if (!abs.startsWith(PROJ)) return 'Error: path outside project';
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, input.content, 'utf8');
      return `✓ wrote ${input.path}`;
    }
    if (name === 'list_files') {
      const abs = path.resolve(PROJ, input.dir);
      if (!abs.startsWith(PROJ)) return 'Error: path outside project';
      return fs.readdirSync(abs).join('\n');
    }
    return 'Unknown tool';
  } catch (e) {
    return `Error: ${e.stderr || e.message}`;
  }
}

const SYSTEM = `You are a coding assistant with full control over the pennyBid project at ${PROJ}.
Stack: Node.js/Express + Socket.io + SQLite backend (dev-server.js), Vite + React + TypeScript frontend (src/).
Deployed on Hetzner, behind Caddy, pm2 process named "solbid".

When making changes:
1. Read relevant files first to understand existing code
2. Edit files with write_file
3. If frontend changed: run \`npm run build\`
4. Restart server: \`pm2 restart solbid\`
5. Commit and push: \`git add -A && git commit -m "..." && git push\`

Be concise in responses. Confirm what was done.`;

// ── Send long text (Telegram 4096 char limit) ─────────────────────
async function sendText(ctx, chatId, msgId, text) {
  const clean = text.replace(/[_*[\]()~`>#+=|{}.!-]/g, (c) => '\\' + c);
  const chunks = [];
  for (let i = 0; i < text.length; i += 4000) chunks.push(text.slice(i, i + 4000));

  try {
    await ctx.telegram.editMessageText(chatId, msgId, null, chunks[0]);
  } catch {
    await ctx.reply(chunks[0]);
  }
  for (let i = 1; i < chunks.length; i++) {
    await ctx.reply(chunks[i]);
  }
}

// ── Message handler ────────────────────────────────────────────────
bot.command('start', (ctx) => ctx.reply('👾 pennyBid dev bot ready.\n\nSend me a task and I\'ll edit files and push to git.\n/new — reset conversation'));
bot.command('new',   (ctx) => { history.delete(ctx.chat.id); ctx.reply('🔄 Conversation reset.'); });

bot.on('text', async (ctx) => {
  const uid = ctx.from.id;
  if (ALLOWED.length > 0 && !ALLOWED.includes(uid)) return;

  const chatId = ctx.chat.id;
  const text   = ctx.message.text;
  if (text.startsWith('/')) return;

  if (!history.has(chatId)) history.set(chatId, []);
  const msgs = history.get(chatId);
  msgs.push({ role: 'user', content: text });

  // Keep last 40 messages to avoid token overflow
  if (msgs.length > 40) msgs.splice(0, msgs.length - 40);

  const statusMsg = await ctx.reply('⚙️ Thinking…');

  try {
    const working = [...msgs];
    let response;

    while (true) {
      response = await ai.messages.create({
        model:      MODEL,
        max_tokens: 8096,
        system:     SYSTEM,
        messages:   working,
        tools,
      });

      if (response.stop_reason === 'tool_use') {
        working.push({ role: 'assistant', content: response.content });
        const results = [];
        for (const blk of response.content) {
          if (blk.type !== 'tool_use') continue;
          // Show which tool is running
          try {
            await ctx.telegram.editMessageText(chatId, statusMsg.message_id, null,
              `⚙️ Running: \`${blk.name}\`\n${blk.input.command || blk.input.path || blk.input.dir || ''}`);
          } catch {}
          const out = runTool(blk.name, blk.input);
          results.push({ type: 'tool_result', tool_use_id: blk.id, content: out });
        }
        working.push({ role: 'user', content: results });
      } else {
        break;
      }
    }

    const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n') || '✅ Done';
    msgs.push({ role: 'assistant', content: response.content });

    await sendText(ctx, chatId, statusMsg.message_id, reply);
  } catch (e) {
    console.error(e);
    try {
      await ctx.telegram.editMessageText(chatId, statusMsg.message_id, null, `❌ ${e.message}`);
    } catch {
      await ctx.reply(`❌ ${e.message}`);
    }
  }
});

bot.launch();
console.log(`[bot] started — project: ${PROJ}`);
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
