const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const { execSync } = require('child_process');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

const API_BASE_URL = 'http://127.0.0.1:5148';
const API_HEALTH_PATH = '/api/showcases';

let backendProcess = null;
let mainWindow = null;
let updateWindow = null;
let updateWindowStatus = null;
let updaterState = 'idle';
let isDownloadingUpdate = false;
let isInstallingUpdate = false;
let isCheckingForUpdates = false;
let updateCheckInterval = null;

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
    const cacheBustUrl = `${API_BASE_URL}/?v=${encodeURIComponent(app.getVersion())}`;
    win.webContents.session.clearCache().catch(() => {}).finally(() => {
      win.loadURL(cacheBustUrl);
    });
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

function getUpdateWindowHtml() {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mise a jour CobbleMarket</title>
    <style>
      :root {
        --bg: #050b16;
        --panel: #0b1426;
        --line: #1e3a8a;
        --text: #e2e8f0;
        --muted: #93a4bf;
        --accent: #3b82f6;
        --accent2: #38bdf8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 10% 0%, rgba(59,130,246,.24), transparent 45%),
          radial-gradient(circle at 95% 95%, rgba(14,116,144,.28), transparent 40%),
          var(--bg);
        color: var(--text);
        font-family: Segoe UI, Arial, sans-serif;
      }
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 18px;
      }
      .panel {
        width: 100%;
        max-width: 520px;
        border: 1px solid rgba(59, 130, 246, .45);
        background: linear-gradient(180deg, rgba(11,20,38,.96), rgba(8,14,28,.97));
        box-shadow: 0 16px 40px rgba(2, 6, 23, .55);
        padding: 18px;
      }
      .head {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .spinner {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 2px solid rgba(96, 165, 250, .28);
        border-top-color: var(--accent2);
        animation: spin .85s linear infinite;
      }
      .title {
        font-weight: 800;
        letter-spacing: .06em;
        text-transform: uppercase;
        font-size: 12px;
        color: #bfdbfe;
      }
      .message {
        margin-top: 10px;
        font-size: 14px;
        font-weight: 700;
      }
      .sub {
        margin-top: 6px;
        font-size: 12px;
        color: var(--muted);
      }
      .track {
        margin-top: 12px;
        width: 100%;
        height: 6px;
        border: 1px solid rgba(148, 163, 184, .4);
        background: #08101f;
        overflow: hidden;
        position: relative;
      }
      .fill {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, var(--accent2), var(--accent));
        transition: width .2s ease;
      }
      .track.indeterminate .fill {
        position: absolute;
        width: 35%;
        left: -35%;
        animation: indeterminate 1.1s ease-in-out infinite;
      }
      .progress {
        margin-top: 8px;
        text-align: right;
        font-size: 12px;
        color: #cbd5e1;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes indeterminate { from { left: -35%; } to { left: 100%; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="panel">
        <div class="head">
          <span class="spinner"></span>
          <span class="title">Mise a jour CobbleMarket</span>
        </div>
        <div class="message" id="msg">Preparation...</div>
        <div class="sub" id="sub">Ne fermez pas l'application.</div>
        <div class="track indeterminate" id="track"><div class="fill" id="fill"></div></div>
        <div class="progress" id="progress">...</div>
      </section>
    </div>

    <script>
      const { ipcRenderer } = require('electron');
      const msg = document.getElementById('msg');
      const sub = document.getElementById('sub');
      const progress = document.getElementById('progress');
      const track = document.getElementById('track');
      const fill = document.getElementById('fill');

      const apply = (payload) => {
        if (!payload) return;
        const state = payload.state || 'checking';
        msg.textContent = payload.message || 'Mise a jour en cours...';

        if (state === 'downloading') {
          const pct = Math.max(0, Math.min(100, Number(payload.progress || 0)));
          track.classList.remove('indeterminate');
          fill.style.width = pct.toFixed(1) + '%';
          progress.textContent = pct.toFixed(1) + '%';
          sub.textContent = 'Telechargement des fichiers de mise a jour...';
          return;
        }

        track.classList.add('indeterminate');
        fill.style.width = '0%';
        progress.textContent = '...';

        if (state === 'available' || state === 'checking') {
          sub.textContent = 'Ne fermez pas l\\'application.';
        } else if (state === 'downloaded') {
          sub.textContent = 'Redemarrage automatique en cours...';
        } else if (state === 'error') {
          sub.textContent = payload.details || 'Erreur lors de la mise a jour.';
        } else {
          sub.textContent = '';
        }
      };

      ipcRenderer.on('app:update-window-status', (_event, payload) => apply(payload));
      ipcRenderer.on('app:update-window-init', (_event, payload) => apply(payload));
    </script>
  </body>
</html>`;
}

function ensureUpdateWindow() {
  if (updateWindow && !updateWindow.isDestroyed()) {
    return updateWindow;
  }

  updateWindow = new BrowserWindow({
    width: 520,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    backgroundColor: '#050b16',
    show: false,
    title: 'Mise a jour CobbleMarket',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  updateWindow.setMenuBarVisibility(false);
  updateWindow.on('closed', () => {
    updateWindow = null;
  });

  updateWindow.webContents.on('did-finish-load', () => {
    if (updateWindowStatus) {
      updateWindow.webContents.send('app:update-window-init', updateWindowStatus);
    }
  });

  updateWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(getUpdateWindowHtml())}`);
  updateWindow.once('ready-to-show', () => {
    updateWindow?.show();
  });

  return updateWindow;
}

function closeUpdateWindow() {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.close();
    updateWindow = null;
  }
}

