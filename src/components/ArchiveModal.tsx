import React, { useState, useMemo } from 'react';
import { Receipt, Search, ArrowLeft, Printer, ChevronRight, Calendar, Clock, RotateCcw, X, Utensils, AlertTriangle, PenLine, User, Banknote, CreditCard, Shuffle } from 'lucide-react';
import { DBOrder, DBWaiter } from '../types';

interface ArchiveModalProps {
  show: boolean;
  orders: DBOrder[];
  archiveSearch: string;
  selectedArchiveOrder: DBOrder | null;
  currentWaiter?: DBWaiter | null;
  cafeName?: string;
  cafeLogo?: string;
  cafeAddress?: string;
  cafePhone?: string;
  receiptHeader?: string;
  onSearchChange: (q: string) => void;
  onSelectArchiveOrder: (ord: DBOrder | null) => void;
  onRefundOrder?: (ord: DBOrder, reason: string) => void;
  /** Tanlangan davrdagi sotuvlarni bitta hisobot qilib chop etadi. */
  onPrintPeriod?: (orders: DBOrder[], from: Date | null, to: Date | null) => void;
  onClose: () => void;
  onPrint: () => void;
}

type TimePreset = 'all' | 'today' | 'yesterday' | 'custom';

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  show,
  orders,
  archiveSearch,
  selectedArchiveOrder,
  currentWaiter,
  cafeName,
  cafeLogo,
  cafeAddress,
  cafePhone,
  receiptHeader,
  onSearchChange,
  onSelectArchiveOrder,
  onRefundOrder,
  onPrintPeriod,
  onClose,
  onPrint,
}) => {
  const [showReasonSelect, setShowReasonSelect] = useState(false);
  const [refundReason, setRefundReason] = useState('Mijoz rad etdi');

  // Time & Date Filtering States
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState(todayStr);
  const [endTime, setEndTime] = useState('23:59');

  // Filtered orders list and totals
  const { filteredOrders, totalSum, cashTotal, cardTotal, refundedTotal, refundedCount } = useMemo(() => {
    const served = orders.filter((o: any) => o.status === 'served');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart.getTime() - 1);

    const filtered = served.filter((ord: any) => {
      // 1. Text search filter
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase();
        const matchTable = (ord.tableNumber || '').toLowerCase().includes(q);
        const matchId = (ord.id || '').toLowerCase().includes(q);
        const matchWaiter = (ord.closedBy || ord.waiterName || '').toLowerCase().includes(q);
        if (!matchTable && !matchId && !matchWaiter) return false;
      }

      // 2. Date & Time filter
      const dateVal = ord.closedAt ? new Date(ord.closedAt) : (ord.createdAt ? new Date(ord.createdAt) : null);
      if (!dateVal || isNaN(dateVal.getTime())) return timePreset === 'all';

      if (timePreset === 'today') {
        return dateVal >= todayStart && dateVal <= todayEnd;
      } else if (timePreset === 'yesterday') {
        return dateVal >= yesterdayStart && dateVal <= yesterdayEnd;
      } else if (timePreset === 'custom') {
        const start = new Date(`${startDate}T${startTime || '00:00'}:00`);
        const end = new Date(`${endDate}T${endTime || '23:59'}:59`);
        return dateVal >= start && dateVal <= end;
      }
      return true; // 'all'
    });

    filtered.sort((a: any, b: any) => {
      const timeA = a.closedAt ? new Date(a.closedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.closedAt ? new Date(b.closedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });

    let cash = 0;
    let card = 0;
    let refunded = 0;
    let refundedQty = 0;

    // Qaytarilgan chek kassada pul qoldirmaydi — uni tushumga qo'shsak,
    // ekrandagi "Jami" haqiqiy puldan katta bo'lib chiqadi.
    filtered.forEach((ord: any) => {
      const tot = ord.total || 0;
      if (ord.refunded) {
        refunded += tot;
        refundedQty += 1;
        return;
      }
      if (ord.paymentMethod === 'aralash') {
        cash += ord.cashAmount || 0;
        card += ord.cardAmount || 0;
      } else if (ord.paymentMethod === 'karta') {
        card += tot;
      } else {
        cash += tot;
      }
    });

    return {
      filteredOrders: filtered,
      totalSum: cash + card,
      cashTotal: cash,
      cardTotal: card,
      refundedTotal: refunded,
      refundedCount: refundedQty,
    };
  }, [orders, archiveSearch, timePreset, startDate, startTime, endDate, endTime]);

  // Hisobot sarlavhasidagi "Boshlanish / Tugash". 'all' uchun chegara yo'q,
  // shuning uchun mavjud cheklarning eng eski va eng yangisini olamiz.
  const [periodFrom, periodTo] = useMemo<[Date | null, Date | null]>(() => {
    const now = new Date();
    if (timePreset === 'today') {
      return [new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0), now];
    }
    if (timePreset === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      return [start, end];
    }
    if (timePreset === 'custom') {
      return [
        new Date(`${startDate}T${startTime || '00:00'}:00`),
        new Date(`${endDate}T${endTime || '23:59'}:59`),
      ];
    }
    const stamps = filteredOrders
      .map((o: any) => (o.closedAt ? new Date(o.closedAt) : (o.createdAt ? new Date(o.createdAt) : null)))
      .filter((d): d is Date => !!d && !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    return stamps.length ? [stamps[0], stamps[stamps.length - 1]] : [null, null];
  }, [timePreset, startDate, startTime, endDate, endTime, filteredOrders]);

  if (!show) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-6 w-full sm:w-[94vw] max-w-6xl h-[92dvh] sm:h-[90vh] shadow-2xl flex flex-col gap-3 sm:gap-4 border border-slate-200 overflow-hidden"
      >
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 sm:p-2.5 rounded-2xl text-orange-600 shadow-sm shrink-0">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-xl text-slate-900 tracking-tight">Arxiv Cheklar</h3>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Barcha yopilgan to'lovlar va cheklar tarixi</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onSelectArchiveOrder(null);
            }}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedArchiveOrder ? (
          /* SINGLE RECEIPT DETAIL VIEW */
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
            <button
              onClick={() => onSelectArchiveOrder(null)}
              className="flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 cursor-pointer bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl border border-orange-200 transition-colors w-fit shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" /> Ro'yxatga qaytish
            </button>

            <div id="printable-receipt" className="bg-amber-50/50 p-4 sm:p-6 rounded-3xl border-2 border-amber-200/80 font-mono text-sm text-slate-800 space-y-3.5 shadow-sm max-w-lg mx-auto">
              <div className="text-center space-y-1.5 border-b-2 border-dashed border-slate-400 pb-3">
                <div className="flex flex-col items-center justify-center gap-1">
                  {cafeLogo ? (
                    <img src={cafeLogo} alt={cafeName} className="w-12 h-12 rounded-xl object-contain mx-auto" />
                  ) : (
                    <img src="/favicon.png" alt="OrderPlus" className="w-10 h-10 object-contain mx-auto" />
                  )}
                  <h4 className="font-bold text-2xl text-slate-900 tracking-wider uppercase">{cafeName || 'ORDERPLUS RESTORAN'}</h4>
                </div>
                {receiptHeader && (
                  <p className="text-xs text-orange-600 font-bold">{receiptHeader}</p>
                )}
                {cafeAddress && (
                  <p className="text-xs text-slate-600 font-medium">{cafeAddress}</p>
                )}
                {cafePhone && (
                  <p className="text-xs text-slate-600 font-medium">{cafePhone.startsWith('Tel') ? cafePhone : `Tel: ${cafePhone}`}</p>
                )}
                <p className="text-xs text-slate-600 font-semibold">Yopilgan Chek: #{selectedArchiveOrder.id.slice(-6)}</p>
                {selectedArchiveOrder.closedAt && (
                  <p className="text-xs text-slate-600 font-medium">Sana: {new Date(selectedArchiveOrder.closedAt).toLocaleString('uz-UZ')}</p>
                )}
                <p className="text-xs text-slate-900 font-bold mt-0.5">
                  {/* closedBy — serverda qayd etilgan, to'lovni qabul qilgan
                      xodim. Ilgari bu yerda `currentWaiter` zaxira sifatida
                      turardi va har bir eski chekka hozir kassada turgan
                      odamning nomini yozib qo'yardi. Ma'lum bo'lmasa ochiq
                      aytiladi, taxmin qilinmaydi. */}
                  Offitsiant: {selectedArchiveOrder.closedBy || selectedArchiveOrder.waiterName || "Noma'lum"}
                </p>
              </div>

              <div className="flex justify-between items-center text-sm font-semibold text-slate-800 border-b-2 border-dashed border-slate-400 pb-2.5">
                <span className="font-bold text-lg text-slate-900">{selectedArchiveOrder.tableNumber}</span>
                {selectedArchiveOrder.refunded ? (
                  <span className="bg-rose-100 text-rose-800 px-3 py-0.5 rounded-xl font-bold text-xs">QAYTARILGAN</span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-0.5 rounded-xl font-bold text-xs">TO'LANGAN</span>
                )}
              </div>

              {selectedArchiveOrder.refunded && selectedArchiveOrder.refundReason && (
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-2xl text-xs text-rose-800 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Qaytarish sababi: {selectedArchiveOrder.refundReason}
                  </div>
              )}

              <div className="space-y-2 border-b-2 border-dashed border-slate-400 pb-3 pt-1 max-h-56 overflow-y-auto pr-1">
                {(() => {
                  let items: any[] = [];
                  try {
                    items = typeof selectedArchiveOrder.items === 'string' ? JSON.parse(selectedArchiveOrder.items) : (selectedArchiveOrder.items || []);
                  } catch {
                    items = [];
                  }

                  return items.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-2">Taomlar ma'lumoti yo'q</p>
                  ) : (
                    items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start text-xs pb-1.5 border-b border-slate-100 last:border-b-0">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                          <p className="text-[11px] text-slate-600 font-medium">{item.quantity} x {(item.price || 0).toLocaleString()} so'm</p>
                          {item.note && <p className="text-[11px] font-semibold text-amber-900 mt-0.5"><PenLine className="w-3 h-3 inline mr-0.5" />{item.note}</p>}
                        </div>
                        <span className="font-bold text-slate-900 text-sm">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} so'm</span>
                      </div>
                    ))
                  );
                })()}
              </div>

              <div className="space-y-1.5 border-t-2 border-dashed border-slate-400 pt-2.5 mt-1 text-xs font-medium">
                <div className="flex justify-between font-bold text-base text-slate-900 pb-1">
                  <span>JAMI TO'LOV:</span>
                  <span className="text-xl text-slate-950 font-bold">{(selectedArchiveOrder.total || 0).toLocaleString()} so'm</span>
                </div>
                {selectedArchiveOrder.paymentMethod === 'aralash' ? (
                  <>
                    <div className="flex justify-between text-slate-700 text-xs">
                      <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> Naqd:</span>
                      <span className="font-semibold">{(selectedArchiveOrder.cashAmount || 0).toLocaleString()} so'm</span>
                    </div>
                    <div className="flex justify-between text-slate-700 text-xs">
                      <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> Karta:</span>
                      <span className="font-semibold">{(selectedArchiveOrder.cardAmount || 0).toLocaleString()} so'm</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-700 text-xs">
                    <span>To'lov turi:</span>
                    <span className="font-bold uppercase flex items-center gap-1">
                      {selectedArchiveOrder.paymentMethod === 'karta'
                        ? <><CreditCard className="w-3.5 h-3.5" /> Karta</>
                        : <><Banknote className="w-3.5 h-3.5" /> Naqd</>}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {showReasonSelect && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-3xl max-w-lg mx-auto space-y-3 shadow-sm">
                <p className="font-bold text-sm text-rose-900 text-center">Qaytarish sababini tanlang:</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {['Mijoz rad etdi', 'Sifat yetarsiz', 'Xato to\'lov'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setRefundReason(reason)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        refundReason === reason
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      if (onRefundOrder) onRefundOrder(selectedArchiveOrder, refundReason);
                      setShowReasonSelect(false);
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 sm:py-2.5 px-2 rounded-xl text-xs cursor-pointer shadow-md transition-all active:scale-98"
                  >
                    TASDIQLASH (ADMIN PIN)
                  </button>
                  <button
                    onClick={() => setShowReasonSelect(false)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 sm:py-2.5 px-2 rounded-xl text-xs cursor-pointer transition-all active:scale-98"
                  >
                    BEKOR QILISH
                  </button>
                </div>
              </div>
            )}

            <div
              className={`grid ${
                !selectedArchiveOrder.refunded && onRefundOrder && !showReasonSelect
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
              } gap-2.5 pt-1 max-w-lg mx-auto w-full`}
            >
              <button
                onClick={onPrint}
                className="h-11 px-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-sm shadow-orange-500/25 transition-all cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>
                  <span className="hidden sm:inline">CHEKNI </span>CHOP ETISH
                </span>
              </button>
              {!selectedArchiveOrder.refunded && onRefundOrder && !showReasonSelect && (
                <button
                  onClick={() => setShowReasonSelect(true)}
                  className="h-11 px-4 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 font-bold rounded-xl text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer active:scale-98"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>
                    QAYTARISH<span className="hidden sm:inline"> (VOZVRAT)</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ARCHIVE LIST & CONTROLS VIEW */
          <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            
            {/* Top Row: Search Input + Time Presets */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="relative flex-1 w-full min-w-0 sm:min-w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Stol raqami, chek ID yoki offitsiant..."
                  value={archiveSearch}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {/* Time Presets Toolbar */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto sm:shrink-0 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Barchasi' },
                  { id: 'today', label: 'Bugun' },
                  { id: 'yesterday', label: 'Kecha' },
                  { id: 'custom', label: 'Oraliq tanlash' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setTimePreset(preset.id as TimePreset)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${
                      timePreset === preset.id
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date & Time Range Pickers (only when custom active) */}
            {timePreset === 'custom' && (
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 text-xs shrink-0 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 flex-1 w-full min-w-0 sm:min-w-[240px]">
                  <span className="font-semibold text-slate-600 text-xs shrink-0">Boshlanish:</span>
                  <div className="flex items-center gap-1.5 min-w-0 w-full sm:flex-1">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-2 sm:py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 shadow-2xs min-w-0 flex-1"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-2 sm:py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 shadow-2xs min-w-0 w-[96px] sm:w-[86px] shrink-0"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 flex-1 w-full min-w-0 sm:min-w-[240px]">
                  <span className="font-semibold text-slate-600 text-xs shrink-0">Tugash:</span>
                  <div className="flex items-center gap-1.5 min-w-0 w-full sm:flex-1">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-2 sm:py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 shadow-2xs min-w-0 flex-1"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-2 sm:py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 shadow-2xs min-w-0 w-[96px] sm:w-[86px] shrink-0"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                    setStartTime('00:00');
                    setEndTime('23:59');
                  }}
                  className="self-end sm:self-auto shrink-0 h-9 sm:h-auto px-3 sm:p-1.5 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 cursor-pointer shadow-2xs active:scale-95 transition-transform"
                  title="Qayta o'rnatish"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="sm:hidden font-semibold text-xs">Bugunga qaytarish</span>
                </button>
              </div>
            )}

            {/* Quick Summary Bar */}
            <div className="bg-slate-50 border border-slate-200/90 px-3 sm:px-4 py-2 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-medium shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Topildi:</span>
                <span className="bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 font-bold text-slate-900 text-xs shadow-2xs">
                  {filteredOrders.length} ta chek
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-xs">
                <span>Naqd: <strong className="text-slate-900 font-semibold">{cashTotal.toLocaleString()} so'm</strong></span>
                <span>•</span>
                <span>Karta: <strong className="text-slate-900 font-semibold">{cardTotal.toLocaleString()} so'm</strong></span>
                {refundedCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600">
                      Qaytarilgan ({refundedCount} ta):{' '}
                      <strong className="font-semibold">−{refundedTotal.toLocaleString()} so'm</strong>
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="bg-orange-500 text-white px-3 py-1 rounded-lg font-bold text-xs shadow-xs">
                  Jami: {totalSum.toLocaleString()} so'm
                </span>
                {onPrintPeriod && (
                  <button
                    onClick={() => onPrintPeriod(filteredOrders, periodFrom, periodTo)}
                    disabled={filteredOrders.length === 0}
                    title="Tanlangan davrdagi barcha cheklarni bitta hisobot qilib chop etish"
                    className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 border border-slate-200 font-bold text-xs shadow-2xs cursor-pointer active:scale-95 transition-transform"
                  >
                    <Printer className="w-3.5 h-3.5 text-orange-500" />
                    <span>Hisobotni chop etish</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Orders Scroll Area (Takes All Remaining Height) */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1.5">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30 text-orange-500" />
                  <p className="font-semibold text-sm text-slate-700">Tanlangan vaqt oralig'ida cheklar topilmadi</p>
                  <p className="text-xs text-slate-400 mt-0.5">Boshqa sana yoki vaqt oralig'ini tanlab ko'ring</p>
                </div>
              ) : (
                filteredOrders.map((ord: any) => {
                  let itemsCount = 0;
                  try {
                    const parsed = typeof ord.items === 'string' ? JSON.parse(ord.items) : ord.items;
                    if (Array.isArray(parsed)) itemsCount = parsed.length;
                  } catch {}

                  const orderDate = ord.closedAt ? new Date(ord.closedAt) : (ord.createdAt ? new Date(ord.createdAt) : null);

                  return (
                    <div
                      key={ord.id}
                      onClick={() => onSelectArchiveOrder(ord)}
                      className="bg-white hover:bg-orange-50/50 border border-slate-200 hover:border-orange-300 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-all shadow-2xs hover:shadow-xs group active:scale-[0.995]"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                          <span className="font-bold text-base text-slate-900 group-hover:text-orange-600 transition-colors">
                            {ord.tableNumber}
                          </span>
                          {ord.refunded ? (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                              Qaytarilgan
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                              Yopilgan
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-400">
                            #{ord.id.slice(-6)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-2 sm:gap-2.5 flex-wrap">
                          {(ord.closedBy || ord.waiterName) && <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{ord.closedBy || ord.waiterName}</span>}
                          <span className="flex items-center gap-0.5"><Utensils className="w-3 h-3" />{itemsCount} ta taom</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            {ord.paymentMethod === 'karta'
                              ? <span className="flex items-center gap-0.5"><CreditCard className="w-3 h-3" /> Karta</span>
                              : ord.paymentMethod === 'aralash'
                              ? <span className="flex items-center gap-0.5"><Shuffle className="w-3 h-3" /> Aralash</span>
                              : <span className="flex items-center gap-0.5"><Banknote className="w-3 h-3" /> Naqd</span>}
                          </span>
                        </p>
                      </div>

                      <div className="text-left sm:text-right flex items-center justify-between sm:justify-end gap-3.5 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                        <div>
                          <p className="font-bold text-base text-slate-900 group-hover:text-orange-600 transition-colors">
                            {(ord.total || 0).toLocaleString()} so'm
                          </p>
                          {orderDate && (
                            <p className="text-xs font-medium text-slate-400 flex items-center justify-start sm:justify-end gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {orderDate.toLocaleDateString('uz-UZ')} {orderDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
