/**
 * OSDEL TECNOLOGIA - CENTRAL DE NOTIFICAÇÕES EM TEMPO REAL
 * Gere alertas dinâmicos com contadores de não lidas, filtros e acções directas.
 */

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'avaria' | 'acordo' | 'corte' | 'missao' | 'emprestimo' | 'sistema' | 'financeiro' | 'atendimento_humano' | 'chat_equipa';
  priority: 'urgente' | 'alta' | 'normal';
  targetRole: 'todos' | 'tecnico' | 'operador' | 'admin';
  targetUserId?: number;
  read: boolean;
  createdAt: string;
  link?: string;
}

const NOTIFICATIONS_STORAGE_KEY = 'osdel_system_notifications';

const SEED_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Novo Acordo de Não Corte Solicitado',
    message: 'Carlos Alberto Domingos (CLI-00088) solicitou compromisso de pagamento até 20/09/2026 para manter o sinal de TV activo.',
    type: 'acordo',
    priority: 'alta',
    targetRole: 'operador',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    link: '/clientes/4',
  },
  {
    id: 'notif-2',
    title: 'Pedido de Adiantamento Salarial',
    message: 'Mestre Job (Job Batalha) solicitou adiantamento salarial de Kz 40.000 para desconto em 2 parcelas mensais.',
    type: 'emprestimo',
    priority: 'alta',
    targetRole: 'admin',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    link: '/equipe',
  },
  {
    id: 'notif-3',
    title: 'Avaria na Caixa PDO-04 Relatada',
    message: 'Cliente da Rua 12 reportou quebra de sinal de TV após passagem de camião na rua. Piquete necessário.',
    type: 'avaria',
    priority: 'urgente',
    targetRole: 'tecnico',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    link: '/ordens-servico',
  },
  {
    id: 'notif-4',
    title: 'Missão de Piquete: Cortes Agendados',
    message: 'A Missão "Operação Piquete - Ruas 12 e 13" foi atribuída aos técnicos Mestre Job, Júlio Afonso e Enock Miguel.',
    type: 'missao',
    priority: 'normal',
    targetRole: 'tecnico',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    link: '/missoes',
  },
  {
    id: 'notif-5',
    title: '38 Clientes com Mensalidade em Atraso',
    message: 'Vencimento mensal ultrapassado. Fila de cobranças pronta para envio de SMS e corte programado.',
    type: 'corte',
    priority: 'urgente',
    targetRole: 'operador',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    link: '/rappels',
  },
];

export function getStoredNotifications(): SystemNotification[] {
  if (typeof window === 'undefined') return SEED_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
      return SEED_NOTIFICATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_NOTIFICATIONS;
  }
}

export function saveNotifications(notifications: SystemNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('osdel-notifications-updated', { detail: { count: notifications.filter(n => !n.read).length } }));
  } catch (err) {
    console.error('Erro ao salvar notificações:', err);
  }
}

export function pushNotification(notification: Omit<SystemNotification, 'id' | 'createdAt' | 'read'>): SystemNotification {
  const current = getStoredNotifications();
  const newItem: SystemNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...current];
  saveNotifications(updated);
  return newItem;
}

export function markAsRead(id: string): void {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(updated);
}

export function markAllAsRead(): void {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);
}

export function deleteNotification(id: string): void {
  const current = getStoredNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveNotifications(updated);
}

export function addSystemNotification(params: {
  title: string;
  message: string;
  type?: string;
  priority?: 'urgente' | 'alta' | 'normal';
  roleTarget?: string;
  targetRole?: string;
  linkUrl?: string;
  link?: string;
  targetUserId?: number;
}): SystemNotification {
  const mappedType: SystemNotification['type'] =
    params.type === 'avaria' ||
    params.type === 'acordo' ||
    params.type === 'corte' ||
    params.type === 'missao' ||
    params.type === 'emprestimo' ||
    params.type === 'atendimento_humano' ||
    params.type === 'chat_equipa' ||
    params.type === 'financeiro'
      ? params.type
      : 'sistema';

  const roleInput = params.roleTarget || params.targetRole || 'todos';
  const mappedRole: SystemNotification['targetRole'] =
    roleInput === 'technician' || roleInput === 'tecnico'
      ? 'tecnico'
      : roleInput === 'operador'
      ? 'operador'
      : roleInput === 'admin'
      ? 'admin'
      : 'todos';

  return pushNotification({
    title: params.title,
    message: params.message,
    type: mappedType,
    priority: params.priority || 'normal',
    targetRole: mappedRole,
    targetUserId: params.targetUserId,
    link: params.linkUrl || params.link,
  });
}

export function getUnreadCount(): number {
  return getStoredNotifications().filter((n) => !n.read).length;
}
