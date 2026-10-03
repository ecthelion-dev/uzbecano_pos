import React, { useEffect, useMemo, useState } from 'react';
import {
  Printer,
  Bluetooth,
  Usb,
  CheckCircle2,
  AlertCircle,
  Receipt,
  UtensilsCrossed,
  X,
  FileText,
  DollarSign,
  QrCode,
  RotateCcw
} from 'lucide-react';
import {
  PrinterSettings,
  getPrinterSettings,
  savePrinterSettings,
  connectBluetoothPrinter,
  connectSerialPrinter,
  executePrintTest,
  listSystemPrinters,
  SystemPrinter,
} from '../lib/printer';
import { IS_DESKTOP_APP } from '../constants';
import { useT } from '../lib/i18n/LanguageProvider';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeName: string;
  onToast: (msg: string) => void;
  /**
   * Sinovdan haqiqiy ishga o'tish. PIN so'rash va tozalash chaqiruvchida:
   * bu oyna faqat tugmani ko'rsatadi.
   */
  onFreshStart: () => void;
}

/*
 * Yoqish/o'chirish qatori. Ilgari butun qator bosilardi, ichidagi checkbox esa
 * `onChange={() => {}}` bilan bo'sh turardi — ekran o'quvchi uni o'zgarmas deb
 * o'qirdi. Endi bitta haqiqiy `switch` tugmasi, qator bosilganda ham ishlaydi.
 */
