import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'idea-league',
  brand: {
    displayName: '아이디어 리그',
    primaryColor: '#3182F6',
    icon: './public/logo.png',
  },
  permissions: [],
  web: {
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
});
