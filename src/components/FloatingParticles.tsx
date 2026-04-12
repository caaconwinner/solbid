// Decorative ambient background for staging — tiny dots drift slowly upward.
// Only renders on staging.penny.bid (hostname check).

const PARTICLES = [
  { size: 2, left:  8, delay:  0, dur: 40 },
  { size: 3, left: 17, delay:  7, dur: 46 },
  { size: 2, left: 26, delay: 14, dur: 33 },
  { size: 1, left: 35, delay:  3, dur: 54 },
  { size: 3, left: 44, delay: 19, dur: 42 },
  { size: 2, left: 53, delay: 10, dur: 37 },
  { size: 1, left: 62, delay: 26, dur: 50 },
  { size: 2, left: 71, delay:  5, dur: 45 },
  { size: 3, left: 79, delay: 16, dur: 31 },
  { size: 1, left: 88, delay: 22, dur: 57 },
  { size: 2, left: 94, delay:  8, dur: 39 },
  { size: 1, left: 14, delay: 31, dur: 48 },
  { size: 2, left: 58, delay: 36, dur: 43 },
  { size: 3, left: 82, delay: 29, dur: 35 },
  { size: 1, left: 40, delay: 42, dur: 52 },
  { size: 2, left: 67, delay: 18, dur: 38 },
];

export function FloatingParticles() {

  return (
    <div className="particles-bg" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            width:  p.size,
            height: p.size,
            left:   `${p.left}%`,
            animationDuration:  `${p.dur}s`,
            animationDelay:     `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
