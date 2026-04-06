/**
 * solBid dev server — Express + Socket.io + SQLite
 * Run: node --env-file=.env dev-server.js
 */

import express    from 'express';
import { createServer } from 'http';
import { Server }       from 'socket.io';
import rateLimit        from 'express-rate-limit';
import bcrypt           from 'bcryptjs';
import { Resend }       from 'resend';
import Database         from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import {
  generateKeyPairSync,
  randomBytes,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
  scryptSync,
  createHash,
} from 'crypto';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC, 'confirmed');
console.log(`[solana] RPC → ${SOLANA_RPC}`);

// Prize wallet — funded separately; pays out SOL prizes to winners
let PRIZE_KEYPAIR = null;
if (process.env.PRIZE_WALLET_SECRET) {
  try {
    const raw = Buffer.from(process.env.PRIZE_WALLET_SECRET, 'hex');
    PRIZE_KEYPAIR = Keypair.fromSecretKey(raw);
    console.log(`[prize] wallet → ${PRIZE_KEYPAIR.publicKey.toBase58().slice(0, 12)}…`);
  } catch { console.error('[prize] PRIZE_WALLET_SECRET invalid — SOL prize claims disabled'); }
} else {
  console.warn('[prize] PRIZE_WALLET_SECRET not set — SOL prize claims will fail');
}

let HOUSE_PUBKEY = null;
if (process.env.HOUSE_WALLET) {
  try { HOUSE_PUBKEY = new PublicKey(process.env.HOUSE_WALLET); console.log(`[sweep] house wallet → ${process.env.HOUSE_WALLET.slice(0, 12)}…`); }
  catch { console.error('[sweep] HOUSE_WALLET is not a valid Solana address — sweeps disabled'); }
} else {
  console.warn('[sweep] HOUSE_WALLET not set — bid revenue will not be collected');
}

const PORT         = process.env.PORT ?? 3007;
const PROD_ORIGIN  = process.env.FRONTEND_URL ?? null; // e.g. https://solbid.vercel.app
const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  ...(PROD_ORIGIN ? [PROD_ORIGIN] : []),
];

// ─── Express app ──────────────────────────────────────────────
const app        = express();
const httpServer = createServer(app);

app.use(express.json());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin',  origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ─── Email ─────────────────────────────────────────────────────
const resend   = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM     = process.env.RESEND_FROM ?? 'pennyBid <noreply@penny.bid>';
const SITE_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

async function sendEmail(to, subject, html) {
  if (!resend) { console.warn('[email] RESEND_API_KEY not set — skipping email to', to); return; }
  if (!to) return;
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    console.log(`[email] sent "${subject}" → ${to}`);
  } catch (e) { console.error('[email] failed:', e.message); }
}

// ─── Vault ─────────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production';

if (!process.env.VAULT_MASTER_KEY) {
  if (IS_PROD) {
    console.error('\n  ✗  VAULT_MASTER_KEY is not set. Refusing to start in production.\n');
    process.exit(1);
  }
  console.warn('\n  ⚠  VAULT_MASTER_KEY not set — using insecure dev default.\n     Set it in .env before going to production.\n');
}

const MASTER_KEY = scryptSync(
  process.env.VAULT_MASTER_KEY ?? 'dev-only-insecure-key',
  'solbid-vault-salt-v1',
  32,
);

