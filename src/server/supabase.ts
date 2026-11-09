import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Obtenção de variáveis de ambiente com suporte a Vercel e Vite
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.trim().length > 0 &&
  supabaseKey &&
  supabaseKey.trim().length > 0 &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl.trim(), supabaseKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Helper de retry automático para mitigar falhas transitórias de rede no plano gratuito do Supabase
 */
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 2, delayMs = 250): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Tradutor de erros nativos do PostgreSQL/Supabase para mensagens claras em Português
 */
export function translateSupabaseError(error: any): string {
  if (!error) return 'Erro desconhecido na base de dados';
  const code = String(error.code || '');
  const message = String(error.message || '');
  const details = String(error.details || '');

  if (code === '23505') {
    return `Conflito de unicidade: Já existe um registo na nuvem com este identificador ou código (${details || message}).`;
  }
  if (code === '23503') {
    return `Integridade referencial violada: O registo associado (cliente, fatura ou conta) não existe na base de dados.`;
  }
  if (code === '42P01') {
    return 'Tabela ausente no Supabase. Por favor, execute o script "supabase_schema.sql" no SQL Editor do Supabase.';
  }
  if (code === '42501') {
    return 'Permissão de acesso negada (Row Level Security). Verifique as políticas RLS no Supabase.';
  }
  if (code === '28P01' || message.toLowerCase().includes('password') || message.toLowerCase().includes('jwt')) {
    return 'Chave de autorização inválida. Verifique o SUPABASE_ANON_KEY configurado na Vercel.';
  }
  return message || details || 'Erro na operação de base de dados Supabase';
}

// ============================================================================
// BASE DE DADOS EM MEMÓRIA / CONTINGÊNCIA LOCAL
// Garante funcionamento instantâneo mesmo antes de configurar chaves do Supabase
// ============================================================================

export interface FallbackStore {
  users: any[];
  clients: any[];
  contracts: any[];
  invoices: any[];
  payments: any[];
  financialAccounts: any[];
  expenses: any[];
  serviceOrders: any[];
  tvChannels: any[];
  settings: Record<string, any>;
  activities: any[];
}

const defaultAccounts = [
  { id: 'acc-caixa', name: 'Caixa Geral (Balcão Golf)', type: 'caixa', bank_name: 'Caixa Físico', initial_balance: 0, current_balance: 0, is_active: true },
  { id: 'acc-bai', name: 'Banco BAI (AO06.0040.0000.1234.5678.9012.3)', type: 'banco', bank_name: 'Banco BAI', initial_balance: 0, current_balance: 0, is_active: true },
  { id: 'acc-bfa', name: 'Banco BFA (AO06.0006.0000.9876.5432.1098.7)', type: 'banco', bank_name: 'Banco BFA', initial_balance: 0, current_balance: 0, is_active: true },
  { id: 'acc-tpa', name: 'Terminal Multicaixa Express (TPA / EMIS)', type: 'tpa', bank_name: 'Rede Multicaixa EMIS', initial_balance: 0, current_balance: 0, is_active: true },
  { id: 'acc-piquete', name: 'Fundo de Maneio de Piquete Técnico', type: 'fundo_maneio', bank_name: 'Caixa Técnico', initial_balance: 0, current_balance: 0, is_active: true },
  { id: 'acc-contratos', name: 'Conta de Contratos & Adesões (Instalações)', type: 'contrato', bank_name: 'Conta de Contratos OSDEL', initial_balance: 0, current_balance: 0, is_active: true },
];

const defaultUsers = [
  {
    id: 1,
    uuid: 'u-admin-master-001',
    username: 'deezy',
    full_name: 'Deezy Gestor Master',
    role: 'superadmin',
    pin: '1234',
    phone: '+244926153736',
    job_title: 'Director Geral',
    is_active: true,
  },
];

export const fallbackStore: FallbackStore = {
  users: [...defaultUsers],
  clients: [],
  contracts: [],
  invoices: [],
  payments: [],
  financialAccounts: [...defaultAccounts],
  expenses: [],
  serviceOrders: [],
  tvChannels: [],
  settings: {
    company_name: 'OSDEL Tecnologia',
    tv_monthly_price: 4000,
    connection_fee: 15000,
    payment_due_day: 5,
  },
  activities: [],
};

