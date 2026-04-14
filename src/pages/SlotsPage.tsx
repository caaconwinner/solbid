import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

// ─── Layout ───────────────────────────────────────────────────────────────────
const CW        = 480;
const CH        = 580;
const CELL_H    = 106;
const REEL_W    = 110;
const REEL_COLS = 3;
const REEL_ROWS = 3;
const REEL_H    = CELL_H * REEL_ROWS;              // 318
const GAP       = 12;
const REEL_X0   = (CW - (REEL_W * REEL_COLS + GAP * (REEL_COLS - 1))) / 2;
const REEL_Y    = 82;
const SYM_W     = REEL_W - 16;                    // 94
const SYM_H     = CELL_H - 10;                    // 96

// Middle cell bounds (row 1) — used for win flash overlays
const MID_SYM_Y0 = REEL_Y + CELL_H + (CELL_H - SYM_H) / 2;  // top of middle symbol

// ─── Symbols ──────────────────────────────────────────────────────────────────
type Sym = { id: number; key: string; label: string; name: string; color: number; value: number };

const SYMBOLS: Sym[] = [
  { id: 0, key: 's_ctrl',  label: 'PS5',   name: 'PS5 Console',  color: 0x003db8, value: 10 }, // jackpot
  { id: 1, key: 's_phone', label: 'iPHONE',name: 'Smartphone',   color: 0x636366, value: 5  },
  { id: 2, key: 's_hphones',label:'PODS',  name: 'Headphones',   color: 0x9945ff, value: 4  },
  { id: 3, key: 's_gift',  label: 'GIFT',  name: 'Gift Card',    color: 0x16a34a, value: 2  },
  { id: 4, key: 's_cash',  label: 'CASH',  name: 'Cash Voucher', color: 0xd97706, value: 1  },
];

// Weighted strips — jackpot ($P) is rarest
const STRIPS: number[][] = [
  [0, 4, 3, 2, 4, 1, 3, 4, 2, 4, 3, 1, 4, 3, 2, 4],
  [4, 3, 2, 4, 1, 4, 3, 0, 4, 2, 4, 3, 1, 4, 2, 3],
  [2, 4, 3, 1, 4, 2, 4, 3, 4, 0, 4, 1, 4, 2, 3, 4],
];

// ─── Icon drawing functions (all coords in 0..SYM_W × 0..SYM_H space) ────────

function drawController(g: Phaser.GameObjects.Graphics, w: number, h: number, c: number) {
  const cx = w / 2, cy = h / 2 + 4;
  g.fillStyle(c, 0.9);
  // Body
  g.fillRoundedRect(cx - 30, cy - 16, 60, 26, 12);
  // Left grip
  g.fillRoundedRect(cx - 28, cy + 6, 15, 22, 8);
  // Right grip
  g.fillRoundedRect(cx + 13, cy + 6, 15, 22, 8);
  // Bumpers
  g.fillStyle(c, 0.65);
  g.fillRoundedRect(cx - 28, cy - 22, 13, 8, 4);
  g.fillRoundedRect(cx + 15, cy - 22, 13, 8, 4);
  // Left analog stick
  g.fillStyle(0x000000, 0.4);
  g.fillCircle(cx - 16, cy + 2, 7);
  g.fillStyle(c, 0.6);
  g.fillCircle(cx - 16, cy + 2, 5);
  // Right analog stick
  g.fillStyle(0x000000, 0.4);
  g.fillCircle(cx + 7, cy + 14, 7);
  g.fillStyle(c, 0.6);
  g.fillCircle(cx + 7, cy + 14, 5);
  // D-pad
  g.fillStyle(0x000000, 0.45);
  g.fillRect(cx - 27, cy - 2, 6, 14);
  g.fillRect(cx - 30, cy + 3, 12, 5);
  // Face buttons
  g.fillStyle(0x44cc66, 1); g.fillCircle(cx + 21, cy - 8, 3.5);
  g.fillStyle(0xff4466, 1); g.fillCircle(cx + 27, cy - 2, 3.5);
  g.fillStyle(0x4488ff, 1); g.fillCircle(cx + 21, cy + 4,  3.5);
  g.fillStyle(0xee88ff, 1); g.fillCircle(cx + 15, cy - 2, 3.5);
}

