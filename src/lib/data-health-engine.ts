/**
 * OSDEL TECNOLOGIA - Motor de Diagnóstico & Auto-Cura de Dados (Data Health Engine)
 * 
 * Executa auditoria em 5 dimensões do sistema:
 * 1. Clientes vs Contratos (detecta clientes sem contrato e contratos órfãos).
 * 2. Inadimplência vs Status real (corrige clientes marcados incorretamente como ativo ou atrasado).
 * 3. Contabilidade & Tesouraria (recalcula saldos vivos das contas e segrega taxas de contrato).
 * 4. Faturas & Pagamentos (detecta duplicidades e referências órfãs).
 * 5. Credenciais de Equipa (purga chaves órfãs e valida PINs operacionais).
 * 
 * Auto-Cura (1 Clique):
 * Corrige todas as anomalias identificadas, reconcilia o banco local e sincroniza
 * o snapshot curado com a nuvem/Supabase em tempo real.
 */

import {
  useListClients,
  useListInvoices,
  useListPayments,
  useListExpenses,
  useListFinancialAccounts,
  useListUsers,
  useCreateContract,
  normalizeContract,
  normalizeClient,
  save,
  logAuditAction,
  session,
  AnyRecord,
} from '@/lib/local-api';
import { executeTwoWayCloudSync } from '@/lib/online-first-sync';

export interface DataAnomaly {
  id: string;
  category: 'contratos' | 'status_clientes' | 'tesouraria' | 'faturas' | 'equipa';
  severity: 'critica' | 'moderada' | 'info';
  title: string;
  description: string;
  impact: string;
  affectedCount: number;
  autoFixable: boolean;
  affectedIds?: (string | number)[];
}

export interface DataHealthReport {
  timestamp: string;
  healthScore: number; // 0 a 100%
  status: 'excelente' | 'bom' | 'requer_atencao' | 'critico';
  totalIssues: number;
  anomalies: DataAnomaly[];
  metrics: {
    totalClients: number;
    totalContracts: number;
    totalInvoices: number;
    totalPayments: number;
    totalAccounts: number;
    reconciledAccountsCount: number;
  };
}

export interface SelfHealingResult {
  success: boolean;
  fixedCount: number;
  details: string[];
  durationMs: number;
  timestamp: string;
}

/**
 * Executa varredura profunda no ecossistema local e nuvem
 */
