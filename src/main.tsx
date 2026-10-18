import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SkyQuiz 3D Runtime Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none z-50">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-rose-300">
              Terjadi Kendala Memuat Aplikasi
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              SkyQuiz 3D mengalami kesalahan saat memuat komponen. Anda dapat memuat ulang halaman atau membersihkan cache data lokal.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-950 rounded-xl text-[11px] font-mono text-rose-300/80 text-left overflow-x-auto max-h-32 border border-slate-800">
                {this.state.error.message}
              </div>
            )}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer transition-colors"
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Reset Data & Cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  // Clear any existing initial loader element
  const initialLoader = document.getElementById('initial-loader');
  if (initialLoader && initialLoader.parentNode === rootElement) {
    rootElement.removeChild(initialLoader);
  }

  createRoot(rootElement).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}
