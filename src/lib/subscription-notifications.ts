/**
 * OSDEL TECNOLOGIA - Motor Automático de Notificações de Subscrições
 *
 * Monitora permanentemente em segundo plano:
 * 1. Subscrições de Descodificadores de TV (cartões DStv, ZAP, Parabólicas a expirar em 7d, 3d, 1d ou vencidos)
 * 2. Mensalidades e Subscrições de Clientes de Fibra e TV (faturas vencidas, prazos de tolerância e cortes pendentes)
 *
 * Funciona de forma 100% AUTOMÁTICA no arranque da aplicação, em intervalos periódicos,
 * e a cada sincronização na nuvem, sem necessidade de aceder à página de canais.
 */

import {
  getStoredTvDecoders,
  getDecodersRequiringAlerts,
  syncTvExpiryNotifications,
} from '@/lib/tv-channels';

const STORAGE_SYSTEM_NOTIFS = 'osdel_system_notifications';
const STORAGE_LAST_AUTO_CHECK = 'osdel_last_subscription_check';

export interface SubscriptionCheckSummary {
  timestamp: string;
  tvAlertsCount: number;
  criticalTvCount: number;
  totalRenewalNeededKz: number;
  clientOverdueCount: number;
  details: {
    tvExpired: number;
    tv1Day: number;
    tv3Days: number;
    tv7Days: number;
  };
}

/**
 * Executa a verificação completa de todas as subscrições do sistema (TV + Fibra)
 * e atualiza automaticamente as notificações internas e alertas.
 */
export function runAutomatedSubscriptionCheck(): SubscriptionCheckSummary {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Executa a sincronização dos descodificadores de TV para o repositório de notificações
  try {
    syncTvExpiryNotifications();
  } catch (err) {
    console.warn('Erro ao sincronizar notificações de TV:', err);
  }

  // 2. Coleta dados de alerta dos descodificadores
  const tvAlerts = getDecodersRequiringAlerts();
  const decoders = getStoredTvDecoders();

  // 3. Coleta dados de clientes com mensalidades / subscrições em risco
  let clientOverdueCount = 0;
  try {
    const rawClients = window.localStorage.getItem('osdel:clients');
    const clients = rawClients ? JSON.parse(rawClients) : [];
    const rawInvoices = window.localStorage.getItem('osdel:invoices');
    const invoices = rawInvoices ? JSON.parse(rawInvoices) : [];

    const todayStr = nowIso.slice(0, 10);

    // Contabiliza faturas pendentes com vencimento ultrapassado
    const lateInvoices = invoices.filter(
      (inv: any) =>
        inv.status === 'pendente' &&
        inv.dueDate &&
        inv.dueDate < todayStr
    );
    clientOverdueCount = lateInvoices.length;

    // Se houver clientes com risco de corte, emite notificação agrupada
    if (clientOverdueCount > 0) {
      updateClientSubscriptionNotification(clientOverdueCount, lateInvoices);
    }
  } catch (err) {
    console.warn('Erro ao verificar mensalidades de clientes:', err);
  }

  // 4. Salva o timestamp da última verificação
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_LAST_AUTO_CHECK, nowIso);
    window.dispatchEvent(
      new CustomEvent('osdel-subscriptions-checked', {
        detail: {
          timestamp: nowIso,
          tvAlertsCount: tvAlerts.totalAlertsCount,
          clientOverdueCount,
        },
      })
    );
  }

  const allAlertDecoders = [
    ...(tvAlerts?.expired || []),
    ...(tvAlerts?.critical1Day || []),
    ...(tvAlerts?.high3Days || []),
    ...(tvAlerts?.warning7Days || []),
  ];
  const totalRenewalNeededKz = allAlertDecoders.reduce(
    (sum, d) => sum + Number(d.monthlyCost || 0),
    0
  );

  return {
    timestamp: nowIso,
    tvAlertsCount: tvAlerts?.totalAlertsCount || 0,
    criticalTvCount: (tvAlerts?.expired?.length || 0) + (tvAlerts?.critical1Day?.length || 0),
    totalRenewalNeededKz,
    clientOverdueCount,
    details: {
      tvExpired: tvAlerts?.expired?.length || 0,
      tv1Day: tvAlerts?.critical1Day?.length || 0,
      tv3Days: tvAlerts?.high3Days?.length || 0,
      tv7Days: tvAlerts?.warning7Days?.length || 0,
    },
  };
}

/**
 * Atualiza ou insere notificação de clientes inadimplentes / subscrições atrasadas
 */
function updateClientSubscriptionNotification(overdueCount: number, lateInvoices: any[]) {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(STORAGE_SYSTEM_NOTIFS);
    let notifs: any[] = raw ? JSON.parse(raw) : [];

    // Remove notificação anterior para não duplicar
    notifs = notifs.filter((n) => n.id !== 'auto-client-subscriptions-overdue');

    const totalKz = lateInvoices.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);

    notifs.unshift({
      id: 'auto-client-subscriptions-overdue',
      title: `⚠️ ${overdueCount} Mensalidade(s) de Clientes Vencidas`,
      message: `Existem ${overdueCount} clientes com subscrição pendente (total de ${totalKz.toLocaleString('pt-AO')} Kz). Verifique a lista de cortes e faturas para evitar inadimplência.`,
      type: 'aviso',
      timestamp: new Date().toISOString(),
      read: false,
      targetRole: 'admin',
      actionUrl: '/business/faturas',
    });

    window.localStorage.setItem(STORAGE_SYSTEM_NOTIFS, JSON.stringify(notifs.slice(0, 80)));
    window.dispatchEvent(new CustomEvent('osdel-notifications-updated'));
  } catch {}
}

/**
 * Inicializador global do serviço de monitorização de subscrições.
 * Configura timers e ouvintes de ciclo de vida (arranque, foco da janela, retorno de conectividade).
 */
let serviceInitialized = false;

export function initAutomatedSubscriptionService(): () => void {
  if (typeof window === 'undefined' || serviceInitialized) {
    return () => {};
  }

  serviceInitialized = true;

  // 1. Executa imediatamente no arranque da aplicação
  runAutomatedSubscriptionCheck();

  // 2. Intervalo periódico a cada 3 minutos (180 000 ms)
  const intervalId = window.setInterval(() => {
    runAutomatedSubscriptionCheck();
  }, 3 * 60 * 1000);

  // 3. Ao focar a janela ou voltar ao app (Mobile/Desktop/Electron)
  const handleVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible') {
      runAutomatedSubscriptionCheck();
    }
  };

  window.addEventListener('visibilitychange', handleVisibilityOrFocus);
  window.addEventListener('focus', handleVisibilityOrFocus);

  // 4. Ao receber dados novos da sincronização em nuvem
  const handleCloudSync = () => {
    runAutomatedSubscriptionCheck();
  };

  window.addEventListener('osdel-sync-completed', handleCloudSync);
  window.addEventListener('osdel-data-synced-from-cloud', handleCloudSync);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    window.removeEventListener('osdel-sync-completed', handleCloudSync);
    window.removeEventListener('osdel-data-synced-from-cloud', handleCloudSync);
    serviceInitialized = false;
  };
}
