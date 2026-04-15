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

// ─── Canvas 2D helpers ────────────────────────────────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,      y + h - r, r);
  ctx.lineTo(x,    y + r);
  ctx.arcTo(x,     y,     x + r,  y,         r);
  ctx.closePath();
}

// Banner-style tile: gradient bg + corner bloom + icon + label
function makeTile(
  scene: Phaser.Scene,
  key: string, w: number, h: number,
  bg0: string, bg1: string,
  glowRgb: string,       // e.g. "80,160,255"
  labelColor: string,
  label: string,
  drawIcon: (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void,
) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h) as Phaser.Textures.CanvasTexture;
  const ctx = tex.getContext() as CanvasRenderingContext2D;

  // ── Gradient background (clipped to rounded rect) ──
  ctx.save();
  rr(ctx, 0, 0, w, h, 10);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, w * 0.65, h);
  bg.addColorStop(0, bg0);
  bg.addColorStop(1, bg1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Corner bloom (top-right light source)
  const bloom = ctx.createRadialGradient(w * 0.82, h * 0.12, 0, w * 0.82, h * 0.12, w * 0.7);
  bloom.addColorStop(0,   `rgba(${glowRgb},0.22)`);
  bloom.addColorStop(0.45,`rgba(${glowRgb},0.06)`);
  bloom.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, w, h);

  // Bottom vignette
  const vign = ctx.createLinearGradient(0, h * 0.5, 0, h);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();

  // ── Icon ──
  drawIcon(ctx, w / 2, h / 2 - 5);

  // ── Label ──
  ctx.save();
  ctx.font = 'bold 9px Inter,system-ui,sans-serif';
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 5;
  ctx.fillText(label, w / 2, h - 3);
  ctx.restore();

  // ── Border ──
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.17)';
  ctx.lineWidth = 1.5;
  rr(ctx, 0.75, 0.75, w - 1.5, h - 1.5, 10);
  ctx.stroke();
  ctx.restore();

  tex.refresh();
}

