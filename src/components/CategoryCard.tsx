import React, { useState } from 'react';
import { DBCategory } from '../types';
import { categoryIconFor } from '../lib/categoryIcons';

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
  const Icon = categoryIconFor(category.icon);
  // A file that has been removed or cannot be reached must not leave an empty
  // tile — fall back to the icon rather than showing nothing at all.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(category.image) && !imageFailed;

  return (
    <div
      onClick={() => onSelect(category.name)}
      className={`bg-white border-2 border-slate-200/80 hover:border-orange-500 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col items-center text-center sm:aspect-square group active:scale-95 hover:scale-[1.02] ${
        // A photo earns the whole top of the card, so it has to reach the
        // edges: padding here would frame it into the same small tile the icon
        // sits in, which is what made an uploaded picture look shrunken.
        showImage ? 'overflow-hidden justify-start' : 'p-2.5 sm:p-5 justify-center'
      }`}
    >
      {showImage ? (
        <div className="w-full aspect-square sm:aspect-auto sm:flex-1 sm:min-h-0 bg-slate-50">
          <img
            src={category.image}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        </div>
      ) : (
        <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all mb-1.5 sm:mb-3 shadow-xs shrink-0">
          <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
        </div>
      )}

      <div className={`w-full shrink-0 ${showImage ? 'px-2 pt-1.5 pb-2 sm:px-3 sm:pt-2 sm:pb-3' : ''}`}>
        <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
          {category.name}
        </h3>
        <p className="inline-block text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-1 bg-slate-100 group-hover:bg-orange-50 group-hover:text-orange-600 px-2 sm:px-2.5 py-0.5 rounded-full transition-colors">
          {count} ta taom
        </p>
      </div>
    </div>
  );
});
