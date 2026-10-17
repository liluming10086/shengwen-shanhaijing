import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves project sites beneath /<repository>/.
  base: process.env.GITHUB_ACTIONS ? '/shengwen-shanhaijing/' : '/',
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com'],
  },
});
