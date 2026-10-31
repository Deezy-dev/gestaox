/**
 * Módulo de Gestão da Central de TV, Descodificadores e Canais (Headend)
 * Suporte a múltiplos descodificadores ZAP, Canal+, DStv e canais Banda Livre (FTA).
 * Gestão de ciclos mensais, cartões inteligentes, posições (operadora vs nossa rede),
 * histórico de pagamentos, auditoria de quem editou/pagou e tarefas de IA.
 */

import { enqueueSyncMutation } from '@/lib/offline-sync';
import { pushActivityDirectToCloud } from '@/lib/online-first-sync';

export interface DecoderPaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  periodStart: string;
  periodEnd: string;
  operatorName: string;
  receiptRef?: string;
  notes?: string;
}

export interface DecoderAuditEntry {
  id: string;
  timestamp: string;
  operatorName: string;
  action: 'criacao' | 'edicao' | 'troca_posicao' | 'substituicao_canal' | 'recarga' | 'manutencao';
  details: string;
}

export interface TvDecoderChannel {
  id: string;
  // Numeração nos nossos canais vs na operadora original
  channelNumber: number; // Posição nos nossos canais (ex: 56)
  providerPosition?: number; // Posição na operadora (ex: na ZAP está na 22, no Canal+ no 101)
  channelName: string; // Nome do canal (ex: ZAP Novelas)
  previousChannelName?: string; // Se foi substituído, o canal que estava antes
  category: 'novelas' | 'desporto' | 'filmes' | 'noticias' | 'infantil' | 'musica' | 'generalista' | 'religioso';
  provider: 'ZAP' | 'Canal+' | 'DStv' | 'Banda Livre' | 'Extravio' | 'Startimes' | 'TV Cabo' | 'Parabólica' | string;
  isFree: boolean; // Banda Livre é gratuito (true)
  decoderModel: string; // Modelo do descodificador (ex: ZAP HD PVR, Canal+ HD, FTA Sat)
  decoderSerial: string; // Número de série do aparelho / STB ID
  smartcardNumber: string; // Número do cartão inteligente
  modulatorChannel: string; // Canal RF / Frequência no modulador (ex: Canal 21 - 471.25 MHz)
  rackPosition: string; // Localização física na central (ex: Bastidor A · Slot 01)
  planName: string; // Nome do pacote (ex: ZAP Max, Canal+ Evasion, etc.)
  monthlyCost: number; // Preço da subscrição mensal em Kwanzas
  currentBalance: number; // Saldo atual no cartão em Kz
  subscriptionStartDate: string; // Data de início da subscrição atual (AAAA-MM-DD)
  subscriptionEndDate: string; // Data em que a subscrição expira (AAAA-MM-DD)
  status: 'ativo' | 'alerta_7d' | 'alerta_3d' | 'alerta_1d' | 'expirado' | 'gratis' | 'manutencao' | 'extraviado';
  signalStatus: 'otimo' | 'bom' | 'fraco' | 'sem_sinal';
  lastRechargedAt?: string;
  lastRechargedBy?: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
  notes?: string;
  // Histórico de pagamentos e auditoria de quem pagou ou editou
  paymentHistory?: DecoderPaymentRecord[];
  auditLog?: DecoderAuditEntry[];
}

const STORAGE_KEY = 'osdel_tv_decoders_v2';

