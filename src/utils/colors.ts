/** Vibrant ring colors that pop against the pink → orange gradient. */
export const PALETTE = [
  "#FFFFFF",
  "#FFE14D",
  "#4DE1FF",
  "#9DFF57",
  "#D08CFF",
  "#FF8FD0",
  "#6FA2FF",
  "#5CF5CF",
  "#FFB36B",
  "#B8FF9A",
];

export const TEAM_COLORS = ["#4DE1FF", "#FFE14D", "#9DFF57", "#D08CFF"];

export const WHEEL_COLORS = [
  "#FF5E7E",
  "#FFB347",
  "#FFE14D",
  "#7ED957",
  "#4DD4FF",
  "#8C7BFF",
  "#FF7BC6",
  "#5CF5CF",
  "#FF8A5B",
  "#B8FF9A",
  "#6FA2FF",
  "#FFD1DC",
];

export function hexWithAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
