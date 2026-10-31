import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { useCustomHashLocation } from '@/lib/hash-router';
import { AlertCircle, ArrowDownRight, ArrowRightLeft, ArrowUpRight, Banknote, Bell, BriefcaseBusiness, Calculator, Calendar, Check, ChevronRight, CircleDollarSign, ClipboardList, Database, Eye, EyeOff, FilePenLine, FileSignature, FileText, Globe2, KeyRound, LayoutDashboard, Layers, Lock, LogOut, Menu, MessageSquare, Package, Palette, Plus, Printer, ReceiptText, RefreshCw, Save, Search, Send, Settings, ShieldCheck, Smartphone, Trash2, Tv, UserRound, Users, Wifi, Wrench, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { authenticate, getGetClientQueryKey, getGetDashboardQueryKey, getGetSettingsQueryKey, getListClientsQueryKey, getListExpensesQueryKey, getListMessagesQueryKey, getListPaymentsQueryKey, getListUsersQueryKey, signOut, useCreateClient, useCreateContract, useCreateExpense, useCreateMessage, useCreatePayment, useCreateUser, useDeleteUser, useGetClient, useGetDashboard, useGetReports, useGetSettings, useHealthCheck, useListClientContracts, useListClients, useListExpenses, useListMessages, useListPayments, useListUsers, useUpdateClient, useUpdateSettings } from '@/lib/local-api';
import type { Client } from '@/lib/local-api';
import { ContractsEnhanced, InvoicesEnhanced } from '@/pages/operations';
import { SettingsAdvancedPage } from '@/pages/settings-advanced';
import { ClientsPage, PaymentsPage, ReportsPage, MessagesPage } from '@/pages/business';
import { InventoryPage } from '@/pages/inventory';
import { ServiceOrdersPage } from '@/pages/service-orders';
import { ClientDetailPage } from '@/pages/client-details';
import { RappelsPage } from '@/pages/rappels-advanced';
import { AccountingPage } from '@/pages/accounting-advanced';
import { TeamManagement } from '@/pages/team-management';
import { UserProfilePage } from '@/pages/user-profile';
import { ReportsAdvancedPage } from '@/pages/reports-advanced';
import { SchedulePage } from '@/pages/schedule-page';
import { TeamMissionsPage } from '@/pages/team-missions-page';
import { AccountsPage } from '@/pages/accounts-page';
import { PrintPage } from '@/pages/print-page';
import { ServiceSelectionPage } from '@/pages/service-selection-page';
import { ServiceModeSwitcher } from '@/components/service-mode-switcher';
import { useServiceMode, getStoredServiceMode } from '@/lib/service-mode';
import { SoftwareLicensingPage } from '@/pages/software-licensing';
import { MobileHub } from '@/pages/mobile-hub';
import { ApkBuildGuidePage } from '@/pages/apk-build-guide';
import { ClientMobileAppPage } from '@/pages/client-mobile-app';
import { StaffMobileAppPage } from '@/pages/staff-mobile-app';
import { PythonAnywhereApiPage } from '@/pages/pythonanywhere-api-page';
import { SuperAdminCredentialsPage } from '@/pages/superadmin-credentials-page';
import { TvChannelsPage } from '@/pages/tv-channels-page';
import { isSuperAdmin } from '@/lib/permissions';
import { useTenants } from '@/hooks/use-tenants';
import { SingleWindowGuard } from '@/components/single-window-guard';
import NotFound from '@/pages/not-found';
import { registerQueryClient, reloadAllFromStorage } from '@/lib/local-api';
import { initAutomatedSubscriptionService } from '@/lib/subscription-notifications';
import { initOnlineFirstAppSync } from '@/lib/online-first-sync';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
    },
  },
});
registerQueryClient(queryClient);

const nav = [
  { label: 'Visão geral', href: '/', icon: LayoutDashboard },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Canais TV & Caixas', href: '/canais-tv', icon: Tv },
  { label: 'Agenda & Escalas', href: '/agenda', icon: Calendar },
  { label: 'Missões & Piquete', href: '/missoes', icon: ShieldCheck },
  { label: 'Ordens de Serviço', href: '/ordens-servico', icon: Wrench },
  { label: 'Inventário & Stock', href: '/inventario', icon: Package },
  { label: 'Contratos', href: '/contratos', icon: FileText },
  { label: 'Pagamentos', href: '/pagamentos', icon: Banknote },
  { label: 'Facturas', href: '/facturas', icon: ReceiptText },
  { label: 'Contas & Tesouraria', href: '/contas', icon: CircleDollarSign },
  { label: 'Relatórios', href: '/relatorios', icon: ClipboardList },
  { label: 'Mensagens', href: '/mensagens', icon: MessageSquare },
  { label: 'Rappels & Cortes', href: '/rappels', icon: Bell },
  { label: 'Equipa', href: '/equipe', icon: Users },
  { label: 'Contabilidade & Fecho', href: '/contabilidade', icon: Calculator },
  { label: 'Gerador de Credenciais', href: '/credenciais-superadmin', icon: KeyRound, superAdminOnly: true },
  { label: 'Apps Móveis (APK)', href: '/mobile-hub', icon: Smartphone, superAdminOnly: true },
  { label: 'API & Desktop', href: '/api-pythonanywhere', icon: Database, superAdminOnly: true },
  { label: 'Perfil', href: '/perfil', icon: UserRound },
  { label: 'Licenciamento', href: '/gestao-x-licencas', icon: ShieldCheck, superAdminOnly: true },
  { label: 'Definições', href: '/administracao', icon: Settings },
];

const kz = (value: unknown) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(Number(value || 0)).replace('AOA', 'Kz');
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';
const initials = (name = '') => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'OS';
const serviceLabel = (service?: string) => service === 'combo' ? 'TV + Internet' : service === 'internet' ? 'Internet Fibra' : 'TV';
// Sempre que se abre uma janela tem que pedir login: usamos sessionStorage ('osdel-window-session')
const session = () => { try { return JSON.parse(sessionStorage.getItem('osdel-window-session') || 'null'); } catch { return null; } };