// Seed inicial com posições reais (na ZAP vs nos nossos canais)
export const INITIAL_TV_CHANNELS: TvDecoderChannel[] = [
  // 12 Descodificadores ZAP (1 canal por aparelho)
  {
    id: 'dec-zap-01',
    channelNumber: 56, // Nos nossos canais está no 56
    providerPosition: 22, // Na ZAP oficial está na posição 22
    channelName: 'ZAP Novelas',
    category: 'novelas',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918234-A',
    smartcardNumber: '0219 4482 1092 01',
    modulatorChannel: 'Canal RF 21 (471.25 MHz)',
    rackPosition: 'Bastidor A · Slot 01',
    planName: 'ZAP Premium',
    monthlyCost: 14500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-01',
    subscriptionEndDate: '2026-10-21', // Expirando em 1 dia!
    status: 'alerta_1d',
    signalStatus: 'otimo',
    notes: 'Canal principal de novelas. Prioridade máxima de recarga.',
    paymentHistory: [
      {
        id: 'pay-zap-01-1',
        date: '2026-09-21 10:14',
        amount: 14500,
        method: 'Multicaixa Express',
        periodStart: '2026-09-21',
        periodEnd: '2026-10-21',
        operatorName: 'Adão Domingos (Admin)',
        receiptRef: 'MCX-9018441',
      },
    ],
    auditLog: [
      {
        id: 'aud-zap-01-1',
        timestamp: '2026-10-15 09:30',
        operatorName: 'Adão Domingos',
        action: 'criacao',
        details: 'Configurado na rede: Posição interna 56 / Posição ZAP 22',
      },
    ],
  },
  {
    id: 'dec-zap-02',
    channelNumber: 12,
    providerPosition: 5, // Na ZAP está no canal 5
    channelName: 'ZAP Viva',
    category: 'generalista',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918235-B',
    smartcardNumber: '0219 4482 1092 02',
    modulatorChannel: 'Canal RF 22 (479.25 MHz)',
    rackPosition: 'Bastidor A · Slot 02',
    planName: 'ZAP Max',
    monthlyCost: 9500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-03',
    subscriptionEndDate: '2026-10-23', // Expirando em 3 dias!
    status: 'alerta_3d',
    signalStatus: 'otimo',
    notes: 'Programas angolanos e entretenimento.',
    paymentHistory: [
      {
        id: 'pay-zap-02-1',
        date: '2026-09-23 15:40',
        amount: 9500,
        method: 'BAI Direto',
        periodStart: '2026-09-23',
        periodEnd: '2026-10-23',
        operatorName: 'Maria Silva',
        receiptRef: 'BAI-TRF-001294',
      },
    ],
  },
  {
    id: 'dec-zap-03',
    channelNumber: 15,
    providerPosition: 23,
    channelName: 'ZAP Novelas 2',
    category: 'novelas',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918236-C',
    smartcardNumber: '0219 4482 1092 03',
    modulatorChannel: 'Canal RF 23 (487.25 MHz)',
    rackPosition: 'Bastidor A · Slot 03',
    planName: 'ZAP Max',
    monthlyCost: 9500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-06',
    subscriptionEndDate: '2026-10-27', // Expirando em 7 dias!
    status: 'alerta_7d',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-zap-04',
    channelNumber: 24,
    providerPosition: 68,
    channelName: 'Blast (Ação & Filmes)',
    category: 'filmes',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918237-D',
    smartcardNumber: '0219 4482 1092 04',
    modulatorChannel: 'Canal RF 24 (495.25 MHz)',
    rackPosition: 'Bastidor A · Slot 04',
    planName: 'ZAP Max',
    monthlyCost: 9500,
    currentBalance: 2500,
    subscriptionStartDate: '2026-10-15',
    subscriptionEndDate: '2026-11-15',
    status: 'ativo',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-zap-05',
    channelNumber: 18,
    providerPosition: 10,
    channelName: 'Globo ON',
    category: 'novelas',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918238-E',
    smartcardNumber: '0219 4482 1092 05',
    modulatorChannel: 'Canal RF 25 (503.25 MHz)',
    rackPosition: 'Bastidor A · Slot 05',
    planName: 'ZAP Premium',
    monthlyCost: 14500,
    currentBalance: 0,
    subscriptionStartDate: '2026-09-18',
    subscriptionEndDate: '2026-10-18', // Expirou há 2 dias!
    status: 'expirado',
    signalStatus: 'sem_sinal',
    notes: 'Expirou no dia 18. Fazer recarga urgente!',
  },
  {
    id: 'dec-zap-06',
    channelNumber: 30,
    providerPosition: 17,
    channelName: 'DStv / SuperSport Máximo 1',
    category: 'desporto',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918239-F',
    smartcardNumber: '0219 4482 1092 06',
    modulatorChannel: 'Canal RF 26 (511.25 MHz)',
    rackPosition: 'Bastidor A · Slot 06',
    planName: 'ZAP Premium Desporto',
    monthlyCost: 16000,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-12',
    subscriptionEndDate: '2026-11-12',
    status: 'ativo',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-zap-07',
    channelNumber: 31,
    providerPosition: 18,
    channelName: 'SuperSport Futebol',
    category: 'desporto',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918240-G',
    smartcardNumber: '0219 4482 1092 07',
    modulatorChannel: 'Canal RF 27 (519.25 MHz)',
    rackPosition: 'Bastidor A · Slot 07',
    planName: 'ZAP Premium Desporto',
    monthlyCost: 16000,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-10',
    subscriptionEndDate: '2026-11-10',
    status: 'ativo',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-zap-08',
    channelNumber: 40,
    providerPosition: 44,
    channelName: 'Panda Kids',
    category: 'infantil',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918241-H',
    smartcardNumber: '0219 4482 1092 08',
    modulatorChannel: 'Canal RF 28 (527.25 MHz)',
    rackPosition: 'Bastidor A · Slot 08',
    planName: 'ZAP Mini / Infantil',
    monthlyCost: 6500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-08',
    subscriptionEndDate: '2026-11-08',
    status: 'ativo',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-zap-09',
    channelNumber: 41,
    providerPosition: 45,
    channelName: 'Cartoon Network',
    category: 'infantil',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918242-I',
    smartcardNumber: '0219 4482 1092 09',
    modulatorChannel: 'Canal RF 29 (535.25 MHz)',
    rackPosition: 'Bastidor A · Slot 09',
    planName: 'ZAP Max',
    monthlyCost: 9500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-05',
    subscriptionEndDate: '2026-11-05',
    status: 'ativo',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-zap-10',
    channelNumber: 20,
    providerPosition: 60,
    channelName: 'ZAP Filmes Ação',
    category: 'filmes',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918243-J',
    smartcardNumber: '0219 4482 1092 10',
    modulatorChannel: 'Canal RF 30 (543.25 MHz)',
    rackPosition: 'Bastidor A · Slot 10',
    planName: 'ZAP Max',
    monthlyCost: 9500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-02',
    subscriptionEndDate: '2026-11-02',
    status: 'ativo',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-zap-11',
    channelNumber: 21,
    providerPosition: 61,
    channelName: 'ZAP Cinema & Séries',
    category: 'filmes',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918244-K',
    smartcardNumber: '0219 4482 1092 11',
    modulatorChannel: 'Canal RF 31 (551.25 MHz)',
    rackPosition: 'Bastidor A · Slot 11',
    planName: 'ZAP Max',
    monthlyCost: 9500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-04',
    subscriptionEndDate: '2026-11-04',
    status: 'ativo',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-zap-12',
    channelNumber: 50,
    providerPosition: 90,
    channelName: 'Afro Music Channel',
    category: 'musica',
    provider: 'ZAP',
    isFree: false,
    decoderModel: 'ZAP HD Box STB-400',
    decoderSerial: 'ZAP-00918245-L',
    smartcardNumber: '0219 4482 1092 12',
    modulatorChannel: 'Canal RF 32 (559.25 MHz)',
    rackPosition: 'Bastidor A · Slot 12',
    planName: 'ZAP Mini',
    monthlyCost: 6500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-01',
    subscriptionEndDate: '2026-11-01',
    status: 'ativo',
    signalStatus: 'otimo',
  },

  // Descodificadores Canal+
  {
    id: 'dec-cplus-01',
    channelNumber: 35,
    providerPosition: 101, // Posição 101 no Canal+
    channelName: 'Canal+ Sport 1',
    category: 'desporto',
    provider: 'Canal+',
    isFree: false,
    decoderModel: 'Canal+ HD G9 Décodeur',
    decoderSerial: 'CP-883901-X1',
    smartcardNumber: '0420 9812 3341 01',
    modulatorChannel: 'Canal RF 33 (567.25 MHz)',
    rackPosition: 'Bastidor B · Slot 01',
    planName: 'Canal+ Évasion Sport',
    monthlyCost: 18500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-02',
    subscriptionEndDate: '2026-10-22', // Expirando em 2 dias!
    status: 'alerta_3d',
    signalStatus: 'otimo',
    notes: 'Jogos da Liga dos Campeões e Premier League.',
    paymentHistory: [
      {
        id: 'pay-cp-01-1',
        date: '2026-09-22 11:30',
        amount: 18500,
        method: 'Transferência BAI',
        periodStart: '2026-09-22',
        periodEnd: '2026-10-22',
        operatorName: 'Adão Domingos',
        receiptRef: 'BAI-TRF-009923',
      },
    ],
  },
  {
    id: 'dec-cplus-02',
    channelNumber: 36,
    providerPosition: 102,
    channelName: 'Canal+ Sport 2',
    category: 'desporto',
    provider: 'Canal+',
    isFree: false,
    decoderModel: 'Canal+ HD G9 Décodeur',
    decoderSerial: 'CP-883902-X2',
    smartcardNumber: '0420 9812 3341 02',
    modulatorChannel: 'Canal RF 34 (575.25 MHz)',
    rackPosition: 'Bastidor B · Slot 02',
    planName: 'Canal+ Évasion Sport',
    monthlyCost: 18500,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-14',
    subscriptionEndDate: '2026-11-14',
    status: 'ativo',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-cplus-03',
    channelNumber: 25,
    providerPosition: 40,
    channelName: 'Canal+ Cinema África',
    category: 'filmes',
    provider: 'Canal+',
    isFree: false,
    decoderModel: 'Canal+ HD G9 Décodeur',
    decoderSerial: 'CP-883903-X3',
    smartcardNumber: '0420 9812 3341 03',
    modulatorChannel: 'Canal RF 35 (583.25 MHz)',
    rackPosition: 'Bastidor B · Slot 03',
    planName: 'Canal+ Access',
    monthlyCost: 12000,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-07',
    subscriptionEndDate: '2026-10-27',
    status: 'alerta_7d',
    signalStatus: 'otimo',
  },

  // Canais de Banda Livre (FTA / Grátis)
  {
    id: 'dec-fta-01',
    channelNumber: 1, // Posição 1 na nossa grelha
    providerPosition: 1,
    channelName: 'TPA 1 (Televisão Pública)',
    category: 'generalista',
    provider: 'Banda Livre',
    isFree: true,
    decoderModel: 'Receptor Digital Satélite FTA',
    decoderSerial: 'FTA-9901-ANG',
    smartcardNumber: 'SEM CARTÃO (Sinal Aberto)',
    modulatorChannel: 'Canal RF 36 (591.25 MHz)',
    rackPosition: 'Bastidor C · Slot 01',
    planName: 'Banda Livre (Gratuito)',
    monthlyCost: 0,
    currentBalance: 0,
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2099-12-31',
    status: 'gratis',
    signalStatus: 'otimo',
    notes: 'Canal nacional público de Angola. Sinal livre e aberto.',
  },
  {
    id: 'dec-fta-02',
    channelNumber: 2,
    providerPosition: 2,
    channelName: 'TPA 2',
    category: 'generalista',
    provider: 'Banda Livre',
    isFree: true,
    decoderModel: 'Receptor Digital Satélite FTA',
    decoderSerial: 'FTA-9902-ANG',
    smartcardNumber: 'SEM CARTÃO (Sinal Aberto)',
    modulatorChannel: 'Canal RF 37 (599.25 MHz)',
    rackPosition: 'Bastidor C · Slot 02',
    planName: 'Banda Livre (Gratuito)',
    monthlyCost: 0,
    currentBalance: 0,
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2099-12-31',
    status: 'gratis',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-fta-03',
    channelNumber: 3,
    providerPosition: 3,
    channelName: 'TV Zimbo',
    category: 'noticias',
    provider: 'Banda Livre',
    isFree: true,
    decoderModel: 'Receptor Digital Satélite FTA',
    decoderSerial: 'FTA-9903-ANG',
    smartcardNumber: 'SEM CARTÃO (Sinal Aberto)',
    modulatorChannel: 'Canal RF 38 (607.25 MHz)',
    rackPosition: 'Bastidor C · Slot 03',
    planName: 'Banda Livre (Gratuito)',
    monthlyCost: 0,
    currentBalance: 0,
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2099-12-31',
    status: 'gratis',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-fta-04',
    channelNumber: 4,
    providerPosition: 4,
    channelName: 'Palanca TV',
    category: 'generalista',
    provider: 'Banda Livre',
    isFree: true,
    decoderModel: 'Receptor Digital Satélite FTA',
    decoderSerial: 'FTA-9904-ANG',
    smartcardNumber: 'SEM CARTÃO (Sinal Aberto)',
    modulatorChannel: 'Canal RF 39 (615.25 MHz)',
    rackPosition: 'Bastidor C · Slot 04',
    planName: 'Banda Livre (Gratuito)',
    monthlyCost: 0,
    currentBalance: 0,
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2099-12-31',
    status: 'gratis',
    signalStatus: 'otimo',
  },
  {
    id: 'dec-extravio-01',
    channelNumber: 99,
    providerPosition: 0,
    channelName: 'Descodificador Sob Averiguação',
    category: 'generalista',
    provider: 'Extravio',
    isFree: true,
    decoderModel: 'Aparelho Extraviado / Em Perícia',
    decoderSerial: 'EXT-ZAP-2026-09',
    smartcardNumber: '0219 9999 0000 99 (BLOQUEADO)',
    modulatorChannel: 'Canal RF 50 (Inativo)',
    rackPosition: 'Bastidor Reserva · Quarentena',
    planName: 'Fornecedor Extravio (Equipamento Desaparecido)',
    monthlyCost: 0,
    currentBalance: 0,
    subscriptionStartDate: '2026-10-01',
    subscriptionEndDate: '2026-10-31',
    status: 'extraviado',
    signalStatus: 'sem_sinal',
    notes: 'Aparelho e cartão sinalizados como extraviados. Canal isolado da transmissão e registado no fornecedor Extravio para auditoria patrimonial.',
    paymentHistory: [],
    auditLog: [
      {
        id: 'aud-ext-1',
        timestamp: '2026-10-18 10:30',
        operatorName: 'Administração OSDEL',
        action: 'manutencao',
        details: 'Classificado no fornecedor Extravio: Aparelho em processo de substituição ou cancelamento de cartão na operadora.',
      },
    ],
  },
];

