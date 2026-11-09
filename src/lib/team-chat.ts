/**
 * OSDEL TECNOLOGIA - SISTEMA INTEGRADO DE MENSAGENS E CHAT
 * Gestão de comunicação interna da equipa e chat de suporte ao cliente com triagem de chatbot.
 */

export interface TeamMessage {
  id: string;
  channelId: 'geral' | 'piquete-cortes' | 'tecnicos-fibra' | 'suporte-clientes';
  senderId: number;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
  priority?: 'normal' | 'alta' | 'urgente';
  tags?: string[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'receipt' | 'document';
}

export interface ClientChatMessage {
  id: string;
  clientId: number;
  clientCode: string;
  clientName: string;
  sender: 'client' | 'bot' | 'admin';
  senderName: string;
  message: string;
  createdAt: string;
  requiresHuman?: boolean;
  handledByAdminName?: string;
  suggestedActions?: { label: string; action: string; payload?: any }[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'receipt' | 'document';
}

export interface SupportInterventionTicket {
  id: string;
  clientId: number;
  clientCode: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  serviceType: string;
  reason: string;
  status: 'aguardando_atendente' | 'em_atendimento' | 'resolvido';
  assignedAdminName?: string;
  assignedAdminId?: number;
  createdAt: string;
  updatedAt: string;
  lastClientMessage: string;
}

const TEAM_MESSAGES_KEY = 'osdel_team_messages';
const CLIENT_CHAT_KEY_PREFIX = 'osdel_client_chat_';
const INTERVENTIONS_KEY = 'osdel_human_interventions';

const SEED_TEAM_MESSAGES: TeamMessage[] = [
  {
    id: 'tm-1',
    channelId: 'geral',
    senderId: 1,
    senderName: 'Deezy (Super Admin)',
    senderRole: 'superadmin',
    message: 'Bom dia a toda a equipa OSDEL! Hoje teremos alinhamento às 08h30 na sede sobre as metas de regularização do Golf I.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    priority: 'normal',
  },
  {
    id: 'tm-2',
    channelId: 'piquete-cortes',
    senderId: 2,
    senderName: 'Mestre Job',
    senderRole: 'tecnico',
    message: 'Atenção piquete: Ruas 12 e 13 têm 18 clientes em suspensão na PDO-04. Já conferimos a lista de cortes.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    priority: 'alta',
  },
  {
    id: 'tm-3',
    channelId: 'tecnicos-fibra',
    senderId: 5,
    senderName: 'Júlio Afonso',
    senderRole: 'tecnico',
    message: 'Fusão na porta 03 da PDO-02 concluída. Nível óptico estabilizado em -18.6 dBm (excelente sinal).',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    priority: 'normal',
  },
  {
    id: 'tm-4',
    channelId: 'suporte-clientes',
    senderId: 0,
    senderName: 'Bot Atendimento OSDEL',
    senderRole: 'sistema',
    message: 'Aviso: O cliente CLI-00001 (António Pedro) solicitou intervenção de um membro administrativo referente a corte indevido.',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    priority: 'urgente',
  },
];

// Áudio sintético nativo (Web Audio API) para alertas sem ficheiros externos pesados
export function playNotificationSound(type: 'message' | 'urgent' | 'success' = 'message') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'urgent') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

import { getApiBaseUrl } from './api-config';

/* ==========================================================================
   MENSAGENS DA EQUIPA & CHAT REAL-TIME BROADCAST
   ========================================================================== */

let chatBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    chatBroadcastChannel = new BroadcastChannel('osdel_chat_channel');
    chatBroadcastChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'TEAM_MESSAGE' && data.message) {
        const current = getStoredTeamMessages();
        if (!current.some((m) => m.id === data.message.id)) {
          const updated = [...current, data.message];
          try {
            localStorage.setItem(TEAM_MESSAGES_KEY, JSON.stringify(updated));
          } catch {}
          window.dispatchEvent(new CustomEvent('osdel-team-message-received', { detail: data.message }));
          playNotificationSound(data.message.priority === 'urgente' ? 'urgent' : 'message');
        }
      } else if (data.type === 'CLIENT_MESSAGE' && data.message && data.clientId) {
        const current = getClientChatMessages(data.clientId);
        if (!current.some((m) => m.id === data.message.id)) {
          const updated = [...current, data.message];
          try {
            localStorage.setItem(`${CLIENT_CHAT_KEY_PREFIX}${data.clientId}`, JSON.stringify(updated));
          } catch {}
          window.dispatchEvent(new CustomEvent('osdel-client-chat-updated', { detail: { clientId: data.clientId, messages: updated } }));
          playNotificationSound(data.message.sender === 'client' ? 'message' : 'success');
        }
      } else if (data.type === 'INTERVENTION' && data.tickets) {
        try {
          localStorage.setItem(INTERVENTIONS_KEY, JSON.stringify(data.tickets));
        } catch {}
        window.dispatchEvent(new CustomEvent('osdel-interventions-updated', { detail: data.tickets }));
      }
    };
  } catch (err) {
    console.warn('BroadcastChannel not available:', err);
  }
}

