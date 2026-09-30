import React from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { CategoryCard } from './CategoryCard';
import { ProductCard } from './ProductCard';
import type { DBCategory, DBProduct } from '../types';

export interface POSMenuViewProps {
  t: (key: any, options?: any) => string;
  selectedCategoryName: string | null;
  searchQuery: string;
  showMobileSearch: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  allCategories: DBCategory[];
  categoryCounts: Record<string, number>;
  displayedProducts: DBProduct[];
  onBackToCategories: () => void;
  onBackToTables: () => void;
  onSearchChange: (query: string) => void;
  onCloseSearch: () => void;
  onOpenMobileSearch: () => void;
  onSelectCategory: (categoryName: string) => void;
  onAddToCart: (product: DBProduct) => void;
}

export const POSMenuView: React.FC<POSMenuViewProps> = ({
  t,
  selectedCategoryName,
  searchQuery,
  showMobileSearch,
  searchInputRef,
  allCategories,
  categoryCounts,
  displayedProducts,
  onBackToCategories,
  onBackToTables,
  onSearchChange,
  onCloseSearch,
  onOpenMobileSearch,
  onSelectCategory,
  onAddToCart,
}) => {
  return (
    <div className="flex-1 flex flex-col gap-2.5 sm:gap-4 overflow-hidden min-h-0">
      <div className="p-0 sm:px-3.5 sm:py-2 sm:bg-white rounded-2xl border-0 sm:border sm:border-slate-200 sm:shadow-sm flex items-center justify-between gap-2 sm:gap-4 shrink-0">
        {/* Orqaga: telefonda faqat ikonka, qidiruv ochiqda esa yashirin */}
        {selectedCategoryName || searchQuery ? (
          <button
            onClick={onBackToCategories}
            title={t('menu.backToCategoriesTitle')}
            className={`${
              showMobileSearch ? 'hidden sm:flex' : 'flex'
            } items-center gap-2 text-xs font-bold text-slate-700 bg-white sm:bg-slate-100 hover:bg-slate-200 h-11 sm:h-9 w-11 sm:w-auto justify-center sm:justify-start sm:px-3.5 rounded-xl border border-slate-200 transition-all cursor-pointer shrink-0 active:scale-95`}
          >
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 text-slate-600" />
            <span className="hidden sm:inline">{t('menu.backToCategories')}</span>
          </button>
        ) : (
          <button
            onClick={onBackToTables}
            title={t('menu.backToTablesTitle')}
            className={`${
              showMobileSearch ? 'hidden sm:flex' : 'flex'
            } items-center gap-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-brand-300 hover:text-brand-700 h-11 sm:h-9 w-11 sm:w-auto justify-center sm:justify-start sm:px-3.5 rounded-xl border border-slate-200 transition-all cursor-pointer shrink-0 active:scale-95`}
          >
            <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 text-slate-500" />
            <span className="hidden sm:inline">{t('menu.backToTables')}</span>
          </button>
        )}

        {/* Qidiruv maydoni: telefonda ikonka bosilgandagina ochiladi */}
        <div
          className={`${showMobileSearch ? 'flex' : 'hidden'} sm:flex items-center gap-2 flex-1 sm:flex-none min-w-0`}
        >
          <div className="relative flex-1 sm:w-72 sm:flex-none min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t('menu.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white sm:bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 h-11 sm:h-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:bg-white transition-all"
            />
          </div>
          <button
            onClick={onCloseSearch}
            title={t('menu.closeSearch')}
            className="sm:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200 shadow-2xs active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telefonda qidiruvni ochuvchi ikonka */}
        {!showMobileSearch && (
          <button
            onClick={onOpenMobileSearch}
            title={t('common.search')}
            className="sm:hidden w-11 h-11 shrink-0 flex items-center justify-center rounded-xl bg-white text-slate-600 border border-slate-200 shadow-2xs active:scale-95 transition-transform"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dynamic Categories / Products Grid */}
      {!selectedCategoryName && !searchQuery ? (
        /* STEP 1: Categories View */
        <div className="flex-1 overflow-y-auto pr-1 pt-2.5 p-1 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-1 min-h-0">
          {allCategories.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <p className="text-slate-400 text-sm font-medium">{t('toast.noMenu')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3.5">
              {allCategories.map((cat) => (
                <CategoryCard
                  key={cat.id || cat.name}
                  category={cat}
                  count={categoryCounts[cat.name] || 0}
                  onSelect={onSelectCategory}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: Products View */
        <div className="flex-1 overflow-y-auto pr-1 pb-[calc(9.5rem+env(safe-area-inset-bottom))] lg:pb-0 min-h-0">
          {selectedCategoryName && (
            /* Zona sarlavhasi (STOLLAR sahifasi) bilan bir xil til: nom,
               son va o'ngga cho'zilgan ingichka chiziq. */
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                {selectedCategoryName}
              </h3>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 tabular-nums shrink-0">
                {displayedProducts.length}
              </span>
              <span className="flex-1 h-px bg-slate-200/80" aria-hidden="true" />
            </div>
          )}

          {displayedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <p className="text-slate-400 text-sm font-medium">{t('menu.noProducts')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5">
              {displayedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
