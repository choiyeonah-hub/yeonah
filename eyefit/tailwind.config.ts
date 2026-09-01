import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // 안경 렌즈의 유리/청록 계열에서 가져온 색. 하브루타 톡(따뜻한 갈색)과 구분된다.
        ink: {
          50: "#f2f7f8",
          100: "#e2eef0",
          200: "#c3dce0",
          300: "#95c1c9",
          400: "#5f9daa",
          500: "#3f818f",
          600: "#356878",
          700: "#2f5563",
          800: "#2c4753",
          900: "#283d47",
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
