const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { initDB, closeDB } = require('./db/index');
const repositories = require('./db/repositories');
const SyncEngine = require('./sync/syncEngine');

let syncEngine = null;

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isPlainObject(obj) {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}

function validateOrderData(data) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid payload: orderData must be a plain object');
  }
  if (data.id && (typeof data.id !== 'string' || data.id.length > 128)) {
    throw new Error('Invalid order id');
  }
  if (data.tableNumber && typeof data.tableNumber !== 'string') {
    throw new Error('Invalid tableNumber');
  }
  if (data.status && typeof data.status !== 'string') {
    throw new Error('Invalid status');
  }
  if (data.subtotal !== undefined && typeof data.subtotal !== 'number') {
    throw new Error('Invalid subtotal');
  }
  if (data.total !== undefined && typeof data.total !== 'number') {
    throw new Error('Invalid total');
  }
  return true;
}

function validateOrderStatusUpdate(data) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid payload: update payload must be a plain object');
  }
  if (!data.id || typeof data.id !== 'string' || data.id.length > 128) {
    throw new Error('Invalid or missing order id');
  }
  if (!data.status || typeof data.status !== 'string' || data.status.length > 64) {
    throw new Error('Invalid or missing order status');
  }
  return true;
}

function validateReceiptData(data) {
  if (!isPlainObject(data)) {
    throw new Error('Invalid payload: receiptData must be a plain object');
  }
  if (data.items && !Array.isArray(data.items)) {
    throw new Error('Invalid items in receiptData: must be an array');
  }
  return true;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Uzbecano POS',
    backgroundColor: '#f1f5f9',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Navigation security: prevent navigating away to unauthorized origins
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsed = new URL(navigationUrl);
      const isLocalFile = parsed.protocol === 'file:';
      const isLocalDev =
        process.env.VITE_DEV_SERVER_URL && navigationUrl.startsWith(process.env.VITE_DEV_SERVER_URL);
      const isTrustedLocal = parsed.origin === 'http://localhost:5173' || parsed.origin === 'http://127.0.0.1:5173';

      if (!isLocalFile && !isLocalDev && !isTrustedLocal) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  // Window opening security: deny arbitrary new windows, open approved external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (
        (parsed.protocol === 'https:' && parsed.hostname === 'orderplus.uz') ||
        parsed.hostname === 't.me'
      ) {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '../dist-react/index.html');
    win.loadFile(indexPath).catch(() => {
      win.loadURL('http://localhost:5173');
    });
  }
}

// IPC Database Handlers with Payload Validation
ipcMain.handle('db:create-order', async (event, orderData) => {
  validateOrderData(orderData);
  const order = await repositories.createLocalOrder(orderData);
  if (syncEngine) syncEngine.syncPending().catch(() => {});
  return order;
});

ipcMain.handle('db:get-orders', async () => {
  return repositories.getOrders();
});

ipcMain.handle('db:update-order-status', async (event, payload) => {
  validateOrderStatusUpdate(payload);
  const updated = await repositories.updateOrderStatus(payload.id, payload.status);
  if (syncEngine) syncEngine.syncPending().catch(() => {});
  return updated;
});

ipcMain.handle('sync:trigger', async () => {
  if (!syncEngine) return { pendingCount: 0, failedCount: 0 };
  await syncEngine.syncPending();
  return syncEngine.getSummary();
});

ipcMain.handle('sync:get-status', async () => {
  if (!syncEngine) return { pendingCount: 0, failedCount: 0 };
  return syncEngine.getSummary();
});

// Persistent hidden print window with contextIsolation and sandbox enabled
let printWindow = null;

function getPrintWindow() {
  if (printWindow && !printWindow.isDestroyed()) return printWindow;
  printWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
    },
  });
  printWindow.on('closed', () => {
    printWindow = null;
  });
  return printWindow;
}