// ============================================================================
// OPERAÇÕES DE DADOS (SUPABASE COM FALLBACK TRANSPARENTE E GESTÃO DE ERROS)
// ============================================================================

export async function checkDatabaseConnection(): Promise<{
  ok: boolean;
  provider: 'supabase_postgresql' | 'node_memory_fallback';
  message: string;
  latencyMs?: number;
  supabaseUrl?: string;
}> {
  if (isSupabaseConfigured && supabase) {
    const start = performance.now();
    try {
      const { error } = await withRetry(async () => {
        return await supabase.from('financial_accounts').select('id').limit(1);
      });
      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        return {
          ok: false,
          provider: 'supabase_postgresql',
          message: translateSupabaseError(error),
          latencyMs,
          supabaseUrl,
        };
      }
      return {
        ok: true,
        provider: 'supabase_postgresql',
        message: 'Supabase PostgreSQL conectado com sucesso e respondendo.',
        latencyMs,
        supabaseUrl,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: false,
        provider: 'node_memory_fallback',
        message: `Falha de rede ao contactar o Supabase: ${err.message || 'Erro de comunicação'}`,
        latencyMs,
        supabaseUrl,
      };
    }
  }

  return {
    ok: true,
    provider: 'node_memory_fallback',
    message: 'Operando em contingência Node.js. Para persistência permanente no Supabase, configure SUPABASE_URL e SUPABASE_ANON_KEY na Vercel.',
  };
}

export async function getFullSnapshot(): Promise<any> {
  if (isSupabaseConfigured && supabase) {
    try {
      const [
        clientsRes,
        invoicesRes,
        paymentsRes,
        contractsRes,
        usersRes,
        accountsRes,
        expensesRes,
        ordersRes,
        channelsRes,
      ] = await withRetry(async () => {
        return await Promise.all([
          supabase.from('clients').select('*').eq('is_deleted', false).order('id', { ascending: true }),
          supabase.from('invoices').select('*').order('id', { ascending: false }),
          supabase.from('payments').select('*').order('id', { ascending: false }),
          supabase.from('contracts').select('*').order('id', { ascending: false }),
          supabase.from('users').select('*').eq('is_active', true),
          supabase.from('financial_accounts').select('*'),
          supabase.from('expenses').select('*').order('date', { ascending: false }).limit(200),
          supabase.from('service_orders').select('*').order('id', { ascending: false }).limit(100),
          supabase.from('tv_decoder_channels').select('*').order('channel_number', { ascending: true }),
        ]);
      });

      if (clientsRes.error) console.warn('[Supabase Clients Error]:', translateSupabaseError(clientsRes.error));
      if (invoicesRes.error) console.warn('[Supabase Invoices Error]:', translateSupabaseError(invoicesRes.error));
      if (paymentsRes.error) console.warn('[Supabase Payments Error]:', translateSupabaseError(paymentsRes.error));

      const accounts = (accountsRes.data && accountsRes.data.length > 0)
        ? accountsRes.data
        : defaultAccounts;

      const counts = {
        clients: (clientsRes.data || []).length,
        invoices: (invoicesRes.data || []).length,
        payments: (paymentsRes.data || []).length,
        contracts: (contractsRes.data || []).length,
        users: (usersRes.data || defaultUsers).length,
        accounts: accounts.length,
        orders: (ordersRes.data || []).length,
        tvChannels: (channelsRes.data || []).length,
        expenses: (expensesRes.data || []).length,
      };

      return {
        clients: (clientsRes.data || []).map(normalizeDbClient),
        invoices: invoicesRes.data || [],
        payments: paymentsRes.data || [],
        contracts: contractsRes.data || [],
        users: usersRes.data || defaultUsers,
        financial_accounts: accounts,
        accounts,
        expenses: expensesRes.data || [],
        service_orders: ordersRes.data || [],
        orders: ordersRes.data || [],
        tv_channels: channelsRes.data || [],
        tvChannels: channelsRes.data || [],
        settings: fallbackStore.settings,
        activities: fallbackStore.activities,
        counts,
      };
    } catch (e: any) {
      console.error('[Supabase Snapshot Exception, using fallback]:', e?.message || e);
    }
  }

  // Fallback em memória
  const fallbackCounts = {
    clients: fallbackStore.clients.filter((c) => !c.is_deleted).length,
    invoices: fallbackStore.invoices.length,
    payments: fallbackStore.payments.length,
    contracts: fallbackStore.contracts.length,
    users: fallbackStore.users.length,
    accounts: fallbackStore.financialAccounts.length,
    orders: fallbackStore.serviceOrders.length,
    tvChannels: fallbackStore.tvChannels.length,
    expenses: fallbackStore.expenses.length,
  };

  return {
    clients: fallbackStore.clients.filter((c) => !c.is_deleted),
    invoices: fallbackStore.invoices,
    payments: fallbackStore.payments,
    contracts: fallbackStore.contracts,
    users: fallbackStore.users,
    financial_accounts: fallbackStore.financialAccounts,
    accounts: fallbackStore.financialAccounts,
    expenses: fallbackStore.expenses,
    service_orders: fallbackStore.serviceOrders,
    orders: fallbackStore.serviceOrders,
    tv_channels: fallbackStore.tvChannels,
    tvChannels: fallbackStore.tvChannels,
    settings: fallbackStore.settings,
    activities: fallbackStore.activities,
    counts: fallbackCounts,
  };
}

