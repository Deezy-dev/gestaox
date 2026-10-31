/**
 * OSDEL TECNOLOGIA - GESTÃO CENTRALIZADA DE CREDENCIAIS (SUPER ADMIN & APKS)
 * Permite gerar, redefinir, auditar e enviar credenciais (PINs 4 dígitos, senhas, acessos)
 * para Clientes (APK Cliente) e Membros da Equipa / Colaboradores (APK Equipa & Web).
 */

export interface ClientCredentials {
  clientId: number;
  clientCode: string;
  clientName: string;
  phone: string;
  pin: string; // 4 dígitos
  password?: string;
  generatedAt: string;
  generatedBy: string;
  isActive: boolean;
}

export interface StaffCredentials {
  userId: number;
  username: string;
  name: string;
  role: 'superadmin' | 'boss' | 'admin' | 'operador' | 'tecnico';
  jobTitle?: string;
  department?: string;
  phone?: string;
  pin: string; // 4 dígitos de acesso rápido móvel
  password?: string;
  generatedAt: string;
  generatedBy: string;
  isActive: boolean;
  lastLogin?: string;
}

const CLIENT_CREDS_STORAGE_KEY = 'osdel_client_credentials';
const STAFF_CREDS_STORAGE_KEY = 'osdel_staff_credentials';

// BroadcastChannel multi-app/multi-tab sync
let credsBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    credsBroadcastChannel = new BroadcastChannel('osdel_sync_channel');
    credsBroadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'CLIENT_CREDS_UPDATED') {
        window.dispatchEvent(new CustomEvent('osdel-client-creds-updated', { detail: { clientId: event.data.clientId } }));
      } else if (event.data?.type === 'STAFF_CREDS_UPDATED') {
        window.dispatchEvent(new CustomEvent('osdel-staff-creds-updated', { detail: { userId: event.data.userId } }));
      }
    };
  } catch (e) {
    // ignore
  }
}

function broadcastClientCreds(clientId: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('osdel-client-creds-updated', { detail: { clientId } }));
    window.dispatchEvent(new CustomEvent('osdel-sync-change'));
    try {
      credsBroadcastChannel?.postMessage({ type: 'CLIENT_CREDS_UPDATED', clientId, timestamp: Date.now() });
    } catch {}
  }
}

function broadcastStaffCreds(userId: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('osdel-staff-creds-updated', { detail: { userId } }));
    window.dispatchEvent(new CustomEvent('osdel-sync-change'));
    try {
      credsBroadcastChannel?.postMessage({ type: 'STAFF_CREDS_UPDATED', userId, timestamp: Date.now() });
    } catch {}
  }
}

export const SEED_CLIENT_CREDENTIALS: Record<number, ClientCredentials> = {};

export const SEED_STAFF_CREDENTIALS: Record<number, StaffCredentials> = {
  100: {
    userId: 100,
    username: 'deezy',
    name: 'Albert Mbuyi (Deezy)',
    role: 'superadmin',
    jobTitle: 'Director Geral & Super Admin Supremo',
    department: 'Direcção Executiva',
    phone: '+244 945 882 103',
    pin: '9999',
    password: '52863400#',
    generatedAt: '2024-01-01T08:00:00Z',
    generatedBy: 'Sistema Raiz',
    isActive: true,
  },
  99: {
    userId: 99,
    username: 'boss',
    name: 'Eng. António Costa (Boss)',
    role: 'boss',
    jobTitle: 'Director Executivo & Boss (Comercial / Financeiro)',
    department: 'Direcção Comercial',
    phone: '+244 923 000 111',
    pin: '8888',
    password: 'boss',
    generatedAt: '2024-01-01T08:00:00Z',
    generatedBy: 'Super Admin (Deezy)',
    isActive: true,
  },
  98: {
    userId: 98,
    username: 'admin',
    name: 'Dra. Luísa Antunes',
    role: 'admin',
    jobTitle: 'Gerente Administrativa & Supervisora',
    department: 'Administração',
    phone: '+244 923 000 222',
    pin: '5555',
    password: 'admin',
    generatedAt: '2024-01-01T08:00:00Z',
    generatedBy: 'Super Admin (Deezy)',
    isActive: true,
  },
  3: {
    userId: 3,
    username: 'maria.teresa',
    name: 'Maria Teresa Sebastião',
    role: 'operador',
    jobTitle: 'Operadora Comercial & Atendimento de Balcão',
    department: 'Comercial',
    phone: '+244 931 445 566',
    pin: '1234',
    password: 'operador',
    generatedAt: '2024-01-01T08:00:00Z',
    generatedBy: 'Super Admin (Deezy)',
    isActive: true,
  },
  1: {
    userId: 1,
    username: 'mestre.job',
    name: 'Job Baptista (Mestre Job)',
    role: 'tecnico',
    jobTitle: 'Mestre de Piquete & Líder de Redes Fibra',
    department: 'Técnico',
    phone: '+244 923 111 222',
    pin: '1111',
    password: 'job',
    generatedAt: '2024-01-01T08:00:00Z',
    generatedBy: 'Super Admin (Deezy)',
    isActive: true,
  },
  2: {
    userId: 2,
    username: 'tecnico.helder',
    name: 'Hélder Manuel',
    role: 'tecnico',
    jobTitle: 'Técnico Instalador de TV & Fibra',
    department: 'Técnico',
    phone: '+244 923 444 888',
    pin: '2222',
    password: 'helder',
    generatedAt: '2024-01-01T08:00:00Z',
    generatedBy: 'Super Admin (Deezy)',
    isActive: true,
  },
};

