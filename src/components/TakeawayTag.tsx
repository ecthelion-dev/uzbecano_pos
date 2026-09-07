import React from 'react';
import { Package } from 'lucide-react';
import { useT } from '../lib/i18n/LanguageProvider';

/**
 * "Saboy" belgisi — bitta joyda.
 *
 * Bu yozuv oltita ekranda chiqadi: savat, yuborilgan qatorlar, chek
 * ko'rinishi, oshxona varag'i, arxivdagi chek. Har birida qo'lda
 * yozilganda bittasi unutilardi — va aynan o'sha ekranga qaragan odam
 * taomni tovoqda chiqarib yuborardi.
 *
 * Bayroqni ham shu yerda o'qiydi: kassa `takeaway`, server esa aynan
 * shu nom bilan qaytaradi, lekin qiymat matn bo'lib kelishi ham mumkin.
 */
export function isTakeawayItem(item: unknown): boolean {
  const value = (item as { takeaway?: unknown })?.takeaway;
  return value === true || value === 'true' || value === 1;
}

export const TakeawayTag: React.FC<{ item: unknown; className?: string }> = ({ item, className = '' }) => {
  const t = useT();
  if (!isTakeawayItem(item)) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded uppercase tracking-wide align-middle ${className}`}
    >
      <Package className="w-2.5 h-2.5" />
      {t('cart.takeaway')}
    </span>
  );
};
