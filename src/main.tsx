import React, {StrictMode, Component, ReactNode, ErrorInfo} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    // Clear storage and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
    }
    caches.keys().then((keys) => {
      keys.forEach((k) => caches.delete(k));
    });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 font-bold text-2xl">
            !
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado ao carregar.</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Ocorreu uma inconsistência no cache do navegador. Clique no botão abaixo para recarregar com a versão mais recente.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            Limpar Cache & Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Register Service Worker for PWA support and offline reliability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((reg) => {
        reg.update().catch(() => {});
        console.log('PWA Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration info:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
