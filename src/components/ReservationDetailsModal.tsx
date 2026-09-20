import React, { useState } from 'react';
import { Calendar, User, Phone, Users, Clock, FileText, X, CheckCircle2, Trash2 } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import { formatClock, formatDateClock } from '../lib/timeFormat';
import type { DBReservation } from '../types';

interface ReservationDetailsModalProps {
  show: boolean;
  reservation: DBReservation | null;
  onOpenTable: (tableNumber: string, reservationId: string) => void;
  onCancelReservation: (reservationId: string) => void | Promise<void>;
  onClose: () => void;
}

export const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  show,
  reservation,
  onOpenTable,
  onCancelReservation,
  onClose,
}) => {
  const t = useT();
  const [cancelling, setCancelling] = useState(false);

  if (!show || !reservation) return null;

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await onCancelReservation(reservation.id);
      onClose();
    } finally {
      setCancelling(false);
    }
  };

  const handleOpen = () => {
    onOpenTable(reservation.tableNumber, reservation.id);
    onClose();
  };

  const isConfirmed = reservation.status === 'CONFIRMED';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-slate-200 animate-scaleUp max-h-[92dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-purple-100 p-2.5 rounded-2xl text-purple-600 shadow-sm shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">
                {t('reservation.details')}
              </h3>
              <p className="text-xs text-purple-600 font-bold">
                {reservation.tableNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details list */}
        <div className="flex flex-col gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {t('reservation.customerName')}
            </span>
            <span className="font-bold text-slate-900 text-right truncate">
              {reservation.customerName}
            </span>
          </div>

          {reservation.customerPhone && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {t('reservation.customerPhone')}
              </span>
              <span className="font-medium text-slate-800 text-right">
                {reservation.customerPhone}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2">
            <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {t('reservation.reservedTime')}
            </span>
            <span className="font-bold text-purple-700 text-right">
              {formatDateClock(reservation.reservedTime)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2">
            <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {t('reservation.guestCount')}
            </span>
            <span className="font-semibold text-slate-800 text-right">
              {t('reservation.guestLabel', { count: reservation.guestCount })}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2">
            <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              {t('reservation.status')}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                reservation.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : reservation.status === 'CANCELLED'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {reservation.status === 'COMPLETED'
                ? t('reservation.statusCompleted')
                : reservation.status === 'CANCELLED'
                ? t('reservation.statusCancelled')
                : t('reservation.statusConfirmed')}
            </span>
          </div>

          {reservation.notes && (
            <div className="flex flex-col gap-1 border-t border-slate-200/60 pt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                {t('reservation.notes')}
              </span>
              <p className="text-xs text-slate-700 italic bg-white p-2 rounded-xl border border-slate-200">
                {reservation.notes}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isConfirmed ? (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={handleOpen}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t('reservation.openTable')}
            </button>

            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="py-3 px-4 bg-rose-50 hover:bg-rose-100 active:scale-98 text-rose-700 font-bold text-sm rounded-xl border border-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('reservation.cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer mt-1"
          >
            {t('common.close')}
          </button>
        )}
      </div>
    </div>
  );
};
