/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f0',
          100: '#f9edda',
          200: '#f2d7b0',
          300: '#e8bb7d',
          400: '#dd9848',
          500: '#d57d2a',
          600: '#c46420',
          700: '#a34b1c',
          800: '#843d1e',
          900: '#6c331b',
          950: '#3a190c',
        },
        church: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a1929',
        },
        sage: {
          50: '#f2f7f2',
          100: '#e0ede0',
          200: '#c3dbc3',
          300: '#98c098',
          400: '#6ba06b',
          500: '#4a854a',
          600: '#386a38',
          700: '#2e552e',
          800: '#274427',
          900: '#213821',
          950: '#0f1f0f',
        },
        warm: {
          50: '#fefcf7',
          100: '#fdf6ea',
          200: '#f9e9cc',
          300: '#f4d7a5',
          400: '#eebb6d',
          500: '#e8a443',
          600: '#d98a2f',
          700: '#b46c25',
          800: '#905524',
          900: '#754621',
          950: '#3f230f',
        },
        // Run 30 — Grace Life Center public website ("the well") design tokens.
        // Namespaced under `site` so the marketing pages share one palette
        // without touching the app's brand/church/sage/warm scales.
        site: {
          cream:    '#FBF7EF',
          cream2:   '#F5EEE0',
          paper:    '#FFFDF8',
          ink:      '#2A2622',
          soft:     '#6A6157',
          brass:    '#B0894F',
          brassdk:  '#7C5C2E', // small-label gold; darkened from #8C6A38 to clear WCAG AA (≥4.5:1) on cream

          umber:    '#33201A',
          ember:    '#A63D1F',
          emberdk:  '#8F3418', // primary-button hover
          evergreen:'#3E5A34',
          forest:   '#1F2A1D',
          navy:     '#16233B',
          navy2:    '#1F3A5F',
          well:     '#17343D',
          welllt:   '#1E4650',
          clay:     '#EBDCCB',
          claydk:   '#DCC9B0',
          gold:     '#E7CF9E', // eyebrow / kicker on dark
          footer:   '#241611', // footer umber
        },
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
        // Run 30 — website faces (loaded via next/font in the (site) layout).
        fraunces: ['var(--font-fraunces)', 'Fraunces', 'Georgia', 'serif'],
        inter:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
