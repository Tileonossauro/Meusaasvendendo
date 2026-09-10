import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0d1117", soft: "#161b22", line: "#232b36" },
        paper: "#f6f7f9",
      },
    },
  },
  plugins: [],
} satisfies Config;
