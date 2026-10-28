import { useCallback, useEffect, useRef, useState } from "react";
import type { Finger } from "./useFingers";

export type RoundPhase = "idle" | "counting" | "result";

interface Options {
  fingers: Finger[];
  countdownMs: number;
  enabled?: boolean;
  minFingers?: number;
  /** Delay (ms) before returning to idle after all fingers are lifted. */
  resetDelayMs?: number;
  onCountdownStart?: () => void;
  onCountdownCancel?: () => void;
  /** Called with the fingers present when the countdown finishes. */
  onDone: (fingers: Finger[]) => void;
  onReset?: () => void;
}

/**
 * Drives the "hold your fingers → countdown → choose" flow.
 *
 * - The countdown (re)starts whenever the *set* of fingers changes
 *   (moving a finger does not restart it).
 * - Once a result is reached it is kept until every finger is lifted.
 */
export function useFingerRound({
  fingers,
  countdownMs,
  enabled = true,
  minFingers = 2,
  resetDelayMs = 400,
  onCountdownStart,
  onCountdownCancel,
  onDone,
  onReset,
}: Options) {
  const [phase, setPhase] = useState<RoundPhase>("idle");
  const [roundId, setRoundId] = useState(0);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const fingersRef = useRef(fingers);
  fingersRef.current = fingers;
  const cbRef = useRef({ onCountdownStart, onCountdownCancel, onDone, onReset });
  cbRef.current = { onCountdownStart, onCountdownCancel, onDone, onReset };
  /** True once every finger has been lifted after a result (reset pending). */
  const pendingResetRef = useRef(false);

  const count = fingers.length;
  const idsKey = fingers
    .map((f) => f.id)
    .sort((a, b) => a - b)
    .join(",");

  // (Re)start the countdown whenever the set of fingers changes.
  useEffect(() => {
    if (!enabled) {
      if (phaseRef.current !== "idle") {
        setPhase("idle");
        pendingResetRef.current = false;
        cbRef.current.onReset?.();
      }
      return;
    }
    if (phaseRef.current === "result") {
      if (count === 0) {
        pendingResetRef.current = true;
        return;
      }
      if (!pendingResetRef.current) return; // keep showing the result
      // Fingers were lifted and new ones arrived → new round.
      pendingResetRef.current = false;
      cbRef.current.onReset?.();
    }
    if (count < minFingers) {
      setPhase("idle");
      return;
    }
    setPhase("counting");
    setRoundId((r) => r + 1);
    cbRef.current.onCountdownStart?.();

    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      setPhase("result");
      cbRef.current.onDone(fingersRef.current);
    }, countdownMs);

    return () => {
      if (!fired) {
        window.clearTimeout(timer);
        cbRef.current.onCountdownCancel?.();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, countdownMs, enabled, minFingers]);

  // After a result, go back to idle once every finger is lifted.
  useEffect(() => {
    if (phase !== "result" || count !== 0) return;
    const t = window.setTimeout(() => {
      pendingResetRef.current = false;
      setPhase("idle");
      cbRef.current.onReset?.();
    }, resetDelayMs);
    return () => window.clearTimeout(t);
  }, [phase, count, resetDelayMs]);

  const reset = useCallback(() => {
    pendingResetRef.current = false;
    setPhase("idle");
    cbRef.current.onReset?.();
  }, []);

  return { phase, roundId, reset };
}
