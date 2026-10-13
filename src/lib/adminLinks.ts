import { IS_DESKTOP_APP } from '../constants';

const ADMIN_URL = 'https://orderplus.uz/admin';

/** Admin panelni shu kod yozilgan "yangi mahsulot" formasi bilan ochadigan havola. */
export function newProductAdminUrl(code: string): string {
  return `${ADMIN_URL}?newProductBarcode=${encodeURIComponent(code)}`;
}

/**
 * Xodim noma'lum tovarni menyuga qo'sha oladimi.
 *
 * Narxni faqat administrator belgilaydi: ofitsiant noma'lum tovarni o'zi
 * qo'sha olsa, narxni ham o'zi qo'yib, istagan summaga sotardi. Kassada
 * kafe administratori `manager` rolida keladi (`cafe_admin` dan o'giriladi).
 */
export function canManageProducts(role: string | undefined): boolean {
  return role === 'manager' || role === 'cafe_admin';
}

/**
 * Havolani tizim brauzerida ochadi.
 *
 * Desktop kassada ilova oynasi admin panelga o'tib ketmasin (orqaga qaytish
 * tugmasi yo'q) — havola tashqi brauzerda ochiladi. Ochilmasa kassa
 * buzilmaydi, havola shunchaki ochilmaydi.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!IS_DESKTOP_APP) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } catch (err) {
    console.warn('Havolani ochib bo‘lmadi:', err);
  }
}
