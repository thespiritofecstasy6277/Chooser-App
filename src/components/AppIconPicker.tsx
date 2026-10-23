import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import { APP_THEMES } from "../utils/themes";
import { getAppIconDataUrl } from "../utils/appIcon";
import { feedback } from "../utils/feedback";

const ICON_ORDER = [
  "solar",
  "mountains",
  "sunkist",
  "liquid-cheese",
  "sherbert",
  "monument",
  "mojito",
  "abstract",
  "magic",
  "quantum",
  "cosmic",
  "pride",
  "space",
  "royal",
  "aero",
  "malachite",
  "spring",
  "mandarin",
  "salsa",
  "burgundy",
];

export function AppIconPicker({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  const iconThemes = ICON_ORDER.flatMap((id) => {
    const theme = APP_THEMES.find((item) => item.id === id);
    return theme ? [theme] : [];
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-icon-picker-title"
        className="flex max-h-[90dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl bg-[#202023] text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <span className="w-14" aria-hidden="true" />
          <h2 id="app-icon-picker-title" className="text-[18px] font-semibold">
            App Icon
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex w-14 items-center justify-end gap-1 text-[#ff941f]"
            aria-label="Close app icon picker"
          >
            <span>Close</span>
            <X size={17} className="sm:hidden" />
          </button>
        </header>

        <div className="scroll-y flex-1 px-4 py-3">
          <div className="overflow-hidden rounded-2xl bg-[#2b2b2e]">
            {iconThemes.map((theme) => {
              const selected = settings.appIcon === theme.id;
              const name = theme.id === "liquid-cheese" ? "LiquidCheese" : theme.name;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${name}${selected ? ", selected" : ""}`}
                  onClick={() => {
                    update("appIcon", theme.id);
                    feedback.tap();
                  }}
                  className="flex min-h-[76px] w-full items-center gap-4 border-b border-white/[0.06] px-4 py-3 text-left last:border-b-0 active:bg-white/5"
                >
                  <img
                    src={getAppIconDataUrl(theme.id)}
                    alt=""
                    className="h-[54px] w-[54px] rounded-[15px] shadow-md"
                  />
                  <span className="flex-1 text-[17px]">{name}</span>
                  {selected && <Check size={28} strokeWidth={3} className="text-[#ff941f]" />}
                </button>
              );
            })}
          </div>
          <p className="px-2 py-3 text-xs leading-relaxed text-white/60">
            If Chooser is already installed, your device may require removing and reinstalling
            its home-screen shortcut before the new icon appears.
          </p>
        </div>
      </section>
    </div>
  );
}
