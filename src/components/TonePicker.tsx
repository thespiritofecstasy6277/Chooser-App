import { Check, Play } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { cn } from "../utils/cn";
import { TONES, previewTone } from "../utils/feedback";

export function TonePicker() {
  const { settings, update } = useSettings();
  const current = TONES.find((t) => t.id === settings.tone) ?? TONES[0];

  const select = (id: (typeof TONES)[number]["id"]) => {
    update("tone", id);
    previewTone(id);
  };

  return (
    <div className="px-4 pt-4 pb-3">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="text-[17px] font-semibold text-label">Sound tone</div>
          <div className="text-[13px] text-label/70">
            {current.emoji} {current.name} · {current.description}
          </div>
        </div>
        <button
          type="button"
          onClick={() => previewTone(settings.tone)}
          className="flex items-center gap-1.5 rounded-full bg-white/55 px-3 py-1.5 text-[13px] font-bold text-label active:scale-95"
        >
          <Play size={13} strokeWidth={3} className="fill-current" />
          Preview
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {TONES.map((t) => {
          const active = t.id === settings.tone;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => select(t.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.97]",
                active
                  ? "bg-white text-label shadow-sm"
                  : "bg-white/25 text-label hover:bg-white/35",
              )}
            >
              <span className="text-[20px] leading-none">{t.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-tight font-semibold">{t.name}</span>
                <span className="block truncate text-[11px] leading-tight text-label/65">
                  {t.description}
                </span>
              </span>
              {active && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#34C759] text-white">
                  <Check size={13} strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[11px] text-label/60">
        Tap a tone to hear it · coin toss sound stays the same
      </p>
    </div>
  );
}
