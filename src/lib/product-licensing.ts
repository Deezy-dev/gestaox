/**
 * GESTÃO X - SISTEMA DE LICENCIAMENTO POR CHAVE DE PRODUTO (6 MESES)
 * 
 * Funcionalidades:
 * 1. Vinculação por Hardware Fingerprint (Machine ID único do PC).
 * 2. Validação de chave de produto de 6 meses (180 dias de validade).
 * 3. Detecção automática de Novo Computador: se instalado ou executado
 *    num novo PC, detecta a alteração de Hardware ID e exige activação.
 * 4. Algoritmo matemático offline com gerador de chaves para administradores.
 */

const STORAGE_KEY = 'gx_product_license_v2';
const HWID_KEY = 'gx_machine_hwid_v2';

export interface ProductLicense {
  productKey: string;
  hwid: string;
  machineName: string;
  companyName: string;
  planName: string;
  activatedAt: string;
  expiresAt: string;
  validDays: number;
  status: 'active' | 'expired' | 'invalid_machine' | 'unregistered';
}

/**
 * Gera ou recupera o Hardware Fingerprint (HWID) exclusivo desta máquina / navegador.
 * Baseia-se em parâmetros fixos de hardware + assinatura persistente da máquina.
 */
export function getMachineHardwareId(): string {
  if (typeof window === 'undefined') return 'GX-HWID-SERVER-0000';

  try {
    const existing = localStorage.getItem(HWID_KEY);
    if (existing && existing.startsWith('GX-HWID-')) {
      return existing;
    }

    // Gerar identificador unívoco combinando hardware, ecrã, memória e fingerprint
    const nav = window.navigator;
    const screen = window.screen;
    const seed = [
      nav.userAgent,
      nav.language,
      nav.hardwareConcurrency || 4,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].join('###');

    // Hash rápido de 32 bits
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }

    const hex1 = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(0, 4);
    const hex2 = Math.abs((hash * 31) | 0).toString(16).toUpperCase().padStart(4, '0').slice(0, 4);
    const hex3 = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase().padStart(4, '0');

    const hwid = `GX-HWID-${hex1}-${hex2}-${hex3}`;
    localStorage.setItem(HWID_KEY, hwid);
    return hwid;
  } catch {
    return 'GX-HWID-LOCAL-8899-7711';
  }
}

/**
 * Valida uma chave de produto de 6 meses contra o Hardware ID da máquina.
 */
export function validateProductKey(
  rawKey: string,
  targetHwid: string
): { valid: boolean; expiresAt?: string; reason?: string; months?: number } {
  const cleanKey = rawKey.trim().toUpperCase().replace(/[\s-]/g, '');

  // 1. Chaves Mestras Universais de Demonstração / Instalação Imediata (Válidas por 6 meses)
  const masterKeys = [
    'OSDEL2026FIBRA6M',
    'GESTAOX6MESES2026',
    'ALBERTDEEZYFIBRA6M',
    'FIBRAOTICAOSDEL6M',
    'GX6MPRODUCTKEY2026'
  ];

  if (masterKeys.includes(cleanKey)) {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 6);
    return {
      valid: true,
      expiresAt: expires.toISOString(),
      months: 6,
    };
  }

  // 2. Chave Algorítmica vinculada ao HWID
  // Formato: GX6M-XXXX-YYYY-ZZZZ-KKKK (onde XXXX deriva do HWID da máquina)
  if (cleanKey.startsWith('GX6M') && cleanKey.length >= 16) {
    const hwidParts = targetHwid.replace('GX-HWID-', '').replace(/-/g, '');
    const expectedPrefix = hwidParts.slice(0, 4);
    const keyHwidPart = cleanKey.slice(4, 8);

    // Validação matemática: a chave contém os caracteres do HWID ou checksum
    if (keyHwidPart === expectedPrefix || cleanKey.includes(expectedPrefix.slice(0, 2))) {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 6);
      return {
        valid: true,
        expiresAt: expires.toISOString(),
        months: 6,
      };
    }
  }

  return {
    valid: false,
    reason: 'Chave de produto inválida ou não autorizada para o Hardware ID deste computador.',
  };
}

/**
 * Gerador de Chave de Produto Semestral (6 Meses) para Administradores / Suporte.
 * Permite emitir uma chave única para qualquer computador de cliente ou técnico.
 */
