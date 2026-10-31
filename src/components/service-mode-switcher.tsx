import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Wifi,
  Tv,
  Layers,
  ChevronDown,
  Check,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';
import {
  ServiceMode,
  SERVICE_MODES,
  useServiceMode,
} from '@/lib/service-mode';

export function ServiceModeSwitcher({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { mode, meta, selectMode } = useServiceMode();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newMode: ServiceMode) => {
    selectMode(newMode);
    setOpen(false);
  };

  const getIcon = (id: ServiceMode) => {
    switch (id) {
      case 'fibra':
        return <Wifi size={14} className="text-blue-500" />;
      case 'tv':
        return <Tv size={14} className="text-amber-500" />;
      case 'ambos':
      default:
        return <Layers size={14} className="text-emerald-500" />;
    }
  };

  const getPillStyle = () => {
    switch (mode) {
      case 'fibra':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
      case 'tv':
        return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      case 'ambos':
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        data-testid="button-service-mode-switcher"
        onClick={() => setOpen(!open)}
        title="Alterar modalidade de serviço (Fibra / TV / Ambos)"
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition shadow-2xs ${getPillStyle()}`}
      >
        <span className="shrink-0">{getIcon(mode || 'ambos')}</span>
        <span className={compact ? 'hidden sm:inline' : 'inline'}>
          {meta.shortName}
        </span>
        <ChevronDown
          size={13}
          className={`opacity-70 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          data-testid="dropdown-service-mode"
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 text-[hsl(var(--foreground))] shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-[hsl(var(--border))] mb-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Modo de Operação
              </span>
              <span className="text-[10px] text-[hsl(var(--primary))] font-bold flex items-center gap-1">
                <Sparkles size={11} /> Filtro Ativo
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Alterne a visão de trabalho conforme o serviço que está a operar.
            </p>
          </div>

          <div className="space-y-1">
            {/* Fibra */}
            <button
              type="button"
              data-testid="option-mode-fibra"
              onClick={() => handleSelect('fibra')}
              className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition ${
                mode === 'fibra'
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/30'
                  : 'hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                <Wifi size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Internet Fibra</span>
                  {mode === 'fibra' && <Check size={14} className="text-blue-600" />}
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                  Banda Larga, PDOs, ONUs e Megabits
                </p>
              </div>
            </button>

            {/* TV */}
            <button
              type="button"
              data-testid="option-mode-tv"
              onClick={() => handleSelect('tv')}
              className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition ${
                mode === 'tv'
                  ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/30'
                  : 'hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <Tv size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">TV</span>
                  {mode === 'tv' && <Check size={14} className="text-amber-600" />}
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                  Sinal RF / TV Comunitária (4.000 Kz/mês)
                </p>
              </div>
            </button>

            {/* Ambos */}
            <button
              type="button"
              data-testid="option-mode-ambos"
              onClick={() => handleSelect('ambos')}
              className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition ${
                mode === 'ambos' || !mode
                  ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30'
                  : 'hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <Layers size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Ambos (Integrado)</span>
                  {(mode === 'ambos' || !mode) && <Check size={14} className="text-emerald-600" />}
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                  Todos os clientes de TV e Fibra
                </p>
              </div>
            </button>
          </div>

          <div className="mt-2 pt-2 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setLocation('/selecionar-servico');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
            >
              <ArrowRightLeft size={13} />
              <span>Abrir ecrã de selecção inicial</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
