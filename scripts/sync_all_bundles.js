const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== [OSDEL ALL-PLATFORMS SYNC] Sincronização Web, Electron e APKs ===');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const distAssets = path.join(distDir, 'assets');

if (!fs.existsSync(distDir) || !fs.existsSync(distAssets)) {
  console.log('-> Compilando Vite primeiro...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

// 1. Sincroniza Electron
console.log('-> Sincronizando Electron...');
try {
  execSync('node electron_app/sync_dist.js', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn('Aviso ao sincronizar electron:', e.message);
}

// 2. Localiza ficheiros JS e CSS principais do build mais recente
const files = fs.readdirSync(distAssets);
const mainJs = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
const mainCss = files.find(f => f.startsWith('index-') && f.endsWith('.css'));

console.log(`-> Ficheiros compilados actuais: JS=${mainJs}, CSS=${mainCss}`);

if (mainJs && mainCss) {
  // Sincroniza Cliente APK
  const clientePublic = path.join(rootDir, 'clienteapk', 'android', 'app', 'src', 'main', 'assets', 'public');
  const clienteAssets = path.join(clientePublic, 'assets');
  if (fs.existsSync(clientePublic)) {
    if (!fs.existsSync(clienteAssets)) fs.mkdirSync(clienteAssets, { recursive: true });
    // Copia ficheiros para assets
    fs.cpSync(distAssets, clienteAssets, { recursive: true, force: true });
    
    // Atualiza index.html do cliente
    const clienteIndexHtml = `<!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>OSDEL Cliente - TV & Internet Fibra</title>
    <meta name="description" content="Aplicativo do Cliente OSDEL TECNOLOGIA para contratos, pagamentos, acordos e chamados de TV e Fibra." />
    <meta name="theme-color" content="#1e3a8a" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231e3a8a'/><text x='50' y='65' font-size='50' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'>O</text></svg>" />
    <script type="module" crossorigin src="./assets/${mainJs}"></script>
    <link rel="stylesheet" crossorigin href="./assets/${mainCss}">
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased select-none font-sans overflow-x-hidden">
    <div id="root"></div>
  </body>
</html>
`;
    fs.writeFileSync(path.join(clientePublic, 'index.html'), clienteIndexHtml, 'utf8');
    console.log('✓ APK Cliente sincronizado com sucesso.');
  }

  // Sincroniza Equipa Staff APK
  const equipaPublic = path.join(rootDir, 'equipaapk', 'android', 'app', 'src', 'main', 'assets', 'public');
  const equipaAssets = path.join(equipaPublic, 'assets');
  if (fs.existsSync(equipaPublic)) {
    if (!fs.existsSync(equipaAssets)) fs.mkdirSync(equipaAssets, { recursive: true });
    fs.cpSync(distAssets, equipaAssets, { recursive: true, force: true });
    
    const equipaIndexHtml = `<!DOCTYPE html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>OSDEL Equipa - Operações & Piquete de Terreno</title>
    <meta name="description" content="Aplicativo de Operações de Terreno da Equipa OSDEL TECNOLOGIA." />
    <meta name="theme-color" content="#0f172a" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%230f172a'/><text x='50' y='65' font-size='50' font-family='sans-serif' font-weight='bold' fill='white' text-anchor='middle'>E</text></svg>" />
    <script type="module" crossorigin src="./assets/${mainJs}"></script>
    <link rel="stylesheet" crossorigin href="./assets/${mainCss}">
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased select-none font-sans overflow-x-hidden">
    <div id="root"></div>
  </body>
</html>
`;
    fs.writeFileSync(path.join(equipaPublic, 'index.html'), equipaIndexHtml, 'utf8');
    console.log('✓ APK Equipa Staff sincronizado com sucesso.');
  }
}

// 3. Empacota zips para downloads
console.log('-> Gerando pacotes ZIP e binários finais...');
try {
  execSync('python3 scripts/package_apks.py', { cwd: rootDir, stdio: 'inherit' });
  execSync('python3 scripts/package_electron.py', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.warn('Aviso no empacotamento:', e.message);
}

console.log('=== [OSDEL ALL-PLATFORMS SYNC] Concluído com sucesso! ===');
