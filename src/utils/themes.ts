export type ThemeCategory = "Monocolor" | "Gradients" | "Patterns";

export interface AppTheme {
  id: string;
  name: string;
  category: ThemeCategory;
  background: string;
}

export const APP_THEMES: AppTheme[] = [
  { id: "salsa", name: "Salsa", category: "Monocolor", background: "#ff2757" },
  { id: "mandarin", name: "Mandarin", category: "Monocolor", background: "#ff9800" },
  { id: "spring", name: "Spring", category: "Monocolor", background: "#ffd000" },
  { id: "malachite", name: "Malachite", category: "Monocolor", background: "#2dd957" },
  { id: "aero", name: "Aero", category: "Monocolor", background: "#087ff5" },
  { id: "royal", name: "Royal", category: "Monocolor", background: "#ad4bd1" },
  { id: "space", name: "Space", category: "Monocolor", background: "#35435f" },
  {
    id: "burgundy",
    name: "Burgundy",
    category: "Gradients",
    background: "linear-gradient(160deg, #4a0e24 0%, #8f2d3f 55%, #c06c45 100%)",
  },
  {
    id: "solar",
    name: "Solar",
    category: "Gradients",
    background: "linear-gradient(180deg, #ff2d55 0%, #ff6e38 58%, #ff9500 100%)",
  },
  {
    id: "sunkist",
    name: "Sunkist",
    category: "Gradients",
    background: "linear-gradient(180deg, #ff9200 0%, #ffd000 100%)",
  },
  {
    id: "sherbert",
    name: "Sherbert",
    category: "Gradients",
    background: "linear-gradient(180deg, #ffd600 0%, #65d54f 56%, #15bd65 100%)",
  },
  {
    id: "mojito",
    name: "Mojito",
    category: "Gradients",
    background: "linear-gradient(180deg, #31c96b 0%, #06aeb9 52%, #087ff5 100%)",
  },
  {
    id: "magic",
    name: "Magic",
    category: "Gradients",
    background: "linear-gradient(180deg, #087ff5 0%, #6952e8 55%, #b04bd1 100%)",
  },
  {
    id: "cosmic",
    name: "Cosmic",
    category: "Gradients",
    background: "linear-gradient(180deg, #a649d2 0%, #6850dc 100%)",
  },
  {
    id: "pride",
    name: "Pride",
    category: "Gradients",
    background:
      "linear-gradient(180deg, #ff3c4c 0%, #ff9d00 20%, #ffe500 38%, #35cb60 57%, #087ff5 76%, #9a4bd0 100%)",
  },
  {
    id: "quantum",
    name: "Quantum",
    category: "Patterns",
    background:
      "repeating-linear-gradient(90deg, #f50057 0 16%, #c400cf 16% 32%, #5500c9 32% 48%)",
  },
  {
    id: "liquid-cheese",
    name: "Liquid Cheese",
    category: "Patterns",
    background:
      "radial-gradient(ellipse at 80% 15%, #ffdc20 0 20%, transparent 21%), repeating-linear-gradient(165deg, #ffb400 0 34px, #ffd322 35px 72px)",
  },
  {
    id: "monument",
    name: "Monument",
    category: "Patterns",
    background:
      "repeating-conic-gradient(from 45deg at 50% 100%, #260833 0deg 18deg, #51206b 19deg 36deg)",
  },
  {
    id: "abstract",
    name: "Abstract",
    category: "Patterns",
    background:
      "conic-gradient(from 45deg at 50% 52%, #22bdd0 0deg 90deg, #067ff5 90deg 180deg, #0aa8df 180deg 270deg, #159acb 270deg 360deg)",
  },
  {
    id: "mountains",
    name: "Mountains",
    category: "Patterns",
    background:
      "repeating-linear-gradient(175deg, transparent 0 34px, #19294c55 35px 58px), linear-gradient(180deg, #e58d78 0%, #794e7b 48%, #101b38 100%)",
  },
];

export const DEFAULT_THEME = "burgundy";

export function isThemeId(value: unknown): value is string {
  return (
    value === "custom" ||
    (typeof value === "string" && APP_THEMES.some((theme) => theme.id === value))
  );
}

export const RING_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#e84b52" },
  { name: "Blue", value: "#398fdf" },
  { name: "Green", value: "#47a34d" },
  { name: "Yellow", value: "#f6c91d" },
  { name: "Purple", value: "#9229a9" },
  { name: "Orange", value: "#ff9200" },
  { name: "Teal", value: "#08aeb7" },
  { name: "Pink", value: "#e83b83" },
] as const;

export const FINGER_EMOJIS = [
  { name: "None", value: "" },
  { name: "Cool", value: "😎" },
  { name: "Fire", value: "🔥" },
  { name: "Star", value: "⭐" },
  { name: "Target", value: "🎯" },
  { name: "Crown", value: "👑" },
  { name: "Spark", value: "💥" },
  { name: "Clover", value: "🍀" },
  { name: "Party", value: "🎉" },
  { name: "Rocket", value: "🚀" },
  { name: "Heart", value: "❤️" },
  { name: "Call me", value: "🤙" },
  { name: "Laugh", value: "😂" },
] as const;
