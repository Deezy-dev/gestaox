/**
 * OSDEL TECNOLOGIA - Módulo de Missões em Equipa e Cortes por Rua
 * Permite a criação de piquetes de corte/religação em equipa com designação de líder,
 * selecção de técnicos, filtragem automática de devedores por rua e geração de PDF.
 */

import { addSystemNotification } from './notifications';
import { enqueueSyncMutation } from '@/lib/offline-sync';
import { pushActivityDirectToCloud } from '@/lib/online-first-sync';

export interface MissionTask {
  id: string;
  clientId: number;
  clientCode: string;
  clientName: string;
  phone: string;
  address: string;
  street: string;
  houseCode?: string;
  pdoNumber: string;
  portNumber?: string;
  serviceType: 'tv' | 'internet' | 'combo';
  debtAmount: number;
  monthsLate: number;
  status: 'pendente' | 'cortado' | 'religado' | 'acordo_no_local' | 'ausente';
  completedAt?: string;
  completedBy?: string;
  observation?: string;
}

export interface TeamMission {
  id: string;
  code: string;
  title: string;
  type: 'corte' | 'religacao' | 'vistoria' | 'fusao' | 'instalacao';
  leaderId: number;
  leaderName: string;
  technicianIds: number[];
  technicianNames: string[];
  streets: string[];
  scheduledDate: string;
  status: 'pendente' | 'em_curso' | 'concluida' | 'cancelada';
  tasks: MissionTask[];
  notes?: string;
  createdAt: string;
  createdBy: string;
}

const STORAGE_KEY = 'osdel_team_missions';

const SEED_MISSIONS: TeamMission[] = [];

export function getStoredMissions(): TeamMission[] {
  if (typeof window === 'undefined') return SEED_MISSIONS;
  const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem('osdel:team_missions');
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_MISSIONS));
    return SEED_MISSIONS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_MISSIONS;
  }
}

export function saveMissions(missions: TeamMission[]): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
    window.localStorage.setItem('osdel:team_missions', JSON.stringify(missions));
    window.dispatchEvent(new CustomEvent('osdel-missions-updated', { detail: missions }));
    window.dispatchEvent(new CustomEvent('osdel-team-missions-updated', { detail: missions }));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'DATA_SYNC', key: 'team_missions', payload: missions });
        bc.close();
      } catch {}
    }
  }
}

/**
 * Cria uma nova missão em equipa
 */
export function createTeamMission(
  data: Omit<TeamMission, 'id' | 'code' | 'createdAt'>,
): TeamMission {
  const existing = getStoredMissions();
  const nextNum = existing.length + 1;
  const year = new Date().getFullYear();
  const code = `MIS-${year}-${String(nextNum).padStart(3, '0')}`;
  const newMission: TeamMission = {
    ...data,
    id: `mis-${Date.now()}`,
    code,
    createdAt: new Date().toISOString(),
  };

  const updated = [newMission, ...existing];
  saveMissions(updated);

  try {
    enqueueSyncMutation({
      module: 'equipa',
      action: 'create',
      entity: 'team_mission',
      description: `Missão de piquete: ${newMission.code} (${newMission.title})`,
      payload: newMission,
    });
    pushActivityDirectToCloud({
      module: 'equipa',
      action: 'create',
      entity: 'team_mission',
      description: `Missão de piquete: ${newMission.code} (${newMission.title})`,
      payload: newMission,
    }).catch(() => {});
  } catch {}

  // NOTIFICAR OS TÉCNICOS ESCALADOS
  try {
    addSystemNotification({
      title: `Nova Missão Designada: ${newMission.code}`,
      message: `Missão "${newMission.title}" agendada para ${newMission.scheduledDate} nas ruas ${newMission.streets.join(', ')}. Equipa: ${newMission.technicianNames.join(', ')}.`,
      type: 'alerta',
      roleTarget: 'technician',
      linkUrl: '/equipa-missoes',
    });
  } catch (err) {
    console.error('Erro ao emitir notificação de missão:', err);
  }

  return newMission;
}

/**
 * Conclui uma missão manualmente ou quando todas as tarefas forem finalizadas
 */
export function completeMission(missionId: string, completedBy = 'Piquete Técnico'): TeamMission | null {
  const missions = getStoredMissions();
  let completedMission: TeamMission | null = null;

  const updated = missions.map((m) => {
    if (m.id === missionId) {
      completedMission = {
        ...m,
        status: 'concluida',
      };
      return completedMission;
    }
    return m;
  });

  saveMissions(updated);

  if (completedMission) {
    try {
      addSystemNotification({
        title: `Missão Concluída: ${(completedMission as TeamMission).code}`,
        message: `A missão de piquete "${(completedMission as TeamMission).title}" foi concluída por ${completedBy} e transferida para o Histórico de Missões.`,
        type: 'sucesso',
        roleTarget: 'all',
        linkUrl: '/equipa-missoes',
      });
    } catch (err) {
      console.error('Erro ao emitir notificação de missão concluída:', err);
    }
  }

  return completedMission;
}