function Button({ children, variant = 'primary', onClick, type = 'button', disabled = false, className = '', testId, form }: { children: ReactNode; variant?: 'primary' | 'quiet' | 'outline' | 'danger'; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; className?: string; testId?: string; form?: string }) {
  const styles = { primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110', quiet: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))]', outline: 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]', danger: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:brightness-110' };
  return <button data-testid={testId} form={form} type={type} onClick={onClick} disabled={disabled} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-[hsl(var(--foreground))]">{label}</span>{children}{hint && <small className="block text-[11px] text-[hsl(var(--muted-foreground))]">{hint}</small>}</label>;
}
function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} autoComplete={props.autoComplete || (props.type === 'password' ? 'current-password' : undefined)} className={`h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)] ${props.className || ''}`} />; }
function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={`h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-[hsl(var(--primary))] ${props.className || ''}`} />; }
function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={`w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] ${props.className || ''}`} />; }
function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'good' | 'warn' | 'bad' | 'neutral' }) { const colors = { good: 'bg-[#dceee5] text-[#237052]', warn: 'bg-[#f7e9c9] text-[#946c22]', bad: 'bg-[#f8e1da] text-[#a24e3a]', neutral: 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]' }; return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${colors[tone]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>; }
function Status({ value }: { value?: string }) { const label: Record<string, string> = { active: 'Activo', inactive: 'Inactivo', late: 'Em atraso', suspended: 'Suspenso', paid: 'Pago', pending: 'Pendente' }; const tone = value === 'active' || value === 'paid' ? 'good' : value === 'late' || value === 'pending' ? 'warn' : value === 'suspended' || value === 'inactive' ? 'bad' : 'neutral'; return <Badge tone={tone}>{label[value || ''] || value || '—'}</Badge>; }
function Modal({ title, eyebrow = 'Registo', children, onClose }: { title: string; eyebrow?: string; children: ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142f35]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"><div className="max-h-[92dvh] w-full max-w-2xl overflow-auto rounded-t-2xl bg-[hsl(var(--card))] shadow-2xl sm:rounded-2xl"><header className="sticky top-0 z-10 flex items-start justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] px-5 py-4 backdrop-blur sm:px-7"><div><p className="eyebrow">{eyebrow}</p><h2 className="mt-1 font-serif text-2xl">{title}</h2></div><button aria-label="Fechar janela" data-testid="button-close-modal" onClick={onClose} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"><X size={19} /></button></header><div className="p-5 sm:p-7">{children}</div></div></div>; }
function PageHeader({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) { return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.6rem]">{title}</h1><p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{detail}</p></div>{action}</div>; }
function Loading() { return <div data-testid="loading-state" className="surface space-y-4 rounded-xl p-6">{[1, 2, 3, 4].map((item) => <div key={item} className="flex animate-pulse gap-3"><div className="h-10 w-10 rounded-lg bg-[hsl(var(--muted))]" /><div className="flex-1 space-y-2"><div className="h-3 w-1/3 rounded bg-[hsl(var(--muted))]" /><div className="h-2 w-2/3 rounded bg-[hsl(var(--muted))]" /></div></div>)}</div>; }
function ErrorBlock({ retry }: { retry?: () => void }) { return <div data-testid="error-state" className="surface flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl p-8 text-center"><AlertCircle className="text-[hsl(var(--destructive))]" /><b>Não foi possível carregar estes dados.</b><p className="text-sm text-[hsl(var(--muted-foreground))]">Verifique os dados locais e tente novamente.</p>{retry && <Button variant="outline" onClick={retry}><RefreshCw size={15} /> Tentar novamente</Button>}</div>; }
function Empty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) { return <div data-testid="empty-state" className="surface flex min-h-48 flex-col items-center justify-center rounded-xl p-8 text-center"><div className="mb-3 rounded-xl bg-[hsl(var(--secondary))] p-3 text-[hsl(var(--primary))]"><ClipboardList size={22} /></div><b>{title}</b><p className="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>{action && <div className="mt-4">{action}</div>}</div>; }

import { getCompanyLogo } from '@/lib/company-logo';
import { OSDEL_LOGO_BASE64 } from '@/lib/osdel-logo-base64';
import { getUnreadCount } from '@/lib/notifications';
import { NotificationsModal } from '@/components/notifications-modal';
import { SyncStatusPill } from '@/components/sync-status-pill';
import { OfflineBanner } from '@/components/offline-banner';
import { PWAInstallButton } from '@/components/pwa-install-button';
import { AiAssistantWidget } from '@/components/ai-assistant-modal';
function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState(false);
  const [unreadNotices, setUnreadNotices] = useState(() => getUnreadCount());
  const [currentLogo, setCurrentLogo] = useState(() => getCompanyLogo());
  const { activeTenant } = useTenants();
  const health = useHealthCheck();
  const user = session();
  const { mode, meta, selectMode } = useServiceMode();
  const current =
    nav.find((item) => item.href === location)?.label ||
    (location.startsWith('/clientes/') ? 'Clientes' : 'Centro de operações');

  const [privacyMode, setPrivacyMode] = useState(() => {
    try {
      return localStorage.getItem('osdel-privacy-mode') === 'true';
    } catch {
      return false;
    }
  });

  const togglePrivacyMode = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    try {
      localStorage.setItem('osdel-privacy-mode', String(next));
      window.dispatchEvent(new CustomEvent('osdel-privacy-mode-changed', { detail: next }));
    } catch {}
  };

  useEffect(() => {
    const handleNotifs = () => setUnreadNotices(getUnreadCount());
    const handleLogo = () => setCurrentLogo(getCompanyLogo());
    window.addEventListener('osdel-notifications-updated', handleNotifs);
    window.addEventListener('osdel-logo-updated', handleLogo);

    // Sincroniza o modo de operação inicial (Fibra / TV) quando iniciado pelo Electron
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get('mode');
      const electronMode = (window as any).electronAPI?.appMode;
      const targetMode =
        urlMode === 'fibra' || urlMode === 'tv' || urlMode === 'ambos'
          ? urlMode
          : electronMode === 'fibra' || electronMode === 'tv'
          ? electronMode
          : null;
      if (targetMode && targetMode !== mode) {
        selectMode(targetMode as any);
      }
    } catch {}

    return () => {
      window.removeEventListener('osdel-notifications-updated', handleNotifs);
      window.removeEventListener('osdel-logo-updated', handleLogo);
    };
  }, [selectMode, mode]);

  return (
    <div className="app-shell flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] shadow-2xl transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Link href="/" data-testid="link-brand" className="flex items-center gap-3 group">
            <img
              src={currentLogo || OSDEL_LOGO_BASE64}
              alt="OSDEL Tecnologia"
              className="h-10 w-10 rounded-xl bg-white p-1 object-contain border border-slate-700/60 shadow-xs shrink-0 company-logo"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = OSDEL_LOGO_BASE64;
              }}
            />
            <div>
              <div className="font-serif text-xl font-bold tracking-tight text-[hsl(var(--sidebar-foreground))]">
                Gestão X
              </div>
              <div className="text-[10px] font-medium text-[hsl(var(--sidebar-foreground)/.5)]">
                {activeTenant?.tradingName || 'OSDEL Tecnologia'}
              </div>
            </div>
          </Link>
          <button
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 lg:hidden text-[hsl(var(--sidebar-foreground)/.6)] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modalidade de Trabalho */}
        <div className="mt-4 px-2">
          <Link
            href="/selecionar-servico"
            title="Alterar modalidade de serviço (Fibra / TV / Ambos)"
            className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.4)] text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition"
          >
            <div className="flex items-center gap-2 truncate">
              {mode === 'fibra' ? (
                <Wifi size={14} className="shrink-0 text-blue-400" />
              ) : mode === 'tv' ? (
                <Tv size={14} className="shrink-0 text-amber-400" />
              ) : (
                <Layers size={14} className="shrink-0 text-emerald-400" />
              )}
              <span className="truncate">{meta.shortName}</span>
            </div>
            <span className="text-[10px] text-[hsl(var(--sidebar-foreground)/.5)] hover:underline shrink-0">Trocar</span>
          </Link>
        </div>

        <div className="mt-4 px-2 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--sidebar-foreground)/.42)]">
          Centro de controlo
        </div>

        <nav className="mt-2 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)] pr-1">
          {nav
            .filter((item) => !(item as any).superAdminOnly || isSuperAdmin(user))
            .map((item) => {
            const Icon = item.icon;
            const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]'
                    : 'text-[hsl(var(--sidebar-foreground)/.67)] hover:bg-[hsl(var(--sidebar-accent)/.7)] hover:text-[hsl(var(--sidebar-foreground))]'
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/perfil"
              className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-90 transition"
            >
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user?.name || 'Perfil'}
                  className="h-8 w-8 rounded-lg object-cover border border-white/20 shrink-0"
                />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--sidebar-primary)/.2)] text-xs font-black text-[hsl(var(--sidebar-primary))] shrink-0">
                  {initials(user?.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">{user?.name || 'Administrador'}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    user?.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {user?.role === 'admin' ? 'ADMIN GERAL' : 'OPERADOR'}
                  </span>
                </div>
              </div>
            </Link>
            <button
              title="Sair"
              data-testid="button-logout"
              className="ml-auto text-[hsl(var(--sidebar-foreground)/.5)] hover:text-white"
              onClick={() => {
                signOut();
                setLocation('/login');
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-30 bg-[#142f35]/35 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.9)] px-4 backdrop-blur-md sm:px-7 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menu"
              data-testid="button-open-sidebar"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 hover:bg-[hsl(var(--secondary))] lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="eyebrow hidden sm:block">
                {activeTenant?.tradingName || 'OSDEL TECNOLOGIA'} / {current}
              </div>
              <div className="font-serif text-xl sm:hidden">{current}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ServiceModeSwitcher />
            <SyncStatusPill />
            <PWAInstallButton variant="compact" className="hidden xl:inline-flex" />

            <div
              className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold 2xl:flex ${
                health.isError ? 'bg-[#f8e1da] text-[#a24e3a]' : 'bg-[#dceee5] text-[#237052]'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {health.isError ? 'Sistema indisponível' : 'Sistema operacional'}
            </div>

            {/* Modo Balcão / Privacidade de Valores */}
            <button
              type="button"
              aria-label={privacyMode ? 'Modo Balcão Activo (Valores Ocultos)' : 'Activar Modo Balcão'}
              title={privacyMode ? 'Modo Balcão Activo (Valores Ocultos aos Clientes) - Clique para Exibir' : 'Modo Balcão Desactivado - Clique para Ocultar Valores aos Clientes'}
              onClick={togglePrivacyMode}
              className={`rounded-lg px-2.5 py-1.5 transition flex items-center gap-1.5 text-xs font-semibold ${
                privacyMode
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              {privacyMode ? <EyeOff size={16} className="text-amber-600 dark:text-amber-400" /> : <Eye size={16} />}
              <span className="hidden lg:inline text-[11px] font-bold">
                {privacyMode ? 'Modo Balcão' : 'Ocultar Valores'}
              </span>
            </button>

            {/* Notification Bell with live counter badge */}
            <button
              aria-label="Ver notificações"
              data-testid="button-notifications"
              onClick={() => {
                setNotices(true);
                setUnreadNotices(0);
              }}
              className="relative rounded-lg p-2.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition"
            >
              <Bell size={19} />
              {unreadNotices > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-[hsl(var(--background))] animate-pulse">
                  {unreadNotices > 9 ? '9+' : unreadNotices}
                </span>
              ) : (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500/40" />
              )}
            </button>

            <div className="hidden h-8 w-px bg-[hsl(var(--border))] sm:block" />

            <Link href="/administracao" title="Definições e Logotipo da Empresa">
              <img
                src={activeTenant?.logoUrl || currentLogo}
                alt={activeTenant?.tradingName || 'Empresa'}
                className="h-8 w-8 rounded-full border border-[hsl(var(--border))] object-contain bg-white p-0.5 hover:scale-105 transition"
              />
            </Link>
          </div>
        </header>

        <OfflineBanner />

        <div className="page-enter mx-auto max-w-[1480px] p-4 sm:p-7 lg:p-10">{children}</div>
      </main>

      {notices && <NotificationsModal onClose={() => setNotices(false)} />}
      <AiAssistantWidget persona="admin" />
    </div>
  );
}

function Dashboard() {
  const { mode, meta } = useServiceMode();
  const q = useGetDashboard(mode || '');
  const [privacy, setPrivacy] = useState(() => {
    try {
      return localStorage.getItem('osdel-privacy-mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handlePrivacy = (e: any) => {
      setPrivacy(e.detail !== undefined ? e.detail : localStorage.getItem('osdel-privacy-mode') === 'true');
    };
    window.addEventListener('osdel-privacy-mode-changed', handlePrivacy);
    return () => window.removeEventListener('osdel-privacy-mode-changed', handlePrivacy);
  }, []);

  if (q.isLoading)
    return (
      <>
        <PageHeader
          eyebrow={`Operações ${meta.shortName} / hoje`}
          title={`Visão geral · ${meta.name}`}
          detail="O pulso da sua operação, num único lugar."
        />
        <Loading />
      </>
    );
  if (q.isError || !q.data) return <ErrorBlock retry={() => q.refetch()} />;
  const d = q.data;
  const cards = [
    {
      label: mode === 'fibra' ? 'Clientes Fibra activos' : mode === 'tv' ? 'Clientes TV activos' : 'Clientes activos',
      value: d.activeClients,
      detail: `${d.inactiveClients} fora de serviço`,
      icon: mode === 'fibra' ? Wifi : mode === 'tv' ? Tv : Users,
      tone: 'bg-[#dceee5] text-[#237052]',
    },
    {
      label: mode === 'fibra' ? 'Receita Fibra do mês' : mode === 'tv' ? 'Receita TV do mês' : 'Receita do mês',
      value: privacy ? '•••••• Kz' : kz(d.revenue),
      detail: privacy ? 'Modo balcão activo' : 'Pagamentos confirmados',
      icon: CircleDollarSign,
      tone: 'bg-[#f8e3d6] text-[#a24e3a]',
    },
    {
      label: 'Pagamentos recebidos',
      value: d.paidClients,
      detail: `${d.unpaidClients} ainda por liquidar`,
      icon: ReceiptText,
      tone: 'bg-[#dfeaf2] text-[#426b83]',
    },
    {
      label: 'Em atraso',
      value: d.lateClients,
      detail: 'Contactar antes do corte',
      icon: Bell,
      tone: 'bg-[#f7e9c9] text-[#946c22]',
    },
  ];
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Operações ${meta.shortName} / ${new Intl.DateTimeFormat('pt-AO', { month: 'long', year: 'numeric' }).format(new Date())}`}
        title={`Bom dia, ${session()?.name?.split(' ')[0] || 'equipa'}.`}
        detail={
          mode === 'fibra'
            ? 'Acompanhamento exclusivo de Internet Fibra Óptica, caixas PDO, ONUs e planos de banda larga.'
            : mode === 'tv'
            ? 'Acompanhamento exclusivo de TV Comunitária, sinal RF, mensalidades e derivações.'
            : 'Pequenas decisões, sem perder o fio.'
        }
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/selecionar-servico"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[hsl(var(--border))] text-xs font-bold hover:bg-[hsl(var(--secondary))] transition"
            >
              <Layers size={14} /> Trocar Modo ({meta.shortName})
            </Link>
            <Button variant="outline" onClick={() => q.refetch()}>
              <RefreshCw size={15} /> Actualizar
            </Button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const href =
            card.label.includes('Clientes')
              ? '/clientes?status=active'
              : card.label.includes('Receita') || card.label.includes('Pagamentos')
              ? '/pagamentos'
              : '/clientes?status=late';
          return (
            <Link
              key={card.label}
              href={href}
              className="surface rise-in group rounded-xl p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${card.tone}`}>
                  <Icon size={19} />
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-[hsl(var(--muted-foreground))] opacity-0 transition group-hover:opacity-100"
                />
              </div>
              <div data-testid={`value-${card.label}`} className="mt-5 text-[1.7rem] font-black tracking-tight">
                {card.value}
              </div>
              <div className="mt-1 text-xs font-bold">{card.label}</div>
              <div className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{card.detail}</div>
            </Link>
          );
        })}
      </div>

      {/* Centro de Atalhos Rápidos & Balcão */}
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--secondary)/.35)] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))] font-bold text-xs">
              GX
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-[hsl(var(--foreground))]">
                Operações de Balcão & Controlo Rápido
              </h3>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Aceda às rotinas mais frequentes de atendimento sem navegar por múltiplos menus
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Atalhos de Balcão
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            href="/pagamentos"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] hover:border-[hsl(var(--primary)/.4)] transition text-center group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition mb-2">
              <Banknote size={18} />
            </div>
            <span className="text-xs font-bold text-[hsl(var(--foreground))]">Registar Pagamento</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">MCX ou Cash</span>
          </Link>

          <Link
            href="/clientes"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] hover:border-[hsl(var(--primary)/.4)] transition text-center group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition mb-2">
              <Users size={18} />
            </div>
            <span className="text-xs font-bold text-[hsl(var(--foreground))]">Lista de Clientes</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Pesquisa & Filtro</span>
          </Link>

          <Link
            href="/missoes"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] hover:border-[hsl(var(--primary)/.4)] transition text-center group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition mb-2">
              <ShieldCheck size={18} />
            </div>
            <span className="text-xs font-bold text-[hsl(var(--foreground))]">Piquete & Cortes</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Ruas e Caixas PDO</span>
          </Link>

          <Link
            href="/canais-tv"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] hover:border-[hsl(var(--primary)/.4)] transition text-center group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition mb-2">
              <Tv size={18} />
            </div>
            <span className="text-xs font-bold text-[hsl(var(--foreground))]">Central de TV</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Canais & ZAP/Canal+</span>
          </Link>

          <Link
            href="/imprimir"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] hover:border-[hsl(var(--primary)/.4)] transition text-center group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition mb-2">
              <Printer size={18} />
            </div>
            <span className="text-xs font-bold text-[hsl(var(--foreground))]">Talão POS (80mm)</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Impressão Térmica</span>
          </Link>

          <Link
            href="/mobile-hub"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] hover:border-[hsl(var(--primary)/.4)] transition text-center group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition mb-2">
              <Smartphone size={18} />
            </div>
            <span className="text-xs font-bold text-[hsl(var(--foreground))]">Apps Móveis (APK)</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Cliente & Técnicos</span>
          </Link>

          <Link
            href="/api-pythonanywhere"
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] hover:border-[hsl(var(--primary)/.4)] transition text-center group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition mb-2">
              <Database size={18} />
            </div>
            <span className="text-xs font-bold text-[hsl(var(--foreground))]">API & Sincronização</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">PythonAnywhere</span>
          </Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <section className="surface rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Receita & cobranças · {meta.shortName}</p>
              <h2 className="mt-1 text-lg font-extrabold">Ritmo de pagamentos</h2>
            </div>
            <Link href="/relatorios" className="flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))]">
              Ver relatório <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mt-8 flex h-44 items-end gap-2 sm:gap-4">
            {[43, 58, 49, 67, 61, 77, 72, 90, 82, 96, 87, 100].map((height, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-md transition group-hover:opacity-70 ${
                    i > 9 ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary)/.72)]'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][i]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-5 border-t border-[hsl(var(--border))] pt-4 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
              Receita recebida ({meta.shortName})
            </span>
            <span className="flex items-center gap-2">
              <i className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
              Mês corrente
            </span>
          </div>
        </section>
        <section className="surface rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Fila de trabalho · {meta.shortName}</p>
              <h2 className="mt-1 text-lg font-extrabold">Pedir atenção</h2>
            </div>
            <AlertCircle className="text-[hsl(var(--accent))]" size={19} />
          </div>
          <div className="mt-6 space-y-3">
            <Link
              href="/clientes?status=late"
              className="flex items-center justify-between rounded-lg bg-[hsl(var(--secondary)/.6)] p-3.5 hover:bg-[hsl(var(--secondary))]"
            >
              <div>
                <b className="text-sm">Cobranças em atraso</b>
                <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {mode === 'tv' ? 'Clientes TV sem pagamento' : mode === 'fibra' ? 'Clientes Fibra sem pagamento' : 'Requerem contacto'}
                </div>
              </div>
              <span className="mono text-lg font-black text-[hsl(var(--accent))]">{d.lateClients}</span>
            </Link>
            <Link
              href="/ordens-servico"
              className="flex items-center justify-between rounded-lg bg-[hsl(var(--secondary)/.6)] p-3.5 hover:bg-[hsl(var(--secondary))]"
            >
              <div>
                <b className="text-sm">Ordens de serviço</b>
                <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {mode === 'tv' ? 'Piquete TV' : mode === 'fibra' ? 'Piquete Fibra Óptica' : 'Pendentes ou em curso'}
                </div>
              </div>
              <span className="mono text-lg font-black text-[hsl(var(--primary))]">{d.pendingServiceOrders || 0}</span>
            </Link>
            <Link
              href="/inventario"
              className="flex items-center justify-between rounded-lg bg-[hsl(var(--secondary)/.6)] p-3.5 hover:bg-[hsl(var(--secondary))]"
            >
              <div>
                <b className="text-sm">Stock em alerta</b>
                <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {mode === 'tv' ? 'Materiais de TV (coaxial, fichas F)' : mode === 'fibra' ? 'Materiais de Fibra (drops, ONUs, SC/APC)' : 'Limite mínimo atingido'}
                </div>
              </div>
              <span className="mono text-lg font-black text-[#a24e3a]">{d.lowStockItems || 0}</span>
            </Link>
            <Link
              href="/mensagens"
              className="flex items-center justify-between rounded-lg bg-[hsl(var(--secondary)/.6)] p-3.5 hover:bg-[hsl(var(--secondary))]"
            >
              <div>
                <b className="text-sm">Pedidos e mensagens</b>
                <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">Aguardam resposta</div>
              </div>
              <span className="mono text-lg font-black text-[hsl(var(--primary))]">{d.openRequests}</span>
            </Link>
          </div>
        </section>
      </div>
      <section className="surface rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Linha do tempo · {meta.shortName}</p>
            <h2 className="mt-1 text-lg font-extrabold">Actividade recente</h2>
          </div>
          <ArrowUpRight size={18} className="text-[hsl(var(--muted-foreground))]" />
        </div>
        {d.recentActivity.length ? (
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {d.recentActivity.slice(0, 6).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-[hsl(var(--border))] p-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                <div>
                  <b className="text-sm">{item.description}</b>
                  <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{date(item.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Ainda não há actividade registada para {meta.shortName}.
          </p>
        )}
      </section>
    </div>
  );
}

const emptyClient = { fullName: '', phone: '', alternatePhone: '', email: '', address: '', neighborhood: '', documentNumber: '', houseCode: '', pdoNumber: '', onuNumber: '', serviceType: 'tv', notes: '' };
function ClientForm({ client, close }: { client?: Client; close: () => void }) {
  const qc = useQueryClient(); const [form, setForm] = useState<any>(client ? { ...emptyClient, ...client } : emptyClient); const create = useCreateClient(); const update = useUpdateClient(); const set = (key: string, value: string) => setForm((f: any) => ({ ...f, [key]: value }));
  const submit = (e: FormEvent) => { e.preventDefault(); if (!form.fullName || !form.phone || !form.address) return; const data = { ...form, email: form.email || null, alternatePhone: form.alternatePhone || null, neighborhood: form.neighborhood || null, documentNumber: form.documentNumber || null, houseCode: form.houseCode || null, pdoNumber: form.pdoNumber || null, onuNumber: form.onuNumber || null, notes: form.notes || null }; const done = () => { qc.invalidateQueries({ queryKey: getListClientsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); close(); }; client ? update.mutate({ clientId: client.id, data }, { onSuccess: done }) : create.mutate({ data }, { onSuccess: done }); };
  return <Modal title={client ? 'Editar cliente' : 'Novo cliente'} eyebrow="Base de clientes" onClose={close}><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo *"><Input data-testid="input-client-name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required /></Field><Field label="Telefone principal *"><Input data-testid="input-client-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} required /></Field><Field label="Telefone alternativo"><Input value={form.alternatePhone} onChange={(e) => set('alternatePhone', e.target.value)} /></Field><Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field><Field label="Morada *"><Input value={form.address} onChange={(e) => set('address', e.target.value)} required /></Field><Field label="Bairro"><Input value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} /></Field><Field label="N.º de documento"><Input value={form.documentNumber} onChange={(e) => set('documentNumber', e.target.value)} /></Field><Field label="Código da casa"><Input value={form.houseCode} onChange={(e) => set('houseCode', e.target.value)} /></Field><Field label="Tipo de serviço"><Select value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)}><option value="tv">TV</option><option value="internet">Internet Fibra</option><option value="combo">TV + Internet</option></Select></Field><Field label="PDO / caixa"><Input value={form.pdoNumber} onChange={(e) => set('pdoNumber', e.target.value)} /></Field><Field label="ONU"><Input value={form.onuNumber} onChange={(e) => set('onuNumber', e.target.value)} /></Field></div><Field label="Notas internas"><Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={close}>Cancelar</Button><Button type="submit" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'A guardar…' : <><Check size={15} /> Guardar cliente</>}</Button></div></form></Modal>;
}

function Clients() {
  const [search, setSearch] = useState(''); const [serviceFilter, setServiceFilter] = useState(''); const [statusFilter, setStatusFilter] = useState(() => new URLSearchParams(window.location.search).get('status') || ''); const [modal, setModal] = useState(false); const [edit, setEdit] = useState<Client>(); const q = useListClients({ search, serviceType: serviceFilter || undefined, status: statusFilter || undefined }); const items = q.data?.items || [];
  return <div><PageHeader eyebrow="Base operacional" title="Clientes" detail="Acompanhe pessoas, moradas e serviços sem perder uma informação." action={<Button onClick={() => { setEdit(undefined); setModal(true); }}><Plus size={16} /> Novo cliente</Button>} /><div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="relative max-w-xl flex-1"><Search className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={17} /><Input data-testid="input-search-clients" placeholder="Pesquisar por nome, código, telefone ou documento" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div><Select aria-label="Filtrar por serviço" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className="sm:w-44"><option value="">Todos os serviços</option><option value="tv">TV</option><option value="internet">Internet Fibra</option><option value="combo">TV + Internet</option></Select><Select aria-label="Filtrar por estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40"><option value="">Todos os estados</option><option value="active">Activos</option><option value="late">Em atraso</option><option value="suspended">Suspensos</option><option value="inactive">Inactivos</option></Select></div>{q.isLoading ? <Loading /> : q.isError ? <ErrorBlock retry={() => q.refetch()} /> : items.length === 0 ? <Empty title="Nenhum cliente encontrado" detail="Ajuste a pesquisa ou adicione o primeiro cliente." action={<Button onClick={() => setModal(true)}><Plus size={15} /> Adicionar cliente</Button>} /> : <div className="surface overflow-hidden rounded-xl"><div className="mobile-scroll overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><th className="px-5 py-4">Cliente</th><th>Serviço</th><th>Contacto</th><th>Estado</th><th className="px-5">Acção</th></tr></thead><tbody>{items.map((client: Client) => <tr key={client.id} data-testid={`row-client-${client.id}`} className="border-b border-[hsl(var(--border)/.7)] last:border-0 hover:bg-[hsl(var(--secondary)/.35)]"><td className="px-5 py-4"><Link href={`/clientes/${client.id}`} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-xs font-black text-[hsl(var(--primary))]">{initials(client.fullName)}</span><span><b className="block text-sm">{client.fullName}</b><small className="mono text-[10px] text-[hsl(var(--muted-foreground))]">{client.code}</small></span></Link></td><td><span className="text-xs font-semibold">{serviceLabel(client.serviceType)}</span></td><td><span className="text-xs">{client.phone}</span><small className="block text-[11px] text-[hsl(var(--muted-foreground))]">{client.neighborhood || client.address}</small></td><td><Status value={client.status} /></td><td className="px-5"><button data-testid={`button-edit-client-${client.id}`} onClick={() => { setEdit(client); setModal(true); }} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"><FilePenLine size={16} /></button></td></tr>)}</tbody></table></div></div>}{modal && <ClientForm client={edit} close={() => setModal(false)} />}</div>;
}

function ClientDetails() {
  const params = useParams<{ id: string }>(); const id = Number(params.id); const q = useGetClient(id); const contracts = useListClientContracts(id); const qc = useQueryClient(); const [edit, setEdit] = useState(false); const [payment, setPayment] = useState(false); const pay = useCreatePayment(); const [amount, setAmount] = useState('');
  if (q.isLoading) return <Loading />; if (q.isError || !q.data) return <ErrorBlock />; const c = q.data; const record = contracts.data || [];
  const payNow = (e: FormEvent) => { e.preventDefault(); pay.mutate({ data: { clientId: id, contractId: record[0]?.id, amount: Number(amount), paymentMonth: new Date().toISOString().slice(0, 7), method: 'numerário', reference: '' } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetClientQueryKey(id) }); qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() }); setPayment(false); setAmount(''); } }); };
  return <div><PageHeader eyebrow="Ficha de cliente" title={c.fullName} detail={`${c.code} · registado em ${date(c.createdAt)}`} action={<div className="flex gap-2"><Button variant="outline" onClick={() => setEdit(true)}><FilePenLine size={15} /> Editar</Button><Button onClick={() => setPayment(true)}><Banknote size={15} /> Registar pagamento</Button></div>} /><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><section className="surface rounded-xl p-6"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--secondary))] font-serif text-xl text-[hsl(var(--primary))]">{initials(c.fullName)}</div><div><h2 className="text-xl font-extrabold">{c.fullName}</h2><p className="mono mt-1 text-xs text-[hsl(var(--muted-foreground))]">{c.code}</p></div></div><Status value={c.status} /></div><dl className="mt-7 space-y-4 text-sm"><div className="flex justify-between gap-4 border-b border-[hsl(var(--border))] pb-3"><dt className="text-[hsl(var(--muted-foreground))]">Serviço</dt><dd className="font-bold">{serviceLabel(c.serviceType)}</dd></div><div className="flex justify-between gap-4 border-b border-[hsl(var(--border))] pb-3"><dt className="text-[hsl(var(--muted-foreground))]">Telefone</dt><dd className="font-bold">{c.phone}</dd></div><div className="flex justify-between gap-4 border-b border-[hsl(var(--border))] pb-3"><dt className="text-[hsl(var(--muted-foreground))]">Morada</dt><dd className="text-right font-bold">{c.address}{c.neighborhood ? `, ${c.neighborhood}` : ''}</dd></div><div className="flex justify-between gap-4"><dt className="text-[hsl(var(--muted-foreground))]">Documento</dt><dd className="font-bold">{c.documentNumber || '—'}</dd></div></dl>{c.notes && <div className="mt-6 rounded-lg bg-[hsl(var(--secondary)/.6)] p-4 text-sm"><b>Nota interna</b><p className="mt-1 text-[hsl(var(--muted-foreground))]">{c.notes}</p></div>}</section><section className="surface rounded-xl p-6"><div className="flex items-start justify-between"><div><p className="eyebrow">Relação comercial</p><h2 className="mt-1 text-lg font-extrabold">Contratos activos</h2></div><Wifi className="text-[hsl(var(--primary))]" size={19} /></div>{record.length ? <div className="mt-5 space-y-3">{record.map((contract: any) => <div key={contract.id} className="rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex justify-between gap-3"><div><b>{contract.planName}</b><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{contract.planSpeed || serviceLabel(c.serviceType)} · vence dia {contract.dueDay}</p></div><Status value={contract.status} /></div><div className="mt-4 flex items-end justify-between"><span className="text-xs text-[hsl(var(--muted-foreground))]">Mensalidade</span><strong className="text-lg">{kz(contract.monthlyPrice)}</strong></div></div>)}</div> : <Empty title="Sem contratos" detail="Este cliente ainda não possui um contrato registado." />}</section></div>{edit && <ClientForm client={c} close={() => setEdit(false)} />}{payment && <Modal title="Registar pagamento" eyebrow={c.fullName} onClose={() => setPayment(false)}><form className="space-y-5" onSubmit={payNow}><Field label="Valor recebido *"><Input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field><Field label="Método"><Select defaultValue="multicaixa"><option>multicaixa</option><option>transferência</option><option>numerário</option></Select></Field><p className="text-xs text-[hsl(var(--muted-foreground))]">A multa aplicável é calculada automaticamente pela política actual.</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPayment(false)}>Cancelar</Button><Button type="submit" disabled={pay.isPending}><Check size={15} /> Confirmar pagamento</Button></div></form></Modal>}</div>;
}

