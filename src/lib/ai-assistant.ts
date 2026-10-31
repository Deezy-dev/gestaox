/**
 * OSDEL TECNOLOGIA - MOTOR DE INTELIGÊNCIA ARTIFICIAL TELECOM
 * ==============================================================================
 * Assistente Inteligente de Resolução Operacional de Casos (Clientes & Membros da Empresa)
 * 
 * Capacidades Reais:
 * - Diagnostica avarias de clientes (dBm óptico, corte por atraso, perda de sinal RF/TV).
 * - Gera Ações Executáveis (Abertura de O.S. automática, Acordo de Pagamento, Despacho para Técnicos).
 * - Envia mensagens profissionais formatadas para o WhatsApp (+244) do cliente ou do técnico.
 * - Apura caixa do dia, estoque de cabos/conectorização da carrinha e escalas da equipa.
 * - Suporta 100% offline ou conectado à API do PythonAnywhere sem custo de servidor.
 * ==============================================================================
 */

export interface AssistantAction {
  id: string;
  label: string;
  type:
    | 'whatsapp'
    | 'create_order'
    | 'create_agreement'
    | 'reconnect_signal'
    | 'cut_signal'
    | 'create_client'
    | 'create_invoice'
    | 'copy_text'
    | 'view_client';
  payload: {
    phone?: string;
    whatsappText?: string;
    clientCode?: string;
    clientId?: number;
    clientName?: string;
    address?: string;
    street?: string;
    neighborhood?: string;
    houseCode?: string;
    serviceType?: 'tv' | 'fibra' | 'combo';
    planName?: string;
    monthlyFee?: number;
    tvPoints?: number;
    extraTvs?: number;
    dueDay?: number;
    pdoBox?: string;
    port?: string;
    onuSerial?: string;
    nif?: string;
    clientPin?: string;
    invoiceAmount?: number;
    invoiceMethod?: string;
    orderType?: 'reparacao' | 'instalacao' | 'corte' | 'religacao';
    technicianName?: string;
    priority?: 'alta' | 'normal' | 'baixa';
    orderNotes?: string;
    copyContent?: string;
    promisedDate?: string;
    promisedAmount?: number;
  };
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  category?: 'tecnico' | 'financeiro' | 'comercial' | 'suporte';
  actions?: AssistantAction[];
  suggestedActions?: Array<{ label: string; query: string }>;
}

export interface AssistantContext {
  mode: 'fibra' | 'tv' | 'ambos' | null;
  persona: 'admin' | 'client' | 'technician';
  userName?: string;
  clientCode?: string;
  clientStatus?: string;
  serviceType?: string;
}

export interface QuickSuggestion {
  label: string;
  query: string;
  icon?: string;
  category: 'fibra' | 'tv' | 'pagamentos' | 'rede' | 'geral';
}

const kz = (val?: number | string | null) =>
  new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  })
    .format(Number(val || 0))
    .replace('AOA', 'Kz');

// Sugestões inteligentes operacionais para resolver casos reais
export const QUICK_SUGGESTIONS: Record<'admin' | 'client' | 'technician', QuickSuggestion[]> = {
  admin: [
    { label: '📊 Gerar e Explicar Relatório Gerencial deste Mês', query: 'Gerar e explicar relatório gerencial completo deste mês com análise de pagamentos e inadimplência', category: 'pagamentos' },
    { label: '💳 Explicar Hábitos de Pagamento e Arrecadação', query: 'Explicar a eficiência de pagamentos, arrecadação por método e risco de inadimplência', category: 'pagamentos' },
    { label: '👤 Cadastrar Novo Assinante de Fibra/TV', query: 'Cadastrar novo cliente chamado Carlos Mendes com telefone 923456789 na Rua 12 com TV e Fibra 10 Mbps', category: 'comercial' as any },
    { label: '✂️ Listar Clientes em Falta e Gerar Cortes', query: 'Listar clientes com mensalidades em atraso e sugerir cortes de sinal', category: 'pagamentos' },
    { label: '🧾 Emitir Factura Rápida de Mensalidade', query: 'Emitir factura de 4000 Kz para o primeiro cliente em falta', category: 'pagamentos' },
    { label: '🔍 Diagnosticar Cliente sem Sinal', query: 'Diagnosticar cliente sem sinal e verificar se é corte ou fibra rompida', category: 'fibra' },
    { label: '🤝 Fazer Acordo com Cliente em Risco', query: 'Cliente quer pagar dia 15, registar proposta de acordo para evitar corte', category: 'pagamentos' },
    { label: '🛠️ Despachar Ordem ao Técnico Mestre Job', query: 'Despachar ordem de reparação de fibra na Rua 12 para o Mestre Job', category: 'rede' },
    { label: '💰 Apurar Caixa e Faturamento do Dia', query: 'Qual é o saldo actual de caixa e arrecadação de hoje?', category: 'pagamentos' },
    { label: '🏛️ Justificação Fiscal AGT (Art. 12 CIVA)', query: 'Como justificar a isenção de IVA do Artigo 12 CIVA na factura?', category: 'geral' },
  ],
  client: [
    { label: '💳 Como Pagar por Multicaixa Express?', query: 'Como faço para pagar a minha mensalidade por Multicaixa Express?', category: 'pagamentos' },
    { label: '🚨 Luz Vermelha LOS a Piscar no Modem', query: 'A luz LOS do meu modem está a piscar vermelho e não tenho internet', category: 'fibra' },
    { label: '🤝 Solicitar Acordo para Não Cortar Sinal', query: 'Posso solicitar um acordo de pagamento para não cortarem o meu sinal?', category: 'pagamentos' },
    { label: '📺 Canais de TV e Pacotes Disponíveis', query: 'Quais são os pacotes de TV por cabo e planos de internet da OSDEL?', category: 'geral' },
    { label: '🔐 Como Mudar a Senha do Wi-Fi', query: 'Como posso alterar a palavra-passe do meu Wi-Fi?', category: 'fibra' },
  ],
  technician: [
    { label: '👤 Registar Instalação de Novo Cliente no Campo', query: 'Registar cliente instalado no piquete na Rua 13 na caixa PDO-04 porta 02', category: 'rede' },
    { label: '📊 Padrão de Potência dBm na Caixa PDO', query: 'Qual a potência óptica ideal e crítica na porta do PDO e na ONU?', category: 'fibra' },
    { label: '📋 Minhas Ordens de Serviço Pendentes', query: 'Quais são as ordens de serviço e chamados atribuídos a mim hoje?', category: 'rede' },
    { label: '✂️ Procedimento de Corte e Religação', query: 'Como proceder com o corte físico na caixa PDO e religação de assinante?', category: 'rede' },
    { label: '⚡ Segurança Próximo da Rede ENDE', query: 'Cuidados ao lançar drop de fibra perto dos fios eléctricos da ENDE', category: 'geral' },
  ],
};

