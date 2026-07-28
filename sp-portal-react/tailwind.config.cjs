/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scoped to the ported Tailwind-based features only — every generated utility is
  // nested under one of these scope classes so it can never leak into (or be
  // overridden by) the rest of the app's legacy CSS. :is(...) lets multiple pages
  // share one Tailwind build while keeping each page's own scope class.
  important: ':is(.daily-ops-tw-scope, .dgp-tw-scope)',
  corePlugins: {
    preflight: false,
  },
  content: [
    './src/pages/DailyOperationsReports/**/*.{ts,tsx}',
    './src/pages/DailyGamePlan/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