// ==================== CLIENT CREDENTIALS ====================

export function getAllClientCredentials(): Record<number, ClientCredentials> {
  if (typeof window === 'undefined') return SEED_CLIENT_CREDENTIALS;
  try {
    const raw = localStorage.getItem(CLIENT_CREDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CLIENT_CREDS_STORAGE_KEY, JSON.stringify(SEED_CLIENT_CREDENTIALS));
      return SEED_CLIENT_CREDENTIALS;
    }
    const parsed = JSON.parse(raw);
    return { ...SEED_CLIENT_CREDENTIALS, ...parsed };
  } catch {
    return SEED_CLIENT_CREDENTIALS;
  }
}

export function getClientCredentials(clientId: number): ClientCredentials | null {
  const all = getAllClientCredentials();
  return all[clientId] || null;
}

export function generateOrResetClientCredentials(
  client: { id?: any; code?: any; fullName?: any; name?: any; phone?: any; [key: string]: any },
  generatedByName = 'Super Admin (Deezy)',
  customPin?: string,
): ClientCredentials {
  const all = getAllClientCredentials();
  const cId = Number(client.id || 0);
  const cCode = String(client.code || `CLI-${String(cId).padStart(5, '0')}`);
  const cName = String(client.fullName || client.name || 'Cliente');
  const cPhone = String(client.phone || '');

  // Generate random 4-digit PIN or use customPin
  const pin = customPin && customPin.trim().length === 4
    ? customPin.trim()
    : Math.floor(1000 + Math.random() * 9000).toString();
  const cleanName = cName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5) || 'cliente';
  const password = `osdel@${cleanName}`;

  const newCreds: ClientCredentials = {
    clientId: cId,
    clientCode: cCode,
    clientName: cName,
    phone: cPhone,
    pin,
    password,
    generatedAt: new Date().toISOString(),
    generatedBy: generatedByName,
    isActive: true,
  };

  all[cId] = newCreds;
  try {
    localStorage.setItem(CLIENT_CREDS_STORAGE_KEY, JSON.stringify(all));
    broadcastClientCreds(cId);
  } catch (err) {
    console.error('Erro ao salvar credenciais do cliente:', err);
  }

  return newCreds;
}

export function updateClientPin(clientId: number, newPin: string, updatedBy = 'Super Admin'): boolean {
  const all = getAllClientCredentials();
  if (!all[clientId]) return false;
  all[clientId].pin = newPin.trim();
  all[clientId].generatedAt = new Date().toISOString();
  all[clientId].generatedBy = updatedBy;
  try {
    localStorage.setItem(CLIENT_CREDS_STORAGE_KEY, JSON.stringify(all));
    broadcastClientCreds(clientId);
    return true;
  } catch {
    return false;
  }
}

export function toggleClientCredentialStatus(clientId: number): boolean {
  const all = getAllClientCredentials();
  if (!all[clientId]) return false;
  all[clientId].isActive = !all[clientId].isActive;
  try {
    localStorage.setItem(CLIENT_CREDS_STORAGE_KEY, JSON.stringify(all));
    broadcastClientCreds(clientId);
    return all[clientId].isActive;
  } catch {
    return false;
  }
}

