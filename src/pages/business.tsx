import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Bell,
  Check,
  ChevronRight,
  ClipboardList,
  FilePenLine,
  FileText,
  MessageSquare,
  MessageCircle,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Send,
  Wifi,
  Tv,
  Layers,
  X,
  Zap,
  Smartphone,
  ShieldCheck,
  Users,
  Trash2,
  Lock,
  CheckCircle2,
  Megaphone,
  Radio,
  Calendar as CalendarIcon,
  MapPin,
  Eye,
  SlidersHorizontal,
  Copy,
  ArrowUpDown,
  Filter,
  Phone,
  History,
  Clock,
  CreditCard,
} from 'lucide-react';
import {
  getStoredNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  addSystemNotification,
  type SystemNotification,
} from '@/lib/notifications';
import { useServiceMode } from '@/lib/service-mode';
import { canDeleteOrVoidInvoices, isSuperAdmin } from '@/lib/permissions';
import { MigrateToFiberModal } from '@/components/migrate-to-fiber-modal';
import { ClientCredentialsModal } from '@/components/client-credentials-modal';
import { ClientSupportChatView, TeamChatView } from '@/components/chat-center';
import { getHumanInterventionTickets } from '@/lib/team-chat';
import {
  getListClientsQueryKey,
  getListMessagesQueryKey,
  getListPaymentsQueryKey,
  getListInvoicesQueryKey,
  getGetDashboardQueryKey,
  useCreateClient,
  useCreateContract,
  useCreateMessage,
  useCreatePayment,
  useDeletePayment,
  useDeleteInvoice,
  useGetReports,
  useGetSettings,
  useListClients,
  useListMessages,
  useListPayments,
  useListFinancialAccounts,
  useListUsers,
  useUpdateClient,
  checkPaymentDuplicate,
  checkClientDuplicate,
  session,
  type Client,
} from '@/lib/local-api';
import {
  ClientListPreview,
  ContractPreview,
  InvoicePreview,
  ReportPreview,
} from '@/pages/operations';

type AnyRecord = Record<string, any>;

const kz = (value: unknown) =>
  new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace('AOA', 'Kz');

const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-AO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : '—';

const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'OS';

const serviceLabel = (service?: string) =>
  service === 'combo' ? 'TV + Internet' : service === 'internet' ? 'Internet Fibra' : 'TV';

