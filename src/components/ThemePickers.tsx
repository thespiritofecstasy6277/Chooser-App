import { Check, ImagePlus } from "lucide-react";
import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { APP_THEMES, FINGER_EMOJIS, RING_COLORS } from "../utils/themes";

function ThemePickerContent() {
  const { settings, update } = useSettings();
  const imageInput = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const categories = [...new Set(APP_THEMES.map((theme) => theme.category))];

  return (
    <div className="space-y-5 py-1">
      <div className="px-5">
        <button
          type="button"
          onClick={() => imageInput.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4059] to-[#ff9200] px-4 py-3 font-semibold text-white"
        >
          <ImagePlus size={20} />
          Add Image from Library
        </button>
        <input
          ref={imageInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          aria-label="Choose a background image"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
              setImageError("Choose a PNG, JPEG, WebP, or GIF image.");
              return;
            }
            if (file.size > 512_000) {
              setImageError("Choose an image smaller than 500 KB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result !== "string" || reader.result.length > 750_000) {
                setImageError("This image could not be saved. Choose a smaller image.");
                return;
              }
              setImageError(null);
              update("customThemeImage", reader.result);
              update("theme", "custom");
            };
            reader.onerror = () => {
              console.error("Unable to read the selected theme image.", reader.error);
              setImageError("Unable to read this image.");
            };
            reader.readAsDataURL(file);
          }}
        />
        {imageError && <p className="mt-2 text-sm text-red-900">{imageError}</p>}
      </div>
      {categories.map((category) => (
        <section key={category}>
          <h4 className="mb-2 px-5 text-[15px] font-medium text-white/65">{category}</h4>
          <div className="scroll-x flex gap-3 overflow-x-auto px-5 pb-1">
            {APP_THEMES.filter((theme) => theme.category === category).map((theme) => {
              const selected = settings.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${theme.name} theme${selected ? ", selected" : ""}`}
                  onClick={() => update("theme", theme.id)}
                  className="relative h-[min(42vw,248px)] w-[min(32vw,186px)] shrink-0 overflow-hidden rounded-2xl text-left text-white shadow-md transition-transform active:scale-[0.97]"
                  style={{ background: theme.background }}
                >
                  <span className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/10" />
                  <span className="relative block p-3 text-[15px] font-bold leading-tight drop-shadow">
                    {theme.name}
                  </span>
                  {selected && (
                    <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#e77720] shadow">
                      <Check size={20} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {settings.customThemeImage && (
        <section>
          <h4 className="mb-2 px-5 text-[15px] font-medium text-white/65">Custom</h4>
          <div className="px-5">
            <button
              type="button"
              role="radio"
              aria-checked={settings.theme === "custom"}
              aria-label={`Custom image theme${settings.theme === "custom" ? ", selected" : ""}`}
              onClick={() => update("theme", "custom")}
              className={`relative h-[min(42vw,248px)] w-[min(32vw,186px)] overflow-hidden rounded-2xl bg-cover bg-center text-left text-white shadow-md ${
                settings.theme === "custom" ? "ring-2 ring-white" : ""
              }`}
              style={{ backgroundImage: `url("${settings.customThemeImage}")` }}
            >
              <span className="absolute top-0 left-0 bg-black/30 p-3 text-[15px] font-bold">
                My Image
              </span>
              {settings.theme === "custom" && (
                <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#e77720] shadow">
                  <Check size={20} strokeWidth={3} />
                </span>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function FingerThemePickerContent() {
  const { settings, update } = useSettings();

  return (
    <div className="space-y-5 p-2">
      <div>
        <h3 className="text-[17px] font-semibold text-white">Ring color</h3>
        <div className="mt-4 grid grid-cols-5 gap-x-3 gap-y-4" role="radiogroup" aria-label="Ring color">
          {RING_COLORS.map((color) => {
            const selected = settings.ringColor === color.value;
            return (
              <button
                key={color.value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${color.name} ring${selected ? ", selected" : ""}`}
                onClick={() => update("ringColor", color.value)}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 transition-transform active:scale-90"
                style={{
                  backgroundColor: color.value,
                  borderColor: selected ? "#ff8a1c" : "transparent",
                  boxShadow: selected ? "0 0 0 2px rgba(255,255,255,.75)" : undefined,
                }}
              >
                {selected && <Check size={19} className="text-white drop-shadow" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h4 className="text-[17px] font-semibold text-white">Emoji</h4>
        <div
          className="mt-2 grid grid-cols-5 gap-2"
          role="radiogroup"
          aria-label="Finger emoji"
        >
          {FINGER_EMOJIS.map((emoji) => {
            const selected = settings.fingerEmoji === emoji.value;
            return (
              <button
                key={emoji.name}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${emoji.name} finger theme${selected ? ", selected" : ""}`}
                onClick={() => update("fingerEmoji", emoji.value)}
                className={`flex h-12 items-center justify-center rounded-xl text-[25px] ${
                  selected ? "bg-[#ff8a1c]/25 ring-2 ring-[#ff8a1c]" : "bg-black/5"
                }`}
              >
                {emoji.value || <span className="text-[21px] text-label/55">⊘</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ThemeSettingsPanel({
  type,
  onClose,
}: {
  type: "themes" | "finger";
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  const title = type === "themes" ? "Themes" : "Finger theme";
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55" data-ui>
      <section
        aria-label={title}
        className="flex max-h-[94dvh] w-full max-w-[520px] flex-col rounded-t-[28px] bg-[#1d1d1f] text-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <span className="w-14" />
          <h2 className="text-[19px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-14 text-right text-[16px] font-semibold text-[#ff8a1c]"
          >
            Done
          </button>
        </header>
        <div className="scroll-y overscroll-contain px-4 py-4">
          {type === "themes" ? <ThemePickerContent /> : <FingerThemePickerContent />}
        </div>
      </section>
    </div>,
    document.body,
  );
}
