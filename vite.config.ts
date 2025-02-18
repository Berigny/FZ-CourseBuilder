import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode (e.g., development, production)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ai-vendor': ['axios', 'axios-retry', 'zod']
          }
        }
      }
    },
    server: {
      watch: {
        usePolling: true
      },
      force: true, // Force dependency pre-bundling
      hmr: {
        overlay: true
      }
    },
    define: {
      // Ensure Vite injects environment variables
      'process.env': env
    },
    clearScreen: false, // Keep console output
    cacheDir: '.vite' // Use a new cache directory
  };
});
