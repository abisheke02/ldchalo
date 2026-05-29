/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1a3a6b', light: '#2563eb' },
        accent: { DEFAULT: '#f59e0b' },
      },
    },
  },
  plugins: [],
};
