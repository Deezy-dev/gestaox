/**
 * GESTÃO X - O ASSISTENTE INTELIGENTE
 * Módulo Central de Gestão Multi-Empresa (Multi-Tenant) & Subscrições SaaS
 */

export interface TenantPlan {
  id: 'start' | 'pro' | 'enterprise';
  name: string;
  monthlyPrice: number;
  maxClients: number;
  maxUsers: number;
  description: string;
  features: string[];
}

export const SAAS_PLANS: TenantPlan[] = [
  {
    id: 'start',
    name: 'Plano Start',
    monthlyPrice: 25000,
    maxClients: 200,
    maxUsers: 2,
    description: 'Ideal para pequenos provedores locais em fase inicial.',
    features: [
      'Até 200 clientes ativos',
      'Gestão de TV OU Internet Fibra',
      'Emissão de recibos e faturas',
      'Controlo de pagamentos e dívidas',
      'Modo Offline & PWA',
    ],
  },
  {
    id: 'pro',
    name: 'Plano Pro Crescimento',
    monthlyPrice: 48000,
    maxClients: 800,
    maxUsers: 8,
    description: 'O mais popular para provedores consolidados com equipa técnica.',
    features: [
      'Até 800 clientes ativos',
      'Suporte a TV + Internet Fibra (Combo)',
      'Ordens de Serviço e Piquete em tempo real',
      'Gestão de Caixa & Fechos diários',
      'Inventário de cabos, ONUs e divisores',
      'Alertas de corte automáticos (Rappels)',
    ],
  },
  {
    id: 'enterprise',
    name: 'Plano Enterprise Ilimitado',
    monthlyPrice: 95000,
    maxClients: 99999,
    maxUsers: 50,
    description: 'Para operadoras com múltiplos bairros e frotas de piquete.',
    features: [
      'Clientes e contratos ilimitados',
      'Múltiplas zonas e bairros',
      'Escalas de piquete avançadas',
      'Relatórios de auditoria e contabilidade AGT',
      'Assistente Inteligente Gestão X prioritário',
      'Suporte 24/7 e formação da equipa',
    ],
  },
];

export interface TenantCompany {
  id: string;
  name: string;
  slug: string;
  tradingName: string;
  nif: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  province: string;
  servicesSupported: 'tv' | 'fibra' | 'combo';
  planId: 'start' | 'pro' | 'enterprise';
  subscriptionStatus: 'ativo' | 'trial' | 'atrasado' | 'bloqueado';
  trialEndsAt: string;
  nextBillingDate: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  paymentMethod: 'multicaixa_express' | 'referencia_bancaria' | 'transferencia';
  referenceCode?: string;
  logoUrl: string;
  responsibleName: string;
  responsibleRole: string;
  createdAt: string;
  isMasterAccount?: boolean; // Conta original OSDEL
  notes?: string;
}

export interface SubscriptionPaymentRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  planId: string;
  planName: string;
  paidAt: string;
  paymentMethod: string;
  reference: string;
  status: 'confirmado' | 'pendente_analise';
  invoiceNumber: string;
  proofUrl?: string;
}

const STORAGE_TENANTS_KEY = 'gestaox_tenants_registry';
const STORAGE_ACTIVE_TENANT_KEY = 'gestaox_active_tenant_id';
const STORAGE_SUBSCRIPTION_PAYMENTS_KEY = 'gestaox_subscription_payments';

