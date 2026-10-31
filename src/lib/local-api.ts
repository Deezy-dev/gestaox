import { useMutation, useQuery } from '@tanstack/react-query';
import { enqueueSyncMutation } from '@/lib/offline-sync';
import { pushActivityDirectToCloud } from '@/lib/online-first-sync';
import { addSystemNotification } from '@/lib/notifications';
import { isSuperAdmin } from '@/lib/permissions';
import {
  idbSet,
  idbGet,
  idbDelete,
  idbClear,
  migrateLocalStorageToIndexedDB,
  loadAllFromIndexedDB,
  getStorageEstimate,
  ALL_COLLECTION_KEYS,
} from '@/lib/indexeddb-storage';

export {
  idbSet,
  idbGet,
  idbDelete,
  idbClear,
  migrateLocalStorageToIndexedDB,
  loadAllFromIndexedDB,
  getStorageEstimate,
  ALL_COLLECTION_KEYS,
};

export type AnyRecord = Record<string, any>;

export function syncMutationToCloud(mutation: {
  module: 'clientes' | 'pagamentos' | 'ordens' | 'inventario' | 'despesas' | 'fecho' | 'configuracoes' | 'mensagens';
  action: 'create' | 'update' | 'delete' | 'sync';
  entity: string;
  description: string;
  payload: any;
}) {
  try {
    enqueueSyncMutation(mutation);
    pushActivityDirectToCloud(mutation).catch(() => {});
  } catch {}
}

// Base de dados de PRODUÇÃO LIMPA (0 clientes, 0 pagamentos, 0 faturas de teste)
const seedClients: AnyRecord[] = [];
const seedPayments: AnyRecord[] = [];
const seedContracts: AnyRecord[] = [];

export const DEFAULT_CONTRACT_CLAUSES = [
  {
    id: 'cl-1',
    title: 'Adesão e Documentação',
    text: 'Para aderir ao serviço é necessária a cópia do bilhete de identidade e a presença de um representante da família maior de 18 anos.',
  },
  {
    id: 'cl-2',
    title: 'Custo e instalação',
    text: 'A instalação tem o custo de {VALOR_INSTALACAO}. A OSDEL disponibiliza {METROS_CABO} metros de cabo RG6/Drop de fibra; cada metro adicional custa {PRECO_METRO_EXTRA}.',
  },
  {
    id: 'cl-3',
    title: 'Prazo de instalação',
    text: 'A instalação será realizada até {HORAS_INSTALACAO} horas após a assinatura. O serviço urgente tem o custo adicional de {TAXA_URGENCIA}.',
  },
  {
    id: 'cl-4',
    title: 'Mensalidade e Vencimento',
    text: 'A mensalidade é pré-paga e tem o valor de {MENSALIDADE}. O pagamento decorre do dia 01 ao dia {DIA_VENCIMENTO} de cada mês.',
  },
  {
    id: 'cl-5',
    title: 'Multa e suspensão',
    text: 'Após o prazo aplica-se uma multa de {MULTA_ATRASO}. Com {MESES_SUSPENSAO} meses sem pagamento, o serviço é suspenso e exige renovação contratual no valor de {TAXA_RENOVACAO}.',
  },
  {
    id: 'cl-6',
    title: 'Regras de utilização e Exclusividade',
    text: 'O contrato corresponde a uma única residência. É proibida a partilha ou revenda do sinal com outra residência. Derivações internas para a mesma residência estão sujeitas à taxa definida pela empresa.',
  },
  {
    id: 'cl-7',
    title: 'Suporte e Horário de Atendimento',
    text: '{HORARIO_SUPORTE}',
  },
  {
    id: 'cl-8',
    title: 'Rescisão e Devolução de Equipamentos',
    text: 'A rescisão do contrato pode ser solicitada pelo assinante com aviso prévio de 15 dias. Quaisquer equipamentos da OSDEL (modem ONU, fontes de alimentação, decodificadores) cedidos em comodato deverão ser devolvidos em perfeitas condições.',
  },
];

const seedSettings: AnyRecord = {
  companyName: 'OSDEL TECNOLOGIA',
  companyNif: '5600857127',
  companyPhone: '926 153 736 / 992 854 740',
  companyPhone2: '926 153 736',
  companySupportPhone: '992 854 740',
  companyWhatsApp: '+244 926 153 736',
  companyEmail: 'comercial@osdeltecnologia.ao',
  companyWebsite: 'www.osdeltecnologia.ao',
  companyAddress: 'Rua 12, Bairro Golf I, Kilamba Kiaxi, Luanda',
  companySubtitle: 'TV COMUNITÁRIA · INTERNET FIBRA',
  currency: 'Kz',
  defaultMonthlyPrice: 4000,
  tvMonthlyPrice: 4000,
  tvExtraPrice: 1000,
  connectionFee: 15000,
  cableIncludedMeters: 25,
  extraMeterPrice: 250,
  paymentDueDay: 5,
  latePenalty: 1000,
  toleranceDays: 3,
  suspensionAfterMonths: 3,
  renewalFee: 10000,
  transferFee: 3000,
  reconnectionFee: 2500,
  derivationFee: 7000,
  dailyGuarantee: 150,
  urgentInstallationFee: 2000,
  installationWindowHours: 48,
  serviceRecoveryHours: 72,
  supportHours: 'Segunda a sexta, 09h00–15h00 · Sábado, 08h00–11h00',
  // Bank accounts
  bank1Name: 'Banco BAI',
  bank1Holder: 'OSDEL TECNOLOGIA LDA',
  bank1Iban: 'AO06.0040.0000.1234.5678.9012.3',
  bank1Account: '1234567810',
  bank2Name: 'Banco BFA',
  bank2Holder: 'OSDEL TECNOLOGIA LDA',
  bank2Iban: 'AO06.0006.0000.9876.5432.1098.7',
  bank2Account: '9876543210',
  // Invoice & Documents
  invoicePrefix: 'FT',
  receiptPrefix: 'FR',
  proformaPrefix: 'FP',
  contractPrefix: 'CT',
  invoiceTitle: 'Factura / Recibo',
  invoiceProformaTitle: 'Factura Proforma',
  invoiceVoidTitle: 'Factura Anulada',
  invoiceSubtitle: 'TV COMUNITÁRIA · INTERNET FIBRA ÓPTICA',
  invoiceDefaultItemDescription: 'Mensalidade de Serviço OSDEL ({MES_REFERENCIA})',
  invoiceDefaultItemNotes: 'Fornecimento de sinal de TV / Internet Fibra nos termos acordados.',
  invoiceTaxExemptionReason: 'Regime de Exclusão do IVA nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA).',
  invoiceFooter: 'Documento emitido pelo sistema de gestão da OSDEL TECNOLOGIA. Processado por computador. Válido com carimbo oficial.',
  invoiceBankingNotes: 'Por favor, indique o número da factura ou código do assinante no descritivo da transferência bancária.',
  invoiceStampTitle: 'OSDEL TECNOLOGIA',
  invoiceStampSubtitle: 'Carimbo & Chancela Digital',
  invoiceStampBadge: 'AUTENTICADO',
  thermalFooterMessage: 'Obrigado pela sua preferência!\nGuarde este talão como comprovativo de pagamento e garantia de sinal.',
  thermalWarningText: 'Atrasos superiores a 5 dias implicam suspensão imediata de sinal e cobrança de taxa de religação.',
  taxRetentionRate: 0,
  taxExemptionReason: 'Isento nos termos do Art. 12 do CIVA - Regime de Exclusão',
  termsAndConditions: 'Garantia técnica de 30 dias na instalação. O atraso no pagamento após o dia 5 acarreta multa contratual de 1.000 Kz.',
  contractTitle: 'Termos de adesão de contrato',
  contractIntro: 'A TV comunitária e Internet fibra Osdel é uma rede voltada à comunidade, com informação, entretenimento, actualidade e conectividade de alta velocidade.',
  contractAcceptanceText: 'Ao assinar, as partes confirmam que leram e aceitam as condições abaixo:',
  contractClosingText: 'E por estarem de pleno acordo com os termos do contrato, as partes assinam o presente instrumento em duas vias de igual teor e valor.',
  contractClauses: DEFAULT_CONTRACT_CLAUSES,
  invoiceTemplate: 'recibo-pagamento',
  contractTemplate: 'termos-adesao-osdel',
  // Messaging & Automation
  smsEnabled: true,
  smsProvider: 'BulkSMS Angola / Unitel API',
  smsApiUrl: 'https://api.bulksmsangola.ao/v2/messages',
  smsSender: 'OSDEL',
  automaticReminderEnabled: true,
  reminderDaysBeforeDue: 2,
  whatsappEnabled: true,
  whatsappGateway: 'https://api.whatsapp.com/send',
  logoUrl: '/osdel-logo.jpg',
  internetPlans: [
    { id: 'fibra-10', name: 'Fibra 10', speed: '10 Mbps/s', price: 6500 },
    { id: 'fibra-22', name: 'Fibra 22', speed: '22 Mbps/s', price: 8500 },
    { id: 'fibra-50', name: 'Fibra 50', speed: '50 Mbps/s', price: 12000 },
    { id: 'fibra-100', name: 'Fibra 100', speed: '100 Mbps/s', price: 20000 },
  ],
  // Pacotes de TV por Cabo Comunitária
  tvPackages: [
    { id: 'tv-basico', name: 'Pacote Básico Comunitário', channelsCount: 35, price: 4000, maxTvs: 1, description: 'Sinal digital RF com canais essenciais (TPA, Zap Viva, Record, SIC, Globo, Desporto).', active: true },
    { id: 'tv-familia', name: 'Pacote Família Digital', channelsCount: 60, price: 6500, maxTvs: 2, description: 'Canais infantis, novelas, filmes e entretenimento para até 2 televisores.', active: true },
    { id: 'tv-premium', name: 'Pacote Premium Desporto & Filmes', channelsCount: 90, price: 9500, maxTvs: 2, description: 'Transmissões desportivas ao vivo (Girabola, Premier League, UEFA), cinema e séries HD.', active: true },
    { id: 'tv-comercial', name: 'Pacote Comercial / Estabelecimentos', channelsCount: 50, price: 15000, maxTvs: 4, description: 'Licença pública para bares, restaurantes e estabelecimentos comerciais.', active: true },
  ],
  // Bairros e Zonas de Cobertura
  coverageNeighborhoods: [
    { id: 'bairro-1', name: 'Golf I', sector: 'Sector Central & Rua 12', pdosCount: 24, status: 'ativo', notes: 'Sede e centro de transmissão principal' },
    { id: 'bairro-2', name: 'Golf II', sector: 'Zonas A, B e C', pdosCount: 18, status: 'ativo', notes: 'Alta densidade de clientes fibra e TV' },
    { id: 'bairro-3', name: 'Palanca', sector: 'Palanca 1 & 2', pdosCount: 16, status: 'ativo', notes: 'Backbone interligado via anel óptico' },
    { id: 'bairro-4', name: 'Kilamba Kiaxi', sector: 'Sede Municipal', pdosCount: 30, status: 'ativo', notes: 'Infraestrutura com OLT redundante' },
    { id: 'bairro-5', name: 'Sapú', sector: 'Sapú 1 & 2', pdosCount: 12, status: 'ativo', notes: 'Expansão recente de rede primária' },
    { id: 'bairro-6', name: 'Rocha Pinto', sector: 'Encosta & Parte Alta', pdosCount: 14, status: 'ativo', notes: 'Rede mista coaxial e fibra FTTH' },
    { id: 'bairro-7', name: 'Vila Estoril', sector: 'Projecto Novo', pdosCount: 8, status: 'expansao', notes: 'Lançamento de cabos de 48 FO em curso' },
  ],
  // Parâmetros de Rede & FTTH
  oltIp: '10.200.0.1',
  oltModel: 'Huawei SmartAX EA5800 / ZTE C320 GPON',
  oltUplinkSpeed: '10 Gbps SFP+',
  routerOsIp: '10.200.0.254',
  routerOsApiPort: 8728,
  dnsPrimary: '1.1.1.1',
  dnsSecondary: '8.8.8.8',
  dnsSecondaryAlternative: '208.67.222.222',
  pppoePoolRange: '100.64.10.1 - 100.64.13.254',
  publicIpPool: '102.164.x.0/28 (IP Transit Angola Cables)',
  onuManagementSubnet: '192.168.100.0/24',
  opticalIdealPowerRx: '-19 dBm',
  opticalMinPowerRx: '-25 dBm',
  opticalCriticalPowerRx: '-27 dBm',
  rfInitialFrequencyMhz: 306,
  rfModulation: 'DVB-C 256-QAM',
  rfTargetPowerDbuv: '65 - 75 dBuV',
  clientCodePrefix: 'CLI-',
  onuPrefix: 'ONU-',
  pdoPrefix: 'PDO-',
  // Políticas de Acordos e Fidelização
  maxInstallments: 4,
  minInitialPaymentPercentage: 30,
  provisionalReconnectionAllowed: true,
  autoCancelGraceDays: 3,
  semiannualDiscountPercentage: 5,
  annualDiscountPercentage: 10,
  neighborReferralDiscountKz: 1000,
  // Equipa de Campo & Piquete
  installationAllowanceKz: 2500,
  recoveryBonusKz: 1000,
  maxDailyOrdersPerTeam: 6,
  fieldWarrantyDays: 30,
  emergencyResponseHours: 2,
  dailyToolInspectionRequired: true,
  // Modelos de Mensagens
  templateReminderBefore: 'Olá {cliente}, lembramos que a mensalidade do seu serviço OSDEL vence dia {vencimento} no valor de {valor}. Pague por Multicaixa Express ou no nosso balcão para evitar interrupções.',
  templateDueToday: 'OSDEL: A sua mensalidade de {valor} vence hoje ({vencimento}). Referência de pagamento: {referencia}. IBAN BAI: {iban}. Obrigado pela preferência!',
  templateCutWarning: 'Aviso OSDEL: O prazo de tolerância expirou. Evite o corte do sinal e a taxa de religação liquidando hoje o valor de {valor}. Apoio: 926 153 736.',
  templatePaymentConfirmation: 'OSDEL: Confirmamos a recepção do seu pagamento de {valor} referente a {mes}. O seu sinal encontra-se regularizado. Recibo n.º {recibo}.',
  templateWelcome: 'Bem-vindo à OSDEL Tecnologia, {cliente}! A sua adesão ao serviço ({plano}) foi concluída com sucesso. Apoio técnico: 926 153 736.',
  // Fiscalidade AGT
  agtCertificateNumber: 'AGT-CERT/2024/0981',
  agtSoftwareVersion: 'OSDEL v2.4-AO',
  fiscalSeries: '2026/A',
  withholdingTaxRate: 6.5,
  ivaExemptionReason: 'Regime de Exclusão nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA).',
  // Segurança & Sessão
  sessionTimeoutMinutes: 60,
  minPasswordLength: 6,
  requireAdminPasswordForDeletions: true,
  maintenanceMode: false,
  maxFailedLogins: 5,
  auditRetentionDays: 365,
};

export interface JobRole {
  id: number;
  title: string;
  department: 'Técnico' | 'Atendimento' | 'TI / NOC' | 'Administração' | 'Direcção' | 'Logística';
  baseSalaryMin: number;
  baseSalaryMax: number;
  permissionLevel: 'admin' | 'operador' | 'tecnico' | 'leitura';
  description: string;
  isCustom?: boolean;
}

export interface CashClosure {
  id: number;
  closureCode?: string;
  code?: string;
  date: string;
  periodType?: 'diario' | 'semanal' | 'mensal';
  shiftName?: string;
  shift?: string;
  openedAt?: string;
  closedAt?: string;
  operator: string;
  operatorName?: string;
  initialCashAmount?: number;
  openingCash?: number;
  physicalCashCounted?: number;
  countedCash?: number;
  expectedCash?: number;
  difference?: number;
  status: 'pendente_validacao' | 'validado_admin' | 'rejeitado' | 'validado' | 'pendente';
  validatedBy?: string;
  validatedAt?: string;
  notes?: string;
  adminNotes?: string;
  breakdowns?: {
    cash?: number;
    multicaixaTpa?: number;
    mcxExpress?: number;
    transferBai?: number;
    transferBfa?: number;
  };
  banknotesBreakdown?: Record<string, number>;
  totalIn?: number;
  totalOut?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  cashIn?: number;
  tpaIn?: number;
  expressIn?: number;
  transferIn?: number;
  withdrawals?: number;
  [key: string]: any;
}

const seedJobRoles: JobRole[] = [
  {
    id: 1,
    title: 'Mestre de Rede (Técnico Sénior)',
    department: 'Técnico',
    permissionLevel: 'tecnico',
    baseSalaryMin: 180000,
    baseSalaryMax: 260000,
    description: 'Líder técnico de infraestrutura, fusão de fibra óptica, alinhamento de troncal e coordenação de piquetes.',
  },
  {
    id: 2,
    title: 'Técnico Instalador Fibra & TV',
    department: 'Técnico',
    permissionLevel: 'tecnico',
    baseSalaryMin: 120000,
    baseSalaryMax: 170000,
    description: 'Lançamento de cabos drop, conectorização óptica/coaxial, instalação de ONUs e derivações nas casas.',
  },
  {
    id: 3,
    title: 'Ajudante do Mestre (Aprendiz)',
    department: 'Técnico',
    permissionLevel: 'tecnico',
    baseSalaryMin: 70000,
    baseSalaryMax: 100000,
    description: 'Auxiliar nas instalações de rua, apoio em escadas, manuseio de ferramentas e puxamento de cabos.',
  },
  {
    id: 4,
    title: 'Secretária & Operadora de Atendimento',
    department: 'Atendimento',
    permissionLevel: 'operador',
    baseSalaryMin: 110000,
    baseSalaryMax: 160000,
    description: 'Atendimento ao público, cobranças, emissão de faturas e recibos, fecho de caixa e agendamento de OS.',
  },
  {
    id: 5,
    title: 'Secretária Administrativa & Contratos',
    department: 'Administração',
    permissionLevel: 'operador',
    baseSalaryMin: 130000,
    baseSalaryMax: 180000,
    description: 'Elaboração e arquivo de contratos, gestão documental, apoio financeiro e relacionamento com fornecedores.',
  },
  {
    id: 6,
    title: 'Recepcionista',
    department: 'Atendimento',
    permissionLevel: 'operador',
    baseSalaryMin: 85000,
    baseSalaryMax: 115000,
    description: 'Recepção de clientes no balcão, triagem de pedidos, esclarecimento de dúvidas e encaminhamento de chamadas.',
  },
  {
    id: 7,
    title: 'Informático - Programador Júnior',
    department: 'TI / NOC',
    permissionLevel: 'operador',
    baseSalaryMin: 150000,
    baseSalaryMax: 220000,
    description: 'Manutenção do sistema web, testes de conectividade, suporte a computadores e impressoras da empresa.',
  },
  {
    id: 8,
    title: 'Informático - Programador Fullstack',
    department: 'TI / NOC',
    permissionLevel: 'admin',
    baseSalaryMin: 280000,
    baseSalaryMax: 450000,
    description: 'Desenvolvimento das aplicações OSDEL, backend, integrações de APIs bancárias e preparação do app mobile.',
  },
  {
    id: 9,
    title: 'Informático - Engenheiro Sénior / NOC',
    department: 'TI / NOC',
    permissionLevel: 'admin',
    baseSalaryMin: 400000,
    baseSalaryMax: 650000,
    description: 'Gestão de servidores centrais, OLT Huawei GPON, roteadores MikroTik Core, rotas BGP e monitorização de tráfego.',
  },
  {
    id: 10,
    title: 'Administrador de Sistemas & Redes',
    department: 'TI / NOC',
    permissionLevel: 'admin',
    baseSalaryMin: 320000,
    baseSalaryMax: 500000,
    description: 'Supervisão da infraestrutura informática, políticas de segurança, gestão de utilizadores e cópias de segurança.',
  },
  {
    id: 11,
    title: 'Gerente Operacional',
    department: 'Direcção',
    permissionLevel: 'admin',
    baseSalaryMin: 350000,
    baseSalaryMax: 550000,
    description: 'Coordenação operacional geral, supervisão de campo, controlo de compras e cumprimento de SLAs.',
  },
  {
    id: 12,
    title: 'Director Geral',
    department: 'Direcção',
    permissionLevel: 'admin',
    baseSalaryMin: 600000,
    baseSalaryMax: 1200000,
    description: 'Direcção executiva, liderança corporativa, estratégia de expansão e representação legal da OSDEL Tecnologia.',
  },
];

const seedUsers: AnyRecord[] = [
  {
    id: 1,
    username: 'deezy',
    name: 'Albert Mbuyi (Deezy)',
    role: 'superadmin',
    pin: '9999',
    password: '52863400#',
    active: true,
    jobTitle: 'Director Geral & Super Admin Supremo',
    department: 'Direcção Geral Executiva',
    phone: '926 153 736',
    whatsapp: '926 153 736',
    email: 'deezy@osdeltecnologia.ao',
    admissionDate: '2021-02-01',
    contractType: 'Efectivo',
    workStatus: 'disponivel',
    currentTask: 'Supervisão Geral de Produção, Servidores e Operações',
  },
];

const seedCashClosures: AnyRecord[] = [];

const seedInvoices: AnyRecord[] = [];

const seedAuditLogs: AnyRecord[] = [
  {
    id: 1,
    action: 'INICIALIZACAO_PRODUCAO',
    module: 'Sistema',
    description: 'Sistema OSDEL Tecnologia pronto para operação em produção oficial.',
    user: 'deezy',
    targetId: 'SYS-001',
    timestamp: new Date().toISOString(),
    details: 'Contas zeradas e dados de demonstração removidos.',
  },
];

const seedFinancialAccounts: AnyRecord[] = [
  {
    id: 'acc-caixa',
    name: 'Caixa Geral (Balcão Golf)',
    code: 'CX-01',
    type: 'caixa',
    initialBalance: 0,
    currency: 'AOA',
    color: 'emerald',
    manager: 'deezy (Tesouraria)',
    status: 'active',
    description: 'Caixa físico da loja de atendimento ao público no Golf II para pagamentos a pronto.',
  },
  {
    id: 'acc-bai',
    name: 'Banco BAI (Arrecadação Principal)',
    code: 'BCO-BAI',
    type: 'banco',
    bankName: 'Banco Angolano de Investimentos (BAI)',
    accountNumber: '1234567810',
    iban: 'AO06.0040.0000.1234.5678.9012.3',
    initialBalance: 0,
    currency: 'AOA',
    color: 'blue',
    manager: 'Administração OSDEL',
    status: 'active',
    description: 'Conta principal para recebimentos de mensalidades e depósitos de receita diária.',
  },
  {
    id: 'acc-bfa',
    name: 'Banco BFA (Operações & Fornecedores)',
    code: 'BCO-BFA',
    type: 'banco',
    bankName: 'Banco de Fomento Angola (BFA)',
    accountNumber: '9876543210',
    iban: 'AO06.0006.0000.9876.5432.1098.7',
    initialBalance: 0,
    currency: 'AOA',
    color: 'amber',
    manager: 'Administração OSDEL',
    status: 'active',
    description: 'Conta para liquidação de fornecedores de fibra, energia e encargos fiscais.',
  },
  {
    id: 'acc-tpa',
    name: 'Terminal Multicaixa Express (TPA / EMIS)',
    code: 'TPA-MCX',
    type: 'tpa',
    bankName: 'Rede Multicaixa EMIS',
    accountNumber: 'TPA-98421-MCX',
    initialBalance: 0,
    currency: 'AOA',
    color: 'purple',
    manager: 'Operador de Balcão',
    status: 'active',
    description: 'Recebimentos com cartões Multicaixa no balcão e pagamentos via Express.',
  },
  {
    id: 'acc-piquete',
    name: 'Fundo de Maneio de Piquete Técnico',
    code: 'FM-PIQ',
    type: 'fundo_maneio',
    initialBalance: 0,
    currency: 'AOA',
    color: 'cyan',
    manager: 'Carlos Batalha (Chefe de Piquete)',
    status: 'active',
    description: 'Fundo em dinheiro para despesas urgentes de rua, combustível e materiais imediatos.',
  },
];

const seedAccountTransfers: AnyRecord[] = [];

const seedCategoryBudgets: AnyRecord[] = [
  { id: 'b-material', category: 'material', label: 'Material de Rede & Fibra', monthlyBudget: 350000, color: 'blue' },
  { id: 'b-combustivel', category: 'combustivel', label: 'Combustível & Viaturas de Piquete', monthlyBudget: 120000, color: 'amber' },
  { id: 'b-link_ip', category: 'link_ip', label: 'Link IP Transit & Telecomunicações', monthlyBudget: 600000, color: 'purple' },
  { id: 'b-alimentacao', category: 'alimentacao', label: 'Alimentação & Diárias de Campo', monthlyBudget: 80000, color: 'rose' },
  { id: 'b-energia', category: 'energia', label: 'Energia Eléctrica ENDE & Gerador', monthlyBudget: 90000, color: 'emerald' },
  { id: 'b-manutencao', category: 'manutencao', label: 'Manutenção de Equipamentos & Ferramentas', monthlyBudget: 70000, color: 'indigo' },
  { id: 'b-operacional', category: 'operacional', label: 'Despesas de Balcão & Consumíveis', monthlyBudget: 50000, color: 'slate' },
  { id: 'b-impostos', category: 'impostos', label: 'Obrigações Fiscais & Taxas AGT', monthlyBudget: 140000, color: 'cyan' },
];

const seedExpenses: AnyRecord[] = [];
const seedMessages: AnyRecord[] = [];

const seedInventory: AnyRecord[] = [
  {
    id: 1,
    code: 'MAT-ONU-01',
    name: 'ONU GPON Huawei HG8310M',
    category: 'equipamento',
    unit: 'unidade',
    quantity: 0,
    minQuantity: 5,
    unitCost: 15000,
    location: 'Armazém Central',
    description: 'Terminal de rede óptica 1 porta Gigabit para clientes Fibra',
  },
  {
    id: 2,
    code: 'MAT-FBR-02',
    name: 'Cabo Drop Fibra Óptica 1FO Auto-sustentado (Bobina 1000m)',
    category: 'fibra',
    unit: 'bobina',
    quantity: 0,
    minQuantity: 2,
    unitCost: 45000,
    location: 'Armazém Central',
    description: 'Cabo óptico com mensageiro de aço para postes em vias públicas',
  },
  {
    id: 3,
    code: 'MAT-CON-03',
    name: 'Conector Rápido SC/APC Monomodo (Caixa 100 un)',
    category: 'fibra',
    unit: 'caixa',
    quantity: 0,
    minQuantity: 3,
    unitCost: 22000,
    location: 'Armazém Central',
    description: 'Conectorização mecânica rápida para ONUs residenciais',
  },
  {
    id: 4,
    code: 'MAT-CTO-04',
    name: 'Caixa de Terminação Óptica CTO 16 Portas IP65',
    category: 'fibra',
    unit: 'unidade',
    quantity: 0,
    minQuantity: 3,
    unitCost: 18500,
    location: 'Armazém Central',
    description: 'Caixa de distribuição óptica de rua com splitter 1:16',
  },
  {
    id: 5,
    code: 'MAT-CB-05',
    name: 'Cabo Coaxial RG6 com Mensageiro (Bobina 305m)',
    category: 'tv',
    unit: 'bobina',
    quantity: 0,
    minQuantity: 3,
    unitCost: 38000,
    location: 'Armazém Central',
    description: 'Cabo de distribuição coaxial blindado para sinal analógico e digital TV',
  },
  {
    id: 6,
    code: 'MAT-F-06',
    name: 'Conector F de Compressão RG6 (Saco 100 un)',
    category: 'tv',
    unit: 'saco',
    quantity: 0,
    minQuantity: 5,
    unitCost: 12000,
    location: 'Armazém Central',
    description: 'Terminação metálica de alta blindagem para cabo coaxial',
  },
  {
    id: 7,
    code: 'MAT-SPL-07',
    name: 'Divisor / Splitter RF 1x2 (5-1000 MHz)',
    category: 'tv',
    unit: 'unidade',
    quantity: 0,
    minQuantity: 15,
    unitCost: 1800,
    location: 'Armazém Central',
    description: 'Repartidor de sinal de TV para 2 televisores',
  },
  {
    id: 8,
    code: 'MAT-ROT-08',
    name: 'Roteador Wi-Fi AC1200 Gigabit Dual-Band',
    category: 'equipamento',
    unit: 'unidade',
    quantity: 0,
    minQuantity: 4,
    unitCost: 24000,
    location: 'Armazém Central',
    description: 'Roteador sem fio de alto alcance para clientes Fibra',
  },
  {
    id: 9,
    code: 'MAT-SPL-09',
    name: 'Divisor / Splitter RF 1x4 (5-1000 MHz)',
    category: 'tv',
    unit: 'unidade',
    quantity: 0,
    minQuantity: 10,
    unitCost: 2800,
    location: 'Armazém Central',
    description: 'Repartidor de sinal de TV para 4 pontos ou residências múltiplas',
  },
];

