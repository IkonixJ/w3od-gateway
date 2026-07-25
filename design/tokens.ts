// W3OD Gateway — Central Design System Tokens
// Single source of truth for all visual decisions.

// ─── PALETTE ────────────────────────────────────────────────────────────────

export const Palette = {
  // Neon primaries
  neonCyan: '#00F0FF',
  neonCyanDim: 'rgba(0,240,255,0.7)',
  neonCyanSubtle: 'rgba(0,240,255,0.15)',
  neonCyanBorder: 'rgba(0,240,255,0.3)',
  neonCyanGlow: 'rgba(0,240,255,0.25)',

  electricBlue: '#1E90FF',
  electricBlueDim: 'rgba(30,144,255,0.7)',
  electricBlueSubtle: 'rgba(30,144,255,0.12)',
  electricBlueBorder: 'rgba(30,144,255,0.3)',

  neonMagenta: '#FF00E5',
  neonMagentaDim: 'rgba(255,0,229,0.7)',
  neonMagentaSubtle: 'rgba(255,0,229,0.12)',
  neonMagentaBorder: 'rgba(255,0,229,0.3)',

  purpleGlow: '#8A2BE2',
  purpleGlowDim: 'rgba(138,43,226,0.6)',
  purpleGlowSubtle: 'rgba(138,43,226,0.12)',
  purpleGlowBorder: 'rgba(138,43,226,0.3)',

  neonLime: '#B6FF00',
  neonAmber: '#FFB800',
  neonRose: '#FF2D6F',
  neonGreen: '#00FF9C',

  // Dark surfaces
  bg950: '#05060A',
  bg900: '#080A10',
  bg850: '#0B0D16',
  bg800: '#0F1119',
  bg750: '#141721',
  bg700: '#1A1E2B',
  bg600: '#222636',
  bg500: '#2D3344',

  // Overlay surfaces (with alpha for glassmorphism)
  glass100: 'rgba(255,255,255,0.03)',
  glass200: 'rgba(255,255,255,0.05)',
  glass300: 'rgba(255,255,255,0.08)',
  glass400: 'rgba(255,255,255,0.10)',
  glass500: 'rgba(255,255,255,0.13)',
  glassDark: 'rgba(5,6,10,0.60)',
  glassDarker: 'rgba(5,6,10,0.80)',

  // Text hierarchy
  textPrimary: '#EDF5FF',
  textSecondary: '#A8B5C8',
  textTertiary: '#6B7A94',
  textDisabled: '#3D4A5E',

  // Semantic
  success: '#00FF9C',
  successSubtle: 'rgba(0,255,156,0.12)',
  warning: '#FFB800',
  warningSubtle: 'rgba(255,184,0,0.12)',
  error: '#FF2D6F',
  errorSubtle: 'rgba(255,45,111,0.12)',
  info: '#1E90FF',
  infoSubtle: 'rgba(30,144,255,0.12)',
} as const;

// ─── TYPOGRAPHY ─────────────────────────────────────────────────────────────

export const Typography = {
  families: {
    display: 'Orbitron-Bold',
    displayMedium: 'Orbitron-Medium',
    displayRegular: 'Orbitron-Regular',
    headingBold: 'Rajdhani-Bold',
    headingSemiBold: 'Rajdhani-SemiBold',
    headingMedium: 'Rajdhani-Medium',
    headingRegular: 'Rajdhani-Regular',
    bodyBold: 'Inter-Bold',
    bodySemiBold: 'Inter-SemiBold',
    bodyMedium: 'Inter-Medium',
    bodyRegular: 'Inter-Regular',
  },
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
    '5xl': 52,
    '6xl': 64,
  },
  lineHeights: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },
  letterSpacings: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
    display: 3,
    ultra: 5,
  },
} as const;

// ─── SPACING ────────────────────────────────────────────────────────────────
// 4-pt base grid → multiples of 4

export const Spacing = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '10': 40,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
} as const;

// ─── RADII ──────────────────────────────────────────────────────────────────

export const Radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// ─── SHADOWS / GLOWS ────────────────────────────────────────────────────────

export const Shadows = {
  // Native shadow (iOS/Android)
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  // Neon glow shadows (color-keyed)
  glowCyan: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 6,
  },
  glowBlue: {
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 6,
  },
  glowPurple: {
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 6,
  },
  glowMagenta: {
    shadowColor: '#FF00E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// ─── GRADIENTS ──────────────────────────────────────────────────────────────

export const Gradients = {
  // Background gradients
  bgDeep: ['#05060A', '#0A0C16', '#05060A'] as const,
  bgAurora: ['#080A10', '#0E0A1F', '#050A14'] as const,
  bgMidnight: ['#060810', '#0C0F1E', '#080A14'] as const,

  // Neon button gradients
  cyan: ['#00F0FF', '#0088CC'] as const,
  cyanHover: ['#33F5FF', '#00AADE'] as const,
  blue: ['#1E90FF', '#0055CC'] as const,
  blueViolet: ['#1E90FF', '#7B2FE0'] as const,
  magenta: ['#FF00E5', '#CC00B7'] as const,
  purple: ['#8A2BE2', '#5B1FA0'] as const,
  success: ['#00FF9C', '#00CC7D'] as const,
  danger: ['#FF2D6F', '#CC2458'] as const,

  // Premium logo / hero
  brandCyan: ['#00F0FF', '#1E90FF', '#7B2FE0'] as const,
  brandGold: ['#FFB800', '#FF7A00'] as const,

  // Glass overlays
  glassLight: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] as const,
  glassDark: ['rgba(5,6,10,0.7)', 'rgba(10,12,22,0.9)'] as const,
} as const;

// ─── BORDERS ────────────────────────────────────────────────────────────────

export const Borders = {
  thin: 1,
  base: 1.5,
  thick: 2,
  heavy: 3,
  cyan: 'rgba(0,240,255,0.3)',
  cyanBright: 'rgba(0,240,255,0.6)',
  blue: 'rgba(30,144,255,0.3)',
  purple: 'rgba(138,43,226,0.3)',
  magenta: 'rgba(255,0,229,0.3)',
  white10: 'rgba(255,255,255,0.08)',
  white20: 'rgba(255,255,255,0.14)',
} as const;

// ─── ANIMATION ──────────────────────────────────────────────────────────────

export const Animation = {
  duration: {
    instant: 80,
    fast: 150,
    normal: 280,
    slow: 450,
    xslow: 700,
    splash: 1200,
  },
  spring: {
    gentle: { damping: 18, stiffness: 180, mass: 1 },
    snappy: { damping: 14, stiffness: 260, mass: 0.9 },
    bouncy: { damping: 10, stiffness: 320, mass: 0.85 },
  },
} as const;

// ─── Z-INDEX ─────────────────────────────────────────────────────────────────

export const ZIndex = {
  base: 0,
  raised: 1,
  overlay: 10,
  modal: 20,
  toast: 30,
  splash: 100,
} as const;
