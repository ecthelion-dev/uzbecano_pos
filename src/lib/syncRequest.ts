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
    return {
      url: `${baseUrl}/api/orders`,
      init: { method: 'POST', headers: headers(), body: JSON.stringify({ ...item.order, cafeId }) },
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
