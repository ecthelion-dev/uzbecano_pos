
export const API_BASE_URL = 
  (typeof window !== 'undefined' && localStorage.getItem('uzbecano_api_url')) ||
  (import.meta as any).env?.VITE_API_URL ||
  'https://orderplus.uz';

export const ALL_TABLE_DEFINITIONS = [
  { number: 'Stol 01', area: 'Asosiy Zal' },
  { number: 'Stol 02', area: 'Asosiy Zal' },
  { number: 'Stol 03', area: 'Asosiy Zal' },
  { number: 'Stol 04', area: 'Asosiy Zal' },
  { number: 'Stol 05', area: 'Asosiy Zal' },
  { number: 'Stol 06', area: 'Asosiy Zal' },
  { number: 'Stol 07', area: 'Asosiy Zal' },
  { number: 'Stol 08', area: 'Asosiy Zal' },
  { number: 'Stol 201', area: '2-Qavat' },
  { number: 'Stol 202', area: '2-Qavat' },
  { number: 'Stol 203', area: '2-Qavat' },
  { number: 'Stol 204', area: '2-Qavat' },
  { number: 'Stol 205', area: '2-Qavat' },
  { number: 'Stol 206', area: '2-Qavat' },
  { number: 'Kabina 01', area: 'VIP Kabinalar' },
  { number: 'Kabina 02', area: 'VIP Kabinalar' },
  { number: 'Kabina 03', area: 'VIP Kabinalar' },
  { number: 'Kabina 04', area: 'VIP Kabinalar' },
  { number: 'VIP Xona 01', area: 'Alohida Xonalar' },
  { number: 'VIP Xona 02', area: 'Alohida Xonalar' },
];
