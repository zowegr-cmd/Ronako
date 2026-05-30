import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Couleurs thémables — réagissent aux CSS vars (data-theme)
        onyx:            "rgb(var(--ch-onyx) / <alpha-value>)",
        graphite:        "rgb(var(--ch-graphite) / <alpha-value>)",
        "graphite-light":"rgb(var(--ch-graphite-light) / <alpha-value>)",
        crystal:         "rgb(var(--ch-crystal) / <alpha-value>)",
        "crystal-light": "rgb(var(--ch-crystal-light) / <alpha-value>)",
        silk:            "rgb(var(--ch-silk) / <alpha-value>)",
        "silk-dim":      "rgb(var(--ch-silk) / 0.5)",
        // Couleurs fixes (ne changent pas avec le thème)
        electric:        "#007AFF",
        "electric-dim":  "rgba(0,122,255,0.15)",
        mystic:          "#A259FF",
        "mystic-dim":    "rgba(162,89,255,0.15)",
        success:         "#30D158",
        warning:         "#FF9F0A",
        danger:          "#FF453A",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "SF Pro Display", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "gradient-shift": "gradient-shift 12s ease infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      backgroundImage: {
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        "glow-electric": "0 0 20px rgba(0,122,255,0.4), 0 0 40px rgba(0,122,255,0.15)",
        "glow-mystic": "0 0 20px rgba(162,89,255,0.4), 0 0 40px rgba(162,89,255,0.15)",
        "glow-subtle": "0 0 30px rgba(162,89,255,0.08)",
        "card": "0 1px 0 rgba(255,255,255,0.04) inset, 0 -1px 0 rgba(0,0,0,0.2) inset",
      },
    },
  },
  plugins: [],
} satisfies Config;
