const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  store:       { get: (k) => ipcRenderer.invoke('store:get', k), set: (k, v) => ipcRenderer.invoke('store:set', k, v), clear: () => ipcRenderer.invoke('store:clear') },
  exam:        { start: () => ipcRenderer.invoke('exam:start'), end: () => ipcRenderer.invoke('exam:end') },
  config:      { getApiUrl: () => ipcRenderer.invoke('config:getApiUrl'), setApiUrl: (u) => ipcRenderer.invoke('config:setApiUrl', u), getAuthToken: () => ipcRenderer.invoke('config:getAuthToken'), setAuthToken: (t) => ipcRenderer.invoke('config:setAuthToken', t), clearAuth: () => ipcRenderer.invoke('config:clearAuth') },
  net:         { isOnline: () => ipcRenderer.invoke('net:isOnline') },
  getVersion:  () => ipcRenderer.invoke('app:version'),
  confirm:     (msg) => ipcRenderer.invoke('dialog:confirm', msg),
  openExternal:(url) => ipcRenderer.invoke('shell:openExternal', url),
  platform:    process.platform,
  isDev:       process.argv.includes('--dev'),
});