export function runDataHealthAudit(): DataHealthReport {
  // Lê os dados mais atualizados do localStorage
  let clients: AnyRecord[] = [];
  let contracts: AnyRecord[] = [];
  let invoices: AnyRecord[] = [];
  let payments: AnyRecord[] = [];
  let expenses: AnyRecord[] = [];
  let accounts: AnyRecord[] = [];
  let users: AnyRecord[] = [];

  try {
    const rC = localStorage.getItem('osdel:clients') || localStorage.getItem('osdel_clients');
    if (rC) clients = JSON.parse(rC);

    const rCt = localStorage.getItem('osdel:contracts') || localStorage.getItem('osdel_contracts');
    if (rCt) contracts = JSON.parse(rCt);

    const rI = localStorage.getItem('osdel:invoices') || localStorage.getItem('osdel_invoices');
    if (rI) invoices = JSON.parse(rI);

    const rP = localStorage.getItem('osdel:payments') || localStorage.getItem('osdel_payments');
    if (rP) payments = JSON.parse(rP);

    const rE = localStorage.getItem('osdel:expenses') || localStorage.getItem('osdel_expenses');
    if (rE) expenses = JSON.parse(rE);

    const rA = localStorage.getItem('osdel:financial_accounts') || localStorage.getItem('osdel_financial_accounts');
    if (rA) accounts = JSON.parse(rA);

    const rU = localStorage.getItem('osdel:users') || localStorage.getItem('osdel_users');
    if (rU) users = JSON.parse(rU);
  } catch (err) {
    console.warn('[Health Audit] Erro ao ler armazenamento:', err);
  }

  const anomalies: DataAnomaly[] = [];

  const clientMap = new Map<number, AnyRecord>();
  clients.forEach((c) => clientMap.set(Number(c.id), c));

  // --------------------------------------------------------------------------
  // 1. Clientes Ativos Sem Contrato
  // --------------------------------------------------------------------------
  const activeClients = clients.filter((c) => c.status === 'active' || !c.status);
  const clientIdsWithContract = new Set<number>();
  contracts.forEach((ct) => {
    const cId = Number(ct.clientId || ct.client_id);
    if (cId) clientIdsWithContract.add(cId);
  });

  const clientsWithoutContract = activeClients.filter((c) => !clientIdsWithContract.has(Number(c.id)));
  if (clientsWithoutContract.length > 0) {
    anomalies.push({
      id: 'anomalia-clientes-sem-contrato',
      category: 'contratos',
      severity: 'moderada',
      title: `${clientsWithoutContract.length} cliente(s) ativo(s) sem contrato formal gerado`,
      description: 'Existem clientes ativos no sistema que não possuem termo de adesão contratual emitido.',
      impact: 'Risco de ausência de cobertura jurídica e falta de SLA formalizado.',
      affectedCount: clientsWithoutContract.length,
      autoFixable: true,
      affectedIds: clientsWithoutContract.map((c) => c.id),
    });
  }

  // --------------------------------------------------------------------------
  // 2. Contratos Órfãos (Cliente Deletado ou Inexistente)
  // --------------------------------------------------------------------------
  const orphanContracts = contracts.filter((ct) => {
    const cId = Number(ct.clientId || ct.client_id);
    return !cId || !clientMap.has(cId);
  });
  if (orphanContracts.length > 0) {
    anomalies.push({
      id: 'anomalia-contratos-orfaos',
      category: 'contratos',
      severity: 'moderada',
      title: `${orphanContracts.length} contrato(s) órfão(s) detectado(s)`,
      description: 'Contratos que apontam para códigos de clientes que já foram removidos da base.',
      impact: 'Distorção nas estatísticas comerciais de contratos ativos.',
      affectedCount: orphanContracts.length,
      autoFixable: true,
      affectedIds: orphanContracts.map((ct) => ct.id),
    });
  }

  // --------------------------------------------------------------------------
  // 3. Status Descompassado de Inadimplência
  // --------------------------------------------------------------------------
  const currentMonth = new Date().toISOString().slice(0, 7);
  const wronglyLateClients: AnyRecord[] = [];
  const wronglyActiveClients: AnyRecord[] = [];

  clients.forEach((c) => {
    const cId = Number(c.id);
    const hasCurrentPayment = payments.some((p) => {
      const pClientId = Number(p.clientId || p.client_id);
      const pMonth = p.paymentMonth || p.payment_month || (p.paidAt ? p.paidAt.slice(0, 7) : '');
      return pClientId === cId && pMonth === currentMonth;
    });

    // Se cliente está como 'late' ou 'suspended', mas já pagou o mês corrente
    if ((c.status === 'late' || c.status === 'suspended') && hasCurrentPayment) {
      wronglyLateClients.push(c);
    }
  });

  if (wronglyLateClients.length > 0) {
    anomalies.push({
      id: 'anomalia-clientes-falso-atraso',
      category: 'status_clientes',
      severity: 'moderada',
      title: `${wronglyLateClients.length} cliente(s) regularizado(s) ainda marcado(s) em atraso`,
      description: 'Clientes que já liquidaram o mês corrente mas o estado ainda permanece como "Em atraso" ou "Suspenso".',
      impact: 'Risco de corte indevido de sinal ou constrangimento no atendimento.',
      affectedCount: wronglyLateClients.length,
      autoFixable: true,
      affectedIds: wronglyLateClients.map((c) => c.id),
    });
  }

  // --------------------------------------------------------------------------
  // 4. Segregação Financeira de Contratos em acc-contratos
  // --------------------------------------------------------------------------
  const misroutedContractPayments = payments.filter((p) => {
    const isContract =
      p.movementType === 'adesao_contrato' ||
      p.movementType === 'contrato' ||
      String(p.notes || '').toLowerCase().includes('contrato de adesão');
    const acc = p.accountId || p.account_id;
    return isContract && acc !== 'acc-contratos';
  });

  if (misroutedContractPayments.length > 0) {
    anomalies.push({
      id: 'anomalia-pagamentos-contrato-desalinhados',
      category: 'tesouraria',
      severity: 'info',
      title: `${misroutedContractPayments.length} adesão(ões) de contrato creditada(s) fora da conta de contratos`,
      description: 'Receitas de adesão/instalação que não foram segregadas na conta "acc-contratos".',
      impact: 'Mistura da receita de contratos novos com a receita recorrente de mensalidades de TV.',
      affectedCount: misroutedContractPayments.length,
      autoFixable: true,
      affectedIds: misroutedContractPayments.map((p) => p.id),
    });
  }

  // --------------------------------------------------------------------------
  // 5. Contas de Tesouraria com Descompasso Matemático
  // --------------------------------------------------------------------------
  let unbalancedAccountsCount = 0;
  accounts.forEach((acc) => {
    const initial = Number(acc.initialBalance || 0);
    const inTotal = payments
      .filter((p) => (p.accountId || p.account_id || 'acc-caixa') === acc.id)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const outTotal = expenses
      .filter((e) => (e.accountId || e.account_id || 'acc-caixa') === acc.id)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const expected = initial + inTotal - outTotal;
    const current = Number(acc.currentBalance ?? expected);
    if (Math.abs(expected - current) > 1) {
      unbalancedAccountsCount++;
    }
  });

  if (unbalancedAccountsCount > 0) {
    anomalies.push({
      id: 'anomalia-contas-desbalanceadas',
      category: 'tesouraria',
      severity: 'critica',
      title: `${unbalancedAccountsCount} conta(s) financeira(s) com descompasso no saldo vivo`,
      description: 'O saldo computado em tela difere da soma exata de entradas menos saídas registradas.',
      impact: 'Relatórios de fecho de caixa e conciliação bancária inconsistentes.',
      affectedCount: unbalancedAccountsCount,
      autoFixable: true,
    });
  }

  // --------------------------------------------------------------------------
  // 6. Colaboradores Órfãos em Cache Local
  // --------------------------------------------------------------------------
  let orphanStaffCredsCount = 0;
  try {
    const rawCreds = localStorage.getItem('osdel_staff_credentials');
    if (rawCreds) {
      const staffMap = JSON.parse(rawCreds);
      const validUsernames = new Set(users.map((u) => String(u.username || '').toLowerCase()));
      for (const cred of Object.values(staffMap) as any[]) {
        const u = String(cred?.username || '').toLowerCase();
        if (u && u !== 'deezy' && !validUsernames.has(u)) {
          orphanStaffCredsCount++;
        }
      }
    }
  } catch {}

  if (orphanStaffCredsCount > 0) {
    anomalies.push({
      id: 'anomalia-credenciais-orfas',
      category: 'equipa',
      severity: 'moderada',
      title: `${orphanStaffCredsCount} credencial(is) órfã(s) de colaboradores eliminados em cache`,
      description: 'Foram detectadas credenciais antigas em cache local de colaboradores já desligados da empresa.',
      impact: 'Risco de acesso residual caso o dispositivo permaneça offline.',
      affectedCount: orphanStaffCredsCount,
      autoFixable: true,
    });
  }

  // Calcula Health Score (0 - 100%)
  let penalty = 0;
  anomalies.forEach((a) => {
    if (a.severity === 'critica') penalty += 25;
    else if (a.severity === 'moderada') penalty += 10;
    else penalty += 5;
  });

  const healthScore = Math.max(0, Math.min(100, 100 - penalty));
  const status =
    healthScore >= 95
      ? 'excelente'
      : healthScore >= 80
      ? 'bom'
      : healthScore >= 60
      ? 'requer_atencao'
      : 'critico';

  return {
    timestamp: new Date().toISOString(),
    healthScore,
    status,
    totalIssues: anomalies.length,
    anomalies,
    metrics: {
      totalClients: clients.length,
      totalContracts: contracts.length,
      totalInvoices: invoices.length,
      totalPayments: payments.length,
      totalAccounts: accounts.length,
      reconciledAccountsCount: accounts.length - unbalancedAccountsCount,
    },
  };
}

