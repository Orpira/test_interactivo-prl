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
      },
      fontFamily: {
        display: ['"Space Grotesk Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono Variable"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
}
