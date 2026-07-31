/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scoped to the ported Tailwind-based features only — every generated utility is
  // nested under one of these scope classes so it can never leak into (or be
  // overridden by) the rest of the app's legacy CSS. :is(...) lets multiple pages
  // share one Tailwind build while keeping each page's own scope class.
  important: ':is(.daily-ops-tw-scope, .dgp-tw-scope, .driver-tw-scope, .invoice-history-tw-scope, .invoices-tw-scope)',
  corePlugins: {
    preflight: false,
  },
  content: [
    './src/pages/DailyOperationsReports/**/*.{ts,tsx}',
    './src/pages/DailyGamePlan/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/app/(private)/**/*.{ts,tsx}',
    './src/pages/CurrentMonth/**/*.{ts,tsx}',
    './src/pages/CurrentPerformance/**/*.{ts,tsx}',
    './src/pages/DailyPerformanceInsight/**/*.{ts,tsx}',
    './src/pages/Deductions/**/*.{ts,tsx}',
    './src/pages/Invoices/**/*.{ts,tsx}',
    './src/pages/MobileInvoice/**/*.{ts,tsx}',
    './src/pages/MyDeliveries/**/*.{ts,tsx}',
    './src/pages/Requests/**/*.{ts,tsx}',
    './src/pages/Subcontractor/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