function Payments() {
  const clients = useListClients(); const q = useListPayments(); const qc = useQueryClient(); const [search, setSearch] = useState(''); const [modal, setModal] = useState(false); const [form, setForm] = useState({ clientId: '', amount: '', method: 'multicaixa', reference: '' }); const create = useCreatePayment(); const allClients = clients.data?.items || []; const rows = (q.data?.items || []).filter((p: any) => !search || allClients.find((c: any) => c.id === p.clientId)?.fullName.toLowerCase().includes(search.toLowerCase()) || String(p.reference).toLowerCase().includes(search.toLowerCase()));
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate({ data: { ...form, clientId: Number(form.clientId), amount: Number(form.amount), paymentMonth: new Date().toISOString().slice(0, 7) } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); setModal(false); setForm({ clientId: '', amount: '', method: 'multicaixa', reference: '' }); } }); };
  return <div><PageHeader eyebrow="Tesouraria" title="Pagamentos" detail="Registe entradas e mantenha a cobrança conciliada." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Novo pagamento</Button>} /><div className="mb-5 relative max-w-xl"><Search className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={17} /><Input data-testid="input-search-payments" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar por cliente ou referência" className="pl-10" /></div>{q.isLoading ? <Loading /> : rows.length === 0 ? <Empty title="Sem pagamentos registados" detail="Os pagamentos confirmados aparecerão nesta lista." /> : <div className="surface overflow-hidden rounded-xl"><div className="mobile-scroll overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><th className="px-5 py-4">Cliente</th><th>Período</th><th>Método</th><th>Data</th><th className="px-5 text-right">Valor</th></tr></thead><tbody>{rows.map((p: any) => { const c = allClients.find((item: any) => item.id === p.clientId); return <tr key={p.id} className="border-b border-[hsl(var(--border)/.7)] last:border-0"><td className="px-5 py-4"><b className="text-sm">{c?.fullName || 'Cliente removido'}</b><small className="block text-[11px] text-[hsl(var(--muted-foreground))]">{p.reference || 'Sem referência'}</small></td><td className="text-sm">{p.paymentMonth}</td><td className="text-xs capitalize">{p.method}</td><td className="text-xs text-[hsl(var(--muted-foreground))]">{date(p.paidAt)}</td><td className="px-5 text-right font-black">{kz(Number(p.amount) + Number(p.penalty || 0))}</td></tr>; })}</tbody></table></div></div>}{modal && <Modal title="Novo pagamento" eyebrow="Tesouraria" onClose={() => setModal(false)}><form onSubmit={submit} className="space-y-5"><Field label="Cliente *"><Select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}><option value="">Seleccionar cliente</option>{allClients.map((c: any) => <option key={c.id} value={c.id}>{c.fullName} · {c.code}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Valor *"><Input type="number" min="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field><Field label="Método"><Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>multicaixa</option><option>transferência</option><option>numerário</option></Select></Field></div><Field label="Referência"><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Ex.: MCX-240605" /></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}><Check size={15} /> Confirmar</Button></div></form></Modal>}</div>;
}

function Contracts() {
  const q = useListClients(); const create = useCreateContract(); const qc = useQueryClient(); const [modal, setModal] = useState(false); const [form, setForm] = useState({ clientId: '', planName: '', planSpeed: '', monthlyPrice: '', dueDay: '5', terms: '' }); const clients = q.data?.items || [];
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate({ clientId: Number(form.clientId), data: { ...form, monthlyPrice: Number(form.monthlyPrice), dueDay: Number(form.dueDay), startDate: new Date().toISOString().slice(0, 10) } }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListClientsQueryKey() }); setModal(false); } }); };
  return <div><PageHeader eyebrow="Serviços activos" title="Contratos" detail="Planos, condições e compromissos comerciais da carteira." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Novo contrato</Button>} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clients.map((c: any) => <ContractCard key={c.id} client={c} />)}</div>{!clients.length && <Empty title="Sem clientes para contratar" detail="Adicione um cliente primeiro para criar um contrato." />}{modal && <Modal title="Novo contrato" eyebrow="Gestão contratual" onClose={() => setModal(false)}><form onSubmit={submit} className="space-y-5"><Field label="Cliente *"><Select required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}><option value="">Seleccionar cliente</option>{clients.map((c: any) => <option value={c.id} key={c.id}>{c.fullName} · {c.code}</option>)}</Select></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do plano *"><Input required value={form.planName} onChange={(e) => setForm({ ...form, planName: e.target.value })} /></Field><Field label="Velocidade"><Input value={form.planSpeed} onChange={(e) => setForm({ ...form, planSpeed: e.target.value })} placeholder="50 Mbps" /></Field><Field label="Mensalidade *"><Input required type="number" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })} /></Field><Field label="Dia de vencimento"><Input type="number" min="1" max="28" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} /></Field></div><Field label="Termos"><Textarea rows={3} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit"><Check size={15} /> Criar contrato</Button></div></form></Modal>}</div>;
}
function ContractCard({ client }: { client: any }) { const q = useListClientContracts(client.id); const contract = q.data?.[0]; return <Link href={`/clientes/${client.id}`} className="surface group rounded-xl p-5 transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Wifi size={18} /></div><div><b>{client.fullName}</b><p className="mono mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{client.code}</p></div></div><ChevronRight size={17} className="text-[hsl(var(--muted-foreground))]" /></div><div className="mt-6 border-t border-[hsl(var(--border))] pt-4">{contract ? <><div className="flex justify-between"><span className="text-sm font-bold">{contract.planName}</span><Status value={contract.status} /></div><div className="mt-2 flex justify-between text-xs text-[hsl(var(--muted-foreground))]"><span>{contract.planSpeed || serviceLabel(client.serviceType)}</span><b className="text-sm text-[hsl(var(--foreground))]">{kz(contract.monthlyPrice)} / mês</b></div></> : <span className="text-sm text-[hsl(var(--muted-foreground))]">Sem contrato associado</span>}</div></Link>; }

