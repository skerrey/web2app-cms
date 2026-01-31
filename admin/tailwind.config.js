/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0066cc",
        "primary-hover": "#0052a3",
        "primary-light": "#e6f2ff"
      }
    }
  },
  plugins: []
}
