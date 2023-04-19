const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,vue}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#b0bec5',
          100: '#aeb0b2',
          300: '#727272',
          500: '#404040',
          600: '#323232',
          700: '#272727',
          800: '#212121',
          900: '#1a1a1a',
        },
      },
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}