/**
 * Retorna a lista de descodificadores atualizando os estados de expiração
 */
export function getStoredTvDecoders(): TvDecoderChannel[] {
  let list: TvDecoderChannel[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      list = JSON.parse(raw);
    }
  } catch {}

  if (!list || list.length === 0) {
    list = INITIAL_TV_CHANNELS;
    saveTvDecoders(list);
  } else if (!list.some((d) => d.provider === 'Extravio' || d.status === 'extraviado')) {
    // Garante que a opção e exemplo do fornecedor Extravio esteja disponível mesmo em sessões locais anteriores
    const extravioSample: TvDecoderChannel = {
      id: 'dec-extravio-01',
      channelNumber: 99,
      providerPosition: 0,
      channelName: 'Descodificador Sob Averiguação',
      category: 'generalista',
      provider: 'Extravio',
      isFree: true,
      decoderModel: 'Aparelho Extraviado / Em Perícia',
      decoderSerial: 'EXT-ZAP-2026-09',
      smartcardNumber: '0219 9999 0000 99 (BLOQUEADO)',
      modulatorChannel: 'Canal RF 50 (Inativo)',
      rackPosition: 'Bastidor Reserva · Quarentena',
      planName: 'Fornecedor Extravio (Equipamento Desaparecido)',
      monthlyCost: 0,
      currentBalance: 0,
      subscriptionStartDate: '2026-10-01',
      subscriptionEndDate: '2026-10-31',
      status: 'extraviado',
      signalStatus: 'sem_sinal',
      notes: 'Aparelho e cartão sinalizados como extraviados. Canal isolado da transmissão e registado no fornecedor Extravio para auditoria patrimonial.',
      paymentHistory: [],
      auditLog: [
        {
          id: 'aud-ext-1',
          timestamp: '2026-10-18 10:30',
          operatorName: 'Administração OSDEL',
          action: 'manutencao',
          details: 'Classificado no fornecedor Extravio: Aparelho em processo de substituição ou cancelamento de cartão na operadora.',
        },
      ],
    };
    list.push(extravioSample);
    saveTvDecoders(list);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updated = list.map((item) => {
    if (item.status === 'extraviado' || item.provider === 'Extravio') {
      return { ...item, status: 'extraviado' as const, signalStatus: (item.signalStatus || 'sem_sinal') as any };
    }

    if (item.isFree || item.provider === 'Banda Livre') {
      return { ...item, status: 'gratis' as const };
    }

    if (item.status === 'manutencao') {
      return item;
    }

    const expDate = new Date(item.subscriptionEndDate);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let newStatus: TvDecoderChannel['status'] = 'ativo';
    if (diffDays <= 0) {
      newStatus = 'expirado';
    } else if (diffDays === 1) {
      newStatus = 'alerta_1d';
    } else if (diffDays <= 3) {
      newStatus = 'alerta_3d';
    } else if (diffDays <= 7) {
      newStatus = 'alerta_7d';
    }

    return { ...item, status: newStatus };
  });

  return updated;
}

