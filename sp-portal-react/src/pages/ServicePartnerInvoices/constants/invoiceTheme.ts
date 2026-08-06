/**
 * Design tokens for the Service Partner Invoice document. Ported 1:1 from
 * the Next.js source's constants/invoiceTheme.ts — a navy "paper" document
 * with light-blue stat cards, a navy per-partner header bar, a light-blue
 * subtotal strip and a navy grand-total bar.
 */
export const INVOICE_HEX = {
  navy: '#122C5E',
  blue: '#1C50D9',
  surface: '#F2F7FF',
  surfaceBorder: '#DCE7FB',
  green: '#1F9D6B',
  red: '#B91C1C',
  page: '#F4F8FD',
  white: '#FFFFFF',
} as const;

export const INVOICE_RGB = {
  navy: [18, 44, 94] as [number, number, number],
  blue: [28, 80, 217] as [number, number, number],
  surface: [242, 247, 255] as [number, number, number],
  surfaceBorder: [220, 231, 251] as [number, number, number],
  green: [31, 157, 107] as [number, number, number],
  red: [185, 28, 28] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  textGray: [100, 100, 100] as [number, number, number],
  textDark: [40, 40, 40] as [number, number, number],
} as const;
