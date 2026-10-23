import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChooserOptions } from "../components/ChooserOptions";
import { DareTopicDropdown } from "../components/DareTopicDropdown";
import { FingerRing, type RingState } from "../components/FingerRing";
import { IconVibrate } from "../components/Icons";
import { ModeDropdown } from "../components/ModeDropdown";
import { BottomSheet, Segmented } from "../components/ui";
import { useSettings, type Settings } from "../context/SettingsContext";
import { useFingers, type Finger } from "../hooks/useFingers";
import { useFingerRound } from "../hooks/useFingerRound";
import { cn } from "../utils/cn";
import { TEAM_COLORS, hexWithAlpha } from "../utils/colors";
import { canVibrate, feedback } from "../utils/feedback";
import { shuffle } from "../utils/random";
import { getPrompts } from "../utils/darePrompts";
import { requestPrompt } from "../utils/promptFeed";

type ResultMap = Record<number, RingState>;
type Challenge = { kind: "truth" | "dare"; prompt: string } | null;

function computeResult(list: Finger[], s: Settings): ResultMap {
  const shuffled = s.cheatMode
    ? [...list].sort((a, b) => a.order - b.order)
    : shuffle(list);
  const map: ResultMap = {};
  if (s.mode === "all") {
    const k = Math.max(1, Math.min(s.winners, list.length - 1));
    shuffled.forEach((f, i) => {
      map[f.id] = {
        status: i < k ? "winner" : "loser",
        ...(s.rankWinners && i < k ? { label: String(i + 1) } : {}),
      };
    });
  } else if (s.mode === "teams" || s.homogeneousTeams) {
    const t = Math.min(s.teams, list.length);
    shuffled.forEach((f, i) => {
      const team = i % t;
      map[f.id] = {
        status: "neutral",
        label: String.fromCharCode(65 + team),
        color: TEAM_COLORS[team],
      };
    });
  } else {
    shuffled.forEach((f, i) => {
      map[f.id] = { status: i === 0 ? "winner" : "neutral", label: String(i + 1) };
    });
  }
  return map;
}

function getChallenge(settings: Settings): Challenge {
  const choose = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
  if (settings.truthOrDare) {
    const kind = Math.random() < 0.5 ? "truth" : "dare";
    return {
      kind,
      prompt: choose(getPrompts(settings.dareTopic, kind, settings.adultPrompts)),
    };
  }
  if (settings.takeDare)
    return {
      kind: "dare" as const,
      prompt: choose(getPrompts(settings.dareTopic, "dare", settings.adultPrompts)),
    };
  return null;
}

function supportsPrompts(settings: Settings) {
  return settings.mode !== "teams" && settings.mode !== "order" && !settings.homogeneousTeams;
}

