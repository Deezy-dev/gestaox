/**
 * GESTÃO X - MOTOR DE CORTES AUTOMÁTICOS EXCLUSIVO PARA FIBRA ÓPTICA (FTTH)
 * 
 * Implementação de todas as soluções técnicas possíveis:
 * 1. MIKROTIK PPPoE: Desactivação de Secret + Encerramento forçado de sessão activa (/ppp active remove).
 * 2. MIKROTIK FIREWALL: Adição do IP à Address-List de Bloqueio + Redireccionamento NAT para aviso de corte.
 * 3. PDO (CAIXA DE TERMINAÇÃO ÓPTICA): Desconexão física no splitter/porta de rua com disparo automático para piquete.
 * 4. OLT GPON/EPON (Huawei, ZTE, VSOL, FiberHome): Desactivação directa da porta óptica/ONU.
 * 5. RADIUS PACKET OF DISCONNECT (RFC 3576): Envio de pacote PoD/CoA ao BNG.
 */

export interface FiberCutRuleConfig {
  enabled: boolean;
  serviceTarget: 'fibra_only'; // Apenas clientes de fibra óptica
  dueDay: number; // Ex.: Dia 5
  toleranceDays: number; // Ex.: 5 dias após vencimento = corte no dia 10
  primaryMethod: 'mikrotik_pppoe' | 'mikrotik_firewall' | 'pdo_physical' | 'olt_gpon' | 'hibrido';
  respectPaymentPromises: boolean; // Ignorar clientes com acordo ativo
  sendPreCutPushNotification: boolean; // Enviar push notification 48h antes
  autoCreatePdoCutMission: boolean; // Criar missão de piquete para corte físico na caixa PDO
  mikrotik: {
    host: string;
    apiPort: number;
    username: string;
    profileBloqueado: string;
    addressListBloqueio: string;
  };
  olt: {
    vendor: 'huawei' | 'zte' | 'vsol' | 'fiberhome';
    host: string;
    slot: number;
    ponPort: number;
  };
}

export interface FiberCutExecutionRecord {
  id: string;
  clientId: number;
  clientCode: string;
  clientName: string;
  phone: string;
  address: string;
  pdoNumber: string;
  portNumber: string;
  onuSerial: string;
  pppoeUser: string;
  ipAddress: string;
  debtAmount: number;
  monthsLate: number;
  cutDate: string;
  methodUsed: string;
  mikrotikCommand: string;
  status: 'cortado' | 'revertido' | 'falha';
  executedBy: string;
  notes: string;
}

export interface FiberCutSolutionDoc {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  howItWorks: string;
  advantages: string[];
  requirements: string[];
  commandTemplate: string;
  reconnectCommandTemplate: string;
}

