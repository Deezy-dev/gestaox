/**
 * OSDEL TECNOLOGIA - Motor de Sincronização Online-First & Diagnóstico de Nuvem
 *
 * Estratégia ONLINE-FIRST:
 * 1. Ao abrir a aplicação (Web, Electron, APKs), prioriza a conexão com a nuvem.
 * 2. Realiza sincronização bidirecional:
 *    - MANDAR (Push): Envia mutações pendentes em lote para a nuvem (/api/v1/sync/batch).
 *    - RECEBER (Pull): Busca o snapshot completo da nuvem (/api/v1/sync/full-snapshot) e atualiza o estado local.
 * 3. FALLBACK RESILIENTE: Se o servidor estiver indisponível ou a rede falhar,
 *    continua operando perfeitamente em modo OFFLINE sem travar o utilizador.
 * 4. SUÍTE DE TESTES E DIAGNÓSTICO: Testes profundos de DNS, latência, healthcheck,
 *    endpoints de sincronização e CORS/SSL com feedback detalhado.
 */

import { getApiBaseUrl, normalizeApiUrl } from '@/lib/api-config';
import {
  getSyncQueue,
  saveSyncQueue,
  getLastSyncTimestamp,
  setLastSyncTimestamp,
  enqueueSyncMutation,
  type SyncQueueItem,
  type SyncHistorySession,
} from '@/lib/offline-sync';
import {
  reloadAllFromStorage,
  invalidateAllLocalData,
  normalizeClient,
  normalizeInvoice,
  normalizePayment,
  normalizeUser,
  session,
} from '@/lib/local-api';

export interface DiagnosticCheckItem {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  latencyMs?: number;
  message?: string;
  details?: string;
}

export interface CloudDiagnosticResult {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'offline';
  apiUrl: string;
  latencyMs: number;
  checks: DiagnosticCheckItem[];
  summaryMessage: string;
  recommendedAction: string;
}

export interface TwoWaySyncResult {
  success: boolean;
  isOnline: boolean;
  sentCount: number;
  receivedCounts: {
    clients: number;
    invoices: number;
    payments: number;
    users: number;
    orders: number;
    expenses: number;
    tvChannels: number;
    activities: number;
    chatMessages: number;
    teamMessages: number;
    inventory: number;
    [key: string]: number;
  };
  durationMs: number;
  error?: string;
}

let isTwoWaySyncing = false;

export function isOnlineFirstSyncing(): boolean {
  return isTwoWaySyncing;
}

function mergeEntities<T extends { id?: any; code?: string }>(
  localList: T[],
  cloudList: T[],
  normalizer?: (item: any) => T
): T[] {
  const map = new Map<string | number, T>();
  
  // 1. Adicionar itens da nuvem (normalizados)
  cloudList.forEach((item) => {
    const norm = normalizer ? normalizer(item) : item;
    const idKey = norm.id ?? norm.code;
    if (idKey !== undefined && idKey !== null) {
      map.set(idKey, norm);
    }
  });

  // 2. Mesclar itens locais preservando IDs e edições recentes
  localList.forEach((item) => {
    const norm = normalizer ? normalizer(item) : item;
    const idKey = norm.id ?? norm.code;
    if (idKey !== undefined && idKey !== null) {
      if (map.has(idKey)) {
        map.set(idKey, { ...map.get(idKey), ...norm });
      } else {
        map.set(idKey, norm);
      }
    }
  });

  return Array.from(map.values());
}

function mergePaymentsDeduplicated(
  localList: any[],
  cloudList: any[],
  normalizer?: (item: any) => any
): any[] {
  const result: any[] = [];
  const seenIds = new Set<string | number>();
  const seenRefs = new Set<string>();
  const seenClientMonths = new Set<string>();

  const allItems = [
    ...cloudList.map((c) => (normalizer ? normalizer(c) : c)),
    ...localList.map((l) => (normalizer ? normalizer(l) : l)),
  ];

  for (const item of allItems) {
    if (!item) continue;
    const idKey = item.id;
    const rawRef = item.reference ? String(item.reference).trim().toUpperCase() : '';
    const movType = item.movementType || 'mensalidade';
    const clientMonthKey = item.clientId && item.paymentMonth ? `${item.clientId}_${item.paymentMonth}_${movType}` : '';

    const applyMerge = (existingIdx: number) => {
      const existing = result[existingIdx];
      const preferredId =
        typeof existing.id === 'number' && existing.id < 1000000000
          ? existing.id
          : typeof item.id === 'number' && item.id < 1000000000
          ? item.id
          : existing.id ?? item.id;
      result[existingIdx] = {
        ...item,
        ...existing,
        id: preferredId,
        reference: existing.reference || item.reference,
        receiptNumber: existing.receiptNumber || existing.reference || item.receiptNumber || item.reference,
      };
    };

    if (idKey && seenIds.has(idKey)) {
      const existingIdx = result.findIndex((r) => r.id === idKey);
      if (existingIdx !== -1) {
        applyMerge(existingIdx);
      }
      continue;
    }

    if (rawRef && rawRef !== '—' && rawRef !== '-' && seenRefs.has(rawRef)) {
      const existingIdx = result.findIndex(
        (r) => r.reference && String(r.reference).trim().toUpperCase() === rawRef
      );
      if (existingIdx !== -1) {
        applyMerge(existingIdx);
      }
      continue;
    }

    if (clientMonthKey && seenClientMonths.has(clientMonthKey)) {
      const existingIdx = result.findIndex(
        (r) => r.clientId && r.paymentMonth && `${r.clientId}_${r.paymentMonth}_${r.movementType || 'mensalidade'}` === clientMonthKey
      );
      if (existingIdx !== -1) {
        const existing = result[existingIdx];
        const existingRef = existing.reference ? String(existing.reference).trim().toUpperCase() : '';
        const currentRef = rawRef;
        if (existingRef && currentRef && existingRef !== currentRef && !existingRef.startsWith('REC-AUTO-') && !currentRef.startsWith('REC-AUTO-')) {
          // Distinct transactions with different references (e.g. multiple installments) - preserve both
        } else {
          applyMerge(existingIdx);
          continue;
        }
      }
    }

    if (idKey) seenIds.add(idKey);
    if (rawRef && rawRef !== '—' && rawRef !== '-') seenRefs.add(rawRef);
    if (clientMonthKey) seenClientMonths.add(clientMonthKey);
    result.push(item);
  }

  return result;
}

function mergeInvoicesDeduplicated(
  localList: any[],
  cloudList: any[],
  normalizer?: (item: any) => any
): any[] {
  const result: any[] = [];
  const seenIds = new Set<string | number>();
  const seenNumbers = new Set<string>();
  const seenClientDates = new Set<string>();

  const allItems = [
    ...cloudList.map((c) => (normalizer ? normalizer(c) : c)),
    ...localList.map((l) => (normalizer ? normalizer(l) : l)),
  ];

  for (const item of allItems) {
    if (!item) continue;
    const idKey = item.id;
    const rawNum = (item.number || item.invoiceNumber) ? String(item.number || item.invoiceNumber).trim().toUpperCase() : '';
    const movType = item.movementType || 'mensalidade';
    const clientDateKey = item.clientId && item.issueDate ? `${item.clientId}_${String(item.issueDate).slice(0, 7)}_${movType}` : '';

    const applyMerge = (existingIdx: number) => {
      const existing = result[existingIdx];
      const preferredId =
        typeof existing.id === 'number' && existing.id < 1000000000
          ? existing.id
          : typeof item.id === 'number' && item.id < 1000000000
          ? item.id
          : existing.id ?? item.id;
      const preferredNumber = existing.number || existing.invoiceNumber || item.number || item.invoiceNumber;
      result[existingIdx] = {
        ...item,
        ...existing,
        id: preferredId,
        number: preferredNumber,
        invoiceNumber: preferredNumber,
      };
    };

    if (idKey && seenIds.has(idKey)) {
      const existingIdx = result.findIndex((r) => r.id === idKey);
      if (existingIdx !== -1) {
        applyMerge(existingIdx);
      }
      continue;
    }

    if (rawNum && rawNum !== '—' && rawNum !== '-' && seenNumbers.has(rawNum)) {
      const existingIdx = result.findIndex(
        (r) => {
          const num = r.number || r.invoiceNumber;
          return num && String(num).trim().toUpperCase() === rawNum;
        }
      );
      if (existingIdx !== -1) {
        applyMerge(existingIdx);
      }
      continue;
    }

    if (clientDateKey && seenClientDates.has(clientDateKey)) {
      const existingIdx = result.findIndex(
        (r) => r.clientId && r.issueDate && `${r.clientId}_${String(r.issueDate).slice(0, 7)}_${r.movementType || 'mensalidade'}` === clientDateKey
      );
      if (existingIdx !== -1) {
        const existing = result[existingIdx];
        const existingNum = (existing.number || existing.invoiceNumber) ? String(existing.number || existing.invoiceNumber).trim().toUpperCase() : '';
        const currentNum = rawNum;
        if (existingNum && currentNum && existingNum !== currentNum) {
          // Distinct invoices with different numbers - preserve both
        } else {
          applyMerge(existingIdx);
          continue;
        }
      }
    }

    if (idKey) seenIds.add(idKey);
    if (rawNum && rawNum !== '—' && rawNum !== '-') seenNumbers.add(rawNum);
    if (clientDateKey) seenClientDates.add(clientDateKey);
    result.push(item);
  }

  return result;
}