/**
 * Retorna as missões ativas (pendentes ou em curso)
 */
export function getActiveMissions(): TeamMission[] {
  return getStoredMissions().filter((m) => m.status === 'pendente' || m.status === 'em_curso');
}

/**
 * Retorna o histórico de missões concluídas ou arquivadas
 */
export function getMissionHistory(): TeamMission[] {
  return getStoredMissions().filter((m) => m.status === 'concluida' || m.status === 'cancelada');
}

/**
 * Atualiza o status de uma tarefa da missão e sincroniza com o status do cliente no sistema principal
 */
export function updateMissionTask(
  missionId: string,
  taskId: string,
  status: MissionTask['status'],
  technicianName: string,
  observation?: string,
): TeamMission | null {
  const missions = getStoredMissions();
  let targetTask: MissionTask | null = null;
  let missionJustCompleted = false;

  const updated = missions.map((m) => {
    if (m.id === missionId) {
      const updatedTasks = m.tasks.map((t) => {
        if (t.id === taskId) {
          targetTask = {
            ...t,
            status,
            completedAt: new Date().toISOString(),
            completedBy: technicianName,
            observation: observation || t.observation,
          };
          return targetTask;
        }
        return t;
      });

      // Check if all tasks are done
      const allDone = updatedTasks.length > 0 && updatedTasks.every((t) => t.status !== 'pendente');
      if (allDone && m.status !== 'concluida') {
        missionJustCompleted = true;
      }
      const newMissionStatus: TeamMission['status'] = allDone ? 'concluida' : 'em_curso';

      return {
        ...m,
        status: newMissionStatus,
        tasks: updatedTasks,
      };
    }
    return m;
  });

  saveMissions(updated);

  if (missionJustCompleted) {
    const concluded = updated.find((m) => m.id === missionId);
    if (concluded) {
      try {
        addSystemNotification({
          title: `Missão ${concluded.code} Concluída!`,
          message: `Todas as tarefas da missão "${concluded.title}" foram executadas no terreno. Transferida para o Histórico de Missões.`,
          type: 'sucesso',
          roleTarget: 'all',
          linkUrl: '/equipa-missoes',
        });
      } catch (err) {
        console.error('Erro ao disparar notificação:', err);
      }
    }
  }

  // SINCRONIZAÇÃO EM TEMPO REAL COM O SISTEMA PRINCIPAL
  if (targetTask && typeof window !== 'undefined') {
    try {
      const clientsRaw = window.localStorage.getItem('osdel:clients') || window.localStorage.getItem('osdel_clients');
      if (clientsRaw) {
        let clientsList = JSON.parse(clientsRaw);
        let updatedClientObj: any = null;
        clientsList = clientsList.map((c: any) => {
          if (c.id === (targetTask as any).clientId) {
            let newClientStatus = c.status;
            if (status === 'cortado') {
              newClientStatus = 'suspended';
            } else if (status === 'religado') {
              newClientStatus = 'active';
            }
            const updateLog = `[Piquete ${new Date().toLocaleDateString('pt-AO')}: Marcado como ${status.toUpperCase()} por ${technicianName}${observation ? ` - ${observation}` : ''}]`;
            updatedClientObj = {
              ...c,
              status: newClientStatus,
              notes: c.notes ? `${c.notes}\n${updateLog}` : updateLog,
            };
            return updatedClientObj;
          }
          return c;
        });
        window.localStorage.setItem('osdel:clients', JSON.stringify(clientsList));
        window.localStorage.setItem('osdel_clients', JSON.stringify(clientsList));
        window.dispatchEvent(new CustomEvent('osdel-clients-updated'));

        if (updatedClientObj) {
          try {
            enqueueSyncMutation({
              module: 'clientes',
              action: 'update',
              entity: 'Cliente',
              description: `Piquete alterou estado do cliente #${updatedClientObj.id} para ${updatedClientObj.status}`,
              payload: { id: updatedClientObj.id, clientId: updatedClientObj.id, status: updatedClientObj.status, notes: updatedClientObj.notes },
            });
            pushActivityDirectToCloud({
              module: 'clientes',
              action: 'update',
              entity: 'Cliente',
              description: `Piquete alterou estado do cliente #${updatedClientObj.id} para ${updatedClientObj.status}`,
              payload: { id: updatedClientObj.id, clientId: updatedClientObj.id, status: updatedClientObj.status, notes: updatedClientObj.notes },
            }).catch(() => {});
          } catch {}
        }
      }
    } catch (err) {
      console.error('Erro na sincronização de cliente com missão:', err);
    }
  }

  return updated.find((m) => m.id === missionId) || null;
}
