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
  // A photo uploaded in the admin panel wins, then the icon chosen there, then
  // the generic mark. This card used to draw the generic mark for everything,
  // so neither choice reached the till.
  const Icon = categoryIconFor(category.icon);
  // A file that has been removed or cannot be reached must not leave an empty
  // tile — fall back to the icon rather than hiding the image and nothing else.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(category.image) && !imageFailed;

  return (
    <div
      onClick={() => onSelect(category.name)}
      className="bg-white border-2 border-slate-200/80 hover:border-orange-500 p-2.5 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center sm:aspect-square group active:scale-95 hover:scale-[1.02]"
    >
      <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all mb-1.5 sm:mb-3 shadow-xs shrink-0 overflow-hidden">
        {showImage ? (
          <img
            src={category.image}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon className="w-5 h-5 sm:w-7 sm:h-7" />
        )}
      </div>
      <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
        {category.name}
      </h3>
      <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 mt-1 bg-slate-100 group-hover:bg-orange-50 group-hover:text-orange-600 px-2 sm:px-2.5 py-0.5 rounded-full transition-colors">
        {count} ta taom
      </p>
    </div>
  );
});