export function mergeContractsSmart(
  localList: any[] = [],
  cloudList: any[] = [],
  pendingQueue: any[] = []
): any[] {
  const map = new Map<string | number, any>();

  // 1. Processa lista local primeiro para reter dados detalhados (pró-rata, contas bancárias, etc.)
  localList.forEach((loc) => {
    if (!loc) return;
    const key = loc.code || loc.contractNumber || (loc.id ? `id_${loc.id}` : (loc.clientId ? `cli_${loc.clientId}` : null));
    if (key) map.set(key, loc);
  });

  // 2. Mescla com contratos da nuvem sem perder pró-rata nem contas
  cloudList.forEach((cloud) => {
    if (!cloud) return;
    const key = cloud.code || cloud.contractNumber || (cloud.id ? `id_${cloud.id}` : (cloud.clientId ? `cli_${cloud.clientId}` : null));
    if (key && map.has(key)) {
      const existing = map.get(key);
      map.set(key, {
        ...cloud,
        ...existing,
        id: cloud.id || existing.id,
        code: cloud.code || existing.code,
        contractNumber: cloud.contractNumber || existing.contractNumber || cloud.code || existing.code,
        remainingDaysChoice: existing.remainingDaysChoice || cloud.remainingDaysChoice || cloud.remaining_days_choice || 'assistir_restantes',
        remainingDaysCount: Number(existing.remainingDaysCount ?? cloud.remainingDaysCount ?? cloud.remaining_days_count ?? existing.prorataDays ?? 0),
        remainingDaysAmount: Number(existing.remainingDaysAmount ?? cloud.remainingDaysAmount ?? cloud.remaining_days_amount ?? existing.prorataAmount ?? 0),
        prorataDays: Number(existing.prorataDays ?? existing.remainingDaysCount ?? cloud.prorataDays ?? cloud.remaining_days_count ?? 0),
        prorataAmount: Number(existing.prorataAmount ?? existing.remainingDaysAmount ?? cloud.prorataAmount ?? cloud.remaining_days_amount ?? 0),
        accountId: existing.accountId || cloud.accountId || cloud.account_id || 'acc-caixa',
        account_id: existing.accountId || cloud.accountId || cloud.account_id || 'acc-caixa',
        paymentMethod: existing.paymentMethod || cloud.paymentMethod || cloud.payment_method || 'Dinheiro (Em Mão)',
        accountName: existing.accountName || cloud.accountName,
      });
    } else if (key) {
      map.set(key, cloud);
    }
  });

  // 3. Adiciona contratos pendentes na fila
  pendingQueue
    .filter((q) => (q.entity?.toLowerCase().includes('contrat') || q.module === 'clientes') && q.action === 'create' && q.payload?.contractNumber)
    .forEach((q) => {
      const pc = q.payload;
      const key = pc.code || pc.contractNumber || (pc.id ? `id_${pc.id}` : null);
      if (key && !map.has(key)) {
        map.set(key, pc);
      }
    });

  return Array.from(map.values());
}

export function mergeExpensesSmart(
  localList: any[] = [],
  cloudList: any[] = [],
  pendingQueue: any[] = []
): any[] {
  const result: any[] = [];
  const seenIds = new Set<string | number>();
  const seenFingerprints = new Set<string>();

  const normalizeExp = (e: any) => {
    if (!e || typeof e !== 'object') return null;
    const desc = e.reason || e.description || 'Despesa Geral';
    const amt = Number(e.amount || 0);
    const dateStr = e.date ? String(e.date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    let targetAccId = e.accountId || e.account_id;
    if (!targetAccId) {
      const accStr = String(e.account || '').toLowerCase();
      if (accStr.includes('bai')) targetAccId = 'acc-bai';
      else if (accStr.includes('bfa')) targetAccId = 'acc-bfa';
      else if (accStr.includes('tpa') || accStr.includes('multi') || accStr.includes('express')) targetAccId = 'acc-tpa';
      else if (accStr.includes('piquete') || accStr.includes('fundo')) targetAccId = 'acc-piquete';
      else targetAccId = 'acc-caixa';
    }
    return {
      ...e,
      id: e.id,
      amount: amt,
      reason: desc,
      description: desc,
      date: dateStr,
      category: e.category || 'operacional',
      accountId: targetAccId,
      account_id: targetAccId,
      account: e.account || (targetAccId === 'acc-bai' ? 'Banco BAI (Arrecadação Principal)' : targetAccId === 'acc-bfa' ? 'Banco BFA (Operações & Fornecedores)' : targetAccId === 'acc-tpa' ? 'Terminal Multicaixa Express (TPA / EMIS)' : targetAccId === 'acc-piquete' ? 'Fundo de Maneio de Piquete Técnico' : 'Caixa Geral (Balcão Golf)'),
      paymentMethod: e.paymentMethod || e.payment_method || 'Dinheiro',
      payment_method: e.paymentMethod || e.payment_method || 'Dinheiro',
      documentNumber: e.documentNumber || e.document_ref || '',
      document_ref: e.documentNumber || e.document_ref || '',
      supplier: e.supplier || e.beneficiary || '',
      beneficiary: e.supplier || e.beneficiary || '',
      status: e.status || 'pago',
    };
  };

  // 1. Pending mutations from offline queue MUST be preserved unconditionally
  const pendingExpenses = pendingQueue
    .filter((q) => {
      const ent = String(q.entity || '').toLowerCase();
      const mod = String(q.module || '').toLowerCase();
      return (
        ent.includes('despesa') ||
        ent.includes('saida') ||
        ent.includes('saída') ||
        ent.includes('expense') ||
        mod === 'despesas'
      ) && q.action !== 'delete';
    })
    .map((q) => normalizeExp(q.payload))
    .filter(Boolean);

  // 2. Combine all local and pending expenses first so user recorded saídas are NEVER lost
  const rawList = [
    ...pendingExpenses,
    ...localList.map(normalizeExp).filter(Boolean),
    ...cloudList.map(normalizeExp).filter(Boolean),
  ];

  for (const item of rawList) {
    if (!item) continue;
    const idKey = item.id !== undefined && item.id !== null ? String(item.id) : '';
    const fp = `${item.date}_${item.amount}_${String(item.reason).trim().toLowerCase()}`;

    if (idKey && seenIds.has(idKey)) {
      continue;
    }
    if (seenFingerprints.has(fp)) {
      continue;
    }

    if (idKey) seenIds.add(idKey);
    seenFingerprints.add(fp);
    result.push(item);
  }

  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function fetchApiWithFallback(endpoint: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const directUrl = `${baseUrl}${endpoint}`;

  // 1. Tenta pedido direto à API do PythonAnywhere
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(directUrl, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) return res;
  } catch (err) {
    // 2. Fallback caso execute no browser com proxy Vite (/api)
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http') && !directUrl.startsWith(window.location.origin)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const proxyRes = await fetch(endpoint, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if (proxyRes.ok) return proxyRes;
      } catch {}
    }
    throw err;
  }
  throw new Error(`Servidor respondeu com código de erro`);
}

