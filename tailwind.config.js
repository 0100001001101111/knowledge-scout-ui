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
        background: '#0a0a0a',
        foreground: '#ededed',
        accent: '#f59e0b',
        'accent-dim': '#d97706',
        surface: '#141414',
        'surface-hover': '#1f1f1f',
        border: '#2a2a2a',
      },
    },
  },
  plugins: [],
}
