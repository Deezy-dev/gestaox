import React, { useState, useMemo, FormEvent } from 'react';
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Building2,
  Coins,
  TrendingDown,
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  Download,
  FileText,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Check,
  X,
  ChevronRight,
  PieChart,
  Layers,
  ReceiptText,
  AlertCircle,
  Calendar,
  DollarSign,
  Fuel,
  Wifi,
  Utensils,
  Zap,
  Wrench,
  FileCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { triggerPrint, getPrintUrl } from '@/lib/printer';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useListFinancialAccounts,
  useCreateFinancialAccount,
  useUpdateFinancialAccount,
  useDeleteFinancialAccount,
  useListTransfers,
  useCreateTransfer,
  useDeleteTransfer,
  useListCategoryBudgets,
  useUpdateCategoryBudgets,
  useToggleExpenseReconciliation,
  useTogglePaymentReconciliation,
  useListPayments,
  useGetSettings,
  session,
  getListExpensesQueryKey,
  getListFinancialAccountsQueryKey,
  getListTransfersQueryKey,
  getListCategoryBudgetsQueryKey,
  getListPaymentsQueryKey,
  AnyRecord,
} from '@/lib/local-api';

const kz = (val?: number | string | null) => {
  const num = Number(val || 0);
  return `${num.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
};

const formatDate = (isoStr?: string) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return isoStr;
  }
};

const CATEGORIES: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  material: { label: 'Material de Rede & Fibra', icon: <Layers size={14} />, color: '#2563eb', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
  combustivel: { label: 'Combustível & Viaturas', icon: <Fuel size={14} />, color: '#d97706', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  link_ip: { label: 'Link IP & Trânsito', icon: <Wifi size={14} />, color: '#7c3aed', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' },
  alimentacao: { label: 'Alimentação & Diárias', icon: <Utensils size={14} />, color: '#e11d48', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
  energia: { label: 'Energia & Gerador', icon: <Zap size={14} />, color: '#059669', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  manutencao: { label: 'Manutenção & Ferramentas', icon: <Wrench size={14} />, color: '#4f46e5', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' },
  operacional: { label: 'Despesas de Balcão', icon: <FileText size={14} />, color: '#475569', bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-800' },
  impostos: { label: 'Impostos & Taxas AGT', icon: <FileCheck size={14} />, color: '#0891b2', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800' },
  outros: { label: 'Outras Despesas', icon: <Coins size={14} />, color: '#64748b', bg: 'bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-700' },
};

export function AccountsPage() {
  const qc = useQueryClient();
  const currentSession = session();

  // Queries
  const expensesQuery = useListExpenses();
  const accountsQuery = useListFinancialAccounts();
  const transfersQuery = useListTransfers();
  const budgetsQuery = useListCategoryBudgets();
  const paymentsQuery = useListPayments();
  const settingsQuery = useGetSettings();

  // Mutations
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createTransfer = useCreateTransfer();
  const deleteTransfer = useDeleteTransfer();
  const createAccount = useCreateFinancialAccount();
  const updateAccount = useUpdateFinancialAccount();
  const deleteAccount = useDeleteFinancialAccount();
  const updateBudgets = useUpdateCategoryBudgets();
  const toggleExpenseRec = useToggleExpenseReconciliation();
  const togglePaymentRec = useTogglePaymentReconciliation();

  // Sincronização reactiva automática em tempo real sem precisar de atualizar a página
  React.useEffect(() => {
    const handleSync = () => {
      qc.invalidateQueries({ queryKey: getListFinancialAccountsQueryKey() });
      qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListTransfersQueryKey() });
      qc.invalidateQueries({ queryKey: getListCategoryBudgetsQueryKey() });
    };

    window.addEventListener('osdel-financial-accounts-updated', handleSync);
    window.addEventListener('osdel-payments-updated', handleSync);
    window.addEventListener('osdel-expenses-updated', handleSync);
    window.addEventListener('osdel-account-transfers-updated', handleSync);
    window.addEventListener('osdel-contracts-updated', handleSync);
    window.addEventListener('osdel-clients-updated', handleSync);
    window.addEventListener('osdel-data-sync', handleSync);

    return () => {
      window.removeEventListener('osdel-financial-accounts-updated', handleSync);
      window.removeEventListener('osdel-payments-updated', handleSync);
      window.removeEventListener('osdel-expenses-updated', handleSync);
      window.removeEventListener('osdel-account-transfers-updated', handleSync);
      window.removeEventListener('osdel-contracts-updated', handleSync);
      window.removeEventListener('osdel-clients-updated', handleSync);
      window.removeEventListener('osdel-data-sync', handleSync);
    };
  }, [qc]);

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<'contas' | 'despesas' | 'transferencias' | 'conciliacao' | 'orcamentos'>('contas');

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<AnyRecord | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AnyRecord | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedVoucherExpense, setSelectedVoucherExpense] = useState<AnyRecord | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [selectedAccountForStatement, setSelectedAccountForStatement] = useState<string | null>(null);

  // Filters for Expenses Tab
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [datePeriodFilter, setDatePeriodFilter] = useState<'all' | 'this_month' | 'last_month' | 'this_week'>('all');

  // Reconciliation filter
  const [recFilter, setRecFilter] = useState<'all' | 'pending' | 'reconciled'>('all');

  // Data
  const expenses: AnyRecord[] = expensesQuery.data?.items || [];
  const accounts: AnyRecord[] = accountsQuery.data?.items || [];
  const transfers: AnyRecord[] = transfersQuery.data?.items || [];
  const budgets: AnyRecord[] = budgetsQuery.data?.items || [];
  const payments: AnyRecord[] = paymentsQuery.data?.items || [];
  const settings = settingsQuery.data || {};

  // Compute live balance for each account
  const accountBalances = useMemo(() => {
    const balances: Record<string, { current: number; totalIn: number; totalOut: number }> = {};

    accounts.forEach((acc) => {
      balances[acc.id] = {
        current: Number(acc.initialBalance || 0),
        totalIn: 0,
        totalOut: 0,
      };
    });

    // 1. Add payments (inflows)
    payments.forEach((p) => {
      let targetAccId = p.accountId || p.account_id;
      if (!targetAccId) {
        const m = String(p.method || '').toLowerCase();
        if (m.includes('transfer') || m.includes('bai')) targetAccId = 'acc-bai';
        else if (m.includes('bfa')) targetAccId = 'acc-bfa';
        else if (m.includes('multi') || m.includes('tpa') || m.includes('express')) targetAccId = 'acc-tpa';
        else targetAccId = 'acc-caixa';
      }

      const amount = Number(p.amount || 0) + Number(p.penalty || 0);
      if (balances[targetAccId]) {
        balances[targetAccId].current += amount;
        balances[targetAccId].totalIn += amount;
      }
    });

    // 2. Subtract expenses (outflows)
    expenses.forEach((e) => {
      if (e.status === 'cancelado') return;
      let targetAccId = e.accountId || e.account_id;
      if (!targetAccId) {
        const eAccName = String(e.account || '').toLowerCase();
        if (eAccName.includes('bai')) targetAccId = 'acc-bai';
        else if (eAccName.includes('bfa')) targetAccId = 'acc-bfa';
        else if (eAccName.includes('tpa') || eAccName.includes('multi') || eAccName.includes('express')) targetAccId = 'acc-tpa';
        else if (eAccName.includes('piquete') || eAccName.includes('fundo')) targetAccId = 'acc-piquete';
        else {
          const found = accounts.find((a) => a.name === e.account || a.id === e.account);
          targetAccId = found ? found.id : 'acc-caixa';
        }
      }
      const amount = Number(e.amount || 0);
      const chosenId = balances[targetAccId] ? targetAccId : 'acc-caixa';
      if (balances[chosenId]) {
        balances[chosenId].current -= amount;
        balances[chosenId].totalOut += amount;
      }
    });

    // 3. Process transfers
    transfers.forEach((t) => {
      if (t.status === 'cancelado') return;
      const amount = Number(t.amount || 0);
      if (balances[t.fromAccountId]) {
        balances[t.fromAccountId].current -= amount;
        balances[t.fromAccountId].totalOut += amount;
      }
      if (balances[t.toAccountId]) {
        balances[t.toAccountId].current += amount;
        balances[t.toAccountId].totalIn += amount;
      }
    });

    return balances;
  }, [accounts, payments, expenses, transfers]);

  // Overall Treasury Metrics
  const metrics = useMemo(() => {
    let totalCash = 0;
    let totalBanks = 0;
    let totalTpa = 0;
    let totalFloat = 0;
    let totalConsolidated = 0;

    accounts.forEach((acc) => {
      const bal = accountBalances[acc.id]?.current || 0;
      totalConsolidated += bal;
      if (acc.type === 'caixa') totalCash += bal;
      else if (acc.type === 'banco') totalBanks += bal;
      else if (acc.type === 'tpa') totalTpa += bal;
      else if (acc.type === 'fundo_maneio') totalFloat += bal;
    });

    // Month inflows & outflows
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);

    const monthExpenses = expenses
      .filter((e) => e.date?.startsWith(currentMonthPrefix) && e.status !== 'cancelado')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const monthPayments = payments
      .filter((p) => p.paidAt?.startsWith(currentMonthPrefix) || p.paymentMonth === currentMonthPrefix)
      .reduce((sum, p) => sum + Number(p.amount || 0) + Number(p.penalty || 0), 0);

    const netOperational = monthPayments - monthExpenses;

    // Reconciliation rate
    const totalTransactions = expenses.length + payments.length;
    const reconciledTransactions =
      expenses.filter((e) => e.isReconciled).length + payments.filter((p) => p.isReconciled).length;
    const reconciliationRate = totalTransactions > 0 ? Math.round((reconciledTransactions / totalTransactions) * 100) : 100;

    return {
      totalConsolidated,
      totalCash,
      totalBanks,
      totalTpa,
      totalFloat,
      monthExpenses,
      monthPayments,
      netOperational,
      reconciliationRate,
    };
  }, [accounts, accountBalances, expenses, payments]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (searchFilter) {
        const query = searchFilter.toLowerCase().trim();
        const text = `${e.reason || ''} ${e.supplier || ''} ${e.supplierNif || ''} ${e.documentNumber || ''} ${e.account || ''} ${e.operator || ''}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (accountFilter && e.accountId !== accountFilter && e.account !== accountFilter) return false;
      if (statusFilter && e.status !== statusFilter) return false;

      if (datePeriodFilter !== 'all') {
        const d = new Date(e.date || Date.now());
        const now = new Date();
        if (datePeriodFilter === 'this_month') {
          if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
        } else if (datePeriodFilter === 'last_month') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const yearOfLastMonth = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          if (d.getFullYear() !== yearOfLastMonth || d.getMonth() !== lastMonth) return false;
        } else if (datePeriodFilter === 'this_week') {
          const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
          if (d < oneWeekAgo) return false;
        }
      }

      return true;
    });
  }, [expenses, searchFilter, categoryFilter, accountFilter, statusFilter, datePeriodFilter]);

  const filteredExpensesTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  // Reconciliation combined rows
  const reconciliationItems = useMemo(() => {
    const items: Array<{
      id: string;
      rawId: number;
      type: 'entrada' | 'saida';
      date: string;
      description: string;
      accountName: string;
      amount: number;
      isReconciled: boolean;
      documentRef?: string;
      operator?: string;
    }> = [];

    // Add expenses
    expenses.forEach((e) => {
      items.push({
        id: `exp-${e.id}`,
        rawId: e.id,
        type: 'saida',
        date: e.date,
        description: `[Despesa] ${e.reason} (${e.supplier || 'Geral'})`,
        accountName: e.account || 'Caixa Geral',
        amount: Number(e.amount || 0),
        isReconciled: Boolean(e.isReconciled),
        documentRef: e.documentNumber || `EXP-${e.id}`,
        operator: e.operator,
      });
    });

    // Add payments
    payments.forEach((p) => {
      let accName = 'Caixa Geral (Balcão Golf)';
      const m = String(p.method || '').toLowerCase();
      if (m.includes('transfer') || m.includes('bai')) accName = 'Banco BAI';
      else if (m.includes('bfa')) accName = 'Banco BFA';
      else if (m.includes('multi') || m.includes('tpa') || m.includes('express')) accName = 'Multicaixa Express';

      items.push({
        id: `pay-${p.id}`,
        rawId: p.id,
        type: 'entrada',
        date: p.paidAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        description: `[Recebimento] Mensalidade Cliente #${p.clientId} (${p.method})`,
        accountName: accName,
        amount: Number(p.amount || 0) + Number(p.penalty || 0),
        isReconciled: Boolean(p.isReconciled),
        documentRef: p.reference || `PAY-${p.id}`,
        operator: p.operator,
      });
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (recFilter === 'pending') return items.filter((i) => !i.isReconciled);
    if (recFilter === 'reconciled') return items.filter((i) => i.isReconciled);
    return items;
  }, [expenses, payments, recFilter]);

  // Budget spent calculations by category for the current month
  const currentMonthBudgets = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    const spentByCategory: Record<string, number> = {};

    expenses
      .filter((e) => e.date?.startsWith(currentMonthPrefix) && e.status !== 'cancelado')
      .forEach((e) => {
        const cat = e.category || 'outros';
        spentByCategory[cat] = (spentByCategory[cat] || 0) + Number(e.amount || 0);
      });

    return budgets.map((b: AnyRecord) => {
      const spent = spentByCategory[b.category] || 0;
      const limit = Number(b.monthlyBudget || 0);
      const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
      const isOver = spent > limit && limit > 0;
      const isNear = percentage >= 80 && !isOver;

      return {
        id: b.id,
        category: b.category,
        label: b.label,
        monthlyBudget: b.monthlyBudget,
        spent,
        percentage,
        isOver,
        isNear,
        remaining: Math.max(0, limit - spent),
      };
    });
  }, [budgets, expenses]);

  // Invalidate helper
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    qc.invalidateQueries({ queryKey: getListFinancialAccountsQueryKey() });
    qc.invalidateQueries({ queryKey: getListTransfersQueryKey() });
    qc.invalidateQueries({ queryKey: getListCategoryBudgetsQueryKey() });
    qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
  };

  // Escuta ativa de eventos de sincronização em tempo real (saídas, recebimentos, transferências, nuvem)
  React.useEffect(() => {
    const handleSyncUpdate = () => {
      refreshAll();
    };

    window.addEventListener('osdel-expenses-updated', handleSyncUpdate);
    window.addEventListener('osdel-financial-accounts-updated', handleSyncUpdate);
    window.addEventListener('osdel-payments-updated', handleSyncUpdate);
    window.addEventListener('osdel-account-transfers-updated', handleSyncUpdate);
    window.addEventListener('osdel-data-sync', handleSyncUpdate);
    window.addEventListener('osdel-sync-change', handleSyncUpdate);
    window.addEventListener('storage', handleSyncUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('osdel_sync_channel');
        bc.onmessage = () => {
          refreshAll();
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('osdel-expenses-updated', handleSyncUpdate);
      window.removeEventListener('osdel-financial-accounts-updated', handleSyncUpdate);
      window.removeEventListener('osdel-payments-updated', handleSyncUpdate);
      window.removeEventListener('osdel-account-transfers-updated', handleSyncUpdate);
      window.removeEventListener('osdel-data-sync', handleSyncUpdate);
      window.removeEventListener('osdel-sync-change', handleSyncUpdate);
      window.removeEventListener('storage', handleSyncUpdate);
      if (bc) bc.close();
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--primary))]">
            <ShieldCheck size={14} />
            <span>Módulo Financeiro & Gestão de Contas</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[hsl(var(--foreground))]">
            Contas & Tesouraria
          </h1>
          <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Acompanhe o saldo consolidado, livros de caixa, contas bancárias BAI/BFA, saídas operacionais e conciliações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            id="btn-goto-closures"
            href="/contabilidade"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
          >
            <Calendar size={15} />
            <span>Fechos Mensais</span>
          </a>

          <button
            id="btn-print-treasury"
            onClick={() => triggerPrint()}
            className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-semibold text-[hsl(var(--foreground))] shadow-xs hover:bg-[hsl(var(--accent)/0.08)] transition-all"
          >
            <Printer size={15} />
            <span>Imprimir Balancete</span>
          </button>

          <button
            id="btn-new-transfer"
            onClick={() => setShowTransferModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
          >
            <ArrowRightLeft size={15} />
            <span>Transferência Inter-Contas</span>
          </button>

          <button
            id="btn-new-expense"
            onClick={() => {
              setEditingExpense(null);
              setShowExpenseModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:opacity-90 transition-all"
          >
            <Plus size={16} />
            <span>Registar Saída / Despesa</span>
          </button>
        </div>
      </div>

      {/* Global Liquidity & Balances Banner */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Consolidado */}
        <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-xs">
          <div className="flex items-center justify-between opacity-85">
            <span className="text-xs font-bold uppercase tracking-wider">Saldo Consolidado</span>
            <Wallet size={18} />
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">
            {kz(metrics.totalConsolidated)}
          </div>
          <p className="mt-1 text-[11px] opacity-80">
            Caixa + Bancos + TPA + Piquete
          </p>
        </div>

        {/* Dinheiro em Caixa */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
            <span className="text-xs font-semibold uppercase tracking-wider">Caixa Físico</span>
            <Coins size={18} className="text-emerald-600" />
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-black text-[hsl(var(--foreground))]">
            {kz(metrics.totalCash)}
          </div>
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            Balcão de Atendimento Golf II
          </p>
        </div>

        {/* Bancos (BAI + BFA) */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
            <span className="text-xs font-semibold uppercase tracking-wider">Disponível em Bancos</span>
            <Building2 size={18} className="text-blue-600" />
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
            {kz(metrics.totalBanks)}
          </div>
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            Contas BAI e BFA Activas
          </p>
        </div>

        {/* Multicaixa / TPA Express */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
            <span className="text-xs font-semibold uppercase tracking-wider">Multicaixa / TPA</span>
            <CreditCard size={18} className="text-purple-600" />
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
            {kz(metrics.totalTpa)}
          </div>
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            Terminal POS & Gateway Express
          </p>
        </div>

        {/* Fundo de Piquete Técnico */}
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[hsl(var(--muted-foreground))]">
            <span className="text-xs font-semibold uppercase tracking-wider">Fundo de Piquete</span>
            <Wrench size={18} className="text-amber-600" />
          </div>
          <div className="mt-3 text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {kz(metrics.totalFloat)}
          </div>
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            Equipa técnica & emergências
          </p>
        </div>
      </div>

      {/* Secondary Ribbon: Month Inflows, Outflows and Reconciliation Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-4 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ArrowDownLeft size={16} />
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Entradas este Mês:</span>
              <span className="ml-1.5 font-bold text-emerald-700 dark:text-emerald-400">{kz(metrics.monthPayments)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              <ArrowUpRight size={16} />
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Saídas este Mês:</span>
              <span className="ml-1.5 font-bold text-rose-700 dark:text-rose-400">{kz(metrics.monthExpenses)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <TrendingUp size={16} />
            </div>
            <div>
              <span className="text-[hsl(var(--muted-foreground))]">Saldo Líquido Operacional:</span>
              <span className={`ml-1.5 font-black ${metrics.netOperational >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                {kz(metrics.netOperational)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-[hsl(var(--muted-foreground))]">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>Taxa de Conciliação:</span>
            <span className="font-black text-[hsl(var(--foreground))]">{metrics.reconciliationRate}%</span>
          </div>
          <button
            onClick={() => refreshAll()}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            title="Actualizar dados"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-[hsl(var(--border))] space-x-1 sm:space-x-4 overflow-x-auto pb-px">
        <button
          id="tab-contas"
          onClick={() => setActiveTab('contas')}
          className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'contas'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Building2 size={16} />
          <span>Livro de Contas & Bancos ({accounts.length})</span>
        </button>

        <button
          id="tab-despesas"
          onClick={() => setActiveTab('despesas')}
          className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'despesas'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <TrendingDown size={16} />
          <span>Despesas & Saídas ({expenses.length})</span>
        </button>

        <button
          id="tab-transferencias"
          onClick={() => setActiveTab('transferencias')}
          className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'transferencias'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <ArrowRightLeft size={16} />
          <span>Transferências & Sangrias ({transfers.length})</span>
        </button>

        <button
          id="tab-conciliacao"
          onClick={() => setActiveTab('conciliacao')}
          className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'conciliacao'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <CheckCircle2 size={16} />
          <span>Conciliação Bancária</span>
        </button>

        <button
          id="tab-orcamentos"
          onClick={() => setActiveTab('orcamentos')}
          className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'orcamentos'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <PieChart size={16} />
          <span>Tetos de Orçamento ({budgets.length})</span>
        </button>
      </div>

      {/* TAB 1: LIVRO DE CONTAS & CAIXAS */}
      {activeTab === 'contas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[hsl(var(--foreground))]">Contas Financeiras e Caixas Activos</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Monitore o saldo em tempo real de cada conta com base nas entradas, despesas e transferências vinculadas.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAccount(null);
                setShowAccountModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.08)] shadow-xs transition-all"
            >
              <Plus size={14} />
              <span>Nova Conta Financeira</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => {
              const bal = accountBalances[acc.id] || { current: acc.initialBalance || 0, totalIn: 0, totalOut: 0 };
              const isSelected = selectedAccountForStatement === acc.id;

              return (
                <div
                  key={acc.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-[hsl(var(--card))] p-5 shadow-xs transition-all hover:shadow-md ${
                    isSelected ? 'border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/0.2)]' : 'border-[hsl(var(--border))]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-xs ${
                            acc.type === 'caixa'
                              ? 'bg-emerald-600'
                              : acc.type === 'banco'
                              ? acc.name.includes('BFA')
                                ? 'bg-amber-600'
                                : 'bg-blue-600'
                              : acc.type === 'tpa'
                              ? 'bg-purple-600'
                              : 'bg-cyan-600'
                          }`}
                        >
                          {acc.type === 'caixa' && <Coins size={20} />}
                          {acc.type === 'banco' && <Building2 size={20} />}
                          {acc.type === 'tpa' && <CreditCard size={20} />}
                          {acc.type === 'fundo_maneio' && <Wrench size={20} />}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-[hsl(var(--foreground))] leading-tight">
                            {acc.name}
                          </h3>
                          <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                            {acc.code} · {(acc.type || 'caixa').toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingAccount(acc);
                            setShowAccountModal(true);
                          }}
                          className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                          title="Editar conta"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Bank Details */}
                    {acc.iban && (
                      <div className="mt-3.5 rounded-lg bg-[hsl(var(--muted)/0.5)] p-2.5 text-[11px] font-mono">
                        <div className="text-[hsl(var(--muted-foreground))] text-[10px]">IBAN Angolano:</div>
                        <div className="font-bold text-[hsl(var(--foreground))] tracking-wide select-all">{acc.iban}</div>
                        {acc.accountNumber && (
                          <div className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                            N.º Conta: <span className="font-semibold text-[hsl(var(--foreground))]">{acc.accountNumber}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {acc.description && (
                      <p className="mt-2.5 text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
                        {acc.description}
                      </p>
                    )}

                    {/* Current Balance */}
                    <div className="mt-4 border-t border-[hsl(var(--border))] pt-3.5">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-[hsl(var(--muted-foreground))]">
                        Saldo Disponível
                      </div>
                      <div className={`mt-0.5 text-2xl font-black ${bal.current >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {kz(bal.current)}
                      </div>
                    </div>

                    {/* Inflow vs Outflow Mini-Ledger */}
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[hsl(var(--muted)/0.3)] p-2 text-[11px]">
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))]">Entradas:</span>
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">+{kz(bal.totalIn)}</div>
                      </div>
                      <div>
                        <span className="text-[hsl(var(--muted-foreground))]">Saídas:</span>
                        <div className="font-bold text-rose-600">-{kz(bal.totalOut)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3 text-xs">
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      Resp: <strong className="text-[hsl(var(--foreground))]">{acc.manager || 'Tesouraria'}</strong>
                    </span>

                    <button
                      onClick={() => setSelectedAccountForStatement(isSelected ? null : acc.id)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                        isSelected
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                          : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.1)]'
                      }`}
                    >
                      <Eye size={12} />
                      <span>{isSelected ? 'Ocultar Extrato' : 'Ver Extrato'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Account Statement Drawer / Section when an account is selected */}
          {selectedAccountForStatement && (
            <div className="rounded-2xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--card))] p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-bold">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[hsl(var(--foreground))]">
                      Extrato da Conta: {accounts.find((a) => a.id === selectedAccountForStatement)?.name}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Lançamentos de saídas, recebimentos e transferências atribuídos a esta conta.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAccountForStatement(null)}
                  className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Movements of this account */}
              {(() => {
                const acc = accounts.find((a) => a.id === selectedAccountForStatement);
                if (!acc) return null;

                const accExpenses = expenses.filter(
                  (e) => e.accountId === acc.id || e.account === acc.name
                );
                const accTransfersIn = transfers.filter((t) => t.toAccountId === acc.id);
                const accTransfersOut = transfers.filter((t) => t.fromAccountId === acc.id);

                const allMovements = [
                  ...accExpenses.map((e) => ({
                    id: `exp-${e.id}`,
                    type: 'saida',
                    date: e.date,
                    label: e.reason,
                    counterpart: e.supplier || 'Fornecedor Geral',
                    amount: -Number(e.amount || 0),
                    doc: e.documentNumber || `EXP-${e.id}`,
                  })),
                  ...accTransfersIn.map((t) => ({
                    id: `trf-in-${t.id}`,
                    type: 'transferencia_in',
                    date: t.date,
                    label: `Transferência Recebida: ${t.reason}`,
                    counterpart: `Origem: ${t.fromAccountName}`,
                    amount: Number(t.amount || 0),
                    doc: t.code,
                  })),
                  ...accTransfersOut.map((t) => ({
                    id: `trf-out-${t.id}`,
                    type: 'transferencia_out',
                    date: t.date,
                    label: `Transferência Enviada: ${t.reason}`,
                    counterpart: `Destino: ${t.toAccountName}`,
                    amount: -Number(t.amount || 0),
                    doc: t.code,
                  })),
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (allMovements.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                      Nenhuma movimentação direta registada para esta conta ainda.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">
                          <th className="py-2.5 px-3">Data</th>
                          <th className="py-2.5 px-3">Descrição do Movimento</th>
                          <th className="py-2.5 px-3">Contraparte / Ref</th>
                          <th className="py-2.5 px-3">Documento</th>
                          <th className="py-2.5 px-3 text-right">Valor (Kz)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[hsl(var(--border)/0.5)]">
                        {allMovements.map((m) => (
                          <tr key={m.id} className="hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                              {formatDate(m.date)}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[hsl(var(--foreground))]">{m.label}</td>
                            <td className="py-2.5 px-3 text-[hsl(var(--muted-foreground))]">{m.counterpart}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">{m.doc}</td>
                            <td className={`py-2.5 px-3 text-right font-bold ${m.amount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                              {m.amount >= 0 ? `+${kz(m.amount)}` : kz(m.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DESPESAS & CONTAS A PAGAR */}
      {activeTab === 'despesas' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:grid-cols-2 lg:grid-cols-5 shadow-xs">
            {/* Text Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Pesquisar motivo, fornecedor, NIF..."
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-9 pr-3 py-2 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-hidden focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]"
              >
                <option value="">Todas as Categorias</option>
                {Object.entries(CATEGORIES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Filter */}
            <div>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]"
              >
                <option value="">Todas as Contas de Saída</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]"
              >
                <option value="">Todos os Estados</option>
                <option value="pago">Pago / Liquidado</option>
                <option value="pendente">Pendente / Agendado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Period Filter */}
            <div>
              <select
                value={datePeriodFilter}
                onChange={(e) => setDatePeriodFilter(e.target.value as any)}
                className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-xs text-[hsl(var(--foreground))] focus:outline-hidden focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]"
              >
                <option value="all">Todo o Histórico</option>
                <option value="this_month">Este Mês</option>
                <option value="last_month">Mês Anterior</option>
                <option value="this_week">Últimos 7 Dias</option>
              </select>
            </div>
          </div>

          {/* Subheader: Filter summary & quick totals */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">
              Mostrando <strong>{filteredExpenses.length}</strong> de {expenses.length} despesas registadas
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[hsl(var(--muted-foreground))]">Total no filtro:</span>
              <span className="text-base font-black text-rose-600">{kz(filteredExpensesTotal)}</span>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4">Motivo / Fornecedor</th>
                    <th className="py-3.5 px-4">Documento</th>
                    <th className="py-3.5 px-4">Conta Débito</th>
                    <th className="py-3.5 px-4 text-right">Valor Líquido</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Conciliação</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.6)]">
                  {filteredExpenses.map((exp) => {
                    const catInfo = CATEGORIES[exp.category] || CATEGORIES.outros;

                    return (
                      <tr key={exp.id} className="hover:bg-[hsl(var(--muted)/0.25)] transition-colors">
                        {/* Data */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                          {formatDate(exp.date)}
                        </td>

                        {/* Categoria */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${catInfo.bg}`}
                          >
                            {catInfo.icon}
                            <span>{catInfo.label}</span>
                          </span>
                        </td>

                        {/* Motivo / Fornecedor */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[hsl(var(--foreground))]">{exp.reason}</div>
                          {exp.supplier && (
                            <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                              Fornecedor: <strong>{exp.supplier}</strong>
                              {exp.supplierNif && <span className="ml-1 font-mono">({exp.supplierNif})</span>}
                            </div>
                          )}
                        </td>

                        {/* Documento */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                          {exp.documentNumber || `EXP-${exp.id}`}
                        </td>

                        {/* Conta Débito */}
                        <td className="py-3.5 px-4 text-[hsl(var(--foreground))] font-medium whitespace-nowrap">
                          {exp.account}
                        </td>

                        {/* Valor Líquido */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-sm text-[hsl(var(--foreground))]">
                            {kz(exp.amount)}
                          </div>
                          {Number(exp.taxWithheld || 0) > 0 && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">
                              Ret. 6.5%: {kz(exp.taxWithheld)}
                            </div>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              exp.status === 'pago'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : exp.status === 'pendente'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}
                          >
                            {exp.status || 'pago'}
                          </span>
                        </td>

                        {/* Conciliação */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              toggleExpenseRec.mutate(
                                { expenseId: exp.id, reconciled: !exp.isReconciled },
                                { onSuccess: refreshAll }
                              );
                            }}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all ${
                              exp.isReconciled
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                            }`}
                            title="Clique para alternar conciliação"
                          >
                            <CheckCircle2 size={11} className={exp.isReconciled ? 'text-emerald-600' : 'text-zinc-400'} />
                            <span>{exp.isReconciled ? 'Conciliada' : 'Pendente'}</span>
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedVoucherExpense(exp);
                                setShowVoucherModal(true);
                              }}
                              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                              title="Imprimir Guia de Saída / Ordem de Pagamento"
                            >
                              <ReceiptText size={15} />
                            </button>

                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setShowExpenseModal(true);
                              }}
                              className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                              title="Editar despesa"
                            >
                              <Edit3 size={15} />
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Tem a certeza que deseja eliminar a despesa "${exp.reason}"?`)) {
                                  deleteExpense.mutate({ expenseId: exp.id }, { onSuccess: refreshAll });
                                }
                              }}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Eliminar despesa"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Nenhuma despesa encontrada para os critérios selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFERÊNCIAS & SANGRIAS */}
      {activeTab === 'transferencias' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[hsl(var(--foreground))]">
                Movimentação e Sangrias Inter-Contas
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Registo de transferências entre caixas e bancos (depósitos diários de receitas, reposição de fundos de piquete e remessas).
              </p>
            </div>
            <button
              onClick={() => setShowTransferModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-all"
            >
              <Plus size={15} />
              <span>Nova Transferência</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Conta de Origem</th>
                    <th className="py-3 px-4">Conta de Destino</th>
                    <th className="py-3 px-4">Motivo / Finalidade</th>
                    <th className="py-3 px-4">N.º Comprovativo</th>
                    <th className="py-3 px-4 text-right">Valor Transferido</th>
                    <th className="py-3 px-4 text-center">Operador</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.6)]">
                  {transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-[hsl(var(--muted)/0.25)] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {t.code}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-3 px-4 font-medium text-[hsl(var(--foreground))]">
                        <div className="flex items-center gap-1 text-rose-600">
                          <ArrowUpRight size={13} />
                          <span>{t.fromAccountName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[hsl(var(--foreground))]">
                        <div className="flex items-center gap-1 text-emerald-600">
                          <ArrowDownLeft size={13} />
                          <span>{t.toAccountName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[hsl(var(--foreground))] max-w-[280px]">
                        {t.reason}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {t.proofNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-sm text-[hsl(var(--foreground))]">
                        {kz(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-center text-[11px] text-[hsl(var(--muted-foreground))]">
                        @{t.operator || 'deezy'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Eliminar registo de transferência ${t.code}?`)) {
                              deleteTransfer.mutate({ transferId: t.id }, { onSuccess: refreshAll });
                            }
                          }}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Eliminar transferência"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {transfers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-xs text-[hsl(var(--muted-foreground))]">
                        Nenhuma transferência inter-contas registada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CONCILIAÇÃO BANCÁRIA */}
      {activeTab === 'conciliacao' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[hsl(var(--foreground))]">
                Painel de Conciliação e Conferência de Extratos
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Cruze os registos internos de recebimentos e saídas com os extratos das contas bancárias e terminais EMIS.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 text-xs font-semibold">
                <button
                  onClick={() => setRecFilter('all')}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    recFilter === 'all' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  Todas ({reconciliationItems.length})
                </button>
                <button
                  onClick={() => setRecFilter('pending')}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    recFilter === 'pending' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  Pendentes de Conferência
                </button>
                <button
                  onClick={() => setRecFilter('reconciled')}
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    recFilter === 'reconciled' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  Conciliadas
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Conta Bancária / Caixa</th>
                    <th className="py-3 px-4">Descrição do Lançamento</th>
                    <th className="py-3 px-4">Referência / Documento</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Estado Conferência</th>
                    <th className="py-3 px-4 text-right">Ação Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.6)]">
                  {reconciliationItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[hsl(var(--muted)/0.25)] transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.type === 'entrada'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {item.type === 'entrada' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                          <span>{item.type === 'entrada' ? 'Entrada' : 'Saída'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[hsl(var(--foreground))]">
                        {item.accountName}
                      </td>
                      <td className="py-3 px-4 text-[hsl(var(--foreground))]">
                        {item.description}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                        {item.documentRef || '—'}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${item.type === 'entrada' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {item.type === 'entrada' ? `+${kz(item.amount)}` : `-${kz(item.amount)}`}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            item.isReconciled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400'
                          }`}
                        >
                          {item.isReconciled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          <span>{item.isReconciled ? 'Conciliada no Extrato' : 'Aguardando Conferência'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            if (item.type === 'saida') {
                              toggleExpenseRec.mutate(
                                { expenseId: item.rawId, reconciled: !item.isReconciled },
                                { onSuccess: refreshAll }
                              );
                            } else {
                              togglePaymentRec.mutate(
                                { paymentId: item.rawId, reconciled: !item.isReconciled },
                                { onSuccess: refreshAll }
                              );
                            }
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all ${
                            item.isReconciled
                              ? 'border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <Check size={12} />
                          <span>{item.isReconciled ? 'Desmarcar' : 'Validar'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {reconciliationItems.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-[hsl(var(--muted-foreground))]">
                        Nenhum registo de conciliação para este filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ORÇAMENTOS POR CATEGORIA */}
      {activeTab === 'orcamentos' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-[hsl(var(--foreground))]">
                Tetos Orçamentários Mensais por Categoria
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Acompanhe o limite estipulado vs. gastos reais da operação no mês corrente e evite estouros de custos.
              </p>
            </div>
            <button
              onClick={() => setShowBudgetModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.08)] shadow-xs transition-all"
            >
              <Sliders size={14} />
              <span>Ajustar Tetos Orçamentários</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {currentMonthBudgets.map((b) => {
              const catInfo = CATEGORIES[b.category] || CATEGORIES.outros;

              return (
                <div
                  key={b.id}
                  className="flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--foreground))]">
                        <span className={`inline-flex rounded-md p-1 ${catInfo.bg}`}>{catInfo.icon}</span>
                        <span>{b.label}</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.isOver
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : b.isNear
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {b.percentage}%
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))]">Gasto este mês:</div>
                      <div className="text-xl font-black text-[hsl(var(--foreground))]">{kz(b.spent)}</div>
                      <div className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        Teto mensal: <strong>{kz(b.monthlyBudget)}</strong>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                      <div
                        className={`h-full transition-all duration-300 ${
                          b.isOver ? 'bg-rose-600' : b.isNear ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, b.percentage)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[hsl(var(--border))] pt-2.5 text-[11px]">
                    {b.isOver ? (
                      <span className="flex items-center gap-1 text-rose-600 font-semibold">
                        <AlertTriangle size={12} />
                        <span>Orçamento excedido por {kz(b.spent - Number(b.monthlyBudget))}</span>
                      </span>
                    ) : (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        Saldo disponível: <strong className="text-emerald-600">{kz(b.remaining)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAIS RICAS (DESPESA, TRANSFERÊNCIA, CONTA, COMPROVATIVO, ORÇAMENTO)
         ========================================================================= */}

      {/* 1. MODAL REGISTAR / EDITAR DESPESA */}
      {showExpenseModal && (
        <ExpenseFormModal
          isOpen={showExpenseModal}
          initialData={editingExpense}
          accounts={accounts}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
          onSave={(formData) => {
            if (editingExpense) {
              updateExpense.mutate(
                { expenseId: editingExpense.id, data: formData },
                {
                  onSuccess: () => {
                    refreshAll();
                    setShowExpenseModal(false);
                    setEditingExpense(null);
                  },
                }
              );
            } else {
              createExpense.mutate(
                { data: formData },
                {
                  onSuccess: () => {
                    refreshAll();
                    setShowExpenseModal(false);
                  },
                }
              );
            }
          }}
        />
      )}

      {/* 2. MODAL TRANSFERÊNCIA INTER-CONTAS */}
      {showTransferModal && (
        <TransferFormModal
          isOpen={showTransferModal}
          accounts={accounts}
          balances={accountBalances}
          onClose={() => setShowTransferModal(false)}
          onSave={(formData) => {
            createTransfer.mutate(
              { data: formData },
              {
                onSuccess: () => {
                  refreshAll();
                  setShowTransferModal(false);
                },
              }
            );
          }}
        />
      )}

      {/* 3. MODAL CRIAR / EDITAR CONTA FINANCEIRA */}
      {showAccountModal && (
        <AccountFormModal
          isOpen={showAccountModal}
          initialData={editingAccount}
          onClose={() => {
            setShowAccountModal(false);
            setEditingAccount(null);
          }}
          onSave={(formData) => {
            if (editingAccount) {
              updateAccount.mutate(
                { accountId: editingAccount.id, data: formData },
                {
                  onSuccess: () => {
                    refreshAll();
                    setShowAccountModal(false);
                    setEditingAccount(null);
                  },
                }
              );
            } else {
              createAccount.mutate(
                { data: formData },
                {
                  onSuccess: () => {
                    refreshAll();
                    setShowAccountModal(false);
                  },
                }
              );
            }
          }}
        />
      )}

      {/* 4. MODAL COMPROVATIVO / ORDEM DE SAÍDA IMPRIMÍVEL (VOUCHER) */}
      {showVoucherModal && selectedVoucherExpense && (
        <ExpenseVoucherModal
          expense={selectedVoucherExpense}
          settings={settings}
          onClose={() => {
            setShowVoucherModal(false);
            setSelectedVoucherExpense(null);
          }}
        />
      )}

      {/* 5. MODAL AJUSTAR TETOS ORÇAMENTÁRIOS */}
      {showBudgetModal && (
        <BudgetAdjustmentModal
          isOpen={showBudgetModal}
          budgets={budgets}
          onClose={() => setShowBudgetModal(false)}
          onSave={(updatedBudgets) => {
            updateBudgets.mutate(
              { data: updatedBudgets },
              {
                onSuccess: () => {
                  refreshAll();
                  setShowBudgetModal(false);
                },
              }
            );
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// COMPONENTES AUXILIARES DE MODAL
// -----------------------------------------------------------------------------

interface ExpenseModalProps {
  isOpen: boolean;
  initialData?: AnyRecord | null;
  accounts: AnyRecord[];
  onClose: () => void;
  onSave: (data: AnyRecord) => void;
}

function ExpenseFormModal({ initialData, accounts, onClose, onSave }: ExpenseModalProps) {
  const [form, setForm] = useState({
    date: initialData?.date || new Date().toISOString().slice(0, 10),
    amount: initialData?.amount || '',
    category: initialData?.category || 'material',
    reason: initialData?.reason || '',
    supplier: initialData?.supplier || '',
    supplierNif: initialData?.supplierNif || '',
    documentNumber: initialData?.documentNumber || '',
    accountId: initialData?.accountId || (accounts[0]?.id || 'acc-caixa'),
    paymentMethod: initialData?.paymentMethod || 'Dinheiro',
    applyTaxWithhold: Boolean(Number(initialData?.taxWithheld || 0) > 0),
    status: initialData?.status || 'pago',
    notes: initialData?.notes || '',
  });

  const selectedAccount = accounts.find((a) => a.id === form.accountId) || accounts[0];

  const parsedAmount = Number(form.amount || 0);
  const taxWithheldValue = form.applyTaxWithhold ? Math.round(parsedAmount * 0.065) : 0;
  const netPaidValue = parsedAmount - taxWithheldValue;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;

    onSave({
      ...form,
      amount: parsedAmount,
      taxWithheld: taxWithheldValue,
      account: selectedAccount ? selectedAccount.name : 'Caixa Geral',
      accountId: form.accountId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
              Registo de Despesa Operacional
            </span>
            <h3 className="text-lg font-black text-[hsl(var(--foreground))]">
              {initialData ? 'Editar Despesa' : 'Nova Saída Financeira'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Data da Despesa *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Valor Bruto (Kz) *</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Ex: 25000"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-bold text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Categoria de Custo *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
              >
                {Object.entries(CATEGORIES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Conta de Saída (Débito) *</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-medium text-[hsl(var(--foreground))]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Descrição / Motivo Detalhado *</label>
            <input
              type="text"
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Ex.: Aquisição de 100 conectores rápidos SC/APC e fita isoladora"
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Fornecedor / Beneficiário</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder="Ex.: Sonangol, AngoTelecom, ElectroGolf"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">NIF Fornecedor</label>
              <input
                type="text"
                value={form.supplierNif}
                onChange={(e) => setForm({ ...form, supplierNif: e.target.value })}
                placeholder="5401928410"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-mono text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">N.º da Factura / Recibo</label>
              <input
                type="text"
                value={form.documentNumber}
                onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
                placeholder="FT-2026/0891"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-mono text-[hsl(var(--foreground))]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Método de Pagamento</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
              >
                <option value="Dinheiro">Dinheiro (Numerário)</option>
                <option value="Multicaixa Express">Multicaixa Express</option>
                <option value="Transferência BAI">Transferência BAI</option>
                <option value="Transferência BFA">Transferência BFA</option>
                <option value="TPA">TPA Físico (Cartão)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Estado do Pagamento</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-bold text-[hsl(var(--foreground))]"
              >
                <option value="pago">Pago / Liquidado</option>
                <option value="pendente">Pendente / Agendado</option>
              </select>
            </div>
          </div>

          {/* Retenção na fonte 6.5% */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="apply-withhold"
                checked={form.applyTaxWithhold}
                onChange={(e) => setForm({ ...form, applyTaxWithhold: e.target.checked })}
                className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))]"
              />
              <label htmlFor="apply-withhold" className="text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer">
                Aplicar Retenção na Fonte de 6.5% (AGT Prestação de Serviços)
              </label>
            </div>

            {form.applyTaxWithhold && parsedAmount > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-[hsl(var(--border))]">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Imposto a Reter (DAR AGT):</span>
                  <div className="font-bold text-amber-600">{kz(taxWithheldValue)}</div>
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">Líquido a Pagar ao Fornecedor:</span>
                  <div className="font-black text-emerald-700 dark:text-emerald-400">{kz(netPaidValue)}</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Notas Internas & Observações</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ex.: Material adquirido para reposição imediata no Setor Palanca"
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:opacity-90"
            >
              <Check size={15} />
              <span>{initialData ? 'Actualizar Despesa' : 'Registar Saída'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TransferModalProps {
  isOpen: boolean;
  accounts: AnyRecord[];
  balances: Record<string, { current: number }>;
  onClose: () => void;
  onSave: (data: AnyRecord) => void;
}

function TransferFormModal({ accounts, balances, onClose, onSave }: TransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || 'acc-caixa');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || 'acc-bai');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Sangria de caixa - Depósito bancário de receitas');
  const [proofNumber, setProofNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);
  const availableBal = balances[fromAccountId]?.current || 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const val = Number(amount);
    if (!val || val <= 0) {
      setErrorMsg('Por favor informe um valor numérico válido superior a zero.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setErrorMsg('A conta de origem e a conta de destino não podem ser iguais.');
      return;
    }

    onSave({
      fromAccountId,
      fromAccountName: fromAcc ? fromAcc.name : 'Conta Origem',
      toAccountId,
      toAccountName: toAcc ? toAcc.name : 'Conta Destino',
      amount: val,
      date,
      reason,
      proofNumber: proofNumber || `TRF-${Date.now().toString().slice(-6)}`,
      status: 'concluido',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Movimento Interno
            </span>
            <h3 className="text-base font-black text-[hsl(var(--foreground))]">
              Transferência entre Contas / Sangria
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Conta de Origem (Débito) *</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-medium text-[hsl(var(--foreground))]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
              Saldo disponível nesta conta: <strong className="text-emerald-600">{kz(availableBal)}</strong>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Conta de Destino (Crédito) *</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-medium text-[hsl(var(--foreground))]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                  {acc.name} {acc.id === fromAccountId ? '(Conta Selecionada como Origem)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Valor a Transferir (Kz) *</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex: 50000"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-bold text-[hsl(var(--foreground))]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Data do Movimento *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Motivo / Finalidade *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Sangria para depósito bancário da receita diária"
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[hsl(var(--foreground))]">N.º do Talão de Depósito / Comprovativo</label>
            <input
              type="text"
              value={proofNumber}
              onChange={(e) => setProofNumber(e.target.value)}
              placeholder="Ex: TAL-BAI-9941"
              className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-mono text-[hsl(var(--foreground))]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border))] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[hsl(var(--border))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Check size={14} />
              <span>Executar Transferência</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AccountModalProps {
  isOpen: boolean;
  initialData?: AnyRecord | null;
  onClose: () => void;
  onSave: (data: AnyRecord) => void;
}

function AccountFormModal({ initialData, onClose, onSave }: AccountModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [type, setType] = useState(initialData?.type || 'banco');
  const [bankName, setBankName] = useState(initialData?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.accountNumber || '');
  const [iban, setIban] = useState(initialData?.iban || '');
  const [initialBalance, setInitialBalance] = useState(initialData?.initialBalance || '');
  const [manager, setManager] = useState(initialData?.manager || 'Administração OSDEL');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name,
      code: code || `ACC-${Date.now().toString().slice(-4)}`,
      type,
      bankName: type === 'banco' ? bankName : undefined,
      accountNumber,
      iban,
      initialBalance: Number(initialBalance || 0),
      currency: 'AOA',
      manager,
      description,
      status: 'active',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
              Configuração de Livros
            </span>
            <h3 className="text-base font-black text-[hsl(var(--foreground))]">
              {initialData ? 'Editar Conta Financeira' : 'Criar Nova Conta Financeira'}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Nome da Conta *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Banco BIC - Operações"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Tipo de Conta *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-bold text-[hsl(var(--foreground))]"
              >
                <option value="caixa">Caixa Físico / Balcão</option>
                <option value="banco">Conta Bancária</option>
                <option value="tpa">Terminal Multicaixa / TPA</option>
                <option value="fundo_maneio">Fundo de Maneio Técnico</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Código Interno</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex.: CX-02, BCO-BIC"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-mono text-[hsl(var(--foreground))]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Saldo Inicial de Abertura (Kz)</label>
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-bold text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          {type === 'banco' && (
            <>
              <div>
                <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Instituição Bancária</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ex.: Banco BIC Angola"
                  className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))]">IBAN Angolano</label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="AO06.0000.0000.0000.0000.0000.0"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-mono text-[hsl(var(--foreground))]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--foreground))]">N.º da Conta</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234567890"
                    className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-mono text-[hsl(var(--foreground))]"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Responsável / Gestor da Conta</label>
              <input
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                placeholder="Ex.: deezy (Tesouraria)"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Finalidade / Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição de utilização"
                className="mt-1 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs text-[hsl(var(--foreground))]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border))] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[hsl(var(--border))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:opacity-90"
            >
              <Check size={14} />
              <span>Guardar Conta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface VoucherModalProps {
  expense: AnyRecord;
  settings: AnyRecord;
  onClose: () => void;
}

function ExpenseVoucherModal({ expense, settings, onClose }: VoucherModalProps) {
  const cat = CATEGORIES[expense.category] || CATEGORIES.outros;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs printable-modal-overlay print:static print:p-0 print:bg-white print:z-auto print:block">
      <div className="w-full max-w-lg rounded-2xl border border-[hsl(var(--border))] bg-white p-6 text-slate-900 shadow-2xl dark:bg-zinc-950 dark:text-zinc-100 modal-printable-container print:max-w-none print:shadow-none print:border-none print:bg-white print:p-0">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <ReceiptText size={16} />
            <span>Guia Oficial de Saída de Caixa</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>

        {/* Printable Area */}
        <div id="printable-voucher" className="mt-4 space-y-4 rounded-xl border border-slate-200 p-5 bg-slate-50 dark:bg-zinc-900/50 dark:border-zinc-800 text-xs print:mt-0 print:border-none print:bg-white print:p-0">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
            <div>
              <div className="font-serif text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {settings.companyName || 'OSDEL TECNOLOGIA LDA'}
              </div>
              <p className="text-[10px] text-slate-500">
                NIF: 5417089214 · Luanda, Angola · Tel: {settings.companyPhone || '+244 923 000 000'}
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                GUIA-EXP/{String(expense.id).padStart(5, '0')}
              </span>
              <div className="text-[10px] text-slate-500">{formatDate(expense.date)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Conta de Saída:</span>
              <div className="font-bold text-slate-800 dark:text-zinc-200">{expense.account}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Método de Pagamento:</span>
              <div className="font-bold text-slate-800 dark:text-zinc-200">{expense.paymentMethod || 'Numerário'}</div>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Beneficiário / Fornecedor:</span>
            <div className="font-bold text-slate-800 dark:text-zinc-200">
              {expense.supplier || 'Particular / Equipa Interna'}
              {expense.supplierNif && <span className="ml-1 font-mono text-[10px] text-slate-500">({expense.supplierNif})</span>}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Descrição do Pagamento / Motivo:</span>
            <div className="mt-0.5 rounded-lg bg-white p-2.5 font-medium border border-slate-200 text-slate-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200">
              {expense.reason}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Categoria:</span>
              <div className="font-semibold text-slate-700 dark:text-zinc-300">{cat.label}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">N.º Documento Suporte:</span>
              <div className="font-mono font-bold text-slate-700 dark:text-zinc-300">{expense.documentNumber || '—'}</div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="rounded-xl bg-slate-900 p-4 text-white text-center dark:bg-black print:bg-slate-900 print:text-white">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Valor Total Liquidado</span>
            <div className="mt-1 text-2xl font-black">{kz(expense.amount)}</div>
            {Number(expense.taxWithheld || 0) > 0 && (
              <p className="mt-0.5 text-[10px] text-amber-400">
                (Inclui retenção na fonte 6.5%: {kz(expense.taxWithheld)})
              </p>
            )}
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-6 text-[11px] text-center">
            <div className="border-t border-slate-300 pt-1 dark:border-zinc-700">
              <span className="font-bold">O Operador / Tesoureiro</span>
              <div className="text-[10px] text-slate-400">@{expense.operator || 'deezy'}</div>
            </div>
            <div className="border-t border-slate-300 pt-1 dark:border-zinc-700">
              <span className="font-bold">O Beneficiário / Fornecedor</span>
              <div className="text-[10px] text-slate-400">Assinatura / Carimbo</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
          <a
            href={getPrintUrl('guia-saida', { id: expense.id })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
            title="Abre o documento numa nova aba sem qualquer restrição de iframe para impressão ou PDF"
          >
            <ExternalLink size={14} />
            <span>Abrir em Nova Aba (PDF)</span>
          </a>
          <button
            onClick={() => triggerPrint({ elementId: 'printable-voucher' })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Printer size={15} />
            <span>Imprimir Guia</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

interface BudgetModalProps {
  isOpen: boolean;
  budgets: AnyRecord[];
  onClose: () => void;
  onSave: (budgets: AnyRecord[]) => void;
}

function BudgetAdjustmentModal({ budgets, onClose, onSave }: BudgetModalProps) {
  const [formBudgets, setFormBudgets] = useState<AnyRecord[]>(budgets);

  const handleChange = (index: number, val: string) => {
    const updated = [...formBudgets];
    updated[index] = { ...updated[index], monthlyBudget: Number(val || 0) };
    setFormBudgets(updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(formBudgets);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
              Gestão Orçamental
            </span>
            <h3 className="text-base font-black text-[hsl(var(--foreground))]">
              Ajustar Tetos Mensais por Categoria
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Defina o teto financeiro mensal para controlar alertas visuais de consumo em cada rubrica operacional:
          </p>

          <div className="space-y-2.5">
            {formBudgets.map((b, idx) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-3 text-xs"
              >
                <div className="font-semibold text-[hsl(var(--foreground))]">{b.label}</div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={b.monthlyBudget}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    className="w-32 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1.5 text-right text-xs font-bold text-[hsl(var(--foreground))]"
                  />
                  <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">Kz</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--border))] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[hsl(var(--border))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:opacity-90"
            >
              <Check size={14} />
              <span>Guardar Tetos</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