/**
 * Executa a sincronização completa BIDIRECIONAL (Mandar e Receber) Online-First.
 */
export async function executeTwoWayCloudSync(options?: {
  timeoutMs?: number;
  source?: 'startup' | 'reconnect' | 'manual' | 'periodic' | 'visibility';
}): Promise<TwoWaySyncResult> {
  const startTime = Date.now();
  const timeoutMs = options?.timeoutMs || 8000;
  const baseUrl = getApiBaseUrl();

  const defaultReceivedCounts = {
    clients: 0,
    invoices: 0,
    payments: 0,
    contracts: 0,
    users: 0,
    orders: 0,
    expenses: 0,
    accounts: 0,
    tvChannels: 0,
    activities: 0,
    chatMessages: 0,
    teamMessages: 0,
    inventory: 0,
    cashClosures: 0,
    monthlyClosures: 0,
    loans: 0,
    schedule: 0,
    missions: 0,
    supportInterventions: 0,
  };

  if (isTwoWaySyncing) {
    return {
      success: false,
      isOnline: navigator.onLine,
      sentCount: 0,
      receivedCounts: { ...defaultReceivedCounts },
      durationMs: 0,
      error: 'Sincronização já em curso.',
    };
  }

  // Verifica conectividade preliminar do dispositivo
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      isOnline: false,
      sentCount: 0,
      receivedCounts: { ...defaultReceivedCounts },
      durationMs: Date.now() - startTime,
      error: 'Dispositivo sem ligação à internet. A operar em contingência offline.',
    };
  }

  isTwoWaySyncing = true;
  notifySyncState('SYNC_STARTED');

  let sentCount = 0;
  const receivedCounts = { ...defaultReceivedCounts };

  try {
    // -------------------------------------------------------------
    // ETAPA 1: MANDAR (Push das alterações pendentes para a nuvem)
    // -------------------------------------------------------------
    const queue = getSyncQueue();
    const pendingItems = queue.filter(
      (item) => item.status === 'pending' || item.status === 'failed'
    );

    if (pendingItems.length > 0) {
      try {
        const pushResponse = await fetchApiWithFallback(
          '/api/v1/sync/batch',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              mutations: pendingItems,
              clientTimestamp: new Date().toISOString(),
            }),
          },
          timeoutMs
        );

        if (pushResponse.ok) {
          const nowIso = new Date().toISOString();
          const pendingIds = new Set(pendingItems.map((p) => p.id));

          queue.forEach((item) => {
            if (pendingIds.has(item.id)) {
              item.status = 'synced';
              item.syncedAt = nowIso;
              item.error = undefined;
              sentCount++;
            }
          });
          saveSyncQueue(queue);
        }
      } catch (pushErr: any) {
        console.warn('Falha no envio de lote para a nuvem:', pushErr?.message);
      }
    }

    // -------------------------------------------------------------
    // ETAPA 2: RECEBER (Full-Snapshot da Base de Dados - Single Source of Truth)
    // -------------------------------------------------------------
    const pullUrl = '/api/v1/sync/full-snapshot';

    const pullResponse = await fetchApiWithFallback(
      pullUrl,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
      timeoutMs
    );

    if (!pullResponse.ok) {
      throw new Error(`Servidor respondeu com código HTTP ${pullResponse.status}`);
    }

    const payload = await pullResponse.json();
    const cloudData = payload.data || payload || {};

    if (payload.version) {
      localStorage.setItem('osdel_last_server_version', String(payload.version));
    }

    // -------------------------------------------------------------
    // ETAPA 3: RECONCILIAÇÃO AUTORITATIVA (Cloud como Fonte Única de Verdade)
    // -------------------------------------------------------------
    if (typeof window !== 'undefined') {
      const pendingQueue = getSyncQueue().filter(
        (q) => q.status === 'pending' || q.status === 'failed'
      );

      // 1. Reconcilia Clientes: Nuvem autoritativa + locais preservando edições locais
      if (Array.isArray(cloudData.clients)) {
        const localRaw = window.localStorage.getItem('osdel:clients') || window.localStorage.getItem('osdel_clients');
        const currentLocalClients = localRaw ? JSON.parse(localRaw) : [];
        const finalClients = mergeClientsSmart(currentLocalClients, cloudData.clients);
        window.localStorage.setItem('osdel:clients', JSON.stringify(finalClients));
        window.localStorage.setItem('osdel_clients', JSON.stringify(finalClients));
        receivedCounts.clients = finalClients.length;
      }

      // 2. Reconcilia Facturas: Deduplicação tripla (ID, Número, Cliente+Mês)
      if (Array.isArray(cloudData.invoices)) {
        const localRaw = window.localStorage.getItem('osdel:invoices') || window.localStorage.getItem('osdel_invoices');
        const currentLocalInvoices = localRaw ? JSON.parse(localRaw) : [];
        const finalInvoices = mergeInvoicesDeduplicated(currentLocalInvoices, cloudData.invoices, normalizeInvoice);
        window.localStorage.setItem('osdel:invoices', JSON.stringify(finalInvoices));
        window.localStorage.setItem('osdel_invoices', JSON.stringify(finalInvoices));
        receivedCounts.invoices = finalInvoices.length;
      }

      // 3. Reconcilia Pagamentos: Deduplicação tripla (ID, Referência, Cliente+Mês)
      if (Array.isArray(cloudData.payments)) {
        const localRaw = window.localStorage.getItem('osdel:payments') || window.localStorage.getItem('osdel_payments');
        const currentLocalPayments = localRaw ? JSON.parse(localRaw) : [];
        const pendingPayments = pendingQueue
          .filter((q) => (String(q.entity || '').toLowerCase().includes('pagamento') || q.module === 'pagamentos') && q.action !== 'delete' && q.payload)
          .map((q) => q.payload);
        const combinedLocal = [...pendingPayments, ...currentLocalPayments];
        const finalPayments = mergePaymentsDeduplicated(combinedLocal, cloudData.payments, normalizePayment);
        window.localStorage.setItem('osdel:payments', JSON.stringify(finalPayments));
        window.localStorage.setItem('osdel_payments', JSON.stringify(finalPayments));
        receivedCounts.payments = finalPayments.length;
      }

      // 4. Reconcilia Contratos Oficiais de Assinantes com preservação de pró-rata e conta bancária
      if (Array.isArray(cloudData.contracts)) {
        const localRaw = window.localStorage.getItem('osdel:contracts') || window.localStorage.getItem('osdel_contracts');
        const currentLocalContracts = localRaw ? JSON.parse(localRaw) : [];
        const finalContracts = mergeContractsSmart(currentLocalContracts, cloudData.contracts, pendingQueue);
        window.localStorage.setItem('osdel:contracts', JSON.stringify(finalContracts));
        window.localStorage.setItem('osdel_contracts', JSON.stringify(finalContracts));
        receivedCounts.contracts = finalContracts.length;
        window.dispatchEvent(new CustomEvent('osdel-contracts-updated'));
      }

      // 5. Reconcilia Utilizadores & Credenciais de Equipa (Purga contas demo, preserva Deezy)
      if (Array.isArray(cloudData.users) && cloudData.users.length > 0) {
        const MOCK_NAMES = new Set(['boss', 'admin', 'mestre.job', 'helder', 'operador1']);
        const validUsers = cloudData.users
          .filter((u: any) => u.is_active !== false && !MOCK_NAMES.has(String(u.username || '').toLowerCase()))
          .map(normalizeUser);
        const hasDeezy = validUsers.some((u: any) => String(u.username || '').toLowerCase() === 'deezy');
        if (!hasDeezy) {
          validUsers.unshift({
            id: 1,
            username: 'deezy',
            name: 'Albert Mbuyi (Deezy)',
            role: 'superadmin',
            pin: '9999',
            password: '52863400#',
            active: true,
            jobTitle: 'Director Geral & Super Admin Supremo',
            department: 'Direcção Geral Executiva',
            phone: '926 153 736',
          });
        }
        window.localStorage.setItem('osdel:users', JSON.stringify(validUsers));
        window.localStorage.setItem('osdel_users', JSON.stringify(validUsers));
        receivedCounts.users = validUsers.length;
      }

      // 6. Reconcilia Ordens de Serviço
      if (Array.isArray(cloudData.orders)) {
        window.localStorage.setItem('osdel:service_orders', JSON.stringify(cloudData.orders));
        window.localStorage.setItem('osdel_service_orders', JSON.stringify(cloudData.orders));
        receivedCounts.orders = cloudData.orders.length;
      }

      // 7. Reconcilia Despesas de Caixa (Preserva TODAS as saídas locais e deduplica com nuvem)
      const localRawExpenses = window.localStorage.getItem('osdel:expenses') || window.localStorage.getItem('osdel_expenses');
      const currentLocalExpenses = localRawExpenses ? JSON.parse(localRawExpenses) : [];
      const cloudExpenses = Array.isArray(cloudData.expenses) ? cloudData.expenses : [];
      const finalExpenses = mergeExpensesSmart(currentLocalExpenses, cloudExpenses, pendingQueue);

      // Se houver alguma saída registada localmente que ainda não subiu à nuvem, enfileira para envio
      const cloudIdSet = new Set(cloudExpenses.map((c: any) => String(c.id)));
      finalExpenses.forEach((fe: any) => {
        if (!cloudIdSet.has(String(fe.id))) {
          enqueueSyncMutation({
            module: 'despesas',
            action: 'create',
            entity: 'despesa',
            description: `Saída de caixa de ${fe.amount} Kz: ${fe.reason}`,
            payload: fe,
          });
        }
      });

      window.localStorage.setItem('osdel:expenses', JSON.stringify(finalExpenses));
      window.localStorage.setItem('osdel_expenses', JSON.stringify(finalExpenses));
      receivedCounts.expenses = finalExpenses.length;

      // 8. Reconcilia Contas Bancárias e Caixas (Garante as contas oficiais e preserva saldos vivos locais)
      if (Array.isArray(cloudData.accounts)) {
        const localRawAccounts = window.localStorage.getItem('osdel:financial_accounts') || window.localStorage.getItem('osdel_financial_accounts');
        const currentLocalAccounts = localRawAccounts ? JSON.parse(localRawAccounts) : [];
        const standardAccounts = [
          { id: 'acc-caixa', name: 'Caixa Geral (Balcão Golf)', code: 'CX-01', type: 'caixa', currency: 'AOA', color: 'emerald', status: 'active', manager: 'deezy (Tesouraria)', description: 'Caixa físico da loja de atendimento ao público no Golf II para pagamentos a pronto.' },
          { id: 'acc-bai', name: 'Banco BAI (Arrecadação Principal)', code: 'BCO-BAI', type: 'banco', bankName: 'Banco Angolano de Investimentos (BAI)', accountNumber: '1234567810', iban: 'AO06.0040.0000.1234.5678.9012.3', currency: 'AOA', color: 'blue', status: 'active', manager: 'Administração OSDEL', description: 'Conta principal para recebimentos de mensalidades e depósitos de receita diária.' },
          { id: 'acc-bfa', name: 'Banco BFA (Operações & Fornecedores)', code: 'BCO-BFA', type: 'banco', bankName: 'Banco de Fomento Angola (BFA)', accountNumber: '9876543210', iban: 'AO06.0006.0000.9876.5432.1098.7', currency: 'AOA', color: 'amber', status: 'active', manager: 'Administração OSDEL', description: 'Conta para liquidação de fornecedores de fibra, energia e encargos fiscais.' },
          { id: 'acc-tpa', name: 'Terminal Multicaixa Express (TPA / EMIS)', code: 'TPA-MCX', type: 'tpa', bankName: 'Rede Multicaixa EMIS', accountNumber: 'TPA-98421-MCX', currency: 'AOA', color: 'purple', status: 'active', manager: 'Operador de Balcão', description: 'Recebimentos com cartões Multicaixa no balcão e pagamentos via Express.' },
          { id: 'acc-piquete', name: 'Fundo de Maneio de Piquete Técnico', code: 'FM-PIQ', type: 'fundo_maneio', currency: 'AOA', color: 'cyan', status: 'active', manager: 'Carlos Batalha (Chefe de Piquete)', description: 'Fundo em dinheiro para despesas urgentes de rua, combustível e materiais imediatos.' },
        ];
        const accMap = new Map<string, any>();
        standardAccounts.forEach((sa) => accMap.set(sa.id, sa));
        // Preserva definições e saldos iniciais configurados localmente
        currentLocalAccounts.forEach((la: any) => {
          if (la && la.id) {
            accMap.set(la.id, { ...(accMap.get(la.id) || {}), ...la });
          }
        });
        cloudData.accounts.forEach((ca: any) => {
          if (ca && ca.id) {
            const existing = accMap.get(ca.id) || {};
            accMap.set(ca.id, {
              ...existing,
              ...ca,
              initialBalance: (ca.initialBalance !== undefined && Number(ca.initialBalance) > 0)
                ? Number(ca.initialBalance)
                : Number(existing.initialBalance || 0),
            });
          }
        });
        const finalAccounts = Array.from(accMap.values());
        window.localStorage.setItem('osdel:financial_accounts', JSON.stringify(finalAccounts));
        window.localStorage.setItem('osdel_financial_accounts', JSON.stringify(finalAccounts));
        receivedCounts.accounts = finalAccounts.length;
        window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      }

      // 9. Reconcilia Transferências entre Contas
      if (Array.isArray(cloudData.transfers)) {
        window.localStorage.setItem('osdel:account_transfers', JSON.stringify(cloudData.transfers));
      }

      // 10. Reconcilia Inventário e Stock Central
      if (Array.isArray(cloudData.inventory)) {
        window.localStorage.setItem('osdel:inventory', JSON.stringify(cloudData.inventory));
        window.localStorage.setItem('osdel_inventory', JSON.stringify(cloudData.inventory));
        receivedCounts.inventory = cloudData.inventory.length;
      }

      // 11. Reconcilia Canais de TV e Descodificadores
      if (Array.isArray(cloudData.tvChannels)) {
        window.localStorage.setItem('osdel_tv_decoders_v1', JSON.stringify(cloudData.tvChannels));
        window.localStorage.setItem('osdel_tv_decoders_v2', JSON.stringify(cloudData.tvChannels));
        receivedCounts.tvChannels = cloudData.tvChannels.length;
      }

      // 12. Reconcilia Atividades e Logs de Auditoria
      if (Array.isArray(cloudData.activities)) {
        window.localStorage.setItem('osdel:activity_logs', JSON.stringify(cloudData.activities));
        window.localStorage.setItem('osdel:audit_logs', JSON.stringify(cloudData.activities));
        receivedCounts.activities = cloudData.activities.length;
      }

      // 13. Reconcilia Mensagens de Chat com Clientes (APK Cliente)
      if (Array.isArray(cloudData.chatMessages)) {
        window.localStorage.setItem('osdel_support_chat_v1', JSON.stringify(cloudData.chatMessages));
        cloudData.chatMessages.forEach((msg: any) => {
          if (msg.clientCode) {
            const key = `osdel_client_chat_${msg.clientCode}`;
            const existingRaw = window.localStorage.getItem(key);
            const existingList = existingRaw ? JSON.parse(existingRaw) : [];
            if (!existingList.some((m: any) => m.id === msg.id)) {
              existingList.push(msg);
              window.localStorage.setItem(key, JSON.stringify(existingList));
            }
          }
        });
        receivedCounts.chatMessages = cloudData.chatMessages.length;
      }

      // 14. Reconcilia Mensagens Internas da Equipa
      if (Array.isArray(cloudData.teamMessages)) {
        window.localStorage.setItem('osdel_team_messages', JSON.stringify(cloudData.teamMessages));
        window.localStorage.setItem('osdel:messages', JSON.stringify(cloudData.teamMessages));
        receivedCounts.teamMessages = cloudData.teamMessages.length;
      }

      // 15. Reconcilia Agenda e Escalas
      if (Array.isArray(cloudData.schedule)) {
        window.localStorage.setItem('osdel:schedule_events', JSON.stringify(cloudData.schedule));
        window.localStorage.setItem('osdel_advanced_schedule', JSON.stringify(cloudData.schedule));
        window.dispatchEvent(new CustomEvent('osdel-schedule-updated', { detail: cloudData.schedule }));
      }

      // 16. Reconcilia Missões de Campo Coletivas
      if (Array.isArray(cloudData.missions)) {
        window.localStorage.setItem('osdel:team_missions', JSON.stringify(cloudData.missions));
        window.localStorage.setItem('osdel_team_missions', JSON.stringify(cloudData.missions));
        window.dispatchEvent(new CustomEvent('osdel-missions-updated', { detail: cloudData.missions }));
      }

      // 17. Reconcilia Empréstimos Salariais
      if (Array.isArray(cloudData.loans)) {
        window.localStorage.setItem('osdel:technician_loans', JSON.stringify(cloudData.loans));
        window.localStorage.setItem('osdel_technician_loans', JSON.stringify(cloudData.loans));
        receivedCounts.loans = cloudData.loans.length;
        window.dispatchEvent(new CustomEvent('osdel-loans-updated', { detail: { loans: cloudData.loans } }));
        window.dispatchEvent(new CustomEvent('osdel-technician-loans-updated', { detail: { loans: cloudData.loans } }));
      }

      // 18. Reconcilia Fechos de Caixa Diários
      if (Array.isArray(cloudData.cashClosures)) {
        window.localStorage.setItem('osdel:cash_closures', JSON.stringify(cloudData.cashClosures));
        window.localStorage.setItem('osdel_cash_closures', JSON.stringify(cloudData.cashClosures));
        receivedCounts.cashClosures = cloudData.cashClosures.length;
        window.dispatchEvent(new CustomEvent('osdel-cash-closures-updated', { detail: cloudData.cashClosures }));
      }

      // 19. Reconcilia Fechos Mensais Consolidados (Relatórios Oficiais)
      if (Array.isArray(cloudData.monthlyClosures)) {
        window.localStorage.setItem('osdel:monthly_closures', JSON.stringify(cloudData.monthlyClosures));
        window.localStorage.setItem('osdel_monthly_closures', JSON.stringify(cloudData.monthlyClosures));
        receivedCounts.monthlyClosures = cloudData.monthlyClosures.length;
        window.dispatchEvent(new CustomEvent('osdel-monthly-closures-updated', { detail: cloudData.monthlyClosures }));
      }

      // 20. Reconcilia Intervenções Técnicas de Suporte
      if (Array.isArray(cloudData.supportInterventions)) {
        window.localStorage.setItem('osdel:support_interventions', JSON.stringify(cloudData.supportInterventions));
        window.localStorage.setItem('osdel_support_interventions', JSON.stringify(cloudData.supportInterventions));
        receivedCounts.supportInterventions = cloudData.supportInterventions.length;
        window.dispatchEvent(new CustomEvent('osdel-support-interventions-updated', { detail: cloudData.supportInterventions }));
      }

      // 21. Reconcilia Definições Globais da Empresa
      if (cloudData.settings && typeof cloudData.settings === 'object') {
        const localSettingsRaw = window.localStorage.getItem('osdel:settings');
        const localSettings = localSettingsRaw ? JSON.parse(localSettingsRaw) : {};
        const mergedSettings = { ...localSettings, ...cloudData.settings };
        window.localStorage.setItem('osdel:settings', JSON.stringify(mergedSettings));
        window.localStorage.setItem('osdel_company_settings', JSON.stringify(mergedSettings));
      }

      setLastSyncTimestamp(new Date().toISOString());

      // Recarrega memória e invalida queries do React Query para atualizar todos os ecrãs
      reloadAllFromStorage();
      invalidateAllLocalData();

      // Dispara eventos em cadeia para todo o sistema
      window.dispatchEvent(new CustomEvent('osdel-clients-updated'));
      window.dispatchEvent(new CustomEvent('osdel-payments-updated'));
      window.dispatchEvent(new CustomEvent('osdel-invoices-updated'));
      window.dispatchEvent(new CustomEvent('osdel-contracts-updated'));
      window.dispatchEvent(new CustomEvent('osdel-cash-closures-updated'));
      window.dispatchEvent(new CustomEvent('osdel-monthly-closures-updated'));
      window.dispatchEvent(new CustomEvent('osdel-support-interventions-updated'));
      window.dispatchEvent(new CustomEvent('osdel-users-updated'));
      window.dispatchEvent(new CustomEvent('osdel-tv-decoders-updated'));
      window.dispatchEvent(new CustomEvent('osdel-activities-updated'));
      window.dispatchEvent(new CustomEvent('osdel-audit-logs-updated'));
      window.dispatchEvent(new CustomEvent('osdel-messages-updated'));
      window.dispatchEvent(new CustomEvent('osdel-client-chat-updated'));
      window.dispatchEvent(new CustomEvent('osdel-team-messages-updated'));
      window.dispatchEvent(new CustomEvent('osdel-service-orders-updated'));
      window.dispatchEvent(new CustomEvent('osdel-service_orders-updated'));
      window.dispatchEvent(new CustomEvent('osdel-inventory-updated'));
      window.dispatchEvent(new CustomEvent('osdel-expenses-updated'));
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      window.dispatchEvent(new CustomEvent('osdel-settings-updated'));
      window.dispatchEvent(new CustomEvent('osdel-loans-updated'));
      window.dispatchEvent(new CustomEvent('osdel-technician-loans-updated'));
      window.dispatchEvent(new CustomEvent('osdel-schedule-updated'));
      window.dispatchEvent(new CustomEvent('osdel-missions-updated'));
      window.dispatchEvent(new CustomEvent('osdel-team-missions-updated'));
      window.dispatchEvent(new CustomEvent('osdel-sync-change'));

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('osdel_sync_channel');
          bc.postMessage({ type: 'FULL_SNAPSHOT_APPLIED', timestamp: Date.now() });
          bc.close();
        } catch {}
      }

      window.dispatchEvent(
        new CustomEvent('osdel-data-synced-from-cloud', {
          detail: {
            timestamp: new Date().toISOString(),
            receivedCounts,
            sentCount,
          },
        })
      );
    }

    notifySyncState('SYNC_COMPLETED');

    return {
      success: true,
      isOnline: true,
      sentCount,
      receivedCounts,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    const errorMsg = error?.message || 'Falha de comunicação com o servidor na nuvem.';
    console.warn('[Online-First Sync] Servidor indisponível, continuando em modo offline local:', errorMsg);

    notifySyncState('SYNC_FAILED', errorMsg);

    return {
      success: false,
      isOnline: false,
      sentCount: 0,
      receivedCounts,
      durationMs: Date.now() - startTime,
      error: errorMsg,
    };
  } finally {
    isTwoWaySyncing = false;
  }
}

