const { getDB } = require('./index');
const crypto = require('crypto');

async function createLocalOrder(orderData) {
  const db = await getDB();
  const id = orderData.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const payload = JSON.stringify({ ...orderData, id, createdAt: now, updatedAt: now, version: 1 });

  await db.run(
    `INSERT INTO orders (
      id, table_number, order_type, phone, address, items,
      subtotal, service_fee, total, status, sync_status, created_at, updated_at, version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 1)`,
    [
      id,
      orderData.tableNumber || '',
      orderData.orderType || 'DINE_IN',
      orderData.phone || '',
      orderData.address || '',
      typeof orderData.items === 'string' ? orderData.items : JSON.stringify(orderData.items || []),
      orderData.subtotal || 0,
      orderData.serviceFee || 0,
      orderData.total || 0,
      orderData.status || 'pending',
      now,
      now
    ]
  );

  await db.run(
    `INSERT INTO sync_queue (id, order_id, action, payload, status, created_at)
     VALUES (?, ?, 'CREATE', ?, 'pending', ?)`,
    [crypto.randomUUID(), id, payload, now]
  );

  return getOrderById(id);
}

async function getOrders() {
  const db = await getDB();
  const rows = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
  return rows.map(mapOrderRow);
}

async function getOrderById(id) {
  const db = await getDB();
  const row = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
  return row ? mapOrderRow(row) : null;
}

async function updateOrderStatus(id, status) {
  const db = await getDB();
  const now = new Date().toISOString();
  const existing = await getOrderById(id);
  if (!existing) return null;

  const newVersion = existing.version + 1;

  await db.run(
    `UPDATE orders SET status = ?, sync_status = 'pending', updated_at = ?, version = ? WHERE id = ?`,
    [status, now, newVersion, id]
  );

  const payload = JSON.stringify({ id, status, updatedAt: now, version: newVersion });

  await db.run(
    `INSERT INTO sync_queue (id, order_id, action, payload, status, created_at) VALUES (?, ?, 'STATUS_CHANGE', ?, 'pending', ?)`,
    [crypto.randomUUID(), id, payload, now]
  );

  return getOrderById(id);
}

async function markOrderSynced(id, serverVersion = null) {
  const db = await getDB();
  if (serverVersion) {
    await db.run(`UPDATE orders SET sync_status = 'synced', version = ? WHERE id = ?`, [serverVersion, id]);
  } else {
    await db.run(`UPDATE orders SET sync_status = 'synced' WHERE id = ?`, [id]);
  }
}

async function getPendingSyncItems() {
  const db = await getDB();
  return db.all("SELECT * FROM sync_queue WHERE status IN ('pending', 'failed') ORDER BY created_at ASC");
}

async function updateSyncQueueStatus(queueId, status, lastError = null) {
  const db = await getDB();
  await db.run(
    `UPDATE sync_queue SET status = ?, retry_count = retry_count + 1, last_error = ? WHERE id = ?`,
    [status, lastError, queueId]
  );
}

async function deleteSyncQueueItem(queueId) {
  const db = await getDB();
  await db.run('DELETE FROM sync_queue WHERE id = ?', [queueId]);
}

function mapOrderRow(row) {
  return {
    id: row.id,
    tableNumber: row.table_number,
    orderType: row.order_type,
    phone: row.phone,
    address: row.address,
    items: row.items,
    subtotal: row.subtotal,
    serviceFee: row.service_fee,
    total: row.total,
    status: row.status,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version
  };
}

module.exports = {
  createLocalOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  markOrderSynced,
  getPendingSyncItems,
  updateSyncQueueStatus,
  deleteSyncQueueItem
};