export const INITIAL_TENANTS: TenantCompany[] = [
  {
    id: 'empresa-osdel',
    name: 'OSDEL TECNOLOGIA LDA',
    slug: 'osdel',
    tradingName: 'OSDEL Tecnologia',
    nif: '5600857127',
    phone: '926 153 736',
    whatsapp: '926 153 736',
    email: 'comercial@osdeltecnologia.ao',
    address: 'Rua 12, Bairro Golf I, Kilamba Kiaxi',
    city: 'Kilamba Kiaxi',
    province: 'Luanda',
    servicesSupported: 'combo',
    planId: 'enterprise',
    subscriptionStatus: 'ativo',
    trialEndsAt: '2030-12-31',
    nextBillingDate: '2026-10-25',
    lastPaymentDate: '2026-09-20',
    lastPaymentAmount: 95000,
    paymentMethod: 'referencia_bancaria',
    referenceCode: 'MCX-994821',
    logoUrl: '/osdel-logo.jpg',
    responsibleName: 'Albert (Administrador Geral)',
    responsibleRole: 'Director Geral',
    createdAt: '2021-02-01',
    isMasterAccount: true,
    notes: 'Conta Fundadora do Gestão X com acesso total a todas as modalidades.',
  },
];

export function getStoredTenants(): TenantCompany[] {
  if (typeof window === 'undefined') return INITIAL_TENANTS;
  try {
    const raw = localStorage.getItem(STORAGE_TENANTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_TENANTS_KEY, JSON.stringify(INITIAL_TENANTS));
      return INITIAL_TENANTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_TENANTS_KEY, JSON.stringify(INITIAL_TENANTS));
      return INITIAL_TENANTS;
    }
    return parsed;
  } catch {
    return INITIAL_TENANTS;
  }
}

export function saveTenants(tenants: TenantCompany[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_TENANTS_KEY, JSON.stringify(tenants));
    window.dispatchEvent(new CustomEvent('gestaox-tenants-updated', { detail: { tenants } }));
  } catch (err) {
    console.error('Erro ao guardar empresas:', err);
  }
}

export function getActiveTenantId(): string {
  if (typeof window === 'undefined') return 'empresa-osdel';
  try {
    const id = localStorage.getItem(STORAGE_ACTIVE_TENANT_KEY);
    if (id) {
      const all = getStoredTenants();
      if (all.some((t) => t.id === id)) return id;
    }
    return 'empresa-osdel';
  } catch {
    return 'empresa-osdel';
  }
}

export function setActiveTenantId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_ACTIVE_TENANT_KEY, id);
    window.dispatchEvent(new CustomEvent('gestaox-active-tenant-changed', { detail: { tenantId: id } }));
  } catch (err) {
    console.error('Erro ao alterar empresa ativa:', err);
  }
}

export function getActiveTenant(): TenantCompany {
  const all = getStoredTenants();
  const currentId = getActiveTenantId();
  return all.find((t) => t.id === currentId) || all[0] || INITIAL_TENANTS[0];
}

export function registerNewTenant(data: {
  name: string;
  tradingName?: string;
  nif: string;
  phone: string;
  whatsapp?: string;
  email: string;
  address: string;
  city: string;
  province?: string;
  servicesSupported: 'tv' | 'fibra' | 'combo';
  planId: 'start' | 'pro' | 'enterprise';
  responsibleName: string;
  responsibleRole?: string;
  logoUrl?: string;
}): TenantCompany {
  const all = getStoredTenants();
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
  const newId = `empresa-${Date.now().toString(36)}`;
  
  const trialDays = 14;
  const trialEnd = new Date(Date.now() + trialDays * 86400000).toISOString().slice(0, 10);

  const newCompany: TenantCompany = {
    id: newId,
    name: data.name.trim(),
    slug,
    tradingName: data.tradingName?.trim() || data.name.trim(),
    nif: data.nif.trim(),
    phone: data.phone.trim(),
    whatsapp: data.whatsapp?.trim() || data.phone.trim(),
    email: data.email.trim(),
    address: data.address.trim(),
    city: data.city.trim() || 'Luanda',
    province: data.province || 'Luanda',
    servicesSupported: data.servicesSupported,
    planId: data.planId,
    subscriptionStatus: 'trial',
    trialEndsAt: trialEnd,
    nextBillingDate: trialEnd,
    paymentMethod: 'multicaixa_express',
    referenceCode: `MCX-${Math.floor(100000 + Math.random() * 900000)}`,
    logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&auto=format&fit=crop&q=80',
    responsibleName: data.responsibleName.trim(),
    responsibleRole: data.responsibleRole?.trim() || 'Gestor Geral',
    createdAt: new Date().toISOString().slice(0, 10),
    isMasterAccount: false,
    notes: 'Empresa registada via Onboarding com 14 dias de teste grátis activados.',
  };

  const updated = [newCompany, ...all];
  saveTenants(updated);
  setActiveTenantId(newCompany.id);
  return newCompany;
}