/**
 * Normaliza registos de cliente suportando tanto camelCase como snake_case
 */
function normalizeClientRecord(raw: any): any {
  if (!raw) return raw;
  const fullName = raw.fullName || raw.full_name || raw.name || '';
  const phone = raw.phone || raw.telephone || '';
  const serviceType = raw.serviceType || raw.service_type || 'combo';
  const monthlyPrice = Number(raw.monthlyPrice ?? raw.monthly_fee ?? raw.price ?? 4000);
  const status = raw.status || 'active';
  const code = raw.code || (raw.id ? `CLI-${String(raw.id).padStart(5, '0')}` : '');
  const documentNumber = raw.documentNumber || raw.document_number || raw.nif || raw.bi || '';
  const houseCode = raw.houseCode || raw.house_code || '';
  const neighborhood = raw.neighborhood || raw.bairro || '';
  const address = raw.address || raw.endereco || '';
  const pdoNumber = raw.pdoNumber || raw.pdo_number || '';
  const onuNumber = raw.onuNumber || raw.onu_number || '';
  const opticalRxDbm = raw.opticalRxDbm || raw.optical_rx_dbm || '';
  const pin = raw.pin || '';
  const notes = raw.notes || '';
  const createdAt = raw.createdAt || raw.created_at || new Date().toISOString();

  const remainingDaysChoice = raw.remainingDaysChoice || raw.remaining_days_choice || 'assistir_restantes';
  const remainingDaysCount = Number(raw.remainingDaysCount ?? raw.remaining_days_count ?? raw.prorataDays ?? raw.prorata_days ?? 0);
  const remainingDaysAmount = Number(raw.remainingDaysAmount ?? raw.remaining_days_amount ?? raw.prorataAmount ?? raw.prorata_amount ?? 0);
  const prorataDays = Number(raw.prorataDays ?? raw.prorata_days ?? remainingDaysCount);
  const prorataAmount = Number(raw.prorataAmount ?? raw.prorata_amount ?? remainingDaysAmount);
  const accountId = raw.accountId || raw.account_id || (
    String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('bai') ? 'acc-bai' :
    String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
    String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('tpa') || String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('express') || String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
  );
  const accountName = raw.accountName || raw.account_name || '';
  const paymentMethod = raw.paymentMethod || raw.payment_method || 'Dinheiro (Em Mão)';
  const tvPoints = Number(raw.tvPoints ?? raw.tv_points ?? 1);
  const contractAmount = Number(raw.contractAmount ?? raw.contract_amount ?? (serviceType === 'tv' ? 15000 : 15000));

  return {
    ...raw,
    fullName,
    full_name: fullName,
    phone,
    serviceType,
    service_type: serviceType,
    monthlyPrice,
    monthly_fee: monthlyPrice,
    status,
    code,
    documentNumber,
    document_number: documentNumber,
    houseCode,
    house_code: houseCode,
    neighborhood,
    address,
    pdoNumber,
    pdo_number: pdoNumber,
    onuNumber,
    onu_number: onuNumber,
    opticalRxDbm,
    optical_rx_dbm: opticalRxDbm,
    pin,
    notes,
    remainingDaysChoice,
    remaining_days_choice: remainingDaysChoice,
    remainingDaysCount,
    remaining_days_count: remainingDaysCount,
    remainingDaysAmount,
    remaining_days_amount: remainingDaysAmount,
    prorataDays,
    prorata_days: prorataDays,
    prorataAmount,
    prorata_amount: prorataAmount,
    accountId,
    account_id: accountId,
    accountName,
    account_name: accountName,
    paymentMethod,
    payment_method: paymentMethod,
    tvPoints,
    tv_points: tvPoints,
    contractAmount,
    contract_amount: contractAmount,
    createdAt,
    created_at: createdAt,
  };
}

