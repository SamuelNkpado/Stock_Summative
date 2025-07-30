import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
    open: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html', // ✅ This is now correctly set
    }
  },
  resolve: {
    extensions: ['.js']
  },
  define: {
    'import.meta.env': 'import.meta.env'
  }
});
