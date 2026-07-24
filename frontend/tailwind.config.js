/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5EF",
        ink: "#1C2321",
        forest: {
          50: "#EAF3EF",
          100: "#CFE5DB",
          300: "#7FAF98",
          500: "#2C7A5A",
          600: "#1F6F5C",
          700: "#175544",
          900: "#0D2E25",
        },
        clay: {
          100: "#F2E6DD",
          400: "#C98552",
          600: "#A8622F",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
