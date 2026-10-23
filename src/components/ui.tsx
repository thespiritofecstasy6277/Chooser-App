import { ChevronLeft, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { feedback } from "../utils/feedback";
import { useSettings } from "../context/SettingsContext";
import { APP_THEMES } from "../utils/themes";

/* ---------------- Toggle ---------------- */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-ui
      onClick={() => {
        onChange(!checked);
        feedback.tap();
      }}
      className={cn(
        "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-[#34C759]" : "bg-black/20",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-md transition-transform duration-200",
          checked && "translate-x-[20px]",
        )}
      />
    </button>
  );
}

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      data-ui
      className={cn("flex rounded-xl bg-black/15 p-1", className)}
      role="radiogroup"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (!active) {
                onChange(o.value);
                feedback.tap();
              }
            }}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-[15px] font-semibold transition-all",
              active ? "bg-white text-ink shadow" : "text-white/90 hover:bg-white/10",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "block w-full rounded-[26px] bg-white/30 text-left backdrop-blur-[2px]",
        onClick && "transition-transform active:scale-[0.98]",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

export function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <div className="text-[17px] font-medium text-label">{label}</div>
        {hint && <div className="mt-0.5 text-[13px] text-label/70">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Screen header ---------------- */
export function ScreenHeader({
  title,
  onBack,
  backLabel = "Back",
  right,
  className,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 pt-[calc(var(--sat)+22px)] pb-4", className)}>
      {onBack && (
        <button
          type="button"
          data-ui
          onClick={onBack}
          className="relative z-30 -ml-2 mb-1 flex items-center gap-0.5 rounded-full py-1 pr-3 pl-1 text-[17px] font-medium text-white/95 active:bg-white/15"
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
          {backLabel}
        </button>
      )}
      <div className="flex items-end justify-between">
        <h1 className="text-[34px] leading-tight font-bold tracking-tight text-white">
          {title}
        </h1>
        {right}
      </div>
    </div>
  );
}

/* ---------------- Bottom sheet ---------------- */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { settings } = useSettings();
  const theme = APP_THEMES.find((item) => item.id === settings.theme) ?? APP_THEMES[0];
  const background =
    settings.theme === "custom" && settings.customThemeImage
      ? `linear-gradient(rgba(20, 5, 9, .2), rgba(20, 5, 9, .2)), url("${settings.customThemeImage}") center / cover no-repeat`
      : theme.background;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50" data-ui>
      <button
        type="button"
        aria-label="Close"
        className="anim-fade-in absolute inset-0 bg-black/35"
        onClick={onClose}
      />
      <div
        className="anim-sheet-up absolute inset-x-0 bottom-0 rounded-t-[28px] px-5 pt-3 pb-[calc(var(--sab)+20px)] shadow-2xl"
        style={{ background }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/50" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-white"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Primary button ---------------- */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-ui
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full bg-white px-8 py-3.5 text-[17px] font-bold text-ink shadow-lg shadow-black/10 transition-transform active:scale-95 disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
