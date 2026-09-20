import React, { useState, useEffect } from 'react';
import { Calendar, Plus, ListFilter, User, Phone, Clock, Users, FileText, X, AlertCircle, Trash2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useT, useLocale } from '../lib/i18n/LanguageProvider';
import { formatClock, formatDateClock, maskTimeText, normalizeTimeText } from '../lib/timeFormat';
import type { DBReservation } from '../types';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const MONTH_NAMES: Record<string, string[]> = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const WEEKDAY_NAMES: Record<string, string[]> = {
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

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
  const { locale } = useLocale();
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
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());

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
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const openDatePicker = () => {
    if (reservedDate) {
      const parts = reservedDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        setCalendarYear(parts[0]);
        setCalendarMonth(parts[1] - 1);
      }
    }
    setShowDatePicker(true);
  };

  const applyQuickDateOffset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const nextDate = `${yyyy}-${mm}-${dd}`;
    setReservedDate(nextDate);
    setCalendarYear(yyyy);
    setCalendarMonth(d.getMonth());
  };

  const getDisplayDateText = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const formatted = `${d}.${m}.${y}`;
    if (dateStr === todayStr) {
      return `${t('reservation.today')}, ${formatted}`;
    }
    if (dateStr === tomorrowStr) {
      return `${t('reservation.tomorrow')}, ${formatted}`;
    }
    return formatted;
  };

  const isPrevMonthDisabled =
    calendarYear < now.getFullYear() ||
    (calendarYear === now.getFullYear() && calendarMonth <= now.getMonth());

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    if (calendarMonth === 0) {
      setCalendarYear((prev) => prev - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((prev) => prev + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const applyQuickOffsetMinutes = (addMinutes: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + addMinutes);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0');
    setReservedTime(`${hh}:${mm}`);
  };

  const [selectedHour, selectedMinute] = (reservedTime || '20:00').split(':');

  return (
    <>
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
                  {t('reservation.reservedDate')}
                </label>
                <button
                  type="button"
                  onClick={openDatePicker}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>{getDisplayDateText(reservedDate)}</span>
                  </span>
                  <span className="text-xs text-purple-600 font-semibold">{t('reservation.selectDate')}</span>
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {t('reservation.reservedTime')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>{reservedTime || '20:00'}</span>
                  </span>
                  <span className="text-xs text-purple-600 font-semibold">{t('reservation.selectTime')}</span>
                </button>
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

    {/* Centered Time Picker Dialog */}
    {showTimePicker && (
      <div
        onClick={() => setShowTimePicker(false)}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fadeIn"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-slate-100 animate-scaleUp"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-base">{t('reservation.selectTime')}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTimePicker(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Large Center Display */}
          <div className="flex flex-col items-center justify-center py-3.5 bg-purple-50/80 rounded-2xl border border-purple-100">
            <span className="text-xs font-semibold text-purple-600 mb-1">{t('reservation.reservedTime')}</span>
            <div className="flex items-center gap-2 text-4xl font-extrabold text-slate-900">
              <span className="bg-white px-3.5 py-1.5 rounded-xl shadow-xs border border-purple-200/80 text-purple-700 min-w-[72px] text-center">
                {selectedHour}
              </span>
              <span className="text-purple-400 animate-pulse">:</span>
              <span className="bg-white px-3.5 py-1.5 rounded-xl shadow-xs border border-purple-200/80 text-purple-700 min-w-[72px] text-center">
                {selectedMinute}
              </span>
            </div>

            {/* Quick Offset Chips */}
            <div className="flex items-center gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => applyQuickOffsetMinutes(30)}
                className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
              >
                {t('reservation.quickPlus30m')}
              </button>
              <button
                type="button"
                onClick={() => applyQuickOffsetMinutes(60)}
                className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
              >
                {t('reservation.quickPlus1h')}
              </button>
              <button
                type="button"
                onClick={() => applyQuickOffsetMinutes(120)}
                className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
              >
                {t('reservation.quickPlus2h')}
              </button>
            </div>
          </div>

          {/* Soat tanlash (Hours) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>{t('reservation.hour')}</span>
              <span className="text-[11px] text-slate-400 font-normal">00:00 - 23:00</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-50 rounded-2xl border border-slate-200/70">
              {HOURS.map((h) => {
                const isPast = reservedDate === todayStr && Number(h) < now.getHours();
                const isSelected = selectedHour === h;
                return (
                  <button
                    key={h}
                    type="button"
                    disabled={isPast}
                    onClick={() => setReservedTime(`${h}:${selectedMinute || '00'}`)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm scale-105 ring-2 ring-purple-400'
                        : isPast
                        ? 'text-slate-300 opacity-30 cursor-not-allowed'
                        : 'bg-white text-slate-700 hover:bg-purple-100 hover:text-purple-700 border border-slate-200/50'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daqiqa tanlash (Minutes) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-700">{t('reservation.minute')}</span>
            <div className="grid grid-cols-4 gap-2">
              {['00', '15', '30', '45'].map((m) => {
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
                    onClick={() => setReservedTime(`${selectedHour || '20'}:${m}`)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm scale-102 ring-2 ring-purple-400'
                        : isPast
                        ? 'text-slate-300 opacity-30 cursor-not-allowed bg-slate-100'
                        : 'bg-slate-50 text-slate-700 hover:bg-purple-100 hover:text-purple-700 border border-slate-200'
                    }`}
                  >
                    :{m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={() => setShowTimePicker(false)}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer mt-1"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    )}

    {/* Centered Date Picker Dialog */}
    {showDatePicker && (
      <div
        onClick={() => setShowDatePicker(false)}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fadeIn"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4 border border-slate-100 animate-scaleUp"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-600">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-900 text-base">{t('reservation.selectDate')}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowDatePicker(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => applyQuickDateOffset(0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                reservedDate === todayStr
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              {t('reservation.today')}
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateOffset(1)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                reservedDate === tomorrowStr
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white hover:bg-purple-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              {t('reservation.tomorrow')}
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateOffset(2)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer bg-white hover:bg-purple-50 text-slate-700 border-slate-200 shadow-2xs"
            >
              +2 kun
            </button>
            <button
              type="button"
              onClick={() => applyQuickDateOffset(3)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer bg-white hover:bg-purple-50 text-slate-700 border-slate-200 shadow-2xs"
            >
              +3 kun
            </button>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              disabled={isPrevMonthDisabled}
              onClick={handlePrevMonth}
              className={`p-2 rounded-xl border border-slate-200 transition-colors ${
                isPrevMonthDisabled
                  ? 'text-slate-300 opacity-30 cursor-not-allowed bg-slate-50'
                  : 'hover:bg-slate-100 text-slate-700 cursor-pointer active:scale-95'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-bold text-slate-900 text-sm">
              {(MONTH_NAMES[locale] || MONTH_NAMES.uz)[calendarMonth]} {calendarYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer active:scale-95 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="flex flex-col gap-1.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/70">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center mb-1">
              {(WEEKDAY_NAMES[locale] || WEEKDAY_NAMES.uz).map((wd) => (
                <span key={wd} className="text-[11px] font-bold text-slate-400">
                  {wd}
                </span>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {Array.from({ length: startDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="w-9 h-9" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isPast = dayStr < todayStr;
                const isSelected = dayStr === reservedDate;
                const isToday = dayStr === todayStr;

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPast}
                    onClick={() => setReservedDate(dayStr)}
                    className={`w-9 h-9 mx-auto rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-sm scale-105 ring-2 ring-purple-400'
                        : isPast
                        ? 'text-slate-300 opacity-30 cursor-not-allowed'
                        : isToday
                        ? 'bg-purple-50 text-purple-700 border border-purple-300 font-extrabold hover:bg-purple-100'
                        : 'text-slate-700 hover:bg-purple-100 hover:text-purple-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={() => setShowDatePicker(false)}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer mt-1"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    )}
  </>
  );
};