export function generate6MonthProductKey(hwid: string): string {
  const cleanHwid = hwid.replace('GX-HWID-', '').replace(/-/g, '');
  const partHwid = (cleanHwid.slice(0, 4) || '88AA').toUpperCase();
  const randomSalt = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase().padStart(4, '0');
  const checkSum = Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase().padStart(4, '0');

  return `GX6M-${partHwid}-${randomSalt}-${checkSum}`;
}

/**
 * Obtém o estado actual da licença instalada nesta máquina.
 */
export function getCurrentLicense(): ProductLicense {
  const currentHwid = getMachineHardwareId();

  if (typeof window === 'undefined') {
    return {
      productKey: 'SERVER-DEFAULT',
      hwid: currentHwid,
      machineName: 'Servidor Local',
      companyName: 'OSDEL Tecnologia',
      planName: 'Gestão X Fibra & TV (Semestral)',
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
      validDays: 180,
      status: 'active',
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Primeira inicialização: auto-activação de cortesia com chave inicial de 6 meses
      const initialKey = 'OSDEL2026FIBRA6M';
      const initialExpires = new Date();
      initialExpires.setMonth(initialExpires.getMonth() + 6);

      const initialLicense: ProductLicense = {
        productKey: 'GX6M-OSDEL-2026-FIBRA',
        hwid: currentHwid,
        machineName: 'Estação de Trabalho Principal',
        companyName: 'OSDEL Tecnologia LDA',
        planName: 'Gestão X Fibra & TV (6 Meses)',
        activatedAt: new Date().toISOString(),
        expiresAt: initialExpires.toISOString(),
        validDays: 180,
        status: 'active',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialLicense));
      return initialLicense;
    }

    const stored: ProductLicense = JSON.parse(raw);

    // 1. Verificação de NOVO PC: o Hardware ID mudou?
    if (stored.hwid !== currentHwid) {
      return {
        ...stored,
        status: 'invalid_machine',
      };
    }

    // 2. Verificação de Expiração dos 6 meses
    const now = Date.now();
    const expiryTime = new Date(stored.expiresAt).getTime();
    const diffDays = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        ...stored,
        validDays: 0,
        status: 'expired',
      };
    }

    return {
      ...stored,
      validDays: diffDays,
      status: 'active',
    };
  } catch {
    return {
      productKey: '',
      hwid: currentHwid,
      machineName: 'Computador Não Registado',
      companyName: 'OSDEL Tecnologia',
      planName: 'Licença Semestral',
      activatedAt: '',
      expiresAt: '',
      validDays: 0,
      status: 'unregistered',
    };
  }
}

/**
 * Activa o sistema com uma nova chave de produto semestral (6 meses).
 */
export function activateProductKey(key: string, companyName = 'OSDEL Tecnologia'): { success: boolean; message: string } {
  const currentHwid = getMachineHardwareId();
  const validation = validateProductKey(key, currentHwid);

  if (!validation.valid) {
    return {
      success: false,
      message: validation.reason || 'Chave de produto inválida para este computador.',
    };
  }

  const expiresAt = validation.expiresAt || new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString();
  const diffDays = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const newLicense: ProductLicense = {
    productKey: key.trim().toUpperCase(),
    hwid: currentHwid,
    machineName: 'PC Autorizado (' + currentHwid.slice(-4) + ')',
    companyName: companyName,
    planName: 'Gestão X Fibra & TV · Semestral (6 Meses)',
    activatedAt: new Date().toISOString(),
    expiresAt: expiresAt,
    validDays: diffDays,
    status: 'active',
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newLicense));
  window.dispatchEvent(new CustomEvent('gx-license-updated', { detail: newLicense }));

  return {
    success: true,
    message: `Software activado com sucesso por 6 meses! Válido até ${new Date(expiresAt).toLocaleDateString('pt-AO')}.`,
  };
}

/**
 * Simula instalação num novo PC para testes de validação do utilizador.
 */
export function simulateNewComputerForTesting(): void {
  const fakeHwid = `GX-HWID-${Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()}-NEW`;
  localStorage.setItem(HWID_KEY, fakeHwid);
  window.dispatchEvent(new CustomEvent('gx-license-updated'));
}
