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
                // Paleta Cherry Red Ultimate
                "primary": "#d91e36",         // Rojo Cereza Profundo (Textos)
                "primary-vibrant": "#ff1f3d", // Rojo Vibrante (Botones/UI)
                "primary-dim": "#b3152b",     // Rojo Oscuro (Hover)
                "background-light": "#f4f5f7", // Gris Hielo (Fondos)
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
                "body": ["Inter", "sans-serif"],
            },
            boxShadow: {
                "glow": "0 4px 14px rgba(255, 31, 61, 0.25)",
            },
            padding: {
                "safe-top": "env(safe-area-inset-top)",
                "safe-bottom": "env(safe-area-inset-bottom)",
            }
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}