export function getApiBaseUrl(): string {
  try {
    const stored = localStorage.getItem('osdel_api_base_url');
    if (stored && stored.trim()) return stored.trim().replace(/\/$/, '');
  } catch {}
  return 'https://osdelltecnologia.pythonanywhere.com';
}

export function saveTvDecoders(list: TvDecoderChannel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    localStorage.setItem('osdel_tv_decoders_v1', JSON.stringify(list));
    localStorage.setItem('osdel:tv_decoders', JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('osdel-tv-decoders-updated', { detail: list }));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'DATA_SYNC', key: 'tvChannels', payload: list });
        bc.close();
      } catch {}
    }
  } catch (err) {
    console.error('Erro ao guardar descodificadores:', err);
  }
}

/**
 * Sincroniza e busca descodificadores e canais da API / Banco de Dados SQLite
 */
export async function fetchTvDecodersFromBackend(): Promise<TvDecoderChannel[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/v1/tv-channels`);
    if (res.ok) {
      const json = await res.json();
      if (json.items && json.items.length > 0) {
        const mapped: TvDecoderChannel[] = json.items.map((it: any) => ({
          id: it.id,
          channelNumber: it.channelNumber,
          providerPosition: it.providerPosition,
          channelName: it.channelName,
          category: it.category || 'generalista',
          provider: it.provider,
          isFree: Boolean(it.isFree),
          decoderModel: it.decoderModel || `${it.provider} HD`,
          decoderSerial: it.decoderSerial || '',
          smartcardNumber: it.cardNumber || '',
          modulatorChannel: `Canal RF ${it.rfChannel || 'E21'}`,
          rackPosition: it.rackUnit || 'Rack 1',
          planName: it.subscriptionPackage || 'Mensalidade',
          monthlyCost: it.monthlyCost || 0,
          currentBalance: it.balance || 0,
          subscriptionStartDate: it.subscriptionStartDate || '',
          subscriptionEndDate: it.subscriptionEndDate || '',
          status: it.status || 'ativo',
          signalStatus: it.signalStatus || 'otimo',
          notes: it.notes || '',
          lastPaymentBy: it.lastRenewedBy || '',
          lastEditedBy: it.lastEditedBy || '',
          paymentHistory: [],
          auditLog: [],
        }));
        saveTvDecoders(mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Backend API offline, mantendo base local:', err);
  }
  return getStoredTvDecoders();
}


/**
 * Adiciona um novo descodificador à central
 */
export function createTvDecoder(
  data: Omit<TvDecoderChannel, 'id' | 'status'>,
  operatorName: string = 'Administrador',
): TvDecoderChannel {
  const list = getStoredTvDecoders();
  const nextNumber = list.length > 0 ? Math.max(...list.map((c) => c.channelNumber)) + 1 : 1;
  const newDecoder: TvDecoderChannel = {
    ...data,
    id: `dec-${Date.now()}`,
    channelNumber: data.channelNumber || nextNumber,
    providerPosition: data.providerPosition || data.channelNumber || nextNumber,
    status: data.isFree ? 'gratis' : 'ativo',
    paymentHistory: [],
    auditLog: [
      {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        operatorName,
        action: 'criacao',
        details: `Criado canal "${data.channelName}" (${data.provider}) na posição ${data.channelNumber}. Cartão: ${data.smartcardNumber || 'Sem cartão'}`,
      },
    ],
  };
  list.push(newDecoder);
  saveTvDecoders(list);

  try {
    enqueueSyncMutation({
      module: 'canais',
      action: 'create',
      entity: 'canal',
      description: `Novo descodificador: ${newDecoder.channelName} (Canal ${newDecoder.channelNumber})`,
      payload: newDecoder,
    });
    pushActivityDirectToCloud({
      module: 'canais',
      action: 'create',
      entity: 'canal',
      description: `Novo descodificador: ${newDecoder.channelName} (Canal ${newDecoder.channelNumber})`,
      payload: newDecoder,
    }).catch(() => {});
  } catch {}

  return newDecoder;
}

/**
 * Atualiza qualquer campo do descodificador com registo de quem editou
 */
export function updateTvDecoder(
  id: string,
  updates: Partial<TvDecoderChannel>,
  operatorName: string = 'Administrador',
  changeReason?: string,
): TvDecoderChannel | null {
  const list = getStoredTvDecoders();
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  const current = list[idx];
  const auditEntries = current.auditLog || [];

  const changesDescription = changeReason || Object.entries(updates)
    .filter(([k, v]) => (current as any)[k] !== v && k !== 'auditLog' && k !== 'paymentHistory')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');

  if (changesDescription) {
    auditEntries.unshift({
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      operatorName,
      action: 'edicao',
      details: `Alteração: ${changesDescription}`,
    });
  }

  const updated: TvDecoderChannel = {
    ...current,
    ...updates,
    lastEditedAt: new Date().toISOString(),
    lastEditedBy: operatorName,
    auditLog: auditEntries.slice(0, 30),
  };

  list[idx] = updated;
  saveTvDecoders(list);

  try {
    enqueueSyncMutation({
      module: 'canais',
      action: 'update',
      entity: 'canal',
      description: `Actualizado descodificador: ${updated.channelName} (Canal ${updated.channelNumber})`,
      payload: updated,
    });
    pushActivityDirectToCloud({
      module: 'canais',
      action: 'update',
      entity: 'canal',
      description: `Actualizado descodificador: ${updated.channelName} (Canal ${updated.channelNumber})`,
      payload: updated,
    }).catch(() => {});
  } catch {}

  return updated;
}

/**
 * Troca a posição de dois canais na nossa grelha
 * (ex: o canal 56 passa para 22 e o 22 passa para 56)
 */
export function swapDecoderPositions(
  idA: string,
  idB: string,
  operatorName: string = 'Administrador',
): boolean {
  const list = getStoredTvDecoders();
  const idxA = list.findIndex((d) => d.id === idA);
  const idxB = list.findIndex((d) => d.id === idB);
  if (idxA === -1 || idxB === -1) return false;

  const decA = list[idxA];
  const decB = list[idxB];

  const posA = decA.channelNumber;
  const posB = decB.channelNumber;

  decA.channelNumber = posB;
  decA.auditLog = decA.auditLog || [];
  decA.auditLog.unshift({
    id: `aud-${Date.now()}-a`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    operatorName,
    action: 'troca_posicao',
    details: `Posição trocada de ${posA} para ${posB} (trocado com ${decB.channelName})`,
  });

  decB.channelNumber = posA;
  decB.auditLog = decB.auditLog || [];
  decB.auditLog.unshift({
    id: `aud-${Date.now()}-b`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    operatorName,
    action: 'troca_posicao',
    details: `Posição trocada de ${posB} para ${posA} (trocado com ${decA.channelName})`,
  });

  saveTvDecoders(list);
  return true;
}

/**
 * Substitui um canal num descodificador existente
 * (ex: o aparelho que transmitia ZAP Viva passa a transmitir ZAP Novelas 2)
 */
export function replaceChannelOnDecoder(
  decoderId: string,
  newChannelData: {
    newChannelName: string;
    newCategory: TvDecoderChannel['category'];
    newPlanName?: string;
    newProviderPosition?: number;
    notes?: string;
  },
  operatorName: string = 'Administrador',
): TvDecoderChannel | null {
  const list = getStoredTvDecoders();
  const idx = list.findIndex((d) => d.id === decoderId);
  if (idx === -1) return null;

  const current = list[idx];
  const prevName = current.channelName;
  const auditEntries = current.auditLog || [];

  auditEntries.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    operatorName,
    action: 'substituicao_canal',
    details: `Canal substituído: Era "${prevName}", agora transmite "${newChannelData.newChannelName}" (Posição na operadora: ${newChannelData.newProviderPosition || current.providerPosition})`,
  });

  const updated: TvDecoderChannel = {
    ...current,
    channelName: newChannelData.newChannelName,
    previousChannelName: prevName,
    category: newChannelData.newCategory,
    planName: newChannelData.newPlanName || current.planName,
    providerPosition: newChannelData.newProviderPosition ?? current.providerPosition,
    notes: newChannelData.notes ? `${newChannelData.notes} (Substituiu ${prevName})` : current.notes,
    lastEditedAt: new Date().toISOString(),
    lastEditedBy: operatorName,
    auditLog: auditEntries,
  };

  list[idx] = updated;
  saveTvDecoders(list);
  return updated;
}

/**
 * Elimina um descodificador
 */
export function deleteTvDecoder(id: string): boolean {
  const list = getStoredTvDecoders();
  const target = list.find((d) => d.id === id);
  const filtered = list.filter((d) => d.id !== id);
  if (filtered.length !== list.length) {
    saveTvDecoders(filtered);
    try {
      enqueueSyncMutation({
        module: 'canais',
        action: 'delete',
        entity: 'canal',
        description: `Eliminado descodificador: ${target?.channelName || id}`,
        payload: { id, channelNumber: target?.channelNumber },
      });
      pushActivityDirectToCloud({
        module: 'canais',
        action: 'delete',
        entity: 'canal',
        description: `Eliminado descodificador: ${target?.channelName || id}`,
        payload: { id, channelNumber: target?.channelNumber },
      }).catch(() => {});
    } catch {}
    return true;
  }
  return false;
}

/**
 * Renova a subscrição de um descodificador por 1 Mês e regista no histórico de pagamentos
 */
export function renewTvSubscription(
  decoderId: string,
  rechargedBy: string,
  amountPaid: number,
  paymentMethod: string = 'Multicaixa Express',
  receiptRef?: string,
): TvDecoderChannel | null {
  const list = getStoredTvDecoders();
  const idx = list.findIndex((d) => d.id === decoderId);
  if (idx === -1) return null;

  const current = list[idx];
  const today = new Date();

  // Se já expirou, a nova data começa hoje + 30 dias. Se ainda está ativo, soma 30 dias à data final anterior
  let baseDate = new Date(current.subscriptionEndDate);
  if (isNaN(baseDate.getTime()) || baseDate < today) {
    baseDate = new Date(today);
  }

  const newEndDate = new Date(baseDate);
  newEndDate.setDate(newEndDate.getDate() + 30);

  const startIso = today.toISOString().slice(0, 10);
  const endIso = newEndDate.toISOString().slice(0, 10);

  // Regista pagamento no histórico
  const history = current.paymentHistory || [];
  history.unshift({
    id: `pay-${Date.now()}`,
    date: new Date().toISOString().replace('T', ' ').slice(0, 16),
    amount: amountPaid,
    method: paymentMethod,
    periodStart: startIso,
    periodEnd: endIso,
    operatorName: rechargedBy,
    receiptRef: receiptRef || `MCX-${Date.now().toString().slice(-6)}`,
    notes: `Recarga mensal de 1 mês para ${current.channelName}`,
  });

  // Regista na auditoria
  const audit = current.auditLog || [];
  audit.unshift({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
    operatorName: rechargedBy,
    action: 'recarga',
    details: `Recarga de ${amountPaid.toLocaleString('pt-AO')} Kz via ${paymentMethod} (+30 dias até ${endIso})`,
  });

  const updated: TvDecoderChannel = {
    ...current,
    subscriptionStartDate: startIso,
    subscriptionEndDate: endIso,
    status: 'ativo',
    lastRechargedAt: today.toISOString(),
    lastRechargedBy: rechargedBy,
    currentBalance: 0,
    paymentHistory: history,
    auditLog: audit,
  };

  list[idx] = updated;
  saveTvDecoders(list);
  return updated;
}

/**
 * Calcula os dias restantes até expirar
 */
export function getDaysRemaining(endDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(endDateStr);
  exp.setHours(0, 0, 0, 0);
  const diff = exp.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Identifica descodificadores que precisam de atenção administrativa (7d, 3d, 1d ou expirados)
 */
export function getDecodersRequiringAlerts(): {
  critical1Day: TvDecoderChannel[];
  high3Days: TvDecoderChannel[];
  warning7Days: TvDecoderChannel[];
  expired: TvDecoderChannel[];
  totalAlertsCount: number;
} {
  const list = getStoredTvDecoders();
  const critical1Day: TvDecoderChannel[] = [];
  const high3Days: TvDecoderChannel[] = [];
  const warning7Days: TvDecoderChannel[] = [];
  const expired: TvDecoderChannel[] = [];

  list.forEach((item) => {
    if (
      item.isFree ||
      item.provider === 'Banda Livre' ||
      item.status === 'manutencao' ||
      item.status === 'extraviado' ||
      item.provider === 'Extravio'
    )
      return;
    const days = getDaysRemaining(item.subscriptionEndDate);
    if (days <= 0) {
      expired.push(item);
    } else if (days === 1) {
      critical1Day.push(item);
    } else if (days <= 3) {
      high3Days.push(item);
    } else if (days <= 7) {
      warning7Days.push(item);
    }
  });

  return {
    critical1Day,
    high3Days,
    warning7Days,
    expired,
    totalAlertsCount: critical1Day.length + high3Days.length + warning7Days.length + expired.length,
  };
}

/**
 * Formata mensagem oficial do WhatsApp destinada exclusivamente aos
 * membros ADMINISTRATIVOS (Superadmin, Gerentes, Caixa, Direção - técnicos excluídos).
 */
export function generateAdminWhatsAppAlert(companyName: string = 'OSDEL TECNOLOGIA'): string {
  const alerts = getDecodersRequiringAlerts();
  const totalAmount = [
    ...alerts.expired,
    ...alerts.critical1Day,
    ...alerts.high3Days,
    ...alerts.warning7Days,
  ].reduce((sum, d) => sum + (d.monthlyCost || 0), 0);

  let msg = `🚨 *ALERTA DA CENTRAL DE TV · ${companyName.toUpperCase()}*\n`;
  msg += `_Controlo Operacional de Subscrições dos Descodificadores_\n`;
  msg += `📅 *Data:* ${new Date().toLocaleDateString('pt-AO')}\n`;
  msg += `⚠️ *Atenção:* Mensagem interna para membros *Administrativos & Direção* (Não enviar a técnicos)\n\n`;

  if (alerts.expired.length > 0) {
    msg += `❌ *CANAIS EXPIRADOS (Sem sinal na rede do cliente):*\n`;
    alerts.expired.forEach((d) => {
      msg += `• *[Canal ${d.channelNumber}] ${d.channelName}* (${d.provider})\n  Posição na Operadora: ${d.providerPosition || '—'} | Cartão: \`${d.smartcardNumber}\`\n  Valor: ${d.monthlyCost.toLocaleString('pt-AO')} Kz | Expirou em: ${d.subscriptionEndDate}\n`;
    });
    msg += `\n`;
  }

  if (alerts.critical1Day.length > 0) {
    msg += `🔴 *EXPIRA AMANHÃ (1 DIA ANTES - URGENTE):*\n`;
    alerts.critical1Day.forEach((d) => {
      msg += `• *[Canal ${d.channelNumber}] ${d.channelName}* (${d.provider})\n  Posição na Operadora: ${d.providerPosition || '—'} | Cartão: \`${d.smartcardNumber}\`\n  Valor: ${d.monthlyCost.toLocaleString('pt-AO')} Kz | Expira: Amanhã (${d.subscriptionEndDate})\n`;
    });
    msg += `\n`;
  }

  if (alerts.high3Days.length > 0) {
    msg += `🟠 *EXPIRA EM ATÉ 3 DIAS:*\n`;
    alerts.high3Days.forEach((d) => {
      const days = getDaysRemaining(d.subscriptionEndDate);
      msg += `• *[Canal ${d.channelNumber}] ${d.channelName}* (${d.provider})\n  Posição na Operadora: ${d.providerPosition || '—'} | Cartão: \`${d.smartcardNumber}\`\n  Valor: ${d.monthlyCost.toLocaleString('pt-AO')} Kz | Restam: ${days} dia(s)\n`;
    });
    msg += `\n`;
  }

  if (alerts.warning7Days.length > 0) {
    msg += `🟡 *EXPIRA NA PRÓXIMA SEMANA (7 DIAS):*\n`;
    alerts.warning7Days.forEach((d) => {
      const days = getDaysRemaining(d.subscriptionEndDate);
      msg += `• *[Canal ${d.channelNumber}] ${d.channelName}* (${d.provider})\n  Posição na Operadora: ${d.providerPosition || '—'} | Cartão: \`${d.smartcardNumber}\`\n  Valor: ${d.monthlyCost.toLocaleString('pt-AO')} Kz | Restam: ${days} dias\n`;
    });
    msg += `\n`;
  }

  if (alerts.totalAlertsCount === 0) {
    msg += `✅ *Todas as subscrições dos descodificadores estão em dia! Nenhum canal a expirar nos próximos 7 dias.*\n\n`;
  } else {
    msg += `💰 *VALOR TOTAL NECESSÁRIO PARA RECARGAS:* *${totalAmount.toLocaleString('pt-AO')} Kz*\n`;
    msg += `Por favor providenciar o saldo das contas Multicaixa / BAI Direto para evitar corte de sinal aos clientes de TV.\n`;
  }

  msg += `\n📡 _Sistema Integrado Gestão X · OSDEL Tecnologia_`;
  return msg;
}

