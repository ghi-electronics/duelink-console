import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
    base: './', // Make assets relative
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
    },
    define: {
        APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },
    plugins: [
        vue(),
    ],
});
