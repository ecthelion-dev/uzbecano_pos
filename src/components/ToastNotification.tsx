import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastNotificationProps {
  message: string | null;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed left-3 right-3 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-6 sm:bottom-6 bg-slate-900 text-white font-semibold px-4 sm:px-5 py-3 rounded-2xl shadow-2xl z-[60] flex items-center gap-2 border border-slate-700 animate-fadeIn">
      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      <span className="text-xs">{message}</span>
    </div>
  );
};
