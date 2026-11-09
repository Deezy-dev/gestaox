import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Wifi,
  Tv,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Building2,
  Info,
} from 'lucide-react';
import {
  ServiceMode,
  SERVICE_MODES,
  setStoredServiceMode,
  getStoredServiceMode,
} from '@/lib/service-mode';
import { getCompanyLogo } from '@/lib/company-logo';
import { session } from '@/lib/local-api';

export function ServiceSelectionPage() {
  const [, setLocation] = useLocation();
  const [currentLogo] = useState(() => getCompanyLogo());
  const [hoveredMode, setHoveredMode] = useState<ServiceMode | null>(null);
  const currentSession = session();
  const currentSavedMode = getStoredServiceMode();

  const handleSelectMode = (mode: ServiceMode) => {
    setStoredServiceMode(mode);
    // If the user is already authenticated, go directly to Dashboard; otherwise go to Login
    if (currentSession) {
      setLocation('/');
    } else {
      setLocation('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between selection:bg-blue-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[350px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-[400px] h-[300px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <img
            src={currentLogo}
            alt="OSDEL Tecnologia"
            className="h-11 w-11 rounded-2xl border border-white/10 bg-white p-1 object-contain shadow-lg shadow-black/40"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-white">OSDEL</span>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                Tecnologia
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Telecomunicações · TV por Cabo & Internet Banda Larga
            </p>
          </div>
        </div>

        {currentSession && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-300 hidden sm:inline">
              Sessão iniciada como <b className="text-white font-bold">{currentSession.name}</b>
            </span>
            <button
              onClick={() => setLocation('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white transition"
            >
              Ir ao Painel <ChevronRight size={14} />
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 sm:py-8 my-auto">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 mb-4 backdrop-blur-md">
            <Sparkles size={14} className="text-amber-400" />
            <span>Ambiente de Trabalho Personalizado</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Com qual serviço vai trabalhar hoje?
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
            Escolha o módulo de operação para simplificar a sua rotina. Cada modo organiza a interface, 
            os clientes e as ferramentas certas para o seu atendimento.
          </p>
        </div>

        {/* 3 Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Card 1: Internet Fibra Óptica */}
          <div
            data-testid="card-mode-fibra"
            onMouseEnter={() => setHoveredMode('fibra')}
            onMouseLeave={() => setHoveredMode(null)}
            onClick={() => handleSelectMode('fibra')}
            className={`group relative rounded-3xl p-7 cursor-pointer transition-all duration-300 flex flex-col justify-between border backdrop-blur-xl ${
              currentSavedMode === 'fibra'
                ? 'bg-blue-950/40 border-blue-500 shadow-2xl shadow-blue-500/20 ring-2 ring-blue-500/50'
                : 'bg-slate-900/60 hover:bg-slate-900/90 border-white/10 hover:border-blue-500/60 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1.5'
            }`}
          >
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/25 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="h-14 w-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-md">
                  <Wifi size={28} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300">
                  Fibra FTTH
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white group-hover:text-blue-300 transition">
                Internet Fibra
              </h2>
              <p className="text-xs font-semibold text-blue-400 mt-1">Banda Larga de Alta Velocidade</p>

              <p className="mt-4 text-xs leading-relaxed text-slate-300">
                Foco total na rede de fibra óptica. Ideal para operadores que gerem velocidades Mbps, caixas PDO, modems ONU e planos residenciais/empresariais.
              </p>

              <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                  <span>Planos de 10 a 100 Mbps & Tarifários</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                  <span>Registo de Caixas PDO e Modems ONU</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                  <span>Filtro automático de clientes de Fibra</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 group-hover:shadow-blue-600/50 transition-all active:scale-[0.98]"
              >
                <span>Trabalhar com Fibra</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: TV Comunitária */}
          <div
            data-testid="card-mode-tv"
            onMouseEnter={() => setHoveredMode('tv')}
            onMouseLeave={() => setHoveredMode(null)}
            onClick={() => handleSelectMode('tv')}
            className={`group relative rounded-3xl p-7 cursor-pointer transition-all duration-300 flex flex-col justify-between border backdrop-blur-xl ${
              currentSavedMode === 'tv'
                ? 'bg-amber-950/40 border-amber-500 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-500/50'
                : 'bg-slate-900/60 hover:bg-slate-900/90 border-white/10 hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1.5'
            }`}
          >
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/25 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="h-14 w-14 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-md">
                  <Tv size={28} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Sinal Coaxial & RF
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white group-hover:text-amber-300 transition">
                TV
              </h2>
              <p className="text-xs font-semibold text-amber-400 mt-1">Transmissão Comunitária</p>

              <p className="mt-4 text-xs leading-relaxed text-slate-300">
                Foco total na rede de televisão comunitária. Ideal para cobrança da mensalidade base (4.000 Kz), gestão de pontos adicionais e cortes de sinal RF.
              </p>

              <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
                  <span>Mensalidade padrão de 4.000 Kz</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
                  <span>Pontos de TV por Residência & Códigos</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
                  <span>Filtro de assinantes e piquete de TV</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 group-hover:shadow-amber-600/50 transition-all active:scale-[0.98]"
              >
                <span>Trabalhar com TV</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 3: Operação Integrada (Ambos) */}
          <div
            data-testid="card-mode-ambos"
            onMouseEnter={() => setHoveredMode('ambos')}
            onMouseLeave={() => setHoveredMode(null)}
            onClick={() => handleSelectMode('ambos')}
            className={`group relative rounded-3xl p-7 cursor-pointer transition-all duration-300 flex flex-col justify-between border backdrop-blur-xl ${
              currentSavedMode === 'ambos'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-2xl shadow-emerald-500/20 ring-2 ring-emerald-500/50'
                : 'bg-slate-900/60 hover:bg-slate-900/90 border-white/10 hover:border-emerald-500/60 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1.5'
            }`}
          >
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/25 transition-all" />

            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="h-14 w-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-md">
                  <Layers size={28} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  Visão Geral Completa
                </span>
              </div>

              <h2 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition">
                Ambos os Serviços
              </h2>
              <p className="text-xs font-semibold text-emerald-400 mt-1">TV + Internet Fibra</p>

              <p className="mt-4 text-xs leading-relaxed text-slate-300">
                Acesso integral a toda a operação da OSDEL. Ideal para administradores, gerentes ou operadores que atendem tanto clientes de TV como de Fibra.
              </p>

              <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Todos os clientes (TV, Fibra e Combos)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Tesouraria geral, contas e balanço total</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                  <span>Visão consolidada para a administração</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 group-hover:shadow-emerald-600/50 transition-all active:scale-[0.98]"
              >
                <span>Trabalhar com Ambos</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="mt-10 max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 p-4 text-xs text-slate-400 flex items-start gap-3 backdrop-blur-md">
          <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-200">Nota prática:</span> Pode alterar a modalidade a qualquer momento directamente no topo do centro de controlo, sem necessidade de sair da sua conta ou reiniciar a aplicação.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Sistema Empresarial OSDEL TECNOLOGIA · Luanda, Angola</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Suporte Offline com Sincronização Automática Activa
        </div>
      </footer>
    </div>
  );
}