/**
 * Sincroniza os alertas de expiração com a Central de Notificações Internas do Sistema.
 * Assegura que o targetRole seja 'admin' (técnicos não vêem).
 */
export function syncTvExpiryNotifications(): void {
  try {
    const raw = localStorage.getItem('osdel_system_notifications');
    let notifs: any[] = raw ? JSON.parse(raw) : [];
    const alerts = getDecodersRequiringAlerts();

    // Remove alertas antigos de TV para atualizar com dados frescos
    notifs = notifs.filter((n) => !n.id.startsWith('tv-exp-'));

    // 1. Alertas de 1 dia
    alerts.critical1Day.forEach((d) => {
      notifs.unshift({
        id: `tv-exp-1d-${d.id}`,
        title: `🔴 Cartão TV Expira Amanhã: ${d.channelName}`,
        message: `O descodificador ${d.provider} (${d.smartcardNumber}) do canal ${d.channelName} (Canal ${d.channelNumber}) expira amanhã (${d.subscriptionEndDate}). Recarregue ${d.monthlyCost.toLocaleString('pt-AO')} Kz urgentemente.`,
        type: 'financeiro',
        priority: 'urgente',
        targetRole: 'admin',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/canais-tv',
      });
    });

    // 2. Alertas de 3 dias
    alerts.high3Days.forEach((d) => {
      notifs.unshift({
        id: `tv-exp-3d-${d.id}`,
        title: `🟠 Subscrição TV a Expirar em 3 Dias: ${d.channelName}`,
        message: `Descodificador ${d.provider} (${d.smartcardNumber}) expira a ${d.subscriptionEndDate}. Valor da mensalidade: ${d.monthlyCost.toLocaleString('pt-AO')} Kz.`,
        type: 'financeiro',
        priority: 'alta',
        targetRole: 'admin',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/canais-tv',
      });
    });

    // 3. Alertas de 7 dias
    alerts.warning7Days.forEach((d) => {
      notifs.unshift({
        id: `tv-exp-7d-${d.id}`,
        title: `🟡 Aviso Preventivo (1 Semana): ${d.channelName}`,
        message: `Descodificador ${d.provider} (${d.smartcardNumber}) expira na próxima semana (${d.subscriptionEndDate}).`,
        type: 'financeiro',
        priority: 'normal',
        targetRole: 'admin',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/canais-tv',
      });
    });

    // 4. Canais expirados
    alerts.expired.forEach((d) => {
      notifs.unshift({
        id: `tv-exp-0d-${d.id}`,
        title: `❌ Canal Fora de Serviço (Expirado): ${d.channelName}`,
        message: `O descodificador ${d.provider} (${d.smartcardNumber}) expirou em ${d.subscriptionEndDate}. Canal sem sinal para os clientes de TV.`,
        type: 'financeiro',
        priority: 'urgente',
        targetRole: 'admin',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/canais-tv',
      });
    });

    localStorage.setItem('osdel_system_notifications', JSON.stringify(notifs.slice(0, 50)));
    window.dispatchEvent(new CustomEvent('osdel-notifications-updated', { detail: { count: notifs.filter((n) => !n.read).length } }));
  } catch (err) {
    console.warn('Erro ao sincronizar notificações de TV:', err);
  }
}