function Button({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'quiet' | 'outline' | 'danger';
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110',
    quiet: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))]',
    outline:
      'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]',
    danger: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:brightness-110',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-[hsl(var(--foreground))]">{label}</span>
      {children}
      {hint && <small className="block text-[11px] text-[hsl(var(--muted-foreground))]">{hint}</small>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)] ${
        props.className || ''
      }`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-[hsl(var(--primary))] ${
        props.className || ''
      }`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] ${
        props.className || ''
      }`}
    />
  );
}

function StatusBadge({ value }: { value?: string }) {
  const label: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    late: 'Em atraso (Corte)',
    suspended: 'Suspenso (>3m)',
    paid: 'Pago',
    pending: 'Pendente',
  };
  const tone =
    value === 'active' || value === 'paid'
      ? 'bg-[#dceee5] text-[#237052]'
      : value === 'late' || value === 'pending'
        ? 'bg-[#f7e9c9] text-[#946c22]'
        : value === 'suspended' || value === 'inactive'
          ? 'bg-[#f8e1da] text-[#a24e3a]'
          : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label[value || ''] || value || '—'}
    </span>
  );
}

function Modal({
  title,
  eyebrow = 'Operação',
  children,
  onClose,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142f35]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-auto rounded-t-2xl bg-[hsl(var(--card))] shadow-2xl sm:rounded-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-1 font-serif text-2xl">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
          >
            <X size={19} />
          </button>
        </header>
        <div className="p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.6rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

/* =========================================================================
   1. CLIENTS PAGE: Tabs for TV / Fibra / Combo, search by houseCode & BI,
      and print client list modal.
   ========================================================================= */

const emptyClient = {
  fullName: '',
  phone: '',
  alternatePhone: '',
  email: '',
  address: '',
  neighborhood: '',
  documentNumber: '',
  houseCode: '',
  pdoNumber: '',
  onuNumber: '',
  serviceType: 'tv',
  planId: 'fibra-10',
  notes: '',
};

export function ClientsPage() {
  const { mode, meta, selectMode } = useServiceMode();
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState(() => meta.filterValue);
  const [statusFilter, setStatusFilter] = useState(() => new URLSearchParams(window.location.search).get('status') || '');
  const [streetFilter, setStreetFilter] = useState('');
  const [pdoFilter, setPdoFilter] = useState('');
  const [debtFilter, setDebtFilter] = useState('');
  const [dueDayFilter, setDueDayFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sort, setSort] = useState('default');
  const [quickTag, setQuickTag] = useState<'todos' | 'devedores' | 'sem_onu' | 'em_dia' | 'whatsapp'>('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Client>();
  const [printModal, setPrintModal] = useState(false);
  const [migratingClient, setMigratingClient] = useState<Client | null>(null);
  const [credentialsClient, setCredentialsClient] = useState<Client | null>(null);
  const [createdContractPreview, setCreatedContractPreview] = useState<{ client: AnyRecord; contract: AnyRecord } | null>(null);

  const queryClient = useQueryClient();

  // Automatic Real-Time Synchronization without page reload / F5
  useEffect(() => {
    const handleAutoSync = () => {
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
    };

    window.addEventListener('osdel-clients-updated', handleAutoSync);
    window.addEventListener('osdel-contracts-updated', handleAutoSync);
    window.addEventListener('osdel-payments-updated', handleAutoSync);
    window.addEventListener('osdel-data-sync', handleAutoSync);
    window.addEventListener('storage', handleAutoSync);

    const syncInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
    }, 4000);

    return () => {
      window.removeEventListener('osdel-clients-updated', handleAutoSync);
      window.removeEventListener('osdel-contracts-updated', handleAutoSync);
      window.removeEventListener('osdel-payments-updated', handleAutoSync);
      window.removeEventListener('osdel-data-sync', handleAutoSync);
      window.removeEventListener('storage', handleAutoSync);
      clearInterval(syncInterval);
    };
  }, [queryClient]);

  // Sync serviceFilter whenever user switches mode in top switcher
  useEffect(() => {
    setServiceFilter(meta.filterValue);
  }, [meta.filterValue]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, serviceFilter, statusFilter, streetFilter, pdoFilter, debtFilter, dueDayFilter, planFilter, sort, quickTag, mode]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const settingsQuery = useGetSettings();
  const settings = settingsQuery.data || {};

  const allClientsQuery = useListClients({});
  const allClients: any[] = allClientsQuery.data?.items || [];

  const availableStreets = useMemo(() => {
    const set = new Set<string>();
    allClients.forEach((c: any) => {
      const street = (c.street || c.neighborhood || c.address || '').trim();
      if (street) set.add(street);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allClients]);

  const availablePdos = useMemo(() => {
    const set = new Set<string>();
    allClients.forEach((c: any) => {
      const pdo = (c.pdoNumber || c.pdo_number || '').trim();
      if (pdo) set.add(pdo);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allClients]);

  const availablePlans = useMemo(() => {
    const plans = settings.internetPlans || [
      { id: 'fibra-10', name: 'Fibra 10 (10 Mbps)' },
      { id: 'fibra-22', name: 'Fibra 22 (22 Mbps)' },
      { id: 'fibra-50', name: 'Fibra 50 (50 Mbps)' },
      { id: 'fibra-100', name: 'Fibra 100 (100 Mbps)' },
    ];
    return plans;
  }, [settings]);

  // Hook query with multi-criteria parameters passed to local cache engine
  const q = useListClients({
    search,
    serviceType: mode && mode !== 'ambos' ? meta.filterValue : (serviceFilter || undefined),
    serviceMode: mode || undefined,
    status: statusFilter || undefined,
    pdoNumber: pdoFilter || undefined,
    street: streetFilter || undefined,
    debtStatus: debtFilter || (quickTag === 'devedores' ? 'com_divida' : quickTag === 'em_dia' ? 'em_dia' : undefined),
    dueDay: dueDayFilter || undefined,
    planId: planFilter || undefined,
    withoutOnu: quickTag === 'sem_onu' || undefined,
    withWhatsapp: quickTag === 'whatsapp' || undefined,
    sort,
  });
  const filteredItems: any[] = q.data?.items || [];

  const fiberClients = allClients.filter((c: any) => {
    const s = String(c.serviceType || c.service_type || '').toLowerCase();
    return s === 'fibra' || s === 'internet' || s === 'ftth';
  });
  const tvClients = allClients.filter((c: any) => {
    const s = String(c.serviceType || c.service_type || '').toLowerCase();
    return s === 'tv_cabo' || s === 'tv' || s === 'catv';
  });
  const comboClients = allClients.filter((c: any) => {
    const s = String(c.serviceType || c.service_type || '').toLowerCase();
    return s === 'combo' || s.includes('combo');
  });

  const totalClientsCount = allClients.length;
  const tvClientsCount = tvClients.length + comboClients.length;
  const fiberClientsCount = fiberClients.length + comboClients.length;
  const comboClientsCount = comboClients.length;
  const tvOnlyCount = tvClients.length;
  const fiberOnlyCount = fiberClients.length;

  const activeCount = allClients.filter((c: any) => c.status === 'active').length;
  const lateCount = allClients.filter((c: any) => c.status === 'late').length;
  const suspendedCount = allClients.filter((c: any) => c.status === 'suspended' || c.status === 'cut').length;
  const inDebtCount = lateCount + suspendedCount;

  const fiberWithoutOnuCount = allClients.filter((c: any) => {
    const s = String(c.serviceType || c.service_type || '').toLowerCase();
    const isFiber = s === 'fibra' || s === 'internet' || s === 'ftth' || s === 'combo';
    return isFiber && !c.onuNumber;
  }).length;

  const withWhatsappCount = allClients.filter((c: any) => {
    const p = String(c.phone || '').replace(/\D/g, '');
    return p.length >= 9;
  }).length;

  // Estatísticas específicas de Fibra
  const fiberActiveCount = fiberClients.filter((c: any) => c.status === 'active').length;
  const fiberLateCount = fiberClients.filter((c: any) => c.status === 'late').length;
  const fiberSuspendedCount = fiberClients.filter((c: any) => c.status === 'suspended' || c.status === 'cut').length;

  // Estatísticas específicas de TV
  const tvActiveCount = tvClients.filter((c: any) => c.status === 'active').length;
  const tvLateCount = tvClients.filter((c: any) => c.status === 'late').length;
  const tvSuspendedCount = tvClients.filter((c: any) => c.status === 'suspended' || c.status === 'cut').length;

  // Paginação ultrarrápida
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    if (pageSize >= 9999) return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Contagem de filtros avançados activos
  const activeAdvancedCount = [
    Boolean(pdoFilter),
    Boolean(streetFilter),
    Boolean(debtFilter),
    Boolean(dueDayFilter),
    Boolean(planFilter),
  ].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        eyebrow={`Base operacional · Modo ${meta.shortName}`}
        title="Clientes"
        detail={`Gestão completa de assinantes ${
          mode === 'fibra'
            ? 'de Internet Fibra Óptica'
            : mode === 'tv'
            ? 'de TV Comunitária'
            : 'de TV & Internet Fibra'
        } com pesquisa por Código, Casa, BI ou Telefone.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPrintModal(true)}>
              <Printer size={15} /> Imprimir lista (PDF)
            </Button>
            <Button
              onClick={() => {
                setEdit(undefined);
                setModal(true);
              }}
            >
              <Plus size={16} /> Novo cliente
            </Button>
          </div>
        }
      />

      {/* KPI Cards: Exclusivos do Modo Activo */}
      {mode === 'fibra' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {/* Fibra Card 1: Total Fibra */}
          <div
            onClick={() => {
              setStatusFilter('');
            }}
            className="surface cursor-pointer rounded-2xl p-4 border border-blue-500/30 hover:border-blue-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Total Fibra Óptica
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center transition">
                <Wifi size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-blue-700 dark:text-blue-400">
                {fiberClientsCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">assinantes</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>{fiberOnlyCount} puros + {comboClientsCount} combo</span>
            </div>
          </div>

          {/* Fibra Card 2: Activos / Sinal Online */}
          <div
            onClick={() => setStatusFilter('active')}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-emerald-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Fibra Activos (Online)
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center transition">
                <Check size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
                {fiberActiveCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">com sinal activo</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>ONUs sincronizadas na OLT</span>
            </div>
          </div>

          {/* Fibra Card 3: Em Atraso / Pendente Corte */}
          <div
            onClick={() => setStatusFilter('late')}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-amber-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Atraso (Pendente Corte)
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center transition">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-700 dark:text-amber-400">
                {fiberLateCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">após vencimento</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>Multa de 1.000 Kz aplicável</span>
            </div>
          </div>

          {/* Fibra Card 4: Suspensos / Bloqueio Óptico */}
          <div
            onClick={() => setStatusFilter('suspended')}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-rose-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Fibra Suspensos (LOS)
              </span>
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center transition">
                <X size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-700 dark:text-rose-400">
                {fiberSuspendedCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">desligados</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>Sinal bloqueado na porta CTO</span>
            </div>
          </div>
        </div>
      ) : mode === 'tv' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {/* TV Card 1: Total TV */}
          <div
            onClick={() => {
              setStatusFilter('');
            }}
            className="surface cursor-pointer rounded-2xl p-4 border border-amber-500/30 hover:border-amber-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Total TV Comunitária
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center transition">
                <Tv size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-700 dark:text-amber-400">
                {tvClientsCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">assinantes</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>{tvOnlyCount} TV pura + {comboClientsCount} combo</span>
            </div>
          </div>

          {/* TV Card 2: TV Activos */}
          <div
            onClick={() => setStatusFilter('active')}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-emerald-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                TV Activos (Sinal Ligado)
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center transition">
                <Check size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
                {tvActiveCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">conectados</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>Sinal RF comunitário regular</span>
            </div>
          </div>

          {/* TV Card 3: TV em Atraso */}
          <div
            onClick={() => setStatusFilter('late')}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-amber-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                TV em Atraso (Corte)
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center transition">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-700 dark:text-amber-400">
                {tvLateCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">por liquidar</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>Avisos de corte emitidos</span>
            </div>
          </div>

          {/* TV Card 4: TV Suspensos */}
          <div
            onClick={() => setStatusFilter('suspended')}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-rose-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                TV Suspensos (Cortados)
              </span>
              <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center transition">
                <X size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-700 dark:text-rose-400">
                {tvSuspendedCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">desligados</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>Cabo desconectado no poste/caixa</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {/* Card 1: Total Global */}
          <div
            onClick={() => {
              setServiceFilter('');
              setStatusFilter('');
            }}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Total Assinantes
              </span>
              <div className="h-8 w-8 rounded-xl bg-[hsl(var(--secondary))] group-hover:bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))] flex items-center justify-center transition">
                <Users size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-[hsl(var(--foreground))]">
                {totalClientsCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">clientes</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 flex-wrap">
              <span className="text-emerald-600 font-bold">{activeCount} activos</span>
              <span>·</span>
              <span className="text-amber-600 font-bold">{lateCount} em atraso</span>
              <span>·</span>
              <span className="text-rose-600 font-bold">{suspendedCount} cortados</span>
            </div>
          </div>

          {/* Card 2: TV por Cabo */}
          <div
            onClick={() => {
              selectMode('tv');
              setServiceFilter('tv');
              setStatusFilter('');
            }}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-amber-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                TV por Cabo
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center transition">
                <Tv size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-700 dark:text-amber-400">
                {tvClientsCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                {totalClientsCount > 0 ? `${Math.round((tvClientsCount / totalClientsCount) * 100)}% da base` : 'assinantes'}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>{tvOnlyCount} exclusivos + {comboClientsCount} combo</span>
            </div>
          </div>

          {/* Card 3: Internet Fibra Óptica */}
          <div
            onClick={() => {
              selectMode('fibra');
              setServiceFilter('internet');
              setStatusFilter('');
            }}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-blue-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                Fibra Óptica FTTH
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center transition">
                <Wifi size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-blue-700 dark:text-blue-400">
                {fiberClientsCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                {totalClientsCount > 0 ? `${Math.round((fiberClientsCount / totalClientsCount) * 100)}% da base` : 'assinantes'}
              </span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>{fiberOnlyCount} exclusivos + {comboClientsCount} combo</span>
            </div>
          </div>

          {/* Card 4: Pacote Combo (TV + Fibra) */}
          <div
            onClick={() => {
              selectMode('ambos');
              setServiceFilter('combo');
              setStatusFilter('');
            }}
            className="surface cursor-pointer rounded-2xl p-4 border border-[hsl(var(--border))] hover:border-emerald-500 transition shadow-xs group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Pacote Combo Duplo
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center transition">
                <Layers size={16} />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
                {comboClientsCount}
              </span>
              <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">ambos serviços</span>
            </div>
            <div className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span>Usam TV + Internet Fibra juntas</span>
            </div>
          </div>
        </div>
      )}


      {/* Banner de Modalidade Activa */}
      {mode && mode !== 'ambos' && (
        <div
          data-testid="banner-active-service-mode"
          className={`mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 border transition ${
            mode === 'fibra'
              ? 'bg-blue-50/80 border-blue-200 text-blue-950 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200'
              : 'bg-amber-50/80 border-amber-200 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'fibra'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-amber-600 text-white shadow-sm'
              }`}
            >
              {mode === 'fibra' ? <Wifi size={18} /> : <Tv size={18} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  Modo Activo: {meta.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/60 dark:bg-black/40">
                  {meta.badge}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                Exibindo exclusivamente clientes e serviços de {meta.shortName}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold shrink-0 self-end sm:self-auto">
            <button
              onClick={() => selectMode('ambos')}
              className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-current/20 hover:bg-white dark:hover:bg-slate-700 transition"
            >
              Ver Ambos os Serviços
            </button>
            <Link
              href="/selecionar-servico"
              className="px-3 py-1.5 rounded-lg bg-current/10 hover:bg-current/15 transition underline"
            >
              Trocar Modalidade
            </Link>
          </div>
        </div>
      )}

      {/* Tabs por serviço / estado */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-[hsl(var(--border))] pb-3">
        {mode === 'fibra' ? (
          [
            { id: '', label: 'Todos os clientes Fibra' },
            { id: 'active', label: 'Fibra Activos (Online)' },
            { id: 'late', label: 'Fibra em Atraso (LOS/Corte)' },
            { id: 'suspended', label: 'Fibra Suspensos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)]'
              }`}
            >
              {tab.label}
            </button>
          ))
        ) : mode === 'tv' ? (
          [
            { id: '', label: 'Todos os clientes TV' },
            { id: 'active', label: 'TV Activos (Sinal Ligado)' },
            { id: 'late', label: 'TV em Atraso (Pendente Corte)' },
            { id: 'suspended', label: 'TV Suspensos (Desligados)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)]'
              }`}
            >
              {tab.label}
            </button>
          ))
        ) : (
          [
            { id: '', label: `Todos os clientes (${totalClientsCount})` },
            { id: 'tv', label: `TV (${tvClientsCount})` },
            { id: 'internet', label: `Internet Fibra (${fiberClientsCount})` },
            { id: 'combo', label: `TV + Fibra Combo (${comboClientsCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setServiceFilter(tab.id);
                if (tab.id === 'tv') selectMode('tv');
                else if (tab.id === 'internet') selectMode('fibra');
                else if (tab.id === 'combo' || tab.id === '') selectMode('ambos');
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                serviceFilter === tab.id || (tab.id === '' && !serviceFilter && mode === 'ambos')
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)]'
              }`}
            >
              {tab.label}
            </button>
          ))
        )}
      </div>

      {/* Quick Filter Chips (Acesso Rápido) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setQuickTag('todos')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            quickTag === 'todos' && !debtFilter && !pdoFilter
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)]'
          }`}
        >
          <span>Todos</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-black">{totalClientsCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setQuickTag(quickTag === 'devedores' ? 'todos' : 'devedores')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            quickTag === 'devedores'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
          }`}
        >
          <span>🚨 Devedores para Corte</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-black">{inDebtCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setQuickTag(quickTag === 'em_dia' ? 'todos' : 'em_dia')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            quickTag === 'em_dia'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <span>🟢 100% Em Dia</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-black">{activeCount}</span>
        </button>

        {fiberClientsCount > 0 && (
          <button
            type="button"
            onClick={() => setQuickTag(quickTag === 'sem_onu' ? 'todos' : 'sem_onu')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              quickTag === 'sem_onu'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>⚡ Sem ONU Registada</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-black">{fiberWithoutOnuCount}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setQuickTag(quickTag === 'whatsapp' ? 'todos' : 'whatsapp')}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            quickTag === 'whatsapp'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-100'
          }`}
        >
          <Phone size={12} />
          <span>Com WhatsApp</span>
          <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-black">{withWhatsappCount}</span>
        </button>
      </div>

      {/* Barra de Pesquisa Multicritério e Controles de Filtros */}
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={17} />
          <Input
            placeholder={
              mode === 'fibra'
                ? 'Pesquisar por Nome, Código (CLI-...), PDO, ONU, Casa, BI, Telefone ou Rua...'
                : mode === 'tv'
                ? 'Pesquisar por Nome, Código (CLI-...), Casa, Rua, BI ou Telefone...'
                : 'Pesquisar por Nome, Código, Casa, Rua, BI, PDO, ONU ou Telefone...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
              title="Limpar pesquisa"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Seletor Rápido de Rua / Zona */}
        <div className="flex items-center gap-1.5 sm:w-52 shrink-0">
          <MapPin size={14} className="text-[hsl(var(--muted-foreground))] shrink-0" />
          <Select
            value={streetFilter}
            onChange={(e) => setStreetFilter(e.target.value)}
            className="h-10 text-xs font-semibold"
          >
            <option value="">Todas as Ruas</option>
            {availableStreets.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </Select>
        </div>

        {/* Botão de Expansão de Filtros Avançados */}
        <button
          type="button"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold border transition cursor-pointer ${
            showAdvancedFilters || activeAdvancedCount > 0
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))] shadow-xs'
              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>Filtros Avançados</span>
          {activeAdvancedCount > 0 && (
            <span className="rounded-full bg-white text-[hsl(var(--primary))] px-1.5 py-0.2 text-[10px] font-black">
              {activeAdvancedCount}
            </span>
          )}
        </button>

        {/* Ordenação */}
        <div className="flex items-center gap-1.5 sm:w-56 shrink-0">
          <ArrowUpDown size={14} className="text-[hsl(var(--muted-foreground))] shrink-0" />
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 text-xs font-medium"
          >
            <option value="default">Ordenar: Padrão (Recentes)</option>
            <option value="name_asc">Nome (A → Z)</option>
            <option value="name_desc">Nome (Z → A)</option>
            <option value="code_asc">Código (Crescente)</option>
            <option value="code_desc">Código (Decrescente)</option>
            <option value="debt_first">🚨 Maior Atraso / Dívida</option>
            <option value="pdo">Caixa PDO (Ordem Técnica)</option>
          </Select>
        </div>
      </div>

      {/* Painel Expansível de Filtros Avançados Multicritério */}
      {showAdvancedFilters && (
        <div className="mb-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2.5 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--foreground))]">
              <Filter size={14} className="text-[hsl(var(--primary))]" />
              <span>Painel de Filtros Avançados Multicritério</span>
            </div>
            {activeAdvancedCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPdoFilter('');
                  setStreetFilter('');
                  setDebtFilter('');
                  setDueDayFilter('');
                  setPlanFilter('');
                  setStatusFilter('');
                }}
                className="text-xs font-bold text-[hsl(var(--destructive))] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X size={12} /> Limpar filtros avançados
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Caixa PDO */}
            <div>
              <label className="block text-[11px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                Caixa PDO (Fibra)
              </label>
              <Select
                value={pdoFilter}
                onChange={(e) => setPdoFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="">Todas as Caixas PDO</option>
                {availablePdos.map((pdo) => (
                  <option key={pdo} value={pdo}>
                    {pdo}
                  </option>
                ))}
              </Select>
            </div>

            {/* 2. Rua / Zona */}
            <div>
              <label className="block text-[11px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                Rua / Zona
              </label>
              <Select
                value={streetFilter}
                onChange={(e) => setStreetFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="">Todas as Ruas / Zonas</option>
                {availableStreets.map((street) => (
                  <option key={street} value={street}>
                    {street}
                  </option>
                ))}
              </Select>
            </div>

            {/* 3. Situação Financeira / Dívida */}
            <div>
              <label className="block text-[11px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                Situação Financeira
              </label>
              <Select
                value={debtFilter}
                onChange={(e) => setDebtFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="">Todas as situações</option>
                <option value="em_dia">🟢 100% Em Dia (Regular)</option>
                <option value="com_divida">🚨 Com Dívida (Qualquer)</option>
                <option value="atraso_1m">⚠️ 1 Mês de Atraso</option>
                <option value="suspenso">🔴 Suspenso (&gt;3 meses)</option>
              </Select>
            </div>

            {/* 4. Dia de Vencimento */}
            <div>
              <label className="block text-[11px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                Dia de Vencimento
              </label>
              <Select
                value={dueDayFilter}
                onChange={(e) => setDueDayFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="">Todos os dias</option>
                <option value="5">Dia 05 de cada mês</option>
                <option value="10">Dia 10 de cada mês</option>
                <option value="15">Dia 15 de cada mês</option>
                <option value="20">Dia 20 de cada mês</option>
                <option value="25">Dia 25 de cada mês</option>
                <option value="30">Dia 30 de cada mês</option>
              </Select>
            </div>

            {/* 5. Estado Geral */}
            <div>
              <label className="block text-[11px] font-bold text-[hsl(var(--muted-foreground))] mb-1">
                Estado Geral
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="">Todos os estados</option>
                <option value="active">Activos</option>
                <option value="late">Em atraso (Corte)</option>
                <option value="suspended">Suspensos (&gt;3 meses)</option>
                <option value="inactive">Inactivos</option>
                <option value="request">Com pedido pendente</option>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Etiquetas de Filtros Activos & Contador */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-[hsl(var(--muted-foreground))]">
            Mostrando {filteredItems.length} {filteredItems.length === 1 ? 'cliente' : 'clientes'}
            {filteredItems.length !== allClients.length && ` (de ${allClients.length})`}
          </span>

          {search && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 text-[11px] font-semibold">
              Pesquisa: "{search}"
              <button onClick={() => setSearch('')} className="hover:opacity-75">
                <X size={12} />
              </button>
            </span>
          )}

          {pdoFilter && (
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 text-[11px] font-semibold">
              PDO: {pdoFilter}
              <button onClick={() => setPdoFilter('')} className="hover:opacity-75">
                <X size={12} />
              </button>
            </span>
          )}

          {streetFilter && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 text-[11px] font-semibold">
              Rua: {streetFilter}
              <button onClick={() => setStreetFilter('')} className="hover:opacity-75">
                <X size={12} />
              </button>
            </span>
          )}

          {statusFilter && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 text-[11px] font-semibold">
              Estado: {statusFilter}
              <button onClick={() => setStatusFilter('')} className="hover:opacity-75">
                <X size={12} />
              </button>
            </span>
          )}

          {debtFilter && (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 text-[11px] font-semibold">
              Dívida: {debtFilter}
              <button onClick={() => setDebtFilter('')} className="hover:opacity-75">
                <X size={12} />
              </button>
            </span>
          )}

          {dueDayFilter && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-[11px] font-semibold">
              Vence dia: {dueDayFilter}
              <button onClick={() => setDueDayFilter('')} className="hover:opacity-75">
                <X size={12} />
              </button>
            </span>
          )}

          {(search || pdoFilter || streetFilter || statusFilter || debtFilter || dueDayFilter || quickTag !== 'todos') && (
            <button
              onClick={() => {
                setSearch('');
                setPdoFilter('');
                setStreetFilter('');
                setStatusFilter('');
                setDebtFilter('');
                setDueDayFilter('');
                setPlanFilter('');
                setQuickTag('todos');
              }}
              className="font-bold text-[hsl(var(--destructive))] hover:underline ml-1 cursor-pointer"
            >
              Limpar todos
            </button>
          )}
        </div>

        {/* Seletor de tamanho de página */}
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2 py-1 text-xs"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={9999}>Todos</option>
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="surface rounded-xl p-10 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Nenhum cliente encontrado com os critérios actuais.</p>
          <Button
            className="mt-4"
            onClick={() => {
              setSearch('');
              setServiceFilter('');
              setStatusFilter('');
              setStreetFilter('');
              setPdoFilter('');
              setDebtFilter('');
              setDueDayFilter('');
              setQuickTag('todos');
            }}
          >
            Limpar todos os filtros
          </Button>
        </div>
      ) : (
        <div className="surface overflow-hidden rounded-xl">
          <div className="mobile-scroll overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="px-5 py-4">Cliente</th>
                  <th>Casa / BI</th>
                  <th>Serviço & Rede</th>
                  <th>Contacto</th>
                  <th>Estado & Sinal</th>
                  <th className="px-5 text-right">Acções</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((client: Client) => {
                  const clientPhone = String(client.phone || '').trim();
                  const cleanPhone = clientPhone.replace(/\D/g, '');
                  const isLate = client.status === 'late';
                  const isSuspended = client.status === 'suspended' || client.status === 'cut';

                  return (
                    <tr
                      key={client.id}
                      className="border-b border-[hsl(var(--border)/.7)] last:border-0 hover:bg-[hsl(var(--secondary)/.35)] transition-colors"
                    >
                      {/* Cliente: Avatar, Nome e Código */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Link href={`/clientes/${client.id}`} className="shrink-0">
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-xs font-black text-[hsl(var(--primary))] hover:brightness-110 transition">
                              {initials(client.fullName || client.full_name || client.name)}
                            </span>
                          </Link>
                          <div>
                            <Link href={`/clientes/${client.id}`} className="block text-sm font-bold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition">
                              {client.fullName || client.full_name || client.name || 'Cliente'}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="mono text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                                {client.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(client.code || '', `code-${client.id}`)}
                                title="Copiar código do cliente"
                                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-0.5 rounded hover:bg-[hsl(var(--secondary))] transition"
                              >
                                {copiedKey === `code-${client.id}` ? (
                                  <Check size={12} className="text-emerald-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Casa / BI */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="mono text-xs font-bold text-[#0b4a8a] dark:text-blue-400">
                            {client.houseCode || (client as any).house_code || '—'}
                          </span>
                          {(client.houseCode || (client as any).house_code) && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(client.houseCode || (client as any).house_code || '', `house-${client.id}`)}
                              title="Copiar código da casa"
                              className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-0.5 rounded transition"
                            >
                              {copiedKey === `house-${client.id}` ? (
                                <Check size={11} className="text-emerald-600" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          )}
                        </div>
                        <small className="block text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          BI: {client.documentNumber || (client as any).document_number || '—'}
                        </small>
                      </td>

                      {/* Serviço & Rede */}
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {client.serviceType === 'combo' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-xs font-bold">
                              <Layers size={12} /> Combo TV + Fibra
                            </span>
                          ) : client.serviceType === 'internet' || client.serviceType === 'fibra' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 text-xs font-bold">
                              <Wifi size={12} /> Internet Fibra (FTTH)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-xs font-bold">
                              <Tv size={12} /> TV por Cabo
                            </span>
                          )}

                          {(client.pdoNumber || (client as any).pdo_number) && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              PDO: {client.pdoNumber || (client as any).pdo_number}
                              {(client as any).portNumber ? ` [${(client as any).portNumber}]` : ''}
                            </span>
                          )}

                          {(client.onuNumber || (client as any).onu_number) && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              ONU: {client.onuNumber || (client as any).onu_number}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                          <span className="font-semibold text-[hsl(var(--foreground))]">
                            {kz(Number(client.monthlyPrice || (client as any).monthly_fee) || (client.serviceType === 'combo' ? 14500 : client.serviceType === 'internet' || client.serviceType === 'fibra' ? 12000 : 4000))}
                          </span>
                          <span>·</span>
                          <span>Vence dia {client.dueDay || (client as any).due_day || 5}</span>
                          {(client as any).opticalRxDbm && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-emerald-600">{(client as any).opticalRxDbm} dBm</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Contacto & Localização */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">{clientPhone || '—'}</span>
                          {clientPhone && (
                            <>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(clientPhone, `phone-${client.id}`)}
                                title="Copiar telefone"
                                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-0.5 rounded transition"
                              >
                                {copiedKey === `phone-${client.id}` ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                              <a
                                href={`https://wa.me/244${cleanPhone.startsWith('244') ? cleanPhone.slice(3) : cleanPhone}?text=${encodeURIComponent(
                                  `Olá Sr.(a) ${client.fullName}, contacto da OSDEL Tecnologia referente ao seu serviço ${serviceLabel(client.serviceType)}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Conversar no WhatsApp"
                                className="inline-flex items-center text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 p-0.5 rounded hover:bg-emerald-500/10 transition"
                              >
                                <MessageCircle size={14} />
                              </a>
                            </>
                          )}
                        </div>
                        <small className="block text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          {client.street ? `${client.street}${client.neighborhood ? ` · ${client.neighborhood}` : ''}` : (client.neighborhood || client.address || '—')}
                        </small>
                      </td>

                      {/* Estado & Dívida */}
                      <td>
                        <StatusBadge value={client.status} />
                        <div className="mt-1 text-[10px]">
                          {isSuspended ? (
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              ≥3 meses · Cortado
                            </span>
                          ) : isLate ? (
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              Atraso · Aviso emitido
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Sinal normalizado
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Acções Rápidas */}
                      <td className="px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {client.serviceType !== 'internet' && client.serviceType !== 'fibra' && (
                            <button
                              onClick={() => setMigratingClient(client)}
                              title="Migrar para Internet Fibra Óptica e Gerar Novo Contrato"
                              className="flex items-center gap-1 rounded-lg bg-purple-500/10 px-2 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-500/20 transition dark:text-purple-300"
                            >
                              <Zap size={13} />
                              <span className="hidden xl:inline">Migrar Fibra</span>
                            </button>
                          )}
                          <button
                            onClick={() => setCredentialsClient(client)}
                            title="Gerar / Ver Credenciais de Acesso ao APK Cliente (PIN e Contrato)"
                            className="flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-500/20 transition dark:text-blue-300"
                          >
                            <Smartphone size={13} />
                            <span className="hidden xl:inline">Acesso APK</span>
                          </button>
                          <Link
                            href={`/clientes/${client.id}`}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]"
                          >
                            Ver ficha
                          </Link>
                          <button
                            onClick={() => {
                              setEdit(client);
                              setModal(true);
                            }}
                            title="Editar dados cadastrais"
                            className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                          >
                            <FilePenLine size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação Ultrarrápida */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[hsl(var(--border))] px-5 py-3 text-xs bg-[hsl(var(--card))]">
              <span className="text-[hsl(var(--muted-foreground))]">
                A exibir {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredItems.length)} de {filteredItems.length} clientes
              </span>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-[hsl(var(--border))] px-3 py-1 font-bold disabled:opacity-40 hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
                >
                  Anterior
                </button>
                <span className="px-2 font-bold text-[hsl(var(--foreground))]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-[hsl(var(--border))] px-3 py-1 font-bold disabled:opacity-40 hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
                >
                  Seguinte
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Migrar para Fibra Óptica & Gerar Contrato */}
      {migratingClient && (
        <MigrateToFiberModal
          client={migratingClient}
          onClose={() => setMigratingClient(null)}
          onSuccess={(newContract) => {
            const updatedClient = {
              ...migratingClient,
              serviceType: 'internet',
            };
            setMigratingClient(null);
            setCreatedContractPreview({
              client: updatedClient,
              contract: newContract,
            });
          }}
        />
      )}

      {/* Modal Credenciais APK Cliente */}
      {credentialsClient && (
        <ClientCredentialsModal
          client={credentialsClient}
          onClose={() => setCredentialsClient(null)}
        />
      )}

      {/* Modal Criar / Editar Cliente */}
      {modal && (
        <ClientModal
          client={edit}
          defaultServiceType={mode === 'fibra' ? 'internet' : 'tv'}
          settings={settings}
          close={() => setModal(false)}
          onCreated={(res) => {
            setModal(false);
            setCreatedContractPreview(res);
          }}
        />
      )}

      {/* Preview Contrato gerado automaticamente */}
      {createdContractPreview && (
        <ContractPreview
          client={createdContractPreview.client}
          contract={createdContractPreview.contract}
          settings={settings}
          close={() => setCreatedContractPreview(null)}
        />
      )}

      {/* Modal Imprimir Lista de Clientes */}
      {printModal && (
        <ClientListPreview
          clients={filteredItems}
          title={
            pdoFilter
              ? `Lista de Clientes · Caixa ${pdoFilter}`
              : streetFilter
                ? `Lista de Clientes · ${streetFilter}`
                : serviceFilter === 'tv'
                  ? 'Clientes TV por Cabo'
                  : serviceFilter === 'internet'
                    ? 'Clientes Internet Fibra'
                    : serviceFilter === 'combo'
                      ? 'Clientes TV + Internet Combo'
                      : quickTag === 'devedores'
                        ? 'Lista de Assinantes para Corte / Cobrança'
                        : 'Todos os Clientes'
          }
          settings={settings}
          close={() => setPrintModal(false)}
        />
      )}
    </div>
  );
}

function ClientModal({
  client,
  defaultServiceType = 'tv',
  settings,
  close,
  onCreated,
}: {
  client?: Client;
  defaultServiceType?: string;
  settings: AnyRecord;
  close: () => void;
  onCreated: (res: { client: AnyRecord; contract: AnyRecord }) => void;
}) {
  const qc = useQueryClient();
  const usersQuery = useListUsers();
  const allUsers: any[] = (Array.isArray(usersQuery.data) ? usersQuery.data : usersQuery.data?.items) || [];
  const technicians = allUsers.filter((u: any) => u.active !== false);

  // Modo: Novo Cliente (Nova Adesão) vs Cliente Existente (Migração com histórico)
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [existingContractDate, setExistingContractDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [existingContractNumber, setExistingContractNumber] = useState('');
  const [chargeAdhesionNow, setChargeAdhesionNow] = useState(false);
  const [impactTreasuryHistory, setImpactTreasuryHistory] = useState(false);

  // Cálculo dinâmico dos dias restantes do mês atual
  const now = new Date();
  const currentDay = now.getDate();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(0, lastDayOfMonth - currentDay);
  const dailyPrice = Number(settings.dailyGuarantee || 150);
  const remainingDaysTotal = remainingDays * dailyPrice;

  const defaultContractFee = Number(settings.connectionFee || 15000);
  const defaultUrgentFee = Number(settings.urgentInstallationFee || 2000);

  const [form, setForm] = useState<any>(
    client
      ? {
          ...emptyClient,
          ...client,
          remainingDaysChoice: client.remainingDaysChoice || 'assistir_restantes',
          remainingDaysCount: client.remainingDaysCount ?? client.prorataDays ?? 0,
          remainingDaysAmount: client.remainingDaysAmount ?? client.prorataAmount ?? 0,
          accountId: client.accountId || client.account_id || 'acc-caixa',
          paymentMethod: client.paymentMethod || client.payment_method || 'Numerário / Balcão',
          contractAmount: client.contractAmount || defaultContractFee,
        }
      : {
          ...emptyClient,
          serviceType: defaultServiceType,
          contractAmount: defaultContractFee,
          isUrgentInstallation: false,
          urgentTechnicianId: technicians[0]?.id ? String(technicians[0].id) : '',
          urgentTechnicianName: technicians[0]?.name || '',
          remainingDaysChoice: 'assistir_restantes',
          paymentMethod: 'Numerário / Balcão',
        },
  );

  const create = useCreateClient();
  const update = useUpdateClient();

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const isTvService = form.serviceType === 'tv';
  const isUrgent = Boolean(form.isUrgentInstallation);
  const payRemainingDays = form.remainingDaysChoice === 'pagar_restantes';

  // Cálculos de preço mensal e valores de adesão
  const tvCount = Number(form.tvPoints || (form.extraTvs ? Number(form.extraTvs) + 1 : 1));
  const baseTvPrice = Number(settings.tvMonthlyPrice ?? 4000);
  const extraTvPrice = Number(settings.tvExtraPrice ?? 1000);
  const calculatedTvMonthly = tvCount > 1 ? (baseTvPrice + (tvCount - 1) * extraTvPrice) : baseTvPrice;
  const finalMonthlyPrice = isTvService
    ? Number(form.monthlyFee || form.monthlyPrice || calculatedTvMonthly)
    : form.serviceType === 'combo'
    ? Number(form.monthlyFee || form.monthlyPrice || (calculatedTvMonthly + 6500))
    : Number(form.monthlyFee || form.monthlyPrice || 6500);

  const contractValue = Number(form.contractAmount || defaultContractFee);
  const rawUrgentFee = isUrgent ? defaultUrgentFee : 0;
  const urgentDiscount = Math.min(rawUrgentFee, Math.max(0, Number(form.urgentDiscount || 0)));
  const urgentValue = Math.max(0, rawUrgentFee - urgentDiscount);
  const prorataValue = payRemainingDays ? remainingDaysTotal : 0;
  const totalAdesao = contractValue + urgentValue + prorataValue;

  // Geração automática das 3 últimas competências mensais para cliente existente
  const initial3Months = useMemo(() => {
    const list = [];
    const dNow = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(dNow.getFullYear(), dNow.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mName = d.toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' });
      const capitalized = mName.charAt(0).toUpperCase() + mName.slice(1);
      const payDay = i === 0 ? Math.min(dNow.getDate(), 5) : 5;
      const defaultPayDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;

      list.push({
        month: mStr,
        label: capitalized,
        isCurrent: i === 0,
        relativeLabel: i === 0 ? 'Mês Atual (Vigente)' : i === 1 ? 'Mês Anterior (-1)' : 'Há 2 Meses (-2)',
        status: 'pago' as 'pago' | 'pendente' | 'isento',
        amount: finalMonthlyPrice,
        paidAt: defaultPayDate,
        method: 'Multicaixa Express',
        accountId: 'acc-tpa',
        reference: '',
        notes: '',
      });
    }
    return list;
  }, []);

  const [paymentHistory, setPaymentHistory] = useState(initial3Months);

  // Sincroniza o valor padrão das mensalidades no histórico quando o plano ou TVs mudam
  useEffect(() => {
    if (isExistingClient) {
      setPaymentHistory((prev) =>
        prev.map((item) => ({
          ...item,
          amount: (item.amount === 4000 || item.amount === 6500 || item.amount === 5000)
            ? finalMonthlyPrice
            : item.amount,
        }))
      );
    }
  }, [finalMonthlyPrice, isExistingClient]);

  const updateHistoryMonth = (index: number, patch: Partial<(typeof paymentHistory)[0]>) => {
    setPaymentHistory((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const [submitError, setSubmitError] = useState<string | null>(null);

  const duplicateStatus = useMemo(() => {
    return checkClientDuplicate({
      fullName: form.fullName,
      documentNumber: form.documentNumber,
      excludeClientId: client?.id,
    });
  }, [form.fullName, form.documentNumber, client?.id]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!form.fullName || !form.phone || !form.address) return;

    if (duplicateStatus.isDuplicate) {
      setSubmitError(duplicateStatus.message || 'Dados duplicados detectados.');
      return;
    }

    const selectedTech = technicians.find((t: any) => String(t.id) === String(form.urgentTechnicianId));

    const data = {
      ...form,
      tvPoints: tvCount,
      extraTvs: Math.max(0, tvCount - 1),
      monthlyFee: finalMonthlyPrice,
      monthlyPrice: finalMonthlyPrice,
      isExistingClient,
      contractStartDate: isExistingClient ? existingContractDate : undefined,
      existingContractNumber: isExistingClient ? (existingContractNumber.trim() || undefined) : undefined,
      chargeAdhesionNow: isExistingClient ? chargeAdhesionNow : true,
      contractAmount: isExistingClient ? (chargeAdhesionNow ? contractValue : 0) : contractValue,
      isUrgentInstallation: isExistingClient ? false : isUrgent,
      urgentInstallationFee: isExistingClient ? 0 : urgentValue,
      urgentDiscount: isExistingClient ? 0 : urgentDiscount,
      urgentTechnicianId: !isExistingClient && isUrgent && selectedTech ? selectedTech.id : null,
      urgentTechnicianName: !isExistingClient && isUrgent && selectedTech ? selectedTech.name : null,
      remainingDaysChoice: client ? (form.remainingDaysChoice || client.remainingDaysChoice || 'assistir_restantes') : isExistingClient ? 'assistir_restantes' : form.remainingDaysChoice,
      remainingDaysCount: client ? Number(form.remainingDaysCount ?? client.remainingDaysCount ?? 0) : isExistingClient ? 0 : remainingDays,
      remainingDaysAmount: client ? Number(form.remainingDaysAmount ?? client.remainingDaysAmount ?? 0) : isExistingClient ? 0 : prorataValue,
      prorataDays: client ? Number(form.prorataDays ?? form.remainingDaysCount ?? client.prorataDays ?? client.remainingDaysCount ?? 0) : isExistingClient ? 0 : remainingDays,
      prorataAmount: client ? Number(form.prorataAmount ?? form.remainingDaysAmount ?? client.prorataAmount ?? client.remainingDaysAmount ?? 0) : isExistingClient ? 0 : prorataValue,
      totalInitialPaid: isExistingClient ? (chargeAdhesionNow ? contractValue : 0) : totalAdesao,
      paymentHistory: isExistingClient
        ? paymentHistory.map((p) => ({
            ...p,
            impactTreasury: impactTreasuryHistory,
          }))
        : undefined,
      accountId: form.accountId || (
        String(form.paymentMethod || '').toLowerCase().includes('bai') ? 'acc-bai' :
        String(form.paymentMethod || '').toLowerCase().includes('bfa') ? 'acc-bfa' :
        String(form.paymentMethod || '').toLowerCase().includes('tpa') || String(form.paymentMethod || '').toLowerCase().includes('express') || String(form.paymentMethod || '').toLowerCase().includes('multi') ? 'acc-tpa' : 'acc-caixa'
      ),
      email: form.email || null,
      alternatePhone: form.alternatePhone || null,
      neighborhood: form.neighborhood || null,
      street: form.street || form.neighborhood || form.address || '',
      documentNumber: form.documentNumber || null,
      houseCode: form.houseCode || null,
      pdoNumber: form.pdoNumber || null,
      onuNumber: isTvService ? null : (form.onuNumber || null),
      notes: isTvService && tvCount > 1 ? `${form.notes ? form.notes + ' · ' : ''}${tvCount} televisores (${kz(finalMonthlyPrice)}/mês)` : (form.notes || null),
    };

    if (client) {
      update.mutate(
        { clientId: client.id, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
            qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            close();
          },
          onError: (err: any) => {
            setSubmitError(err?.message || 'Erro ao atualizar dados do cliente.');
          },
        },
      );
    } else {
      create.mutate(
        { data },
        {
          onSuccess: (res: any) => {
            qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
            qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
            qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
            qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
            onCreated(res);
          },
          onError: (err: any) => {
            setSubmitError(err?.message || 'Erro ao criar novo cliente.');
          },
        },
      );
    }
  };

  const internetPlans: any[] = settings.internetPlans || [
    { id: 'fibra-10', name: 'Fibra 10', speed: '10 Mbps/s', price: 6500 },
    { id: 'fibra-22', name: 'Fibra 22', speed: '22 Mbps/s', price: 8500 },
    { id: 'fibra-50', name: 'Fibra 50', speed: '50 Mbps/s', price: 12000 },
  ];

  return (
    <Modal
      title={
        client
          ? 'Editar cliente'
          : isExistingClient
          ? 'Adicionar Cliente Existente (Com Histórico de 3 Meses)'
          : 'Registar novo cliente e contrato'
      }
      eyebrow={isExistingClient ? 'Migração de Base & Regularização Histórica' : 'Base de clientes OSDEL'}
      onClose={close}
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Banner de erro de submissão ou duplicados */}
        {submitError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <b className="font-bold block">Aviso de Registo / Impedimento:</b>
              {submitError}
            </div>
          </div>
        )}

        {duplicateStatus.isDuplicate && !submitError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <b className="font-bold block">Registo Duplicado Detectado:</b>
              <span>{duplicateStatus.message}</span>
            </div>
          </div>
        )}

        {/* Seletor de Tipo de Cadastro: Nova Adesão vs Cliente Existente */}
        {!client && (
          <div className="grid grid-cols-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 gap-1.5">
            <button
              type="button"
              onClick={() => setIsExistingClient(false)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                !isExistingClient
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap size={14} className={!isExistingClient ? 'text-blue-500' : ''} />
              <span>Nova Adesão (Cliente Novo)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExistingClient(true)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                isExistingClient
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History size={14} className={isExistingClient ? 'text-emerald-500' : ''} />
              <span>Cliente Existente (Com Histórico de 3 Meses)</span>
            </button>
          </div>
        )}

        {/* Banner informativo de migração */}
        {!client && isExistingClient && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <b className="font-bold block">Modo Cliente Existente & Regularização de Histórico:</b>
              Cadastre assinantes que já possuem ligação física na rede. Registe a data original do contrato e o histórico dos últimos 3 meses (mensalidades quitadas ou pendentes) para unificar a cobrança sem duplicar cobrança de instalação.
            </div>
          </div>
        )}

        {/* Campos de Antiguidade do Contrato (Exclusivo Cliente Existente) */}
        {!client && isExistingClient && (
          <div className="rounded-xl border border-emerald-300/60 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <CalendarIcon size={15} className="text-emerald-600" />
              <span>Dados de Antiguidade e Contrato Anterior</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Data de Início Original / Adesão *" hint="Data em que o cliente entrou na OSDEL">
                <Input
                  type="date"
                  value={existingContractDate}
                  onChange={(e) => setExistingContractDate(e.target.value)}
                  required
                />
              </Field>

              <Field label="N.º do Contrato Físico / Anterior" hint="Deixe vazio para gerar CT automaticamente">
                <Input
                  value={existingContractNumber}
                  onChange={(e) => setExistingContractNumber(e.target.value)}
                  placeholder="Ex.: CT-2023/00142"
                />
              </Field>

              <Field label="Taxa de Adesão Inicial">
                <Select
                  value={chargeAdhesionNow ? 'cobrar' : 'isento'}
                  onChange={(e) => setChargeAdhesionNow(e.target.value === 'cobrar')}
                >
                  <option value="isento">Já Liquidada no Passado (Isento)</option>
                  <option value="cobrar">Cobrar Adesão Agora ({kz(contractValue)})</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {/* Informações Básicas do Assinante */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo do assinante *">
            <Input
              value={form.fullName}
              onChange={(e) => {
                set('fullName', e.target.value);
                setSubmitError(null);
              }}
              required
              placeholder="Ex.: António Domingos Pedro"
              className={duplicateStatus.isDuplicate && duplicateStatus.field === 'name' ? 'border-rose-500 focus:border-rose-600 focus:ring-rose-200' : ''}
            />
            {duplicateStatus.isDuplicate && duplicateStatus.field === 'name' && (
              <p className="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <AlertCircle size={13} /> {duplicateStatus.message}
              </p>
            )}
          </Field>
          <Field label="Telefone principal (WhatsApp) *">
            <Input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              placeholder="+244 923 000 000"
            />
          </Field>
          <Field label="Telefone alternativo">
            <Input
              value={form.alternatePhone || ''}
              onChange={(e) => set('alternatePhone', e.target.value)}
              placeholder="+244 992 000 000"
            />
          </Field>
          <Field label="N.º de Bilhete de Identidade (BI/NIF) *">
            <Input
              value={form.documentNumber || ''}
              onChange={(e) => {
                set('documentNumber', e.target.value);
                setSubmitError(null);
              }}
              required
              placeholder="Ex.: 004829104LA041"
              className={duplicateStatus.isDuplicate && duplicateStatus.field === 'document' ? 'border-rose-500 focus:border-rose-600 focus:ring-rose-200' : ''}
            />
            {duplicateStatus.isDuplicate && duplicateStatus.field === 'document' && (
              <p className="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <AlertCircle size={13} /> {duplicateStatus.message}
              </p>
            )}
          </Field>
          <Field label="Código da Casa / Residência *">
            <Input
              value={form.houseCode || ''}
              onChange={(e) => set('houseCode', e.target.value)}
              required
              placeholder="Ex.: Casa 45B ou Bloco B"
            />
          </Field>
          <Field label="Rua / Zona Principal *">
            <Input
              value={form.street || form.neighborhood || ''}
              onChange={(e) => {
                set('street', e.target.value);
                set('neighborhood', e.target.value);
              }}
              required
              placeholder="Ex.: Rua 12, Rua 13, Rua 7..."
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Morada completa / Ponto de Referência *">
              <Input
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                required
                placeholder="Rua, número de porta e ponto de referência"
              />
            </Field>
          </div>

          <Field label="Tipo de serviço">
            <Select value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)}>
              {defaultServiceType === 'internet' ? (
                <>
                  <option value="internet">Internet Fibra Óptica (FTTH)</option>
                  <option value="combo">Combo (TV + Internet Fibra)</option>
                </>
              ) : defaultServiceType === 'tv' ? (
                <>
                  <option value="tv">TV por Cabo (4.000 Kz/mês)</option>
                  <option value="combo">Combo (TV + Internet Fibra)</option>
                </>
              ) : (
                <>
                  <option value="tv">TV por Cabo (4.000 Kz/mês)</option>
                  <option value="internet">Internet Fibra Óptica</option>
                  <option value="combo">Combo (TV + Internet Fibra)</option>
                </>
              )}
            </Select>
          </Field>

          {!isTvService ? (
            <Field label="Plano de Internet Fibra">
              <Select value={form.planId} onChange={(e) => set('planId', e.target.value)}>
                {internetPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.speed}) — {kz(p.price)}/mês
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-900 dark:text-amber-200">
              <b className="block font-bold">Regras Oficiais de TV:</b>
              Mensalidade normal de 4.000 Kz paga de dia 1 a dia 5. Passou dia 5: sinal cortado e multa de 1.000 Kz. Ponto extra: +1.000 Kz/mês por TV adicional.
            </div>
          )}

          {/* Equipamentos: TV NÃO usa ONU! */}
          {!isTvService ? (
            <>
              <Field label="Caixa CTO / PDO de Fibra Óptica">
                <Input
                  value={form.pdoNumber || ''}
                  onChange={(e) => set('pdoNumber', e.target.value)}
                  placeholder="Ex.: CTO-04 / Porta 08"
                />
              </Field>
              <Field label="N.º Modem ONU (Exclusivo Internet Fibra)">
                <Input
                  value={form.onuNumber || ''}
                  onChange={(e) => set('onuNumber', e.target.value)}
                  placeholder="Ex.: ONU-HW-4821"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Caixa TAP / Derivação Coaxial de Rua">
                <Input
                  value={form.pdoNumber || ''}
                  onChange={(e) => set('pdoNumber', e.target.value)}
                  placeholder="Ex.: TAP-02 / Poste 14"
                />
              </Field>
              <Field label="N.º de Televisores Conectados (Pontos de TV) *" hint="Cliente com 2 TVs paga mais de 4.000 Kz (ponto extra)">
                <Select
                  value={String(form.tvPoints || '1')}
                  onChange={(e) => {
                    const pts = Number(e.target.value);
                    const basePrice = Number(settings.tvMonthlyPrice ?? 4000);
                    const extraPrice = Number(settings.tvExtraPrice ?? 1000);
                    const calc = pts > 1 ? (basePrice + (pts - 1) * extraPrice) : basePrice;
                    set('tvPoints', pts);
                    set('monthlyFee', calc);
                    set('monthlyPrice', calc);
                  }}
                >
                  <option value="1">1 Televisor — 4.000 Kz/mês (Ponto Base)</option>
                  <option value="2">2 Televisores — 5.000 Kz/mês (+1 Ponto Adicional)</option>
                  <option value="3">3 Televisores — 6.000 Kz/mês (+2 Pontos Adicionais)</option>
                  <option value="4">4 Televisores — 7.000 Kz/mês (+3 Pontos Adicionais)</option>
                  <option value="5">5 Televisores — 8.000 Kz/mês (+4 Pontos Adicionais)</option>
                </Select>
              </Field>
              <div className="sm:col-span-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-blue-950 dark:text-blue-200 block">
                    Mensalidade Oficial do Assinante ({Number(form.tvPoints || 1)} TV{Number(form.tvPoints || 1) > 1 ? 's' : ''}):
                  </span>
                  <span className="text-blue-700 dark:text-blue-400 text-[11px]">
                    {Number(form.tvPoints || 1) > 1
                      ? `Cliente com ${form.tvPoints} televisores: ${kz(settings.tvMonthlyPrice ?? 4000)} base + ${kz((Number(form.tvPoints) - 1) * (settings.tvExtraPrice ?? 1000))} pelos pontos adicionais.`
                      : '1 Televisor: Mensalidade base normal de 4.000 Kz.'}
                  </span>
                </div>
                <b className="text-sm font-extrabold text-blue-700 dark:text-blue-300">
                  {kz(finalMonthlyPrice)}/mês
                </b>
              </div>
            </>
          )}
        </div>

        {/* =========================================================================
            HISTÓRICO DOS ÚLTIMOS 3 MESES DE PAGAMENTOS (EXCLUSIVO CLIENTE EXISTENTE)
            ========================================================================= */}
        {!client && isExistingClient && (
          <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 dark:border-emerald-900/60 pb-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-emerald-600 dark:text-emerald-400" />
                <div>
                  <b className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                    Histórico dos Últimos 3 Meses de Pagamentos
                  </b>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Defina o estado financeiro de cada mês ({paymentHistory[2]?.month} a {paymentHistory[0]?.month})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-1 rounded-md">
                  {paymentHistory.filter((p) => p.status === 'pago').length} de 3 meses quitados
                </span>
              </div>
            </div>

            {/* Grid dos 3 Meses */}
            <div className="grid gap-3.5 md:grid-cols-3">
              {paymentHistory.map((item, index) => {
                const isPaid = item.status === 'pago';
                const isPending = item.status === 'pendente';
                const isExempt = item.status === 'isento';

                return (
                  <div
                    key={item.month}
                    className={`rounded-xl border p-3.5 space-y-3 transition-all ${
                      isPaid
                        ? 'border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 shadow-sm'
                        : isPending
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60'
                    }`}
                  >
                    {/* Cabeçalho do Mês */}
                    <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          {item.label}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">
                          Competência: {item.month}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isCurrent
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.relativeLabel}
                      </span>
                    </div>

                    {/* Botões de Seleção de Estado */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Situação:
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => updateHistoryMonth(index, { status: 'pago' })}
                          className={`py-1 px-1 rounded text-[11px] font-bold text-center border transition ${
                            isPaid
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Quitado
                        </button>
                        <button
                          type="button"
                          onClick={() => updateHistoryMonth(index, { status: 'pendente' })}
                          className={`py-1 px-1 rounded text-[11px] font-bold text-center border transition ${
                            isPending
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Pendente
                        </button>
                        <button
                          type="button"
                          onClick={() => updateHistoryMonth(index, { status: 'isento' })}
                          className={`py-1 px-1 rounded text-[11px] font-bold text-center border transition ${
                            isExempt
                              ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Isento
                        </button>
                      </div>
                    </div>

                    {/* Formulário detalhado se Pago */}
                    {isPaid && (
                      <div className="space-y-2 text-xs pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            Valor Pago (Kz)
                          </label>
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateHistoryMonth(index, { amount: Number(e.target.value) })}
                            className="h-8 text-xs font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            Data do Pagamento
                          </label>
                          <Input
                            type="date"
                            value={item.paidAt}
                            onChange={(e) => updateHistoryMonth(index, { paidAt: e.target.value })}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            Forma de Pagamento
                          </label>
                          <Select
                            value={item.method}
                            onChange={(e) => updateHistoryMonth(index, { method: e.target.value })}
                            className="h-8 text-xs"
                          >
                            <option value="Multicaixa Express">Multicaixa Express</option>
                            <option value="Numerário / Balcão">Numerário em Mão (Balcão)</option>
                            <option value="Transferência BAI">Transferência BAI</option>
                            <option value="Transferência BFA">Transferência BFA</option>
                            <option value="TPA / Balcão">TPA (Cartão de Débito)</option>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                            Ref. / Comprovativo
                          </label>
                          <Input
                            value={item.reference || ''}
                            onChange={(e) => updateHistoryMonth(index, { reference: e.target.value })}
                            placeholder={`Ex.: EXP-${item.month.replace('-', '')}92`}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Detalhes se Pendente */}
                    {isPending && (
                      <div className="space-y-2 text-xs pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block mb-0.5">
                            Valor em Dívida (Kz)
                          </label>
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateHistoryMonth(index, { amount: Number(e.target.value) })}
                            className="h-8 text-xs font-mono font-bold text-rose-700 border-rose-300"
                          />
                        </div>
                        <div className="rounded-lg bg-rose-100/70 dark:bg-rose-950/40 p-2 text-[11px] text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 leading-tight">
                          ⚠️ Ficará registado como factura pendente no sistema para cobrança e corte.
                        </div>
                      </div>
                    )}

                    {/* Detalhes se Isento */}
                    {isExempt && (
                      <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                        Mês abonado / dispensado de pagamento.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Opção Contabilística de Tesouraria */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={impactTreasuryHistory}
                  onChange={(e) => setImpactTreasuryHistory(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-0 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                    Impactar o saldo vivo da Tesouraria de hoje com estes recebimentos
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {impactTreasuryHistory
                      ? '✅ ATIVADO: O total liquidado será creditado imediatamente nas contas da tesouraria de hoje.'
                      : 'ℹ️ DESATIVADO (Padrão para migração): Os recibos e faturas são gerados e guardados na ficha do cliente sem inflacionar o saldo de caixa físico de hoje.'}
                  </p>
                </div>
              </label>
            </div>

            {/* Resumo do Histórico */}
            <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Total de Mensalidades Liquidadas:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {kz(paymentHistory.filter((p) => p.status === 'pago').reduce((acc, p) => acc + Number(p.amount || 0), 0))}
                  {' '}({paymentHistory.filter((p) => p.status === 'pago').length} de 3 meses)
                </span>
              </div>
              {paymentHistory.some((p) => p.status === 'pendente') && (
                <div className="flex justify-between items-center text-rose-300">
                  <span>Total em Dívida / Falta:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {kz(paymentHistory.filter((p) => p.status === 'pendente').reduce((acc, p) => acc + Number(p.amount || 0), 0))}
                    {' '}({paymentHistory.filter((p) => p.status === 'pendente').length} em atraso)
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-300">Situação Cadastral Resultante:</span>
                <span className={`font-bold px-2 py-0.5 rounded ${
                  paymentHistory[0]?.status === 'pendente' || paymentHistory.every((p) => p.status === 'pendente')
                    ? 'bg-rose-900/60 text-rose-300'
                    : 'bg-emerald-900/60 text-emerald-300'
                }`}>
                  {paymentHistory[0]?.status === 'pendente' || paymentHistory.every((p) => p.status === 'pendente')
                    ? '🔴 Em Atraso (Passível de Corte)'
                    : '🟢 Ativo & Regularizado'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PAINEL FINANCEIRO DE ADESÃO & CONTRATO (CONTRATO, CONTA DE TESOURARIA & PRÓ-RATA)
            ========================================================================= */}
        {!isExistingClient && (
          <div className="rounded-2xl border-2 border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-900/60 pb-2.5">
              <div className="flex items-center gap-2">
                <ReceiptText size={17} className="text-blue-600 dark:text-blue-400" />
                <b className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {client ? 'Condições Contratuais & Conta Financeira' : 'Condições de Adesão e Liquidação Inicial'}
                </b>
              </div>
              <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                Contrato Oficial
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Field label="Valor do Contrato de Adesão (Kz) *" hint="Contabilizado à parte de mensalidades">
                  <Input
                    type="number"
                    value={form.contractAmount || defaultContractFee}
                    onChange={(e) => set('contractAmount', e.target.value)}
                    required
                    placeholder="15000"
                  />
                </Field>
              </div>

              <div>
                <Field label="Forma de Pagamento">
                  <Select
                    value={form.paymentMethod || 'Numerário / Balcão'}
                    onChange={(e) => {
                      const val = e.target.value;
                      set('paymentMethod', val);
                      if (val.includes('BAI')) set('accountId', 'acc-bai');
                      else if (val.includes('TPA') || val.includes('Express')) set('accountId', 'acc-tpa');
                      else set('accountId', 'acc-caixa');
                    }}
                  >
                    <option value="Numerário / Balcão">Numerário em Mão (Balcão)</option>
                    <option value="Multicaixa Express">Multicaixa Express</option>
                    <option value="TPA / Balcão">TPA (Cartão de Débito)</option>
                    <option value="Transferência BAI">Transferência Bancária (BAI)</option>
                    <option value="Transferência BFA">Transferência Bancária (BFA)</option>
                  </Select>
                </Field>
              </div>

              <div>
                <Field label="Conta de Tesouraria">
                  <Select
                    value={form.accountId || (form.paymentMethod?.includes('BAI') ? 'acc-bai' : form.paymentMethod?.includes('TPA') || form.paymentMethod?.includes('Express') ? 'acc-tpa' : 'acc-caixa')}
                    onChange={(e) => set('accountId', e.target.value)}
                  >
                    <option value="acc-caixa">Caixa Geral (Balcão Golf)</option>
                    <option value="acc-tpa">Terminal Multicaixa Express (TPA / EMIS)</option>
                    <option value="acc-bai">Banco BAI (Arrecadação Principal)</option>
                    <option value="acc-bfa">Banco BFA (Operações & Fornecedores)</option>
                    <option value="acc-piquete">Fundo de Maneio de Piquete Técnico</option>
                  </Select>
                </Field>
              </div>
            </div>

            {/* Regra de Dias Restantes vs Mês Completo */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 p-3.5 space-y-2">
              <b className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Período Inicial de Transmissão (Não há mês grátis):
              </b>
              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <input
                    type="radio"
                    name="remainingDaysChoice"
                    value="assistir_restantes"
                    checked={form.remainingDaysChoice === 'assistir_restantes'}
                    onChange={() => set('remainingDaysChoice', 'assistir_restantes')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Assistir apenas os {remainingDays} dias restantes do mês atual (Incluso no contrato)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      O cliente assiste do dia de hoje até ao final deste mês sem pagar taxa extra. A primeira mensalidade normal de {kz(finalMonthlyPrice)} será devida de 1 a 5 do próximo mês.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <input
                    type="radio"
                    name="remainingDaysChoice"
                    value="pagar_restantes"
                    checked={form.remainingDaysChoice === 'pagar_restantes'}
                    onChange={() => set('remainingDaysChoice', 'pagar_restantes')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Pagar os dias que faltam para o mês terminar (+{kz(remainingDaysTotal)})
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Calculado a {dailyPrice} Kz/dia ({remainingDays} dias restantes = {kz(remainingDaysTotal)}). O cliente beneficia do próximo mês completo como o mês pago!
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Opção de Instalação Urgente (+2.000 Kz pago ao técnico na hora) */}
            {!client && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => set('isUrgentInstallation', e.target.checked)}
                  className="rounded text-amber-600 focus:ring-0 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-xs text-amber-950 dark:text-amber-200">
                    Instalação Urgente (+2.000 Kz entregues ao Técnico na hora)
                  </span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Taxa paga pelo cliente no ato e repassada directamente à equipa de instalação.
                  </p>
                </div>
              </label>

              {isUrgent && (
                <div className="pt-2 border-t border-amber-200 dark:border-amber-900 grid gap-3 sm:grid-cols-2">
                  <Field label="Técnico Instalador a Receber os 2.000 Kz *" hint="Creditado imediatamente ao colaborador">
                    <Select
                      value={form.urgentTechnicianId}
                      onChange={(e) => {
                        const sel = technicians.find((t: any) => String(t.id) === e.target.value);
                        set('urgentTechnicianId', e.target.value);
                        set('urgentTechnicianName', sel?.name || '');
                      }}
                      required={isUrgent}
                    >
                      <option value="">Seleccione o técnico...</option>
                      {technicians.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.jobTitle || 'Técnico'}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div>
                    <Field label="Desconto na Taxa de Urgência (Kz)" hint="Máx 2.000 Kz (Não altera o contrato)">
                      <Input
                        type="number"
                        min="0"
                        max="2000"
                        value={form.urgentDiscount || ''}
                        onChange={(e) => set('urgentDiscount', e.target.value)}
                        placeholder="0 (Taxa integral de 2.000 Kz)"
                      />
                    </Field>
                    <div className="mt-1 text-[11px] text-amber-900 dark:text-amber-200 font-semibold">
                      Comissão urgente a liquidar: <span className="font-mono text-emerald-700 dark:text-emerald-400 font-extrabold">+{kz(urgentValue)}</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 border border-amber-300/40">
                    ℹ️ <b>Regra Financeira:</b> Qualquer desconto concedido incide <i>exclusivamente</i> sobre os 2.000 Kz da taxa de urgência. O valor base do contrato de adesão (<b>{kz(contractValue)}</b>) permanece 100% integral e inviolável.
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Resumo Discriminativo Total */}
            <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Valor Contrato de Adesão:</span>
                <span className="font-mono font-bold text-white">{kz(contractValue)} <span className="text-[10px] text-emerald-400 font-bold">(100% Integral)</span></span>
              </div>
              {isUrgent && (
                <div className="flex justify-between items-center text-amber-300">
                  <span>Taxa Urgente ({form.urgentTechnicianName || 'Técnico'}{urgentDiscount > 0 ? ` · Desc.: -${kz(urgentDiscount)}` : ''}):</span>
                  <span className="font-mono font-bold">+{kz(urgentValue)}</span>
                </div>
              )}
              {payRemainingDays && (
                <div className="flex justify-between items-center text-blue-300">
                  <span>Pró-rata ({remainingDays} dias restantes a {dailyPrice} Kz/dia):</span>
                  <span className="font-mono font-bold">+{kz(prorataValue)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-bold text-white">
                <span>Total a Cobrar na Entrada:</span>
                <span className="font-mono text-base font-extrabold text-emerald-400">{kz(totalAdesao)}</span>
              </div>
            </div>
          </div>
        )}

        <Field label="Notas internas (ex: Pedido de não corte, instruções técnicas, migração)">
          <Textarea
            rows={2}
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Informações relevantes sobre este cliente..."
          />
        </Field>

        {(duplicateStatus.isDuplicate || submitError) && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-2 font-bold">
            <AlertTriangle size={18} className="shrink-0 text-rose-600" />
            <span>{submitError || duplicateStatus.message}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={duplicateStatus.isDuplicate || create.isPending || update.isPending}
            className={duplicateStatus.isDuplicate ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {create.isPending || update.isPending
              ? 'A registar…'
              : (
                <>
                  <Check size={15} />
                  {isExistingClient ? 'Registar Cliente & Salvar Histórico de 3 Meses' : 'Guardar & Emitir Contrato'}
                </>
              )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================================
   2. PAYMENTS PAGE: Search client by name, house code, BI or phone,
      automatic 1.000 Kz penalty calculation after 5th, and invoice print.
   ========================================================================= */

export function PaymentsPage() {
  const { mode, meta } = useServiceMode();
  const clients = useListClients({ serviceMode: mode || undefined });
  const paymentsQuery = useListPayments({ serviceMode: mode || undefined });
  const settingsQuery = useGetSettings();
  const qc = useQueryClient();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const deleteInvoice = useDeleteInvoice();

  const currentUser = session();
  const isAdmin = canDeleteOrVoidInvoices(currentUser) || currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'boss';

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ payment: AnyRecord; client: AnyRecord } | null>(null);
  const [deleteConfirmPayment, setDeleteConfirmPayment] = useState<any | null>(null);

  // Search in modal
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(() => (mode === 'fibra' ? '6500' : '4000'));
  const [penaltyAmount, setPenaltyAmount] = useState('0');
  const [method, setMethod] = useState('multicaixa');
  const [selectedAccountId, setSelectedAccountId] = useState('acc-tpa');
  const [reference, setReference] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const handleMethodChange = (newMethod: string) => {
    setMethod(newMethod);
    const m = newMethod.toLowerCase();
    if (m.includes('numer') || m.includes('dinheiro')) {
      setSelectedAccountId('acc-caixa');
    } else if (m.includes('bai') || m.includes('transfer')) {
      setSelectedAccountId('acc-bai');
    } else if (m.includes('bfa')) {
      setSelectedAccountId('acc-bfa');
    } else if (m.includes('piquete')) {
      setSelectedAccountId('acc-piquete');
    } else {
      setSelectedAccountId('acc-tpa');
    }
  };

  const allClients = clients.data?.items || [];
  const settings = settingsQuery.data || {};
  const rows = (paymentsQuery.data?.items || []).filter((p: any) => {
    if (!search) return true;
    const c = allClients.find((item: any) => Number(item.id) === Number(p.clientId));
    const text = `${c?.fullName || p.clientName || ''} ${c?.houseCode || ''} ${c?.documentNumber || ''} ${c?.phone || ''} ${p.reference || p.receiptNumber || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  // Client search within modal
  const searchResults = clientSearch.trim()
    ? allClients.filter((c: any) => {
        const text = `${c.fullName} ${c.houseCode || ''} ${c.documentNumber || ''} ${c.phone || ''} ${c.code || ''}`.toLowerCase();
        return text.includes(clientSearch.toLowerCase().trim());
      })
    : [];

  const selectedClient = allClients.find((c: any) => c.id === selectedClientId);

  // Verificação em tempo real de faturas/pagamentos duplicados por referência ou mês
  const duplicateCheck = useMemo(() => {
    if (!selectedClientId) return { isDuplicate: false as const };
    return checkPaymentDuplicate({
      clientId: selectedClientId,
      paymentMonth,
      reference,
    });
  }, [selectedClientId, paymentMonth, reference]);

  const selectClient = (c: any) => {
    setSelectedClientId(c.id);
    setClientSearch('');

    // Default amount
    let base = Number(settings.tvMonthlyPrice || 4000);
    if (c.serviceType === 'internet') {
      base = 6500;
    } else if (c.serviceType === 'combo') {
      base = 10500;
    }
    setPaymentAmount(String(base));

    // Penalty check: after day 5, apply 1000 Kz
    const currentDay = new Date().getDate();
    const dueDay = Number(settings.paymentDueDay || 5);
    if (currentDay > dueDay) {
      setPenaltyAmount(String(settings.latePenalty || 1000));
    } else {
      setPenaltyAmount('0');
    }
  };

  const handleCreatePayment = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    if (duplicateCheck.isDuplicate) {
      alert(`Bloqueio Anti-Duplicado: ${duplicateCheck.reason}`);
      return;
    }

    createPayment.mutate(
      {
        data: {
          clientId: selectedClientId,
          amount: Number(paymentAmount),
          penalty: Number(penaltyAmount),
          paymentMonth,
          method,
          accountId: selectedAccountId,
          reference: reference || `REC-${Date.now().toString().slice(-5)}`,
        },
      },
      {
        onSuccess: (newPayment: any) => {
          qc.invalidateQueries({ queryKey: getListPaymentsQueryKey({ serviceMode: mode || undefined }) });
          qc.invalidateQueries({ queryKey: getListClientsQueryKey({ serviceMode: mode || undefined }) });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey(mode || '') });
          setModal(false);

          // Open invoice preview immediately
          const c = allClients.find((item: any) => item.id === selectedClientId);
          if (c) {
            setSelectedInvoice({ payment: newPayment, client: c });
          }

          // Reset
          setSelectedClientId(null);
          setClientSearch('');
          setReference('');
        },
        onError: (err: any) => {
          alert(`Não foi possível registar o pagamento:\n${err?.message || 'Erro inesperado'}`);
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        eyebrow={`Tesouraria & Caixa · Modo ${meta.shortName}`}
        title={`Pagamentos (${meta.shortName})`}
        detail={`Registo de mensalidades ${
          mode === 'fibra'
            ? 'de Internet Fibra Óptica'
            : mode === 'tv'
            ? 'de TV Comunitária (4.000 Kz)'
            : 'de TV & Internet Fibra'
        } com busca rápida por Nome, Casa, BI ou Telefone e aplicação automática de multa após dia 5.`}
        action={
          <Button
            onClick={() => {
              setSelectedClientId(null);
              setClientSearch('');
              setPaymentAmount(mode === 'fibra' ? '6500' : '4000');
              setModal(true);
            }}
          >
            <Plus size={16} /> Registar pagamento
          </Button>
        }
      />

      <div className="mb-5 relative max-w-xl">
        <Search className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={17} />
        <Input
          placeholder="Pesquisar recibo por cliente, casa, BI ou referência..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {rows.length === 0 ? (
        <div className="surface rounded-xl p-10 text-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Nenhum pagamento registado nesta pesquisa.</p>
        </div>
      ) : (
        <div className="surface overflow-hidden rounded-xl">
          <div className="mobile-scroll overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="px-5 py-4">Documento / Cliente</th>
                  <th>Casa / BI</th>
                  <th>Mês</th>
                  <th>Método</th>
                  <th>Data</th>
                  <th>Multa</th>
                  <th className="px-5 text-right">Total</th>
                  <th className="px-5 text-center">Factura</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p: any) => {
                  const c = allClients.find((item: any) => Number(item.id) === Number(p.clientId));
                  const total = Number(p.amount) + Number(p.penalty || 0);
                  const displayMonth = p.paymentMonth || p.referenceMonth || (p.paidAt ? p.paidAt.slice(0, 7) : '—');
                  return (
                    <tr key={p.id} className="border-b border-[hsl(var(--border)/.7)] last:border-0 hover:bg-[hsl(var(--secondary)/.35)]">
                      <td className="px-5 py-4">
                        <b className="text-sm">{c?.fullName || p.clientName || `Cliente #${p.clientId}`}</b>
                        <small className="block mono text-[10px] text-[hsl(var(--muted-foreground))]">
                          Ref: {p.reference || p.receiptNumber || `FT-${String(p.id).padStart(5, '0')}`}
                        </small>
                      </td>
                      <td>
                        <span className="mono text-xs font-bold">{c?.houseCode || '—'}</span>
                        <small className="block text-[10px] text-[hsl(var(--muted-foreground))]">
                          {c?.documentNumber || '—'}
                        </small>
                      </td>
                      <td className="text-xs font-mono font-semibold">{displayMonth}</td>
                      <td className="text-xs capitalize">{p.method}</td>
                      <td className="text-xs text-[hsl(var(--muted-foreground))]">{date(p.paidAt)}</td>
                      <td>
                        {p.penalty > 0 ? (
                          <span className="rounded bg-[#f7e9c9] px-2 py-0.5 text-[10px] font-bold text-[#946c22]">
                            +{kz(p.penalty)}
                          </span>
                        ) : (
                          <span className="text-xs text-[#237052]">Sem multa</span>
                        )}
                      </td>
                      <td className="px-5 text-right font-black text-[#0b4a8a]">{kz(total)}</td>
                      <td className="px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => {
                              if (c) setSelectedInvoice({ payment: p, client: c });
                            }}
                          >
                            <Printer size={13} /> Ver / Imprimir
                          </Button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmPayment(p)}
                              className="cursor-pointer h-8 w-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition"
                              title="Eliminar este pagamento / fatura"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Confirmação de Eliminação de Pagamento */}
      {deleteConfirmPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full rounded-2xl p-6 shadow-2xl border border-[hsl(var(--border))]">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-[hsl(var(--foreground))]">
                  Eliminar Pagamento / Factura
                </h3>
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                  {deleteConfirmPayment.reference || `ID: ${deleteConfirmPayment.id}`}
                </span>
              </div>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed mb-5">
              Tem a certeza de que deseja eliminar este pagamento no valor de{' '}
              <b className="text-[hsl(var(--foreground))]">
                {kz(Number(deleteConfirmPayment.amount) + Number(deleteConfirmPayment.penalty || 0))}
              </b>{' '}
              referente ao mês <b className="text-[hsl(var(--foreground))]">{deleteConfirmPayment.paymentMonth}</b>?
              Esta acção reverterá o estado financeiro e removerá o recibo da base de dados.
            </p>

            <div className="flex justify-end gap-2.5">
              <Button variant="outline" onClick={() => setDeleteConfirmPayment(null)}>
                Cancelar
              </Button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deletePayment.mutateAsync({ paymentId: deleteConfirmPayment.id });
                    await deleteInvoice.mutateAsync({
                      invoiceId: deleteConfirmPayment.id,
                      invoiceNumber: deleteConfirmPayment.reference,
                      hardDelete: true,
                    }).catch(() => {});
                    qc.invalidateQueries({ queryKey: getListPaymentsQueryKey({ serviceMode: mode || undefined }) });
                    qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
                    qc.invalidateQueries({ queryKey: getGetDashboardQueryKey(mode || '') });
                    qc.invalidateQueries({ queryKey: getListClientsQueryKey({ serviceMode: mode || undefined }) });
                    setDeleteConfirmPayment(null);
                  } catch (err: any) {
                    alert(`Erro ao eliminar: ${err?.message || 'Falha ao processar'}`);
                  }
                }}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition"
              >
                <Trash2 size={14} /> Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registar Pagamento */}
      {modal && (
        <Modal
          title="Registar pagamento de cliente"
          eyebrow="Tesouraria OSDEL"
          onClose={() => setModal(false)}
        >
          <form onSubmit={handleCreatePayment} className="space-y-5">
            {/* Campo de pesquisa de cliente */}
            <div>
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">
                Pesquisar cliente (Nome, Código da Casa, BI ou Telefone) *
              </span>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={16} />
                <Input
                  autoFocus
                  placeholder="Escreva o nome, casa (ex: Casa 45B), BI ou telefone..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Lista de resultados em tempo real */}
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-lg">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectClient(c)}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-[hsl(var(--secondary))]"
                    >
                      <div>
                        <b className="text-xs">{c.fullName}</b>
                        <span className="ml-2 rounded bg-[hsl(var(--secondary))] px-1.5 py-0.5 text-[10px] font-mono">
                          Casa: {c.houseCode || '—'}
                        </span>
                        <div className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                          BI: {c.documentNumber || '—'} · Tel: {c.phone}
                        </div>
                      </div>
                      <StatusBadge value={c.status} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cartão do cliente seleccionado */}
            {selectedClient ? (
              <div className="rounded-xl border-2 border-[hsl(var(--primary))] bg-[hsl(var(--secondary)/.4)] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
                      Cliente Seleccionado
                    </span>
                    <h3 className="text-base font-black">{selectedClient.fullName}</h3>
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                      Código: {selectedClient.code} · Casa: <b>{selectedClient.houseCode || '—'}</b> · BI: {selectedClient.documentNumber || '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                      Serviço: <b>{serviceLabel(selectedClient.serviceType)}</b> · Telefone: {selectedClient.phone}
                    </p>
                  </div>
                  <StatusBadge value={selectedClient.status} />
                </div>

                {/* Avisos de política de cobrança */}
                {selectedClient.status === 'suspended' && (
                  <div className="mt-3 rounded-lg bg-[#f8e1da] p-3 text-xs text-[#a24e3a]">
                    <b>Atenção:</b> Este cliente está suspenso (&gt;3 meses sem pagar).
                    A taxa de renovação contratual segundo o regulamento é de 10.000 Kz.
                  </div>
                )}
                {new Date().getDate() > Number(settings.paymentDueDay || 5) && (
                  <div className="mt-3 rounded-lg bg-[#f7e9c9] p-3 text-xs text-[#946c22]">
                    <b>Multa automática:</b> Hoje é dia {new Date().getDate()}. Como passou do dia 5,
                    foi aplicada a multa de 1.000 Kz por atraso.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[hsl(var(--border))] p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                Pesquise e clique no cliente na lista acima para preencher os dados de cobrança.
              </div>
            )}

            {/* Valores e método */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor da mensalidade (Kz) *">
                <Input
                  type="number"
                  min="0"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </Field>
              <Field label="Multa por atraso (Kz)">
                <Input
                  type="number"
                  min="0"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                />
              </Field>
              <Field label="Mês de referência">
                <Input
                  type="month"
                  value={paymentMonth}
                  onChange={(e) => setPaymentMonth(e.target.value)}
                />
              </Field>
              <Field label="Forma de pagamento">
                <Select value={method} onChange={(e) => handleMethodChange(e.target.value)}>
                  <option value="multicaixa">Multicaixa</option>
                  <option value="transferência">Transferência Bancária</option>
                  <option value="numerário">Numerário / Dinheiro</option>
                  <option value="express">Multicaixa Express</option>
                </Select>
              </Field>
              <Field label="Conta de Tesouraria de Destino *">
                <Select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                  <option value="acc-caixa">Caixa Geral (Balcão Golf)</option>
                  <option value="acc-tpa">Terminal Multicaixa Express (TPA / EMIS)</option>
                  <option value="acc-bai">Banco BAI (Arrecadação Principal)</option>
                  <option value="acc-bfa">Banco BFA (Operações & Fornecedores)</option>
                  <option value="acc-piquete">Fundo de Maneio de Piquete Técnico</option>
                </Select>
              </Field>
            </div>

            <Field label="N.º de comprovativo / Referência">
              <Input
                placeholder="Ex.: MCX-84920 ou Ref. BFA"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>

            {/* Aviso de Prevenção de Duplicados em Tempo Real */}
            {duplicateCheck.isDuplicate && (
              <div className="rounded-xl border-2 border-rose-500 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in-0 duration-200">
                <div className="flex items-start gap-2.5">
                  <div className="rounded-lg bg-rose-600 p-1 text-white shrink-0 mt-0.5">
                    <AlertTriangle size={15} />
                  </div>
                  <div className="flex-1">
                    <b className="block text-sm font-black text-rose-800 dark:text-rose-200">
                      Bloqueio Anti-Duplicado Ativado!
                    </b>
                    <p className="mt-1 leading-relaxed">{duplicateCheck.reason}</p>
                    {duplicateCheck.existingPayment && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const c = allClients.find((item: any) => item.id === selectedClientId);
                            if (c) {
                              setModal(false);
                              setSelectedInvoice({ payment: duplicateCheck.existingPayment, client: c });
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 font-bold text-xs transition cursor-pointer"
                        >
                          <Eye size={13} /> Ver Recibo Já Registado
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Totalizador */}
            <div className="flex items-center justify-between rounded-xl bg-[#f0f5fa] p-4 text-[#0b4a8a]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Total a Cobrar</span>
                <p className="text-xs opacity-75">Mensalidade + Multa aplicável</p>
              </div>
              <div className="text-2xl font-black">
                {kz(Number(paymentAmount || 0) + Number(penaltyAmount || 0))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
              <Button variant="outline" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!selectedClientId || createPayment.isPending || duplicateCheck.isDuplicate}
                className={duplicateCheck.isDuplicate ? 'opacity-40 cursor-not-allowed bg-rose-600' : ''}
              >
                {createPayment.isPending ? 'A confirmar…' : duplicateCheck.isDuplicate ? 'Duplicado Bloqueado' : <><Check size={15} /> Confirmar & Imprimir Recibo</>}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Visualizador / Impressor de Factura */}
      {selectedInvoice && (
        <InvoicePreview
          payment={selectedInvoice.payment}
          client={selectedInvoice.client}
          settings={settings}
          close={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}

/* =========================================================================
   3. REPORTS PAGE: Filter by Daily, Weekly, Monthly, Annual, or Custom;
      columns: data, pagamentos, valor, saidas com o motivo, resto, total, operador;
      printable PDF official report.
   ========================================================================= */

export function ReportsPage() {
  const { mode, meta } = useServiceMode();
  const now = new Date();
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [customEnd, setCustomEnd] = useState(() => now.toISOString().slice(0, 10));
  const [printModal, setPrintModal] = useState(false);

  const settingsQuery = useGetSettings();
  const settings = settingsQuery.data || {};

  // Compute dates based on period
  let startDate = '';
  let endDate = now.toISOString().slice(0, 10);
  let periodTitle = '';

  if (period === 'day') {
    startDate = now.toISOString().slice(0, 10);
    periodTitle = `Diário — ${new Intl.DateTimeFormat('pt-AO', { dateStyle: 'full' }).format(now)}`;
  } else if (period === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    startDate = d.toISOString().slice(0, 10);
    periodTitle = 'Semanal — Últimos 7 dias';
  } else if (period === 'month') {
    startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    periodTitle = `Mensal — ${new Intl.DateTimeFormat('pt-AO', { month: 'long', year: 'numeric' }).format(now)}`;
  } else if (period === 'year') {
    startDate = `${now.getFullYear()}-01-01`;
    periodTitle = `Anual — Ano lectivo ${now.getFullYear()}`;
  } else {
    startDate = customStart;
    endDate = customEnd;
    periodTitle = `Personalizado — De ${date(customStart)} até ${date(customEnd)}`;
  }

  const reportsQuery = useGetReports({
    reportType: period,
    startDate,
    endDate,
    serviceMode: mode || undefined,
  });

  const reportData = reportsQuery.data || { summary: {}, rows: [] };
  const s = reportData.summary || {};
  const rows: AnyRecord[] = reportData.rows || [];

  return (
    <div>
      <PageHeader
        eyebrow={`Controlo financeiro · Modo ${meta.shortName}`}
        title={`Relatórios (${meta.shortName})`}
        detail={`Emissão de relatórios financeiros de ${meta.name} com entradas, saídas justificadas, resto, total acumulado e operador.`}
        action={
          <Button variant="outline" onClick={() => setPrintModal(true)}>
            <Printer size={15} /> Imprimir Relatório Oficial (PDF)
          </Button>
        }
      />

      {/* Selectores de período */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[hsl(var(--border))] pb-4">
        {[
          { id: 'day', label: 'Diário (Hoje)' },
          { id: 'week', label: 'Semanal (7 dias)' },
          { id: 'month', label: 'Mensal (Este Mês)' },
          { id: 'year', label: 'Anual (Este Ano)' },
          { id: 'custom', label: 'Personalizado' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id as any)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              period === p.id
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/.8)]'
            }`}
          >
            {p.label}
          </button>
        ))}

        {period === 'custom' && (
          <div className="flex items-center gap-2 pl-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9 w-36 text-xs"
            />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">até</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 w-36 text-xs"
            />
          </div>
        )}
      </div>

      {/* Resumo financeiro */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="surface rounded-xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Entradas (Valor)
          </span>
          <b className="mt-2 block text-2xl text-[#0b4a8a]">{kz(s.receita_total)}</b>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Total arrecadado</span>
        </div>
        <div className="surface rounded-xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#a24e3a]">
            Saídas com o motivo
          </span>
          <b className="mt-2 block text-2xl text-[#a24e3a]">{kz(s.saidas)}</b>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Despesas operacionais</span>
        </div>
        <div className="surface rounded-xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#237052]">
            Resto (Saldo Líquido)
          </span>
          <b className="mt-2 block text-2xl text-[#237052]">{kz(s.resto)}</b>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Entradas menos saídas</span>
        </div>
        <div className="surface rounded-xl p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            N.º de Pagamentos
          </span>
          <b className="mt-2 block text-2xl">{s.pagamentos || 0}</b>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Recibos emitidos no período</span>
        </div>
      </div>

      {/* Tabela do relatório */}
      <section className="surface mt-6 overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5">
          <div>
            <p className="eyebrow">Movimentos detalhados</p>
            <h2 className="mt-1 text-lg font-extrabold">{periodTitle}</h2>
          </div>
          <Button variant="outline" onClick={() => setPrintModal(true)}>
            <Printer size={15} /> Imprimir / PDF
          </Button>
        </div>

        {rows.length ? (
          <div className="mobile-scroll overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="px-5 py-4">Data</th>
                  <th className="text-center">Pagamentos</th>
                  <th className="text-right">Valor</th>
                  <th className="px-5">Saídas com o motivo</th>
                  <th className="text-right">Resto</th>
                  <th className="px-5 text-right">Total</th>
                  <th className="text-center">Operador</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={i}
                    className="border-b border-[hsl(var(--border)/.7)] last:border-0 hover:bg-[hsl(var(--secondary)/.35)]"
                  >
                    <td className="px-5 py-4 font-mono text-xs font-bold text-[#0b4a8a]">
                      {date(r.data)}
                    </td>
                    <td className="text-center text-sm font-semibold">{r.pagamentos}</td>
                    <td className="text-right font-bold text-[#237052]">{kz(r.valor)}</td>
                    <td className="px-5 text-xs text-[hsl(var(--foreground))]">
                      {r.motivo || '—'}
                    </td>
                    <td className="text-right font-bold text-sm">{kz(r.resto)}</td>
                    <td className="px-5 text-right font-black text-[#0b4a8a] text-sm">
                      {kz(r.total)}
                    </td>
                    <td className="text-center font-mono text-xs text-[hsl(var(--muted-foreground))]">
                      {r.operador || 'deezy'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Sem movimentos registados para o intervalo seleccionado.
          </p>
        )}
      </section>

      {/* Modal Impressão Oficial */}
      {printModal && (
        <ReportPreview
          report={reportData}
          periodTitle={periodTitle}
          settings={settings}
          close={() => setPrintModal(false)}
        />
      )}
    </div>
  );
}

/* =========================================================================
   4. MESSAGES & ALERTS PAGE:
      - Send manual message for all client categories (Activos, Em atraso,
        Suspensos, TV, Fibra, Todos).
      - Automated reminder for 1st-5th day of month.
      - WhatsApp direct link integration.
   ========================================================================= */

export function MessagesPage() {
  const { mode, meta } = useServiceMode();
  const clientsQuery = useListClients({ serviceMode: mode || undefined });
  const messagesQuery = useListMessages({ serviceMode: mode || undefined });
  const settingsQuery = useGetSettings();
  const create = useCreateMessage();
  const qc = useQueryClient();
  const sessionUser = session();

  // Active top tab
  const [activeTab, setActiveTab] = useState<'chat_atendimento' | 'chat_equipa' | 'notificacoes' | 'publicar_apk' | 'sms_whatsapp'>('chat_atendimento');

  // Intervenções Humanas Pendentes (do Chatbot)
  const [pendingInterventions, setPendingInterventions] = useState(() => getHumanInterventionTickets().filter(t => t.status === 'aguardando_atendente').length);

  // Notifications State
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => getStoredNotifications());
  const [notifFilter, setNotifFilter] = useState<'todas' | 'trabalho' | 'pagamento' | 'corte' | 'avaria' | 'acordo'>('todas');

  // APK Announcements State
  const [apkAnnouncements, setApkAnnouncements] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('osdel_client_announcements');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'ann-1',
        title: 'Manutenção Preventiva no Anel Central de Fibra Óptica',
        category: 'manutencao',
        date: 'Hoje, 02h00',
        content: 'Informamos aos estimados clientes que realizaremos manutenção preventiva no armário de distribuição primário para elevar a estabilidade da rede. Agradecemos a compreensão.',
        targetService: 'todos',
        targetStatus: 'todos',
        targetZone: 'todos',
      },
      {
        id: 'ann-2',
        title: 'Novos Canais HD e Desportivos Adicionados à Grelha de TV',
        category: 'novidade',
        date: 'Ontem',
        content: 'A OSDEL adicionou novos canais infantis e desportivos de alta definição à grelha de TV. Faça uma sintonização automática na sua televisão para atualizar a listagem.',
        targetService: 'tv',
        targetStatus: 'todos',
        targetZone: 'todos',
      },
      {
        id: 'ann-3',
        title: 'Lembrete: Pagamento Regular até dia 5 via Multicaixa Express',
        category: 'comunicado',
        date: '01 de Outubro',
        content: 'Evite deslocações e suspensões temporárias do sinal efetuando o pagamento da sua mensalidade através do Multicaixa Express com a Entidade e Referência da sua fatura.',
        targetService: 'todos',
        targetStatus: 'todos',
        targetZone: 'todos',
      },
    ];
  });

  // Modal publish to APK
  const [modalPublishApk, setModalPublishApk] = useState(false);
  const [apkForm, setApkForm] = useState({
    title: '',
    category: 'comunicado',
    targetService: 'todos',
    targetStatus: 'todos',
    targetZone: 'todos',
    content: '',
  });

  // SMS / WhatsApp state
  const [modal, setModal] = useState(false);
  const [category, setCategory] = useState('clientes em atraso');
  const [channel, setChannel] = useState('SMS');
  const [messageText, setMessageText] = useState('');
  const [autoReminderSuccess, setAutoReminderSuccess] = useState(false);

  const allClients = clientsQuery.data?.items || [];
  const settings = settingsQuery.data || {};
  const messagesList = messagesQuery.data || [];

  // Listen to live notification and intervention updates
  useEffect(() => {
    const handleNotifUpdate = () => {
      setNotifications(getStoredNotifications());
    };
    const handleInterventionsUpdate = () => {
      setPendingInterventions(getHumanInterventionTickets().filter(t => t.status === 'aguardando_atendente').length);
    };
    window.addEventListener('osdel-notifications-updated', handleNotifUpdate);
    window.addEventListener('osdel-interventions-updated', handleInterventionsUpdate);
    return () => {
      window.removeEventListener('osdel-notifications-updated', handleNotifUpdate);
      window.removeEventListener('osdel-interventions-updated', handleInterventionsUpdate);
    };
  }, []);

  // Filter recipients based on chosen category
  const targetRecipients = allClients.filter((c: any) => {
    if (category === 'clientes em atraso') return c.status === 'late';
    if (category === 'clientes activos') return c.status === 'active';
    if (category === 'clientes suspensos') return c.status === 'suspended';
    if (category === 'clientes tv') return c.serviceType === 'tv';
    if (category === 'clientes fibra') return c.serviceType === 'internet' || c.serviceType === 'combo';
    return true; // todos os clientes
  });

  // Filter clients for APK publish target count
  const apkTargetCount = allClients.filter((c: any) => {
    const matchService =
      apkForm.targetService === 'todos' ||
      (apkForm.targetService === 'tv' && c.serviceType === 'tv') ||
      (apkForm.targetService === 'internet' && c.serviceType === 'internet') ||
      (apkForm.targetService === 'combo' && c.serviceType === 'combo');

    const matchStatus =
      apkForm.targetStatus === 'todos' ||
      (apkForm.targetStatus === 'active' && c.status === 'active') ||
      (apkForm.targetStatus === 'late' && c.status === 'late') ||
      (apkForm.targetStatus === 'suspended' && c.status === 'suspended');

    const matchZone =
      apkForm.targetZone === 'todos' ||
      (c.address || '').toLowerCase().includes(apkForm.targetZone.toLowerCase()) ||
      (c.neighborhood || '').toLowerCase().includes(apkForm.targetZone.toLowerCase());

    return matchService && matchStatus && matchZone;
  }).length;

  const templates = [
    {
      title: 'Alerta Dias 1 a 5 (Vencimento)',
      text: 'OSDEL TECNOLOGIA: Estimado cliente, lembramos que a sua mensalidade vence no dia 5 deste mês. Efectue o pagamento atempadamente para garantir o seu sinal de TV/Fibra e evitar multa de 1.000 Kz.',
    },
    {
      title: 'Aviso de Corte de Sinal (Em atraso)',
      text: 'OSDEL TECNOLOGIA: Estimado cliente, o seu sinal de TV/Internet encontra-se em atraso. Efectue a liquidação com taxa de 1.000 Kz para evitar a interrupção do serviço pelo piquete.',
    },
    {
      title: 'Aviso de Suspensão (3 Meses)',
      text: 'OSDEL TECNOLOGIA: Informamos que o seu contrato atingiu 3 meses sem liquidação e foi suspenso. Para religação, dirija-se ao nosso posto para renovação contratual (taxa: 10.000 Kz).',
    },
    {
      title: 'Confirmação de Pagamento',
      text: 'OSDEL TECNOLOGIA: O seu pagamento foi confirmado com sucesso. Obrigado por confiar nos nossos serviços!',
    },
  ];

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    create.mutate(
      {
        data: {
          audience: category,
          channel,
          message: messageText,
          recipientCount: targetRecipients.length,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMessagesQueryKey() });
          setModal(false);
          setMessageText('');
          addSystemNotification({
            title: `Mensagem Disparada (${channel})`,
            message: `Disparo realizado para ${targetRecipients.length} clientes na categoria "${category}".`,
            type: 'sistema',
            priority: 'normal',
          });
        },
      },
    );
  };

  const triggerAutoReminder = () => {
    const unpaidClients = allClients.filter((c: any) => c.status !== 'active');
    create.mutate(
      {
        data: {
          audience: 'todos os clientes com pagamento pendente',
          channel: 'SMS Automático (Dias 1 a 5)',
          message:
            'OSDEL TECNOLOGIA: Alerta automático de cobrança mensal. Mensalidade de TV/Fibra com vencimento dia 5. Regularize o seu sinal para evitar multas.',
          recipientCount: unpaidClients.length,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMessagesQueryKey() });
          setAutoReminderSuccess(true);
          setTimeout(() => setAutoReminderSuccess(false), 5000);
          addSystemNotification({
            title: 'Lembrete Automático Disparado',
            message: `Lembrete de pagamento dias 1 a 5 enviado para ${unpaidClients.length} assinantes com pendência.`,
            type: 'financeiro',
            priority: 'normal',
          });
        },
      },
    );
  };

  const handlePublishToApk = (e: FormEvent) => {
    e.preventDefault();
    if (!apkForm.title.trim() || !apkForm.content.trim()) return;

    const newAnnouncement = {
      id: `ann-${Date.now()}`,
      title: apkForm.title.trim(),
      category: apkForm.category,
      date: new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' }),
      content: apkForm.content.trim(),
      targetService: apkForm.targetService,
      targetStatus: apkForm.targetStatus,
      targetZone: apkForm.targetZone,
      publishedBy: sessionUser?.name || 'Super Admin (deezy)',
      createdAt: new Date().toISOString(),
    };

    const updated = [newAnnouncement, ...apkAnnouncements];
    setApkAnnouncements(updated);
    try {
      localStorage.setItem('osdel_client_announcements', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('osdel-client-announcements-updated', { detail: updated }));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({ type: 'ANNOUNCEMENT_PUBLISHED', announcement: newAnnouncement });
        bc.close();
      }
    } catch {}

    addSystemNotification({
      title: `Aviso Publicado no App do Cliente (APK)`,
      message: `"${newAnnouncement.title}" direcionado para clientes ${apkForm.targetService.toUpperCase()} (${apkTargetCount} alcançados).`,
      type: 'sistema',
      priority: 'alta',
    });

    setModalPublishApk(false);
    setApkForm({
      title: '',
      category: 'comunicado',
      targetService: 'todos',
      targetStatus: 'todos',
      targetZone: 'todos',
      content: '',
    });
  };

  const handleDeleteApkAnnouncement = (id: string) => {
    if (confirm('Deseja remover este aviso do aplicativo dos clientes?')) {
      const updated = apkAnnouncements.filter((a) => a.id !== id);
      setApkAnnouncements(updated);
      try {
        localStorage.setItem('osdel_client_announcements', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('osdel-client-announcements-updated', { detail: updated }));
      } catch {}
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'todas') return true;
    if (notifFilter === 'trabalho') return n.title.toLowerCase().includes('trabalho') || n.title.toLowerCase().includes('concluída') || n.title.toLowerCase().includes('feita') || n.type === 'missao';
    if (notifFilter === 'pagamento') return n.type === 'financeiro' || n.title.toLowerCase().includes('pagamento');
    if (notifFilter === 'corte') return n.type === 'corte' || n.title.toLowerCase().includes('corte');
    if (notifFilter === 'avaria') return n.type === 'avaria' || n.title.toLowerCase().includes('avaria');
    if (notifFilter === 'acordo') return n.type === 'acordo' || n.title.toLowerCase().includes('acordo');
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header com indicador do Super Admin */}
      <PageHeader
        eyebrow="Comunicação, Alertas & Publicações"
        title="Central de Mensagens & Notificações"
        detail="Monitorização em tempo real de trabalhos feitos, cortes, ordens de serviço concluídas, pagamentos e publicação de avisos diretos no App Móvel dos Clientes (APK)."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                markAllAsRead();
                setNotifications(getStoredNotifications());
              }}
              disabled={unreadCount === 0}
            >
              <Check size={15} /> Marcar Todas Lidas ({unreadCount})
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalPublishApk(true)}
              className="bg-blue-600/10 text-blue-600 border-blue-500/30 hover:bg-blue-600 hover:text-white"
            >
              <Smartphone size={15} /> Publicar no APK Clientes
            </Button>
            <Button
              onClick={() => {
                setMessageText(templates[0].text);
                setModal(true);
              }}
            >
              <Send size={15} /> Nova Mensagem SMS
            </Button>
          </div>
        }
      />

      {/* Tabs Principais */}
      <div className="flex border-b border-[hsl(var(--border))] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('chat_atendimento')}
          className={`relative pb-3 px-4 text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'chat_atendimento'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <MessageSquare size={15} />
          <span>Atendimento & Chatbot Clientes</span>
          {pendingInterventions > 0 ? (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white animate-pulse">
              {pendingInterventions} Alerta{pendingInterventions > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600">
              Bot Activo
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('chat_equipa')}
          className={`relative pb-3 px-4 text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'chat_equipa'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Users size={15} />
          <span>Chat da Equipa & Piquete</span>
          <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
            4 Canais
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notificacoes')}
          className={`relative pb-3 px-4 text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'notificacoes'
              ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Bell size={15} />
          <span>Alertas & Trabalhos</span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-black text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('publicar_apk')}
          className={`relative pb-3 px-4 text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'publicar_apk'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Megaphone size={15} />
          <span>Avisos no APK Clientes</span>
          <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-black text-blue-600">
            {apkAnnouncements.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sms_whatsapp')}
          className={`relative pb-3 px-4 text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'sms_whatsapp'
              ? 'border-b-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          <Send size={15} />
          <span>Disparos SMS & WhatsApp</span>
        </button>
      </div>

      {/* ABA: ATENDIMENTO AO CLIENTE COM CHATBOT E INTERVENÇÃO HUMANA */}
      {activeTab === 'chat_atendimento' && (
        <div className="space-y-4">
          <ClientSupportChatView />
        </div>
      )}

      {/* ABA: CHAT DA EQUIPA & CANAIS DE PIQUETE */}
      {activeTab === 'chat_equipa' && (
        <div className="space-y-4">
          <TeamChatView />
        </div>
      )}

      {/* ABA 1: NOTIFICAÇÕES & TRABALHOS FEITOS */}
      {activeTab === 'notificacoes' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Notificação */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3 rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <span className="text-[hsl(var(--muted-foreground))] mr-1">Filtrar Alertas:</span>
              {[
                { id: 'todas', label: 'Todas' },
                { id: 'trabalho', label: '✓ Trabalhos Feitos' },
                { id: 'pagamento', label: 'Kz Pagamentos' },
                { id: 'corte', label: '✂ Cortes & Cobrança' },
                { id: 'avaria', label: '⚠ Avarias' },
                { id: 'acordo', label: '🤝 Acordos' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setNotifFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition text-xs font-bold ${
                    notifFilter === f.id
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs'
                      : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
              Total: <b>{filteredNotifications.length}</b> registos
            </div>
          </div>

          {/* Lista de Notificações */}
          {filteredNotifications.length > 0 ? (
            <div className="space-y-2.5">
              {filteredNotifications.map((notif) => {
                const isWork = notif.title.toLowerCase().includes('trabalho') || notif.title.toLowerCase().includes('concluída');
                const isPayment = notif.type === 'financeiro' || notif.title.toLowerCase().includes('pagamento');
                const isCut = notif.type === 'corte' || notif.title.toLowerCase().includes('corte');

                return (
                  <div
                    key={notif.id}
                    className={`rounded-2xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                      !notif.read
                        ? 'border-blue-400/50 bg-blue-500/5 dark:bg-blue-950/20'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-bold ${
                          isWork
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : isPayment
                            ? 'bg-blue-500/15 text-blue-600'
                            : isCut
                            ? 'bg-rose-500/15 text-rose-600'
                            : 'bg-amber-500/15 text-amber-600'
                        }`}
                      >
                        {isWork ? <CheckCircle2 size={20} /> : isPayment ? <Banknote size={20} /> : isCut ? <Bell size={20} /> : <AlertCircle size={20} />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="text-sm font-bold text-[hsl(var(--foreground))]">{notif.title}</b>
                          {!notif.read && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                              Nova
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">
                            {notif.type}
                          </span>
                        </div>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed max-w-2xl">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-[hsl(var(--muted-foreground))] pt-0.5">
                          <span>{new Date(notif.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          {notif.priority === 'urgente' && (
                            <span className="text-rose-600 font-bold uppercase text-[10px]">Urgente</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {notif.link && (
                        <Link
                          href={notif.link}
                          className="px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition flex items-center gap-1"
                        >
                          Ver Detalhes <ChevronRight size={13} />
                        </Link>
                      )}
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => {
                            markAsRead(notif.id);
                            setNotifications(getStoredNotifications());
                          }}
                          className="p-1.5 text-xs text-blue-600 hover:bg-blue-500/10 rounded-lg font-bold"
                          title="Marcar como lida"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          deleteNotification(notif.id);
                          setNotifications(getStoredNotifications());
                        }}
                        className="p-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                        title="Eliminar alerta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="surface rounded-2xl p-12 text-center border border-[hsl(var(--border))] space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
              <b className="text-sm font-bold text-[hsl(var(--foreground))]">Nenhuma notificação nesta categoria</b>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Todas as operações técnicas, pagamentos e trabalhos feitos estão regularizados.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: PUBLICAR NO APP DOS CLIENTES (APK) */}
      {activeTab === 'publicar_apk' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-400/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-bold text-blue-300">
                <Smartphone size={14} /> Canal de Transmissão Direta para o App do Cliente
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white">
                Comunique diretamente nos telemóveis dos seus assinantes
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Publique comunicados oficiais, avisos de corte de emergência, manutenções técnicas de anel de fibra ou novidades da grelha de TV. Filtre por tipo de cliente para atingir exatamente quem necessita do aviso.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalPublishApk(true)}
              className="shrink-0 px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
            >
              <Megaphone size={16} /> Novo Aviso no APK
            </button>
          </div>

          {/* Lista de Avisos Publicados no APK */}
          <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
              <div>
                <b className="text-sm font-bold text-[hsl(var(--foreground))]">Avisos Activos no App dos Clientes</b>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Estes comunicados são exibidos aos clientes ao abrirem o aplicativo móvel oficial.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-lg">
                Sincronização em Tempo Real
              </span>
            </div>

            {apkAnnouncements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apkAnnouncements.map((a) => {
                  const catBadge =
                    a.category === 'manutencao'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      : a.category === 'urgente'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                      : a.category === 'novidade'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30'
                      : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';

                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400/50 transition"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${catBadge}`}>
                            {a.category}
                          </span>
                          <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
                            {a.date}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-[hsl(var(--foreground))] leading-snug">
                          {a.title}
                        </h3>

                        <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-4">
                          {a.content}
                        </p>
                      </div>

                      <div className="border-t border-[hsl(var(--border))] pt-3 flex items-center justify-between text-[11px]">
                        <span className="text-[hsl(var(--muted-foreground))] font-semibold">
                          Filtro: <b className="text-[hsl(var(--foreground))] uppercase">{a.targetService || 'Todos'}</b>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteApkAnnouncement(a.id)}
                          className="text-rose-600 hover:text-rose-700 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Despublicar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-xs text-[hsl(var(--muted-foreground))]">
                Nenhum comunicado publicado no momento. Clique no botão acima para adicionar.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: DISPAROS SMS & WHATSAPP */}
      {activeTab === 'sms_whatsapp' && (
        <div className="space-y-6">
          {autoReminderSuccess && (
            <div className="flex items-center gap-3 rounded-xl bg-[#dceee5] p-4 text-sm font-bold text-[#237052]">
              <Check size={18} />
              Alerta automático de pagamento (Dias 1 a 5) disparado com sucesso para todos os clientes da carteira!
            </div>
          )}

          {/* Disparo rápido por categoria */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: 'clientes em atraso',
                label: 'Clientes em Atraso (Corte)',
                count: allClients.filter((c) => c.status === 'late').length,
                tone: 'border-[#f7e9c9] bg-[#fffdfa] dark:bg-amber-950/20 dark:border-amber-900',
                textTone: 'text-[#946c22] dark:text-amber-400',
              },
              {
                id: 'clientes activos',
                label: 'Clientes Activos',
                count: allClients.filter((c) => c.status === 'active').length,
                tone: 'border-[#dceee5] bg-[#fafdfb] dark:bg-emerald-950/20 dark:border-emerald-900',
                textTone: 'text-[#237052] dark:text-emerald-400',
              },
              {
                id: 'clientes suspensos',
                label: 'Clientes Suspensos (>3 Meses)',
                count: allClients.filter((c) => c.status === 'suspended').length,
                tone: 'border-[#f8e1da] bg-[#fdfaf9] dark:bg-rose-950/20 dark:border-rose-900',
                textTone: 'text-[#a24e3a] dark:text-rose-400',
              },
              {
                id: 'clientes tv',
                label: 'Clientes TV',
                count: allClients.filter((c) => c.serviceType === 'tv').length,
                tone: 'border-[hsl(var(--border))] bg-[hsl(var(--card))]',
                textTone: 'text-[hsl(var(--foreground))]',
              },
              {
                id: 'clientes fibra',
                label: 'Clientes Internet Fibra',
                count: allClients.filter((c) => c.serviceType === 'internet' || c.serviceType === 'combo').length,
                tone: 'border-[hsl(var(--border))] bg-[hsl(var(--card))]',
                textTone: 'text-[hsl(var(--foreground))]',
              },
              {
                id: 'todos os clientes',
                label: 'Todos os Clientes',
                count: allClients.length,
                tone: 'border-[hsl(var(--border))] bg-[hsl(var(--card))]',
                textTone: 'text-[hsl(var(--foreground))]',
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCategory(item.id);
                  if (item.id === 'clientes em atraso') setMessageText(templates[1].text);
                  else if (item.id === 'clientes suspensos') setMessageText(templates[2].text);
                  else setMessageText(templates[0].text);
                  setModal(true);
                }}
                className={`flex items-center justify-between rounded-xl border p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}
              >
                <div>
                  <span className={`text-xs font-black ${item.textTone}`}>{item.label}</span>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {item.count} cliente(s) elegível(is)
                  </p>
                </div>
                <Send size={16} className={item.textTone} />
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            {/* Histórico de comunicações */}
            <section className="surface rounded-xl p-6 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">Registo de envios</p>
                  <h2 className="mt-1 text-lg font-extrabold">Mensagens preparadas e enviadas</h2>
                </div>
                <MessageSquare size={19} className="text-[hsl(var(--primary))]" />
              </div>

              {messagesList.length ? (
                <div className="mt-5 space-y-3">
                  {messagesList.map((m: any) => (
                    <div key={m.id} className="rounded-xl border border-[hsl(var(--border))] p-4 bg-[hsl(var(--card))]">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-0.5 text-[11px] font-bold uppercase">
                          {m.audience}
                        </span>
                        <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                          {m.channel} · {date(m.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--foreground))]">
                        {m.message}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                        <span>Estado: <b>Enviada</b></span>
                        <span>Operador: <b>{m.operator || 'deezy'}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  Ainda não foram enviadas mensagens através do sistema.
                </p>
              )}
            </section>

            {/* Contacto Directo WhatsApp por cliente */}
            <section className="surface rounded-xl p-6 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">Contacto directo</p>
                  <h2 className="mt-1 text-lg font-extrabold">Clientes a avisar via WhatsApp</h2>
                </div>
              </div>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                Clique no botão WhatsApp para abrir conversa directa com mensagem de cobrança personalizada:
              </p>

              <div className="mt-4 max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {allClients.slice(0, 15).map((c: any) => {
                  const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
                  const waText = encodeURIComponent(
                    `Olá estimado(a) ${c.fullName}, saudações da OSDEL TECNOLOGIA. Informamos que a sua mensalidade de ${serviceLabel(
                      c.serviceType,
                    )} relativa à sua residência (${c.houseCode || c.address}) aguarda regularização. Muito obrigado!`,
                  );
                  const waUrl = `https://wa.me/${cleanPhone.startsWith('244') ? cleanPhone : '244' + cleanPhone}?text=${waText}`;

                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3 text-xs bg-[hsl(var(--card))]"
                    >
                      <div className="min-w-0 pr-2">
                        <b className="truncate block font-bold text-[hsl(var(--foreground))]">{c.fullName}</b>
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                          Casa: {c.houseCode || '—'} · {c.phone}
                        </span>
                      </div>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white shadow hover:opacity-90 transition shrink-0"
                      >
                        WhatsApp
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* MODAL: PUBLICAR NO APP DO CLIENTE (APK) COM FILTROS */}
      {modalPublishApk && (
        <Modal
          title="Publicar Aviso no App do Cliente (APK)"
          eyebrow="Canal Oficial de Comunicação Mobile"
          onClose={() => setModalPublishApk(false)}
        >
          <form onSubmit={handlePublishToApk} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Título do Aviso *">
                <Input
                  required
                  value={apkForm.title}
                  onChange={(e) => setApkForm({ ...apkForm, title: e.target.value })}
                  placeholder="ex.: Manutenção Preventiva na Rua 12"
                />
              </Field>

              <Field label="Categoria do Aviso *">
                <Select
                  value={apkForm.category}
                  onChange={(e) => setApkForm({ ...apkForm, category: e.target.value })}
                >
                  <option value="comunicado">Comunicado Geral</option>
                  <option value="manutencao">Manutenção Técnica</option>
                  <option value="novidade">Novidade & Canais</option>
                  <option value="urgente">Aviso Urgente (Corte / Falha)</option>
                </Select>
              </Field>
            </div>

            {/* Filtros de Destinatários do APK */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-3">
              <span className="text-xs font-black uppercase text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <SlidersHorizontal size={14} /> Filtros de Destinatários no Aplicativo
              </span>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Tipo de Serviço">
                  <Select
                    value={apkForm.targetService}
                    onChange={(e) => setApkForm({ ...apkForm, targetService: e.target.value })}
                  >
                    <option value="todos">Todos os Serviços</option>
                    <option value="tv">Apenas Clientes TV</option>
                    <option value="internet">Apenas Internet Fibra</option>
                    <option value="combo">Apenas Combo (TV + Fibra)</option>
                  </Select>
                </Field>

                <Field label="Estado do Assinante">
                  <Select
                    value={apkForm.targetStatus}
                    onChange={(e) => setApkForm({ ...apkForm, targetStatus: e.target.value })}
                  >
                    <option value="todos">Todos os Estados</option>
                    <option value="active">Apenas Activos</option>
                    <option value="late">Em Atraso (Aviso de Corte)</option>
                    <option value="suspended">Suspensos (&gt;3 Meses)</option>
                  </Select>
                </Field>

                <Field label="Zona / Bairro">
                  <Select
                    value={apkForm.targetZone}
                    onChange={(e) => setApkForm({ ...apkForm, targetZone: e.target.value })}
                  >
                    <option value="todos">Todas as Zonas</option>
                    <option value="Golf I">Golf I</option>
                    <option value="Golf II">Golf II</option>
                    <option value="Palanca">Palanca</option>
                    <option value="Kilamba Kiaxi">Kilamba Kiaxi</option>
                    <option value="Rua 12">Apenas Rua 12</option>
                    <option value="Rua 13">Apenas Rua 13</option>
                  </Select>
                </Field>
              </div>

              <div className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Alcance estimado no APK: <b>{apkTargetCount} assinante(s)</b> atingidos com estes filtros.</span>
              </div>
            </div>

            <Field label="Conteúdo da Mensagem *">
              <Textarea
                required
                rows={4}
                value={apkForm.content}
                onChange={(e) => setApkForm({ ...apkForm, content: e.target.value })}
                placeholder="Escreva detalhadamente o comunicado que será exibido no telemóvel dos clientes..."
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
              <Button variant="outline" onClick={() => setModalPublishApk(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!apkForm.title.trim() || !apkForm.content.trim()}>
                <Megaphone size={15} /> Publicar no App do Cliente
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL REDACÇÃO MANUAL SMS */}
      {modal && (
        <Modal
          title="Nova Mensagem Manual para Clientes"
          eyebrow="Comunicação em Massa OSDEL"
          onClose={() => setModal(false)}
        >
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria de destinatários *">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="clientes em atraso">Clientes em Atraso (Corte)</option>
                  <option value="clientes activos">Clientes Activos</option>
                  <option value="clientes suspensos">Clientes Suspensos (&gt;3 Meses)</option>
                  <option value="clientes tv">Clientes TV</option>
                  <option value="clientes fibra">Clientes Internet Fibra</option>
                  <option value="todos os clientes">Todos os Clientes</option>
                </Select>
              </Field>
              <Field label="Canal de envio">
                <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="SMS">SMS (Gateway Unitel / Africell)</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Comunicado">Comunicado Geral</option>
                </Select>
              </Field>
            </div>

            <div className="rounded-lg bg-[hsl(var(--secondary)/.6)] p-3 text-xs">
              Destinatários seleccionados: <b>{targetRecipients.length} cliente(s)</b> na categoria{' '}
              <b>{category}</b>.
            </div>

            <div>
              <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                Modelos prontos:
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {templates.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMessageText(t.text)}
                    className="rounded bg-[hsl(var(--secondary))] px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary))] hover:text-white"
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Texto da mensagem *">
              <Textarea
                required
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escreva aqui o comunicado para os clientes..."
              />
            </Field>

            <div className="flex justify-end gap-2 border-t border-[hsl(var(--border))] pt-4">
              <Button variant="outline" onClick={() => setModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending || !messageText.trim()}>
                <Send size={15} /> {create.isPending ? 'A enviar…' : 'Enviar Mensagem'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
