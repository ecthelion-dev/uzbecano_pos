import { useState, useEffect } from 'react';
import { readCafeJson, writeCafeJson } from '../lib/storage';
import { resolveActiveCafeId } from '../constants';
import type { CartItem } from '../types';
import type { PromoTerms } from '../lib/promo';

/**
 * Yozilayotgan savatlar — diskda saqlanadi va xotira bilan sinxronlanadi.
 */
export function useTableCarts() {
  const [tableCarts, setTableCarts] = useState<Record<string, CartItem[]>>(() => {
    try {
      const saved = readCafeJson<Record<string, CartItem[]>>(resolveActiveCafeId(), 'carts', {});
      for (const table of Object.keys(saved)) {
        saved[table] = (saved[table] || []).map((item, idx) => (
          item?.lineId ? item : { ...item, lineId: `${item?.product?.id || 'line'}-${idx}` }
        ));
      }
      return saved;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    writeCafeJson(resolveActiveCafeId(), 'carts', tableCarts);
  }, [tableCarts]);

  return [tableCarts, setTableCarts] as const;
}

/**
 * Har bir stol uchun qoralama chegirmalar/promolar.
 */
export function useTableDraftPromos() {
  const [tableDraftPromos, setTableDraftPromos] = useState<Record<string, PromoTerms | null>>(() => {
    try {
      return readCafeJson<Record<string, PromoTerms | null>>(resolveActiveCafeId(), 'draft_promos', {}) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    writeCafeJson(resolveActiveCafeId(), 'draft_promos', tableDraftPromos);
  }, [tableDraftPromos]);

  return [tableDraftPromos, setTableDraftPromos] as const;
}
