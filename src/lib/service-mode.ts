/**
 * OSDEL TECNOLOGIA - Gestão do Modo de Serviço / Workspace
 *
 * Permite separar a operação entre:
 * 1. 'fibra' - Internet Fibra Óptica (Planos Mbps, PDO, ONU, FTTH)
 * 2. 'tv' - TV Comunitária (Sinal RF, Pontos de TV, Coaxial)
 * 3. 'ambos' - Operação Integrada (TV + Internet Fibra juntos)
 */

import { useState, useEffect, useCallback } from 'react';

export type ServiceMode = 'fibra' | 'tv' | 'ambos';

export interface ServiceModeMeta {
  id: ServiceMode;
  name: string;
  shortName: string;
  badge: string;
  tagline: string;
  description: string;
  themeColor: string;
  bgGradient: string;
  borderAccent: string;
  filterValue: string; // for clients page filter tab ('internet' | 'tv' | '')
}

export const SERVICE_MODES: Record<ServiceMode, ServiceModeMeta> = {
  fibra: {
    id: 'fibra',
    name: 'Internet Fibra Óptica',
    shortName: 'Fibra Óptica',
    badge: 'Banda Larga FTTH',
    tagline: 'Operação dedicada a clientes de fibra óptica e planos de internet.',
    description: 'Gestão focada em planos de banda larga (10 a 100 Mbps), caixas PDO de terminação, modems ONU e conexões de alta velocidade.',
    themeColor: '#2563eb',
    bgGradient: 'from-blue-600 via-indigo-600 to-sky-700',
    borderAccent: 'border-blue-500/40 hover:border-blue-500',
    filterValue: 'internet',
  },
  tv: {
    id: 'tv',
    name: 'TV Comunitária',
    shortName: 'TV',
    badge: 'Sinal RF & TV',
    tagline: 'Operação dedicada à transmissão e distribuição de TV.',
    description: 'Gestão focada em mensalidades de televisão, sinal RF, pontos adicionais por residência, amplificadores e piquetes de TV.',
    themeColor: '#ea580c',
    bgGradient: 'from-amber-600 via-orange-600 to-red-600',
    borderAccent: 'border-amber-500/40 hover:border-amber-500',
    filterValue: 'tv',
  },
  ambos: {
    id: 'ambos',
    name: 'Operação Integrada (TV + Fibra)',
    shortName: 'TV + Fibra (Ambos)',
    badge: 'Gestão Completa',
    tagline: 'Visão unificada de todos os serviços de telecomunicação da OSDEL.',
    description: 'Acesso simultâneo e irrestrito a todos os clientes de TV, Internet Fibra e pacotes combinados (Combos), tesouraria e relatórios gerais.',
    themeColor: '#059669',
    bgGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    borderAccent: 'border-emerald-500/40 hover:border-emerald-500',
    filterValue: '',
  },
};

const STORAGE_KEY = 'osdel-service-mode';
const EVENT_NAME = 'osdel-service-mode-changed';

export function getStoredServiceMode(): ServiceMode | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'fibra' || stored === 'tv' || stored === 'ambos') {
    return stored;
  }
  return null;
}

export function setStoredServiceMode(mode: ServiceMode): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { mode } }));
}

export function clearStoredServiceMode(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { mode: null } }));
}

