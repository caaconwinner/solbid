import { useEffect, useRef } from 'react';

// ── Tile size (matches SlotsPage SYM_W × SYM_H) ─────────────────────────────
const W = 94;
const H = 96;

// ── Rounded-rect helper ───────────────────────────────────────────────────────
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

// ── Draw tile background + icon + label ───────────────────────────────────────
function drawTile(
  ctx: CanvasRenderingContext2D,
  bg0: string, bg1: string,
  glowRgb: string,
  labelColor: string,
  label: string,
  drawIcon: (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void,
) {
  ctx.clearRect(0, 0, W, H);

  // Clipped rounded background
  ctx.save();
  rr(ctx, 0, 0, W, H, 10);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, W * 0.65, H);
  bg.addColorStop(0, bg0);
  bg.addColorStop(1, bg1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Corner bloom
  const bloom = ctx.createRadialGradient(W * 0.82, H * 0.12, 0, W * 0.82, H * 0.12, W * 0.7);
  bloom.addColorStop(0,    `rgba(${glowRgb},0.22)`);
  bloom.addColorStop(0.45, `rgba(${glowRgb},0.06)`);
  bloom.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);

  // Bottom vignette
  const vign = ctx.createLinearGradient(0, H * 0.5, 0, H);
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  ctx.restore();

  // Icon
  drawIcon(ctx, W / 2, H / 2 - 5);

  // Label
  ctx.save();
  ctx.font = 'bold 9px Inter,system-ui,sans-serif';
  ctx.fillStyle = labelColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 5;
  ctx.fillText(label, W / 2, H - 3);
  ctx.restore();

  // Border
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.17)';
  ctx.lineWidth = 1.5;
  rr(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 10);
  ctx.stroke();
  ctx.restore();
}

