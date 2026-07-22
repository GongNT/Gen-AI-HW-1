import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxies YouTube's watch page so we can parse ytInitialPlayerResponse
      // (title, duration, description, caption track URL) without hitting CORS.
      '/yt-page': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yt-page/, '/watch'),
      },
      // Proxies the caption track fetch (also a youtube.com endpoint) for the transcript.
      '/yt-captions': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yt-captions/, '/api/timedtext'),
      },
    },
  },
})
