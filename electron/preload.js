const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  createOrder: (orderData) => ipcRenderer.invoke('db:create-order', orderData),
  getOrders: () => ipcRenderer.invoke('db:get-orders'),
  updateOrderStatus: (id, status) => ipcRenderer.invoke('db:update-order-status', { id, status }),
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),
  getSyncStatus: () => ipcRenderer.invoke('sync:get-status'),
  printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData),
});
