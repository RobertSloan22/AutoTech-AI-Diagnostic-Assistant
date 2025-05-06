import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.1.124:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_, req) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      '^/v1/realtime/sessions': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('OpenAI proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Authorization', `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`);
          });
        }
      }
    },
    headers: {
      'Content-Security-Policy': [
        "default-src 'self' http://localhost:5000 http://localhost:8080 http://localhost:5173 http://localhost:3000 http://localhost:3001;",
        "img-src 'self' data: blob: https://* http://*;",
        "connect-src 'self' " +
          "http://localhost:5000 " +
          "http://localhost:5173 " +
          "ws://localhost:5173 " +
          "http://localhost:8080" +
          "http://localhost:3000 " +
          "http://192.168.1.124:5000" +
          "http://192.168.1.124:3000" +
          "http://192.168.1.124:3001" +
          "http://192.168.1.124:3005" +

          "http://localhost:3001 " +
          "https://api.openai.com " +
          "wss://api.openai.com " +
          "https://*.openai.com " +
          "wss://*.openai.com " +
          "https://api.openai.com/v1/realtime/sessions " +
          "https://chat-app-yt.onrender.com " +
          "wss://chat-app-yt.onrender.com;",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
        "style-src 'self' 'unsafe-inline';",
        "media-src 'self' blob: mediastream:;",
        "worker-src 'self' blob:;"
      ].join(' ')
    }
  }
})