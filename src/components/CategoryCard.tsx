import React, { useState } from 'react';
import { DBCategory } from '../types';
import { categoryIconFor } from '../lib/categoryIcons';
import { useT } from '../lib/i18n/LanguageProvider';

interface CategoryCardProps {
  category: DBCategory;
  count: number;
  onSelect: (categoryName: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = React.memo(({
  category,
  count,
  onSelect,
}) => {
  const t = useT();
  const Icon = categoryIconFor(category.icon);
  // A file that has been removed or cannot be reached must not leave an empty
  // tile — fall back to the icon rather than showing nothing at all.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(category.image) && !imageFailed;

  return (
    <button
      type="button"
      onClick={() => onSelect(category.name)}
      className="text-left w-full relative overflow-hidden aspect-[4/3] rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-200 cursor-pointer group active:scale-98 hover:-translate-y-0.5 hover:shadow-lg hover:border-brand-300"
    >
      {showImage ? (
        <>
          {/*
            Rasm butun kartani egallaydi: nom o'sha rasm ustida turadi,
            shuning uchun pastdan qoraytiriladigan qatlam qo'yiladi — aks
            holda oq matn yorug' suratda o'qilmay qoladi.
          */}
          <img
            src={category.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-transparent" />

          <span className="absolute top-2 right-2 text-[10px] font-bold tabular-nums text-slate-700 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs">
            {t('common.dishCount', { n: count })}
          </span>

          <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
            <h3 className="font-bold text-white text-xs sm:text-sm truncate drop-shadow-sm">
              {category.name}
            </h3>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-3 bg-gradient-to-br from-brand-50 via-white to-slate-50">
          <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white text-brand-500 border border-brand-100 shadow-xs flex items-center justify-center group-hover:bg-brand-500 group-hover:border-brand-500 group-hover:text-white transition-colors shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </span>
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate max-w-full text-center group-hover:text-brand-600 transition-colors">
            {category.name}
          </h3>
          <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full tabular-nums transition-colors group-hover:border-brand-200 group-hover:text-brand-600">
            {t('common.dishCount', { n: count })}
          </span>
        </div>
      )}
    </button>
  );
});
