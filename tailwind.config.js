/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand teal, derived from #408080
        brand: {
          50: '#F5F9F9',
          100: '#E2ECEC',
          200: '#BCD3D3',
          300: '#96B9B9',
          400: '#70A0A0',
          500: '#408080',
          600: '#366D6D',
          700: '#2D5A5A',
          800: '#234646',
          900: '#1A3333',
          950: '#102020',
        },
        // Neutral gray with a faint teal undertone, replaces default slate
        mist: {
          50: '#F6F8F8',
          100: '#EEF2F1',
          200: '#DCE4E3',
          300: '#C2CECD',
          400: '#96A6A4',
          500: '#71827F',
          600: '#576663',
          700: '#434F4D',
          800: '#2E3736',
          900: '#1D2423',
          950: '#121716',
        },
        // Muted brick/rust — used only for the external carbon-price benchmark
        rust: {
          50: '#FBF2F1',
          100: '#F3DEDC',
          200: '#E4B9B5',
          300: '#D19792',
          400: '#C97F79',
          500: '#B5504B',
          600: '#9B3E3A',
          700: '#7D302D',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
