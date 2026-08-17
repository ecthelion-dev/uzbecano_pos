import { DBCategory, DBProduct, DBWaiter } from '../types';

export const API_BASE_URL = 
  (typeof window !== 'undefined' && localStorage.getItem('uzbecano_api_url')) ||
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' 
    ? 'https://orderplus.uz'
    : 'http://localhost:3000');

export const DEFAULT_WAITERS: DBWaiter[] = [
  { id: 'w1', name: 'Ali', pinCode: '1111' },
  { id: 'w2', name: 'Vali', pinCode: '2222' }
];

export const DEFAULT_OFFLINE_CATEGORIES: DBCategory[] = [
  { id: 'cat_1', name: 'Milliy Taomlar' },
  { id: 'cat_2', name: 'Shashliklar' },
  { id: 'cat_3', name: 'Fast Food & Pizza' },
  { id: 'cat_4', name: 'Ichimliklar & Choy' },
  { id: 'cat_5', name: 'Salatlar & Souses' },
];

export const DEFAULT_OFFLINE_PRODUCTS: DBProduct[] = [
  {
    id: 'prod_1',
    name: 'Toshkent Oshi (Choyxona)',
    category: 'Milliy Taomlar',
    price: 38000,
    description: 'Sarxil qo\'y go\'shti va zardak sabzi bilan',
    variants: [
      { name: '0.5 Porsiya', price: 20000 },
      { name: '1.0 Porsiya', price: 38000 },
      { name: '1.5 Porsiya', price: 55000 }
    ],
    addons: [
      { name: 'Qazi', price: 15000 },
      { name: 'Bedana Tuxum', price: 4000 },
      { name: 'Nuxat', price: 3000 }
    ]
  },
  {
    id: 'prod_2',
    name: 'Manti (Go\'shtli)',
    category: 'Milliy Taomlar',
    price: 32000,
    description: 'Maydalangan mol go\'shti va piyozli',
    variants: [
      { name: '0.5 Porsiya (2 dona)', price: 16000 },
      { name: '1.0 Porsiya (4 dona)', price: 32000 },
      { name: '1.5 Porsiya (6 dona)', price: 48000 }
    ],
    addons: [
      { name: 'Smetana', price: 4000 },
      { name: 'Qatiq', price: 3000 }
    ]
  },
  { id: 'prod_3', name: 'Qozon Kebab', category: 'Milliy Taomlar', price: 65000, description: 'Qovurilgan go\'sht va kartoshka' },
  { id: 'prod_4', name: 'Mutton Shashlik (Qiyqim)', category: 'Shashliklar', price: 18000, description: 'Muzlatilmagan yangi qo\'y go\'shti' },
  { id: 'prod_5', name: 'Kavkazcha Shashlik', category: 'Shashliklar', price: 24000, description: 'Maxsus marinadlangan yumshoq go\'sht' },
  {
    id: 'prod_6',
    name: 'Pizza Pepperoni',
    category: 'Fast Food & Pizza',
    price: 75000,
    description: 'Pitsereya usulida pishirilgan',
    variants: [
      { name: 'Kichik (28 sm)', price: 55000 },
      { name: 'O\'rta (32 sm)', price: 75000 },
      { name: 'Katta (40 sm)', price: 105000 }
    ],
    addons: [
      { name: 'Qo\'shimcha Pishloq', price: 10000 },
      { name: 'Zaytuncha', price: 5000 },
      { name: 'Zamburug\' (Griby)', price: 8000 }
    ]
  },
  { id: 'prod_7', name: 'Uzbecano Big Burger', category: 'Fast Food & Pizza', price: 42000, description: 'Ikki qavatli suvli katlet va pishloq' },
  { id: 'prod_8', name: 'Ko\'k Choy (Choynak)', category: 'Ichimliklar & Choy', price: 5000, description: 'Limon va navot bilan' },
  {
    id: 'prod_9',
    name: 'Coca-Cola',
    category: 'Ichimliklar & Choy',
    price: 15000,
    description: 'Muzdek gazlangan ichimlik',
    variants: [
      { name: '0.5 Litr', price: 7000 },
      { name: '1.0 Litr', price: 11000 },
      { name: '1.5 Litr', price: 15000 }
    ]
  },
  { id: 'prod_10', name: 'Achichuk Salati', category: 'Salatlar & Souses', price: 12000, description: 'Yangi pomidor va piyoz salati' },
];

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
