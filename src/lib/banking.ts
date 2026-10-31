/**
 * OSDEL TECNOLOGIA - Sistema Bancário Angolano & Gestão Multi-Contas
 * Suporte a múltiplos bancos e IBANs para colaboradores e para a empresa.
 */

export interface AngolanBank {
  code: string;
  shortName: string;
  fullName: string;
  name?: string;
  swift?: string;
  color: string;
  badgeBg: string;
}

export const ANGOLAN_BANKS: (AngolanBank & { name: string })[] = [
  {
    code: '0040',
    shortName: 'BAI',
    fullName: 'Banco Angolano de Investimentos',
    name: 'Banco Angolano de Investimentos',
    swift: 'BAIAAO22',
    color: '#002B49',
    badgeBg: '#e6eef4',
  },
  {
    code: '0006',
    shortName: 'BFA',
    fullName: 'Banco de Fomento Angola',
    name: 'Banco de Fomento Angola',
    swift: 'BFAAO22',
    color: '#E30613',
    badgeBg: '#fde8ea',
  },
  {
    code: '0055',
    shortName: 'Atlântico',
    fullName: 'Banco Millennium Atlântico',
    name: 'Banco Millennium Atlântico',
    swift: 'BMAOAO22',
    color: '#003399',
    badgeBg: '#e6edfa',
  },
  {
    code: '0051',
    shortName: 'BIC',
    fullName: 'Banco BIC Angola',
    name: 'Banco BIC Angola',
    swift: 'BICAO22',
    color: '#D8232A',
    badgeBg: '#fae9ea',
  },
  {
    code: '0005',
    shortName: 'BCI',
    fullName: 'Banco de Comércio e Indústria',
    name: 'Banco de Comércio e Indústria',
    swift: 'BCINAO22',
    color: '#005596',
    badgeBg: '#e6eef6',
  },
  {
    code: '0044',
    shortName: 'Standard Bank',
    fullName: 'Standard Bank de Angola',
    name: 'Standard Bank de Angola',
    swift: 'SBICAO22',
    color: '#0033A0',
    badgeBg: '#e6ecf8',
  },
  {
    code: '0048',
    shortName: 'Banco Sol',
    fullName: 'Banco Sol, S.A.',
    name: 'Banco Sol, S.A.',
    swift: 'SOLBAO22',
    color: '#F39200',
    badgeBg: '#fef4e6',
  },
  {
    code: '0054',
    shortName: 'BNI',
    fullName: 'Banco de Negócios Internacional',
    name: 'Banco de Negócios Internacional',
    swift: 'BNIAAO22',
    color: '#004B87',
    badgeBg: '#e6eef4',
  },
  {
    code: '0045',
    shortName: 'Keve',
    fullName: 'Banco Keve',
    name: 'Banco Keve',
    swift: 'RKBKAO22',
    color: '#008542',
    badgeBg: '#e6f3ec',
  },
  {
    code: '0047',
    shortName: 'BCGA',
    fullName: 'Banco Caixa Geral Angola',
    name: 'Banco Caixa Geral Angola',
    swift: 'BCGAAO22',
    color: '#003366',
    badgeBg: '#e6ecf2',
  },
  {
    code: '0066',
    shortName: 'Yetu',
    fullName: 'Banco Yetu',
    name: 'Banco Yetu',
    swift: 'YETUAO22',
    color: '#8A1538',
    badgeBg: '#f5e8eb',
  },
  {
    code: '0056',
    shortName: 'VTB África',
    fullName: 'Banco VTB África',
    name: 'Banco VTB África',
    swift: 'VTBAAO22',
    color: '#002882',
    badgeBg: '#e6ebf5',
  },
];

export interface BankAccountRecord {
  id: string;
  bankCode: string;
  bankName: string;
  accountHolder: string; // Nome da Pessoa ou da Empresa
  iban: string; // Ex: AO06.0040.0000.1234.5678.9012.3
  accountNumber?: string;
  accountType?: 'salario' | 'corrente' | 'poupanca' | 'operacional';
  isDefault?: boolean;
  notes?: string;
}

/**
 * Valida se uma string é um IBAN angolano válido (25 caracteres, começa por AO06)
 */
export function validateAngolanIban(iban: string): { valid: boolean; message?: string } {
  const clean = iban.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!clean.startsWith('AO06')) {
    return { valid: false, message: 'O IBAN angolano deve começar por AO06.' };
  }
  if (clean.length !== 25) {
    return { valid: false, message: `O IBAN angolano deve ter 25 caracteres (actualmente tem ${clean.length}).` };
  }
  return { valid: true };
}

/**
 * Formata um IBAN angolano com pontos padrão (AO06.0040.0000.XXXX.XXXX.XXXX.X)
 */
export function formatAngolanIban(iban: string): string {
  const clean = iban.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length < 4) return clean;
  const parts: string[] = [];
  parts.push(clean.substring(0, 4)); // AO06
  for (let i = 4; i < clean.length; i += 4) {
    parts.push(clean.substring(i, Math.min(i + 4, clean.length)));
  }
  return parts.join('.');
}

/**
 * Identifica o banco a partir do código do IBAN
 */
export function getBankFromIban(iban: string): AngolanBank | undefined {
  const clean = iban.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length >= 8 && clean.startsWith('AO06')) {
    const bankCode = clean.substring(4, 8);
    return ANGOLAN_BANKS.find((b) => b.code === bankCode);
  }
  return undefined;
}

export const getBankByIban = getBankFromIban;

/**
 * Gera um esqueleto de IBAN quando o utilizador escolhe o banco
 */
export function createSampleIbanForBank(bankCode: string): string {
  return `AO06.${bankCode}.0000.0000.0000.0000.0`;
}

/**
 * Contas bancárias oficiais pré-configuradas da Empresa OSDEL TECNOLOGIA
 */
export const SEED_COMPANY_BANK_ACCOUNTS: BankAccountRecord[] = [
  {
    id: 'co-bank-1',
    bankCode: '0040',
    bankName: 'Banco BAI',
    accountHolder: 'OSDEL TECNOLOGIA, LDA',
    iban: 'AO06.0040.0000.1234.5678.9012.3',
    accountNumber: '1234567810',
    accountType: 'operacional',
    isDefault: true,
    notes: 'Conta Principal para Pagamentos Multicaixa Express e Facturação Comercial.',
  },
  {
    id: 'co-bank-2',
    bankCode: '0006',
    bankName: 'Banco BFA',
    accountHolder: 'OSDEL TECNOLOGIA, LDA',
    iban: 'AO06.0006.0000.9876.5432.1098.7',
    accountNumber: '9876543210',
    accountType: 'operacional',
    isDefault: false,
    notes: 'Conta Secundária para Depósitos ao Balcão e Transferências Interbancárias.',
  },
  {
    id: 'co-bank-3',
    bankCode: '0055',
    bankName: 'Banco Millennium Atlântico',
    accountHolder: 'OSDEL TECNOLOGIA, LDA',
    iban: 'AO06.0055.0000.5555.4444.3333.2',
    accountNumber: '5555444433',
    accountType: 'operacional',
    isDefault: false,
    notes: 'Conta de Reserva e Liquidação de Fornecedores de Fibra.',
  },
];
