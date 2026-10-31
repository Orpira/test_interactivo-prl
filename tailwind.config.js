export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F4F7F6",
        card: "#FFFFFF",
        surface: "#E6EEEC",
        ink: {
          DEFAULT: "#10201D",
          soft: "#2E4541",
          muted: "#5B706C",
        },
        line: "#CFDAD7",
        primary: {
          DEFAULT: "#0F766E",
          dark: "#115E59",
        },
        signal: {
          DEFAULT: "#FACC15",
          ink: "#854D0E",
        },
        ok: {
          DEFAULT: "#15803D",
          bg: "#DCFCE7",
          ink: "#14532D",
        },
        ko: {
          DEFAULT: "#B91C1C",
          bg: "#FEE2E2",
          ink: "#7F1D1D",
        },
        senal: {
          obligacion: { DEFAULT: "#005CA9", on: "#FFFFFF", tint: "#DCEBF8", ink: "#003B6E" },
          advertencia: { DEFAULT: "#FACC15", on: "#10201D", tint: "#FEF6C3", ink: "#713F12" },
          salvamento: { DEFAULT: "#00843D", on: "#FFFFFF", tint: "#D9F2E3", ink: "#064E2A" },
          incendios: { DEFAULT: "#C8102E", on: "#FFFFFF", tint: "#FCE1E5", ink: "#7A0A1C" },
          otras: { DEFAULT: "#4B5D59", on: "#FFFFFF", tint: "#E6EEEC", ink: "#2E4541" },
        },
      },
      fontFamily: {
        display: ['"Space Grotesk Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono Variable"', "ui-monospace", "monospace"],
      },
      keyframes: {
        rebote: {
          "0%, 100%": { scale: "1" },
          "50%": { scale: "1.12" },
        },
        panel: {
          from: { opacity: "0", gridTemplateRows: "0fr" },
          to: { opacity: "1", gridTemplateRows: "1fr" },
        },
      },
      animation: {
        rebote: "rebote 220ms ease-out",
        panel: "panel 250ms ease-out",
      },
    },
  },
  plugins: [],
}
