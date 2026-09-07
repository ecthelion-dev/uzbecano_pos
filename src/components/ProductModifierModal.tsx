import React, { useState } from 'react';
import { Layers, Check, X, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { DBProduct, ProductVariant, ProductAddon } from '../types';
import { useT } from '../lib/i18n/LanguageProvider';

interface ProductModifierModalProps {
  product: DBProduct | null;
  onAddToCart: (modifiedProduct: DBProduct, note?: string, variant?: ProductVariant) => void;
  onClose: () => void;
}

export const ProductModifierModal: React.FC<ProductModifierModalProps> = ({
  product,
  onAddToCart,
  onClose,
}) => {
  const t = useT();
  if (!product) return null;

  const hasVariants = product.variants && product.variants.length > 0;
  const hasAddons = product.addons && product.addons.length > 0;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    hasVariants ? product.variants![0] : null
  );
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [itemNote, setItemNote] = useState<string>('');

  const toggleAddon = (addon: ProductAddon) => {
    if (selectedAddons.some(a => a.name === addon.name)) {
      setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = basePrice + addonsTotal;

  const handleConfirm = () => {
    let nameAddonsStr = '';
    let displayName = product.name;

    if (selectedVariant) {
      displayName += ` (${selectedVariant.name})`;
    }
    if (selectedAddons.length > 0) {
      nameAddonsStr = selectedAddons.map(a => `+ ${a.name}`).join(', ');
    }

    const fullNote = [itemNote.trim(), nameAddonsStr].filter(Boolean).join(' • ');

    const modifiedProduct: DBProduct = {
      ...product,
      name: displayName,
      price: totalPrice,
    };

    // Variant AYNAN o'zi uzatiladi: narx serverda shu yorliq bo'yicha
    // qayta topiladi, nomdagi qavs ichidagi matn bo'yicha emas.
    onAddToCart(modifiedProduct, fullNote || undefined, selectedVariant || undefined);
    onClose();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 border border-slate-200 max-h-[92dvh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-13 h-13 min-w-[52px] min-h-[52px] max-w-[52px] max-h-[52px] rounded-xl bg-slate-100 overflow-hidden relative border border-slate-200 shrink-0">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-orange-500 bg-orange-50">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">{product.name}</h3>
                <span className="text-[10px] font-semibold bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-md uppercase tracking-wide">
                  {product.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">
                {product.description || t('modifier.pickSize')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3.5">
          {/* Variants / Sizes */}
          {hasVariants && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-500" /> {t('modifier.size')}
              </label>
              {/*
                Telefonda ham uchtadan.
                Ikkitadan bo'lganda uchta o'lchamli taom ikki qatorga
                bo'linardi va uchinchisi yolg'iz qolib, qo'shimcha
                variantdek emas, boshqa narsadek ko'rinardi. Uch ustunda
                esa hammasi bir qarashda ko'rinadi va kassir kamroq
                suradi — bu har buyurtmada takrorlanadigan harakat.
              */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {product.variants!.map((variant) => {
                  const isSelected = selectedVariant?.name === variant.name;
                  return (
                    <button
                      key={variant.name}
                      onClick={() => setSelectedVariant(variant)}
                      className={`relative p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-orange-300 text-slate-800'
                      }`}
                    >
                      {/* Tanlangani rangidan bilinadi; belgi burchakda,
                          chunki uch ustunda uning yoniga joy yo'q. */}
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-orange-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                      <p className="font-bold text-xs leading-tight line-clamp-2 break-words">{variant.name}</p>
                      <p className={`mt-1 text-[11px] font-semibold whitespace-nowrap ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                        {variant.price.toLocaleString()} {t('common.currency')}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {hasAddons && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t('modifier.addons')}
              </label>
              <div className="space-y-1.5">
                {product.addons!.map((addon) => {
                  const isChecked = selectedAddons.some(a => a.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      onClick={() => toggleAddon(addon)}
                      className={`w-full p-2.5 rounded-xl border-2 text-left flex justify-between items-center transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-orange-50 border-orange-400 text-orange-950 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 text-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span>+ {addon.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-900">
                        +{addon.price.toLocaleString()} {t('common.currency')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Izoh Input */}
          <div className="pt-0.5">
            <input
              type="text"
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder={t('modifier.note')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 block uppercase leading-none">{t('common.total')}</span>
            <span className="text-xl font-bold text-slate-900 leading-tight">
              {totalPrice.toLocaleString()} {t('common.currency')}
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-1 justify-end w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-colors cursor-pointer active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 sm:py-2.5 px-5 rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 flex-1 sm:flex-none"
            >
              <ShoppingBag className="w-4 h-4" /> {t('modifier.addToCart')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
