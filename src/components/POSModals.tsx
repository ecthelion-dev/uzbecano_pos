import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';
import { ToastNotification } from './ToastNotification';
import { KitchenPrintArea } from './KitchenPrintArea';
import { ReceiptPreviewModal } from './ReceiptPreviewModal';
import { ArchiveModal } from './ArchiveModal';
import { ShiftReportModal } from './ShiftReportModal';
import { AdminPinModal } from './AdminPinModal';
import { TableMoveModal } from './TableMoveModal';
import { ProductModifierModal } from './ProductModifierModal';
import { PaymentModal } from './PaymentModal';
import { UnsavedCartModal } from './UnsavedCartModal';
import { PrinterSettingsModal } from './PrinterSettingsModal';
import { ReservationModal } from './ReservationModal';
import { ReservationDetailsModal } from './ReservationDetailsModal';
import { ArchivePeriodPrintArea, type PeriodPrintData } from './ArchivePeriodPrintArea';
import type {
  DBProduct,
  CartItem,
  DBOrder,
  DBWaiter,
  KitchenSlipData,
  DBReservation,
  DebtCustomerInfo,
  ProductVariant,
} from '../types';
import type { SyncVerdict } from '../lib/syncHealth';

export interface POSModalsProps {
  // Receipt Preview
  showReceiptPreview: boolean;
  onCloseReceiptPreview: () => void;
  onPrintReceiptPreview: () => void;
  selectedTable: string;
  currentWaiter: DBWaiter | null;
  activeTableOrderItems: any[];
  cart: CartItem[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  serviceFee: number;
  grandTotal: number;
  cafeName: string;
  cafeLogo: string;
  cafeAddress: string;
  cafePhone: string;

  // Archive
  showArchiveModal: boolean;
  onCloseArchiveModal: () => void;
  orders: DBOrder[];
  archiveSearch: string;
  onSearchChange: (val: string) => void;
  selectedArchiveOrder: DBOrder | null;
  onSelectArchiveOrder: (ord: DBOrder | null) => void;
  onRefundOrder: (ord: DBOrder, reason: string) => void;
  onPayDebt: (ord: DBOrder, amount: number, method: 'naqd' | 'karta', note?: string) => Promise<boolean | void> | void;
  onPrintPeriod: (periodOrders: DBOrder[], from: Date | null, to: Date | null) => void;
  onPrintArchiveOrder: () => void;

  // Kitchen print
  kitchenSlipData: KitchenSlipData | null;

  // Shift Report
  showShiftReport: boolean;
  onCloseShiftReport: () => void;
  shiftBacklog?: SyncVerdict;
  onRetryFailedSync: () => void;
  onPrintShiftReport: () => void;

  // Product Modifier
  selectedModifierProduct: DBProduct | null;
  onCloseModifier: () => void;
  onAddToCartFromModifier: (modProd: DBProduct, note?: string, variant?: ProductVariant, takeaway?: boolean) => void;

  // Error Banner
  apiError: string | null;
  onDismissApiError: () => void;

  // Admin PIN
  showAdminPinModal: boolean;
  adminPinCafeId: string;
  adminPinTitle: string;
  onConfirmAdminPin: (approvalToken?: string) => void;
  onCloseAdminPin: () => void;

  // Table Move
  showTableMoveModal: boolean;
  onCloseTableMove: () => void;
  tableDefs: { number: string; area: string }[];
  onMoveTable: (sourceTable: string, targetTable: string, isMerge: boolean) => void;

  // Reservations
  showReservationModal: boolean;
  onCloseReservationModal: () => void;
  reservations: DBReservation[];
  reservationDefaultTable?: string;
  onCreateReservation: (data: {
    tableNumber: string;
    customerName: string;
    customerPhone?: string;
    guestCount: number;
    reservedTime: string;
    notes?: string;
  }) => Promise<boolean>;
  onCancelReservation: (reservationId: string) => void | Promise<any>;
  onOpenReservedTable: (tableNumber: string, reservationId: string) => void;

  showReservationDetailsModal: boolean;
  onCloseReservationDetailsModal: () => void;
  selectedReservation: DBReservation | null;

  // Payment
  showPaymentModal: boolean;
  onClosePaymentModal: () => void;
  onConfirmPayment: (cash: number, card: number) => void;
  onDebtPayment: (debtInfo: DebtCustomerInfo) => void;

  // Unsaved Cart
  showUnsavedCartModal: boolean;
  onCloseUnsavedCartModal: () => void;
  onConfirmUnsavedCart: () => void;
  draftSubtotal: number;

  // Toast
  toastMessage: string | null;

  // Period Print Area
  periodPrint: PeriodPrintData | null;

  // Storage Blocking Error
  storageBlockingError: string | null;
  onDismissStorageBlockingError: () => void;

  // Thermal Printer Settings
  showPrinterModal: boolean;
  onClosePrinterModal: () => void;
  onPrinterToast: (msg: string) => void;
  onFreshStart: () => void;
}

export const POSModals: React.FC<POSModalsProps> = ({
  showReceiptPreview,
  onCloseReceiptPreview,
  onPrintReceiptPreview,
  selectedTable,
  currentWaiter,
  activeTableOrderItems,
  cart,
  subtotal,
  discountPercent,
  discountAmount,
  serviceFee,
  grandTotal,
  cafeName,
  cafeLogo,
  cafeAddress,
  cafePhone,

  showArchiveModal,
  onCloseArchiveModal,
  orders,
  archiveSearch,
  onSearchChange,
  selectedArchiveOrder,
  onSelectArchiveOrder,
  onRefundOrder,
  onPayDebt,
  onPrintPeriod,
  onPrintArchiveOrder,

  kitchenSlipData,

  showShiftReport,
  onCloseShiftReport,
  shiftBacklog,
  onRetryFailedSync,
  onPrintShiftReport,

  selectedModifierProduct,
  onCloseModifier,
  onAddToCartFromModifier,

  apiError,
  onDismissApiError,

  showAdminPinModal,
  adminPinCafeId,
  adminPinTitle,
  onConfirmAdminPin,
  onCloseAdminPin,

  showTableMoveModal,
  onCloseTableMove,
  tableDefs,
  onMoveTable,

  showReservationModal,
  onCloseReservationModal,
  reservations,
  reservationDefaultTable,
  onCreateReservation,
  onCancelReservation,
  onOpenReservedTable,

  showReservationDetailsModal,
  onCloseReservationDetailsModal,
  selectedReservation,

  showPaymentModal,
  onClosePaymentModal,
  onConfirmPayment,
  onDebtPayment,

  showUnsavedCartModal,
  onCloseUnsavedCartModal,
  onConfirmUnsavedCart,
  draftSubtotal,

  toastMessage,

  periodPrint,

  storageBlockingError,
  onDismissStorageBlockingError,

  showPrinterModal,
  onClosePrinterModal,
  onPrinterToast,
  onFreshStart,
}) => {
  const t = useT();

  return (
    <>
      <ReceiptPreviewModal
        show={showReceiptPreview}
        selectedTable={selectedTable}
        currentWaiter={currentWaiter}
        activeTableOrderItems={activeTableOrderItems}
        cart={cart}
        subtotal={subtotal}
        discountPercent={discountPercent}
        discountAmount={discountAmount}
        serviceFee={serviceFee}
        grandTotal={grandTotal}
        cafeName={cafeName}
        cafeLogo={cafeLogo}
        cafeAddress={cafeAddress}
        cafePhone={cafePhone}
        debtCustomer={null}
        onClose={onCloseReceiptPreview}
        onPrint={onPrintReceiptPreview}
      />

      <ArchiveModal
        show={showArchiveModal}
        orders={orders}
        archiveSearch={archiveSearch}
        selectedArchiveOrder={selectedArchiveOrder}
        currentWaiter={currentWaiter}
        cafeName={cafeName}
        cafeLogo={cafeLogo}
        cafeAddress={cafeAddress}
        cafePhone={cafePhone}
        onSearchChange={onSearchChange}
        onSelectArchiveOrder={onSelectArchiveOrder}
        onRefundOrder={onRefundOrder}
        onPayDebt={onPayDebt}
        onPrintPeriod={onPrintPeriod}
        onClose={onCloseArchiveModal}
        onPrint={onPrintArchiveOrder}
      />

      <KitchenPrintArea data={kitchenSlipData} />

      <ShiftReportModal
        show={showShiftReport}
        orders={orders}
        backlog={shiftBacklog}
        onRetryFailed={onRetryFailedSync}
        onClose={onCloseShiftReport}
        onPrint={onPrintShiftReport}
      />

      <ProductModifierModal
        product={selectedModifierProduct}
        onAddToCart={onAddToCartFromModifier}
        onClose={onCloseModifier}
      />

      {apiError && (
        <div className="bg-rose-600 text-white px-5 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{apiError}</span>
          </div>
          <button
            onClick={onDismissApiError}
            className="underline text-[11px] opacity-80 hover:opacity-100"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      <AdminPinModal
        show={showAdminPinModal}
        cafeId={adminPinCafeId}
        title={adminPinTitle}
        onConfirm={onConfirmAdminPin}
        onClose={onCloseAdminPin}
      />

      <TableMoveModal
        show={showTableMoveModal}
        currentTable={selectedTable}
        tableDefs={tableDefs}
        orders={orders}
        onMoveTable={onMoveTable}
        onClose={onCloseTableMove}
      />

      <ReservationModal
        show={showReservationModal}
        tableDefs={tableDefs}
        reservations={reservations}
        defaultTableNumber={reservationDefaultTable}
        onCreateReservation={onCreateReservation}
        onCancelReservation={onCancelReservation}
        onOpenTable={onOpenReservedTable}
        onClose={onCloseReservationModal}
      />

      <ReservationDetailsModal
        show={showReservationDetailsModal}
        reservation={selectedReservation}
        onOpenTable={onOpenReservedTable}
        onCancelReservation={onCancelReservation}
        onClose={onCloseReservationDetailsModal}
      />

      <PaymentModal
        show={showPaymentModal}
        tableName={selectedTable}
        grandTotal={grandTotal}
        onConfirm={onConfirmPayment}
        onDebt={onDebtPayment}
        onClose={onClosePaymentModal}
      />

      <UnsavedCartModal
        show={showUnsavedCartModal}
        tableNumber={selectedTable}
        cart={cart}
        subtotal={draftSubtotal}
        onConfirm={onConfirmUnsavedCart}
        onClose={onCloseUnsavedCartModal}
      />

      <ToastNotification message={toastMessage} />

      <ArchivePeriodPrintArea
        data={periodPrint}
        cafeName={cafeName || 'ORDERPLUS'}
        cafeLogo={cafeLogo}
        cafeAddress={cafeAddress}
        cafePhone={cafePhone}
      />

      {storageBlockingError && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-rose-200 space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-7 h-7" />
            </div>
            <p className="font-bold text-slate-900">{storageBlockingError}</p>
            <button
              onClick={onDismissStorageBlockingError}
              className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      <PrinterSettingsModal
        isOpen={showPrinterModal}
        onClose={onClosePrinterModal}
        cafeName={cafeName}
        onToast={onPrinterToast}
        onFreshStart={onFreshStart}
      />
    </>
  );
};
