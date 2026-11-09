import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function NotFound() {
  const [location, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700 text-slate-100 shadow-xl">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertCircle size={28} />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            Página Não Encontrada
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed">
            O endereço acedido (<code className="text-amber-400 font-mono text-xs">{location || '/'}</code>) não existe ou foi movido.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => {
                if (window.location.hash) {
                  window.location.hash = '#/';
                }
                setLocation('/');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-md"
            >
              <Home size={15} /> Painel Principal
            </button>
            <button
              onClick={() => {
                if (window.location.hash) {
                  window.location.hash = '#/login';
                }
                setLocation('/login');
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
            >
              Iniciar Sessão
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
