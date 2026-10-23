import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { configureFeedback, isToneId, type ToneId } from "../utils/feedback";
import {
  APP_THEMES,
  DEFAULT_THEME,
  FINGER_EMOJIS,
  isThemeId,
  RING_COLORS,
} from "../utils/themes";
import { DARE_TOPICS, type DareTopic } from "../utils/darePrompts";

export type ChooserMode = "all" | "teams" | "order";

export interface Settings {
  mode: ChooserMode;
  /** Countdown in seconds before a choice is made. */
  countdown: 2 | 3 | 5;
  /** How many winners to keep in "All" mode. */
  winners: number;
  /** How many teams to split into in "Teams" mode. */
  teams: 2 | 3 | 4;
  vibration: boolean;
  sound: boolean;
  /** Selected audio tone pack. */
  tone: ToneId;
  rankWinners: boolean;
  homogeneousTeams: boolean;
  takeDare: boolean;
  truthOrDare: boolean;
  adultPrompts: boolean;
  dareTopic: DareTopic;
  tapMode: boolean;
  cheatMode: boolean;
  notifications: boolean;
  appIcon: string;
  theme: string;
  customThemeImage: string | null;
  ringColor: string;
  fingerEmoji: string;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "all",
  countdown: 3,
  winners: 1,
  teams: 2,
  vibration: true,
  sound: true,
  tone: "classic",
  rankWinners: false,
  homogeneousTeams: false,
  takeDare: false,
  truthOrDare: false,
  adultPrompts: false,
  dareTopic: "All",
  tapMode: false,
  cheatMode: false,
  notifications: false,
  appIcon: "mountains",
  theme: DEFAULT_THEME,
  customThemeImage: null,
  ringColor: "#ffffff",
  fingerEmoji: "",
};

const STORAGE_KEY = "chooser.settings.v1";

interface SettingsContextValue {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const savedWinners = parsed.winners;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      winners:
        typeof savedWinners === "number" && Number.isInteger(savedWinners)
          ? Math.max(1, Math.min(12, savedWinners))
          : DEFAULT_SETTINGS.winners,
      teams: parsed.teams === 3 || parsed.teams === 4 ? parsed.teams : 2,
      tone: isToneId(parsed.tone) ? parsed.tone : DEFAULT_SETTINGS.tone,
      appIcon:
        typeof parsed.appIcon === "string" &&
        APP_THEMES.some((theme) => theme.id === parsed.appIcon)
          ? parsed.appIcon
          : DEFAULT_SETTINGS.appIcon,
      theme: isThemeId(parsed.theme) ? parsed.theme : DEFAULT_SETTINGS.theme,
      customThemeImage:
        typeof parsed.customThemeImage === "string" &&
        parsed.customThemeImage.startsWith("data:image/") &&
        parsed.customThemeImage.length <= 750_000
          ? parsed.customThemeImage
          : null,
      ringColor:
        RING_COLORS.find((color) => color.value === parsed.ringColor)?.value ??
        DEFAULT_SETTINGS.ringColor,
      fingerEmoji:
        FINGER_EMOJIS.find((emoji) => emoji.value === parsed.fingerEmoji)?.value ??
        DEFAULT_SETTINGS.fingerEmoji,
      adultPrompts: parsed.adultPrompts === true,
      dareTopic: DARE_TOPICS.find((topic) => topic === parsed.dareTopic) ?? DEFAULT_SETTINGS.dareTopic,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    configureFeedback({
      vibration: settings.vibration,
      sound: settings.sound,
      tone: settings.tone,
    });
  }, [settings]);

  const update = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) =>
      setSettings((s) => ({ ...s, [key]: value })),
    [],
  );
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}

export const MODE_INFO: Record<
  ChooserMode,
  { label: string; title: string; description: string }
> = {
  all: {
    label: "All",
    title: "All",
    description: "Everyone joins – one lucky finger is chosen",
  },
  teams: {
    label: "Teams",
    title: "Teams",
    description: "Split all fingers randomly into teams",
  },
  order: {
    label: "Order",
    title: "Order",
    description: "Give everyone a random turn order",
  },
};
