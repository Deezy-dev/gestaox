import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  MapPin,
  PieChart,
  Printer,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
  Zap,
  Sparkles,
  Bot,
  Copy,
  Check,
  Share2,
  FileDown,
  Activity,
  AlertTriangle,
  Wallet,
  Building2,
  Coins,
  ReceiptText,
  Percent,
  RefreshCw,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  Tag,
} from 'lucide-react';
import {
  useListClients,
  useListPayments,
  useListExpenses,
  useListServiceOrders,
  useListUsers,
  useGetSettings,
  useGetReports,
  useListFinancialAccounts,
  getListFinancialAccountsQueryKey,
  getListPaymentsQueryKey,
  getListExpensesQueryKey,
  getListClientsQueryKey,
  getGetReportsQueryKey,
  session,
} from '@/lib/local-api';
import {
  Button,
  Field,
  Input,
  Select,
  Badge,
  Modal,
  PageHeader,
  kz,
  date,
  dateTime,
  serviceLabel,
} from '@/components/shared-ui';
import { MonthlyClosuresView } from '@/components/monthly-closures-view';
import { useServiceMode } from '@/lib/service-mode';

export function ReportsAdvancedPage() {
  const qc = useQueryClient();
  const { mode, meta } = useServiceMode();
  const currentSession = session();
  const isAdmin = currentSession?.role === 'admin';

  // Sincronização automática contínua em tempo real (nem precisa atualizar a página)
  useEffect(() => {
    const handleSync = () => {
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      qc.invalidateQueries({ queryKey: getListFinancialAccountsQueryKey() });
      qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetReportsQueryKey() });
    };

    window.addEventListener('osdel-payments-updated', handleSync);
    window.addEventListener('osdel-expenses-updated', handleSync);
    window.addEventListener('osdel-financial-accounts-updated', handleSync);
    window.addEventListener('osdel-clients-updated', handleSync);
    window.addEventListener('osdel-account-transfers-updated', handleSync);
    window.addEventListener('osdel-contracts-updated', handleSync);
    window.addEventListener('osdel-data-sync', handleSync);
    window.addEventListener('storage', handleSync);

    const interval = setInterval(handleSync, 4000);

    return () => {
      window.removeEventListener('osdel-payments-updated', handleSync);
      window.removeEventListener('osdel-expenses-updated', handleSync);
      window.removeEventListener('osdel-financial-accounts-updated', handleSync);
      window.removeEventListener('osdel-clients-updated', handleSync);
      window.removeEventListener('osdel-account-transfers-updated', handleSync);
      window.removeEventListener('osdel-contracts-updated', handleSync);
      window.removeEventListener('osdel-data-sync', handleSync);
      window.removeEventListener('storage', handleSync);
      clearInterval(interval);
    };
  }, [qc]);

  // Navigation tabs for report perspectives
  const [reportTab, setReportTab] = useState<'financeiro' | 'fechos_mensais' | 'clientes' | 'pdos' | 'operadores' | 'tecnico' | 'auditoria_ia'>('financeiro');
  const [aiCopied, setAiCopied] = useState(false);
  const [aiFocus, setAiFocus] = useState<'geral' | 'inadimplencia' | 'anomalias' | 'estrategia'>('geral');

  // Date filters
  const now = new Date();
  const [periodPreset, setPeriodPreset] = useState<'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'custom'>('mes');
  const [customStart, setCustomStart] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [customEnd, setCustomEnd] = useState(() => now.toISOString().slice(0, 10));

  // Secondary filters
  const [filterService, setFilterService] = useState('todos');
  const [filterMethod, setFilterMethod] = useState('todos');
  const [filterOperator, setFilterOperator] = useState('todos');
  const [filterAccount, setFilterAccount] = useState('todas');

  // Modal for official printing
  const [modalPrint, setModalPrint] = useState(false);

  // Queries
  const clientsQuery = useListClients({ serviceMode: mode || undefined });
  const paymentsQuery = useListPayments({ serviceMode: mode || undefined });
  const expensesQuery = useListExpenses();
  const accountsQuery = useListFinancialAccounts();
  const serviceOrdersQuery = useListServiceOrders({ serviceMode: mode || undefined });
  const usersQuery = useListUsers();
  const settingsQuery = useGetSettings();

  const clients: any[] = (Array.isArray(clientsQuery.data) ? clientsQuery.data : clientsQuery.data?.items) || [];
  const payments: any[] = (Array.isArray(paymentsQuery.data) ? paymentsQuery.data : paymentsQuery.data?.items) || [];
  const expenses: any[] = (Array.isArray(expensesQuery.data) ? expensesQuery.data : expensesQuery.data?.items) || [];
  const accounts: any[] = (Array.isArray(accountsQuery.data) ? accountsQuery.data : accountsQuery.data?.items) || [];
  const orders: any[] = (Array.isArray(serviceOrdersQuery.data) ? serviceOrdersQuery.data : serviceOrdersQuery.data?.items) || [];
  const users: any[] = usersQuery.data || [];
  const settings = settingsQuery.data || {};

  // Compute effective start and end dates
  const { startDate, endDate, periodLabel } = useMemo(() => {
    const todayStr = now.toISOString().slice(0, 10);
    if (periodPreset === 'hoje') {
      return {
        startDate: todayStr,
        endDate: todayStr,
        periodLabel: `Diário — ${new Intl.DateTimeFormat('pt-AO', { dateStyle: 'full' }).format(now)}`,
      };
    }
    if (periodPreset === 'semana') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return {
        startDate: d.toISOString().slice(0, 10),
        endDate: todayStr,
        periodLabel: 'Semanal — Últimos 7 dias',
      };
    }
    if (periodPreset === 'mes') {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return {
        startDate: monthStart,
        endDate: todayStr,
        periodLabel: `Mensal — ${new Intl.DateTimeFormat('pt-AO', { month: 'long', year: 'numeric' }).format(now)}`,
      };
    }
    if (periodPreset === 'trimestre') {
      const currentMonthNum = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonthNum / 3) * 3 + 1;
      const quarterStart = `${now.getFullYear()}-${String(quarterStartMonth).padStart(2, '0')}-01`;
      return {
        startDate: quarterStart,
        endDate: todayStr,
        periodLabel: `Trimestral — ${Math.floor(currentMonthNum / 3) + 1}º Trimestre de ${now.getFullYear()}`,
      };
    }
    if (periodPreset === 'ano') {
      return {
        startDate: `${now.getFullYear()}-01-01`,
        endDate: todayStr,
        periodLabel: `Exercício Fiscal de ${now.getFullYear()}`,
      };
    }
    return {
      startDate: customStart,
      endDate: customEnd,
      periodLabel: `Intervalo Customizado (${date(customStart)} até ${date(customEnd)})`,
    };
  }, [periodPreset, customStart, customEnd]);

  // Filtered Payments within date range and selected filters
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const pDate = p.paidAt ? p.paidAt.slice(0, 10) : '';
      if (pDate < startDate || pDate > endDate) return false;
      if (filterMethod !== 'todos' && p.method !== filterMethod) return false;
      if (filterOperator !== 'todos') {
        const op = p.operator || p.createdByName || 'deezy';
        if (op !== filterOperator) return false;
      }
      if (filterService !== 'todos') {
        const client = clients.find((c) => c.id === p.clientId);
        if (client && client.serviceType !== filterService) return false;
      }
      if (filterAccount !== 'todas') {
        let targetId = p.accountId || p.account_id;
        if (!targetId) {
          const m = String(p.method || '').toLowerCase();
          if (m.includes('bai') || m.includes('transfer')) targetId = 'acc-bai';
          else if (m.includes('bfa')) targetId = 'acc-bfa';
          else if (m.includes('multi') || m.includes('tpa') || m.includes('express')) targetId = 'acc-tpa';
          else targetId = 'acc-caixa';
        }
        if (String(targetId) !== String(filterAccount)) return false;
      }
      return true;
    });
  }, [payments, startDate, endDate, filterMethod, filterOperator, filterService, filterAccount, clients]);

  // Filtered Expenses within date range and selected account
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.status === 'cancelado') return false;
      const eDate = e.date ? e.date.slice(0, 10) : '';
      if (eDate < startDate || eDate > endDate) return false;
      if (filterAccount !== 'todas') {
        let targetId = e.accountId || e.account_id;
        if (!targetId) {
          const eAccName = String(e.account || '').toLowerCase();
          if (eAccName.includes('bai')) targetId = 'acc-bai';
          else if (eAccName.includes('bfa')) targetId = 'acc-bfa';
          else if (eAccName.includes('tpa') || eAccName.includes('multi') || eAccName.includes('express')) targetId = 'acc-tpa';
          else if (eAccName.includes('piquete') || eAccName.includes('fundo')) targetId = 'acc-piquete';
          else {
            const found = accounts.find((a) => a.name === e.account || a.id === e.account);
            targetId = found ? found.id : 'acc-caixa';
          }
        }
        if (String(targetId) !== String(filterAccount)) return false;
      }
      return true;
    });
  }, [expenses, startDate, endDate, filterAccount, accounts]);

  // Filtered Service Orders within date range
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const oDate = o.createdAt ? o.createdAt.slice(0, 10) : o.scheduledDate || '';
      return oDate >= startDate && oDate <= endDate;
    });
  }, [orders, startDate, endDate]);

  // Financial aggregates
  const totalReceita = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0) + Number(p.penalty || 0), 0);
  }, [filteredPayments]);

  const totalDespesas = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  const saldoOperacional = totalReceita - totalDespesas;

  // Total Real Consolidado de todas as contas em tesouraria
  const totalSaldoConsolidado = useMemo(() => {
    return accounts.reduce((acc, a) => acc + Number(a.currentBalance ?? a.initialBalance ?? 0), 0);
  }, [accounts]);

  // Estatísticas detalhadas de cada conta financeira no período selecionado
  const accountsPeriodStats = useMemo(() => {
    return accounts.map((acc) => {
      const accId = String(acc.id);
      const accName = String(acc.name || '').toLowerCase();

      // Entradas no período
      const inPeriod = payments.reduce((sum, p) => {
        const pDate = p.paidAt ? p.paidAt.slice(0, 10) : '';
        if (pDate < startDate || pDate > endDate) return sum;
        if (p.isHistoricalOnly || p.movementType === 'historico_migracao_sem_caixa') return sum;
        let targetId = p.accountId || p.account_id;
        if (!targetId) {
          const m = String(p.method || '').toLowerCase();
          if (m.includes('bai') || m.includes('transfer')) targetId = 'acc-bai';
          else if (m.includes('bfa')) targetId = 'acc-bfa';
          else if (m.includes('multi') || m.includes('tpa') || m.includes('express')) targetId = 'acc-tpa';
          else targetId = 'acc-caixa';
        }
        if (String(targetId) === accId || (accId === 'acc-caixa' && !targetId)) {
          return sum + Number(p.amount || 0) + Number(p.penalty || 0);
        }
        return sum;
      }, 0);

      // Saídas no período
      const outPeriod = expenses.reduce((sum, e) => {
        if (e.status === 'cancelado') return sum;
        const eDate = e.date ? e.date.slice(0, 10) : '';
        if (eDate < startDate || eDate > endDate) return sum;
        let targetId = e.accountId || e.account_id;
        if (!targetId) {
          const eAccName = String(e.account || '').toLowerCase();
          if (eAccName.includes('bai')) targetId = 'acc-bai';
          else if (eAccName.includes('bfa')) targetId = 'acc-bfa';
          else if (eAccName.includes('tpa') || eAccName.includes('multi') || eAccName.includes('express')) targetId = 'acc-tpa';
          else if (eAccName.includes('piquete') || eAccName.includes('fundo')) targetId = 'acc-piquete';
          else {
            const found = accounts.find((a) => a.name === e.account || a.id === e.account);
            targetId = found ? found.id : 'acc-caixa';
          }
        }
        if (String(targetId) === accId || (accId === 'acc-caixa' && (!targetId || targetId === 'acc-caixa'))) {
          return sum + Number(e.amount || 0);
        }
        return sum;
      }, 0);

      const liveBalance = Number(acc.currentBalance ?? acc.initialBalance ?? 0);
      const pctOfTotal = totalSaldoConsolidado > 0 ? (liveBalance / totalSaldoConsolidado) * 100 : 0;

      return {
        ...acc,
        liveBalance,
        inPeriod,
        outPeriod,
        netPeriod: inPeriod - outPeriod,
        pctOfTotal,
      };
    });
  }, [accounts, payments, expenses, startDate, endDate, totalSaldoConsolidado]);

  const totalAccountsInPeriod = useMemo(
    () => accountsPeriodStats.reduce((sum, a) => sum + (a.inPeriod || 0), 0),
    [accountsPeriodStats]
  );
  const totalAccountsOutPeriod = useMemo(
    () => accountsPeriodStats.reduce((sum, a) => sum + (a.outPeriod || 0), 0),
    [accountsPeriodStats]
  );

  // Breakdown by payment method
  const methodBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredPayments.forEach((p) => {
      const m = p.method || 'Multicaixa Express';
      const val = Number(p.amount || 0) + Number(p.penalty || 0);
      if (!map[m]) map[m] = { total: 0, count: 0 };
      map[m].total += val;
      map[m].count += 1;
    });
    return Object.entries(map).map(([method, data]) => ({
      method,
      total: data.total,
      count: data.count,
      pct: totalReceita > 0 ? (data.total / totalReceita) * 100 : 0,
    }));
  }, [filteredPayments, totalReceita]);

  // Breakdown by operator
  const operatorBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filteredPayments.forEach((p) => {
      const op = p.operator || p.createdByName || 'deezy';
      const val = Number(p.amount || 0) + Number(p.penalty || 0);
      if (!map[op]) map[op] = { total: 0, count: 0 };
      map[op].total += val;
      map[op].count += 1;
    });
    return Object.entries(map).map(([operator, data]) => ({
      operator,
      total: data.total,
      count: data.count,
      pct: totalReceita > 0 ? (data.total / totalReceita) * 100 : 0,
    }));
  }, [filteredPayments, totalReceita]);

  // Discriminação dos 7 Pilares Exigidos: Pró-rata dias, Contrato, Taxa, Mensalidade, Pagamentos Parciais, Multa e REN
  const movementsBreakdown = useMemo(() => {
    let prorataTotal = 0;
    let prorataCount = 0;

    let contratosTotal = 0;
    let contratosCount = 0;

    let taxasTotal = 0;
    let taxasCount = 0;

    let mensalidadesTotal = 0;
    let mensalidadesCount = 0;

    let parciaisTotal = 0;
    let parciaisDebtRemaining = 0;
    let parciaisCount = 0;

    let multasTotal = 0;
    let multasCount = 0;

    let renovacoesTotal = 0;
    let renovacoesCount = 0;

    filteredPayments.forEach((p) => {
      const amt = Number(p.amount || 0);
      const pen = Number(p.penalty || 0);
      const mType = String(p.movementType || p.type || '').toLowerCase();
      const notes = String(p.notes || p.description || '').toLowerCase();

      // 1. MULTAS (qualquer multa por mora)
      if (pen > 0) {
        multasTotal += pen;
        multasCount += 1;
      }

      // 2. PRÓ-RATA DIAS (dias restantes/proporcionais)
      const prorataAmt = Number(p.remainingDaysAmount || p.prorataAmount || p.remaining_days_amount || p.prorata_amount || 0);
      if (prorataAmt > 0) {
        prorataTotal += prorataAmt;
        prorataCount += 1;
      } else if (mType === 'prorata' || notes.includes('pró-rata') || notes.includes('prorata') || notes.includes('dias restantes')) {
        prorataTotal += amt;
        prorataCount += 1;
      }

      // 3. TAXAS (taxa de urgência, religação, transferência, derivação, etc.)
      const urgFee = Number(p.urgentInstallationFee || p.urgent_fee || 0);
      const feeAmount = Number(p.feeAmount || p.fee_amount || 0);
      if (urgFee > 0 || feeAmount > 0) {
        taxasTotal += (urgFee + feeAmount);
        taxasCount += 1;
      } else if (
        mType === 'taxa_urgencia' || mType === 'taxa_religacao' || mType === 'taxa_transferencia' ||
        mType === 'taxa_derivacao' || notes.includes('taxa de urgência') || notes.includes('taxa de religação') ||
        notes.includes('taxa de transferência') || notes.includes('taxa')
      ) {
        taxasTotal += amt;
        taxasCount += 1;
      }

      // 4. REN (RENOVAÇÃO / REATIVAÇÃO)
      const renFee = Number(p.renovationFee || p.renewalFee || p.renovation_fee || 0);
      if (renFee > 0) {
        renovacoesTotal += renFee;
        renovacoesCount += 1;
      } else if (
        mType === 'renovacao' || mType === 'renovacao_contrato' || mType === 'reativacao' ||
        notes.includes('renovação') || notes.includes('renovacao') || notes.includes('reativação') || notes.includes('reativacao')
      ) {
        renovacoesTotal += amt;
        renovacoesCount += 1;
      }

      // 5. CONTRATOS / ADESÃO
      else if (
        mType === 'adesao_contrato' || mType === 'contrato' ||
        notes.includes('adesão') || notes.includes('adesao') || notes.includes('contrato')
      ) {
        const contractBase = p.contractAmount ? Number(p.contractAmount) : Math.max(0, amt - urgFee - prorataAmt);
        contratosTotal += contractBase;
        contratosCount += 1;
      }

      // 6. PAGAMENTOS PARCIAIS (amortizações com saldo em aberto)
      else if (p.isPartial || (p.remainingBalance && Number(p.remainingBalance) > 0) || mType === 'pagamento_parcial') {
        parciaisTotal += amt;
        parciaisDebtRemaining += Number(p.remainingBalance || 0);
        parciaisCount += 1;
      }

      // 7. MENSALIDADES REGULARES
      else {
        mensalidadesTotal += amt;
        mensalidadesCount += 1;
      }
    });

    const totalDiscriminated = prorataTotal + contratosTotal + taxasTotal + mensalidadesTotal + parciaisTotal + multasTotal + renovacoesTotal;

    return {
      prorataTotal,
      prorataCount,
      contratosTotal,
      contratosCount,
      taxasTotal,
      taxasCount,
      mensalidadesTotal,
      mensalidadesCount,
      parciaisTotal,
      parciaisDebtRemaining,
      parciaisCount,
      multasTotal,
      multasCount,
      renovacoesTotal,
      renovacoesCount,
      totalDiscriminated,
    };
  }, [filteredPayments]);

  // PDO & Neighborhood breakdown
  const pdoBreakdown = useMemo(() => {
    const map: Record<string, { clients: number; paidSum: number; debtSum: number; active: number; late: number; suspended: number }> = {};
    clients.forEach((c) => {
      const pdo = c.pdoNumber || 'Sem PDO Definida';
      if (!map[pdo]) {
        map[pdo] = { clients: 0, paidSum: 0, debtSum: 0, active: 0, late: 0, suspended: 0 };
      }
      map[pdo].clients += 1;
      if (c.status === 'active') map[pdo].active += 1;
      else if (c.status === 'late') {
        map[pdo].late += 1;
        const penalty = new Date().getDate() >= 6 ? (Number(settings.latePenalty) || 1000) : 0;
        map[pdo].debtSum += Number(c.monthlyFee || 8500) + penalty;
      } else if (c.status === 'suspended') {
        map[pdo].suspended += 1;
        map[pdo].debtSum += Number(c.monthlyFee || 8500) * 2;
      }
    });

    filteredPayments.forEach((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      const pdo = client?.pdoNumber || 'Sem PDO Definida';
      if (map[pdo]) {
        map[pdo].paidSum += Number(p.amount || 0) + Number(p.penalty || 0);
      }
    });

    return Object.entries(map).map(([pdo, data]) => ({
      pdo,
      ...data,
    }));
  }, [clients, filteredPayments]);

  // Technical OS breakdown
  const techBreakdown = useMemo(() => {
    const counts = {
      instalacao: 0,
      corte: 0,
      religacao: 0,
      manutencao: 0,
      concluidas: 0,
      pendentes: 0,
    };
    filteredOrders.forEach((o) => {
      if (o.type === 'instalacao') counts.instalacao++;
      else if (o.type === 'corte') counts.corte++;
      else if (o.type === 'religacao') counts.religacao++;
      else if (o.type === 'manutencao') counts.manutencao++;

      if (o.status === 'completed' || o.status === 'concluida') counts.concluidas++;
      else counts.pendentes++;
    });
    return counts;
  }, [filteredOrders]);

  // CSV Export utility
  const exportToCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `RELATÓRIO OFICIAL OSDEL TECNOLOGIA\n`;
    csvContent += `Período: ${periodLabel}\n`;
    csvContent += `Gerado em: ${dateTime(new Date().toISOString())}\n\n`;

    csvContent += `Documento;Cliente;Data;Valor;Multa;Total;Metodo;Operador\n`;
    filteredPayments.forEach((p) => {
      const c = clients.find((x) => x.id === p.clientId);
      const doc = p.receiptNumber || `FT-${String(p.id).padStart(5, '0')}`;
      const total = Number(p.amount || 0) + Number(p.penalty || 0);
      csvContent += `${doc};"${c?.fullName || '—'}";${date(p.paidAt)};${p.amount};${p.penalty || 0};${total};"${p.method || 'MCX'}";"${p.operator || 'deezy'}"\n`;
    });

    csvContent += `\nRESUMO FINANCEIRO\n`;
    csvContent += `Receita Total;${totalReceita}\n`;
    csvContent += `Total Despesas;${totalDespesas}\n`;
    csvContent += `Saldo Operacional;${saldoOperacional}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OSDEL_Relatorio_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // AUDITORIA FINANCEIRA & PARECER EXECUTIVO GERENCIAL COM INTELIGÊNCIA ARTIFICIAL
  // =========================================================================
  const aiAuditAnalysis = useMemo(() => {
    const totalPaymentsCount = filteredPayments.length;
    const ticketMedio = totalPaymentsCount > 0 ? totalReceita / totalPaymentsCount : 0;

    // Inadimplência
    const totalClientsCount = clients.length;
    const activeClients = clients.filter((c) => c.status === 'active').length;
    const lateClients = clients.filter((c) => c.status === 'late').length;
    const suspendedClients = clients.filter((c) => c.status === 'suspended').length;
    const adimplenciaRate = totalClientsCount > 0 ? Math.round((activeClients / totalClientsCount) * 100) : 100;
    const inadimplenciaRate = 100 - adimplenciaRate;

    // Métodos de Pagamento
    const methodCounts: Record<string, { count: number; total: number }> = {};
    filteredPayments.forEach((p) => {
      const m = p.method || 'Multicaixa Express';
      if (!methodCounts[m]) methodCounts[m] = { count: 0, total: 0 };
      methodCounts[m].count += 1;
      methodCounts[m].total += Number(p.amount || 0) + Number(p.penalty || 0);
    });

    // Anomalias Detectadas
    const anomalies: Array<{ type: string; severity: 'alta' | 'media' | 'baixa'; title: string; description: string; count?: number }> = [];

    // 1. Pagamentos sem referência formal
    const withoutFormalRef = filteredPayments.filter((p) => {
      const ref = String(p.reference || p.receiptNumber || '').trim();
      return !ref || ref.length < 4 || ref.startsWith('REC-AUTO-');
    });
    if (withoutFormalRef.length > 0) {
      anomalies.push({
        type: 'sem_comprovativo_formal',
        severity: 'media',
        title: 'Recibos com Referência Provisória ou Manual',
        description: `${withoutFormalRef.length} pagamentos foram liquidados sem número de referência bancária/TPA oficial de pelo menos 4 dígitos, necessitando de conciliação no extracto.`,
        count: withoutFormalRef.length,
      });
    }

    // 2. PDOs com alto índice de corte
    const criticalPdos = pdoBreakdown.filter(
      (p) => p.clients >= 2 && (p.late + p.suspended) / p.clients >= 0.25,
    );
    if (criticalPdos.length > 0) {
      anomalies.push({
        type: 'pdos_criticas',
        severity: 'alta',
        title: 'Concentração de Inadimplência Geográfica',
        description: `${criticalPdos.length} caixas PDO apresentam índice de incumprimento superior a 25%: ${criticalPdos.map((p) => p.pdo).join(', ')}.`,
        count: criticalPdos.length,
      });
    }

    // 3. Multas não cobradas em pagamentos após dia 5
    const lateWithoutPenalty = filteredPayments.filter((p) => {
      const d = p.paidAt ? new Date(p.paidAt).getDate() : 1;
      return d > 5 && (!p.penalty || Number(p.penalty) === 0);
    });
    if (lateWithoutPenalty.length > 0) {
      anomalies.push({
        type: 'multa_dispensada',
        severity: 'baixa',
        title: 'Isenções ou Dispensas de Multa por Atraso',
        description: `${lateWithoutPenalty.length} pagamentos realizados após o dia 5 foram registados com isenção da multa contratual de 1.000 Kz.`,
        count: lateWithoutPenalty.length,
      });
    }

    // Health Score (0 a 100)
    let score = 95;
    if (inadimplenciaRate > 20) score -= 15;
    else if (inadimplenciaRate > 10) score -= 8;
    if (anomalies.some((a) => a.severity === 'alta')) score -= 12;
    if (withoutFormalRef.length > 5) score -= 5;
    if (saldoOperacional < 0) score -= 25;
    score = Math.max(10, Math.min(100, score));

    // Formatted Narrative Executive Report
    const narrativeReport =
`📊 *RELATÓRIO EXECUTIVO & PARECER DE INTELIGÊNCIA ARTIFICIAL OSDEL*
Competência / Intervalo: ${periodLabel}
Data de Emissão: ${new Date().toLocaleDateString('pt-AO')} | Modo: ${meta.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 1. RESUMO GERAL DE ARRECADAÇÃO & RESULTADO
• Receita Bruta Total Arrecadada: ${kz(totalReceita)} (${totalPaymentsCount} liquidações)
• Ticket Médio por Assinante: ${kz(ticketMedio)}
• Despesas Operacionais Registadas: ${kz(totalDespesas)}
• Saldo Operacional Líquido do Período: ${kz(saldoOperacional)}
• Margem Operacional Líquida: ${totalReceita > 0 ? Math.round((saldoOperacional / totalReceita) * 100) : 0}%

📌 2. SAÚDE DA CARTEIRA & TAXA DE ADIMPLÊNCIA
• Clientes Activos e Regulares: ${activeClients} (${adimplenciaRate}%)
• Clientes em Atraso (1 a 2 mensalidades): ${lateClients}
• Clientes Suspensos (> 3 meses): ${suspendedClients}
• Índice Geral de Incumprimento: ${inadimplenciaRate}%
• Score Global de Eficiência da Carteira: ${score}/100 (${score >= 80 ? 'EXCELENTE' : score >= 60 ? 'BOM / ATENÇÃO' : 'CRÍTICO'})

📌 3. AUDITORIA DE CANAIS & MEIOS DE PAGAMENTO
${Object.entries(methodCounts)
  .map(([method, data]) => `• ${method}: ${kz(data.total)} (${data.count} pagamentos)`)
  .join('\n')}

📌 4. ANOMALIAS E PONTOS DE ATENÇÃO AUDITADOS
${
  anomalies.length > 0
    ? anomalies.map((a) => `• [${a.severity.toUpperCase()}] ${a.title}: ${a.description}`).join('\n')
    : '• Nenhuma inconsistência financeira grave detectada no período.'
}

📌 5. RECOMENDAÇÕES ESTRATÉGICAS DA IA
1. Acionar régua de cobrança preventiva via WhatsApp para as caixas ${criticalPdos.slice(0, 2).map((p) => p.pdo).join(' e ') || 'com atrasos pontuais'}.
2. Exigir o preenchimento de comprovativo de transferência bancária em 100% das liquidações manuais.
3. Intensificar migração de assinantes TV para planos Fibra, elevando o faturamento recorrente.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OSDEL TECNOLOGIA · Sistema Gestão X · Inteligência Artificial Integrada`;

    return {
      totalPaymentsCount,
      ticketMedio,
      totalClientsCount,
      activeClients,
      lateClients,
      suspendedClients,
      adimplenciaRate,
      inadimplenciaRate,
      score,
      methodCounts,
      anomalies,
      criticalPdos,
      narrativeReport,
    };
  }, [filteredPayments, filteredExpenses, totalReceita, totalDespesas, saldoOperacional, clients, pdoBreakdown, periodLabel, meta]);

  const copyAiReportToWhatsApp = () => {
    navigator.clipboard?.writeText(aiAuditAnalysis.narrativeReport);
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 2500);
  };

  const downloadAiReport = () => {
    const blob = new Blob([aiAuditAnalysis.narrativeReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OSDEL_Parecer_Executivo_IA_${startDate}_a_${endDate}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Auditoria & Finanças · Modo ${meta.shortName}`}
        title={`Relatórios & Business Intelligence (${meta.shortName})`}
        detail={`Auditoria executiva dos movimentos financeiros de ${meta.name}, índice de adimplência, desempenho de caixa por operador e métricas técnicas de campo.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setReportTab('auditoria_ia')}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={15} /> Parecer Executivo IA
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download size={15} /> Exportar CSV
            </Button>
            <Button onClick={() => setModalPrint(true)}>
              <Printer size={15} /> Imprimir Relatório Oficial (PDF)
            </Button>
          </div>
        }
      />

      {/* Date Preset Selector Toolbar */}
      <div className="surface rounded-2xl p-4 border border-[hsl(var(--border))] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'hoje', label: 'Hoje (Diário)' },
            { id: 'semana', label: '7 Dias' },
            { id: 'mes', label: 'Este Mês' },
            { id: 'trimestre', label: 'Trimestre' },
            { id: 'ano', label: 'Ano 2026' },
            { id: 'custom', label: 'Personalizado' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodPreset(p.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                periodPreset === p.id
                  ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)]'
              }`}
            >
              {p.label}
            </button>
          ))}

          {periodPreset === 'custom' && (
            <div className="flex items-center gap-2 pl-3">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs w-36"
              />
              <span className="text-xs text-slate-400">até</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="text-xs h-8 w-36"
          >
            <option value="todos">Todos Serviços</option>
            <option value="tv">TV por Cabo</option>
            <option value="internet">Internet Fibra</option>
            <option value="combo">Combo TV + Fibra</option>
          </Select>

          <Select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="text-xs h-8 w-44"
          >
            <option value="todos">Todos os Canais Pag.</option>
            <option value="Multicaixa Express">Multicaixa Express</option>
            <option value="Terminal TPA">Terminal TPA</option>
            <option value="Transferência Bancária (BAI/BFA)">Transf. Bancária</option>
            <option value="Numerário (Dinheiro)">Numerário</option>
          </Select>

          <Select
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            className="text-xs h-8 w-36"
          >
            <option value="todos">Todos Operadores</option>
            {users.map((u) => (
              <option key={u.id} value={u.username}>
                @{u.username}
              </option>
            ))}
          </Select>

          <Select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="text-xs h-8 w-44"
          >
            <option value="todas">Todas as Contas ({accounts.length})</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({kz(acc.currentBalance || 0)})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Receita Arrecadada
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-900">{kz(totalReceita)}</p>
          <small className="mt-1 block text-xs text-slate-500">
            {filteredPayments.length} pagamentos processados
          </small>
        </div>

        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a24e3a]">
              Despesas / Saídas
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-[#a24e3a]">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#a24e3a]">{kz(totalDespesas)}</p>
          <small className="mt-1 block text-xs text-slate-500">
            {filteredExpenses.length} saídas registradas
          </small>
        </div>

        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
              Resultado Líquido
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
              <DollarSign size={16} />
            </div>
          </div>
          <p
            className={`mt-3 text-2xl font-black ${
              saldoOperacional >= 0 ? 'text-[hsl(var(--primary))]' : 'text-[#a24e3a]'
            }`}
          >
            {kz(saldoOperacional)}
          </p>
          <small className="mt-1 block text-xs text-slate-500">
            Entradas deduzidas de custos
          </small>
        </div>

        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Ticket Médio Assinante
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Users size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">
            {filteredPayments.length > 0 ? kz(Math.round(totalReceita / filteredPayments.length)) : '0 Kz'}
          </p>
          <small className="mt-1 block text-xs text-slate-500">
            Média por recibo emitido
          </small>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3 overflow-x-auto">
        <button
          onClick={() => setReportTab('financeiro')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            reportTab === 'financeiro'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-slate-900'
          }`}
        >
          <DollarSign size={16} /> Extrato de Movimentos & Caixa
        </button>

        <button
          onClick={() => setReportTab('auditoria_ia')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            reportTab === 'auditoria_ia'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
          }`}
        >
          <Sparkles size={16} className={reportTab === 'auditoria_ia' ? 'text-amber-300' : 'text-indigo-600'} />
          <span>Auditoria & Parecer IA</span>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-200">
            Gemini
          </span>
        </button>

        <button
          onClick={() => setReportTab('fechos_mensais')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            reportTab === 'fechos_mensais'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <Calendar size={16} className={reportTab === 'fechos_mensais' ? 'text-white' : 'text-blue-600'} />
          <span>Fechos Mensais Oficiais</span>
        </button>

        <button
          onClick={() => setReportTab('pdos')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            reportTab === 'pdos'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-slate-900'
          }`}
        >
          <MapPin size={16} /> Mapa por PDO & Inadimplência
        </button>

        <button
          onClick={() => setReportTab('operadores')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            reportTab === 'operadores'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-slate-900'
          }`}
        >
          <UserCheck size={16} /> Produtividade de Operadores
        </button>

        <button
          onClick={() => setReportTab('tecnico')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            reportTab === 'tecnico'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-slate-900'
          }`}
        >
          <Wrench size={16} /> Piquete Técnico & Ordens de Campo
        </button>
      </div>

      {/* TAB 1: FINANCEIRO & EXTRATO */}
      {reportTab === 'financeiro' && (
        <div className="space-y-6">
          {/* SEÇÃO 1: SALDOS REAIS DE TODAS AS CONTAS FINANCEIRAS & TESOURARIA OFICIAL */}
          <div className="surface rounded-2xl p-5 border border-[hsl(var(--border))] space-y-5 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                  <Landmark size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                    <span>Saldos Reais de Todas as Contas Financeiras</span>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h4>
                  <p className="text-xs text-slate-500">
                    Saldos reais computados ao vivo em tempo real a partir de todas as entradas de clientes e saídas de despesas.
                  </p>
                </div>
              </div>

              {/* Botão para limpar filtro de conta se estiver ativo */}
              {filterAccount !== 'todas' && (
                <button
                  onClick={() => setFilterAccount('todas')}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Filter size={12} />
                  <span>Filtrando por: <b>{accounts.find(a => a.id === filterAccount)?.name || filterAccount}</b> (Ver Todas)</span>
                </button>
              )}
            </div>

            {/* Banner de Saldo Total Consolidado em Tesouraria */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Total Real Disponível em Tesouraria (Consolidado)
                  </span>
                </div>
                <div className="text-3xl font-black font-mono text-emerald-400">
                  {kz(totalSaldoConsolidado)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Soma dos saldos em dinheiro vivo no balcão e contas bancárias oficiais (BAI, BFA, TPA e Piquete).
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Entradas Período</span>
                  <b className="text-sm font-mono text-emerald-300 block">+{kz(totalReceita)}</b>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Saídas Período</span>
                  <b className="text-sm font-mono text-rose-300 block">-{kz(totalDespesas)}</b>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Resultado Líquido</span>
                  <b className={`text-sm font-mono font-bold block ${saldoOperacional >= 0 ? 'text-blue-300' : 'text-amber-400'}`}>
                    {kz(saldoOperacional)}
                  </b>
                </div>
              </div>
            </div>

            {/* Grid com todas as contas individuais */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {accountsPeriodStats.map((acc) => {
                const isSelected = filterAccount === acc.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => setFilterAccount(isSelected ? 'todas' : acc.id)}
                    className={`rounded-xl p-3.5 border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/40 shadow-sm'
                        : 'border-[hsl(var(--border))] bg-white dark:bg-slate-900/60 hover:border-slate-400 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate pr-1" title={acc.name}>
                          {acc.name}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {acc.type === 'banco' ? 'Banco' : acc.type === 'tpa' ? 'TPA' : 'Caixa'}
                        </span>
                      </div>

                      <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                        {kz(acc.liveBalance)}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-0.5 text-[11px]">
                        <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                          <span>Entradas:</span>
                          <span className="font-mono font-bold">+{kz(acc.inPeriod)}</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                          <span>Saídas:</span>
                          <span className="font-mono font-bold">-{kz(acc.outPeriod)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 text-[10px] pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                          <span>Peso no Capital:</span>
                          <span className="font-bold">{acc.pctOfTotal.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 text-right">
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-700 underline' : 'text-slate-400 hover:text-slate-600'}`}>
                        {isSelected ? '✓ Filtrado no relatório' : 'Filtrar por esta conta →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 2: DISCRIMINAÇÃO OFICIAL DOS 7 PILARES EXIGIDOS */}
          <div className="surface rounded-2xl p-5 border border-[hsl(var(--border))] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[hsl(var(--border))] pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <span>Discriminação Oficial dos 7 Pilares de Receita</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Auditado OSDEL
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Pró-rata dias, Contrato, Taxa, Mensalidade, Pagamentos Parciais, Multa e REN (Renovações).
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                Total Arrecadado: {kz(totalReceita)}
              </span>
            </div>

            {/* Grid dos 7 Pilares de Receita */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {/* 1. PRÓ-RATA DIAS */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 dark:bg-purple-950/30 p-3.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-purple-900 dark:text-purple-200">
                      Pró-rata Dias
                    </span>
                    <Calendar size={13} className="text-purple-600" />
                  </div>
                  <b className="text-lg font-black text-purple-900 dark:text-purple-100 font-mono block mt-1">
                    {kz(movementsBreakdown.prorataTotal)}
                  </b>
                </div>
                <span className="text-[10.5px] text-purple-700 dark:text-purple-300 block">
                  {movementsBreakdown.prorataCount} diárias proporcionais (150 Kz/dia)
                </span>
              </div>

              {/* 2. CONTRATO */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-900 dark:text-blue-200">
                      Contrato
                    </span>
                    <FileText size={13} className="text-blue-600" />
                  </div>
                  <b className="text-lg font-black text-blue-900 dark:text-blue-100 font-mono block mt-1">
                    {kz(movementsBreakdown.contratosTotal)}
                  </b>
                </div>
                <span className="text-[10.5px] text-blue-700 dark:text-blue-300 block">
                  {movementsBreakdown.contratosCount} adesões contratuais
                </span>
              </div>

              {/* 3. TAXA */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200">
                      Taxa
                    </span>
                    <Zap size={13} className="text-amber-600" />
                  </div>
                  <b className="text-lg font-black text-amber-900 dark:text-amber-100 font-mono block mt-1">
                    {kz(movementsBreakdown.taxasTotal)}
                  </b>
                </div>
                <span className="text-[10.5px] text-amber-700 dark:text-amber-300 block">
                  {movementsBreakdown.taxasCount} taxas urgência e religação
                </span>
              </div>

              {/* 4. MENSALIDADE */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-900 dark:text-emerald-200">
                      Mensalidade
                    </span>
                    <CheckCircle2 size={13} className="text-emerald-600" />
                  </div>
                  <b className="text-lg font-black text-emerald-900 dark:text-emerald-100 font-mono block mt-1">
                    {kz(movementsBreakdown.mensalidadesTotal)}
                  </b>
                </div>
                <span className="text-[10.5px] text-emerald-700 dark:text-emerald-300 block">
                  {movementsBreakdown.mensalidadesCount} assinaturas regulares
                </span>
              </div>

              {/* 5. PAGAMENTOS PARCIAIS */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/60 dark:bg-orange-950/30 p-3.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-orange-900 dark:text-orange-200">
                      Pag. Parciais
                    </span>
                    <ReceiptText size={13} className="text-orange-600" />
                  </div>
                  <b className="text-lg font-black text-orange-900 dark:text-orange-100 font-mono block mt-1">
                    {kz(movementsBreakdown.parciaisTotal)}
                  </b>
                </div>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 block">
                  Resta: {kz(movementsBreakdown.parciaisDebtRemaining)} ({movementsBreakdown.parciaisCount} amort.)
                </span>
              </div>

              {/* 6. MULTA */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:bg-rose-950/30 p-3.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-rose-900 dark:text-rose-200">
                      Multa
                    </span>
                    <AlertTriangle size={13} className="text-rose-600" />
                  </div>
                  <b className="text-lg font-black text-rose-900 dark:text-rose-100 font-mono block mt-1">
                    {kz(movementsBreakdown.multasTotal)}
                  </b>
                </div>
                <span className="text-[10.5px] text-rose-700 dark:text-rose-300 block">
                  {movementsBreakdown.multasCount} multas pós-vencimento (dia 5)
                </span>
              </div>

              {/* 7. REN (RENOVAÇÃO) */}
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 dark:bg-cyan-950/30 p-3.5 space-y-1.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-cyan-900 dark:text-cyan-200">
                      REN
                    </span>
                    <RefreshCw size={13} className="text-cyan-600" />
                  </div>
                  <b className="text-lg font-black text-cyan-900 dark:text-cyan-100 font-mono block mt-1">
                    {kz(movementsBreakdown.renovacoesTotal)}
                  </b>
                </div>
                <span className="text-[10.5px] text-cyan-700 dark:text-cyan-300 block">
                  {movementsBreakdown.renovacoesCount} renovações & reativações
                </span>
              </div>
            </div>

            {/* Quadro Comparativo Analítico dos 7 Pilares de Receita */}
            <div className="mt-3 overflow-hidden rounded-xl border border-[hsl(var(--border))]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Pilar de Receita</th>
                    <th className="p-2.5">Descrição Operacional / Fiscal</th>
                    <th className="p-2.5 text-center">Transacções</th>
                    <th className="p-2.5 text-right">Valor Arrecadado (Kz)</th>
                    <th className="p-2.5 text-right">% da Receita Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  <tr>
                    <td className="p-2.5 font-bold text-purple-900 dark:text-purple-300">Pró-rata Dias</td>
                    <td className="p-2.5 text-slate-500">Dias de sinal restantes e proporcionais antes da 1.ª mensalidade cheia</td>
                    <td className="p-2.5 text-center font-mono">{movementsBreakdown.prorataCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{kz(movementsBreakdown.prorataTotal)}</td>
                    <td className="p-2.5 text-right font-mono">
                      {totalReceita > 0 ? ((movementsBreakdown.prorataTotal / totalReceita) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-blue-900 dark:text-blue-300">Contrato</td>
                    <td className="p-2.5 text-slate-500">Taxas de adesão, instalação e emissão de termo contratual</td>
                    <td className="p-2.5 text-center font-mono">{movementsBreakdown.contratosCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{kz(movementsBreakdown.contratosTotal)}</td>
                    <td className="p-2.5 text-right font-mono">
                      {totalReceita > 0 ? ((movementsBreakdown.contratosTotal / totalReceita) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-amber-900 dark:text-amber-300">Taxa</td>
                    <td className="p-2.5 text-slate-500">Comissões de urgência técnica (24h), religação de sinal e transferências</td>
                    <td className="p-2.5 text-center font-mono">{movementsBreakdown.taxasCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{kz(movementsBreakdown.taxasTotal)}</td>
                    <td className="p-2.5 text-right font-mono">
                      {totalReceita > 0 ? ((movementsBreakdown.taxasTotal / totalReceita) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-emerald-900 dark:text-emerald-300">Mensalidade</td>
                    <td className="p-2.5 text-slate-500">Assinaturas regulares integrais liquidadas no prazo regulamentar</td>
                    <td className="p-2.5 text-center font-mono">{movementsBreakdown.mensalidadesCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{kz(movementsBreakdown.mensalidadesTotal)}</td>
                    <td className="p-2.5 text-right font-mono">
                      {totalReceita > 0 ? ((movementsBreakdown.mensalidadesTotal / totalReceita) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-orange-900 dark:text-orange-300">Pagamentos Parciais</td>
                    <td className="p-2.5 text-slate-500">
                      Amortizações parciais de mensalidades (Dívida remanescente: {kz(movementsBreakdown.parciaisDebtRemaining)})
                    </td>
                    <td className="p-2.5 text-center font-mono">{movementsBreakdown.parciaisCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{kz(movementsBreakdown.parciaisTotal)}</td>
                    <td className="p-2.5 text-right font-mono">
                      {totalReceita > 0 ? ((movementsBreakdown.parciaisTotal / totalReceita) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-rose-900 dark:text-rose-300">Multa</td>
                    <td className="p-2.5 text-slate-500">Multas contratuais por mora aplicadas a pagamentos após o dia 5</td>
                    <td className="p-2.5 text-center font-mono">{movementsBreakdown.multasCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{kz(movementsBreakdown.multasTotal)}</td>
                    <td className="p-2.5 text-right font-mono">
                      {totalReceita > 0 ? ((movementsBreakdown.multasTotal / totalReceita) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-cyan-900 dark:text-cyan-300">REN</td>
                    <td className="p-2.5 text-slate-500">Renovação de contratos e reativação de clientes após corte prolongado (&gt;3 meses)</td>
                    <td className="p-2.5 text-center font-mono">{movementsBreakdown.renovacoesCount}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{kz(movementsBreakdown.renovacoesTotal)}</td>
                    <td className="p-2.5 text-right font-mono">
                      {totalReceita > 0 ? ((movementsBreakdown.renovacoesTotal / totalReceita) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <td className="p-2.5 uppercase tracking-wider" colSpan={2}>
                      TOTAL GERAL CONSOLIDADO DE ARRECADAÇÃO
                    </td>
                    <td className="p-2.5 text-center font-mono">{filteredPayments.length}</td>
                    <td className="p-2.5 text-right font-mono text-sm text-emerald-800 dark:text-emerald-400">
                      {kz(totalReceita)}
                    </td>
                    <td className="p-2.5 text-right font-mono">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Methods Breakdown Graphic Bar */}
          <div className="surface rounded-2xl p-5 border border-[hsl(var(--border))] space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Distribuição por Canal de Pagamento</h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {methodBreakdown.map((m) => (
                <div key={m.method} className="rounded-xl border border-[hsl(var(--border))] p-3.5 bg-[hsl(var(--secondary)/.3)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{m.method}</span>
                    <Badge tone="good">{m.pct.toFixed(1)}%</Badge>
                  </div>
                  <b className="mt-2 block text-lg font-mono text-[hsl(var(--primary))]">{kz(m.total)}</b>
                  <span className="text-[11px] text-slate-500">{m.count} transacções</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Movements Table */}
          <div className="surface rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
            <div className="p-4 bg-[hsl(var(--secondary)/.3)] border-b border-[hsl(var(--border))] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Lista Detalhada de Pagamentos e Movimentos</h4>
                <p className="text-xs text-slate-500">{periodLabel}</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                {filteredPayments.length} Registos Encontrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[hsl(var(--secondary)/.5)] text-xs uppercase font-bold text-slate-500 border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="p-3.5">Recibo / Doc.</th>
                    <th className="p-3.5">Assinante & Rua</th>
                    <th className="p-3.5">Tipo de Movimento</th>
                    <th className="p-3.5">Data Pagamento</th>
                    <th className="p-3.5">Canal / Método</th>
                    <th className="p-3.5 text-right">Valor Base</th>
                    <th className="p-3.5 text-right">Multa</th>
                    <th className="p-3.5 text-right font-black">Total Pago</th>
                    <th className="p-3.5 text-center">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500 text-sm">
                        Nenhum pagamento registrado dentro do período e filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => {
                      const c = clients.find((x) => x.id === p.clientId);
                      const total = Number(p.amount || 0) + Number(p.penalty || 0);
                      const mType = String(p.movementType || p.type || '').toLowerCase();
                      const notes = String(p.notes || p.description || '').toLowerCase();
                      const isContract = mType === 'adesao_contrato' || notes.includes('adesão') || notes.includes('adesao') || notes.includes('contrato');
                      const isPartial = p.isPartial || (p.remainingBalance && p.remainingBalance > 0);
                      const isRenewal = mType === 'renovacao' || notes.includes('renovação') || notes.includes('renovacao');

                      return (
                        <tr key={p.id} className="hover:bg-[hsl(var(--secondary)/.2)] transition">
                          <td className="p-3.5 font-mono text-xs font-bold text-blue-900">
                            {p.receiptNumber || `FT-${String(p.id).padStart(5, '0')}`}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block">{c?.fullName || 'Cliente Removido'}</span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <MapPin size={10} className="text-red-500" />
                              {c?.street || c?.address || 'Golf I'} · Casa {c?.houseCode || 'S/N'}
                            </span>
                          </td>
                          <td className="p-3.5 text-xs">
                            {isContract ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                Adesão Contrato
                              </span>
                            ) : isRenewal ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Renovação (10.000 Kz)
                              </span>
                            ) : isPartial ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                                  Pagamento Parcial
                                </span>
                                <span className="text-[10px] text-red-600 block font-bold">
                                  Resta: {kz(p.remainingBalance || 0)}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Mensalidade Regular
                              </span>
                            )}
                            {p.urgentInstallationFee ? (
                              <span className="mt-1 block text-[10px] font-bold text-amber-700">
                                +{kz(p.urgentInstallationFee)} Urgência ({p.urgentTechnicianName || 'Técnico'})
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3.5 text-xs font-mono">{date(p.paidAt)}</td>
                          <td className="p-3.5 text-xs">
                            <Badge tone="neutral">{p.method || 'Multicaixa'}</Badge>
                          </td>
                          <td className="p-3.5 text-right font-mono text-xs">{kz(p.amount)}</td>
                          <td className="p-3.5 text-right font-mono text-xs text-[#a24e3a]">
                            {p.penalty ? kz(p.penalty) : '—'}
                          </td>
                          <td className="p-3.5 text-right font-black font-mono text-sm text-[hsl(var(--primary))]">
                            {kz(total)}
                          </td>
                          <td className="p-3.5 text-center font-mono text-xs text-slate-600">
                            @{p.operator || p.createdByName || 'deezy'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MAPA POR PDO & INADIMPLÊNCIA */}
      {reportTab === 'pdos' && (
        <div className="space-y-6">
          <div className="surface rounded-2xl p-5 border border-[hsl(var(--border))]">
            <h4 className="text-base font-bold text-slate-800">Mapa Geográfico de Inadimplência por Caixa PDO</h4>
            <p className="text-xs text-slate-500 mt-1">
              Indicador de cobrança e índice de risco por zona da rede óptica/cabo da OSDEL Tecnologia.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pdoBreakdown.map((item) => {
              const defaultRate = item.clients > 0 ? ((item.late + item.suspended) / item.clients) * 100 : 0;
              return (
                <div key={item.pdo} className="surface rounded-2xl p-5 border border-[hsl(var(--border))] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      {item.pdo}
                    </span>
                    <Badge tone={defaultRate > 25 ? 'bad' : defaultRate > 10 ? 'warn' : 'good'}>
                      {defaultRate.toFixed(0)}% Inadimplente
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                    <div className="bg-slate-50 p-2 rounded-lg border">
                      <span className="text-slate-500 block text-[10px] uppercase">Assinantes</span>
                      <b className="text-sm font-black text-slate-900">{item.clients}</b>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <span className="text-emerald-700 block text-[10px] uppercase">Em Dia</span>
                      <b className="text-sm font-black text-emerald-800">{item.active}</b>
                    </div>
                    <div className="bg-rose-50 p-2 rounded-lg border border-rose-100">
                      <span className="text-[#a24e3a] block text-[10px] uppercase">Em Falta</span>
                      <b className="text-sm font-black text-[#a24e3a]">{item.late + item.suspended}</b>
                    </div>
                  </div>

                  <div className="pt-2 border-t text-xs flex justify-between">
                    <span className="text-slate-500">Dívida Pendente:</span>
                    <b className="font-mono text-red-700">{kz(item.debtSum)}</b>
                  </div>
                  <div className="text-xs flex justify-between">
                    <span className="text-slate-500">Receita no Período:</span>
                    <b className="font-mono text-emerald-700">{kz(item.paidSum)}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUTIVIDADE DE OPERADORES */}
      {reportTab === 'operadores' && (
        <div className="space-y-6">
          <div className="surface rounded-2xl p-5 border border-[hsl(var(--border))]">
            <h4 className="text-base font-bold text-slate-800">Desempenho & Arrecadação por Operador</h4>
            <p className="text-xs text-slate-500 mt-1">
              Volume arrecadado, recibos gerados e integridade de caixa por membro da equipa.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {operatorBreakdown.map((op) => (
              <div key={op.operator} className="surface rounded-2xl p-5 border border-[hsl(var(--border))] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--secondary))] font-mono font-bold text-lg text-[hsl(var(--primary))]">
                    {(op.operator || 'OP').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <b className="text-sm text-slate-900 block">@{op.operator}</b>
                    <span className="text-xs text-slate-500">Colaborador OSDEL</span>
                  </div>
                </div>

                <div className="p-3 bg-[hsl(var(--secondary)/.4)] rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Volume Total Cobrado:</span>
                    <b className="font-mono text-[hsl(var(--primary))] text-sm">{kz(op.total)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nº de Recibos Emitidos:</span>
                    <b className="font-mono text-slate-800">{op.count}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quota da Receita Global:</span>
                    <b className="font-mono text-emerald-700">{op.pct.toFixed(1)}%</b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PIQUETE TÉCNICO & ORDENS */}
      {reportTab === 'tecnico' && (
        <div className="space-y-6">
          <div className="surface rounded-2xl p-5 border border-[hsl(var(--border))]">
            <h4 className="text-base font-bold text-slate-800">Relatório de Operações Técnicas & Campo</h4>
            <p className="text-xs text-slate-500 mt-1">
              Desempenho de instalações, desconexões (cortes) e religações do sinal.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface rounded-xl p-4 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold text-slate-500 uppercase">Instalações Novas</span>
              <p className="text-2xl font-black text-slate-900 mt-2">{techBreakdown.instalacao}</p>
            </div>
            <div className="surface rounded-xl p-4 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold text-red-700 uppercase">Cortes Executados</span>
              <p className="text-2xl font-black text-red-700 mt-2">{techBreakdown.corte}</p>
            </div>
            <div className="surface rounded-xl p-4 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold text-emerald-700 uppercase">Religações Efectuadas</span>
              <p className="text-2xl font-black text-emerald-700 mt-2">{techBreakdown.religacao}</p>
            </div>
            <div className="surface rounded-xl p-4 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold text-blue-700 uppercase">Manutenções de Linha</span>
              <p className="text-2xl font-black text-blue-700 mt-2">{techBreakdown.manutencao}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: AUDITORIA & PARECER EXECUTIVO IA */}
      {reportTab === 'auditoria_ia' && (
        <div className="space-y-6">
          {/* Executive Header Banner */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold mb-3">
                  <Sparkles size={14} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>Auditor Financeiro & Motor Gemini 3.8 Flash Integrado</span>
                </div>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-white">
                  Parecer Executivo & Auditoria de Pagamentos
                </h3>
                <p className="mt-1 text-xs text-indigo-200 max-w-2xl leading-relaxed">
                  Diagnóstico analítico em tempo real com cruzamento de liquidações, arrecadação por canal bancário, detecção de transações anómalas e foco geográfico de recuperação de dívidas para o período <b>{periodLabel}</b>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={copyAiReportToWhatsApp}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer"
                  title="Copiar relatório formatado para enviar no WhatsApp da Direcção"
                >
                  {aiCopied ? <Check size={16} /> : <Share2 size={16} />}
                  <span>{aiCopied ? 'Copiado para Envio!' : 'Copiar p/ WhatsApp'}</span>
                </button>
                <button
                  type="button"
                  onClick={downloadAiReport}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer"
                  title="Baixar memorando executivo em ficheiro Markdown (.md)"
                >
                  <FileDown size={16} />
                  <span>Baixar Parecer (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalPrint(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Imprimir</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="mt-6 pt-6 border-t border-indigo-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-indigo-300 uppercase block">Score de Saúde Financeira</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{aiAuditAnalysis.score}</span>
                  <span className="text-xs text-indigo-300">/ 100</span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    aiAuditAnalysis.score >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {aiAuditAnalysis.score >= 80 ? 'Ótimo' : 'Atenção'}
                  </span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-indigo-300 uppercase block">Taxa de Adimplência</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400">{aiAuditAnalysis.adimplenciaRate}%</span>
                  <span className="text-xs text-indigo-300">({aiAuditAnalysis.activeClients} ativos)</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-indigo-300 uppercase block">Ticket Médio / Recibo</span>
                <div className="mt-1 text-2xl font-black text-white">
                  {kz(aiAuditAnalysis.ticketMedio)}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-indigo-300 uppercase block">Anomalias Auditadas</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${aiAuditAnalysis.anomalies.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {aiAuditAnalysis.anomalies.length}
                  </span>
                  <span className="text-xs text-indigo-300">pontos de atenção</span>
                </div>
              </div>
            </div>
          </div>

          {/* Perspective Filters */}
          <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-2 overflow-x-auto">
            <span className="text-xs font-bold text-[hsl(var(--muted-foreground))] mr-2">Foco Analítico:</span>
            {[
              { id: 'geral', label: 'Memorando Completo (WhatsApp/PDF)' },
              { id: 'anomalias', label: `Auditoria de Anomalias (${aiAuditAnalysis.anomalies.length})` },
              { id: 'inadimplencia', label: `Inadimplência por PDO (${aiAuditAnalysis.criticalPdos.length} críticas)` },
              { id: 'estrategia', label: 'Estratégia & Recomendações' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAiFocus(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  aiFocus === f.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* VIEW: MEMORANDO COMPLETO */}
          {aiFocus === 'geral' && (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
              <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="text-indigo-600" size={18} />
                    <h4 className="font-bold text-sm text-[hsl(var(--foreground))]">
                      Parecer Gerencial Oficial Formatado
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={copyAiReportToWhatsApp}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {aiCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{aiCopied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap select-all border border-slate-800 shadow-inner">
                  {aiAuditAnalysis.narrativeReport}
                </div>
              </div>

              {/* Sidebar Quick Breakdown */}
              <div className="space-y-4">
                <div className="surface rounded-2xl border border-[hsl(var(--border))] p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Distribuição por Canal de Pagamento
                  </h4>
                  <div className="space-y-2 pt-2">
                    {Object.entries(aiAuditAnalysis.methodCounts).map(([method, data]) => {
                      const pct = totalReceita > 0 ? Math.round((data.total / totalReceita) * 100) : 0;
                      return (
                        <div key={method} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{method}</span>
                            <span className="font-bold text-slate-900 dark:text-white">{kz(data.total)} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="surface rounded-2xl border border-[hsl(var(--border))] p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Diretrizes de Auditoria OSDEL
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Todas as liquidações devem ter número de talão MCX ou referência bancária.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Pagamentos após dia 5 exigem cobrança da multa de 1.000 Kz salvo autorização formal.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      <span>Caixas PDO com mais de 25% de atraso entram na rota prioritária do piquete.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ANOMALIAS AUDITADAS */}
          {aiFocus === 'anomalias' && (
            <div className="space-y-4">
              <div className="surface rounded-2xl border border-[hsl(var(--border))] p-5">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  Inconsistências & Riscos Operacionais Detectados no Período
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  O motor de auditoria analisa a conformidade das liquidações, referências e prazos contratuais.
                </p>

                {aiAuditAnalysis.anomalies.length > 0 ? (
                  <div className="space-y-3">
                    {aiAuditAnalysis.anomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl p-4 border flex items-start gap-3 ${
                          anom.severity === 'alta'
                            ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200'
                            : anom.severity === 'media'
                            ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
                            : 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          anom.severity === 'alta' ? 'bg-rose-600 text-white' : anom.severity === 'media' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                          <AlertTriangle size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <b className="text-xs font-bold">{anom.title}</b>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              anom.severity === 'alta'
                                ? 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-100'
                                : anom.severity === 'media'
                                ? 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
                                : 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                            }`}>
                              Severidade {anom.severity}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed opacity-90">{anom.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-emerald-600 font-bold bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-600" />
                    Parabéns! Nenhuma anomalia financeira ou inconsistência documental encontrada nos pagamentos deste período.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: INADIMPLÊNCIA POR PDO */}
          {aiFocus === 'inadimplencia' && (
            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-5 space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Caixas PDO com Maior Concentração de Risco Financeiro
                </h4>
                <p className="text-xs text-slate-500">
                  Zonas prioritárias para envio de lembretes prévios e escalonamento de piquete de corte.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pdoBreakdown.slice(0, 6).map((item) => {
                  const rate = item.clients > 0 ? Math.round(((item.late + item.suspended) / item.clients) * 100) : 0;
                  return (
                    <div key={item.pdo} className="p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] space-y-2">
                      <div className="flex items-center justify-between">
                        <b className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.pdo}</b>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rate > 25 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rate}% Atraso
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <div>Total Assinantes: <b>{item.clients}</b></div>
                        <div>Em Atraso / Suspensos: <b className="text-rose-600">{item.late + item.suspended}</b></div>
                        <div>Arrecadado no Período: <b className="text-emerald-700">{kz(item.paidSum)}</b></div>
                        <div>Volume em Risco: <b className="text-amber-700">{kz(item.debtSum)}</b></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW: ESTRATÉGIA & RECOMENDAÇÕES */}
          {aiFocus === 'estrategia' && (
            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Recomendações Táticas do Assistente Gerencial IA
              </h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                    <Activity size={16} /> Cobrança Automatizada
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Disparar mensagens de cortesia nos dias 1 e 3 do mês via WhatsApp e SMS com a referência Multicaixa Express, reduzindo o índice de atraso em até 40%.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                    <TrendingUp size={16} /> Upselling & Migração
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Oferecer aos clientes que consom apenas TV a adesão ao Combo Fibra Óptica 10 Mbps por 6.500 Kz/mês, gerando incremento na receita média mensal por utilizador (ARPU).
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
                    <ShieldCheck size={16} /> Conciliação Rigorosa
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Vincular todas as transferências bancárias ao extracto bancário oficial semanalmente, evitando desvios ou lançamentos com referências inválidas.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: HISTÓRICO DE FECHOS MENSAIS OFICIAIS */}
      {reportTab === 'fechos_mensais' && (
        <MonthlyClosuresView
          isAdmin={isAdmin}
          currentUserName={currentSession?.name || currentSession?.username || 'Administrador'}
        />
      )}

      {/* MODAL: RELATÓRIO OFICIAL EM FORMATO A4 PARA IMPRESSÃO */}
      {modalPrint && (
        <Modal
          title="Relatório Oficial Consolidado"
          eyebrow="Impressão A4 Timbrada"
          onClose={() => setModalPrint(false)}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6">
            <div className="flex justify-end gap-2 print:hidden">
              <Button variant="outline" onClick={() => setModalPrint(false)}>
                Fechar
              </Button>
              <Button onClick={() => window.print()}>
                <Printer size={16} /> Imprimir Relatório
              </Button>
            </div>

            {/* Documento Timbrado */}
            <div className="p-8 border-2 border-[hsl(var(--border))] rounded-xl bg-white text-black space-y-6">
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h2 className="text-2xl font-serif font-black tracking-tight text-blue-950">
                    {settings.companyName || 'OSDEL TECNOLOGIA'}
                  </h2>
                  <p className="text-xs uppercase font-bold tracking-widest text-slate-500">
                    RELATÓRIO FINANCEIRO & AUDITORIA OPERACIONAL
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {settings.companyAddress || 'Luanda, Angola'} · NIF: {settings.companyNif || '5417283921'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-100 text-slate-800 rounded font-black text-xs uppercase">
                    {periodLabel}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Emitido por: @{currentSession?.username || 'admin'} em {dateTime(new Date().toISOString())}
                  </p>
                </div>
              </div>

              {/* Quadro Resumo */}
              <div className="grid grid-cols-3 gap-4 border border-slate-300 p-4 rounded-lg bg-slate-50">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-bold block">Receita Bruta Total</span>
                  <b className="text-lg text-emerald-800 font-mono">{kz(totalReceita)}</b>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-bold block">Despesas / Saídas</span>
                  <b className="text-lg text-red-800 font-mono">{kz(totalDespesas)}</b>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-bold block">Saldo Operacional Líquido</span>
                  <b className="text-lg text-blue-900 font-mono">{kz(saldoOperacional)}</b>
                </div>
              </div>

              {/* Tabela de Saldos Reais de Todas as Contas Financeiras */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Saldos Reais de Todas as Contas Financeiras & Tesouraria ({accountsPeriodStats.length} Contas Activas)
                  </h4>
                  <span className="text-[11px] font-bold text-slate-700">
                    Total em Caixa / Bancos: {kz(totalSaldoConsolidado)}
                  </span>
                </div>
                <table className="w-full text-xs text-left border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                      <th className="p-2">Conta / Instituição</th>
                      <th className="p-2">Tipo / Identificador</th>
                      <th className="p-2 text-right">Entradas Período</th>
                      <th className="p-2 text-right">Saídas Período</th>
                      <th className="p-2 text-right">Líquido Período</th>
                      <th className="p-2 text-right font-bold">Saldo Real Actual</th>
                      <th className="p-2 text-right">% Capital</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {accountsPeriodStats.map((acc) => (
                      <tr key={acc.id}>
                        <td className="p-2 font-bold">{acc.name}</td>
                        <td className="p-2 text-slate-600 uppercase text-[10px]">{acc.type} {acc.accountNumber ? `· ${acc.accountNumber}` : ''}</td>
                        <td className="p-2 text-right font-mono text-emerald-700">+{kz(acc.inPeriod)}</td>
                        <td className="p-2 text-right font-mono text-rose-700">-{kz(acc.outPeriod)}</td>
                        <td className="p-2 text-right font-mono font-medium">{kz(acc.netPeriod)}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">{kz(acc.liveBalance)}</td>
                        <td className="p-2 text-right font-mono text-[11px] text-slate-500">{acc.pctOfTotal.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900">
                      <td colSpan={2} className="p-2">CONSOLIDADO TOTAL (TODAS AS CONTAS)</td>
                      <td className="p-2 text-right font-mono text-emerald-800">+{kz(totalAccountsInPeriod)}</td>
                      <td className="p-2 text-right font-mono text-rose-800">-{kz(totalAccountsOutPeriod)}</td>
                      <td className="p-2 text-right font-mono">{kz(totalAccountsInPeriod - totalAccountsOutPeriod)}</td>
                      <td className="p-2 text-right font-mono text-blue-950 font-black">{kz(totalSaldoConsolidado)}</td>
                      <td className="p-2 text-right font-mono">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tabela dos 7 Pilares de Receita */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Discriminação Oficial dos 7 Pilares de Receita (Valores Reais Liquidados)
                </h4>
                <table className="w-full text-xs text-left border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                      <th className="p-2">Pilar de Facturação</th>
                      <th className="p-2">Descrição Operacional</th>
                      <th className="p-2 text-center">Transacções</th>
                      <th className="p-2 text-right font-bold">Valor Real Liquidado</th>
                      <th className="p-2 text-right">% Receita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 font-bold text-emerald-950">1. Pró-rata Dias</td>
                      <td className="p-2 text-slate-600">Adesões a meio do mês com cobrança proporcional de dias até ao fecho</td>
                      <td className="p-2 text-center font-mono">{movementsBreakdown.prorataCount}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800">{kz(movementsBreakdown.prorataTotal)}</td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {totalReceita > 0 ? ((movementsBreakdown.prorataTotal / totalReceita) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-blue-950">2. Contrato / Adesão</td>
                      <td className="p-2 text-slate-600">Instalação física, fibra óptica, drop cable, ONT e ativação de assinante</td>
                      <td className="p-2 text-center font-mono">{movementsBreakdown.contratosCount}</td>
                      <td className="p-2 text-right font-mono font-bold text-blue-800">{kz(movementsBreakdown.contratosTotal)}</td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {totalReceita > 0 ? ((movementsBreakdown.contratosTotal / totalReceita) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-amber-950">3. Taxas Operacionais</td>
                      <td className="p-2 text-slate-600">Taxas de deslocamento de piquete, mudança de morada, urgência técnica</td>
                      <td className="p-2 text-center font-mono">{movementsBreakdown.taxasCount}</td>
                      <td className="p-2 text-right font-mono font-bold text-amber-800">{kz(movementsBreakdown.taxasTotal)}</td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {totalReceita > 0 ? ((movementsBreakdown.taxasTotal / totalReceita) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-indigo-950">4. Mensalidade Regular</td>
                      <td className="p-2 text-slate-600">Planos TV e Internet fibra óptica mensais recorrentes normais</td>
                      <td className="p-2 text-center font-mono">{movementsBreakdown.mensalidadesCount}</td>
                      <td className="p-2 text-right font-mono font-bold text-indigo-800">{kz(movementsBreakdown.mensalidadesTotal)}</td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {totalReceita > 0 ? ((movementsBreakdown.mensalidadesTotal / totalReceita) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-cyan-950">5. Pagamentos Parciais</td>
                      <td className="p-2 text-slate-600">Amortizações fracionadas e abates de dívidas ou saldos devedores</td>
                      <td className="p-2 text-center font-mono">{movementsBreakdown.parciaisCount}</td>
                      <td className="p-2 text-right font-mono font-bold text-cyan-800">{kz(movementsBreakdown.parciaisTotal)}</td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {totalReceita > 0 ? ((movementsBreakdown.parciaisTotal / totalReceita) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-rose-950">6. Multa por Atraso</td>
                      <td className="p-2 text-slate-600">Penalidade regulamentar aplicada a pagamentos após dia de vencimento (dia 5)</td>
                      <td className="p-2 text-center font-mono">{movementsBreakdown.multasCount}</td>
                      <td className="p-2 text-right font-mono font-bold text-rose-800">{kz(movementsBreakdown.multasTotal)}</td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {totalReceita > 0 ? ((movementsBreakdown.multasTotal / totalReceita) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-purple-950">7. REN (Renovação / Reativação)</td>
                      <td className="p-2 text-slate-600">Taxas e serviços de reconexão de porta óptica, reativação de corte de sinal</td>
                      <td className="p-2 text-center font-mono">{movementsBreakdown.renovacoesCount}</td>
                      <td className="p-2 text-right font-mono font-bold text-purple-800">{kz(movementsBreakdown.renovacoesTotal)}</td>
                      <td className="p-2 text-right font-mono text-slate-600">
                        {totalReceita > 0 ? ((movementsBreakdown.renovacoesTotal / totalReceita) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900">
                      <td colSpan={2} className="p-2">TOTAL GERAL LIQUIDADO DOS 7 PILARES</td>
                      <td className="p-2 text-center font-mono">{filteredPayments.length}</td>
                      <td className="p-2 text-right font-mono text-emerald-950 font-black">{kz(totalReceita)}</td>
                      <td className="p-2 text-right font-mono">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tabela de movimentos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Amostragem de Transacções e Recibos Emitidos no Período
                </h4>
                <table className="w-full text-xs text-left border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                      <th className="p-2">Documento</th>
                      <th className="p-2">Assinante</th>
                      <th className="p-2">Data</th>
                      <th className="p-2">Forma Pag.</th>
                      <th className="p-2 text-right">Valor</th>
                      <th className="p-2 text-right">Multa</th>
                      <th className="p-2 text-right font-bold">Total</th>
                      <th className="p-2 text-center">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                  {filteredPayments.slice(0, 35).map((p) => {
                    const c = clients.find((x) => x.id === p.clientId);
                    return (
                      <tr key={p.id}>
                        <td className="p-2 font-mono font-bold">{p.receiptNumber || `FT-${String(p.id).padStart(5, '0')}`}</td>
                        <td className="p-2">{c?.fullName || '—'}</td>
                        <td className="p-2 font-mono">{date(p.paidAt)}</td>
                        <td className="p-2">{p.method || 'MCX'}</td>
                        <td className="p-2 text-right font-mono">{kz(p.amount)}</td>
                        <td className="p-2 text-right font-mono">{p.penalty ? kz(p.penalty) : '0 Kz'}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {kz(Number(p.amount || 0) + Number(p.penalty || 0))}
                        </td>
                        <td className="p-2 text-center font-mono text-slate-600">@{p.operator || 'deezy'}</td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>

              {filteredPayments.length > 35 && (
                <p className="text-[10px] text-slate-500 italic text-center">
                  Mostrando os primeiros 35 registos de um total de {filteredPayments.length} pagamentos.
                </p>
              )}

              {/* Assinaturas */}
              <div className="grid grid-cols-2 gap-8 pt-10 text-xs text-center">
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-800">Responsável Financeiro / Tesouraria</b>
                  <span className="text-[10px] text-slate-500">Conferido e homologado</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-800">Direcção Geral / Auditoria OSDEL</b>
                  <span className="text-[10px] text-slate-500">Visto para conformidade</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
