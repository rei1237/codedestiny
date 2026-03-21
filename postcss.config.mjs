/**
 * Tailwind v3+ already tree-shakes unused utilities (JIT). Do not stack
 * @fullhuman/postcss-purgecss after Tailwind — it strips generated classes and breaks styles.
 * Production: cssnano minifies the final CSS (smaller output without conflicting with Tailwind).
 */
const prod = process.env.NODE_ENV === "production";

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(prod ? { cssnano: {} } : {}),
  },
};
