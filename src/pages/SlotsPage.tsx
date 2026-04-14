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

// ─── Symbols ──────────────────────────────────────────────────────────────────
type Sym = { id: number; key: string; label: string; color: number; tc: string; value: number };

const SYMBOLS: Sym[] = [
  { id: 0, key: 's_penny',  label: '$P',  color: 0xff6200, tc: '#ffffff', value: 10 }, // jackpot
  { id: 1, key: 's_bid',    label: 'BID', color: 0x00bcd4, tc: '#ffffff', value: 5  },
  { id: 2, key: 's_seven',  label: '7',   color: 0xffd700, tc: '#111111', value: 4  },
  { id: 3, key: 's_bar',    label: 'BAR', color: 0xb0b0b0, tc: '#111111', value: 2  },
  { id: 4, key: 's_heart',  label: '\u2665', color: 0xff3366, tc: '#ffffff', value: 1  },
];

// Weighted strips — jackpot ($P) is rarest
const STRIPS: number[][] = [
  [0, 4, 3, 2, 4, 1, 3, 4, 2, 4, 3, 1, 4, 3, 2, 4],
  [4, 3, 2, 4, 1, 4, 3, 0, 4, 2, 4, 3, 1, 4, 2, 3],
  [2, 4, 3, 1, 4, 2, 4, 3, 4, 0, 4, 1, 4, 2, 3, 4],
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReelData {
  col:       number;
  x:         number;
  container: Phaser.GameObjects.Container;
  cells:     Phaser.GameObjects.Image[];   // 3 persistent visible cells
  extras:    Phaser.GameObjects.Image[];   // temp cells added during spin
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
  private credits   = 100;
  private spinning  = false;
  private reels:    ReelData[] = [];
  private creditTxt!: Phaser.GameObjects.Text;
  private btnGfx!:    Phaser.GameObjects.Graphics;

  private readonly BTN_Y = REEL_Y + REEL_H + 106;
  private readonly BTN_W = 175;
  private readonly BTN_H = 50;

  constructor() { super('GameScene'); }

  create() {
    this.generateSymbolTextures();
    this.buildBackground();
    this.buildReels();
    this.buildPaylineMark();
    this.buildCreditDisplay();
    this.buildSpinButton();
  }

  // ── Symbol textures (generated in code, no image files) ────────────────────
  private generateSymbolTextures() {
    for (const s of SYMBOLS) {
      if (this.textures.exists(s.key)) continue;

      const rt = this.add.renderTexture(0, 0, SYM_W, SYM_H);

      // Background + tint + border
      const bg = this.make.graphics({}, false);
      bg.fillStyle(0x0d1e2e, 1);
      bg.fillRoundedRect(0, 0, SYM_W, SYM_H, 10);
      bg.fillStyle(s.color, 0.18);
      bg.fillRoundedRect(3, 3, SYM_W - 6, SYM_H - 6, 8);
      bg.lineStyle(2.5, s.color, 0.75);
      bg.strokeRoundedRect(1, 1, SYM_W - 2, SYM_H - 2, 10);
      rt.draw(bg, 0, 0);
      bg.destroy();

      // Label — centered via manual offset
      const fs = s.label.length > 2 ? '20px' : s.label.length > 1 ? '26px' : '38px';
      const lbl = this.make.text({
        x: 0, y: 0,
        text: s.label,
        style: { fontFamily: 'Inter,system-ui,sans-serif', fontSize: fs, fontStyle: 'bold', color: s.tc },
      }, false);
      rt.draw(lbl, (SYM_W - lbl.width) / 2, (SYM_H - lbl.height) / 2);
      lbl.destroy();

      rt.saveTexture(s.key);
      rt.destroy();
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

      // Frame background
      const frame = this.add.graphics();
      frame.fillStyle(0x0b1825, 1);
      frame.lineStyle(2, 0x1c3248, 1);
      frame.fillRoundedRect(x, REEL_Y, REEL_W, REEL_H, 8);
      frame.strokeRoundedRect(x, REEL_Y, REEL_W, REEL_H, 8);

      // Geometry mask — clips symbols to reel window
      const mGfx = this.make.graphics({}, false);
      mGfx.fillStyle(0xffffff);
      mGfx.fillRect(x + 2, REEL_Y + 2, REEL_W - 4, REEL_H - 4);
      const mask = mGfx.createGeometryMask();

      const container = this.add.container(0, 0);
      container.setMask(mask);

      // 3 initial cells at random strip position
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
    // Side arrow indicators
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

    const finalMids: number[] = [];
    let stopped = 0;

    for (let col = 0; col < REEL_COLS; col++) {
      const reel      = this.reels[col];
      const finalIdx  = Phaser.Math.Between(0, reel.strip.length - 1);
      const finalSyms = [0, 1, 2].map(r => reel.strip[(finalIdx + r) % reel.strip.length]);

      this.spinReel(reel, col, finalSyms, () => {
        finalMids[col] = finalSyms[1]; // row index 1 = middle payline
        stopped++;
        if (stopped === REEL_COLS) {
          this.spinning = false;
          this.checkWin(finalMids);
        }
      });
    }
  }

  // Scroll animation: prepend N+3 extra cells above the reel, tween container down
  // by (N+3)*CELL_H so the last 3 extras land exactly in rows 0,1,2.
  private spinReel(
    reel:      ReelData,
    col:       number,
    finalSyms: number[],  // [row0, row1, row2] desired symbols after stop
    onDone:    () => void
  ) {
    // N = filler cells before the final 3. More for later reels → staggered stop.
    const N           = 12 + col * 4;   // col0=12, col1=16, col2=20
    const totalExtras = N + 3;

    // Math: after tween (+totalExtras*CELL_H), extra cell i lands at world y:
    //   (REEL_Y - (i+1)*CELL_H + CELL_H/2) + totalExtras*CELL_H
    //   = REEL_Y + (totalExtras - i - 1)*CELL_H + CELL_H/2
    // For row r: REEL_Y + r*CELL_H + CELL_H/2  →  i = totalExtras - 1 - r
    //   row 0: i = N+2  →  finalSyms[0]
    //   row 1: i = N+1  →  finalSyms[1]
    //   row 2: i = N    →  finalSyms[2]

    const extras: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < totalExtras; i++) {
      const symId = i < N
        ? reel.strip[Phaser.Math.Between(0, reel.strip.length - 1)]
        : finalSyms[N + 2 - i];  // i=N→finalSyms[2], N+1→[1], N+2→[0]

      const localY = REEL_Y - (i + 1) * CELL_H + CELL_H / 2;
      const img    = this.add.image(reel.x + REEL_W / 2, localY, SYMBOLS[symId].key);
      reel.container.add(img);
      extras.push(img);
    }
    reel.extras = extras;

    // Duration staggers per col so reels stop left-to-right
    const duration = 1000 + col * 400;

    this.tweens.add({
      targets:  reel.container,
      y:        reel.container.y + totalExtras * CELL_H,
      duration,
      ease:     'Cubic.Out',
      onComplete: () => {
        // Snap: restore main cells with final symbols, destroy extras, reset container
        for (let r = 0; r < REEL_ROWS; r++) {
          reel.cells[r].setTexture(SYMBOLS[finalSyms[r]].key);
          reel.cells[r].y = REEL_Y + r * CELL_H + CELL_H / 2;
        }
        reel.extras.forEach(e => e.destroy());
        reel.extras       = [];
        reel.container.y  = 0;
        onDone();
      },
    });
  }

  // ── Win detection (middle payline) ─────────────────────────────────────────
  private checkWin(middle: number[]) {
    const [a, b, c] = middle;
    const labels    = middle.map(id => SYMBOLS[id].label).join(' | ');
    if (a === b && b === c) {
      const sym = SYMBOLS[a];
      const won = sym.value;
      this.credits += won;
      this.creditTxt.setText(String(this.credits));
      console.log(`\uD83C\uDFB0 WIN!  ${sym.label} \xD7 3  \u2192  +${won} credits  (balance: ${this.credits})`);
    } else {
      console.log(`No win — [ ${labels} ]`);
    }
  }
}

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
    </div>
  );
}
