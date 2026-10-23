import { APP_THEMES } from "./themes";

const ICON_COLORS: Record<string, string[]> = {
  salsa: ["#ff2757", "#e91e63"],
  mandarin: ["#ff9800", "#ff6d00"],
  spring: ["#ffd000", "#ffb300"],
  malachite: ["#2dd957", "#00a847"],
  aero: ["#087ff5", "#0055d4"],
  royal: ["#ad4bd1", "#7026b8"],
  space: ["#35435f", "#18243d"],
  burgundy: ["#4a0e24", "#c06c45"],
  solar: ["#ff2d55", "#ff9500"],
  sunkist: ["#ff9200", "#ffd000"],
  sherbert: ["#ffd600", "#15bd65"],
  mojito: ["#31c96b", "#087ff5"],
  magic: ["#087ff5", "#b04bd1"],
  cosmic: ["#a649d2", "#6850dc"],
  pride: ["#ff3c4c", "#9a4bd0"],
  quantum: ["#f50057", "#5500c9"],
  "liquid-cheese": ["#ffb400", "#ffd322"],
  monument: ["#51206b", "#100c18"],
  abstract: ["#22bdd0", "#067ff5"],
  mountains: ["#e58d78", "#101b38"],
};

export function getAppIconSvg(themeId: string) {
  const theme = APP_THEMES.find((item) => item.id === themeId) ?? APP_THEMES[0];
  const [start, end] = ICON_COLORS[theme.id] ?? ["#8f2d3f", "#4a0e24"];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0.85" y2="1">
        <stop offset="0" stop-color="${start}"/>
        <stop offset="1" stop-color="${end}"/>
      </linearGradient>
      <clipPath id="c"><rect x="8" y="8" width="176" height="176" rx="38"/></clipPath>
    </defs>
    <g clip-path="url(#c)">
      <rect width="192" height="192" fill="url(#g)"/>
      <path d="M96 42 154 146H38Z" fill="none" stroke="white" stroke-width="13" stroke-linejoin="round"/>
    </g>
  </svg>`;
}

export function getAppIconDataUrl(themeId: string) {
  return `data:image/svg+xml,${encodeURIComponent(getAppIconSvg(themeId))}`;
}

export function applyAppIcon(themeId: string) {
  const iconUrl = getAppIconDataUrl(themeId);
  const setLink = (rel: string, id: string, type?: string) => {
    let link = document.querySelector<HTMLLinkElement>(`link#${id}`);
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = rel;
      document.head.append(link);
    }
    if (type) link.type = type;
    return link;
  };
  setLink("icon", "selected-app-icon", "image/svg+xml").href = iconUrl;
  const appleTouchIcon = setLink("apple-touch-icon", "selected-apple-touch-icon");
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 192;
    canvas.height = 192;
    const context = canvas.getContext("2d");
    if (!context) {
      console.error("Unable to create the selected app icon for Apple devices.");
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    appleTouchIcon.href = canvas.toDataURL("image/png");
  };
  image.onerror = () => console.error("Unable to render the selected app icon.");
  image.src = iconUrl;

  const manifest = {
    name: "Chooser – Random Finger Selector",
    short_name: "Chooser",
    description: "Put your fingers on the screen and let luck decide who plays.",
    start_url: new URL("/", window.location.href).href,
    scope: new URL("/", window.location.href).href,
    display: "fullscreen",
    orientation: "portrait",
    background_color: "#FF2D55",
    theme_color: "#FF2D55",
    icons: [
      { src: iconUrl, sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
      { src: iconUrl, sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
    ],
  };
  const manifestUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }),
  );
  let manifestLink = document.querySelector<HTMLLinkElement>("link#selected-app-manifest");
  if (!manifestLink) {
    manifestLink = document.createElement("link");
    manifestLink.id = "selected-app-manifest";
    manifestLink.rel = "manifest";
    document.head.append(manifestLink);
  }
  manifestLink.type = "application/manifest+json";
  const oldManifestUrl = manifestLink.href;
  manifestLink.href = manifestUrl;
  if (oldManifestUrl.startsWith("blob:")) URL.revokeObjectURL(oldManifestUrl);
}
