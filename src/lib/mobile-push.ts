/**
 * GESTÃO X - SISTEMA DE PUSH NOTIFICATIONS (MESSAGES POSH-UP) PARA APPS MOBILE
 * 
 * Funcionalidades:
 * 1. Web Push Notification API nativa (Notification API).
 * 2. Emissão de som sintetizado via Web Audio API (Chime de alta qualidade sem ficheiros externos).
 * 3. Vibração háptica no Android (navigator.vibrate).
 * 4. Posh-Up Banner flutuante no topo do ecrã mobile com acção e auto-dismiss.
 * 5. Histórico e gestão de notificações locais com contagem de não-lidas.
 * 6. Lembretes automáticos para faturas, cortes de fibra e missões de piquete.
 */

export interface MobilePushNotification {
  id: string;
  title: string;
  body: string;
  category: 'fatura' | 'corte_fibra' | 'piquete' | 'pagamento' | 'sistema' | 'aviso';
  targetAudience: 'cliente' | 'staff' | 'todos';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const STORAGE_KEY = 'gx_mobile_notifications_v2';
const PERMISSION_STORAGE_KEY = 'gx_push_permission_requested';

type PushListener = (notif: MobilePushNotification) => void;
const listeners = new Set<PushListener>();

/**
 * Toca um sinal sonoro agradável (chime de 2 tons) usando Web Audio API nativo.
 */
export function playPushNotificationSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    
    // Tom 1 (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tom 2 (880 Hz - A5) ligeiramente mais agudo
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.2, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (err) {
    // Ignorar se o utilizador não interagiu ainda com o ecrã
  }
}

/**
 * Vibra o telemóvel no padrão de alerta [100ms vibra, 50ms pausa, 100ms vibra]
 */
export function vibrateMobileDevice(): void {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {
      // Ignorar
    }
  }
}

/**
 * Solicita autorização de Notificações do Navegador / Sistema Operativo
 */
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    localStorage.setItem(PERMISSION_STORAGE_KEY, perm);
    return perm === 'granted';
  } catch {
    return false;
  }
}

/**
 * Envia uma Notificação Push (Posh-Up) no sistema
 */
export function sendMobilePush(params: {
  title: string;
  body: string;
  category?: MobilePushNotification['category'];
  targetAudience?: MobilePushNotification['targetAudience'];
  actionUrl?: string;
  actionLabel?: string;
}): MobilePushNotification {
  const notif: MobilePushNotification = {
    id: `push-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: params.title,
    body: params.body,
    category: params.category || 'sistema',
    targetAudience: params.targetAudience || 'todos',
    timestamp: new Date().toISOString(),
    read: false,
    actionUrl: params.actionUrl,
    actionLabel: params.actionLabel,
  };

  // 1. Guardar no armazenamento local
  const current = getStoredMobileNotifications();
  const updated = [notif, ...current].slice(0, 40); // manter últimas 40
  saveStoredMobileNotifications(updated);

  // 2. Tocar som e vibrar telemóvel
  playPushNotificationSound();
  vibrateMobileDevice();

  // 3. Notificação nativa do SO (se autorizada)
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(params.title, {
        body: params.body,
        icon: '/osdel-logo.jpg',
        badge: '/icon.svg',
      });
    } catch {
      // Fallback
    }
  }

  // 4. Notificar ouvintes no React (Posh-up banner flutuante)
  listeners.forEach((listener) => {
    try {
      listener(notif);
    } catch (err) {
      console.warn('Erro ao disparar push listener:', err);
    }
  });

  // 5. Despachar evento para componentes globais
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gx-push-notification', { detail: notif }));
  }

  return notif;
}

/**
 * Regista um listener de notificações no React
 */
export function subscribeToPushNotifications(callback: PushListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getStoredMobileNotifications(): MobilePushNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefaultInitialNotifications();
  } catch {
    return getDefaultInitialNotifications();
  }
}

export function saveStoredMobileNotifications(list: MobilePushNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Erro ao guardar notificações móveis:', err);
  }
}

export function markPushAsRead(id: string): void {
  const current = getStoredMobileNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStoredMobileNotifications(updated);
}

export function clearAllPushNotifications(): void {
  saveStoredMobileNotifications([]);
}

function getDefaultInitialNotifications(): MobilePushNotification[] {
  return [
    {
      id: 'init-1',
      title: 'Lembrete de Vencimento de Fibra',
      body: 'A sua mensalidade de Internet Fibra (8.500 Kz) vence no dia 05. Pague via Multicaixa Express para manter o sinal activo.',
      category: 'fatura',
      targetAudience: 'cliente',
      timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      read: false,
      actionLabel: 'Pagar Agora',
    },
    {
      id: 'init-2',
      title: 'Aviso Importante: Risco de Corte Automático',
      body: 'Faltam 24h para o corte automático na caixa PDO por tolerância de pagamento expirada.',
      category: 'corte_fibra',
      targetAudience: 'cliente',
      timestamp: new Date(Date.now() - 3600 * 1000 * 14).toISOString(),
      read: false,
      actionLabel: 'Ver Acordo',
    },
    {
      id: 'init-3',
      title: 'Nova Missão de Piquete Atribuída',
      body: 'Líder Mestre Job: Missão de verificação e corte na Rua 12 atribuída com 5 clientes.',
      category: 'piquete',
      targetAudience: 'staff',
      timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      read: false,
      actionLabel: 'Abrir Folha',
    },
  ];
}
