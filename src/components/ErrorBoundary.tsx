import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Kassa ilovasida kutilmagan xatolik:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCache = async () => {
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {
      /* tozalash xatosi bo'lsa ham reload qilamiz */
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-slate-800 font-sans">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Kassani yuklashda xatolik yuz berdi
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {this.state.error?.message || 'Nomaʼlum xatolik sodir bo‘ldi'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
                Qayta yuklash
              </button>
              <button
                onClick={this.handleClearCache}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition border border-slate-200 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
                Keshni tozalash
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