function Invoices() { const clients = useListClients(); const payments = useListPayments(); const all = clients.data?.items || []; const rows = payments.data?.items || []; return <div><PageHeader eyebrow="Documentos" title="Facturas" detail="Consulte os documentos gerados a partir dos pagamentos confirmados." action={<Button variant="outline" onClick={() => window.print()}><ReceiptText size={15} /> Imprimir lista</Button>} />{rows.length ? <div className="surface overflow-hidden rounded-xl"><div className="mobile-scroll overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><th className="px-5 py-4">Documento</th><th>Cliente</th><th>Período</th><th>Emitida</th><th className="px-5 text-right">Total</th></tr></thead><tbody>{rows.map((p: any) => { const c = all.find((x: any) => x.id === p.clientId); return <tr key={p.id} className="border-b border-[hsl(var(--border)/.7)] last:border-0"><td className="px-5 py-4"><b className="mono text-xs">FT-{String(p.id).padStart(5, '0')}</b><small className="block text-[11px] text-[hsl(var(--muted-foreground))]">Recibo de pagamento</small></td><td className="text-sm font-semibold">{c?.fullName || '—'}</td><td className="text-sm">{p.paymentMonth}</td><td className="text-xs text-[hsl(var(--muted-foreground))]">{date(p.paidAt)}</td><td className="px-5 text-right font-black">{kz(Number(p.amount) + Number(p.penalty || 0))}</td></tr>; })}</tbody></table></div></div> : <Empty title="Ainda não há facturas" detail="Registe pagamentos para gerar os documentos desta operação." />}</div>; }

// Note: Rich accounts and treasury module is rendered via AccountsPage from @/pages/accounts-page

function Reports() { const now = new Date(); const [period, setPeriod] = useState('month'); const range = period === 'day' ? { startDate: now.toISOString().slice(0, 10), endDate: now.toISOString().slice(0, 10) } : period === 'year' ? { startDate: `${now.getFullYear()}-01-01`, endDate: `${now.getFullYear()}-12-31` } : { startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, endDate: now.toISOString().slice(0, 10) }; const q = useGetReports({ reportType: period, ...range }); const s = q.data?.summary; return <div><PageHeader eyebrow="Leitura da operação" title="Relatórios" detail="Escolha uma janela e transforme movimentos em decisões." action={<Select value={period} onChange={(e) => setPeriod(e.target.value)} className="sm:w-44"><option value="day">Hoje</option><option value="month">Este mês</option><option value="year">Este ano</option></Select>} />{q.isLoading ? <Loading /> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="surface rounded-xl p-5"><p className="text-xs text-[hsl(var(--muted-foreground))]">Receita total</p><b className="mt-2 block text-2xl">{kz(s?.receita_total)}</b></div><div className="surface rounded-xl p-5"><p className="text-xs text-[hsl(var(--muted-foreground))]">Saídas</p><b className="mt-2 block text-2xl">{kz(s?.saidas)}</b></div><div className="surface rounded-xl p-5"><p className="text-xs text-[hsl(var(--muted-foreground))]">Saldo operacional</p><b className="mt-2 block text-2xl text-[hsl(var(--primary))]">{kz(s?.resto)}</b></div><div className="surface rounded-xl p-5"><p className="text-xs text-[hsl(var(--muted-foreground))]">Pagamentos</p><b className="mt-2 block text-2xl">{s?.pagamentos || 0}</b></div></div><section className="surface mt-5 overflow-hidden rounded-xl"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5"><div><p className="eyebrow">Reconciliação</p><h2 className="mt-1 text-lg font-extrabold">Movimento por dia</h2></div><Button variant="outline" onClick={() => window.print()}><ClipboardList size={15} /> Imprimir</Button></div>{q.data?.rows?.length ? <div className="mobile-scroll overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]"><th className="px-5 py-4">Data</th><th>Pagamentos</th><th>Entradas</th><th>Saídas</th><th className="px-5 text-right">Saldo</th></tr></thead><tbody>{q.data.rows.map((r: any) => <tr key={r.data} className="border-b border-[hsl(var(--border)/.7)] last:border-0"><td className="px-5 py-4 text-sm font-semibold">{date(r.data)}</td><td className="text-sm">{r.pagamentos}</td><td className="font-bold text-[hsl(var(--primary))]">{kz(r.valor)}</td><td>{kz(r.saidas)}</td><td className="px-5 text-right font-black">{kz(r.total)}</td></tr>)}</tbody></table></div> : <p className="p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Sem movimentos neste período.</p>}</section></>}</div>; }

