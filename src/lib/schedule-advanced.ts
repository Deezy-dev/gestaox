/**
 * OSDEL TECNOLOGIA - Agenda Avançada: Rotinas Predefinidas & Agendamento Manual
 * Gestão de escalas de piquete, turnos de técnicos, vistorias e manutenções de rede.
 */

export interface ScheduleEvent {
  id: string;
  title: string;
  type: 'piquete_corte' | 'instalacao' | 'vistoria' | 'fusao_fibra' | 'manutencao_noc' | 'reuniao' | 'atendimento';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  assignedTechnicianIds: number[];
  assignedTechnicianNames: string[];
  leaderId?: number;
  leaderName?: string;
  street?: string;
  pdoNumber?: string;
  clientId?: number;
  clientName?: string;
  priority: 'normal' | 'alta' | 'urgente';
  status: 'pendente' | 'em_curso' | 'concluida' | 'cancelada';
  description?: string;
  checklist?: { id: string; label: string; done: boolean }[];
  isPredefinedRoutine?: boolean;
}

export interface PredefinedRoutineTemplate {
  id: string;
  title: string;
  type: ScheduleEvent['type'];
  defaultStartTime: string;
  defaultEndTime: string;
  priority: ScheduleEvent['priority'];
  description: string;
  suggestedDepartment: string;
  checklist: string[];
}

export const PREDEFINED_ROUTINES: PredefinedRoutineTemplate[] = [
  {
    id: 'routine-noc-open',
    title: 'Abertura do NOC & Monitorização de Troncais OLT',
    type: 'manutencao_noc',
    defaultStartTime: '07:30',
    defaultEndTime: '08:30',
    priority: 'alta',
    description: 'Verificação de alarmes de perda de sinal ótico (LOS), estado dos switches de distribuição e testes de ping internacional.',
    suggestedDepartment: 'TI / NOC',
    checklist: [
      'Conferir estado das portas PON na OLT Huawei',
      'Verificar temperatura e no-breaks na sala do NOC',
      'Testar link principal Unitel / Angola Cables',
      'Validar sincronismo da base de dados e backups',
    ],
  },
  {
    id: 'routine-street-cuts',
    title: 'Campanha de Cortes por Rua (Inadimplência)',
    type: 'piquete_corte',
    defaultStartTime: '09:00',
    defaultEndTime: '12:30',
    priority: 'alta',
    description: 'Piquete de corte técnico por falta de pagamento nas ruas selecionadas. Verificar caixas PDO e desconectar cabos drop devedores.',
    suggestedDepartment: 'Técnico',
    checklist: [
      'Carregar folha de corte em PDF com clientes das ruas designadas',
      'Inspecionar conectores na caixa PDO correspondente',
      'Desconectar e lacrar conector do cliente inadimplente',
      'Assinalar conclusão no app móvel para sincronizar com a base',
    ],
  },
  {
    id: 'routine-pdo-audit',
    title: 'Leitura, Limpeza e Inspecção de Caixas PDO',
    type: 'vistoria',
    defaultStartTime: '10:00',
    defaultEndTime: '13:00',
    priority: 'normal',
    description: 'Inspecção física nas caixas de distribuição óptica nos postes, limpeza de acopladores com caneta de limpeza e medição de dBm com Power Meter.',
    suggestedDepartment: 'Técnico',
    checklist: [
      'Medir potência óptica na entrada da PDO (-18 dBm a -22 dBm)',
      'Verificar fechaduras e borrachas de vedação anti-chuva',
      'Limpar poeiras e verificar aperto das braçadeiras no poste',
      'Registar portas livres disponíveis para novas instalações',
    ],
  },
  {
    id: 'routine-fiber-fusion',
    title: 'Piquete de Manutenção Rápida & Fusão de Fibra',
    type: 'fusao_fibra',
    defaultStartTime: '14:00',
    defaultEndTime: '17:00',
    priority: 'urgente',
    description: 'Atendimento a ocorrências de cabos partidos por camiões, fusão de fibras em caixas de emenda (FOSC/CTO) e restabelecimento de sinal.',
    suggestedDepartment: 'Técnico',
    checklist: [
      'Localizar ponto de ruptura com caneta laser VFL ou OTDR',
      'Preparar máquina de fusão e clivador de alta precisão',
      'Proteger fusões com tubetes termoretráteis na bandeja',
      'Confirmar retorno do sinal com os clientes da rua',
    ],
  },
  {
    id: 'routine-weekly-alignment',
    title: 'Reunião de Alinhamento Semanal do Piquete Operacional',
    type: 'reuniao',
    defaultStartTime: '08:00',
    defaultEndTime: '09:30',
    priority: 'normal',
    description: 'Reunião geral com a direcção, técnicos de campo e atendimento. Revisão de metas, metas de cobrança e distribuição de materiais.',
    suggestedDepartment: 'Direcção',
    checklist: [
      'Revisão de faturas recuperadas no período',
      'Entrega de bobinas de cabo drop e conectores',
      'Avaliação dos tempos de resposta a avarias (SLA)',
      'Planeamento das ruas prioritárias para a semana',
    ],
  },
];

