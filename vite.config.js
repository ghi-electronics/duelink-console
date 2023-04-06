import { defineConfig } from 'vite';
import path from 'path';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
    base: '/', // Make assets relative
    build: {
        outDir: path.join(__dirname, "docs"),
    },
    plugins: [
        vue(),
    ],
});