function drawPhone(g: Phaser.GameObjects.Graphics, w: number, h: number, c: number) {
  const cx = w / 2, cy = h / 2 - 2;
  // Body
  g.fillStyle(c, 0.88);
  g.fillRoundedRect(cx - 21, cy - 38, 42, 80, 12);
  // Screen
  g.fillStyle(0x060e18, 0.95);
  g.fillRoundedRect(cx - 17, cy - 32, 34, 62, 8);
  // App grid
  g.fillStyle(c, 0.28);
  g.fillRoundedRect(cx - 13, cy - 22, 10, 10, 3);
  g.fillRoundedRect(cx + 3,  cy - 22, 10, 10, 3);
  g.fillRoundedRect(cx - 13, cy - 8,  10, 10, 3);
  g.fillRoundedRect(cx + 3,  cy - 8,  10, 10, 3);
  g.fillRoundedRect(cx - 13, cy + 6,  10, 10, 3);
  g.fillRoundedRect(cx + 3,  cy + 6,  10, 10, 3);
  // Dynamic island
  g.fillStyle(0x000000, 0.85);
  g.fillRoundedRect(cx - 9, cy - 30, 18, 5, 3);
  // Home bar
  g.fillStyle(c, 0.4);
  g.fillRoundedRect(cx - 10, cy + 24, 20, 3, 2);
  // Side button
  g.fillStyle(c, 1);
  g.fillRoundedRect(cx + 20, cy - 14, 3, 14, 2);
}

function drawHeadphones(g: Phaser.GameObjects.Graphics, w: number, h: number, c: number) {
  const cx = w / 2, cy = h / 2 + 4;
  // Headband arc
  g.lineStyle(7, c, 0.9);
  g.beginPath();
  g.arc(cx, cy - 4, 26, 0, Math.PI, true);
  g.strokePath();
  // Sliders
  g.fillStyle(c, 0.65);
  g.fillRoundedRect(cx - 29, cy - 24, 6, 20, 3);
  g.fillRoundedRect(cx + 23, cy - 24, 6, 20, 3);
  // Left cup outer
  g.fillStyle(c, 0.9);
  g.fillCircle(cx - 26, cy, 13);
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(cx - 26, cy, 8);
  g.fillStyle(c, 0.45);
  g.fillCircle(cx - 26, cy, 4);
  // Right cup outer
  g.fillStyle(c, 0.9);
  g.fillCircle(cx + 26, cy, 13);
  g.fillStyle(0x000000, 0.35);
  g.fillCircle(cx + 26, cy, 8);
  g.fillStyle(c, 0.45);
  g.fillCircle(cx + 26, cy, 4);
  // Cup highlights
  g.fillStyle(0xffffff, 0.12);
  g.fillCircle(cx - 28, cy - 4, 5);
  g.fillCircle(cx + 24, cy - 4, 5);
}

function drawGiftCard(g: Phaser.GameObjects.Graphics, w: number, h: number, c: number) {
  const cx = w / 2, cy = h / 2 + 4;
  // Card body
  g.fillStyle(c, 0.88);
  g.fillRoundedRect(cx - 36, cy - 24, 72, 46, 8);
  // Shine
  g.fillStyle(0xffffff, 0.06);
  g.fillRoundedRect(cx - 35, cy - 23, 36, 44, 7);
  // Mag stripe
  g.fillStyle(0x000000, 0.22);
  g.fillRect(cx - 36, cy - 3, 72, 14);
  // Horizontal ribbon
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(cx - 36, cy - 1, 72, 6);
  // Vertical ribbon
  g.fillRect(cx - 3, cy - 24, 6, 46);
  // Bow — left loop
  g.fillStyle(0xffffff, 0.65);
  g.fillEllipse(cx - 12, cy - 24, 20, 12);
  // Bow — right loop
  g.fillEllipse(cx + 12, cy - 24, 20, 12);
  // Bow knot
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx, cy - 24, 4);
  // Chip
  g.fillStyle(0xffd700, 0.6);
  g.fillRoundedRect(cx - 32, cy + 2, 14, 10, 3);
}

