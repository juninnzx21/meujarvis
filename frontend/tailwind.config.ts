import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#050816",
        panel: "rgba(10, 18, 38, 0.72)",
        cyanx: "#22d3ee",
        electric: "#3b82f6",
        violetx: "#a78bfa"
      },
      boxShadow: {
        glow: "0 0 42px rgba(34, 211, 238, 0.16)"
      }
    }
  },
  plugins: []
} satisfies Config;
