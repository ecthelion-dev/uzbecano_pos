import React, { useState, useEffect } from 'react';
import { Calendar, Plus, ListFilter, User, Phone, Clock, Users, FileText, X, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import { formatClock, formatDateClock, maskTimeText, normalizeTimeText } from '../lib/timeFormat';
import type { DBReservation } from '../types';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

interface ReservationModalProps {
  show: boolean;
  tableDefs: { number: string; area?: string }[];
  reservations: DBReservation[];
  defaultTableNumber?: string;
  onCreateReservation: (data: {
    tableNumber: string;
    customerName: string;
    customerPhone?: string;
    guestCount: number;
    reservedTime: string;
    notes?: string;
  }) => Promise<boolean>;
  onCancelReservation: (id: string) => Promise<void>;
  onOpenTable: (tableNumber: string, reservationId: string) => void;
  onClose: () => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  show,
  tableDefs,
  reservations,
  defaultTableNumber,
  onCreateReservation,
  onCancelReservation,
  onOpenTable,
  onClose,
}) => {
  const t = useT();
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');

  // Form state
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [guestCount, setGuestCount] = useState<number | ''>(2);
  const [reservedDate, setReservedDate] = useState<string>('');
  const [reservedTime, setReservedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  useEffect(() => {
    if (!show) return;
    setError(null);
    if (defaultTableNumber) {
      setSelectedTable(defaultTableNumber);
      setActiveTab('create');
    } else if (tableDefs.length > 0 && !selectedTable) {
      setSelectedTable(tableDefs[0].number);
    }

    // Default to current date and 1 hour later
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setReservedDate(`${yyyy}-${mm}-${dd}`);

    now.setHours(now.getHours() + 1);
    const hh = String(now.getHours()).padStart(2, '0');
    setReservedTime(`${hh}:00`);
  }, [show, defaultTableNumber, tableDefs]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const tbl = selectedTable.trim();
    const name = customerName.trim();
    if (!tbl) {
      setError(t('table.selectTable'));
      return;
    }
    if (!name) {
      setError(t('reservation.customerName'));
      return;
    }

    if (!reservedDate || !reservedTime) {
      setError(t('reservation.reservedTime'));
      return;
    }

    const targetDate = new Date(`${reservedDate}T${reservedTime}:00`);
    if (isNaN(targetDate.getTime())) {
      setError(t('reservation.reservedTime'));
      return;
    }

    if (targetDate.getTime() < Date.now() - 5 * 60 * 1000) {
      setError(t('reservation.pastTimeError'));
      return;
    }

    const isoString = targetDate.toISOString();

    setLoading(true);
    try {
      const ok = await onCreateReservation({
        tableNumber: tbl,
        customerName: name,
        customerPhone: customerPhone.trim() || undefined,
        guestCount: Math.max(1, Number(guestCount) || 1),
        reservedTime: isoString,
        notes: notes.trim() || undefined,
      });

      if (ok) {
        setCustomerName('');
        setCustomerPhone('');
        setNotes('');
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const activeReservations = reservations.filter((r) => r.status === 'CONFIRMED');

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const applyQuickOffsetMinutes = (addMinutes: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + addMinutes);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0');
    setReservedTime(`${hh}:${mm}`);
  };

  const [selectedHour, selectedMinute] = (reservedTime || '20:00').split(':');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 z-50 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 border border-slate-200 max-h-[92dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-purple-100 p-2.5 rounded-2xl text-purple-600 shadow-sm shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 truncate">
                {t('reservation.title')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('reservation.guestLabel', { count: activeReservations.length })}
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

        {/* Tab switchers */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {t('reservation.new')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            {t('reservation.list')}
            <span className="ml-1 px-1.5 py-0.2 bg-purple-100 text-purple-700 text-[10px] rounded-full font-bold">
              {activeReservations.length}
            </span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'create' ? (
          /* Form for new reservation */
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Table Select */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700">
                {t('table.moveTarget')}
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {tableDefs.map((td) => (
                  <option key={td.number} value={td.number}>
                    {td.number} {td.area ? `(${td.area})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  {t('reservation.customerName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('reservation.namePlaceholder')}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {t('reservation.customerPhone')}
                </label>
                <input
                  type="tel"
                  placeholder={t('reservation.phonePlaceholder')}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Date, Time & Guest Count */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {t('reservation.reservedTime')}
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={reservedDate}
                  onChange={(e) => setReservedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1 relative">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {t('reservation.reservedTime')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTimePicker((prev) => !prev)}
                    className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold cursor-pointer"
                  >
                    {showTimePicker ? t('common.close') : t('reservation.selectTime')}
                  </button>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={reservedTime}
                    onClick={() => setShowTimePicker(true)}
                    onChange={(e) => setReservedTime(maskTimeText(e.target.value))}
                    onBlur={(e) => setReservedTime(normalizeTimeText(e.target.value, reservedTime || '20:00'))}
                    placeholder="20:00"
                    maxLength={5}
                    className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTimePicker((prev) => !prev)}
                    className="absolute right-2.5 p-1 text-purple-600 hover:text-purple-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                </div>

                {showTimePicker && (
                  <div className="absolute top-full left-0 sm:-left-12 mt-1 w-72 sm:w-80 bg-white border border-purple-200/80 rounded-2xl shadow-2xl p-3 z-30 flex flex-col gap-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => applyQuickOffsetMinutes(30)}
                          className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          {t('reservation.quickPlus30m')}
                        </button>
                        <button
                          type="button"
                          onClick={() => applyQuickOffsetMinutes(60)}
                          className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          {t('reservation.quickPlus1h')}
                        </button>
                        <button
                          type="button"
                          onClick={() => applyQuickOffsetMinutes(120)}
                          className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          {t('reservation.quickPlus2h')}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTimePicker(false)}
                        className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-6 gap-2">
                      {/* Hours (col-span-4) */}
                      <div className="col-span-4 flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                          {t('reservation.hour')}
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {HOURS.map((h) => {
                            const isPast = reservedDate === todayStr && Number(h) < now.getHours();
                            const isSelected = selectedHour === h;
                            return (
                              <button
                                key={h}
                                type="button"
                                disabled={isPast}
                                onClick={() => setReservedTime(`${h}:${selectedMinute || '00'}`)}
                                className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : isPast
                                    ? 'text-slate-300 opacity-30 cursor-not-allowed'
                                    : 'bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                                }`}
                              >
                                {h}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Minutes (col-span-2) */}
                      <div className="col-span-2 flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                          {t('reservation.minute')}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {MINUTES.map((m) => {
                            const isPast =
                              reservedDate === todayStr &&
                              Number(selectedHour) === now.getHours() &&
                              Number(m) < now.getMinutes();
                            const isSelected = selectedMinute === m;
                            return (
                              <button
                                key={m}
                                type="button"
                                disabled={isPast}
                                onClick={() => {
                                  setReservedTime(`${selectedHour || '20'}:${m}`);
                                  setShowTimePicker(false);
                                }}
                                className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : isPast
                                    ? 'text-slate-300 opacity-30 cursor-not-allowed'
                                    : 'bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                                }`}
                              >
                                :{m}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  {t('reservation.guestCount')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={guestCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setGuestCount('');
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num)) setGuestCount(num);
                    }
                  }}
                  onBlur={() => {
                    if (guestCount === '' || Number(guestCount) < 1) {
                      setGuestCount(1);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                {t('reservation.notes')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-sm rounded-xl transition-all shadow-md mt-1 cursor-pointer disabled:opacity-50"
            >
              {t('reservation.create')}
            </button>
          </form>
        ) : (
          /* Active reservations list */
          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
            {activeReservations.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-medium">
                {t('reservation.empty')}
              </div>
            ) : (
              activeReservations.map((res) => (
                <div
                  key={res.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {res.tableNumber}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">
                        {formatClock(res.reservedTime)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 font-medium truncate mt-0.5">
                      {res.customerName}
                      {res.customerPhone ? ` • ${res.customerPhone}` : ''}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {t('reservation.guestLabel', { count: res.guestCount })}
                      {res.notes ? ` • ${res.notes}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenTable(res.tableNumber, res.id);
                        onClose();
                      }}
                      title={t('reservation.openTable')}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancelReservation(res.id)}
                      title={t('reservation.cancel')}
                      className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
