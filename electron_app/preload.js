const { contextBridge, ipcRenderer } = require('electron');

let safeMode = 'ambos';
try {
  if (typeof process !== 'undefined') {
    if (process.env && process.env.APP_MODE) {
      safeMode = process.env.APP_MODE;
    } else if (Array.isArray(process.argv)) {
      if (process.argv.includes('--mode=fibra')) safeMode = 'fibra';
      else if (process.argv.includes('--mode=tv')) safeMode = 'tv';
    }
  }
} catch (e) {}

// Expõe APIs seguras para a camada de visualização (Renderer)
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),
  getAppMode: () => ipcRenderer.invoke('app:get-mode'),
  appMode: safeMode,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  print: (options) => ipcRenderer.invoke('app:print', options),
  isElectron: true
});
