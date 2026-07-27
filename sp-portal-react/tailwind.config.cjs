/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scoped to the Daily Operations Reports feature only — every generated
  // utility is nested under .daily-ops-tw-scope so it can never leak into
  // (or be overridden by) the rest of the app's legacy CSS.
  important: '.daily-ops-tw-scope',
  corePlugins: {
    preflight: false,
  },
  content: [
    './src/pages/DailyOperationsReports/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
