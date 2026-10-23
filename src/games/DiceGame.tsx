import { useEffect, useRef, useState } from "react";
import { Dice5, Minus, Plus, Volume2, VolumeX } from "lucide-react";
import { ScreenHeader } from "../components/ui";
import { useSettings } from "../context/SettingsContext";
import { cn } from "../utils/cn";
import { feedback } from "../utils/feedback";
import { randomInt } from "../utils/random";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({
  value,
  transform,
  size,
}: {
  value: number;
  transform: string;
  size: string;
}) {
  return (
    <div
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-[16%] border border-black/10 bg-gradient-to-br from-white via-white to-[#d8d8dd] p-[14%] shadow-inner"
      style={{ transform: `${transform} translateZ(calc(${size} / 2))` }}
      aria-hidden="true"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex items-center justify-center">
          {PIPS[value].includes(i) && (
            <span className="h-[58%] w-[58%] rounded-full bg-[#1c1c1e] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]" />
          )}
        </div>
      ))}
    </div>
  );
}

function Die({
  value,
  rolling,
  size,
}: {
  value: number;
  rolling: boolean;
  size: string;
}) {
  const faces = [value % 6 + 1, (value + 1) % 6 + 1, (value + 2) % 6 + 1, 5, value, 7 - value];

  return (
    <div
      className={cn("preserve-3d relative shrink-0", rolling && "anim-dice-flight")}
      style={{
        width: size,
        height: size,
      }}
      aria-label={`Die showing ${value}`}
    >
      <div
        className="preserve-3d relative h-full w-full"
        style={{ transform: "rotateX(-24deg) rotateY(34deg)" }}
      >
        <DieFace value={faces[0]} transform="rotateY(0deg)" size={size} />
        <DieFace value={faces[1]} transform="rotateY(90deg)" size={size} />
        <DieFace value={faces[2]} transform="rotateY(180deg)" size={size} />
        <DieFace value={faces[3]} transform="rotateY(-90deg)" size={size} />
        <DieFace value={faces[4]} transform="rotateX(90deg)" size={size} />
        <DieFace value={faces[5]} transform="rotateX(-90deg)" size={size} />
      </div>
    </div>
  );
}

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

