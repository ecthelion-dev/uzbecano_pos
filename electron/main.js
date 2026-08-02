const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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
    win.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }
}

ipcMain.on('print-silent', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.print({
      silent: true,
      printBackground: true
    }, (success) => {
      if (!success) {
        win.webContents.print({ silent: false });
      }
    });
  }
});

app.whenReady().then(() => {
  createWindow();

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
