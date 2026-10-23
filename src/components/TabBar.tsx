import { cn } from "../utils/cn";
import { feedback } from "../utils/feedback";
import { IconChooser, IconGames, IconRoulette, IconSettings } from "./Icons";

export type Tab = "chooser" | "roulette" | "games" | "settings";

const TABS: { id: Tab; label: string; Icon: typeof IconChooser }[] = [
  { id: "chooser", label: "Chooser", Icon: IconChooser },
  { id: "roulette", label: "Roulette", Icon: IconRoulette },
  { id: "games", label: "Games", Icon: IconGames },
  { id: "settings", label: "Settings", Icon: IconSettings },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      data-ui
      className="relative z-30 shrink-0 border-t border-white/15 bg-white/10 pt-2 pb-[max(var(--sab),14px)] backdrop-blur-md"
    >
      <ul className="flex items-stretch justify-around px-2">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => {
                  if (!isActive) {
                    onChange(id);
                    feedback.tap();
                  }
                }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "mx-auto flex w-full max-w-[96px] flex-col items-center gap-1 rounded-xl py-1 transition-colors",
                  isActive ? "text-white" : "text-white/65",
                )}
              >
                <Icon size={28} strokeWidth={isActive ? 2.4 : 2} />
                <span className="text-[12px] font-semibold">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
