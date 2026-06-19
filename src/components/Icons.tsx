/**
 * Inline SVG icons — 24×24, currentColor stroke, 1.6 weight to sit with Saira's
 * technical-but-friendly tone. Kept deliberately spare (line, not filled) so the
 * amber/teal accents do the talking, not the glyphs.
 */
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Antenna radiating — "nodes" / stations. */
export function IconNodes(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 13v8" />
      <circle cx="12" cy="11" r="1.5" />
      <path d="M8.5 7.5a5 5 0 0 0 0 7" />
      <path d="M15.5 7.5a5 5 0 0 1 0 7" />
      <path d="M6 5a8 8 0 0 0 0 12" />
      <path d="M18 5a8 8 0 0 1 0 12" />
    </Svg>
  );
}

/** Speech lines — messages (disabled in P0). */
export function IconMessages(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M8 9h8M8 12h5" />
    </Svg>
  );
}

/** Sliders — settings. */
export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="8" cy="17" r="2.2" />
    </Svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** Concentric scan rings — LAN discovery. */
export function IconScan(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="1.5" />
      <path d="M8.8 8.8a4.5 4.5 0 0 0 0 6.4M15.2 8.8a4.5 4.5 0 0 1 0 6.4" />
      <path d="M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12" />
    </Svg>
  );
}

/** Key — reserved for the deferred passkey login path (not yet wired). */
export function IconKey(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="8" cy="8" r="3.5" />
      <path d="M10.5 10.5L20 20M16 16l2-2M18 18l2-2" />
    </Svg>
  );
}
