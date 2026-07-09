/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dispatch-dark': '#0f172a',
        'dispatch-accent': '#fbbf24',
      }
    },
  },
  plugins: [],
}