function sendUpdateWindowStatus(status) {
  updateWindowStatus = status;
  if (!updateWindow || updateWindow.isDestroyed()) {
    return;
  }
  updateWindow.webContents.send('app:update-window-status', status);
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
  // In packaged mode, force our bundled backend to avoid attaching to a stale
  // external process already listening on 5148.
  if (!isPackaged()) {
    const alreadyUp = await waitForBackend(1200);
    if (alreadyUp) {
      return;
    }
  } else {
    try {
      execSync('taskkill /F /T /IM "CobblemonMarketApi.exe"', { stdio: 'ignore' });
    } catch {
      // ignore: process may not be running
    }
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
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  const triggerUpdateCheck = async (announceChecking = false) => {
    if (isCheckingForUpdates || isDownloadingUpdate || isInstallingUpdate) {
      return;
    }

    isCheckingForUpdates = true;
    if (announceChecking) {
      updaterState = 'checking';
      const checkingStatus = { state: 'checking', message: 'Verification des mises a jour...' };
      sendUpdateStatus(checkingStatus);
      sendUpdateWindowStatus(checkingStatus);
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      log.error('Unable to check for updates:', err);
      updaterState = 'error';
      const checkErrorStatus = {
        state: 'error',
        message: "Impossible de verifier les mises a jour.",
        details: err?.message ?? String(err),
      };
      sendUpdateStatus(checkErrorStatus);
      sendUpdateWindowStatus(checkErrorStatus);
    } finally {
      isCheckingForUpdates = false;
    }
  };

  autoUpdater.on('error', (err) => {
    log.error('AutoUpdater error:', err);
    updaterState = 'error';
    isDownloadingUpdate = false;
    const errorStatus = {
      state: 'error',
      message: "Echec de la verification des mises a jour.",
      details: err?.message ?? String(err),
    };
    sendUpdateStatus(errorStatus);
    sendUpdateWindowStatus(errorStatus);
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info?.version ?? 'unknown');
    updaterState = 'available';
    const availableStatus = {
      state: 'available',
      version: info?.version ?? '',
      message: `Nouvelle version ${info?.version ?? ''} disponible.`,
    };
    sendUpdateStatus(availableStatus);
    sendUpdateWindowStatus(availableStatus);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available.');
    updaterState = 'idle';
    isDownloadingUpdate = false;
    const idleStatus = { state: 'idle', message: 'Application a jour.' };
    sendUpdateStatus(idleStatus);
    sendUpdateWindowStatus(idleStatus);
    closeUpdateWindow();
  });

  autoUpdater.on('download-progress', (progressObj) => {
    updaterState = 'downloading';
    isDownloadingUpdate = true;
    const percent = Number(progressObj?.percent ?? 0);
    const progressStatus = {
      state: 'downloading',
      progress: percent,
      bytesPerSecond: Number(progressObj?.bytesPerSecond ?? 0),
      transferred: Number(progressObj?.transferred ?? 0),
      total: Number(progressObj?.total ?? 0),
      message: `Telechargement de la mise a jour: ${percent.toFixed(1)}%`,
    };
    sendUpdateStatus(progressStatus);
    sendUpdateWindowStatus(progressStatus);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info?.version ?? 'unknown');
    updaterState = 'downloaded';
    isDownloadingUpdate = false;
    const downloadedStatus = {
      state: 'downloaded',
      version: info?.version ?? '',
      message: `Version ${info?.version ?? ''} prete a installer.`,
    };
    sendUpdateStatus(downloadedStatus);
    sendUpdateWindowStatus(downloadedStatus);
  });

  triggerUpdateCheck(true);
  updateCheckInterval = setInterval(() => {
    triggerUpdateCheck(false);
  }, 60 * 1000);
}

app.whenReady().then(async () => {
  ipcMain.handle('app:get-version', () => app.getVersion());
  ipcMain.handle('app:perform-update-action', async () => {
    if (!isPackaged()) {
      return { ok: false, message: 'Not packaged' };
    }

    if (updaterState === 'downloaded') {
      if (isInstallingUpdate) {
        return { ok: false, message: 'Install already in progress' };
      }
      isInstallingUpdate = true;
      autoUpdater.quitAndInstall(true, true);
      return { ok: true, action: 'install' };
    }

    if (isDownloadingUpdate) {
      return { ok: false, message: 'Download already in progress' };
    }

    if (updaterState === 'available' || updaterState === 'error' || updaterState === 'idle' || updaterState === 'checking') {
      if (updaterState !== 'available') {
        updaterState = 'checking';
        sendUpdateStatus({ state: 'checking', message: 'Verification des mises a jour...' });
        try {
          await autoUpdater.checkForUpdates();
        } catch (err) {
          log.error('Manual check failed:', err);
          updaterState = 'error';
          sendUpdateStatus({
            state: 'error',
            message: "Impossible de verifier les mises a jour.",
            details: err?.message ?? String(err),
          });
          return { ok: false, message: 'check-failed' };
        }
      }

      if (updaterState === 'available') {
        try {
          isDownloadingUpdate = true;
          await autoUpdater.downloadUpdate();
          return { ok: true, action: 'download' };
        } catch (err) {
          isDownloadingUpdate = false;
          updaterState = 'error';
          log.error('Manual download failed:', err);
          sendUpdateStatus({
            state: 'error',
            message: "Impossible de telecharger la mise a jour.",
            details: err?.message ?? String(err),
          });
          return { ok: false, message: 'download-failed' };
        }
      }
    }

    return { ok: false, message: 'no-action' };
  });
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
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
  stopBackendIfNeeded();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
