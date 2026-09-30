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
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-300 transition-all duration-200 cursor-pointer flex flex-col group active:scale-98"
    >
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 text-brand-300">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
        )}
        {/*
          Kategoriya yorlig'i ataylab yo'q: kassir allaqachon shu
          kategoriyaning ichida turadi, ya'ni u har bir kartada takrorlanib,
          rasmning ustini yeb qo'yardi. Kerak bo'lsa nom ostidagi yo'l
          ko'rsatadi.
        */}
      </div>
      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h4>
          {product.description && (
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{product.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-sm sm:text-base tabular-nums text-slate-900 truncate">
            {product.price.toLocaleString()}
            <span className="text-[10px] font-semibold text-slate-400 ml-1">{t('common.currency')}</span>
          </span>
          <span className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center transition-all shadow-xs group-hover:bg-brand-600 group-active:scale-90 shrink-0">
            <Plus className="w-4 h-4" />
          </span>
        </div>
      </div>
    </div>
  );
});
