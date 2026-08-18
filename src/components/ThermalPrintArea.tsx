import React, { useMemo } from 'react';
import { PenLine } from 'lucide-react';
import { CartItem, DBOrder, DBWaiter } from '../types';

interface ThermalPrintAreaProps {
  selectedArchiveOrder: any | null;
  selectedTable: string;
  activeTableOrder: DBOrder | null;
  activeTableOrderItems: any[];
  cart: CartItem[];
  currentWaiter: DBWaiter | null;
  connectedCafeName: string;
  connectedCafeLogo: string;
  connectedCafeAddress: string;
  connectedCafePhone: string;
  serviceFeePercent: number;
  serviceFee: number;
  discountPercent: number;
  discountAmount: number;
  grandTotal: number;
}

function parseItems(items: any): any[] {
  if (!items) return [];
  try {
    return typeof items === 'string' ? JSON.parse(items) : (items || []);
  } catch { return []; }
}

function ItemRow({ it, idx }: { it: any; idx: number }) {
  const unitPrice = Number(it.price || it.product?.price || it.unitPrice || 0);
  const qty = Number(it.quantity || it.count || 1);
  const total = Number(it.totalPrice || (unitPrice * qty) || 0);
  return (
    <div key={idx} className="flex justify-between items-start border-b border-slate-100 pb-2">
      <div>
        <div className="font-bold text-slate-900 print-text-dark text-xl">{it.product?.name || it.name}</div>
        <div className="text-base font-bold text-slate-800 print-text-dark mt-0.5">{qty} x {unitPrice.toLocaleString()} so'm</div>
        {it.note && (
          <div className="text-sm font-semibold text-amber-900 print-text-dark mt-0.5"><PenLine className="w-3.5 h-3.5 inline mr-0.5" />Izoh: {it.note}</div>
        )}
      </div>
      <span className="font-bold text-slate-900 print-text-dark text-xl whitespace-nowrap">{total.toLocaleString()} so'm</span>
    </div>
  );
}

