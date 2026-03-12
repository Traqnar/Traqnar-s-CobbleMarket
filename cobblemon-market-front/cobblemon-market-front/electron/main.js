const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

const API_BASE_URL = 'http://127.0.0.1:5148';
const API_HEALTH_PATH = '/api/showcases';

let backendProcess = null;
let mainWindow = null;

function isPackaged() {
  return app.isPackaged;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setMenuBarVisibility(false);
  mainWindow = win;
  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  const devServerUrl = 'http://localhost:4200';

  if (isPackaged()) {
    win.loadURL(API_BASE_URL);
    return;
  }

  httpPing(devServerUrl).then((devServerUp) => {
    if (devServerUp) {
      win.loadURL(devServerUrl);
      return;
    }

    win.loadURL(API_BASE_URL);
  });
}

function sendUpdateStatus(status) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send('app:update-status', status);
}

function httpPing(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(1200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const up = await httpPing(`${API_BASE_URL}${API_HEALTH_PATH}`);
    if (up) {
      return true;
    }

    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return false;
}

async function ensureBackendStarted() {
  const alreadyUp = await waitForBackend(1200);
  if (alreadyUp) {
    return;
  }

  const backendDir = isPackaged()
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, 'backend-publish');
  const backendExe = path.join(backendDir, 'CobblemonMarketApi.exe');

  if (!fs.existsSync(backendExe)) {
    return;
  }

  backendProcess = spawn(backendExe, ['--urls', API_BASE_URL], {
    cwd: backendDir,
    stdio: 'ignore',
    windowsHide: true,
  });

  backendProcess.on('exit', () => {
    backendProcess = null;
  });

  await waitForBackend(30000);
}

function stopBackendIfNeeded() {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function setupAutoUpdater() {
  if (!isPackaged()) {
    return;
  }

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  sendUpdateStatus({ state: 'checking', message: 'Verification des mises a jour...' });

  autoUpdater.on('error', (err) => {
    log.error('AutoUpdater error:', err);
    sendUpdateStatus({
      state: 'error',
      message: "Echec de la verification des mises a jour.",
      details: err?.message ?? String(err),
    });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info?.version ?? 'unknown');
    sendUpdateStatus({
      state: 'available',
      version: info?.version ?? '',
      message: `Nouvelle version ${info?.version ?? ''} detectee.`,
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available.');
    sendUpdateStatus({ state: 'idle', message: 'Application a jour.' });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Number(progressObj?.percent ?? 0);
    sendUpdateStatus({
      state: 'downloading',
      progress: percent,
      bytesPerSecond: Number(progressObj?.bytesPerSecond ?? 0),
      transferred: Number(progressObj?.transferred ?? 0),
      total: Number(progressObj?.total ?? 0),
      message: `Telechargement de la mise a jour: ${percent.toFixed(1)}%`,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      state: 'downloaded',
      version: info?.version ?? '',
      message: `Version ${info?.version ?? ''} prete. Installation...`,
    });

    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 1400);
  });

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log.error('Unable to check for updates:', err);
    sendUpdateStatus({
      state: 'error',
      message: "Impossible de verifier les mises a jour.",
      details: err?.message ?? String(err),
    });
  });
}

app.whenReady().then(async () => {
  await ensureBackendStarted();
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopBackendIfNeeded();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
