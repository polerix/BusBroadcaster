import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        media: './media_deck.html',
        play: './play_deck.html',
        schedule: './schedule_deck.html'
      }
    }
  }
});