function drawCash(g: Phaser.GameObjects.Graphics, w: number, h: number, c: number) {
  const cx = w / 2, cy = h / 2 + 2;
  // Stack (back bills)
  g.fillStyle(c, 0.35);
  g.fillRoundedRect(cx - 32, cy - 18, 70, 42, 7);
  g.fillRoundedRect(cx - 34, cy - 20, 70, 42, 7);
  // Main bill
  g.fillStyle(c, 0.92);
  g.fillRoundedRect(cx - 36, cy - 22, 72, 44, 7);
  // Bill inner border
  g.lineStyle(1.5, 0x000000, 0.18);
  g.strokeRoundedRect(cx - 32, cy - 18, 64, 36, 5);
  // Centre oval
  g.fillStyle(0x000000, 0.18);
  g.fillEllipse(cx, cy, 32, 22);
  g.fillStyle(c, 0.5);
  g.fillEllipse(cx, cy, 26, 16);
  // $ vertical bar
  g.fillStyle(0x000000, 0.55);
  g.fillRect(cx - 1.5, cy - 13, 3, 26);
  // $ horizontal strokes
  g.fillRoundedRect(cx - 7, cy - 9, 14, 4, 2);
  g.fillRoundedRect(cx - 7, cy - 1, 14, 4, 2);
  g.fillRoundedRect(cx - 7, cy + 7, 14, 4, 2);
  // Corner rosettes
  g.fillStyle(0x000000, 0.12);
  g.fillCircle(cx - 30, cy - 16, 4);
  g.fillCircle(cx + 30, cy - 16, 4);
  g.fillCircle(cx - 30, cy + 16, 4);
  g.fillCircle(cx + 30, cy + 16, 4);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReelData {
  col:       number;
  x:         number;
  container: Phaser.GameObjects.Container;
  cells:     Phaser.GameObjects.Image[];
  extras:    Phaser.GameObjects.Image[];
  strip:     number[];
}

// ─── Boot Scene ───────────────────────────────────────────────────────────────
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x060e18);
    const g = this.add.graphics();
    g.fillGradientStyle(0xff6200, 0xff6200, 0x060e18, 0x060e18, 0.15, 0.15, 0, 0);
    g.fillEllipse(CW / 2, 0, CW * 1.4, CH * 0.7);
    this.add.text(CW / 2, CH / 2 - 24, 'penny', {
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: '28px', color: '#e0e0e0',
    }).setOrigin(0.5);
    this.add.text(CW / 2, CH / 2 + 16, 'Slots', {
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: '42px', fontStyle: 'bold', color: '#ff6200',
    }).setOrigin(0.5);
    this.add.text(CW / 2, CH - 40, 'Loading\u2026', {
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: '13px', color: '#444',
    }).setOrigin(0.5);
    this.time.delayedCall(800, () => this.scene.start('GameScene'));
  }
}

// ─── Game Scene ───────────────────────────────────────────────────────────────
class GameScene extends Phaser.Scene {
  // Part 2
  private credits   = 100;
  private spinning  = false;
  private reels:    ReelData[] = [];
  private creditTxt!: Phaser.GameObjects.Text;
  private btnGfx!:    Phaser.GameObjects.Graphics;

  // Part 3
  private winGfx!:    Phaser.GameObjects.Graphics;
  private winLabel!:  Phaser.GameObjects.Text;
  private winTween:   Phaser.Tweens.Tween | null = null;

  private readonly BTN_Y = REEL_Y + REEL_H + 106;
  private readonly BTN_W = 175;
  private readonly BTN_H = 50;

  constructor() { super('GameScene'); }

