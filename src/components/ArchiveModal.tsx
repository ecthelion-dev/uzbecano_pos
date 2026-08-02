import React from 'react';
import { Receipt, Search, ArrowLeft, Printer, ChevronRight } from 'lucide-react';
import { DBOrder } from '../types';

interface ArchiveModalProps {
  show: boolean;
  orders: DBOrder[];
  archiveSearch: string;
  selectedArchiveOrder: DBOrder | null;
  onSearchChange: (q: string) => void;
  onSelectArchiveOrder: (ord: DBOrder | null) => void;
  onRefundOrder?: (ord: DBOrder, reason: string) => void;
  onClose: () => void;
  onPrint: () => void;
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({
  show,
  orders,
  archiveSearch,
  selectedArchiveOrder,
  onSearchChange,
  onSelectArchiveOrder,
  onRefundOrder,
  onClose,
  onPrint,
}) => {
  const [showReasonSelect, setShowReasonSelect] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState('Mijoz rad etdi');

  if (!show) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-4 border border-slate-200 max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Arxiv Cheklar</h3>
              <p className="text-[11px] text-slate-500 font-medium">Barcha yopilgan to'lovlar va cheklar tarixi</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onSelectArchiveOrder(null);
            }}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 cursor-pointer"
          >
            ×
          </button>
        </div>

        {selectedArchiveOrder ? (
          <div className="space-y-4 overflow-y-auto pr-1">
            <button
              onClick={() => onSelectArchiveOrder(null)}
              className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Ro'yxatga qaytish
            </button>

            <div className="bg-amber-50/40 p-6 rounded-2xl border border-amber-200/60 font-mono text-sm text-slate-800 space-y-3.5 shadow-inner max-w-md mx-auto">
              <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                <h4 className="font-black text-xl text-slate-900 tracking-wider uppercase">UZBECANO RESTORAN</h4>
                <p className="text-xs text-slate-600 font-medium">Yopilgan Chek: #{selectedArchiveOrder.id.slice(-6)}</p>
                {selectedArchiveOrder.closedAt && (
                  <p className="text-xs text-slate-600 font-medium">Sana: {new Date(selectedArchiveOrder.closedAt).toLocaleString('uz-UZ')}</p>
                )}
                {selectedArchiveOrder.waiterName && (
                  <p className="text-xs text-slate-900 font-extrabold mt-1">Offitsiant: {selectedArchiveOrder.waiterName}</p>
                )}
              </div>

              <div className="flex justify-between text-xs font-bold text-slate-800 border-b border-dashed border-slate-400 pb-2">
                <span className="font-extrabold text-sm">{selectedArchiveOrder.tableNumber}</span>
                {selectedArchiveOrder.refunded ? (
                  <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded font-bold text-xs">QAYTARILGAN</span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-bold text-xs">TO'LANGAN</span>
                )}
              </div>

              {selectedArchiveOrder.refunded && selectedArchiveOrder.refundReason && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-xs text-rose-800 font-bold text-center">
                  ⚠️ Qaytarish sababi: {selectedArchiveOrder.refundReason}
                </div>
              )}

              <div className="space-y-2 border-b border-dashed border-slate-400 pb-3 pt-1 max-h-56 overflow-y-auto pr-1">
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
                      <div key={idx} className="flex justify-between items-start text-xs pb-1 border-b border-slate-100 last:border-b-0">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                          <p className="text-xs text-slate-600 font-medium">{item.quantity} x {(item.price || 0).toLocaleString()} so'm</p>
                          {item.note && <p className="text-xs font-bold text-amber-900 mt-0.5">✍️ {item.note}</p>}
                        </div>
                        <span className="font-black text-slate-900 text-sm">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} so'm</span>
                      </div>
                    ))
                  );
                })()}
              </div>

              <div className="flex justify-between font-black text-base text-slate-900 pt-1">
                <span>JAMI TO'LOV:</span>
                <span className="text-[#0F172A] text-lg">{(selectedArchiveOrder.total || 0).toLocaleString()} so'm</span>
              </div>
            </div>

            {showReasonSelect && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl max-w-md mx-auto space-y-3">
                <p className="font-extrabold text-xs text-rose-900 text-center">Qaytarish sababini tanlang:</p>
                <div className="grid grid-cols-3 gap-2">
                  {['Mijoz rad etdi', 'Sifat yetarsiz', 'Xato to\'lov'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setRefundReason(reason)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        refundReason === reason
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (onRefundOrder) onRefundOrder(selectedArchiveOrder, refundReason);
                      setShowReasonSelect(false);
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 rounded-xl text-xs cursor-pointer shadow-sm"
                  >
                    TASDIQLASH (ADMIN PIN)
                  </button>
                  <button
                    onClick={() => setShowReasonSelect(false)}
                    className="px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-xl text-xs cursor-pointer"
                  >
                    BEKOR QILISH
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={onPrint}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> CHEKNI CHOP ETISH
              </button>
              {!selectedArchiveOrder.refunded && onRefundOrder && !showReasonSelect && (
                <button
                  onClick={() => setShowReasonSelect(true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  ↩️ QAYTARISH (VOZVRAT)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-hidden flex-1">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Stol raqami yoki chek ID bo'yicha qidiruv..."
                value={archiveSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="overflow-y-auto space-y-2 max-h-[50vh] pr-1">
              {(() => {
                const served = orders.filter((o: any) => o.status === 'served');
                const filtered = served.filter((o: any) => {
                  if (!archiveSearch.trim()) return true;
                  const q = archiveSearch.toLowerCase();
                  return o.tableNumber.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-xs">Arxivda yopilgan cheklar topilmadi</p>
                    </div>
                  );
                }

                return filtered.map((ord: any) => {
                  let itemsCount = 0;
                  try {
                    const parsed = typeof ord.items === 'string' ? JSON.parse(ord.items) : ord.items;
                    if (Array.isArray(parsed)) itemsCount = parsed.length;
                  } catch {}

                  return (
                    <div
                      key={ord.id}
                      onClick={() => onSelectArchiveOrder(ord)}
                      className="bg-slate-50 hover:bg-orange-50/50 border border-slate-200 hover:border-orange-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">{ord.tableNumber}</span>
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Yopilgan</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Chek ID: #{ord.id.slice(-6)}{ord.waiterName ? ` • Offitsiant: ${ord.waiterName}` : ''} • {itemsCount} ta taom
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-black text-sm text-[#0F172A]">{(ord.total || 0).toLocaleString()} som</p>
                          {ord.closedAt && (
                            <p className="text-[10px] text-slate-400">
                              {new Date(ord.closedAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