// ─── Database ──────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = process.env.DATA_DIR ?? __dirname;   // Railway: set DATA_DIR=/data (volume)
const db = new Database(join(DATA_DIR, 'solbid.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    email           TEXT,
    deposit_address TEXT NOT NULL,
    credits         INTEGER NOT NULL DEFAULT 50,
    password_hash   TEXT NOT NULL,
    enc_ct          TEXT NOT NULL,
    enc_iv          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    type       TEXT NOT NULL,
    item       TEXT,
    auction_id TEXT,
    credits    INTEGER NOT NULL,
    sol        REAL,
    sig        TEXT,
    ts         INTEGER NOT NULL
  );


  CREATE TABLE IF NOT EXISTS winners (
    id             TEXT PRIMARY KEY,
    auction_id     TEXT NOT NULL,
    user_id        TEXT NOT NULL REFERENCES users(id),
    item_name      TEXT NOT NULL,
    prize_type     TEXT NOT NULL,
    prize_data     TEXT NOT NULL,
    final_price    REAL NOT NULL,
    purchase_price REAL NOT NULL DEFAULT 0,
    purchased      INTEGER NOT NULL DEFAULT 0,
    purchase_sig   TEXT,
    ts             INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tx_user_ts   ON transactions(user_id, ts DESC);
  CREATE INDEX IF NOT EXISTS idx_win_user      ON winners(user_id);

  CREATE TABLE IF NOT EXISTS auctions_persist (
    id           TEXT PRIMARY KEY,
    data         TEXT NOT NULL
  );
`);
try { db.exec('ALTER TABLE transactions ADD COLUMN auction_id TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN reset_expires INTEGER'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE winners ADD COLUMN purchase_price REAL NOT NULL DEFAULT 0'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE winners ADD COLUMN purchased INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE winners ADD COLUMN purchase_sig TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN bonus_credits INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE transactions ADD COLUMN real_credit INTEGER NOT NULL DEFAULT 1'); } catch { /* already exists */ }
try { db.exec(`
  CREATE TABLE IF NOT EXISTS cashback_winners (
    auction_id       TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    username         TEXT NOT NULL,
    credits_refunded INTEGER NOT NULL,
    ts               INTEGER NOT NULL
  )
`); } catch { /* already exists */ }
// drop old columns if migrating from claimed→purchased schema (SQLite can't drop cols, just ignore)

// ─── Prepared statements ───────────────────────────────────────
const stmt = {
  insertUser: db.prepare(`
    INSERT INTO users (id, username, email, deposit_address, credits, password_hash, enc_ct, enc_iv)
    VALUES (@id, @username, @email, @deposit_address, @credits, @password_hash, @enc_ct, @enc_iv)
  `),
  upsertBot: db.prepare(`
    INSERT INTO users (id, username, email, deposit_address, credits, password_hash, enc_ct, enc_iv)
    VALUES (@id, @username, @email, @deposit_address, @credits, @password_hash, @enc_ct, @enc_iv)
    ON CONFLICT(username) DO UPDATE SET credits = 9999
  `),
  getUserById:       db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE'),
  usernameExists:    db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE'),
  updateCredits:     db.prepare('UPDATE users SET credits = @credits WHERE id = @id'),
  updateBonusCredits: db.prepare('UPDATE users SET bonus_credits = @bonus WHERE id = @id'),
  addBonusAll:       db.prepare(`UPDATE users SET bonus_credits = bonus_credits + @amount WHERE id NOT LIKE 'bot-%'`),
  addBonusOne:       db.prepare('UPDATE users SET bonus_credits = bonus_credits + @amount WHERE id = @id'),
  insertTx: db.prepare(`
    INSERT INTO transactions (id, user_id, type, item, auction_id, credits, sol, sig, ts, real_credit)
    VALUES (@id, @user_id, @type, @item, @auction_id, @credits, @sol, @sig, @ts, @real_credit)
  `),
  getCashbackParticipants: db.prepare(`
    SELECT u.id, u.username, COUNT(*) as total_bids, SUM(t.real_credit) as real_bids
    FROM transactions t JOIN users u ON t.user_id = u.id
    WHERE t.auction_id = ? AND t.type = 'bid' AND u.id NOT LIKE 'bot-%'
    GROUP BY u.id ORDER BY real_bids DESC
  `),
  getCashbackWinner:    db.prepare('SELECT * FROM cashback_winners WHERE auction_id = ?'),
  insertCashbackWinner: db.prepare(`
    INSERT OR IGNORE INTO cashback_winners (auction_id, user_id, username, credits_refunded, ts)
    VALUES (@auction_id, @user_id, @username, @credits_refunded, @ts)
  `),
  getTxByUser:        db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY ts DESC LIMIT 100'),
  netDepositedSolByUser: db.prepare(`SELECT COALESCE(SUM(CASE WHEN type='deposit' THEN sol WHEN type='withdraw' THEN -sol WHEN type='sweep' THEN -sol ELSE 0 END), 0) as net FROM transactions WHERE user_id = ?`),
  insertWinner: db.prepare(`
    INSERT INTO winners (id, auction_id, user_id, item_name, prize_type, prize_data, final_price, ts)
    VALUES (@id, @auction_id, @user_id, @item_name, @prize_type, @prize_data, @final_price, @ts)
  `),
  getWinsByUser:  db.prepare('SELECT * FROM winners WHERE user_id = ? ORDER BY ts DESC'),
  getWinById:     db.prepare('SELECT * FROM winners WHERE id = ?'),
  markPurchased:  db.prepare('UPDATE winners SET purchased = 1, purchase_sig = @sig WHERE id = @id'),
  upsertAuction:    db.prepare('INSERT OR REPLACE INTO auctions_persist (id, data) VALUES (@id, @data)'),
  deleteAuction:    db.prepare('DELETE FROM auctions_persist WHERE id = ?'),
  allAuctions:      db.prepare('SELECT * FROM auctions_persist'),
  getRecentBids:    db.prepare(`
    SELECT t.user_id, u.username, t.ts
    FROM transactions t JOIN users u ON t.user_id = u.id
    WHERE t.auction_id = ? AND t.type = 'bid'
    ORDER BY t.ts DESC LIMIT 10
  `),
  setResetToken:    db.prepare('UPDATE users SET reset_token = @token, reset_expires = @expires WHERE id = @id'),
  getUserByToken:   db.prepare('SELECT * FROM users WHERE reset_token = ?'),
  clearResetToken:  db.prepare('UPDATE users SET reset_token = NULL, reset_expires = NULL, password_hash = @hash WHERE id = @id'),
  updateEmail:      db.prepare('UPDATE users SET email = @email WHERE id = @id'),
  updatePassword:   db.prepare('UPDATE users SET password_hash = @hash WHERE id = @id'),
};

// Migration: reset legacy users who got the old 50-credit bonus back to 5
{
  const r = db.prepare(`
    UPDATE users SET credits = 5
    WHERE id NOT LIKE 'bot-%'
      AND credits > 5
      AND NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = users.id AND type = 'deposit')
  `).run();
  if (r.changes > 0) console.log(`[migration] reset ${r.changes} legacy user(s) to 5 credits`);
}

// Atomic bid: deduct credit + record tx in one SQLite transaction
const doBid = db.transaction((userId, creditsAfter, bonusAfter, txRow) => {
  stmt.updateCredits.run({ id: userId, credits: creditsAfter });
  stmt.updateBonusCredits.run({ id: userId, bonus: bonusAfter });
  stmt.insertTx.run(txRow);
});

function rowToUser(row) {
  if (!row) return null;
  return {
    id:             row.id,
    username:       row.username,
    email:          row.email ?? null,
    depositAddress: row.deposit_address,
    credits:        row.credits,
    bonusCredits:   row.bonus_credits ?? 0,
    passwordHash:   row.password_hash,
    _enc:           { ct: row.enc_ct, iv: row.enc_iv },
  };
}

// ─── Wallet helpers ────────────────────────────────────────────
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(buf) {
  const bytes  = Buffer.from(buf);
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry    += digits[j] << 8;
      digits[j] = carry % 58;
      carry     = Math.floor(carry / 58);
    }
    while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }
  let result = '';
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) result += '1';
  for (let i = digits.length - 1; i >= 0; i--) result += BASE58[digits[i]];
  return result;
}

function generateWallet() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privDER = privateKey.export({ type: 'pkcs8', format: 'der' });
  const pubDER  = publicKey.export({  type: 'spki',  format: 'der' });
  const seed    = Buffer.from(privDER.slice(16, 48));
  const rawPub  = pubDER.slice(12, 44);
  const secretKey = Buffer.concat([seed, rawPub]);
  seed.fill(0);
  if (Buffer.isBuffer(privDER)) privDER.fill(0);
  return { pubkey: base58Encode(rawPub), secretKey };
}

function encryptSecret(secretKey) {
  const iv         = randomBytes(12);
  const cipher     = createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(secretKey), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  return {
    ct: Buffer.concat([ciphertext, authTag]).toString('hex'),
    iv: iv.toString('hex'),
  };
}

function decryptSecret(enc) {
  const raw      = Buffer.from(enc.ct, 'hex');
  const iv       = Buffer.from(enc.iv, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
  decipher.setAuthTag(raw.slice(-16));
  return Buffer.concat([decipher.update(raw.slice(0, -16)), decipher.final()]);
}

// Check password against HaveIBeenPwned Pwned Passwords (k-anonymity — only first 5 chars of SHA-1 sent)
async function checkPwned(password) {
  try {
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) return false; // fail open — don't block if API is down
    const text = await res.text();
    return text.split('\r\n').some(line => line.startsWith(suffix));
  } catch {
    return false; // fail open
  }
}

function sanitizeUser(user) {
  const { _enc: _e, passwordHash: _p, ...pub } = user;
  return pub;
}

// ─── User store ────────────────────────────────────────────────
const tokens = new Map(); // token → userId (session — in memory only)

async function makeUser(username, passwordHash, email = null) {
  const wallet = generateWallet();
  const enc    = encryptSecret(wallet.secretKey);
  wallet.secretKey.fill(0);
  const id = `user-${randomBytes(4).toString('hex')}`;
  stmt.insertUser.run({
    id,
    username,
    email:           email ?? null,
    deposit_address: wallet.pubkey,
    credits:         5,
    password_hash:   passwordHash,
    enc_ct:          enc.ct,
    enc_iv:          enc.iv,
  });
  console.log(`[vault] wallet generated for ${username} → ${wallet.pubkey.slice(0, 12)}…`);
  return rowToUser(stmt.getUserById.get(id));
}

function makeToken(userId) {
  const t = randomBytes(32).toString('hex');
  tokens.set(t, userId);
  return t;
}

function userFromHeader(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const incoming = authHeader.slice(7);
  for (const [tok, userId] of tokens) {
    try {
      if (timingSafeEqual(Buffer.from(tok), Buffer.from(incoming))) {
        return rowToUser(stmt.getUserById.get(userId));
      }
    } catch { /* length mismatch */ }
  }
  return null;
}

// ─── Auth middleware ───────────────────────────────────────────
function requireAuth(req, res, next) {
  const user = userFromHeader(req.headers.authorization);
  if (!user) { res.status(401).json({ message: 'Unauthorized' }); return; }
  req.user = user;
  next();
}

// ─── Rate limiting ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts — try again in 15 minutes' },
  standardHeaders: true, legacyHeaders: false,
  validate: { trustProxy: false },
});

const withdrawLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: 'Too many withdrawal attempts — slow down' },
  standardHeaders: true, legacyHeaders: false,
  validate: { trustProxy: false },
});

// ─── Auth routes ───────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });
  if (username.length < 3 || username.length > 24)
    return res.status(400).json({ message: 'Username must be 3–24 characters' });
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return res.status(400).json({ message: 'Username may only contain letters, numbers, and underscores' });
  if (stmt.usernameExists.get(username))
    return res.status(409).json({ message: 'Username already taken' });
  if (password.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ message: 'Invalid email address' });
  if (await checkPwned(password))
    return res.status(400).json({ message: 'This password has appeared in a data breach. Please choose a different password.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user  = await makeUser(username, passwordHash, email || null);
  const token = makeToken(user.id);
  console.log(`[auth] registered ${username}`);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });

  const user = rowToUser(stmt.getUserByUsername.get(username));

  // Always run bcrypt compare to prevent user-enumeration via timing
  const dummyHash = '$2a$12$invalidhashpaddingtopreventinenumerationattacks00000000';
  const match = user
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, dummyHash).then(() => false);

  if (!match) return res.status(401).json({ message: 'Invalid username or password' });

  const token = makeToken(user.id);
  console.log(`[auth] login ${username}`);
  res.json({ token, user: sanitizeUser(user) });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// ─── Password reset ─────────────────────────────────────────────
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  const row = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);
  // Always respond OK to prevent email enumeration
  if (row) {
    const token   = randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour
    stmt.setResetToken.run({ token, expires, id: row.id });
    const link = `${SITE_URL}/reset-password?token=${token}`;
    await sendEmail(email, 'Reset your pennyBid password', `
      <p>Hi ${row.username},</p>
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <p><a href="${link}">${link}</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `);
  }
  res.json({ ok: true });
});

app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  if (await checkPwned(password))
    return res.status(400).json({ message: 'This password has appeared in a data breach. Please choose a different password.' });
  const row = stmt.getUserByToken.get(token);
  if (!row || !row.reset_expires || Date.now() > row.reset_expires)
    return res.status(400).json({ message: 'Invalid or expired reset link' });
  const hash = await bcrypt.hash(password, 12);
  stmt.clearResetToken.run({ hash, id: row.id });
  res.json({ ok: true });
});

// ─── Account settings ───────────────────────────────────────────
app.post('/api/account/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both fields required' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });
  if (await checkPwned(newPassword))
    return res.status(400).json({ message: 'This password has appeared in a data breach. Please choose a different password.' });
  const valid = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });
  const hash = await bcrypt.hash(newPassword, 12);
  stmt.updatePassword.run({ hash, id: req.user.id });
  res.json({ ok: true });
});

app.post('/api/account/update-email', requireAuth, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Invalid email' });
  stmt.updateEmail.run({ email, id: req.user.id });
  res.json({ ok: true });
});

// Internal signing endpoint — only the settlement worker calls this.
app.post('/api/internal/sign', (req, res) => {
  if (req.headers['x-internal-token'] !== (process.env.INTERNAL_TOKEN ?? 'dev-internal')) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const { userId, message } = req.body;
  const user = rowToUser(stmt.getUserById.get(userId));
  if (!user?._enc) return res.status(404).json({ message: 'Wallet not found' });

  let secretKey;
  try {
    secretKey = decryptSecret(user._enc);
    // Production: use @solana/web3.js Keypair + sign() here
    res.json({ signature: 'signing-stub-replace-with-solana-web3' });
  } finally {
    secretKey?.fill(0);
  }
});

// Withdraw — real on-chain SOL transfer from user's custodial wallet
app.post('/api/withdraw', requireAuth, withdrawLimiter, async (req, res) => {
  const { amountCredits, destinationAddress } = req.body;
  const user = req.user;

  if (!amountCredits || amountCredits < 1)
    return res.status(400).json({ message: 'Minimum 1 credit (0.01 SOL)' });

  let destination;
  try { destination = new PublicKey(destinationAddress); }
  catch { return res.status(400).json({ message: 'Invalid Solana address' }); }

  const FEE_BUFFER = 5000; // lamports reserved for tx fee — deducted from sent amount
  const lamports   = Math.round(amountCredits * 0.01 * LAMPORTS_PER_SOL);
  const sendLamports = lamports - FEE_BUFFER; // user gets slightly less; fee comes out of their request
  const fromPubkey = new PublicKey(user.depositAddress);
  console.log(`[withdraw] checking balance for ${user.username} at ${user.depositAddress}`);
  const balance    = await connection.getBalance(fromPubkey).catch((e) => { console.error('[withdraw] getBalance failed:', e.message); return 0; });
  if (balance < lamports) {
    const hasSol = (balance / LAMPORTS_PER_SOL).toFixed(4);
    return res.status(400).json({ message: `Insufficient on-chain balance. Deposit address holds ${hasSol} SOL.` });
  }

  let secretKey;
  try {
    secretKey = decryptSecret(user._enc);
    const keypair = Keypair.fromSecretKey(secretKey);
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: destination, lamports: sendLamports })
    );
    const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);

    // Deduct credits up to what the user has (excess SOL may be un-swept house revenue)
    const creditsDeducted = Math.min(amountCredits, user.credits);
    const creditsAfter    = user.credits - creditsDeducted;
    const solAmount       = (amountCredits * 0.01).toFixed(4);
    doBid(user.id, creditsAfter, user.bonusCredits, {
      id:         `tx-${Date.now()}-${randomBytes(4).toString('hex')}`,
      user_id:    user.id,
      type:       'withdraw',
      item:       null,
      auction_id: null,
      credits:     -creditsDeducted,
      sol:         parseFloat(solAmount),
      sig,
      ts:          Date.now(),
      real_credit: 1,
    });
    console.log(`[withdraw] ${user.username} → ${solAmount} SOL | ${sig}`);
    res.json({ ok: true, solAmount, remainingCredits: creditsAfter, sig });
  } catch (err) {
    console.error('[withdraw] failed:', err.message);
    res.status(500).json({ message: 'Transaction failed: ' + err.message });
  } finally {
    secretKey?.fill(0);
  }
});

app.get('/api/balance', requireAuth, async (req, res) => {
  try {
    const pubkey   = new PublicKey(req.user.depositAddress);
    const lamports = await connection.getBalance(pubkey);
    res.json({ lamports, sol: lamports / LAMPORTS_PER_SOL });
  } catch {
    res.json({ lamports: 0, sol: 0 });
  }
});

app.get('/api/transactions', requireAuth, (req, res) => {
  const rows = stmt.getTxByUser.all(req.user.id);
  const transactions = rows.map(r => ({
    id: r.id, type: r.type, item: r.item, auctionId: r.auction_id,
    credits: r.credits, sol: r.sol, sig: r.sig, ts: r.ts,
  }));
  res.json({ transactions });
});

app.get('/api/auctions', requireAuth, async (req, res) => {
  const list = await Promise.all([...auctions.values()].map(async (a) => {
    const sockets = await io.in(a.auctionId).allSockets();
    return {
      auctionId:    a.auctionId,
      item:         a.item,
      currentPrice: a.currentPrice,
      endsAtMs:     a.endsAtMs,
      status:       a.status,
      totalBids:    a.totalBids,
      leaderName:   a.leaderName,
      snapTimerMs:  a.snapTimerMs,
      viewers:      sockets.size,
    };
  }));
  res.json({ auctions: list });
});

// ─── Winner / prize routes ──────────────────────────────────────
app.get('/api/my-wins', requireAuth, (req, res) => {
  const rows = stmt.getWinsByUser.all(req.user.id);
  const wins = rows.map((r) => ({
    id:            r.id,
    auctionId:     r.auction_id,
    itemName:      r.item_name,
    prize:         JSON.parse(r.prize_data),
    finalPrice:    r.final_price,
    purchasePrice: r.purchase_price ?? r.final_price,
    purchased:     !!(r.purchased),
    purchaseSig:   r.purchase_sig ?? null,
    ts:            r.ts,
  }));
  res.json({ wins });
});

// Winner pays purchasePrice SOL from their deposit wallet → house wallet, then prize unlocks
app.post('/api/wins/:id/purchase', requireAuth, async (req, res) => {
  const row = stmt.getWinById.get(req.params.id);
  if (!row)                        return res.status(404).json({ message: 'Win not found' });
  if (row.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  if (row.purchased)               return res.status(400).json({ message: 'Already purchased' });

  const purchasePrice = row.purchase_price ?? row.final_price;
  const lamports      = Math.round(purchasePrice * LAMPORTS_PER_SOL);

  if (!HOUSE_PUBKEY)
    return res.status(503).json({ message: 'House wallet not configured — contact support' });

  // Check winner has enough SOL on-chain
  const user    = req.user;
  const fromPub = new PublicKey(user.depositAddress);
  const balance = await connection.getBalance(fromPub).catch(() => 0);
  const FEE     = 5000;
  if (balance < lamports + FEE)
    return res.status(400).json({
      message: `Insufficient balance. You need ${purchasePrice.toFixed(4)} SOL in your deposit wallet (current: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL).`
    });

  let secretKey;
  try {
    secretKey = decryptSecret(user._enc);
    const keypair = Keypair.fromSecretKey(secretKey);
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: HOUSE_PUBKEY, lamports })
    );
    const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
    stmt.markPurchased.run({ id: row.id, sig });
    console.log(`[purchase] ${user.username} purchased "${row.item_name}" for ${purchasePrice} SOL | ${sig}`);
    return res.json({ ok: true, prize: JSON.parse(row.prize_data), sig });
  } catch (e) {
    console.error('[purchase] failed:', e.message);
    return res.status(500).json({ message: 'Payment failed: ' + e.message });
  } finally {
    secretKey?.fill(0);
  }
});

// ─── Admin routes ──────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dev-admin';

function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ') || header.slice(7) !== ADMIN_TOKEN)
    return res.status(403).json({ message: 'Forbidden' });
  next();
}

app.get('/api/admin/auctions', requireAdmin, (req, res) => {
  const list = [...auctions.values()].map((a) => ({
    auctionId:   a.auctionId,
    item:        a.item,
    status:      a.status,
    totalBids:   a.totalBids,
    endsAtMs:    a.endsAtMs,
    snapTimerMs: a.snapTimerMs,
    _durationMs: a._durationMs,
    prize:       a.prize ?? null,
  }));
  res.json({ auctions: list });
});

app.post('/api/admin/auction', requireAdmin, (req, res) => {
  const { name, image, retailValue, startAt, durationMinutes, snapTimerSeconds, prizeType, prizeAmount, prizeCode, prizeDescription } = req.body;
  if (!name || !image || !retailValue || !durationMinutes)
    return res.status(400).json({ message: 'name, image, retailValue and durationMinutes are required' });

  const id          = `auction-${randomBytes(4).toString('hex')}`;
  const durationMs  = Math.round(durationMinutes * 60 * 1000);
  const snapMs      = Math.round((snapTimerSeconds ?? 15) * 1000);
  const startAtMs   = startAt ? new Date(startAt).getTime() : Date.now();
  const delayMs     = Math.max(0, startAtMs - Date.now());

  const prize = prizeType === 'sol'      ? { type: 'sol',      amount: Number(prizeAmount) }
              : prizeType === 'digital'  ? { type: 'digital',  code: prizeCode }
              : prizeType === 'physical' ? { type: 'physical', description: prizeDescription }
              : null;

  const auction = makeAuction(id, { name, image, retailValue: Number(retailValue) }, durationMs, delayMs, snapMs, prize);
  auctions.set(id, auction);
  persistAuction(auction);

  console.log(`[admin] created auction ${id}: "${name}" starts in ${Math.round(delayMs/1000)}s, runs ${durationMinutes}min`);
  res.status(201).json({ auctionId: id });
});

app.patch('/api/admin/auction/:id', requireAdmin, (req, res) => {
  const auction = auctions.get(req.params.id);
  if (!auction) return res.status(404).json({ message: 'Auction not found' });
  if (auction.status === 'active')
    return res.status(400).json({ message: 'Cannot edit an active auction' });

  const { name, image, retailValue, startAt, durationMinutes, snapTimerSeconds, prizeType, prizeAmount, prizeCode, prizeDescription } = req.body;
  if (name)             auction.item.name       = name;
  if (image)            auction.item.image      = image;
  if (retailValue)      auction.item.retailValue = Number(retailValue);
  if (durationMinutes)  auction._durationMs     = Math.round(durationMinutes * 60 * 1000);
  if (snapTimerSeconds) auction.snapTimerMs      = Math.round(snapTimerSeconds * 1000);
  if (startAt) {
    const startAtMs  = new Date(startAt).getTime();
    const delayMs    = Math.max(0, startAtMs - Date.now());
    auction._delayMs = delayMs;
    auction.endsAtMs = startAtMs + auction._durationMs;
    auction.status   = delayMs > 0 ? 'scheduled' : 'active';
  }
  if (prizeType) {
    auction.prize = prizeType === 'sol'      ? { type: 'sol',      amount: Number(prizeAmount) }
                  : prizeType === 'digital'  ? { type: 'digital',  code: prizeCode }
                  : prizeType === 'physical' ? { type: 'physical', description: prizeDescription }
                  : null;
  }
  persistAuction(auction);
  console.log(`[admin] updated auction ${req.params.id}`);
  res.json({ ok: true });
});

app.delete('/api/admin/auction/:id', requireAdmin, (req, res) => {
  const auction = auctions.get(req.params.id);
  if (!auction) return res.status(404).json({ message: 'Auction not found' });
  if (auction.status === 'active') {
    io.to(req.params.id).emit('auction-ended', { winnerId: null, winnerName: null, finalPrice: auction.currentPrice });
  }
  auctions.delete(req.params.id);
  removePersistedAuction(req.params.id);
  console.log(`[admin] deleted auction ${req.params.id}`);
  res.json({ ok: true });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, username, credits, bonus_credits FROM users ORDER BY username').all();
  res.json({ users: rows });
});

app.post('/api/admin/user/:id/credits', requireAdmin, (req, res) => {
  const { amount } = req.body;
  if (!Number.isInteger(amount)) return res.status(400).json({ message: 'amount must be an integer' });
  const row = stmt.getUserById.get(req.params.id);
  if (!row) return res.status(404).json({ message: 'User not found' });
  const newBonus = Math.max(0, (row.bonus_credits ?? 0) + amount);
  stmt.updateBonusCredits.run({ bonus: newBonus, id: row.id });
  console.log(`[admin] ${amount > 0 ? '+' : ''}${amount} bonus credits → ${row.username} (now ${newBonus})`);
  res.json({ bonusCredits: newBonus });
});

app.post('/api/admin/credits/all', requireAdmin, (req, res) => {
  const { amount } = req.body;
  if (!Number.isInteger(amount) || amount <= 0) return res.status(400).json({ message: 'amount must be a positive integer' });
  const result = stmt.addBonusAll.run({ amount });
  console.log(`[admin] +${amount} bonus credits → all ${result.changes} users`);
  res.json({ ok: true, usersAffected: result.changes });
});

// ─── Auction state ─────────────────────────────────────────────
const auctions = new Map();
let   bidSeq   = 0;

function makeAuction(id, item, durationMs, delayMs = 0, snapTimerMs = 15_000, prize = null) {
  return {
    auctionId:    id,
    item,
    currentPrice: 0.00,
    leaderId:     null,
    leaderName:   null,
    endsAtMs:     Date.now() + delayMs + durationMs,
    status:       delayMs > 0 ? 'scheduled' : 'active',
    totalBids:    0,
    snapTimerMs,
    prize,
    _durationMs:  durationMs,
    _delayMs:     delayMs,
  };
}

function persistAuction(a) {
  stmt.upsertAuction.run({ id: a.auctionId, data: JSON.stringify(a) });
}

function removePersistedAuction(id) {
  stmt.deleteAuction.run(id);
}

// Load persisted auctions from DB
const persistedRows = stmt.allAuctions.all();
for (const row of persistedRows) {
  try {
    const a = JSON.parse(row.data);
    auctions.set(a.auctionId, a);
  } catch { /* corrupt row — skip */ }
}
console.log(`[auctions] loaded ${auctions.size} auction(s) from DB`);

// ─── Bidding ────────────────────────────────────────────────────
// user object passed in is the live socket snapshot; credits updated in-place
// so credits-update event fires the correct value immediately
function tryBid(auctionId, user, displayName) {
  const a = auctions.get(auctionId);
  if (!a)                         return { ok: false, reason: 'NOT_FOUND' };
  if (a.status !== 'active')      return { ok: false, reason: 'AUCTION_ENDED' };
  if (Date.now() >= a.endsAtMs)   return { ok: false, reason: 'TIMER_EXPIRED' };
  if (a.leaderId === user.id)     return { ok: false, reason: 'ALREADY_LEADER' };
  if (user.credits + user.bonusCredits < 1) return { ok: false, reason: 'INSUFFICIENT_CREDITS' };

  // Deduct bonus credits first, then real credits
  const bonusUsed    = Math.min(1, user.bonusCredits);
  const bonusAfter   = user.bonusCredits - bonusUsed;
  const creditsAfter = user.credits - (1 - bonusUsed);
  a.currentPrice     = parseFloat((a.currentPrice + 0.01).toFixed(2));
  a.leaderId         = user.id;
  a.leaderName       = displayName;
  a.totalBids       += 1;
  a.endsAtMs         = Math.max(Date.now() + a.snapTimerMs, a.endsAtMs);
  bidSeq++;

  doBid(user.id, creditsAfter, bonusAfter, {
    id:          `tx-${Date.now()}-${randomBytes(4).toString('hex')}`,
    user_id:     user.id,
    type:        'bid',
    item:        a.item.name,
    auction_id:  auctionId,
    credits:     -1,
    sol:         null,
    sig:         null,
    ts:          Date.now(),
    real_credit: bonusUsed === 1 ? 0 : 1, // 0 = bonus credit spent, 1 = real SOL-backed credit spent
  });

  user.credits      = creditsAfter;      // keep socket snapshot in sync
  user.bonusCredits = bonusAfter;
  persistAuction(a);
  return { ok: true, sequence: bidSeq };
}

// ─── Socket.io ─────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGINS, credentials: true },
});

io.use((socket, next) => {
  const incoming = socket.handshake.auth?.token;
  if (!incoming) return next(new Error('Authentication required'));

  let resolvedUser = null;
  for (const [tok, userId] of tokens) {
    try {
      if (timingSafeEqual(Buffer.from(tok), Buffer.from(incoming))) {
        resolvedUser = rowToUser(stmt.getUserById.get(userId));
        break;
      }
    } catch { /* length mismatch */ }
  }

  if (!resolvedUser) return next(new Error('Invalid token'));
  socket.data.user = resolvedUser;
  next();
});

io.on('connection', (socket) => {
  const { user } = socket.data;

  const broadcastViewers = async (auctionId) => {
    const sockets = await io.in(auctionId).allSockets();
    io.to(auctionId).emit('viewers-update', sockets.size);
  };

  socket.on('join-auction', async (auctionId) => {
    const auction = auctions.get(auctionId);
    if (!auction) return;
    socket.join(auctionId);
    const recentBids = stmt.getRecentBids.all(auctionId).map((b, i) => ({
      u: b.user_id, n: b.username,
      p: parseFloat((auction.currentPrice - i * 0.01).toFixed(2)),
      t: auction.endsAtMs, s: 0, ts: b.ts,
    }));
    socket.emit('auction-sync', {
      auction,
      serverTimeMs: Date.now(),
      userCredits:  user.credits + user.bonusCredits,
      recentBids,
      cashback: {
        participants: stmt.getCashbackParticipants.all(auctionId),
        winner:       stmt.getCashbackWinner.get(auctionId) ?? auction.cashbackWinner ?? null,
      },
    });
    await broadcastViewers(auctionId);
  });

  socket.on('place-bid', ({ auctionId }) => {
    const result = tryBid(auctionId, user, user.username);
    if (!result.ok) { socket.emit('bid-rejected', { reason: result.reason }); return; }

    const a     = auctions.get(auctionId);
    const event = { u: user.id, n: user.username, p: a.currentPrice, t: a.endsAtMs, s: result.sequence, ts: Date.now() };
    io.to(auctionId).emit('bid-placed', event);
    io.to(auctionId).emit('cashback-update', { participants: stmt.getCashbackParticipants.all(auctionId) });
    socket.emit('bid-confirmed');
    socket.emit('credits-update', { real: user.credits, bonus: user.bonusCredits });
  });

  socket.on('leave-auction', async (id) => {
    socket.leave(id);
    await broadcastViewers(id);
  });

  socket.on('disconnect', async () => {
    for (const [id] of auctions) {
      const sockets = await io.in(id).allSockets();
      if (sockets.size > 0) io.to(id).emit('viewers-update', sockets.size);
    }
  });

  socket.on('ping-check', (cb) => { if (typeof cb === 'function') cb(); });
});

// ─── Auction lifecycle ─────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, a] of auctions) {
    if (a.status === 'scheduled' && now >= (a.endsAtMs - a._durationMs)) {
      a.status = 'active';
      persistAuction(a);
      io.to(id).emit('auction-sync', { auction: a, serverTimeMs: now, userCredits: 0 });
      console.log(`[auction] ${a.item.name} → LIVE`);
    }
    if (a.status === 'active' && now >= a.endsAtMs) {
      a.status = 'ended';
      // Record winner in DB (only real users, not bots)
      if (a.leaderId && !a.leaderId.startsWith('bot-') && a.prize) {
        try {
          stmt.insertWinner.run({
            id:             `win-${randomBytes(4).toString('hex')}`,
            auction_id:     a.auctionId,
            user_id:        a.leaderId,
            item_name:      a.item.name,
            prize_type:     a.prize.type,
            prize_data:     JSON.stringify(a.prize),
            final_price:    a.currentPrice,
            purchase_price: a.currentPrice, // winner pays this many SOL (1:1 with dollar price)
            ts:             now,
          });
          console.log(`[auction] winner recorded: ${a.leaderName} wins "${a.item.name}"`);
          const winnerRow = stmt.getUserById.get(a.leaderId);
          sendEmail(winnerRow?.email, `You won ${a.item.name}! — pennyBid`, `
            <p>Hi ${a.leaderName},</p>
            <p>Congratulations! You won the auction for <strong>${a.item.name}</strong>.</p>
            <p>The final price was <strong>$${a.currentPrice.toFixed(2)}</strong>.</p>
            <p>You can purchase the item for <strong>${a.currentPrice.toFixed(4)} SOL</strong> from your account page.</p>
            <p><a href="${SITE_URL}/account">Claim your item →</a></p>
          `);
        } catch (e) { console.error('[auction] failed to record winner:', e.message); }
      }
      // ── Cashback raffle ──
      try {
        const allParticipants = stmt.getCashbackParticipants.all(a.auctionId);
        const participants = allParticipants.filter(p => p.id !== a.leaderId);
        if (participants.length > 0) {
          const lucky  = participants[Math.floor(Math.random() * participants.length)];
          const refund = lucky.total_bids; // bonus credits = total bids placed in this auction
          stmt.addBonusOne.run({ id: lucky.id, amount: refund });
          stmt.insertCashbackWinner.run({
            auction_id: a.auctionId, user_id: lucky.id,
            username: lucky.username, credits_refunded: refund, ts: now,
          });
          a.cashbackWinner = { userId: lucky.id, username: lucky.username, creditsRefunded: refund };
          io.to(id).emit('cashback-winner', a.cashbackWinner);
          console.log(`[cashback] ${lucky.username} wins ${refund} bonus credits (${a.item.name})`);
        }
      } catch (e) { console.error('[cashback] failed:', e.message); }

      persistAuction(a);
      io.to(id).emit('auction-ended', { winnerId: a.leaderId, winnerName: a.leaderName, finalPrice: a.currentPrice });
      console.log(`[auction] ${a.item.name} ended — winner: ${a.leaderName ?? 'none'} at $${a.currentPrice.toFixed(2)}`);
    }
  }
}, 500);


// ─── Deposit detection + house sweep ───────────────────────────
// Single loop per 15s: credits incoming SOL, sweeps bid-spent SOL to house.
const allNonBots = db.prepare("SELECT id, deposit_address, credits FROM users WHERE id NOT LIKE 'bot-%'");
const addCredits  = db.prepare('UPDATE users SET credits = @credits WHERE id = @id');

async function sweepToHouse(row, balance) {
  if (!HOUSE_PUBKEY) return;
  const withdrawable = Math.round(row.credits * 0.01 * LAMPORTS_PER_SOL);
  const FEE_BUFFER   = 10_000; // reserve for tx fee
  const sweepable    = balance - withdrawable - FEE_BUFFER;
  if (sweepable < 10_000) return; // < 0.00001 SOL — not worth a tx

  let secretKey;
  try {
    const user = rowToUser(stmt.getUserById.get(row.id));
    secretKey  = decryptSecret(user._enc);
    const keypair = Keypair.fromSecretKey(secretKey);
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: HOUSE_PUBKEY, lamports: sweepable })
    );
    const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
    console.log(`[sweep] ${row.id} → ${(sweepable / LAMPORTS_PER_SOL).toFixed(4)} SOL | ${sig}`);
    stmt.insertTx.run({
      id: `tx-${Date.now()}-${randomBytes(4).toString('hex')}`,
      user_id: row.id, type: 'sweep', item: null, auction_id: null,
      credits: 0, sol: parseFloat((sweepable / LAMPORTS_PER_SOL).toFixed(4)), sig, ts: Date.now(), real_credit: 1,
    });
  } catch (e) {
    console.error(`[sweep] ${row.id} failed:`, e.message);
  } finally {
    secretKey?.fill(0);
  }
}

setInterval(async () => {
  const users = allNonBots.all();
  for (const row of users) {
    try {
      const balance = await connection.getBalance(new PublicKey(row.deposit_address));

      // ── Deposit detection ──
      const { net }         = stmt.netDepositedSolByUser.get(row.id);
      const alreadyCredited = Math.max(0, Math.round(net * LAMPORTS_PER_SOL));
      if (balance > alreadyCredited) {
        const lamportsDiff  = balance - alreadyCredited;
        const creditsEarned = Math.floor(lamportsDiff / LAMPORTS_PER_SOL * 100);
        if (creditsEarned >= 1) {
          const newCredits = row.credits + creditsEarned;
          // Fetch deposit tx signature from chain
          let depositSig = null;
          try {
            const sigs = await connection.getSignaturesForAddress(new PublicKey(row.deposit_address), { limit: 3 });
            depositSig = sigs[0]?.signature ?? null;
          } catch { /* non-critical */ }
          db.transaction(() => {
            addCredits.run({ id: row.id, credits: newCredits });
            stmt.insertTx.run({
              id:         `tx-${Date.now()}-${randomBytes(4).toString('hex')}`,
              user_id:    row.id,
              type:       'deposit',
              item:       null,
              auction_id: null,
              credits:     creditsEarned,
              sol:         parseFloat((lamportsDiff / LAMPORTS_PER_SOL).toFixed(4)),
              sig:         depositSig,
              ts:          Date.now(),
              real_credit: 1,
            });
          })();
          console.log(`[deposit] ${row.id} +${creditsEarned} credits (+${(lamportsDiff / LAMPORTS_PER_SOL).toFixed(4)} SOL)`);
          row.credits += creditsEarned;
          const solDeposited = (lamportsDiff / LAMPORTS_PER_SOL).toFixed(4);
          sendEmail(row.email, 'Deposit confirmed — pennyBid', `
            <p>Hi ${row.username},</p>
            <p>Your deposit of <strong>${solDeposited} SOL</strong> has been confirmed.</p>
            <p>You received <strong>${creditsEarned} bid credits</strong>. Your total is now <strong>${newCredits} credits</strong>.</p>
            <p><a href="${SITE_URL}">Go bid now →</a></p>
          `);
        }
      }

      // ── House sweep (bid-spent SOL) ──
      await sweepToHouse(row, balance);
    } catch { /* RPC hiccup — skip this user this round */ }
  }
}, 15_000);

// ─── Static frontend (production) ─────────────────────────────
if (IS_PROD) {
  const distPath = join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (_req, res) => res.sendFile(join(distPath, 'index.html')));
}

// ─── Start ─────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n  solBid dev server → http://localhost:${PORT}`);
  console.log(`  DB → solbid.db | 3 auctions running.\n`);
});
