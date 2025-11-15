/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3F51F5',
        success: '#43A047',
        error: '#E53935',
      },
    },
  },
  plugins: [],
}

