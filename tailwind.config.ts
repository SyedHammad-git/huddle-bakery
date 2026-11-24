import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        espresso: "#361312",
        espressoDark: "#290c0b",
        cream: "#F7EFE3",
        creamLight: "#FBF7F0",
        sandCard: "#EFE5D6",
        sandHover: "#e7d9c6",
        caramel: "#C89D54",
        caramelDark: "#B8863B",
        goldLight: "#E8D4B0",
        borderWarm: "#E5D8C5",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "Arial", "sans-serif"],
      },
      boxShadow: {
        phone: "0 25px 60px -15px rgba(54, 19, 18, 0.4), 0 0 0 12px #1f1b1a",
        "warm-soft": "0 10px 30px -5px rgba(54, 19, 18, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
