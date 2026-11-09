/**
 * OSDEL TECNOLOGIA - VISTA DETALHADA DO HISTÓRICO DE FECHOS MENSAIS
 * Auditoria completa, Balanços Analíticos, Conciliação e Emissão de Termos Oficiais
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Landmark,
  Layers,
  MapPin,
  Phone,
  PieChart,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
  Zap,
  Award,
  Sparkles,
  Building2,
  Check,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { triggerPrint, getPrintUrl } from '@/lib/printer';
import {
  type MonthlyClosure,
  getMonthlyClosures,
  validateMonthlyClosure,
  generateMonthlyClosure,
  exportMonthlyClosuresCsv,
} from '@/lib/monthly-closures';
import { getCompanyLogo } from '@/lib/company-logo';
import { Button, Field, Input, Select, Textarea, Badge, Modal, kz, date } from '@/components/shared-ui';

interface MonthlyClosuresViewProps {
  isAdmin: boolean;
  currentUserName: string;
}

export function MonthlyClosuresView({ isAdmin, currentUserName }: MonthlyClosuresViewProps) {
  const [closures, setClosures] = useState<MonthlyClosure[]>(() => getMonthlyClosures());
  const [selectedYear, setSelectedYear] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [modalDetailClosure, setModalDetailClosure] = useState<MonthlyClosure | null>(null);
  const [modalPrintTerm, setModalPrintTerm] = useState<MonthlyClosure | null>(null);
  const [modalNewClosure, setModalNewClosure] = useState(false);
  const [modalValidate, setModalValidate] = useState<MonthlyClosure | null>(null);

  // Detail Modal Tab
  const [detailTab, setDetailTab] = useState<'resumo' | 'receitas' | 'meios' | 'despesas' | 'clientes' | 'auditoria'>('resumo');

  // New Closure Form
  const now = new Date();
  const [newForm, setNewForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    notes: '',
  });

  // Validation Form
  const [validationNotes, setValidationNotes] = useState('');

  // Refresh listener
  useEffect(() => {
    const handleUpdate = () => setClosures(getMonthlyClosures());
    window.addEventListener('osdel-monthly-closures-updated', handleUpdate);
    return () => window.removeEventListener('osdel-monthly-closures-updated', handleUpdate);
  }, []);

  // Filter closures
  const filteredClosures = useMemo(() => {
    return closures.filter((c) => {
      const matchYear = selectedYear === 'todos' || String(c.year) === selectedYear;
      const matchStatus = selectedStatus === 'todos' || c.status === selectedStatus;
      const matchSearch =
        searchTerm.trim() === '' ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.monthName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.validatedBy || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchYear && matchStatus && matchSearch;
    });
  }, [closures, selectedYear, selectedStatus, searchTerm]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalCollected = filteredClosures.reduce((acc, c) => acc + c.financials.revenueCollected, 0);
    const totalInvoiced = filteredClosures.reduce((acc, c) => acc + c.financials.invoicedTotal, 0);
    const totalCosts = filteredClosures.reduce((acc, c) => acc + c.financials.totalCosts, 0);
    const totalNetProfit = filteredClosures.reduce((acc, c) => acc + c.financials.netResult, 0);
    const avgCollectionRate =
      filteredClosures.length > 0
        ? filteredClosures.reduce((acc, c) => acc + c.financials.collectionRate, 0) / filteredClosures.length
        : 0;
    const avgMargin =
      filteredClosures.length > 0
        ? filteredClosures.reduce((acc, c) => acc + c.financials.profitMargin, 0) / filteredClosures.length
        : 0;

    return {
      totalCollected,
      totalInvoiced,
      totalCosts,
      totalNetProfit,
      avgCollectionRate,
      avgMargin,
      count: filteredClosures.length,
    };
  }, [filteredClosures]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const csvContent = exportMonthlyClosuresCsv();
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `OSDEL_Historico_Fechos_Mensais_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Validate
  const handleConfirmValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalValidate) return;
    validateMonthlyClosure(modalValidate.id, currentUserName, validationNotes);
    setClosures(getMonthlyClosures());
    setModalValidate(null);
    setValidationNotes('');
  };

  // Handle Create Closure
  const handleCreateClosure = (e: React.FormEvent) => {
    e.preventDefault();
    const created = generateMonthlyClosure({
      year: Number(newForm.year),
      month: Number(newForm.month),
      adminName: currentUserName,
      notes: newForm.notes,
    });
    setClosures(getMonthlyClosures());
    setModalNewClosure(false);
    setModalDetailClosure(created);
  };

  const getStatusBadge = (status: MonthlyClosure['status']) => {
    switch (status) {
      case 'homologado':
        return <Badge tone="good"><Check size={12} className="inline mr-1" /> Homologado</Badge>;
      case 'auditado':
        return <Badge tone="good"><ShieldCheck size={12} className="inline mr-1" /> Auditado</Badge>;
      case 'fechado':
        return <Badge tone="warn"><LockIcon size={12} className="inline mr-1" /> Fechado</Badge>;
      case 'em_consolidacao':
        return <Badge tone="warn"><Clock size={12} className="inline mr-1" /> Em Consolidação</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 rounded-2xl text-white shadow-lg border border-slate-700">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Contabilidade & Auditoria Oficial
            </span>
            <span className="text-xs text-slate-300">OSDEL Tecnologia</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
            Histórico Consolidado de Fechos Mensais
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
            Consolidação financeira mensal, apuração de receitas por serviço (Fibra e TV), meios de pagamento, custos operacionais, folha salarial com dedução de adiantamentos e termos oficiais homologados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs"
          >
            <FileSpreadsheet size={15} /> Exportar Relatório CSV
          </Button>
          {isAdmin && (
            <Button
              variant="primary"
              onClick={() => setModalNewClosure(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              <Sparkles size={15} /> Consolidar Fecho Mensal
            </Button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="surface p-4 rounded-xl border border-[hsl(var(--border))] space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
            <span>Receita Cobrada ({stats.count} Meses)</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-extrabold text-emerald-700">
            {kz(stats.totalCollected)}
          </div>
          <p className="text-[11px] text-slate-400">
            De {kz(stats.totalInvoiced)} faturados
          </p>
        </div>

        <div className="surface p-4 rounded-xl border border-[hsl(var(--border))] space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
            <span>Custos & Folha Total</span>
            <TrendingDown size={16} className="text-red-500" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-extrabold text-slate-800">
            {kz(stats.totalCosts)}
          </div>
          <p className="text-[11px] text-slate-400">
            Despesas operacionais e salários
          </p>
        </div>

        <div className="surface p-4 rounded-xl border border-[hsl(var(--border))] space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
            <span>Resultado Líquido Acumulado</span>
            <TrendingUp size={16} className="text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-extrabold text-blue-700">
            {kz(stats.totalNetProfit)}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold">
            Margem líquida média: {stats.avgMargin.toFixed(1)}%
          </p>
        </div>

        <div className="surface p-4 rounded-xl border border-[hsl(var(--border))] space-y-1">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
            <span>Eficiência de Cobrança</span>
            <CheckCircle2 size={16} className="text-indigo-600" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-extrabold text-indigo-700">
            {stats.avgCollectionRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">
            Taxa média de conversão mensal
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface p-4 rounded-xl border border-[hsl(var(--border))] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por mês, código (ex: FM-2026-08) ou homologador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={14} />
            <span className="font-semibold">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
            >
              <option value="todos">Todos os Anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-semibold">Estado:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
            >
              <option value="todos">Todos os Estados</option>
              <option value="homologado">Homologados</option>
              <option value="auditado">Auditados</option>
              <option value="em_consolidacao">Em Consolidação</option>
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Closures List / Table */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Todos os Fechos Mensais Arquivados ({filteredClosures.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Ordenação cronológica decrescente
          </span>
        </div>

        {filteredClosures.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Mês / Exercício</th>
                  <th className="py-3 px-4">Código Termo</th>
                  <th className="py-3 px-4 text-right">Facturado</th>
                  <th className="py-3 px-4 text-right">Receita Cobrada</th>
                  <th className="py-3 px-4 text-right">Custos & Folha</th>
                  <th className="py-3 px-4 text-right">Resultado Líquido</th>
                  <th className="py-3 px-4 text-center">Taxa Cobrança</th>
                  <th className="py-3 px-4 text-center">Clientes Activos</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredClosures.map((closure) => (
                  <tr
                    key={closure.id}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      setDetailTab('resumo');
                      setModalDetailClosure(closure);
                    }}
                  >
                    {/* Month Name & Year */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-indigo-800 text-xs font-mono">
                          {String(closure.month).padStart(2, '0')}
                        </div>
                        <div>
                          <b className="text-sm text-slate-900 font-bold block">
                            {closure.monthName}
                          </b>
                          <span className="text-[11px] text-slate-400">
                            {date(closure.periodStart)} até {date(closure.periodEnd)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Closure Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 text-[11px]">
                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-300">
                        {closure.code}
                      </span>
                    </td>

                    {/* Invoiced */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {kz(closure.financials.invoicedTotal)}
                    </td>

                    {/* Revenue Collected */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {kz(closure.financials.revenueCollected)}
                      {closure.financials.revenueGrowthRate !== 0 && (
                        <span className={`block text-[10px] font-sans ${closure.financials.revenueGrowthRate > 0 ? 'text-emerald-600 font-bold' : 'text-red-500'}`}>
                          {closure.financials.revenueGrowthRate > 0 ? '↑ +' : '↓ '}{closure.financials.revenueGrowthRate}% MoM
                        </span>
                      )}
                    </td>

                    {/* Total Costs */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {kz(closure.financials.totalCosts)}
                      <span className="block text-[10px] text-slate-400">
                        Op: {kz(closure.financials.operatingExpenses)} · Sal: {kz(closure.financials.payrollNetPaid)}
                      </span>
                    </td>

                    {/* Net Result */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-blue-700">
                      {kz(closure.financials.netResult)}
                      <span className="block text-[10px] text-emerald-600 font-bold">
                        Margem: {closure.financials.profitMargin.toFixed(1)}%
                      </span>
                    </td>

                    {/* Collection Efficiency */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono font-bold text-slate-800">
                          {closure.financials.collectionRate.toFixed(1)}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, closure.financials.collectionRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Active Clients */}
                    <td className="py-3.5 px-4 text-center">
                      <b className="font-mono text-slate-800">{closure.clientMetrics.activeClientsEnd}</b>
                      <span className="block text-[10px] text-emerald-600 font-semibold">
                        +{closure.clientMetrics.newActivations} / -{closure.clientMetrics.churnCancellations}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(closure.status)}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailTab('resumo');
                            setModalDetailClosure(closure);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-700 transition shadow-sm"
                          title="Ver Auditoria & Detalhes Completos"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalPrintTerm(closure)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-700 transition shadow-sm"
                          title="Imprimir Termo Oficial de Fecho Mensal"
                        >
                          <Printer size={15} />
                        </button>
                        {isAdmin && closure.status !== 'homologado' && (
                          <button
                            type="button"
                            onClick={() => setModalValidate(closure)}
                            className="p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition shadow-sm font-bold text-[10px]"
                            title="Homologar Fecho Mensal Oficialmente"
                          >
                            <FileCheck size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History size={32} className="mx-auto text-slate-300" />
            <b className="block text-slate-700 text-sm">Nenhum fecho mensal encontrado para os filtros selecionados.</b>
            <p className="text-xs">Tente ajustar o ano, estado ou termo de pesquisa.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: DETALHES COMPLETOS & AUDITORIA ANALÍTICA DO FECHO MENSAL           */}
      {/* ========================================================================= */}
      {modalDetailClosure && (
        <Modal
          title={`Auditoria do Fecho Mensal: ${modalDetailClosure.monthName} (${modalDetailClosure.code})`}
          eyebrow="OSDEL Tecnologia · Encerramento Oficial de Contas"
          onClose={() => setModalDetailClosure(null)}
        >
          <div className="space-y-5">
            {/* Header summary banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-wrap justify-between items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                    {modalDetailClosure.code}
                  </span>
                  <span className="text-xs text-slate-300">
                    Exercício de {modalDetailClosure.year}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {modalDetailClosure.monthName}
                </h3>
                <p className="text-xs text-slate-300">
                  Período: {date(modalDetailClosure.periodStart)} a {date(modalDetailClosure.periodEnd)} · Fechado por {modalDetailClosure.closedBy}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Resultado Líquido do Mês</span>
                <b className="text-xl font-extrabold font-mono text-emerald-400">
                  {kz(modalDetailClosure.financials.netResult)}
                </b>
                <span className="text-xs text-emerald-300 block font-semibold">
                  Margem: {modalDetailClosure.financials.profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Modal Detail Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
              {[
                { id: 'resumo', label: 'Balanço Geral', icon: Layers },
                { id: 'receitas', label: 'Receitas por Serviço', icon: DollarSign },
                { id: 'meios', label: 'Canais de Pagamento', icon: CreditCard },
                { id: 'despesas', label: 'Custos & Despesas', icon: TrendingDown },
                { id: 'clientes', label: 'Clientes & Operações', icon: Users },
                { id: 'auditoria', label: 'Termo & Auditoria', icon: ShieldCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = detailTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT 1: RESUMO DO BALANÇO */}
            {detailTab === 'resumo' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                    <span className="text-slate-500 block font-medium">Facturação Emitida</span>
                    <b className="text-sm font-mono font-bold text-slate-900">{kz(modalDetailClosure.financials.invoicedTotal)}</b>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <span className="text-emerald-700 block font-medium">Receita Cobrada (Caixa)</span>
                    <b className="text-sm font-mono font-extrabold text-emerald-800">{kz(modalDetailClosure.financials.revenueCollected)}</b>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                    <span className="text-red-700 block font-medium">Custos Operacionais & Folha</span>
                    <b className="text-sm font-mono font-bold text-red-800">{kz(modalDetailClosure.financials.totalCosts)}</b>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <span className="text-blue-700 block font-medium">Margem Líquida</span>
                    <b className="text-sm font-mono font-extrabold text-blue-800">{modalDetailClosure.financials.profitMargin.toFixed(1)}%</b>
                  </div>
                </div>

                {/* Analytical breakdown cards */}
                <div className="p-4 border rounded-xl bg-white space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <PieChart size={14} className="text-blue-600" />
                    Demonstração Analítica do Resultado Mensal
                  </h4>

                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="flex justify-between py-2 items-center">
                      <span className="font-bold text-slate-800">(+) Receita Bruta Total Cobrada:</span>
                      <b className="font-mono text-emerald-700 font-bold">{kz(modalDetailClosure.financials.revenueCollected)}</b>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-600 pl-4">
                      <span>• Internet Fibra Óptica:</span>
                      <span className="font-mono">{kz(modalDetailClosure.revenueBreakdown.fiberInternet.amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-600 pl-4">
                      <span>• TV Comunitária:</span>
                      <span className="font-mono">{kz(modalDetailClosure.revenueBreakdown.communityTv.amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-600 pl-4">
                      <span>• Planos Combo TV + Internet:</span>
                      <span className="font-mono">{kz(modalDetailClosure.revenueBreakdown.comboTvInternet.amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-600 pl-4">
                      <span>• Instalações, Reativações & Equipamentos:</span>
                      <span className="font-mono">
                        {kz(
                          modalDetailClosure.revenueBreakdown.installations.amount +
                          modalDetailClosure.revenueBreakdown.reactivations.amount +
                          modalDetailClosure.revenueBreakdown.equipmentSales.amount
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 items-center text-red-700 font-bold pt-3">
                      <span>(-) Custos Operacionais Directos (OPEX):</span>
                      <b className="font-mono text-red-700">-{kz(modalDetailClosure.financials.operatingExpenses)}</b>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-600 pl-4">
                      <span>• Trânsito IP & Link Upstream (Angola Cables):</span>
                      <span className="font-mono">-{kz(modalDetailClosure.expensesBreakdown.upstreamBandwidth.amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-600 pl-4">
                      <span>• Combustível & Manutenção de Frota:</span>
                      <span className="font-mono">-{kz(modalDetailClosure.expensesBreakdown.fleetAndFuel.amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-600 pl-4">
                      <span>• Materiais de Rede, Fibra & Caixas CTO:</span>
                      <span className="font-mono">-{kz(modalDetailClosure.expensesBreakdown.networkMaterials.amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-600 pl-4">
                      <span>• Renda, Energia ENDE & Serviços:</span>
                      <span className="font-mono">-{kz(modalDetailClosure.expensesBreakdown.rentAndUtilities.amount)}</span>
                    </div>

                    <div className="flex justify-between py-2 items-center text-red-700 font-bold pt-3">
                      <span>(-) Folha Salarial da Equipa (Valor Líquido Pago):</span>
                      <b className="font-mono text-red-700">-{kz(modalDetailClosure.financials.payrollNetPaid)}</b>
                    </div>
                    <div className="flex justify-between py-2 items-center text-slate-500 pl-4 text-[11px]">
                      <span>(Salários Brutos: {kz(modalDetailClosure.financials.payrollGross)} com retenção de {kz(modalDetailClosure.financials.payrollLoanDeductions)} em dívidas salariais)</span>
                      <span className="text-emerald-700 font-bold font-mono">Dívidas recuperadas: +{kz(modalDetailClosure.financials.payrollLoanDeductions)}</span>
                    </div>

                    <div className="flex justify-between py-3 items-center text-sm font-extrabold bg-blue-50/70 p-2 rounded-lg mt-2">
                      <span className="text-blue-900">(=) RESULTADO OPERACIONAL LÍQUIDO DO MÊS:</span>
                      <b className="font-mono text-blue-900 text-base">{kz(modalDetailClosure.financials.netResult)}</b>
                    </div>
                  </div>
                </div>

                {/* Conciliação de Tesouraria */}
                <div className="p-4 border rounded-xl bg-slate-50 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Landmark size={15} className="text-indigo-600" />
                    Conciliação de Tesouraria & Saldos em Cofre
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 bg-white rounded border">
                      <span className="text-slate-400 block text-[10px]">Banco BAI</span>
                      <b className="font-mono text-slate-800">{kz(modalDetailClosure.bankReconciliation.baiBalance)}</b>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <span className="text-slate-400 block text-[10px]">Banco BFA</span>
                      <b className="font-mono text-slate-800">{kz(modalDetailClosure.bankReconciliation.bfaBalance)}</b>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <span className="text-slate-400 block text-[10px]">Cofre Caixa Balcão</span>
                      <b className="font-mono text-slate-800">{kz(modalDetailClosure.bankReconciliation.cashInSafe)}</b>
                    </div>
                    <div className="p-2 bg-indigo-50 border border-indigo-200 rounded">
                      <span className="text-indigo-600 block text-[10px] font-bold">Total Tesouraria</span>
                      <b className="font-mono text-indigo-900 font-bold">{kz(modalDetailClosure.bankReconciliation.totalTreasuryBalance)}</b>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic mt-1">
                    {modalDetailClosure.bankReconciliation.notes}
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: RECEITAS POR SERVIÇO */}
            {detailTab === 'receitas' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
                  Discriminação completa das receitas operacionais auferidas pela OSDEL Tecnologia em <b>{modalDetailClosure.monthName}</b>, agrupadas por categoria de serviço prestado.
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">Categoria de Serviço</th>
                        <th className="py-2.5 px-3">Descrição Operacional</th>
                        <th className="py-2.5 px-3 text-center">Transacções</th>
                        <th className="py-2.5 px-3 text-right">Volume (Kz)</th>
                        <th className="py-2.5 px-3 text-right">% do Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {[
                        {
                          name: 'Internet Fibra Óptica',
                          item: modalDetailClosure.revenueBreakdown.fiberInternet,
                        },
                        {
                          name: 'TV Comunitária',
                          item: modalDetailClosure.revenueBreakdown.communityTv,
                        },
                        {
                          name: 'Planos Combo (TV + Fibra)',
                          item: modalDetailClosure.revenueBreakdown.comboTvInternet,
                        },
                        {
                          name: 'Instalações & Novas Ativações',
                          item: modalDetailClosure.revenueBreakdown.installations,
                        },
                        {
                          name: 'Reativações de Clientes',
                          item: modalDetailClosure.revenueBreakdown.reactivations,
                        },
                        {
                          name: 'Vendas de Equipamentos (ONTs/Boxes)',
                          item: modalDetailClosure.revenueBreakdown.equipmentSales,
                        },
                        {
                          name: 'Encargos, Juros & Mora',
                          item: modalDetailClosure.revenueBreakdown.penaltiesAndFees,
                        },
                      ].map((row, idx) => {
                        const pct = (row.item.amount / modalDetailClosure.financials.revenueCollected) * 100;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{row.name}</td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">{row.item.description}</td>
                            <td className="py-2.5 px-3 text-center font-mono">{row.item.count}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{kz(row.item.amount)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">{pct.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={3} className="py-3 px-3 text-slate-900 font-extrabold">TOTAL DE RECEITAS COBRADAS NO MÊS</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 font-extrabold text-sm">{kz(modalDetailClosure.financials.revenueCollected)}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 font-extrabold">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: MEIOS DE PAGAMENTO */}
            {detailTab === 'meios' && (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                  Conciliação por canal financeiro e porta de entrada dos fundos em <b>{modalDetailClosure.monthName}</b>.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Multicaixa Express (MCX)', item: modalDetailClosure.paymentMethodsBreakdown.multicaixaExpress, color: 'border-emerald-300 bg-emerald-50/50' },
                    { label: 'Transferência Bancária BAI', item: modalDetailClosure.paymentMethodsBreakdown.bankTransferBai, color: 'border-blue-300 bg-blue-50/50' },
                    { label: 'Transferência Bancária BFA', item: modalDetailClosure.paymentMethodsBreakdown.bankTransferBfa, color: 'border-amber-300 bg-amber-50/50' },
                    { label: 'TPA Multicaixa Físico Balcão', item: modalDetailClosure.paymentMethodsBreakdown.tpaMulticaixa, color: 'border-purple-300 bg-purple-50/50' },
                    { label: 'Numerário / Caixa Tesouraria', item: modalDetailClosure.paymentMethodsBreakdown.cashOffice, color: 'border-slate-300 bg-slate-50' },
                    { label: 'Depósitos Bancários Directos', item: modalDetailClosure.paymentMethodsBreakdown.bankDeposit, color: 'border-cyan-300 bg-cyan-50/50' },
                  ].map((m, idx) => {
                    const pct = (m.item.amount / modalDetailClosure.financials.revenueCollected) * 100;
                    return (
                      <div key={idx} className={`p-3.5 rounded-xl border ${m.color} space-y-1.5`}>
                        <div className="flex justify-between items-center">
                          <b className="text-xs text-slate-800 font-bold">{m.label}</b>
                          <span className="text-[11px] font-mono text-slate-500">{m.item.count} pagamentos</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-base font-mono font-extrabold text-slate-900">{kz(m.item.amount)}</span>
                          <span className="text-xs font-bold text-slate-600">{pct.toFixed(1)}% do total</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-slate-800 h-full rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: CUSTOS & DESPESAS */}
            {detailTab === 'despesas' && (
              <div className="space-y-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 leading-relaxed">
                  Discriminação de todas as saídas e custos operacionais registados no mês de <b>{modalDetailClosure.monthName}</b>.
                </div>

                <div className="space-y-2">
                  {[
                    { title: 'Conectividade & Trânsito IP (Angola Cables)', item: modalDetailClosure.expensesBreakdown.upstreamBandwidth, cat: 'Backhaul e Link Internacional' },
                    { title: 'Combustível & Manutenção de Frota', item: modalDetailClosure.expensesBreakdown.fleetAndFuel, cat: 'Piquete Técnico e Logística' },
                    { title: 'Materiais de Rede, Drop & Caixas CTO', item: modalDetailClosure.expensesBreakdown.networkMaterials, cat: 'Infraestrutura e Fusão Óptica' },
                    { title: 'Rendas, Energia ENDE & Água EPAL', item: modalDetailClosure.expensesBreakdown.rentAndUtilities, cat: 'Custos Prediais Fixos' },
                    { title: 'Licenças, Software & SMS Gateway', item: modalDetailClosure.expensesBreakdown.commsAndSoftware, cat: 'Sistemas e Notificações' },
                    { title: 'Despesas Gerais & Material de Escritório', item: modalDetailClosure.expensesBreakdown.officeAndMisc, cat: 'Apoio Administrativo' },
                  ].map((exp, idx) => (
                    <div key={idx} className="p-3 bg-white border rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <b className="text-slate-800 block text-xs">{exp.title}</b>
                        <span className="text-slate-500 text-[11px] block">{exp.item.notes}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{exp.cat}</span>
                      </div>
                      <b className="font-mono text-sm font-bold text-red-700 whitespace-nowrap">
                        -{kz(exp.item.amount)}
                      </b>
                    </div>
                  ))}
                  <div className="p-3 bg-red-100/60 border border-red-300 rounded-xl flex justify-between items-center text-xs font-bold text-red-900">
                    <span>TOTAL DE CUSTOS OPERACIONAIS DIRECTOS:</span>
                    <span className="font-mono text-sm font-extrabold">-{kz(modalDetailClosure.financials.operatingExpenses)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 5: CLIENTES & OPERAÇÕES */}
            {detailTab === 'clientes' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border rounded-xl">
                    <span className="text-slate-500 block text-[11px]">Clientes Início do Mês</span>
                    <b className="text-base font-mono text-slate-800">{modalDetailClosure.clientMetrics.activeClientsStart}</b>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-emerald-700 block text-[11px]">Novas Instalações</span>
                    <b className="text-base font-mono text-emerald-800">+{modalDetailClosure.clientMetrics.newActivations}</b>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <span className="text-red-700 block text-[11px]">Cancelamentos / Churn</span>
                    <b className="text-base font-mono text-red-800">-{modalDetailClosure.clientMetrics.churnCancellations}</b>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-blue-700 block text-[11px]">Clientes Activos no Fecho</span>
                    <b className="text-base font-mono text-blue-900">{modalDetailClosure.clientMetrics.activeClientsEnd}</b>
                  </div>
                </div>

                <div className="p-4 border rounded-xl bg-white space-y-3 text-xs">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Wrench size={15} className="text-indigo-600" />
                    Desempenho Técnico & Manutenção de Piquete
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg border">
                      <span className="text-slate-500 block text-[11px]">Ordens de Serviço Fechadas</span>
                      <b className="font-mono text-slate-800">{modalDetailClosure.technicalMetrics.serviceOrdersResolved} / {modalDetailClosure.technicalMetrics.serviceOrdersTotal}</b>
                      <span className="text-[10px] text-emerald-600 block">SLA: {modalDetailClosure.technicalMetrics.slaAdherenceRate}%</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border">
                      <span className="text-slate-500 block text-[11px]">Tempo Médio Resolução (MTTR)</span>
                      <b className="font-mono text-slate-800">{modalDetailClosure.technicalMetrics.mttrHours} horas</b>
                      <span className="text-[10px] text-slate-400 block">Por avaria técnica</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border">
                      <span className="text-slate-500 block text-[11px]">Satisfação dos Clientes</span>
                      <b className="font-mono text-slate-800">{modalDetailClosure.technicalMetrics.customerSatisfactionScore}%</b>
                      <span className="text-[10px] text-emerald-600 block">Índice positivo</span>
                    </div>
                  </div>
                </div>

                {/* Dívidas e Adiantamentos Salariais do Mês */}
                <div className="p-4 border rounded-xl bg-slate-50 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Award size={15} className="text-amber-600" />
                    Gestão de Adiantamentos Salariais & Dívidas da Equipa no Mês
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-white rounded border">
                      <span className="text-slate-400 block text-[10px]">Concedidos no Mês</span>
                      <b className="font-mono text-slate-800">{kz(modalDetailClosure.debtMetrics.advancesIssuedThisMonth)}</b>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <span className="text-slate-400 block text-[10px]">Recuperados na Folha</span>
                      <b className="font-mono text-emerald-700">{kz(modalDetailClosure.debtMetrics.advancesRecoveredThisMonth)}</b>
                    </div>
                    <div className="p-2 bg-white rounded border">
                      <span className="text-slate-400 block text-[10px]">Dívida Transita Próx. Mês</span>
                      <b className="font-mono text-red-700">{kz(modalDetailClosure.debtMetrics.outstandingStaffDebtEndOfMonth)}</b>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 6: TERMO OFICIAL & AUDITORIA */}
            {detailTab === 'auditoria' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <b className="text-slate-900 text-sm">{modalDetailClosure.auditCertificate.companyName}</b>
                      <p className="text-[11px] text-slate-500">NIF: {modalDetailClosure.auditCertificate.nif} · {modalDetailClosure.auditCertificate.headquarters}</p>
                    </div>
                    <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white border rounded text-slate-700">
                      {modalDetailClosure.auditCertificate.certificateNumber}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Auditor Responsável</span>
                      <b className="text-slate-800">{modalDetailClosure.auditCertificate.auditedBy}</b>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Homologação da Direcção</span>
                      <b className="text-slate-800">{modalDetailClosure.auditCertificate.directorApproval}</b>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Certificação</span>
                      <p className="text-slate-600">{modalDetailClosure.auditCertificate.accountingCertification}</p>
                    </div>
                    {modalDetailClosure.validationNotes && (
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-blue-800 font-bold block text-[11px]">Parecer & Notas da Gerência:</span>
                        <p className="text-blue-900 text-[11px] mt-0.5">{modalDetailClosure.validationNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="primary"
                    onClick={() => setModalPrintTerm(modalDetailClosure)}
                    className="text-xs"
                  >
                    <Printer size={15} /> Visualizar & Imprimir Termo Oficial Formatado
                  </Button>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-3 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setModalPrintTerm(modalDetailClosure)}
                  className="text-xs"
                >
                  <Printer size={15} /> Imprimir Termo
                </Button>
                {isAdmin && modalDetailClosure.status !== 'homologado' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setModalValidate(modalDetailClosure);
                      setModalDetailClosure(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                  >
                    <CheckCircle2 size={15} /> Homologar Fecho
                  </Button>
                )}
              </div>

              <Button variant="outline" onClick={() => setModalDetailClosure(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPRESSÃO DO TERMO OFICIAL DE ENCERRAMENTO MENSAL (A4 TIMBRADO)    */}
      {/* ========================================================================= */}
      {modalPrintTerm && (
        <Modal
          title={`Termo Oficial de Encerramento Mensal: ${modalPrintTerm.code}`}
          eyebrow="Documento Oficial de Prestação de Contas"
          onClose={() => setModalPrintTerm(null)}
          printable={true}
        >
          <div className="space-y-6">
            {/* Printable A4 Container */}
            <div
              id="printable-monthly-closure"
              className="p-6 sm:p-8 bg-white text-slate-900 border border-slate-300 rounded-xl shadow-inner font-sans space-y-5 text-xs print:border-none print:shadow-none print:p-0"
            >
              {/* Institutional Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={getCompanyLogo()}
                    alt="OSDEL"
                    className="w-14 h-14 object-contain border p-1 rounded-lg"
                  />
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                      OSDEL TECNOLOGIA, LDA.
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      Operadora de Telecomunicações · TV Comunitária & Internet Fibra Óptica
                    </p>
                    <p className="text-[10px] text-slate-500">
                      NIF: 5417289102 · Luanda, República de Angola · Contacto: +244 923 000 000
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 bg-slate-100 border border-slate-300 rounded block">
                    {modalPrintTerm.code}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Certificado nº {modalPrintTerm.auditCertificate.certificateNumber}
                  </span>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center py-2 bg-slate-50 border-y border-slate-200">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                  TERMO OFICIAL DE FECHO & ENCERRAMENTO MENSAL DE CONTAS
                </h3>
                <p className="text-xs text-slate-600 font-semibold">
                  Mês de Referência: <span className="underline">{modalPrintTerm.monthName}</span> ({date(modalPrintTerm.periodStart)} a {date(modalPrintTerm.periodEnd)})
                </p>
              </div>

              {/* Table of Consolidated Financials */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 border-b pb-1">
                  1. Quadro Consolidado do Balanço Financeiro
                </h4>
                <table className="w-full text-xs text-left border border-slate-300">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-50">
                      <td className="p-2 font-bold text-slate-800">Facturação Bruta Emitida no Mês</td>
                      <td className="p-2 text-right font-mono font-bold">{kz(modalPrintTerm.financials.invoicedTotal)}</td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      <td className="p-2 font-extrabold text-emerald-900">(+) RECEITA OPERACIONAL COBRADA (ENTRADAS EFECTIVAS)</td>
                      <td className="p-2 text-right font-mono font-extrabold text-emerald-800">{kz(modalPrintTerm.financials.revenueCollected)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-4 text-slate-600">• Cobrança Internet Fibra Óptica</td>
                      <td className="p-2 text-right font-mono text-slate-700">{kz(modalPrintTerm.revenueBreakdown.fiberInternet.amount)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-4 text-slate-600">• Cobrança TV Comunitária</td>
                      <td className="p-2 text-right font-mono text-slate-700">{kz(modalPrintTerm.revenueBreakdown.communityTv.amount)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-4 text-slate-600">• Planos Combo & Serviços Adicionais</td>
                      <td className="p-2 text-right font-mono text-slate-700">
                        {kz(
                          modalPrintTerm.revenueBreakdown.comboTvInternet.amount +
                          modalPrintTerm.revenueBreakdown.installations.amount +
                          modalPrintTerm.revenueBreakdown.reactivations.amount +
                          modalPrintTerm.revenueBreakdown.equipmentSales.amount
                        )}
                      </td>
                    </tr>
                    <tr className="bg-red-50/50">
                      <td className="p-2 font-bold text-red-900">(-) CUSTOS OPERACIONAIS DIRECTOS (OPEX)</td>
                      <td className="p-2 text-right font-mono font-bold text-red-800">-{kz(modalPrintTerm.financials.operatingExpenses)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-4 text-slate-600">• Trânsito IP, Link Internacional & Conectividade</td>
                      <td className="p-2 text-right font-mono text-slate-700">-{kz(modalPrintTerm.expensesBreakdown.upstreamBandwidth.amount)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-4 text-slate-600">• Combustível, Frotas & Materiais de Fibra</td>
                      <td className="p-2 text-right font-mono text-slate-700">
                        -{kz(modalPrintTerm.expensesBreakdown.fleetAndFuel.amount + modalPrintTerm.expensesBreakdown.networkMaterials.amount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-4 text-slate-600">• Rendas, Energia ENDE & Licenças</td>
                      <td className="p-2 text-right font-mono text-slate-700">
                        -{kz(modalPrintTerm.expensesBreakdown.rentAndUtilities.amount + modalPrintTerm.expensesBreakdown.commsAndSoftware.amount + modalPrintTerm.expensesBreakdown.officeAndMisc.amount)}
                      </td>
                    </tr>
                    <tr className="bg-amber-50/50">
                      <td className="p-2 font-bold text-amber-900">(-) FOLHA SALARIAL LÍQUIDA TRANSFERIDA À EQUIPA</td>
                      <td className="p-2 text-right font-mono font-bold text-amber-900">-{kz(modalPrintTerm.financials.payrollNetPaid)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 pl-4 text-slate-500 text-[11px] italic">
                        (Salário Bruto {kz(modalPrintTerm.financials.payrollGross)} menos {kz(modalPrintTerm.financials.payrollLoanDeductions)} de adiantamentos abatidos)
                      </td>
                      <td className="p-2 text-right font-mono text-emerald-700 text-[11px] font-bold">
                        +{kz(modalPrintTerm.financials.payrollLoanDeductions)} retidos
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white text-sm">
                      <td className="p-2.5 font-extrabold">(=) RESULTADO LÍQUIDO DO EXERCÍCIO MENSAL</td>
                      <td className="p-2.5 text-right font-mono font-extrabold text-emerald-400">
                        {kz(modalPrintTerm.financials.netResult)} ({modalPrintTerm.financials.profitMargin.toFixed(1)}%)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Operational & Client KPIs summary */}
              <div className="grid grid-cols-3 gap-3 border p-3 rounded-lg bg-slate-50 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Assinantes no Fecho:</span>
                  <b className="font-mono text-slate-900 text-xs">{modalPrintTerm.clientMetrics.activeClientsEnd} Activos</b>
                  <span className="text-[10px] text-emerald-700 block">+{modalPrintTerm.clientMetrics.newActivations} novas adesões</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Eficiência de Cobrança:</span>
                  <b className="font-mono text-slate-900 text-xs">{modalPrintTerm.financials.collectionRate.toFixed(1)}%</b>
                  <span className="text-[10px] text-slate-600 block">ARPU: {kz(modalPrintTerm.clientMetrics.arpu)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ordens de Serviço:</span>
                  <b className="font-mono text-slate-900 text-xs">{modalPrintTerm.technicalMetrics.serviceOrdersResolved} Executadas</b>
                  <span className="text-[10px] text-slate-600 block">SLA: {modalPrintTerm.technicalMetrics.slaAdherenceRate}%</span>
                </div>
              </div>

              {/* Notes & Certification */}
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1 text-[11px]">
                <b className="text-slate-800 block">Parecer da Auditoria & Observações:</b>
                <p className="text-slate-600 leading-relaxed">
                  {modalPrintTerm.validationNotes || 'Fecho mensal analisado e aprovado em conformidade com as normas contabilísticas de Angola.'}
                </p>
              </div>

              {/* Signatures & Stamps */}
              <div className="pt-6 border-t grid grid-cols-3 gap-4 text-center text-[11px]">
                <div className="space-y-1">
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-slate-400 italic">
                    (Assinatura)
                  </div>
                  <b className="text-slate-800 block">Albert (deezy)</b>
                  <span className="text-slate-500 text-[10px] block">Director Geral</span>
                </div>

                <div className="space-y-1">
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-slate-400 italic">
                    (Carimbo OCPC)
                  </div>
                  <b className="text-slate-800 block">Dr. Manuel Domingos</b>
                  <span className="text-slate-500 text-[10px] block">Contabilista Certificado OCPC</span>
                </div>

                <div className="space-y-1">
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1 text-slate-400 italic">
                    (Visto Tesouraria)
                  </div>
                  <b className="text-slate-800 block">Maria Teresa dos Santos</b>
                  <span className="text-slate-500 text-[10px] block">Responsável de Caixa</span>
                </div>
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t print:hidden">
              <a
                href={getPrintUrl('fecho-mensal', { id: modalPrintTerm.id || modalPrintTerm.code })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                title="Abre o documento numa nova aba sem qualquer restrição de iframe para impressão ou PDF"
              >
                <ExternalLink size={14} />
                <span>Abrir em Nova Aba (PDF)</span>
              </a>
              <Button
                variant="primary"
                onClick={() => {
                  triggerPrint({ elementId: 'printable-monthly-closure' });
                }}
              >
                <Printer size={16} /> Imprimir Termo
              </Button>
              <Button variant="outline" onClick={() => setModalPrintTerm(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONSOLIDAR NOVO FECHO MENSAL (ADMIN)                               */}
      {/* ========================================================================= */}
      {modalNewClosure && (
        <Modal
          title="Consolidar & Gerar Novo Fecho Mensal"
          eyebrow="Administração & Finanças OSDEL"
          onClose={() => setModalNewClosure(false)}
        >
          <form onSubmit={handleCreateClosure} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
              O assistente de consolidação calcula automaticamente todas as receitas de facturas liquidadas, despesas operacionais e folha de salários do mês especificado, gerando o termo de fecho mensal oficial.
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ano do Exercício *">
                <Select
                  value={newForm.year}
                  onChange={(e) => setNewForm({ ...newForm, year: Number(e.target.value) })}
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </Select>
              </Field>

              <Field label="Mês de Referência *">
                <Select
                  value={newForm.month}
                  onChange={(e) => setNewForm({ ...newForm, month: Number(e.target.value) })}
                >
                  <option value={1}>01 - Janeiro</option>
                  <option value={2}>02 - Fevereiro</option>
                  <option value={3}>03 - Março</option>
                  <option value={4}>04 - Abril</option>
                  <option value={5}>05 - Maio</option>
                  <option value={6}>06 - Junho</option>
                  <option value={7}>07 - Julho</option>
                  <option value={8}>08 - Agosto</option>
                  <option value={9}>09 - Setembro</option>
                  <option value={10}>10 - Outubro</option>
                  <option value={11}>11 - Novembro</option>
                  <option value={12}>12 - Dezembro</option>
                </Select>
              </Field>
            </div>

            <Field label="Observações & Parecer de Fecho">
              <Textarea
                rows={3}
                value={newForm.notes}
                onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                placeholder="Insira observações relevantes sobre o encerramento das contas deste mês..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" type="button" onClick={() => setModalNewClosure(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Sparkles size={16} /> Gerar e Consolidar Fecho
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HOMOLOGAÇÃO OFICIAL DO FECHO (ADMIN)                               */}
      {/* ========================================================================= */}
      {modalValidate && (
        <Modal
          title={`Homologação Oficial: ${modalValidate.monthName}`}
          eyebrow="Direcção Geral · Carimbo & Validação"
          onClose={() => setModalValidate(null)}
        >
          <form onSubmit={handleConfirmValidate} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
              Ao homologar o termo <b>{modalValidate.code}</b>, o documento recebe o carimbo digital da direcção geral e fica arquivado permanentemente na contabilidade da OSDEL Tecnologia.
            </div>

            <div className="p-3 bg-slate-50 border rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Mês:</span>
                <b className="text-slate-800">{modalValidate.monthName}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receita Cobrada:</span>
                <b className="font-mono text-emerald-700">{kz(modalValidate.financials.revenueCollected)}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resultado Líquido:</span>
                <b className="font-mono text-blue-800">{kz(modalValidate.financials.netResult)}</b>
              </div>
            </div>

            <Field label="Notas de Homologação / Despacho da Direcção">
              <Textarea
                rows={3}
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
                placeholder="Ex.: Homologado sem reservas. Contas auditadas e validadas."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" type="button" onClick={() => setModalValidate(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                <CheckCircle2 size={16} /> Homologar e Carimbar
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function LockIcon(props: { size?: number; className?: string }) {
  return <CheckCircle2 {...props} />;
}
