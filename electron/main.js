const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const repositories = require('./db/repositories');
const SyncEngine = require('./sync/syncEngine');

let syncEngine = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Uzbecano POS',
    backgroundColor: '#f1f5f9',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
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

// IPC Database Handlers
ipcMain.handle('db:create-order', async (event, orderData) => {
  const order = await repositories.createLocalOrder(orderData);
  if (syncEngine) syncEngine.syncPending().catch(() => {});
  return order;
});

ipcMain.handle('db:get-orders', async () => {
  return repositories.getOrders();
});

ipcMain.handle('db:update-order-status', async (event, { id, status }) => {
  const updated = await repositories.updateOrderStatus(id, status);
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

// Persistent hidden print window (reused across prints)
let printWindow = null;

function getPrintWindow() {
  if (printWindow && !printWindow.isDestroyed()) return printWindow;
  printWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  printWindow.on('closed', () => { printWindow = null; });
  return printWindow;
}

function buildReceiptHtml(d) {
  function fmt(n) {
    return Number(n || 0).toLocaleString('ru-RU') + " so'm";
  }

  const itemsHtml = (d.items || []).map(i => {
    const total = (Number(i.price) || 0) * (Number(i.quantity) || 1);
    return `<div style="margin-bottom:5px">
      <div style="display:flex;justify-content:space-between;font-weight:bold">
        <span style="flex:1;padding-right:4px">${i.name}</span>
        <span style="white-space:nowrap">${fmt(total)}</span>
      </div>
      <div style="font-size:10px">${i.quantity || 1} x ${fmt(i.price)}${i.note ? '<br><b>Izoh: ' + i.note + '</b>' : ''}</div>
    </div>`;
  }).join('');

  const discountHtml = d.discountAmount > 0
    ? `<div style="display:flex;justify-content:space-between;font-size:11px">
        <span>Chegirma (${d.discountPercent}%):</span>
        <span style="font-weight:bold">-${fmt(d.discountAmount)}</span>
       </div>` : '';

  const mixedHtml = d.paymentMethod === 'aralash'
    ? `<div style="display:flex;justify-content:space-between;font-size:11px">
        <span>Naqd:</span><span style="font-weight:bold">${fmt(d.cashAmount)}</span>
       </div>
       <div style="display:flex;justify-content:space-between;font-size:11px">
        <span>Karta:</span><span style="font-weight:bold">${fmt(d.cardAmount)}</span>
       </div>` : '';

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
  <div style="font-size:14px;font-weight:900;letter-spacing:1px;text-transform:uppercase">${d.shopName || 'UZBECANO RESTORAN'}</div>
  <div style="font-size:11px;margin-top:2px">${d.shopAddress || ''}</div>
  <div style="font-size:11px">${d.shopPhone || ''}</div>
  ${d.waiterName ? `<div style="font-size:11px;font-weight:bold;margin-top:2px">Ofitsiant: ${d.waiterName}</div>` : ''}
</div>
<div class="divider"></div>
<div class="row bold" style="font-size:11px">
  <span>${d.tableName || ''}</span>
  <span>${(d.paymentMethod || 'NAQD').toUpperCase()} • TO'LANGAN</span>
  <span>${d.time || ''}</span>
</div>
<div class="divider"></div>
${itemsHtml}
<div class="divider"></div>
<div class="row" style="font-size:11px"><span>Jami taomlar:</span><span class="bold">${fmt(d.subtotal)}</span></div>
${discountHtml}
<div class="row" style="font-size:11px"><span>Xizmat haqi (${d.serviceFeePercent || 10}%):</span><span class="bold">${fmt(d.serviceFee)}</span></div>
<div class="divider"></div>
<div class="row" style="font-size:14px;font-weight:900">
  <span>JAMI TO'LOV:</span><span>${fmt(d.grandTotal)}</span>
</div>
${mixedHtml}
<div class="row" style="font-size:11px;margin-top:2px">
  <span>To'lov turi:</span><span class="bold">${(d.paymentMethod || 'NAQD').toUpperCase()}</span>
</div>
<div class="divider"></div>
<div class="center" style="margin-top:6px">
  <div style="font-size:11px;font-weight:bold">Tashrifingiz uchun rahmat!</div>
  <div style="font-size:9px;color:#555;margin-top:2px">Uzbecano POS v1.0</div>
</div>
</body></html>`;
}

ipcMain.on('print-receipt', (event, d) => {
  const html = buildReceiptHtml(d);
  const win = getPrintWindow();

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  win.webContents.once('did-finish-load', () => {
    win.webContents.print({
      silent: true,
      printBackground: true,
      margins: { marginType: 'none' }
    }, (success, reason) => {
      if (!success) console.error('Print failed:', reason);
    });
  });
});


// Legacy fallback
ipcMain.on('print-silent', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.print({ silent: true, printBackground: true, deviceName: 'Printer_POS_80' });
  }
});

app.whenReady().then(() => {
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
