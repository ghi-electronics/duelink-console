const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
    mode: 'jit',
    purge: [
        './public/**/*.html',
        './src/**/*.{js,jsx,ts,tsx,vue}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                bunker: {
                    50: "#e4e4e4",
                    100: "#cbcbcb",
                    200: "#b2b2b2",
                    300: "#9a9a9a",
                    400: "#828283",
                    500: "#6b6b6c",
                    600: "#555556",
                    700: "#404141",
                    800: "#2c2d2e",
                    900: "#191a1a",
                },
                geyser: {
                    50: "#f1f3f6",
                    100: "#e3e8ed",
                    200: "#d6dde5",
                    300: "#c9d2dc",
                    400: "#bec7d1",
                    500: "#b3bcc5",
                    600: "#a9b1ba",
                    700: "#9fa6ae",
                    800: "#959ca3",
                    900: "#8a9198",
                    1000: "#80878d",
                    1100: "#777c82",
                    1200: "#6d7278",
                    1300: "#64686d",
                    1400: "#5a5f63",
                    1500: "#515559",
                    1600: "#484c4f",
                    1700: "#3f4245",
                    1800: "#37393c",
                    1900: "#2e3133",
                    2000: "#26282a",
                    2100: "#1e2021",
                    2200: "#171819",
                    2300: "#0e0f10",
                },
            },
            fontFamily: {
                sans: ['Inter var', ...defaultTheme.fontFamily.sans],
            },
        },
    },
    variants: {
        extend: {
            brightness: ['dark'],
            grayscale: ['dark'],
            opacity: ['dark'],
        },
    },
    plugins: [require('@tailwindcss/forms')],
};
