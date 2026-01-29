/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#d91e36", // Deep Cherry Red
        "primary-vibrant": "#ff1f3d", // Vibrant red
        "primary-dim": "#b3152b",
        "background-light": "#f4f5f7", // Crisp light gray/white mix
        "surface-white": "#ffffff",
        "text-main": "#1f2937",
        "text-sub": "#6b7280",
        "border-light": "#e5e7eb",
        "warning": "#f59e0b",
        "bonus": "#fbbf24",
        "success": "#10b981",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "sans": ["Inter", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}