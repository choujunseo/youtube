import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'idea-league',
  brand: {
    // 콘솔 앱 정보등록에 제출한 이름과 반드시 동일해야 함
    displayName: '아이디어리그',
    primaryColor: '#3182F6',
    // 콘솔 > 앱 정보 > 업로드한 로고 이미지를 우클릭 → 링크 복사 후 교체
    icon: 'https://static.toss.im/appsintoss/30405/8f267e68-aa54-4f58-8b62-ff8eea56cdf5.png',
  },
  permissions: [],
  web: {
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  webViewProps: {
    type: 'partner',
  },
});
