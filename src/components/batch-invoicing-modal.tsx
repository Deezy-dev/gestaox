import { useState, useMemo } from 'react';
import {
  ReceiptText,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  ArrowRight,
  TrendingUp,
  Filter,
  Users,
  ShieldAlert,
  Coins,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  previewBatchInvoicing,
  executeBatchInvoicing,
  formatCompetenceLabel,
  type BatchInvoicingPreview,
  type BatchInvoicingResult,
} from '@/lib/batch-invoicing';

interface BatchInvoicingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: BatchInvoicingResult) => void;
}

export function BatchInvoicingModal({ isOpen, onClose, onSuccess }: BatchInvoicingModalProps) {
  // Competência padrão: mês atual
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [serviceFilter, setServiceFilter] = useState<'todos' | 'fibra' | 'tv' | 'combo'>('todos');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<BatchInvoicingResult | null>(null);

  // Calcula opções de meses rápidos (anterior, atual, próximo)
  const quickMonths = useMemo(() => {
    const d = new Date();
    const currY = d.getFullYear();
    const currM = d.getMonth() + 1;

    const prevDate = new Date(currY, currM - 2, 1);
    const currDate = new Date(currY, currM - 1, 1);
    const nextDate = new Date(currY, currM, 1);

    const toYm = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    };

    return [
      { id: toYm(currDate), label: `${formatCompetenceLabel(toYm(currDate))} (Mês Atual)` },
      { id: toYm(nextDate), label: `${formatCompetenceLabel(toYm(nextDate))} (Próximo Mês)` },
      { id: toYm(prevDate), label: `${formatCompetenceLabel(toYm(prevDate))} (Mês Anterior)` },
    ];
  }, []);

  const preview = useMemo<BatchInvoicingPreview>(() => {
    if (!isOpen) {
      return {
        competenceMonth: selectedMonth,
        competenceLabel: '',
        totalActiveClients: 0,
        eligibleClientsCount: 0,
        alreadyInvoicedCount: 0,
        toInvoiceCount: 0,
        projectedRevenueKz: 0,
        serviceBreakdown: { tv: 0, fibra: 0, combo: 0 },
        sampleClientsToInvoice: [],
      };
    }
    return previewBatchInvoicing(selectedMonth, serviceFilter);
  }, [isOpen, selectedMonth, serviceFilter, executionResult]);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (preview.toInvoiceCount === 0) {
      alert('Não há clientes pendentes para faturar nesta competência!');
      return;
    }

    if (
      !window.confirm(
        `Confirma a emissão de ${preview.toInvoiceCount} faturas para a competência de ${preview.competenceLabel}? Total estimado: ${preview.projectedRevenueKz.toLocaleString(
          'pt-AO'
        )} Kz.`
      )
    ) {
      return;
    }

    setIsExecuting(true);
    try {
      const res = await executeBatchInvoicing(selectedMonth, {
        serviceModeFilter: serviceFilter,
      });
      setExecutionResult(res);
      if (onSuccess) onSuccess(res);
    } catch (err: any) {
      alert(`Erro na faturação em lote: ${err?.message || 'Falha ao processar'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const kz = (val: number) => `${Number(val || 0).toLocaleString('pt-AO')} Kz`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="surface relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl border border-[hsl(var(--border))] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ReceiptText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold">Assistente de Faturação em Lote</h2>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/30">
                  Zero Duplicados
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Geração em massa de mensalidades com bloqueio absoluto de repetição por cliente e mês
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
          {/* Competence & Service Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-600" />
                <span>Mês de Competência da Mensalidade</span>
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setExecutionResult(null);
                }}
                className="w-full h-10 rounded-xl border border-[hsl(var(--border))] surface px-3 text-xs font-bold text-[hsl(var(--foreground))] outline-none focus:border-emerald-500"
              >
                {quickMonths.map((qm) => (
                  <option key={qm.id} value={qm.id}>
                    {qm.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter size={14} className="text-blue-600" />
                <span>Filtrar por Modo de Serviço</span>
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-[hsl(var(--border))]">
                {(['todos', 'fibra', 'tv', 'combo'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setServiceFilter(mode);
                      setExecutionResult(null);
                    }}
                    className={`py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                      serviceFilter === mode
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {executionResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 animate-in fade-in duration-300 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Lote emitido com sucesso! ({executionResult.generatedCount} novas faturas geradas)</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Receita total faturada: <b>{kz(executionResult.totalAmountKz)}</b> na competência de{' '}
                <b>{formatCompetenceLabel(executionResult.competenceMonth)}</b>. {executionResult.skippedCount} cliente(s) pulado(s) por já possuírem fatura.
              </p>
            </div>
          )}

          {/* Live Preview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border border-[hsl(var(--border))] surface">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Elegíveis</div>
              <div className="mt-1 text-2xl font-serif font-black">{preview.eligibleClientsCount}</div>
              <div className="text-[10px] text-slate-400">Clientes ativos</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">Já Faturados</div>
              <div className="mt-1 text-2xl font-serif font-black text-amber-700 dark:text-amber-400">
                {preview.alreadyInvoicedCount}
              </div>
              <div className="text-[10px] text-amber-600/80">Pulados (0 duplicados)</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">A Emitir Agora</div>
              <div className="mt-1 text-2xl font-serif font-black text-emerald-700 dark:text-emerald-400">
                {preview.toInvoiceCount}
              </div>
              <div className="text-[10px] text-emerald-600/80">Pendentes de emissão</div>
            </div>

            <div className="p-3.5 rounded-2xl border border-[hsl(var(--border))] surface">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Receita Prevista</div>
              <div className="mt-1 text-lg font-serif font-black text-blue-600 truncate">
                {kz(preview.projectedRevenueKz)}
              </div>
              <div className="text-[10px] text-slate-400">Total deste lote</div>
            </div>
          </div>

          {/* Sample Clients to invoice preview */}
          {preview.sampleClientsToInvoice.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Prévia de Clientes que Receberão a Fatura
                </span>
                <span className="text-[11px] text-slate-400">
                  A mostrar {preview.sampleClientsToInvoice.length} de {preview.toInvoiceCount}
                </span>
              </div>

              <div className="divide-y divide-[hsl(var(--border))] rounded-2xl border border-[hsl(var(--border))] surface overflow-hidden">
                {preview.sampleClientsToInvoice.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[hsl(var(--foreground))]">{c.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {c.code} · {c.serviceType.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-600">{kz(c.monthlyPrice)}</div>
                      <div className="text-[10px] text-slate-400">Vencimento: {c.dueDate}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.toInvoiceCount === 0 && (
            <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
              <CheckCircle2 size={30} className="mx-auto text-emerald-500 mb-2" />
              <b className="text-xs text-slate-700 dark:text-slate-200 block">
                Todos os clientes já possuem fatura emitida para {preview.competenceLabel}!
              </b>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Não há risco de cobranças repetidas. Pode emitir para o próximo mês ou aguardar novo ciclo.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[hsl(var(--border))] bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Competência selecionada: <b>{preview.competenceLabel}</b>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>

            <button
              onClick={handleExecute}
              disabled={isExecuting || preview.toInvoiceCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition disabled:opacity-50 active:scale-95"
            >
              {isExecuting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>A Emitir Lote...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Emitir Faturas do Lote ({preview.toInvoiceCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
