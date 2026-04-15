import { useEffect, useRef, useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CURVE_K    = 0.07;   // multiplier = e^(K * seconds)
const WAIT_SECS  = 5;
const CRASH_HOLD = 4000;   // ms to show crashed state before next round
const COIN_R     = 20;     // coin radius in CSS pixels

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'waiting' | 'running' | 'crashed';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

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

// ─── Draw the penny.bid coin ──────────────────────────────────────────────────
function drawCoin(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  crashed = false,
) {
  ctx.save();
  ctx.translate(x, y);

  ctx.shadowColor = crashed ? '#e03030' : '#ff6200';
  ctx.shadowBlur  = r * 1.4;

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = crashed ? '#c02020' : '#ff6200';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Border
  ctx.strokeStyle = crashed ? '#3a0000' : '#1a0800';
  ctx.lineWidth = r * 0.1;
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.76, 0, Math.PI * 2);
  ctx.strokeStyle = crashed ? 'rgba(255,80,80,0.5)' : 'rgba(255,175,75,0.65)';
  ctx.lineWidth = r * 0.07;
  ctx.stroke();

  // $p label
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(r * 0.66)}px Inter, system-ui, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$p', 0, 0);

  ctx.restore();
}

// ─── CrashPage ────────────────────────────────────────────────────────────────
export function CrashPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI state
  const [phase,     setPhase]     = useState<Phase>('waiting');
  const [dispMult,  setDispMult]  = useState(1.00);
  const [credits,   setCredits]   = useState(100);
  const [betInput,  setBetInput]  = useState('10');
  const [betPlaced, setBetPlaced] = useState(false);
  const [autoOn,    setAutoOn]    = useState(false);
  const [autoInput, setAutoInput] = useState('2.00');
  const [countdown, setCountdown] = useState(WAIT_SECS);
  const [history,   setHistory]   = useState<number[]>([]);
  const [cashedAt,  setCashedAt]  = useState<number | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; win: boolean } | null>(null);
  const [animKey,   setAnimKey]   = useState(0);  // increments each tick → remounts span → restarts pop anim

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
  const lastUIRef       = useRef(0);
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
    setHistory(h => [finalMult, ...h].slice(0, 20));

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

      // ── 1B: Spawn trail sparks at the coin tip ──────────────────────────────
      if (p === 'running' && pts.length >= 2) {
        const prev   = pts[pts.length - 2];
        const dx     = tip.x - prev.x;
        const dy     = tip.y - prev.y;
        const len    = Math.sqrt(dx * dx + dy * dy) || 1;
        const tx     = dx / len;   // tangent (direction of travel)
        const ty     = dy / len;
        const TRAIL_COLORS = ['#ff6200','#ff8c00','#ffb300','#fff0a0','#ffffff'];
        for (let i = 0; i < 3; i++) {
          const spread = (Math.random() - 0.5) * 1.8;
          const spd    = (0.4 + Math.random() * 1.2) * dpr;
          trailRef.current.push({
            x:     tip.x + (Math.random() - 0.5) * 6 * dpr,
            y:     tip.y + (Math.random() - 0.5) * 6 * dpr,
            vx:    (-tx + spread * 0.4) * spd,
            vy:    (-ty + spread * 0.4 + 0.3) * spd,
            life:  0.35 + Math.random() * 0.35,
            color: TRAIL_COLORS[Math.floor(Math.random() * TRAIL_COLORS.length)],
            size:  0.8 + Math.random() * 1.4,
          });
        }
      }

      // Update coin position & draw coin
      coinPosRef.current = { x: tip.x, y: tip.y };

      // ── Trail spark render (before coin so coin sits on top) ────────────────
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
        sp.vy   += 0.05;  // gentle gravity on sparks
        sp.life -= 0.04;
        aliveTrail.push(sp);
      }
      ctx.globalAlpha  = 1;
      trailRef.current = aliveTrail;

      drawCoin(ctx, tip.x, tip.y, COIN_R * dpr, isCrashed);
    }

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
          setAnimKey(k => k + 1);
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
        {history.map((m, i) => (
          <span
            key={i}
            className={`crash-hist-pill ${
              m < 2  ? 'crash-hist-pill--red'    :
              m < 10 ? 'crash-hist-pill--orange' :
                       'crash-hist-pill--green'
            }`}
          >
            {fmt(m)}
          </span>
        ))}
      </div>

      {/* Canvas area */}
      <div className="crash-canvas-wrap">
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

          {/* Bet amount row */}
          <div className="crash-panel__field">
            <span className="crash-panel__label">Bet (credits)</span>
            <div className="crash-panel__input-row">
              <button
                className="crash-panel__adj"
                onClick={() => setBetInput(String(Math.max(1, Math.floor(betAmt / 2))))}
                disabled={phase !== 'waiting' || betPlaced}
              >½</button>
              <input
                className="crash-panel__input"
                type="number"
                min={1}
                value={betInput}
                onChange={e => setBetInput(e.target.value)}
                disabled={phase !== 'waiting' || betPlaced}
              />
              <button
                className="crash-panel__adj"
                onClick={() => setBetInput(String(Math.min(credits, betAmt * 2)))}
                disabled={phase !== 'waiting' || betPlaced}
              >2×</button>
            </div>
          </div>

          {/* Auto cashout */}
          <div className="crash-panel__auto">
            <label className="crash-panel__check">
              <input
                type="checkbox"
                checked={autoOn}
                onChange={e => setAutoOn(e.target.checked)}
                disabled={phase !== 'waiting' || betPlaced}
              />
              Auto cashout at
            </label>
            <input
              className="crash-panel__input crash-panel__input--sm"
              type="number"
              min="1.01"
              step="0.1"
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
              <span className="crash-panel__potential">
                Potential: +<b>{potential}</b> cr
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <button
          className={`crash-panel__btn ${
            canCashout                          ? 'crash-panel__btn--cashout' :
            canBet                              ? 'crash-panel__btn--bet'     :
            phase === 'waiting' && betPlaced    ? 'crash-panel__btn--placed'  :
                                                  'crash-panel__btn--disabled'
          }`}
          onClick={handleBet}
          disabled={!canBet && !canCashout}
        >
          {canCashout ? (
            <>
              CASHOUT
              <span className="crash-panel__btn-sub">{fmt(dispMult)}</span>
            </>
          ) : phase === 'waiting' && betPlaced ? (
            'BET PLACED \u2713'
          ) : (
            'BET'
          )}
        </button>
      </div>

    </div>
  );
}
