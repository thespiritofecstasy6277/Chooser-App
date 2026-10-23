/**
 * Haptic (vibration) + sound feedback.
 *
 * Vibration uses the Vibration API, which works on Android browsers
 * (and inside Android WebViews when the VIBRATE permission is granted).
 * Sound is synthesized with the Web Audio API – there are several
 * selectable "tone packs" (see TONES) plus a physical-sounding coin toss.
 */

export type ToneId = "classic" | "crystal" | "retro" | "marimba" | "zen";

export const TONES: { id: ToneId; name: string; description: string; emoji: string }[] = [
  { id: "classic", name: "Classic", description: "Warm chime", emoji: "🔔" },
  { id: "crystal", name: "Crystal", description: "Glass bell", emoji: "✨" },
  { id: "retro", name: "Retro", description: "8-bit arcade", emoji: "🎮" },
  { id: "marimba", name: "Marimba", description: "Wooden mallet", emoji: "🪵" },
  { id: "zen", name: "Zen", description: "Soft gong", emoji: "🍃" },
];

export const isToneId = (v: unknown): v is ToneId =>
  typeof v === "string" && TONES.some((t) => t.id === v);

let vibrationEnabled = true;
let soundEnabled = true;
let activeTone: ToneId = "classic";

export function configureFeedback(opts: { vibration: boolean; sound: boolean; tone?: ToneId }) {
  vibrationEnabled = opts.vibration;
  soundEnabled = opts.sound;
  if (opts.tone) activeTone = opts.tone;
}

export const canVibrate =
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

function vibrate(pattern: number | number[]) {
  if (!vibrationEnabled || !canVibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/** Builds an accelerating pulse pattern that lasts ~`ms` milliseconds. */
export function countdownPattern(ms: number): number[] {
  const pattern: number[] = [];
  let elapsed = 0;
  let gap = Math.max(140, ms / 11);
  const on = 55;
  while (elapsed + on <= ms) {
    pattern.push(on, gap);
    elapsed += on + gap;
    gap = Math.max(35, gap * 0.86);
  }
  return pattern;
}

/* ---------- Sound (Web Audio) ---------- */
let ctx: AudioContext | null = null;

function getCtx(force = false): AudioContext | null {
  if (!soundEnabled && !force) return null;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function withCtx(fn: (c: AudioContext) => void) {
  const c = getCtx();
  if (!c) return;
  try {
    fn(c);
  } catch {
    /* ignore */
  }
}

/** Single enveloped oscillator. */
function note(
  c: AudioContext,
  freq: number,
  duration = 0.12,
  delay = 0,
  type: OscillatorType = "sine",
  gain = 0.18,
  attack = 0.012,
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Additive metallic bell / chime. */
function bell(
  c: AudioContext,
  freq: number,
  delay = 0,
  decay = 0.5,
  gain = 0.07,
  partials: number[] = [1, 2.01, 3.9, 5.4],
) {
  const t0 = c.currentTime + delay;
  partials.forEach((p, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * p, t0);
    const peak = gain / (i + 1.4);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay / (1 + i * 0.55));
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + decay + 0.05);
  });
}

interface ToneCues {
  tap: (c: AudioContext) => void;
  tick: (c: AudioContext) => void;
  win: (c: AudioContext) => void;
  thud: (c: AudioContext) => void;
  step: (c: AudioContext, delay: number, index: number, total: number) => void;
}

const CUES: Record<ToneId, ToneCues> = {
  classic: {
    tap: (c) => note(c, 520, 0.06, 0, "triangle", 0.07),
    tick: (c) => note(c, 1100, 0.035, 0, "square", 0.03),
    win: (c) => {
      note(c, 660, 0.16, 0, "sine", 0.16);
      bell(c, 880, 0.11, 0.35, 0.05, [1, 2, 3]);
      bell(c, 1320, 0.22, 0.5, 0.055, [1, 2, 3]);
    },
    thud: (c) => note(c, 220, 0.1, 0, "sine", 0.2),
    step: (c, d, i) => note(c, 620 + i * 90, 0.09, d, "sine", 0.055),
  },
  crystal: {
    tap: (c) => bell(c, 1568, 0, 0.35, 0.07),
    tick: (c) => bell(c, 2093, 0, 0.22, 0.035),
    win: (c) => {
      bell(c, 1046.5, 0, 0.7, 0.09);
      bell(c, 1318.5, 0.1, 0.7, 0.08);
      bell(c, 1568, 0.2, 0.8, 0.075);
      bell(c, 2093, 0.31, 0.9, 0.06);
    },
    thud: (c) => {
      note(c, 180, 0.12, 0, "sine", 0.12);
      bell(c, 1318, 0.02, 0.35, 0.03);
    },
    step: (c, d, i, total) => bell(c, 1046.5 * Math.pow(2, (total - i) / 12), d, 0.4, 0.05),
  },
  retro: {
    tap: (c) => note(c, 880, 0.045, 0, "square", 0.05),
    tick: (c) => note(c, 1760, 0.028, 0, "square", 0.025),
    win: (c) => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        note(c, f, 0.1, i * 0.075, "square", 0.05),
      );
      note(c, 1568, 0.24, 0.32, "square", 0.04);
    },
    thud: (c) => note(c, 110, 0.14, 0, "square", 0.09),
    step: (c, d, i, total) =>
      note(c, i === total - 1 ? 1318.5 : 659.25 + i * 110, 0.08, d, "square", 0.035),
  },
  marimba: {
    tap: (c) => {
      note(c, 660, 0.1, 0, "triangle", 0.07);
      note(c, 1320, 0.05, 0, "sine", 0.025);
    },
    tick: (c) => note(c, 1320, 0.05, 0, "triangle", 0.028),
    win: (c) => {
      note(c, 523.25, 0.2, 0, "triangle", 0.09);
      note(c, 784, 0.2, 0.1, "triangle", 0.075);
      note(c, 1046.5, 0.4, 0.21, "triangle", 0.065);
    },
    thud: (c) => note(c, 196, 0.12, 0, "sine", 0.16),
    step: (c, d, i) => note(c, 523.25 * Math.pow(2, i / 12), 0.13, d, "triangle", 0.05),
  },
  zen: {
    tap: (c) => bell(c, 440, 0, 0.9, 0.04, [1, 2.01, 3.01]),
    tick: (c) => bell(c, 880, 0, 0.5, 0.022, [1, 2.01]),
    win: (c) => {
      bell(c, 392, 0, 1.6, 0.07, [1, 2.01, 3.01]);
      bell(c, 523.25, 0.14, 1.5, 0.055, [1, 2.01, 3.01]);
      bell(c, 783.99, 0.3, 2, 0.04, [1, 2.01, 3.01]);
    },
    thud: (c) => note(c, 160, 0.24, 0, "sine", 0.14, 0.02),
    step: (c, d, i, total) =>
      bell(c, i === total - 1 ? 783.99 : 392 * Math.pow(2, i / 12), d, 0.9, 0.035, [1, 2.01]),
  },
};

