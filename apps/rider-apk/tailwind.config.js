/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bayniks: {
          orange: '#FF6D1F',
          orangeDark: '#EA580C',
          orangeLight: '#FFF7ED',
          orangeAccent: '#FB923C',
          black: '#0E1013',
          cardDark: '#16181D',
          surfaceDark: '#1E2228',
          borderDark: '#272A30',
          grayMid: '#868E96',
          grayLight: '#F4F6F8',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Space Grotesk"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'brand-glow': '0 10px 28px -4px rgba(255, 109, 31, 0.45)',
        'card-soft': '0 8px 30px rgba(14, 16, 19, 0.05)',
        'nav-float': '0 12px 40px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