interface ToggleRowProps {
  icon: React.ReactNode;
  tone: string;
  title: string;
  hint: React.ReactNode;
  checked: boolean;
  onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon, tone, title, hint, checked, onToggle }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onToggle}
    className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer"
  >
    <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${tone}`}>
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-bold text-slate-900">{title}</span>
      <span className="block text-xs leading-relaxed text-slate-500 mt-0.5">{hint}</span>
    </span>
    <span
      aria-hidden="true"
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${checked ? 'bg-orange-500' : 'bg-slate-300'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`}
      />
    </span>
  </button>
);

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
  cafeName,
  onToast,
  onFreshStart,
}) => {
  const t = useT();
  const [settings, setSettings] = useState<PrinterSettings>(getPrinterSettings());
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [copiedKiosk, setCopiedKiosk] = useState(false);
  const [systemPrinters, setSystemPrinters] = useState<SystemPrinter[]>([]);

  // Tizimdagi printerlar ro'yxati faqat desktop ilovada mavjud va faqat
  // oyna ochilganda kerak.
  useEffect(() => {
    if (!isOpen || !IS_DESKTOP_APP) return;
    let cancelled = false;
    listSystemPrinters().then((list) => {
      if (!cancelled) setSystemPrinters(list);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Kiosk buyrug'i tizimga qarab farq qiladi, va noto'g'ri buyruqni ko'chirgan
  // kassir uni ishlamayapti deb hisoblaydi.
  const kioskCommand = useMemo(() => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://pos.orderplus.uz';
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
    return isMac
      ? `open -na "Google Chrome" --args --kiosk-printing --app="${url}"`
      : `chrome.exe --kiosk-printing --app="${url}"`;
  }, []);

  const copyKioskCommand = async () => {
    try {
      await navigator.clipboard.writeText(kioskCommand);
      setCopiedKiosk(true);
      setTimeout(() => setCopiedKiosk(false), 2000);
    } catch {
      // Ruxsat bo'lmasa buyruq baribir ekranda ko'rinib turibdi.
    }
  };
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggle = (key: keyof PrinterSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    savePrinterSettings(updated);
  };

  const handlePaperChange = (paperWidth: '58mm' | '80mm') => {
    const updated = { ...settings, paperWidth };
    setSettings(updated);
    savePrinterSettings(updated);
    onToast(`Printer qog'oz o'lchami: ${paperWidth}`);
  };

  const handleConnectBluetooth = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const name = await connectBluetoothPrinter();
      setConnectedDevice(name);
      const updated: PrinterSettings = { ...settings, mode: 'bluetooth' };
      setSettings(updated);
      savePrinterSettings(updated);
      onToast(t('printer.btConnected', { name }));
    } catch (e: any) {
      setError(e.message || t('printer.btFailed'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSerial = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const name = await connectSerialPrinter();
      setConnectedDevice(name);
      const updated: PrinterSettings = { ...settings, mode: 'serial' };
      setSettings(updated);
      savePrinterSettings(updated);
      onToast(`USB / Serial printer ulandi!`);
    } catch (e: any) {
      setError(e.message || "USB printerga ulanib bo'lmadi");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    /*
     * Sinov cheki NAVBATGA qo'yiladi, ya'ni bu chaqiruv qog'oz chiqishidan
     * oldin qaytadi. Ilgari shu sababli tugma har doim "yuborildi" der edi —
     * printer umuman javob bermagan holatda ham. Aynan shu tugma bilan
     * muammoni topish kerak bo'lgani uchun, endi sabab shu yerda ko'rinadi.
     */
    setError(null);
    try {
      await executePrintTest(cafeName, (why) => setError(why));
      onToast(t('printer.testSent'));
    } catch (e: any) {
      setError(e?.message || t('printer.printError'));
    }
  };

  const handleSaveText = (e: React.FormEvent) => {
    e.preventDefault();
    savePrinterSettings(settings);
    onToast("Printer sozlamalari saqlandi!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-7 max-w-xl w-full shadow-2xl border border-slate-200 space-y-5 sm:space-y-6 text-slate-800 animate-in fade-in zoom-in duration-200 max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                {t('printer.title')}
              </h2>
              <p className="text-xs text-slate-500 hidden sm:block">{t('printer.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
          

            aria-label={t('common.close')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Printer Mode / Hardware Connection */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t('printer.typeAndConnection')}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleConnectBluetooth}
              disabled={isConnecting}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                settings.mode === 'bluetooth' || connectedDevice
                  ? 'border-blue-500 bg-blue-50/50 text-blue-600 font-bold ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
              }`}
            >
              <Bluetooth className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-semibold">Bluetooth Printer</span>
              <span className="text-xs text-slate-500">XP-58 / Goojprt / POS-58</span>
            </button>

            <button
              type="button"
              onClick={handleConnectSerial}
              disabled={isConnecting}
              className={`p-4 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                settings.mode === 'serial'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-600 font-bold ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
              }`}
            >
              <Usb className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-semibold">{t('printer.usbTitle')}</span>
              <span className="text-xs text-slate-500">{t('printer.usbHint')}</span>
            </button>
          </div>

          {connectedDevice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t('printer.connected')} <b>{connectedDevice}</b>
              </span>
              <span className="text-[10px] bg-emerald-200/50 px-2 py-0.5 rounded-full font-bold">{t('printer.active')}</span>
            </div>
          )}
        </div>

        {/* Desktop ilovada chek tizim navbatiga xom ESC/POS bo'lib ketadi,
            ya'ni hech qanday chop etish oynasi ochilmaydi. Bu yerda faqat
            qaysi printerga yuborilishini tanlash qoladi. */}
        {IS_DESKTOP_APP && !connectedDevice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2.5">
            <p className="text-xs font-black text-emerald-800">
              {t('printer.receiptPrinter')}
            </p>
            <p className="text-[11px] leading-relaxed text-emerald-800/90">
              {t('printer.receiptPrinterHint')}
            </p>
            <select
              value={settings.systemPrinterName || ''}
              onChange={(e) => {
                const updated: PrinterSettings = { ...settings, systemPrinterName: e.target.value };
                setSettings(updated);
                savePrinterSettings(updated);
              }}
              className="w-full text-[11px] font-semibold bg-white border border-emerald-200 rounded-lg px-2.5 py-2 text-slate-700 cursor-pointer"
            >
              <option value="">{t('printer.systemDefault')}</option>
              {systemPrinters.map((pr) => (
                <option key={pr.systemName} value={pr.systemName}>
                  {pr.name}{pr.isDefault ? ' (standart)' : ''}
                </option>
              ))}
            </select>
            {systemPrinters.length === 0 && (
              <p className="text-[11px] text-emerald-800/70">
                Tizimda o&apos;rnatilgan printer topilmadi. Printerni operatsion tizimga
                qo&apos;shing va oynani qayta oching.
              </p>
            )}
          </div>
        )}

        {/* Brauzer rejimida chop etish oynasi. Kassirga har safar "Print"
            bosish kerak — bu brauzerning xavfsizlik chegarasi, kod bilan
            aylanib o'tib bo'lmaydi. Yagona yo'l — Chrome'ni kiosk rejimida
            ochish yoki kassa printerini to'g'ridan ulash. */}
        {!IS_DESKTOP_APP && settings.mode === 'browser' && !connectedDevice && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5">
            <p className="text-xs font-black text-amber-800">
              {t('printer.dialogTitle')}
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800/90">
              {t('printer.dialogWhy')}
            </p>
            <ol className="text-[11px] leading-relaxed text-amber-800/90 space-y-1.5 list-decimal list-inside">
              <li>
                <b>{t('printer.connect')}</b> {t('printer.dialogFix1')}
              </li>
              <li>
                <b>{t('printer.kioskHint')}</b> {t('printer.dialogFix2')}
              </li>
            </ol>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 text-[10px] font-mono bg-white border border-amber-200 rounded-lg px-2.5 py-2 text-slate-700 overflow-x-auto whitespace-nowrap">
                {kioskCommand}
              </code>
              <button
                type="button"
                onClick={copyKioskCommand}
                className="shrink-0 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
              >
                {copiedKiosk ? t('printer.copied') : t('printer.copy')}
              </button>
            </div>
          </div>
        )}

        {/* Paper Size */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Qog&apos;oz Kengligi (Lenta o&apos;lchami):
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handlePaperChange('58mm')}
              className={`py-3 px-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                settings.paperWidth === '58mm'
                  ? 'border-orange-500 bg-orange-50 text-orange-600 ring-2 ring-orange-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" /> {t('printer.width58')}
            </button>
            <button
              type="button"
              onClick={() => handlePaperChange('80mm')}
              className={`py-3 px-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                settings.paperWidth === '80mm'
                  ? 'border-orange-500 bg-orange-50 text-orange-600 ring-2 ring-orange-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" /> {t('printer.width80')}
            </button>
          </div>
        </div>

        {/* Automatic Print Toggles */}
        <div className="space-y-2.5 pt-1">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t('printer.autoPrint')}
          </label>

          <ToggleRow
            icon={<Receipt className="w-5 h-5" />}
            tone="bg-emerald-50 text-emerald-600"
            title={t('printer.autoOnPayment')}
            hint={t('printer.autoOnPaymentHint')}
            checked={settings.autoPrintReceipt}
            onToggle={() => handleToggle('autoPrintReceipt')}
          />

          {/* Kassada berilgan buyurtma uchun tugmacha yo'q — kvitansiya
              tasdiqlash bilan chiqadi. Oraliqdagi modal olib tashlangan:
              band kafeda u har bir buyurtmaga qo'shimcha bosish qo'shardi,
              kassir esa baribir doim chop etardi. */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-900">{t('printer.kitchenAuto')}</span>
              <span className="block text-xs leading-relaxed text-slate-500 mt-0.5">{t('printer.kitchenAutoHint')}</span>
            </span>
          </div>

          <ToggleRow
            icon={<QrCode className="w-5 h-5" />}
            tone="bg-indigo-50 text-indigo-600"
            title={t('printer.qrToKitchen')}
            hint={
              <>
                {t('printer.qrSelfPrint')}
                Ikkinchi kassa qo&apos;shilsa, buni faqat bittasida yoqib qo&apos;ying.
              </>
            }
            checked={settings.autoPrintQrKitchenSlip}
            onToggle={() => handleToggle('autoPrintQrKitchenSlip')}
          />

          <ToggleRow
            icon={<DollarSign className="w-5 h-5" />}
            tone="bg-amber-50 text-amber-600"
            title={t('printer.cashDrawer')}
            hint={t('printer.cashDrawerHint')}
            checked={settings.openCashDrawer}
            onToggle={() => handleToggle('openCashDrawer')}
          />
        </div>

        {/* Custom Header / Footer Texts */}
        <form onSubmit={handleSaveText} className="space-y-3 pt-1 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('printer.headerText')}
            </label>
            <input
              type="text"
              value={settings.headerText}
              onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
              placeholder={t('printer.headerPlaceholder')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('printer.footerText')}
            </label>
            <input
              type="text"
              value={settings.footerText}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              placeholder={t('printer.footerPlaceholder')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/*
            Sinovdan haqiqiy ishga o'tish.
            Sozlamalardan ajratilgan: bu qaytarib bo'lmaydigan amal, va
            saqlash tugmasining yonida turgan tugma bir kuni tasodifan
            bosiladi. Ostidagi yozuv nima o'chishini va nima qolishini
            aytadi — "ishonchingiz komilmi?" degan savol o'zi hech narsa
            tushuntirmaydi.
          */}
          <div className="pt-3 mt-1 border-t border-slate-200 space-y-2">
            <div>
              <h3 className="text-xs font-bold text-slate-700">
                {t('printer.freshStartTitle')}
              </h3>
              <p className="text-[11px] leading-relaxed text-slate-500 mt-0.5">
                {t('printer.freshStartHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={onFreshStart}
              className="w-full py-3 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {t('printer.freshStartAction')}
            </button>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleTestPrint}
              className="flex-1 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200 active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" /> {t('printer.testReceipt')}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/25 cursor-pointer transition-all active:scale-95"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
