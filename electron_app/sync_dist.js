const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[OSDEL Build Sync] A sincronizar arquivos web para o Electron Desktop...');

const electronDir = __dirname;
const rootDir = path.resolve(electronDir, '..');
const rootDist = path.join(rootDir, 'dist');
const targetDist = path.join(electronDir, 'dist');
const rootIndexHtml = path.join(rootDist, 'index.html');
const targetIndexHtml = path.join(targetDist, 'index.html');

// 1. Garante que o build do Vite na raiz existe e está atualizado
if (!fs.existsSync(rootIndexHtml)) {
  console.log('[OSDEL Build Sync] Bundle web raiz não encontrado. A compilar com Vite (npm run build)...');
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.error('[OSDEL Build Sync] Erro ao compilar com Vite:', err.message);
    process.exit(1);
  }
}

// 2. Cria a pasta electron_app/dist caso não exista
if (!fs.existsSync(targetDist)) {
  fs.mkdirSync(targetDist, { recursive: true });
}

// 3. Copia todos os ficheiros de ../dist para electron_app/dist (excluindo downloads)
try {
  fs.cpSync(rootDist, targetDist, {
    recursive: true,
    force: true,
    filter: (src) => !src.includes(path.sep + 'downloads') && !src.endsWith('/downloads')
  });
  const nestedDownloads = path.join(targetDist, 'downloads');
  if (fs.existsSync(nestedDownloads)) {
    fs.rmSync(nestedDownloads, { recursive: true, force: true });
  }
  console.log('[OSDEL Build Sync] Ficheiros web sincronizados com sucesso para electron_app/dist');
} catch (err) {
  console.error('[OSDEL Build Sync] Falha ao copiar dist:', err.message);
  process.exit(1);
}

// 4. Ajusta o registerSW.js para não falhar em protocolo file://
const registerSwPath = path.join(targetDist, 'registerSW.js');
if (fs.existsSync(registerSwPath)) {
  try {
    const swContent = fs.readFileSync(registerSwPath, 'utf8');
    // Adiciona verificação de protocolo HTTP/HTTPS
    const patched = swContent.replace(
      "if('serviceWorker' in navigator)",
      "if('serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0)"
    );
    fs.writeFileSync(registerSwPath, patched, 'utf8');
    console.log('[OSDEL Build Sync] Service Worker ajustado com sucesso para ambiente Desktop.');
  } catch (e) {
    console.warn('[OSDEL Build Sync] Aviso ao ajustar registerSW.js:', e.message);
  }
}

// 5. Garante que os ícones existem em assets
const assetsDir = path.join(electronDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const rootLogoPng = path.join(rootDir, 'public', 'pwa-512x512.png');
const targetIconIco = path.join(assetsDir, 'icon.ico');
const targetIconPng = path.join(assetsDir, 'icon.png');

if (fs.existsSync(rootLogoPng)) {
  if (!fs.existsSync(targetIconPng)) {
    fs.copyFileSync(rootLogoPng, targetIconPng);
  }
  if (!fs.existsSync(targetIconIco)) {
    const pngBuf = fs.readFileSync(rootLogoPng);
    const icoHeader = Buffer.alloc(22);
    icoHeader.writeUInt16LE(0, 0);
    icoHeader.writeUInt16LE(1, 2);
    icoHeader.writeUInt16LE(1, 4);
    icoHeader.writeUInt8(0, 6);
    icoHeader.writeUInt8(0, 7);
    icoHeader.writeUInt8(0, 8);
    icoHeader.writeUInt8(0, 9);
    icoHeader.writeUInt16LE(1, 10);
    icoHeader.writeUInt16LE(32, 12);
    icoHeader.writeUInt32LE(pngBuf.length, 14);
    icoHeader.writeUInt32LE(22, 18);
    fs.writeFileSync(targetIconIco, Buffer.concat([icoHeader, pngBuf]));
  }
}

console.log('[OSDEL Build Sync] Sincronização concluída com sucesso! electron_app/dist pronto para o Electron.');