/**
 * Executa a AUTO-CURA de Dados em 1 Clique
 */
export async function executeDataSelfHealing(): Promise<SelfHealingResult> {
  const startTime = Date.now();
  const fixes: string[] = [];
  let fixedCount = 0;

  try {
    // 1. Carrega dados
    let clients: AnyRecord[] = JSON.parse(localStorage.getItem('osdel:clients') || localStorage.getItem('osdel_clients') || '[]');
    let contracts: AnyRecord[] = JSON.parse(localStorage.getItem('osdel:contracts') || localStorage.getItem('osdel_contracts') || '[]');
    let payments: AnyRecord[] = JSON.parse(localStorage.getItem('osdel:payments') || localStorage.getItem('osdel_payments') || '[]');
    let expenses: AnyRecord[] = JSON.parse(localStorage.getItem('osdel:expenses') || localStorage.getItem('osdel_expenses') || '[]');
    let accounts: AnyRecord[] = JSON.parse(localStorage.getItem('osdel:financial_accounts') || localStorage.getItem('osdel_financial_accounts') || '[]');
    let users: AnyRecord[] = JSON.parse(localStorage.getItem('osdel:users') || localStorage.getItem('osdel_users') || '[]');

    const clientMap = new Map<number, AnyRecord>();
    clients.forEach((c) => clientMap.set(Number(c.id), c));

    // A. Remove contratos órfãos
    const initialContractCount = contracts.length;
    contracts = contracts.filter((ct) => {
      const cId = Number(ct.clientId || ct.client_id);
      return cId && clientMap.has(cId);
    });
    const purgedContracts = initialContractCount - contracts.length;
    if (purgedContracts > 0) {
      fixes.push(`Removidos ${purgedContracts} contrato(s) órfão(s) sem cliente associado.`);
      fixedCount += purgedContracts;
    }

    // B. Gera contrato padrão para clientes ativos sem contrato
    const existingContractClientIds = new Set(contracts.map((c) => Number(c.clientId || c.client_id)));
    let generatedContracts = 0;

    clients.forEach((c) => {
      const cId = Number(c.id);
      if (c.status === 'active' && !existingContractClientIds.has(cId)) {
        const nextId = Math.max(0, ...contracts.map((ct) => Number(ct.id) || 0)) + 1;
        const code = `CT-${new Date().getFullYear()}/${String(cId).padStart(5, '0')}`;
        const serviceType = c.serviceType || 'tv';
        const newCt = normalizeContract({
          id: nextId,
          code,
          contractNumber: code,
          clientId: cId,
          client_id: cId,
          clientName: c.fullName || c.name || 'Cliente OSDEL',
          planName: serviceType === 'tv' ? 'TV Comunitária' : serviceType === 'internet' ? 'Internet Fibra 10 Mbps' : 'Combo TV + Fibra',
          monthlyPrice: Number(c.monthlyPrice || c.monthly_fee || (serviceType === 'tv' ? 4000 : 6500)),
          contractFee: Number(c.contractAmount || 15000),
          tvPoints: Number(c.tvPoints || 1),
          dueDay: Number(c.dueDay || 5),
          startDate: c.createdAt ? String(c.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
          status: 'active',
          serviceType,
          accountId: 'acc-contratos',
          accountName: 'Conta de Contratos & Adesões (Instalações)',
          paymentMethod: c.paymentMethod || 'Numerário / Balcão',
        });
        contracts.unshift(newCt);
        existingContractClientIds.add(cId);
        generatedContracts++;
      }
    });

    if (generatedContracts > 0) {
      fixes.push(`Gerados automaticamente ${generatedContracts} novo(s) contrato(s) padrão para clientes ativos.`);
      fixedCount += generatedContracts;
    }

    // C. Corrige status de clientes com pagamentos regulares
    const currentMonth = new Date().toISOString().slice(0, 7);
    let reativados = 0;

    clients = clients.map((c) => {
      const cId = Number(c.id);
      const hasCurrentPayment = payments.some((p) => {
        const pClientId = Number(p.clientId || p.client_id);
        const pMonth = p.paymentMonth || p.payment_month || (p.paidAt ? p.paidAt.slice(0, 7) : '');
        return pClientId === cId && pMonth === currentMonth;
      });

      if ((c.status === 'late' || c.status === 'suspended') && hasCurrentPayment) {
        reativados++;
        return { ...c, status: 'active' };
      }
      return c;
    });

    if (reativados > 0) {
      fixes.push(`Reativados ${reativados} cliente(s) para o estado Ativo após conferência de quitação.`);
      fixedCount += reativados;
    }

    // D. Segrega pagamentos de contratos na conta acc-contratos
    let segregatedPayments = 0;
    payments = payments.map((p) => {
      const isContract =
        p.movementType === 'adesao_contrato' ||
        p.movementType === 'contrato' ||
        String(p.notes || '').toLowerCase().includes('contrato de adesão');
      if (isContract && (p.accountId !== 'acc-contratos' || p.account_id !== 'acc-contratos')) {
        segregatedPayments++;
        return {
          ...p,
          accountId: 'acc-contratos',
          account_id: 'acc-contratos',
          accountName: 'Conta de Contratos & Adesões (Instalações)',
        };
      }
      return p;
    });

    if (segregatedPayments > 0) {
      fixes.push(`Segregados ${segregatedPayments} pagamento(s) de taxa de adesão na conta de contratos.`);
      fixedCount += segregatedPayments;
    }

    // E. Rebalanceamento estrito das contas financeiras
    accounts = accounts.map((acc) => {
      const initial = Number(acc.initialBalance || 0);
      const inTotal = payments
        .filter((p) => (p.accountId || p.account_id || 'acc-caixa') === acc.id)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const outTotal = expenses
        .filter((e) => (e.accountId || e.account_id || 'acc-caixa') === acc.id)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const liveBalance = initial + inTotal - outTotal;
      return {
        ...acc,
        currentBalance: liveBalance,
      };
    });
    fixes.push(`Recalculados com precisão matemática os saldos vivos de todas as ${accounts.length} contas de tesouraria.`);
    fixedCount += accounts.length;

    // F. Purga de credenciais locais órfãs
    const validUsernames = new Set(users.map((u) => String(u.username || '').toLowerCase()));
    let purgedCreds = 0;
    try {
      const rawCreds = localStorage.getItem('osdel_staff_credentials');
      if (rawCreds) {
        const staffMap = JSON.parse(rawCreds);
        let changed = false;
        for (const [key, cred] of Object.entries(staffMap) as any[]) {
          const u = String(cred?.username || '').toLowerCase();
          if (u && u !== 'deezy' && !validUsernames.has(u)) {
            delete staffMap[key];
            changed = true;
            purgedCreds++;
          }
        }
        if (changed) {
          localStorage.setItem('osdel_staff_credentials', JSON.stringify(staffMap));
        }
      }
    } catch {}

    if (purgedCreds > 0) {
      fixes.push(`Eliminadas ${purgedCreds} credencial(is) órfã(s) do armazenamento seguro local.`);
      fixedCount += purgedCreds;
    }

    // 2. Grava todas as correções de volta
    localStorage.setItem('osdel:clients', JSON.stringify(clients));
    localStorage.setItem('osdel_clients', JSON.stringify(clients));
    localStorage.setItem('osdel:contracts', JSON.stringify(contracts));
    localStorage.setItem('osdel_contracts', JSON.stringify(contracts));
    localStorage.setItem('osdel:payments', JSON.stringify(payments));
    localStorage.setItem('osdel_payments', JSON.stringify(payments));
    localStorage.setItem('osdel:financial_accounts', JSON.stringify(accounts));
    localStorage.setItem('osdel_financial_accounts', JSON.stringify(accounts));

    // 3. Dispara eventos de atualização para todas as abas e componentes
    window.dispatchEvent(new CustomEvent('osdel-clients-updated'));
    window.dispatchEvent(new CustomEvent('osdel-contracts-updated'));
    window.dispatchEvent(new CustomEvent('osdel-payments-updated'));
    window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
    window.dispatchEvent(new CustomEvent('osdel-staff-creds-updated'));

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'DATA_HEALED', fixedCount, timestamp: new Date().toISOString() });
        bc.close();
      } catch {}
    }

    // 4. Registra no log de auditoria
    const activeSession = session();
    logAuditAction({
      action: 'AUTO_CURA_SISTEMA',
      module: 'Inteligência de Dados',
      description: `Auto-Cura executada com sucesso: ${fixedCount} anomalia(s) corrigida(s).`,
      user: activeSession?.username || 'deezy',
      targetId: 'DATA-HEAL-01',
      details: fixes.join(' | '),
    });

    // 5. Aciona sincronização em nuvem em segundo plano
    executeTwoWayCloudSync({ source: 'manual' }).catch(() => {});

    return {
      success: true,
      fixedCount,
      details: fixes,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[Data Self Healing Error]:', err);
    return {
      success: false,
      fixedCount,
      details: fixes.concat([`Erro na auto-cura: ${err?.message || 'Falha desconhecida'}`]),
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