function Messages() { const q = useListMessages(); const create = useCreateMessage(); const qc = useQueryClient(); const [modal, setModal] = useState(false); const [form, setForm] = useState({ audience: 'clientes em atraso', channel: 'SMS', message: '' }); const submit = (e: FormEvent) => { e.preventDefault(); create.mutate({ data: form }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListMessagesQueryKey() }); setModal(false); setForm({ ...form, message: '' }); } }); }; return <div><PageHeader eyebrow="Comunicação" title="Mensagens" detail="Prepare comunicações segmentadas para chegar à pessoa certa." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Nova mensagem</Button>} /><div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><section className="surface rounded-xl p-6"><p className="eyebrow">Segmentos rápidos</p><h2 className="mt-1 text-lg font-extrabold">Escolha o momento</h2><div className="mt-5 space-y-2">{['clientes em atraso', 'clientes activos', 'todos os clientes'].map((item) => <button key={item} onClick={() => { setForm({ ...form, audience: item }); setModal(true); }} className="flex w-full items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3 text-left text-sm font-bold hover:bg-[hsl(var(--secondary))]"><span className="flex items-center gap-2"><Send size={15} className="text-[hsl(var(--primary))]" />{item[0].toUpperCase() + item.slice(1)}</span><ChevronRight size={15} /></button>)}</div></section><section className="surface rounded-xl p-6"><p className="eyebrow">Arquivo de envios</p><h2 className="mt-1 text-lg font-extrabold">Mensagens preparadas</h2>{q.data?.length ? <div className="mt-5 space-y-3">{q.data.map((m: any) => <div key={m.id} className="rounded-xl border border-[hsl(var(--border))] p-4"><div className="flex justify-between gap-3"><b className="text-sm">{m.audience}</b><Badge>{m.channel}</Badge></div><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{m.message}</p><small className="mt-3 block text-[11px] text-[hsl(var(--muted-foreground))]">{date(m.createdAt)} · {m.status}</small></div>)}</div> : <div className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">Nenhuma mensagem preparada.</div>}</section></div>{modal && <Modal title="Preparar mensagem" eyebrow="Comunicação segmentada" onClose={() => setModal(false)}><form onSubmit={submit} className="space-y-5"><Field label="Público"><Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}><option>clientes em atraso</option><option>clientes activos</option><option>todos os clientes</option></Select></Field><Field label="Canal"><Select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}><option>SMS</option><option>WhatsApp</option><option>Telefone</option></Select></Field><Field label="Mensagem *" hint="Escreva curto, claro e com a próxima acção."><Textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Olá, lembramos que a sua mensalidade..." /></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit"><Send size={15} /> Preparar mensagem</Button></div></form></Modal>}</div>; }

function Rappels() { const clients = useListClients({ status: 'late' }); const create = useCreateMessage(); const qc = useQueryClient(); const late = clients.data?.items || []; const prepare = () => { create.mutate({ data: { audience: 'clientes em atraso', channel: 'SMS', message: 'OSDEL: detectámos uma mensalidade pendente. Contacte a nossa equipa para regularizar o serviço.' } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListMessagesQueryKey() }) }); }; return <div><PageHeader eyebrow="Cobranças automáticas" title="Rappels" detail="Mantenha a cadência dos lembretes sem depender da memória da equipa." action={<Button onClick={prepare}><Send size={15} /> Preparar lembrete</Button>} /><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="surface rounded-xl p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Regra activa</p><h2 className="mt-1 text-lg font-extrabold">Atraso de pagamento</h2></div><Badge tone="good">Activo</Badge></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[hsl(var(--secondary)/.6)] p-4"><small className="text-[hsl(var(--muted-foreground))]">Público</small><b className="mt-1 block text-sm">Em atraso</b></div><div className="rounded-xl bg-[hsl(var(--secondary)/.6)] p-4"><small className="text-[hsl(var(--muted-foreground))]">Canal</small><b className="mt-1 block text-sm">SMS</b></div><div className="rounded-xl bg-[hsl(var(--secondary)/.6)] p-4"><small className="text-[hsl(var(--muted-foreground))]">Na fila</small><b className="mt-1 block text-sm">{late.length} clientes</b></div></div><p className="mt-6 text-sm leading-6 text-[hsl(var(--muted-foreground))]">O lembrete é preparado localmente. A ligação ao provedor SMS pode ser activada em Administração.</p></section><section className="surface rounded-xl p-6"><p className="eyebrow">Fila de hoje</p><h2 className="mt-1 text-lg font-extrabold">Clientes a contactar</h2>{late.length ? <div className="mt-5 space-y-2">{late.map((c: any) => <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3 hover:bg-[hsl(var(--secondary))]"><span><b className="text-sm">{c.fullName}</b><small className="block text-[11px] text-[hsl(var(--muted-foreground))]">{c.phone}</small></span><ArrowDownRight size={16} className="text-[hsl(var(--accent))]" /></Link>)}</div> : <p className="py-8 text-sm text-[hsl(var(--muted-foreground))]">Não há clientes em atraso nesta leitura.</p>}</section></div></div>; }

function Team() { const q = useListUsers(); const create = useCreateUser(); const remove = useDeleteUser(); const qc = useQueryClient(); const [modal, setModal] = useState(false); const [form, setForm] = useState({ name: '', username: '', role: 'operador', password: '' }); const submit = (e: FormEvent) => { e.preventDefault(); create.mutate({ data: form }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); setModal(false); } }); }; return <div><PageHeader eyebrow="Pessoas & permissões" title="Equipa" detail="Quem está de serviço e com que nível de acesso." action={<Button onClick={() => setModal(true)}><Plus size={16} /> Adicionar membro</Button>} /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{(q.data || []).map((u: any) => <div key={u.id} className="surface rounded-xl p-5"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--secondary))] font-serif text-lg text-[hsl(var(--primary))]">{initials(u.name)}</div><div><b>{u.name}</b><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">@{u.username}</p></div></div><button title="Desactivar membro" onClick={() => { if (window.confirm('Desactivar este membro?')) remove.mutate({ userId: u.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() }) }); }} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"><Trash2 size={15} /></button></div><div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4"><Badge tone={u.role === 'admin' ? 'good' : 'neutral'}>{u.role === 'admin' ? 'Administrador' : 'Operador'}</Badge><span className="text-xs text-[#237052]">Acesso activo</span></div></div>)}</div>{modal && <Modal title="Adicionar membro" eyebrow="Equipa" onClose={() => setModal(false)}><form onSubmit={submit} className="space-y-5"><Field label="Nome completo *"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Utilizador *"><Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} /></Field><Field label="Palavra-passe *"><Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field></div><Field label="Perfil"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="operador">Operador</option><option value="admin">Administrador</option></Select></Field><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit"><Check size={15} /> Criar acesso</Button></div></form></Modal>}</div>; }

