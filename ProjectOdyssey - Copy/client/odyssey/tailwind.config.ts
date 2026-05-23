// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: [
//     "./app/**/*.{js,ts,jsx,tsx}",
//     "./pages/**/*.{js,ts,jsx,tsx}",
//     "./components/**/*.{js,ts,jsx,tsx}",
//   ],
//   theme: {
//     extend: {
//       fontFamily: {
//         odyssey: ['"Playfair Display"', 'serif'],
//         body: ['Manrope', 'sans-serif'],
//       },
//     },
//   },
//   plugins: [],
// };


import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        odyssey: ['"Playfair Display"', 'serif'],
        body: ['Manrope', 'sans-serif'],
      },
      colors: {
        beige: {
          50: '#FFF5E9', // Your custom background color
        }
      }
    },
  },
  plugins: [],
};
export default config;