export function DiceGame({ onBack }: { onBack: () => void }) {
  const { settings, update } = useSettings();
  const rollAudio = useRef<HTMLAudioElement | null>(null);
  const [count, setCount] = useState(2);
  const [values, setValues] = useState<number[]>([5, 2, 6, 4, 1, 3]);
  const [rolling, setRolling] = useState(false);
  const [shakeReady, setShakeReady] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);
  const rollingRef = useRef(false);
  const timers = useRef<number[]>([]);
  const lastMag = useRef<number | null>(null);
  const lastShake = useRef(0);

  useEffect(() => {
    const audio = new Audio("/dice-roll.mp3");
    audio.preload = "auto";
    rollAudio.current = audio;
    return () => {
      audio.pause();
      rollAudio.current = null;
    };
  }, []);

  useEffect(() => {
    if (!settings.sound && rollAudio.current) {
      rollAudio.current.pause();
      rollAudio.current.currentTime = 0;
    }
  }, [settings.sound]);

  const roll = () => {
    if (rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);
    feedback.diceRollStart();
    if (settings.sound && rollAudio.current) {
      rollAudio.current.currentTime = 0;
      void rollAudio.current.play().catch((error: unknown) => {
        console.error("Unable to play the dice roll audio.", error);
      });
    }
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    for (let i = 1; i <= 9; i++) {
      timers.current.push(
        window.setTimeout(() => {
          setValues(Array.from({ length: 6 }, () => randomInt(1, 6)));
          feedback.diceRollTick();
        }, i * 90),
      );
    }
    timers.current.push(
      window.setTimeout(() => {
        setValues(Array.from({ length: 6 }, () => randomInt(1, 6)));
        setRolling(false);
        rollingRef.current = false;
        feedback.diceRollLand();
      }, 950),
    );
  };
  const rollRef = useRef(roll);
  rollRef.current = roll;

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    const DME = window.DeviceMotionEvent as unknown as MotionPermission;
    if (typeof DME.requestPermission === "function") {
      setNeedsPermission(true);
      return;
    }
    setShakeReady(true);
  }, []);

  useEffect(() => {
    if (!shakeReady) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const mag = Math.hypot(a.x, a.y, a.z);
      if (lastMag.current !== null) {
        const delta = Math.abs(mag - lastMag.current);
        const now = Date.now();
        if (delta > 14 && now - lastShake.current > 1400) {
          lastShake.current = now;
          rollRef.current();
        }
      }
      lastMag.current = mag;
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [shakeReady]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const enableShake = async () => {
    try {
      const DME = window.DeviceMotionEvent as unknown as MotionPermission;
      const res = await DME.requestPermission?.();
      if (res === "granted") {
        setShakeReady(true);
        setNeedsPermission(false);
      }
    } catch {
      /* ignore */
    }
  };

  const shown = values.slice(0, count);
  const total = shown.reduce((a, b) => a + b, 0);
  const dieSize =
    count >= 6
      ? "clamp(32px, min(8vh, 10vw), 50px)"
      : count >= 5
        ? "clamp(38px, min(9vh, 13vw), 58px)"
        : count >= 4
          ? "clamp(46px, min(12vh, 15vw), 76px)"
          : count === 3
            ? "clamp(54px, min(14vh, 21vw), 90px)"
            : count === 2
              ? "clamp(64px, min(19vh, 20vw), 108px)"
              : "clamp(72px, 21vh, 120px)";

  return (
    <div className="absolute inset-0 overflow-hidden">
      <ScreenHeader
        title="Dice"
        onBack={onBack}
        backLabel="Choose a game"
        className="pb-0"
      />

      <div className="relative z-20 -mt-2 flex justify-center gap-2">
        <div
          className="flex h-10 min-w-[54px] items-center justify-center gap-1.5 rounded-full bg-white/20 px-3 text-white"
          aria-live="polite"
          aria-label={`Dice total ${total}`}
        >
          <Dice5 size={17} strokeWidth={2.2} />
          <span className="text-[13px] font-bold">{total}</span>
        </div>
        <div className="flex h-10 items-center rounded-full bg-white/20 px-1 text-white">
          <button
            type="button"
            onClick={() => setCount((n) => Math.max(1, n - 1))}
            disabled={count === 1 || rolling}
            aria-label="Remove a die"
            className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Minus size={16} strokeWidth={2.5} />
          </button>
          <span className="min-w-8 text-center text-[12px] font-bold">{count}D</span>
          <button
            type="button"
            onClick={() => setCount((n) => Math.min(6, n + 1))}
            disabled={count === 6 || rolling}
            aria-label="Add a die"
            className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => update("sound", !settings.sound)}
          aria-label={settings.sound ? "Turn sound off" : "Turn sound on"}
          aria-pressed={settings.sound}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white active:scale-95"
        >
          {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {needsPermission && (
        <button
          type="button"
          onClick={enableShake}
          className="relative z-20 mx-auto mt-2 block rounded-full bg-white/20 px-4 py-2 text-[13px] font-semibold text-white"
        >
          Enable shake to roll
        </button>
      )}

      <button
        type="button"
        onClick={roll}
        aria-label={`Roll ${count} dice`}
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 flex h-[52%] items-end justify-center overflow-visible px-2 outline-none",
          count === 1 ? "gap-0" : count === 2 ? "gap-12" : "gap-2",
          count === 1 ? "pb-[max(var(--sab),32px)]" : "pb-[max(var(--sab),24px)]",
        )}
        style={{ perspective: 900 }}
      >
        {shown.map((value, index) => (
          <Die key={index} value={value} rolling={rolling} size={dieSize} />
        ))}
      </button>
    </div>
  );
}
