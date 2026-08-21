
export const API_BASE_URL = 
  (typeof window !== 'undefined' && localStorage.getItem('uzbecano_api_url')) ||
  (import.meta as any).env?.VITE_API_URL ||
  'https://orderplus.uz';

/**
 * An order in a terminal state is finished business and no longer holds its
 * table. Checking for 'served' alone left a cancelled order counting as the
 * table's active ticket: the table stayed "band" and the cashier's next order
 * attached itself to a cancelled one.
 */
export const TERMINAL_ORDER_STATUSES = ['served', 'cancelled'];

export function isActiveOrder(status: string | null | undefined): boolean {
  if (!status) return false;
  return !TERMINAL_ORDER_STATUSES.includes(status);
}
