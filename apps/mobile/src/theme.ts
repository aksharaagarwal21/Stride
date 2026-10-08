import type { TextStyle } from 'react-native';

// Same tokens as the web app (apps/web/src/index.css), adapted to React Native.
export const colors = {
  canvas: '#F6F7F9',
  surface: '#FFFFFF',
  subtle: '#F0F2F6',
  ink: '#172033',
  ink2: '#556176',
  ink3: '#6B7588',
  line: '#E2E6EE',
  lineStrong: '#CDD3DE',
  primary: '#3659E3',
  primaryStrong: '#2340B0',
  primarySoft: '#EEF2FD',
  success: '#15803D',
  successSoft: '#E9F6ED',
  warning: '#B45309',
  warningSoft: '#FDF3E6',
  danger: '#B91C1C',
  dangerSoft: '#FDECEC',
  neutralSoft: '#EEF0F4',
  pendingBar: '#8590A2',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { control: 10, card: 12, pill: 999 } as const;

// One system font family (Roboto on Android) keeps the native build simple; weight carries hierarchy.
export const type = {
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', color: colors.ink },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', color: colors.ink },
  subheading: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.ink },
  body: { fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyMuted: { fontSize: 14, lineHeight: 20, color: colors.ink2 },
  small: { fontSize: 13, lineHeight: 18, color: colors.ink2 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.ink },
  metric: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export const shadow = {
  card: {
    shadowColor: '#172033',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
} as const;

/** Minimum touch target (dp). */
export const TOUCH = 44;