function Accounting() { const payments = useListPayments(); const expenses = useListExpenses(); const income = (payments.data?.items || []).reduce((s: number, p: any) => s + Number(p.amount) + Number(p.penalty || 0), 0); const out = (expenses.data?.items || []).reduce((s: number, e: any) => s + Number(e.amount), 0); return <div><PageHeader eyebrow="Leitura financeira" title="Contabilidade" detail="Uma vista simples para conferir entradas, saídas e saldo da operação." /><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="surface rounded-xl p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Calculator size={20} /></div><div><p className="eyebrow">Resumo geral</p><h2 className="mt-1 text-lg font-extrabold">Livro de movimentos</h2></div></div><div className="mt-7 space-y-4"><div className="flex justify-between border-b border-[hsl(var(--border))] pb-4"><span className="text-sm text-[hsl(var(--muted-foreground))]">Entradas registadas</span><b className="text-lg text-[hsl(var(--primary))]">{kz(income)}</b></div><div className="flex justify-between border-b border-[hsl(var(--border))] pb-4"><span className="text-sm text-[hsl(var(--muted-foreground))]">Saídas registadas</span><b className="text-lg text-[hsl(var(--accent))]">{kz(out)}</b></div><div className="flex justify-between"><span className="font-bold">Saldo operacional</span><b className="text-2xl">{kz(income - out)}</b></div></div></section><section className="surface grid-paper rounded-xl p-6"><p className="eyebrow">Registo local</p><h2 className="mt-1 font-serif text-2xl">Tudo conciliado.</h2><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Use Relatórios para abrir por período e Contas para lançar despesas. Os dados permanecem no navegador desta equipa.</p><Link href="/relatorios" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--primary))]">Abrir relatórios <ChevronRight size={15} /></Link></section></div></div>; }