export function ChooserScreen() {
  const { settings, update } = useSettings();
  const areaRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<ResultMap | null>(null);
  const [resultFingers, setResultFingers] = useState<Finger[] | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [challengeNotice, setChallengeNotice] = useState<string | null>(null);
  const [holdSeconds, setHoldSeconds] = useState(15);
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultOrderRef = useRef(0);
  const challengeRequestRef = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const shouldHoldResults =
    settings.mode === "teams" || settings.mode === "order" || settings.homogeneousTeams;

  const onFingerDown = useCallback(() => feedback.tap(), []);
  const { fingers, clear } = useFingers(areaRef, {
    onFingerDown,
    tapMode: settings.tapMode,
    ringColor: settings.ringColor,
  });

  const countdownMs = settings.countdown * 1000;

  const { phase, roundId, reset: resetRound } = useFingerRound({
    fingers,
    countdownMs,
    resetDelayMs: shouldHoldResults ? 15_000 : 400,
    onCountdownStart: () => feedback.countdown(countdownMs),
    onCountdownCancel: () => feedback.cancel(),
    onDone: (list) => {
      resultOrderRef.current = Math.max(0, ...list.map((f) => f.order));
      const activeSettings = settingsRef.current;
      setResult(computeResult(list, activeSettings));
      setResultFingers(list);
      const selectedChallenge = supportsPrompts(activeSettings)
        ? getChallenge(activeSettings)
        : null;
      setChallengeNotice(null);
      if (selectedChallenge) {
        const label = selectedChallenge.kind === "truth" ? "Truth" : "Dare";
        const offlineChallenge = `${label}: ${selectedChallenge.prompt}`;
        setChallenge(offlineChallenge);
        const requestId = ++challengeRequestRef.current;
        setChallenge(`${label}: Loading prompt…`);
        void requestPrompt(
          activeSettings.dareTopic,
          activeSettings.truthOrDare && activeSettings.dareTopic === "All"
            ? "all"
            : selectedChallenge.kind,
          activeSettings.adultPrompts,
        )
          .then((selection) => {
            if (challengeRequestRef.current === requestId) {
              const promptLabel = selection.kind === "truth" ? "Truth" : "Dare";
              setChallenge(`${promptLabel}: ${selection.prompt}`);
            }
          })
          .catch((error: unknown) => {
            console.error("Unable to load a shared prompt; using an offline prompt.", error);
            if (challengeRequestRef.current === requestId) {
              setChallenge(offlineChallenge);
              const status =
                typeof error === "object" && error !== null && "status" in error
                  ? error.status
                  : undefined;
              setChallengeNotice(
                status === 404
                  ? "No saved prompts match this topic, type, and 18+ setting. Check your filters or add matching prompts."
                  : error instanceof Error
                    ? `${error.message} — showing a built-in prompt.`
                    : "Prompt feed unavailable — showing a built-in prompt.",
              );
            }
          });
      } else {
        setChallenge(null);
      }
      if (activeSettings.notifications && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Chooser", { body: "Your group has been picked!" });
        } catch (error) {
          console.error("Unable to show chooser notification.", error);
        }
      }
      feedback.win();
    },
    onReset: () => {
      challengeRequestRef.current += 1;
      setResult(null);
      setResultFingers(null);
      setChallenge(null);
      setChallengeNotice(null);
    },
  });

  useEffect(() => {
    if (!shouldHoldResults || phase !== "result" || fingers.length > 0) {
      setHoldSeconds(15);
      return;
    }
    const expiresAt = Date.now() + 15_000;
    const updateRemaining = () =>
      setHoldSeconds(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [fingers.length, phase, roundId, shouldHoldResults]);

  // Desktop fallback: a click after a result clears the simulated fingers.
  useEffect(() => {
    if (phase !== "result") return;
    if (fingers.some((f) => f.id < 0 && f.order > resultOrderRef.current)) clear();
  }, [fingers, phase, clear]);

  const isResult = phase === "result" && result !== null;
  const visibleFingers = isResult
    ? (resultFingers ?? fingers).filter((f) => result[f.id])
    : fingers;
  const winner = useMemo(
    () => (isResult ? visibleFingers.find((f) => result[f.id]?.status === "winner") : undefined),
    [isResult, visibleFingers, result],
  );
  const hasSimulated = fingers.some((f) => f.id < 0);
  const showTitle = fingers.length === 0 && phase === "idle";

  let hint: string | null = null;
  if (phase === "idle" && settings.tapMode && fingers.length === 0) hint = "Tap to add players";
  else if (phase === "idle" && fingers.length === 1) hint = "Add more fingers";
  else if (phase === "counting") hint = "Hold still…";
  else if (isResult) {
    const label =
      settings.mode === "teams"
        ? "Teams ready!"
        : settings.mode === "order"
          ? "Turn order decided!"
          : settings.winners > 1
            ? "Chosen!"
            : "You're the one!";
    hint = `${label} ${hasSimulated ? "Click" : "Lift fingers"} to go again`;
  }

  return (
    <div
      ref={areaRef}
      className="no-select absolute inset-0 overflow-hidden"
      style={{ touchAction: "none" }}
    >
      {/* Winner glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{
          opacity: winner ? 1 : 0,
          background: winner
            ? `radial-gradient(circle at ${winner.x}px ${winner.y}px, ${hexWithAlpha(
                result?.[winner.id]?.color ?? winner.color,
                0.45,
              )} 0%, transparent 45%)`
            : undefined,
        }}
      />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 pt-[var(--sat)]">
        <div className="flex items-center justify-end gap-6 px-6 pt-6">
          <button
            type="button"
            data-ui
            aria-label={settings.vibration ? "Turn vibration off" : "Turn vibration on"}
            aria-pressed={settings.vibration}
            onClick={() => {
              update("vibration", !settings.vibration);
              if (!settings.vibration && canVibrate) navigator.vibrate(40);
            }}
            className={cn(
              "pointer-events-auto relative text-white transition-opacity active:scale-90",
              !settings.vibration && "opacity-45",
            )}
          >
            <IconVibrate size={30} />
            {!settings.vibration && (
              <span className="absolute top-1/2 left-1/2 h-[2.5px] w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded bg-white" />
            )}
          </button>
          <button
            type="button"
            data-ui
            aria-label="Chooser settings"
            onClick={() => {
              setSheetOpen(true);
              feedback.tap();
            }}
            className="pointer-events-auto text-white active:scale-90"
          >
            <SlidersHorizontal size={28} strokeWidth={2.4} />
          </button>
        </div>
        <div className="pointer-events-auto mt-5 flex flex-col items-center gap-3">
          <ModeDropdown />
          {settings.homogeneousTeams && (
            <div className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
              <span className="text-sm font-semibold text-white">Teams</span>
              <Segmented<2 | 3 | 4>
                value={settings.teams}
                onChange={(teams) => update("teams", teams)}
                options={[
                  { value: 2, label: "2" },
                  { value: 3, label: "3" },
                  { value: 4, label: "4" },
                ]}
                className="w-[156px]"
              />
            </div>
          )}
          {(settings.takeDare || settings.truthOrDare) && supportsPrompts(settings) && (
            <DareTopicDropdown />
          )}
        </div>
      </div>

      {/* Title */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-300",
          showTitle ? "opacity-100" : "scale-95 opacity-0",
        )}
      >
        <h1 className="text-[58px] leading-none font-extrabold tracking-tight text-white drop-shadow-sm">
          CHOOSER
        </h1>
        <span className="mt-4 h-px w-16 bg-white/75" aria-hidden="true" />
        <p className="mt-2 text-xs font-semibold tracking-[0.22em] text-white/90">
          BY TRISHUL
        </p>
        <p className="mt-3 text-[22px] text-white/95">A random finger selector.</p>
      </div>

      {/* Finger rings */}
      {visibleFingers.map((f) => (
        <FingerRing
          key={f.id}
          finger={f}
          phase={phase}
          roundId={roundId}
          countdownMs={countdownMs}
          state={isResult ? result[f.id] : undefined}
          emoji={settings.fingerEmoji}
        />
      ))}

      {isResult &&
        challenge &&
        supportsPrompts(settings) && (
        <div className="pointer-events-none absolute inset-x-5 bottom-[76px] z-20 flex justify-center">
          <div className="anim-fade-up rounded-2xl bg-black/25 px-5 py-3 text-center text-[16px] font-semibold text-white backdrop-blur-sm">
            {challenge}
            <p className="mt-1 text-[12px] font-medium text-white/75">
              Prompts are optional — anyone can pass.
            </p>
            {challengeNotice && (
              <p className="mt-1 text-[12px] font-medium text-white/75">{challengeNotice}</p>
            )}
          </div>
        </div>
      )}

      {/* Bottom hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-6">
        {isResult && shouldHoldResults ? (
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-black/25 px-4 py-2 text-[15px] font-semibold text-white backdrop-blur-sm">
            <span>
              {fingers.length === 0
                ? `Results clear in ${holdSeconds}s`
                : "Tap refresh for a new round"}
            </span>
            <button
              type="button"
              data-ui
              aria-label="Refresh results and start a new round"
              title="Start a new round"
              onClick={() => {
                clear();
                resetRound();
              }}
              className="rounded-full p-2 transition hover:bg-white/15 active:scale-90"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        ) : isResult && settings.tapMode ? (
          <button
            type="button"
            data-ui
            onClick={clear}
            className="pointer-events-auto rounded-full bg-black/25 px-4 py-2 text-[15px] font-semibold text-white backdrop-blur-sm"
          >
            New round
          </button>
        ) : hint ? (
          <span
            key={hint}
            className={cn(
              "anim-fade-up rounded-full bg-black/20 px-4 py-2 text-[15px] font-semibold text-white backdrop-blur-sm",
              phase === "counting" && "anim-pulse-soft",
            )}
          >
            {hint}
          </span>
        ) : null}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Chooser settings">
        <ChooserOptions />
      </BottomSheet>
    </div>
  );
}
