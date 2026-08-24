import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { DBCategory } from '../types';

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
  return (
    <div
      onClick={() => onSelect(category.name)}
      className="bg-white border-2 border-slate-200/80 hover:border-orange-500 p-3 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center aspect-square group active:scale-95 hover:scale-[1.02]"
    >
      <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition-all mb-2 sm:mb-3 shadow-xs">
        <UtensilsCrossed className="w-6 h-6 sm:w-7 sm:h-7" />
      </div>
      <h3 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-1">
        {category.name}
      </h3>
      <p className="text-[11px] font-semibold text-slate-400 mt-1 bg-slate-100 group-hover:bg-orange-50 group-hover:text-orange-600 px-2.5 py-0.5 rounded-full transition-colors">
        {count} ta taom
      </p>
    </div>
  );
});
