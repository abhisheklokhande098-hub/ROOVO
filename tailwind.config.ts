import type { Config } from 'tailwindcss';
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'), surface: v('surface'), surface2: v('surface2'), line: v('line'),
        ink: v('ink'), muted: v('muted'), subtle: v('subtle'),
        brand: { 50: v('brand-50'), 100: v('brand-100'), 500: v('brand-500'), 600: v('brand-600'), 700: v('brand-700'), 900: v('brand-900') },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
