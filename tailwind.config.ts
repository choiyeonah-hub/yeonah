import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        havruta: {
          50: "#fdf6ec",
          100: "#faebd2",
          200: "#f3d29f",
          300: "#eab86a",
          400: "#e0a03e",
          500: "#c9822a",
          600: "#a56521",
          700: "#7f4c1d",
          800: "#5f3a1c",
          900: "#432a17",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