export function verifyClientLogin(
  identifier: string, // Code (CLI-00001) or phone (+244923456789 or 923456789)
  pinOrPassword: string,
): { success: boolean; credentials?: ClientCredentials; message: string } {
  const all = getAllClientCredentials();
  const cleanId = identifier.trim().toLowerCase().replace(/\s+/g, '');
  const cleanPin = pinOrPassword.trim();

  const found = Object.values(all).find((creds) => {
    const matchCode = creds.clientCode.toLowerCase() === cleanId;
    const credPhoneClean = creds.phone.replace(/[^0-9]/g, '');
    const searchPhoneClean = cleanId.replace(/[^0-9]/g, '');
    const matchPhone = searchPhoneClean.length >= 7 && credPhoneClean.endsWith(searchPhoneClean);
    return matchCode || matchPhone;
  });

  if (!found) {
    return {
      success: false,
      message: 'Cliente não encontrado. Digite o código de cliente (ex: CLI-00001 ou CLI-00042) ou o telefone com que foi registado.',
    };
  }

  if (!found.isActive) {
    return {
      success: false,
      message: 'Acesso do cliente desactivado pela administração da OSDEL. Contacte o suporte.',
    };
  }

  if (found.pin === cleanPin || (found.password && found.password === cleanPin)) {
    return {
      success: true,
      credentials: found,
      message: 'Autenticação bem-sucedida.',
    };
  }

  return {
    success: false,
    message: 'PIN ou Senha de acesso incorrecta. Verifique os 4 dígitos ou solicite o reenvio ao suporte.',
  };
}

// ==================== STAFF CREDENTIALS ====================

export function getAllStaffCredentials(): Record<number, StaffCredentials> {
  if (typeof window === 'undefined') return SEED_STAFF_CREDENTIALS;
  try {
    const raw = localStorage.getItem(STAFF_CREDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STAFF_CREDS_STORAGE_KEY, JSON.stringify(SEED_STAFF_CREDENTIALS));
      return SEED_STAFF_CREDENTIALS;
    }
    const parsed = JSON.parse(raw);
    return { ...SEED_STAFF_CREDENTIALS, ...parsed };
  } catch {
    return SEED_STAFF_CREDENTIALS;
  }
}

export function getStaffCredentials(userId: number): StaffCredentials | null {
  const all = getAllStaffCredentials();
  return all[userId] || null;
}

export function generateOrResetStaffCredentials(
  user: { id?: any; username?: any; name?: any; role?: any; jobTitle?: any; department?: any; phone?: any; [key: string]: any },
  generatedByName = 'Super Admin (Deezy)',
  customPin?: string,
): StaffCredentials {
  const all = getAllStaffCredentials();
  const uId = Number(user.id || Date.now());
  const username = String(user.username || user.name?.toLowerCase().replace(/\s+/g, '.') || `staff.${uId}`);
  const name = String(user.name || 'Colaborador OSDEL');
  const role = (user.role || 'operador') as StaffCredentials['role'];
  const phone = String(user.phone || '');

  const pin = customPin && customPin.trim().length === 4
    ? customPin.trim()
    : Math.floor(1000 + Math.random() * 9000).toString();
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5) || 'staff';
  const password = `osdel@${cleanName}${Math.floor(10 + Math.random() * 90)}`;

  const newCreds: StaffCredentials = {
    userId: uId,
    username,
    name,
    role,
    jobTitle: user.jobTitle || 'Técnico / Operador',
    department: user.department || 'Operações',
    phone,
    pin,
    password: user.password || password,
    generatedAt: new Date().toISOString(),
    generatedBy: generatedByName,
    isActive: true,
  };

  all[uId] = newCreds;
  try {
    localStorage.setItem(STAFF_CREDS_STORAGE_KEY, JSON.stringify(all));
    broadcastStaffCreds(uId);
  } catch (err) {
    console.error('Erro ao salvar credenciais do colaborador:', err);
  }

  return newCreds;
}

export function updateStaffPin(userId: number, newPin: string, updatedBy = 'Super Admin'): boolean {
  const all = getAllStaffCredentials();
  if (!all[userId]) return false;
  all[userId].pin = newPin.trim();
  all[userId].generatedAt = new Date().toISOString();
  all[userId].generatedBy = updatedBy;
  try {
    localStorage.setItem(STAFF_CREDS_STORAGE_KEY, JSON.stringify(all));
    broadcastStaffCreds(userId);
    return true;
  } catch {
    return false;
  }
}

