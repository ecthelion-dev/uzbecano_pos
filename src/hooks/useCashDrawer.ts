import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../constants';
import { fetchWithTimeout } from '../lib/net';
import { readCafeText, writeCafeJson } from '../lib/storage';
import { cashCategoryLabel } from '../lib/cashCategories';
import { buildCashEntryPayload } from '../lib/cashEntryPayload';
import type { CashTransaction } from '../types';
import type { TranslationKey } from '../lib/i18n/dictionaries/uz';

interface UseCashDrawerArgs {
  getActiveCafeId: () => string;
  getAuthHeaders: (approvalToken?: string) => Record<string, string>;
  requestAdminPin: (action: (approvalToken?: string) => void, titleKey?: TranslationKey) => void;
  isOfflineMode: boolean;
  currentWaiterName: string;
  queueCashForSync: (entry: unknown, label?: string, approvalToken?: string) => void;
  /** Saqlangandan keyin qisqa xabar (toast). */
  onSaved: () => void;
}

function readSavedTransactions(cafeId: string): CashTransaction[] {
  try {
    const saved = readCafeText(cafeId, 'cash_transactions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Kassa xarajatlari oynasi (ilgari `App.tsx` ichida turardi).
 *
 * Oyna rahbar PIN kodi bilan ochiladi va tasdiq tokeni oyna yopilguncha
 * saqlanadi: server o'qishni ham, yozishni ham shu dalilsiz bermaydi, har
 * so'rovda qaytadan PIN so'rash kassirni bir necha marta to'xtatardi.
 *
 * Yozuv SERVERGA boradi. Diskdagi nusxa ekran uchun: server javob berguncha
 * yozuv ro'yxatda darhol ko'rinishi kerak. Oyna ochilganda esa yozuvlar
 * SERVERDAN o'qiladi — ikkinchi kassadan kiritilgan xarajat diskda yo'q, ya'ni
 * jamlanma kam ko'rsatardi.
 */
export function useCashDrawer({
  getActiveCafeId,
  getAuthHeaders,
  requestAdminPin,
  isOfflineMode,
  currentWaiterName,
  queueCashForSync,
  onSaved,
}: UseCashDrawerArgs) {
  const [show, setShow] = useState(false);
  const [approvalToken, setApprovalToken] = useState<string | undefined>(undefined);
  const [transactions, setTransactions] = useState<CashTransaction[]>(() =>
    readSavedTransactions(getActiveCafeId()),
  );

  /**
   * Kassadan pul olish kafedagi eng oson suiiste'mol qilinadigan amal. Oynaning
   * o'zi hech narsani himoya qilmaydi: server ham shu tasdiqni talab qiladi.
   */
  const open = useCallback(() => {
    requestAdminPin((token?: string) => {
      setApprovalToken(token);
      setShow(true);
    }, 'admin.pinCashDrawer');
  }, [requestAdminPin]);

  // Tasdiq oyna bilan birga tugaydi: bir marta kiritilgan PIN smena oxirigacha
  // ochiq turgan eshik bo'lib qolmasin.
  const close = useCallback(() => {
    setShow(false);
    setApprovalToken(undefined);
  }, []);

  const toggle = useCallback(() => {
    if (show) close();
    else open();
  }, [show, close, open]);

  const addTransaction = useCallback(async (category: string, amount: number, note: string, businessDate?: string) => {
    const newTx: CashTransaction = {
      id: `tx_${Date.now()}`,
      type: 'chiqim',
      category,
      amount,
      note,
      createdAt: new Date().toISOString(),
      createdBy: currentWaiterName,
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    writeCafeJson(getActiveCafeId(), 'cash_transactions', updated);

    const payload = buildCashEntryPayload(category, amount, note, undefined, businessDate);
    const label = cashCategoryLabel(category);

    if (isOfflineMode) {
      queueCashForSync(payload, label, approvalToken);
    } else {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/cash-entries`, {
          method: 'POST',
          headers: getAuthHeaders(approvalToken),
          body: JSON.stringify(payload),
        });
        if (!res.ok) queueCashForSync(payload, label, approvalToken);
      } catch {
        queueCashForSync(payload, label, approvalToken);
      }
    }

    onSaved();
  }, [transactions, currentWaiterName, isOfflineMode, getActiveCafeId, getAuthHeaders, queueCashForSync, approvalToken, onSaved]);

  useEffect(() => {
    if (!show || isOfflineMode) return;
    let cancelled = false;

    (async () => {
      try {
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        const res = await fetchWithTimeout(
          `${API_BASE_URL}/api/cash-entries?from=${from.toISOString()}`,
          { cache: 'no-store', headers: getAuthHeaders(approvalToken) },
        );
        if (!res.ok) return;
        const rows = await res.json();
        if (cancelled || !Array.isArray(rows)) return;

        setTransactions(rows.map((r: any) => ({
          id: String(r.id),
          type: r.type === 'kirim' ? 'kirim' : 'chiqim',
          category: String(r.category || ''),
          amount: Number(r.amount) || 0,
          note: r.note || '',
          createdAt: r.createdAt,
          createdBy: r.createdBy || '',
        })));
      } catch {
        // Serverga yetib bo'lmadi — diskdagi nusxa ekranda qoladi.
      }
    })();

    return () => { cancelled = true; };
  }, [show, isOfflineMode, getAuthHeaders, approvalToken]);

  return { show, open, close, toggle, transactions, addTransaction };
}
