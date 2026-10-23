import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { DARE_TOPICS } from "../utils/darePrompts";
import { cn } from "../utils/cn";
import { feedback } from "../utils/feedback";

export function DareTopicDropdown() {
  const { settings, update } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" data-ui>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          feedback.tap();
        }}
        className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm"
      >
        <span>Topics: {settings.dareTopic}</span>
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close topics menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="Truth or Dare topics"
            className="anim-pop-in absolute top-full left-1/2 z-50 mt-2 max-h-[55vh] w-[min(86vw,330px)] -translate-x-1/2 overflow-y-auto rounded-3xl bg-[#4a231f]/95 p-2 text-white shadow-2xl backdrop-blur-xl"
          >
            {DARE_TOPICS.map((topic) => {
              const selected = settings.dareTopic === topic;
              return (
                <button
                  key={topic}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    update("dareTopic", topic);
                    setOpen(false);
                    feedback.tap();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between border-b border-white/15 px-3 py-3 text-left text-[15px] last:border-b-0",
                    selected && "font-semibold",
                  )}
                >
                  <span>{topic}</span>
                  {selected && <Check size={20} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
