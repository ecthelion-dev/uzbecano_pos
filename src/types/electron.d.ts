export interface ElectronAPI {
  createOrder: (orderData: any) => Promise<any>;
  getOrders: () => Promise<any[]>;
  updateOrderStatus: (id: string, status: string) => Promise<any>;
  triggerSync: () => Promise<{ pendingCount: number; failedCount: number }>;
  getSyncStatus: () => Promise<{ pendingCount: number; failedCount: number }>;
  printReceipt: (receiptData: any) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    require?: any;
  }
}

export {};
