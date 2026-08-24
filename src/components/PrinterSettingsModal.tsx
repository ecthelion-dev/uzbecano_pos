import React, { useState } from 'react';
import {
  Printer,
  Bluetooth,
  Usb,
  CheckCircle2,
  AlertCircle,
  Receipt,
  UtensilsCrossed,
  Sliders,
  X,
  FileText,
  DollarSign
} from 'lucide-react';
import {
  PrinterSettings,
  getPrinterSettings,
  savePrinterSettings,
  connectBluetoothPrinter,
  connectSerialPrinter,
  executePrintTest,
} from '../lib/printer';

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeName: string;
  onToast: (msg: string) => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  isOpen,
  onClose,
  cafeName,
  onToast,
}) => {
  const [settings, setSettings] = useState<PrinterSettings>(getPrinterSettings());
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
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
      onToast(`Bluetooth printer ulandi: ${name}`);
    } catch (e: any) {
      setError(e.message || "Bluetooth printerga ulanib bo'lmadi");
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
    try {
      await executePrintTest(cafeName);
      onToast("Sinov cheki printerga yuborildi!");
    } catch {
      onToast("Chek chiqarishda xatolik");
    }
  };

  const handleSaveText = (e: React.FormEvent) => {
    e.preventDefault();
    savePrinterSettings(settings);
    onToast("Printer sozlamalari saqlandi!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 sm:space-y-5 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in duration-200 max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Termoprinter & Chek Sozlamalari
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">PWA Kassa va Oshxona uchun chek chiqarish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Printer Mode / Hardware Connection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Printer Turi & Ulanish:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleConnectBluetooth}
              disabled={isConnecting}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                settings.mode === 'bluetooth' || connectedDevice
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Bluetooth className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-semibold">Bluetooth Printer</span>
              <span className="text-[10px] text-slate-400">XP-58 / Goojprt / POS-58</span>
            </button>

            <button
              type="button"
              onClick={handleConnectSerial}
              disabled={isConnecting}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                settings.mode === 'serial'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Usb className="w-5 h-5 text-emerald-500" />
              <span className="text-xs font-semibold">USB / Kassa Printer</span>
              <span className="text-[10px] text-slate-400">Kabel orqali to&apos;g&apos;ridan</span>
            </button>
          </div>

          {connectedDevice && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ulangan: <b>{connectedDevice}</b>
              </span>
              <span className="text-[10px] bg-emerald-200/50 px-2 py-0.5 rounded-full font-bold">Faol</span>
            </div>
          )}
        </div>

        {/* Paper Size */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Qog&apos;oz Kengligi (Lenta o&apos;lchami):
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handlePaperChange('58mm')}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                settings.paperWidth === '58mm'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" /> 58mm (Kichik lenta)
            </button>
            <button
              type="button"
              onClick={() => handlePaperChange('80mm')}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                settings.paperWidth === '80mm'
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" /> 80mm (Katta kassa)
            </button>
          </div>
        </div>

        {/* Automatic Print Toggles */}
        <div className="space-y-2.5 pt-1">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Avtomatik Chop Etish:
          </label>

          <div
            onClick={() => handleToggle('autoPrintReceipt')}
            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Receipt className="w-4 h-4 text-emerald-500" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  To&apos;lovda avtomatik chek chiqarish
                </div>
                <div className="text-[10px] text-slate-400">Hisob yopilganda mijozga chek chop etadi</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPrintReceipt}
              onChange={() => {}}
              className="w-5 h-5 shrink-0 accent-orange-500 cursor-pointer"
            />
          </div>

          <div
            onClick={() => handleToggle('autoPrintKitchen')}
            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <UtensilsCrossed className="w-4 h-4 text-blue-500" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Oshxonaga avtomatik kvitansiya chiqarish
                </div>
                <div className="text-[10px] text-slate-400">Buyurtma yuborilganda oshpazga chop etadi</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoPrintKitchen}
              onChange={() => {}}
              className="w-5 h-5 shrink-0 accent-orange-500 cursor-pointer"
            />
          </div>

          <div
            onClick={() => handleToggle('openCashDrawer')}
            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Kassa qutisini ochish (Cash Drawer)
                </div>
                <div className="text-[10px] text-slate-400">Naqd to&apos;lovda temir kassa qutisini ochadi</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.openCashDrawer}
              onChange={() => {}}
              className="w-5 h-5 shrink-0 accent-orange-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Custom Header / Footer Texts */}
        <form onSubmit={handleSaveText} className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chek tepasidagi matn:
            </label>
            <input
              type="text"
              value={settings.headerText}
              onChange={(e) => setSettings({ ...settings, headerText: e.target.value })}
              placeholder="Xush kelibsiz!"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chek pastidagi minnatdorchilik matni:
            </label>
            <input
              type="text"
              value={settings.footerText}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              placeholder="Tashrifingiz uchun rahmat!"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleTestPrint}
              className="flex-1 py-3 sm:py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" /> Sinov Cheki
            </button>
            <button
              type="submit"
              className="flex-1 py-3 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/25 cursor-pointer transition-all active:scale-95"
            >
              Saqlash
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
