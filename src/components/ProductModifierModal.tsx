import React, { useState } from 'react';
import { Layers, Plus, Check } from 'lucide-react';
import { DBProduct, ProductVariant, ProductAddon } from '../types';

interface ProductModifierModalProps {
  product: DBProduct | null;
  onAddToCart: (modifiedProduct: DBProduct, note?: string) => void;
  onClose: () => void;
}

export const ProductModifierModal: React.FC<ProductModifierModalProps> = ({
  product,
  onAddToCart,
  onClose,
}) => {
  if (!product) return null;

  const hasVariants = product.variants && product.variants.length > 0;
  const hasAddons = product.addons && product.addons.length > 0;

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    hasVariants ? product.variants![0] : null
  );

  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);

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

    const modifiedProduct: DBProduct = {
      ...product,
      name: displayName,
      price: totalPrice,
    };

    onAddToCart(modifiedProduct, nameAddonsStr || undefined);
    onClose();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">{product.name}</h3>
              <p className="text-[11px] text-slate-500 font-medium">Porsiya, o'lcham va qo'shimchalar tanlovi</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 cursor-pointer">×</button>
        </div>

        <div className="space-y-4">
          {/* Variants / Portions / Sizes */}
          {hasVariants && (
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                O'lcham / Porsiya Tanlovi:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {product.variants!.map((variant) => {
                  const isSelected = selectedVariant?.name === variant.name;
                  return (
                    <button
                      key={variant.name}
                      onClick={() => setSelectedVariant(variant)}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-extrabold text-xs leading-tight">{variant.name}</p>
                      <p className={`text-[11px] font-bold mt-1 ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                        {variant.price.toLocaleString()} so'm
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
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Qo'shimchalar (Add-ons):
              </label>
              <div className="space-y-1.5">
                {product.addons!.map((addon) => {
                  const isChecked = selectedAddons.some(a => a.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      onClick={() => toggleAddon(addon)}
                      className={`w-full p-2.5 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-orange-50 border-orange-300 text-orange-900 font-extrabold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
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
                      <span className="text-xs font-black text-slate-900">
                        +{addon.price.toLocaleString()} so'm
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400">Jami narx:</p>
            <p className="text-base font-black text-orange-600">{totalPrice.toLocaleString()} so'm</p>
          </div>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-3 px-4 rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> SAVATGA QO'SHISH
          </button>
        </div>
      </div>
    </div>
  );
};
