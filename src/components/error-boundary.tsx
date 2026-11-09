import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { AlertOctagon, RefreshCw, Home, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
  showDetails: boolean;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReload = () => {
    resetError();
    window.location.reload();
  };

  const handleGoHome = () => {
    resetError();
    window.location.href = '/';
  };

  const handleClearCacheAndReload = () => {
    try {
      sessionStorage.clear();
      // Keep credentials intact, but clear query cache
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('react-query') || k.startsWith('osdel_temp')) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
    resetError();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[hsl(var(--background))] p-6 text-[hsl(var(--foreground))]">
      <div className="max-w-xl w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8 shadow-xl space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <AlertOctagon size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black tracking-tight text-[hsl(var(--foreground))]">
            Instabilidade Recuperada com Sucesso
          </h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto leading-relaxed">
            O Gestão X isolou uma falha nesta secção para proteger a integridade dos seus dados e manter o restante sistema operacional.
          </p>
        </div>

        {error.message && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
              Detalhe da Excepção
            </span>
            <p className="font-mono text-xs text-rose-800 dark:text-rose-300 break-words">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={resetError}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} />
            Tentar Novamente
          </button>

          <button
            type="button"
            onClick={handleGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
          >
            <Home size={14} />
            Página Inicial
          </button>

          <button
            type="button"
            onClick={handleClearCacheAndReload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-500/10 transition cursor-pointer"
            title="Limpa cache de navegação corrompido e recarrega"
          >
            <Trash2 size={14} />
            Limpar Cache
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, showDetails: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error), showDetails: false };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      '[Gestão X ErrorBoundary caught an error]:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null, showDetails: false });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
