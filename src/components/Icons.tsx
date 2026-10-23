import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): Partial<SVGProps<SVGSVGElement>> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

/** Hand tapping with ripple rings around the fingertip. */
export function IconChooser({ size = 28, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4.2 7.2a5 5 0 0 1 1.3-3.6" />
      <path d="M13.8 7.2a5 5 0 0 0-1.3-3.6" />
      <path d="M9 13.5V5.6a1.6 1.6 0 0 1 3.2 0V12" />
      <path d="M12.2 11.6a1.6 1.6 0 0 1 3.2 0v1.2" />
      <path d="M15.4 12.6a1.6 1.6 0 0 1 3.2 0V15a7 7 0 0 1-7 7h-1.3c-2.2 0-3.6-.7-4.9-2L3 17.6a1.7 1.7 0 0 1 2.4-2.4L9 17.5" />
    </svg>
  );
}

/** Roulette wheel – circle with spokes and a hub. */
export function IconRoulette({ size = 28, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M12 2.5v7.3M12 14.2v7.3M2.5 12h7.3M14.2 12h7.3" />
      <path d="M5.3 5.3l5.1 5.1M13.6 13.6l5.1 5.1M18.7 5.3l-5.1 5.1M10.4 13.6l-5.1 5.1" />
    </svg>
  );
}

/** Game controller symbols: circle, triangle, cross, square. */
export function IconGames({ size = 28, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="7" cy="7" r="4" />
      <path d="M17 3.2l4.3 7.3h-8.6L17 3.2z" />
      <path d="M4.2 14.2l5.6 5.6M9.8 14.2l-5.6 5.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
    </svg>
  );
}

/** Solid gear. */
export function IconSettings({ size = 28, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Two small dice (used in the mode pill). */
export function IconDicePair({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.8} {...rest}>
      <rect x="2.5" y="2.5" width="10" height="10" rx="2.2" />
      <circle cx="5.6" cy="5.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9.4" cy="9.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9.4" cy="5.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="5.6" cy="9.4" r="0.9" fill="currentColor" stroke="none" />
      <rect
        x="11.5"
        y="11.5"
        width="10"
        height="10"
        rx="2.2"
        transform="rotate(12 16.5 16.5)"
      />
      <circle cx="16.5" cy="16.5" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="13.9" cy="14.4" r="0.85" fill="currentColor" stroke="none" />
      <circle cx="19.1" cy="18.6" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Vibration icon – dot with waves on both sides. */
export function IconVibrate({ size = 28, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M5.3 5.3a9.5 9.5 0 0 0 0 13.4" />
      <path d="M18.7 5.3a9.5 9.5 0 0 1 0 13.4" />
    </svg>
  );
}
