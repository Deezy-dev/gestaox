import express, { Express, Request, Response, NextFunction } from 'express';
import { router } from './routes';

export const app: Express = express();

// Proteção DoS de memória: limite de payload a 10MB
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// OWASP Security Headers (Proteção contra clickjacking, MIME sniffing e XSS)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS Flexível e Seguro para Web, Electron Desktop e APKs Capacitor
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['*'];

  const origin = req.headers.origin || '*';
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Proteção contra Força Bruta / Brute Force Rate Limiting em Rotas de Autenticação
const loginAttemptsMap = new Map<string, { count: number; resetAt: number }>();

app.use('/api/v1/auth', (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST') return next();

  const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();
  const record = loginAttemptsMap.get(ip);

  if (record && record.resetAt > now) {
    if (record.count >= 25) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Muitas tentativas de autenticação detectadas. Aguarde 1 minuto antes de tentar novamente.',
        },
      });
    }
    record.count++;
  } else {
    loginAttemptsMap.set(ip, { count: 1, resetAt: now + 60000 });
  }

  next();
});

// Desativa cache em proxies para rotas dinâmicas da API (garante dados em tempo real)
app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
});

// Monta as rotas exclusivamente no prefixo /api
app.use('/api', router);

// Error Handler Centralizado
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Erro interno no servidor Node.js',
      timestamp: new Date().toISOString(),
    },
  });
});
