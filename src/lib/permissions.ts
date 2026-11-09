/**
 * OSDEL TECNOLOGIA - GESTÃO CENTRALIZADA DE PERMISSÕES & NÍVEIS DE ACESSO (RBAC)
 * 
 * Níveis:
 * - superadmin / deezy: Super Administrador Geral (Deezy - Acima de todos, controlo total, licenças, APKs, APIs)
 * - boss: Boss / Direcção Executiva (Pode ver tudo comercial e financeiro, excepto decisões técnicas de OLT/portas)
 * - admin: Administrador Operacional / Gerente (Altera coisas básicas, anula facturas, gere ordens)
 * - operador: Operador de Balcão (Atendimento presencial, registo de pagamentos e clientes - apenas leitura em definições)
 * - tecnico: Técnico de Campo / Piquete (Missões de corte/religação, ordens de serviço, leitura de sinal óptico)
 */

export type UserRole = 'superadmin' | 'boss' | 'admin' | 'operador' | 'tecnico';

export interface UserSession {
  id?: number;
  username: string;
  name: string;
  role: string;
  photoUrl?: string;
  department?: string;
  jobTitle?: string;
}

export function normalizeRole(role?: string): UserRole {
  if (!role) return 'operador';
  const r = role.toLowerCase().trim();
  if (r === 'superadmin' || r === 'admin_geral' || r === 'director' || r === 'diretor' || r === 'master' || r === 'proprietario') return 'superadmin';
  if (r === 'boss' || r === 'chefe' || r === 'patrao' || r === 'direcao') return 'boss';
  if (r === 'admin' || r === 'gerente' || r === 'gestor') return 'admin';
  if (r === 'tecnico' || r === 'piquete' || r === 'instalador') return 'tecnico';
  return 'operador';
}

/**
 * Verifica se o utilizador é o Super Admin Supremo (Deezy ou role superadmin)
 * Tem acesso exclusivo a: Apps Móveis (APK), API & Desktop, Licenciamento e Controlo Total de Definições.
 */
export function isSuperAdmin(user?: UserSession | null): boolean {
  if (!user) return false;
  const username = (user.username || '').toLowerCase().trim();
  const r = normalizeRole(user.role);
  return username === 'deezy' || r === 'superadmin';
}

/**
 * Páginas exclusivas do Super Admin Supremo:
 * - Apps Móveis (APK) (/mobile-hub)
 * - API & Desktop (/api-pythonanywhere)
 * - Licenciamento (/gestao-x-licencas)
 * - Guia de Build APK (/apk-guia)
 */
export function canAccessSuperAdminOnlyPages(user?: UserSession | null): boolean {
  return isSuperAdmin(user);
}

/**
 * Permite alterar configurações estruturais, fiscais, permissões, colaboradores e dados dos APKs
 */
export function canModifyFullSettings(user?: UserSession | null): boolean {
  return isSuperAdmin(user);
}

/**
 * Permite gerir colaboradores, criar funcionários, alterar cargos e salários (apenas Super Admin Deezy)
 */
export function canManageCollaborators(user?: UserSession | null): boolean {
  return isSuperAdmin(user);
}

/**
 * Permite alterar permissões e papéis do sistema (apenas Super Admin Deezy)
 */
export function canAlterPermissions(user?: UserSession | null): boolean {
  return isSuperAdmin(user);
}

/**
 * Permite que um administrador normal altere apenas preferências básicas operacionais (impressora térmica, etiquetas, notas locais)
 * Mas NÃO permite alterar dados fiscais, licenças, permissões, nem coordenadas bancárias do APK
 */
export function canEditBasicSettings(user?: UserSession | null): boolean {
  if (!user) return false;
  const r = normalizeRole(user.role);
  return isSuperAdmin(user) || r === 'admin';
}

export function getRoleLabel(role?: string, username?: string): string {
  if (username?.toLowerCase() === 'deezy') return 'Super Admin Supremo (Deezy)';
  const norm = normalizeRole(role);
  switch (norm) {
    case 'superadmin':
      return 'Super Administrador Geral';
    case 'boss':
      return 'Boss (Direcção Comercial)';
    case 'admin':
      return 'Admin Operacional';
    case 'tecnico':
      return 'Técnico de Campo';
    case 'operador':
    default:
      return 'Operador de Balcão';
  }
}

export function getRoleBadgeStyle(role?: string, username?: string): { bg: string; text: string; border: string; label: string } {
  if (username?.toLowerCase() === 'deezy') {
    return { bg: 'bg-purple-900/40 text-purple-200 border border-purple-500/60 shadow-xs', text: 'text-purple-300 font-black', border: 'border-purple-500', label: 'SUPER ADMIN SUPREMO' };
  }
  const norm = normalizeRole(role);
  switch (norm) {
    case 'superadmin':
      return { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-800', label: 'SUPER ADMIN' };
    case 'boss':
      return { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800', label: 'BOSS' };
    case 'admin':
      return { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800', label: 'ADMIN' };
    case 'tecnico':
      return { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800', label: 'TÉCNICO' };
    case 'operador':
    default:
      return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700', label: 'OPERADOR' };
  }
}

/**
 * Boss pode ver tudo comercial/financeiro, MAS NÃO pode tomar decisões técnicas de infraestrutura
 */
export function canManageTechnicalDecisions(user?: UserSession | null): boolean {
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (r === 'boss') return false;
  return isSuperAdmin(user) || r === 'admin' || r === 'tecnico';
}

/**
 * Permite visualizar relatórios financeiros completos e contabilidade avançada
 */
export function canViewFullFinancials(user?: UserSession | null): boolean {
  if (!user) return false;
  const r = normalizeRole(user.role);
  return isSuperAdmin(user) || r === 'boss' || r === 'admin';
}

/**
 * Permite anular ou eliminar facturas
 */
export function canDeleteOrVoidInvoices(user?: UserSession | null): boolean {
  if (!user) return false;
  const r = normalizeRole(user.role);
  return isSuperAdmin(user) || r === 'boss' || r === 'admin';
}

export function isOperationalAdmin(user?: UserSession | null): boolean {
  if (!user) return false;
  const r = normalizeRole(user.role);
  return isSuperAdmin(user) || r === 'boss' || r === 'admin';
}

/**
 * Permite alterar permissões e gerir membros da equipa (apenas Super Admin e Admin Operacional autorizado)
 */
export function canManageTeam(user?: UserSession | null): boolean {
  if (!user) return false;
  return isSuperAdmin(user);
}

/**
 * Permite aprovar ou rejeitar acordos de não-corte
 */
export function canApproveAgreements(user?: UserSession | null): boolean {
  if (!user) return false;
  const r = normalizeRole(user.role);
  return isSuperAdmin(user) || r === 'boss' || r === 'admin';
}

/**
 * Permite alterar configurações do sistema
 */
export function canEditSystemSettings(user?: UserSession | null): boolean {
  return canEditBasicSettings(user);
}