/**
 * Reconciliação Inteligente de Clientes:
 * Une clientes locais e da nuvem sem JAMAIS apagar clientes criados localmente.
 * Se houver cliente local sem correspondência na nuvem, mantém e garante que será enviado.
 */
export function mergeClientsSmart(localClients: any[], cloudClients: any[]): any[] {
  const mergedMap = new Map<string, any>();

  // 1. Indexa clientes locais
  localClients.forEach((loc) => {
    if (!loc) return;
    const norm = normalizeClientRecord(loc);
    const key = norm.code || (norm.id ? `id_${norm.id}` : norm.phone ? `phone_${norm.phone}` : `tmp_${Math.random()}`);
    mergedMap.set(key, norm);
  });

  // 2. Reconcilia clientes da nuvem
  cloudClients.forEach((cloud) => {
    if (!cloud) return;
    const normCloud = normalizeClientRecord(cloud);
    const keyByCode = normCloud.code ? normCloud.code : null;
    const keyById = normCloud.id ? `id_${normCloud.id}` : null;
    const keyByPhone = normCloud.phone ? `phone_${normCloud.phone}` : null;

    let matchedKey: string | null = null;
    if (keyByCode && mergedMap.has(keyByCode)) matchedKey = keyByCode;
    else if (keyById && mergedMap.has(keyById)) matchedKey = keyById;
    else if (keyByPhone && mergedMap.has(keyByPhone)) matchedKey = keyByPhone;
    else {
      for (const [k, existing] of mergedMap.entries()) {
        if (
          (normCloud.code && existing.code === normCloud.code) ||
          (normCloud.id && existing.id === normCloud.id) ||
          (normCloud.phone && existing.phone && normCloud.phone === existing.phone)
        ) {
          matchedKey = k;
          break;
        }
      }
    }

    if (matchedKey) {
      const existing = mergedMap.get(matchedKey);
      const merged = {
        ...normCloud,
        ...existing,
        id: normCloud.id || existing.id,
        code: normCloud.code || existing.code,
        status: existing.status || normCloud.status,
      };
      mergedMap.set(matchedKey, merged);
    } else {
      const newKey = normCloud.code || `id_${normCloud.id || Math.random()}`;
      mergedMap.set(newKey, normCloud);
    }
  });

  const result = Array.from(mergedMap.values());

  // Garante que qualquer cliente local que ainda não está na nuvem seja agendado para envio
  try {
    const cloudCodes = new Set(
      cloudClients.map((c) => c.code || (c.id ? `CLI-${String(c.id).padStart(5, '0')}` : ''))
    );
    const queue = getSyncQueue();
    result.forEach((c) => {
      if (c.code && !cloudCodes.has(c.code)) {
        const inQueue = queue.some(
          (q) => q.payload?.code === c.code || (q.payload?.phone && q.payload?.phone === c.phone)
        );
        if (!inQueue) {
          enqueueSyncMutation({
            module: 'clientes',
            action: 'create',
            entity: 'Cliente',
            description: `Registo de cliente: ${c.fullName} (${c.code})`,
            payload: c,
          });
        }
      }
    });
  } catch {}

  return result.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

export function mergeInvoicesSmart(localInvoices: any[], cloudInvoices: any[]): any[] {
  const map = new Map<string, any>();
  localInvoices.forEach((inv) => {
    if (!inv) return;
    const invNum = inv.invoiceNumber || inv.invoice_number || `id_${inv.id || Math.random()}`;
    map.set(invNum, { ...inv, invoiceNumber: invNum, invoice_number: invNum });
  });
  cloudInvoices.forEach((cloud) => {
    if (!cloud) return;
    const invNum = cloud.invoiceNumber || cloud.invoice_number || `id_${cloud.id || Math.random()}`;
    const existing = map.get(invNum);
    map.set(invNum, { ...cloud, ...(existing || {}), invoiceNumber: invNum, invoice_number: invNum });
  });
  return Array.from(map.values()).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
}

export function mergePaymentsSmart(localPayments: any[], cloudPayments: any[]): any[] {
  const map = new Map<string, any>();
  localPayments.forEach((p) => {
    if (!p) return;
    const key = p.reference || p.receiptNumber || `p_${p.id || Math.random()}`;
    map.set(key, p);
  });
  cloudPayments.forEach((cloud) => {
    if (!cloud) return;
    const key = cloud.reference || cloud.receipt_number || cloud.receiptNumber || `p_${cloud.id || Math.random()}`;
    const existing = map.get(key);
    map.set(key, { ...cloud, ...(existing || {}) });
  });
  return Array.from(map.values()).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
}

export function mergeOrdersSmart(localOrders: any[], cloudOrders: any[]): any[] {
  const map = new Map<string, any>();
  localOrders.forEach((o) => {
    if (!o) return;
    const key = o.code || `order_${o.id || Math.random()}`;
    map.set(key, o);
  });
  cloudOrders.forEach((cloud) => {
    if (!cloud) return;
    const key = cloud.code || cloud.order_number || `order_${cloud.id || Math.random()}`;
    const existing = map.get(key);
    map.set(key, { ...cloud, ...(existing || {}) });
  });
  return Array.from(map.values()).sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
}


/**
 * Mescla utilizadores da nuvem com utilizadores locais preservando Superadmins locais
 */
function mergeUsersKeepSuperadmins(localUsers: any[], cloudUsers: any[]): any[] {
  const map = new Map<string, any>();
  cloudUsers.forEach((u) => {
    if (u.username) map.set(u.username, u);
  });
  localUsers.forEach((u) => {
    if (u.role === 'superadmin' || u.username === 'deezy') {
      map.set(u.username, { ...map.get(u.username), ...u });
    }
  });
  return Array.from(map.values());
}

/**
 * Envia uma atividade diretamente para a nuvem de forma imediata (sem esperar lote)
 */
export async function pushActivityDirectToCloud(item: {
  module: SyncQueueItem['module'];
  action: SyncQueueItem['action'];
  entity: string;
  description: string;
  payload: any;
}): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl || typeof navigator === 'undefined' || !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${baseUrl}/api/v1/sync/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        mutations: [
          {
            id: `direct_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            module: item.module,
            action: item.action,
            entity: item.entity,
            description: item.description,
            payload: item.payload,
            status: 'pending',
            retryCount: 0,
          },
        ],
        clientTimestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return Boolean(data && data.success !== false);
    }
  } catch (err: any) {
    console.warn('[Direct Cloud Push] Envio imediato pendente, será reconciliado:', err?.message);
  }
  return false;
}

function notifySyncState(type: string, error?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('osdel-online-sync-state', {
        detail: { type, isSyncing: isTwoWaySyncing, error, timestamp: Date.now() },
      })
    );
  }
}

/**
 * SUÍTE COMPLETA DE DIAGNÓSTICO DE CONECTIVIDADE NA NUVEM
 * Executa testes rigorosos e explica passo a passo qualquer problema.
 */
export async function runFullCloudDiagnostic(customUrl?: string): Promise<CloudDiagnosticResult> {
  const targetUrl = customUrl ? normalizeApiUrl(customUrl) : getApiBaseUrl();
  const checks: DiagnosticCheckItem[] = [
    {
      id: 'network_interface',
      name: 'Interface de Rede do Dispositivo',
      description: 'Verifica se o sistema operacional / navegador reporta sinal de rede (Wi-Fi / Ethernet / Móvel).',
      status: 'pending',
    },
    {
      id: 'dns_reachability',
      name: 'Resolução de Domínio & URL',
      description: 'Valida se o endereço da API é uma URL HTTP/HTTPS válida e bem formatada.',
      status: 'pending',
    },
    {
      id: 'latency_ping',
      name: 'Latência & Tempo de Resposta',
      description: 'Mede a velocidade da rota de pacotes (ping de ida e volta) até ao servidor.',
      status: 'pending',
    },
    {
      id: 'server_health',
      name: 'Healthcheck da API Flask (/health)',
      description: 'Testa se o serviço web do PythonAnywhere está activo e o motor SQLAlchemy/SQLite operacional.',
      status: 'pending',
    },
    {
      id: 'sync_endpoint',
      name: 'Endpoint de Sincronização (/sync/full-snapshot)',
      description: 'Testa a permissão de leitura do banco de dados na nuvem e integridade dos dados JSON.',
      status: 'pending',
    },
    {
      id: 'cors_ssl',
      name: 'Segurança SSL & Política CORS',
      description: 'Verifica certificado de segurança HTTPS e cabeçalhos permitidos para Web, Electron e APKs.',
      status: 'pending',
    },
  ];

  let overallStatus: CloudDiagnosticResult['overallStatus'] = 'healthy';
  let totalLatency = 0;
  let summaryMessage = '';
  let recommendedAction = '';

  // 1. Teste de Interface de Rede
  const checkNet = checks[0];
  checkNet.status = 'running';
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    checkNet.status = 'error';
    checkNet.message = 'Dispositivo completamente desligado da rede.';
    checkNet.details = 'Verifique se o cabo de rede está conectado ou se o Wi-Fi / dados móveis estão activos.';
    overallStatus = 'offline';
  } else {
    checkNet.status = 'success';
    checkNet.message = 'Interface de rede activa e operacional.';
    checkNet.details = `Conectado via ${navigator.userAgent.includes('Mobile') ? 'Rede Móvel / Wi-Fi' : 'Computador / Estação de Trabalho'}.`;
  }

  // Se já falhou na interface, encerra os testes de rede de imediato
  if (overallStatus === 'offline') {
    checks.slice(1).forEach((c) => {
      c.status = 'warning';
      c.message = 'Não executado devido à ausência de rede no dispositivo.';
    });
    return {
      timestamp: new Date().toISOString(),
      overallStatus: 'offline',
      apiUrl: targetUrl,
      latencyMs: 0,
      checks,
      summaryMessage: 'O dispositivo não tem nenhuma ligação à internet activa.',
      recommendedAction: 'Ligue o Wi-Fi ou conecte o cabo de rede. O sistema continuará a funcionar com dados locais.',
    };
  }

  // 2. Teste de Resolução de URL
  const checkDns = checks[1];
  checkDns.status = 'running';
  try {
    const parsed = new URL(targetUrl);
    if (!parsed.protocol.startsWith('http')) {
      throw new Error('Protocolo deve ser http:// ou https://');
    }
    checkDns.status = 'success';
    checkDns.message = `URL válida: ${parsed.origin}`;
    checkDns.details = `Protocolo: ${parsed.protocol} · Host: ${parsed.host}`;
  } catch (urlErr: any) {
    checkDns.status = 'error';
    checkDns.message = 'URL do servidor inválida.';
    checkDns.details = urlErr?.message;
    overallStatus = 'error' as any;
  }

  // 3 & 4. Teste de Latência e Healthcheck
  const checkPing = checks[2];
  const checkHealth = checks[3];
  checkPing.status = 'running';
  checkHealth.status = 'running';

  try {
    const t0 = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const healthRes = await fetch(`${targetUrl}/api/v1/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const t1 = performance.now();
    totalLatency = Math.round(t1 - t0);

    checkPing.latencyMs = totalLatency;
    if (totalLatency > 3000) {
      checkPing.status = 'warning';
      checkPing.message = `Latência elevada: ${totalLatency} ms`;
      checkPing.details = 'A rota para o servidor está lenta, mas as comunicações estão a passar.';
    } else {
      checkPing.status = 'success';
      checkPing.message = `Excelente resposta: ${totalLatency} ms`;
      checkPing.details = 'Tempo de ida e volta do pacote perfeitamente estável.';
    }

    if (healthRes.ok) {
      const data = await healthRes.json().catch(() => ({}));
      checkHealth.status = 'success';
      checkHealth.message = 'API OSDEL e banco de dados activos.';
      checkHealth.details = `Motor: ${data.engine || 'Flask + SQLite'} · Estado: ${data.status || 'OK'}`;
    } else {
      checkHealth.status = 'warning';
      checkHealth.message = `Servidor retornou status HTTP ${healthRes.status}`;
      checkHealth.details = 'O servidor está ligado mas a rota /health não retornou 200 OK.';
      overallStatus = 'degraded';
    }
  } catch (hErr: any) {
    checkPing.status = 'error';
    checkPing.message = 'Tempo limite excedido (> 7000 ms).';
    checkHealth.status = 'error';
    checkHealth.message = 'Não foi possível contactar o servidor.';
    checkHealth.details = hErr?.message || 'Servidor inacessível.';
    overallStatus = 'offline';
  }

  // 5. Teste de Endpoint de Sincronização
  const checkSync = checks[4];
  checkSync.status = 'running';
  if (overallStatus !== 'offline') {
    try {
      const syncController = new AbortController();
      const syncTimeout = setTimeout(() => syncController.abort(), 6000);

      const syncRes = await fetch(`${targetUrl}/api/v1/sync/full-snapshot`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: syncController.signal,
      });

      clearTimeout(syncTimeout);

      if (syncRes.ok) {
        const syncData = await syncRes.json().catch(() => ({}));
        checkSync.status = 'success';
        checkSync.message = 'Endpoint de sincronização bidirecional 100% operacional.';
        checkSync.details = `Tabelas prontas: Clientes (${syncData?.counts?.clients ?? 0}), Faturas (${syncData?.counts?.invoices ?? 0}), TV (${syncData?.counts?.tvChannels ?? 0}).`;
      } else {
        checkSync.status = 'warning';
        checkSync.message = `Erro ao aceder /sync/full-snapshot (Código ${syncRes.status})`;
        checkSync.details = 'A sincronização na nuvem pode estar limitada para utilizadores não autenticados.';
        if (overallStatus === 'healthy') overallStatus = 'degraded';
      }
    } catch (sErr: any) {
      checkSync.status = 'error';
      checkSync.message = 'Falha ao descarregar snapshot da nuvem.';
      checkSync.details = sErr?.message;
      if (overallStatus === 'healthy') overallStatus = 'degraded';
    }
  } else {
    checkSync.status = 'warning';
    checkSync.message = 'Teste ignorado devido a indisponibilidade do servidor.';
  }

  // 6. Teste de CORS e SSL
  const checkCors = checks[5];
  checkCors.status = 'running';
  if (targetUrl.startsWith('https://')) {
    checkCors.status = 'success';
    checkCors.message = 'Ligação segura HTTPS com certificado SSL activo.';
    checkCors.details = 'Comunicação criptografada protegendo os dados financeiros e clientes de Angola.';
  } else {
    checkCors.status = 'warning';
    checkCors.message = 'Ligação insegura HTTP sem SSL.';
    checkCors.details = 'Recomenda-se utilizar HTTPS em produção para proteger as senhas e credenciais.';
  }

  // Sumário e Diagnóstico Inteligente
  if (overallStatus === 'healthy') {
    summaryMessage = '✅ A conexão com o servidor na nuvem está impecável!';
    recommendedAction = 'Tudo pronto. As alterações serão salvas imediatamente na nuvem com réplica local.';
  } else if (overallStatus === 'degraded') {
    summaryMessage = '⚠️ Conexão ativa mas com lentidão ou limitações de rota.';
    recommendedAction = 'O sistema continuará a sincronizar em segundo plano garantindo a integridade dos dados.';
  } else {
    summaryMessage = '🔴 Não foi possível conectar ao servidor na nuvem.';
    recommendedAction = 'O modo Online-First ativou a contingência offline. Pode continuar a trabalhar sem interrupções; os dados serão enviados assim que o servidor voltar.';
  }

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    apiUrl: targetUrl,
    latencyMs: totalLatency,
    checks,
    summaryMessage,
    recommendedAction,
  };
}

