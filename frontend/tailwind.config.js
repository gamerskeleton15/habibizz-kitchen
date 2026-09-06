// Tailwind CSS configuration for Habibizz Kitchens

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors for Habibizz Kitchens
        'brand-black': '#0D0D0D',         // Primary background
        'brand-dark': '#161616',          // Secondary background
        'brand-yellow': '#FFD400',       // Primary accent
        'brand-yellow-warm': '#FFE24D',  // Secondary accent
        'brand-white': '#FFFFFF',        // Text on dark, card backgrounds
        'brand-offwhite': '#F5F5F0',     // Light section background
      },
      fontFamily: {
        // Google Fonts: Archivo Black for headlines, Work Sans for body
        'display': ['"Archivo Black"', 'sans-serif'],
        'body': ['"Work Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}