import { enqueueSyncMutation } from '@/lib/offline-sync';
import { pushActivityDirectToCloud } from '@/lib/online-first-sync';

const STORAGE_SCHEDULE = 'osdel_advanced_schedule';

const SEED_SCHEDULE: ScheduleEvent[] = [];

export function getStoredSchedule(): ScheduleEvent[] {
  if (typeof window === 'undefined') return SEED_SCHEDULE;
  const raw = window.localStorage.getItem(STORAGE_SCHEDULE) || window.localStorage.getItem('osdel:schedule_events');
  if (!raw) {
    window.localStorage.setItem(STORAGE_SCHEDULE, JSON.stringify(SEED_SCHEDULE));
    return SEED_SCHEDULE;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_SCHEDULE;
  }
}

export function saveSchedule(events: ScheduleEvent[]): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_SCHEDULE, JSON.stringify(events));
    window.localStorage.setItem('osdel:schedule_events', JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('osdel-schedule-updated', { detail: events }));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'DATA_SYNC', key: 'schedule', payload: events });
        bc.close();
      } catch {}
    }
  }
}

export function createScheduleEvent(event: Omit<ScheduleEvent, 'id'>): ScheduleEvent {
  const existing = getStoredSchedule();
  const newEvent: ScheduleEvent = {
    ...event,
    id: `ev-${Date.now()}`,
  };
  const updated = [newEvent, ...existing];
  saveSchedule(updated);

  try {
    enqueueSyncMutation({
      module: 'agenda',
      action: 'create',
      entity: 'schedule',
      description: `Agendamento: ${newEvent.title} (${newEvent.date})`,
      payload: newEvent,
    });
    pushActivityDirectToCloud({
      module: 'agenda',
      action: 'create',
      entity: 'schedule',
      description: `Agendamento: ${newEvent.title} (${newEvent.date})`,
      payload: newEvent,
    }).catch(() => {});
  } catch {}

  return newEvent;
}

export function updateScheduleEvent(id: string, updates: Partial<ScheduleEvent>): ScheduleEvent | null {
  const list = getStoredSchedule();
  let updatedItem: ScheduleEvent | null = null;
  const updated = list.map((ev) => {
    if (ev.id === id) {
      updatedItem = { ...ev, ...updates };
      return updatedItem;
    }
    return ev;
  });
  saveSchedule(updated);

  if (updatedItem) {
    try {
      enqueueSyncMutation({
        module: 'agenda',
        action: 'update',
        entity: 'schedule',
        description: `Actualizado evento: ${(updatedItem as ScheduleEvent).title}`,
        payload: updatedItem,
      });
      pushActivityDirectToCloud({
        module: 'agenda',
        action: 'update',
        entity: 'schedule',
        description: `Actualizado evento: ${(updatedItem as ScheduleEvent).title}`,
        payload: updatedItem,
      }).catch(() => {});
    } catch {}
  }

  return updatedItem;
}

export function deleteScheduleEvent(id: string): void {
  const list = getStoredSchedule();
  const target = list.find((ev) => ev.id === id);
  saveSchedule(list.filter((ev) => ev.id !== id));

  try {
    enqueueSyncMutation({
      module: 'agenda',
      action: 'delete',
      entity: 'schedule',
      description: `Eliminado agendamento: ${target?.title || id}`,
      payload: { id },
    });
    pushActivityDirectToCloud({
      module: 'agenda',
      action: 'delete',
      entity: 'schedule',
      description: `Eliminado agendamento: ${target?.title || id}`,
      payload: { id },
    }).catch(() => {});
  } catch {}
}
