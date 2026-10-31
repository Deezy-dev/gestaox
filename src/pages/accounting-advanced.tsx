import React, { useState, useEffect, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Plus,
  Printer,
  Receipt,
  Scale,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  AlertTriangle,
  History,
  ExternalLink,
} from 'lucide-react';
import { triggerPrint, getPrintUrl } from '@/lib/printer';
import {
  getListPaymentsQueryKey,
  getListExpensesQueryKey,
  getListCashClosuresQueryKey,
  getListFinancialAccountsQueryKey,
  useListPayments,
  useListExpenses,
  useListClients,
  useGetSettings,
  useCreateExpense,
  useDeleteExpense,
  useListCashClosures,
  useCreateCashClosure,
  useValidateCashClosure,
  session,
  type CashClosure,
} from '@/lib/local-api';
import { Button, Field, Input, Select, Textarea, Badge, Status, Modal, PageHeader, kz, date, dateTime } from '@/components/shared-ui';
import { useToast } from '@/hooks/use-toast';
import { MonthlyClosuresView } from '@/components/monthly-closures-view';
import { getMonthlyClosures } from '@/lib/monthly-closures';

export function AccountingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const currentUser = session();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'fechos-mensais' | 'extrato' | 'fecho' | 'historico' | 'balancete'>('fechos-mensais');
  const [period, setPeriod] = useState<'month' | 'today' | 'all'>('month');
  const [modalExpense, setModalExpense] = useState(false);
  const [modalClosurePreview, setModalClosurePreview] = useState<CashClosure | null>(null);
  const [homologateModal, setHomologateModal] = useState<{ id: number; notes: string } | null>(null);

  const monthlyClosures = getMonthlyClosures();

  // Queries
  const paymentsQuery = useListPayments();
  const expensesQuery = useListExpenses();
  const clientsQuery = useListClients();
  const settingsQuery = useGetSettings();
  const closuresQuery = useListCashClosures();

  // Mutations
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const createCashClosure = useCreateCashClosure();
  const validateCashClosure = useValidateCashClosure();

  const payments: any[] = (Array.isArray(paymentsQuery.data) ? paymentsQuery.data : paymentsQuery.data?.items) || [];
  const expenses: any[] = (Array.isArray(expensesQuery.data) ? expensesQuery.data : expensesQuery.data?.items) || [];
  const clients = (Array.isArray(clientsQuery.data) ? clientsQuery.data : clientsQuery.data?.items) || [];
  const closures: CashClosure[] = (Array.isArray(closuresQuery.data) ? closuresQuery.data : closuresQuery.data?.items) || [];
  const settings = settingsQuery.data || {};

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    date: todayStr,
    amount: '',
    reason: '',
    account: 'Caixa Geral',
    category: 'operacional',
    receiptNumber: '',
  });

  // Physical banknote counting state for Cash Closure
  const [openingCash, setOpeningCash] = useState<number>(50000);
  const [closureShift, setClosureShift] = useState<'manha' | 'tarde' | 'integral'>('integral');
  const [closureDate, setClosureDate] = useState<string>(todayStr);
  const [closureNotes, setClosureNotes] = useState<string>('');

  const [notesCount, setNotesCount] = useState({
    n20000: 0,
    n10000: 0,
    n5000: 0,
    n2000: 0,
    n1000: 0,
    n500: 0,
    n200: 0,
    coins: 0,
  });

  // Calculate physical cash from notes
  const calculatedPhysicalCash =
    notesCount.n20000 * 20000 +
    notesCount.n10000 * 10000 +
    notesCount.n5000 * 5000 +
    notesCount.n2000 * 2000 +
    notesCount.n1000 * 1000 +
    notesCount.n500 * 500 +
    notesCount.n200 * 200 +
    Number(notesCount.coins || 0);

  // Filtered transactions for selected period
  const filteredPayments = payments.filter((p) => {
    const paidDate = String(p.paidAt || p.paid_at || '').slice(0, 10);
    const pMonth = p.paymentMonth || p.payment_month || p.referenceMonth || p.reference_month || (p.paidAt ? p.paidAt.slice(0, 7) : '');
    if (period === 'today') return paidDate === todayStr;
    if (period === 'month') return pMonth === currentMonthStr;
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (period === 'today') return e.date.startsWith(todayStr);
    if (period === 'month') return e.date.startsWith(currentMonthStr);
    return true;
  });

  const totalIn = filteredPayments.reduce(
    (sum, p) => sum + Number(p.amount) + Number(p.penalty || 0),
    0,
  );
  const totalOut = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netBalance = totalIn - totalOut;

  // Breakdown by payment method
  const methodTotals: Record<string, number> = {};
  filteredPayments.forEach((p) => {
    const m = p.method || 'Multicaixa Express';
    methodTotals[m] = (methodTotals[m] || 0) + Number(p.amount) + Number(p.penalty || 0);
  });

  // Specifically for today's closure calculations
  const todayPayments = payments.filter((p) => String(p.paidAt || p.paid_at || p.date || '').startsWith(closureDate));
  const todayExpenses = expenses.filter((e) => String(e.date || e.createdAt || '').startsWith(closureDate));

  const todayCashIn = todayPayments
    .filter((p) => (p.method || '').toLowerCase().includes('dinheiro') || (p.method || '').toLowerCase().includes('numerário'))
    .reduce((sum, p) => sum + Number(p.amount) + Number(p.penalty || 0), 0);

  const todayTpaIn = todayPayments
    .filter((p) => (p.method || '').toLowerCase().includes('tpa') || (p.method || '').toLowerCase().includes('multicaixa pos'))
    .reduce((sum, p) => sum + Number(p.amount) + Number(p.penalty || 0), 0);

  const todayExpressIn = todayPayments
    .filter((p) => (p.method || '').toLowerCase().includes('express'))
    .reduce((sum, p) => sum + Number(p.amount) + Number(p.penalty || 0), 0);

  const todayTransferIn = todayPayments
    .filter((p) => (p.method || '').toLowerCase().includes('transf') || (p.method || '').toLowerCase().includes('banco') || (p.method || '').toLowerCase().includes('bai') || (p.method || '').toLowerCase().includes('bfa'))
    .reduce((sum, p) => sum + Number(p.amount) + Number(p.penalty || 0), 0);

  const todayTotalRevenue = todayPayments.reduce((sum, p) => sum + Number(p.amount) + Number(p.penalty || 0), 0);
  const todayCashExpenses = todayExpenses
    .filter((e) => (e.account || '').toLowerCase().includes('caixa'))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const todayTotalExpenses = todayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Expected physical cash
  const expectedPhysicalCash = openingCash + todayCashIn - todayCashExpenses;
  const cashDifference = calculatedPhysicalCash - expectedPhysicalCash;

  // Unified chronological transactions
  const transactions = [
    ...filteredPayments.map((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      return {
        id: `pay-${p.id}`,
        rawId: p.id,
        type: 'in' as const,
        date: p.paidAt || p.paid_at || p.createdAt || new Date().toISOString(),
        description: `Mensalidade ${p.referenceMonth || ''} · ${client?.fullName || 'Cliente'}`,
        method: p.method,
        amount: Number(p.amount) + Number(p.penalty || 0),
        operator: p.operator || 'deezy',
        clientName: client?.fullName,
      };
    }),
    ...filteredExpenses.map((e) => ({
      id: `exp-${e.id}`,
      rawId: e.id,
      type: 'out' as const,
      date: e.date || e.createdAt || new Date().toISOString(),
      description: e.reason,
      method: e.account || 'Caixa',
      amount: Number(e.amount),
      operator: e.operator || 'deezy',
      clientName: undefined,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Sincronização e atualização automática de dados ao vivo
  React.useEffect(() => {
    const handleSync = () => {
      qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListCashClosuresQueryKey() });
      qc.invalidateQueries({ queryKey: getListFinancialAccountsQueryKey() });
    };

    window.addEventListener('osdel-expenses-updated', handleSync);
    window.addEventListener('osdel-financial-accounts-updated', handleSync);
    window.addEventListener('osdel-payments-updated', handleSync);
    window.addEventListener('osdel-cash-closures-updated', handleSync);
    window.addEventListener('osdel-data-sync', handleSync);
    window.addEventListener('osdel-sync-change', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('osdel-expenses-updated', handleSync);
      window.removeEventListener('osdel-financial-accounts-updated', handleSync);
      window.removeEventListener('osdel-payments-updated', handleSync);
      window.removeEventListener('osdel-cash-closures-updated', handleSync);
      window.removeEventListener('osdel-data-sync', handleSync);
      window.removeEventListener('osdel-sync-change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [qc]);

  const handleCreateExpense = (e: FormEvent) => {
    e.preventDefault();
    const accStr = String(expenseForm.account || '').toLowerCase();
    const targetAccountId = accStr.includes('bai') ? 'acc-bai' : accStr.includes('bfa') ? 'acc-bfa' : accStr.includes('tpa') ? 'acc-tpa' : accStr.includes('piquete') ? 'acc-piquete' : 'acc-caixa';

    createExpense.mutate(
      {
        data: {
          date: expenseForm.date,
          amount: Number(expenseForm.amount || 0),
          reason: expenseForm.reason,
          account: expenseForm.account,
          accountId: targetAccountId,
          category: expenseForm.category || 'operacional',
          documentNumber: expenseForm.receiptNumber || '',
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          qc.invalidateQueries({ queryKey: getListFinancialAccountsQueryKey() });
          qc.invalidateQueries({ queryKey: getListCashClosuresQueryKey() });
          setModalExpense(false);
          setExpenseForm({
            date: todayStr,
            amount: '',
            reason: '',
            account: 'Caixa Geral',
            category: 'operacional',
            receiptNumber: '',
          });
        },
      },
    );
  };

  const handleSaveCashClosure = (e: FormEvent) => {
    e.preventDefault();
    createCashClosure.mutate(
      {
        data: {
          date: closureDate,
          shift: closureShift,
          openingCash,
          totalRevenue: todayTotalRevenue,
          totalExpenses: todayTotalExpenses,
          cashIn: todayCashIn,
          tpaIn: todayTpaIn,
          expressIn: todayExpressIn,
          transferIn: todayTransferIn,
          cashExpenses: todayCashExpenses,
          expectedCash: expectedPhysicalCash,
          countedCash: calculatedPhysicalCash,
          difference: cashDifference,
          notes: closureNotes,
          banknotesBreakdown: {
            k20000: notesCount.n20000,
            k10000: notesCount.n10000,
            k5000: notesCount.n5000,
            k2000: notesCount.n2000,
            k1000: notesCount.n1000,
            k500: notesCount.n500,
            k200: notesCount.n200,
            coins: notesCount.coins,
          },
        },
      },
      {
        onSuccess: (newClosure) => {
          qc.invalidateQueries({ queryKey: getListCashClosuresQueryKey() });
          toast({
            title: 'Fecho Registado',
            description: 'Fecho de Caixa e Turno registado com sucesso!',
          });
          setActiveTab('historico');
          setModalClosurePreview(newClosure);
        },
        onError: (err: any) => {
          toast({
            title: 'Erro no Registo',
            description: err.message || 'Erro ao registar fecho de caixa.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const openHomologateModal = (closureId: number) => {
    if (!isAdmin) {
      toast({
        title: 'Acesso Restrito',
        description: 'Apenas o Administrador pode homologar o fecho de caixa.',
        variant: 'destructive',
      });
      return;
    }
    setHomologateModal({
      id: closureId,
      notes: 'Conferido e homologado pela Direcção Financeira.',
    });
  };

  const confirmHomologateClosure = () => {
    if (!homologateModal) return;
    validateCashClosure.mutate(
      {
        closureId: homologateModal.id,
        adminNotes: homologateModal.notes || 'Conferido e homologado pela Direcção.',
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListCashClosuresQueryKey() });
          toast({
            title: 'Fecho Homologado',
            description: 'Fecho de caixa validado e homologado com sucesso!',
          });
          if (modalClosurePreview && modalClosurePreview.id === homologateModal.id) {
            setModalClosurePreview(null);
          }
          setHomologateModal(null);
        },
        onError: (err: any) => {
          toast({
            title: 'Erro ao Homologar',
            description: err.message || 'Ocorreu um erro ao homologar o fecho.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Tesouraria, Contabilidade & Finanças"
        title="Contabilidade & Fechos de Caixa"
        detail="Histórico de fechos mensais consolidados, termos oficiais de encerramento, livro de caixa e contagem física de cédulas."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === 'fechos-mensais' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('fechos-mensais')}
            >
              <Calendar size={16} /> Fechos Mensais
            </Button>
            <Button
              variant={activeTab === 'fecho' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('fecho')}
            >
              <Calculator size={16} /> Novo Fecho Diário
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setExpenseForm({
                  date: todayStr,
                  amount: '',
                  reason: '',
                  account: 'Caixa Geral',
                  category: 'operacional',
                  receiptNumber: '',
                });
                setModalExpense(true);
              }}
            >
              <TrendingDown size={16} /> Lançar Saída / Despesa
            </Button>
          </div>
        }
      />

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('fechos-mensais')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition shadow-sm ${
            activeTab === 'fechos-mensais'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
          }`}
        >
          <Calendar size={15} className={activeTab === 'fechos-mensais' ? 'text-white' : 'text-blue-600'} />
          <span>Histórico de Fechos Mensais</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'fechos-mensais' ? 'bg-blue-700 text-white' : 'bg-white text-blue-800 border border-blue-200'
          }`}>
            {monthlyClosures.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('extrato')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'extrato'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <Layers size={15} /> Livro de Caixa & Extrato
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fecho')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'fecho'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <Calculator size={15} /> Fecho de Caixa & Contagem de Cédulas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('historico')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'historico'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <History size={15} /> Histórico de Fechos Arquivados ({closures.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balancete')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            activeTab === 'balancete'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <Scale size={15} /> Demonstrativo Financeiro
        </button>
      </div>

      {/* TAB 0: HISTÓRICO DE FECHOS MENSAIS */}
      {activeTab === 'fechos-mensais' && (
        <MonthlyClosuresView
          isAdmin={isAdmin}
          currentUserName={currentUser?.name || currentUser?.username || 'Administrador'}
        />
      )}

      {/* TAB 1: EXTRATO & LIVRO DE CAIXA */}
      {activeTab === 'extrato' && (
        <div className="space-y-6">
          {/* Period Selector */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'month', label: 'Este Mês' },
                { id: 'all', label: 'Todo o Período' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id as any)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    period === p.id
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {transactions.length} movimentos registados
            </span>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Total Receitas
                </span>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#dceee5] text-[#237052]">
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#237052]">{kz(totalIn)}</p>
              <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                {filteredPayments.length} pagamentos recebidos
              </small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Total Despesas
                </span>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#f8e1da] text-[#a24e3a]">
                  <ArrowDownRight size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-[#a24e3a]">{kz(totalOut)}</p>
              <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                {filteredExpenses.length} saídas de caixa
              </small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Saldo Líquido
                </span>
                <div
                  className={`grid h-8 w-8 place-items-center rounded-lg ${
                    netBalance >= 0 ? 'bg-[#dceee5] text-[#237052]' : 'bg-[#f8e1da] text-[#a24e3a]'
                  }`}
                >
                  <Scale size={18} />
                </div>
              </div>
              <p
                className={`mt-3 text-2xl font-extrabold ${
                  netBalance >= 0 ? 'text-[#237052]' : 'text-[#a24e3a]'
                }`}
              >
                {kz(netBalance)}
              </p>
              <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                {netBalance >= 0 ? 'Superávit no período' : 'Déficit operacional'}
              </small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Canal Principal
                </span>
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                  <Banknote size={18} />
                </div>
              </div>
              <p className="mt-3 text-lg font-extrabold text-slate-800 truncate">
                {Object.entries(methodTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Multicaixa'}
              </p>
              <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                {kz(Object.entries(methodTotals).sort((a, b) => b[1] - a[1])[0]?.[1] || 0)} cobrados
              </small>
            </div>
          </div>

          {/* Chronological Transaction Table */}
          <div className="surface rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))] flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Movimentações do Livro de Caixa</h3>
              <Button variant="outline" className="text-xs" onClick={() => window.print()}>
                <Printer size={14} /> Imprimir Livro
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descrição do Movimento</th>
                    <th className="py-3 px-4">Forma / Canal</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-right">Acção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Nenhum movimento registado no período seleccionado.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500">
                          {dateTime(tx.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {tx.type === 'in' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <ArrowUpRight size={14} /> Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                              <ArrowDownRight size={14} /> Saída
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{tx.description}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{tx.method || 'Caixa'}</td>
                        <td className="py-3 px-4 text-slate-500">@{tx.operator}</td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            tx.type === 'in' ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {tx.type === 'in' ? `+${kz(tx.amount)}` : `-${kz(tx.amount)}`}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {tx.type === 'out' && isAdmin && (
                            <button
                              title="Anular despesa"
                              onClick={() => {
                                if (confirm('Tem a certeza que deseja anular esta despesa?')) {
                                  deleteExpense.mutate(
                                    { expenseId: tx.rawId },
                                    {
                                      onSuccess: () =>
                                        qc.invalidateQueries({ queryKey: getListExpensesQueryKey() }),
                                    },
                                  );
                                }
                              }}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSISTENTE DE FECHO DE CAIXA COMPLETO & PROFISSIONAL */}
      {activeTab === 'fecho' && (
        <form onSubmit={handleSaveCashClosure} className="space-y-6">
          <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Termo Oficial de Encerramento de Caixa & Turno</h3>
                <p className="text-xs text-slate-500">
                  Conferência física de notas de Kwanzas, apuramento de quebras/sobras e submissão à administração.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Field label="Data do Turno" className="m-0">
                  <Input
                    type="date"
                    value={closureDate}
                    onChange={(e) => setClosureDate(e.target.value)}
                    className="text-xs py-1 h-9"
                  />
                </Field>
                <Field label="Período / Turno" className="m-0">
                  <Select
                    value={closureShift}
                    onChange={(e) => setClosureShift(e.target.value as any)}
                    className="text-xs py-1 h-9"
                  >
                    <option value="integral">Turno Integral (Todo o Dia)</option>
                    <option value="manha">Turno da Manhã (08h - 13h)</option>
                    <option value="tarde">Turno da Tarde (13h - 18h)</option>
                  </Select>
                </Field>
              </div>
            </div>

            {/* Step 1: System Calculations for this Day */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                1. Movimentação Electrónica & Saldo de Livro do Turno ({date(closureDate)})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Fundo de Troco Inicial</span>
                  <input
                    type="number"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    className="mt-1 w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono font-bold text-slate-800"
                  />
                  <small className="text-[10px] text-slate-400">Caixa de abertura</small>
                </div>

                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-emerald-800 block font-bold text-[10px] uppercase">Entradas em Dinheiro</span>
                  <b className="mt-2 block font-mono text-base font-extrabold text-emerald-700">{kz(todayCashIn)}</b>
                  <small className="text-[10px] text-emerald-600">Numerário recebido</small>
                </div>

                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-200">
                  <span className="text-blue-800 block font-bold text-[10px] uppercase">TPA Multicaixa POS</span>
                  <b className="mt-2 block font-mono text-base font-extrabold text-blue-700">{kz(todayTpaIn)}</b>
                  <small className="text-[10px] text-blue-600">Comprovativos de fita</small>
                </div>

                <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-200">
                  <span className="text-purple-800 block font-bold text-[10px] uppercase">Express & Bancos</span>
                  <b className="mt-2 block font-mono text-base font-extrabold text-purple-700">
                    {kz(todayExpressIn + todayTransferIn)}
                  </b>
                  <small className="text-[10px] text-purple-600">BAI / BFA directos</small>
                </div>

                <div className="bg-red-50/50 p-3.5 rounded-xl border border-red-200">
                  <span className="text-red-800 block font-bold text-[10px] uppercase">Saídas Físicas (Caixa)</span>
                  <b className="mt-2 block font-mono text-base font-extrabold text-red-700">{kz(todayCashExpenses)}</b>
                  <small className="text-[10px] text-red-600">Pagas em dinheiro</small>
                </div>
              </div>
            </div>

            {/* Step 2: Physical Banknotes Counter (Cédulas em Kwanzas) */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Banknote size={16} className="text-emerald-700" /> 2. Contagem Física das Cédulas em Caixa (AOA Kwanzas)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Insira a quantidade de cada nota encontrada no gaveteiro para apuramento automático.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Físico Contado:</span>
                  <b className="text-xl font-extrabold font-mono text-slate-900">{kz(calculatedPhysicalCash)}</b>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
                {[
                  { key: 'n20000', label: '20.000 Kz', value: 20000 },
                  { key: 'n10000', label: '10.000 Kz', value: 10000 },
                  { key: 'n5000', label: '5.000 Kz', value: 5000 },
                  { key: 'n2000', label: '2.000 Kz', value: 2000 },
                  { key: 'n1000', label: '1.000 Kz', value: 1000 },
                  { key: 'n500', label: '500 Kz', value: 500 },
                  { key: 'n200', label: '200 Kz', value: 200 },
                  { key: 'coins', label: 'Moedas (Total)', isDirectAmount: true },
                ].map((item) => (
                  <div key={item.key} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">{item.label}</span>
                    <input
                      type="number"
                      min="0"
                      value={(notesCount as any)[item.key] || ''}
                      onChange={(e) =>
                        setNotesCount({
                          ...notesCount,
                          [item.key]: Number(e.target.value || 0),
                        })
                      }
                      placeholder="0"
                      className="w-full text-xs font-mono font-bold p-1 border rounded bg-slate-50 focus:bg-white"
                    />
                    <small className="block text-[10px] text-slate-400 font-mono">
                      {item.isDirectAmount
                        ? kz((notesCount as any)[item.key] || 0)
                        : kz(((notesCount as any)[item.key] || 0) * item.value!)}
                    </small>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Reconciliation & Difference Alert */}
            <div className="grid gap-4 md:grid-cols-3 text-xs">
              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Esperado em Caixa:</span>
                <p className="text-xs text-slate-500 mt-1">Fundo inicial + Entradas em Numerário - Saídas Físicas</p>
                <b className="text-xl font-mono font-bold text-slate-800 block mt-2">{kz(expectedPhysicalCash)}</b>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Dinheiro Físico Contado:</span>
                <p className="text-xs text-slate-500 mt-1">Soma das notas e moedas do gaveteiro</p>
                <b className="text-xl font-mono font-bold text-blue-900 block mt-2">{kz(calculatedPhysicalCash)}</b>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  cashDifference === 0
                    ? 'bg-emerald-50 border-emerald-300'
                    : cashDifference > 0
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">
                    Resultado da Conciliação:
                  </span>
                  {cashDifference === 0 ? (
                    <CheckCircle2 size={16} className="text-emerald-700" />
                  ) : (
                    <AlertTriangle size={16} className={cashDifference > 0 ? 'text-amber-700' : 'text-red-700'} />
                  )}
                </div>
                <b
                  className={`text-xl font-mono font-extrabold block mt-2 ${
                    cashDifference === 0
                      ? 'text-emerald-800'
                      : cashDifference > 0
                      ? 'text-amber-800'
                      : 'text-red-800'
                  }`}
                >
                  {cashDifference === 0
                    ? 'Caixa 100% Balanceado (0 Kz)'
                    : cashDifference > 0
                    ? `+${kz(cashDifference)} (Sobra de Caixa)`
                    : `${kz(cashDifference)} (Falta / Quebra de Caixa)`}
                </b>
                <p className="text-[10px] text-slate-500 mt-1">
                  {cashDifference === 0
                    ? 'Os valores físicos conferem exactamente com o sistema.'
                    : 'Obrigatório registar justificação nas observações abaixo.'}
                </p>
              </div>
            </div>

            {/* Notes & Justifications */}
            <div>
              <Field label="Observações & Ocorrências do Turno (Obrigatório em caso de quebra ou sobra)">
                <Textarea
                  rows={2}
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="Registe aqui quebras de trocos, notas danificadas, falhas temporárias de TPA ou justificações do operador..."
                />
              </Field>
            </div>

            {/* Submit Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[hsl(var(--border))]">
              <div className="text-xs text-slate-500">
                Operador Responsável: <b className="text-slate-800 font-mono">@{currentUser?.username || 'operador'}</b> ({currentUser?.name})
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  <FileCheck size={16} /> Gravar e Emitir Termo de Fecho
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: HISTÓRICO DE FECHOS ARQUIVADOS & VALIDAÇÃO */}
      {activeTab === 'historico' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Histórico de Fechos de Caixa Homologados</h3>
              <p className="text-xs text-slate-500">
                Arquivo digital de todos os encerramentos com conferência de assinaturas da supervisão.
              </p>
            </div>
            {isAdmin && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck size={14} /> Modo Auditor Administrador Activo
              </span>
            )}
          </div>

          <div className="surface rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="py-3 px-4">Código do Termo</th>
                    <th className="py-3 px-4">Data / Turno</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4 text-right">Total Receita</th>
                    <th className="py-3 px-4 text-right">Dinheiro Físico</th>
                    <th className="py-3 px-4 text-right">Diferença</th>
                    <th className="py-3 px-4">Estado da Validação</th>
                    <th className="py-3 px-4 text-right">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {closures.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhum fecho de caixa arquivado até ao momento.
                      </td>
                    </tr>
                  ) : (
                    closures.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-[hsl(var(--primary))]">
                          {c.code || `FC-${String(c.id).padStart(5, '0')}`}
                        </td>
                        <td className="py-3 px-4">
                          <b className="text-slate-800 block">{date(c.date)}</b>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            Turno: {c.shift}
                          </span>
                        </td>
                        <td className="py-3 px-4">@{c.operator}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          {kz(c.totalRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-800">{kz(c.countedCash)}</td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            c.difference === 0
                              ? 'text-emerald-700'
                              : c.difference > 0
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }`}
                        >
                          {c.difference === 0 ? '0 Kz' : `${c.difference > 0 ? '+' : ''}${kz(c.difference)}`}
                        </td>
                        <td className="py-3 px-4">
                          {c.status === 'validado' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <ShieldCheck size={12} /> Homologado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                              Pendente Aprovação
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              className="text-xs py-1 px-2.5"
                              onClick={() => setModalClosurePreview(c)}
                            >
                              <Printer size={13} /> Termo
                            </Button>
                            {isAdmin && c.status !== 'validado' && (
                              <Button
                                className="text-xs py-1 px-2.5 bg-emerald-700 text-white hover:bg-emerald-800"
                                onClick={() => openHomologateModal(c.id)}
                              >
                                <Check size={13} /> Homologar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DEMONSTRATIVO & CENTROS DE CUSTO */}
      {activeTab === 'balancete' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold uppercase text-slate-400 block">Margem de Contribuição</span>
              <b className="text-2xl font-extrabold text-emerald-700 mt-2 block">
                {totalIn > 0 ? `${Math.round(((totalIn - totalOut) / totalIn) * 100)}%` : '0%'}
              </b>
              <small className="text-xs text-slate-500">Eficiência operacional do período</small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold uppercase text-slate-400 block">Média Diária de Cobrança</span>
              <b className="text-2xl font-extrabold text-slate-900 mt-2 block">{kz(totalIn / 30)}</b>
              <small className="text-xs text-slate-500">Fluxo médio diário em Kwanzas</small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold uppercase text-slate-400 block">Rácio de Despesas sobre Receita</span>
              <b className="text-2xl font-extrabold text-amber-700 mt-2 block">
                {totalIn > 0 ? `${Math.round((totalOut / totalIn) * 100)}%` : '0%'}
              </b>
              <small className="text-xs text-slate-500">Custo operacional relativo</small>
            </div>
          </div>

          <div className="surface rounded-xl border border-[hsl(var(--border))] p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Distribuição de Receitas por Canal Financeiro</h3>
            <div className="space-y-3 text-xs">
              {Object.entries(methodTotals).map(([method, amount]) => {
                const percent = totalIn > 0 ? Math.round((amount / totalIn) * 100) : 0;
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700">{method}</span>
                      <span className="font-mono text-slate-900">
                        {kz(amount)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-[hsl(var(--primary))] h-2 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR DESPESA DETALHADA */}
      {modalExpense && (
        <Modal
          title="Registar Saída de Caixa / Despesa"
          eyebrow="Tesouraria OSDEL"
          onClose={() => setModalExpense(false)}
        >
          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data do Movimento *">
                <Input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                />
              </Field>
              <Field label="Valor (Kz) *">
                <Input
                  type="number"
                  min="1"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="5000"
                />
              </Field>
            </div>

            <Field label="Descrição / Justificação da Despesa *">
              <Textarea
                required
                rows={2}
                value={expenseForm.reason}
                onChange={(e) => setExpenseForm({ ...expenseForm, reason: e.target.value })}
                placeholder="Ex.: Aquisição de bobina de cabo coaxial 100m, refeição da equipa técnica de piquete, gasolina gerador..."
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Conta / Canal de Saída *">
                <Select
                  value={expenseForm.account}
                  onChange={(e) => setExpenseForm({ ...expenseForm, account: e.target.value })}
                >
                  <option value="Caixa Geral">Caixa Geral (Dinheiro Físico)</option>
                  <option value="Banco BAI">Banco BAI (Conta Corrente)</option>
                  <option value="Banco BFA">Banco BFA (Conta Corrente)</option>
                  <option value="Fundo de Maneio">Fundo de Maneio Piquete</option>
                </Select>
              </Field>

              <Field label="Categoria de Centro de Custo">
                <Select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  <option value="operacional">Operacional & Rede</option>
                  <option value="material">Material Técnico & Ferramentas</option>
                  <option value="combustivel">Combustível & Transporte</option>
                  <option value="alimentacao">Alimentação Equipa</option>
                  <option value="administrativo">Administrativo & Escritório</option>
                </Select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setModalExpense(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Confirmar Saída de Caixa
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: PREVIEW DO TERMO OFICIAL DE FECHO DE CAIXA */}
      {modalClosurePreview && (
        <Modal
          title={`Termo de Encerramento: ${modalClosurePreview.code || `FC-${modalClosurePreview.id}`}`}
          eyebrow="Documento Oficial de Tesouraria"
          onClose={() => setModalClosurePreview(null)}
          printable={true}
        >
          <div className="space-y-6 text-xs print:p-0 print:border-none" id="printable-closure-term">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {settings.companyName || 'OSDEL TECNOLOGIA, LDA'}
                </h3>
                <p className="text-slate-500">NIF: {settings.companyNif || '5001928310'} · {settings.companyAddress || 'Luanda'}</p>
                <p className="text-slate-500">Telefones: {settings.companyPhone || '923 102 938'}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-sm bg-slate-100 px-3 py-1 rounded border">
                  {modalClosurePreview.code || `FC-${modalClosurePreview.id}`}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Data: {date(modalClosurePreview.date)}</p>
                <p className="text-[11px] text-slate-500">Turno: {String(modalClosurePreview?.shift || 'integral').toUpperCase()}</p>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border text-center font-mono">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block font-sans">Total Receitas</span>
                <b className="text-sm text-emerald-700">{kz(modalClosurePreview.totalRevenue)}</b>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block font-sans">Total Saídas</span>
                <b className="text-sm text-red-700">{kz(modalClosurePreview.totalExpenses)}</b>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block font-sans">Físico Contado</span>
                <b className="text-sm text-blue-900">{kz(modalClosurePreview.countedCash)}</b>
              </div>
            </div>

            {/* Reconciliation Breakdown */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                Apuramento de Diferenças em Caixa
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">Fundo de Troco Inicial:</span>
                  <b className="font-mono">{kz(modalClosurePreview.openingCash)}</b>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">Entradas Físicas (Dinheiro):</span>
                  <b className="font-mono">{kz(modalClosurePreview.cashIn)}</b>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">TPA Multicaixa Fita:</span>
                  <b className="font-mono">{kz(modalClosurePreview.tpaIn)}</b>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">Express & Transferências:</span>
                  <b className="font-mono">{kz(modalClosurePreview.expressIn + modalClosurePreview.transferIn)}</b>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">Saldo Esperado em Caixa:</span>
                  <b className="font-mono text-slate-900">{kz(modalClosurePreview.expectedCash)}</b>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-slate-500">Diferença (Sobra / Falta):</span>
                  <b
                    className={`font-mono font-bold ${
                      modalClosurePreview.difference === 0
                        ? 'text-emerald-700'
                        : modalClosurePreview.difference > 0
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    {modalClosurePreview.difference === 0
                      ? 'Nenhuma (0 Kz)'
                      : `${modalClosurePreview.difference > 0 ? '+' : ''}${kz(modalClosurePreview.difference)}`}
                  </b>
                </div>
              </div>
            </div>

            {/* Banknotes breakdown */}
            {modalClosurePreview.banknotesBreakdown && (
              <div className="space-y-2">
                <h4 className="font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                  Discriminação Física de Cédulas Contadas
                </h4>
                <div className="grid grid-cols-4 gap-2 text-[11px] font-mono">
                  <div>20.000 Kz: {modalClosurePreview.banknotesBreakdown.k20000 || 0} notas</div>
                  <div>10.000 Kz: {modalClosurePreview.banknotesBreakdown.k10000 || 0} notas</div>
                  <div>5.000 Kz: {modalClosurePreview.banknotesBreakdown.k5000 || 0} notas</div>
                  <div>2.000 Kz: {modalClosurePreview.banknotesBreakdown.k2000 || 0} notas</div>
                  <div>1.000 Kz: {modalClosurePreview.banknotesBreakdown.k1000 || 0} notas</div>
                  <div>500 Kz: {modalClosurePreview.banknotesBreakdown.k500 || 0} notas</div>
                  <div>200 Kz: {modalClosurePreview.banknotesBreakdown.k200 || 0} notas</div>
                  <div>Moedas: {kz(modalClosurePreview.banknotesBreakdown.coins || 0)}</div>
                </div>
              </div>
            )}

            {/* Observations */}
            {modalClosurePreview.notes && (
              <div className="bg-slate-50 p-3 rounded-lg border text-xs text-slate-700">
                <b className="block text-[10px] uppercase font-bold text-slate-500">Observações Registadas:</b>
                {modalClosurePreview.notes}
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
              <div>
                <div className="border-t border-slate-400 pt-2" />
                <b className="block text-slate-900">Assinatura do Operador de Caixa</b>
                <span className="text-[10px] text-slate-500">@{modalClosurePreview.operator}</span>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-2" />
                <b className="block text-slate-900">Homologação da Direcção / Supervisão</b>
                <span className="text-[10px] text-slate-500">
                  {modalClosurePreview.validatedBy
                    ? `Homologado por @${modalClosurePreview.validatedBy}`
                    : 'Pendente de validação formal'}
                </span>
              </div>
            </div>

            {/* Print & Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t print:hidden">
              <div className="flex items-center gap-2">
                <a
                  href={getPrintUrl('fecho-diario', { id: modalClosurePreview.id })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  title="Abre o documento numa nova aba sem qualquer restrição de iframe para impressão ou PDF"
                >
                  <ExternalLink size={14} />
                  <span>Abrir em Nova Aba (PDF)</span>
                </a>
                <Button
                  variant="outline"
                  onClick={() => triggerPrint({ elementId: 'printable-closure-term' })}
                >
                  <Printer size={15} /> Imprimir Termo
                </Button>
              </div>
              <div className="flex gap-2">
                {isAdmin && modalClosurePreview.status !== 'validado' && (
                  <Button
                    className="bg-emerald-700 text-white hover:bg-emerald-800"
                    onClick={() => openHomologateModal(modalClosurePreview.id)}
                  >
                    <Check size={15} /> Validar / Homologar
                  </Button>
                )}
                <Button variant="outline" onClick={() => setModalClosurePreview(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: HOMOLOGAÇÃO FORMAL DA ADMINISTRAÇÃO */}
      {homologateModal && (
        <Modal
          title="Homologar Fecho de Caixa"
          eyebrow="Validação de Direcção"
          onClose={() => setHomologateModal(null)}
        >
          <div className="space-y-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Ao homologar, o fecho de caixa diário nº <strong>FC-{String(homologateModal.id).padStart(5, '0')}</strong> será marcado como conferido e auditado formalmente pela administração.
            </p>
            <Field label="Notas ou Parecer da Administração">
              <Textarea
                value={homologateModal.notes}
                onChange={(e) => setHomologateModal({ ...homologateModal, notes: e.target.value })}
                rows={3}
                placeholder="Insira as notas de auditoria..."
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setHomologateModal(null)}>
                Cancelar
              </Button>
              <Button
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                onClick={confirmHomologateClosure}
              >
                <Check size={15} /> Confirmar Homologação
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