// Carrega lista de clientes reais do armazenamento local
function getLiveClients(): any[] {
  try {
    const raw = localStorage.getItem('osdel_clients') || localStorage.getItem('osdel_staff_apk_clients');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Carrega ordens de serviço reais
function getLiveOrders(): any[] {
  try {
    const raw = localStorage.getItem('osdel_service_orders') || localStorage.getItem('osdel_staff_apk_orders');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Carrega despesas reais
function getLiveExpenses(): any[] {
  try {
    const raw = localStorage.getItem('osdel_expenses') || localStorage.getItem('osdel_staff_apk_expenses');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Carrega faturas reais
function getLiveInvoices(): any[] {
  try {
    const raw = localStorage.getItem('osdel_invoices') || localStorage.getItem('osdel_staff_apk_invoices');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Carrega pagamentos reais
function getLivePayments(): any[] {
  try {
    const raw = localStorage.getItem('osdel_payments') || localStorage.getItem('osdel_staff_apk_payments');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Carrega contas financeiras reais
function getLiveFinancialAccounts(): any[] {
  try {
    const raw = localStorage.getItem('osdel_financial_accounts');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Carrega materiais reais da carrinha
function getLiveMaterials(): any[] {
  try {
    const raw = localStorage.getItem('osdel_staff_apk_materials');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [
    { id: 'm-1', name: 'Bobina Cabo Drop Fig-8 (1FO)', unit: 'Metros', quantity: 450, minWarning: 100 },
    { id: 'm-2', name: 'Conectores Rápidos Fast SC/APC', unit: 'Unidades', quantity: 38, minWarning: 15 },
    { id: 'm-3', name: 'Splitters Ópticos 1:8 PLC', unit: 'Unidades', quantity: 6, minWarning: 2 },
    { id: 'm-4', name: 'Modems / ONUs Wi-Fi Dual Band', unit: 'Unidades', quantity: 4, minWarning: 2 },
  ];
}

// Executa uma Ação Automática criada pelo Assistente
export function executeAssistantAction(action: AssistantAction): { success: boolean; message: string } {
  try {
    // 1. Enviar mensagem formatada para o WhatsApp (+244)
    if (action.type === 'whatsapp') {
      const phone = (action.payload.phone || '926153736').replace(/\D/g, '');
      const fullPhone = phone.startsWith('244') ? phone : `244${phone}`;
      const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(action.payload.whatsappText || '')}`;
      window.open(url, '_blank');
      return { success: true, message: 'Janela do WhatsApp aberta com a mensagem oficial!' };
    }

    // 2. Criar Ordem de Serviço Automática
    if (action.type === 'create_order') {
      const orders = getLiveOrders();
      const nextId = orders.length > 0 ? Math.max(...orders.map((o: any) => o.id || 0)) + 1 : 1;
      const code = `OS-${String(nextId).padStart(5, '0')}`;
      const newOrder = {
        id: `os-${Date.now()}`,
        code,
        type: action.payload.orderType || 'reparacao',
        clientId: action.payload.clientId,
        clientCode: action.payload.clientCode || 'CLI-00000',
        clientName: action.payload.clientName || 'Assinante OSDEL',
        address: 'Bairro Golf I, Luanda',
        phone: action.payload.phone || '+244 923 000 000',
        pdoBox: 'PDO-04',
        priority: action.payload.priority || 'alta',
        status: 'pendente',
        date: new Date().toLocaleDateString('pt-AO'),
        notes: action.payload.orderNotes || 'Ordem gerada automaticamente pelo Assistente IA da OSDEL',
        assignedTechnician: action.payload.technicianName || 'Job Baptista (Mestre Job)',
      };

      orders.unshift(newOrder);
      localStorage.setItem('osdel_service_orders', JSON.stringify(orders));
      localStorage.setItem('osdel_staff_apk_orders', JSON.stringify(orders));
      window.dispatchEvent(new Event('osdel-orders-updated'));

      return {
        success: true,
        message: `Ordem de Serviço ${code} criada com sucesso para ${newOrder.clientName} e atribuída a ${newOrder.assignedTechnician}!`,
      };
    }

    // 3. Criar Acordo de Pagamento
    if (action.type === 'create_agreement') {
      const agreementsRaw = localStorage.getItem('osdel_client_agreements') || localStorage.getItem('osdel_staff_apk_agreements') || '[]';
      const agreements = JSON.parse(agreementsRaw);
      const newAgreement = {
        id: `agr-${Date.now()}`,
        clientName: action.payload.clientName || 'Cliente OSDEL',
        clientCode: action.payload.clientCode || 'CLI-00000',
        clientId: action.payload.clientId,
        phone: action.payload.phone || '+244 923 000 000',
        serviceType: 'fibra',
        promisedDate: action.payload.promisedDate || '20/11/2026',
        promisedAmount: action.payload.promisedAmount || 14500,
        reason: 'Acordo gerado pelo Assistente IA para prorrogação de prazo e garantia de sinal',
        status: 'aprovado',
        requestedAt: new Date().toLocaleDateString('pt-AO'),
        operatorNotes: 'Acordo aprovado e sinal mantido activo até à data limite acordada.',
      };

      agreements.unshift(newAgreement);
      localStorage.setItem('osdel_client_agreements', JSON.stringify(agreements));
      localStorage.setItem('osdel_staff_apk_agreements', JSON.stringify(agreements));

      // Se o cliente estiver com status suspenso, normaliza provisoriamente
      const clients = getLiveClients();
      if (action.payload.clientId) {
        const updated = clients.map((c) =>
          c.id === action.payload.clientId ? { ...c, status: 'active', hasAgreement: true } : c,
        );
        localStorage.setItem('osdel_clients', JSON.stringify(updated));
        localStorage.setItem('osdel_staff_apk_clients', JSON.stringify(updated));
        window.dispatchEvent(new Event('osdel-clients-updated'));
      }

      return {
        success: true,
        message: `Acordo de Pagamento formalizado! Prazo prorrogado até ${newAgreement.promisedDate} e sinal regularizado.`,
      };
    }

    // 4. Religar Sinal Provisoriamente
    if (action.type === 'reconnect_signal') {
      const clients = getLiveClients();
      const updated = clients.map((c) => {
        if (c.code === action.payload.clientCode || c.id === action.payload.clientId) {
          return { ...c, status: 'active', debtAmount: 0, debtMonths: 0 };
        }
        return c;
      });
      localStorage.setItem('osdel_clients', JSON.stringify(updated));
      localStorage.setItem('osdel:clients', JSON.stringify(updated));
      localStorage.setItem('osdel_staff_apk_clients', JSON.stringify(updated));
      window.dispatchEvent(new Event('osdel-clients-updated'));

      // Cria ordem de serviço de religação concluída
      const orders = getLiveOrders();
      orders.unshift({
        id: `os-${Date.now()}`,
        code: `OS-REL-${String(orders.length + 1).padStart(4, '0')}`,
        type: 'religacao',
        clientId: action.payload.clientId,
        clientCode: action.payload.clientCode,
        clientName: action.payload.clientName,
        phone: action.payload.phone || '',
        address: action.payload.address || 'Bairro Golf I',
        pdoBox: action.payload.pdoBox || 'PDO-01',
        priority: 'alta',
        status: 'concluido',
        date: new Date().toLocaleDateString('pt-AO'),
        notes: 'Religação de sinal executada via Assistente IA.',
        completedAt: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      });
      localStorage.setItem('osdel_service_orders', JSON.stringify(orders));
      localStorage.setItem('osdel_staff_apk_orders', JSON.stringify(orders));
      window.dispatchEvent(new Event('osdel-orders-updated'));

      return { success: true, message: `Sinal do cliente ${action.payload.clientName || ''} religado no sistema!` };
    }

    // 5. Cortar Sinal do Assinante
    if (action.type === 'cut_signal') {
      const clients = getLiveClients();
      const updated = clients.map((c) => {
        if (c.code === action.payload.clientCode || c.id === action.payload.clientId) {
          return { ...c, status: 'suspended' };
        }
        return c;
      });
      localStorage.setItem('osdel_clients', JSON.stringify(updated));
      localStorage.setItem('osdel:clients', JSON.stringify(updated));
      localStorage.setItem('osdel_staff_apk_clients', JSON.stringify(updated));
      window.dispatchEvent(new Event('osdel-clients-updated'));

      // Cria ordem de serviço de corte
      const orders = getLiveOrders();
      orders.unshift({
        id: `os-${Date.now()}`,
        code: `OS-COR-${String(orders.length + 1).padStart(4, '0')}`,
        type: 'corte',
        clientId: action.payload.clientId,
        clientCode: action.payload.clientCode,
        clientName: action.payload.clientName,
        phone: action.payload.phone || '',
        address: action.payload.address || 'Bairro Golf I',
        pdoBox: action.payload.pdoBox || 'PDO-01',
        priority: 'alta',
        status: 'concluido',
        date: new Date().toLocaleDateString('pt-AO'),
        notes: action.payload.orderNotes || 'Corte executado via Assistente IA por inadimplência.',
        completedAt: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      });
      localStorage.setItem('osdel_service_orders', JSON.stringify(orders));
      localStorage.setItem('osdel_staff_apk_orders', JSON.stringify(orders));
      window.dispatchEvent(new Event('osdel-orders-updated'));

      return { success: true, message: `Sinal do cliente ${action.payload.clientName || ''} cortado no sistema.` };
    }

    // 6. Cadastrar Novo Cliente Automaticamente pela IA
    if (action.type === 'create_client') {
      const clients = getLiveClients();
      const nextId = clients.length > 0 ? Math.max(...clients.map((c: any) => c.id || 0)) + 1 : 1;
      const code = action.payload.clientCode || `CLI-${String(nextId).padStart(5, '0')}`;
      const pin = action.payload.clientPin || String(Math.floor(1000 + Math.random() * 9000));
      const sType = action.payload.serviceType || 'fibra';
      const tvPoints = Number(action.payload.tvPoints || 1);
      const extraTvs = Math.max(0, tvPoints - 1);
      const monthlyFee = sType === 'tv'
        ? (action.payload.monthlyFee || (4000 + extraTvs * 1000))
        : (action.payload.monthlyFee || (sType === 'combo' ? 14500 : 6500));

      const newCli = {
        id: nextId,
        code,
        fullName: action.payload.clientName || 'Novo Cliente OSDEL',
        phone: action.payload.phone || '+244 923 000 000',
        nif: action.payload.nif || 'Consumidor Final',
        address: action.payload.address || `${action.payload.street || 'Rua 12'}, Bairro Golf I, Luanda`,
        neighborhood: action.payload.neighborhood || 'Golf I',
        street: action.payload.street || 'Rua 12',
        houseCode: action.payload.houseCode || 'G1-01',
        pdoBox: action.payload.pdoBox || 'PDO-04',
        port: action.payload.port || 'Porta 01',
        serviceType: sType,
        planName: action.payload.planName || (sType === 'tv' ? (tvPoints > 1 ? `TV por Cabo (${tvPoints} TVs)` : 'TV Comunitária Base') : 'Plano Fibra 10 Mbps'),
        monthlyFee,
        monthlyPrice: monthlyFee,
        tvPoints,
        extraTvs,
        status: 'active',
        dueDay: action.payload.dueDay || 5,
        debtMonths: 0,
        debtAmount: 0,
        opticalRxDbm: -19.4,
        onuSerial: action.payload.onuSerial || `ONU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        clientPin: pin,
        pin,
        createdAt: new Date().toISOString(),
      };

      clients.unshift(newCli);
      localStorage.setItem('osdel_clients', JSON.stringify(clients));
      localStorage.setItem('osdel:clients', JSON.stringify(clients));
      localStorage.setItem('osdel_staff_apk_clients', JSON.stringify(clients));

      // 1. Gera e persiste Contrato Obrigatório Oficial
      try {
        const rawContracts = localStorage.getItem('osdel_contracts') || localStorage.getItem('osdel:contracts') || '[]';
        const contracts = JSON.parse(rawContracts);
        const ctrNum = `CTR-${String(contracts.length + 1).padStart(5, '0')}`;
        const newContract = {
          id: contracts.length + 1,
          contractNumber: ctrNum,
          code: ctrNum,
          clientId: nextId,
          client_id: nextId,
          clientName: newCli.fullName,
          planName: newCli.planName,
          serviceType: sType,
          tvPoints,
          extraTvs,
          monthlyFee,
          monthlyPrice: monthlyFee,
          dueDay: newCli.dueDay,
          startDate: new Date().toISOString().slice(0, 10),
          status: 'active',
          notes: tvPoints > 1 ? `Plano especial com ${tvPoints} televisões (${extraTvs} ponto extra a 1.000 Kz).` : 'Assinatura padrão.',
        };
        contracts.unshift(newContract);
        localStorage.setItem('osdel_contracts', JSON.stringify(contracts));
        localStorage.setItem('osdel:contracts', JSON.stringify(contracts));
        window.dispatchEvent(new CustomEvent('osdel-contracts-updated', { detail: contracts }));
      } catch (err) {
        console.warn('Error saving auto contract in AI assistant:', err);
      }

      // 2. Credenciais do app do cliente
      try {
        const rawCreds = localStorage.getItem('osdel_client_credentials') || '{}';
        const creds = JSON.parse(rawCreds);
        creds[nextId] = {
          clientId: nextId,
          code,
          fullName: newCli.fullName,
          phone: newCli.phone,
          pin,
          serviceType: sType,
          planName: newCli.planName,
          status: 'active',
          dueDay: newCli.dueDay,
          monthlyFee,
          tvPoints,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Assistente IA Telecom',
        };
        localStorage.setItem('osdel_client_credentials', JSON.stringify(creds));
      } catch {}

      window.dispatchEvent(new Event('osdel-clients-updated'));

      return {
        success: true,
        message: `Assinante ${newCli.fullName} (${newCli.code}) registado com sucesso! Contrato emitido e associado. Mensalidade: ${kz(monthlyFee)}${tvPoints > 1 ? ` (${tvPoints} TVs)` : ''}. PIN de acesso do cliente: ${pin}.`,
      };
    }

    // 7. Emitir Factura de Mensalidade
    if (action.type === 'create_invoice') {
      const invoices = getLiveInvoices();
      const num = `FT-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(5, '0')}`;
      const amount = action.payload.invoiceAmount || 4000;
      const method = action.payload.invoiceMethod || 'Multicaixa Express';

      const newInv = {
        id: `inv-${Date.now()}`,
        code: num,
        number: num,
        invoiceNumber: num,
        clientId: action.payload.clientId,
        clientCode: action.payload.clientCode,
        clientName: action.payload.clientName || 'Assinante OSDEL',
        amount,
        total: amount,
        penalty: 0,
        method,
        date: new Date().toLocaleDateString('pt-AO'),
        paidAt: new Date().toISOString(),
        status: 'pago',
        service: action.payload.serviceType === 'tv' ? 'TV por Cabo' : 'Fibra Óptica',
        operatorName: 'Assistente IA Telecom',
        notes: 'Factura emitida com sucesso via Assistente IA.',
      };

      invoices.unshift(newInv);
      localStorage.setItem('osdel_invoices', JSON.stringify(invoices));
      localStorage.setItem('osdel:invoices', JSON.stringify(invoices));
      localStorage.setItem('osdel_staff_apk_invoices', JSON.stringify(invoices));

      // Também registra nos pagamentos
      try {
        const rawPmts = localStorage.getItem('osdel_payments') || '[]';
        const pmts = JSON.parse(rawPmts);
        pmts.unshift(newInv);
        localStorage.setItem('osdel_payments', JSON.stringify(pmts));
        localStorage.setItem('osdel:payments', JSON.stringify(pmts));
      } catch {}

      window.dispatchEvent(new Event('osdel-invoices-updated'));
      window.dispatchEvent(new Event('osdel-payments-updated'));

      return {
        success: true,
        message: `Factura ${num} no valor de ${kz(amount)} emitida com sucesso para ${newInv.clientName}!`,
      };
    }

    // 8. Copiar Conteúdo
    if (action.type === 'copy_text') {
      navigator.clipboard?.writeText(action.payload.copyContent || '');
      return { success: true, message: 'Texto copiado com sucesso para a área de transferência!' };
    }

    return { success: false, message: 'Ação não reconhecida.' };
  } catch (err: any) {
    return { success: false, message: `Erro ao executar ação: ${err.message}` };
  }
}

/**
 * =============================================================================
 * GERADOR E EXPLICADOR DE RELATÓRIOS GERENCIAIS & ANÁLISES DE PAGAMENTOS (IA)
 * =============================================================================
 */
export function generateExecutiveManagementReport(options?: {
  period?: string;
  serviceMode?: string;
}): { text: string; actions?: AssistantAction[]; metrics: any } {
  const clients = getLiveClients();
  const payments = getLivePayments();
  const invoices = getLiveInvoices();
  const expenses = getLiveExpenses();
  const accounts = getLiveFinancialAccounts();

  // Métricas de Clientes & Assinantes
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === 'active').length;
  const lateClients = clients.filter((c) => c.status === 'late').length;
  const suspendedClients = clients.filter((c) => c.status === 'suspended').length;
  const collectionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 100;
  const defaultRate = totalClients > 0 ? Math.round(((lateClients + suspendedClients) / totalClients) * 100) : 0;

  // Métricas de Pagamentos & Arrecadação
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0) + Number(p.penalty || 0), 0);
  const totalPenalties = payments.reduce((sum, p) => sum + Number(p.penalty || 0), 0);
  const paymentCount = payments.length;

  // Meios de Pagamento Utilizados
  let mcxTotal = 0;
  let baiTotal = 0;
  let bfaTotal = 0;
  let cashTotal = 0;
  payments.forEach((p) => {
    const m = String(p.method || '').toLowerCase();
    const tot = Number(p.amount || 0) + Number(p.penalty || 0);
    if (m.includes('express') || m.includes('tpa') || m.includes('multi')) mcxTotal += tot;
    else if (m.includes('bai')) baiTotal += tot;
    else if (m.includes('bfa')) bfaTotal += tot;
    else if (m.includes('dinheiro') || m.includes('numerário') || m.includes('balcão')) cashTotal += tot;
    else mcxTotal += tot;
  });

  // Segmentação por Serviço (Internet Fibra vs TV por Cabo)
  let fiberRevenue = 0;
  let tvRevenue = 0;
  payments.forEach((p) => {
    const s = String(p.serviceType || '').toLowerCase();
    const tot = Number(p.amount || 0) + Number(p.penalty || 0);
    if (s.includes('tv') && !s.includes('combo')) tvRevenue += tot;
    else fiberRevenue += tot;
  });

  // Despesas Operacionais e Margem Líquida
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netOperatingIncome = totalCollected - totalExpenses;
  const operatingMarginPct = totalCollected > 0 ? Math.round((netOperatingIncome / totalCollected) * 100) : 0;

  // Ticket Médio (ARPU)
  const arpu = activeClients > 0 ? Math.round(totalCollected / activeClients) : 0;

  // Saldo Bancário Consolidado nas Contas da Empresa
  const totalBankBalance = accounts.reduce((sum, acc) => sum + Number(acc.currentBalance || acc.initialBalance || 0), 0);

  // Concentração de Inadimplência por Bairro / Caixa PDO
  const pdoDebts: Record<string, number> = {};
  clients.filter((c) => c.status !== 'active').forEach((c) => {
    const pdo = c.pdoBox || c.street || c.neighborhood || 'Zona Central';
    pdoDebts[pdo] = (pdoDebts[pdo] || 0) + 1;
  });
  const topAtRiskAreas = Object.entries(pdoDebts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // GERAÇÃO NARRATIVA EXECUTIVA E EXPLICADOR GERENCIAL PELA IA
  const reportText =
    `📊 **RELATÓRIO GERENCIAL EXECUTIVO & ANÁLISE DE PAGAMENTOS OSDEL**\n` +
    `*Período de Análise: Competência Atual | Emitido em ${new Date().toLocaleDateString('pt-AO')}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 **1. RESUMO EXECUTIVO DE INDICADORES (KPIs)**\n` +
    `• **Arrecadação Bruta Total:** **${kz(totalCollected)}** (${paymentCount} transações liquidadas)\n` +
    `• **Despesas Operacionais:** **${kz(totalExpenses)}** (${expenses.length} saídas registradas)\n` +
    `• **Resultado Operacional Líquido:** **${kz(netOperatingIncome)}** (Margem: **${operatingMarginPct}%**)\n` +
    `• **Base Total de Clientes:** **${totalClients} assinantes** (Activos: **${activeClients}** | Atraso: **${lateClients}** | Cortados: **${suspendedClients}**)\n` +
    `• **Taxa de Cobrança / Adimplência:** **${collectionRate}%** (${defaultRate}% de inadimplência)\n` +
    `• **Ticket Médio por Cliente (ARPU):** **${kz(arpu)}** / assinante ativo\n` +
    `• **Multas por Atraso Arrecadadas:** **${kz(totalPenalties)}**\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💳 **2. EXPLICADOR DE HÁBITOS DE PAGAMENTO DOS CLIENTES**\n` +
    `• **Multicaixa Express / TPA:** **${kz(mcxTotal)}** (${totalCollected > 0 ? Math.round((mcxTotal / totalCollected) * 100) : 0}% da receita) — *Canal mais eficiente com menor custo operacional e baixa imediata.*\n` +
    `• **Transferências Bancárias (BAI / BFA):** **${kz(baiTotal + bfaTotal)}** (${totalCollected > 0 ? Math.round(((baiTotal + bfaTotal) / totalCollected) * 100) : 0}% da receita) — *Exige conciliação diária de comprovativo para evitar duplicados.*\n` +
    `• **Numerário / Dinheiro no Balcão:** **${kz(cashTotal)}** (${totalCollected > 0 ? Math.round((cashTotal / totalCollected) * 100) : 0}% da receita) — *Custódia na gaveta do balcão Golf II.*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🌐 **3. DIVISÃO DE RECEITA POR LINHA DE NEGÓCIO**\n` +
    `• **Internet Banda Larga FTTH:** **${kz(fiberRevenue)}** (${totalCollected > 0 ? Math.round((fiberRevenue / totalCollected) * 100) : 0}%) — *Principal motor de crescimento da OSDEL.*\n` +
    `• **TV Comunitária por Cabo:** **${kz(tvRevenue)}** (${totalCollected > 0 ? Math.round((tvRevenue / totalCollected) * 100) : 0}%) — *Receita recorrente e estável nos bairros atendidos.*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔍 **4. ANÁLISE DE RISCO E PONTOS DE ATENÇÃO GERENCIAL**\n` +
    (topAtRiskAreas.length > 0
      ? `• **Focos de Inadimplência:** As maiores concentrações de mensalidades em atraso estão em: ` +
        topAtRiskAreas.map(([area, qtd]) => `**${area}** (${qtd} clientes)`).join(', ') +
        `.\n`
      : `• **Excelente regularidade:** Não há pontos críticos de inadimplência isolados na rede.\n`) +
    `• **Prevenção de Duplicidade:** O sistema está configurado para bloquear automaticamente pagamentos repetidos pela mesma referência ou duplicatas no mesmo mês de fatura.\n` +
    `• **Saldo em Contas e Caixa:** Saldo disponível consolidado é de **${kz(totalBankBalance > 0 ? totalBankBalance : netOperatingIncome)}**.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 **5. RECOMENDAÇÕES ESTRATÉGICAS DA IA PARA A DIRECÇÃO**\n` +
    `1. **Campanha Preventiva de WhatsApp:** Disparar lembrete amigável entre os dias 1 e 5 aos clientes de fibra para elevar a adimplência para >92%.\n` +
    `2. **Incentivo ao Multicaixa Express:** Estimular clientes que pagam em dinheiro a usarem o Express, reduzindo filas no balcão e risco de manuseio físico de valores.\n` +
    `3. **Piquete Técnico de Rua:** Concentrar vistorias na área com mais cortes (${topAtRiskAreas[0]?.[0] || 'Golf I'}) para verificar eventuais rompimentos de cabo drop ou ofertas de acordo.\n` +
    `4. **Migração para Fibra:** Propor aos assinantes de TV a migração com taxa subsidiada para o combo TV+Fibra, elevando o faturamento mensal em 35%.`;

  const actions: AssistantAction[] = [
    {
      id: 'act-copy-report',
      label: '📋 Copiar Relatório Gerencial Completo',
      type: 'copy_text',
      payload: {
        copyContent: reportText.replace(/\*\*/g, '').replace(/━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━/g, '----------------------------------------'),
      },
    },
    {
      id: 'act-wa-directors',
      label: '📱 Enviar Resumo Executivo para a Direção (WhatsApp)',
      type: 'whatsapp',
      payload: {
        phone: '926153736',
        whatsappText:
          `*RESUMO GERENCIAL OSDEL TECNOLOGIA*\n\n` +
          `• *Arrecadação Bruta:* ${kz(totalCollected)} (${paymentCount} pagamentos)\n` +
          `• *Despesas Operacionais:* ${kz(totalExpenses)}\n` +
          `• *Resultado Líquido:* ${kz(netOperatingIncome)} (Margem: ${operatingMarginPct}%)\n` +
          `• *Taxa de Cobrança:* ${collectionRate}% (${activeClients} clientes adimplentes / ${lateClients + suspendedClients} em atraso)\n` +
          `• *Multicaixa Express:* ${kz(mcxTotal)} | *Dinheiro:* ${kz(cashTotal)}\n\n` +
          `Relatório completo auditado disponível no painel de gestão OSDEL Gestão X.`,
      },
    },
  ];

  return {
    text: reportText,
    actions,
    metrics: {
      totalCollected,
      totalExpenses,
      netOperatingIncome,
      collectionRate,
      defaultRate,
      activeClients,
      totalClients,
      mcxTotal,
      cashTotal,
      baiTotal,
      bfaTotal,
      fiberRevenue,
      tvRevenue,
      arpu,
    },
  };
}

/**
 * Motor Central de Resolução de Casos com Dados em Tempo Real
 */
export function generateLocalAssistantResponse(
  query: string,
  ctx: AssistantContext,
): { text: string; actions?: AssistantAction[] } {
  const q = query.toLowerCase().trim();
  const clients = getLiveClients();
  const orders = getLiveOrders();
  const expenses = getLiveExpenses();
  const invoices = getLiveInvoices();
  const materials = getLiveMaterials();

  // --------------------------------------------------------------------------
  // CASO ESPECIAL: GERAR RELATÓRIO GERENCIAL & EXPLICAR PAGAMENTOS / ANÁLISE
  // --------------------------------------------------------------------------
  if (
    q.includes('relatório gerencial') ||
    q.includes('relatorio gerencial') ||
    q.includes('explicar pagamentos') ||
    q.includes('explicar o relatorio') ||
    q.includes('explicar relatório') ||
    q.includes('gerar relatorio') ||
    q.includes('gerar relatório') ||
    q.includes('análise de pagamentos') ||
    q.includes('analise de pagamentos') ||
    q.includes('análises gerenciais') ||
    q.includes('analises gerenciais') ||
    q.includes('relatório executivo') ||
    q.includes('relatorio executivo') ||
    q.includes('eficiencia de arrecadacao') ||
    q.includes('eficiência de arrecadação')
  ) {
    const rep = generateExecutiveManagementReport({ serviceMode: ctx.mode || 'ambos' });
    return { text: rep.text, actions: rep.actions };
  }

  // --------------------------------------------------------------------------
  // CASO 0A: CADASTRAR / ADICIONAR NOVO CLIENTE VIA IA
  // --------------------------------------------------------------------------
  if (
    q.includes('cadastrar cliente') ||
    q.includes('novo cliente') ||
    q.includes('adicionar cliente') ||
    q.includes('registar cliente') ||
    q.includes('registrar cliente') ||
    q.includes('criar cliente')
  ) {
    // Tenta extrair telefone
    const phoneMatch = query.match(/(?:\+?244\s?)?9\d{8}/);
    const extractedPhone = phoneMatch ? phoneMatch[0].trim() : '+244 923 000 000';

    // Tenta extrair nome
    let extractedName = 'Novo Assinante';
    const nameMatch = query.match(/(?:cliente|chamado|nome)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = nameMatch[1].trim();
    }

    // Tenta extrair pontos de TV (2 TVs pagam mais de 4.000 Kz -> 5.000 Kz)
    const twoTvMatch = q.includes('2 tv') || q.includes('duas tv') || q.includes('2 telev') || q.includes('duas telev') || q.includes('dois telev') || q.includes('dois tv') || q.includes('duas telas');
    const threeTvMatch = q.includes('3 tv') || q.includes('três tv') || q.includes('tres tv');
    const tvPoints = threeTvMatch ? 3 : twoTvMatch ? 2 : 1;
    const extraTvs = Math.max(0, tvPoints - 1);

    // Tenta extrair serviço
    const isTvOnly = (q.includes('tv') && !q.includes('fibra')) || q.includes('cabo') || twoTvMatch || threeTvMatch;
    const isCombo = q.includes('combo') || (q.includes('tv') && q.includes('fibra'));
    const sType = isCombo ? 'combo' : isTvOnly ? 'tv' : 'fibra';
    const monthlyFee = isCombo ? 14500 : isTvOnly ? (4000 + extraTvs * 1000) : 6500;
    const planName = isCombo
      ? 'Plano OSDEL Família Max (TV + Fibra 10 Mbps)'
      : isTvOnly
      ? (tvPoints > 1 ? `Plano TV Comunitária Multi-Ponto (${tvPoints} TVs)` : 'Plano TV Comunitária Base (68 Canais)')
      : 'Plano Fibra Óptica 10 Mbps Ilimitado';

    // Tenta extrair rua
    let extractedStreet = 'Rua 12';
    const streetMatch = query.match(/rua\s+(\d+|[A-Za-zÀ-Úà-ú]+)/i);
    if (streetMatch) {
      extractedStreet = `Rua ${streetMatch[1]}`;
    }

    const nextCode = `CLI-${String(clients.length + 1).padStart(5, '0')}`;
    const generatedPin = String(Math.floor(1000 + Math.random() * 9000));

    const responseText =
      `👤 **Registo Inteligente de Assinante (OSDEL):**\n\n` +
      `Preparei os dados para cadastrar o novo cliente com base nas informações fornecidas:\n\n` +
      `• **Nome:** **${extractedName}**\n` +
      `• **Contacto:** **${extractedPhone}**\n` +
      `• **Modalidade:** **${isCombo ? 'Combo TV + Fibra' : isTvOnly ? 'TV Comunitária' : 'Internet Fibra Óptica'}**\n` +
      `• **Plano:** ${planName}\n` +
      `• **Mensalidade:** **${kz(monthlyFee)}** (Vencimento dia 5)\n` +
      `• **Localização:** ${extractedStreet}, Bairro Golf I, Kilamba Kiaxi\n` +
      `• **Caixa PDO:** PDO-04 (Porta 01)\n` +
      `• **Código Sugerido:** \`${nextCode}\` · **PIN de Acesso do Cliente:** \`${generatedPin}\`\n\n` +
      `Clique no botão abaixo para confirmar o registo. O cliente será salvo na base de dados e suas credenciais ficarão activas de imediato.`;

    const actions: AssistantAction[] = [
      {
        id: 'act-create-client',
        label: `👤 Confirmar Registo de ${extractedName} (${kz(monthlyFee)})`,
        type: 'create_client',
        payload: {
          clientName: extractedName,
          clientCode: nextCode,
          phone: extractedPhone,
          serviceType: sType as any,
          planName,
          monthlyFee,
          tvPoints,
          extraTvs,
          street: extractedStreet,
          address: `${extractedStreet}, Bairro Golf I, Luanda`,
          pdoBox: 'PDO-04',
          port: 'Porta 01',
          clientPin: generatedPin,
          dueDay: 5,
        },
      },
      {
        id: 'act-wa-newclient',
        label: `📱 Enviar Boas-Vindas & PIN por WhatsApp`,
        type: 'whatsapp',
        payload: {
          phone: extractedPhone,
          whatsappText: `*BEM-VINDO À OSDEL TECNOLOGIA!*\n\nEstimado(a) ${extractedName}, o seu contrato de ${planName} foi activado com sucesso.\n\nSeu Código de Assinante: *${nextCode}*\nSeu PIN de Acesso ao App: *${generatedPin}*\nMensalidade: *${kz(monthlyFee)}* (Vencimento dia 5).\n\nPara suporte ligue ou envie mensagem: 926 153 736.`,
        },
      },
    ];

    return { text: responseText, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 0A.1: DUAS TVS / PONTO EXTRA / TARIFÁRIO MULTI-TV (PAGA MAIS DE 4 MIL KZ)
  // --------------------------------------------------------------------------
  if (
    q.includes('dois tv') ||
    q.includes('duas tv') ||
    q.includes('2 tv') ||
    q.includes('dois televisor') ||
    q.includes('duas telev') ||
    q.includes('ponto extra') ||
    q.includes('paga mais de 4') ||
    q.includes('preço tv') ||
    q.includes('valor da tv') ||
    q.includes('quanto custa 2 tv') ||
    q.includes('quanto paga')
  ) {
    const text =
      `📺 **Política de Cobrança e Tarifário TV por Cabo OSDEL (Ponto Extra):**\n\n` +
      `Conforme as normas operacionais da OSDEL Tecnologia:\n\n` +
      `• **1 Televisão (Ponto Único):** **4.000 Kz/mês** (Acesso base aos canais digitais).\n` +
      `• **2 Televisões (Com Ponto Extra):** **5.000 Kz/mês** (4.000 Kz base + 1.000 Kz do 2.º ponto — **o cliente paga mais de 4 mil Kz**).\n` +
      `• **3 Televisões:** **6.000 Kz/mês** (4.000 Kz base + 2.000 Kz de pontos adicionais).\n` +
      `• **Taxa de Derivação/Divisor RF (Instalação):** 2.000 Kz no ato da ligação técnica.\n\n` +
      `*Nota de Auditoria:* Todo cliente com 2 TVs tem essa condição registada directamente no Contrato, na Factura Proforma/Recibo e na base de dados das equipas de terreno.`;

    const actions: AssistantAction[] = [
      {
        id: 'act-new-client-2tv',
        label: '👤 Registar Novo Cliente com 2 TVs (5.000 Kz)',
        type: 'create_client',
        payload: {
          clientName: 'Novo Assinante 2 TVs',
          serviceType: 'tv',
          tvPoints: 2,
          extraTvs: 1,
          monthlyFee: 5000,
          planName: 'TV por Cabo (2 TVs - Ponto Extra)',
          street: 'Rua 12',
          address: 'Rua 12, Bairro Golf I, Luanda',
          pdoBox: 'PDO-04',
          dueDay: 5,
        },
      },
      {
        id: 'act-invoice-2tv',
        label: '🧾 Emitir Factura de 2 TVs (5.000 Kz)',
        type: 'create_invoice',
        payload: {
          invoiceAmount: 5000,
          serviceType: 'tv',
          invoiceMethod: 'Multicaixa Express',
        },
      },
    ];

    return { text, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 0A.2: GARANTIA DE CONTRATOS & CONTRATOS DESAPARECIDOS
  // --------------------------------------------------------------------------
  if (
    q.includes('contrato') ||
    q.includes('nenhum contrato') ||
    q.includes('contrato associado') ||
    q.includes('contratos a desaparecer')
  ) {
    const rawCtrs = typeof window !== 'undefined' ? localStorage.getItem('osdel_contracts') || localStorage.getItem('osdel:contracts') || '[]' : '[]';
    let parsedCtrs: any[] = [];
    try { parsedCtrs = JSON.parse(rawCtrs); } catch {}
    const text =
      `📄 **Gestão de Contratos de Prestação de Serviço OSDEL:**\n\n` +
      `No sistema OSDEL Gestão X, **cada cliente tem obrigatoriamente um contrato associado**.\n\n` +
      `• **Total de Contratos Activos no Sistema:** **${parsedCtrs.length} contratos**.\n` +
      `• **Total de Clientes Registados:** **${clients.length} clientes**.\n` +
      `• **Norma Contratual:** Cada ficha de cliente integra o número de contrato (\`CTR-XXXXX\`), modalidade (TV, Fibra ou Combo), número de televisões com taxa de ponto extra, morada completa, data de início e as cláusulas legais de exclusão de IVA (Artigo 12.º do CIVA).\n\n` +
      `O sistema executa ciclicamente a garantia de contratos para assegurar que nunca surja *"nenhum contrato associado"*.`;

    return {
      text,
      actions: [
        {
          id: 'act-view-contracts',
          label: '📋 Abrir Facturação e Contratos',
          type: 'create_invoice',
          payload: { invoiceAmount: 4000, serviceType: 'tv' },
        },
      ],
    };
  }

  // --------------------------------------------------------------------------
  // CASO 0B: LISTAR CLIENTES EM ATRASO & GESTÃO DE CORTES
  // --------------------------------------------------------------------------
  if (
    q.includes('inadimplente') ||
    q.includes('quem devo cortar') ||
    q.includes('clientes em atraso') ||
    q.includes('em falta') ||
    q.includes('lista de corte') ||
    q.includes('gerir corte') ||
    q.includes('cortar sinal') ||
    q.includes('cortar cliente')
  ) {
    const debtors = clients.filter((c) => c.status === 'late' || c.status === 'suspended' || (c.debtAmount && c.debtAmount > 0));

    if (debtors.length === 0) {
      return {
        text: `✅ **Excelente! Nenhum cliente com débitos ou cortes pendentes.**\n\nTodos os assinantes cadastrados no sistema estão com a situação financeira regularizada e sinal activo.`,
      };
    }

    let debtorsText = `✂️ **Gestão de Clientes em Falta & Piquete de Corte (${debtors.length} identificados):**\n\n`;
    const actions: AssistantAction[] = [];

    debtors.slice(0, 4).forEach((d, idx) => {
      const isSuspended = d.status === 'suspended';
      debtorsText += `**${idx + 1}. ${d.fullName} (${d.code})**\n`;
      debtorsText += `• Morada: ${d.address || d.street || 'Rua 12, Golf I'}\n`;
      debtorsText += `• Caixa: **${d.pdoBox || 'PDO-04'}** (Porta ${d.port || '01'})\n`;
      debtorsText += `• Valor em Dívida: **${kz(d.debtAmount || d.monthlyFee || 4000)}** (${d.debtMonths || 1} mês(es))\n`;
      debtorsText += `• Estado Atual: **${isSuspended ? '🚨 SINAL CORTADO' : '⚠️ EM ATRASO (Avisado)'}**\n\n`;

      if (!isSuspended) {
        actions.push({
          id: `act-cut-${d.id}`,
          label: `✂️ Cortar Sinal de ${d.fullName.split(' ')[0]} (${d.pdoBox})`,
          type: 'cut_signal',
          payload: {
            clientId: d.id,
            clientCode: d.code,
            clientName: d.fullName,
            phone: d.phone,
            address: d.address,
            pdoBox: d.pdoBox,
            orderNotes: `Corte executado via Assistente IA por atraso de ${d.debtMonths || 1} mês(es).`,
          },
        });
      } else {
        actions.push({
          id: `act-rec-${d.id}`,
          label: `⚡ Religar Sinal de ${d.fullName.split(' ')[0]}`,
          type: 'reconnect_signal',
          payload: {
            clientId: d.id,
            clientCode: d.code,
            clientName: d.fullName,
            phone: d.phone,
            address: d.address,
            pdoBox: d.pdoBox,
          },
        });
      }

      actions.push({
        id: `act-wa-debt-${d.id}`,
        label: `📱 Cobrar ${d.fullName.split(' ')[0]} no WhatsApp`,
        type: 'whatsapp',
        payload: {
          phone: d.phone,
          whatsappText: `Olá estimado(a) ${d.fullName}. Lembramos que a sua mensalidade da OSDEL Tecnologia no valor de ${kz(d.debtAmount || d.monthlyFee)} encontra-se vencida. Evite a interrupção do sinal pagando via Express para o IBAN BAI: AO06.0040.0000.4412.9012.1023.1. Dúvidas: 926 153 736.`,
        },
      });
    });

    debtorsText += `💡 Pode executar o corte ou religação imediata nos botões abaixo ou notificar os clientes via WhatsApp.`;

    return { text: debtorsText, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 0C: EMITIR FACTURA / COBRANÇA RÁPIDA
  // --------------------------------------------------------------------------
  if (
    q.includes('emitir fatura') ||
    q.includes('emitir factura') ||
    q.includes('cobrar cliente') ||
    q.includes('gerar recibo') ||
    q.includes('cobrar')
  ) {
    const target =
      clients.find((c) => q.includes(c.fullName?.toLowerCase().split(' ')[0]) || q.includes(c.code?.toLowerCase())) ||
      clients[0];

    if (!target) {
      return {
        text: `🧾 **Emissão de Facturas OSDEL:**\n\nNenhum cliente disponível para facturação. Cadastre um cliente primeiro no sistema.`,
      };
    }

    const valMatch = query.match(/(\d+[\d\s.]*)\s*(?:kz|kwanzas)?/i);
    const amount = valMatch ? Number(valMatch[1].replace(/\D/g, '')) : target.monthlyFee || 4000;

    const responseText =
      `🧾 **Emissão de Factura Comercial (OSDEL Gestão X):**\n\n` +
      `• **Assinante:** **${target.fullName}** (\`${target.code}\`)\n` +
      `• **Serviço:** ${target.serviceType === 'tv' ? 'TV Comunitária' : 'Internet Fibra Óptica'}\n` +
      `• **Valor a Facturar:** **${kz(amount)}**\n` +
      `• **Forma de Pagamento:** Multicaixa Express / Numerário Balcão\n` +
      `• **Enquadramento Fiscal:** Isento de IVA (Artigo 12.º do CIVA - Regime de Exclusão)\n\n` +
      `Clique no botão abaixo para emitir e liquidar a factura. Ficará pronta para impressão térmica POS (80mm) ou formato oficial A4.`;

    const actions: AssistantAction[] = [
      {
        id: `act-issue-inv-${target.id}`,
        label: `🧾 Emitir e Liquidar Factura de ${kz(amount)}`,
        type: 'create_invoice',
        payload: {
          clientId: target.id,
          clientCode: target.code,
          clientName: target.fullName,
          invoiceAmount: amount,
          serviceType: target.serviceType,
        },
      },
      {
        id: `act-wa-inv-${target.id}`,
        label: `📱 Enviar Recibo de ${kz(amount)} por WhatsApp`,
        type: 'whatsapp',
        payload: {
          phone: target.phone,
          whatsappText: `*RECIBO DE PAGAMENTO - OSDEL TECNOLOGIA*\n\nEstimado(a) ${target.fullName}, confirmamos a liquidação da sua mensalidade no valor de *${kz(amount)}*. O seu sinal está 100% activo e regularizado. Agradecemos a confiança!`,
        },
      },
    ];

    return { text: responseText, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 0D: RELIGAR SINAL DIRECTO
  // --------------------------------------------------------------------------
  if (q.includes('religar') || q.includes('restabelecer')) {
    const target =
      clients.find((c) => q.includes(c.fullName?.toLowerCase().split(' ')[0]) || q.includes(c.code?.toLowerCase())) ||
      clients.find((c) => c.status === 'suspended') ||
      clients[0];

    if (!target) {
      return {
        text: `⚡ Nenhum assinante com sinal cortado encontrado para religação.`,
      };
    }

    const responseText =
      `⚡ **Religação de Sinal (Piquete OSDEL):**\n\n` +
      `• **Assinante:** **${target.fullName}** (\`${target.code}\`)\n` +
      `• **Caixa PDO:** **${target.pdoBox || 'PDO-04'}** · Porta **${target.port || 'Porta 01'}**\n` +
      `• **Morada:** ${target.address || 'Rua 12, Golf I'}\n` +
      `• **Estado:** O sinal será reativado no sistema e gerada a baixa no piquete de campo.\n\n` +
      `Clique no botão abaixo para confirmar a religação do sinal.`;

    const actions: AssistantAction[] = [
      {
        id: `act-rec-signal-${target.id}`,
        label: `⚡ Confirmar Religação de ${target.fullName.split(' ')[0]}`,
        type: 'reconnect_signal',
        payload: {
          clientId: target.id,
          clientCode: target.code,
          clientName: target.fullName,
          phone: target.phone,
          address: target.address,
          pdoBox: target.pdoBox,
        },
      },
    ];

    return { text: responseText, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 1: DIAGNÓSTICO E RESOLUÇÃO DE FALTA DE SINAL / LOS VERMELHO / AVARIA
  // --------------------------------------------------------------------------
  if (
    q.includes('sem sinal') ||
    q.includes('los') ||
    q.includes('luz vermelha') ||
    q.includes('sem internet') ||
    q.includes('fibra rompida') ||
    q.includes('diagnosticar') ||
    q.includes('avaria')
  ) {
    // Tenta encontrar o cliente citado na pergunta (por código CLI-, por nome ou pega o primeiro caso real)
    const targetClient =
      clients.find((c) => {
        const matchCode = c.code && q.includes(c.code.toLowerCase());
        const matchName = c.fullName && q.includes(c.fullName.toLowerCase().split(' ')[0]);
        const matchStreet = c.address && q.includes(c.address.toLowerCase().split(',')[0]);
        return matchCode || matchName || matchStreet;
      }) ||
      clients.find((c) => c.status === 'suspended' || c.status === 'late' || (c.opticalRxDbm && c.opticalRxDbm < -25)) ||
      clients[0];

    if (!targetClient) {
      return {
        text:
          `🔍 **Diagnóstico Geral de Falta de Sinal (Rede OSDEL):**\n\n` +
          `Ainda não existem clientes cadastrados na base de produção limpa. Quando cadastrar clientes reais, o assistente diagnosticará a atenuação óptica (dBm) e o status financeiro de imediato.\n\n` +
          `• **Luz LOS Vermelha no Modem:** Indica quebra de fibra óptica (drop rompido na rua ou conector desconectado no PDO).\n` +
          `• **Luz PON Apagada:** OLT sem comunicação com a ONU.\n` +
          `• **Nível Normal:** Entre \`-15.0 dBm\` e \`-23.0 dBm\`.\n` +
          `• **Nível Crítico:** Inferior a \`-26.0 dBm\` (necessita de nova clivagem e fusão).`,
      };
    }

    const isCutForDebt = targetClient.status === 'suspended' || targetClient.status === 'late';
    const hasBadSignal = targetClient.opticalRxDbm && targetClient.opticalRxDbm < -25;

    let diagnosisText = `🔍 **Diagnóstico Operacional para ${targetClient.fullName} (${targetClient.code}):**\n\n`;
    diagnosisText += `• **Endereço:** ${targetClient.address || 'Rua 12, Golf I'}\n`;
    diagnosisText += `• **Infraestrutura:** Caixa **${targetClient.pdoBox || 'PDO-04'}** · Porta **${targetClient.port || 'Porta 08'}**\n`;
    diagnosisText += `• **Plano Contratado:** ${targetClient.planName || 'Fibra 10 Mbps'}\n`;
    diagnosisText += `• **Sinal Óptico RX:** \`${targetClient.opticalRxDbm || -19.4} dBm\` ${
      hasBadSignal ? '⚠️ *(Atenuação Crítica - perda de link!)*' : '✅ *(Potência ideal e estável)*'
    }\n`;
    diagnosisText += `• **Status Contratual:** **${targetClient.status === 'active' ? 'ACTIVO' : targetClient.status === 'late' ? 'EM ATRASO' : 'SUSPENSO'}**\n\n`;

    if (isCutForDebt) {
      diagnosisText +=
        `🚨 **Causa Identificada:** O cliente possui débitos pendentes no valor de **${kz(
          targetClient.debtAmount || targetClient.monthlyFee,
        )}**. O corte foi efetuado pelo piquete por incumprimento da mensalidade.\n\n` +
        `💡 **Resolução Proposta:**\n` +
        `1. Enviar as referências de pagamento ao cliente para quitação imediata.\n` +
        `2. Ou conceder um **Acordo de Pagamento Provisório** prorrogando o prazo e religando o sinal hoje mesmo.`;
    } else if (hasBadSignal) {
      diagnosisText +=
        `🚨 **Causa Identificada:** Rompimento físico ou conector SC/APC sujo/frouxo na caixa ${targetClient.pdoBox}. A atenuação atingiu nível de corte térmico.\n\n` +
        `💡 **Resolução Proposta:** Despachar ordem de serviço de reparação imediata para a viatura de piquete com conector SC/APC e bobina drop.`;
    } else {
      diagnosisText +=
        `✅ **Causa Identificada:** O link na central OLT e a potência óptica estão normais. A falha costuma ser cabo de rede LAN desconectado do computador ou modem desligado da tomada eléctrica.`;
    }

    const actions: AssistantAction[] = [
      {
        id: 'act-os',
        label: '🔧 Abrir Ordem de Reparação Imediata',
        type: 'create_order',
        payload: {
          clientId: targetClient.id,
          clientCode: targetClient.code,
          clientName: targetClient.fullName,
          phone: targetClient.phone,
          orderType: 'reparacao',
          technicianName: 'Job Baptista (Mestre Job)',
          priority: 'alta',
          orderNotes: `Avaria de sinal reportada pelo cliente. Caixa ${targetClient.pdoBox}, porta ${targetClient.port}. Nível de sinal: ${targetClient.opticalRxDbm} dBm.`,
        },
      },
      {
        id: 'act-wa-client',
        label: '📱 Enviar Mensagem ao Cliente (WhatsApp)',
        type: 'whatsapp',
        payload: {
          phone: targetClient.phone,
          whatsappText: isCutForDebt
            ? `Olá estimado(a) ${targetClient.fullName}. Informamos que o seu sinal de ${targetClient.planName} encontra-se suspenso devido à mensalidade pendente de ${kz(
                targetClient.debtAmount || targetClient.monthlyFee,
              )}. Para religação imediata, liquide via Multicaixa Express (IBAN BAI: AO06.0040.0000.1234.5678.9012.3) ou solicite um acordo de pagamento com o nosso suporte: 926 153 736.`
            : `Olá estimado(a) ${targetClient.fullName}. A equipa técnica da OSDEL Tecnologia já detectou a instabilidade na sua linha de fibra (${targetClient.pdoBox}) e uma equipa de piquete liderada pelo Mestre Job foi despachada para inspecção no seu endereço. Agradecemos a compreensão!`,
        },
      },
    ];

    if (isCutForDebt) {
      actions.push({
        id: 'act-agr',
        label: '🤝 Formalizar Acordo & Religar Sinal',
        type: 'create_agreement',
        payload: {
          clientId: targetClient.id,
          clientCode: targetClient.code,
          clientName: targetClient.fullName,
          phone: targetClient.phone,
          promisedDate: '20/11/2026',
          promisedAmount: targetClient.monthlyFee,
        },
      });
    }

    return { text: diagnosisText, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 2: ACORDO DE PAGAMENTO & EVITAR CORTE
  // --------------------------------------------------------------------------
  if (
    q.includes('acordo') ||
    q.includes('quer pagar dia') ||
    q.includes('prometeu pagar') ||
    q.includes('prorrog') ||
    q.includes('nao cortar') ||
    q.includes('não cortar')
  ) {
    const targetClient =
      clients.find((c) => q.includes(c.fullName?.toLowerCase().split(' ')[0]) || q.includes(c.code?.toLowerCase())) ||
      clients.find((c) => c.status === 'late' || c.status === 'suspended') ||
      clients[0];

    if (!targetClient) {
      return {
        text: `📋 **Política de Acordos de Pagamento OSDEL:**\n\nCadastre o cliente no sistema para gerar o termo de compromisso e prorrogar o prazo de corte automaticamente.`,
      };
    }

    const proposedAmount = targetClient.debtAmount || targetClient.monthlyFee || 14500;
    const proposedDate = '20/11/2026';

    const text =
      `🤝 **Proposta de Acordo de Pagamento para ${targetClient.fullName} (${targetClient.code}):**\n\n` +
      `• **Valor Comprometido:** **${kz(proposedAmount)}**\n` +
      `• **Data Prometida de Liquidação:** **${proposedDate}**\n` +
      `• **Sinal do Assinante:** Será mantido / religado provisoriamente sob compromisso formal.\n` +
      `• **Regra Contratual OSDEL:** Caso o pagamento não ocorra até às 17h00 da data acordada, o sinal é cancelado e aplica-se a taxa de religação de 2.500 Kz.\n\n` +
      `Clique no botão abaixo para aprovar este acordo e regularizar o cliente no sistema imediatamente.`;

    const actions: AssistantAction[] = [
      {
        id: 'act-approve-agr',
        label: '✅ Aprovar Acordo & Manter Sinal Activo',
        type: 'create_agreement',
        payload: {
          clientId: targetClient.id,
          clientCode: targetClient.code,
          clientName: targetClient.fullName,
          phone: targetClient.phone,
          promisedDate: proposedDate,
          promisedAmount: proposedAmount,
        },
      },
      {
        id: 'act-wa-agr',
        label: '📱 Enviar Termo de Acordo por WhatsApp',
        type: 'whatsapp',
        payload: {
          phone: targetClient.phone,
          whatsappText: `*TERMO DE ACORDO DE PAGAMENTO - OSDEL TECNOLOGIA*\n\nEstimado(a) ${targetClient.fullName} (${targetClient.code}), confirmamos a aceitação da sua promessa de pagamento no valor de *${kz(
            proposedAmount,
          )}* para o dia *${proposedDate}*. O seu sinal de TV / Fibra permanecerá activo até à data limite acordada. Agradecemos a preferência!`,
        },
      },
    ];

    return { text, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 3: DESPACHO E COORDENAÇÃO COM MEMBROS DA EMPRESA (TÉCNICOS)
  // --------------------------------------------------------------------------
  if (
    q.includes('despachar') ||
    q.includes('mestre job') ||
    q.includes('helder') ||
    q.includes('atribuir') ||
    q.includes('tecnico') ||
    q.includes('escala') ||
    q.includes('chamados do job')
  ) {
    const isJob = q.includes('helder') ? false : true;
    const techName = isJob ? 'Job Baptista (Mestre Job)' : 'Hélder Manuel';
    const techPhone = isJob ? '+244 923 111 222' : '+244 923 444 888';

    const techOrders = orders.filter(
      (o: any) => (o.assignedTechnician || '').toLowerCase().includes(isJob ? 'job' : 'helder') && o.status === 'pendente',
    );

    const firstClient = clients[0];
    const clientName = firstClient ? firstClient.fullName : 'António Domingos Pedro';
    const clientAddress = firstClient ? firstClient.address : 'Rua 12, Casa 45B, Bairro Golf I';
    const clientPdo = firstClient ? firstClient.pdoBox : 'PDO-04';

    const text =
      `📋 **Despacho Operacional para o Técnico ${techName}:**\n\n` +
      `• **Contacto do Técnico:** ${techPhone}\n` +
      `• **Ordens Pendentes Atribuídas:** ${techOrders.length} intervenção(ões) na rota de hoje.\n` +
      `• **Missão Imediata:** Inspecção na caixa **${clientPdo}** para restabelecimento de link do cliente **${clientName}** em **${clientAddress}**.\n\n` +
      `Envie o despacho oficial diretamente para o WhatsApp do técnico abaixo com as coordenadas de campo.`;

    const dispatchText =
      `*DESPACHO TÉCNICO OFICIAL - OSDEL TECNOLOGIA*\n` +
      `Para: ${techName}\n` +
      `Tipo: Reparação de Fibra / Piquete Urgente\n` +
      `Cliente: ${clientName}\n` +
      `Local: ${clientAddress}\n` +
      `Caixa / Ponto: ${clientPdo}\n` +
      `Instruções: Levar Power Meter óptico, clivador e conectores SC/APC. Testar atenuação e reportar no aplicativo da equipa após conclusão.`;

    const actions: AssistantAction[] = [
      {
        id: 'act-dispatch-tech',
        label: `📱 Enviar Despacho para o WhatsApp de ${isJob ? 'Mestre Job' : 'Hélder'}`,
        type: 'whatsapp',
        payload: {
          phone: techPhone,
          whatsappText: dispatchText,
        },
      },
      {
        id: 'act-create-tech-order',
        label: '🔧 Registar Ordem Formal na Escala',
        type: 'create_order',
        payload: {
          clientName,
          phone: firstClient?.phone || '+244 923 456 789',
          orderType: 'reparacao',
          technicianName: techName,
          priority: 'alta',
          orderNotes: `Intervenção técnica na caixa ${clientPdo}. Despachada para ${techName}.`,
        },
      },
      {
        id: 'act-copy-dispatch',
        label: '📋 Copiar Despacho Técnico',
        type: 'copy_text',
        payload: {
          copyContent: dispatchText,
        },
      },
    ];

    return { text, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 4: CAIXA DO DIA & CONSULTA DE ENTRADAS / SAÍDAS
  // --------------------------------------------------------------------------
  if (
    q.includes('caixa') ||
    q.includes('arrecada') ||
    q.includes('saldo actual') ||
    q.includes('saldo atual') ||
    q.includes('quanto temos') ||
    q.includes('fecho de caixa')
  ) {
    const totalReceived = invoices
      .filter((i: any) => i.status === 'pago')
      .reduce((sum: number, i: any) => sum + Number(i.amount || 0) + Number(i.penalty || 0), 0);

    const cashReceived = invoices
      .filter((i: any) => i.status === 'pago' && String(i.method || '').toLowerCase().includes('dinheiro'))
      .reduce((sum: number, i: any) => sum + Number(i.amount || 0) + Number(i.penalty || 0), 0);

    const expressReceived = invoices
      .filter(
        (i: any) =>
          i.status === 'pago' &&
          (String(i.method || '').toLowerCase().includes('express') || String(i.method || '').toLowerCase().includes('tpa')),
      )
      .reduce((sum: number, i: any) => sum + Number(i.amount || 0) + Number(i.penalty || 0), 0);

    const bankReceived = invoices
      .filter(
        (i: any) =>
          i.status === 'pago' &&
          (String(i.method || '').toLowerCase().includes('bai') ||
            String(i.method || '').toLowerCase().includes('bfa') ||
            String(i.method || '').toLowerCase().includes('transf')),
      )
      .reduce((sum: number, i: any) => sum + Number(i.amount || 0) + Number(i.penalty || 0), 0);

    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
    const balanceInHand = cashReceived - totalExpenses;

    const reportText =
      `💰 **Relatório em Tempo Real de Caixa & Tesouraria (OSDEL):**\n\n` +
      `• **Total de Facturas Recebidas Hoje:** **${kz(totalReceived)}** (${invoices.length} recibos emitidos)\n` +
      `  - 💵 Dinheiro Físico Balcão: **${kz(cashReceived)}**\n` +
      `  - 💳 Multicaixa Express / TPA: **${kz(expressReceived)}**\n` +
      `  - 🏛️ Bancos (BAI / BFA): **${kz(bankReceived)}**\n\n` +
      `• **Total de Despesas de Campo / Saídas:** **${kz(totalExpenses)}** (${expenses.length} lançamentos)\n` +
      `• 💵 **DINHEIRO FÍSICO EM MÃOS (GAVETA):** **${kz(balanceInHand)}**\n\n` +
      `💡 O valor em dinheiro líquido apurado para entrega no fecho diário é de **${kz(balanceInHand)}**.`;

    const actions: AssistantAction[] = [
      {
        id: 'act-copy-cash',
        label: '📋 Copiar Resumo de Caixa para Relatório',
        type: 'copy_text',
        payload: {
          copyContent: reportText.replace(/\*\*/g, ''),
        },
      },
    ];

    return { text: reportText, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 5: STOCK E MATERIAIS DA VIATURA / CARRINHA TÉCNICA
  // --------------------------------------------------------------------------
  if (
    q.includes('stock') ||
    q.includes('estoque') ||
    q.includes('material') ||
    q.includes('cabo drop') ||
    q.includes('viatura') ||
    q.includes('carrinha')
  ) {
    let stockText = `📦 **Inventário Actual da Viatura de Piquete OSDEL:**\n\n`;
    materials.forEach((m: any) => {
      const isLow = m.quantity <= m.minWarning;
      stockText += `• **${m.name}:** ${m.quantity} ${m.unit} ${isLow ? '⚠️ *(Stock Baixo - Pedir Armazém)*' : '✅'}\n`;
    });
    stockText += `\n💡 Para adicionar ou dar baixa de cabos após uma instalação, utilize o módulo **Stock & Viatura** no menu lateral.`;

    return { text: stockText };
  }

  // --------------------------------------------------------------------------
  // CASO 6: FISCALIDADE AGT & REGIME DE EXCLUSÃO (ARTIGO 12 CIVA)
  // --------------------------------------------------------------------------
  if (q.includes('agt') || q.includes('civa') || q.includes('imposto') || q.includes('isencao') || q.includes('isenção')) {
    const text =
      `🏛️ **Norma Fiscal AGT - Regime de Exclusão do IVA (Art. 12 CIVA):**\n\n` +
      `• **Enquadramento:** A OSDEL TECNOLOGIA opera ao abrigo do **Regime de Exclusão do IVA**, previsto no **Artigo 12.º do Código do IVA (CIVA)** angolano.\n` +
      `• **Texto Legal Obrigatório nas Facturas e Talões Térmicos:**\n` +
      `  *"Isento de IVA nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA) - Regime de Exclusão."*\n` +
      `• **Taxa Cobrada:** **0% de IVA** aos clientes residenciais e comerciais.\n` +
      `• **NIF Oficial:** \`5600857127\` (OSDEL TECNOLOGIA LDA).\n\n` +
      `O sistema de Facturação do Gestão X já inclui esse texto fiscal por defeito em todas as vias A4 e talões POS 80mm.`;

    const actions: AssistantAction[] = [
      {
        id: 'act-copy-agt',
        label: '📋 Copiar Menção Legal AGT para Documentos',
        type: 'copy_text',
        payload: {
          copyContent:
            'Isento de IVA nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA) - Regime de Exclusão. NIF: 5600857127.',
        },
      },
    ];

    return { text, actions };
  }

  // --------------------------------------------------------------------------
  // CASO 7: SAUDAÇÃO & APRESENTAÇÃO OPERACIONAL
  // --------------------------------------------------------------------------
  const welcomeText =
    `Olá, ${ctx.userName || 'Companheiro'}! Sou o **Agente de Resolução Operacional da OSDEL Tecnologia**.\n\n` +
    `Estou conectado em tempo real à base de dados para resolver casos com clientes e com a equipa:\n\n` +
    `• 🔍 **Casos de Clientes:** Diga *"cliente António está sem sinal"* ou *"verificar cliente CLI-00001"* para diagnosticar fibra óptica, débitos e abrir ordens de serviço.\n` +
    `• 🤝 **Acordos de Pagamento:** Diga *"fazer acordo para o cliente X pagar dia 20"* para prorrogar o prazo e religar o sinal provisoriamente.\n` +
    `• 🛠️ **Despacho para Técnicos:** Diga *"atribuir avaria da Rua 12 ao Mestre Job"* para gerar o despacho com rota no WhatsApp.\n` +
    `• 💰 **Caixa & Faturamento:** Diga *"qual o saldo de caixa de hoje?"* para apurar o dinheiro líquido em mão.\n` +
    `• 📦 **Stock de Carrinha:** Diga *"quantos cabos temos na viatura?"* para conferir bobinas e conectores SC/APC.\n\n` +
    `O que deseja resolver agora?`;

  return { text: welcomeText };
}

/**
 * Consulta a IA remota ou executa o motor operacional inteligente local
 */
export async function queryAssistant(
  query: string,
  context: AssistantContext,
  apiBaseUrl?: string,
): Promise<{ text: string; actions?: AssistantAction[] }> {
  // Se houver backend remoto conectado, pode tentar enviar
  if (apiBaseUrl && !apiBaseUrl.includes('localhost')) {
    try {
      const cleanUrl = apiBaseUrl.replace(/\/$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${cleanUrl}/api/v1/ai/assist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          mode: context.mode,
          persona: context.persona,
          client_code: context.clientCode,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          // Processa ações caso existam
          const localFallback = generateLocalAssistantResponse(query, context);
          return {
            text: data.answer,
            actions: localFallback.actions,
          };
        }
      }
    } catch {
      // Fallback gracioso para o motor local operacional
    }
  }

  return generateLocalAssistantResponse(query, context);
}
