import React, { useState } from 'react';
import { Layers, Check, X, ShoppingBag, UtensilsCrossed } from 'lucide-react';
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

    onAddToCart(modifiedProduct, fullNote || undefined);
    onClose();
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 min-w-[52px] min-h-[52px] max-w-[52px] max-h-[52px] rounded-xl bg-slate-100 overflow-hidden relative border border-slate-200 shrink-0">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-orange-500 bg-orange-50">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900 leading-tight">{product.name}</h3>
                <span className="text-[10px] font-bold bg-orange-50 text-orange-700 px-2.5 py-0.5 rounded-md uppercase tracking-wide">
                  {product.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">
                {product.description || "Kerakli porsiya yoki o'lchamni tanlang"}
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
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-500" /> O'lcham / Porsiya:
              </label>
              <div className={`grid ${product.variants!.length > 2 ? 'grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
                {product.variants!.map((variant) => {
                  const isSelected = selectedVariant?.name === variant.name;
                  return (
                    <button
                      key={variant.name}
                      onClick={() => setSelectedVariant(variant)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-orange-300 text-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-sm leading-tight">{variant.name}</p>
                        <p className={`text-xs font-semibold ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                          {variant.price.toLocaleString()} so'm
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white text-orange-500 border-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {hasAddons && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Qo'shimchalar:
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
                          ? 'bg-orange-50 border-orange-400 text-orange-950 font-bold'
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
                      <span className="text-xs font-bold text-slate-900">
                        +{addon.price.toLocaleString()} so'm
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
              placeholder="Oshxonaga izoh yozing (masalan: piyozsiz, achchiqroq...)"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase leading-none">Jami:</span>
            <span className="text-xl font-black text-slate-900 leading-tight">
              {totalPrice.toLocaleString()} so'm
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-1 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleConfirm}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <ShoppingBag className="w-4 h-4" /> Savatga qo'shish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