function Profile() { const u = session(); return <div><PageHeader eyebrow="A minha conta" title="Perfil" detail="Os seus dados de acesso à operação OSDEL." /><div className="surface max-w-2xl rounded-xl p-6"><div className="flex items-center gap-4 border-b border-[hsl(var(--border))] pb-6"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(var(--secondary))] font-serif text-2xl text-[hsl(var(--primary))]">{initials(u?.name)}</div><div><h2 className="text-xl font-extrabold">{u?.name || 'Administrador OSDEL'}</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">@{u?.username || 'deezy'} · Administrador</p></div></div><dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-[hsl(var(--muted-foreground))]">Estado da sessão</dt><dd><Badge tone="good">Autenticado</Badge></dd></div><div className="flex justify-between"><dt className="text-[hsl(var(--muted-foreground))]">Armazenamento</dt><dd className="font-bold">Neste navegador</dd></div><div className="flex justify-between"><dt className="text-[hsl(var(--muted-foreground))]">Última actividade</dt><dd className="font-bold">Agora</dd></div></dl><Button variant="outline" className="mt-7" onClick={() => { signOut(); window.location.href = '/selecionar-servico'; }}><LogOut size={15} /> Terminar sessão</Button></div></div>; }

function Admin() { const q = useGetSettings(); const update = useUpdateSettings(); const qc = useQueryClient(); const [form, setForm] = useState<any>(); useEffect(() => { if (q.data) setForm((prev: any) => prev || q.data); }, [q.data]); if (q.isLoading || !form) return <Loading />; const saveSettings = (e: FormEvent) => { e.preventDefault(); update.mutate({ data: { companyName: form.companyName, companyPhone: form.companyPhone, companyAddress: form.companyAddress, tvMonthlyPrice: Number(form.tvMonthlyPrice), connectionFee: Number(form.connectionFee), paymentDueDay: Number(form.paymentDueDay), latePenalty: Number(form.latePenalty), suspensionAfterMonths: Number(form.suspensionAfterMonths), smsEnabled: form.smsEnabled, smsProvider: form.smsProvider, smsSender: form.smsSender } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() }) }); }; const set = (key: string, value: unknown) => setForm((f: any) => ({ ...f, [key]: value })); return <div><PageHeader eyebrow="Configuração do centro" title="Administração" detail="Defina a política comercial e os canais que sustentam a operação." action={<Button type="submit" form="settings-form" disabled={update.isPending}><Check size={15} /> {update.isPending ? 'A guardar…' : 'Guardar alterações'}</Button>} /><form id="settings-form" onSubmit={saveSettings} className="grid gap-5 lg:grid-cols-[1fr_1fr]"><section className="surface rounded-xl p-6"><div className="flex items-center gap-3"><BriefcaseBusiness className="text-[hsl(var(--primary))]" size={20} /><div><p className="eyebrow">Identidade</p><h2 className="mt-1 text-lg font-extrabold">Dados da empresa</h2></div></div><div className="mt-6 space-y-4"><Field label="Nome da empresa"><Input value={form.companyName || ''} onChange={(e) => set('companyName', e.target.value)} /></Field><Field label="Telefone"><Input value={form.companyPhone || ''} onChange={(e) => set('companyPhone', e.target.value)} /></Field><Field label="Morada"><Input value={form.companyAddress || ''} onChange={(e) => set('companyAddress', e.target.value)} /></Field></div></section><section className="surface rounded-xl p-6"><div className="flex items-center gap-3"><Banknote className="text-[hsl(var(--primary))]" size={20} /><div><p className="eyebrow">Política comercial</p><h2 className="mt-1 text-lg font-extrabold">Preços & cobranças</h2></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="TV mensalidade"><Input type="number" value={form.tvMonthlyPrice || ''} onChange={(e) => set('tvMonthlyPrice', e.target.value)} /></Field><Field label="Taxa de ligação"><Input type="number" value={form.connectionFee || ''} onChange={(e) => set('connectionFee', e.target.value)} /></Field><Field label="Vencimento (dia)"><Input type="number" value={form.paymentDueDay || ''} onChange={(e) => set('paymentDueDay', e.target.value)} /></Field><Field label="Multa por atraso"><Input type="number" value={form.latePenalty || ''} onChange={(e) => set('latePenalty', e.target.value)} /></Field><Field label="Suspender após (meses)"><Input type="number" value={form.suspensionAfterMonths || ''} onChange={(e) => set('suspensionAfterMonths', e.target.value)} /></Field></div></section><section className="surface rounded-xl p-6 lg:col-span-2"><div className="flex items-center gap-3"><MessageSquare className="text-[hsl(var(--primary))]" size={20} /><div><p className="eyebrow">Comunicações</p><h2 className="mt-1 text-lg font-extrabold">Provedor SMS</h2></div></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><Field label="Provedor"><Input value={form.smsProvider || ''} onChange={(e) => set('smsProvider', e.target.value)} placeholder="Ex.: Africell API" /></Field><Field label="Remetente"><Input value={form.smsSender || ''} onChange={(e) => set('smsSender', e.target.value)} /></Field><Field label="Estado"><Select value={form.smsEnabled ? 'active' : 'inactive'} onChange={(e) => set('smsEnabled', e.target.value === 'active')}><option value="inactive">Desactivado</option><option value="active">Activo</option></Select></Field></div></section></form></div>; }

function Login() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { mode, meta } = useServiceMode();
  const currentLogo = getCompanyLogo();

  // Se nenhum modo foi escolhido previamente, redirecionar para a seleção de serviço
  const { activeTenant, tenants, switchTenant } = useTenants();

  useEffect(() => {
    if (!getStoredServiceMode()) {
      setLocation('/selecionar-servico');
    }
  }, [setLocation]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = authenticate(form.username, form.password);
    if (found) setLocation('/');
    else setError('Utilizador ou palavra-passe incorrectos.');
  };

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[.95fr_1.05fr]">
      {/* Painel lateral Gestão X */}
      <div className="relative hidden overflow-hidden bg-[hsl(var(--sidebar))] p-12 text-[hsl(var(--sidebar-foreground))] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-30 grid-paper" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 border border-slate-700/60 text-white shadow-xs font-serif text-xl font-bold">
              GX
            </div>
            <div>
              <div className="font-serif text-2xl font-bold tracking-tight">
                Gestão X
              </div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-[hsl(var(--sidebar-foreground)/.5)]">
                Software de Gestão de Telecomunicações
              </div>
            </div>
          </div>

          <div className="mt-20 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold mb-4">
              {mode === 'fibra' ? (
                <Wifi size={13} className="text-blue-400" />
              ) : mode === 'tv' ? (
                <Tv size={13} className="text-amber-400" />
              ) : (
                <Layers size={13} className="text-emerald-400" />
              )}
              <span>{meta.badge}</span>
            </div>
            <p className="eyebrow text-[hsl(var(--sidebar-primary))]">Operação Comercial & Técnica</p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl leading-[1.05]">
              {mode === 'fibra'
                ? 'Operação Fibra Óptica'
                : mode === 'tv'
                ? 'Operação TV'
                : 'Operação Integrada TV & Fibra'}
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-75">
              {meta.description}
            </p>

            <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4 flex items-center gap-3">
              <img
                src={activeTenant?.logoUrl || currentLogo}
                alt={activeTenant?.tradingName || 'OSDEL'}
                className="h-10 w-10 rounded-xl bg-white p-1 object-contain shrink-0"
              />
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">
                  {activeTenant?.tradingName || 'OSDEL TECNOLOGIA'}
                </span>
                <span className="block text-[11px] text-white/60">
                  Licença Empresarial Autorizada
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs opacity-75 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} /> Gestão X · Sistema Local & Seguro
          </div>
          <Link
            href="/selecionar-servico"
            className="hover:underline flex items-center gap-1 font-bold text-white"
          >
            Trocar modalidade →
          </Link>
        </div>
      </div>

      {/* Formulário de autenticação */}
      <div className="flex items-center justify-center bg-[hsl(var(--background))] p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <img
                src={currentLogo || OSDEL_LOGO_BASE64}
                alt="OSDEL Tecnologia"
                className="h-10 w-10 rounded-xl bg-white p-1 object-contain border border-slate-300 shadow-xs shrink-0 company-logo"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = OSDEL_LOGO_BASE64;
                }}
              />
              <div>
                <div className="font-serif text-xl font-bold">Gestão X</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  {activeTenant?.tradingName || 'OSDEL TECNOLOGIA'}
                </div>
              </div>
            </div>
          </div>

          <p className="eyebrow">Autenticação de Acesso</p>
          <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">Iniciar Sessão</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Introduza os seus dados para aceder ao sistema da <b>{activeTenant?.tradingName || 'OSDEL TECNOLOGIA'}</b>.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Utilizador">
              <Input
                autoFocus
                data-testid="input-login-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="ex.: deezy, mestre.job, julia"
              />
            </Field>

            <Field label="Palavra-passe">
              <Input
                data-testid="input-login-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Palavra-passe"
              />
            </Field>

            {error && (
              <div
                data-testid="text-login-error"
                className="flex items-center gap-2 rounded-lg bg-[#f8e1da] p-3 text-xs font-bold text-[#a24e3a]"
              >
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <Button type="submit" className="mt-2 w-full">
              Entrar no sistema <ChevronRight size={16} />
            </Button>
          </form>

          <div className="mt-8 pt-4 border-t border-[hsl(var(--border))] text-center">
            <Link
              href="/selecionar-servico"
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] inline-flex items-center gap-1.5 transition"
            >
              <span>Deseja alterar a modalidade activa?</span>
              <b className="text-[hsl(var(--primary))] underline">Mudar para Fibra / TV / Ambos</b>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [ready, setReady] = useState(() => Boolean(session()));
  useEffect(() => {
    if (!session()) {
      setReady(false);
      if (!getStoredServiceMode()) {
        setLocation('/selecionar-servico');
      } else {
        setLocation('/login');
      }
    } else {
      setReady(true);
    }
  }, [setLocation]);
  return ready ? <Shell>{children}</Shell> : <Loading />;
}

