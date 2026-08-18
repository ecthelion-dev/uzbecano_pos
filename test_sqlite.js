const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const { initDB, getDB, closeDB, runMigrations, migrateLegacyJson } = require('./electron/db/index');
const repositories = require('./electron/db/repositories');

console.log('=== RUNNING SQLITE PERSISTENCE & MIGRATION TESTS ===\n');

const testDir = path.join(os.tmpdir(), `uzbecano_pos_test_${Date.now()}_${Math.random().toString(36).slice(2)}`);
fs.mkdirSync(testDir, { recursive: true });
const testDbPath = path.join(testDir, 'orderplus.sqlite');

try {
  // Test A: Schema, migrations, WAL mode and foreign keys
  const db = initDB(testDbPath);
  const journalMode = db.pragma('journal_mode', { simple: true });
  const foreignKeys = db.pragma('foreign_keys', { simple: true });
  const busyTimeout = db.pragma('busy_timeout', { simple: true });

  assert.equal(journalMode.toLowerCase(), 'wal', 'WAL mode is enabled');
  assert.equal(foreignKeys, 1, 'Foreign keys are enabled');
  assert.equal(busyTimeout, 5000, 'Busy timeout is 5000ms');

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  assert(tables.includes('orders'), 'orders table exists');
  assert(tables.includes('order_items'), 'order_items table exists');
  assert(tables.includes('payments'), 'payments table exists');
  assert(tables.includes('sync_operations'), 'sync_operations table exists');
  assert(tables.includes('audit_logs'), 'audit_logs table exists');
  assert(tables.includes('app_settings'), 'app_settings table exists');
  assert(tables.includes('schema_migrations'), 'schema_migrations table exists');
  console.log('[PASS] A. Schema, migrations, WAL mode & foreign keys initialized');

  // Test B: Atomic order creation + normalized items + sync outbox
  async function testAtomicCreate() {
    const orderData = {
      id: 'ord_test_001',
      tableNumber: 'Stol-5',
      orderType: 'DINE_IN',
      phone: '+998901234567',
      address: 'Toshkent',
      subtotal: 70000,
      serviceFee: 7000,
      discountAmount: 5000,
      total: 72000,
      status: 'sent_to_kitchen',
      cafeId: 'test_cafe',
      paymentMethod: 'naqd',
      items: [
        { name: 'Osh', price: 35000, quantity: 2, total: 70000, note: 'Achchiq' }
      ]
    };

    const created = await repositories.createLocalOrder(orderData);
    assert.equal(created.id, 'ord_test_001');
    assert.equal(created.tableNumber, 'Stol-5');
    assert.equal(created.total, 72000);
    assert.equal(created.version, 1);

    // Verify order_items
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all('ord_test_001');
    assert.equal(items.length, 1);
    assert.equal(items[0].name, 'Osh');
    assert.equal(items[0].quantity, 2);
    assert.equal(items[0].unit_price, 35000);

    // Verify sync_operations outbox
    const syncOps = db.prepare('SELECT * FROM sync_operations WHERE order_id = ?').all('ord_test_001');
    assert.equal(syncOps.length, 1);
    assert.equal(syncOps[0].action, 'CREATE');
    assert.equal(syncOps[0].status, 'pending');
  }

  testAtomicCreate().then(async () => {
    console.log('[PASS] B. Order creation + order_items + outbox committed atomically');

    // Test C: Update status + atomic version increment + outbox entry
    const updated = await repositories.updateOrderStatus('ord_test_001', 'preparing');
    assert.equal(updated.status, 'preparing');
    assert.equal(updated.version, 2, 'Version incremented to 2');

    const updatedSyncOps = db.prepare('SELECT * FROM sync_operations WHERE order_id = ? ORDER BY created_at ASC').all('ord_test_001');
    assert.equal(updatedSyncOps.length, 2, 'Two sync operations recorded (CREATE and STATUS_CHANGE)');
    assert.equal(updatedSyncOps[1].action, 'STATUS_CHANGE');
    console.log('[PASS] C. Order status update + version increment + STATUS_CHANGE outbox recorded');

    // Test D: Queue UPDATE and DELETE
    const pending = await repositories.getPendingSyncItems();
    assert(pending.length >= 2, 'Pending sync items retrieved');
    const firstQueueId = pending[0].id;

    await repositories.updateSyncQueueStatus(firstQueueId, 'failed', 'Network timeout');
    const failedOp = db.prepare('SELECT * FROM sync_operations WHERE id = ?').get(firstQueueId);
    assert.equal(failedOp.status, 'failed');
    assert.equal(failedOp.retry_count, 1);
    assert.equal(failedOp.last_error, 'Network timeout');

    await repositories.deleteSyncQueueItem(firstQueueId);
    const deletedOp = db.prepare('SELECT * FROM sync_operations WHERE id = ?').get(firstQueueId);
    assert.equal(deletedOp, undefined, 'Deleted queue item removed from database');
    console.log('[PASS] D. Queue UPDATE and DELETE operate correctly');

    // Test E: Close and Reopen persistence
    closeDB();
    const reopenedDb = initDB(testDbPath);
    const orderAfterReopen = await repositories.getOrderById('ord_test_001');
    assert.equal(orderAfterReopen.id, 'ord_test_001');
    assert.equal(orderAfterReopen.version, 2);
    console.log('[PASS] E. SQLite persists data correctly across close and reopen');

    // Test F: Transaction Rollback integrity
    let threw = false;
    try {
      const rollbackTx = reopenedDb.transaction(() => {
        reopenedDb.prepare("INSERT INTO orders (id, created_at, updated_at) VALUES ('ord_rollback', '2026-08-19', '2026-08-19')").run();
        throw new Error('Simulated failure inside transaction');
      });
      rollbackTx();
    } catch (err) {
      threw = true;
    }
    assert(threw, 'Error thrown in transaction');
    const rollbackCheck = reopenedDb.prepare("SELECT * FROM orders WHERE id = 'ord_rollback'").get();
    assert.equal(rollbackCheck, undefined, 'Transaction successfully rolled back with zero partial writes');
    console.log('[PASS] F. Transaction rollback prevents partial writes');

    // Test G: Legacy JSON migration & corrupt JSON protection
    const legacyTestDir = path.join(os.tmpdir(), `uzbecano_legacy_test_${Date.now()}`);
    fs.mkdirSync(legacyTestDir, { recursive: true });
    const legacyDbPath = path.join(legacyTestDir, 'orderplus.sqlite');
    const legacyJsonPath = path.join(legacyTestDir, 'uzbecano_pos_store.json');

    // 1. Valid Legacy JSON migration
    const sampleLegacyJson = {
      orders: [
        {
          id: 'ord_legacy_1',
          tableNumber: 'Stol-1',
          total: 50000,
          status: 'ready',
          items: [{ name: 'Somsa', price: 10000, quantity: 5 }]
        }
      ],
      sync_queue: [
        {
          id: 'sync_leg_1',
          orderId: 'ord_legacy_1',
          action: 'CREATE',
          payload: JSON.stringify({ id: 'ord_legacy_1' })
        }
      ]
    };
    fs.writeFileSync(legacyJsonPath, JSON.stringify(sampleLegacyJson, null, 2));

    closeDB();
    const legacyDb = initDB(legacyDbPath);
    const migratedOrder = legacyDb.prepare("SELECT * FROM orders WHERE id = 'ord_legacy_1'").get();
    assert(migratedOrder, 'Legacy order successfully imported to SQLite');
    assert.equal(migratedOrder.table_number, 'Stol-1');
    assert.equal(migratedOrder.total, 50000);

    const migratedItems = legacyDb.prepare("SELECT * FROM order_items WHERE order_id = 'ord_legacy_1'").all();
    assert.equal(migratedItems.length, 1);
    assert.equal(migratedItems[0].name, 'Somsa');

    const migratedQueue = legacyDb.prepare("SELECT * FROM sync_operations WHERE id = 'sync_leg_1'").get();
    assert(migratedQueue, 'Legacy sync queue item imported to sync_operations');

    // Verify backup copy was created
    assert(fs.existsSync(`${legacyJsonPath}.migrated-backup`), 'Backup of legacy JSON created');

    // Verify idempotency on second run
    const secondRunResult = migrateLegacyJson(legacyDb, legacyTestDir);
    const countAfterSecondRun = legacyDb.prepare("SELECT COUNT(*) AS c FROM orders WHERE id = 'ord_legacy_1'").get().c;
    assert.equal(countAfterSecondRun, 1, 'Idempotent migration does not duplicate records');

    // 2. Corrupt JSON error test
    const corruptTestDir = path.join(os.tmpdir(), `uzbecano_corrupt_test_${Date.now()}`);
    fs.mkdirSync(corruptTestDir, { recursive: true });
    const corruptDbPath = path.join(corruptTestDir, 'orderplus.sqlite');
    const corruptJsonPath = path.join(corruptTestDir, 'uzbecano_pos_store.json');
    fs.writeFileSync(corruptJsonPath, '{ invalid_json ::: corrupt');

    closeDB();
    let corruptCaught = false;
    try {
      initDB(corruptDbPath);
    } catch (err) {
      corruptCaught = true;
      assert(err.message.includes('MIGRATION_ERROR'), 'Explicit MIGRATION_ERROR thrown for corrupt JSON');
    }
    assert(corruptCaught, 'Corrupt JSON throws error instead of wiping data');
    console.log('[PASS] G. Legacy JSON migration is idempotent and protects against corrupt JSON');

    // Cleanup test directories
    closeDB();
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(legacyTestDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(corruptTestDir, { recursive: true, force: true }); } catch {}

    console.log('\n=== ALL SQLITE TESTS PASSED (7/7) ===');
    process.exit(0);
  });
} catch (err) {
  console.error('Test error:', err);
  process.exit(1);
}
