import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastNotificationProps {
  message: string | null;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-slate-900 text-white font-semibold px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2 border border-slate-700 animate-fadeIn">
      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
      <span className="text-xs">{message}</span>
    </div>
  );
};
