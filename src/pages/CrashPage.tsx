import { useEffect, useRef, useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CURVE_K    = 0.07;   // multiplier = e^(K * seconds)
const WAIT_SECS  = 5;
const CRASH_HOLD = 4000;   // ms to show crashed state before next round
const TRUMP_SIZE = 52;     // half-width of Trump image in CSS pixels

// ─── Milestones ───────────────────────────────────────────────────────────────
const MILESTONES = [
  { threshold:  1.5,  msg: 'A VERY STABLE ROCKET',        tier: 0 },
  { threshold:  2.0,  msg: 'MAKING PROGRESS, BIGLY!',     tier: 1 },
  { threshold:  5.0,  msg: 'THE BIGGEST MULTIPLIER EVER', tier: 2 },
  { threshold: 10.0,  msg: 'TIRED OF WINNING YET?',       tier: 3 },
  { threshold: 20.0,  msg: 'HISTORIC NUMBERS!',           tier: 4 },
  { threshold: 50.0,  msg: 'TOLL THE BELLS!',             tier: 5 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'waiting' | 'running' | 'crashed';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

interface Star {
  x: number; y: number;
  r: number;        // base radius
  alpha: number;    // base opacity
  speed: number;    // px/frame at mult=1
  layer: number;    // 0 | 1 | 2
}

interface MilestonePopup {
  msg: string;
  x: number; y: number;   // canvas px — where it spawned
  createdAt: number;      // Date.now()
  tier: number;           // 0–5
}

interface SpaceObject {
  type: 'redhat' | 'building' | 'asteroid';
  x: number; y: number;
  vx: number; vy: number;
  angle: number;        // rotation (radians)
  vAngle: number;       // rotation speed
  scale: number;
  createdAt: number;
}

const SPACE_EVENTS: { threshold: number; type: SpaceObject['type'] }[] = [
  { threshold:  1.1, type: 'redhat'   },
  { threshold:  3.0, type: 'building' },
  { threshold: 10.0, type: 'asteroid' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genCrashPoint(): number {
  const r = Math.random();
  if (r < 0.01) return 1.00;
  return Math.min(Math.floor(100 / (1 - r)) / 100, 500);
}

function fmt(m: number) {
  return m.toFixed(2) + '\u00d7';
}

// ── 2B: Multiplier color — white → orange → red → magenta ────────────────────
function lerpRGB(c1: [number,number,number], c2: [number,number,number], t: number): string {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function multColor(m: number): string {
  if (m <  2)  return lerpRGB([255,255,255], [255,200,80],  Math.max(0, m - 1));
  if (m <  5)  return lerpRGB([255,200,80],  [255,110,0],   (m - 2) / 3);
  if (m < 10)  return lerpRGB([255,110,0],   [255,40,0],    (m - 5) / 5);
  if (m < 20)  return lerpRGB([255,40,0],    [255,0,80],    (m - 10) / 10);
  return '#ff0080'; // handled by CSS flash above 20×
}

// ─── Draw Trump tilted along the curve tangent ───────────────────────────────
function drawTrump(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number,
  angle: number,   // curve tangent angle (radians)
  size: number,    // half-width in canvas pixels
  crashed = false,
) {
  ctx.save();
  ctx.translate(x, y);
  // Rotate to follow the curve. The image has Trump sitting upright facing
  // right, so rotating by (angle - π/2) makes his bottom face backward along
  // the curve — the "launch from ass" orientation.
  ctx.rotate(angle + Math.PI / 2);

  if (crashed) {
    ctx.filter = 'hue-rotate(160deg) brightness(0.6)';
  }

  // Draw centered, aspect-ratio preserved (image is roughly square after bg removal)
  const w = size * 1.3;
  const h = size * 1.3;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  ctx.restore();
}

// ─── Space Object Drawers ─────────────────────────────────────────────────────
function drawRedHat(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const W = 56, H = 30;

  // Brim
  ctx.beginPath();
  ctx.ellipse(0, H * 0.35, W * 0.54, H * 0.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c8001e';
  ctx.fill();

  // Crown
  ctx.beginPath();
  ctx.moveTo(-W * 0.38, H * 0.35);
  ctx.bezierCurveTo(-W * 0.42, -H * 0.6, -W * 0.15, -H * 0.9, 0, -H * 0.88);
  ctx.bezierCurveTo(W * 0.15, -H * 0.9, W * 0.42, -H * 0.6, W * 0.38, H * 0.35);
  ctx.closePath();
  ctx.fillStyle = '#d40020';
  ctx.fill();

  // White text "MAKE" on front (tiny)
  ctx.font = `bold ${H * 0.28}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('MAKE', 0, -H * 0.12);
  ctx.font = `bold ${H * 0.22}px sans-serif`;
  ctx.fillText('AMERICA', 0, H * 0.12);

  // Subtle brim shadow line
  ctx.beginPath();
  ctx.moveTo(-W * 0.38, H * 0.33);
  ctx.lineTo(W * 0.38, H * 0.33);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function drawGoldenBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const W = 28, H = 80;

  // Main tower body — gold gradient
  const grad = ctx.createLinearGradient(-W / 2, 0, W / 2, 0);
  grad.addColorStop(0,   '#8a6600');
  grad.addColorStop(0.3, '#ffd700');
  grad.addColorStop(0.6, '#ffe566');
  grad.addColorStop(1,   '#a07800');
  ctx.fillStyle = grad;
  ctx.fillRect(-W / 2, -H, W, H);

  // Tapering spire
  ctx.beginPath();
  ctx.moveTo(-W * 0.18, -H);
  ctx.lineTo(W * 0.18, -H);
  ctx.lineTo(0, -H - 18);
  ctx.closePath();
  const spireGrad = ctx.createLinearGradient(-W * 0.18, 0, W * 0.18, 0);
  spireGrad.addColorStop(0, '#c8a200');
  spireGrad.addColorStop(0.5, '#ffe566');
  spireGrad.addColorStop(1, '#c8a200');
  ctx.fillStyle = spireGrad;
  ctx.fill();

  // Window grid (6 rows × 3 cols)
  ctx.fillStyle = 'rgba(0,20,60,0.65)';
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 3; col++) {
      const wx = -W / 2 + 3 + col * 9;
      const wy = -H + 8 + row * 12;
      ctx.fillRect(wx, wy, 5, 7);
      // Occasional lit window
      if ((row + col) % 3 === 0) {
        ctx.fillStyle = 'rgba(255,240,100,0.5)';
        ctx.fillRect(wx, wy, 5, 7);
        ctx.fillStyle = 'rgba(0,20,60,0.65)';
      }
    }
  }

  // "TRUMP" label
  ctx.save();
  ctx.font = `bold ${W * 0.28}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText('TRUMP', 0, -H * 0.28);
  ctx.restore();

  ctx.restore();
}

function drawFakeNewsAsteroid(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number, angle: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const R = 34;

  // Irregular rocky shape using bezier blobs
  ctx.beginPath();
  const pts = [
    [R * 1.0, 0], [R * 0.7, -R * 0.75], [R * 0.1, -R * 1.05],
    [-R * 0.55, -R * 0.85], [-R * 1.0, -R * 0.2], [-R * 0.9, R * 0.5],
    [-R * 0.3, R * 1.0], [R * 0.5, R * 0.9], [R * 1.05, R * 0.35],
  ];
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i][0] + pts[(i + 1) % pts.length][0]) / 2;
    const my = (pts[i][1] + pts[(i + 1) % pts.length][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  ctx.closePath();

  // Rocky fill gradient
  const rg = ctx.createRadialGradient(-R * 0.2, -R * 0.2, R * 0.1, 0, 0, R * 1.1);
  rg.addColorStop(0, '#a09080');
  rg.addColorStop(0.5, '#6e5e50');
  rg.addColorStop(1, '#3a2e28');
  ctx.fillStyle = rg;
  ctx.fill();

  // Dark outline
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Crater details
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(-R * 0.3, R * 0.2, R * 0.2, R * 0.14, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(R * 0.35, -R * 0.3, R * 0.14, R * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-R * 0.5, -R * 0.45, R * 0.1, R * 0.07, 0.8, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  // "FAKE NEWS!" text — drawn without rotation so it's always readable
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${14 * scale}px "Rajdhani", Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineWidth = 4 * scale;
  ctx.lineJoin = 'round';
  ctx.strokeText('FAKE NEWS!', 0, 0);
  ctx.fillStyle = '#ff3300';
  ctx.fillText('FAKE NEWS!', 0, 0);
  ctx.restore();
}

// ─── CrashPage ────────────────────────────────────────────────────────────────
export function CrashPage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const trumpImgRef = useRef<HTMLImageElement | null>(null);

  // Preload Trump image
  useEffect(() => {
    const img = new Image();
    img.src = '/trump-sit.png';
    img.onload = () => { trumpImgRef.current = img; };
  }, []);

  // UI state
  const [phase,     setPhase]     = useState<Phase>('waiting');
  const [dispMult,  setDispMult]  = useState(1.00);
  const [credits,   setCredits]   = useState(100);
  const [betInput,  setBetInput]  = useState('10');
  const [betPlaced, setBetPlaced] = useState(false);
  const [autoOn,    setAutoOn]    = useState(false);
  const [autoInput, setAutoInput] = useState('2.00');
  const [countdown, setCountdown] = useState(WAIT_SECS);
  const [history,   setHistory]   = useState<{ mult: number; id: number }[]>([]);
  const histIdRef = useRef(0);
  const [cashedAt,  setCashedAt]  = useState<number | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; win: boolean } | null>(null);
  const [animKey,   setAnimKey]   = useState(0);
  const [shaking,   setShaking]   = useState(false);

  // 5B: screen shake the instant crash fires
  useEffect(() => {
    if (phase !== 'crashed') return;
    setShaking(true);
    const t = setTimeout(() => setShaking(false), 400);
    return () => clearTimeout(t);
  }, [phase]);

  // Game refs (mutated in RAF — no re-render)
  const phaseRef        = useRef<Phase>('waiting');
  const elapsedRef      = useRef(0);
  const multRef         = useRef(1.0);
  const startTimeRef    = useRef(0);
  const crashPtRef      = useRef(2.0);
  const crashedMultRef  = useRef(1.0);
  const coinPosRef      = useRef({ x: 0, y: 0 });
  const betPlacedRef    = useRef(false);
  const betAmtRef       = useRef(10);
  const autoOnRef       = useRef(false);
  const autoAtRef       = useRef(2.0);
  const particlesRef    = useRef<Particle[]>([]);   // explosion burst
  const trailRef        = useRef<Particle[]>([]);   // coin trail sparks
  const starsRef        = useRef<Star[]>([]);        // parallax starfield
  const popupsRef       = useRef<MilestonePopup[]>([]);   // milestone meme popups
  const triggeredRef    = useRef<Set<number>>(new Set()); // thresholds fired this round
  const screenFlashRef  = useRef(0);               // 0–1 alpha for 50× flash
  const spaceObjRef     = useRef<SpaceObject[]>([]); // flying space objects
  const spaceTriggeredRef = useRef<Set<number>>(new Set()); // space thresholds fired
  const lastUIRef       = useRef(0);
  const lastMilestone   = useRef(1);   // tracks last integer floor for pop trigger
  const crashTimerRef   = useRef<ReturnType<typeof setTimeout>>();
  const toastTimerRef   = useRef<ReturnType<typeof setTimeout>>();

  // Stable function refs — updated every render so RAF always calls latest
  const showToastRef  = useRef((_msg: string, _win: boolean) => {});
  const doCashoutRef  = useRef(() => {});
  const doCrashRef    = useRef(() => {});
  const drawRef       = useRef(() => {});

  // ── showToast ──────────────────────────────────────────────────────────────
  showToastRef.current = (msg: string, win: boolean) => {
    clearTimeout(toastTimerRef.current);
    setToast({ msg, win });
    toastTimerRef.current = setTimeout(() => setToast(null), 2800);
  };

  // ── doCashout ──────────────────────────────────────────────────────────────
  doCashoutRef.current = () => {
    if (!betPlacedRef.current || phaseRef.current !== 'running') return;
    const m   = multRef.current;
    const amt = betAmtRef.current;
    const win = Math.floor(amt * m);
    betPlacedRef.current = false;
    setBetPlaced(false);
    setCashedAt(m);
    setCredits(c => c + win);
    showToastRef.current(`+${win} credits @ ${fmt(m)}`, true);
  };

  // ── doCrash ────────────────────────────────────────────────────────────────
  doCrashRef.current = () => {
    if (phaseRef.current !== 'running') return;
    const finalMult       = crashPtRef.current;
    multRef.current       = finalMult;
    crashedMultRef.current = finalMult;
    phaseRef.current       = 'crashed';

    setPhase('crashed');
    setDispMult(finalMult);
    setHistory(h => [{ mult: finalMult, id: histIdRef.current++ }, ...h].slice(0, 20));

    // Kill trail sparks when crashed
    trailRef.current = [];

    // Explosion particles at coin tip
    const { x, y } = coinPosRef.current;
    const colors = ['#ff6200', '#ffd700', '#ff4400', '#ff9900', '#ffffff', '#ffcc00'];
    particlesRef.current = Array.from({ length: 50 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5);
      const spd   = 1.5 + Math.random() * 5.5;
      return {
        x, y,
        vx:   Math.cos(angle) * spd,
        vy:   Math.sin(angle) * spd - 2,
        life: 0.75 + Math.random() * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        size:  2 + Math.random() * 3,
      };
    });

    if (betPlacedRef.current) {
      betPlacedRef.current = false;
      setBetPlaced(false);
      showToastRef.current(`Crashed @ ${fmt(finalMult)} — bet lost`, false);
    }

    // Reset after hold period
    crashTimerRef.current = setTimeout(() => {
      phaseRef.current       = 'waiting';
      elapsedRef.current     = 0;
      multRef.current        = 1.0;
      crashedMultRef.current = 1.0;
      particlesRef.current   = [];
      trailRef.current       = [];
      starsRef.current         = [];   // reinit next frame with fresh positions
      popupsRef.current        = [];
      triggeredRef.current     = new Set();
      screenFlashRef.current   = 0;
      spaceObjRef.current      = [];
      spaceTriggeredRef.current = new Set();
      lastMilestone.current  = 1;
      setCashedAt(null);
      setPhase('waiting');
      setDispMult(1.00);
      setCountdown(WAIT_SECS);
    }, CRASH_HOLD);
  };

  // ── draw ───────────────────────────────────────────────────────────────────
  drawRef.current = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx)  return;

    const W   = canvas.width;
    const H   = canvas.height;
    const dpr = window.devicePixelRatio || 1;
    const pad = { t: 20 * dpr, r: 24 * dpr, b: 44 * dpr, l: 54 * dpr };
    const gW  = W - pad.l - pad.r;
    const gH  = H - pad.t  - pad.b;

    const p          = phaseRef.current;
    const elapsed    = elapsedRef.current;
    const mult       = multRef.current;
    const isCrashed  = p === 'crashed';
    const dispElapsed = elapsed;

    // Background
    ctx.fillStyle = '#060e18';
    ctx.fillRect(0, 0, W, H);

    // ── Parallax starfield ──────────────────────────────────────────────────
    // Lazy-init: fill canvas with stars the first time W/H are known
    if (starsRef.current.length === 0 && W > 0 && H > 0) {
      const stars: Star[] = [];
      // Layer 0 — background: 90 tiny dim stars
      for (let i = 0; i < 90; i++) stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.4 + Math.random() * 0.6 * dpr,
        alpha: 0.15 + Math.random() * 0.25,
        speed: (0.15 + Math.random() * 0.25) * dpr,
        layer: 0,
      });
      // Layer 1 — midground: 50 medium stars
      for (let i = 0; i < 50; i++) stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.8 + Math.random() * 1.0 * dpr,
        alpha: 0.35 + Math.random() * 0.35,
        speed: (0.55 + Math.random() * 0.6) * dpr,
        layer: 1,
      });
      // Layer 2 — foreground: 22 bright streaks
      for (let i = 0; i < 22; i++) stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 1.2 + Math.random() * 1.4 * dpr,
        alpha: 0.6 + Math.random() * 0.4,
        speed: (1.8 + Math.random() * 2.0) * dpr,
        layer: 2,
      });
      starsRef.current = stars;
    }

    // Speed multiplier ramps with the multiplier; stops dead on crash
    const starMult   = p === 'crashed' ? 0 : p === 'waiting' ? 0.25 : Math.max(1, 1 + (mult - 1) * 0.22);
    const trailScale = [1, 4, 12]; // streak trail length per layer

    for (const s of starsRef.current) {
      const dx = s.speed * starMult;

      if (p !== 'crashed') {
        s.x -= dx;
        if (s.x < 0) { s.x = W; s.y = Math.random() * H; }
      }

      const a = s.alpha * Math.min(1, starMult * 1.2 + 0.1);
      ctx.globalAlpha = a;

      if (s.layer === 2) {
        // Streak: line trailing to the right
        const tailLen = dx * trailScale[2];
        const grad = ctx.createLinearGradient(s.x, s.y, s.x + tailLen, s.y);
        grad.addColorStop(0, `rgba(255,255,255,${a})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth   = s.r;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + tailLen, s.y);
        ctx.stroke();
      } else {
        // Dot star; layer 1 gets a tiny tail
        if (s.layer === 1 && dx > 0.3) {
          const tail = dx * trailScale[1];
          const g2 = ctx.createLinearGradient(s.x, s.y, s.x + tail, s.y);
          g2.addColorStop(0, `rgba(200,220,255,${a})`);
          g2.addColorStop(1, 'rgba(200,220,255,0)');
          ctx.strokeStyle = g2;
          ctx.lineWidth   = s.r * 0.7;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x + tail, s.y);
          ctx.stroke();
        }
        ctx.fillStyle = s.layer === 0 ? 'rgba(200,220,255,1)' : 'rgba(220,235,255,1)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // ── End starfield ────────────────────────────────────────────────────────

    // Scale — linear Y so the exponential curve actually curves visually.
    // (Log scale turns e^(kt) into a straight line by definition.)
    // Keep coin anchored at ~80% width, ~75% height.
    const curMult = isCrashed ? crashedMultRef.current : mult;
    const topMult = Math.max(1.5, curMult / 0.75);   // coin at 75% height
    const maxTime = Math.max(6, (isCrashed ? elapsedRef.current : elapsed) / 0.80);

    const toX = (t: number) => pad.l + (t / maxTime) * gW;
    const toY = (m: number) => {
      const frac = Math.max(0, (m - 1) / (topMult - 1));
      return pad.t + gH - frac * gH;
    };

    // Grid lines — pick ~4 evenly spaced round levels below topMult
    ctx.save();
    ctx.font        = `${10 * dpr}px Inter, system-ui, sans-serif`;
    ctx.textAlign   = 'right';
    ctx.textBaseline = 'middle';
    const range      = topMult - 1;
    const rawStep    = range / 4;
    // Round step to nearest nice number
    const magnitude  = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const niceStep   = Math.ceil(rawStep / magnitude) * magnitude;
    ctx.setLineDash([3 * dpr, 6 * dpr]);
    for (let gm = 1 + niceStep; gm < topMult * 1.02; gm += niceStep) {
      const gy = toY(gm);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(W - pad.r, gy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle   = 'rgba(255,255,255,0.22)';
      ctx.fillText(gm.toFixed(gm < 10 ? 1 : 0) + '\u00d7', pad.l - 6 * dpr, gy);
      ctx.setLineDash([3 * dpr, 6 * dpr]);
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Waiting baseline — dotted line just above the X axis
    if (phaseRef.current === 'waiting') {
      const baseY = pad.t + gH - 2; // just above the axis line
      ctx.save();
      ctx.setLineDash([4 * dpr, 6 * dpr]);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, baseY);
      ctx.lineTo(W - pad.r, baseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Curve
    if (dispElapsed > 0 || isCrashed) {
      const drawE = isCrashed ? elapsedRef.current : dispElapsed;
      const N     = Math.max(50, Math.floor(drawE * 15));
      const pts   = Array.from({ length: N + 1 }, (_, i) => {
        const t = (drawE * i) / N;
        return { x: toX(t), y: toY(Math.exp(CURVE_K * t)) };
      });

      const tip  = pts[pts.length - 1];
      const lineCol = isCrashed ? '#d93333' : '#ff6200';

      // ── 1A: Gradient fill anchored to the curve tip ─────────────────────────
      // Top stop starts at tip.y (where the curve actually is) so the orange is
      // always bright right under the curve rather than stuck at the chart top.
      const gradFill = ctx.createLinearGradient(0, tip.y, 0, H - pad.b);
      if (isCrashed) {
        gradFill.addColorStop(0,   'rgba(200,40,40,0.50)');
        gradFill.addColorStop(0.45,'rgba(200,40,40,0.15)');
        gradFill.addColorStop(1,   'rgba(6,14,24,0)');
      } else {
        gradFill.addColorStop(0,   'rgba(255,100,0,0.52)');
        gradFill.addColorStop(0.45,'rgba(255,80,0,0.14)');
        gradFill.addColorStop(1,   'rgba(6,14,24,0)');
      }
      ctx.beginPath();
      ctx.moveTo(pad.l, H - pad.b);
      for (const pt of pts) ctx.lineTo(pt.x, pt.y);
      ctx.lineTo(tip.x, H - pad.b);
      ctx.closePath();
      ctx.fillStyle = gradFill;
      ctx.fill();

      // Outer glow (wide, soft)
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const pt of pts) ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = isCrashed ? 'rgba(220,50,50,0.15)' : 'rgba(255,98,0,0.15)';
      ctx.lineWidth   = 20 * dpr;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.stroke();

      // Inner glow
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const pt of pts) ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = isCrashed ? 'rgba(220,50,50,0.30)' : 'rgba(255,130,0,0.38)';
      ctx.lineWidth   = 8 * dpr;
      ctx.stroke();

      // Main line
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const pt of pts) ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = lineCol;
      ctx.lineWidth   = 3 * dpr;
      ctx.stroke();

      // ── Compute tangent angle for Trump rotation ────────────────────────────
      const prev2  = pts.length >= 2 ? pts[pts.length - 2] : pts[0];
      const dx     = tip.x - prev2.x;
      const dy     = tip.y - prev2.y;
      const len    = Math.sqrt(dx * dx + dy * dy) || 1;
      const tx     = dx / len;
      const ty     = dy / len;
      const angle  = Math.atan2(dy, dx);

      // ── 1B: Spawn trail sparks from Trump's ass (backward along tangent) ────
      if (p === 'running') {
        // Offset spawn behind Trump (bottom of chair = backward along tangent)
        const assX = tip.x - tx * TRUMP_SIZE * dpr * 0.6;
        const assY = tip.y - ty * TRUMP_SIZE * dpr * 0.6;
        const TRAIL_COLORS = ['#ff6200','#ff8c00','#ffb300','#fff0a0','#ffffff'];
        for (let i = 0; i < 3; i++) {
          const spread = (Math.random() - 0.5) * 1.8;
          const spd    = (0.4 + Math.random() * 1.4) * dpr;
          trailRef.current.push({
            x:     assX + (Math.random() - 0.5) * 8 * dpr,
            y:     assY + (Math.random() - 0.5) * 8 * dpr,
            vx:    (-tx + spread * 0.4) * spd,
            vy:    (-ty + spread * 0.4 + 0.3) * spd,
            life:  0.35 + Math.random() * 0.35,
            color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
            size:  0.8 + Math.random() * 1.8,
          });
        }
      }

      // Update coin position & render trail before Trump
      coinPosRef.current = { x: tip.x, y: tip.y };

      // ── Milestone check ─────────────────────────────────────────────────────
      if (p === 'running') {
        for (const ms of MILESTONES) {
          if (mult >= ms.threshold && !triggeredRef.current.has(ms.threshold)) {
            triggeredRef.current.add(ms.threshold);
            popupsRef.current.push({
              msg: ms.msg, tier: ms.tier, createdAt: Date.now(),
              x: tip.x, y: tip.y - 55 * dpr,
            });
            // Tier 5: gold screen flash + rainbow confetti burst
            if (ms.tier === 5) {
              screenFlashRef.current = 0.7;
              const confettiColors = ['#ff4400','#ff8800','#ffd700','#44ff88','#44aaff','#ff44ff','#ffffff'];
              const extra = Array.from({ length: 80 }, (_, i) => {
                const a = (Math.PI * 2 * i) / 80 + (Math.random() - 0.5) * 0.4;
                const spd = 2.5 + Math.random() * 5;
                return {
                  x: tip.x, y: tip.y,
                  vx:   Math.cos(a) * spd,
                  vy:   Math.sin(a) * spd - 3,
                  life: 0.8 + Math.random() * 0.2,
                  color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
                  size:  2.5 + Math.random() * 3.5,
                };
              });
              particlesRef.current.push(...extra);
            }
          }
        }
      }

      // ── Space object spawn check ────────────────────────────────────────────
      if (p === 'running') {
        for (const ev of SPACE_EVENTS) {
          if (mult >= ev.threshold && !spaceTriggeredRef.current.has(ev.threshold)) {
            spaceTriggeredRef.current.add(ev.threshold);
            const isAsteroid = ev.type === 'asteroid';
            // Hat & building come from right; asteroid from left
            const startX = isAsteroid ? -80 * dpr : W + 80 * dpr;
            const startY = pad.t + Math.random() * gH * 0.7 + gH * 0.05;
            const speed  = ev.type === 'building' ? 1.8 : ev.type === 'redhat' ? 3.5 : 4.5;
            spaceObjRef.current.push({
              type:      ev.type,
              x:         startX,
              y:         startY,
              vx:        isAsteroid ? speed * dpr : -speed * dpr,
              vy:        (Math.random() - 0.5) * 0.5 * dpr,
              angle:     Math.random() * Math.PI * 2,
              vAngle:    (Math.random() - 0.5) * 0.04,
              scale:     dpr * (ev.type === 'building' ? 1.1 : ev.type === 'redhat' ? 0.9 : 1.0),
              createdAt: Date.now(),
            });
          }
        }
      }

      // ── Space object render ──────────────────────────────────────────────────
      const aliveSpaceObjs: SpaceObject[] = [];
      for (const obj of spaceObjRef.current) {
        const age   = Date.now() - obj.createdAt;
        const totalLife = 4200; // ms
        const alpha = Math.max(0, 1 - age / totalLife);
        if (alpha <= 0) continue;
        aliveSpaceObjs.push(obj);
        obj.x     += obj.vx;
        obj.y     += obj.vy;
        obj.angle += obj.vAngle;

        if (obj.type === 'redhat') {
          drawRedHat(ctx, obj.x, obj.y, obj.scale, alpha);
        } else if (obj.type === 'building') {
          drawGoldenBuilding(ctx, obj.x, obj.y, obj.scale, alpha);
        } else {
          drawFakeNewsAsteroid(ctx, obj.x, obj.y, obj.scale, alpha, obj.angle);
        }
      }
      spaceObjRef.current = aliveSpaceObjs;

      // ── Trail spark render ───────────────────────────────────────────────────
      const aliveTrail: Particle[] = [];
      for (const sp of trailRef.current) {
        if (sp.life <= 0) continue;
        ctx.globalAlpha = sp.life * 0.9;
        ctx.fillStyle   = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size * dpr, 0, Math.PI * 2);
        ctx.fill();
        sp.x    += sp.vx;
        sp.y    += sp.vy;
        sp.vy   += 0.05;
        sp.life -= 0.04;
        aliveTrail.push(sp);
      }
      ctx.globalAlpha  = 1;
      trailRef.current = aliveTrail;

      // ── Draw Trump ───────────────────────────────────────────────────────────
      const img = trumpImgRef.current;
      if (img) {
        drawTrump(ctx, img, tip.x, tip.y, angle, TRUMP_SIZE * dpr, isCrashed);
      }
    }

    // ── Screen flash (tier 5) ────────────────────────────────────────────────
    if (screenFlashRef.current > 0) {
      ctx.save();
      ctx.globalAlpha = screenFlashRef.current;
      ctx.fillStyle   = '#ffd700';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      screenFlashRef.current = Math.max(0, screenFlashRef.current - 0.035);
    }

    // ── Milestone popups ─────────────────────────────────────────────────────
    const TIER_FLASH_COLORS = ['#ff4400','#ff8800','#ffd700','#00ffaa','#4488ff','#ff44ff'];
    const alivePopups: MilestonePopup[] = [];
    for (const popup of popupsRef.current) {
      const age    = Date.now() - popup.createdAt;
      const lifeT  = Math.max(0, 1 - age / 2000);
      if (lifeT <= 0) continue;
      alivePopups.push(popup);

      const yDrift = (1 - lifeT) * 28 * dpr;   // drifts upward as it fades
      let   px     = popup.x;
      let   py     = popup.y - yDrift;

      // Per-tier position effects
      if (popup.tier === 1) py += Math.sin(age * 0.018) * 6 * dpr;   // bounce
      if (popup.tier === 3) {                                           // shake
        px += (Math.random() - 0.5) * 7 * dpr;
        py += (Math.random() - 0.5) * 5 * dpr;
      }

      // Keep popup inside canvas horizontally
      px = Math.max(80 * dpr, Math.min(W - 80 * dpr, px));
      py = Math.max(20 * dpr, py);

      // Font size grows with tier
      const fontSize = [11, 13, 14, 14, 15, 17][popup.tier] * dpr;

      // Text color
      let color = '#ffd700';
      if (popup.tier === 4) {
        color = TIER_FLASH_COLORS[Math.floor(age / 80) % TIER_FLASH_COLORS.length];
      }
      if (popup.tier === 5) {
        color = TIER_FLASH_COLORS[Math.floor(age / 60) % TIER_FLASH_COLORS.length];
      }

      ctx.save();
      ctx.globalAlpha = lifeT * (popup.tier === 0 ? 0.82 : 1);
      ctx.font        = `900 ${fontSize}px "Rajdhani", Inter, sans-serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';

      // Glow (tier 2+)
      if (popup.tier >= 2) {
        ctx.shadowColor = popup.tier >= 4 ? color : '#ffd700';
        ctx.shadowBlur  = (popup.tier >= 4 ? 22 : 14) * dpr;
      }

      // Black outline
      ctx.strokeStyle = 'rgba(0,0,0,0.95)';
      ctx.lineWidth   = (popup.tier <= 1 ? 3 : 4) * dpr;
      ctx.lineJoin    = 'round';
      ctx.strokeText(popup.msg, px, py);

      // Fill
      ctx.fillStyle   = color;
      ctx.fillText(popup.msg, px, py);

      ctx.shadowBlur  = 0;
      ctx.restore();
    }
    popupsRef.current = alivePopups;

    // Explosion burst particles
    const alive: Particle[] = [];
    for (const pt of particlesRef.current) {
      if (pt.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle   = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * dpr, 0, Math.PI * 2);
      ctx.fill();
      pt.x  += pt.vx * dpr;
      pt.y  += pt.vy * dpr;
      pt.vy += 0.2;
      pt.life -= 0.02;
      alive.push(pt);
    }
    ctx.globalAlpha = 1;
    particlesRef.current = alive;

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, H - pad.b);
    ctx.lineTo(W - pad.r, H - pad.b);
    ctx.stroke();
  };

  // ── Single RAF loop (runs for component lifetime) ─────────────────────────
  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (phaseRef.current === 'running') {
        const now     = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000;
        const mult    = Math.exp(CURVE_K * elapsed);

        elapsedRef.current = elapsed;
        multRef.current    = mult;

        if (betPlacedRef.current && autoOnRef.current && mult >= autoAtRef.current) {
          doCashoutRef.current();
        }

        if (mult >= crashPtRef.current) {
          doCrashRef.current();
        } else if (now - lastUIRef.current >= 50) {
          setDispMult(mult);
          const milestone = Math.floor(mult);
          if (milestone > lastMilestone.current) {
            lastMilestone.current = milestone;
            setAnimKey(k => k + 1);
          }
          lastUIRef.current = now;
        }
      }
      drawRef.current();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Countdown during WAITING ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'waiting') return;
    let c = WAIT_SECS;
    setCountdown(c);
    const iv = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(iv);
        crashPtRef.current   = genCrashPoint();
        startTimeRef.current = Date.now();
        elapsedRef.current   = 0;
        phaseRef.current     = 'running';
        setPhase('running');
        setDispMult(1.00);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [phase]);

  // ── Canvas resize ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const dpr    = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(crashTimerRef.current);
    clearTimeout(toastTimerRef.current);
  }, []);

  // ── Bet / cashout handler ─────────────────────────────────────────────────
  const handleBet = () => {
    if (phase === 'waiting' && !betPlaced) {
      const amt = Math.max(1, parseInt(betInput, 10) || 0);
      if (amt > credits) return;
      betAmtRef.current    = amt;
      betPlacedRef.current = true;
      autoOnRef.current    = autoOn;
      autoAtRef.current    = Math.max(1.01, parseFloat(autoInput) || 2.0);
      setBetPlaced(true);
      setCredits(c => c - amt);
    } else if (phase === 'running' && betPlaced) {
      doCashoutRef.current();
    }
  };

  // ── Derived UI values ─────────────────────────────────────────────────────
  const betAmt    = parseInt(betInput, 10) || 0;
  const autoVal   = parseFloat(autoInput) || 2.0;
  const potential = betPlaced ? Math.floor(betAmtRef.current * autoVal) : 0;
  const canBet     = phase === 'waiting' && !betPlaced && betAmt >= 1 && betAmt <= credits;
  const canCashout = phase === 'running'  && betPlaced;

  return (
    <div className="crash-page">

      {/* Toast */}
      {toast && (
        <div className={`crash-toast crash-toast--${toast.win ? 'win' : 'lose'}`}>
          {toast.msg}
        </div>
      )}

      {/* History row */}
      <div className="crash-history">
        {history.length === 0 && (
          <span className="crash-history__empty">No rounds yet — waiting for first crash…</span>
        )}
        {history.map(({ mult: m, id }) => (
          <span
            key={id}
            className={`crash-hist-pill ${
              m < 1.2 ? 'crash-hist-pill--flatline' :
              m < 2   ? 'crash-hist-pill--low'      :
              m < 10  ? 'crash-hist-pill--mid'      :
                        'crash-hist-pill--high'
            }`}
          >
            {fmt(m)}
          </span>
        ))}
      </div>

      {/* Canvas area */}
      <div className={`crash-canvas-wrap${shaking ? ' crash-canvas-wrap--shake' : ''}`}>
        <canvas ref={canvasRef} className="crash-canvas" />

        {/* Overlay — multiplier / countdown */}
        <div className="crash-overlay">
          {phase === 'waiting' ? (
            <div className="crash-overlay__waiting">
              <span className="crash-overlay__wait-label">Next round in</span>
              <span className="crash-overlay__wait-count">{countdown}</span>
            </div>
          ) : (
            <div className="crash-overlay__mult-wrap">
              <span
                key={animKey}
                className={[
                  'crash-overlay__mult',
                  phase === 'crashed'              ? 'crash-overlay__mult--crashed' : '',
                  phase === 'running' && dispMult >= 10 ? 'crash-overlay__mult--hot' : '',
                ].join(' ').trim()}
                style={{ color: phase === 'crashed' ? '#d93333' : multColor(dispMult) }}
              >
                {fmt(dispMult)}
              </span>
              {phase === 'crashed' && (
                <span className="crash-overlay__crashed-label">CRASHED</span>
              )}
              {cashedAt !== null && phase !== 'crashed' && (
                <span className="crash-overlay__cashed-label">
                  Cashed out @ {fmt(cashedAt)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bet panel */}
      <div className="crash-panel">
        <div className="crash-panel__controls">

          {/* Bet amount */}
          <div className="crash-panel__field">
            <span className="crash-panel__label">Bet (credits)</span>
            <div className="crash-panel__input-row">
              <button className="crash-panel__adj" onClick={() => setBetInput(String(Math.max(1, Math.floor(betAmt / 2))))} disabled={phase !== 'waiting' || betPlaced}>½</button>
              <input
                className="crash-panel__input"
                type="number"
                min={1}
                value={betInput}
                onChange={e => setBetInput(e.target.value)}
                disabled={phase !== 'waiting' || betPlaced}
              />
              <button className="crash-panel__adj" onClick={() => setBetInput(String(Math.min(credits, betAmt * 2)))} disabled={phase !== 'waiting' || betPlaced}>2×</button>
            </div>

            {/* 4A: Quick-bet buttons */}
            <div className="crash-panel__quick">
              {([['Min', 1], ['+10', '+10'], ['+100', '+100'], ['Max', 'max']] as [string, number|string][]).map(([label, val]) => (
                <button
                  key={label}
                  className="crash-panel__quick-btn"
                  disabled={phase !== 'waiting' || betPlaced}
                  onClick={() => {
                    if (val === 'max')  { setBetInput(String(credits)); return; }
                    if (typeof val === 'number') { setBetInput(String(val)); return; }
                    // "+10" / "+100"
                    const delta = parseInt(val, 10);
                    setBetInput(String(Math.min(credits, betAmt + delta)));
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Auto cashout */}
          <div className="crash-panel__auto">
            <label className="crash-panel__check">
              <input type="checkbox" checked={autoOn} onChange={e => setAutoOn(e.target.checked)} disabled={phase !== 'waiting' || betPlaced} />
              Auto cashout at
            </label>
            <input
              className="crash-panel__input crash-panel__input--sm"
              type="number" min="1.01" step="0.1"
              value={autoInput}
              onChange={e => setAutoInput(e.target.value)}
              disabled={!autoOn || phase !== 'waiting' || betPlaced}
            />
            <span className="crash-panel__x-label">×</span>
          </div>

          {/* Balance / potential */}
          <div className="crash-panel__meta">
            <span>Balance: <b>{credits}</b> credits</span>
            {betPlaced && autoOn && (
              <span className="crash-panel__potential">Potential: +<b>{potential}</b> cr</span>
            )}
          </div>
        </div>

        {/* 4B: Action button — 4 distinct states */}
        <button
          className={`crash-panel__btn ${
            canCashout                       ? 'crash-panel__btn--cashout'  :
            canBet                           ? 'crash-panel__btn--bet'      :
            phase === 'waiting' && betPlaced ? 'crash-panel__btn--accepted' :
                                               'crash-panel__btn--disabled'
          }`}
          onClick={handleBet}
          disabled={!canBet && !canCashout}
        >
          {canCashout ? (
            <>CASH OUT<span className="crash-panel__btn-sub">{fmt(dispMult)}</span></>
          ) : phase === 'waiting' && betPlaced ? (
            <><span className="crash-panel__btn-check">✓</span> BET ACCEPTED</>
          ) : (
            'BET'
          )}
        </button>
      </div>

    </div>
  );
}
