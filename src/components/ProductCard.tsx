import React from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { DBProduct } from '../types';
import { useT } from '../lib/i18n/LanguageProvider';

interface ProductCardProps {
  product: DBProduct;
  onAddToCart: (product: DBProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onAddToCart,
}) => {
  const t = useT();

  return (
    <div
      onClick={() => onAddToCart(product)}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-orange-400 transition-all duration-200 cursor-pointer flex flex-col group active:scale-98"
    >
      <div className="h-20 sm:h-24 bg-slate-100 overflow-hidden relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 bg-slate-900/80 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
          {product.category}
        </div>
      </div>
      <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1">
        <div>
          <h4 className="font-semibold text-xs text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
            {product.name}
          </h4>
          {product.description && (
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{product.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
          <span className="font-bold text-[11px] sm:text-xs text-orange-600 truncate pr-1">{product.price.toLocaleString()} {t('common.currency')}</span>
          <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all shadow-xs group-active:scale-90 font-bold">
            <Plus className="w-4.5 h-4.5" />
          </span>
        </div>
      </div>
    </div>
  );
});
