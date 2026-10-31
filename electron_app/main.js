const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');

// Previne problemas de aceleração gráfica em GPUs antigas no Windows
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-direct-composition');
app.commandLine.appendSwitch('no-sandbox');

// Permite passar argumento: electron . --mode=fibra OU electron . --mode=tv
const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode='));
const detectedMode = modeArg ? modeArg.split('=')[1] : (process.env.APP_MODE || 'ambos');

let mainWindow = null;

// ==============================================================
// BLOQUEIO DE JANELA ÚNICA (QUANDO JÁ TEM UMA JANELA, NÃO ABRE OUTRA)
// ==============================================================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  try {
    dialog.showMessageBoxSync({
      type: 'info',
      title: 'OSDEL Gestão X Desktop',
      message: 'O aplicativo já está aberto no seu computador.',
      detail: 'A janela ativa foi restaurada para o primeiro plano. Por motivos de segurança operacional de caixa e clientes, não é permitido abrir mais de uma janela simultaneamente.',
      buttons: ['OK']
    });
  } catch (e) {}
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

function checkDevServer(port = 3000, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = (val) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };
    try {
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        finish(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => finish(false));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        finish(false);
      });
    } catch {
      finish(false);
    }
  });
}

function ensureDistExists() {
  if (app.isPackaged) return true;

  const distHtml = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distHtml)) return true;

  try {
    const syncScript = path.join(__dirname, 'sync_dist.js');
    if (fs.existsSync(syncScript)) {
      execSync(`node "${syncScript}"`, { cwd: __dirname, stdio: 'inherit' });
      return fs.existsSync(distHtml);
    }
  } catch (err) {
    console.warn('[Electron] Falha ao rodar sync_dist:', err.message);
  }
  return false;
}

async function createWindow() {
  ensureDistExists();

  const isFibra = detectedMode === 'fibra';
  const isTV = detectedMode === 'tv';

  const windowTitle = isFibra
    ? 'OSDEL TECNOLOGIA · Gestão de Internet Fibra Óptica (Desktop)'
    : isTV
    ? 'OSDEL TECNOLOGIA · Gestão de TV por Cabo Comunitária (Desktop)'
    : 'OSDEL TECNOLOGIA · Gestão Integrada Desktop (TV Cabo & Fibra)';

  const appIconIco = path.join(__dirname, 'assets', 'icon.ico');
  const appIconPng = path.join(__dirname, 'assets', 'icon.png');
  const appIconJpg = path.join(__dirname, 'assets', 'logo.jpg');
  const appIconPath = fs.existsSync(appIconIco) ? appIconIco : fs.existsSync(appIconPng) ? appIconPng : appIconJpg;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0f172a',
    title: windowTitle,
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  if (detectedMode && detectedMode !== 'ambos') {
    mainWindow.webContents.on('dom-ready', () => {
      mainWindow.webContents.executeJavaScript(`
        try {
          localStorage.setItem('osdel-service-mode', '${detectedMode}');
          window.dispatchEvent(new CustomEvent('osdel-service-mode-changed', { detail: { mode: '${detectedMode}' } }));
        } catch (e) {}
      `).catch(() => {});
    });
  }

  const distHtml = path.join(__dirname, 'dist', 'index.html');
  const parentDistHtml = path.join(__dirname, '..', 'dist', 'index.html');
  const targetUrl = process.env.ELECTRON_START_URL || process.env.APP_URL;

  if (targetUrl) {
    const fullUrl = targetUrl.includes('?') ? `${targetUrl}&mode=${detectedMode}` : `${targetUrl}?mode=${detectedMode}`;
    mainWindow.loadURL(fullUrl).catch(() => loadBundleOrFallback());
    finishSetup();
    return;
  }

  // Se não estiver empacotado e o servidor de dev estiver ligado
  if (!app.isPackaged) {
    const isDevRunning = await checkDevServer(3000);
    if (isDevRunning) {
      console.log(`[Electron] Conectando ao servidor web local http://127.0.0.1:3000/?mode=${detectedMode}`);
      mainWindow.loadURL(`http://127.0.0.1:3000/?mode=${detectedMode}`).catch(() => loadBundleOrFallback());
      finishSetup();
      return;
    }
  }

  loadBundleOrFallback();
  finishSetup();

  function loadBundleOrFallback() {
    if (fs.existsSync(distHtml)) {
      console.log('[Electron] Carregando sistema web oficial: ' + distHtml);
      mainWindow.loadFile(distHtml).catch(loadFallback);
    } else if (fs.existsSync(parentDistHtml)) {
      console.log('[Electron] Carregando bundle pai: ' + parentDistHtml);
      mainWindow.loadFile(parentDistHtml).catch(loadFallback);
    } else {
      loadFallback();
    }
  }

  function loadFallback() {
    console.log('[Electron] Carregando interface de inicialização...');
    const fallbackPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(fallbackPath)) {
      mainWindow.loadFile(fallbackPath).catch((err) => {
        console.error('Falha ao carregar fallback:', err);
      });
    }
  }

  function finishSetup() {
    const showSafely = () => {
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      }
    };

    mainWindow.once('ready-to-show', showSafely);
    mainWindow.webContents.once('did-finish-load', showSafely);
    setTimeout(showSafely, 1500);

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[Electron] Erro de carregamento (${errorCode}): ${errorDescription} - ${validatedURL}`);
      showSafely();
    });

    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
        mainWindow.reload();
        event.preventDefault();
      }
      if (input.key === 'F11') {
        mainWindow.setFullScreen(!mainWindow.isFullScreen());
        event.preventDefault();
      }
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }
}

// Handlers IPC
ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:get-platform', () => process.platform);
ipcMain.handle('app:get-mode', () => detectedMode);

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('app:print', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'Janela inactiva' };
  return new Promise((resolve) => {
    try {
      mainWindow.webContents.print(
        {
          silent: options.silent || false,
          printBackground: true,
          deviceName: options.deviceName || '',
          pageSize: options.pageSize || (options.formato === 'pos' ? { width: 80000, height: 297000 } : 'A4'),
          margins: { marginType: 'none' }
        },
        (success, failureReason) => {
          resolve({ success, failureReason });
        }
      );
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
  process.exit(0);
});
