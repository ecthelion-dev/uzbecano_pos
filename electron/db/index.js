const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let dbPath = null;

function getDbPath() {
  if (!dbPath) {
    const userDir = app.getPath('userData');
    dbPath = path.join(userDir, 'uzbecano_pos_store.json');
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ orders: [], sync_queue: [] }, null, 2));
    }
  }
  return dbPath;
}

let cachedData = null;
let writeTimer = null;

function readData() {
  if (cachedData) return cachedData;
  try {
    const fileContent = fs.readFileSync(getDbPath(), 'utf8');
    cachedData = JSON.parse(fileContent);
  } catch (e) {
    cachedData = { orders: [], sync_queue: [] };
  }
  return cachedData;
}

function writeData(data) {
  cachedData = data;
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.writeFileSync(getDbPath(), JSON.stringify(data, null, 2));
    } catch (e) {}
  }, 300);
}

const db = {
  async exec(sql) {},
  async get(sql, params) {},
  async all(sql, params) {},
  async run(sql, params) {}
};

async function getDB() {
  return {
    async exec() {},
    async all(sql) {
      const data = readData();
      if (sql.includes('orders')) return data.orders;
      if (sql.includes('sync_queue')) return data.sync_queue;
      return [];
    },
    async get(sql, params) {
      const data = readData();
      if (sql.includes('orders') && params) {
        return data.orders.find(o => o.id === params[0]);
      }
      return null;
    },
    async run(sql, params) {
      const data = readData();
      if (sql.includes('INSERT INTO orders')) {
        const [id, table_number, order_type, phone, address, items, subtotal, service_fee, total, status, sync_status, created_at, updated_at, version] = params;
        const existingIndex = data.orders.findIndex(o => o.id === id);
        const newOrder = { id, table_number, order_type, phone, address, items, subtotal, service_fee, total, status, sync_status, created_at, updated_at, version };
        if (existingIndex >= 0) {
          data.orders[existingIndex] = newOrder;
        } else {
          data.orders.push(newOrder);
        }
        writeData(data);
      } else if (sql.includes('UPDATE orders SET status')) {
        const [status, updated_at, id] = params;
        const order = data.orders.find(o => o.id === id);
        if (order) {
          order.status = status;
          order.updated_at = updated_at;
          writeData(data);
        }
      } else if (sql.includes('INSERT INTO sync_queue')) {
        const [id, order_id, action, payload, status, retry_count, last_error, created_at] = params;
        data.sync_queue.push({ id, order_id, action, payload, status, retry_count, last_error, created_at });
        writeData(data);
      }
      return { lastID: 1, changes: 1 };
    }
  };
}

module.exports = { getDB };