// ── Icon: PS5 DualSense controller ──
function iconController(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  // Body
  ctx.shadowColor = 'rgba(60,120,255,0.6)';
  ctx.shadowBlur = 10;
  const bodyG = ctx.createLinearGradient(cx - 30, cy - 18, cx + 15, cy + 20);
  bodyG.addColorStop(0, '#7090e0');
  bodyG.addColorStop(1, '#2848a8');
  ctx.fillStyle = bodyG;
  rr(ctx, cx - 30, cy - 16, 60, 26, 12);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Grips
  ctx.fillStyle = '#1e3888';
  rr(ctx, cx - 27, cy + 7, 14, 20, 7);
  ctx.fill();
  rr(ctx, cx + 13, cy + 7, 14, 20, 7);
  ctx.fill();
  // Bumpers
  ctx.fillStyle = 'rgba(90,130,210,0.85)';
  rr(ctx, cx - 27, cy - 24, 12, 9, 3);
  ctx.fill();
  rr(ctx, cx + 15, cy - 24, 12, 9, 3);
  ctx.fill();
  // Touchpad
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(cx, cy - 2, 10, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,170,255,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, cy - 2, 10, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
  // Left stick
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.arc(cx - 16, cy + 6, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(60,100,200,0.8)';
  ctx.beginPath(); ctx.arc(cx - 16, cy + 6, 4.5, 0, Math.PI * 2); ctx.fill();
  // Right stick
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.arc(cx + 8, cy + 16, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(60,100,200,0.8)';
  ctx.beginPath(); ctx.arc(cx + 8, cy + 16, 4.5, 0, Math.PI * 2); ctx.fill();
  // Face buttons
  const btns = [{x:cx+21,y:cy-8,c:'#3ece5a'},{x:cx+28,y:cy-2,c:'#ff4055'},{x:cx+21,y:cy+4,c:'#4488ff'},{x:cx+14,y:cy-2,c:'#cc88ff'}];
  for (const b of btns) {
    ctx.fillStyle = b.c; ctx.shadowColor = b.c; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Icon: Smartphone ──
function iconPhone(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(100,160,255,0.5)';
  ctx.shadowBlur = 10;
  const bodyG = ctx.createLinearGradient(cx - 21, cy - 38, cx + 21, cy + 38);
  bodyG.addColorStop(0, '#607090');
  bodyG.addColorStop(1, '#2a3a58');
  ctx.fillStyle = bodyG;
  rr(ctx, cx - 20, cy - 38, 40, 78, 12);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Screen
  ctx.fillStyle = '#060e18';
  rr(ctx, cx - 16, cy - 32, 32, 60, 8);
  ctx.fill();
  // Screen glow
  const sg = ctx.createRadialGradient(cx, cy - 10, 5, cx, cy - 10, 28);
  sg.addColorStop(0, 'rgba(60,120,255,0.18)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  rr(ctx, cx - 16, cy - 32, 32, 60, 8);
  ctx.fill();
  // App grid
  ctx.fillStyle = 'rgba(80,130,220,0.5)';
  for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
    rr(ctx, cx - 13 + col * 14, cy - 22 + row * 14, 10, 10, 3);
    ctx.fill();
  }
  // Dynamic island
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  rr(ctx, cx - 9, cy - 31, 18, 5, 3);
  ctx.fill();
  // Home bar
  ctx.fillStyle = 'rgba(120,160,220,0.4)';
  rr(ctx, cx - 10, cy + 22, 20, 3, 2);
  ctx.fill();
  // Side button highlight
  const sbG = ctx.createLinearGradient(cx + 20, 0, cx + 24, 0);
  sbG.addColorStop(0, 'rgba(150,180,240,0.9)');
  sbG.addColorStop(1, 'rgba(80,120,180,0.6)');
  ctx.fillStyle = sbG;
  rr(ctx, cx + 20, cy - 14, 3, 14, 2);
  ctx.fill();
  ctx.restore();
}

// ── Icon: Over-ear headphones ──
function iconHeadphones(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(220,60,100,0.5)';
  ctx.shadowBlur = 10;
  // Headband
  ctx.strokeStyle = '#cc3060';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 26, Math.PI, 0, false);
  ctx.stroke();
  // Band highlight
  ctx.strokeStyle = 'rgba(255,120,160,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 26, Math.PI * 1.1, Math.PI * 1.8, false);
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Sliders
  ctx.fillStyle = '#8a1830';
  rr(ctx, cx - 29, cy - 28, 6, 22, 3); ctx.fill();
  rr(ctx, cx + 23, cy - 28, 6, 22, 3); ctx.fill();
  // Cup L outer
  const cupLG = ctx.createRadialGradient(cx - 28, cy - 3, 0, cx - 26, cy, 14);
  cupLG.addColorStop(0, '#e03060');
  cupLG.addColorStop(1, '#801030');
  ctx.fillStyle = cupLG;
  ctx.shadowColor = 'rgba(220,40,80,0.6)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(cx - 26, cy, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.arc(cx - 26, cy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(220,60,100,0.5)';
  ctx.beginPath(); ctx.arc(cx - 26, cy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.arc(cx - 29, cy - 4, 4, 0, Math.PI * 2); ctx.fill();
  // Cup R outer
  const cupRG = ctx.createRadialGradient(cx + 24, cy - 3, 0, cx + 26, cy, 14);
  cupRG.addColorStop(0, '#e03060');
  cupRG.addColorStop(1, '#801030');
  ctx.fillStyle = cupRG;
  ctx.shadowColor = 'rgba(220,40,80,0.6)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(cx + 26, cy, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.arc(cx + 26, cy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(220,60,100,0.5)';
  ctx.beginPath(); ctx.arc(cx + 26, cy, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.arc(cx + 23, cy - 4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── Icon: Gift box ──
function iconGift(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(40,200,100,0.5)';
  ctx.shadowBlur = 10;
  // Box body
  const boxG = ctx.createLinearGradient(cx - 28, cy - 6, cx + 28, cy + 26);
  boxG.addColorStop(0, '#1e7840');
  boxG.addColorStop(1, '#0a4020');
  ctx.fillStyle = boxG;
  rr(ctx, cx - 28, cy - 4, 56, 32, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Lid
  const lidG = ctx.createLinearGradient(cx - 28, cy - 18, cx + 28, cy - 4);
  lidG.addColorStop(0, '#28a050');
  lidG.addColorStop(1, '#145a28');
  ctx.fillStyle = lidG;
  rr(ctx, cx - 28, cy - 18, 56, 16, 4);
  ctx.fill();
  // Ribbon vertical
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(cx - 3, cy - 18, 6, 46);
  // Ribbon horizontal
  ctx.fillRect(cx - 28, cy - 7, 56, 6);
  // Bow loops
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(cx - 13, cy - 22, 12, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 13, cy - 22, 12, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Bow knot
  ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy - 22, 5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // Shine on lid
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  rr(ctx, cx - 27, cy - 17, 28, 14, 3);
  ctx.fill();
  ctx.restore();
}

// ── Icon: Gold coin (SOL) ──
function iconCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  // Outer ring shadow
  ctx.shadowColor = 'rgba(255,180,0,0.7)';
  ctx.shadowBlur = 14;
  const ringG = ctx.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, 30);
  ringG.addColorStop(0, '#ffe080');
  ringG.addColorStop(0.45, '#d4820a');
  ringG.addColorStop(1, '#7a4200');
  ctx.fillStyle = ringG;
  ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  // Inner face
  const faceG = ctx.createRadialGradient(cx - 4, cy - 6, 2, cx, cy, 24);
  faceG.addColorStop(0, '#ffd050');
  faceG.addColorStop(0.6, '#c07008');
  faceG.addColorStop(1, '#6a3800');
  ctx.fillStyle = faceG;
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
  // Edge bevel
  ctx.strokeStyle = 'rgba(255,220,60,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();
  // SOL logo — hexagon-ish bars
  const bars = [
    { y: -10, tilt:  0.18 },
    { y:   0, tilt:  0    },
    { y:  10, tilt: -0.18 },
  ];
  ctx.fillStyle = '#3a1e00';
  for (const b of bars) {
    ctx.save();
    ctx.translate(cx, cy + b.y);
    ctx.rotate(b.tilt);
    rr(ctx, -14, -3.5, 28, 7, 3.5);
    ctx.fill();
    ctx.restore();
  }
  // Highlight arc (top-left)
  const hl = ctx.createRadialGradient(cx - 10, cy - 12, 1, cx - 8, cy - 10, 16);
  hl.addColorStop(0, 'rgba(255,255,200,0.3)');
  hl.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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
    // Banner-style tiles: gradient bg + canvas-drawn 3D icon
    const defs: Array<{
      bg0: string; bg1: string; glow: string; labelColor: string;
      draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void;
    }> = [
      { bg0: '#0a1438', bg1: '#142060', glow: '80,130,255',  labelColor: '#7aabff', draw: iconController  },
      { bg0: '#0e1826', bg1: '#1c2e48', glow: '100,160,240', labelColor: '#90b8e8', draw: iconPhone        },
      { bg0: '#1e0810', bg1: '#4a1020', glow: '240,60,100',  labelColor: '#f080a0', draw: iconHeadphones   },
      { bg0: '#081808', bg1: '#104828', glow: '40,200,90',   labelColor: '#50d070', draw: iconGift         },
      { bg0: '#180e00', bg1: '#3c2008', glow: '255,180,0',   labelColor: '#ffc030', draw: iconCoin         },
    ];

    for (const s of SYMBOLS) {
      const d = defs[s.id];
      makeTile(this, s.key, SYM_W, SYM_H, d.bg0, d.bg1, d.glow, d.labelColor, s.label, d.draw);
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