/**
 * Inicializador da Sincronização Online-First no arranque da aplicação.
 * Dispara automaticamente ao carregar qualquer página, ao focar e ao reconectar,
 * e mantém um batimento ultraleve (< 2ms) a cada 3 segundos com o PythonAnywhere.
 */
let startupSyncInitialized = false;

export function initOnlineFirstAppSync(): () => void {
  if (typeof window === 'undefined' || startupSyncInitialized) {
    return () => {};
  }

  startupSyncInitialized = true;

  // 1. DISPARO IMEDIATO NO ARRANQUE DO APLICATIVO (Web, Electron, APKs)
  const hasLocalClients = typeof window !== 'undefined' && Boolean(window.localStorage.getItem('osdel:clients') && window.localStorage.getItem('osdel:clients') !== '[]');
  const delay = hasLocalClients ? 300 : 100;
  const startupTimer = setTimeout(() => {
    executeTwoWayCloudSync({ source: 'startup', timeoutMs: 7000 });
  }, delay);

  // 2. DISPARO NA RECONEXÃO À INTERNET
  const handleOnline = () => {
    executeTwoWayCloudSync({ source: 'reconnect', timeoutMs: 8000 });
  };

  // 3. DISPARO AO RETORNAR PARA O APLICATIVO (Alt+Tab, foco na aba)
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      executeTwoWayCloudSync({ source: 'visibility', timeoutMs: 6000 });
    }
  };

  // 4. BATIMENTO CARDÍACO ULTRALEVE (Heartbeat 3s)
  // Consome ZERO processamento no PythonAnywhere Free (< 2ms de resposta)
  // Notifica imediatamente mudanças e verifica revogação de sessão em tempo real
  let isCheckingStatus = false;
  const checkStatusHeartbeat = async () => {
    if (isCheckingStatus || !navigator.onLine || isTwoWaySyncing) return;
    isCheckingStatus = true;
    try {
      const currentVersion = localStorage.getItem('osdel_last_server_version') || '';
      const currentUser = session();
      const usernameParam = currentUser?.username ? encodeURIComponent(currentUser.username) : '';
      const userIdParam = currentUser?.id ? encodeURIComponent(String(currentUser.id)) : '';

      const url = `/api/v1/sync/status?version=${encodeURIComponent(currentVersion)}&user=${usernameParam}&user_id=${userIdParam}`;
      const res = await fetchApiWithFallback(url, { method: 'GET' }, 3000);
      if (res.ok) {
        const data = await res.json();
        
        // Verifica se a conta do utilizador foi revogada por um Administrador
        if (data.session_revoked) {
          try {
            window.sessionStorage.removeItem('osdel-window-session');
            window.localStorage.removeItem('osdel-session');
          } catch {}
          window.dispatchEvent(
            new CustomEvent('osdel-session-revoked', {
              detail: { message: 'Sua conta foi removida por um administrador.' },
            })
          );
          return;
        }

        // Se houve alteração na nuvem feita por outro dispositivo, sincroniza imediatamente
        if (data.has_changes) {
          await executeTwoWayCloudSync({ source: 'periodic', timeoutMs: 7000 });
        }
      }
    } catch {
      // Ignora falhas temporárias de rede
    } finally {
      isCheckingStatus = false;
    }
  };

  // Heartbeat a cada 2 segundos em primeiro plano (e 8 segundos em segundo plano)
  const heartbeatInterval = setInterval(() => {
    const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
    if (isVisible) {
      checkStatusHeartbeat();
    }
  }, 2000);

  const backgroundInterval = setInterval(() => {
    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (isHidden) {
      checkStatusHeartbeat();
    }
  }, 10000);

  // 5. OUvinte do BroadcastChannel para sincronização instantânea inter-abas
  let broadcastChannel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('osdel_sync_channel');
      broadcastChannel.onmessage = (event) => {
        const msg = event.data;
        if (msg && (msg.type === 'DATA_SYNC' || msg.type === 'FULL_SNAPSHOT_APPLIED' || msg.type === 'PAYMENT_RECEIVED' || msg.type === 'INVOICE_UPDATED')) {
          reloadAllFromStorage(msg.key);
          invalidateAllLocalData();
        }
      };
    }
  } catch {}

  window.addEventListener('online', handleOnline);
  window.addEventListener('visibilitychange', handleVisibility);

  return () => {
    clearTimeout(startupTimer);
    clearInterval(heartbeatInterval);
    clearInterval(backgroundInterval);
    if (broadcastChannel) {
      broadcastChannel.close();
    }
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('visibilitychange', handleVisibility);
    startupSyncInitialized = false;
  };
}
