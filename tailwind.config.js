/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terra: {
          primary: "#6e6c35",
          deep: "#44482c",
          meadow: "#849b50",
          moss: "#b1c181",
          sand: "#e8d79a",
          cream: "#f8f4e8",
          ink: "#252814",
        },
      },
      fontFamily: {
        sans: ['Typographica', 'Futura', '"Avenir Next"', '"Segoe UI"', 'sans-serif'],
        display: ['"Champagne & Limousines Bold"', 'Typographica', 'Futura', 'sans-serif'],
      },
      boxShadow: {
        brand: "0 24px 50px -24px rgba(68, 72, 44, 0.45)",
        soft: "0 18px 40px -24px rgba(68, 72, 44, 0.28)",
      },
      borderRadius: {
        brand: "1.25rem",
      },
    },
  },
  plugins: [],
}

