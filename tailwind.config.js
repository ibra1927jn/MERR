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
                // Professional Indigo Palette
                "primary": "#4338ca",           // Indigo 700 — primary brand
                "primary-vibrant": "#6366f1",   // Indigo 500 — interactive
                "primary-dim": "#3730a3",       // Indigo 800 — hover
                "primary-dark": "#312e81",      // Indigo 900 — pressed
                "primary-light": "#eef2ff",     // Indigo 50  — tints
                // Surfaces
                "background-light": "#f8fafc",  // Slate 50
                "surface-white": "#ffffff",
                // Text
                "text-main": "#0f172a",         // Slate 900
                "text-sub": "#475569",          // Slate 600
                "text-muted": "#94a3b8",        // Slate 400
                // Borders
                "border-light": "#e2e8f0",      // Slate 200
                "border-subtle": "#f1f5f9",     // Slate 100
                // Status
                "warning": "#f59e0b",
                "bonus": "#fbbf24",
                "success": "#10b981",
                "danger": "#ef4444",
                "info": "#0ea5e9",
                "info-dim": "#0284c7",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"],
                "body": ["Inter", "sans-serif"],
                "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
            },
            boxShadow: {
                "card": "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
                "card-hover": "0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.03)",
                "nav": "0 -2px 10px rgba(0, 0, 0, 0.04)",
                "glow": "0 4px 14px rgba(99, 102, 241, 0.25)",
                "glow-success": "0 4px 14px rgba(16, 185, 129, 0.3)",
                "glow-info": "0 4px 14px rgba(14, 165, 233, 0.3)",
                "rugged": "0 2px 8px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)",
            },
            padding: {
                "safe-top": "env(safe-area-inset-top)",
                "safe-bottom": "env(safe-area-inset-bottom)",
            },
            backdropBlur: {
                "xs": "2px",
            },
            keyframes: {
                "pulse-glow": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.7, boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)" },
                },
            },
            animation: {
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}
