/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#ec1325",
                "primary-dark": "#c00f1e",
                "background-light": "#f8f6f6",
                "background-dark": "#221012",
                "cherry-red": "#ec1325",
                "cherry-light": "#fdf2f3",
                "alert-orange": "#f97316",
                "alert-orange-light": "#ffedd5",
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
                "DEFAULT": "0.375rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px"
            },
            padding: {
                'safe-top': 'env(safe-area-inset-top)',
                'safe-bottom': 'env(safe-area-inset-bottom)',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}