  create() {
    this.generateTextures();
    this.buildBackground();
    this.buildReels();
    this.buildPaylineMark();
    this.buildCreditDisplay();
    this.buildSpinButton();
    // Win-effect layers — added last so they render above everything
    this.winGfx   = this.add.graphics().setDepth(5);
    this.winLabel = this.add.text(CW / 2, REEL_Y - 18, '', {
      fontFamily: 'Inter,system-ui,sans-serif',
      fontSize:   '26px',
      fontStyle:  'bold',
      color:      '#ffd700',
      stroke:     '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(5);
  }

  // ── Texture generation ──────────────────────────────────────────────────────
  private generateTextures() {
    // Symbol tiles — each drawn as a prize icon, no image files
    const iconFns = [drawController, drawPhone, drawHeadphones, drawGiftCard, drawCash];

    for (const s of SYMBOLS) {
      if (this.textures.exists(s.key)) continue;

      const rt = this.add.renderTexture(0, 0, SYM_W, SYM_H);

      // Shared tile background + border
      const bg = this.make.graphics({}, false);
      bg.fillStyle(0x0d1e2e, 1);
      bg.fillRoundedRect(0, 0, SYM_W, SYM_H, 10);
      bg.fillStyle(s.color, 0.14);
      bg.fillRoundedRect(3, 3, SYM_W - 6, SYM_H - 6, 8);
      bg.lineStyle(2.5, s.color, 0.72);
      bg.strokeRoundedRect(1, 1, SYM_W - 2, SYM_H - 2, 10);
      rt.draw(bg, 0, 0);
      bg.destroy();

      // Draw icon
      const ic = this.make.graphics({}, false);
      iconFns[s.id](ic, SYM_W, SYM_H, s.color);
      rt.draw(ic, 0, 0);
      ic.destroy();

      // Small prize label at bottom of tile
      const lbl = this.make.text({
        x: 0, y: 0, text: s.label,
        style: { fontFamily: 'Inter,system-ui,sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#' + s.color.toString(16).padStart(6, '0') },
      }, false);
      rt.draw(lbl, (SYM_W - lbl.width) / 2, SYM_H - lbl.height - 3);
      lbl.destroy();

      rt.saveTexture(s.key);
      rt.destroy();
    }

    // Particle dot (white circle, tinted at runtime)
    if (!this.textures.exists('particle')) {
      const pg = this.make.graphics({}, false);
      pg.fillStyle(0xffffff, 1);
      pg.fillCircle(5, 5, 5);
      pg.generateTexture('particle', 10, 10);
      pg.destroy();
    }
  }

  // ── Background & header ────────────────────────────────────────────────────
  private buildBackground() {
    this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x060e18);
    const glow = this.add.graphics();
    glow.fillGradientStyle(0xff6200, 0xff6200, 0x060e18, 0x060e18, 0.08, 0.08, 0, 0);
    glow.fillEllipse(CW / 2, 0, CW * 1.4, CH * 0.5);
    this.add.text(CW / 2, 18, 'penny', {
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: '13px', color: '#888',
    }).setOrigin(0.5);
    this.add.text(CW / 2, 42, 'Slots', {
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#ff6200',
    }).setOrigin(0.5);
  }

  // ── Reel columns ───────────────────────────────────────────────────────────
  private buildReels() {
    this.reels = [];
    for (let col = 0; col < REEL_COLS; col++) {
      const x = REEL_X0 + col * (REEL_W + GAP);

      const frame = this.add.graphics();
      frame.fillStyle(0x0b1825, 1);
      frame.lineStyle(2, 0x1c3248, 1);
      frame.fillRoundedRect(x, REEL_Y, REEL_W, REEL_H, 8);
      frame.strokeRoundedRect(x, REEL_Y, REEL_W, REEL_H, 8);

      const mGfx = this.make.graphics({}, false);
      mGfx.fillStyle(0xffffff);
      mGfx.fillRect(x + 2, REEL_Y + 2, REEL_W - 4, REEL_H - 4);
      const mask = mGfx.createGeometryMask();

      const container = this.add.container(0, 0);
      container.setMask(mask);

      const strip    = STRIPS[col];
      const startIdx = Phaser.Math.Between(0, strip.length - 1);
      const cells:   Phaser.GameObjects.Image[] = [];

      for (let row = 0; row < REEL_ROWS; row++) {
        const symId = strip[(startIdx + row) % strip.length];
        const img   = this.add.image(
          x + REEL_W / 2,
          REEL_Y + row * CELL_H + CELL_H / 2,
          SYMBOLS[symId].key
        );
        container.add(img);
        cells.push(img);
      }

      this.reels.push({ col, x, container, cells, extras: [], strip });
    }
  }

  // ── Middle payline indicator ───────────────────────────────────────────────
  private buildPaylineMark() {
    const py     = REEL_Y + CELL_H + CELL_H / 2;
    const totalW = REEL_W * REEL_COLS + GAP * (REEL_COLS - 1);
    const g      = this.add.graphics();
    g.lineStyle(2, 0xff6200, 0.45);
    g.lineBetween(REEL_X0 - 10, py, REEL_X0 + totalW + 10, py);
    g.fillStyle(0xff6200, 0.6);
    g.fillTriangle(REEL_X0 - 16, py - 5, REEL_X0 - 5, py, REEL_X0 - 16, py + 5);
    g.fillTriangle(REEL_X0 + totalW + 16, py - 5, REEL_X0 + totalW + 5, py, REEL_X0 + totalW + 16, py + 5);
  }

  // ── Credits display ────────────────────────────────────────────────────────
  private buildCreditDisplay() {
    const credY = REEL_Y + REEL_H + 26;
    this.add.text(CW / 2, credY, 'CREDITS', {
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: '10px', color: '#444', letterSpacing: 2,
    }).setOrigin(0.5);
    this.creditTxt = this.add.text(CW / 2, credY + 26, '100', {
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#e0e0e0',
    }).setOrigin(0.5);
  }

  // ── Spin button ────────────────────────────────────────────────────────────
  private buildSpinButton() {
    this.btnGfx = this.add.graphics();
    this.drawBtn(false);

    this.add.text(CW / 2, this.BTN_Y, 'SPIN  \u20131 credit', {
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#fff',
    }).setOrigin(0.5);

    const zone = this.add.zone(CW / 2, this.BTN_Y, this.BTN_W, this.BTN_H)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.doSpin());
    zone.on('pointerover',  () => this.drawBtn(true));
    zone.on('pointerout',   () => this.drawBtn(false));
  }

