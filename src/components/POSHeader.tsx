import React, { useState } from 'react';
import {
  Grid,
  ShoppingBag,
  Receipt,
  Printer,
  RotateCw,
  ChefHat,
  LogOut,
  Building2,
  MoreVertical,
} from 'lucide-react';
import { DBWaiter } from '../types';

interface POSHeaderProps {
  connectedCafeName: string;
  connectedCafeLogo: string;
  activeTab: 'stollar' | 'menyu';
  onTabChange: (tab: 'stollar' | 'menyu') => void;
  onOpenArchive: () => void;
  onOpenPrinterSettings: () => void;
  onRefreshOrders: () => void;
  isLoading: boolean;
  currentWaiter: DBWaiter | null;
  onLogout: () => void;
}

export const POSHeader: React.FC<POSHeaderProps> = ({
  connectedCafeName,
  connectedCafeLogo,
  activeTab,
  onTabChange,
  onOpenArchive,
  onOpenPrinterSettings,
  onRefreshOrders,
  isLoading,
  currentWaiter,
  onLogout,
}) => {
  // Telefonda sarlavhaga hamma tugma sig'maydi: ikkinchi darajali amallar
  // (arxiv, printer, yangilash, chiqish) shu menyu ostiga yig'ilgan.
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 px-2 sm:px-6 py-2 sm:py-3 flex items-center justify-between shadow-sm sticky top-0 z-50 gap-1.5 sm:gap-4 shrink-0 relative">
      {/* Connected Cafe Brand */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0" title={connectedCafeName || 'OrderPlus'}>
        {connectedCafeLogo ? (
          <img
            src={connectedCafeLogo}
            alt={connectedCafeName}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain bg-white border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          </div>
        )}
        <div className="min-w-0 hidden md:block">
          <h1 className="text-base sm:text-lg font-bold tracking-wide text-slate-900 leading-none truncate max-w-[150px] sm:max-w-[240px]">
            {connectedCafeName || 'OrderPlus'}
          </h1>
          <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5">OrderPlus POS</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shrink-0">
        <button
          title="Stollar zali"
          onClick={() => onTabChange('stollar')}
          className={`px-3 sm:px-4 py-2 sm:py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'stollar'
              ? 'bg-orange-500 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Grid className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">STOLLAR</span>
          <span className="hidden md:inline text-[10px] opacity-80">(F1)</span>
        </button>
        <button
          title="Menyu va kassa"
          onClick={() => onTabChange('menyu')}
          className={`px-3 sm:px-4 py-2 sm:py-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'menyu'
              ? 'bg-orange-500 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">MENYU</span>
          <span className="hidden md:inline text-[10px] opacity-80">(F2)</span>
        </button>
        <button
          title="Arxiv"
          onClick={onOpenArchive}
          className="hidden sm:flex px-3 sm:px-4 py-2 sm:py-2 rounded-lg font-semibold text-xs transition-all items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-white cursor-pointer whitespace-nowrap"
        >
          <Receipt className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-orange-500" />
          <span className="hidden sm:inline">ARXIV</span>
          <span className="hidden md:inline text-[10px] opacity-80">(F3)</span>
        </button>
      </div>

      {/* Actions & Staff Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          onClick={onOpenPrinterSettings}
          className="hidden sm:flex w-10 h-10 items-center justify-center bg-white hover:bg-slate-50 active:scale-98 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
          title="Termoprinter va Chek Sozlamalari"
        >
          <Printer className="w-4 h-4 text-orange-500 shrink-0" />
        </button>

        <button
          onClick={onRefreshOrders}
          className="hidden sm:flex w-10 h-10 items-center justify-center bg-white hover:bg-slate-50 active:scale-98 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
          title="Qayta yuklash"
        >
          <RotateCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
        </button>

        {currentWaiter && (
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 bg-slate-50/80 px-1.5 sm:px-2.5 h-10 rounded-xl border border-slate-200 shadow-2xs shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="text-left pr-1 hidden sm:block">
              <p className="text-[11px] font-bold text-slate-900 leading-none truncate max-w-[100px]">
                {currentWaiter.name}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                {currentWaiter.role === 'admin' ? 'Kassir' : 'Offitsiant'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Chiqish"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Telefon uchun yagona menyu tugmasi */}
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className={`sm:hidden w-10 h-10 flex items-center justify-center border rounded-xl transition-all cursor-pointer shadow-2xs shrink-0 ${
            menuOpen
              ? 'bg-slate-900 border-slate-900 text-white'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
          title="Menyu"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {menuOpen && (
        <>
          {/* Tashqariga bosilganda yopiladi */}
          <div onClick={() => setMenuOpen(false)} className="sm:hidden fixed inset-0 z-40" />
          <div className="sm:hidden absolute right-2 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
            {currentWaiter && (
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <ChefHat className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{currentWaiter.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {currentWaiter.role === 'admin' ? 'Kassir' : 'Offitsiant'}
                  </p>
                </div>
              </div>
            )}

            {[
              {
                label: 'Arxiv cheklar',
                icon: <Receipt className="w-4 h-4 text-orange-500" />,
                onClick: onOpenArchive,
              },
              {
                label: 'Printer sozlamalari',
                icon: <Printer className="w-4 h-4 text-orange-500" />,
                onClick: onOpenPrinterSettings,
              },
              {
                label: isLoading ? 'Yangilanmoqda...' : 'Qayta yuklash',
                icon: <RotateCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />,
                onClick: onRefreshOrders,
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setMenuOpen(false);
                  item.onClick();
                }}
                className="w-full px-3.5 py-3.5 flex items-center gap-3 text-xs font-semibold text-slate-700 active:bg-slate-100 border-b border-slate-100 transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}

            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="w-full px-3.5 py-3.5 flex items-center gap-3 text-xs font-semibold text-rose-600 active:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </>
      )}
    </header>
  );
};
