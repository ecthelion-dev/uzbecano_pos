import React from 'react';
import { Sparkles, Printer, Clock } from 'lucide-react';
import { DBOrder, CashTransaction, WaiterShift } from '../types';

interface ShiftReportModalProps {
  show: boolean;
  orders: DBOrder[];
  cashTransactions?: CashTransaction[];
  waiterShifts?: WaiterShift[];
  onClose: () => void;
  onPrint: () => void;
}

export const ShiftReportModal: React.FC<ShiftReportModalProps> = ({
  show,
  orders,
  cashTransactions = [],
  waiterShifts = [],
  onClose,
  onPrint,
}) => {
  if (!show) return null;

  const servedOrders = orders.filter((o) => o.status === 'served');
  const grossRevenue = servedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const refundedOrders = servedOrders.filter((o) => o.refunded);
  const totalRefunds = refundedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const netRevenue = grossRevenue - totalRefunds;

  const totalKirim = cashTransactions.filter(t => t.type === 'kirim').reduce((sum, t) => sum + t.amount, 0);
  const totalChiqim = cashTransactions.filter(t => t.type === 'chiqim').reduce((sum, t) => sum + t.amount, 0);

  const waiterStats: Record<string, { count: number; total: number }> = {};
  servedOrders.forEach((o) => {
    if (o.refunded) return;
    const w = o.waiterName || "Noma'lum";
    if (!waiterStats[w]) waiterStats[w] = { count: 0, total: 0 };
    waiterStats[w].count += 1;
    waiterStats[w].total += o.total || 0;
  });

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 border border-slate-200 max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Kassa Hisoboti (Z-Report)</h3>
              <p className="text-[11px] text-slate-500 font-medium">Bugungi kunlik kassa va ofitsiantlar hisoboti</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 cursor-pointer">×</button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
              <p className="text-[11px] font-semibold text-orange-700">Sof Tushum</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{netRevenue.toLocaleString()} so'm</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
              <p className="text-[11px] font-semibold text-rose-700">Jami Qaytarishlar</p>
              <p className="text-lg font-black text-rose-900 mt-0.5">{totalRefunds.toLocaleString()} so'm</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <p className="text-[11px] font-semibold text-slate-500">Stollar Soni</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{servedOrders.length} ta</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200 p-3 rounded-2xl">
            <div>
              <p className="text-[10px] text-slate-500 font-bold">Kassa Kirim (+):</p>
              <p className="text-sm font-black text-emerald-700">+{totalKirim.toLocaleString()} so'm</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold">Kassa Chiqim (-):</p>
              <p className="text-sm font-black text-rose-700">-{totalChiqim.toLocaleString()} so'm</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Ofitsiantlar Smenasi va Ish Vaqti</h4>
            {waiterShifts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Smena ma'lumotlari mavjud emas</p>
            ) : (
              waiterShifts.map((s) => {
                const inTime = new Date(s.clockIn).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
                const outTime = s.clockOut ? new Date(s.clockOut).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : 'Davom etmoqda';
                const mins = s.durationMinutes || (s.clockOut ? Math.round((new Date(s.clockOut).getTime() - new Date(s.clockIn).getTime()) / 60000) : 0);
                const hrs = Math.floor(mins / 60);
                const rMins = mins % 60;

                return (
                  <div key={s.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900">👨‍🍳 {s.waiterName}</span>
                      <p className="text-[10px] text-slate-500">
                        {inTime} ➔ {outTime}
                      </p>
                    </div>
                    <span className="font-extrabold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {s.clockOut ? `${hrs}s ${rMins}m` : '🟢 Smenada'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={onPrint}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Z-REPORT CHOP ETISH
          </button>
        </div>
      </div>
    </div>
  );
};
