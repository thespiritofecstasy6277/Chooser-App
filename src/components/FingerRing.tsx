import { cn } from "../utils/cn";
import { hexWithAlpha } from "../utils/colors";
import type { Finger } from "../hooks/useFingers";
import type { RoundPhase } from "../hooks/useFingerRound";

export type RingStatus = "neutral" | "winner" | "loser";

export interface RingState {
  status: RingStatus;
  label?: string;
  color?: string;
}

interface Props {
  finger: Finger;
  phase: RoundPhase;
  roundId: number;
  countdownMs: number;
  state?: RingState;
  emoji?: string;
  size?: number;
}

export function FingerRing({
  finger,
  phase,
  roundId,
  countdownMs,
  state,
  emoji = "",
  size = 124,
}: Props) {
  const status = state?.status ?? "neutral";
  const color = state?.color ?? finger.color;
  const isResult = phase === "result";
  const isWinner = isResult && status === "winner";
  const isLoser = isResult && status === "loser";
  const compact = size < 80;
  const borderWidth = size < 58 ? 2 : compact ? 3 : 6;
  const innerInset = size < 58 ? 5 : compact ? 8 : 13;

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: finger.x,
        top: finger.y,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="anim-ring-pop h-full w-full">
        <div
          className="h-full w-full transition-all duration-500 ease-out"
          style={{
            transform: isWinner ? "scale(1.35)" : isLoser ? "scale(0.3)" : "scale(1)",
            opacity: isLoser ? 0 : 1,
          }}
        >
          <div className={cn("relative h-full w-full", !isResult && "anim-breathe")}>
            {/* Glow */}
            <div
              className="absolute inset-0 rounded-full transition-shadow duration-500"
              style={{
                boxShadow: isWinner
                  ? `0 0 ${compact ? 24 : 70}px ${compact ? 5 : 14}px ${hexWithAlpha(color, 0.65)}`
                  : `0 0 ${compact ? 16 : 36}px ${compact ? 3 : 6}px ${hexWithAlpha(color, 0.4)}`,
              }}
            />
            {/* Ripples for the winner */}
            {isWinner && (
              <>
                <span
                  className="anim-ripple absolute inset-0 rounded-full border-4"
                  style={{ borderColor: color }}
                />
                <span
                  className="anim-ripple absolute inset-0 rounded-full border-4"
                  style={{ borderColor: color, animationDelay: "0.5s" }}
                />
              </>
            )}
            {/* Ring */}
            <div
              className="absolute inset-0 rounded-full transition-colors duration-500"
              style={{ borderColor: color, borderWidth }}
            />
            {/* Inner fill */}
            <div
              className="absolute rounded-full transition-all duration-500"
              style={{
                inset: innerInset,
                background: isWinner
                  ? color
                  : isResult && status === "neutral"
                    ? hexWithAlpha(color, 0.7)
                    : hexWithAlpha(color, 0.22),
              }}
            />
            {/* Countdown arc (sweeps over the ring in white) */}
            {phase === "counting" && (
              <svg
                key={roundId}
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="57"
                  fill="none"
                  stroke="rgba(255,255,255,0.95)"
                  strokeWidth={compact ? 3 : 6}
                  strokeLinecap="round"
                  strokeDasharray="358.14"
                  className="anim-arc"
                  style={{ animationDuration: `${countdownMs}ms` }}
                />
              </svg>
            )}
            {/* Label (team letter / rank) */}
            {isResult && state?.label && (
              <div className="anim-pop-in absolute inset-0 flex items-center justify-center">
                <span
                  className="font-extrabold text-white"
                  style={{
                    fontSize: Math.max(14, size * 0.3),
                    textShadow: "0 2px 10px rgba(0,0,0,0.35)",
                  }}
                >
                  {state.label}
                </span>
              </div>
            )}
            {emoji && !(isResult && state?.label) && (
              <div
                className="absolute inset-0 flex items-center justify-center drop-shadow"
                style={{ fontSize: Math.max(14, size * 0.32) }}
              >
                {emoji}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