export const ThermalPrintArea: React.FC<ThermalPrintAreaProps> = React.memo(({
  selectedArchiveOrder,
  selectedTable,
  activeTableOrder,
  activeTableOrderItems,
  cart,
  currentWaiter,
  connectedCafeName,
  connectedCafeLogo,
  connectedCafeAddress,
  connectedCafePhone,
  serviceFeePercent,
  serviceFee,
  discountPercent,
  discountAmount,
  grandTotal,
}) => {
  const archiveItems = useMemo(() => parseItems(selectedArchiveOrder?.items), [selectedArchiveOrder?.items]);

  const currentItems = useMemo(() => [
    ...activeTableOrderItems,
    ...cart.map(c => ({ name: c.product.name, price: Number(c.product.price) || 0, quantity: c.quantity, note: c.note }))
  ], [activeTableOrderItems, cart]);

  if (selectedArchiveOrder) {
    return (
      <div id="thermal-print-area" className="hidden print:block text-slate-900 print-receipt-container font-['Outfit']">
        <div className="w-full bg-white p-1 text-slate-900 space-y-4">
          <div className="text-center border-b-2 border-dashed border-slate-900 pb-3.5 space-y-1.5">
            <div className="flex flex-col items-center justify-center gap-1 pt-1">
              {connectedCafeLogo ? (
                <img src={connectedCafeLogo} alt={connectedCafeName} className="w-12 h-12 object-contain rounded-xl mx-auto" />
              ) : (
                <img src="/favicon.png" alt="OrderPlus" className="w-10 h-10 object-contain mx-auto" />
              )}
              <h2 className="text-2xl font-black tracking-wider uppercase text-slate-900 print-text-dark">
                {connectedCafeName || 'ORDERPLUS'}
              </h2>
            </div>
            {connectedCafeAddress ? (
              <p className="text-xs font-semibold text-slate-700 print-text-dark">{connectedCafeAddress}</p>
            ) : (
              <p className="text-xs font-semibold text-slate-700 print-text-dark">Restoran va Kofe Tarmog&apos;i</p>
            )}
            {connectedCafePhone && (
              <p className="text-xs font-semibold text-slate-600 print-text-dark">Tel: {connectedCafePhone}</p>
            )}
            <div className="text-base font-bold pt-1 text-slate-900 print-text-dark">
              <span>{selectedArchiveOrder.tableNumber}</span>
              <span className="ml-2 text-slate-700 print-text-dark">#{selectedArchiveOrder.id.slice(-6)}</span>
            </div>
            <div className="text-sm font-semibold text-slate-600 print-text-dark">
              {selectedArchiveOrder.closedAt ? new Date(selectedArchiveOrder.closedAt).toLocaleString('uz-UZ') : new Date().toLocaleString('uz-UZ')}
            </div>
            {selectedArchiveOrder.waiterName && (
              <div className="text-sm font-semibold text-slate-700 print-text-dark">
                Ofitsiant: {selectedArchiveOrder.waiterName}
              </div>
            )}
          </div>

          <div className="space-y-3 text-base border-b-2 border-dashed border-slate-900 pb-3.5">
            <div className="flex justify-between font-bold text-sm text-slate-900 print-text-dark uppercase border-b border-slate-200 pb-1.5">
              <span>NOMI X SANOQ</span>
              <span>JAMI</span>
            </div>
            {archiveItems.map((it: any, idx: number) => (
              <ItemRow key={idx} it={it} idx={idx} />
            ))}
          </div>

          <div className="space-y-2 text-base border-b-2 border-dashed border-slate-900 pb-3.5">
            {selectedArchiveOrder.discount > 0 && (
              <div className="flex justify-between font-semibold text-slate-800 print-text-dark">
                <span>Chegirma:</span>
                <span className="whitespace-nowrap">-{(selectedArchiveOrder.discount || 0).toLocaleString()} so'm</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-slate-800 print-text-dark">
              <span>Xizmat Haqi ({serviceFeePercent}%):</span>
              <span className="whitespace-nowrap">{(selectedArchiveOrder.serviceFee || 0).toLocaleString()} so'm</span>
            </div>
            <div className="flex justify-between font-bold text-2xl pt-1 text-slate-900 print-text-dark">
              <span>JAMI:</span>
              <span className="whitespace-nowrap">{(selectedArchiveOrder.total || 0).toLocaleString()} so'm</span>
            </div>
          </div>

          <div className="text-center text-sm font-semibold text-slate-800 print-text-dark pt-1.5">
            Tashrifingiz uchun rahmat!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="thermal-print-area" className="hidden print:block text-slate-900 print-receipt-container font-['Outfit']">
      <div className="w-full bg-white p-1 text-slate-900 space-y-4">
        <div className="text-center border-b-2 border-dashed border-slate-900 pb-3.5 space-y-1.5">
          <div className="flex items-center justify-center gap-2 pt-1">
            <img src="/favicon.png" alt="OrderPlus" className="w-10 h-10 object-contain" />
            <h2 className="text-3xl font-bold tracking-wider uppercase text-slate-900 print-text-dark">ORDER<span>PLUS</span></h2>
          </div>
          <p className="text-sm font-semibold text-slate-700 print-text-dark">Restoran va Kofe Tarmog&apos;i</p>
          <div className="text-base font-bold pt-1 text-slate-900 print-text-dark">
            <span>{selectedTable}</span>
            {activeTableOrder && <span className="ml-2 text-slate-700 print-text-dark">#{activeTableOrder.id.slice(-6)}</span>}
          </div>
          <div className="text-sm font-semibold text-slate-600 print-text-dark">
            {new Date().toLocaleString('uz-UZ')}
          </div>
          {currentWaiter && (
            <div className="text-sm font-semibold text-slate-700 print-text-dark">
              Ofitsiant: {currentWaiter.name}
            </div>
          )}
        </div>

        <div className="space-y-3 text-base border-b-2 border-dashed border-slate-900 pb-3.5">
          <div className="flex justify-between font-bold text-sm text-slate-900 print-text-dark uppercase border-b border-slate-200 pb-1.5">
            <span>NOMI X SANOQ</span>
            <span>JAMI</span>
          </div>
          {currentItems.map((it: any, idx: number) => (
            <ItemRow key={idx} it={it} idx={idx} />
          ))}
        </div>

        <div className="space-y-2 text-base border-b-2 border-dashed border-slate-900 pb-3.5">
          {discountAmount > 0 && (
            <div className="flex justify-between font-semibold text-slate-800 print-text-dark">
              <span>Chegirma ({discountPercent}%):</span>
              <span className="whitespace-nowrap">-{discountAmount.toLocaleString()} so'm</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-slate-800 print-text-dark">
            <span>Xizmat Haqi ({serviceFeePercent}%):</span>
            <span className="whitespace-nowrap">{serviceFee.toLocaleString()} so'm</span>
          </div>
          <div className="flex justify-between font-bold text-2xl pt-1 text-slate-900 print-text-dark">
            <span>JAMI:</span>
            <span className="whitespace-nowrap">{grandTotal.toLocaleString()} so'm</span>
          </div>
        </div>

        <div className="text-center text-sm font-semibold text-slate-800 print-text-dark pt-1.5">
          Tashrifingiz uchun rahmat!
        </div>
      </div>
    </div>
  );
});
