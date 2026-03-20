/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        br: {
          neutral: 'var(--br-neutral)',
          white: 'var(--br-white)',
          primary: 'var(--br-primary)',
          dark: 'var(--br-dark)',
          black: 'var(--br-black)',
          ink: 'var(--br-ink)',
          surface: 'var(--br-surface)',
          border: 'var(--br-border)',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
