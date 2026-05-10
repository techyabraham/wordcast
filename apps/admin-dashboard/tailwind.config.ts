import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f1ff',
          100: '#e4e2ff',
          200: '#c6c3ff',
          300: '#a8a4ff',
          400: '#8a86ff',
          500: '#7267f0',
          600: '#5a51d1',
          700: '#4640a8',
          800: '#342f7a',
          900: '#221f4d',
        },
        gold: {
          100: '#f8f1e1',
          300: '#e3c991',
          500: '#c8a15a',
          700: '#9a7a3f',
        },
        surface: {
          900: '#0b0f1a',
          800: '#111827',
          700: '#151b2e',
          600: '#1b2238',
          500: '#222b45',
          400: '#2a3554',
          300: '#334066',
        },
        ink: {
          100: '#e2e8f0',
          200: '#cbd5f5',
          300: '#94a3b8',
          400: '#7c8aa9',
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"IBM Plex Sans"', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        subtle: '0 8px 20px rgba(5, 8, 16, 0.45)',
        glow: '0 0 0 1px rgba(114, 103, 240, 0.18), 0 12px 30px rgba(10, 12, 24, 0.55)',
      },
      backgroundImage: {
        'dashboard-grid':
          'linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)',
        'dashboard-glow':
          'radial-gradient(circle at 20% -20%, rgba(124, 107, 255, 0.25), transparent 40%), radial-gradient(circle at 90% 0%, rgba(200, 161, 90, 0.15), transparent 45%)',
      },
    },
  },
  plugins: [],
};

export default config;
