const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let dbInstance = null;
let currentDbPath = null;
let isInitialized = false;

function getDefaultDbPath() {
  try {
    const { app } = require('electron');
    if (app && typeof app.getPath === 'function') {
      return path.join(app.getPath('userData'), 'orderplus.sqlite');
    }
  } catch {}
  return path.join(process.cwd(), 'orderplus.sqlite');
}

function runIntegrityCheck(db) {
  const rows = db.pragma('integrity_check');
  const status = Array.isArray(rows) && rows.length > 0 ? rows[0].integrity_check : null;
  return { ok: status === 'ok', detail: rows };
}

function backupDbFile(dbPath, db) {
  // Flush WAL into the main file first so the backup copy is complete on its own,
  // not missing recent committed writes that are still sitting in the -wal file.
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {}
  const backupPath = `${dbPath}.backup-${Date.now()}-pre-migration`;
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

function runMigrations(db, dbPath) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedMigrations = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  );

  const migrations = [
    {
      version: 1,
      name: 'initial_pos_schema',
      up: (dbTx) => {
        dbTx.exec(`
          CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            table_number TEXT,
            order_type TEXT DEFAULT 'DINE_IN',
            -- Dead column: the customer phone was removed along with delivery.
            -- Kept because this migration already ran on every till; editing an
            -- applied migration would split schemas across terminals.
            phone TEXT,
            -- Dead column: delivery was removed and nothing reads or writes it.
            -- Left in place because this migration already ran on every till;
            -- editing an applied migration would leave new and existing
            -- terminals on different schemas. It is nullable, so inserts that
            -- omit it are fine.
            address TEXT,
            items TEXT,
            subtotal INTEGER DEFAULT 0,
            service_fee INTEGER DEFAULT 0,
            discount_amount INTEGER DEFAULT 0,
            discount_percent INTEGER DEFAULT 0,
            total INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            sync_status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 1,
            cafe_id TEXT,
            payment_method TEXT,
            cash_amount INTEGER DEFAULT 0,
            card_amount INTEGER DEFAULT 0,
            waiter_name TEXT
          );

          CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            item_index INTEGER NOT NULL,
            product_id TEXT,
            name TEXT NOT NULL,
            quantity REAL NOT NULL DEFAULT 1,
            unit_price INTEGER NOT NULL DEFAULT 0,
            total INTEGER NOT NULL DEFAULT 0,
            note TEXT,
            metadata_json TEXT
          );

          CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            method TEXT NOT NULL,
            amount INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'completed',
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS sync_operations (
            id TEXT PRIMARY KEY,
            operation_id TEXT UNIQUE,
            order_id TEXT NOT NULL,
            action TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            retry_count INTEGER NOT NULL DEFAULT 0,
            next_retry_at TEXT,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            actor_id TEXT,
            metadata_json TEXT,
            created_at TEXT NOT NULL
          );

          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );

          CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
          CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
          CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status, created_at);
          CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
        `);
      },
    },
  ];

  const pending = migrations.filter((m) => !appliedMigrations.has(m.version));
  if (pending.length === 0) return;

  // Automatic backup before applying any pending schema migration. Skipped
  // only for a brand-new database (better-sqlite3 creates the file on open,
  // so file-existence alone can't tell "fresh" from "has data" — a database
  // that has never had a migration recorded as applied has nothing to back
  // up). If the backup itself fails (e.g. disk full/permissions), refuse to
  // migrate rather than risk an unrecoverable schema change.
  let backupPath = null;
  if (dbPath && appliedMigrations.size > 0) {
    try {
      backupPath = backupDbFile(dbPath, db);
    } catch (err) {
      throw new Error(
        `[MIGRATION_ABORTED] Could not create pre-migration backup, refusing to migrate: ${err.message}`
      );
    }
  }

  for (const m of pending) {
    const applyTx = db.transaction(() => {
      m.up(db);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(m.version, m.name, new Date().toISOString());
    });
    applyTx();
  }

  // Integrity check after migration so schema/data corruption is caught
  // immediately, with a known-good backup available for recovery, instead of
  // surfacing later as a mysterious runtime failure.
  const { ok, detail } = runIntegrityCheck(db);
  if (!ok) {
    throw new Error(
      `[MIGRATION_INTEGRITY_FAILURE] Post-migration integrity_check failed: ${JSON.stringify(detail)}.` +
      (backupPath ? ` Pre-migration backup available at: ${backupPath}` : ' No pre-migration backup existed (fresh database).')
    );
  }
}

