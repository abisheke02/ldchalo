const { app, BrowserWindow, ipcMain, shell, dialog, net } = require('electron');
const path  = require('path');
const Store = require('electron-store');

const store = new Store({
  schema: {
    apiUrl:   { type: 'string', default: 'https://api.ldexam.app' },
    examMode: { type: 'boolean', default: false },
    authToken:{ type: 'string', default: '' },
  },
});
const isDev = process.argv.includes('--dev');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:          1024,
    height:         768,
    minWidth:       800,
    minHeight:      600,
    title:          'LD Exam',
    icon:           path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration:     false,
      contextIsolation:    true,
      preload:             path.join(__dirname, 'preload.js'),
      webSecurity:         !isDev,
    },
    backgroundColor: '#F9FAFB',
    show: false,
  });

  // Kiosk-like exam mode — disable nav shortcuts
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    const blocked = (
      (input.control || input.meta) && ['r', 'w', 't', 'n'].includes(input.key.toLowerCase()) ||
      input.key === 'F5' ||
      input.key === 'F11'
    );
    if (blocked && store.get('examMode', false)) _event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('store:get', (_event, key) => store.get(key));
ipcMain.handle('store:set', (_event, key, value) => store.set(key, value));
ipcMain.handle('store:clear', () => store.clear());

ipcMain.handle('exam:start', () => {
  store.set('examMode', true);
  mainWindow?.setAlwaysOnTop(true);
});

ipcMain.handle('exam:end', () => {
  store.set('examMode', false);
  mainWindow?.setAlwaysOnTop(false);
});

ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('dialog:confirm', async (_event, message) => {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type:    'question',
    buttons: ['Cancel', 'Confirm'],
    message,
  });
  return response === 1;
});

ipcMain.handle('config:getApiUrl',       ()            => store.get('apiUrl'));
ipcMain.handle('config:setApiUrl',       (_e, url)     => { store.set('apiUrl', url); });
ipcMain.handle('config:getAuthToken',    ()            => store.get('authToken', ''));
ipcMain.handle('config:setAuthToken',    (_e, token)   => { store.set('authToken', token); });
ipcMain.handle('config:clearAuthToken', ()             => { store.set('authToken', ''); });

// Connectivity probe — uses Electron's net module (follows system proxy)
ipcMain.handle('net:isOnline', () => {
  return new Promise((resolve) => {
    const req = net.request({ method: 'HEAD', url: store.get('apiUrl') + '/health' });
    req.on('response', () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.abort(); resolve(false); });
    req.end();
  });
});

// Open external link safely (e.g. password reset in browser)
ipcMain.handle('shell:openExternal', (_e, url) => {
  const allowed = ['https://ldexam.app', 'https://api.ldexam.app'];
  if (allowed.some((base) => url.startsWith(base))) {
    shell.openExternal(url);
  }
});

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Block external navigation
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
    }
  });
});
