/**
 * OSDEL TECNOLOGIA - Portal do Cliente & Serviços Mobile
 * Suporte a Acordos de Pagamento, Tickets de Avaria, Notícias, Contratos e Multicaixa Express
 */

export interface PaymentPromise {
  id: string;
  clientId: number;
  clientName: string;
  clientCode: string;
  phone: string;
  serviceType: 'tv' | 'internet' | 'combo';
  promisedDate: string;
  promisedAmount: number;
  reason: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cumprido';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  operatorNotes?: string;
}

export interface SupportTicket {
  id: string;
  ticketCode: string;
  clientId: number;
  clientName: string;
  phone: string;
  address: string;
  category: 'sem_sinal_tv' | 'sem_internet' | 'cabo_partido' | 'lentidao' | 'router_los' | 'outros';
  title: string;
  description: string;
  photoUrl?: string;
  status: 'aberto' | 'em_atendimento' | 'tecnico_a_caminho' | 'resolvido';
  priority: 'normal' | 'alta' | 'urgente';
  assignedTechnician?: string;
  createdAt: string;
  updatedAt?: string;
  resolutionNotes?: string;
}

export interface CompanyAnnouncement {
  id: string;
  title: string;
  category: 'manutencao' | 'comunicado' | 'novidade' | 'urgente';
  content: string;
  date: string;
  affectedStreets?: string[];
  bannerUrl?: string;
  active: boolean;
}

const STORAGE_PROMISES = 'osdel_payment_promises';
const STORAGE_TICKETS = 'osdel_support_tickets';
const STORAGE_ANNOUNCEMENTS = 'osdel_announcements';

const SEED_ANNOUNCEMENTS: CompanyAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'Canal Oficial de Atendimento OSDEL Tecnologia',
    category: 'comunicado',
    content:
      'Bem-vindo ao portal oficial da OSDEL Tecnologia. Acompanhe os seus contratos, mensalidades e solicite apoio técnico de TV e Internet Fibra directamente pelo aplicativo.',
    date: new Date().toISOString().slice(0, 10),
    active: true,
  },
];

const SEED_PROMISES: PaymentPromise[] = [];

const SEED_TICKETS: SupportTicket[] = [];

// --- GESTÃO DE ACORDOS DE PAGAMENTO ---
export function getStoredPromises(): PaymentPromise[] {
  if (typeof window === 'undefined') return SEED_PROMISES;
  const raw = window.localStorage.getItem(STORAGE_PROMISES);
  if (!raw) {
    window.localStorage.setItem(STORAGE_PROMISES, JSON.stringify(SEED_PROMISES));
    return SEED_PROMISES;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_PROMISES;
  }
}

export function savePromises(list: PaymentPromise[]): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_PROMISES, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('osdel-promises-updated', { detail: list }));
  }
}

export function requestPaymentPromise(data: Omit<PaymentPromise, 'id' | 'status' | 'requestedAt'>): PaymentPromise {
  const existing = getStoredPromises();
  const newPromise: PaymentPromise = {
    ...data,
    id: `prom-${Date.now()}`,
    status: 'pendente',
    requestedAt: new Date().toISOString(),
  };
  const updated = [newPromise, ...existing];
  savePromises(updated);
  return newPromise;
}

export function reviewPaymentPromise(
  promiseId: string,
  decision: 'aprovado' | 'rejeitado',
  reviewerName: string,
  notes?: string,
): PaymentPromise | null {
  const list = getStoredPromises();
  let updatedItem: PaymentPromise | null = null;
  const updated = list.map((p) => {
    if (p.id === promiseId) {
      updatedItem = {
        ...p,
        status: decision,
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        operatorNotes: notes || (decision === 'aprovado' ? 'Acordo aceite. Sinal protegido contra cortes.' : 'Acordo recusado.'),
      };
      return updatedItem;
    }
    return p;
  });
  savePromises(updated);
  return updatedItem;
}

export function approvePaymentPromise(
  promiseId: string,
  reviewerName: string,
  notes?: string,
): PaymentPromise | null {
  return reviewPaymentPromise(promiseId, 'aprovado', reviewerName, notes);
}

export function rejectPaymentPromise(
  promiseId: string,
  reviewerName: string,
  notes?: string,
): PaymentPromise | null {
  return reviewPaymentPromise(promiseId, 'rejeitado', reviewerName, notes);
}

// --- GESTÃO DE TICKETS DE SUPORTE ---
export function getStoredTickets(): SupportTicket[] {
  if (typeof window === 'undefined') return SEED_TICKETS;
  const raw = window.localStorage.getItem(STORAGE_TICKETS);
  if (!raw) {
    window.localStorage.setItem(STORAGE_TICKETS, JSON.stringify(SEED_TICKETS));
    return SEED_TICKETS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_TICKETS;
  }
}

export function saveTickets(list: SupportTicket[]): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_TICKETS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('osdel-tickets-updated', { detail: list }));
  }
}

export function createSupportTicket(data: Omit<SupportTicket, 'id' | 'ticketCode' | 'status' | 'createdAt'>): SupportTicket {
  const existing = getStoredTickets();
  const nextNum = existing.length + 1;
  const year = new Date().getFullYear();
  const ticketCode = `TCK-${year}-${String(nextNum).padStart(3, '0')}`;
  const newTicket: SupportTicket = {
    ...data,
    id: `tkt-${Date.now()}`,
    ticketCode,
    status: 'aberto',
    createdAt: new Date().toISOString(),
  };
  const updated = [newTicket, ...existing];
  saveTickets(updated);
  return newTicket;
}

// --- GESTÃO DE COMUNICADOS / NOTÍCIAS ---
const STORAGE_CLIENT_ANNOUNCEMENTS = 'osdel_client_announcements';

export function getStoredAnnouncements(): CompanyAnnouncement[] {
  if (typeof window === 'undefined') return SEED_ANNOUNCEMENTS;
  try {
    // Check both storage keys (prefer osdel_client_announcements which settings tab writes to)
    const rawClient = window.localStorage.getItem(STORAGE_CLIENT_ANNOUNCEMENTS);
    if (rawClient) {
      const parsed = JSON.parse(rawClient);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const raw = window.localStorage.getItem(STORAGE_ANNOUNCEMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Initialize default seed
    window.localStorage.setItem(STORAGE_ANNOUNCEMENTS, JSON.stringify(SEED_ANNOUNCEMENTS));
    window.localStorage.setItem(STORAGE_CLIENT_ANNOUNCEMENTS, JSON.stringify(SEED_ANNOUNCEMENTS));
    return SEED_ANNOUNCEMENTS;
  } catch {
    return SEED_ANNOUNCEMENTS;
  }
}

export function saveAnnouncements(list: CompanyAnnouncement[]): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(list);
    window.localStorage.setItem(STORAGE_ANNOUNCEMENTS, json);
    window.localStorage.setItem(STORAGE_CLIENT_ANNOUNCEMENTS, json);
    window.dispatchEvent(new CustomEvent('osdel-announcements-updated', { detail: list }));
    window.dispatchEvent(new CustomEvent('osdel-client-announcements-updated', { detail: list }));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc1 = new BroadcastChannel('osdel_sync_channel');
      bc1.postMessage({ type: 'ANNOUNCEMENTS_UPDATED', announcements: list });
      bc1.close();
      const bc2 = new BroadcastChannel('osdel_announcements_channel');
      bc2.postMessage({ type: 'ANNOUNCEMENTS_UPDATED', announcements: list });
      bc2.close();
    }
  } catch (e) {
    console.warn('Failed to save announcements:', e);
  }
}