function migrateLegacyJson(db, dbDirectory) {
  const legacyJsonPath = path.join(dbDirectory, 'uzbecano_pos_store.json');
  if (!fs.existsSync(legacyJsonPath)) {
    return { migrated: false, reason: 'no_legacy_file' };
  }

  let fileContent;
  let parsed;
  try {
    fileContent = fs.readFileSync(legacyJsonPath, 'utf8');
    parsed = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(
      `[MIGRATION_ERROR] Legacy JSON store at ${legacyJsonPath} is corrupt or unreadable: ${err.message}`
    );
  }

  const legacyOrders = Array.isArray(parsed.orders) ? parsed.orders : [];
  const legacySyncQueue = Array.isArray(parsed.sync_queue) ? parsed.sync_queue : [];

  if (legacyOrders.length === 0 && legacySyncQueue.length === 0) {
    return { migrated: false, reason: 'empty_legacy_data' };
  }

  const migrationTx = db.transaction(() => {
    const insertOrderStmt = db.prepare(`
      INSERT OR IGNORE INTO orders (
        id, table_number, order_type, items,
        subtotal, service_fee, discount_amount, total, status,
        sync_status, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItemStmt = db.prepare(`
      INSERT OR IGNORE INTO order_items (
        id, order_id, item_index, name, quantity, unit_price, total, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSyncStmt = db.prepare(`
      INSERT OR IGNORE INTO sync_operations (
        id, operation_id, order_id, action, payload_json,
        status, retry_count, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const o of legacyOrders) {
      if (!o.id) continue;
      const itemsStr = typeof o.items === 'string' ? o.items : JSON.stringify(o.items || []);
      insertOrderStmt.run(
        o.id,
        o.table_number || o.tableNumber || '',
        o.order_type || o.orderType || 'DINE_IN',
        itemsStr,
        Number(o.subtotal) || 0,
        Number(o.service_fee || o.serviceFee) || 0,
        Number(o.discount_amount || o.discountAmount) || 0,
        Number(o.total) || 0,
        o.status || 'pending',
        o.sync_status || o.syncStatus || 'pending',
        o.created_at || o.createdAt || new Date().toISOString(),
        o.updated_at || o.updatedAt || new Date().toISOString(),
        Number(o.version) || 1
      );

      let parsedItems = [];
      try {
        parsedItems = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
      } catch {}

      if (Array.isArray(parsedItems)) {
        parsedItems.forEach((it, idx) => {
          const itemId = `${o.id}_item_${idx}`;
          insertItemStmt.run(
            itemId,
            o.id,
            idx,
            it.name || 'Taom',
            Number(it.quantity) || 1,
            Number(it.price || it.unitPrice) || 0,
            (Number(it.quantity) || 1) * (Number(it.price || it.unitPrice) || 0),
            it.note || null
          );
        });
      }
    }

    for (const sq of legacySyncQueue) {
      if (!sq.id) continue;
      const now = new Date().toISOString();
      insertSyncStmt.run(
        sq.id,
        sq.id,
        sq.order_id || sq.orderId || '',
        sq.action || 'CREATE',
        typeof sq.payload === 'string' ? sq.payload : JSON.stringify(sq.payload || {}),
        sq.status || 'pending',
        Number(sq.retry_count || sq.retryCount) || 0,
        sq.last_error || sq.lastError || null,
        sq.created_at || sq.createdAt || now,
        now
      );
    }
  });

  migrationTx();

  // Create safety backup of legacy JSON
  try {
    const backupPath = `${legacyJsonPath}.migrated-backup`;
    fs.copyFileSync(legacyJsonPath, backupPath);
  } catch {}

  return { migrated: true, ordersCount: legacyOrders.length, queueCount: legacySyncQueue.length };
}

function initDB(customPath = null) {
  if (dbInstance && isInitialized && (!customPath || customPath === currentDbPath)) {
    return dbInstance;
  }

  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
    isInitialized = false;
  }

  currentDbPath = customPath || getDefaultDbPath();
  const dbDir = path.dirname(currentDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(currentDbPath);

  try {
    runMigrations(dbInstance, currentDbPath);
  } catch (err) {
    dbInstance.close();
    dbInstance = null;
    throw err;
  }

  try {
    migrateLegacyJson(dbInstance, dbDir);
  } catch (err) {
    dbInstance.close();
    dbInstance = null;
    throw err;
  }

  isInitialized = true;
  return dbInstance;
}

function getDB() {
  if (!dbInstance || !isInitialized) {
    return initDB(currentDbPath);
  }
  return dbInstance;
}

function closeDB() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
    isInitialized = false;
  }
}

module.exports = {
  initDB,
  getDB,
  closeDB,
  getDefaultDbPath,
  runMigrations,
  migrateLegacyJson,
  runIntegrityCheck,
  backupDbFile,
};
