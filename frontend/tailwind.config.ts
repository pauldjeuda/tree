import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F2F4F3',
        ink: {
          DEFAULT: '#111111',
          primary: '#1A1A1A',
          body: '#2A2A2A',
        },
        muted: '#8C8C8C',
        discreet: '#6B6B6B',
        hairline: {
          DEFAULT: '#E8E8E8',
          subtle: '#E9E9E9',
          border: '#E3E3E3',
          line: '#EEEEEE',
        },
        ghost: '#F1F1F1',
        coral: {
          DEFAULT: '#F0805F',
          light: '#F59A7A',
        },
        connector: '#2B2B2B',
        danger: '#D64545',
        success: '#3FA66B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        script: ['"Mr Dafoe"', '"Homemade Apple"', 'cursive'],
      },
      borderRadius: {
        card: '20px',
        panel: '24px',
        field: '14px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 20px 60px rgba(0, 0, 0, 0.08)',
        panel: '0 20px 60px rgba(0, 0, 0, 0.12)',
        modal: '0 30px 80px rgba(0, 0, 0, 0.25)',
        highlight: '0 30px 60px rgba(0, 0, 0, 0.22)',
        dropdown: '0 16px 40px rgba(0, 0, 0, 0.14)',
        poster: '0 10px 40px rgba(0, 0, 0, 0.08)',
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.02em',
        wide: '0.05em',
        widest: '0.08em',
      },
    },
  },
  plugins: [],
};

export default config;