export function useServiceMode() {
  const [mode, setModeState] = useState<ServiceMode | null>(() => getStoredServiceMode());

  useEffect(() => {
    const handler = (e: any) => {
      const newMode = e.detail?.mode ?? getStoredServiceMode();
      setModeState(newMode);
    };

    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const selectMode = useCallback((newMode: ServiceMode) => {
    setStoredServiceMode(newMode);
    setModeState(newMode);
  }, []);

  const resetMode = useCallback(() => {
    clearStoredServiceMode();
    setModeState(null);
  }, []);

  const meta = mode ? SERVICE_MODES[mode] : SERVICE_MODES.ambos;

  return {
    mode,
    meta,
    isFibra: mode === 'fibra',
    isTV: mode === 'tv',
    isAmbos: mode === 'ambos' || mode === null,
    selectMode,
    resetMode,
  };
}

/**
 * Verifica se um tipo de serviço (tv, internet, combo) é compatível com o modo ativo
 */
export function isServiceCompatibleWithMode(serviceType: string | undefined | null, mode: ServiceMode | null): boolean {
  if (!mode || mode === 'ambos') return true;
  if (mode === 'fibra') {
    return serviceType === 'internet' || serviceType === 'combo';
  }
  if (mode === 'tv') {
    return serviceType === 'tv' || serviceType === 'combo';
  }
  return true;
}

/**
 * Modo estrito: apenas internet para fibra, apenas tv para tv
 */
export function isServiceStrictlyMatchingMode(serviceType: string | undefined | null, mode: ServiceMode | null): boolean {
  if (!mode || mode === 'ambos') return true;
  const s = String(serviceType || '').toLowerCase().trim();
  if (mode === 'fibra') {
    return s === 'internet' || s === 'fibra' || s === 'ftth' || s === 'combo';
  }
  if (mode === 'tv') {
    return s === 'tv' || s === 'tv_cabo' || s === 'catv' || s === 'combo';
  }
  return true;
}

/**
 * Filtra clientes baseado no modo ativo
 */
export function filterClientsByMode<T extends { serviceType?: string | null }>(clients: T[], mode: ServiceMode | null): T[] {
  if (!mode || mode === 'ambos') return clients;
  return clients.filter((c) => isServiceStrictlyMatchingMode(c.serviceType, mode));
}

/**
 * Filtra pagamentos baseado no modo ativo
 */
export function filterPaymentsByMode<T extends { clientId?: number | null }>(
  payments: T[],
  clients: Array<{ id: number; serviceType?: string | null }>,
  mode: ServiceMode | null
): T[] {
  if (!mode || mode === 'ambos') return payments;
  const clientMap = new Map(clients.map((c) => [c.id, c.serviceType]));
  return payments.filter((p) => {
    if (!p.clientId) return true;
    const sType = clientMap.get(p.clientId);
    return isServiceStrictlyMatchingMode(sType, mode);
  });
}

/**
 * Filtra faturas baseado no modo ativo
 */
export function filterInvoicesByMode<T extends { clientId?: number | null; items?: Array<{ description?: string }> }>(
  invoices: T[],
  clients: Array<{ id: number; serviceType?: string | null }>,
  mode: ServiceMode | null
): T[] {
  if (!mode || mode === 'ambos') return invoices;
  const clientMap = new Map(clients.map((c) => [c.id, c.serviceType]));
  return invoices.filter((inv) => {
    if (inv.clientId) {
      const sType = clientMap.get(inv.clientId);
      if (sType) return isServiceStrictlyMatchingMode(sType, mode);
    }
    // Se não tiver clientId, verifica itens
    if (inv.items && inv.items.length) {
      const desc = inv.items.map((i) => i.description || '').join(' ').toLowerCase();
      if (mode === 'fibra') {
        return desc.includes('fibra') || desc.includes('internet') || desc.includes('drop') || desc.includes('onu') || desc.includes('mbps');
      }
      if (mode === 'tv') {
        return desc.includes('tv') || desc.includes('canal') || desc.includes('sinal') || desc.includes('coaxial');
      }
    }
    return true;
  });
}

/**
 * Filtra contratos baseado no modo ativo
 */
export function filterContractsByMode<T extends { clientId?: number | null; planName?: string | null }>(
  contracts: T[],
  clients: Array<{ id: number; serviceType?: string | null }>,
  mode: ServiceMode | null
): T[] {
  if (!mode || mode === 'ambos') return contracts;
  const clientMap = new Map(clients.map((c) => [c.id, c.serviceType]));
  return contracts.filter((ct) => {
    if (ct.clientId) {
      const sType = clientMap.get(ct.clientId);
      if (sType) return isServiceStrictlyMatchingMode(sType, mode);
    }
    const name = String(ct.planName || '').toLowerCase();
    if (mode === 'fibra') {
      return name.includes('fibra') || name.includes('mbps') || name.includes('net');
    }
    if (mode === 'tv') {
      return name.includes('tv') || name.includes('comunit');
    }
    return true;
  });
}

/**
 * Filtra ordens de serviço baseado no modo ativo
 */
export function filterServiceOrdersByMode<T extends { clientId?: number | null; type?: string | null; title?: string | null }>(
  orders: T[],
  clients: Array<{ id: number; serviceType?: string | null }>,
  mode: ServiceMode | null
): T[] {
  if (!mode || mode === 'ambos') return orders;
  const clientMap = new Map(clients.map((c) => [c.id, c.serviceType]));
  return orders.filter((o) => {
    if (o.clientId) {
      const sType = clientMap.get(o.clientId);
      if (sType) return isServiceStrictlyMatchingMode(sType, mode);
    }
    const txt = `${o.type || ''} ${o.title || ''}`.toLowerCase();
    if (mode === 'fibra') {
      return !txt.includes('coaxial') && !txt.includes('sinal rf') && !txt.includes('ponto tv');
    }
    if (mode === 'tv') {
      return !txt.includes('onu') && !txt.includes('drop') && !txt.includes('fusão') && !txt.includes('sc/apc');
    }
    return true;
  });
}

/**
 * Filtra inventário baseado no modo ativo
 */
export function filterInventoryByMode<T extends { category?: string | null; name?: string | null }>(
  items: T[],
  mode: ServiceMode | null
): T[] {
  if (!mode || mode === 'ambos') return items;
  if (mode === 'tv') {
    return items.filter((i) => {
      const cat = (i.category || '').toLowerCase();
      const name = (i.name || '').toLowerCase();
      return (
        cat === 'tv' ||
        name.includes('tv') ||
        name.includes('coaxial') ||
        name.includes('rg6') ||
        name.includes('conector f') ||
        name.includes('splitter') ||
        name.includes('repartidor') ||
        name.includes('amplificador')
      );
    });
  }
  if (mode === 'fibra') {
    return items.filter((i) => {
      const cat = (i.category || '').toLowerCase();
      const name = (i.name || '').toLowerCase();
      return (
        cat === 'fibra' ||
        cat === 'equipamento' ||
        name.includes('fibra') ||
        name.includes('drop') ||
        name.includes('onu') ||
        name.includes('sc/apc') ||
        name.includes('pdo') ||
        name.includes('cto') ||
        name.includes('olt') ||
        name.includes('fusão') ||
        name.includes('roteador')
      );
    });
  }
  return items;
}

