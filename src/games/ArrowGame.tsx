import { useCallback, useEffect, useRef, useState } from "react";
import { FingerRing } from "../components/FingerRing";
import { PrimaryButton, ScreenHeader } from "../components/ui";
import { useSettings } from "../context/SettingsContext";
import { useFingers } from "../hooks/useFingers";
import { useFingerRound } from "../hooks/useFingerRound";
import { cn } from "../utils/cn";
import { feedback } from "../utils/feedback";
import { pick } from "../utils/random";

const SPIN_MS = 3000;

export function ArrowGame({ onBack }: { onBack: () => void }) {
  const { settings } = useSettings();
  const areaRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const rotationRef = useRef(0);
  const spinTimer = useRef<number | undefined>(undefined);
  const tickTimer = useRef<number | undefined>(undefined);
  const resultOrderRef = useRef(0);

  const onFingerDown = useCallback(() => feedback.tap(), []);
  const { fingers, clear } = useFingers(areaRef, { onFingerDown });
  const countdownMs = settings.countdown * 1000;

  const spinTo = useCallback((targetDeg: number, onEnd?: () => void) => {
    const current = rotationRef.current;
    const base = Math.floor(current / 360) * 360;
    let next = base + 360 * 5 + (((targetDeg % 360) + 360) % 360);
    if (next - current < 360 * 4) next += 360;
    rotationRef.current = next;
    setRotation(next);
    setSpinning(true);
    window.clearTimeout(spinTimer.current);
    window.clearTimeout(tickTimer.current);

    let elapsed = 0;
    let gap = 60;
    const tick = () => {
      feedback.tick();
      elapsed += gap;
      gap = Math.min(600, gap * 1.13);
      if (elapsed < SPIN_MS - 400) tickTimer.current = window.setTimeout(tick, gap);
    };
    tickTimer.current = window.setTimeout(tick, gap);

    spinTimer.current = window.setTimeout(() => {
      setSpinning(false);
      window.clearTimeout(tickTimer.current);
      onEnd?.();
    }, SPIN_MS);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(spinTimer.current);
      window.clearTimeout(tickTimer.current);
    },
    [],
  );

  const { phase, roundId } = useFingerRound({
    fingers,
    countdownMs,
    onCountdownStart: () => feedback.countdown(countdownMs),
    onCountdownCancel: () => feedback.cancel(),
    onDone: (list) => {
      const el = areaRef.current;
      if (!el || list.length === 0) return;
      resultOrderRef.current = Math.max(0, ...list.map((f) => f.order));
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      const chosen = pick(list);
      const angle = (Math.atan2(chosen.y - cy, chosen.x - cx) * 180) / Math.PI + 90;
      spinTo(angle, () => {
        setWinnerId(chosen.id);
        feedback.win();
      });
    },
    onReset: () => setWinnerId(null),
  });

  // Desktop fallback: a click after the result clears simulated fingers.
  useEffect(() => {
    if (phase !== "result") return;
    if (fingers.some((f) => f.id < 0 && f.order > resultOrderRef.current)) clear();
  }, [fingers, phase, clear]);

  const revealed = phase === "result" && winnerId !== null;
  const ringPhase = phase === "result" && !revealed ? "idle" : phase;

  const soloSpin = () => {
    if (spinning || fingers.length > 0) return;
    spinTo(Math.random() * 360, () => feedback.win());
  };

  let hint = "Everyone puts a finger down";
  if (fingers.length === 1) hint = "Add more fingers";
  else if (phase === "counting") hint = "Hold still…";
  else if (phase === "result" && !revealed) hint = "Spinning…";
  else if (revealed) hint = "The arrow has chosen! Lift fingers to go again";

  return (
    <div
      ref={areaRef}
      className="no-select absolute inset-0 overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
        <div className="pointer-events-auto">
          <ScreenHeader title="Arrow" onBack={onBack} backLabel="Choose a game" />
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[31%] flex aspect-square w-[min(58vw,48vh,340px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/55 shadow-[0_18px_42px_rgba(120,30,0,0.08)]">
        <div
          className={cn("relative h-[90%] w-[90%]", phase === "counting" && "anim-breathe")}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.1, 1)`,
            filter: "drop-shadow(0 8px 12px rgba(180,35,30,0.2))",
          }}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <linearGradient id="arrowHead" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FF3158" />
                <stop offset="100%" stopColor="#FF9B24" />
              </linearGradient>
            </defs>
            <path
              d="M50 50 22 22"
              fill="none"
              stroke="url(#arrowHead)"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <path d="M11 11 44 18 21 44Z" fill="url(#arrowHead)" />
          </svg>
        </div>
        <div className="absolute h-5 w-5 rounded-full border-[3px] border-white bg-white shadow-[0_2px_10px_rgba(100,25,0,0.22)]" />
      </div>

      {fingers.map((f) => (
        <FingerRing
          key={f.id}
          finger={f}
          phase={ringPhase}
          roundId={roundId}
          countdownMs={countdownMs}
          size={104}
          state={
            revealed ? { status: f.id === winnerId ? "winner" : "loser" } : undefined
          }
        />
      ))}

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-center gap-4 px-6">
        <span
          key={hint}
          className="anim-fade-up rounded-full bg-black/20 px-4 py-2 text-center text-[15px] font-semibold text-white backdrop-blur-sm"
        >
          {hint}
        </span>
        <div className="pointer-events-auto">
          <PrimaryButton onClick={soloSpin} disabled={spinning || fingers.length > 0}>
            Spin the arrow
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
