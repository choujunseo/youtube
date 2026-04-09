import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import AppErrorBoundary from '@/components/common/AppErrorBoundary';
import { ensureSupabaseAuthSession } from '@/services/authService';
import App from './App';
import '@/styles/globals.css';

async function bootstrap() {
  try {
    await ensureSupabaseAuthSession();
  } catch {
    // Anonymous 미설정 프로젝트는 무시 — `anon` 키만으로 공개 SELECT·RPC가 동작할 수 있음
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <TDSMobileAITProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </TDSMobileAITProvider>
      </AppErrorBoundary>
    </React.StrictMode>,
  );
}

void bootstrap();