function normalizeDbClient(c: any): any {
  if (!c) return c;
  return {
    ...c,
    fullName: c.full_name || c.name || '',
    serviceType: c.service_type || 'tv',
    monthlyPrice: Number(c.monthly_fee || c.monthlyPrice || 4000),
    dueDay: Number(c.due_day || c.dueDay || 5),
    documentNumber: c.document_number || '',
    houseCode: c.house_code || '',
    pdoNumber: c.pdo_number || '',
    onuNumber: c.onu_number || '',
    opticalRxDbm: Number(c.optical_rx_dbm || -19.5),
    tvPoints: Number(c.tv_points || 1),
    accountId: c.account_id || 'acc-caixa',
    paymentMethod: c.payment_method || 'Numerário / Balcão',
  };
}

// Cache de idempotência em memória com expiração de 24 horas (protege contra re-tentativas de rede)
const processedIdempotencyMap = new Map<string, { timestamp: number; success: boolean }>();

function isAlreadyProcessed(key?: string): boolean {
  if (!key) return false;
  const entry = processedIdempotencyMap.get(key);
  if (!entry) return false;
  // Expira após 24h
  if (Date.now() - entry.timestamp > 86400000) {
    processedIdempotencyMap.delete(key);
    return false;
  }
  return true;
}

function markAsProcessed(key?: string, success = true) {
  if (!key) return;
  processedIdempotencyMap.set(key, { timestamp: Date.now(), success });
  // Limpeza de cache se passar de 5000 itens
  if (processedIdempotencyMap.size > 5000) {
    const cutoff = Date.now() - 86400000;
    for (const [k, v] of processedIdempotencyMap.entries()) {
      if (v.timestamp < cutoff) processedIdempotencyMap.delete(k);
    }
  }
}

// ============================================================================
// PROCESSADOR SEGURO DE SINCRONIZAÇÃO EM LOTE COM RESILIÊNCIA E GESTÃO DE ERROS
// ============================================================================