// ============================================================================
// INTELIGÊNCIA ARTIFICIAL: TAREFAS AUTOMATIZADAS DA CENTRAL DE TV
// ============================================================================

export interface AiHeadendAuditReport {
  summary: string;
  financialAnalysis: {
    monthlyBudgetKz: number;
    urgentFundingRequiredKz: number;
    zapSharePercent: number;
    canalPlusSharePercent: number;
  };
  risksAndAlerts: {
    criticalChannels: string[];
    potentialRfOverlap: string[];
    unbalancedCategories: string[];
  };
  strategicRecommendations: string[];
  generatedAt: string;
}

/**
 * Motor de IA que audita todos os descodificadores, frequências e custos
 */
export function runAiHeadendAudit(): AiHeadendAuditReport {
  const decoders = getStoredTvDecoders();
  const alerts = getDecodersRequiringAlerts();

  const totalMonthly = decoders
    .filter((d) => !d.isFree && d.provider !== 'Banda Livre' && d.provider !== 'Extravio')
    .reduce((sum, d) => sum + (d.monthlyCost || 0), 0);

  const zapCost = decoders
    .filter((d) => d.provider === 'ZAP')
    .reduce((sum, d) => sum + (d.monthlyCost || 0), 0);

  const canalPlusCost = decoders
    .filter((d) => d.provider === 'Canal+')
    .reduce((sum, d) => sum + (d.monthlyCost || 0), 0);

  const urgentCost = [
    ...alerts.expired,
    ...alerts.critical1Day,
    ...alerts.high3Days,
  ].reduce((sum, d) => sum + (d.monthlyCost || 0), 0);

  const critical = [
    ...alerts.expired.map((d) => `[Expirado] ${d.channelName} (${d.provider}) - Cartão: ${d.smartcardNumber}`),
    ...alerts.critical1Day.map((d) => `[Expira Amanhã] ${d.channelName} (${d.provider}) - Cartão: ${d.smartcardNumber}`),
    ...alerts.high3Days.map((d) => `[Expira em 3d] ${d.channelName} (${d.provider}) - Restam ${getDaysRemaining(d.subscriptionEndDate)}d`),
  ];

  // Análise de categorias
  const catCount: Record<string, number> = {};
  decoders.forEach((d) => {
    catCount[d.category] = (catCount[d.category] || 0) + 1;
  });

  const extravioDecoders = decoders.filter((d) => d.provider === 'Extravio' || d.status === 'extraviado');

  const recommendations: string[] = [];
  if (extravioDecoders.length > 0) {
    recommendations.push(
      `⚠️ Averiguação de Fornecedor Extravio: Detectado(s) ${extravioDecoders.length} descodificador(es) em situação de extravio (${extravioDecoders.map((e) => e.channelName).join(', ')}). Ação: Solicitar bloqueio imediato do cartão inteligente na operadora de origem para evitar encargos indevidos e providenciar aparelho substituto.`,
    );
  }
  if (alerts.expired.length > 0) {
    recommendations.push(
      `Prioridade 1: Recarregar imediatamente os ${alerts.expired.length} canais expirados (${alerts.expired.map((c) => c.channelName).join(', ')}) para restabelecer a transmissão aos clientes.`,
    );
  }
  if (alerts.critical1Day.length > 0) {
    recommendations.push(
      `Providenciar saldo de ${alerts.critical1Day.reduce((s, c) => s + c.monthlyCost, 0).toLocaleString('pt-AO')} Kz até às 17h para recarregar os canais com corte previsto para amanhã.`,
    );
  }
  recommendations.push(
    `Equilíbrio de Grelha: A sua rede possui ${decoders.length} canais distribuídos. Recomendamos manter os 12 aparelhos ZAP com datas de renovação sincronizadas para facilitar a recarga em lote no início do mês.`,
  );
  recommendations.push(
    `Eficiência de Custos: Os canais de Banda Livre (TPA 1, TPA 2, Zimbo, Palanca) geram 0 Kz de custo operacional. Podem ser aproveitados como alternativa estável no caso de falha de sinal via satélite.`,
  );

  return {
    summary: `A Central de TV conta com ${decoders.length} canais na grelha, sendo ${decoders.filter((d) => d.provider === 'ZAP').length} descodificadores ZAP, ${decoders.filter((d) => d.provider === 'Canal+').length} Canal+, ${decoders.filter((d) => d.isFree && d.provider !== 'Extravio').length} Banda Livre e ${extravioDecoders.length} registado(s) no fornecedor Extravio. Existem ${alerts.totalAlertsCount} descodificadores sob monitorização de expiração.`,
    financialAnalysis: {
      monthlyBudgetKz: totalMonthly,
      urgentFundingRequiredKz: urgentCost,
      zapSharePercent: totalMonthly > 0 ? Math.round((zapCost / totalMonthly) * 100) : 0,
      canalPlusSharePercent: totalMonthly > 0 ? Math.round((canalPlusCost / totalMonthly) * 100) : 0,
    },
    risksAndAlerts: {
      criticalChannels: critical,
      potentialRfOverlap: [],
      unbalancedCategories: Object.entries(catCount).map(([cat, count]) => `${cat}: ${count} canal(is)`),
    },
    strategicRecommendations: recommendations,
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };
}

