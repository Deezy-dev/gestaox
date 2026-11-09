import { app } from '../src/server/app';

// Exporta o manipulador padrão para a função Serverless da Vercel
export default function handler(req: any, res: any) {
  // Garante que o prefixo /api está presente para o Express rotear corretamente
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
