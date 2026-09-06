/**
 * Shu qurilmaning barqaror nomi.
 *
 * Stol belgisi qurilma bo'yicha o'chiriladi: kassa "men shu stollarda
 * buyurtma yig'yapman" deb aytganda, ro'yxatdan tushganlari o'chadi. Nom
 * bo'lmasa yoki har safar o'zgarsa, kassa o'z belgisini topa olmaydi va
 * tashlab ketilgan belgilar to'planib borardi.
 *
 * Sessiyaga bog'lanmaydi: bitta kassada xodim almashadi, qurilma esa
 * o'sha-o'sha qoladi.
 */
const KEY = 'orderplus_device_id';

let cached: string | null = null;

export function getDeviceId(): string {
  if (cached) return cached;

  try {
    const stored = localStorage.getItem(KEY);
    if (stored && stored.length >= 8) {
      cached = stored;
      return stored;
    }
  } catch {
    // Xotira yopiq (yashirin oyna, sozlama). Pastda vaqtinchalik nom
    // yasaladi: u ilova yopilguncha yashaydi va belgi o'zi eskiradi.
  }

  const fresh =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    localStorage.setItem(KEY, fresh);
  } catch {
    // Saqlab bo'lmadi — nom shu seansda ishlayveradi.
  }

  cached = fresh;
  return fresh;
}
