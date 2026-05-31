const { app, BrowserWindow, ipcMain, shell, dialog, net } = require('electron');
const path  = require('path');
const Store = require('electron-store');

const store = new Store({
  schema: {
    apiUrl:    { type: 'string', default: 'https://api.ldschools.app' },
    examMode:  { type: 'boolean', default: false },
    authToken: { type: 'string', default: '' },
  },
});

const isDev = process.argv.includes('--dev');
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1100,
    height: 750,
    minWidth:  900,
    minHeight: 600,
    title:  'LD Schools Exam',
    icon:   path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload:          path.join(__dirname, 'preload.js'),
      webSecurity:      !isDev,
    },
    backgroundColor: '#F0F4FF',
    show: false,
  });

  // Block nav shortcuts in exam mode
  mainWindow.webContents.on('before-input-event', (_e, input) => {
    const blocked =
      ((input.control || input.meta) && ['r','w','t','n'].includes(input.key.toLowerCase())) ||
      input.key === 'F5' || input.key === 'F11';
    if (blocked && store.get('examMode')) _e.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC ──────────────────────────────────────────────────────────────────────
ipcMain.handle('store:get',   (_e, key)        => store.get(key));
ipcMain.handle('store:set',   (_e, key, value) => store.set(key, value));
ipcMain.handle('store:clear', ()               => store.clear());

ipcMain.handle('exam:start',  ()               => { store.set('examMode', true);  mainWindow?.setAlwaysOnTop(true);  });
ipcMain.handle('exam:end',    ()               => { store.set('examMode', false); mainWindow?.setAlwaysOnTop(false); });

ipcMain.handle('config:getApiUrl',    ()        => store.get('apiUrl'));
ipcMain.handle('config:setApiUrl',    (_e, url) => store.set('apiUrl', url));
ipcMain.handle('config:getAuthToken', ()        => store.get('authToken', ''));
ipcMain.handle('config:setAuthToken', (_e, t)   => store.set('authToken', t));
ipcMain.handle('config:clearAuth',    ()        => store.set('authToken', ''));

ipcMain.handle('net:isOnline', () => new Promise((resolve) => {
  const req = net.request({ method: 'HEAD', url: store.get('apiUrl') + '/ping' });
  req.on('response', () => resolve(true));
  req.on('error',    () => resolve(false));
  req.setTimeout(3000, () => { req.abort(); resolve(false); });
  req.end();
}));

ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('dialog:confirm', async (_e, message) => {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'question', buttons: ['Cancel', 'OK'], message,
  });
  return response === 1;
});

ipcMain.handle('shell:openExternal', (_e, url) => {
  if (/^https:\/\/(ldschools\.app|api\.ldschools\.app)/.test(url)) shell.openExternal(url);
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) event.preventDefault();
  });
});