// Escuta storage events em navegadores / webviews sem BroadcastChannel
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === TEAM_MESSAGES_KEY) {
      window.dispatchEvent(new CustomEvent('osdel-team-message-received', { detail: null }));
    } else if (e.key && e.key.startsWith(CLIENT_CHAT_KEY_PREFIX)) {
      const clientId = Number(e.key.replace(CLIENT_CHAT_KEY_PREFIX, ''));
      window.dispatchEvent(new CustomEvent('osdel-client-chat-updated', { detail: { clientId } }));
    }
  });
}

export function getStoredTeamMessages(): TeamMessage[] {
  if (typeof window === 'undefined') return SEED_TEAM_MESSAGES;
  try {
    const raw = localStorage.getItem(TEAM_MESSAGES_KEY);
    if (!raw) {
      localStorage.setItem(TEAM_MESSAGES_KEY, JSON.stringify(SEED_TEAM_MESSAGES));
      return SEED_TEAM_MESSAGES;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_TEAM_MESSAGES;
  }
}

export function sendTeamMessage(data: Omit<TeamMessage, 'id' | 'createdAt'>): TeamMessage {
  const current = getStoredTeamMessages();
  const newMsg: TeamMessage = {
    ...data,
    id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [...current, newMsg];
  try {
    localStorage.setItem(TEAM_MESSAGES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('osdel-team-message-received', { detail: newMsg }));
    playNotificationSound(newMsg.priority === 'urgente' ? 'urgent' : 'message');

    // Notifica instantaneamente todos os terminais abertos (Web, Electron e APKs)
    if (chatBroadcastChannel) {
      chatBroadcastChannel.postMessage({ type: 'TEAM_MESSAGE', message: newMsg });
    }

    // Persistência assíncrona no backend / banco de dados PythonAnywhere
    const baseUrl = getApiBaseUrl();
    if (baseUrl) {
      fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/messages/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      }).catch(() => {});
    }
  } catch {}
  return newMsg;
}

/* ==========================================================================
   CHAT SUPORTE CLIENTE & BOT
   ========================================================================== */

export function getClientChatMessages(clientId: number, clientName = 'Cliente', clientCode = 'CLI-00001'): ClientChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${CLIENT_CHAT_KEY_PREFIX}${clientId}`);
    if (!raw) {
      const defaultWelcome: ClientChatMessage[] = [
        {
          id: `cmsg-welcome-${clientId}`,
          clientId,
          clientCode,
          clientName,
          sender: 'bot',
          senderName: 'Assistente Virtual OSDEL',
          message: `Olá ${clientName}! Seja bem-vindo ao Atendimento Digital da OSDEL Tecnologia. Sou o seu assistente virtual. Como posso ajudar hoje?`,
          createdAt: new Date().toISOString(),
          suggestedActions: [
            { label: '💰 Consultar Saldo & Faturas', action: 'check_balance' },
            { label: '🏛️ Coordenadas Bancárias (IBAN)', action: 'bank_info' },
            { label: '📡 Sem Sinal / Problema Técnico', action: 'tech_troubleshoot' },
            { label: '👤 Falar com Atendente Humano', action: 'request_human' },
          ],
        },
      ];
      localStorage.setItem(`${CLIENT_CHAT_KEY_PREFIX}${clientId}`, JSON.stringify(defaultWelcome));
      return defaultWelcome;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveClientChatMessages(clientId: number, messages: ClientChatMessage[]): void {
  try {
    localStorage.setItem(`${CLIENT_CHAT_KEY_PREFIX}${clientId}`, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent('osdel-client-chat-updated', { detail: { clientId, messages } }));
  } catch {}
}

export function sendClientMessage(
  clientId: number,
  clientCode: string,
  clientName: string,
  message: string,
  sender: 'client' | 'admin' | 'bot' = 'client',
  senderName = 'Cliente',
  attachment?: { url: string; name?: string; type?: 'image' | 'receipt' | 'document' }
): ClientChatMessage {
  const current = getClientChatMessages(clientId, clientName, clientCode);
  const newMsg: ClientChatMessage = {
    id: `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    clientId,
    clientCode,
    clientName,
    sender,
    senderName,
    message,
    createdAt: new Date().toISOString(),
    ...(attachment ? {
      attachmentUrl: attachment.url,
      attachmentName: attachment.name,
      attachmentType: attachment.type || 'image',
    } : {}),
  };

  const updated = [...current, newMsg];
  saveClientChatMessages(clientId, updated);
  playNotificationSound(sender === 'client' ? 'message' : 'success');

  // Envia em tempo real para todos os terminais abertos (Web, APKs e Electron)
  if (chatBroadcastChannel) {
    chatBroadcastChannel.postMessage({ type: 'CLIENT_MESSAGE', clientId, message: newMsg });
  }

  // Persiste no banco de dados do servidor
  const baseUrl = getApiBaseUrl();
  if (baseUrl) {
    fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/messages/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newMsg.id,
        clientId,
        clientCode,
        clientName,
        message,
        sender,
        senderName,
      }),
    }).catch(() => {});
  }

  return newMsg;
}


