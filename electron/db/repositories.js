const crypto = require('crypto');
const { getDB } = require('./index');

function mapOrderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tableNumber: row.table_number,
    orderType: row.order_type,
    items: row.items,
    subtotal: row.subtotal,
    serviceFee: row.service_fee,
    discountAmount: row.discount_amount,
    discountPercent: row.discount_percent,
    total: row.total,
    status: row.status,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    cafeId: row.cafe_id,
    paymentMethod: row.payment_method,
    cashAmount: row.cash_amount,
    cardAmount: row.card_amount,
    waiterName: row.waiter_name,
  };
}

async function createLocalOrder(orderData) {
  const db = getDB();
  const id = orderData.id || crypto.randomUUID();
  const now = new Date().toISOString();

  let itemsJson = '[]';
  let parsedItems = [];
  if (typeof orderData.items === 'string') {
    itemsJson = orderData.items;
    try {
      parsedItems = JSON.parse(orderData.items);
    } catch {}
  } else if (Array.isArray(orderData.items)) {
    parsedItems = orderData.items;
    itemsJson = JSON.stringify(orderData.items);
  }

  const payload = JSON.stringify({
    ...orderData,
    id,
    items: itemsJson,
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  const tx = db.transaction(() => {
    // 1. Insert into orders
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, table_number, order_type, items,
        subtotal, service_fee, discount_amount, discount_percent, total,
        status, sync_status, created_at, updated_at, version,
        cafe_id, payment_method, cash_amount, card_amount, waiter_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 1, ?, ?, ?, ?, ?)
    `);

    insertOrder.run(
      id,
      orderData.tableNumber || '',
      orderData.orderType || 'DINE_IN',
      itemsJson,
      Number(orderData.subtotal) || 0,
      Number(orderData.serviceFee) || 0,
      Number(orderData.discountAmount) || 0,
      Number(orderData.discountPercent) || 0,
      Number(orderData.total) || 0,
      orderData.status || 'pending',
      now,
      now,
      orderData.cafeId || null,
      orderData.paymentMethod || null,
      Number(orderData.cashAmount) || 0,
      Number(orderData.cardAmount) || 0,
      orderData.waiterName || null
    );

    // 2. Insert into normalized order_items
    const insertItem = db.prepare(`
      INSERT INTO order_items (
        id, order_id, item_index, product_id, name, quantity, unit_price, total, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    parsedItems.forEach((it, idx) => {
      const itemId = `${id}_item_${idx}`;
      const name = it.name || it.product?.name || 'Taom';
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.price || it.unitPrice) || 0;
      const tot = Number(it.total) || qty * unitPrice;
      insertItem.run(itemId, id, idx, it.productId || it.product?.id || null, name, qty, unitPrice, tot, it.note || null);
    });

    // 3. Insert into sync_operations
    const syncOpId = crypto.randomUUID();
    const insertSync = db.prepare(`
      INSERT INTO sync_operations (
        id, operation_id, order_id, action, payload_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'CREATE', ?, 'pending', ?, ?)
    `);

    insertSync.run(syncOpId, syncOpId, id, payload, now, now);
  });

  tx();
  return getOrderById(id);
}

async function getOrders() {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  return rows.map(mapOrderRow);
}

async function getOrderById(id) {
  const db = getDB();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  return mapOrderRow(row);
}

async function updateOrderStatus(id, status) {
  const db = getDB();
  const now = new Date().toISOString();

  let updatedOrder = null;
  const tx = db.transaction(() => {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!existing) {
      return;
    }

    const newVersion = (existing.version || 1) + 1;

    db.prepare(`
      UPDATE orders
      SET status = ?, sync_status = 'pending', updated_at = ?, version = ?
      WHERE id = ?
    `).run(status, now, newVersion, id);

    const payload = JSON.stringify({ id, status, updatedAt: now, version: newVersion });
    const syncOpId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO sync_operations (
        id, operation_id, order_id, action, payload_json, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'STATUS_CHANGE', ?, 'pending', ?, ?)
    `).run(syncOpId, syncOpId, id, payload, now, now);

    const updatedRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    updatedOrder = mapOrderRow(updatedRow);
  });

  tx();
  return updatedOrder;
}

async function markOrderSynced(id, serverVersion = null) {
  const db = getDB();
  if (serverVersion !== null && serverVersion !== undefined) {
    db.prepare("UPDATE orders SET sync_status = 'synced', version = ? WHERE id = ?").run(
      serverVersion,
      id
    );
  } else {
    db.prepare("UPDATE orders SET sync_status = 'synced' WHERE id = ?").run(id);
  }
}

async function getPendingSyncItems() {
  const db = getDB();
  const rows = db
    .prepare(
      `SELECT id, order_id, action, payload_json AS payload, status, retry_count, last_error, created_at
       FROM sync_operations
       WHERE status IN ('pending', 'failed')
       ORDER BY created_at ASC`
    )
    .all();
  return rows;
}

async function updateSyncQueueStatus(queueId, status, lastError = null) {
  const db = getDB();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE sync_operations
     SET status = ?, retry_count = retry_count + 1, last_error = ?, updated_at = ?
     WHERE id = ?`
  ).run(status, lastError, now, queueId);
}

async function deleteSyncQueueItem(queueId) {
  const db = getDB();
  db.prepare('DELETE FROM sync_operations WHERE id = ?').run(queueId);
}

module.exports = {
  createLocalOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  markOrderSynced,
  getPendingSyncItems,
  updateSyncQueueStatus,
  deleteSyncQueueItem,
  mapOrderRow,
};