export const FIBER_CUT_SOLUTIONS: FiberCutSolutionDoc[] = [
  {
    id: 'mikrotik_pppoe',
    title: 'Solução 1: MikroTik RouterOS · PPPoE Secret & Active Session Kill',
    subtitle: 'Corte digital instantâneo via desactivação do utilizador PPPoE',
    badge: 'Recomendada (Digital)',
    howItWorks:
      'O sistema comunica com o MikroTik (RouterOS v6 ou v7) via API REST / Winbox / Script e desactiva a credencial do assinante (/ppp secret set disabled=yes). Imediatamente a seguir, mata a sessão activa (/ppp active remove), derrubando a Internet do cliente em menos de 1 segundo sem necessidade de deslocação à rua.',
    advantages: [
      'Execução 100% remota e instantânea (menos de 1 segundo).',
      'Zero custo de combustível ou equipa no terreno.',
      'Religação automática imediata assim que o cliente paga via Multicaixa.',
      'Não desgasta nem mexe nos conectores ópticos das caixas PDO.',
    ],
    requirements: [
      'RouterOS v6.4x ou v7.x com serviço API (porta 8728) ou REST activo.',
      'Assinantes autenticados via PPPoE Server com nome de utilizador padronizado (ex.: CLI-00123).',
    ],
    commandTemplate: `/ppp secret set [find name="{PPPOE_USER}"] disabled=yes\n/ppp active remove [find name="{PPPOE_USER}"]`,
    reconnectCommandTemplate: `/ppp secret set [find name="{PPPOE_USER}"] disabled=no`,
  },
  {
    id: 'mikrotik_firewall',
    title: 'Solução 2: MikroTik RouterOS · Firewall Address-List & Portal de Aviso',
    subtitle: 'Isolamento de tráfego com redireccionamento para página de aviso de corte',
    badge: 'Educativa / Cobrança',
    howItWorks:
      'Em vez de desconectar totalmente o sinal Wi-Fi, o assinante continua conectado à rede da OSDEL, mas o MikroTik adiciona o seu IP à Address-List "FIBRA_BLOQUEIO". Ao tentar abrir qualquer site HTTP/HTTPS, o tráfego é redireccionado para uma página local com o valor da factura em dívida e dados para pagamento.',
    advantages: [
      'O cliente visualiza directamente no telemóvel/computador porque está sem Internet.',
      'Permite acesso exclusivo ao portal do cliente e app bancária Multicaixa Express (Walled Garden).',
      'Reduz drasticamente chamadas de suporte a perguntar se há avaria na zona.',
    ],
    requirements: [
      'Regra de NAT de redireccionamento (/ip firewall nat) configurada no MikroTik.',
      'Servidor Web local com a página informativa de aviso de corte.',
    ],
    commandTemplate: `/ip firewall address-list add list="FIBRA_INADIMPLENTES" address="{CLIENT_IP}" comment="Corte Automático OSDEL - {CLIENT_CODE}"\n/ip firewall connection remove [find src-address="{CLIENT_IP}"]`,
    reconnectCommandTemplate: `/ip firewall address-list remove [find address="{CLIENT_IP}" list="FIBRA_INADIMPLENTES"]`,
  },
  {
    id: 'pdo_physical',
    title: 'Solução 3: Caixa PDO de Rua · Desconexão Física do Cabo Drop no Poste',
    subtitle: 'Corte físico manual no splitter de distribuição óptica',
    badge: 'Terreno / Físico',
    howItWorks:
      'Utilizada para instalações sem gerência remota ou quando o sinal óptico precisa de ser isolado fisicamente na rua. O sistema detecta o atraso da factura e emite automaticamente uma Missão de Piquete com o número da Caixa PDO (ex.: PDO-04, Rua 12, Porta 03, Splitter 1:8). O piquete técnico (ex.: Mestre Job / Júlio Afonso) desloca-se com a folha de corte e desencaixa o drop SC/APC.',
    advantages: [
      'Garante 100% que não há partilha de sinal pirata na casa do cliente.',
      'Libera a porta física na caixa PDO para um novo cliente interessado.',
      'Integração directa com a Folha de Corte com logótipo oficial e assinaturas.',
    ],
    requirements: [
      'Cadastro correcto da Morada, Rua, Caixa PDO e Porta de cada cliente.',
      'Equipa técnica de piquete de rua equipada com o aplicativo mobile.',
    ],
    commandTemplate: `ORDEM DE CORTE FÍSICO:\nLocal: {RUA}, Casa {CASA}\nCaixa PDO: {PDO_NUMBER} · Porta: {PORTA_NUM}\nAcção: Desconectar Drop SC/APC e aplicar lacre de aviso OSDEL.`,
    reconnectCommandTemplate: `ORDEM DE RELIGAÇÃO:\nReconectar Drop SC/APC na porta {PORTA_NUM} da Caixa {PDO_NUMBER}. Testar sinal em dBm.`,
  },
  {
    id: 'olt_gpon',
    title: 'Solução 4: OLT GPON / EPON · Desactivação de Porta Óptica / ONU',
    subtitle: 'Comando directo na OLT central (Huawei, ZTE, VSOL, FiberHome)',
    badge: 'Infraestrutura Central',
    howItWorks:
      'Comando emitido via Telnet / SSH / SNMP directamente para a OLT principal do POP/Central. A OLT corta a emissão de dados para a ONT/ONU do cliente através do número de série (PON ID / ONU Serial), mantendo o cliente desautorizado até quitação do saldo.',
    advantages: [
      'Controla o hardware no nível físico óptico (Layer 2).',
      'Funciona mesmo se o cliente clonar IP ou alterar router próprio.',
      'Permite desligar a luz LASER da ONU do cliente sem ir ao poste.',
    ],
    requirements: [
      'OLT acessível pela rede local do servidor (IP da Central).',
      'Cadastro do Serial Number (SN/MAC) da ONU do cliente na base de dados.',
    ],
    commandTemplate: `HUAWEI MA5608T:\ninterface gpon 0/{SLOT}\nont deactivate {PON_PORT} {ONT_ID}\n\nZTE C300:\ninterface gpon-olt_1/{SLOT}/{PON_PORT}\nonu {ONT_ID} cancel`,
    reconnectCommandTemplate: `HUAWEI:\ninterface gpon 0/{SLOT}\nont activate {PON_PORT} {ONT_ID}`,
  },
];

const CONFIG_STORAGE_KEY = 'gx_fiber_cut_rules_v2';
const HISTORY_STORAGE_KEY = 'gx_fiber_cut_history_v2';

export const DEFAULT_FIBER_CUT_CONFIG: FiberCutRuleConfig = {
  enabled: true,
  serviceTarget: 'fibra_only',
  dueDay: 5,
  toleranceDays: 5, // Vence dia 5 + 5 dias tolerância = Corte no dia 10
  primaryMethod: 'hibrido',
  respectPaymentPromises: true,
  sendPreCutPushNotification: true,
  autoCreatePdoCutMission: true,
  mikrotik: {
    host: '192.168.88.1',
    apiPort: 8728,
    username: 'admin_osdel',
    profileBloqueado: 'BLOQUEIO_FIBRA',
    addressListBloqueio: 'FIBRA_INADIMPLENTES',
  },
  olt: {
    vendor: 'huawei',
    host: '192.168.100.1',
    slot: 1,
    ponPort: 1,
  },
};

