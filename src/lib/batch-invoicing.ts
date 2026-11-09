/**
 * OSDEL TECNOLOGIA - Assistente de Faturação Mensal em Lote
 * 
 * Gera as faturas/mensalidades de todos os clientes ativos para o mês de competência escolhido
 * com BLOQUEIO RIGOROSO DE DUPLICADOS:
 * - Se um cliente já possuir fatura para o mês selecionado, é pulado automaticamente com transparência.
 * - Suporta filtros por tipo de serviço (TV, Internet Fibra, Combo ou Todos).
 * - Calcula datas de vencimento individuais conforme o dia de vencimento contratual (ex: dia 5).
 * - Envia o lote para a fila de sincronização em nuvem e dispara eventos para todas as janelas.
 */

import {
  normalizeInvoice,
  logAuditAction,
  session,
  AnyRecord,
} from '@/lib/local-api';
import { enqueueSyncMutation } from '@/lib/offline-sync';
import { executeTwoWayCloudSync } from '@/lib/online-first-sync';

export interface BatchInvoicingPreview {
  competenceMonth: string; // Ex: '2026-11'
  competenceLabel: string; // Ex: 'Novembro de 2026'
  totalActiveClients: number;
  eligibleClientsCount: number;
  alreadyInvoicedCount: number;
  toInvoiceCount: number;
  projectedRevenueKz: number;
  serviceBreakdown: {
    tv: number;
    fibra: number;
    combo: number;
  };
  sampleClientsToInvoice: Array<{
    id: number;
    code: string;
    fullName: string;
    serviceType: string;
    monthlyPrice: number;
    dueDate: string;
  }>;
}

