import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#0f1117',
          hover: '#1a1f2e',
          active: '#252d40',
          border: '#1e2333',
        },
      },
      fontFamily: {
        'courier-prime': ['var(--font-courier-prime)', 'Courier New', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
