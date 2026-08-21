
export const API_BASE_URL = 
  (typeof window !== 'undefined' && localStorage.getItem('uzbecano_api_url')) ||
  (import.meta as any).env?.VITE_API_URL ||
  'https://orderplus.uz';