export interface BatchInvoicingResult {
  success: boolean;
  competenceMonth: string;
  generatedCount: number;
  skippedCount: number;
  totalAmountKz: number;
  durationMs: number;
  generatedInvoices: AnyRecord[];
  timestamp: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function formatCompetenceLabel(ym: string): string {
  try {
    const [year, month] = ym.split('-');
    const mIdx = Number(month) - 1;
    return `${MONTH_NAMES[mIdx] || month} de ${year}`;
  } catch {
    return ym;
  }
}

/**
 * Gera previsão detalhada do lote de faturamento sem aplicar alterações
 */
export function previewBatchInvoicing(
  targetMonth: string,
  serviceModeFilter: 'todos' | 'fibra' | 'tv' | 'combo' = 'todos'
): BatchInvoicingPreview {
  let clients: AnyRecord[] = [];
  let invoices: AnyRecord[] = [];

  try {
    const rC = localStorage.getItem('osdel:clients') || localStorage.getItem('osdel_clients');
    if (rC) clients = JSON.parse(rC);

    const rI = localStorage.getItem('osdel:invoices') || localStorage.getItem('osdel_invoices');
    if (rI) invoices = JSON.parse(rI);
  } catch {}

  // Clientes ativos
  const activeClients = clients.filter((c) => (c.status === 'active' || !c.status) && !c.is_deleted);

  // Filtra por modo de serviço se solicitado
  const filteredClients = activeClients.filter((c) => {
    if (serviceModeFilter === 'todos') return true;
    const sType = String(c.serviceType || c.service_type || 'tv').toLowerCase();
    if (serviceModeFilter === 'fibra') return sType === 'internet' || sType === 'fibra';
    if (serviceModeFilter === 'tv') return sType === 'tv';
    if (serviceModeFilter === 'combo') return sType === 'combo';
    return true;
  });

  // Mapeia quem já tem fatura para o mês selecionado
  const alreadyInvoicedClientIds = new Set<number>();
  invoices.forEach((inv) => {
    const cId = Number(inv.clientId || inv.client_id);
    const refMonth = inv.referenceMonth || inv.reference_month || (inv.issueDate ? String(inv.issueDate).slice(0, 7) : '');
    const movType = inv.movementType || inv.movement_type || 'mensalidade';
    if (cId && refMonth === targetMonth && movType === 'mensalidade') {
      alreadyInvoicedClientIds.add(cId);
    }
  });

  const clientsToInvoice = filteredClients.filter((c) => !alreadyInvoicedClientIds.has(Number(c.id)));
  const alreadyInvoicedCount = filteredClients.length - clientsToInvoice.length;

  let projectedRevenue = 0;
  const breakdown = { tv: 0, fibra: 0, combo: 0 };

  clientsToInvoice.forEach((c) => {
    const sType = String(c.serviceType || c.service_type || 'tv').toLowerCase();
    const fee = Number(c.monthlyPrice || c.monthly_fee || (sType === 'tv' ? 4000 : 6500));
    projectedRevenue += fee;

    if (sType === 'tv') breakdown.tv++;
    else if (sType === 'internet' || sType === 'fibra') breakdown.fibra++;
    else breakdown.combo++;
  });

  const sampleClients = clientsToInvoice.slice(0, 6).map((c) => {
    const dueDay = Number(c.dueDay || c.due_day || 5);
    const dueDayStr = String(dueDay).padStart(2, '0');
    const sType = String(c.serviceType || c.service_type || 'tv').toLowerCase();
    const fee = Number(c.monthlyPrice || c.monthly_fee || (sType === 'tv' ? 4000 : 6500));
    return {
      id: Number(c.id),
      code: c.code || `CLI-${c.id}`,
      fullName: c.fullName || c.name || 'Cliente',
      serviceType: sType,
      monthlyPrice: fee,
      dueDate: `${targetMonth}-${dueDayStr}`,
    };
  });

  return {
    competenceMonth: targetMonth,
    competenceLabel: formatCompetenceLabel(targetMonth),
    totalActiveClients: activeClients.length,
    eligibleClientsCount: filteredClients.length,
    alreadyInvoicedCount,
    toInvoiceCount: clientsToInvoice.length,
    projectedRevenueKz: projectedRevenue,
    serviceBreakdown: breakdown,
    sampleClientsToInvoice: sampleClients,
  };
}

/**
 * Executa a Faturação Mensal em Lote
 */
export async function executeBatchInvoicing(
  targetMonth: string,
  options?: {
    serviceModeFilter?: 'todos' | 'fibra' | 'tv' | 'combo';
    operatorName?: string;
  }
): Promise<BatchInvoicingResult> {
  const startTime = Date.now();
  const serviceFilter = options?.serviceModeFilter || 'todos';
  const currentSession = session();
  const operator = options?.operatorName || currentSession?.username || 'deezy';

  let clients: AnyRecord[] = [];
  let invoices: AnyRecord[] = [];

  try {
    const rC = localStorage.getItem('osdel:clients') || localStorage.getItem('osdel_clients');
    if (rC) clients = JSON.parse(rC);

    const rI = localStorage.getItem('osdel:invoices') || localStorage.getItem('osdel_invoices');
    if (rI) invoices = JSON.parse(rI);
  } catch {}

  // Clientes ativos
  const activeClients = clients.filter((c) => (c.status === 'active' || !c.status) && !c.is_deleted);

  const filteredClients = activeClients.filter((c) => {
    if (serviceFilter === 'todos') return true;
    const sType = String(c.serviceType || c.service_type || 'tv').toLowerCase();
    if (serviceFilter === 'fibra') return sType === 'internet' || sType === 'fibra';
    if (serviceFilter === 'tv') return sType === 'tv';
    if (serviceFilter === 'combo') return sType === 'combo';
    return true;
  });

  // Mapeia quem já possui fatura para o mês (bloqueio 100% rigoroso)
  const existingClientMonths = new Set<string>();
  invoices.forEach((inv) => {
    const cId = Number(inv.clientId || inv.client_id);
    const refMonth = inv.referenceMonth || inv.reference_month || (inv.issueDate ? String(inv.issueDate).slice(0, 7) : '');
    const movType = inv.movementType || inv.movement_type || 'mensalidade';
    if (cId && refMonth && movType === 'mensalidade') {
      existingClientMonths.add(`${cId}_${refMonth}`);
    }
  });

  const generatedInvoices: AnyRecord[] = [];
  let totalAmount = 0;
  let skippedCount = 0;

  // Próximo ID sequencial
  let nextId = Math.max(0, ...invoices.map((inv) => Number(inv.id) || 0)) + 1;
  const currentYear = targetMonth.slice(0, 4);

  const issueDate = new Date().toISOString().slice(0, 10);

  for (const client of filteredClients) {
    const cId = Number(client.id);
    const checkKey = `${cId}_${targetMonth}`;

    // Bloqueio de duplicados
    if (existingClientMonths.has(checkKey)) {
      skippedCount++;
      continue;
    }

    const sType = client.serviceType || client.service_type || 'tv';
    const amount = Number(client.monthlyPrice || client.monthly_fee || (sType === 'tv' ? 4000 : 6500));
    const dueDay = Number(client.dueDay || client.due_day || 5);
    const dueDayStr = String(dueDay).padStart(2, '0');
    const dueDate = `${targetMonth}-${dueDayStr}`;

    const invNumber = `FT-${currentYear}/${String(nextId).padStart(5, '0')}`;
    const newInvoice = normalizeInvoice({
      id: nextId,
      invoiceNumber: invNumber,
      number: invNumber,
      clientId: cId,
      client_id: cId,
      clientName: client.fullName || client.name || 'Cliente OSDEL',
      serviceType: sType,
      referenceMonth: targetMonth,
      movementType: 'mensalidade',
      amount,
      penalty: 0,
      total: amount,
      status: 'pendente',
      issueDate,
      dueDate,
      operator,
      accountId: client.accountId || client.account_id || 'acc-caixa',
      paymentMethod: client.paymentMethod || 'Multicaixa Express',
      notes: `Faturação mensal automática da competência ${formatCompetenceLabel(targetMonth)}.`,
    });

    generatedInvoices.push(newInvoice);
    existingClientMonths.add(checkKey);
    totalAmount += amount;
    nextId++;

    // Enfileira mutação de sincronização
    enqueueSyncMutation({
      module: 'fecho',
      action: 'create',
      entity: 'Factura',
      description: `Fatura ${invNumber} gerada para ${newInvoice.clientName} (${newInvoice.total} Kz)`,
      payload: newInvoice,
    });
  }

  if (generatedInvoices.length > 0) {
    // Insere novas faturas no início
    invoices = [...generatedInvoices, ...invoices];

    localStorage.setItem('osdel:invoices', JSON.stringify(invoices));
    localStorage.setItem('osdel_invoices', JSON.stringify(invoices));

    window.dispatchEvent(new CustomEvent('osdel-invoices-updated'));

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({
          type: 'BATCH_INVOICING_EXECUTED',
          count: generatedInvoices.length,
          competenceMonth: targetMonth,
          totalAmount,
        });
        bc.close();
      } catch {}
    }

    logAuditAction({
      action: 'FATURACAO_EM_LOTE',
      module: 'Facturação',
      description: `Emitidas ${generatedInvoices.length} faturas da competência ${targetMonth} (${totalAmount.toLocaleString('pt-AO')} Kz). ${skippedCount} clientes pulados por já terem fatura.`,
      user: operator,
      targetId: `BATCH-${targetMonth}`,
    });

    // Dispara sincronização em nuvem
    executeTwoWayCloudSync({ source: 'manual' }).catch(() => {});
  }

  return {
    success: true,
    competenceMonth: targetMonth,
    generatedCount: generatedInvoices.length,
    skippedCount,
    totalAmountKz: totalAmount,
    durationMs: Date.now() - startTime,
    generatedInvoices,
    timestamp: new Date().toISOString(),
  };
}
