import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Trash2,
  HardDrive,
  Cloud,
  Check,
  X,
  Smartphone,
  Layers,
  Sparkles,
  Activity,
  Server,
  ShieldCheck,
  Globe,
  ArrowDownUp,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useOnlineSync } from '@/hooks/use-online-sync';
import { PWAInstallButton } from '@/components/pwa-install-button';
import { getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl } from '@/lib/api-config';

interface SyncCenterModalProps {
  onClose: () => void;
}

export const SyncCenterModal: React.FC<SyncCenterModalProps> = ({ onClose }) => {
  const {
    isOnline,
    isSimulated,
    isSyncing,
    pendingCount,
    lastSyncTime,
    queue,
    history,
    syncNow,
    runDiagnostics,
    diagnosticResult,
    isTestingConnection,
    toggleSimulateOffline,
    clearSynced,
    exportBackup,
  } = useOnlineSync();

  const [activeTab, setActiveTab] = useState<'diagnostics' | 'queue' | 'history'>('diagnostics');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [customApiUrl, setCustomApiUrl] = useState(getApiBaseUrl());
  const [editingApiUrl, setEditingApiUrl] = useState(false);

  const handleManualSync = async () => {
    setSyncFeedback(null);
    try {
      const res = await syncNow();
      if (res.success) {
        setSyncFeedback(
          `Sincronização Online-First concluída! ${res.sentCount} alteração(ões) enviadas para a nuvem. ` +
          `Recebidos da nuvem: ${res.receivedCounts.clients} clientes, ${res.receivedCounts.invoices} facturas, ` +
          `${res.receivedCounts.tvChannels} canais (${res.durationMs}ms).`
        );
      } else if (!isOnline) {
        setSyncFeedback('Dispositivo sem ligação à internet. A aplicação continuará a operar localmente em contingência offline.');
      } else {
        setSyncFeedback(`Sincronização em contingência offline: ${res.error || 'Servidor indisponível'}. Os seus dados locais estão protegidos.`);
      }
    } catch (e: any) {
      setSyncFeedback(`Erro: ${e?.message || 'Falha na comunicação'}`);
    }
  };

  const handleRunDiagnostics = async () => {
    await runDiagnostics(customApiUrl);
  };

  const handleSaveApiUrl = () => {
    setApiBaseUrl(customApiUrl);
    setEditingApiUrl(false);
    handleRunDiagnostics();
  };

  const handleResetApi = () => {
    resetApiBaseUrl();
    setCustomApiUrl(getApiBaseUrl());
    setEditingApiUrl(false);
    handleRunDiagnostics();
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return 'Nunca sincronizado';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('pt-AO', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return iso;
    }
  };

  const moduleColors: Record<string, string> = {
    clientes: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    pagamentos: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    despesas: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    ordens: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    inventario: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    fecho: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    configuracoes: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    geral: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex flex-col max-h-[92vh] w-full max-w-4xl rounded-2xl bg-[hsl(var(--card))] shadow-2xl border border-[hsl(var(--border))] overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl ${
                !isOnline
                  ? 'bg-amber-500/15 text-amber-600'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              }`}
            >
              <Cloud size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                  Central de Sincronização Online-First & Nuvem
                </h2>
                <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-600">
                  Nuvem Prioritária
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Sincronização bidirecional em tempo real (Mandar & Receber) com contingência local offline para Web, Electron e APKs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Status Dashboard Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.35)] p-4 sm:px-6">
          {/* Status Box */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
            <div className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Estado de Conexão
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  !isOnline ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                }`}
              />
              <span className="font-extrabold text-sm text-[hsl(var(--foreground))]">
                {isOnline ? 'Online (Nuvem Activa)' : 'Offline (Contingência Local)'}
              </span>
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
              {getApiBaseUrl()}
            </div>
          </div>

          {/* Sync Box */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
            <div className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Última Sincronização
            </div>
            <div className="font-extrabold text-sm text-[hsl(var(--foreground))] mt-1 truncate">
              {formatDate(lastSyncTime)}
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              Automática no arranque e a cada 60s
            </div>
          </div>

          {/* Queue Box */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
            <div className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
              Fila Pendente p/ Nuvem
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="font-extrabold text-sm text-[hsl(var(--foreground))]">
                {pendingCount} {pendingCount === 1 ? 'operação' : 'operações'}
              </span>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'A sincronizar...' : 'Mandar & Receber'}</span>
              </button>
            </div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
              Envia pendências e traz clientes da nuvem
            </div>
          </div>
        </div>

        {/* Feedback Alert if available */}
        {syncFeedback && (
          <div className="border-b border-blue-500/20 bg-blue-500/10 px-6 py-2.5 text-xs font-medium text-blue-800 dark:text-blue-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="shrink-0 text-blue-600" />
              <span>{syncFeedback}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-blue-600 hover:text-blue-800 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-[hsl(var(--border))] px-6 bg-[hsl(var(--card))]">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Activity size={14} />
            <span>Testes de Conexão & Diagnóstico</span>
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'queue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <Clock size={14} />
            <span>Fila de Transmissão ({pendingCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Histórico de Sessões ({history.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: DIAGNÓSTICO PROFUNDO & TESTES */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              {/* URL Config & Action Bar */}
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.35)] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[hsl(var(--foreground))] flex items-center gap-2">
                      <Server size={16} className="text-blue-600" />
                      Servidor na Nuvem Configurado
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      URL oficial da API REST PythonAnywhere da OSDEL Tecnologia
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRunDiagnostics}
                      disabled={isTestingConnection}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                    >
                      <Activity size={14} className={isTestingConnection ? 'animate-spin' : ''} />
                      <span>{isTestingConnection ? 'A executar testes...' : 'Executar Todos os Testes'}</span>
                    </button>
                    <button
                      onClick={() => setEditingApiUrl(!editingApiUrl)}
                      className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
                    >
                      {editingApiUrl ? 'Cancelar' : 'Alterar URL'}
                    </button>
                  </div>
                </div>

                {editingApiUrl ? (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    <input
                      type="text"
                      value={customApiUrl}
                      onChange={(e) => setCustomApiUrl(e.target.value)}
                      placeholder="https://sua-empresa.pythonanywhere.com"
                      className="flex-1 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-mono text-[hsl(var(--foreground))]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveApiUrl}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                      >
                        Guardar & Testar
                      </button>
                      <button
                        onClick={handleResetApi}
                        className="rounded-lg border border-[hsl(var(--border))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition"
                      >
                        Repor Padrão
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--card))] px-3 py-2 border border-[hsl(var(--border))] font-mono text-xs text-[hsl(var(--foreground))]">
                    <Globe size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{customApiUrl}</span>
                  </div>
                )}
              </div>

              {/* Diagnostic Results Summary */}
              {diagnosticResult ? (
                <div className="space-y-3">
                  <div
                    className={`rounded-xl border p-4 ${
                      diagnosticResult.overallStatus === 'healthy'
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : diagnosticResult.overallStatus === 'degraded'
                        ? 'border-amber-500/30 bg-amber-500/10'
                        : 'border-rose-500/30 bg-rose-500/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-extrabold text-sm text-[hsl(var(--foreground))]">
                          {diagnosticResult.summaryMessage}
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                          {diagnosticResult.recommendedAction}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] px-2.5 py-1 font-mono text-xs font-bold text-[hsl(var(--foreground))]">
                          {diagnosticResult.latencyMs > 0 ? `${diagnosticResult.latencyMs} ms` : 'Sem resposta'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Checks List */}
                  <div className="divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
                    {diagnosticResult.checks.map((check, index) => (
                      <div key={check.id} className="p-3.5 flex items-start gap-3 text-xs">
                        <div className="mt-0.5 shrink-0">
                          {check.status === 'success' ? (
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          ) : check.status === 'warning' ? (
                            <AlertTriangle size={16} className="text-amber-600" />
                          ) : check.status === 'error' ? (
                            <X size={16} className="text-rose-600" />
                          ) : (
                            <Clock size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[hsl(var(--foreground))]">
                              {index + 1}. {check.name}
                            </span>
                            {check.latencyMs !== undefined && (
                              <span className="font-mono text-[10px] text-[hsl(var(--muted-foreground))]">
                                {check.latencyMs}ms
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            {check.description}
                          </div>
                          {check.message && (
                            <div className="mt-1 text-[11px] font-semibold text-[hsl(var(--foreground))]">
                              ↳ {check.message}
                            </div>
                          )}
                          {check.details && (
                            <div className="mt-0.5 text-[10px] text-slate-500 font-mono">
                              {check.details}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-8 text-center space-y-3">
                  <Activity size={32} className="mx-auto text-blue-500 animate-pulse" />
                  <div className="font-bold text-sm text-[hsl(var(--foreground))]">
                    Pronto para diagnosticar o servidor na nuvem
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
                    Clique no botão acima para testar a rota DNS, latência de rede, API Python Flask,
                    endpoint de sincronização bidirecional e certificados de segurança.
                  </p>
                  <button
                    onClick={handleRunDiagnostics}
                    disabled={isTestingConnection}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer"
                  >
                    Iniciar Testes de Conectividade
                  </button>
                </div>
              )}

              {/* Informações da Arquitetura Online-First */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.2)] p-3.5 space-y-1">
                  <div className="font-bold text-xs text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <Cloud size={14} className="text-blue-600" />
                    Prioridade Absoluta na Nuvem (Online-First)
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                    Sempre que o dispositivo estiver online, a aplicação lê e grava directamente no servidor central.
                    Nenhuma operação fica retida e os saldos são consolidados em tempo real.
                  </p>
                </div>
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.2)] p-3.5 space-y-1">
                  <div className="font-bold text-xs text-[hsl(var(--foreground))] flex items-center gap-1.5">
                    <HardDrive size={14} className="text-emerald-600" />
                    Contingência Automática Sem Bloqueio
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                    Se a rede falhar na rua ou no balcão, o sistema entra em modo de contingência local de forma transparente:
                    recibos e ordens são emitidos normalmente e enviados logo que a ligação regressar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FILA DE PENDÊNCIAS */}
          {activeTab === 'queue' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[hsl(var(--muted-foreground))]">
                  {queue.length} operação(ões) registadas na memória
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={clearSynced}
                    className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-rose-600 transition text-[11px]"
                  >
                    <Trash2 size={12} /> Limpar Sincronizados
                  </button>
                  <button
                    onClick={exportBackup}
                    className="flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-blue-600 transition text-[11px]"
                  >
                    <Download size={12} /> Descarregar Backup JSON
                  </button>
                </div>
              </div>

              {queue.length === 0 ? (
                <div className="py-12 text-center text-xs text-[hsl(var(--muted-foreground))] rounded-xl border border-dashed border-[hsl(var(--border))]">
                  Nenhuma operação na fila. Todas as transacções foram sincronizadas na nuvem!
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
                  {queue.slice().reverse().map((item) => {
                    const colorClass = moduleColors[item.module] || moduleColors.geral;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-xs hover:bg-[hsl(var(--secondary)/.3)] transition"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`mt-0.5 inline-block rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase shrink-0 ${colorClass}`}
                          >
                            {item.module}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-[hsl(var(--foreground))] truncate">
                              {item.description}
                            </div>
                            <div className="text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-2 mt-0.5">
                              <span>{formatDate(item.timestamp)}</span>
                              <span>·</span>
                              <span className="uppercase">{item.action}</span>
                              {item.syncedAt && (
                                <>
                                  <span>·</span>
                                  <span className="text-emerald-600">Sincronizado {formatDate(item.syncedAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          {item.status === 'synced' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 size={12} /> Sincronizado
                            </span>
                          ) : item.status === 'syncing' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                              <RefreshCw size={12} className="animate-spin" /> A enviar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                              <Clock size={12} /> Pendente (Offline)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTÓRICO DE SESSÕES */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="py-12 text-center text-xs text-[hsl(var(--muted-foreground))] rounded-xl border border-dashed border-[hsl(var(--border))]">
                  Ainda não há sessões de sincronização arquivadas.
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--border))] rounded-xl border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--card))]">
                  {history.map((sess) => (
                    <div
                      key={sess.id}
                      className="flex items-center justify-between p-3.5 text-xs hover:bg-[hsl(var(--secondary)/.3)]"
                    >
                      <div>
                        <div className="font-bold text-[hsl(var(--foreground))]">
                          {sess.source === 'auto_reconnect'
                            ? 'Sincronização Automática (Reconexão)'
                            : sess.source === 'periodic'
                            ? 'Sincronização Periódica de Fundo'
                            : sess.source === 'startup'
                            ? 'Sincronização de Arranque (Online-First)'
                            : 'Sincronização Manual'}
                        </div>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          Iniciada em {formatDate(sess.startedAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          {sess.syncedCount} {sess.syncedCount === 1 ? 'item enviado' : 'itens enviados'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] px-6 py-3.5">
          <div className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-2">
            <span>OSDEL Gestão X · Arquitectura Online-First & Nuvem</span>
            <button
              onClick={toggleSimulateOffline}
              className="text-[10px] underline text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              {isSimulated ? '[Desativar Simulação Offline]' : '[Testar Modo Sem Sinal]'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-[hsl(var(--secondary))] px-4 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition cursor-pointer"
          >
            Fechar Janela
          </button>
        </footer>
      </div>
    </div>
  );
};
