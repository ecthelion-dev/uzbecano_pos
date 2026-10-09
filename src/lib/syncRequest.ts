import type { QueuedItem } from './syncCycle';

/**
 * Navbatdagi amal qaysi so'rov bo'lib serverga ketadi.
 *
 * Ilgari bu `useOfflineSync` ichida yozilgan edi va uni hookdan tashqarida
 * ishlatib bo'lmasdi. Oflayn ssenariy testlari kassa yuboradigan AYNAN
 * o'sha so'rovni haqiqiy serverga yuborishi kerak: alohida nusxa yozilsa,
 * test bir narsani, kassa boshqa narsani tekshirib qolardi.
 */
export interface SyncRequestContext {
  baseUrl: string;
  cafeId: string;
  /** `X-Approval-Token` bilan yoki usiz sarlavhalar. */
  headers: (approvalToken?: string) => Record<string, string>;
}

export interface SyncRequest {
  url: string;
  init: RequestInit;
}

export function buildSyncRequest(item: QueuedItem, ctx: SyncRequestContext): SyncRequest {
  const { baseUrl, cafeId, headers } = ctx;
  if (item.kind === 'create') {
    /*
     * `promoCode` — server chegirmani FAQAT shundan hisoblaydi. Onlayn yo'l
     * uni qo'shib yuborardi, navbatdagi chekda esa faqat `promo` qolardi:
     * oflayn promo-kodli chek serverda chegirmasiz yozilib, kassa olgan
     * summadan katta chiqardi (2026-10-09, oflayn ssenariy testi).
     * Navbatda allaqachon turgan yozuvlar ham shu yerda tuzaladi.
     */
    const promoCode = item.order?.promoCode ?? item.order?.promo?.code;
    const body = { ...item.order, cafeId, ...(promoCode ? { promoCode } : {}) };
    return {
      url: `${baseUrl}/api/orders`,
      init: { method: 'POST', headers: headers(), body: JSON.stringify(body) },
    };
  }
  if (item.kind === 'patch') {
    return {
      url: `${baseUrl}/api/orders/${item.orderId}`,
      init: { method: 'PATCH', headers: headers(item.approvalToken), body: JSON.stringify(item.body) },
    };
  }
  if (item.kind === 'cash') {
    return {
      url: `${baseUrl}/api/cash-entries`,
      init: { method: 'POST', headers: headers(item.approvalToken), body: JSON.stringify(item.entry) },
    };
  }
  return {
    url: `${baseUrl}/api/orders/${item.orderId}`,
    init: { method: 'DELETE', headers: headers() },
  };
}
