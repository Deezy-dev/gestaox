import { useState, useRef } from 'react';
import {
  Shield,
  FileCheck,
  Download,
  Upload,
  RotateCcw,
  Search,
  Lock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Database,
  History,
  Key,
  FileSpreadsheet,
} from 'lucide-react';
import { Field, Input, Textarea, Button, dateTime } from '@/components/shared-ui';
import {
  useListAuditLogs,
  exportDatabaseBackup,
  importDatabaseBackup,
  getDbStats,
  resetDatabaseToDefaults,
} from '@/lib/local-api';

interface SecurityFiscalDataTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
}

export function SecurityFiscalDataTab({ form, set, isAdmin }: SecurityFiscalDataTabProps) {
  const [logSearch, setLogSearch] = useState('');
  const [logModule, setLogModule] = useState('todos');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dbStats, setDbStats] = useState(() => getDbStats());

  const { data: auditLogs = [] } = useListAuditLogs({
    search: logSearch,
    module: logModule === 'todos' ? undefined : logModule,
  });

  const handleDownloadBackup = (format: 'json' | 'csv') => {
    const res = exportDatabaseBackup(format);
    const blob = new Blob([res.content], { type: res.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const format = isCsv ? 'csv' : 'json';
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = importDatabaseBackup(text, format);
        setImportResult(res);
        if (res.success) {
          setImportStatus('sucesso');
          setDbStats(getDbStats());
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setImportStatus('erro');
        }
      } catch (err: any) {
        setImportStatus('erro');
        setImportResult({ success: false, message: err?.message || 'Ficheiro corrompido.', errors: [err?.message] });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-7">
      {/* 1. FISCALIDADE AGT & CERTIFICAÇÃO */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <FileCheck size={20} />
          </div>
          <div>
            <p className="eyebrow">Administração Geral Tributária (AGT)</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Enquadramento Fiscal & Facturação Certificada</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="N.º de Certificação de Software da AGT">
            <Input
              value={form.agtCertificateNumber || 'AGT-CERT/2024/0981'}
              onChange={(e) => set('agtCertificateNumber', e.target.value)}
              disabled={!isAdmin}
              className="font-mono font-bold text-blue-700"
              placeholder="AGT-CERT/..."
            />
          </Field>

          <Field label="Versão Homologada do Software">
            <Input
              value={form.agtSoftwareVersion || 'OSDEL v2.4-AO'}
              onChange={(e) => set('agtSoftwareVersion', e.target.value)}
              disabled={!isAdmin}
              className="font-mono"
              placeholder="OSDEL v2.4-AO"
            />
          </Field>

          <Field label="Série Anual de Facturação">
            <Input
              value={form.fiscalSeries || '2026/A'}
              onChange={(e) => set('fiscalSeries', e.target.value)}
              disabled={!isAdmin}
              className="font-mono font-bold"
              placeholder="2026/A"
            />
          </Field>

          <Field label="Taxa de Retenção na Fonte (Pessoas Colectivas %)">
            <Input
              type="number"
              step="0.1"
              value={form.withholdingTaxRate ?? 6.5}
              onChange={(e) => set('withholdingTaxRate', Number(e.target.value))}
              disabled={!isAdmin}
              className="font-mono"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Motivo de Isenção / Regime do IVA (CIVA)">
              <Input
                value={form.ivaExemptionReason || 'Regime de Exclusão nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA).'}
                onChange={(e) => set('ivaExemptionReason', e.target.value)}
                disabled={!isAdmin}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* 2. PREFIXOS & MODELOS DE DOCUMENTOS */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
            <FileText size={20} />
          </div>
          <div>
            <p className="eyebrow">Numeração & Modelos</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Prefixos Oficiais de Documentos</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Factura Comercial (FT)">
            <Input
              value={form.invoicePrefix || 'FT'}
              onChange={(e) => set('invoicePrefix', e.target.value)}
              disabled={!isAdmin}
              className="font-mono font-bold uppercase"
            />
          </Field>

          <Field label="Recibo / Factura-Recibo (FR)">
            <Input
              value={form.receiptPrefix || 'FR'}
              onChange={(e) => set('receiptPrefix', e.target.value)}
              disabled={!isAdmin}
              className="font-mono font-bold uppercase"
            />
          </Field>

          <Field label="Factura Proforma (FP)">
            <Input
              value={form.proformaPrefix || 'FP'}
              onChange={(e) => set('proformaPrefix', e.target.value)}
              disabled={!isAdmin}
              className="font-mono font-bold uppercase"
            />
          </Field>

          <Field label="Contrato de Adesão (CT)">
            <Input
              value={form.contractPrefix || 'CT'}
              onChange={(e) => set('contractPrefix', e.target.value)}
              disabled={!isAdmin}
              className="font-mono font-bold uppercase"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Rodapé Timbrado Oficial de Faturas e Recibos">
            <Textarea
              rows={2}
              value={form.invoiceFooter || ''}
              onChange={(e) => set('invoiceFooter', e.target.value)}
              disabled={!isAdmin}
            />
          </Field>
        </div>
      </section>

      {/* 3. POLÍTICAS DE SEGURANÇA & SESSÃO */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Shield size={20} />
          </div>
          <div>
            <p className="eyebrow">Proteção do Sistema</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Segurança e Controlo de Sessão</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field label="Timeout de Inactividade da Sessão (Minutos)" hint="Encerra sessão de operadores sem actividade">
            <Input
              type="number"
              min="5"
              max="480"
              value={form.sessionTimeoutMinutes ?? 60}
              onChange={(e) => set('sessionTimeoutMinutes', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Mínimo de Caracteres da Senha" hint="Comprimento mínimo para os operadores">
            <Input
              type="number"
              min="4"
              max="20"
              value={form.minPasswordLength ?? 6}
              onChange={(e) => set('minPasswordLength', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Retenção de Registos de Auditoria (Dias)">
            <Input
              type="number"
              min="30"
              max="3650"
              value={form.auditRetentionDays ?? 365}
              onChange={(e) => set('auditRetentionDays', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-2.5 text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer">
            <input
              type="checkbox"
              checked={form.requireAdminPasswordForDeletions ?? true}
              onChange={(e) => set('requireAdminPasswordForDeletions', e.target.checked)}
              disabled={!isAdmin}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            Exigir Autorização do Administrador para Exclusões Críticas
          </label>

          <label className="flex items-center gap-2.5 text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer">
            <input
              type="checkbox"
              checked={form.maintenanceMode ?? false}
              onChange={(e) => set('maintenanceMode', e.target.checked)}
              disabled={!isAdmin}
              className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
            />
            Activar Modo de Manutenção (Apenas Admins Conectam)
          </label>
        </div>
      </section>

      {/* 4. AUDITORIA & REGISTOS DE ACÇÕES */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-800">
              <History size={20} />
            </div>
            <div>
              <p className="eyebrow">Trilha de Auditoria</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Registos Recentes de Auditoria</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar acção..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] w-44"
              />
            </div>
            <select
              value={logModule}
              onChange={(e) => setLogModule(e.target.value)}
              className="text-xs py-1.5 px-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
            >
              <option value="todos">Todos Módulos</option>
              <option value="Definições">Definições</option>
              <option value="Clientes">Clientes</option>
              <option value="Pagamentos">Pagamentos</option>
              <option value="Caixa">Caixa</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto max-h-72 border border-[hsl(var(--border))] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] sticky top-0 font-bold border-b border-[hsl(var(--border))]">
              <tr>
                <th className="p-2.5">Data/Hora</th>
                <th className="p-2.5">Utilizador</th>
                <th className="p-2.5">Módulo</th>
                <th className="p-2.5">Acção</th>
                <th className="p-2.5">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">
                    Nenhum registo de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 15).map((log: any) => (
                  <tr key={log.id} className="hover:bg-[hsl(var(--secondary)/.3)]">
                    <td className="p-2.5 whitespace-nowrap text-[11px] font-mono text-slate-500">
                      {dateTime(log.timestamp)}
                    </td>
                    <td className="p-2.5 font-bold whitespace-nowrap">{log.user}</td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-[11px] font-bold text-blue-600">{log.action}</td>
                    <td className="p-2.5 text-slate-600 truncate max-w-xs">{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. CÓPIA DE SEGURANÇA (BACKUP & RESTORE INTELIGENTE) */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Database size={20} />
          </div>
          <div>
            <p className="eyebrow">Gestão de Dados Locais & Nuvem</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Backup & Importação Inteligente da Base de Dados</h2>
          </div>
        </div>

        {/* Live database stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Clientes</span>
            <b className="text-lg font-black text-slate-800">{dbStats.clients}</b>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Contratos</span>
            <b className="text-lg font-black text-blue-700">{dbStats.contracts}</b>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Facturas</span>
            <b className="text-lg font-black text-emerald-700">{dbStats.invoices}</b>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pagamentos</span>
            <b className="text-lg font-black text-purple-700">{dbStats.payments}</b>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Equipa</span>
            <b className="text-lg font-black text-slate-700">{dbStats.users}</b>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Artigos Stock</span>
            <b className="text-lg font-black text-amber-700">{dbStats.inventory}</b>
          </div>
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Exporte e importe a base de dados em múltiplos formatos (JSON integral estruturado ou CSV compatível com Excel).
          O importador possui verificação inteligente anti-erros, checando campos vazios, dados corrompidos ou inconsistências antes de gravar.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => handleDownloadBackup('json')}>
            <Download size={15} /> Exportar Backup JSON Completo
          </Button>

          <Button variant="outline" onClick={() => handleDownloadBackup('csv')}>
            <FileSpreadsheet size={15} /> Exportar Folha CSV (Excel)
          </Button>

          {isAdmin && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,.csv"
                onChange={handleImportFile}
                className="hidden"
              />
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} /> Upload Inteligente (JSON / CSV)
              </Button>

              {!resetConfirm ? (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition cursor-pointer"
                >
                  <RotateCcw size={14} /> Repor Sistema com Dados de Fábrica
                </button>
              ) : (
                <div className="flex items-center gap-2 p-1.5 bg-rose-50 border border-rose-300 rounded-lg text-xs">
                  <span className="font-bold text-rose-700">Tem a certeza absoluta?</span>
                  <button
                    type="button"
                    onClick={() => {
                      resetDatabaseToDefaults();
                      window.location.reload();
                    }}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded font-bold hover:bg-rose-700 text-xs cursor-pointer"
                  >
                    Sim, Repor Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirm(false)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {importStatus === 'sucesso' && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle2 size={18} className="text-emerald-600" /> {importResult?.message || 'Dados importados e verificados com sucesso!'}
            </div>
            <p className="text-slate-600 text-[11px]">
              O sistema foi sincronizado automaticamente com os novos dados. A actualizar a página...
            </p>
          </div>
        )}

        {importStatus === 'erro' && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle size={18} className="text-rose-600" /> {importResult?.message || 'Falha na validação do ficheiro.'}
            </div>
            {Array.isArray(importResult?.errors) && importResult.errors.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px] bg-white/70 p-2 rounded border border-rose-200">
                <b className="text-rose-800 block text-[10px] uppercase font-sans">Avisos do Validador Inteligente:</b>
                {importResult.errors.map((err: string, i: number) => (
                  <p key={i} className="text-rose-700">• {err}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
