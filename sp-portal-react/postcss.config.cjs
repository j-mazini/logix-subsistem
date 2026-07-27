// Legacy global CSS (Bootstrap-derived helpers like `.hidden { display: none !important; }`)
// beats our scoped Tailwind utilities by !important alone, regardless of specificity/order.
// This plugin marks declarations !important, but only for rules scoped under
// .daily-ops-tw-scope — every other stylesheet in the app passes through untouched.
function forceImportantInScope() {
  return {
    postcssPlugin: 'force-important-in-daily-ops-scope',
    Once(root) {
      root.walkRules((rule) => {
        if (rule.selector && rule.selector.includes('.daily-ops-tw-scope')) {
          rule.walkDecls((decl) => {
            decl.important = true;
          });
        }
      });
    },
  };
}
forceImportantInScope.postcss = true;

module.exports = {
  plugins: [require('tailwindcss'), require('autoprefixer'), forceImportantInScope],
};
