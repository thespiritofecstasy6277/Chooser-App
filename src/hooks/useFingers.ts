import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { PALETTE } from "../utils/colors";

export interface Finger {
  /** Touch identifier (negative ids are desktop-simulated fingers). */
  id: number;
  x: number;
  y: number;
  color: string;
  /** Monotonic counter – order in which fingers were placed. */
  order: number;
}

interface Options {
  enabled?: boolean;
  onFingerDown?: (finger: Finger) => void;
  onLimitReached?: () => void;
  tapMode?: boolean;
  ringColor?: string;
  maxFingers?: number;
  accepting?: boolean;
}

export const MAX_FINGER_COUNT = 50;
export const MAX_RANKED_FINGER_COUNT = 30;

/**
 * Tracks all fingers currently touching the given element.
 *
 * - Touch events are used so every simultaneous finger is tracked by id.
 * - Elements marked with `data-ui` (buttons, menus…) are ignored, so UI
 *   controls placed inside the touch area remain clickable.
 * - Desktop fallback: mouse clicks add sticky fingers; outside tap mode,
 *   clicking near an existing simulated finger removes it.
 */
export function useFingers(
  ref: RefObject<HTMLElement | null>,
  {
    enabled = true,
    onFingerDown,
    onLimitReached,
    tapMode = false,
    ringColor,
    maxFingers = MAX_FINGER_COUNT,
    accepting = true,
  }: Options = {},
) {
  const [fingers, setFingers] = useState<Finger[]>([]);
  const listRef = useRef<Finger[]>([]);
  const orderRef = useRef(0);
  const simIdRef = useRef(-1);
  const optionsRef = useRef({
    onFingerDown,
    onLimitReached,
    ringColor,
    tapMode,
    maxFingers,
    accepting,
  });
  optionsRef.current = { onFingerDown, onLimitReached, ringColor, tapMode, maxFingers, accepting };

  const publish = useCallback((next: Finger[]) => {
    listRef.current = next;
    setFingers(next);
  }, []);

  const clear = useCallback(() => publish([]), [publish]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const isUi = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("[data-ui]");

    const local = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    };

    const nextColor = (list: Finger[]) => {
      if (optionsRef.current.ringColor) return optionsRef.current.ringColor;
      const used = new Set(list.map((f) => f.color));
      return PALETTE.find((c) => !used.has(c)) ?? PALETTE[list.length % PALETTE.length];
    };

    const addFinger = (list: Finger[], id: number, x: number, y: number) => {
      if (list.length >= optionsRef.current.maxFingers) {
        optionsRef.current.onLimitReached?.();
        return false;
      }
      const finger: Finger = { id, x, y, color: nextColor(list), order: ++orderRef.current };
      list.push(finger);
      optionsRef.current.onFingerDown?.(finger);
      return true;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isUi(e.target) || !optionsRef.current.accepting) return;
      e.preventDefault();
      const next = [...listRef.current];
      for (const t of Array.from(e.changedTouches)) {
        const { x, y } = local(t.clientX, t.clientY);
        if (optionsRef.current.tapMode) {
          addFinger(next, simIdRef.current--, x, y);
        } else if (!next.some((f) => f.id === t.identifier)) {
          addFinger(next, t.identifier, x, y);
        }
      }
      publish(next);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isUi(e.target)) return;
      e.preventDefault();
      const touches = Array.from(e.changedTouches);
      let changed = false;
      const next = listRef.current.map((f) => {
        const t = touches.find((tt) => tt.identifier === f.id);
        if (!t) return f;
        const { x, y } = local(t.clientX, t.clientY);
        if (x === f.x && y === f.y) return f;
        changed = true;
        return { ...f, x, y };
      });
      if (changed) publish(next);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isUi(e.target)) e.preventDefault();
      if (optionsRef.current.tapMode) return;
      const ids = Array.from(e.changedTouches).map((t) => t.identifier);
      const next = listRef.current.filter((f) => !ids.includes(f.id));
      if (next.length !== listRef.current.length) publish(next);
    };

    // Desktop fallback (mouse only – touch pointers are handled above).
    const onPointerDown = (e: PointerEvent) => {
      if (
        e.pointerType !== "mouse" ||
        e.button !== 0 ||
        isUi(e.target) ||
        !optionsRef.current.accepting
      ) {
        return;
      }
      const { x, y } = local(e.clientX, e.clientY);
      const current = listRef.current;
      if (!optionsRef.current.tapMode) {
        const hit = current.find((f) => f.id < 0 && Math.hypot(f.x - x, f.y - y) < 60);
        if (hit) {
          publish(current.filter((f) => f !== hit));
          return;
        }
      }
      const next = [...current];
      addFinger(next, simIdRef.current--, x, y);
      publish(next);
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("contextmenu", onContextMenu);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("contextmenu", onContextMenu);
      publish([]);
    };
  }, [ref, enabled, tapMode, publish]);

  const removeLast = useCallback(() => {
    const last = listRef.current.reduce<Finger | null>(
      (latest, finger) => (!latest || finger.order > latest.order ? finger : latest),
      null,
    );
    if (last) publish(listRef.current.filter((finger) => finger !== last));
  }, [publish]);

  return { fingers, clear, removeLast };
}