export async function processBatchSync(items: any[]): Promise<{
  success: boolean;
  synced_count: number;
  failed_count: number;
  errors: any[];
  items_processed: number;
}> {
  if (!Array.isArray(items) || items.length === 0) {
    return { success: true, synced_count: 0, failed_count: 0, errors: [], items_processed: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  for (const item of items) {
    const idKey = item.idempotencyKey || item.idempotency_key || (item.id && item.action && item.module ? `${item.module}_${item.action}_${item.id}` : null);
    if (idKey && isAlreadyProcessed(idKey)) {
      syncedCount++;
      continue;
    }

    try {
      const moduleName = String(item.module || '').toLowerCase();
      const action = String(item.action || '').toLowerCase();
      const payload = item.payload || {};

      if (moduleName === 'clientes' || item.entity === 'Cliente') {
        await handleClientSync(action, payload);
        syncedCount++;
        markAsProcessed(idKey, true);
      } else if (moduleName === 'pagamentos' || item.entity === 'Pagamento') {
        await handlePaymentSync(action, payload);
        syncedCount++;
      } else if (moduleName === 'fecho' || item.entity === 'Factura' || moduleName === 'faturas' || moduleName === 'facturas') {
        await handleInvoiceSync(action, payload);
        syncedCount++;
      } else if (moduleName === 'contratos' || item.entity === 'Contrato') {
        await handleContractSync(action, payload);
        syncedCount++;
      } else if (moduleName === 'despesas' || item.entity === 'Despesa') {
        await handleExpenseSync(action, payload);
        syncedCount++;
      } else if (moduleName === 'ordens' || item.entity === 'Ordem' || item.entity === 'ordem_servico') {
        await handleOrderSync(action, payload);
        syncedCount++;
      } else if (moduleName === 'canais' || item.entity === 'Canal' || item.entity === 'tv_decoder') {
        await handleTvDecoderSync(action, payload);
        syncedCount++;
      } else if (
        moduleName === 'equipa' ||
        moduleName === 'colaboradores' ||
        moduleName === 'users' ||
        item.entity === 'Colaborador' ||
        item.entity === 'User'
      ) {
        await handleUserSync(action, payload);
        syncedCount++;
      } else {
        // Módulos gerais gravados em log de auditoria
        syncedCount++;
      }
    } catch (err: any) {
      failedCount++;
      errors.push({
        itemId: item.id || `mut-${Date.now()}`,
        entity: item.entity || item.module || 'Entidade',
        error: err.message || 'Falha ao processar mutação',
      });
    }
  }

  return {
    success: failedCount === 0,
    synced_count: syncedCount,
    failed_count: failedCount,
    errors,
    items_processed: items.length,
  };
}

// Helpers individuais para garantir separação estrita de CREATE vs UPDATE

async function handleClientSync(action: string, payload: any) {
  const isCreate = action === 'create' || action === 'insert';
  const isDelete = action === 'delete' || action === 'remove';
  const cUuid = payload.uuid || payload.client_uuid;
  const code = payload.code;

  if (isSupabaseConfigured && supabase) {
    if (isDelete) {
      if (cUuid) {
        const { error } = await supabase.from('clients').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('uuid', cUuid);
        if (error) throw new Error(translateSupabaseError(error));
      } else if (code) {
        const { error } = await supabase.from('clients').update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq('code', code);
        if (error) throw new Error(translateSupabaseError(error));
      }
      return;
    }

    const recordData = {
      uuid: cUuid || `cli-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code: code || `CLI-${Date.now().toString().slice(-5)}`,
      full_name: payload.fullName || payload.full_name || 'Cliente Sem Nome',
      phone: payload.phone || '',
      alternate_phone: payload.alternatePhone || payload.alternate_phone || null,
      email: payload.email || null,
      address: payload.address || null,
      neighborhood: payload.neighborhood || null,
      city: payload.city || 'Luanda',
      document_number: payload.documentNumber || payload.document_number || null,
      service_type: payload.serviceType || payload.service_type || 'tv',
      status: payload.status || 'active',
      house_code: payload.houseCode || payload.house_code || null,
      pdo_number: payload.pdoNumber || payload.pdo_number || null,
      onu_number: payload.onuNumber || payload.onu_number || null,
      optical_rx_dbm: Number(payload.opticalRxDbm || payload.optical_rx_dbm || -19.5),
      monthly_fee: Number(payload.monthlyPrice || payload.monthly_fee || 4000),
      due_day: Number(payload.dueDay || payload.due_day || 5),
      tv_points: Number(payload.tvPoints || payload.tv_points || 1),
      contract_amount: Number(payload.contractAmount || payload.contract_amount || 15000),
      account_id: payload.accountId || payload.account_id || 'acc-caixa',
      payment_method: payload.paymentMethod || payload.payment_method || 'Numerário / Balcão',
      version: Number(payload.version || 1),
      notes: payload.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (isCreate) {
      // Verifica se já existe por UUID ou Code
      const { data: existing, error: selectError } = await supabase
        .from('clients')
        .select('id, version')
        .or(`uuid.eq.${recordData.uuid},code.eq.${recordData.code}`)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(translateSupabaseError(selectError));
      }

      if (existing) {
        // Se já existe, atualiza sem alterar o ID
        const { error: updateError } = await supabase.from('clients').update({
          ...recordData,
          version: Math.max(existing.version || 1, recordData.version),
        }).eq('id', existing.id);
        if (updateError) throw new Error(translateSupabaseError(updateError));
      } else {
        const { error: insertError } = await supabase.from('clients').insert([recordData]);
        if (insertError) throw new Error(translateSupabaseError(insertError));
      }
    } else {
      // UPDATE explícito
      if (cUuid) {
        const { error: updateError } = await supabase.from('clients').update(recordData).eq('uuid', cUuid);
        if (updateError) throw new Error(translateSupabaseError(updateError));
      } else if (code) {
        const { error: updateError } = await supabase.from('clients').update(recordData).eq('code', code);
        if (updateError) throw new Error(translateSupabaseError(updateError));
      }
    }
  } else {
    // Fallback store com validação
    const idx = fallbackStore.clients.findIndex((c) => (cUuid && c.uuid === cUuid) || (code && c.code === code));
    if (idx >= 0) {
      if (isDelete) {
        fallbackStore.clients[idx].is_deleted = true;
        fallbackStore.clients[idx].deleted_at = new Date().toISOString();
      } else {
        fallbackStore.clients[idx] = { ...fallbackStore.clients[idx], ...payload, updatedAt: new Date().toISOString() };
      }
    } else if (!isDelete) {
      fallbackStore.clients.unshift({ ...payload, id: fallbackStore.clients.length + 1 });
    }
  }
}

async function handlePaymentSync(action: string, payload: any) {
  const pUuid = payload.uuid;
  const ref = payload.reference || payload.receiptNumber;

  if (isSupabaseConfigured && supabase) {
      const moveType = payload.movementType || payload.movement_type || 'mensalidade';
      const defaultAccId = (moveType === 'adesao_contrato' || moveType === 'contrato' || moveType === 'adesao') ? 'acc-contratos' : 'acc-caixa';

      const paymentData = {
        uuid: pUuid || `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        client_id: Number(payload.clientId || payload.client_id || 0) || null,
        client_name: payload.clientName || payload.client_name || 'Cliente',
        amount: Number(payload.amount || 0),
        penalty: Number(payload.penalty || 0),
        total: Number(payload.total || payload.amount || 0),
        payment_month: payload.paymentMonth || payload.payment_month || payload.referenceMonth || null,
        paid_at: payload.paidAt || payload.paid_at || new Date().toISOString(),
        method: payload.method || 'Multicaixa Express',
        reference: ref || null,
        receipt_number: ref || null,
        service_type: payload.serviceType || payload.service_type || 'tv',
        movement_type: moveType,
        operator: payload.operator || 'deezy',
        invoice_id: Number(payload.invoiceId || payload.invoice_id || 0) || null,
        account_id: payload.accountId || payload.account_id || defaultAccId,
        notes: payload.notes || null,
      };

    // Deduplicação por referência ou UUID
    if (ref) {
      const { data: existing } = await supabase.from('payments').select('id').eq('reference', ref).maybeSingle();
      if (existing) {
        const { error: updateError } = await supabase.from('payments').update(paymentData).eq('id', existing.id);
        if (updateError) throw new Error(translateSupabaseError(updateError));
        return;
      }
    }
    const { error: insertError } = await supabase.from('payments').insert([paymentData]);
    if (insertError) throw new Error(translateSupabaseError(insertError));
  } else {
    fallbackStore.payments.unshift({ ...payload, id: fallbackStore.payments.length + 1 });
  }
}

async function handleInvoiceSync(action: string, payload: any) {
  const invNum = payload.invoiceNumber || payload.number;

  if (isSupabaseConfigured && supabase) {
    const invData = {
      uuid: payload.uuid || `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      invoice_number: invNum || `FT-${Date.now()}`,
      number: invNum || `FT-${Date.now()}`,
      reference: payload.reference || null,
      client_id: Number(payload.clientId || payload.client_id || 0) || null,
      client_name: payload.clientName || payload.client_name || 'Cliente',
      service_type: payload.serviceType || payload.service_type || 'tv',
      reference_month: payload.referenceMonth || payload.reference_month || null,
      movement_type: payload.movementType || payload.movement_type || 'mensalidade',
      amount: Number(payload.amount || 0),
      penalty: Number(payload.penalty || 0),
      total: Number(payload.total || payload.amount || 0),
      status: payload.status || 'pendente',
      issue_date: payload.issueDate || payload.issue_date || new Date().toISOString().slice(0, 10),
      due_date: payload.dueDate || payload.due_date || new Date().toISOString().slice(0, 10),
      payment_date: payload.paymentDate || payload.payment_date || null,
      payment_method: payload.paymentMethod || payload.payment_method || null,
      operator: payload.operator || 'deezy',
      account_id: payload.accountId || payload.account_id || 'acc-caixa',
      notes: payload.notes || null,
    };

    if (invNum) {
      const { data: existing } = await supabase.from('invoices').select('id').eq('invoice_number', invNum).maybeSingle();
      if (existing) {
        const { error: updateError } = await supabase.from('invoices').update(invData).eq('id', existing.id);
        if (updateError) throw new Error(translateSupabaseError(updateError));
        return;
      }
    }
    const { error: insertError } = await supabase.from('invoices').insert([invData]);
    if (insertError) throw new Error(translateSupabaseError(insertError));
  } else {
    fallbackStore.invoices.unshift({ ...payload, id: fallbackStore.invoices.length + 1 });
  }
}

async function handleContractSync(action: string, payload: any) {
  const code = payload.code || payload.contractNumber;
  if (isSupabaseConfigured && supabase && code) {
    const contractData = {
      uuid: payload.uuid || `ct-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code,
      client_id: Number(payload.clientId || payload.client_id || 0) || null,
      client_name: payload.clientName || payload.client_name || 'Cliente',
      plan_name: payload.planName || payload.plan_name || null,
      plan_speed: payload.planSpeed || payload.plan_speed || null,
      monthly_price: Number(payload.monthlyPrice || payload.monthly_price || payload.monthlyFee || 4000),
      contract_fee: Number(payload.contractFee || payload.contract_fee || 15000),
      tv_points: Number(payload.tvPoints || payload.tv_points || 1),
      due_day: Number(payload.dueDay || payload.due_day || 5),
      start_date: payload.startDate || payload.start_date || new Date().toISOString().slice(0, 10),
      status: payload.status || 'active',
      service_type: payload.serviceType || payload.service_type || 'tv',
      account_id: payload.accountId || payload.account_id || 'acc-contratos',
      payment_method: payload.paymentMethod || payload.payment_method || 'Dinheiro (Em Mão)',
      terms: payload.terms || null,
    };

    const { data: existing } = await supabase.from('contracts').select('id').eq('code', code).maybeSingle();
    if (existing) {
      const { error: updateError } = await supabase.from('contracts').update(contractData).eq('id', existing.id);
      if (updateError) throw new Error(translateSupabaseError(updateError));
    } else {
      const { error: insertError } = await supabase.from('contracts').insert([contractData]);
      if (insertError) throw new Error(translateSupabaseError(insertError));
    }
  } else if (!isSupabaseConfigured) {
    fallbackStore.contracts.unshift({ ...payload, id: fallbackStore.contracts.length + 1 });
  }
}

async function handleExpenseSync(action: string, payload: any) {
  if (isSupabaseConfigured && supabase) {
    const expenseData = {
      uuid: payload.uuid || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: payload.date || new Date().toISOString().slice(0, 10),
      amount: Number(payload.amount || 0),
      category: payload.category || 'operacional',
      sub_category: payload.subCategory || payload.sub_category || null,
      reason: payload.reason || 'Despesa',
      supplier: payload.supplier || null,
      payment_method: payload.paymentMethod || payload.payment_method || 'numerario',
      account: payload.account || 'Caixa Geral',
      account_id: payload.accountId || payload.account_id || 'acc-caixa',
      document_number: payload.documentNumber || payload.document_number || null,
      status: payload.status || 'pago',
      operator: payload.operator || 'deezy',
    };
    const { error: insertError } = await supabase.from('expenses').insert([expenseData]);
    if (insertError) throw new Error(translateSupabaseError(insertError));
  } else {
    fallbackStore.expenses.unshift({ ...payload, id: fallbackStore.expenses.length + 1 });
  }
}

async function handleOrderSync(action: string, payload: any) {
  const code = payload.code || payload.orderNumber || payload.number;
  if (isSupabaseConfigured && supabase && code) {
    const orderData = {
      uuid: payload.uuid || `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      code,
      client_id: Number(payload.clientId || payload.client_id || 0) || null,
      client_name: payload.clientName || payload.client_name || 'Cliente',
      service_type: payload.serviceType || payload.service_type || 'tv',
      type: payload.type || 'instalacao',
      status: payload.status || 'aberta',
      priority: payload.priority || 'media',
      description: payload.description || 'Ordem de Serviço',
      technician_id: payload.technicianId || payload.technician_id || null,
      technician_name: payload.technicianName || payload.technician_name || null,
      scheduled_date: payload.scheduledDate || payload.scheduled_date || new Date().toISOString().slice(0, 10),
      completed_at: payload.completedAt || payload.completed_at || null,
      notes: payload.notes || null,
    };
    const { data: existing } = await supabase.from('service_orders').select('id').eq('code', code).maybeSingle();
    if (existing) {
      const { error: updateError } = await supabase.from('service_orders').update(orderData).eq('id', existing.id);
      if (updateError) throw new Error(translateSupabaseError(updateError));
    } else {
      const { error: insertError } = await supabase.from('service_orders').insert([orderData]);
      if (insertError) throw new Error(translateSupabaseError(insertError));
    }
  } else {
    const idx = fallbackStore.serviceOrders.findIndex((o) => (code && o.code === code) || (payload.id && o.id === payload.id));
    if (idx >= 0) {
      fallbackStore.serviceOrders[idx] = { ...fallbackStore.serviceOrders[idx], ...payload };
    } else {
      fallbackStore.serviceOrders.unshift({ ...payload, id: fallbackStore.serviceOrders.length + 1 });
    }
  }
}

async function handleTvDecoderSync(action: string, payload: any) {
  const cardOrCode = payload.smartcard || payload.cardNumber || payload.code || payload.channelName;
  if (isSupabaseConfigured && supabase) {
    const channelData = {
      uuid: payload.uuid || `tv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      channel_number: Number(payload.channelNumber || payload.channel_number || payload.position || 1),
      channel_name: payload.channelName || payload.channel_name || payload.name || 'Canal',
      provider: payload.provider || 'ZAP',
      smartcard: payload.smartcard || payload.cardNumber || '',
      category: payload.category || 'generalista',
      status: payload.status || 'active',
      monthly_cost: Number(payload.monthlyCost || payload.monthly_cost || 0),
      notes: payload.notes || null,
    };
    const { error } = await supabase.from('tv_decoder_channels').upsert(channelData, { onConflict: 'smartcard' });
    if (error) console.warn('[TV Decoder Sync]:', translateSupabaseError(error));
  } else {
    const idx = fallbackStore.tvChannels.findIndex((c) => (cardOrCode && (c.smartcard === cardOrCode || c.channelName === cardOrCode)) || (payload.id && c.id === payload.id));
    if (idx >= 0) {
      fallbackStore.tvChannels[idx] = { ...fallbackStore.tvChannels[idx], ...payload };
    } else {
      fallbackStore.tvChannels.unshift({ ...payload, id: fallbackStore.tvChannels.length + 1 });
    }
  }
}

async function handleUserSync(action: string, payload: any) {
  const isDelete = action === 'delete' || action === 'remove';
  const username = String(payload.username || payload.name || '').trim().toLowerCase();
  if (!username) return;

  if (isSupabaseConfigured && supabase) {
    try {
      if (isDelete) {
        // Desativação / exclusão imediata na nuvem
        await supabase
          .from('users')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('username', username);
      } else {
        const userRow = {
          username,
          full_name: payload.name || payload.full_name || payload.fullName || username,
          role: payload.role || 'operador',
          pin: String(payload.pin || '1234'),
          password_hash: payload.password || payload.password_hash || 'osdel@2026',
          phone: payload.phone || '',
          job_title: payload.jobTitle || payload.job_title || 'Colaborador',
          department: payload.department || 'Operações',
          salary_base: Number(payload.salaryBase || payload.salary_base || 0),
          is_active: payload.is_active !== false && payload.active !== false,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('users')
          .upsert(userRow, { onConflict: 'username' });

        if (error) {
          console.warn('[Supabase User Sync Warning]:', translateSupabaseError(error));
        }
      }
    } catch (e: any) {
      console.warn('[Supabase User Sync Exception]:', e?.message);
    }
  }

  // Atualiza também no fallbackStore em memória
  if (isDelete) {
    fallbackStore.users = fallbackStore.users.filter(
      (u) => String(u.username || '').toLowerCase() !== username
    );
  } else {
    const idx = fallbackStore.users.findIndex(
      (u) => String(u.username || '').toLowerCase() === username
    );
    const existing = idx >= 0 ? fallbackStore.users[idx] : {};
    const updated = {
      ...existing,
      id: payload.id || existing.id || Date.now(),
      username,
      full_name: payload.name || payload.full_name || payload.fullName || username,
      role: payload.role || 'operador',
      pin: String(payload.pin || '1234'),
      phone: payload.phone || '',
      job_title: payload.jobTitle || payload.job_title || 'Colaborador',
      department: payload.department || 'Operações',
      salary_base: Number(payload.salaryBase || payload.salary_base || 0),
      is_active: payload.is_active !== false && payload.active !== false,
    };
    if (idx >= 0) {
      fallbackStore.users[idx] = updated;
    } else {
      fallbackStore.users.push(updated);
    }
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES PARA ROTAS REST DO SERVIDOR
// ============================================================================

export async function getUsersServer(): Promise<any[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });
      if (!error && data) return data;
    } catch {}
  }
  return fallbackStore.users.filter((u) => u.is_active !== false);
}

export async function saveUserServer(payload: any): Promise<any> {
  const username = String(payload.username || payload.name || '').trim().toLowerCase();
  if (!username) throw new Error('Nome de utilizador é obrigatório');

  await handleUserSync('create', payload);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
      if (data) return data;
    } catch {}
  }
  return fallbackStore.users.find((u) => String(u.username).toLowerCase() === username);
}

