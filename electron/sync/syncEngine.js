const repositories = require('../db/repositories');

class SyncEngine {
  constructor(serverBaseUrl = process.env.VITE_API_URL || 'http://localhost:3000') {
    this.serverBaseUrl = serverBaseUrl;
    this.isSyncing = false;
  }

  async syncPending() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const pendingItems = await repositories.getPendingSyncItems();
      if (!pendingItems || pendingItems.length === 0) {
        this.isSyncing = false;
        return { success: true, processed: 0 };
      }

      for (const item of pendingItems) {
        await repositories.updateSyncQueueStatus(item.id, 'syncing');

        try {
          const payload = JSON.parse(item.payload);
          const response = await fetch(`${this.serverBaseUrl}/api/orders/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: item.action,
              payload
            })
          });

          if (response.ok) {
            const resData = await response.json();
            
            if (resData.conflict && resData.resolvedOrder) {
              await repositories.updateOrderStatus(
                resData.resolvedOrder.id,
                resData.resolvedOrder.status
              );
            }

            await repositories.markOrderSynced(item.order_id, resData.version || payload.version);
            await repositories.deleteSyncQueueItem(item.id);
          } else {
            const errText = await response.text();
            await repositories.updateSyncQueueStatus(item.id, 'failed', errText);
          }
        } catch (err) {
          await repositories.updateSyncQueueStatus(item.id, 'failed', err.message);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async getSummary() {
    const pendingItems = await repositories.getPendingSyncItems();
    return {
      pendingCount: pendingItems.filter(i => i.status === 'pending' || i.status === 'syncing').length,
      failedCount: pendingItems.filter(i => i.status === 'failed').length
    };
  }
}

module.exports = SyncEngine;
