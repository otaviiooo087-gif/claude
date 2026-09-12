import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          500: '#1d7fe0',
          600: '#1568bb',
          700: '#0f5294',
        },
      },
    },
  },
  plugins: [],
};

export default config;