  private drawBtn(hover: boolean) {
    this.btnGfx.clear();
    this.btnGfx.fillStyle(hover ? 0xff7a1a : 0xff6200, 1);
    this.btnGfx.fillRoundedRect(
      CW / 2 - this.BTN_W / 2, this.BTN_Y - this.BTN_H / 2,
      this.BTN_W, this.BTN_H, 10
    );
  }

  // ── Spin logic ─────────────────────────────────────────────────────────────
  private doSpin() {
    if (this.spinning || this.credits < 1) return;
    this.spinning = true;
    this.credits -= 1;
    this.creditTxt.setText(String(this.credits));

    // Clear any lingering win effects from the previous spin
    this.winTween?.stop();
    this.winTween = null;
    this.winGfx.clear();
    this.winLabel.setAlpha(0);

    const finalMids: number[] = [];
    let stopped = 0;

    for (let col = 0; col < REEL_COLS; col++) {
      const reel      = this.reels[col];
      const finalIdx  = Phaser.Math.Between(0, reel.strip.length - 1);
      const finalSyms = [0, 1, 2].map(r => reel.strip[(finalIdx + r) % reel.strip.length]);

      this.spinReel(reel, col, finalSyms, () => {
        finalMids[col] = finalSyms[1];
        stopped++;
        if (stopped === REEL_COLS) {
          this.spinning = false;
          this.checkWin(finalMids);
        }
      });
    }
  }

  private spinReel(
    reel:      ReelData,
    col:       number,
    finalSyms: number[],
    onDone:    () => void
  ) {
    const N           = 12 + col * 4;
    const totalExtras = N + 3;

    const extras: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < totalExtras; i++) {
      const symId = i < N
        ? reel.strip[Phaser.Math.Between(0, reel.strip.length - 1)]
        : finalSyms[N + 2 - i];

      const localY = REEL_Y - (i + 1) * CELL_H + CELL_H / 2;
      const img    = this.add.image(reel.x + REEL_W / 2, localY, SYMBOLS[symId].key);
      reel.container.add(img);
      extras.push(img);
    }
    reel.extras = extras;

    const duration = 1000 + col * 400;

