const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronUpdates', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  onStatus: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }

    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('app:update-status', handler);
    return () => {
      ipcRenderer.removeListener('app:update-status', handler);
    };
  },
});