export function toggleStaffCredentialStatus(userId: number): boolean {
  const all = getAllStaffCredentials();
  if (!all[userId]) return false;
  all[userId].isActive = !all[userId].isActive;
  try {
    localStorage.setItem(STAFF_CREDS_STORAGE_KEY, JSON.stringify(all));
    broadcastStaffCreds(userId);
    return all[userId].isActive;
  } catch {
    return false;
  }
}

export function verifyStaffLogin(
  identifier: string, // username, name, phone, or staff ID
  pinOrPassword: string,
): { success: boolean; staff?: StaffCredentials; message: string } {
  const all = getAllStaffCredentials();
  const cleanId = identifier.trim().toLowerCase().replace(/\s+/g, '');
  const cleanPin = pinOrPassword.trim();

  const found = Object.values(all).find((s) => {
    const matchUsername = s.username.toLowerCase() === cleanId;
    const matchName = s.name.toLowerCase().includes(cleanId);
    const sPhoneClean = (s.phone || '').replace(/[^0-9]/g, '');
    const searchPhoneClean = cleanId.replace(/[^0-9]/g, '');
    const matchPhone = searchPhoneClean.length >= 7 && sPhoneClean.endsWith(searchPhoneClean);
    const matchId = String(s.userId) === cleanId;
    return matchUsername || matchName || matchPhone || matchId;
  });

  if (!found) {
    return {
      success: false,
      message: 'Colaborador não encontrado. Introduza o utilizador (ex: deezy, boss, mestre.job, maria.teresa) ou o telefone.',
    };
  }

  if (!found.isActive) {
    return {
      success: false,
      message: 'Acesso deste colaborador bloqueado pela Direcção Geral da OSDEL.',
    };
  }

  if (found.pin === cleanPin || (found.password && found.password === cleanPin)) {
    // Record last login
    found.lastLogin = new Date().toISOString();
    try {
      localStorage.setItem(STAFF_CREDS_STORAGE_KEY, JSON.stringify(all));
    } catch {}
    return {
      success: true,
      staff: found,
      message: 'Autenticação bem-sucedida.',
    };
  }

  return {
    success: false,
    message: 'PIN ou Senha incorrecta para este colaborador. Utilize o PIN de 4 dígitos ou a senha cadastrada.',
  };
}

// ==================== WHATSAPP DISPATCH UTILITIES ====================

export function formatClientWhatsAppMessage(creds: ClientCredentials, supportPhone = '244926153736'): string {
  return (
    `*OSDEL TECNOLOGIA - DADOS DE ACESSO AO APLICATIVO CLIENTE*\n\n` +
    `Olá *${creds.clientName}*,\n` +
    `Foram emitidas as suas credenciais de acesso oficial ao aplicativo móvel da OSDEL Tecnologia:\n\n` +
    `👤 *Código de Cliente:* ${creds.clientCode}\n` +
    `🔑 *PIN de Acesso (4 Dígitos):* ${creds.pin}\n` +
    `🔒 *Senha Alternativa:* ${creds.password || 'osdel123'}\n\n` +
    `No aplicativo poderá consultar as suas facturas, obter referências Multicaixa, acompanhar o estado do seu sinal e solicitar suporte técnico.\n\n` +
    `_OSDEL Tecnologia · Luanda, Angola_\n` +
    `Atendimento: +${supportPhone}`
  );
}

export function formatStaffWhatsAppMessage(creds: StaffCredentials): string {
  return (
    `*OSDEL TECNOLOGIA - CREDENCIAIS DE ACESSO OPERACIONAL*\n\n` +
    `Olá *${creds.name}*,\n` +
    `Seguem as suas credenciais para o Aplicativo da Equipa / Terminal Operacional da OSDEL:\n\n` +
    `🏷️ *Cargo:* ${creds.jobTitle || creds.role.toUpperCase()}\n` +
    `👤 *Utilizador:* ${creds.username}\n` +
    `🔑 *PIN Móvel (4 Dígitos):* ${creds.pin}\n` +
    `🔒 *Senha Web/Desktop:* ${creds.password || 'Definida pela Direcção'}\n\n` +
    `_Mantenha o seu PIN seguro. Acesso restrito a pessoal autorizado._`
  );
}
