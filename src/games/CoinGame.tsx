import { useEffect, useRef, useState } from "react";
import { ScreenHeader } from "../components/ui";
import { useSettings } from "../context/SettingsContext";
import { cn } from "../utils/cn";
import { feedback } from "../utils/feedback";

type Side = "heads" | "tails";
/** Flight time – matches the CSS coin-flight animation. */
const FLIP_MS = 2300;
const ROTATIONS = 9;

function CoinFace({ side }: { side: Side }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <defs>
        <radialGradient id={`coinFace-${side}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFF3A6" />
          <stop offset="45%" stopColor="#FFD84D" />
          <stop offset="100%" stopColor="#E9A800" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill={`url(#coinFace-${side})`} />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#E0A400" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="44.5" fill="none" stroke="#FFF1B0" strokeWidth="1.5" opacity="0.8" />
      {side === "heads" ? (
        <g fill="#D99B00" opacity="0.9">
          <circle cx="50" cy="37" r="11" />
          <circle cx="39" cy="52" r="11" />
          <circle cx="61" cy="52" r="11" />
          <path
            d="M49 50 Q52 63 57 72"
            stroke="#D99B00"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <path
          d="M50 24 L57.6 41.2 L76.4 43 L62.3 55.4 L66.5 73.9 L50 64.2 L33.5 73.9 L37.7 55.4 L23.6 43 L42.4 41.2 Z"
          fill="#D99B00"
          opacity="0.9"
        />
      )}
      <ellipse
        cx="34"
        cy="26"
        rx="13"
        ry="6"
        fill="#fff"
        opacity="0.35"
        transform="rotate(-30 34 26)"
      />
    </svg>
  );
}

export function CoinGame({ onBack }: { onBack: () => void }) {
  const { settings } = useSettings();
  const [rotation, setRotation] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<Side | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const flipAudio = useRef<HTMLAudioElement | null>(null);
  const touchStartY = useRef<number | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    const audio = new Audio("/coin-flip.mp3");
    audio.preload = "auto";
    flipAudio.current = audio;
    return () => {
      audio.pause();
      flipAudio.current = null;
    };
  }, []);

  useEffect(() => {
    if (!settings.sound && flipAudio.current) {
      flipAudio.current.pause();
      flipAudio.current.currentTime = 0;
    }
  }, [settings.sound]);

  const flip = () => {
    if (flipping) return;
    const side: Side = Math.random() < 0.5 ? "heads" : "tails";
    const base = Math.floor(rotation / 360) * 360;
    let next = base + 360 * ROTATIONS + (side === "tails" ? 180 : 0);
    if (next - rotation < 360 * (ROTATIONS - 1)) next += 360;
    setRotation(next);
    setFlipping(true);
    setResult(null);
    feedback.coinToss();
    if (settings.sound && flipAudio.current) {
      flipAudio.current.currentTime = 0;
      void flipAudio.current.play().catch((error: unknown) => {
        console.error("Unable to play the coin flip audio.", error);
      });
    }
    timer.current = window.setTimeout(() => {
      setFlipping(false);
      setResult(side);
      feedback.coinLand();
    }, FLIP_MS);
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Coin"
        onBack={onBack}
        backLabel="Choose a game"
      />
      <p
        key={flipping ? "flipping" : result ?? "ready"}
        className="anim-fade-up absolute left-1/2 top-[23%] z-10 w-full -translate-x-1/2 px-6 text-center text-[17px] leading-tight text-white/95"
        aria-live="polite"
      >
        {flipping
          ? ""
          : result
            ? result === "heads"
              ? "Heads"
              : "Tails"
            : "Swipe up or tap the coin to flip"}
      </p>

      <div className="pointer-events-none absolute inset-0" style={{ perspective: 700 }}>
        <button
          type="button"
          onPointerDown={(event) => {
            touchStartY.current = event.clientY;
          }}
          onPointerUp={(event) => {
            if (touchStartY.current !== null && touchStartY.current - event.clientY > 35) {
              suppressClick.current = true;
              flip();
              window.setTimeout(() => {
                suppressClick.current = false;
              }, 350);
            }
            touchStartY.current = null;
          }}
          onPointerCancel={() => {
            touchStartY.current = null;
          }}
          onClick={() => {
            if (suppressClick.current) return;
            flip();
          }}
          aria-label="Swipe up or tap to flip the coin"
          className="pointer-events-auto absolute left-1/2 top-[44%] z-30 h-[clamp(110px,30vw,180px)] w-[clamp(110px,30vw,180px)] -translate-x-1/2 -translate-y-1/2 touch-none outline-none"
        >
          <div
            className={cn(
              "absolute -bottom-3 left-1/2 h-4 w-[70%] rounded-[50%] bg-black/30 blur-[6px]",
              flipping && "anim-coin-shadow",
            )}
            style={
              flipping
                ? { animationDuration: `${FLIP_MS}ms`, transform: "translateX(-50%)" }
                : { transform: "translateX(-50%)" }
            }
          />
          <div
            className={cn("preserve-3d relative h-full w-full", flipping && "anim-coin-flight")}
            style={{
              filter: "drop-shadow(0 18px 24px rgba(0,0,0,0.28))",
              ...(flipping ? { animationDuration: `${FLIP_MS}ms` } : {}),
            }}
          >
            <div
              className="preserve-3d relative h-full w-full"
              style={{
                transform: `rotateX(${rotation}deg)`,
                transition: `transform ${FLIP_MS}ms cubic-bezier(0.35, 0.05, 0.6, 1)`,
              }}
            >
              {Array.from({ length: 9 }, (_, i) => (
                <svg
                  key={i}
                  viewBox="0 0 100 100"
                  className="absolute inset-0 h-full w-full"
                  style={{ transform: `translateZ(${-i}px)` }}
                  aria-hidden="true"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="48.5"
                    fill={i % 2 === 0 ? "#C88700" : "#F5C22D"}
                    stroke="#A96E00"
                    strokeWidth="1"
                  />
                </svg>
              ))}
              <div
                className="backface-hidden absolute inset-0"
                style={{ transform: "translateZ(1px)" }}
              >
                <CoinFace side="heads" />
              </div>
              <div
                className="backface-hidden absolute inset-0"
                style={{ transform: "rotateX(180deg) translateZ(9px)" }}
              >
                <CoinFace side="tails" />
              </div>
            </div>
          </div>
          {result && !flipping && (
            <>
              <span className="anim-coin-sparkle pointer-events-none absolute -top-1 -left-1 text-2xl">
                ✨
              </span>
              <span
                className="anim-coin-sparkle pointer-events-none absolute -right-2 bottom-2 text-xl"
                style={{ animationDelay: "90ms" }}
              >
                ✨
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
