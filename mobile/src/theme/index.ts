/**
 * Theme extracted from the web app's index.css and tailwind.config.ts
 * HSL values converted to RGB hex for React Native
 */

// Helper to convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const Colors = {
  light: {
    background: '#FFFFFF',           // 0 0% 100%
    foreground: '#232530',           // 240 10% 15%
    card: '#FFFFFF',                 // 0 0% 100%
    cardForeground: '#232530',       // 240 10% 15%
    primary: '#D98DA5',              // 340 65% 75%
    primaryForeground: '#232530',    // 240 10% 15%
    secondary: '#EEEAF5',           // 270 30% 95%
    secondaryForeground: '#232530',  // 240 10% 15%
    muted: '#F2F3F5',               // 220 20% 96%
    mutedForeground: '#6B6E78',     // 240 5% 45%
    accent: '#BDE8D4',              // 160 40% 85%
    accentForeground: '#232530',    // 240 10% 15%
    destructive: '#D94F4F',         // 0 65% 65%
    destructiveForeground: '#FFFFFF',
    border: '#E3E5EA',              // 220 15% 90%
    input: '#EFF0F3',               // 220 15% 95%
    ring: '#D98DA5',                // 340 65% 75%
    navActive: '#D47A96',           // 340 65% 70%
    navMuted: '#7D808A',            // 240 5% 55%
    shadow: 'rgba(35, 37, 48, 0.08)',
    shadowLg: 'rgba(35, 37, 48, 0.12)',
  },
  dark: {
    background: '#0F0F12',           // 240 10% 6%
    foreground: '#F5F0E8',           // 40 20% 95%
    card: '#16161B',                 // 240 10% 9%
    cardForeground: '#F5F0E8',       // 40 20% 95%
    primary: '#C76B7E',              // 350 50% 65%
    primaryForeground: '#0F0F12',    // 240 10% 6%
    secondary: '#222228',           // 240 8% 15%
    secondaryForeground: '#F5F0E8',  // 40 20% 95%
    muted: '#26262E',               // 240 8% 18%
    mutedForeground: '#8A8478',     // 40 10% 55%
    accent: '#C9962E',              // 42 65% 55%
    accentForeground: '#0F0F12',    // 240 10% 6%
    destructive: '#C0392B',         // 0 62% 50%
    destructiveForeground: '#F5F0E8',
    border: '#26262E',              // 240 8% 18%
    input: '#26262E',               // 240 8% 18%
    ring: '#C76B7E',                // 350 50% 65%
    navActive: '#C76B7E',           // 350 50% 65%
    navMuted: '#8A7D6E',            // 40 10% 50%
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowLg: 'rgba(0, 0, 0, 0.4)',
  },
};

export const Typography = {
  fontFamily: {
    display: 'System', // System font - Inter would need expo-font
    body: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

export const BorderRadius = {
  sm: 8,
  md: 10,
  lg: 12,    // 0.75rem from web
  xl: 16,
  '2xl': 20,
  full: 9999,
};

export const Shadows = {
  elegant: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  elegantLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};

export type ThemeColors = typeof Colors.light;