/* ==========================================================================
   TICKETS DE INTERVENÇÃO ADMINISTRATIVA / HUMANA
   ========================================================================== */

export function getHumanInterventionTickets(): SupportInterventionTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INTERVENTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveHumanInterventionTickets(tickets: SupportInterventionTicket[]): void {
  try {
    localStorage.setItem(INTERVENTIONS_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new CustomEvent('osdel-interventions-updated', { detail: tickets }));
  } catch {}
}

export function requestHumanIntervention(params: {
  clientId: number;
  clientCode: string;
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  serviceType: string;
  reason: string;
  lastClientMessage: string;
}): SupportInterventionTicket {
  const tickets = getHumanInterventionTickets();
  const existing = tickets.find(
    (t) => t.clientId === params.clientId && t.status === 'aguardando_atendente'
  );

  if (existing) {
    existing.lastClientMessage = params.lastClientMessage;
    existing.updatedAt = new Date().toISOString();
    existing.reason = params.reason || existing.reason;
    saveHumanInterventionTickets(tickets);
    return existing;
  }

  const newTicket: SupportInterventionTicket = {
    id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    clientId: params.clientId,
    clientCode: params.clientCode,
    clientName: params.clientName,
    clientPhone: params.clientPhone,
    clientAddress: params.clientAddress,
    serviceType: params.serviceType,
    reason: params.reason,
    status: 'aguardando_atendente',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastClientMessage: params.lastClientMessage,
  };

  const updated = [newTicket, ...tickets];
  saveHumanInterventionTickets(updated);

  // Também publica no canal interno da equipe
  sendTeamMessage({
    channelId: 'suporte-clientes',
    senderId: 0,
    senderName: 'Bot Atendimento OSDEL',
    senderRole: 'sistema',
    message: `🚨 Intervenção Humana Solicitada! O cliente ${params.clientName} (${params.clientCode}) necessita de atendimento: "${params.reason}".`,
    priority: 'urgente',
    tags: ['intervencao_humana', params.clientCode],
  });

  playNotificationSound('urgent');
  return newTicket;
}

export function claimHumanIntervention(ticketId: string, adminName: string, adminId?: number): void {
  const tickets = getHumanInterventionTickets();
  const found = tickets.find((t) => t.id === ticketId);
  if (found) {
    found.status = 'em_atendimento';
    found.assignedAdminName = adminName;
    found.assignedAdminId = adminId;
    found.updatedAt = new Date().toISOString();
    saveHumanInterventionTickets(tickets);

    // Envia mensagem informativa no chat do cliente
    sendClientMessage(
      found.clientId,
      found.clientCode,
      found.clientName,
      `👋 Olá! Sou o(a) ${adminName} da Administração OSDEL e acabo de assumir o seu atendimento. Em que posso ser útil?`,
      'admin',
      adminName
    );
  }
}

export function resolveHumanIntervention(ticketId: string, adminName: string): void {
  const tickets = getHumanInterventionTickets();
  const found = tickets.find((t) => t.id === ticketId);
  if (found) {
    found.status = 'resolvido';
    found.updatedAt = new Date().toISOString();
    saveHumanInterventionTickets(tickets);

    sendClientMessage(
      found.clientId,
      found.clientCode,
      found.clientName,
      `✅ Atendimento concluído por ${adminName}. Agradecemos o seu contacto com a OSDEL Tecnologia!`,
      'admin',
      adminName
    );
  }
}