/**
 * Redige comunicado automático aos clientes sobre os canais via IA
 */
export function generateAiCustomerNotice(
  type: 'manutencao' | 'novo_canal' | 'mudanca_posicao' | 'aviso_geral',
  channelName: string,
  extraData?: { ourPosition?: number; date?: string; notes?: string },
  companyName: string = 'OSDEL TECNOLOGIA',
): string {
  const dataHoje = new Date().toLocaleDateString('pt-AO');

  if (type === 'novo_canal') {
    return `🎉 *NOVIDADE NA SUA TV · ${companyName.toUpperCase()}*\n\nEstimados clientes,\nInformamos com satisfação que adicionamos um novo canal à nossa grelha de TV:\n\n📺 *Novo Canal:* ${channelName}\n🔢 *Posição na sua TV:* Canal ${extraData?.ourPosition || 'Especial'}\n📡 *Qualidade:* Alta Definição (HD) e Som Estéreo\n\nNão é necessário qualquer pagamento adicional! Para sintonizar, basta colocar a sua TV no Canal ${extraData?.ourPosition || 'indicado'}.\n\n_Desejamos a todos uma excelente transmissão!_\n*Equipa de Suporte ${companyName}*`;
  }

  if (type === 'mudanca_posicao') {
    return `📢 *ATUALIZAÇÃO DA GRELHA DE CANAIS · ${companyName.toUpperCase()}*\n\nEstimados clientes,\nInformamos que para otimizar a qualidade do sinal da nossa central de TV, o canal *${channelName}* agora está disponível na posição:\n\n🔢 *Nova Posição:* Canal ${extraData?.ourPosition || '56'}\n📅 *A partir de:* ${extraData?.date || dataHoje}\n\nAgradecemos a vossa preferência e compreensão.\n*Suporte Técnico ${companyName}*`;
  }

  if (type === 'manutencao') {
    return `⚠️ *AVISO DE MANUTENÇÃO TÉCNICA · ${companyName.toUpperCase()}*\n\nEstimados moradores e assinantes,\nInformamos que estamos a realizar manutenção preventiva no descodificador e modulador do canal *${channelName}* para estabilizar a recepção de imagem.\n\n⏱️ *Previsão de Conclusão:* Brevemente\n📡 Os restantes canais da grelha continuam a funcionar normalmente.\n\nPedimos desculpas pelo transtorno temporário.\n*Central Técnica ${companyName}*`;
  }

  return `ℹ️ *COMUNICADO OFICIAL · ${companyName.toUpperCase()}*\n\nEstimados clientes,\nInformamos que a transmissão do canal *${channelName}* foi atualizada com sucesso na nossa central comunitária.\n\nDúvidas ou assistência técnica:\n📞 Contacto: (+244) 926 153 736\n\n*${companyName} · TV & Internet Fibra*`;
}
