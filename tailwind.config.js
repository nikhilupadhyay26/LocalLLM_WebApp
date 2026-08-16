/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0f0e',
          900: '#121715',
          800: '#1a201d',
          700: '#242b27',
          600: '#333c37',
          500: '#4a564f',
          400: '#6b7970',
          300: '#94a199',
          200: '#c1cbc4',
          100: '#e3e8e4',
          50: '#f4f6f4',
        },
        signal: {
          DEFAULT: '#4fd1a5',
          dim: '#2f9e78',
          bright: '#7ee9c2',
        },
        // Explicit, contrast-tested text hierarchy (WCAG AA). Each is
        // checked against the lightest (hence worst-case) background text
        // actually sits on in this app, ink-800, used for hover/selected
        // rows: primary ~16:1, secondary ~6.2:1, muted ~5.2:1 (all clear
        // the 4.5:1 minimum for normal text with margin). `disabled` is
        // for genuinely inactive controls only, which WCAG exempts from
        // the contrast minimum, at ~3.6:1.
        primary: '#e3e8e4',
        secondary: '#94a199',
        muted: '#87948b',
        disabled: '#6b7970',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