const seedEquipmentAssignments: AnyRecord[] = [];
const seedServiceOrders: AnyRecord[] = [];

export function normalizeClient(raw: any): AnyRecord {
  if (!raw || typeof raw !== 'object') return raw;
  const fullName = String(raw.fullName || raw.full_name || raw.name || '').trim();
  const phone = String(raw.phone || '').trim();
  const rawService = String(raw.serviceType || raw.service_type || 'tv').toLowerCase().trim();
  let serviceType: 'tv' | 'internet' | 'combo' = 'tv';
  if (rawService === 'fibra' || rawService === 'internet' || rawService === 'ftth') {
    serviceType = 'internet';
  } else if (rawService === 'combo' || rawService.includes('combo') || rawService.includes('tv +')) {
    serviceType = 'combo';
  } else {
    serviceType = 'tv';
  }

  const createdAt = raw.createdAt || raw.created_at || new Date().toISOString();
  const dueDay = Number(raw.dueDay || raw.due_day || 5);
  const monthlyPrice = Number(raw.monthlyPrice || raw.monthly_fee || (serviceType === 'tv' ? 4000 : serviceType === 'internet' ? 6500 : 10500));
  const status = raw.status || 'active';
  const houseCode = String(raw.houseCode || raw.house_code || '').trim();
  const documentNumber = String(raw.documentNumber || raw.document_number || raw.nif || '').trim();
  const pdoNumber = String(raw.pdoNumber || raw.pdo_number || '').trim();
  const onuNumber = String(raw.onuNumber || raw.onu_number || '').trim();
  const alternatePhone = String(raw.alternatePhone || raw.alternate_phone || '').trim();

  return {
    ...raw,
    id: Number(raw.id),
    code: raw.code || `CLI-${String(raw.id || 1).padStart(5, '0')}`,
    name: fullName,
    fullName,
    full_name: fullName,
    phone,
    alternatePhone,
    alternate_phone: alternatePhone,
    email: raw.email || '',
    address: raw.address || '',
    city: raw.city || 'Luanda',
    neighborhood: raw.neighborhood || '',
    documentNumber,
    document_number: documentNumber,
    houseCode,
    house_code: houseCode,
    pdoNumber,
    pdo_number: pdoNumber,
    onuNumber,
    onu_number: onuNumber,
    opticalRxDbm: raw.opticalRxDbm || raw.optical_rx_dbm || -19.5,
    optical_rx_dbm: raw.opticalRxDbm || raw.optical_rx_dbm || -19.5,
    serviceType,
    service_type: serviceType,
    status,
    monthlyPrice,
    monthly_fee: monthlyPrice,
    dueDay,
    due_day: dueDay,
    pin: raw.pin || '1234',
    notes: raw.notes || '',
    // Preservação resiliente de Pró-rata e Conta de Tesouraria
    remainingDaysChoice: raw.remainingDaysChoice || raw.remaining_days_choice || 'assistir_restantes',
    remaining_days_choice: raw.remainingDaysChoice || raw.remaining_days_choice || 'assistir_restantes',
    remainingDaysCount: Number(raw.remainingDaysCount ?? raw.remaining_days_count ?? raw.prorataDays ?? raw.prorata_days ?? 0),
    remaining_days_count: Number(raw.remainingDaysCount ?? raw.remaining_days_count ?? raw.prorataDays ?? raw.prorata_days ?? 0),
    remainingDaysAmount: Number(raw.remainingDaysAmount ?? raw.remaining_days_amount ?? raw.prorataAmount ?? raw.prorata_amount ?? 0),
    remaining_days_amount: Number(raw.remainingDaysAmount ?? raw.remaining_days_amount ?? raw.prorataAmount ?? raw.prorata_amount ?? 0),
    prorataDays: Number(raw.remainingDaysCount ?? raw.remaining_days_count ?? raw.prorataDays ?? raw.prorata_days ?? 0),
    prorata_days: Number(raw.remainingDaysCount ?? raw.remaining_days_count ?? raw.prorataDays ?? raw.prorata_days ?? 0),
    prorataAmount: Number(raw.remainingDaysAmount ?? raw.remaining_days_amount ?? raw.prorataAmount ?? raw.prorata_amount ?? 0),
    prorata_amount: Number(raw.remainingDaysAmount ?? raw.remaining_days_amount ?? raw.prorataAmount ?? raw.prorata_amount ?? 0),
    accountId: raw.accountId || raw.account_id || (
      String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('bai') ? 'acc-bai' :
      String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
      String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('tpa') || String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('express') || String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
    ),
    account_id: raw.accountId || raw.account_id || (
      String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('bai') ? 'acc-bai' :
      String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
      String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('tpa') || String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('express') || String(raw.paymentMethod || raw.payment_method || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
    ),
    paymentMethod: raw.paymentMethod || raw.payment_method || 'Numerário / Balcão',
    payment_method: raw.paymentMethod || raw.payment_method || 'Numerário / Balcão',
    tvPoints: Number(raw.tvPoints || raw.tv_points || 1),
    tv_points: Number(raw.tvPoints || raw.tv_points || 1),
    contractAmount: Number(raw.contractAmount || raw.contract_amount || 15000),
    contract_amount: Number(raw.contractAmount || raw.contract_amount || 15000),
    createdAt,
    created_at: createdAt,
    updatedAt: raw.updatedAt || raw.updated_at || createdAt,
    updated_at: raw.updatedAt || raw.updated_at || createdAt,
  };
}

export function normalizeContract(raw: any): AnyRecord {
  if (!raw || typeof raw !== 'object') return raw;
  const cId = Number(raw.clientId || raw.client_id || 0);
  const cName = raw.clientName || raw.client_name || '';
  const code = raw.code || raw.contractNumber || (cId ? `CT-${new Date().getFullYear()}/${String(cId).padStart(5, '0')}` : `CT-${raw.id}`);
  const monthlyPrice = Number(raw.monthlyPrice || raw.monthlyFee || raw.monthly_price || raw.monthly_fee || 4000);
  const contractFee = Number(raw.contractFee ?? raw.contract_fee ?? raw.contractAmount ?? 15000);
  const tvPoints = Number(raw.tvPoints || raw.tv_points || (raw.extraTvs ? Number(raw.extraTvs) + 1 : 1));
  const extraTvs = Number(raw.extraTvs ?? raw.extra_tvs ?? Math.max(0, tvPoints - 1));
  const dueDay = Number(raw.dueDay || raw.due_day || 5);
  const startDate = raw.startDate || raw.start_date || (raw.createdAt ? String(raw.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10));
  const serviceType = raw.serviceType || raw.service_type || 'tv';

  // Pró-rata e Dias Restantes: preservação resiliente
  let remainingDaysChoice = raw.remainingDaysChoice || raw.remaining_days_choice;
  let remainingDaysCount = Number(raw.remainingDaysCount ?? raw.remaining_days_count ?? raw.prorataDays ?? raw.prorata_days ?? 0);
  let remainingDaysAmount = Number(raw.remainingDaysAmount ?? raw.remaining_days_amount ?? raw.prorataAmount ?? raw.prorata_amount ?? 0);

  // Conta de Tesouraria e Pagamento: preservação resiliente
  let targetAccId = raw.accountId || raw.account_id || raw.account;
  let paymentMethod = raw.paymentMethod || raw.payment_method || 'Numerário / Balcão';

  // Fallback inteligente para recuperar Pró-rata e Conta a partir do cliente se ausente
  if ((!targetAccId || targetAccId === 'acc-caixa' || !remainingDaysAmount) && typeof window !== 'undefined') {
    try {
      const storedClientsRaw = window.localStorage.getItem('osdel:clients') || window.localStorage.getItem('osdel_clients');
      if (storedClientsRaw) {
        const parsedClients = JSON.parse(storedClientsRaw);
        const matchedClient = parsedClients.find((cl: any) => Number(cl.id) === cId);
        if (matchedClient) {
          if (!targetAccId && matchedClient.accountId) targetAccId = matchedClient.accountId;
          if (!paymentMethod && matchedClient.paymentMethod) paymentMethod = matchedClient.paymentMethod;
          if (!remainingDaysChoice && matchedClient.remainingDaysChoice) remainingDaysChoice = matchedClient.remainingDaysChoice;
          if (!remainingDaysCount && matchedClient.remainingDaysCount) remainingDaysCount = Number(matchedClient.remainingDaysCount);
          if (!remainingDaysAmount && matchedClient.remainingDaysAmount) remainingDaysAmount = Number(matchedClient.remainingDaysAmount);
        }
      }
    } catch {}
  }

  if (!targetAccId) {
    const m = String(paymentMethod).toLowerCase();
    if (m.includes('bai') || m.includes('transfer')) targetAccId = 'acc-bai';
    else if (m.includes('bfa')) targetAccId = 'acc-bfa';
    else if (m.includes('tpa') || m.includes('express') || m.includes('multi')) targetAccId = 'acc-tpa';
    else targetAccId = 'acc-caixa';
  }

  const accountName = targetAccId === 'acc-bai' ? 'Banco BAI (Arrecadação Principal)'
    : targetAccId === 'acc-bfa' ? 'Banco BFA (Operações & Fornecedores)'
    : targetAccId === 'acc-tpa' ? 'Terminal Multicaixa Express (TPA / EMIS)'
    : targetAccId === 'acc-piquete' ? 'Fundo de Maneio de Piquete Técnico'
    : 'Caixa Geral (Balcão Golf)';

  return {
    ...raw,
    id: Number(raw.id),
    code,
    contractNumber: code,
    clientId: cId,
    client_id: cId,
    clientName: cName,
    client_name: cName,
    planName: raw.planName || raw.plan_name || (serviceType === 'tv' ? 'TV Comunitária' : 'Internet Fibra 10 Mbps'),
    planSpeed: raw.planSpeed || raw.plan_speed || raw.speed || 'Sinal RF',
    speed: raw.speed || raw.planSpeed || raw.plan_speed || 'Sinal RF',
    monthlyPrice,
    monthlyFee: monthlyPrice,
    monthly_price: monthlyPrice,
    monthly_fee: monthlyPrice,
    contractFee,
    contract_fee: contractFee,
    contractAmount: contractFee,
    tvPoints,
    tv_points: tvPoints,
    extraTvs,
    extra_tvs: extraTvs,
    dueDay,
    due_day: dueDay,
    startDate,
    start_date: startDate,
    endDate: raw.endDate || raw.end_date || null,
    end_date: raw.endDate || raw.end_date || null,
    status: raw.status || 'active',
    serviceType,
    service_type: serviceType,
    terms: raw.terms || '',
    // Campos resilientes de Pró-rata e Conta
    remainingDaysChoice: remainingDaysChoice || (remainingDaysAmount > 0 ? 'pagar_restantes' : 'assistir_restantes'),
    remaining_days_choice: remainingDaysChoice || (remainingDaysAmount > 0 ? 'pagar_restantes' : 'assistir_restantes'),
    remainingDaysCount,
    remaining_days_count: remainingDaysCount,
    prorataDays: remainingDaysCount,
    prorata_days: remainingDaysCount,
    remainingDaysAmount,
    remaining_days_amount: remainingDaysAmount,
    prorataAmount: remainingDaysAmount,
    prorata_amount: remainingDaysAmount,
    accountId: targetAccId,
    account_id: targetAccId,
    accountName,
    paymentMethod,
    payment_method: paymentMethod,
    isUrgentInstallation: Boolean(raw.isUrgentInstallation || raw.is_urgent_installation),
    urgentTechnicianId: raw.urgentTechnicianId || raw.urgent_technician_id || null,
    urgentTechnicianName: raw.urgentTechnicianName || raw.urgent_technician_name || null,
    urgentInstallationFee: Number(raw.urgentInstallationFee || raw.urgent_fee || 0),
    urgentDiscount: Number(raw.urgentDiscount || raw.urgent_fee_discount || 0),
  };
}

export function normalizeInvoice(raw: any): AnyRecord {
  if (!raw || typeof raw !== 'object') return raw;
  const invNum = raw.invoiceNumber || raw.invoice_number || `FT-${raw.id}`;
  const cId = Number(raw.clientId || raw.client_id || 0);
  const cName = raw.clientName || raw.client_name || raw.customerName || 'Cliente';
  const total = Number(raw.totalAmount || raw.total_amount || raw.amount || 0);
  const issue = raw.issueDate || raw.issue_date || raw.createdAt || raw.created_at || new Date().toISOString();
  const method = raw.paymentMethod || raw.payment_method || 'Multicaixa';

  return {
    ...raw,
    id: Number(raw.id),
    invoiceNumber: invNum,
    invoice_number: invNum,
    clientId: cId,
    client_id: cId,
    clientName: cName,
    client_name: cName,
    totalAmount: total,
    amount: total,
    total_amount: total,
    issueDate: issue,
    issue_date: issue,
    dueDate: raw.dueDate || raw.due_date || issue,
    due_date: raw.dueDate || raw.due_date || issue,
    status: raw.status || 'paid',
    paymentMethod: method,
    payment_method: method,
    createdAt: raw.createdAt || raw.created_at || issue,
    created_at: raw.createdAt || raw.created_at || issue,
  };
}

export function normalizePayment(raw: any): AnyRecord {
  if (!raw || typeof raw !== 'object') return raw;
  const cId = Number(raw.clientId || raw.client_id || 0);
  const cName = raw.clientName || raw.client_name || '';
  const amt = Number(raw.amount || 0);
  const penalty = Number(raw.penalty || 0);
  const total = Number(raw.total || (amt + penalty));
  const month = raw.paymentMonth || raw.payment_month || raw.referenceMonth || raw.reference_month || new Date().toISOString().slice(0, 7);
  const paidAt = raw.paidAt || raw.paid_at || raw.createdAt || raw.created_at || new Date().toISOString();
  const method = raw.method || 'Multicaixa Express';
  const ref = raw.reference || raw.receiptNumber || raw.receipt_number || '';
  const sType = raw.serviceType || raw.service_type || 'internet';

  return {
    ...raw,
    id: Number(raw.id),
    clientId: cId,
    client_id: cId,
    clientName: cName,
    client_name: cName,
    amount: amt,
    penalty,
    total,
    paymentMonth: month,
    payment_month: month,
    referenceMonth: month,
    reference_month: month,
    paidAt,
    paid_at: paidAt,
    method,
    reference: ref,
    receiptNumber: ref,
    receipt_number: ref,
    serviceType: sType,
    service_type: sType,
    createdAt: raw.createdAt || raw.created_at || paidAt,
    created_at: raw.createdAt || raw.created_at || paidAt,
  };
}

export function normalizeUser(raw: any): AnyRecord {
  if (!raw || typeof raw !== 'object') return raw;
  const name = raw.fullName || raw.full_name || raw.name || raw.username || 'Colaborador';
  const role = raw.role || 'tecnico';
  const jobTitle = raw.jobTitle || raw.job_title || '';
  const active = raw.active !== false && raw.is_active !== false;

  return {
    ...raw,
    id: Number(raw.id),
    name,
    fullName: name,
    full_name: name,
    username: raw.username,
    email: raw.email || '',
    phone: raw.phone || '',
    role,
    pin: String(raw.pin || '1234'),
    active,
    is_active: active,
    jobTitle,
    job_title: jobTitle,
    department: raw.department || 'Operações',
    salaryBase: Number(raw.salaryBase || raw.salary_base || 150000),
    salary_base: Number(raw.salaryBase || raw.salary_base || 150000),
  };
}

// Cache em memória de alta performance para o IndexedDB
const idbMemoryCache: Record<string, any> = {};

function load<T>(name: string, fallback: T): T {
  try {
    // 1. Prioridade máxima: Cache em memória hidratado pelo IndexedDB
    if (idbMemoryCache[name] !== undefined) {
      const parsed = idbMemoryCache[name];
      if (name === 'clients' && Array.isArray(parsed)) {
        return parsed.map(normalizeClient) as unknown as T;
      }
      if (name === 'contracts' && Array.isArray(parsed)) {
        return parsed.map(normalizeContract) as unknown as T;
      }
      if (name === 'financial_accounts' && Array.isArray(parsed)) {
        return parsed.map((acc: any) => ({
          ...acc,
          initialBalance: Number(acc.initialBalance ?? acc.initial_balance ?? 0),
          currentBalance: Number(acc.currentBalance ?? acc.current_balance ?? acc.initialBalance ?? 0),
        })) as unknown as T;
      }
      if (name === 'invoices' && Array.isArray(parsed)) {
        return parsed.map(normalizeInvoice) as unknown as T;
      }
      if (name === 'payments' && Array.isArray(parsed)) {
        return parsed.map(normalizePayment) as unknown as T;
      }
      if (name === 'users' && Array.isArray(parsed)) {
        return parsed.map(normalizeUser) as unknown as T;
      }
      if (name === 'settings' && typeof fallback === 'object' && fallback !== null) {
        return { ...fallback, ...parsed } as T;
      }
      return parsed as T;
    }

    const stored = window.localStorage.getItem(`osdel:${name}`) || window.localStorage.getItem(`osdel_${name}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      idbMemoryCache[name] = parsed;
      // Normalização automática por entidade
      if (name === 'clients' && Array.isArray(parsed)) {
        return parsed.map(normalizeClient) as unknown as T;
      }
      if (name === 'contracts' && Array.isArray(parsed)) {
        return parsed.map(normalizeContract) as unknown as T;
      }
      if (name === 'financial_accounts' && Array.isArray(parsed)) {
        return parsed.map((acc: any) => ({
          ...acc,
          initialBalance: Number(acc.initialBalance ?? acc.initial_balance ?? 0),
          currentBalance: Number(acc.currentBalance ?? acc.current_balance ?? acc.initialBalance ?? 0),
        })) as unknown as T;
      }
      if (name === 'invoices' && Array.isArray(parsed)) {
        return parsed.map(normalizeInvoice) as unknown as T;
      }
      if (name === 'payments' && Array.isArray(parsed)) {
        return parsed.map(normalizePayment) as unknown as T;
      }
      if (name === 'expenses' && Array.isArray(parsed)) {
        return parsed.map((e: any) => {
          const desc = e.reason || e.description || 'Despesa Geral';
          let targetAccId = e.accountId || e.account_id;
          if (!targetAccId) {
            const accStr = String(e.account || '').toLowerCase();
            if (accStr.includes('bai')) targetAccId = 'acc-bai';
            else if (accStr.includes('bfa')) targetAccId = 'acc-bfa';
            else if (accStr.includes('tpa') || accStr.includes('multi') || accStr.includes('express')) targetAccId = 'acc-tpa';
            else if (accStr.includes('piquete') || accStr.includes('fundo')) targetAccId = 'acc-piquete';
            else targetAccId = 'acc-caixa';
          }
          return {
            ...e,
            id: Number(e.id) || e.id,
            reason: desc,
            description: desc,
            amount: Number(e.amount || 0),
            date: e.date ? String(e.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            category: e.category || 'operacional',
            accountId: targetAccId,
            account_id: targetAccId,
            status: e.status || 'pago',
          };
        }) as unknown as T;
      }
      if (name === 'users' && Array.isArray(parsed)) {
        // Purga total de utilizadores fictícios/mock de versões anteriores
        const MOCK_NAMES = new Set(['boss', 'admin', 'mestre.job', 'helder', 'operador1']);
        const filteredParsed = parsed.filter((u: any) => !MOCK_NAMES.has(String(u.username || '').toLowerCase()));
        const normalizedUsers = filteredParsed.map(normalizeUser);
        const hasDeezy = normalizedUsers.some((u: any) => String(u.username || '').toLowerCase() === 'deezy');
        if (!hasDeezy && Array.isArray(fallback)) {
          const deezy = fallback.find((f: any) => String(f.username || '').toLowerCase() === 'deezy');
          if (deezy) normalizedUsers.unshift(normalizeUser(deezy));
        }
        return normalizedUsers as unknown as T;
      }
      // Smart merging for settings so new fields are always present
      if (name === 'settings' && typeof fallback === 'object' && fallback !== null) {
        return { ...fallback, ...parsed } as T;
      }
      return parsed as T;
    }
    // Backwards compatibility with previous key prefix
    const old = window.localStorage.getItem(`no-tv:${name}`);
    if (old) {
      const parsed = JSON.parse(old);
      idbMemoryCache[name] = parsed;
      if (name === 'clients' && Array.isArray(parsed)) return parsed.map(normalizeClient) as unknown as T;
      if (name === 'contracts' && Array.isArray(parsed)) return parsed.map(normalizeContract) as unknown as T;
      return parsed as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

let registeredQueryClient: any = null;

export function registerQueryClient(qc: any) {
  registeredQueryClient = qc;
}

export function invalidateAllLocalData() {
  if (registeredQueryClient) {
    try {
      registeredQueryClient.invalidateQueries();
    } catch {}
  }
}

export function broadcastDataSync(keyName: string, payload?: any) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`osdel-${keyName}-updated`, { detail: payload }));
      window.dispatchEvent(new CustomEvent('osdel-data-sync', { detail: { key: keyName, payload, timestamp: Date.now() } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'DATA_SYNC', key: keyName, payload, timestamp: Date.now() });
        bc.close();
      }
    }
  } catch {}
}

export function reloadAllFromStorage(keyName?: string) {
  try {
    if (!keyName || keyName === 'clients') clients = load('clients', seedClients);
    if (!keyName || keyName === 'payments') payments = load('payments', seedPayments);
    if (!keyName || keyName === 'contracts') contracts = load('contracts', seedContracts);
    if (!keyName || keyName === 'settings') settings = load('settings', seedSettings);
    if (!keyName || keyName === 'users') users = load('users', seedUsers);
    if (!keyName || keyName === 'expenses') expenses = load('expenses', seedExpenses);
    if (!keyName || keyName === 'financial_accounts') financialAccounts = load('financial_accounts', seedFinancialAccounts);
    if (!keyName || keyName === 'account_transfers') accountTransfers = load('account_transfers', seedAccountTransfers);
    if (!keyName || keyName === 'category_budgets') categoryBudgets = load('category_budgets', seedCategoryBudgets);
    if (!keyName || keyName === 'messages') messages = load('messages', seedMessages);
    if (!keyName || keyName === 'inventory') inventory = load('inventory', seedInventory);
    if (!keyName || keyName === 'equipment_assignments') equipmentAssignments = load('equipment_assignments', seedEquipmentAssignments);
    if (!keyName || keyName === 'service_orders') serviceOrders = load('service_orders', seedServiceOrders);
    if (!keyName || keyName === 'job_roles') jobRoles = load('job_roles', seedJobRoles);
    if (!keyName || keyName === 'cash_closures') cashClosures = load('cash_closures', seedCashClosures);
    if (!keyName || keyName === 'invoices') invoices = load('invoices', seedInvoices);
    if (!keyName || keyName === 'audit_logs') auditLogs = load('audit_logs', seedAuditLogs);
    
    // Recalcula saldos ao vivo consolidados para manter sincronização perfeita de tesouraria
    financialAccounts = computeLiveAccountBalances(financialAccounts);
    invalidateAllLocalData();
  } catch {}
}

/**
 * Inicialização e hidratação assíncrona do IndexedDB com migração automática
 */
export async function initAppIndexedDB(): Promise<{ success: boolean; migrated: number }> {
  if (typeof window === 'undefined') return { success: false, migrated: 0 };
  try {
    const migration = await migrateLocalStorageToIndexedDB();
    const idbData = await loadAllFromIndexedDB();

    let hasData = false;
    for (const [key, val] of Object.entries(idbData)) {
      if (val !== undefined) {
        idbMemoryCache[key] = val;
        hasData = true;
      }
    }

    if (hasData || migration.migratedCount > 0) {
      reloadAllFromStorage();
    }

    window.dispatchEvent(new CustomEvent('osdel-indexeddb-ready', { detail: { migration } }));
    return { success: true, migrated: migration.migratedCount };
  } catch (err) {
    console.warn('[IndexedDB] Erro ao inicializar armazenamento:', err);
    return { success: false, migrated: 0 };
  }
}

// Inicializa automaticamente no browser em background
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initAppIndexedDB();
  }, 100);
}

// Background sync listeners across multiple windows, tabs and Electron
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key) {
      if (event.key.startsWith('osdel:')) {
        const keyName = event.key.replace('osdel:', '');
        reloadAllFromStorage(keyName);
        window.dispatchEvent(new CustomEvent(`osdel-${keyName}-updated`));
        window.dispatchEvent(new CustomEvent('osdel-data-sync', { detail: { key: keyName } }));
      } else if (event.key.startsWith('osdel_')) {
        const keyName = event.key.replace('osdel_', '');
        reloadAllFromStorage(keyName);
        window.dispatchEvent(new CustomEvent(`osdel-${keyName}-updated`));
        window.dispatchEvent(new CustomEvent('osdel-data-sync', { detail: { key: keyName } }));
      } else if (event.key === 'osdel_staff_credentials') {
        reloadAllFromStorage('users');
      } else if (event.key === 'osdel_company_settings' || event.key === 'osdel_settings') {
        reloadAllFromStorage('settings');
      }
    }
  });

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('osdel_sync_channel');
      bc.onmessage = (event) => {
        if (event.data && (event.data.type === 'DATA_SYNC' || event.data.type === 'DATA_UPDATED')) {
          reloadAllFromStorage(event.data.key);
          window.dispatchEvent(new CustomEvent(`osdel-${event.data.key}-updated`));
          window.dispatchEvent(new CustomEvent('osdel-data-sync', { detail: { key: event.data.key } }));
        }
      };
    } catch {}
  }
}

function save<T>(name: string, value: T) {
  try {
    // 1. Armazena imediatamente em cache em memória
    idbMemoryCache[name] = value;

    // 2. Persiste assincronamente em IndexedDB (capacidade para +100.000 registos sem erro de cota)
    idbSet(name, value).catch((err) => {
      console.warn(`[IndexedDB] Falha ao persistir coleção "${name}":`, err);
    });

    // 3. Fallback para LocalStorage tolerante a QuotaExceededError
    try {
      window.localStorage.setItem(`osdel:${name}`, JSON.stringify(value));
      window.localStorage.setItem(`osdel_${name}`, JSON.stringify(value));
    } catch {
      // Se exceder a quota do LocalStorage (5MB), o IndexedDB preserva a integridade total!
    }

    broadcastDataSync(name, value);
    if (name.includes('_')) {
      const hyphenated = name.replace(/_/g, '-');
      broadcastDataSync(hyphenated, value);
    }
    invalidateAllLocalData();
  } catch {
    /* storage is optional */
  }
}

// Limpeza e inicialização para PRODUÇÃO 100% LIMPA (Contas zeradas, 0 dados de exemplo)
try {
  if (typeof window !== 'undefined') {
    const isCleaned = window.localStorage.getItem('osdel:production_zeroed_clean_v2');
    if (!isCleaned) {
      window.localStorage.removeItem('osdel:clients');
      window.localStorage.removeItem('osdel:payments');
      window.localStorage.removeItem('osdel:contracts');
      window.localStorage.removeItem('osdel:invoices');
      window.localStorage.removeItem('osdel:expenses');
      window.localStorage.removeItem('osdel:service_orders');
      window.localStorage.removeItem('osdel:account_transfers');
      window.localStorage.removeItem('osdel:cash_closures');
      window.localStorage.removeItem('osdel:equipment_assignments');
      window.localStorage.removeItem('osdel:financial_accounts');
      window.localStorage.removeItem('osdel:audit_logs');
      window.localStorage.removeItem('osdel_client_credentials');
      window.localStorage.removeItem('osdel_client_agreements');
      window.localStorage.removeItem('osdel_advanced_schedule');
      window.localStorage.removeItem('osdel_team_missions');
      window.localStorage.removeItem('osdel_monthly_closures');
      window.localStorage.removeItem('osdel_technician_loans');
      window.localStorage.removeItem('osdel_payment_promises');
      window.localStorage.removeItem('osdel_support_tickets');
      window.localStorage.removeItem('gestaox_tenants_registry');
      window.localStorage.removeItem('gestaox_subscription_payments');
      window.localStorage.setItem('osdel:production_zeroed_clean_v2', 'true');
    }
  }
} catch {}

/**
 * Função utilitária para Zerar Todas as Contas e Limpar Todos os Dados de Demonstração
 * Deixa o sistema 100% pronto para hospedar e operar em produção real.
 */
export function resetAllAccountsAndDemoData(): { success: boolean; message: string } {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('osdel:clients');
      window.localStorage.removeItem('osdel:payments');
      window.localStorage.removeItem('osdel:contracts');
      window.localStorage.removeItem('osdel:invoices');
      window.localStorage.removeItem('osdel:expenses');
      window.localStorage.removeItem('osdel:service_orders');
      window.localStorage.removeItem('osdel:account_transfers');
      window.localStorage.removeItem('osdel:cash_closures');
      window.localStorage.removeItem('osdel:equipment_assignments');
      window.localStorage.removeItem('osdel:financial_accounts');
      window.localStorage.removeItem('osdel:audit_logs');
      window.localStorage.removeItem('osdel_client_credentials');
      window.localStorage.removeItem('osdel_client_agreements');
      window.localStorage.removeItem('osdel_advanced_schedule');
      window.localStorage.removeItem('osdel_team_missions');
      window.localStorage.removeItem('osdel_monthly_closures');
      window.localStorage.removeItem('osdel_technician_loans');
      window.localStorage.removeItem('osdel_payment_promises');
      window.localStorage.removeItem('osdel_support_tickets');
      window.localStorage.removeItem('gestaox_tenants_registry');
      window.localStorage.removeItem('gestaox_subscription_payments');
      window.localStorage.setItem('osdel:production_zeroed_clean_v2', 'true');
    }

    try {
      idbClear().catch(() => {});
      Object.keys(idbMemoryCache).forEach((k) => delete idbMemoryCache[k]);
    } catch {}

    clients = [];
    payments = [];
    contracts = [];
    invoices = [];
    expenses = [];
    serviceOrders = [];
    accountTransfers = [];
    cashClosures = [];
    equipmentAssignments = [];
    financialAccounts = seedFinancialAccounts.map((acc) => ({
      ...acc,
      initialBalance: 0,
      currentBalance: 0,
    }));
    auditLogs = [
      {
        id: 1,
        action: 'PRODUCAO_ZERADA',
        module: 'Sistema',
        description: 'Todas as contas e saldos foram zerados. Base limpa para hospedagem em produção real.',
        user: 'deezy',
        targetId: 'SYS-PROD',
        timestamp: new Date().toISOString(),
        details: '0 clientes, 0 faturas, 0 despesas, contas a 0.00 Kz.',
      },
    ];

    save('clients', clients);
    save('payments', payments);
    save('contracts', contracts);
    save('invoices', invoices);
    save('expenses', expenses);
    save('service_orders', serviceOrders);
    save('account_transfers', accountTransfers);
    save('cash_closures', cashClosures);
    save('equipment_assignments', equipmentAssignments);
    save('financial_accounts', financialAccounts);
    save('audit_logs', auditLogs);
    save('users', seedUsers);

    window.dispatchEvent(new CustomEvent('osdel-production-reset'));

    return {
      success: true,
      message: 'Todas as contas foram zeradas e os dados de exemplo removidos com sucesso. O sistema está pronto para produção!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Erro ao zerar contas e dados de exemplo.',
    };
  }
}

let clients = load('clients', seedClients);
let payments = load('payments', seedPayments);
let contracts = load('contracts', seedContracts);
let settings = load('settings', seedSettings);
let users = load('users', seedUsers);

export function autoGenerateContractForClient(client: AnyRecord): AnyRecord {
  const now = new Date();
  const nextId = Math.max(0, ...contracts.map((c: any) => Number(c.id) || 0)) + 1;
  const sType = String(client.serviceType || client.service_type || 'tv').toLowerCase();
  const isTv = sType === 'tv' || sType === 'tv_cabo';
  const isCombo = sType === 'combo';

  const tvPoints = Number(client.tvPoints || (client.extraTvs ? Number(client.extraTvs) + 1 : 1));
  const baseTvPrice = Number(settings.tvMonthlyPrice ?? 4000);
  const extraTvPrice = Number(settings.tvExtraPrice ?? 1000);
  const calculatedTvFee = tvPoints > 1 ? (baseTvPrice + (tvPoints - 1) * extraTvPrice) : baseTvPrice;

  let planName = client.planName || (isTv ? (tvPoints > 1 ? `TV Comunitária (${tvPoints} Televisores)` : 'TV Comunitária Base') : isCombo ? 'Combo TV + Internet Fibra' : 'Internet Fibra 10 Mbps');
  let planSpeed = client.planSpeed || client.speed || (isTv ? `${tvPoints > 1 ? tvPoints + ' Pontos ' : ''}Sinal Digital RF` : '10 Mbps/s');
  let monthlyPrice = Number(client.monthlyFee || client.monthlyPrice || (isTv ? calculatedTvFee : isCombo ? (calculatedTvFee + 6500) : 6500));

  const contractNumber = client.code ? `CT-${client.code.replace('CLI-', '')}` : `CT-${now.getFullYear()}/${String(nextId).padStart(5, '0')}`;

  const resolvedAccount = client.accountId || client.account_id || (
    String(client.paymentMethod || '').toLowerCase().includes('bai') ? 'acc-bai' :
    String(client.paymentMethod || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
    String(client.paymentMethod || '').toLowerCase().includes('tpa') || String(client.paymentMethod || '').toLowerCase().includes('express') || String(client.paymentMethod || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
  );

  const contract = normalizeContract({
    id: nextId,
    code: contractNumber,
    contractNumber,
    clientId: Number(client.id),
    client_id: Number(client.id),
    clientName: client.fullName || client.full_name || 'Assinante OSDEL',
    planName,
    planSpeed,
    speed: planSpeed,
    monthlyPrice,
    monthlyFee: monthlyPrice,
    tvPoints,
    extraTvs: Math.max(0, tvPoints - 1),
    contractFee: Number(client.contractAmount || settings.connectionFee || 15000),
    startDate: client.createdAt ? client.createdAt.slice(0, 10) : now.toISOString().slice(0, 10),
    endDate: null,
    dueDay: Number(client.dueDay || settings.paymentDueDay || 5),
    status: 'active',
    serviceType: sType,
    terms: `Contrato de adesão oficial OSDEL (${isTv ? `TV Comunitária por Cabo (${tvPoints} TVs)` : isCombo ? 'Combo TV + Fibra' : 'Internet Fibra Óptica FTTH'}). Mensalidade: ${monthlyPrice.toLocaleString()} Kz/mês. Vencimento: dia ${client.dueDay || 5}.`,
    remainingDaysChoice: client.remainingDaysChoice || (Number(client.remainingDaysCount || client.prorataDays) > 0 ? 'pagar_restantes' : 'assistir_restantes'),
    remainingDaysCount: Number(client.remainingDaysCount ?? client.prorataDays ?? 0),
    remainingDaysAmount: Number(client.remainingDaysAmount ?? client.prorataAmount ?? 0),
    prorataDays: Number(client.prorataDays ?? client.remainingDaysCount ?? 0),
    prorataAmount: Number(client.prorataAmount ?? client.remainingDaysAmount ?? 0),
    accountId: resolvedAccount,
    account_id: resolvedAccount,
    accountName: client.accountName,
    paymentMethod: client.paymentMethod || 'Dinheiro (Em Mão)',
  });
  return contract;
}

export function ensureAllClientsHaveContracts(): void {
  let changed = false;
  clients.forEach((client: any) => {
    const hasContract = contracts.some((c: any) => Number(c.clientId || c.client_id) === Number(client.id));
    if (!hasContract) {
      const newContract = autoGenerateContractForClient(client);
      contracts.push(newContract);
      changed = true;
    }
  });
  if (changed) {
    save('contracts', contracts);
  }
}

// Executa cura automática na inicialização para garantir que nenhum cliente fique sem contrato
try {
  ensureAllClientsHaveContracts();
} catch {}

// Garantir que o Super Admin Supremo 'deezy' com a senha 52863400# está sempre activo e acima de todos
try {
  const deezyIdx = users.findIndex((u: any) => u.username?.toLowerCase() === 'deezy');
  if (deezyIdx === -1) {
    users.unshift(seedUsers[0]);
    save('users', users);
  } else {
    users[deezyIdx] = {
      ...users[deezyIdx],
      username: 'deezy',
      name: users[deezyIdx].name || 'Deezy (Super Admin Supremo)',
      role: 'superadmin',
      password: '52863400#',
      active: true,
      jobTitle: 'Super Administrador Geral & Proprietário (Acima de Todos)',
    };
    save('users', users);
  }
} catch {}
let expenses = load('expenses', seedExpenses);
let financialAccounts = load('financial_accounts', seedFinancialAccounts);
let accountTransfers = load('account_transfers', seedAccountTransfers);
let categoryBudgets = load('category_budgets', seedCategoryBudgets);
let messages = load('messages', seedMessages);
let inventory = load('inventory', seedInventory);
let equipmentAssignments = load('equipment_assignments', seedEquipmentAssignments);
let serviceOrders = load('service_orders', seedServiceOrders);
let jobRoles = load('job_roles', seedJobRoles);
let cashClosures = load('cash_closures', seedCashClosures);
let invoices = load('invoices', seedInvoices);
let auditLogs = load('audit_logs', seedAuditLogs);

export const logAuditAction = (item: {
  action: string;
  module: string;
  description: string;
  targetId?: string;
  details?: string;
  user?: string;
}) => {
  const sessionUser = session();
  const newLog = {
    id: Math.max(0, ...auditLogs.map((l) => l.id)) + 1,
    action: item.action,
    module: item.module,
    description: item.description,
    targetId: item.targetId || 'N/A',
    details: item.details || '',
    user: item.user || sessionUser?.username || 'sistema',
    timestamp: new Date().toISOString(),
  };
  auditLogs = [newLog, ...auditLogs];
  save('audit_logs', auditLogs);
  return newLog;
};

const key = (name: string, ...args: any[]) => [name, ...args];
const query = (queryKey: any[], fn: () => any, options?: AnyRecord) =>
  useQuery({ queryKey, queryFn: async () => fn(), ...options });
const mutation = (fn: (data: any) => any) =>
  useMutation({
    mutationFn: async (args: any) => fn(args),
    onSuccess: () => {
      invalidateAllLocalData();
    },
  });

export type Client = AnyRecord;
export type ClientInput = AnyRecord;
export type ContractInput = AnyRecord;
export type PaymentInput = AnyRecord;
export type SettingsUpdate = AnyRecord;
export type ExpenseInput = AnyRecord;
export type UserInput = AnyRecord;
export type MessageInput = AnyRecord;

export const getGetDashboardQueryKey = (serviceMode = '') => key('dashboard', serviceMode);
export const getGetClientQueryKey = (id: number) => key('client', id);
export const getGetSettingsQueryKey = () => key('settings');
export const getListClientsQueryKey = (params: AnyRecord = {}) =>
  key(
    'clients',
    params.search || '',
    params.serviceType || '',
    params.status || '',
    params.serviceMode || '',
    params.pdoNumber || '',
    params.street || '',
    params.debtStatus || '',
    params.dueDay || '',
    params.planId || '',
    params.withoutOnu ? '1' : '0',
    params.withWhatsapp ? '1' : '0',
    params.sort || ''
  );
export const getListClientContractsQueryKey = (id: number) => key('contracts', id);
export const getListPaymentsQueryKey = (params: AnyRecord = {}) =>
  key('payments', params.paymentMonth || '', params.serviceMode || '', params.serviceType || '');
export const getListExpensesQueryKey = () => key('expenses');
export const getListFinancialAccountsQueryKey = () => key('financial_accounts');
export const getListTransfersQueryKey = (params: AnyRecord = {}) =>
  key('account_transfers', params.startDate || '', params.endDate || '');
export const getListCategoryBudgetsQueryKey = () => key('category_budgets');
export const getListUsersQueryKey = () => key('users');
export const getListMessagesQueryKey = (params: AnyRecord = {}) => key('messages', params.serviceMode || '');
export const getListInventoryQueryKey = (params: AnyRecord = {}) =>
  key('inventory', params.category || '', params.search || '', params.serviceMode || '');
export const getListEquipmentAssignmentsQueryKey = (clientId?: number, serviceMode?: string) =>
  key('equipment_assignments', clientId || 0, serviceMode || '');
export const getListServiceOrdersQueryKey = (params: AnyRecord = {}) =>
  key('service_orders', params.status || '', params.type || '', params.clientId || 0, params.serviceMode || '');
export const getListJobRolesQueryKey = () => key('job_roles');
export const getListCashClosuresQueryKey = () => key('cash_closures');
export const getListInvoicesQueryKey = (params: AnyRecord = {}) =>
  key('invoices', params.search || '', params.status || '', params.period || '', params.serviceMode || '');
export const getListAuditLogsQueryKey = (params: AnyRecord = {}) =>
  key('audit_logs', params.module || '', params.user || '', params.search || '');
export const getGetReportsQueryKey = (params: AnyRecord = {}) =>
  key('reports', params.reportType || '', params.startDate || '', params.endDate || '', params.serviceMode || '');
export const useHealthCheck = () => ({ isError: false, data: { status: 'ok' } });

const monthKey = (date = new Date()) => date.toISOString().slice(0, 7);

const monthsSince = (value?: string | null) => {
  if (!value) return 99;
  const d1 = new Date(value);
  const d2 = new Date();
  const diffMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  return Math.max(0, diffMonths);
};

export const computeLiveAccountBalances = (baseAccounts: AnyRecord[] = financialAccounts): AnyRecord[] => {
  return baseAccounts.map((acc) => {
    const accId = String(acc.id);
    const accName = String(acc.name || '').toLowerCase();

    // Sum all payments credited to this account (mensalidades, taxas de adesão, urgências, pró-rata)
    const totalPaymentsIn = payments.reduce((sum, p) => {
      // Se for pagamento histórico de migração marcado para não alterar caixa físico vivo, não inflaciona o saldo de hoje
      if (p.isHistoricalOnly || p.movementType === 'historico_migracao_sem_caixa') {
        return sum;
      }
      let targetId = p.accountId || p.account_id;
      if (!targetId) {
        const m = String(p.method || '').toLowerCase();
        if (m.includes('bai') || m.includes('transfer')) targetId = 'acc-bai';
        else if (m.includes('bfa')) targetId = 'acc-bfa';
        else if (m.includes('multi') || m.includes('tpa') || m.includes('express')) targetId = 'acc-tpa';
        else targetId = 'acc-caixa';
      }
      if (String(targetId) === accId || (accId === 'acc-caixa' && !targetId)) {
        const pValue = (p.total !== undefined && p.total !== null && Number(p.total) > 0)
          ? Number(p.total)
          : (Number(p.amount || 0) + Number(p.penalty || 0));
        return sum + pValue;
      }
      return sum;
    }, 0);

    // Sum transfers in
    const totalTransfersIn = accountTransfers.reduce((sum, t) => {
      if (t.status === 'cancelado') return sum;
      const toId = String(t.toAccountId || t.to_account_id || t.targetAccountId || t.toAccount || '');
      if (toId === accId || toId === accName) {
        return sum + Number(t.amount || 0);
      }
      return sum;
    }, 0);

    // Sum transfers out
    const totalTransfersOut = accountTransfers.reduce((sum, t) => {
      if (t.status === 'cancelado') return sum;
      const fromId = String(t.fromAccountId || t.from_account_id || t.sourceAccountId || t.fromAccount || '');
      if (fromId === accId || fromId === accName) {
        return sum + Number(t.amount || 0);
      }
      return sum;
    }, 0);

    // Sum expenses out
    const totalExpensesOut = expenses.reduce((sum, e) => {
      if (e.status === 'cancelado') return sum;
      let targetId = e.accountId || e.account_id;
      if (!targetId) {
        const eAccName = String(e.account || '').toLowerCase();
        if (eAccName.includes('bai')) targetId = 'acc-bai';
        else if (eAccName.includes('bfa')) targetId = 'acc-bfa';
        else if (eAccName.includes('tpa') || eAccName.includes('multi') || eAccName.includes('express')) targetId = 'acc-tpa';
        else if (eAccName.includes('piquete') || eAccName.includes('fundo')) targetId = 'acc-piquete';
        else {
          const found = baseAccounts.find((a) => a.name === e.account || a.id === e.account);
          targetId = found ? found.id : 'acc-caixa';
        }
      }
      if (String(targetId) === accId || (accId === 'acc-caixa' && (!targetId || targetId === 'acc-caixa'))) {
        return sum + Number(e.amount || 0);
      }
      return sum;
    }, 0);

    const initial = Number(acc.initialBalance || 0);
    const totalIn = totalPaymentsIn + totalTransfersIn;
    const totalOut = totalExpensesOut + totalTransfersOut;
    const currentBalance = initial + totalIn - totalOut;

    return {
      ...acc,
      initialBalance: initial,
      currentBalance,
      totalIn,
      totalOut,
    };
  });
};

// Computa saldos vivos de todas as contas financeiras na inicialização
try {
  financialAccounts = computeLiveAccountBalances(financialAccounts);
} catch {}

const latestPaymentFor = (clientId: number) =>
  payments
    .filter((item) => Number(item.clientId) === Number(clientId))
    .sort((a, b) => {
      const mb = b.paymentMonth || b.payment_month || b.referenceMonth || (b.paidAt ? b.paidAt.slice(0, 7) : '');
      const ma = a.paymentMonth || a.payment_month || a.referenceMonth || (a.paidAt ? a.paidAt.slice(0, 7) : '');
      return String(mb).localeCompare(String(ma));
    })[0];

const dueDayFor = (clientId: number) =>
  Number(contracts.find((item) => Number(item.clientId) === Number(clientId))?.dueDay ?? settings.paymentDueDay ?? 5);

export const visibleClient = (client: AnyRecord): AnyRecord => {
  if (client.status === 'inactive') return { ...client, status: 'inactive' };
  
  const last = latestPaymentFor(client.id);
  const currentMonth = monthKey();
  const currentDay = new Date().getDate();
  const dueDay = dueDayFor(client.id);

  let status = client.status || 'active';

  if (client.status === 'suspended') {
    return { ...client, status: 'suspended' };
  }

  if (last) {
    const pMonth = last.paymentMonth || last.payment_month || last.referenceMonth || (last.paidAt ? last.paidAt.slice(0, 7) : '');
    const elapsed = monthsSince(`${pMonth}-01`);
    if (elapsed >= Number(settings.suspensionAfterMonths ?? 3)) {
      status = 'suspended';
    } else if (pMonth === currentMonth) {
      status = 'active';
    } else if (currentDay > dueDay) {
      status = 'late';
    } else {
      status = 'active';
    }
  } else {
    // No payments yet recorded
    const clientAgeMonths = monthsSince(client.createdAt || client.created_at);
    if (clientAgeMonths === 0) {
      status = client.status || 'active';
    } else if (clientAgeMonths >= Number(settings.suspensionAfterMonths ?? 3)) {
      status = 'suspended';
    } else if (currentDay > dueDay && clientAgeMonths >= 1) {
      status = 'late';
    } else {
      status = client.status || 'active';
    }
  }

  return { ...client, status };
};

const isInRange = (value: string, start?: string, end?: string) =>
  (!start || value >= start) && (!end || value <= end);

export const useGetDashboard = (serviceMode = '') =>
  query(
    getGetDashboardQueryKey(serviceMode),
    () => {
      let listed = clients.map(visibleClient);
      if (serviceMode === 'fibra') {
        listed = listed.filter((c) => {
          const st = String(c.serviceType || c.service_type || '').toLowerCase();
          return st === 'internet' || st === 'fibra' || st === 'ftth' || st === 'combo';
        });
      } else if (serviceMode === 'tv') {
        listed = listed.filter((c) => {
          const st = String(c.serviceType || c.service_type || '').toLowerCase();
          return st === 'tv' || st === 'tv_cabo' || st === 'combo';
        });
      }

      const allowedClientIds = new Set(listed.map((c) => Number(c.id)));
      const currentMonth = monthKey();
      const currentMonthPayments = payments.filter((p) => {
        const pMonth = p.paymentMonth || p.payment_month || p.referenceMonth || p.reference_month || (p.paidAt ? p.paidAt.slice(0, 7) : '');
        const matchesMonth = pMonth === currentMonth || (p.paidAt && p.paidAt.slice(0, 7) === currentMonth);
        const matchesService = serviceMode === 'ambos' || !serviceMode || allowedClientIds.has(Number(p.clientId));
        return matchesMonth && matchesService;
      });
      const paidClientsIds = new Set(currentMonthPayments.map((p) => Number(p.clientId)));
      const revenue = currentMonthPayments.reduce(
        (sum, p) => sum + Number(p.amount || 0) + Number(p.penalty || 0),
        0,
      );

      const filteredInventory = inventory.filter((i) => {
        if (serviceMode === 'fibra') {
          return i.category === 'fibra' || i.category === 'equipamento' || (i.name && i.name.toLowerCase().includes('fibra'));
        }
        if (serviceMode === 'tv') {
          return i.category === 'tv' || (i.name && (i.name.toLowerCase().includes('tv') || i.name.toLowerCase().includes('coaxial') || i.name.toLowerCase().includes('rg6')));
        }
        return true;
      });
      const lowStockItems = filteredInventory.filter((i) => Number(i.quantity) <= Number(i.minQuantity)).length;

      const filteredServiceOrders = serviceOrders.filter((o) => {
        if (!serviceMode || serviceMode === 'ambos') return true;
        return allowedClientIds.has(o.clientId);
      });
      const pendingServiceOrders = filteredServiceOrders.filter(
        (o) => o.status === 'pendente' || o.status === 'em_curso',
      ).length;

      const filteredPaymentsForActivity = payments.filter((p) => {
        if (!serviceMode || serviceMode === 'ambos') return true;
        return allowedClientIds.has(p.clientId);
      });

      return {
        totalClients: listed.length,
        activeClients: listed.filter((c) => c.status === 'active').length,
        lateClients: listed.filter((c) => c.status === 'late').length,
        suspendedClients: listed.filter((c) => c.status === 'suspended').length,
        inactiveClients: listed.filter((c) => c.status === 'inactive').length,
        tvClients: listed.filter((c) => c.serviceType === 'tv').length,
        internetClients: listed.filter((c) => c.serviceType === 'internet' || c.serviceType === 'fibra').length,
        comboClients: listed.filter((c) => c.serviceType === 'combo').length,
        revenue,
        paidClients: paidClientsIds.size,
        unpaidClients: Math.max(0, listed.length - paidClientsIds.size),
        openRequests: listed.filter((c) => String(c.notes || '').toLowerCase().includes('pedido')).length,
        lowStockItems,
        pendingServiceOrders,
        month: currentMonth,
        recentActivity: [
          ...filteredPaymentsForActivity.map((p) => ({
            id: `pay-${p.id}`,
            description: `Pagamento de ${money(Number(p.amount) + Number(p.penalty || 0))} de ${
              clients.find((c) => c.id === p.clientId)?.fullName || 'Cliente'
            }`,
            createdAt: p.paidAt,
            method: p.method,
            type: 'payment',
          })),
          ...filteredServiceOrders.map((so) => ({
            id: `so-${so.id}`,
            description: `O.S. ${so.code} (${so.type}) - ${
              clients.find((c) => c.id === so.clientId)?.fullName || 'Cliente'
            } [${so.status}]`,
            createdAt: so.createdAt,
            method: so.status,
            type: 'service_order',
          })),
        ]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10),
      };
    },
    { staleTime: 0 },
  );

export const useGetClient = (id: number, options?: AnyRecord) =>
  query(
    getGetClientQueryKey(id),
    () => {
      const found = clients.find((c) => Number(c.id) === Number(id));
      return found ? visibleClient(normalizeClient(found)) : undefined;
    },
    options?.query,
  );

export const useListClients = (params: AnyRecord = {}) =>
  query(getListClientsQueryKey(params), () => {
    const needle = String(params.search || '').toLowerCase().trim();
    const mode = params.serviceMode;
    const filterType = params.serviceType;
    const pdoFilter = params.pdoNumber ? String(params.pdoNumber).toLowerCase().trim() : '';
    const streetFilter = params.street ? String(params.street).toLowerCase().trim() : '';
    const debtFilter = params.debtStatus; // 'em_dia' | 'com_divida' | 'atraso_1m' | 'suspenso'
    const dueDayFilter = params.dueDay ? Number(params.dueDay) : undefined;
    const planFilter = params.planId ? String(params.planId).toLowerCase().trim() : '';
    const onlyWithoutOnu = Boolean(params.withoutOnu);
    const onlyWithWhatsapp = Boolean(params.withWhatsapp);

    const filtered = clients
      .map(normalizeClient)
      .map(visibleClient)
      .filter((c) => {
        // Multi-criteria text string
        const text = `${c.fullName || ''} ${c.full_name || ''} ${c.code || ''} ${c.phone || ''} ${c.alternatePhone || ''} ${c.documentNumber || ''} ${
          c.houseCode || ''
        } ${c.address || ''} ${c.neighborhood || ''} ${c.street || ''} ${c.pdoNumber || ''} ${c.onuNumber || ''} ${c.portNumber || ''} ${c.planId || ''} ${c.notes || ''}`.toLowerCase();
        
        // Multi-word matching (all words must match)
        const searchWords = needle ? needle.split(/\s+/).filter(Boolean) : [];
        const matchesSearch = searchWords.length === 0 || searchWords.every((word) => text.includes(word));

        let matchesService = true;
        const sType = String(c.serviceType || c.service_type || 'tv').toLowerCase().trim();

        if (mode === 'fibra') {
          matchesService = sType === 'internet' || sType === 'fibra' || sType === 'combo';
        } else if (mode === 'tv') {
          matchesService = sType === 'tv' || sType === 'tv_cabo' || sType === 'combo';
        } else if (filterType && filterType !== 'todos' && filterType !== '') {
          const ft = String(filterType).toLowerCase().trim();
          if (ft === 'internet' || ft === 'fibra') {
            matchesService = sType === 'internet' || sType === 'fibra' || sType === 'combo';
          } else if (ft === 'tv' || ft === 'tv_cabo') {
            matchesService = sType === 'tv' || sType === 'tv_cabo' || sType === 'combo';
          } else {
            matchesService = sType === ft;
          }
        }

        const matchesStatus =
          !params.status ||
          c.status === params.status ||
          (params.status === 'request' && String(c.notes || '').toLowerCase().includes('pedido'));

        const matchesPdo = !pdoFilter || String(c.pdoNumber || '').toLowerCase().includes(pdoFilter);

        const clientStreet = `${c.street || ''} ${c.neighborhood || ''} ${c.address || ''}`.toLowerCase();
        const matchesStreet = !streetFilter || clientStreet.includes(streetFilter);

        const matchesDueDay = !dueDayFilter || Number(c.dueDay || 5) === dueDayFilter;

        const matchesPlan = !planFilter || String(c.planId || '').toLowerCase() === planFilter;

        const matchesWithoutOnu = !onlyWithoutOnu || (!c.onuNumber && (c.serviceType === 'internet' || c.serviceType === 'fibra' || c.serviceType === 'combo'));

        const matchesWithWhatsapp = !onlyWithWhatsapp || Boolean(c.phone && String(c.phone).replace(/\D/g, '').length >= 9);

        let matchesDebt = true;
        if (debtFilter) {
          if (debtFilter === 'em_dia') matchesDebt = c.status === 'active';
          else if (debtFilter === 'com_divida') matchesDebt = c.status === 'late' || c.status === 'suspended';
          else if (debtFilter === 'atraso_1m') matchesDebt = c.status === 'late';
          else if (debtFilter === 'suspenso') matchesDebt = c.status === 'suspended';
        }

        return (
          matchesSearch &&
          matchesService &&
          matchesStatus &&
          matchesPdo &&
          matchesStreet &&
          matchesDueDay &&
          matchesPlan &&
          matchesWithoutOnu &&
          matchesWithWhatsapp &&
          matchesDebt
        );
      });

    // Sorting
    const sort = params.sort || 'default';
    if (sort === 'name_asc') {
      filtered.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    } else if (sort === 'name_desc') {
      filtered.sort((a, b) => (b.fullName || '').localeCompare(a.fullName || ''));
    } else if (sort === 'code_asc') {
      filtered.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    } else if (sort === 'code_desc') {
      filtered.sort((a, b) => (b.code || '').localeCompare(a.code || ''));
    } else if (sort === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (sort === 'debt_first') {
      const rank = (s: string) => (s === 'suspended' ? 3 : s === 'late' ? 2 : 1);
      filtered.sort((a, b) => rank(b.status) - rank(a.status));
    } else if (sort === 'pdo') {
      filtered.sort((a, b) => (a.pdoNumber || '').localeCompare(b.pdoNumber || ''));
    }

    return Object.assign([...filtered], { items: filtered, total: filtered.length });
  });

export const useListClientContracts = (id: number | string, options?: AnyRecord) =>
  query(
    getListClientContractsQueryKey(Number(id)),
    () => {
      const numId = Number(id);
      const matching = contracts.filter((c: any) => Number(c.clientId || c.client_id) === numId);
      if (matching.length > 0) {
        return matching.map((c: any) => ({
          ...c,
          code: c.code || c.contractNumber,
          contractNumber: c.contractNumber || c.code,
          monthlyFee: Number(c.monthlyFee || c.monthlyPrice || 4000),
          monthlyPrice: Number(c.monthlyPrice || c.monthlyFee || 4000),
          speed: c.speed || c.planSpeed || 'Sinal Digital RF',
          planSpeed: c.planSpeed || c.speed || 'Sinal Digital RF',
        }));
      }

      // Auto-heal: se o cliente existe, cria o contrato imediatamente para nunca aparecer "sem contrato"
      const client = clients.find((c: any) => Number(c.id) === numId);
      if (client) {
        const generated = autoGenerateContractForClient(client);
        contracts = [generated, ...contracts];
        save('contracts', contracts);
        return [generated];
      }
      return [];
    },
    options?.query
  );

export const useListPayments = (params: AnyRecord = {}) =>
  query(getListPaymentsQueryKey(params), () => {
    let items = payments;
    if (params.serviceMode === 'fibra' || params.serviceType === 'internet' || params.serviceType === 'fibra') {
      const allowed = new Set(
        clients
          .filter((c) => {
            const st = String(c.serviceType || c.service_type || '').toLowerCase();
            return st === 'internet' || st === 'fibra' || st === 'ftth' || st === 'combo';
          })
          .map((c) => Number(c.id))
      );
      items = items.filter((p) => {
        const sType = String(p.serviceType || p.service_type || '').toLowerCase();
        if (sType === 'fibra' || sType === 'internet' || sType === 'ftth' || sType === 'combo') return true;
        return allowed.has(Number(p.clientId));
      });
    } else if (params.serviceMode === 'tv' || params.serviceType === 'tv') {
      const allowed = new Set(
        clients
          .filter((c) => {
            const st = String(c.serviceType || c.service_type || '').toLowerCase();
            return st === 'tv' || st === 'tv_cabo' || st === 'combo';
          })
          .map((c) => Number(c.id))
      );
      items = items.filter((p) => {
        const sType = String(p.serviceType || p.service_type || '').toLowerCase();
        if (sType === 'tv' || sType === 'combo') return true;
        return allowed.has(Number(p.clientId));
      });
    }

    const filtered = items
      .filter((p) => {
        if (!params.paymentMonth) return true;
        const m = p.paymentMonth || p.payment_month || p.referenceMonth || p.reference_month || (p.paidAt ? p.paidAt.slice(0, 7) : '');
        return m === params.paymentMonth;
      })
      .sort((a, b) => new Date(b.paidAt || b.paid_at || 0).getTime() - new Date(a.paidAt || a.paid_at || 0).getTime());
    return Object.assign([...filtered], { items: filtered, total: filtered.length });
  });

export const useListExpenses = (params: AnyRecord = {}) =>
  query(getListExpensesQueryKey(), () => {
    const needle = String(params.search || '').toLowerCase().trim();
    const items = expenses
      .filter((e) => {
        if (!isInRange(e.date, params.startDate, params.endDate)) return false;
        if (params.category && e.category !== params.category) return false;
        if (params.account && e.account !== params.account && e.accountId !== params.account) return false;
        if (params.status && e.status !== params.status) return false;
        if (needle) {
          const hay = `${e.reason} ${e.supplier || ''} ${e.documentNumber || ''} ${e.operator || ''}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Object.assign([...items], { items, total: items.length });
  });

export const useListFinancialAccounts = () =>
  query(getListFinancialAccountsQueryKey(), () => {
    const liveAccounts = computeLiveAccountBalances();
    return Object.assign([...liveAccounts], { items: liveAccounts, total: liveAccounts.length });
  });

export const useListTransfers = (params: AnyRecord = {}) =>
  query(getListTransfersQueryKey(params), () => {
    const list = accountTransfers
      .filter((t) => isInRange(t.date, params.startDate, params.endDate))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Object.assign([...list], { items: list, total: list.length });
  });

export const useListCategoryBudgets = () =>
  query(getListCategoryBudgetsQueryKey(), () => {
    return Object.assign([...categoryBudgets], { items: categoryBudgets, total: categoryBudgets.length });
  });

export const useListUsers = () =>
  query(getListUsersQueryKey(), () => {
    const active = users.filter((u) => u.active !== false);
    return Object.assign([...active], { items: active, total: active.length });
  });

export const useListMessages = (params: AnyRecord = {}) =>
  query(getListMessagesQueryKey(params), () => {
    let list = messages.slice();
    if (params.serviceMode === 'fibra') {
      list = list.filter((m) => {
        const text = `${m.audience || ''} ${m.message || ''}`.toLowerCase();
        return !text.includes('tv ') && !text.includes('tv comunit');
      });
    } else if (params.serviceMode === 'tv') {
      list = list.filter((m) => {
        const text = `${m.audience || ''} ${m.message || ''}`.toLowerCase();
        return !text.includes('fibra') && !text.includes('onu') && !text.includes('pdo');
      });
    }
    const sorted = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Object.assign([...sorted], { items: sorted, total: sorted.length });
  });

export const useListInventory = (params: AnyRecord = {}) =>
  query(getListInventoryQueryKey(params), () => {
    const needle = String(params.search || '').toLowerCase().trim();
    let list = inventory;
    if (params.serviceMode === 'fibra') {
      list = list.filter((item) => {
        const cat = (item.category || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        return (
          cat === 'fibra' ||
          cat === 'equipamento' ||
          name.includes('fibra') ||
          name.includes('drop') ||
          name.includes('onu') ||
          name.includes('sc/apc') ||
          name.includes('pdo') ||
          name.includes('roteador')
        );
      });
    } else if (params.serviceMode === 'tv') {
      list = list.filter((item) => {
        const cat = (item.category || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        return (
          cat === 'tv' ||
          name.includes('tv') ||
          name.includes('coaxial') ||
          name.includes('rg6') ||
          name.includes('conector f') ||
          name.includes('splitter') ||
          name.includes('repartidor')
        );
      });
    }

    const filtered = list
      .filter((item) => {
        const matchesCategory = !params.category || item.category === params.category;
        const text = `${item.code} ${item.name} ${item.description} ${item.location}`.toLowerCase();
        const matchesSearch = !needle || text.includes(needle);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return Object.assign([...filtered], { items: filtered, total: filtered.length });
  });

export const useListEquipmentAssignments = (params?: number | { clientId?: number; serviceMode?: string }) => {
  const clientId = typeof params === 'number' ? params : params?.clientId;
  const serviceMode = typeof params === 'object' ? params?.serviceMode : undefined;
  return query(getListEquipmentAssignmentsQueryKey(clientId, serviceMode), () => {
    let list = equipmentAssignments.slice();
    if (serviceMode === 'fibra') {
      const allowed = new Set(clients.filter((c) => c.serviceType === 'internet' || c.serviceType === 'combo').map((c) => c.id));
      list = list.filter((eq) => allowed.has(eq.clientId));
    } else if (serviceMode === 'tv') {
      const allowed = new Set(clients.filter((c) => c.serviceType === 'tv').map((c) => c.id));
      list = list.filter((eq) => allowed.has(eq.clientId));
    }
    const filtered = clientId ? list.filter((eq) => eq.clientId === clientId) : list;
    const sorted = filtered.sort((a, b) => new Date(b.installedAt || '').getTime() - new Date(a.installedAt || '').getTime());
    return Object.assign([...sorted], { items: sorted, total: sorted.length });
  });
};

export const useListServiceOrders = (params: AnyRecord = {}) =>
  query(getListServiceOrdersQueryKey(params), () => {
    let list = serviceOrders;
    if (params.serviceMode === 'fibra') {
      const allowed = new Set(clients.filter((c) => c.serviceType === 'internet').map((c) => c.id));
      list = list.filter((so) => allowed.has(so.clientId));
    } else if (params.serviceMode === 'tv') {
      const allowed = new Set(clients.filter((c) => c.serviceType === 'tv').map((c) => c.id));
      list = list.filter((so) => allowed.has(so.clientId));
    }

    const sorted = list
      .filter((so) => {
        const matchesStatus = !params.status || so.status === params.status;
        const matchesType = !params.type || so.type === params.type;
        const matchesClient = !params.clientId || so.clientId === params.clientId;
        return matchesStatus && matchesType && matchesClient;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return Object.assign([...sorted], { items: sorted, total: sorted.length });
  });

export const useListJobRoles = () =>
  query(getListJobRolesQueryKey(), () => {
    return Object.assign([...jobRoles], { items: jobRoles, total: jobRoles.length });
  });

export const useListCashClosures = () =>
  query(getListCashClosuresQueryKey(), () => {
    const sorted = cashClosures
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Object.assign([...sorted], { items: sorted, total: sorted.length });
  });

export const useListInvoices = (params: AnyRecord = {}) =>
  query(getListInvoicesQueryKey(params), () => {
    const needle = (params.search || '').toLowerCase().trim();
    let list = invoices;
    if (params.serviceMode === 'fibra') {
      const allowed = new Set(clients.filter((c) => c.serviceType === 'internet').map((c) => c.id));
      list = list.filter((inv) => !inv.clientId || allowed.has(inv.clientId));
    } else if (params.serviceMode === 'tv') {
      const allowed = new Set(clients.filter((c) => c.serviceType === 'tv').map((c) => c.id));
      list = list.filter((inv) => !inv.clientId || allowed.has(inv.clientId));
    }

    const sorted = list
      .filter((inv) => {
        const matchesStatus = !params.status || inv.status === params.status;
        const text = `${inv.invoiceNumber} ${inv.clientName} ${inv.clientDocument || ''} ${inv.paymentMethod || ''}`.toLowerCase();
        const matchesSearch = !needle || text.includes(needle);
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.issueDate || b.createdAt).getTime() - new Date(a.issueDate || a.createdAt).getTime());
    return Object.assign([...sorted], { items: sorted, total: sorted.length });
  });

export const useListAuditLogs = (params: AnyRecord = {}) =>
  query(getListAuditLogsQueryKey(params), () => {
    const needle = (params.search || '').toLowerCase().trim();
    const sorted = auditLogs
      .filter((log) => {
        const matchesModule = !params.module || log.module === params.module;
        const matchesUser = !params.user || log.user === params.user;
        const text = `${log.action} ${log.description} ${log.user} ${log.targetId || ''}`.toLowerCase();
        const matchesSearch = !needle || text.includes(needle);
        return matchesModule && matchesUser && matchesSearch;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return Object.assign([...sorted], { items: sorted, total: sorted.length });
  });

export const useGetReports = (params: AnyRecord) =>
  query(getGetReportsQueryKey(params), () => {
    let ps = payments.filter((p) => isInRange(p.paidAt.slice(0, 10), params.startDate, params.endDate));
    if (params.serviceMode === 'fibra') {
      const allowed = new Set(clients.filter((c) => c.serviceType === 'internet').map((c) => c.id));
      ps = ps.filter((p) => allowed.has(p.clientId));
    } else if (params.serviceMode === 'tv') {
      const allowed = new Set(clients.filter((c) => c.serviceType === 'tv').map((c) => c.id));
      ps = ps.filter((p) => allowed.has(p.clientId));
    }

    const es = expenses.filter((e) => isInRange(e.date, params.startDate, params.endDate));

    const totalReceita = ps.reduce((s, p) => s + Number(p.amount) + Number(p.penalty || 0), 0);
    const totalSaidas = es.reduce((s, e) => s + Number(e.amount), 0);
    const totalResto = totalReceita - totalSaidas;

    const relevantClients = clients.filter((c) => {
      if (params.serviceMode === 'fibra') return c.serviceType === 'internet';
      if (params.serviceMode === 'tv') return c.serviceType === 'tv';
      return true;
    });

    const dates = Array.from(
      new Set([...ps.map((p) => p.paidAt.slice(0, 10)), ...es.map((e) => e.date)]),
    ).sort().reverse();

    let cumulativeTotal = 0;
    const rowsAsc = dates.slice().reverse().map((date) => {
      const dayPayments = ps.filter((p) => p.paidAt.slice(0, 10) === date);
      const dayExpenses = es.filter((e) => e.date === date);
      const valor = dayPayments.reduce((s, p) => s + Number(p.amount) + Number(p.penalty || 0), 0);
      const saidas = dayExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const motivo = dayExpenses.map((e) => `${money(e.amount)} (${e.reason})`).join(', ') || '—';
      const resto = valor - saidas;
      cumulativeTotal += resto;
      const operador = dayPayments[0]?.operator || dayExpenses[0]?.operator || 'deezy';

      return {
        data: date,
        pagamentos: dayPayments.length,
        valor,
        saidas,
        motivo,
        resto,
        total: cumulativeTotal,
        operador,
      };
    });

    const rows = rowsAsc.reverse();

    return {
      summary: {
        pagamentos: ps.length,
        receita_total: totalReceita,
        saidas: totalSaidas,
        resto: totalResto,
        clientes: relevantClients.length,
      },
      rows,
    };
  });

export const useGetSettings = () => query(getGetSettingsQueryKey(), () => settings);

export function normalizeClientName(name: string): string {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // remove pontuação
    .replace(/\s+/g, ' ') // condensa múltiplos espaços
    .trim();
}

export function normalizeDocumentNumber(doc: string): string {
  return String(doc || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '') // apenas caracteres alfanuméricos
    .trim();
}

export function checkClientDuplicate(params: {
  fullName?: string;
  documentNumber?: string;
  excludeClientId?: number;
}): { isDuplicate: boolean; field?: 'name' | 'document'; message?: string; existingClient?: AnyRecord } {
  const normName = normalizeClientName(params.fullName || '');
  const rawDoc = normalizeDocumentNumber(params.documentNumber || '');
  const excludeId = params.excludeClientId !== undefined ? Number(params.excludeClientId) : undefined;

  // 1. Verificação Estrita por Nome Completo (Insensível a maiúsculas, minúsculas, acentos e múltiplos espaços)
  if (normName && normName.length >= 2) {
    const existing = clients.find((c: any) => {
      if (excludeId !== undefined && Number(c.id) === excludeId) return false;
      const cName = normalizeClientName(c.fullName || c.full_name || c.name || '');
      return cName.length >= 2 && cName === normName;
    });
    if (existing) {
      return {
        isDuplicate: true,
        field: 'name',
        message: `Não é permitido cadastrar o mesmo nome duas vezes! Já existe o cliente "${existing.fullName || existing.full_name || existing.name}" (Código: ${existing.code || 'CLI-' + existing.id}).`,
        existingClient: existing,
      };
    }
  }

  // 2. Verificação Estrita por Bilhete de Identidade / NIF
  if (rawDoc && rawDoc.length >= 5) {
    const existing = clients.find((c: any) => {
      if (excludeId !== undefined && Number(c.id) === excludeId) return false;
      const cDoc = normalizeDocumentNumber(c.documentNumber || c.document_number || c.nif || c.document || c.bi || '');
      return cDoc.length >= 5 && cDoc === rawDoc;
    });
    if (existing) {
      return {
        isDuplicate: true,
        field: 'document',
        message: `Não é permitido repetir o Bilhete/NIF! O documento "${existing.documentNumber || existing.document_number || existing.nif}" já se encontra registado para o cliente "${existing.fullName || existing.full_name}" (Código: ${existing.code || 'CLI-' + existing.id}).`,
        existingClient: existing,
      };
    }
  }

  return { isDuplicate: false };
}

export const useCreateClient = () =>
  mutation((args: any) => {
    const data = args?.data ? args.data : args;

    // Validação estrita de não duplicação: Nome e Bilhete (NIF)
    const duplicateCheck = checkClientDuplicate({
      fullName: data.fullName || data.full_name,
      documentNumber: data.documentNumber || data.document_number || data.nif,
    });
    if (duplicateCheck.isDuplicate) {
      throw new Error(duplicateCheck.message);
    }

    const nextId = Math.max(0, ...clients.map((c) => c.id)) + 1;
    const code = `CLI-${String(nextId).padStart(5, '0')}`;
    const sType = data.serviceType || data.service_type || 'tv';

    // Regra de múltiplos televisores (quem tem 2 TVs paga mais de 4.000 Kz)
    const tvPoints = Number(data.tvPoints || (data.extraTvs ? Number(data.extraTvs) + 1 : 1));
    const baseTvPrice = Number(settings.tvMonthlyPrice ?? 4000);
    const extraTvPrice = Number(settings.tvExtraPrice ?? 1000);
    const calculatedTvMonthly = tvPoints > 1 ? (baseTvPrice + (tvPoints - 1) * extraTvPrice) : baseTvPrice;

    // Auto generate contract
    let planName = tvPoints > 1 ? `TV Comunitária (${tvPoints} Televisores)` : 'TV Comunitária';
    let planSpeed: string | null = tvPoints > 1 ? `${tvPoints} Pontos Sinal Digital RF` : 'Sinal Digital RF';
    let monthlyPrice = calculatedTvMonthly;
    const contractAmount = Number(data.contractAmount || (sType === 'tv' ? (settings.connectionFee ?? 15000) : (settings.connectionFee ?? 15000)));
    const isUrgent = Boolean(data.isUrgentInstallation);
    const rawUrgentFee = isUrgent ? Number(data.urgentInstallationFee || settings.urgentInstallationFee || 2000) : 0;
    const urgentDiscount = Number(data.urgentDiscount || 0);
    // REGRA DE OURO FINANCEIRA: Qualquer desconto incide EXCLUSIVAMENTE sobre a comissão de urgência de 2.000 Kz.
    // O valor base do contrato (15.000 Kz ou 50.000 Kz) permanece 100% integral e inviolável.
    const urgentFee = isUrgent ? Math.max(0, rawUrgentFee - urgentDiscount) : 0;
    const urgentTechId = data.urgentTechnicianId ? Number(data.urgentTechnicianId) : null;
    const urgentTechName = data.urgentTechnicianName || null;
    const remainingDaysChoice = data.remainingDaysChoice || 'assistir_restantes'; // 'assistir_restantes' | 'pagar_restantes'
    const dailyPrice = Number(settings.dailyGuarantee ?? 150);
    const remainingDaysCount = Number(data.remainingDaysCount || 0);
    const remainingDaysAmount = remainingDaysChoice === 'pagar_restantes' ? Number(data.remainingDaysAmount || (remainingDaysCount * dailyPrice)) : 0;

    if (sType === 'internet' || sType === 'fibra') {
      const plan =
        settings.internetPlans?.find((p: any) => p.id === data.planId) ||
        settings.internetPlans?.[0] ||
        { name: 'Fibra 10', speed: '10 Mbps/s', price: 6500 };
      planName = plan.name;
      planSpeed = plan.speed;
      monthlyPrice = Number(data.monthlyPrice || data.monthlyFee || plan.price);
    } else if (sType === 'combo') {
      const plan =
        settings.internetPlans?.find((p: any) => p.id === data.planId) ||
        settings.internetPlans?.[0] ||
        { name: 'Fibra 10', speed: '10 Mbps/s', price: 6500 };
      planName = `Combo TV (${tvPoints} TVs) + ${plan.name}`;
      planSpeed = plan.speed;
      monthlyPrice = Number(data.monthlyPrice || data.monthlyFee || (calculatedTvMonthly + Number(plan.price)));
    } else if (sType === 'tv') {
      monthlyPrice = Number(data.monthlyPrice || data.monthlyFee || calculatedTvMonthly);
    }

    // ONUs são exclusivamente para Internet / FTTH. Clientes de TV NÃO usam ONU!
    const effectiveOnuNumber = (sType === 'tv') ? null : (data.onuNumber || data.onu_number || null);

    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7);
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthStr = nextMonthDate.toISOString().slice(0, 7);

    // Determina a conta financeira de destino da taxa de adesão e contrato
    const targetAdesaoAccId = data.accountId || data.account_id || (
      String(data.paymentMethod || '').toLowerCase().includes('bai') ? 'acc-bai' :
      String(data.paymentMethod || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
      String(data.paymentMethod || '').toLowerCase().includes('tpa') || String(data.paymentMethod || '').toLowerCase().includes('express') || String(data.paymentMethod || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
    );

    const newClient = normalizeClient({
      ...data,
      id: nextId,
      code,
      fullName: data.fullName || data.full_name || '',
      full_name: data.fullName || data.full_name || '',
      phone: data.phone || '',
      address: data.address || '',
      serviceType: sType,
      service_type: sType,
      status: data.status || 'active',
      tvPoints,
      extraTvs: Math.max(0, tvPoints - 1),
      planName,
      planSpeed,
      monthlyPrice: Number(data.monthlyPrice || monthlyPrice),
      monthly_fee: Number(data.monthlyPrice || monthlyPrice),
      dueDay: Number(data.dueDay || settings.paymentDueDay || 5),
      due_day: Number(data.dueDay || settings.paymentDueDay || 5),
      houseCode: data.houseCode || data.house_code || '',
      house_code: data.houseCode || data.house_code || '',
      documentNumber: data.documentNumber || data.document_number || data.nif || '',
      document_number: data.documentNumber || data.document_number || data.nif || '',
      neighborhood: data.neighborhood || '',
      street: data.street || data.neighborhood || data.address || '',
      pdoNumber: data.pdoNumber || data.pdo_number || '',
      pdo_number: data.pdoNumber || data.pdo_number || '',
      onuNumber: effectiveOnuNumber,
      onu_number: effectiveOnuNumber,
      opticalRxDbm: (sType === 'tv') ? null : (data.opticalRxDbm || data.optical_rx_dbm || ''),
      optical_rx_dbm: (sType === 'tv') ? null : (data.opticalRxDbm || data.optical_rx_dbm || ''),
      contractAmount,
      isUrgentInstallation: isUrgent,
      urgentTechnicianId: urgentTechId,
      urgentTechnicianName: urgentTechName,
      urgentInstallationFee: urgentFee,
      urgentDiscount,
      remainingDaysChoice: data.remainingDaysChoice || remainingDaysChoice,
      remainingDaysCount: Number(data.remainingDaysCount ?? remainingDaysCount),
      remainingDaysAmount: Number(data.remainingDaysAmount ?? remainingDaysAmount),
      prorataDays: Number(data.remainingDaysCount ?? remainingDaysCount),
      prorataAmount: Number(data.remainingDaysAmount ?? remainingDaysAmount),
      accountId: targetAdesaoAccId,
      account_id: targetAdesaoAccId,
      accountName: data.accountName,
      paymentMethod: data.paymentMethod || 'Dinheiro (Em Mão)',
      pin: data.pin || String(Math.floor(1000 + Math.random() * 9000)),
      notes: data.notes || '',
      createdAt: (data.isExistingClient && data.contractStartDate) ? `${data.contractStartDate}T08:00:00.000Z` : now.toISOString(),
      created_at: (data.isExistingClient && data.contractStartDate) ? `${data.contractStartDate}T08:00:00.000Z` : now.toISOString(),
      lastPaymentDate: now.toISOString(),
      lastPaymentAmount: contractAmount + urgentFee + remainingDaysAmount,
    });

    const isExisting = Boolean(data.isExistingClient);
    const existingHistory: any[] = Array.isArray(data.paymentHistory) ? data.paymentHistory : [];
    const contractDateStr = (isExisting && data.contractStartDate) ? data.contractStartDate : now.toISOString().slice(0, 10);
    const customContractNum = (isExisting && data.existingContractNumber?.trim()) ? data.existingContractNumber.trim() : null;
    const contractNumber = customContractNum || `CT-${contractDateStr.slice(0, 4)}/${String(nextId).padStart(5, '0')}`;
    const chargeAdhesion = isExisting ? Boolean(data.chargeAdhesionNow) : true;

    // Contrato formal com valor de adesão, pró-rata e conta financeira contabilizados
    const newContract = normalizeContract({
      id: Math.max(0, ...contracts.map((c) => c.id)) + 1,
      code: contractNumber,
      contractNumber,
      clientId: nextId,
      client_id: nextId,
      clientName: newClient.fullName,
      planName,
      planSpeed,
      speed: planSpeed,
      monthlyPrice,
      monthlyFee: monthlyPrice,
      tvPoints,
      extraTvs: Math.max(0, tvPoints - 1),
      contractFee: chargeAdhesion ? contractAmount : (data.contractAmount || 0),
      isUrgentInstallation: isExisting ? false : isUrgent,
      urgentTechnicianId: isExisting ? null : urgentTechId,
      urgentTechnicianName: isExisting ? null : urgentTechName,
      urgentInstallationFee: isExisting ? 0 : urgentFee,
      urgentDiscount: isExisting ? 0 : urgentDiscount,
      remainingDaysChoice: data.remainingDaysChoice || remainingDaysChoice,
      remainingDaysCount: Number(data.remainingDaysCount ?? remainingDaysCount),
      remainingDaysAmount: Number(data.remainingDaysAmount ?? remainingDaysAmount),
      prorataDays: Number(data.remainingDaysCount ?? remainingDaysCount),
      prorataAmount: Number(data.remainingDaysAmount ?? remainingDaysAmount),
      accountId: targetAdesaoAccId,
      account_id: targetAdesaoAccId,
      accountName: data.accountName,
      paymentMethod: data.paymentMethod || 'Dinheiro (Em Mão)',
      startDate: contractDateStr,
      endDate: null,
      dueDay: Number(settings.paymentDueDay ?? 5),
      status: 'active',
      serviceType: sType,
      terms: isExisting
        ? `Contrato oficial OSDEL - Cliente Existente (${sType === 'tv' ? `TV Comunitária por Cabo (${tvPoints} TVs)` : 'Internet Fibra Óptica FTTH'}). Migração de base com histórico de pagamentos registado. Data de adesão original: ${contractDateStr}. Mensalidade regular: ${monthlyPrice.toLocaleString()} Kz/mês.`
        : `Contrato de adesão oficial OSDEL (${sType === 'tv' ? `TV Comunitária por Cabo (${tvPoints} TVs)` : 'Internet Fibra Óptica FTTH'}). Valor do contrato: ${contractAmount.toLocaleString()} Kz (Integral). Mensalidade: ${monthlyPrice.toLocaleString()} Kz/mês.${isUrgent ? ` Instalação urgente realizada pelo técnico ${urgentTechName} (+${urgentFee.toLocaleString()} Kz${urgentDiscount > 0 ? ` [taxa de urgência de 2.000 Kz com ${urgentDiscount.toLocaleString()} Kz de desconto]` : ''}).` : ''}`,
    });

    contracts = [newContract, ...contracts];
    save('contracts', contracts);

    let contractInvoice: any = null;
    let contractPayment: any = null;

    // 1. Factura / Recibo Oficial de Adesão ao Contrato (Apenas se for nova adesão ou se solicitado cobrança de adesão)
    if (!isExisting || chargeAdhesion) {
      const contractInvoiceNum = `FR-CT-${now.getFullYear()}/${String(nextId).padStart(4, '0')}`;
      const contractReceiptRef = `REC-CT-${Date.now().toString().slice(-6)}`;
      contractInvoice = {
        id: Math.max(0, ...invoices.map((inv) => Number(inv.id) || 0)) + 1,
        invoiceNumber: contractInvoiceNum,
        reference: contractReceiptRef,
        clientId: nextId,
        clientName: newClient.fullName,
        serviceType: sType,
        referenceMonth: currentMonthStr,
        movementType: 'adesao_contrato', // Marcado especificamente para separação contabilística
        issueDate: now.toISOString().slice(0, 10),
        dueDate: now.toISOString().slice(0, 10),
        paymentDate: now.toISOString().slice(0, 10),
        amount: contractAmount,
        penalty: 0,
        total: contractAmount,
        status: 'paga',
        paymentMethod: data.paymentMethod || 'Numerário / Balcão',
        amountPaid: contractAmount,
        operator: session()?.username || 'deezy',
        items: [
          {
            description: `Adesão & Instalação de Contrato (${sType === 'tv' ? 'TV Comunitária por Cabo' : 'Fibra Óptica FTTH'}) - ${newClient.code}`,
            quantity: 1,
            unitPrice: contractAmount,
            total: contractAmount,
          },
        ],
      };
      invoices = [contractInvoice, ...invoices];
      save('invoices', invoices);

      // Determina a conta financeira de destino da taxa de adesão
      const targetAdesaoAccId = data.accountId || data.account_id || (
        String(data.paymentMethod || '').toLowerCase().includes('bai') ? 'acc-bai' :
        String(data.paymentMethod || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
        String(data.paymentMethod || '').toLowerCase().includes('tpa') || String(data.paymentMethod || '').toLowerCase().includes('express') || String(data.paymentMethod || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
      );

      // Registra recebimento do contrato nos pagamentos
      contractPayment = {
        id: Math.max(0, ...payments.map((p) => Number(p.id) || 0)) + 1,
        clientId: nextId,
        clientName: newClient.fullName,
        amount: contractAmount,
        penalty: 0,
        total: contractAmount,
        paymentMonth: currentMonthStr,
        referenceMonth: currentMonthStr,
        paidAt: now.toISOString(),
        method: data.paymentMethod || 'Numerário / Balcão',
        reference: contractReceiptRef,
        receiptNumber: contractReceiptRef,
        serviceType: sType,
        movementType: 'adesao_contrato', // Contabilizado à parte das mensalidades!
        notes: `Valor de contrato de adesão ${newClient.code} (${newClient.fullName})`,
        operator: session()?.username || 'deezy',
        accountId: targetAdesaoAccId,
      };
      payments = [contractPayment, ...payments];
      save('payments', payments);
    }

    // 2. Se optou por PAGAR OS DIAS RESTANTES (pró-rata a 150 Kz/dia) - apenas para nova adesão
    if (!isExisting && remainingDaysChoice === 'pagar_restantes' && remainingDaysAmount > 0) {
      const prorataRef = `REC-PRORATA-${Date.now().toString().slice(-5)}`;
      const targetAdesaoAccId = data.accountId || (
        String(data.paymentMethod || '').toLowerCase().includes('bai') ? 'acc-bai' :
        String(data.paymentMethod || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
        String(data.paymentMethod || '').toLowerCase().includes('tpa') || String(data.paymentMethod || '').toLowerCase().includes('express') || String(data.paymentMethod || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
      );
      const prorataPayment = {
        id: Math.max(0, ...payments.map((p) => Number(p.id) || 0)) + 1,
        clientId: nextId,
        clientName: newClient.fullName,
        amount: remainingDaysAmount,
        penalty: 0,
        total: remainingDaysAmount,
        paymentMonth: currentMonthStr,
        referenceMonth: currentMonthStr,
        paidAt: now.toISOString(),
        method: data.paymentMethod || 'Numerário / Balcão',
        reference: prorataRef,
        receiptNumber: prorataRef,
        serviceType: sType,
        movementType: 'prorata_dias_restantes',
        notes: `Liquidação de ${remainingDaysCount} dias restantes do mês atual (${dailyPrice} Kz/dia). Próxima mensalidade cobrirá ${nextMonthStr}.`,
        operator: session()?.username || 'deezy',
        accountId: targetAdesaoAccId,
      };
      payments = [prorataPayment, ...payments];
      save('payments', payments);
    }

    // 3. Se houve TAXA DE INSTALAÇÃO URGENTE (+2.000 Kz)
    if (!isExisting && isUrgent && urgentFee > 0 && urgentTechName) {
      const urgentExpense = {
        id: Math.max(0, ...expenses.map((e) => e.id)) + 1,
        date: now.toISOString().slice(0, 10),
        amount: urgentFee,
        category: 'operacional',
        subCategory: 'comissao_urgencia',
        reason: `Taxa de Instalação Urgente entregue em mão ao Técnico ${urgentTechName} (Cliente ${newClient.code} - ${newClient.fullName})`,
        supplier: urgentTechName,
        beneficiaryTechnicianId: urgentTechId,
        beneficiaryTechnicianName: urgentTechName,
        paymentMethod: 'numerario',
        account: 'Fundo de Maneio de Piquete Técnico',
        accountId: 'acc-piquete',
        documentNumber: `URG-${Date.now().toString().slice(-6)}`,
        status: 'pago',
        operator: session()?.username || 'deezy',
      };
      expenses = [urgentExpense, ...expenses];
      save('expenses', expenses);

      try {
        addSystemNotification({
          title: `⚡ Taxa de Instalação Urgente: ${urgentFee.toLocaleString()} Kz`,
          message: `O técnico ${urgentTechName} recebeu 2.000 Kz da taxa urgente de instalação do cliente ${newClient.fullName} (${newClient.address}). Valor entregue na hora.`,
          type: 'sistema',
          priority: 'alta',
          link: '/contas',
        });
      } catch {}
    }

    // 4. PROCESSAMENTO DO HISTÓRICO DE 3 MESES PARA CLIENTE EXISTENTE
    if (isExisting && existingHistory.length > 0) {
      // Ordena por competência cronológica crescente
      const sortedHistory = [...existingHistory].sort((a, b) => String(a.month).localeCompare(String(b.month)));
      let latestPaidDate: string | null = null;
      let latestPaidAmount = 0;
      let currentMonthPending = false;
      let hasAnyPending = false;
      let allPending = true;

      for (const item of sortedHistory) {
        const itemMonth = item.month || currentMonthStr;
        const itemStatus = item.status || 'pago'; // 'pago' | 'pendente' | 'isento'
        const itemAmount = Number(item.amount !== undefined && item.amount !== '' ? item.amount : monthlyPrice);
        const itemPenalty = Number(item.penalty || 0);
        const itemTotal = itemAmount + itemPenalty;
        const itemMethod = item.method || 'Multicaixa Express';
        const itemAccId = item.accountId || (
          String(itemMethod).toLowerCase().includes('bai') ? 'acc-bai' :
          String(itemMethod).toLowerCase().includes('bfa') ? 'acc-bfa' :
          String(itemMethod).toLowerCase().includes('tpa') || String(itemMethod).toLowerCase().includes('express') || String(itemMethod).toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
        );
        const itemPaidAt = item.paidAt
          ? (item.paidAt.includes('T') ? item.paidAt : `${item.paidAt}T12:00:00.000Z`)
          : `${itemMonth}-05T12:00:00.000Z`;
        const itemImpactTreasury = Boolean(item.impactTreasury);

        if (itemStatus === 'pago') {
          allPending = false;
          latestPaidDate = itemPaidAt;
          latestPaidAmount = itemTotal;

          const recRef = (item.reference && String(item.reference).trim())
            ? String(item.reference).trim()
            : `MIG-${itemMonth.replace('-', '')}-${String(nextId).padStart(4, '0')}`;

          const histPayment = {
            id: Math.max(0, ...payments.map((p) => Number(p.id) || 0)) + 1,
            clientId: nextId,
            client_id: nextId,
            clientName: newClient.fullName,
            client_name: newClient.fullName,
            amount: itemAmount,
            penalty: itemPenalty,
            total: itemTotal,
            expectedAmount: monthlyPrice,
            isPartial: itemAmount < monthlyPrice,
            remainingBalance: Math.max(0, monthlyPrice - itemAmount),
            paymentMonth: itemMonth,
            payment_month: itemMonth,
            referenceMonth: itemMonth,
            reference_month: itemMonth,
            paidAt: itemPaidAt,
            paid_at: itemPaidAt,
            method: itemMethod,
            reference: recRef,
            receiptNumber: recRef,
            receipt_number: recRef,
            serviceType: sType,
            service_type: sType,
            operator: session()?.username || 'deezy',
            accountId: itemAccId,
            movementType: itemImpactTreasury ? 'mensalidade' : 'historico_migracao_sem_caixa',
            isHistoricalOnly: !itemImpactTreasury,
            notes: item.notes || `Histórico de migração - Mensalidade de ${itemMonth}`,
          };
          payments = [histPayment, ...payments];
          save('payments', payments);

          const invNum = `FR-${itemMonth.replace('-', '')}/${String(nextId).padStart(4, '0')}`;
          const histInvoice = {
            id: Math.max(0, ...invoices.map((inv) => Number(inv.id) || 0)) + 1,
            invoiceNumber: invNum,
            reference: recRef,
            clientId: nextId,
            clientName: newClient.fullName,
            serviceType: sType,
            referenceMonth: itemMonth,
            movementType: 'mensalidade',
            issueDate: itemPaidAt.slice(0, 10),
            dueDate: `${itemMonth}-05`,
            paymentDate: itemPaidAt.slice(0, 10),
            amount: itemAmount,
            penalty: itemPenalty,
            total: itemTotal,
            status: 'paga',
            paymentMethod: itemMethod,
            amountPaid: itemTotal,
            operator: session()?.username || 'deezy',
            items: [
              {
                description: `Mensalidade ${itemMonth} (${planName}) - Regularização Histórica`,
                quantity: 1,
                unitPrice: itemAmount,
                total: itemAmount,
              },
            ],
          };
          invoices = [histInvoice, ...invoices];
          save('invoices', invoices);

          syncMutationToCloud({
            module: 'pagamentos',
            action: 'create',
            entity: 'Pagamento',
            description: `Histórico de pagamento (${itemMonth}): ${itemTotal} Kz (${newClient.fullName})`,
            payload: histPayment,
          });

          syncMutationToCloud({
            module: 'fecho',
            action: 'create',
            entity: 'Factura',
            description: `Factura ${invNum} regularizada para ${newClient.fullName}`,
            payload: histInvoice,
          });
        } else if (itemStatus === 'pendente') {
          hasAnyPending = true;
          if (itemMonth === currentMonthStr) {
            currentMonthPending = true;
          }
          const pendInvNum = `FT-${itemMonth.replace('-', '')}/${String(nextId).padStart(4, '0')}`;
          const pendInvoice = {
            id: Math.max(0, ...invoices.map((inv) => Number(inv.id) || 0)) + 1,
            invoiceNumber: pendInvNum,
            reference: `PEND-${itemMonth.replace('-', '')}-${String(nextId).padStart(4, '0')}`,
            clientId: nextId,
            clientName: newClient.fullName,
            serviceType: sType,
            referenceMonth: itemMonth,
            movementType: 'mensalidade',
            issueDate: now.toISOString().slice(0, 10),
            dueDate: `${itemMonth}-05`,
            paymentDate: null,
            amount: itemAmount,
            penalty: itemPenalty,
            total: itemTotal,
            status: 'pendente',
            paymentMethod: null,
            amountPaid: 0,
            operator: session()?.username || 'deezy',
            items: [
              {
                description: `Mensalidade ${itemMonth} (${planName}) - Em Dívida`,
                quantity: 1,
                unitPrice: itemAmount,
                total: itemAmount,
              },
            ],
          };
          invoices = [pendInvoice, ...invoices];
          save('invoices', invoices);

          syncMutationToCloud({
            module: 'fecho',
            action: 'create',
            entity: 'Factura',
            description: `Factura pendente ${pendInvNum} de ${itemMonth} para ${newClient.fullName}`,
            payload: pendInvoice,
          });
        }
      }

      // Define estado final do assinante
      // Se o mês atual estiver pendente ou se todos estiverem pendentes, fica 'late' (em atraso/corte); caso contrário 'active'
      const determinedStatus = allPending ? 'suspended' : (currentMonthPending || hasAnyPending) ? 'late' : 'active';
      newClient.status = determinedStatus;
      if (latestPaidDate) {
        newClient.lastPaymentDate = latestPaidDate;
        newClient.lastPaymentAmount = latestPaidAmount;
      }
    }

    // Salva clientes com status final atualizado
    clients = [newClient, ...clients];
    save('clients', clients);

    // Atualiza saldos da tesouraria
    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);

    // Sincroniza cliente e contrato
    syncMutationToCloud({
      module: 'clientes',
      action: 'create',
      entity: 'Cliente',
      description: `Registo de cliente ${isExisting ? '(Migração Base)' : ''}: ${newClient.fullName} (${code})`,
      payload: newClient,
    });

    syncMutationToCloud({
      module: 'clientes',
      action: 'create',
      entity: 'Contrato',
      description: `Contrato: ${newContract.contractNumber} (${newClient.fullName})`,
      payload: newContract,
    });

    if (contractInvoice) {
      syncMutationToCloud({
        module: 'fecho',
        action: 'create',
        entity: 'Factura',
        description: `Factura de adesão: ${contractInvoice.invoiceNumber} (${contractAmount} Kz)`,
        payload: contractInvoice,
      });
    }

    if (contractPayment) {
      syncMutationToCloud({
        module: 'pagamentos',
        action: 'create',
        entity: 'Pagamento',
        description: `Pagamento de adesão ao contrato: ${contractAmount} Kz (${newClient.fullName})`,
        payload: contractPayment,
      });
    }

    if (!isExisting && remainingDaysChoice === 'pagar_restantes' && remainingDaysAmount > 0) {
      const prorataPay = payments.find((p) => p.clientId === nextId && p.movementType === 'prorata_dias_restantes');
      if (prorataPay) {
        syncMutationToCloud({
          module: 'pagamentos',
          action: 'create',
          entity: 'Pagamento',
          description: `Liquidação de dias restantes: ${remainingDaysAmount} Kz (${newClient.fullName})`,
          payload: prorataPay,
        });
      }
    }

    if (!isExisting && isUrgent && urgentFee > 0 && urgentTechName) {
      const urgExp = expenses.find((e) => e.subCategory === 'comissao_urgencia' && e.beneficiaryTechnicianName === urgentTechName);
      if (urgExp) {
        syncMutationToCloud({
          module: 'despesas',
          action: 'create',
          entity: 'Despesa',
          description: `Taxa de urgência entregue ao técnico ${urgentTechName}: ${urgentFee} Kz`,
          payload: urgExp,
        });
      }
    }

    try {
      window.dispatchEvent(new CustomEvent('osdel-clients-updated', { detail: newClient }));
      window.dispatchEvent(new CustomEvent('osdel-contracts-updated', { detail: newContract }));
      window.dispatchEvent(new CustomEvent('osdel-payments-updated'));
      window.dispatchEvent(new CustomEvent('osdel-invoices-updated'));
    } catch {}

    try {
      addSystemNotification({
        title: isExisting ? `Cliente Existente Migrado: ${newClient.fullName}` : `Novo Cliente: ${newClient.fullName}`,
        message: isExisting
          ? `Cliente ${code} migrado com sucesso com histórico de 3 meses. Situação: ${newClient.status === 'active' ? 'Ativo / Regularizado' : 'Em Atraso / Pendente'}.`
          : `Cliente ${code} cadastrado no serviço ${newClient.serviceType === 'combo' ? 'TV + Internet Fibra' : newClient.serviceType === 'internet' ? 'Internet Fibra' : 'TV'} (${newClient.address}). Contrato: ${contractAmount.toLocaleString()} Kz.`,
        type: 'sistema',
        priority: 'normal',
        link: `/clientes/${newClient.id}`,
      });
    } catch {}

    return { client: newClient, contract: newContract };
  });

export const useUpdateClient = () =>
  mutation((args: any) => {
    const clientId = Number(args?.clientId ?? args?.id ?? args?.data?.clientId ?? args?.data?.id);
    const data = args?.data ? args.data : args;

    // Validação estrita de não duplicação: Nome e Bilhete (NIF)
    const duplicateCheck = checkClientDuplicate({
      fullName: data.fullName || data.full_name,
      documentNumber: data.documentNumber || data.document_number || data.nif,
      excludeClientId: clientId,
    });
    if (duplicateCheck.isDuplicate) {
      throw new Error(duplicateCheck.message);
    }

    clients = clients.map((c) => (c.id === clientId ? { ...c, ...data } : c));
    save('clients', clients);

    // Cascade sync client name, phone and address across invoices, payments, service orders and credentials
    if (data.fullName || data.phone || data.address || data.pdoNumber || data.onuNumber) {
      if (data.fullName) {
        let invoicesChanged = false;
        invoices = invoices.map((inv) => {
          if (inv.clientId === clientId || String(inv.clientId) === String(clientId)) {
            invoicesChanged = true;
            return { ...inv, clientName: data.fullName };
          }
          return inv;
        });
        if (invoicesChanged) save('invoices', invoices);

        let paymentsChanged = false;
        payments = payments.map((p) => {
          if (p.clientId === clientId || String(p.clientId) === String(clientId)) {
            paymentsChanged = true;
            return { ...p, clientName: data.fullName };
          }
          return p;
        });
        if (paymentsChanged) save('payments', payments);
      }

      let ordersChanged = false;
      serviceOrders = serviceOrders.map((so) => {
        if (so.clientId === clientId || String(so.clientId) === String(clientId)) {
          ordersChanged = true;
          return {
            ...so,
            ...(data.fullName ? { clientName: data.fullName } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
            ...(data.address ? { address: data.address } : {}),
            ...(data.pdoNumber ? { pdoBox: data.pdoNumber } : {}),
          };
        }
        return so;
      });
      if (ordersChanged) save('service_orders', serviceOrders);

      // Sincroniza credenciais móveis do cliente
      try {
        const rawCreds = localStorage.getItem('osdel_client_credentials');
        if (rawCreds) {
          const creds = JSON.parse(rawCreds);
          if (creds[clientId]) {
            creds[clientId] = {
              ...creds[clientId],
              ...(data.fullName ? { clientName: data.fullName } : {}),
              ...(data.phone ? { phone: data.phone } : {}),
            };
            localStorage.setItem('osdel_client_credentials', JSON.stringify(creds));
            window.dispatchEvent(new CustomEvent('osdel-client-creds-updated', { detail: { clientId } }));
          }
        }
      } catch {}
    }

    // Sincroniza em cascata alterações de dados e termos no contrato do cliente
    let contractsChanged = false;
    contracts = contracts.map((c) => {
      if (Number(c.clientId || c.client_id) === clientId) {
        contractsChanged = true;
        return normalizeContract({
          ...c,
          ...(data.fullName ? { clientName: data.fullName } : {}),
          ...(data.planName ? { planName: data.planName } : {}),
          ...(data.planSpeed ? { planSpeed: data.planSpeed, speed: data.planSpeed } : {}),
          ...(data.monthlyFee !== undefined ? { monthlyFee: Number(data.monthlyFee), monthlyPrice: Number(data.monthlyFee) } : {}),
          ...(data.monthlyPrice !== undefined ? { monthlyFee: Number(data.monthlyPrice), monthlyPrice: Number(data.monthlyPrice) } : {}),
          ...(data.tvPoints !== undefined ? { tvPoints: Number(data.tvPoints), extraTvs: Math.max(0, Number(data.tvPoints) - 1) } : {}),
          ...(data.remainingDaysChoice ? { remainingDaysChoice: data.remainingDaysChoice } : {}),
          ...(data.remainingDaysCount !== undefined ? { remainingDaysCount: Number(data.remainingDaysCount), prorataDays: Number(data.remainingDaysCount) } : {}),
          ...(data.remainingDaysAmount !== undefined ? { remainingDaysAmount: Number(data.remainingDaysAmount), prorataAmount: Number(data.remainingDaysAmount) } : {}),
          ...(data.accountId ? { accountId: data.accountId, account_id: data.accountId } : {}),
          ...(data.accountName ? { accountName: data.accountName } : {}),
          ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
        });
      }
      return c;
    });
    if (contractsChanged) {
      save('contracts', contracts);
      try {
        window.dispatchEvent(new CustomEvent('osdel-contracts-updated'));
      } catch {}
    }

    try {
      localStorage.setItem('osdel_clients', JSON.stringify(clients));
    } catch {}

    enqueueSyncMutation({
      module: 'clientes',
      action: 'update',
      entity: 'Cliente',
      description: `Actualização de dados do cliente #${clientId}: ${data.fullName || ''}`,
      payload: { clientId, ...data },
    });

    pushActivityDirectToCloud({
      module: 'clientes',
      action: 'update',
      entity: 'Cliente',
      description: `Actualização de dados do cliente #${clientId}: ${data.fullName || ''}`,
      payload: { clientId, ...data },
    });
    return clients.find((c) => c.id === clientId);
  });

export const useCreateContract = () =>
  mutation(({ clientId, data }) => {
    const item = normalizeContract({
      ...data,
      id: Math.max(0, ...contracts.map((c) => c.id)) + 1,
      clientId,
      client_id: clientId,
      code: data?.code || data?.contractNumber || `CT-${new Date().getFullYear()}/${String(clientId).padStart(5, '0')}`,
      contractNumber: data?.contractNumber || data?.code || `CT-${new Date().getFullYear()}/${String(clientId).padStart(5, '0')}`,
      status: data?.status || 'active',
      startDate: data?.startDate || new Date().toISOString().slice(0, 10),
    });
    contracts = [item, ...contracts];
    save('contracts', contracts);
    syncMutationToCloud({
      module: 'clientes',
      action: 'create',
      entity: 'Contrato',
      description: `Novo contrato ${item.contractNumber || item.code} (Cliente #${clientId})`,
      payload: item,
    });
    try {
      window.dispatchEvent(new CustomEvent('osdel-contracts-updated', { detail: item }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'CONTRACT_CREATED', contract: item });
        bc.close();
      }
    } catch {}
    return item;
  });

export const useUpdateContract = () =>
  mutation((args: any) => {
    const contractId = Number(args?.contractId ?? args?.id ?? args?.data?.contractId ?? args?.data?.id);
    const data = args?.data ? args.data : args;
    let updatedContract: any = null;
    contracts = contracts.map((c) => {
      if (Number(c.id) === contractId || String(c.id) === String(contractId)) {
        updatedContract = normalizeContract({ ...c, ...data });
        return updatedContract;
      }
      return c;
    });
    save('contracts', contracts);
    if (updatedContract) {
      syncMutationToCloud({
        module: 'clientes',
        action: 'update',
        entity: 'Contrato',
        description: `Contrato ${updatedContract.contractNumber || updatedContract.code} atualizado (${updatedContract.clientName || ''})`,
        payload: updatedContract,
      });
      try {
        window.dispatchEvent(new CustomEvent('osdel-contracts-updated', { detail: updatedContract }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('osdel_sync_channel');
          bc.postMessage({ type: 'CONTRACT_UPDATED', contract: updatedContract });
          bc.close();
        }
      } catch {}
    }
    return updatedContract;
  });

export const useCreatePayment = () =>
  mutation((args: any) => {
    const data = args?.data ? args.data : args;
    const currentDay = new Date().getDate();
    const dueDay = Number(settings.paymentDueDay ?? 5);
    const isLate = currentDay > dueDay;
    const defaultPenalty = isLate ? Number(settings.latePenalty ?? 1000) : 0;
    const penalty = data.penalty !== undefined ? Number(data.penalty) : defaultPenalty;

    const sessionUser = session();
    const operator = sessionUser?.username || sessionUser?.name || 'deezy';

    const clientIdNum = Number(data.clientId || data.client_id || 0);
    const targetClient = clients.find((c) => Number(c.id) === clientIdNum);

    const clientService = targetClient?.serviceType || targetClient?.service_type || 'internet';
    const sType = data.serviceType || data.service_type || clientService;
    const paymentMonth = data.paymentMonth || data.payment_month || data.referenceMonth || data.reference_month || new Date().toISOString().slice(0, 7);
    const reference = (data.reference || data.receiptNumber || data.receipt_number || '').trim();

    // =========================================================================
    // BLOQUEIO RIGOROSO DE DUPLICADOS (Por Referência Bancária e por Mês do Cliente)
    // =========================================================================
    // 1. Bloqueio por Referência Bancária / Comprovativo existente
    if (reference && !reference.startsWith('REC-AUTO-')) {
      const cleanRef = reference.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanRef.length >= 4) {
        const duplicateByRef = payments.find((p) => {
          const pRef = String(p.reference || p.receiptNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return pRef.length >= 4 && pRef === cleanRef;
        });
        if (duplicateByRef) {
          throw new Error(
            `Operação Bloqueada: A referência/comprovativo "${reference}" já foi registada anteriormente no recibo #${duplicateByRef.id} em ${duplicateByRef.paidAt?.slice(0, 10) || 'data anterior'} (${duplicateByRef.clientName || 'Assinante'}). Não é permitido duplicar recebimentos.`
          );
        }
      }
    }

    const expectedMonthly = Number(targetClient?.monthlyPrice || targetClient?.monthlyFee || (sType === 'tv' ? (settings.tvMonthlyPrice ?? 4000) : 6500));

    // 2. Bloqueio por Mês/Competência do Cliente (permite amortização de pagamentos parciais, mas bloqueia se já quitado integralmente)
    if (clientIdNum > 0 && paymentMonth) {
      const monthPayments = payments.filter((p) => {
        const pClientId = Number(p.clientId || p.client_id);
        const pMonth = p.paymentMonth || p.payment_month || p.referenceMonth || (p.paidAt ? p.paidAt.slice(0, 7) : '');
        const isContractFeeOnly = p.movementType === 'adesao_contrato';
        return pClientId === clientIdNum && pMonth === paymentMonth && !isContractFeeOnly;
      });

      const alreadyPaidForMonth = monthPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      const isAlreadyFullyPaid = monthPayments.length > 0 && alreadyPaidForMonth >= expectedMonthly;

      if (isAlreadyFullyPaid && !data.allowMultipleSameMonth) {
        throw new Error(
          `Operação Bloqueada: O cliente ${targetClient?.fullName || `#${clientIdNum}`} já possui a mensalidade de ${paymentMonth} totalmente quitada (${alreadyPaidForMonth.toLocaleString()} Kz pagos no recibo #${monthPayments[0].id}). Caso deseje regularizar outro mês, selecione a competência correcta.`
        );
      }
    }

    const finalReference = reference || `REC-${Date.now().toString().slice(-6)}`;
    const paidAt = data.paidAt ? (data.paidAt.includes('T') ? data.paidAt : `${data.paidAt}T12:00:00.000Z`) : new Date().toISOString();
    const amount = Number(data.amount !== undefined && data.amount !== '' ? data.amount : expectedMonthly);

    // Considera amortizações acumuladas do mesmo mês
    const alreadyPaid = payments
      .filter((p) => {
        const pClientId = Number(p.clientId || p.client_id);
        const pMonth = p.paymentMonth || p.payment_month || p.referenceMonth || (p.paidAt ? p.paidAt.slice(0, 7) : '');
        return pClientId === clientIdNum && pMonth === paymentMonth && p.movementType !== 'adesao_contrato';
      })
      .reduce((acc, p) => acc + Number(p.amount || 0), 0);

    const totalAccumulatedForMonth = alreadyPaid + amount;
    const isPartial = totalAccumulatedForMonth < expectedMonthly && totalAccumulatedForMonth > 0;
    const remainingBalance = isPartial ? Math.max(0, expectedMonthly - totalAccumulatedForMonth) : 0;
    const totalReceived = amount + Number(penalty || 0);

    // Gestão de Tesouraria em Tempo Real: Determinar conta financeira de destino
    let targetAccId = data.accountId || data.account_id;
    if (!targetAccId) {
      const m = String(data.method || '').toLowerCase();
      if (m.includes('bai') || m.includes('transfer')) targetAccId = 'acc-bai';
      else if (m.includes('bfa')) targetAccId = 'acc-bfa';
      else if (m.includes('multi') || m.includes('tpa') || m.includes('express')) targetAccId = 'acc-tpa';
      else targetAccId = 'acc-caixa';
    }

    const item = {
      ...data,
      id: Math.max(0, ...payments.map((p) => Number(p.id) || 0)) + 1,
      clientId: clientIdNum,
      client_id: clientIdNum,
      clientName: targetClient?.fullName || data.clientName || data.client_name || 'Assinante',
      client_name: targetClient?.fullName || data.clientName || data.client_name || 'Assinante',
      amount,
      penalty,
      total: totalReceived,
      expectedAmount: expectedMonthly,
      isPartial,
      remainingBalance,
      paymentMonth,
      payment_month: paymentMonth,
      referenceMonth: paymentMonth,
      reference_month: paymentMonth,
      paidAt,
      paid_at: paidAt,
      method: data.method || 'Multicaixa Express',
      reference: finalReference,
      receiptNumber: finalReference,
      receipt_number: finalReference,
      serviceType: sType,
      service_type: sType,
      operator,
      accountId: targetAccId,
      notes: data.notes || (isPartial ? `Pagamento parcial. Saldo pendente: ${remainingBalance.toLocaleString()} Kz` : ''),
    };

    payments = [item, ...payments];
    // Reactivate client on payment
    clients = clients.map((c) => (Number(c.id) === clientIdNum ? {
      ...c,
      status: isPartial ? 'late' : 'active',
      lastPaymentDate: paidAt,
      lastPaymentAmount: totalReceived,
      partialDue: isPartial ? remainingBalance : 0,
    } : c));
    save('payments', payments);
    save('clients', clients);

    // Se foi pagamento parcial, gera lembrete prioritário no sistema para cliente e colaboradores da empresa!
    if (isPartial) {
      try {
        addSystemNotification({
          title: `⚠️ Pagamento Parcial: ${targetClient?.fullName || `Cliente #${clientIdNum}`}`,
          message: `O cliente pagou ${amount.toLocaleString()} Kz da mensalidade de ${expectedMonthly.toLocaleString()} Kz (${paymentMonth}). Saldo remanescente de ${remainingBalance.toLocaleString()} Kz por cobrar.`,
          type: 'cobranca',
          priority: 'alta',
          link: `/clientes/${clientIdNum}`,
        });
      } catch {}

      // Lança mensagem interna de alerta de cobrança
      const newMsg = {
        id: Math.max(0, ...messages.map((m) => m.id)) + 1,
        sender: 'Sistema Financeiro (Gestão X)',
        audience: 'Equipa Comercial & Balcão',
        channel: 'alerta_cobranca',
        message: `Lembrete de Cobrança: O cliente ${targetClient?.fullName} (#${targetClient?.code}) liquidou apenas ${amount.toLocaleString()} Kz da mensalidade de ${paymentMonth}. Restam ${remainingBalance.toLocaleString()} Kz a regularizar.`,
        createdAt: new Date().toISOString(),
        operator,
        status: 'enviada',
      };
      messages = [newMsg, ...messages];
      save('messages', messages);
    }

    // Gestão de Tesouraria em Tempo Real: Atualizar saldos matematicamente exactos
    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);

    // Se houver fatura vinculada ou pendente para o cliente, liquida automaticamente
    let invoiceSettled = false;
    invoices = invoices.map((inv) => {
      const matchInvoiceId = data.invoiceId && (inv.id === data.invoiceId || String(inv.id) === String(data.invoiceId));
      const matchRef = data.reference && (inv.invoiceNumber === data.reference || inv.reference === data.reference);
      const matchMonth = Number(inv.clientId) === clientIdNum && inv.referenceMonth === paymentMonth && inv.status !== 'paga';
      if (matchInvoiceId || matchRef || matchMonth) {
        invoiceSettled = true;
        return {
          ...inv,
          status: 'paga',
          paymentDate: paidAt.slice(0, 10),
          paymentMethod: item.method || 'Multicaixa Express',
          amountPaid: totalReceived,
        };
      }
      return inv;
    });

    // Se não havia fatura para este pagamento, cria a fatura/recibo automaticamente para histórico fiscal 100% íntegro
    if (!invoiceSettled && clientIdNum > 0) {
      const invNum = `FT-${new Date().getFullYear()}/${String(invoices.length + 1).padStart(4, '0')}`;
      const newInvoice = {
        id: Math.max(0, ...invoices.map((inv) => Number(inv.id) || 0)) + 1,
        invoiceNumber: invNum,
        reference: reference,
        clientId: clientIdNum,
        clientName: targetClient?.fullName || 'Assinante',
        serviceType: sType,
        referenceMonth: paymentMonth,
        issueDate: paidAt.slice(0, 10),
        dueDate: paidAt.slice(0, 10),
        paymentDate: paidAt.slice(0, 10),
        amount,
        penalty,
        total: totalReceived,
        status: 'paga',
        paymentMethod: item.method || 'Multicaixa Express',
        amountPaid: totalReceived,
        operator,
        items: [
          {
            description: `Mensalidade ${sType === 'tv' ? 'TV Comunitária por Cabo' : 'Internet Fibra Óptica FTTH'} - ${paymentMonth}`,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
          ...(penalty > 0 ? [{
            description: 'Taxa / Multa por regularização após vencimento',
            quantity: 1,
            unitPrice: penalty,
            total: penalty,
          }] : []),
        ],
      };
      invoices = [newInvoice, ...invoices];
      syncMutationToCloud({
        module: 'fecho',
        action: 'create',
        entity: 'Factura',
        description: `Factura gerada automaticamente: ${newInvoice.invoiceNumber} (${money(newInvoice.total)})`,
        payload: newInvoice,
      });
    } else if (invoiceSettled && clientIdNum > 0) {
      const settledInv = invoices.find((inv) => {
        const matchInvoiceId = data.invoiceId && (inv.id === data.invoiceId || String(inv.id) === String(data.invoiceId));
        const matchRef = data.reference && (inv.invoiceNumber === data.reference || inv.reference === data.reference);
        const matchMonth = Number(inv.clientId) === clientIdNum && inv.referenceMonth === paymentMonth;
        return matchInvoiceId || matchRef || matchMonth;
      });
      if (settledInv) {
        syncMutationToCloud({
          module: 'fecho',
          action: 'update',
          entity: 'Factura',
          description: `Factura ${settledInv.invoiceNumber} liquidada`,
          payload: settledInv,
        });
      }
    }
    save('invoices', invoices);

    logAuditAction({
      action: 'REGISTAR_PAGAMENTO',
      module: 'Tesouraria',
      description: `Pagamento recebido de ${money(totalReceived)} (${item.method}) do cliente #${clientIdNum} (${targetClient?.fullName || 'Assinante'}) creditado em ${targetAccId}`,
      targetId: reference,
      user: operator,
    });

    enqueueSyncMutation({
      module: 'pagamentos',
      action: 'create',
      entity: 'Pagamento',
      description: `Pagamento recebido: ${item.amount} Kz (Cliente #${clientIdNum}) creditado em ${targetAccId}`,
      payload: item,
    });

    pushActivityDirectToCloud({
      module: 'pagamentos',
      action: 'create',
      entity: 'Pagamento',
      description: `Pagamento recebido: ${item.amount} Kz (Cliente #${clientIdNum}) creditado em ${targetAccId}`,
      payload: item,
    });

    try {
      addSystemNotification({
        title: `Pagamento Registado: ${money(totalReceived)}`,
        message: `Recebimento confirmado do cliente ${targetClient?.fullName || 'Assinante'} (${targetClient?.code || ''}) via ${item.method}. Dinheiro creditado na conta de tesouraria (${targetAccId}) e sinal regularizado.`,
        type: 'financeiro',
        priority: 'normal',
        link: `/clientes/${clientIdNum}`,
      });
      window.dispatchEvent(new CustomEvent('osdel-payments-updated', { detail: item }));
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      window.dispatchEvent(new CustomEvent('osdel-invoices-updated'));
      window.dispatchEvent(new CustomEvent('osdel-clients-updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'PAYMENT_RECEIVED', payment: item, targetAccount: targetAccId });
        bc.close();
      }
    } catch {}

    return item;
  });

export const usePayInvoice = () =>
  mutation(({ invoiceId, method = 'Multicaixa Express', accountId }: { invoiceId: any; method?: string; accountId?: string }) => {
    const sessionUser = session();
    let paidInvoice: any = null;

    invoices = invoices.map((inv) => {
      if (inv.id === invoiceId || String(inv.id) === String(invoiceId) || inv.invoiceNumber === invoiceId) {
        paidInvoice = {
          ...inv,
          status: 'paga',
          paymentDate: new Date().toISOString().slice(0, 10),
          paymentMethod: method,
          amountPaid: inv.total || inv.amount,
        };
        return paidInvoice;
      }
      return inv;
    });

    if (paidInvoice) {
      // Reativa cliente
      if (paidInvoice.clientId) {
        clients = clients.map((c) => (Number(c.id) === Number(paidInvoice.clientId) ? { ...c, status: 'active' } : c));
        save('clients', clients);
      }

      // Credita tesouraria
      const payAmount = Number(paidInvoice.total || paidInvoice.amount || 0);
      let targetAccId = accountId;
      if (!targetAccId) {
        const m = method.toLowerCase();
        if (m.includes('bai') || m.includes('transfer')) targetAccId = 'acc-bai';
        else if (m.includes('bfa')) targetAccId = 'acc-bfa';
        else if (m.includes('multi') || m.includes('tpa') || m.includes('express')) targetAccId = 'acc-tpa';
        else targetAccId = 'acc-caixa';
      }

      const clientObj = clients.find((c) => Number(c.id) === Number(paidInvoice.clientId));
      const sType = paidInvoice.serviceType || clientObj?.serviceType || 'internet';
      const pMonth = paidInvoice.referenceMonth || new Date().toISOString().slice(0, 7);

      const newPay = {
        id: Math.max(0, ...payments.map((p) => Number(p.id) || 0)) + 1,
        clientId: Number(paidInvoice.clientId),
        client_id: Number(paidInvoice.clientId),
        clientName: paidInvoice.clientName || clientObj?.fullName || '',
        client_name: paidInvoice.clientName || clientObj?.fullName || '',
        amount: payAmount,
        penalty: Number(paidInvoice.penalty || 0),
        total: payAmount,
        paymentMonth: pMonth,
        payment_month: pMonth,
        referenceMonth: pMonth,
        reference_month: pMonth,
        paidAt: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        method,
        reference: paidInvoice.invoiceNumber || `FT-${paidInvoice.id}`,
        receiptNumber: paidInvoice.invoiceNumber || `FT-${paidInvoice.id}`,
        receipt_number: paidInvoice.invoiceNumber || `FT-${paidInvoice.id}`,
        serviceType: sType,
        service_type: sType,
        operator: sessionUser?.username || 'deezy',
        invoiceId: paidInvoice.id,
        accountId: targetAccId,
      };
      payments = [newPay, ...payments];
      save('payments', payments);
      save('invoices', invoices);

      financialAccounts = computeLiveAccountBalances();
      save('financial_accounts', financialAccounts);

      try {
        window.dispatchEvent(new CustomEvent('osdel-payments-updated', { detail: newPay }));
        window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
        window.dispatchEvent(new CustomEvent('osdel-invoices-updated'));
        window.dispatchEvent(new CustomEvent('osdel-clients-updated'));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('osdel_sync_channel');
          bc.postMessage({ type: 'PAYMENT_RECEIVED', payment: newPay, targetAccount: targetAccId });
          bc.close();
        }
      } catch {}

      syncMutationToCloud({
        module: 'fecho',
        action: 'update',
        entity: 'Factura',
        description: `Factura ${paidInvoice.invoiceNumber} liquidada via ${method}`,
        payload: paidInvoice,
      });

      syncMutationToCloud({
        module: 'pagamentos',
        action: 'create',
        entity: 'Pagamento',
        description: `Pagamento recebido ${money(payAmount)} da fatura ${paidInvoice.invoiceNumber}`,
        payload: newPay,
      });

      logAuditAction({
        action: 'LIQUIDAR_FACTURA',
        module: 'Facturação',
        description: `Factura ${paidInvoice.invoiceNumber} liquidada via ${method} (${money(payAmount)})`,
        targetId: paidInvoice.invoiceNumber,
        user: sessionUser?.username || 'operador',
      });
    }

    return paidInvoice;
  });

export const useUpdateSettings = () =>
  mutation((args: any) => {
    const data = args?.data ? args.data : args;
    const sessionUser = session();
    const role = (sessionUser?.role || '').toLowerCase();
    const isAllowed = role === 'admin' || role === 'superadmin' || role === 'boss' || !sessionUser;
    if (!isAllowed) {
      throw new Error('Acesso negado: Apenas administradores e direcção têm autorização para alterar as definições e parâmetros globais do sistema.');
    }
    settings = { ...settings, ...data };
    save('settings', settings);
    
    // Armazena cópia rápida para os APKs móveis e Electron
    try {
      localStorage.setItem('osdel_company_settings', JSON.stringify(settings));
    } catch {}

    logAuditAction({
      action: 'ATUALIZAR_DEFINICOES',
      module: 'Definições',
      description: 'Alterações efetuadas nas definições da empresa, modelos de faturas/contratos e parâmetros comerciais.',
      user: sessionUser?.username || 'admin',
    });
    enqueueSyncMutation({
      module: 'configuracoes',
      action: 'update',
      entity: 'Definições Globais',
      description: 'Alteração dos parâmetros da empresa, modelos de documentos e preços',
      payload: data,
    });

    // Notificação imediata para Electron, abas ativas e APKs
    try {
      window.dispatchEvent(new CustomEvent('osdel-settings-updated', { detail: settings }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'SETTINGS_UPDATED', settings });
        bc.close();
      }
    } catch (e) {
      // ignore
    }

    return settings;
  });

export const useCreateExpense = () =>
  mutation((args: any) => {
    const data = args?.data ? args.data : args;
    const sessionUser = session();

    // Gestão de Tesouraria em Tempo Real: Associar conta financeira de origem
    const expAmount = Number(data.amount || 0);
    let sourceAccId = data.accountId || data.account_id;
    if (!sourceAccId && data.account) {
      const eAcc = String(data.account).toLowerCase();
      if (eAcc.includes('bai')) sourceAccId = 'acc-bai';
      else if (eAcc.includes('bfa')) sourceAccId = 'acc-bfa';
      else if (eAcc.includes('tpa') || eAcc.includes('multi') || eAcc.includes('express')) sourceAccId = 'acc-tpa';
      else if (eAcc.includes('piquete') || eAcc.includes('fundo')) sourceAccId = 'acc-piquete';
      else {
        const found = financialAccounts.find((a) => a.name === data.account || a.id === data.account);
        sourceAccId = found ? found.id : 'acc-caixa';
      }
    }
    if (!sourceAccId) {
      sourceAccId = 'acc-caixa';
    }

    const accObj = financialAccounts.find((a) => a.id === sourceAccId);
    const accountName = data.account || accObj?.name || 'Caixa Geral (Balcão Golf)';
    const reasonText = data.reason || data.description || 'Despesa Operacional';

    const item = {
      ...data,
      id: Math.max(0, ...expenses.map((e) => Number(e.id) || 0)) + 1,
      amount: expAmount,
      reason: reasonText,
      description: reasonText,
      category: data.category || 'operacional',
      date: data.date ? (String(data.date).length === 10 ? String(data.date) : String(data.date).slice(0, 10)) : new Date().toISOString().slice(0, 10),
      accountId: sourceAccId,
      account_id: sourceAccId,
      account: accountName,
      paymentMethod: data.paymentMethod || data.payment_method || 'Dinheiro',
      payment_method: data.paymentMethod || data.payment_method || 'Dinheiro',
      documentNumber: data.documentNumber || data.document_ref || `EXP-${Date.now().toString().slice(-6)}`,
      document_ref: data.documentNumber || data.document_ref || `EXP-${Date.now().toString().slice(-6)}`,
      supplier: data.supplier || data.beneficiary || 'Fornecedor Geral',
      beneficiary: data.supplier || data.beneficiary || 'Fornecedor Geral',
      status: data.status || 'pago',
      operator: sessionUser?.username || 'deezy',
      createdAt: new Date().toISOString(),
    };

    expenses = [item, ...expenses.filter((e) => e.id !== item.id)];
    save('expenses', expenses);

    // DEDUZ IMEDIATAMENTE O SALDO DA CONTA E RECALCULA TODAS AS CONTAS FINANCEIRAS
    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);

    logAuditAction({
      action: 'REGISTAR_DESPESA',
      module: 'Contabilidade',
      description: `Registada despesa de ${money(item.amount)} debitada da conta ${accountName}: ${item.reason}`,
      targetId: `EXP-${item.id}`,
      user: sessionUser?.username || 'operador',
    });

    enqueueSyncMutation({
      module: 'despesas',
      action: 'create',
      entity: 'despesa',
      description: `Saída de caixa de ${item.amount} Kz: ${item.reason}`,
      payload: item,
    });

    pushActivityDirectToCloud({
      module: 'despesas',
      action: 'create',
      entity: 'despesa',
      description: `Saída de caixa de ${item.amount} Kz: ${item.reason}`,
      payload: item,
    }).catch(() => {});

    try {
      window.dispatchEvent(new CustomEvent('osdel-expenses-updated', { detail: item }));
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      window.dispatchEvent(new CustomEvent('osdel-data-sync', { detail: { key: 'expenses', item } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'EXPENSE_CREATED', expense: item, accountId: sourceAccId });
        bc.close();
      }
    } catch {}

    return item;
  });

export const useCreateMessage = () =>
  mutation(({ data }) => {
    const sessionUser = session();
    const item = {
      ...data,
      id: Math.max(0, ...messages.map((m) => m.id)) + 1,
      createdAt: new Date().toISOString(),
      operator: sessionUser?.username || 'deezy',
      status: 'enviada',
    };
    messages = [item, ...messages];
    save('messages', messages);
    return item;
  });

export const useCreateUser = () =>
  mutation(({ data }) => {
    const sessionUser = session();
    if (!isSuperAdmin(sessionUser)) {
      throw new Error('Apenas o Super Administrador Geral (deezy) pode cadastrar novos colaboradores na equipa.');
    }
    const item = {
      ...data,
      id: Math.max(0, ...users.map((u) => u.id)) + 1,
      active: true,
      schedule: data.schedule || [],
      workStatus: data.workStatus || 'disponivel',
    };
    users = [...users, item];
    save('users', users);

    // Sync with staff credentials for APK and web login
    try {
      const raw = localStorage.getItem('osdel_staff_credentials');
      const staffMap = raw ? JSON.parse(raw) : {};
      staffMap[item.id] = {
        userId: item.id,
        username: item.username || item.name.toLowerCase().replace(/\s+/g, '.'),
        name: item.name,
        role: item.role || 'operador',
        jobTitle: item.jobTitle || 'Colaborador',
        department: item.department || 'Técnico',
        phone: item.phone || '',
        pin: item.pin || '1234',
        password: item.password || 'osdel@2026',
        generatedAt: new Date().toISOString(),
        generatedBy: sessionUser?.name || 'Administrador',
        isActive: true,
      };
      localStorage.setItem('osdel_staff_credentials', JSON.stringify(staffMap));
      window.dispatchEvent(new CustomEvent('osdel-staff-creds-updated', { detail: { userId: item.id } }));
    } catch {}

    logAuditAction({
      action: 'CRIAR_COLABORADOR',
      module: 'Equipa',
      description: `Cadastrado colaborador ${item.name} (${item.jobTitle || item.role})`,
      targetId: `USER-${item.id}`,
      user: sessionUser?.username || 'admin',
    });
    window.dispatchEvent(new CustomEvent('osdel-users-updated', { detail: item }));
    return item;
  });

export const useUpdateUser = () =>
  mutation((args: any) => {
    const userId = Number(args?.userId ?? args?.id ?? args?.data?.userId ?? args?.data?.id);
    const data = args?.data ? args.data : args;
    const sessionUser = session();
    const isSuper = isSuperAdmin(sessionUser);
    const isAdmin = isSuper || sessionUser?.role === 'admin' || sessionUser?.role === 'boss' || !sessionUser;
    if (!isAdmin && sessionUser?.id !== userId) {
      throw new Error('Apenas o Administrador ou o próprio titular pode alterar estes dados de perfil.');
    }
    users = users.map((u) => (u.id === userId ? { ...u, ...data } : u));
    save('users', users);
    const updatedUser = users.find((u) => u.id === userId);

    // Sync immediately with staff credentials storage
    try {
      const raw = localStorage.getItem('osdel_staff_credentials');
      if (raw) {
        const staffMap = JSON.parse(raw);
        let foundKey: any = null;
        for (const [k, v] of Object.entries(staffMap)) {
          if ((v as any).userId === userId || (v as any).username?.toLowerCase() === updatedUser?.username?.toLowerCase()) {
            foundKey = k;
            break;
          }
        }
        if (foundKey && staffMap[foundKey]) {
          staffMap[foundKey] = {
            ...staffMap[foundKey],
            name: updatedUser.name || staffMap[foundKey].name,
            username: updatedUser.username || staffMap[foundKey].username,
            role: updatedUser.role || staffMap[foundKey].role,
            jobTitle: updatedUser.jobTitle || staffMap[foundKey].jobTitle,
            department: updatedUser.department || staffMap[foundKey].department,
            phone: updatedUser.phone || staffMap[foundKey].phone,
            ...(data.pin ? { pin: data.pin } : {}),
            ...(data.password ? { password: data.password } : {}),
          };
          localStorage.setItem('osdel_staff_credentials', JSON.stringify(staffMap));
          window.dispatchEvent(new CustomEvent('osdel-staff-creds-updated', { detail: { userId } }));
        }
      }
    } catch {}

    // Update active session if editing own profile
    if (sessionUser && (sessionUser.id === userId || sessionUser.username === updatedUser?.username) && updatedUser) {
      const updatedSession = {
        ...sessionUser,
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        photoUrl: updatedUser.photoUrl,
        jobTitle: updatedUser.jobTitle,
        phone: updatedUser.phone,
      };
      window.sessionStorage.setItem('osdel-window-session', JSON.stringify(updatedSession));
      window.localStorage.setItem('osdel-session', JSON.stringify(updatedSession));
      window.dispatchEvent(new Event('osdel-auth-changed'));
    }

    logAuditAction({
      action: 'ATUALIZAR_PERFIL_COLABORADOR',
      module: 'Equipa',
      description: `Dados de colaborador atualizados: ${updatedUser?.name} (${updatedUser?.jobTitle || updatedUser?.role})`,
      targetId: `USER-${userId}`,
      user: sessionUser?.username || 'admin',
    });
    window.dispatchEvent(new CustomEvent('osdel-users-updated', { detail: updatedUser }));
    return updatedUser;
  });

export const useUpdateUserWorkStatus = () =>
  mutation(({ userId, workStatus, currentTask }) => {
    users = users.map((u) =>
      u.id === userId
        ? { ...u, workStatus, ...(currentTask !== undefined ? { currentTask } : {}) }
        : u,
    );
    save('users', users);
    window.dispatchEvent(new CustomEvent('osdel-users-updated'));
    return users.find((u) => u.id === userId);
  });

export const useAssignTaskToUserSchedule = () =>
  mutation(({ userId, task }) => {
    const sessionUser = session();
    const newTask = {
      id: `sch-${Date.now()}`,
      time: task.time || '09:00 - 11:00',
      title: task.title,
      clientName: task.clientName || 'Cliente OSDEL',
      location: task.location || 'Luanda',
      priority: task.priority || 'normal',
      status: task.status || 'pendente',
    };
    users = users.map((u) => {
      if (u.id === userId) {
        const schedule = Array.isArray(u.schedule) ? [...u.schedule, newTask] : [newTask];
        return { ...u, schedule };
      }
      return u;
    });
    save('users', users);
    logAuditAction({
      action: 'ATRIBUIR_TAREFA_AGENDA',
      module: 'Equipa',
      description: `Atribuída tarefa "${task.title}" ao colaborador ID ${userId}`,
      targetId: `USER-${userId}`,
      user: sessionUser?.username || 'admin',
    });
    window.dispatchEvent(new CustomEvent('osdel-users-updated'));
    return newTask;
  });

export const useDeleteUser = () =>
  mutation((args: any) => {
    const targetId = Number(args?.userId ?? args?.id ?? args);
    const sessionUser = session();
    if (!isSuperAdmin(sessionUser)) {
      throw new Error('Apenas o Super Administrador Geral (deezy) pode eliminar colaboradores da equipa.');
    }
    
    // Remove da lista de colaboradores para exclusão imediata e efetiva
    const userToDelete = users.find((u) => u.id === targetId);
    if (userToDelete && userToDelete.username?.toLowerCase() === 'deezy') {
      throw new Error('O Super Administrador Supremo (deezy) não pode ser eliminado.');
    }
    users = users.filter((u) => u.id !== targetId);
    save('users', users);

    try {
      localStorage.setItem('osdel_users', JSON.stringify(users));
      localStorage.setItem('osdel:users', JSON.stringify(users));
    } catch {}

    try {
      const raw = localStorage.getItem('osdel_staff_credentials');
      if (raw) {
        const staffMap = JSON.parse(raw);
        delete staffMap[targetId];
        for (const [k, v] of Object.entries(staffMap)) {
          if ((v as any).userId === targetId) {
            delete staffMap[k];
          }
        }
        localStorage.setItem('osdel_staff_credentials', JSON.stringify(staffMap));
        window.dispatchEvent(new CustomEvent('osdel-staff-creds-updated', { detail: { userId: targetId } }));
      }
    } catch {}

    logAuditAction({
      action: 'ELIMINAR_COLABORADOR',
      module: 'Equipa',
      description: `Colaborador ${userToDelete?.name || `ID ${targetId}`} eliminado do quadro de pessoal.`,
      targetId: `USER-${targetId}`,
      user: sessionUser?.username || 'deezy',
    });

    enqueueSyncMutation({
      module: 'configuracoes',
      action: 'delete',
      entity: 'Colaborador',
      description: `Eliminação do colaborador ${userToDelete?.name || `ID ${targetId}`}`,
      payload: { userId: targetId, username: userToDelete?.username },
    });

    pushActivityDirectToCloud({
      module: 'configuracoes',
      action: 'delete',
      entity: 'Colaborador',
      description: `Eliminação do colaborador ${userToDelete?.name || `ID ${targetId}`}`,
      payload: { userId: targetId, username: userToDelete?.username },
    });

    window.dispatchEvent(new CustomEvent('osdel-users-updated', { detail: { deletedId: targetId } }));
    return { success: true, deletedId: targetId };
  });

export const useCreateJobRole = () =>
  mutation(({ data }) => {
    const sessionUser = session();
    if (sessionUser && sessionUser.role !== 'admin') {
      throw new Error('Apenas o Administrador pode cadastrar novos cargos.');
    }
    const newRole: JobRole = {
      ...data,
      id: Math.max(0, ...jobRoles.map((r) => r.id)) + 1,
      isCustom: true,
    };
    jobRoles = [...jobRoles, newRole];
    save('job_roles', jobRoles);
    logAuditAction({
      action: 'CRIAR_CARGO',
      module: 'Equipa',
      description: `Criado novo cargo: ${newRole.title} (${newRole.department})`,
      targetId: `ROLE-${newRole.id}`,
      user: sessionUser?.username || 'admin',
    });
    return newRole;
  });

export const useDeleteJobRole = () =>
  mutation(({ roleId }) => {
    const sessionUser = session();
    if (sessionUser && sessionUser.role !== 'admin') {
      throw new Error('Apenas o Administrador pode remover cargos.');
    }
    jobRoles = jobRoles.filter((r) => r.id !== roleId);
    save('job_roles', jobRoles);
    logAuditAction({
      action: 'REMOVER_CARGO',
      module: 'Equipa',
      description: `Removido cargo ID ${roleId}`,
      targetId: `ROLE-${roleId}`,
      user: sessionUser?.username || 'admin',
    });
    return true;
  });

export const useCreateCashClosure = () =>
  mutation(({ data }) => {
    const sessionUser = session();
    const nextId = Math.max(0, ...cashClosures.map((c) => c.id)) + 1;
    const today = new Date().toISOString().slice(0, 10);
    const closureCode = `FC-${today.replace(/-/g, '')}-${String(nextId).padStart(2, '0')}`;
    const newClosure = {
      ...data,
      id: nextId,
      closureCode,
      date: data.date || today,
      openedAt: data.openedAt || new Date().toISOString(),
      closedAt: new Date().toISOString(),
      operator: sessionUser?.username || 'operador1',
      operatorName: sessionUser?.name || 'Operador',
      status: 'pendente_validacao',
      createdAt: new Date().toISOString(),
    };
    cashClosures = [newClosure, ...cashClosures];
    save('cash_closures', cashClosures);
    logAuditAction({
      action: 'CRIAR_FECHO_CAIXA',
      module: 'Contabilidade',
      description: `Submetido termo de fecho de caixa ${closureCode} pelo operador ${newClosure.operatorName}`,
      targetId: closureCode,
      user: sessionUser?.username || 'operador',
    });

    try {
      enqueueSyncMutation({
        module: 'fecho',
        action: 'create',
        entity: 'fecho_caixa',
        description: `Submetido fecho de caixa: ${closureCode} (${newClosure.operatorName})`,
        payload: newClosure,
      });
      pushActivityDirectToCloud({
        module: 'fecho',
        action: 'create',
        entity: 'fecho_caixa',
        description: `Submetido fecho de caixa: ${closureCode} (${newClosure.operatorName})`,
        payload: newClosure,
      }).catch(() => {});
      window.dispatchEvent(new CustomEvent('osdel-cash-closures-updated', { detail: newClosure }));
    } catch {}

    return newClosure;
  });

export const useValidateCashClosure = () =>
  mutation(({ closureId, notes }) => {
    const sessionUser = session();
    if (sessionUser?.role !== 'admin') {
      throw new Error('Apenas o Administrador Geral tem autorização para validar e homologar fechos de caixa.');
    }
    cashClosures = cashClosures.map((c) => {
      if (c.id === closureId) {
        return {
          ...c,
          status: 'validado_admin',
          validatedBy: sessionUser.username,
          validatedAt: new Date().toISOString(),
          adminNotes: notes || 'Conferido e validado pela Direcção Financeira.',
        };
      }
      return c;
    });
    save('cash_closures', cashClosures);
    logAuditAction({
      action: 'VALIDAR_FECHO_CAIXA',
      module: 'Contabilidade',
      description: `Homologado e carimbado fecho de caixa ID ${closureId} pelo Administrador`,
      targetId: `FC-${closureId}`,
      user: sessionUser.username,
    });

    try {
      const validatedClosure = cashClosures.find((c) => c.id === closureId);
      enqueueSyncMutation({
        module: 'fecho',
        action: 'update',
        entity: 'fecho_caixa',
        description: `Homologado fecho de caixa ID ${closureId}`,
        payload: { id: closureId, status: 'validado_admin', notes, validatedClosure },
      });
      pushActivityDirectToCloud({
        module: 'fecho',
        action: 'update',
        entity: 'fecho_caixa',
        description: `Homologado fecho de caixa ID ${closureId}`,
        payload: { id: closureId, status: 'validado_admin', notes, validatedClosure },
      }).catch(() => {});
      window.dispatchEvent(new CustomEvent('osdel-cash-closures-updated', { detail: validatedClosure }));
    } catch {}

    return cashClosures.find((c) => c.id === closureId);
  });

export const useCreateInvoice = () =>
  mutation((args: any) => {
    const data = args?.data ? args.data : args;
    const sessionUser = session();
    const nextId = Math.max(0, ...invoices.map((i) => i.id)) + 1;
    const year = new Date().getFullYear();
    const isProforma = data.type === 'proforma' || data.documentType === 'proforma';
    const prefix = isProforma ? (settings.proformaPrefix || 'FP') : (settings.invoicePrefix || 'FT');
    const invoiceNumber = data.invoiceNumber || `${prefix}-${year}/${String(nextId).padStart(4, '0')}`;
    const amountVal = Number(data.total !== undefined ? data.total : (data.amount || 0));
    const penaltyVal = Number(data.penalty || 0);
    const isPaid = data.status === 'paga' || data.status === 'liquidada' || (!isProforma && data.status !== 'pendente');
    const clientIdNum = Number(data.clientId || data.client_id || 0);
    const refMonth = data.referenceMonth || data.reference_month || data.paymentMonth || new Date().toISOString().slice(0, 7);

    // =========================================================================
    // BLOQUEIO DE FACTURAS DUPLICADAS (Por Número e por Mês do Cliente)
    // =========================================================================
    // 1. Bloqueio por número de factura já existente
    if (invoices.some((inv) => inv.invoiceNumber && inv.invoiceNumber.toLowerCase() === invoiceNumber.toLowerCase())) {
      throw new Error(`Operação Bloqueada: Já existe uma factura com o número "${invoiceNumber}" registada no sistema.`);
    }

    // 2. Bloqueio de duplicado de mensalidade para o mesmo cliente no mesmo mês
    if (!isProforma && clientIdNum > 0 && refMonth) {
      const existingInv = invoices.find(
        (inv) => Number(inv.clientId) === clientIdNum && inv.referenceMonth === refMonth && inv.status !== 'anulada'
      );
      if (existingInv && !data.allowDuplicateMonth) {
        throw new Error(
          `Operação Bloqueada: Já existe a factura ${existingInv.invoiceNumber} emitida para este cliente no mês ${refMonth} (${existingInv.status === 'paga' ? 'Paga' : 'Pendente'}). Não duplique facturas da mesma competência.`
        );
      }
    }

    const newInvoice = {
      ...data,
      id: nextId,
      invoiceNumber,
      clientId: clientIdNum,
      referenceMonth: refMonth,
      total: amountVal,
      amount: amountVal,
      penalty: penaltyVal,
      status: isPaid ? 'paga' : (data.status || (isProforma ? 'pendente' : 'paga')),
      createdAt: new Date().toISOString(),
      issuedAt: data.issuedAt || new Date().toISOString(),
      operator: data.operator || sessionUser?.name || sessionUser?.username || 'deezy',
    };
    invoices = [newInvoice, ...invoices];
    save('invoices', invoices);

    if (newInvoice.status === 'paga') {
      const targetAccId = data.accountId || (
        String(data.method || data.paymentMethod || '').toLowerCase().includes('bai') ? 'acc-bai' :
        String(data.method || data.paymentMethod || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
        String(data.method || data.paymentMethod || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
      );

      const targetClient = clients.find((c) => Number(c.id) === Number(newInvoice.clientId));
      const sType = newInvoice.serviceType || targetClient?.serviceType || 'internet';
      const pMonth = newInvoice.paymentMonth || newInvoice.referenceMonth || new Date().toISOString().slice(0, 7);

      const newPay = {
        id: Math.max(0, ...payments.map((p) => Number(p.id) || 0)) + 1,
        clientId: Number(newInvoice.clientId),
        client_id: Number(newInvoice.clientId),
        clientName: newInvoice.clientName || targetClient?.fullName || '',
        client_name: newInvoice.clientName || targetClient?.fullName || '',
        amount: amountVal,
        penalty: penaltyVal,
        total: amountVal + penaltyVal,
        paymentMonth: pMonth,
        payment_month: pMonth,
        referenceMonth: pMonth,
        reference_month: pMonth,
        paidAt: newInvoice.issuedAt || new Date().toISOString(),
        paid_at: newInvoice.issuedAt || new Date().toISOString(),
        method: newInvoice.paymentMethod || newInvoice.method || 'Multicaixa Express',
        reference: invoiceNumber,
        receiptNumber: invoiceNumber,
        receipt_number: invoiceNumber,
        serviceType: sType,
        service_type: sType,
        operator: newInvoice.operator,
        invoiceId: newInvoice.id,
        accountId: targetAccId,
      };
      payments = [newPay, ...payments];
      save('payments', payments);

      if (newInvoice.clientId) {
        clients = clients.map((c) => (Number(c.id) === Number(newInvoice.clientId) ? { ...c, status: 'active', lastPaymentDate: newPay.paidAt, lastPaymentAmount: newPay.total } : c));
        save('clients', clients);
      }

      financialAccounts = computeLiveAccountBalances();
      save('financial_accounts', financialAccounts);

      try {
        window.dispatchEvent(new CustomEvent('osdel-payments-updated', { detail: newPay }));
        window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
        window.dispatchEvent(new CustomEvent('osdel-invoices-updated'));
        window.dispatchEvent(new CustomEvent('osdel-clients-updated'));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('osdel_sync_channel');
          bc.postMessage({ type: 'PAYMENT_RECEIVED', payment: newPay, targetAccount: targetAccId });
          bc.close();
        }
      } catch {}
    }

    try {
      localStorage.setItem('osdel_invoices', JSON.stringify(invoices));
      localStorage.setItem('osdel_payments', JSON.stringify(payments));
    } catch {}

    logAuditAction({
      action: 'EMITIR_FACTURA',
      module: 'Facturação',
      description: `Emitido documento ${invoiceNumber} para ${newInvoice.clientName} no valor de ${money(amountVal)}`,
      targetId: invoiceNumber,
      user: sessionUser?.username || 'operador',
    });

    enqueueSyncMutation({
      module: 'fecho',
      action: 'create',
      entity: 'Factura',
      description: `Emitida factura ${invoiceNumber} (${newInvoice.clientName}) no valor de ${amountVal} Kz`,
      payload: newInvoice,
    });

    pushActivityDirectToCloud({
      module: 'fecho',
      action: 'create',
      entity: 'Factura',
      description: `Emitida factura ${invoiceNumber} (${newInvoice.clientName}) no valor de ${amountVal} Kz`,
      payload: newInvoice,
    });

    window.dispatchEvent(new CustomEvent('osdel-invoices-updated', { detail: newInvoice }));
    return newInvoice;
  });

export const useUpdateInvoice = () =>
  mutation((args: any) => {
    const targetId = args?.invoiceId ?? args?.id ?? args?.data?.invoiceId ?? args?.data?.id;
    const data = args?.data ? args.data : args;
    const sessionUser = session();
    let found = false;

    invoices = invoices.map((inv) => {
      if (inv.id === targetId || String(inv.id) === String(targetId)) {
        found = true;
        const updated = { ...inv, ...data };
        if (data.status === 'paga' && inv.status !== 'paga') {
          updated.paymentDate = updated.paymentDate || new Date().toISOString().slice(0, 10);
        }
        return updated;
      }
      return inv;
    });
    save('invoices', invoices);

    // Also update in payments if it's a payment receipt or linked payment
    let payUpdated = false;
    payments = payments.map((p) => {
      if (p.id === targetId || String(p.id) === String(targetId) || p.invoiceId === targetId || String(p.invoiceId) === String(targetId)) {
        payUpdated = true;
        return {
          ...p,
          ...(data.status ? { status: data.status } : {}),
          ...(data.notes ? { notes: data.notes } : {}),
          ...(data.clientName ? { clientName: data.clientName } : {}),
          ...(data.amount ? { amount: Number(data.amount) } : {}),
        };
      }
      return p;
    });
    if (payUpdated) save('payments', payments);

    const updatedInv = invoices.find((inv) => inv.id === targetId);
    if (updatedInv && data.status === 'paga' && updatedInv.clientId) {
      clients = clients.map((c) => (c.id === Number(updatedInv.clientId) ? { ...c, status: 'active' } : c));
      save('clients', clients);
    }

    logAuditAction({
      action: 'EDITAR_FACTURA',
      module: 'Facturação',
      description: `Fatura ID ${targetId} atualizada (${data.status || 'dados modificados'})`,
      targetId: `INV-${targetId}`,
      user: sessionUser?.username || 'operador',
    });

    try {
      window.dispatchEvent(new CustomEvent('osdel-invoices-updated', { detail: { invoiceId: targetId, action: 'updated' } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'INVOICE_UPDATED', invoiceId: targetId, action: 'updated' });
        bc.close();
      }
    } catch {}

    return updatedInv || payments.find((p) => p.id === targetId) || { id: targetId, ...data };
  });

export const useDeleteInvoice = () =>
  mutation((param: any) => {
    const sessionUser = session();
    const invoiceId = typeof param === 'number' || typeof param === 'string' ? param : (param?.invoiceId || param?.id);
    const invNumber = typeof param === 'object' ? param?.invoiceNumber : undefined;
    const reason = typeof param === 'object' && param?.reason ? param.reason : 'Remoção de fatura solicitada pelo utilizador';
    const hardDelete = typeof param === 'number' || typeof param === 'string' || param?.hardDelete !== false;

    if (!invoiceId && invoiceId !== 0 && !invNumber) {
      throw new Error('Identificador da fatura inválido para eliminação.');
    }

    const matchesId = (record: any) => {
      if (!record) return false;
      if (invoiceId !== undefined && (record.id === invoiceId || String(record.id) === String(invoiceId))) return true;
      if (invNumber && (record.invoiceNumber === invNumber || record.reference === invNumber)) return true;
      if (record.invoiceNumber === invoiceId || record.reference === invoiceId) return true;
      return false;
    };

    const targetInvoice = invoices.find(matchesId);
    const targetPayment = payments.find(matchesId);

    if (hardDelete) {
      // Elimina permanentemente da lista de faturas e de pagamentos
      invoices = invoices.filter((i) => !matchesId(i));
      payments = payments.filter((p) => !matchesId(p));
      save('invoices', invoices);
      save('payments', payments);

      logAuditAction({
        action: 'ELIMINAR_FACTURA',
        module: 'Facturação',
        description: `Eliminada definitivamente a fatura/recibo ${targetInvoice?.invoiceNumber || targetPayment?.reference || invNumber || invoiceId}`,
        targetId: targetInvoice?.invoiceNumber || `INV-${invoiceId}`,
        details: `Autorizado por: ${sessionUser?.username || 'utilizador'}. Justificativa: ${reason}`,
        user: sessionUser?.username || 'utilizador',
      });

      syncMutationToCloud({
        module: 'fecho',
        action: 'delete',
        entity: 'Factura',
        description: `Eliminação da fatura ${targetInvoice?.invoiceNumber || invNumber || invoiceId}`,
        payload: { id: invoiceId, invoiceId, invoiceNumber: targetInvoice?.invoiceNumber || invNumber || invoiceId },
      });

      if (targetPayment) {
        syncMutationToCloud({
          module: 'pagamentos',
          action: 'delete',
          entity: 'Pagamento',
          description: `Eliminação do recibo/pagamento vinculado ${targetPayment.reference || targetPayment.id}`,
          payload: { id: targetPayment.id, paymentId: targetPayment.id, reference: targetPayment.reference },
        });
      }
    } else {
      // Anula a fatura mantendo o histórico
      invoices = invoices.map((inv) =>
        inv.id === invoiceId || String(inv.id) === String(invoiceId)
          ? {
              ...inv,
              status: 'anulada',
              cancelledAt: new Date().toISOString(),
              cancelledBy: sessionUser?.username || 'operador',
              cancelReason: reason,
            }
          : inv,
      );
      payments = payments.map((p) =>
        p.id === invoiceId || String(p.id) === String(invoiceId)
          ? {
              ...p,
              status: 'anulada',
              cancelledAt: new Date().toISOString(),
              cancelledBy: sessionUser?.username || 'operador',
              notes: `${p.notes || ''} [ANULADA: ${reason}]`,
            }
          : p,
      );
      save('invoices', invoices);
      save('payments', payments);

      logAuditAction({
        action: 'ANULAR_FACTURA',
        module: 'Facturação',
        description: `Anulada fatura ${targetInvoice?.invoiceNumber || invoiceId}. Motivo: ${reason}`,
        targetId: targetInvoice?.invoiceNumber || `INV-${invoiceId}`,
        details: `Autorizado por: ${sessionUser?.username || 'operador'}. Justificativa: ${reason}`,
        user: sessionUser?.username || 'operador',
      });

      syncMutationToCloud({
        module: 'fecho',
        action: 'update',
        entity: 'Factura',
        description: `Anulada fatura ${targetInvoice?.invoiceNumber || invoiceId}`,
        payload: { id: invoiceId, invoiceNumber: targetInvoice?.invoiceNumber || invNumber, status: 'anulada', reason },
      });
    }

    // Recalcula saldos e notifica sincronização em tempo real para Electron e APKs
    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);
    try {
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      window.dispatchEvent(new CustomEvent('osdel-invoices-updated', { detail: { invoiceId, action: hardDelete ? 'deleted' : 'voided' } }));
      window.dispatchEvent(new CustomEvent('osdel-payments-updated', { detail: { invoiceId, action: hardDelete ? 'deleted' : 'voided' } }));
      window.dispatchEvent(new CustomEvent('osdel-clients-updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'INVOICE_UPDATED', invoiceId, action: hardDelete ? 'deleted' : 'voided' });
        bc.close();
      }
    } catch (e) {
      // ignore
    }

    return true;
  });

export const useDeleteClient = () =>
  mutation(({ clientId }) => {
    const target = clients.find((c) => c.id === clientId || Number(c.id) === Number(clientId));
    clients = clients.filter((c) => c.id !== clientId && Number(c.id) !== Number(clientId));
    save('clients', clients);
    syncMutationToCloud({
      module: 'clientes',
      action: 'delete',
      entity: 'Cliente',
      description: `Eliminação do cliente #${clientId} (${target?.fullName || ''})`,
      payload: { clientId, id: clientId, code: target?.code, phone: target?.phone },
    });
    try {
      window.dispatchEvent(new CustomEvent('osdel-clients-updated', { detail: { clientId } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'CLIENT_DELETED', clientId });
        bc.close();
      }
    } catch {}
    return true;
  });

export const useSetClientStatus = () =>
  mutation(({ clientId, status, notes }) => {
    clients = clients.map((c) => {
      if (c.id === clientId) {
        return {
          ...c,
          status,
          ...(notes !== undefined ? { notes } : {}),
        };
      }
      return c;
    });
    save('clients', clients);
    syncMutationToCloud({
      module: 'clientes',
      action: 'update',
      entity: 'Cliente',
      description: `Alterado estado do cliente #${clientId} para ${status}`,
      payload: { clientId, status, notes },
    });
    try {
      window.dispatchEvent(new CustomEvent('osdel-clients-updated', { detail: { clientId } }));
    } catch {}
    return clients.find((c) => c.id === clientId);
  });

export const useRegisterPaymentPromise = () =>
  mutation(({ clientId, promiseDate, notes }: { clientId: number; promiseDate: string; notes?: string }) => {
    const sessionUser = session();
    clients = clients.map((c) => {
      if (c.id === clientId) {
        const agreementNote = `[Acordo em ${new Date().toISOString().slice(0, 10)}: Prometeu liquidar até ${promiseDate}${notes ? ` - ${notes}` : ''}]`;
        return {
          ...c,
          paymentPromiseDate: promiseDate,
          promiseNotes: notes || '',
          notes: c.notes ? `${c.notes}\n${agreementNote}` : agreementNote,
        };
      }
      return c;
    });
    save('clients', clients);
    logAuditAction({
      action: 'ACORDO_PAGAMENTO',
      module: 'Cobrança',
      description: `Registado acordo/promessa de pagamento até ${promiseDate} para cliente ID ${clientId}`,
      targetId: `CLI-${clientId}`,
      user: sessionUser?.username || 'operador',
    });
    return clients.find((c) => c.id === clientId);
  });

export const useDeleteContract = () =>
  mutation(({ contractId }) => {
    const target = contracts.find((c) => c.id === contractId || Number(c.id) === Number(contractId));
    contracts = contracts.filter((c) => c.id !== contractId && Number(c.id) !== Number(contractId));
    save('contracts', contracts);
    syncMutationToCloud({
      module: 'clientes',
      action: 'delete',
      entity: 'Contrato',
      description: `Eliminação do contrato #${contractId} (${target?.code || target?.contractNumber || ''})`,
      payload: { contractId, id: contractId, code: target?.code || target?.contractNumber },
    });
    try {
      window.dispatchEvent(new CustomEvent('osdel-contracts-updated', { detail: { contractId } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'CONTRACT_DELETED', contractId });
        bc.close();
      }
    } catch {}
    return true;
  });

export const useDeletePayment = () =>
  mutation(({ paymentId }) => {
    const target = payments.find((p) => p.id === paymentId || Number(p.id) === Number(paymentId));
    payments = payments.filter((p) => p.id !== paymentId && Number(p.id) !== Number(paymentId));
    save('payments', payments);

    if (target) {
      if (target.invoiceId || target.reference) {
        invoices = invoices.map((inv) => {
          if (
            (target.invoiceId && (inv.id === target.invoiceId || String(inv.id) === String(target.invoiceId))) ||
            (target.reference && (inv.invoiceNumber === target.reference || inv.reference === target.reference))
          ) {
            return { ...inv, status: 'pendente', amountPaid: 0, paymentDate: undefined };
          }
          return inv;
        });
        save('invoices', invoices);
      }
    }

    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);
    syncMutationToCloud({
      module: 'pagamentos',
      action: 'delete',
      entity: 'Pagamento',
      description: `Eliminação do pagamento #${paymentId} (${target?.reference || ''})`,
      payload: { paymentId, id: paymentId, reference: target?.reference, amount: target?.amount },
    });
    try {
      window.dispatchEvent(new CustomEvent('osdel-payments-updated', { detail: { paymentId } }));
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      window.dispatchEvent(new CustomEvent('osdel-invoices-updated'));
      window.dispatchEvent(new CustomEvent('osdel-clients-updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'PAYMENT_DELETED', paymentId });
        bc.close();
      }
    } catch {}
    return true;
  });

export const useDeleteExpense = () =>
  mutation(({ expenseId }) => {
    const target = expenses.find((e) => e.id === expenseId || Number(e.id) === Number(expenseId));
    expenses = expenses.filter((e) => e.id !== expenseId && Number(e.id) !== Number(expenseId));
    save('expenses', expenses);
    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);
    syncMutationToCloud({
      module: 'despesas',
      action: 'delete',
      entity: 'Despesa',
      description: `Eliminação da despesa #${expenseId} (${target?.reason || ''})`,
      payload: { expenseId, id: expenseId, amount: target?.amount },
    });
    try {
      window.dispatchEvent(new CustomEvent('osdel-expenses-updated', { detail: { expenseId } }));
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'EXPENSE_DELETED', expenseId });
        bc.close();
      }
    } catch {}
    return true;
  });

export const useUpdateExpense = () =>
  mutation(({ expenseId, data }) => {
    const sessionUser = session();
    expenses = expenses.map((e) =>
      e.id === expenseId || Number(e.id) === Number(expenseId)
        ? {
            ...e,
            ...data,
            updatedAt: new Date().toISOString(),
          }
        : e,
    );
    save('expenses', expenses);
    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);
    try {
      window.dispatchEvent(new CustomEvent('osdel-expenses-updated'));
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
    } catch {}
    logAuditAction({
      action: 'ACTUALIZAR_DESPESA',
      module: 'Contabilidade',
      description: `Atualizada despesa EXP-${expenseId}: ${data.reason || ''}`,
      targetId: `EXP-${expenseId}`,
      user: sessionUser?.username || 'operador',
    });
    return expenses.find((e) => e.id === expenseId || Number(e.id) === Number(expenseId));
  });

export const useCreateTransfer = () =>
  mutation(({ data }) => {
    const sessionUser = session();
    const nextId = Math.max(0, ...accountTransfers.map((t) => Number(t.id) || 0)) + 1;
    const item = {
      ...data,
      id: nextId,
      code: data.code || `TRF-${new Date().getFullYear()}/${String(nextId).padStart(4, '0')}`,
      date: data.date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      operator: sessionUser?.username || 'deezy',
      status: data.status || 'concluido',
    };
    accountTransfers = [item, ...accountTransfers];
    save('account_transfers', accountTransfers);
    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);
    try {
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      window.dispatchEvent(new CustomEvent('osdel-account-transfers-updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'TRANSFER_CREATED', transfer: item });
        bc.close();
      }
    } catch {}
    logAuditAction({
      action: 'TRANSFERENCIA_CONTAS',
      module: 'Tesouraria',
      description: `Transferência de ${money(item.amount)} de ${item.fromAccountName || item.fromAccountId} para ${item.toAccountName || item.toAccountId}`,
      targetId: item.code,
      user: sessionUser?.username || 'operador',
    });
    return item;
  });

export const useDeleteTransfer = () =>
  mutation(({ transferId }) => {
    const target = accountTransfers.find((t) => t.id === transferId || Number(t.id) === Number(transferId));
    accountTransfers = accountTransfers.filter((t) => t.id !== transferId && Number(t.id) !== Number(transferId));
    save('account_transfers', accountTransfers);
    financialAccounts = computeLiveAccountBalances();
    save('financial_accounts', financialAccounts);
    syncMutationToCloud({
      module: 'fecho',
      action: 'delete',
      entity: 'transferencia',
      description: `Eliminação da transferência #${transferId} (${target?.code || ''})`,
      payload: { transferId, id: transferId, code: target?.code, amount: target?.amount },
    });
    try {
      window.dispatchEvent(new CustomEvent('osdel-financial-accounts-updated'));
      window.dispatchEvent(new CustomEvent('osdel-account-transfers-updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'TRANSFER_DELETED', transferId });
        bc.close();
      }
    } catch {}
    return true;
  });

export const useCreateFinancialAccount = () =>
  mutation(({ data }) => {
    const sessionUser = session();
    const id = data.id || `acc-${Date.now()}`;
    const item = {
      ...data,
      id,
      initialBalance: Number(data.initialBalance || 0),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    financialAccounts = [...financialAccounts, item];
    save('financial_accounts', financialAccounts);
    logAuditAction({
      action: 'CRIAR_CONTA_FINANCEIRA',
      module: 'Tesouraria',
      description: `Criada conta ${item.name} (${item.type})`,
      targetId: item.id,
      user: sessionUser?.username || 'operador',
    });
    return item;
  });

export const useUpdateFinancialAccount = () =>
  mutation(({ accountId, data }) => {
    financialAccounts = financialAccounts.map((a) =>
      a.id === accountId ? { ...a, ...data } : a,
    );
    save('financial_accounts', financialAccounts);
    return financialAccounts.find((a) => a.id === accountId);
  });

export const useDeleteFinancialAccount = () =>
  mutation(({ accountId }) => {
    financialAccounts = financialAccounts.filter((a) => a.id !== accountId);
    save('financial_accounts', financialAccounts);
    return true;
  });

export const useUpdateCategoryBudgets = () =>
  mutation(({ data }) => {
    categoryBudgets = data;
    save('category_budgets', categoryBudgets);
    return categoryBudgets;
  });

export const useToggleExpenseReconciliation = () =>
  mutation(({ expenseId, reconciled }) => {
    expenses = expenses.map((e) =>
      e.id === expenseId
        ? {
            ...e,
            isReconciled: reconciled,
            reconciledAt: reconciled ? new Date().toISOString() : null,
          }
        : e,
    );
    save('expenses', expenses);
    return true;
  });

export const useTogglePaymentReconciliation = () =>
  mutation(({ paymentId, reconciled }) => {
    payments = payments.map((p) =>
      p.id === paymentId
        ? {
            ...p,
            isReconciled: reconciled,
            reconciledAt: reconciled ? new Date().toISOString() : null,
          }
        : p,
    );
    save('payments', payments);
    return true;
  });

// Inventory Mutations
export const useCreateInventoryItem = () =>
  mutation(({ data }) => {
    const nextId = Math.max(0, ...inventory.map((i) => i.id)) + 1;
    const item = {
      ...data,
      id: nextId,
      code: data.code || `MAT-${String(nextId).padStart(3, '0')}`,
      quantity: Number(data.quantity || 0),
      minQuantity: Number(data.minQuantity || 5),
      unitCost: Number(data.unitCost || 0),
    };
    inventory = [item, ...inventory];
    save('inventory', inventory);
    return item;
  });

export const useUpdateInventoryItem = () =>
  mutation(({ itemId, data }) => {
    inventory = inventory.map((i) =>
      i.id === itemId
        ? {
            ...i,
            ...data,
            quantity: Number(data.quantity !== undefined ? data.quantity : i.quantity),
            minQuantity: Number(data.minQuantity !== undefined ? data.minQuantity : i.minQuantity),
            unitCost: Number(data.unitCost !== undefined ? data.unitCost : i.unitCost),
          }
        : i,
    );
    save('inventory', inventory);
    return inventory.find((i) => i.id === itemId);
  });

export const useAdjustInventoryStock = () =>
  mutation(({ itemId, delta, reason }) => {
    inventory = inventory.map((i) => {
      if (i.id === itemId) {
        const newQty = Math.max(0, Number(i.quantity) + Number(delta));
        return { ...i, quantity: newQty };
      }
      return i;
    });
    save('inventory', inventory);

    // If negative adjustment and reason provided, optionally log as expense if material purchased
    if (delta > 0 && reason) {
      const item = inventory.find((i) => i.id === itemId);
      if (item && item.unitCost) {
        const cost = Number(item.unitCost) * Number(delta);
        const sessionUser = session();
        expenses = [
          {
            id: Math.max(0, ...expenses.map((e) => e.id)) + 1,
            date: new Date().toISOString().slice(0, 10),
            amount: cost,
            reason: `Compra stock: ${delta}x ${item.name} (${reason})`,
            account: 'Caixa',
            operator: sessionUser?.username || 'deezy',
          },
          ...expenses,
        ];
        save('expenses', expenses);
      }
    }

    enqueueSyncMutation({
      module: 'inventario',
      action: 'update',
      entity: 'Inventário / Stock',
      description: `Ajuste de stock: ${delta > 0 ? '+' : ''}${delta} unidades (Item #${itemId})`,
      payload: { itemId, delta, reason },
    });

    return inventory.find((i) => i.id === itemId);
  });

export const useDeleteInventoryItem = () =>
  mutation(({ itemId }) => {
    inventory = inventory.filter((i) => i.id !== itemId);
    save('inventory', inventory);
    return true;
  });

// Equipment Assignment Mutations
export const useAssignEquipment = () =>
  mutation(({ data }) => {
    const item = {
      ...data,
      id: Math.max(0, ...equipmentAssignments.map((e) => e.id)) + 1,
      status: 'installed',
      installedAt: data.installedAt || new Date().toISOString().slice(0, 10),
    };
    equipmentAssignments = [item, ...equipmentAssignments];
    save('equipment_assignments', equipmentAssignments);

    // Deduct 1 from inventory if inventoryItemId is provided
    if (data.inventoryItemId) {
      inventory = inventory.map((inv) =>
        inv.id === Number(data.inventoryItemId)
          ? { ...inv, quantity: Math.max(0, Number(inv.quantity) - 1) }
          : inv,
      );
      save('inventory', inventory);
    }

    // Also update client ONU / PDO if provided
    if (data.clientId) {
      clients = clients.map((c) => {
        if (c.id === Number(data.clientId)) {
          return {
            ...c,
            ...(data.serialNumber ? { onuNumber: data.serialNumber } : {}),
            ...(data.pdoNumber ? { pdoNumber: data.pdoNumber } : {}),
          };
        }
        return c;
      });
      save('clients', clients);
    }

    enqueueSyncMutation({
      module: 'inventario',
      action: 'create',
      entity: 'Atribuição de Equipamento',
      description: `Equipamento ${item.equipmentType} (${item.serialNumber || 'S/N'}) atribuído ao Cliente #${data.clientId}`,
      payload: item,
    });

    return item;
  });

export const useUpdateEquipmentStatus = () =>
  mutation(({ id, status, notes }) => {
    equipmentAssignments = equipmentAssignments.map((eq) =>
      eq.id === id ? { ...eq, status, ...(notes ? { notes } : {}) } : eq,
    );
    save('equipment_assignments', equipmentAssignments);
    return equipmentAssignments.find((eq) => eq.id === id);
  });

export const useRemoveEquipment = () =>
  mutation(({ id }) => {
    equipmentAssignments = equipmentAssignments.filter((eq) => eq.id !== id);
    save('equipment_assignments', equipmentAssignments);
    return true;
  });

// Service Orders Mutations
export const useCreateServiceOrder = () =>
  mutation(({ data }) => {
    const nextId = Math.max(0, ...serviceOrders.map((s) => s.id)) + 1;
    const code = `OS-${String(nextId).padStart(5, '0')}`;
    const sessionUser = session();

    const item = {
      ...data,
      id: nextId,
      code,
      status: data.status || 'pendente',
      priority: data.priority || 'normal',
      cableUsedMeters: Number(data.cableUsedMeters || 0),
      createdAt: new Date().toISOString(),
      completedAt: null,
      operator: sessionUser?.username || 'deezy',
    };

    serviceOrders = [item, ...serviceOrders];
    save('service_orders', serviceOrders);

    enqueueSyncMutation({
      module: 'ordens',
      action: 'create',
      entity: 'Ordem de Serviço',
      description: `Nova OS gerada: ${code} (${item.type || 'Intervenção'})`,
      payload: item,
    });

    return item;
  });

export const useUpdateServiceOrder = () =>
  mutation(({ orderId, data }) => {
    serviceOrders = serviceOrders.map((so) => {
      if (so.id === orderId) {
        const updated = {
          ...so,
          ...data,
          cableUsedMeters: Number(data.cableUsedMeters !== undefined ? data.cableUsedMeters : so.cableUsedMeters),
        };

        if (data.status === 'concluida' && !so.completedAt) {
          updated.completedAt = new Date().toISOString();

          // If this was a cut or reconnection order, automatically synchronize client status
          if (so.type === 'corte') {
            clients = clients.map((c) => (c.id === so.clientId ? { ...c, status: 'suspended' } : c));
            save('clients', clients);
          } else if (so.type === 'religacao' || so.type === 'instalacao') {
            clients = clients.map((c) => (c.id === so.clientId ? { ...c, status: 'active' } : c));
            save('clients', clients);
          }
        }
        return updated;
      }
      return so;
    });

    save('service_orders', serviceOrders);

    enqueueSyncMutation({
      module: 'ordens',
      action: 'update',
      entity: 'Ordem de Serviço',
      description: `OS #${orderId} actualizada (Estado: ${data.status || 'actualizado'})`,
      payload: { orderId, ...data },
    });

    return serviceOrders.find((so) => so.id === orderId);
  });

export const useDeleteServiceOrder = () =>
  mutation(({ orderId }) => {
    const target = serviceOrders.find((so) => so.id === orderId || Number(so.id) === Number(orderId));
    serviceOrders = serviceOrders.filter((so) => so.id !== orderId && Number(so.id) !== Number(orderId));
    save('service_orders', serviceOrders);
    syncMutationToCloud({
      module: 'ordens',
      action: 'delete',
      entity: 'Ordem de Serviço',
      description: `Eliminação da OS #${orderId} (${target?.code || ''})`,
      payload: { orderId, id: orderId, code: target?.code },
    });
    try {
      window.dispatchEvent(new CustomEvent('osdel-service-orders-updated', { detail: { orderId } }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'ORDER_DELETED', orderId });
        bc.close();
      }
    } catch {}
    return true;
  });

// Database Backup and Restore
export const exportDatabaseJson = () => {
  const fullBackup = {
    version: '2.5',
    exportedAt: new Date().toISOString(),
    clients,
    payments,
    contracts,
    settings,
    users,
    expenses,
    financialAccounts,
    accountTransfers,
    categoryBudgets,
    messages,
    inventory,
    equipmentAssignments,
    serviceOrders,
    cashClosures,
    invoices,
    auditLogs,
  };
  return JSON.stringify(fullBackup, null, 2);
};

export const importDatabaseJson = (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.clients && Array.isArray(data.clients)) {
      clients = data.clients;
      save('clients', clients);
    }
    if (data.payments && Array.isArray(data.payments)) {
      payments = data.payments;
      save('payments', payments);
    }
    if (data.contracts && Array.isArray(data.contracts)) {
      contracts = data.contracts;
      save('contracts', contracts);
    }
    if (data.settings && typeof data.settings === 'object') {
      settings = data.settings;
      save('settings', settings);
    }
    if (data.users && Array.isArray(data.users)) {
      users = data.users;
      save('users', users);
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      expenses = data.expenses;
      save('expenses', expenses);
    }
    if (data.financialAccounts && Array.isArray(data.financialAccounts)) {
      financialAccounts = data.financialAccounts;
      save('financial_accounts', financialAccounts);
    }
    if (data.accountTransfers && Array.isArray(data.accountTransfers)) {
      accountTransfers = data.accountTransfers;
      save('account_transfers', accountTransfers);
    }
    if (data.categoryBudgets && Array.isArray(data.categoryBudgets)) {
      categoryBudgets = data.categoryBudgets;
      save('category_budgets', categoryBudgets);
    }
    if (data.messages && Array.isArray(data.messages)) {
      messages = data.messages;
      save('messages', messages);
    }
    if (data.inventory && Array.isArray(data.inventory)) {
      inventory = data.inventory;
      save('inventory', inventory);
    }
    if (data.equipmentAssignments && Array.isArray(data.equipmentAssignments)) {
      equipmentAssignments = data.equipmentAssignments;
      save('equipment_assignments', equipmentAssignments);
    }
    if (data.serviceOrders && Array.isArray(data.serviceOrders)) {
      serviceOrders = data.serviceOrders;
      save('service_orders', serviceOrders);
    }
    if (data.cashClosures && Array.isArray(data.cashClosures)) {
      cashClosures = data.cashClosures;
      save('cash_closures', cashClosures);
    }
    if (data.invoices && Array.isArray(data.invoices)) {
      invoices = data.invoices;
      save('invoices', invoices);
    }
    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      auditLogs = data.auditLogs;
      save('audit_logs', auditLogs);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ficheiro JSON inválido' };
  }
};

export const resetDatabaseToDefaults = () => {
  clients = seedClients;
  payments = seedPayments;
  contracts = seedContracts;
  settings = seedSettings;
  users = seedUsers;
  expenses = seedExpenses;
  financialAccounts = seedFinancialAccounts;
  accountTransfers = seedAccountTransfers;
  categoryBudgets = seedCategoryBudgets;
  messages = seedMessages;
  inventory = seedInventory;
  equipmentAssignments = seedEquipmentAssignments;
  serviceOrders = seedServiceOrders;

  save('clients', clients);
  save('payments', payments);
  save('contracts', contracts);
  save('settings', settings);
  save('users', users);
  save('expenses', expenses);
  save('financial_accounts', financialAccounts);
  save('account_transfers', accountTransfers);
  save('category_budgets', categoryBudgets);
  save('messages', messages);
  save('inventory', inventory);
  save('equipment_assignments', equipmentAssignments);
  save('service_orders', serviceOrders);
  return true;
};

export const clearDatabaseForProduction = (options?: {
  initialBalances?: Record<string, number>;
}) => {
  clients = [];
  payments = [];
  contracts = [];
  expenses = [];
  accountTransfers = [];
  messages = [];
  serviceOrders = [];
  cashClosures = [];
  invoices = [];
  equipmentAssignments = [];

  // Reset financial accounts to zero or specified opening balances
  financialAccounts = financialAccounts.map((acc) => ({
    ...acc,
    initialBalance: options?.initialBalances?.[acc.id] !== undefined ? options.initialBalances[acc.id] : 0,
  }));

  save('clients', clients);
  save('payments', payments);
  save('contracts', contracts);
  save('expenses', expenses);
  save('account_transfers', accountTransfers);
  save('messages', messages);
  save('service_orders', serviceOrders);
  save('cash_closures', cashClosures);
  save('invoices', invoices);
  save('equipment_assignments', equipmentAssignments);
  save('financial_accounts', financialAccounts);

  try {
    localStorage.setItem('osdel_client_credentials', JSON.stringify({}));
    localStorage.removeItem('osdel_client_apk_session');
    localStorage.removeItem('osdel_client_agreements');
    
    // Zera também todas as chaves do APK da equipa e Electron Desktop
    localStorage.setItem('osdel_staff_apk_clients', JSON.stringify([]));
    localStorage.setItem('osdel_staff_apk_orders', JSON.stringify([]));
    localStorage.setItem('osdel_staff_apk_invoices', JSON.stringify([]));
    localStorage.setItem('osdel_staff_apk_expenses', JSON.stringify([]));
    localStorage.setItem('osdel_staff_apk_agreements', JSON.stringify([]));
    localStorage.setItem('osdel_staff_apk_loans', JSON.stringify([]));
    
    localStorage.setItem('osdel_desktop_clients', JSON.stringify([]));
    localStorage.setItem('osdel_desktop_invoices', JSON.stringify([]));
    localStorage.setItem('osdel_desktop_orders', JSON.stringify([]));
    localStorage.setItem('osdel_desktop_inventory', JSON.stringify([]));
    
    localStorage.setItem('osdel_clients', JSON.stringify([]));
    localStorage.setItem('osdel_invoices', JSON.stringify([]));
    localStorage.setItem('osdel_payments', JSON.stringify([]));
    localStorage.setItem('osdel_expenses', JSON.stringify([]));
    localStorage.setItem('osdel_service_orders', JSON.stringify([]));
    localStorage.setItem('osdel_cash_closures', JSON.stringify([]));
    localStorage.setItem('osdel_technician_loans', JSON.stringify([]));
    localStorage.setItem('osdel_team_missions', JSON.stringify([]));
    localStorage.setItem('osdel_schedule_events', JSON.stringify([]));
    localStorage.setItem('osdel_client_promises', JSON.stringify([]));
    localStorage.setItem('osdel_production_mode_active', 'true');
  } catch {}

  logAuditAction({
    action: 'LIMPAR_PARA_PRODUCAO',
    module: 'Sistema',
    description: 'Base de dados limpa para entrada em produção oficial com dados reais da OSDEL Tecnologia.',
    user: session()?.username || 'deezy',
  });

  window.dispatchEvent(new Event('osdel-clients-updated'));
  window.dispatchEvent(new Event('osdel-payments-updated'));
  window.dispatchEvent(new Event('osdel-financial-accounts-updated'));
  window.dispatchEvent(new Event('osdel-invoices-updated'));
  window.dispatchEvent(new Event('osdel-expenses-updated'));
  window.dispatchEvent(new Event('osdel-orders-updated'));
  window.dispatchEvent(new Event('osdel-missions-updated'));
  window.dispatchEvent(new Event('osdel-schedule-updated'));
  window.dispatchEvent(new Event('osdel-loans-updated'));
  window.dispatchEvent(new Event('osdel-promises-updated'));

  if (typeof BroadcastChannel !== 'undefined') {
    const bc = new BroadcastChannel('osdel_sync_channel');
    bc.postMessage({ type: 'DATABASE_PRODUCTION_RESET' });
    bc.close();
  }

  return true;
};

export const authenticate = (username: string, passwordOrPin: string) => {
  const normUser = username.trim().toLowerCase();
  const trimmedKey = passwordOrPin.trim();

  // Unified PIN Staff Seed / Storage
  let staffCredsMap: Record<string, any> = {};
  try {
    const raw = localStorage.getItem('osdel_staff_credentials');
    if (raw) staffCredsMap = JSON.parse(raw);
  } catch {}

  // 1. Especial: Super Admin Deezy com senha mestre ou PIN 9999
  if (
    (normUser === 'deezy' || normUser === '9999') &&
    (trimmedKey === '52863400#' || trimmedKey === '52863400' || trimmedKey === '9999')
  ) {
    let deezyUser = users.find((u) => u.username?.toLowerCase() === 'deezy');
    if (!deezyUser) {
      deezyUser = {
        id: 100,
        username: 'deezy',
        name: 'Albert Mbuyi (Deezy)',
        role: 'superadmin',
        password: '52863400#',
        pin: '9999',
        active: true,
        jobTitle: 'Director Geral & Super Admin Supremo',
        department: 'Direcção Executiva',
      };
      users.unshift(deezyUser);
    } else {
      deezyUser.role = 'superadmin';
      deezyUser.pin = '9999';
      deezyUser.active = true;
    }
    save('users', users);

    const sessionPayload = {
      id: deezyUser.id,
      username: 'deezy',
      name: deezyUser.name,
      role: 'superadmin',
      photoUrl: deezyUser.photoUrl,
      jobTitle: deezyUser.jobTitle,
      pin: '9999',
    };
    window.sessionStorage.setItem('osdel-window-session', JSON.stringify(sessionPayload));
    window.localStorage.setItem('osdel-session', JSON.stringify(sessionPayload));
    window.dispatchEvent(new Event('osdel-auth-changed'));
    return deezyUser;
  }

  // 2. Direct 4-digit PIN login (se o utilizador introduzir apenas o PIN de 4 dígitos)
  if (/^\d{4}$/.test(normUser) && (!trimmedKey || trimmedKey === normUser)) {
    const staffMatch = Object.values(staffCredsMap).find((s: any) => s.pin === normUser && s.isActive !== false) as any;
    if (staffMatch) {
      const sessionPayload = {
        id: staffMatch.userId || 1,
        username: staffMatch.username,
        name: staffMatch.name,
        role: staffMatch.role,
        jobTitle: staffMatch.jobTitle,
        pin: staffMatch.pin,
      };
      window.sessionStorage.setItem('osdel-window-session', JSON.stringify(sessionPayload));
      window.localStorage.setItem('osdel-session', JSON.stringify(sessionPayload));
      window.dispatchEvent(new Event('osdel-auth-changed'));
      return staffMatch;
    }
  }

  // 3. Procura no array users e nas credenciais unificadas de staff
  const found = users.find((u) => {
    if (u.active === false) return false;
    const matchUsername = u.username?.toLowerCase() === normUser;
    const matchPhone = u.phone && u.phone.replace(/\D/g, '').endsWith(normUser.replace(/\D/g, ''));
    if (!matchUsername && !matchPhone) return false;

    // Check staff PIN credential from storage
    const staffObj = Object.values(staffCredsMap).find(
      (s: any) => s.username?.toLowerCase() === u.username?.toLowerCase() || s.userId === u.id
    ) as any;

    const validPin = staffObj?.pin || u.pin;
    const validPassword = staffObj?.password || u.password;

    const matchesPassword = Boolean(u.password && (u.password === trimmedKey || u.password === passwordOrPin));
    const matchesPin = Boolean(validPin && validPin === trimmedKey);
    const matchesStaffPass = Boolean(validPassword && (validPassword === trimmedKey || validPassword === passwordOrPin));

    return matchesPassword || matchesPin || matchesStaffPass;
  });

  if (found) {
    const staffObj = Object.values(staffCredsMap).find(
      (s: any) => s.username?.toLowerCase() === found.username?.toLowerCase() || s.userId === found.id
    ) as any;

    const sessionPayload = {
      id: found.id,
      username: found.username,
      name: found.name,
      role: found.role,
      photoUrl: found.photoUrl,
      jobTitle: found.jobTitle,
      pin: staffObj?.pin || found.pin || '1234',
    };

    window.sessionStorage.setItem('osdel-window-session', JSON.stringify(sessionPayload));
    window.localStorage.setItem('osdel-session', JSON.stringify(sessionPayload));
    window.dispatchEvent(new Event('osdel-auth-changed'));
    return found;
  }

  // 4. Se não estava no array users, verifica directamente em osdel_staff_credentials
  const directStaff = Object.values(staffCredsMap).find((s: any) => {
    if (s.isActive === false) return false;
    const matchUser = s.username?.toLowerCase() === normUser;
    const matchPhone = s.phone && s.phone.replace(/\D/g, '').endsWith(normUser.replace(/\D/g, ''));
    if (!matchUser && !matchPhone) return false;

    return Boolean((s.pin && s.pin === trimmedKey) || (s.password && (s.password === trimmedKey || s.password === passwordOrPin)));
  }) as any;

  if (directStaff) {
    const sessionPayload = {
      id: directStaff.userId,
      username: directStaff.username,
      name: directStaff.name,
      role: directStaff.role,
      jobTitle: directStaff.jobTitle,
      pin: directStaff.pin,
    };
    window.sessionStorage.setItem('osdel-window-session', JSON.stringify(sessionPayload));
    window.localStorage.setItem('osdel-session', JSON.stringify(sessionPayload));
    window.dispatchEvent(new Event('osdel-auth-changed'));
    return directStaff;
  }

  return undefined;
};

export const signOut = () => {
  window.sessionStorage.removeItem('osdel-window-session');
  window.localStorage.removeItem('osdel-session');
  window.dispatchEvent(new Event('osdel-auth-changed'));
};

export const session = () => {
  try {
    // Exigência: sempre que se abre uma janela tem que se pedir login
    // Usamos sessionStorage ('osdel-window-session') para garantir que cada nova abertura de janela exige nova autenticação
    const s = sessionStorage.getItem('osdel-window-session');
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
};

export const money = (value: unknown) =>
  new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace('AOA', 'Kz');

export const kz = money;

/**
 * Validador em tempo real de duplicidade de pagamentos
 * Permite que o formulário na UI avise imediatamente o operador antes do clique
 */
export function checkPaymentDuplicate(params: {
  clientId?: number | string | null;
  paymentMonth?: string;
  reference?: string;
}): { isDuplicate: boolean; reason?: string; existingPayment?: any } {
  const { clientId, paymentMonth, reference } = params;

  // 1. Verificar referência bancária existente
  if (reference && reference.trim()) {
    const cleanRef = reference.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanRef.length >= 4 && !cleanRef.startsWith('recauto')) {
      const matchRef = payments.find((p) => {
        const pRef = String(p.reference || p.receiptNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return pRef.length >= 4 && pRef === cleanRef;
      });
      if (matchRef) {
        return {
          isDuplicate: true,
          reason: `A referência "${reference}" já foi usada no recibo #${matchRef.id} em ${matchRef.paidAt?.slice(0, 10)} (${matchRef.clientName || 'Assinante'}).`,
          existingPayment: matchRef,
        };
      }
    }
  }

  // 2. Verificar competência / mês do cliente
  const clientIdNum = Number(clientId || 0);
  if (clientIdNum > 0 && paymentMonth) {
    const targetClient = clients.find((c) => Number(c.id) === clientIdNum);
    const expectedMonthly = Number(targetClient?.monthlyPrice || targetClient?.monthlyFee || 4000);
    const monthPayments = payments.filter((p) => {
      const pClientId = Number(p.clientId || p.client_id);
      const pMonth = p.paymentMonth || p.payment_month || p.referenceMonth || (p.paidAt ? p.paidAt.slice(0, 7) : '');
      return pClientId === clientIdNum && pMonth === paymentMonth && p.movementType !== 'adesao_contrato';
    });

    const alreadyPaid = monthPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    if (alreadyPaid >= expectedMonthly && monthPayments.length > 0) {
      return {
        isDuplicate: true,
        reason: `Este cliente já possui a mensalidade de ${paymentMonth} totalmente liquidada no recibo #${monthPayments[0].id} (${alreadyPaid.toLocaleString()} Kz pagos).`,
        existingPayment: monthPayments[0],
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Validador em tempo real de duplicidade de facturas
 */
export function checkInvoiceDuplicate(params: {
  clientId?: number | string | null;
  referenceMonth?: string;
  invoiceNumber?: string;
}): { isDuplicate: boolean; reason?: string; existingInvoice?: any } {
  const { clientId, referenceMonth, invoiceNumber } = params;

  if (invoiceNumber && invoiceNumber.trim()) {
    const matchNum = invoices.find(
      (inv) => inv.invoiceNumber && inv.invoiceNumber.toLowerCase() === invoiceNumber.trim().toLowerCase()
    );
    if (matchNum) {
      return {
        isDuplicate: true,
        reason: `Já existe a factura nº "${invoiceNumber}" registada no sistema.`,
        existingInvoice: matchNum,
      };
    }
  }

  const clientIdNum = Number(clientId || 0);
  if (clientIdNum > 0 && referenceMonth) {
    const matchMonth = invoices.find(
      (inv) => Number(inv.clientId) === clientIdNum && inv.referenceMonth === referenceMonth && inv.status !== 'anulada'
    );
    if (matchMonth) {
      return {
        isDuplicate: true,
        reason: `Já existe a factura ${matchMonth.invoiceNumber} emitida para este cliente no mês ${referenceMonth} (${matchMonth.status === 'paga' ? 'Paga' : 'Pendente'}).`,
        existingInvoice: matchMonth,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Obtém todas as ruas/zonas únicas gravadas no sistema a partir dos clientes e moradas
 */
export function getAllStreetsFromSystem(): string[] {
  const set = new Set<string>();
  // Ruas padrão da operadora no Golf I / Luanda
  ['Rua 12', 'Rua 13', 'Rua 7', 'Rua 8', 'Rua Principal', 'Rua Direita', 'Rua da Central'].forEach((r) => set.add(r));

  clients.forEach((c) => {
    if (c.street && c.street.trim()) {
      set.add(c.street.trim());
    } else if (c.address) {
      const match = c.address.match(/(?:Rua|Travessa|Avenida|Beco|Sector)\s+[^,]+/i);
      if (match) set.add(match[0].trim());
      else if (c.address.trim().length <= 30) set.add(c.address.trim());
    }
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Estatísticas resumidas da base de dados
 */
export function getDbStats() {
  return {
    clients: clients.length,
    contracts: contracts.length,
    invoices: invoices.length,
    payments: payments.length,
    users: users.length,
    expenses: expenses.length,
    orders: serviceOrders.length,
    inventory: inventory.length,
  };
}

/**
 * Exportador completo da base de dados (JSON ou CSV estruturado)
 */
export function exportDatabaseBackup(format: 'json' | 'csv' = 'json'): { content: string; filename: string; mimeType: string } {
  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    const data = {
      version: '2.0.0',
      system: 'OSDEL TECNOLOGIA - GESTAO X',
      exportedAt: new Date().toISOString(),
      counts: getDbStats(),
      clients,
      contracts,
      invoices,
      payments,
      users,
      expenses,
      serviceOrders,
      settings,
    };
    return {
      content: JSON.stringify(data, null, 2),
      filename: `OSDEL_Backup_BaseDados_${timestamp}.json`,
      mimeType: 'application/json',
    };
  }

  // Formato CSV consolidado de clientes
  const headers = ['ID', 'Código', 'Nome Completo', 'Telefone', 'Morada', 'Rua', 'Casa', 'BI', 'Serviço', 'Mensalidade', 'Estado', 'Data Criação'];
  const rows = clients.map((c) => [
    c.id,
    c.code || '',
    `"${(c.fullName || '').replace(/"/g, '""')}"`,
    c.phone || '',
    `"${(c.address || '').replace(/"/g, '""')}"`,
    `"${(c.street || '').replace(/"/g, '""')}"`,
    c.houseCode || '',
    c.documentNumber || '',
    c.serviceType || 'tv',
    c.monthlyPrice || c.monthlyFee || 4000,
    c.status || 'active',
    c.createdAt || '',
  ]);
  const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  return {
    content: csvContent,
    filename: `OSDEL_Export_Clientes_${timestamp}.csv`,
    mimeType: 'text/csv;charset=utf-8;',
  };
}

/**
 * Importador Inteligente da Base de Dados com Validação Rigorosa
 * Previne corrupção, campos vazios, dados mal formatados ou inconsistentes.
 */
export function importDatabaseBackup(rawContent: string, format: 'json' | 'csv' = 'json'): {
  success: boolean;
  message: string;
  importedClients: number;
  importedInvoices: number;
  importedPayments: number;
  errors: string[];
} {
  const errors: string[] = [];

  if (!rawContent || !rawContent.trim()) {
    return {
      success: false,
      message: 'O ficheiro de importação está completamente vazio.',
      importedClients: 0,
      importedInvoices: 0,
      importedPayments: 0,
      errors: ['Ficheiro sem conteúdo.'],
    };
  }

  try {
    if (format === 'json' || rawContent.trim().startsWith('{')) {
      const parsed = JSON.parse(rawContent);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('A estrutura do ficheiro JSON é inválida.');
      }

      let countClients = 0;
      let countInvoices = 0;
      let countPayments = 0;

      // 1. Validar e importar Clientes
      if (Array.isArray(parsed.clients)) {
        const validClients: AnyRecord[] = [];
        parsed.clients.forEach((c: any, index: number) => {
          if (!c.fullName && !c.full_name) {
            errors.push(`Cliente na posição ${index + 1} ignorado: falta Nome Completo.`);
            return;
          }
          if (!c.phone) {
            errors.push(`Cliente "${c.fullName || index + 1}" ignorado: falta número de telefone.`);
            return;
          }
          const validId = Number(c.id) || (validClients.length + 1);
          validClients.push({
            ...c,
            id: validId,
            fullName: c.fullName || c.full_name,
            serviceType: c.serviceType || c.service_type || 'tv',
            status: c.status || 'active',
            monthlyPrice: Number(c.monthlyPrice || c.monthly_fee || 4000),
          });
        });

        if (validClients.length > 0) {
          clients = validClients;
          save('clients', clients);
          try {
            localStorage.setItem('osdel_clients', JSON.stringify(clients));
            localStorage.setItem('osdel:clients', JSON.stringify(clients));
          } catch {}
          countClients = validClients.length;
        }
      }

      // 2. Validar e importar Faturas
      if (Array.isArray(parsed.invoices)) {
        const validInvoices: AnyRecord[] = [];
        parsed.invoices.forEach((inv: any, index: number) => {
          if (!inv.invoiceNumber) {
            errors.push(`Fatura na posição ${index + 1} ignorada: falta número de fatura.`);
            return;
          }
          validInvoices.push({
            ...inv,
            id: Number(inv.id) || (validInvoices.length + 1),
            amount: Number(inv.amount || 0),
            total: Number(inv.total || inv.amount || 0),
          });
        });
        if (validInvoices.length > 0) {
          invoices = validInvoices;
          save('invoices', invoices);
          try {
            localStorage.setItem('osdel_invoices', JSON.stringify(invoices));
            localStorage.setItem('osdel:invoices', JSON.stringify(invoices));
          } catch {}
          countInvoices = validInvoices.length;
        }
      }

      // 3. Validar e importar Pagamentos
      if (Array.isArray(parsed.payments)) {
        const validPayments: AnyRecord[] = [];
        parsed.payments.forEach((p: any) => {
          validPayments.push({
            ...p,
            id: Number(p.id) || (validPayments.length + 1),
            amount: Number(p.amount || 0),
            total: Number(p.total || p.amount || 0),
          });
        });
        if (validPayments.length > 0) {
          payments = validPayments;
          save('payments', payments);
          try {
            localStorage.setItem('osdel_payments', JSON.stringify(payments));
            localStorage.setItem('osdel:payments', JSON.stringify(payments));
          } catch {}
          countPayments = validPayments.length;
        }
      }

      // 4. Se tiver contratos e despesas
      if (Array.isArray(parsed.contracts) && parsed.contracts.length > 0) {
        contracts = parsed.contracts;
        save('contracts', contracts);
      }
      if (Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
        expenses = parsed.expenses;
        save('expenses', expenses);
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        settings = { ...settings, ...parsed.settings };
        save('settings', settings);
      }

      // Atualiza contas financeiras
      financialAccounts = computeLiveAccountBalances();
      save('financial_accounts', financialAccounts);

      // Dispara eventos globais para atualização reativa
      window.dispatchEvent(new Event('osdel-clients-updated'));
      window.dispatchEvent(new Event('osdel-payments-updated'));
      window.dispatchEvent(new Event('osdel-invoices-updated'));
      window.dispatchEvent(new Event('osdel-financial-accounts-updated'));
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('osdel_sync_channel');
          bc.postMessage({ type: 'DATABASE_RESTORED' });
          bc.close();
        } catch {}
      }

      return {
        success: true,
        message: `Importação concluída com sucesso! ${countClients} clientes, ${countInvoices} facturas e ${countPayments} pagamentos restaurados.`,
        importedClients: countClients,
        importedInvoices: countInvoices,
        importedPayments: countPayments,
        errors,
      };
    } else {
      // Processamento CSV Inteligente
      const lines = rawContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        return {
          success: false,
          message: 'O ficheiro CSV não contém linhas de registos.',
          importedClients: 0,
          importedInvoices: 0,
          importedPayments: 0,
          errors: ['CSV sem dados.'],
        };
      }

      const imported: AnyRecord[] = [];
      const delimiter = lines[0].includes(';') ? ';' : ',';

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(delimiter).map((p) => p.replace(/^"|"$/g, '').trim());
        const fullName = parts[2] || parts[1];
        const phone = parts[3] || parts[2];
        const address = parts[4] || parts[3] || 'Luanda';

        if (!fullName || !phone) {
          errors.push(`Linha ${i + 1} inválida: falta Nome ou Telefone.`);
          continue;
        }

        const nextId = clients.length + imported.length + 1;
        imported.push({
          id: nextId,
          code: `CLI-${String(nextId).padStart(5, '0')}`,
          fullName,
          phone,
          address,
          street: parts[5] || address,
          houseCode: parts[6] || `Casa-${nextId}`,
          documentNumber: parts[7] || '',
          serviceType: parts[8]?.toLowerCase().includes('fibra') ? 'internet' : 'tv',
          monthlyPrice: Number(parts[9] || 4000),
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }

      if (imported.length > 0) {
        clients = [...clients, ...imported];
        save('clients', clients);
        try {
          localStorage.setItem('osdel_clients', JSON.stringify(clients));
        } catch {}
        window.dispatchEvent(new Event('osdel-clients-updated'));
      }

      return {
        success: imported.length > 0,
        message: `${imported.length} clientes importados do ficheiro CSV com sucesso.`,
        importedClients: imported.length,
        importedInvoices: 0,
        importedPayments: 0,
        errors,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na leitura do ficheiro: ${err?.message || 'Formato inválido'}`,
      importedClients: 0,
      importedInvoices: 0,
      importedPayments: 0,
      errors: [err?.message || 'Erro desconhecido.'],
    };
  }
}
