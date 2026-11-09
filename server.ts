import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { app as apiApp } from './src/server/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  // Monta todas as rotas da API Node.js / Supabase Serverless
  app.use(apiApp);

  if (isDev) {
    // Modo Desenvolvimento: Monta o Vite middlewares no Express
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Modo Produção Full-Stack (servir estáticos de dist)
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OSDEL Gestão X] Servidor Full-Stack Node.js a correr na porta ${PORT}`);
    console.log(`[OSDEL Gestão X] API disponível em http://localhost:${PORT}/api/v1/health`);
  });
}

startServer().catch((err) => {
  console.error('[Falha crítica ao iniciar o servidor]:', err);
  process.exit(1);
});