export const feedback = {
  /** Light tap when a finger lands / a button is pressed. */
  tap() {
    vibrate(22);
    withCtx((c) => CUES[activeTone].tap(c));
  },
  /** Accelerating countdown buzz + a soft tone on every second. */
  countdown(ms: number) {
    vibrate(countdownPattern(ms));
    const seconds = Math.max(1, Math.floor(ms / 1000));
    withCtx((c) => {
      for (let i = 0; i < seconds; i++) {
        CUES[activeTone].step(c, i * 1, i, seconds);
      }
    });
  },
  /** Stop any ongoing vibration (countdown cancelled). */
  cancel() {
    if (canVibrate) {
      try {
        navigator.vibrate(0);
      } catch {
        /* ignore */
      }
    }
  },
  /** Big buzz + chime when the winner is chosen. */
  win() {
    vibrate([0, 90, 60, 90, 60, 320]);
    withCtx((c) => CUES[activeTone].win(c));
  },
  /** Short tick (dice rolls, wheel passes, number spins). */
  tick() {
    vibrate(10);
    withCtx((c) => CUES[activeTone].tick(c));
  },
  /** Medium thud (dice landed, number revealed). */
  thud() {
    vibrate(70);
    withCtx((c) => CUES[activeTone].thud(c));
  },
  /** Dice sound is handled by its supplied audio clip; keep these haptics separate. */
  diceRollStart() {
    vibrate(22);
  },
  diceRollTick() {
    vibrate(10);
  },
  diceRollLand() {
    vibrate(70);
  },
  /** Coin audio is supplied as a recording by CoinGame; keep toss haptics here. */
  coinToss() {
    vibrate([12, 70, 18, 120, 14]);
  },
  /** Coin landing haptic. */
  coinLand() {
    vibrate([0, 45, 35, 60]);
  },
};

/** Plays the win chime of a tone without changing the active tone. */
export function previewTone(id: ToneId) {
  const c = getCtx(true);
  if (!c) return;
  try {
    CUES[id].win(c);
  } catch {
    /* ignore */
  }
}
