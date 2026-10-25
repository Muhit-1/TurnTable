import type { ReactNode, SVGProps } from 'react';

/** Small line icons (24x24, stroke follows the text colour) so the UI never depends on emoji fonts. */
function Icon({ children, ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const IconMenu = (p: P) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);
export const IconHelp = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" />
  </Icon>
);
export const IconUndo = (p: P) => (
  <Icon {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Icon>
);
export const IconRedo = (p: P) => (
  <Icon {...p}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </Icon>
);
export const IconRestart = (p: P) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);
export const IconVolume = (p: P) => (
  <Icon {...p}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="M16 9a5 5 0 0 1 0 6M19 6a9 9 0 0 1 0 12" />
  </Icon>
);
export const IconVolumeOff = (p: P) => (
  <Icon {...p}>
    <path d="M11 5 6 9H3v6h3l5 4z" />
    <path d="m22 9-6 6M16 9l6 6" />
  </Icon>
);
export const IconHome = (p: P) => (
  <Icon {...p}>
    <path d="M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10" />
  </Icon>
);
export const IconClose = (p: P) => (
  <Icon {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);
export const IconTrophy = (p: P) => (
  <Icon {...p}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 15v2c0 1-1 2-3 5M14 15v2c0 1 1 2 3 5M18 2H6v7a6 6 0 0 0 12 0z" />
  </Icon>
);
export const IconEqual = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 10h8M8 14h8" />
  </Icon>
);
export const IconPlay = (p: P) => (
  <Icon {...p}>
    <path d="M7 4v16l13-8z" fill="currentColor" />
  </Icon>
);
export const IconDice = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" strokeWidth="3" />
  </Icon>
);
