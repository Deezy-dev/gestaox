import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  X,
  Layers,
  TrendingUp,
  FileCheck,
  Check,
  Database,
  ArrowRight,
  Info,
  Wrench,
} from 'lucide-react';
import {
  runDataHealthAudit,
  executeDataSelfHealing,
  type DataHealthReport,
  type SelfHealingResult,
} from '@/lib/data-health-engine';

interface DataHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataHealthModal({ isOpen, onClose }: DataHealthModalProps) {
  const [report, setReport] = useState<DataHealthReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [healResult, setHealResult] = useState<SelfHealingResult | null>(null);

  const refreshAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const rep = runDataHealthAudit();
      setReport(rep);
      setIsAuditing(false);
    }, 250);
  };

  useEffect(() => {
    if (isOpen) {
      setHealResult(null);
      refreshAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunHealing = async () => {
    setIsHealing(true);
    try {
      const result = await executeDataSelfHealing();
      setHealResult(result);
      // Atualiza o relatório pós-cura
      const updatedRep = runDataHealthAudit();
      setReport(updatedRep);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHealing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200';
    if (score >= 80) return 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200';
    return 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="surface relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl border border-[hsl(var(--border))] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold">Diagnóstico & Auto-Cura de Dados</h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/30">
                  Inteligência OSDEL
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Varredura de integridade, contratos órfãos, status de corte e conciliação matemática
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {report && (
            <>
              {/* Score Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border flex flex-col justify-between ${getScoreColor(report.healthScore)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">Saúde Geral</span>
                    <Sparkles size={16} />
                  </div>
                  <div className="mt-2 text-4xl font-serif font-black">
                    {report.healthScore}%
                  </div>
                  <div className="mt-1 text-xs font-semibold capitalize">
                    Estado {report.status.replace('_', ' ')}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[hsl(var(--border))] surface space-y-2">
                  <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                    <span>Incongruências Encontradas</span>
                    <AlertTriangle size={15} className={report.totalIssues > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                  </div>
                  <div className="text-3xl font-serif font-bold text-[hsl(var(--foreground))]">
                    {report.totalIssues}
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    {report.totalIssues === 0
                      ? 'Nenhuma inconsistência detectada na base de dados.'
                      : `${report.totalIssues} ponto(s) corrigível(is) em 1 clique.`}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-[hsl(var(--border))] surface space-y-2">
                  <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] flex items-center justify-between">
                    <span>Base Auditada</span>
                    <Database size={15} className="text-blue-500" />
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                    <div><b>{report.metrics.totalClients}</b> clientes registados</div>
                    <div><b>{report.metrics.totalContracts}</b> contratos vigentes</div>
                    <div><b>{report.metrics.totalAccounts}</b> contas financeiras</div>
                  </div>
                </div>
              </div>

              {/* Success Result Banner if healed */}
              {healResult && healResult.success && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>Auto-Cura Concluída com Sucesso! ({healResult.fixedCount} correções aplicadas em {healResult.durationMs}ms)</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-emerald-700 dark:text-emerald-300 list-disc list-inside">
                    {healResult.details.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Anomalies List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Diagnóstico Detalhado por Módulo
                  </h3>
                  <button
                    onClick={refreshAudit}
                    disabled={isAuditing}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <RefreshCw size={13} className={isAuditing ? 'animate-spin' : ''} />
                    <span>Reexaminar Agora</span>
                  </button>
                </div>

                {report.anomalies.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-2" />
                    <b className="text-sm text-emerald-950 dark:text-emerald-200 block">
                      Sistema 100% Robusto e Reconciliado!
                    </b>
                    <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                      Todos os clientes possuem contratos válidos, status sincronizados com os pagamentos,
                      contas de tesouraria balanceadas ao centavo e credenciais limpas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {report.anomalies.map((anom) => (
                      <div
                        key={anom.id}
                        className="p-4 rounded-2xl border border-[hsl(var(--border))] surface hover:border-blue-400/50 transition flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                anom.severity === 'critica'
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                  : anom.severity === 'moderada'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-blue-100 text-blue-700 border border-blue-300'
                              }`}
                            >
                              {anom.severity}
                            </span>
                            <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                              {anom.title}
                            </span>
                          </div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            {anom.description}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <Info size={12} className="shrink-0" />
                            <span><b>Impacto:</b> {anom.impact}</span>
                          </div>
                        </div>

                        {anom.autoFixable && (
                          <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                            <Check size={12} /> Auto-Curável
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[hsl(var(--border))] bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {report?.totalIssues
              ? `${report.totalIssues} anomalia(s) pronta(s) para resolução automática`
              : 'Nenhuma ação necessária'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Fechar
            </button>

            {report && report.totalIssues > 0 && (
              <button
                onClick={handleRunHealing}
                disabled={isHealing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition disabled:opacity-50 active:scale-95"
              >
                {isHealing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>A Curar Inconsistências...</span>
                  </>
                ) : (
                  <>
                    <Wrench size={15} />
                    <span>Executar Auto-Cura em 1 Clique</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
