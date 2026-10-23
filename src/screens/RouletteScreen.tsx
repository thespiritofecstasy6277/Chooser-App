import { Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, ScreenHeader } from "../components/ui";
import { cn } from "../utils/cn";
import { WHEEL_COLORS } from "../utils/colors";
import { feedback } from "../utils/feedback";

const SPIN_MS = 4200;
const DEFAULT_OPTIONS = ["Alex", "Sam", "Jordan", "Taylor", "Casey", "Riley"];
const STORAGE_KEY = "chooser.roulette.v1";
const MAX_OPTIONS = 12;

function loadOptions(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed.map(String);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_OPTIONS;
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

export function RouletteScreen() {
  const [options, setOptions] = useState<string[]>(loadOptions);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const tickTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {
      /* ignore */
    }
  }, [options]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      window.clearInterval(tickTimer.current);
    },
    [],
  );

  const n = options.length;
  const seg = 360 / n;
  const size = 300;
  const c = size / 2;
  const r = c - 4;

  const segments = useMemo(
    () =>
      options.map((label, i) => {
        const start = i * seg;
        const end = start + seg;
        const mid = start + seg / 2;
        const pos = polar(c, c, r * 0.62, mid);
        return { label, i, path: segmentPath(c, c, r, start, end), mid, pos };
      }),
    [options, seg, c, r],
  );

  const spin = () => {
    if (spinning || n < 2) return;
    const idx = Math.floor(Math.random() * n);
    const jitter = (Math.random() - 0.5) * seg * 0.7;
    const target = 360 - (idx * seg + seg / 2 + jitter);
    const base = Math.floor(rotation / 360) * 360;
    let next = base + 360 * 6 + target;
    if (next - rotation < 360 * 5) next += 360;
    setRotation(next);
    setSpinning(true);
    setWinner(null);
    feedback.tap();

    // Ticks that slow down as the wheel decelerates.
    let elapsed = 0;
    let gap = 60;
    const tick = () => {
      feedback.tick();
      elapsed += gap;
      gap = Math.min(600, gap * 1.13);
      if (elapsed < SPIN_MS - 400) tickTimer.current = window.setTimeout(tick, gap);
    };
    tickTimer.current = window.setTimeout(tick, gap);

    timer.current = window.setTimeout(() => {
      setSpinning(false);
      setWinner(idx);
      feedback.win();
    }, SPIN_MS);
  };

  const addOption = () => {
    const v = draft.trim();
    if (!v || n >= MAX_OPTIONS) return;
    setOptions((o) => [...o, v]);
    setDraft("");
    setWinner(null);
    feedback.tap();
  };

  const removeOption = (i: number) => {
    if (n <= 2) return;
    setOptions((o) => o.filter((_, j) => j !== i));
    setWinner(null);
    feedback.tap();
  };

  const fontSize = n <= 6 ? 15 : n <= 9 ? 13 : 11;

  return (
    <div className="scroll-y absolute inset-0">
      <ScreenHeader
        title="Roulette"
        right={
          <button
            type="button"
            onClick={() => {
              setOptions(DEFAULT_OPTIONS);
              setWinner(null);
              feedback.tap();
            }}
            className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-white active:scale-90"
            aria-label="Reset entries"
          >
            <RotateCcw size={18} strokeWidth={2.5} />
          </button>
        }
      />

      <div className="flex flex-col items-center px-6 pb-10">
        {/* Wheel */}
        <div className="relative" style={{ width: size, height: size }}>
          {/* Pointer */}
          <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 drop-shadow-lg">
            <svg width="34" height="40" viewBox="0 0 34 40">
              <path d="M17 40 L2 8 Q17 -4 32 8 Z" fill="#fff" />
              <circle cx="17" cy="11" r="5" fill="#ff4f4a" />
            </svg>
          </div>

          <div
            className="h-full w-full rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? `transform ${SPIN_MS}ms cubic-bezier(0.1, 0.75, 0.1, 1)`
                : "none",
            }}
          >
            <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
              <circle cx={c} cy={c} r={c} fill="#fff" />
              {segments.map((s) => (
                <g key={s.i}>
                  <path
                    d={s.path}
                    fill={WHEEL_COLORS[s.i % WHEEL_COLORS.length]}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <text
                    x={s.pos.x}
                    y={s.pos.y}
                    fill="#1c1c1e"
                    fontSize={fontSize}
                    fontWeight={700}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${s.mid} ${s.pos.x} ${s.pos.y})`}
                  >
                    {s.label.length > 11 ? s.label.slice(0, 10) + "…" : s.label}
                  </text>
                </g>
              ))}
              <circle cx={c} cy={c} r={r} fill="none" stroke="#fff" strokeWidth="6" />
            </svg>
          </div>

          {/* Center spin button */}
          <button
            type="button"
            onClick={spin}
            disabled={spinning}
            className={cn(
              "absolute top-1/2 left-1/2 z-10 flex h-[84px] w-[84px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[17px] font-extrabold tracking-wide text-ink shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform active:scale-95",
              spinning && "opacity-80",
            )}
          >
            SPIN
          </button>
        </div>

        {/* Result */}
        <div className="mt-7 flex h-16 items-center justify-center">
          {winner !== null && !spinning ? (
            <div
              key={winner + rotation}
              className="anim-pop-in flex items-center gap-3 rounded-full bg-white px-6 py-3 shadow-lg"
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{ background: WHEEL_COLORS[winner % WHEEL_COLORS.length] }}
              />
              <span className="text-[22px] font-bold text-label">{options[winner]}</span>
              <span className="text-xl">🎉</span>
            </div>
          ) : (
            <p className={cn("text-[17px] text-white/90", spinning && "anim-pulse-soft")}>
              {spinning ? "Spinning…" : "Tap SPIN to pick someone"}
            </p>
          )}
        </div>

        {/* Entries */}
        <Card className="mt-4 w-full px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-label">Entries</h2>
            <span className="text-[13px] font-medium text-label/70">
              {n}/{MAX_OPTIONS}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {options.map((o, i) => (
              <span
                key={`${o}-${i}`}
                className="flex items-center gap-1.5 rounded-full bg-white/60 py-1.5 pr-1.5 pl-3 text-[15px] font-semibold text-label"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: WHEEL_COLORS[i % WHEEL_COLORS.length] }}
                />
                {o}
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  disabled={n <= 2 || spinning}
                  aria-label={`Remove ${o}`}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-label/70 disabled:opacity-30"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addOption();
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={n >= MAX_OPTIONS ? "Maximum reached" : "Add a name…"}
              disabled={n >= MAX_OPTIONS}
              maxLength={20}
              className="min-w-0 flex-1 rounded-2xl bg-white/60 px-4 py-2.5 text-[16px] font-medium text-label outline-none placeholder:text-label/50 focus:bg-white/85"
            />
            <button
              type="submit"
              disabled={!draft.trim() || n >= MAX_OPTIONS}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink shadow disabled:opacity-40"
              aria-label="Add entry"
            >
              <Plus size={22} strokeWidth={2.8} />
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