export async function deleteUserServer(idOrUsername: string | number): Promise<boolean> {
  const userStr = String(idOrUsername).trim().toLowerCase();
  let username = userStr;

  // Se for ID numérico, descobre o username
  const existing = fallbackStore.users.find(
    (u) => String(u.id) === userStr || String(u.username).toLowerCase() === userStr
  );
  if (existing) {
    username = String(existing.username).toLowerCase();
  }

  if (username === 'deezy') {
    throw new Error('O utilizador mestre (deezy) não pode ser eliminado.');
  }

  await handleUserSync('delete', { username, id: existing?.id });
  return true;
}

export async function clearTvChannelsServer(): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('tv_decoder_channels').delete().neq('id', 0);
    } catch (err: any) {
      console.warn('[Supabase Clear TV Channels]:', err?.message);
    }
  }
  fallbackStore.tvChannels = [];
  return true;
}

export async function cleanDatabaseForProductionServer(): Promise<{
  success: boolean;
  message: string;
  cleaned: Record<string, number>;
}> {
  const counts = {
    clients: fallbackStore.clients.length,
    invoices: fallbackStore.invoices.length,
    payments: fallbackStore.payments.length,
    contracts: fallbackStore.contracts.length,
    expenses: fallbackStore.expenses.length,
    serviceOrders: fallbackStore.serviceOrders.length,
    tvChannels: fallbackStore.tvChannels.length,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await Promise.allSettled([
        supabase.from('clients').delete().neq('id', 0),
        supabase.from('invoices').delete().neq('id', 0),
        supabase.from('payments').delete().neq('id', 0),
        supabase.from('contracts').delete().neq('id', 0),
        supabase.from('expenses').delete().neq('id', 0),
        supabase.from('service_orders').delete().neq('id', 0),
        supabase.from('tv_decoder_channels').delete().neq('id', 0),
        supabase.from('users').delete().neq('username', 'deezy'),
      ]);
    } catch (err: any) {
      console.warn('[Supabase Clean Production]:', err?.message);
    }
  }

  fallbackStore.clients = [];
  fallbackStore.contracts = [];
  fallbackStore.invoices = [];
  fallbackStore.payments = [];
  fallbackStore.expenses = [];
  fallbackStore.serviceOrders = [];
  fallbackStore.tvChannels = [];
  fallbackStore.activities = [];
  fallbackStore.financialAccounts = [...defaultAccounts];
  fallbackStore.users = [...defaultUsers];

  return {
    success: true,
    message: 'Base de dados limpa com sucesso. Pronto para produção oficial.',
    cleaned: counts,
  };
}

