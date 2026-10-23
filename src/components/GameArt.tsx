/** Illustrations used on the Games cards. */

export function ArrowArt({ size = 108 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="arrowGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFB84D" />
          <stop offset="55%" stopColor="#FF7A2F" />
          <stop offset="100%" stopColor="#FF3D5A" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="rgba(255,255,255,0.6)" />
      <path
        d="M32 68 L66 34"
        stroke="url(#arrowGrad)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M50 30 L70 30 L70 50"
        fill="none"
        stroke="url(#arrowGrad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 62 L32 68 L26 70 L32 72 L30 78 L35 73 L41 76 L37 70 L42 66 L35 68 Z"
        fill="#FFE14D"
      />
      <circle cx="33" cy="69" r="3" fill="#fff" />
    </svg>
  );
}

export function NumberArt() {
  return (
    <span className="text-[72px] leading-none font-bold tracking-tight text-white/55">00</span>
  );
}

export function CoinArt({ size = 108 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id="coinGrad" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFF3A6" />
          <stop offset="45%" stopColor="#FFD84D" />
          <stop offset="100%" stopColor="#E9A800" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="46" fill="#B77A00" opacity="0.6" />
      <circle cx="50" cy="50" r="46" fill="url(#coinGrad)" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#E0A400" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#FFF1B0" strokeWidth="1.5" opacity="0.8" />
      {/* Clover */}
      <g fill="#D99B00" opacity="0.85">
        <circle cx="50" cy="38" r="10" />
        <circle cx="40" cy="52" r="10" />
        <circle cx="60" cy="52" r="10" />
        <path d="M49 50 Q52 62 56 70" stroke="#D99B00" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <ellipse cx="36" cy="28" rx="12" ry="6" fill="#fff" opacity="0.35" transform="rotate(-30 36 28)" />
    </svg>
  );
}

function DieFace({
  x,
  y,
  rotate,
  pips,
}: {
  x: number;
  y: number;
  rotate: number;
  pips: [number, number][];
}) {
  const s = 44;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate} ${s / 2} ${s / 2})`}>
      <rect x="2" y="3" width={s} height={s} rx="10" fill="rgba(0,0,0,0.18)" />
      <rect x="0" y="0" width={s} height={s} rx="10" fill="#fff" />
      <rect x="0" y="0" width={s} height={s} rx="10" fill="url(#dieShade)" />
      {pips.map(([px, py], i) => (
        <circle key={i} cx={px * s} cy={py * s} r="4" fill="#1c1c1e" />
      ))}
    </g>
  );
}

export function DiceArt({ size = 108 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="dieShade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#c9c9d1" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <DieFace
        x={44}
        y={6}
        rotate={14}
        pips={[
          [0.27, 0.27],
          [0.73, 0.73],
          [0.5, 0.5],
        ]}
      />
      <DieFace
        x={10}
        y={42}
        rotate={-12}
        pips={[
          [0.27, 0.27],
          [0.73, 0.27],
          [0.27, 0.73],
          [0.73, 0.73],
          [0.5, 0.5],
        ]}
      />
    </svg>
  );
}