    this.tweens.add({
      targets:  reel.container,
      y:        reel.container.y + totalExtras * CELL_H,
      duration,
      ease:     'Cubic.Out',
      onComplete: () => {
        for (let r = 0; r < REEL_ROWS; r++) {
          reel.cells[r].setTexture(SYMBOLS[finalSyms[r]].key);
          reel.cells[r].y = REEL_Y + r * CELL_H + CELL_H / 2;
        }
        reel.extras.forEach(e => e.destroy());
        reel.extras      = [];
        reel.container.y = 0;
        onDone();
      },
    });
  }

  // ── Win detection ──────────────────────────────────────────────────────────
  private checkWin(middle: number[]) {
    const [a, b, c] = middle;

    if (a === b && b === c) {
      const sym      = SYMBOLS[a];
      const won      = sym.value;
      const isJackpot = sym.value === 10;
      const isBig     = sym.value >= 4;

      this.credits += won;
      this.creditTxt.setText(String(this.credits));

      const flashColor = isJackpot ? 0xff6200 : isBig ? 0xffd700 : 0x44dd66;
      this.flashWinCells(flashColor, isJackpot);
      this.pulseCredits(flashColor);
      this.showWinLabel(isJackpot ? 'JACKPOT!' : isBig ? 'BIG WIN!' : 'WIN!', flashColor);

      if (isBig) {
        this.cameras.main.shake(380, isJackpot ? 0.013 : 0.006);
      }
      if (isJackpot) {
        this.jackpotParticles();
      }

      console.log(`\uD83C\uDFB0 WIN!  ${sym.label} \xD7 3  \u2192  +${won} credits  (balance: ${this.credits})`);
    } else {
      console.log(`No win \u2014 [ ${middle.map(id => SYMBOLS[id].label).join(' | ')} ]`);
    }

    if (this.credits === 0) {
      this.time.delayedCall(700, () => this.showOutOfCredits());
    }
  }

  // ── Win effects ────────────────────────────────────────────────────────────

  // Flashing colored border on all 3 middle cells
  private flashWinCells(color: number, isJackpot: boolean) {
    const proxy = { a: 1 };

    const draw = (alpha: number) => {
      this.winGfx.clear();
      for (let col = 0; col < REEL_COLS; col++) {
        const sx = REEL_X0 + col * (REEL_W + GAP) + (REEL_W - SYM_W) / 2 - 1;
        const sy = MID_SYM_Y0 - 1;
        this.winGfx.lineStyle(3.5, color, alpha);
        this.winGfx.strokeRoundedRect(sx, sy, SYM_W + 2, SYM_H + 2, 10);
        if (isJackpot) {
          this.winGfx.fillStyle(color, alpha * 0.14);
          this.winGfx.fillRoundedRect(sx, sy, SYM_W + 2, SYM_H + 2, 10);
        }
      }
    };

    this.winTween = this.tweens.add({
      targets:  proxy,
      a:        0,
      duration: 300,
      ease:     'Linear',
      yoyo:     true,
      repeat:   isJackpot ? 6 : 3,
      onUpdate: () => draw(proxy.a),
      onComplete: () => this.winGfx.clear(),
    });
  }

  // Credit counter scale-pop + momentary gold colour
  private pulseCredits(color: number) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    this.creditTxt.setColor(hex);
    this.tweens.add({
      targets:  this.creditTxt,
      scaleX:   1.42,
      scaleY:   1.42,
      duration: 160,
      ease:     'Back.Out',
      yoyo:     true,
      onComplete: () => this.creditTxt.setColor('#e0e0e0'),
    });
  }

  // "WIN!" / "BIG WIN!" / "JACKPOT!" label that pops up and fades
  private showWinLabel(text: string, color: number) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    this.winLabel.setText(text).setColor(hex).setAlpha(1).setScale(0.6);
    this.tweens.killTweensOf(this.winLabel);
    this.tweens.add({
      targets: this.winLabel,
      scaleX: 1, scaleY: 1,
      duration: 220,
      ease: 'Back.Out',
    });
    this.tweens.add({
      targets:  this.winLabel,
      alpha:    0,
      delay:    1100,
      duration: 500,
      ease:     'Linear',
    });
  }

  // Orange + gold particle burst from the centre of the reel area (jackpot only)
  private jackpotParticles() {
    const cx = CW / 2;
    const cy = REEL_Y + REEL_H / 2;

    const emitter = this.add.particles(cx, cy, 'particle', {
      lifespan:  { min: 600, max: 1100 },
      speed:     { min: 120, max: 380 },
      scale:     { start: 1.4, end: 0 },
      alpha:     { start: 1, end: 0 },
      gravityY:  280,
      color:     [0xff6200, 0xffd700, 0xff9900, 0xffcc00, 0xffffff],
      emitting:  false,
    } as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig);

    emitter.explode(55);
    this.time.delayedCall(1400, () => emitter.destroy());
  }

  // ── Out-of-credits overlay ─────────────────────────────────────────────────
  private showOutOfCredits() {
    // Container holds the visual objects; depth 20 keeps it above everything
    const ctr = this.add.container(0, 0).setDepth(20).setAlpha(0);

    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.78);
    backdrop.fillRect(0, 0, CW, CH);
    ctr.add(backdrop);

    const card = this.add.graphics();
    const cX   = CW / 2 - 140;
    const cY   = CH / 2 - 88;
    card.fillStyle(0x0c1825, 1);
    card.lineStyle(2, 0x1c3248, 1);
    card.fillRoundedRect(cX, cY, 280, 176, 14);
    card.strokeRoundedRect(cX, cY, 280, 176, 14);
    ctr.add(card);

    ctr.add(
      this.add.text(CW / 2, CH / 2 - 50, 'OUT OF CREDITS', {
        fontFamily: 'Inter,system-ui,sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#ff4444',
      }).setOrigin(0.5)
    );
    ctr.add(
      this.add.text(CW / 2, CH / 2 - 18, 'You ran out of credits.', {
        fontFamily: 'Inter,system-ui,sans-serif', fontSize: '13px', color: '#777',
      }).setOrigin(0.5)
    );

    // Refill button graphics (kept as local var for hover redraws)
    const btnX = CW / 2 - 95;
    const btnY = CH / 2 + 18;
    const btnW = 190;
    const btnH = 44;
    const btnBg = this.add.graphics();

    const drawRefillBtn = (hover: boolean) => {
      btnBg.clear();
      btnBg.fillStyle(hover ? 0xff7a1a : 0xff6200, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    };
    drawRefillBtn(false);
    ctr.add(btnBg);

    ctr.add(
      this.add.text(CW / 2, btnY + btnH / 2, 'REFILL — 50 FREE', {
        fontFamily: 'Inter,system-ui,sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#fff',
      }).setOrigin(0.5)
    );

    // Zone is NOT inside the container so hit-testing works in world space
    const zone = this.add.zone(CW / 2, btnY + btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true })
      .setDepth(21);

    const cleanup = () => {
      ctr.destroy(true);
      zone.destroy();
    };

    zone.on('pointerdown', () => {
      this.credits = 50;
      this.creditTxt.setText('50');
      cleanup();
    });
    zone.on('pointerover',  () => drawRefillBtn(true));
    zone.on('pointerout',   () => drawRefillBtn(false));

    // Fade the container in
    this.tweens.add({ targets: ctr, alpha: 1, duration: 280, ease: 'Linear' });
  }
}

