import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite Configuration for DeskMate Electron App
 * 
 * This config handles the renderer process only.
 * Main process runs directly via Electron.
 * 
 * Outputs IIFE format for synchronous loading in Electron.
 */
export default defineConfig({
    // Base path for Electron file:// protocol
    base: './',

    // Build configuration - Library mode for IIFE output
    build: {
        // Output to src/dist for Electron to load
        outDir: 'src/dist',

        // Generate source maps for debugging
        sourcemap: true,

        // Library mode to get single file output
        lib: {
            entry: resolve(__dirname, 'src/renderer.ts'),
            name: 'DeskMateModern',
            // IIFE format for synchronous loading without module syntax
            formats: ['iife'],
            fileName: () => 'renderer.js',
        },

        rollupOptions: {
            output: {
                // Extend window globals
                extend: true,
                // Inline all chunks into single file
                inlineDynamicImports: true,
            },
        },

        // Target Electron's Chrome version
        target: 'chrome120',

        // Don't minify for easier debugging
        minify: false,
    },

    // Resolve configuration
    resolve: {
        alias: {
            '@/core': resolve(__dirname, 'src/core'),
            '@/audio': resolve(__dirname, 'src/audio'),
            '@/types': resolve(__dirname, 'src/types'),
        },
    },

    // Define globals for Electron's renderer context
    define: {
        // Prevent Vite from replacing process.env
        'process.env': 'process.env',
    },
});