export function updateTenantStatus(
  tenantId: string,
  status: 'ativo' | 'trial' | 'atrasado' | 'bloqueado',
  extendedDays?: number
): void {
  const all = getStoredTenants();
  const target = all.find((t) => t.id === tenantId);
  if (!target) return;

  target.subscriptionStatus = status;
  if (extendedDays) {
    const current = new Date(target.nextBillingDate || target.trialEndsAt || Date.now());
    current.setDate(current.getDate() + extendedDays);
    target.nextBillingDate = current.toISOString().slice(0, 10);
    target.trialEndsAt = current.toISOString().slice(0, 10);
  }

  saveTenants([...all]);
}

export function recordSubscriptionPayment(
  tenantId: string,
  amount: number,
  method: string,
  reference: string
): SubscriptionPaymentRecord {
  const all = getStoredTenants();
  const target = all.find((t) => t.id === tenantId);
  if (!target) throw new Error('Empresa não encontrada');

  const plan = SAAS_PLANS.find((p) => p.id === target.planId) || SAAS_PLANS[1];

  // Estender subscrição por 30 dias a partir da data actual ou da próxima factura
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 30);
  const nextDate = baseDate.toISOString().slice(0, 10);

  target.subscriptionStatus = 'ativo';
  target.lastPaymentDate = new Date().toISOString().slice(0, 10);
  target.lastPaymentAmount = amount;
  target.nextBillingDate = nextDate;
  saveTenants([...all]);

  const payments = getSubscriptionPayments();
  const newRecord: SubscriptionPaymentRecord = {
    id: `sub-pay-${Date.now()}`,
    tenantId: target.id,
    tenantName: target.name,
    amount,
    planId: plan.id,
    planName: plan.name,
    paidAt: new Date().toISOString(),
    paymentMethod: method,
    reference,
    status: 'confirmado',
    invoiceNumber: `SUB-GX-${Date.now().toString().slice(-6)}`,
  };

  saveSubscriptionPayments([newRecord, ...payments]);
  return newRecord;
}

export function getSubscriptionPayments(): SubscriptionPaymentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_SUBSCRIPTION_PAYMENTS_KEY);
    if (!raw) {
      const initial: SubscriptionPaymentRecord[] = [
        {
          id: 'sub-1',
          tenantId: 'empresa-osdel',
          tenantName: 'OSDEL TECNOLOGIA LDA',
          amount: 95000,
          planId: 'enterprise',
          planName: 'Plano Enterprise Ilimitado',
          paidAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          paymentMethod: 'Referência Multicaixa',
          reference: 'MCX-994821',
          status: 'confirmado',
          invoiceNumber: 'SUB-GX-001092',
        },
        {
          id: 'sub-2',
          tenantId: 'empresa-cazenga-tv',
          tenantName: 'CAZENGA TV COMUNITÁRIA',
          amount: 25000,
          planId: 'start',
          planName: 'Plano Start',
          paidAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          paymentMethod: 'Transferência Bancária BAI',
          reference: 'TRF-BAO-49102',
          status: 'confirmado',
          invoiceNumber: 'SUB-GX-001045',
        },
      ];
      localStorage.setItem(STORAGE_SUBSCRIPTION_PAYMENTS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSubscriptionPayments(records: SubscriptionPaymentRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_SUBSCRIPTION_PAYMENTS_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('gestaox-payments-updated', { detail: { records } }));
  } catch (err) {
    console.error('Erro ao guardar pagamentos SaaS:', err);
  }
}
