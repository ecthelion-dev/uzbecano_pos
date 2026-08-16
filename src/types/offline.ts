export interface LocalOrder {
  id: string;
  tableNumber: string;
  orderType?: string;
  phone?: string;
  address?: string;
  items: string; // JSON string
  subtotal: number;
  serviceFee: number;
  total: number;
  status: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface SyncQueueItem {
  id: string;
  orderId: string;
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE';
  payload: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

export interface SyncStatusSummary {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncedAt?: string;
}
