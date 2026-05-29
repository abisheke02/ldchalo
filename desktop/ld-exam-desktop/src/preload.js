const { contextBridge, ipcRenderer } = require('electron');

// Expose a controlled API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Persistent local storage (survives app restarts — used for offline token cache)
  store: {
    get:   (key)         => ipcRenderer.invoke('store:get', key),
    set:   (key, value)  => ipcRenderer.invoke('store:set', key, value),
    clear: ()            => ipcRenderer.invoke('store:clear'),
  },

  // API server config — allows institutions to point to on-prem servers
  config: {
    getApiUrl:      ()      => ipcRenderer.invoke('config:getApiUrl'),
    setApiUrl:      (url)   => ipcRenderer.invoke('config:setApiUrl', url),
    getAuthToken:   ()      => ipcRenderer.invoke('config:getAuthToken'),
    setAuthToken:   (token) => ipcRenderer.invoke('config:setAuthToken', token),
    clearAuthToken: ()      => ipcRenderer.invoke('config:clearAuthToken'),
  },

  // Exam mode — locks the window on top and blocks nav shortcuts
  exam: {
    start: () => ipcRenderer.invoke('exam:start'),
    end:   () => ipcRenderer.invoke('exam:end'),
  },

  // Network probe (uses system proxy, avoids browser CORS)
  net: {
    isOnline: () => ipcRenderer.invoke('net:isOnline'),
  },

  // App metadata
  getVersion: () => ipcRenderer.invoke('app:version'),

  // Native confirm dialog
  confirm: (message) => ipcRenderer.invoke('dialog:confirm', message),

  // Open trusted external URLs in default browser
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Runtime info
  platform: process.platform,
  isDev:    process.argv.includes('--dev'),
});