// ─── Paytable data (mirrors SYMBOLS above) ────────────────────────────────────
const PAYTABLE = [
  { label: 'PS5',    name: 'PS5 Console',  color: '#003db8', value: 10, tag: 'JACKPOT' },
  { label: 'iPHONE', name: 'Smartphone',   color: '#636366', value: 5,  tag: 'BIG WIN' },
  { label: 'PODS',   name: 'Headphones',   color: '#9945ff', value: 4,  tag: 'BIG WIN' },
  { label: 'GIFT',   name: 'Gift Card',    color: '#16a34a', value: 2,  tag: null       },
  { label: 'CASH',   name: 'Cash Voucher', color: '#d97706', value: 1,  tag: null       },
];

// ─── React wrapper ────────────────────────────────────────────────────────────
export function SlotsPage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const game = new Phaser.Game({
      type:            Phaser.AUTO,
      width:           CW,
      height:          CH,
      backgroundColor: '#060e18',
      parent:          ref.current,
      scene:           [BootScene, GameScene],
      scale: {
        mode:       Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias:   true,
        antialiasGL: true,
        pixelArt:    false,
      },
    });

    return () => { game.destroy(true); };
  }, []);

  return (
    <div className="slots-page">
      <div className="slots-canvas-wrap" ref={ref} />

      <div className="slots-paytable">
        <div className="slots-paytable__title">PAYTABLE — middle row pays</div>
        <div className="slots-paytable__rows">
          {PAYTABLE.map(row => (
            <div key={row.label} className="slots-paytable__row">
              <div className="slots-paytable__syms">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="slots-paytable__chip"
                    style={{ color: row.color, borderColor: row.color }}
                  >
                    {row.label}
                  </span>
                ))}
              </div>
              <div className="slots-paytable__arrow">&rarr;</div>
              <div className="slots-paytable__payout">
                <span className="slots-paytable__name">{row.name}</span>
                <span className="slots-paytable__credits">+{row.value}cr</span>
                {row.tag && (
                  <span
                    className="slots-paytable__tag"
                    style={{ color: row.color, borderColor: row.color }}
                  >
                    {row.tag}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="slots-paytable__note">1 credit per spin · middle row only</div>
      </div>
    </div>
  );
}
