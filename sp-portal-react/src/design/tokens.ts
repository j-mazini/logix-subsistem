/**
 * Design Tokens - Single source of truth for colors, spacing, typography
 * Extracted from base-system-reference.css and profile.css
 */

// ========== Colors ==========
export const colors = {
  // Primary
  primary: {
    blue: '#0d6efd',
    indigo: '#6366f1',
    purple: '#8b5cf6',
  },
  // Neutrals
  neutral: {
    white: '#ffffff',
    black: '#000000',
    background: '#f8fafc',
    surface: '#f7f8fa',
    border: '#e9ecef',
    input: '#e9ecef',
  },
  // Text
  text: {
    primary: '#0f172a',
    secondary: '#64748b',
    dark: '#2c3e50',
    light: '#8491a1',
    muted: '#6b7280',
  },
  // Semantic
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#0c5460',
  // Gradients
  gradients: {
    beam: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    background: 'linear-gradient(135deg, #f1f5f9 0%, #e8f0f5 25%, #dbeafe 50%, #e8f0f5 75%, #f1f5f9 100%)',
  },
} as const;

// ========== Typography ==========
export const typography = {
  fontFamily: {
    sans: '"Inter", "Geist Sans", system-ui, sans-serif',
    mono: '"Geist Mono", monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// ========== Spacing ==========
export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
} as const;

// ========== Border Radius ==========
export const radius = {
  none: '0',
  sm: '0.375rem',
  base: '0.625rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  full: '9999px',
} as const;

// ========== Shadows ==========
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  md: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  lg: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  glass: '0 8px 32px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
  glassHover: '0 12px 40px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
} as const;

// ========== Transitions ==========
export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ========== Breakpoints ==========
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ========== Z-Index ==========
export const zIndex = {
  hide: '-1',
  auto: 'auto',
  base: '0',
  dropdown: '1000',
  sticky: '1100',
  fixed: '1200',
  modal: '1300',
  popover: '1400',
  tooltip: '1500',
} as const;

// ========== Profile-specific tokens ==========
export const profileTokens = {
  coverHeight: '280px',
  avatarDiameter: '140px',
  avatarPeek: 'calc(140px / 2)',
  bodyPaddingTop: 'calc(calc(140px / 2) + 1rem)',
  bodyPaddingRight: 'calc(140px + 1rem)',
  bodyPaddingLeft: '1.25rem',
} as const;

// ========== Component Defaults ==========
export const components = {
  button: {
    paddingX: spacing[4],
    paddingY: spacing[2],
    borderRadius: radius.base,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  card: {
    padding: spacing[4],
    borderRadius: radius.lg,
    shadow: shadows.base,
    border: `1px solid ${colors.neutral.border}`,
  },
  input: {
    paddingX: spacing[3],
    paddingY: spacing[2],
    borderRadius: radius.base,
    border: `1px solid ${colors.neutral.input}`,
    fontSize: typography.fontSize.base,
  },
  sidebar: {
    width: '280px',
    backgroundColor: colors.neutral.white,
    shadow: shadows.lg,
  },
} as const;