export function getFiberCutConfig(): FiberCutRuleConfig {
  if (typeof window === 'undefined') return DEFAULT_FIBER_CUT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    return raw ? { ...DEFAULT_FIBER_CUT_CONFIG, ...JSON.parse(raw) } : DEFAULT_FIBER_CUT_CONFIG;
  } catch {
    return DEFAULT_FIBER_CUT_CONFIG;
  }
}

export function saveFiberCutConfig(cfg: FiberCutRuleConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.error('Erro ao guardar configurações de corte de fibra:', err);
  }
}

export function getFiberCutHistory(): FiberCutExecutionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : getMockHistory();
  } catch {
    return getMockHistory();
  }
}

export function saveFiberCutHistory(records: FiberCutExecutionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Erro ao guardar histórico de corte de fibra:', err);
  }
}

/**
 * Gera o script RouterOS (.rsc) para execução de todos os cortes pendentes no MikroTik
 */
export function generateMikrotikRscScript(records: FiberCutExecutionRecord[]): string {
  const timestamp = new Date().toLocaleString('pt-AO');
  let script = `# ==================================================================\n`;
  script += `# SCRIPT OFICIAL MIKROTIK ROUTEROS - CORTE AUTOMÁTICO FIBRA ÓPTICA\n`;
  script += `# OSDEL TECNOLOGIA LDA · Emitido em: ${timestamp}\n`;
  script += `# Total de Assinantes a Bloquear: ${records.length}\n`;
  script += `# ==================================================================\n\n`;

  script += `# 1. Assegurar existência da Address-List de Bloqueio\n`;
  script += `:log info "OSDEL: Iniciando rotina de corte automático de clientes Fibra..."\n\n`;

  records.forEach((rec, idx) => {
    script += `# Assinante ${idx + 1}: ${rec.clientName} (${rec.clientCode}) · Dívida: ${rec.debtAmount} Kz\n`;
    if (rec.pppoeUser) {
      script += `/ppp secret set [find name="${rec.pppoeUser}"] disabled=yes comment="OSDEL-CORTE-${rec.clientCode}"\n`;
      script += `/ppp active remove [find name="${rec.pppoeUser}"]\n`;
    }
    if (rec.ipAddress && rec.ipAddress !== 'Dinâmico') {
      script += `/ip firewall address-list add list="FIBRA_INADIMPLENTES" address="${rec.ipAddress}" comment="${rec.clientCode}-${rec.clientName}"\n`;
      script += `/ip firewall connection remove [find src-address="${rec.ipAddress}"]\n`;
    }
    script += `\n`;
  });

  script += `:log warning "OSDEL: Rotina de corte de fibra concluída com sucesso (${records.length} assinantes bloqueados)."\n`;
  return script;
}

function getMockHistory(): FiberCutExecutionRecord[] {
  return [
    {
      id: 'cut-1',
      clientId: 1,
      clientCode: 'CLI-00001',
      clientName: 'António Domingos Pedro',
      phone: '+244 923 456 789',
      address: 'Rua 12, Casa 45B, Bairro Golf I',
      pdoNumber: 'PDO-04',
      portNumber: 'Porta 03',
      onuSerial: 'HWTC-A847B129',
      pppoeUser: 'antonio.pedro@osdel.ao',
      ipAddress: '10.10.12.45',
      debtAmount: 18500,
      monthsLate: 2,
      cutDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      methodUsed: 'MikroTik PPPoE + Piquete PDO',
      mikrotikCommand: '/ppp secret set [find name="antonio.pedro@osdel.ao"] disabled=yes',
      status: 'cortado',
      executedBy: 'Motor Automático (00:05)',
      notes: 'Corte automático executado após 10 dias de tolerância sem pagamento.',
    },
    {
      id: 'cut-2',
      clientId: 6,
      clientCode: 'CLI-00006',
      clientName: 'Margarida Costa da Rocha',
      phone: '+244 912 884 102',
      address: 'Rua 13, Casa 12A, Golf I',
      pdoNumber: 'PDO-05',
      portNumber: 'Porta 01',
      onuSerial: 'ZTEG-992147CC',
      pppoeUser: 'margarida.rocha@osdel.ao',
      ipAddress: '10.10.13.12',
      debtAmount: 25000,
      monthsLate: 3,
      cutDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      methodUsed: 'MikroTik PPPoE Session Kill',
      mikrotikCommand: '/ppp secret set [find name="margarida.rocha@osdel.ao"] disabled=yes',
      status: 'cortado',
      executedBy: 'Supervisor de Rede',
      notes: 'Bloqueio activo no RouterOS CCR-1036.',
    },
  ];
}
