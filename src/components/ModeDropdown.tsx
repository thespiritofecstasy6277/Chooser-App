import { Check, ChevronDown, ListOrdered, Users } from "lucide-react";
import { useState } from "react";
import { MODE_INFO, useSettings, type ChooserMode } from "../context/SettingsContext";
import { cn } from "../utils/cn";
import { feedback } from "../utils/feedback";
import { IconDicePair } from "./Icons";

const ORDER: ChooserMode[] = ["all", "teams", "order"];

function ModeIcon({ mode, size = 22 }: { mode: ChooserMode; size?: number }) {
  if (mode === "teams") return <Users size={size} strokeWidth={2.2} />;
  if (mode === "order") return <ListOrdered size={size} strokeWidth={2.2} />;
  return <IconDicePair size={size} />;
}

export function ModeDropdown({ disabled }: { disabled?: boolean }) {
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);

  const pillLabel =
    settings.mode === "all" && settings.winners > 1
      ? `Pick ${settings.winners}`
      : settings.mode === "teams"
        ? `${settings.teams} Teams`
        : MODE_INFO[settings.mode].label;

  return (
    <div className="relative" data-ui>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          feedback.tap();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-full bg-white/25 py-3 pr-5 pl-4 text-white shadow-sm backdrop-blur-sm transition-all active:scale-95",
          disabled && "opacity-40",
        )}
      >
        <ModeIcon mode={settings.mode} size={24} />
        <span className="text-[19px] font-semibold">{pillLabel}</span>
        <ChevronDown
          size={20}
          strokeWidth={2.6}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="anim-pop-in absolute top-full left-1/2 z-50 mt-2 w-[290px] -translate-x-1/2 origin-top overflow-hidden rounded-3xl bg-white/95 p-1.5 text-label shadow-2xl shadow-black/25 backdrop-blur-xl"
          >
            {ORDER.map((mode) => {
              const active = settings.mode === mode;
              const info = MODE_INFO[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    update("mode", mode);
                    setOpen(false);
                    feedback.tap();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    active ? "bg-[#ff6a3d]/15" : "active:bg-black/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      active ? "bg-[#ff6a3d] text-white" : "bg-black/5 text-label",
                    )}
                  >
                    <ModeIcon mode={mode} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold">{info.title}</span>
                    <span className="block text-[13px] leading-snug text-label/65">
                      {info.description}
                    </span>
                  </span>
                  {active && <Check size={20} strokeWidth={3} className="text-[#ff6a3d]" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