function SuperAdminGuard({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const user = session();

  if (!isSuperAdmin(user)) {
    return (
      <Guard>
        <div className="surface mx-auto my-12 max-w-xl rounded-2xl p-8 text-center border border-rose-500/30 bg-rose-500/5 shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600">
            <Lock size={28} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[hsl(var(--foreground))]">Área Reservada ao Super Administrador</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
            As áreas de <b>Apps Móveis (APK)</b>, <b>API & Desktop</b> e <b>Licenciamento</b> são de acesso exclusivo do <b>Super Administrador Geral (deezy)</b>.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => setLocation('/')}>Voltar à Visão Geral</Button>
          </div>
        </div>
      </Guard>
    );
  }

  return <Guard>{children}</Guard>;
}

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/selecionar-servico" component={ServiceSelectionPage} />
        <Route path="/escolher-servico" component={ServiceSelectionPage} />
        <Route path="/login" component={Login} />
        <Route path="/imprimir" component={PrintPage} />
        <Route path="/gestao-x-licencas"><SuperAdminGuard><SoftwareLicensingPage /></SuperAdminGuard></Route>
        <Route path="/licenciamento"><SuperAdminGuard><SoftwareLicensingPage /></SuperAdminGuard></Route>
        <Route path="/super-admin"><SuperAdminGuard><SoftwareLicensingPage /></SuperAdminGuard></Route>
        <Route path="/"><Guard><Dashboard /></Guard></Route>
        <Route path="/clientes"><Guard><ClientsPage /></Guard></Route>
        <Route path="/clientes/:id"><Guard><ClientDetailPage /></Guard></Route>
        <Route path="/canais-tv"><Guard><TvChannelsPage /></Guard></Route>
        <Route path="/gestao-canais-tv"><Guard><TvChannelsPage /></Guard></Route>
        <Route path="/descodificadores-tv"><Guard><TvChannelsPage /></Guard></Route>
        <Route path="/canais"><Guard><TvChannelsPage /></Guard></Route>
        <Route path="/agenda"><Guard><SchedulePage /></Guard></Route>
        <Route path="/missoes"><Guard><TeamMissionsPage /></Guard></Route>
        <Route path="/ordens-servico"><Guard><ServiceOrdersPage /></Guard></Route>
        <Route path="/inventario"><Guard><InventoryPage /></Guard></Route>
        <Route path="/contratos"><Guard><ContractsEnhanced /></Guard></Route>
        <Route path="/pagamentos"><Guard><PaymentsPage /></Guard></Route>
        <Route path="/facturas"><Guard><InvoicesEnhanced /></Guard></Route>
        <Route path="/contas"><Guard><AccountsPage /></Guard></Route>
        <Route path="/relatorios"><Guard><ReportsAdvancedPage /></Guard></Route>
        <Route path="/mensagens"><Guard><MessagesPage /></Guard></Route>
        <Route path="/rappels"><Guard><RappelsPage /></Guard></Route>
        <Route path="/equipe"><Guard><TeamManagement /></Guard></Route>
        <Route path="/contabilidade"><Guard><AccountingPage /></Guard></Route>
        <Route path="/perfil"><Guard><UserProfilePage /></Guard></Route>
        <Route path="/credenciais-superadmin"><SuperAdminGuard><SuperAdminCredentialsPage /></SuperAdminGuard></Route>
        <Route path="/gerador-credenciais"><SuperAdminGuard><SuperAdminCredentialsPage /></SuperAdminGuard></Route>
        <Route path="/credenciais"><SuperAdminGuard><SuperAdminCredentialsPage /></SuperAdminGuard></Route>
        <Route path="/mobile-hub"><SuperAdminGuard><MobileHub /></SuperAdminGuard></Route>
        <Route path="/apps-moveis"><SuperAdminGuard><MobileHub /></SuperAdminGuard></Route>
        <Route path="/apk-guia"><SuperAdminGuard><ApkBuildGuidePage /></SuperAdminGuard></Route>
        <Route path="/guia-apk"><SuperAdminGuard><ApkBuildGuidePage /></SuperAdminGuard></Route>
        <Route path="/app-cliente"><SuperAdminGuard><ClientMobileAppPage /></SuperAdminGuard></Route>
        <Route path="/cliente-apk"><SuperAdminGuard><ClientMobileAppPage /></SuperAdminGuard></Route>
        <Route path="/app-equipa"><SuperAdminGuard><StaffMobileAppPage /></SuperAdminGuard></Route>
        <Route path="/equipa-apk"><SuperAdminGuard><StaffMobileAppPage /></SuperAdminGuard></Route>
        <Route path="/api-pythonanywhere"><SuperAdminGuard><PythonAnywhereApiPage /></SuperAdminGuard></Route>
        <Route path="/pythonanywhere"><SuperAdminGuard><PythonAnywhereApiPage /></SuperAdminGuard></Route>
        <Route path="/administracao"><Guard><SettingsAdvancedPage /></Guard></Route>
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}


const isElectronOrFile = typeof window !== 'undefined' && (
  window.location.protocol === 'file:' ||
  window.location.hash.startsWith('#') ||
  Boolean((window as any).electronAPI?.isElectron)
);

function App() {
  const [revokedMessage, setRevokedMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Inicializa o serviço global e automático de monitorização de subscrições (TV + Clientes)
    const cleanupSubscriptionService = initAutomatedSubscriptionService();

    // 2. Inicializa a sincronização bidirecional Online-First no arranque do aplicativo (Web, Electron e APKs)
    const cleanupOnlineFirstSync = initOnlineFirstAppSync();

    const handleSync = (e?: any) => {
      const keyName = e?.detail?.key;
      reloadAllFromStorage(keyName);
      queryClient.invalidateQueries();
    };

    const handleRevocation = (e: any) => {
      const msg = e?.detail?.message || 'Sua conta foi removida por um administrador.';
      signOut();
      queryClient.clear();
      setRevokedMessage(msg);
    };

    const syncEvents = [
      'osdel-data-sync',
      'osdel-clients-updated',
      'osdel-users-updated',
      'osdel-invoices-updated',
      'osdel-payments-updated',
      'osdel-settings-updated',
      'osdel-company-settings-changed',
      'osdel-expenses-updated',
      'osdel-financial-accounts-updated',
      'osdel-transfers-updated',
      'osdel-contracts-updated',
      'osdel-service-orders-updated',
      'osdel-messages-updated',
      'osdel-inventory-updated',
      'osdel-production-reset',
      'osdel-staff-creds-updated',
      'osdel-subscriptions-checked',
      'osdel-cash-closures-updated',
      'osdel-cash_closures-updated',
      'osdel-monthly-closures-updated',
      'osdel-monthly_closures-updated',
      'osdel-loans-updated',
      'osdel-technician-loans-updated',
      'osdel-schedule-updated',
      'osdel-missions-updated',
      'osdel-team-missions-updated',
      'osdel-tv-decoders-updated',
      'osdel-support-interventions-updated',
      'osdel-client-chat-updated',
      'osdel-team-messages-updated',
      'osdel-audit-logs-updated',
      'osdel-activities-updated',
    ];

    syncEvents.forEach((evt) => window.addEventListener(evt, handleSync));
    window.addEventListener('osdel-session-revoked', handleRevocation);

    return () => {
      cleanupSubscriptionService();
      cleanupOnlineFirstSync();
      syncEvents.forEach((evt) => window.removeEventListener(evt, handleSync));
      window.removeEventListener('osdel-session-revoked', handleRevocation);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SingleWindowGuard>
          <WouterRouter
            hook={isElectronOrFile ? useCustomHashLocation : undefined}
            base={isElectronOrFile ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')}
          >
            <Router />
          </WouterRouter>
        </SingleWindowGuard>
        {revokedMessage && (
          <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in-0 duration-200">
            <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4 text-white">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/30">
                <Lock size={32} />
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white">
                Sessão Encerrada
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed font-semibold">
                {revokedMessage}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRevokedMessage(null);
                    window.location.hash = '#/login';
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition cursor-pointer"
                >
                  Voltar ao Login
                </button>
              </div>
            </div>
          </div>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;