// ── Icon: PS5 controller ───────────────────────────────────────────────────────
function iconController(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(60,120,255,0.6)';
  ctx.shadowBlur = 10;
  const bodyG = ctx.createLinearGradient(cx - 30, cy - 18, cx + 15, cy + 20);
  bodyG.addColorStop(0, '#7090e0');
  bodyG.addColorStop(1, '#2848a8');
  ctx.fillStyle = bodyG;
  rr(ctx, cx - 30, cy - 16, 60, 26, 12);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1e3888';
  rr(ctx, cx - 27, cy + 7, 14, 20, 7); ctx.fill();
  rr(ctx, cx + 13, cy + 7, 14, 20, 7); ctx.fill();
  ctx.fillStyle = 'rgba(90,130,210,0.85)';
  rr(ctx, cx - 27, cy - 24, 12, 9, 3); ctx.fill();
  rr(ctx, cx + 15, cy - 24, 12, 9, 3); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(cx, cy - 2, 10, 6.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,170,255,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, cy - 2, 10, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.arc(cx - 16, cy + 6, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(60,100,200,0.8)';
  ctx.beginPath(); ctx.arc(cx - 16, cy + 6, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath(); ctx.arc(cx + 8, cy + 16, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(60,100,200,0.8)';
  ctx.beginPath(); ctx.arc(cx + 8, cy + 16, 4.5, 0, Math.PI * 2); ctx.fill();
  const btns = [{x:cx+21,y:cy-8,c:'#3ece5a'},{x:cx+28,y:cy-2,c:'#ff4055'},{x:cx+21,y:cy+4,c:'#4488ff'},{x:cx+14,y:cy-2,c:'#cc88ff'}];
  for (const b of btns) {
    ctx.fillStyle = b.c; ctx.shadowColor = b.c; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ── Icon: Smartphone ──────────────────────────────────────────────────────────
function iconPhone(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(100,160,255,0.5)';
  ctx.shadowBlur = 10;
  const bodyG = ctx.createLinearGradient(cx - 21, cy - 38, cx + 21, cy + 38);
  bodyG.addColorStop(0, '#607090');
  bodyG.addColorStop(1, '#2a3a58');
  ctx.fillStyle = bodyG;
  rr(ctx, cx - 20, cy - 38, 40, 78, 12); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#060e18';
  rr(ctx, cx - 16, cy - 32, 32, 60, 8); ctx.fill();
  const sg = ctx.createRadialGradient(cx, cy - 10, 5, cx, cy - 10, 28);
  sg.addColorStop(0, 'rgba(60,120,255,0.18)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  rr(ctx, cx - 16, cy - 32, 32, 60, 8); ctx.fill();
  ctx.fillStyle = 'rgba(80,130,220,0.5)';
  for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
    rr(ctx, cx - 13 + col * 14, cy - 22 + row * 14, 10, 10, 3); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  rr(ctx, cx - 9, cy - 31, 18, 5, 3); ctx.fill();
  ctx.fillStyle = 'rgba(120,160,220,0.4)';
  rr(ctx, cx - 10, cy + 22, 20, 3, 2); ctx.fill();
  const sbG = ctx.createLinearGradient(cx + 20, 0, cx + 24, 0);
  sbG.addColorStop(0, 'rgba(150,180,240,0.9)');
  sbG.addColorStop(1, 'rgba(80,120,180,0.6)');
  ctx.fillStyle = sbG;
  rr(ctx, cx + 20, cy - 14, 3, 14, 2); ctx.fill();
  ctx.restore();
}

// ── Icon: Over-ear headphones ─────────────────────────────────────────────────
function iconHeadphones(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(220,60,100,0.5)';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#cc3060'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy - 4, 26, Math.PI, 0, false); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,120,160,0.35)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy - 4, 26, Math.PI * 1.1, Math.PI * 1.8, false); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#8a1830';
  rr(ctx, cx - 29, cy - 28, 6, 22, 3); ctx.fill();
  rr(ctx, cx + 23, cy - 28, 6, 22, 3); ctx.fill();
  const cupLG = ctx.createRadialGradient(cx - 28, cy - 3, 0, cx - 26, cy, 14);
  cupLG.addColorStop(0, '#e03060'); cupLG.addColorStop(1, '#801030');
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
  const cupRG = ctx.createRadialGradient(cx + 24, cy - 3, 0, cx + 26, cy, 14);
  cupRG.addColorStop(0, '#e03060'); cupRG.addColorStop(1, '#801030');
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

// ── Icon: Gift box ────────────────────────────────────────────────────────────
function iconGift(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(40,200,100,0.5)';
  ctx.shadowBlur = 10;
  const boxG = ctx.createLinearGradient(cx - 28, cy - 6, cx + 28, cy + 26);
  boxG.addColorStop(0, '#1e7840'); boxG.addColorStop(1, '#0a4020');
  ctx.fillStyle = boxG;
  rr(ctx, cx - 28, cy - 4, 56, 32, 6); ctx.fill();
  ctx.shadowBlur = 0;
  const lidG = ctx.createLinearGradient(cx - 28, cy - 18, cx + 28, cy - 4);
  lidG.addColorStop(0, '#28a050'); lidG.addColorStop(1, '#145a28');
  ctx.fillStyle = lidG;
  rr(ctx, cx - 28, cy - 18, 56, 16, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillRect(cx - 3, cy - 18, 6, 46);
  ctx.fillRect(cx - 28, cy - 7, 56, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.ellipse(cx - 13, cy - 22, 12, 7, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 13, cy - 22, 12, 7,  0.3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'rgba(255,255,255,0.5)'; ctx.shadowBlur = 4;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(cx, cy - 22, 5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  rr(ctx, cx - 27, cy - 17, 28, 14, 3); ctx.fill();
  ctx.restore();
}

// ── Icon: Gold coin ───────────────────────────────────────────────────────────
function iconCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(255,180,0,0.7)';
  ctx.shadowBlur = 14;
  const ringG = ctx.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, 30);
  ringG.addColorStop(0, '#ffe080'); ringG.addColorStop(0.45, '#d4820a'); ringG.addColorStop(1, '#7a4200');
  ctx.fillStyle = ringG;
  ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  const faceG = ctx.createRadialGradient(cx - 4, cy - 6, 2, cx, cy, 24);
  faceG.addColorStop(0, '#ffd050'); faceG.addColorStop(0.6, '#c07008'); faceG.addColorStop(1, '#6a3800');
  ctx.fillStyle = faceG;
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,60,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();
  const bars = [{ y: -10, tilt: 0.18 }, { y: 0, tilt: 0 }, { y: 10, tilt: -0.18 }];
  ctx.fillStyle = '#3a1e00';
  for (const b of bars) {
    ctx.save(); ctx.translate(cx, cy + b.y); ctx.rotate(b.tilt);
    rr(ctx, -14, -3.5, 28, 7, 3.5); ctx.fill();
    ctx.restore();
  }
  const hl = ctx.createRadialGradient(cx - 10, cy - 12, 1, cx - 8, cy - 10, 16);
  hl.addColorStop(0, 'rgba(255,255,200,0.3)'); hl.addColorStop(1, 'rgba(255,255,200,0)');
  ctx.fillStyle = hl;
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── Tile definitions (mirrors SlotsPage generateTextures order) ───────────────
const TILE_DEFS = [
  { label: 'PS5',    bg0: '#0a1438', bg1: '#142060', glow: '80,130,255',  labelColor: '#7aabff', draw: iconController },
  { label: 'iPHONE', bg0: '#0e1826', bg1: '#1c2e48', glow: '100,160,240', labelColor: '#90b8e8', draw: iconPhone       },
  { label: 'PODS',   bg0: '#1e0810', bg1: '#4a1020', glow: '240,60,100',  labelColor: '#f080a0', draw: iconHeadphones  },
  { label: 'GIFT',   bg0: '#081808', bg1: '#104828', glow: '40,200,90',   labelColor: '#50d070', draw: iconGift        },
  { label: 'CASH',   bg0: '#180e00', bg1: '#3c2008', glow: '255,180,0',   labelColor: '#ffc030', draw: iconCoin        },
];

// ── Single tile canvas ────────────────────────────────────────────────────────
function TileCanvas({ def }: { def: typeof TILE_DEFS[number] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawTile(ctx, def.bg0, def.bg1, def.glow, def.labelColor, def.label, def.draw);
  }, [def]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      className="slot-tile-canvas"
      title={def.label}
    />
  );
}

// ── Public component: row of all 5 tiles ─────────────────────────────────────
export function SlotTilePreview() {
  return (
    <div className="slot-tile-preview">
      {TILE_DEFS.map(def => (
        <TileCanvas key={def.label} def={def} />
      ))}
    </div>
  );
}