function buildReceiptHtml(d) {
  function fmt(n) {
    return Number(n || 0).toLocaleString('ru-RU') + " so'm";
  }

  const items = Array.isArray(d.items) ? d.items : [];
  const itemsHtml = items
    .map((i) => {
      const name = escapeHtml(i.name || 'Taom');
      const qty = Number(i.quantity) || 1;
      const price = Number(i.price) || 0;
      const total = qty * price;
      const noteHtml = i.note ? '<br><b>Izoh: ' + escapeHtml(i.note) + '</b>' : '';
      return `<div style="margin-bottom:5px">
      <div style="display:flex;justify-content:space-between;font-weight:bold">
        <span style="flex:1;padding-right:4px">${name}</span>
        <span style="white-space:nowrap">${fmt(total)}</span>
      </div>
      <div style="font-size:10px">${qty} x ${fmt(price)}${noteHtml}</div>
    </div>`;
    })
    .join('');

  const discountAmount = Number(d.discountAmount) || 0;
  const discountPercent = Number(d.discountPercent) || 0;
  const discountHtml =
    discountAmount > 0
      ? `<div style="display:flex;justify-content:space-between;font-size:11px">
        <span>Chegirma (${escapeHtml(discountPercent)}%):</span>
        <span style="font-weight:bold">-${fmt(discountAmount)}</span>
       </div>`
      : '';

  const paymentMethod = escapeHtml(d.paymentMethod || 'NAQD').toUpperCase();
  const mixedHtml =
    d.paymentMethod === 'aralash'
      ? `<div style="display:flex;justify-content:space-between;font-size:11px">
        <span>Naqd:</span><span style="font-weight:bold">${fmt(d.cashAmount)}</span>
       </div>
       <div style="display:flex;justify-content:space-between;font-size:11px">
        <span>Karta:</span><span style="font-weight:bold">${fmt(d.cardAmount)}</span>
       </div>`
      : '';

  const shopName = escapeHtml(d.shopName || 'UZBECANO RESTORAN');
  const shopAddress = escapeHtml(d.shopAddress || '');
  const shopPhone = escapeHtml(d.shopPhone || '');
  const waiterName = escapeHtml(d.waiterName || '');
  const tableName = escapeHtml(d.tableName || '');
  const timeStr = escapeHtml(d.time || '');
  const serviceFeePercent = Number(d.serviceFeePercent) || 10;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
@page { size: 72mm auto; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Courier New',monospace; font-size:12px; color:#000; background:#fff; width:72mm; padding:3mm 2mm 6mm; }
.center { text-align:center; }
.bold { font-weight:bold; }
.row { display:flex; justify-content:space-between; padding:1px 0; }
.divider { border-top:1px dashed #000; margin:4px 0; }
</style>
</head><body>
<div class="center">
  <div style="font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase">${shopName}</div>
  <div style="font-size:11px;margin-top:2px">${shopAddress}</div>
  <div style="font-size:11px">${shopPhone}</div>
  ${waiterName ? `<div style="font-size:11px;font-weight:bold;margin-top:2px">Ofitsiant: ${waiterName}</div>` : ''}
</div>
<div class="divider"></div>
<div class="row bold" style="font-size:11px">
  <span>${tableName}</span>
  <span>${paymentMethod} • TO'LANGAN</span>
  <span>${timeStr}</span>
</div>
<div class="divider"></div>
${itemsHtml}
<div class="divider"></div>
<div class="row" style="font-size:11px"><span>Jami taomlar:</span><span class="bold">${fmt(d.subtotal)}</span></div>
${discountHtml}
<div class="row" style="font-size:11px"><span>Xizmat haqi (${escapeHtml(serviceFeePercent)}%):</span><span class="bold">${fmt(d.serviceFee)}</span></div>
<div class="divider"></div>
<div class="row" style="font-size:14px;font-weight:900">
  <span>JAMI TO'LOV:</span><span>${fmt(d.grandTotal)}</span>
</div>
${mixedHtml}
<div class="row" style="font-size:11px;margin-top:2px">
  <span>To'lov turi:</span><span class="bold">${paymentMethod}</span>
</div>
<div class="divider"></div>
<div class="center" style="margin-top:6px">
  <div style="font-size:11px;font-weight:bold">Tashrifingiz uchun rahmat!</div>
  <div style="font-size:9px;color:#555;margin-top:2px">Uzbecano POS v1.0</div>
</div>
</body></html>`;
}

// Secure Promise-Based Print Receipt Handler
ipcMain.handle('print-receipt', async (event, d) => {
  validateReceiptData(d);
  const html = buildReceiptHtml(d);
  const win = getPrintWindow();

  return new Promise((resolve, reject) => {
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    win.webContents.once('did-finish-load', () => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          margins: { marginType: 'none' },
        },
        (success, failureReason) => {
          if (!success) {
            reject(new Error(`Print failed: ${failureReason || 'Unknown error'}`));
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });
});

app.whenReady().then(() => {
  try {
    initDB();
  } catch (err) {
    console.error('Failed to initialize SQLite database:', err);
  }

  syncEngine = new SyncEngine();
  createWindow();

  setInterval(() => {
    if (syncEngine) syncEngine.syncPending().catch(() => {});
  }, 30000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  closeDB();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
