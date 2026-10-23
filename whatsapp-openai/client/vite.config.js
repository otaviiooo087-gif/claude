import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// O client roda em :5173 e faz proxy de /api e /socket.io para o backend (:3001),
// então o navegador enxerga tudo na mesma origem (sem dor de cabeça com CORS).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
