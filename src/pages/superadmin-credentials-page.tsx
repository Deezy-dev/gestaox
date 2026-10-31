import { useState, useMemo } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Smartphone,
  Users,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Send,
  Printer,
  Eye,
  EyeOff,
  Plus,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageCircle,
  Share2,
  Trash2,
  Edit,
  X,
  Sliders,
  Sparkles,
  Wifi,
  Tv,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  useListClients,
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useGetSettings,
  session,
  clearDatabaseForProduction,
  resetDatabaseToDefaults,
} from '@/lib/local-api';
import { isSuperAdmin } from '@/lib/permissions';
import {
  getAllClientCredentials,
  getAllStaffCredentials,
  generateOrResetClientCredentials,
  generateOrResetStaffCredentials,
  updateClientPin,
  updateStaffPin,
  toggleClientCredentialStatus,
  toggleStaffCredentialStatus,
  formatClientWhatsAppMessage,
  formatStaffWhatsAppMessage,
  type ClientCredentials,
  type StaffCredentials,
} from '@/lib/client-auth';
import { triggerPrint } from '@/lib/printer';

export function SuperAdminCredentialsPage() {
  const currentUser = session();
  const isSuper = isSuperAdmin(currentUser);

  const clientsQuery = useListClients();
  const usersQuery = useListUsers();
  const settingsQuery = useGetSettings();

  const allClients = clientsQuery.data?.items || [];
  const allUsers = usersQuery.data || [];
  const settings = settingsQuery.data || {};
  const companyPhone = settings.companyWhatsApp || settings.companyPhone || '926153736';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'clientes' | 'colaboradores'>('clientes');

  // Stored credentials states (refreshed on events)
  const [clientCreds, setClientCreds] = useState<Record<number, ClientCredentials>>(() => getAllClientCredentials());
  const [staffCreds, setStaffCreds] = useState<Record<number, StaffCredentials>>(() => getAllStaffCredentials());

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'todos' | 'fibra' | 'tv' | 'combo'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'com_pin' | 'sem_pin' | 'bloqueados'>('todos');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'todos' | 'superadmin' | 'boss' | 'admin' | 'operador' | 'tecnico'>('todos');

  // Visible PINs toggles
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals
  const [modalCustomPin, setModalCustomPin] = useState<{ clientId?: number; staffId?: number; name: string; currentPin: string } | null>(null);
  const [customPinInput, setCustomPinInput] = useState('');
  const [modalNewStaff, setModalNewStaff] = useState(false);
  const [modalPrintSlip, setModalPrintSlip] = useState<{ client: any; creds: ClientCredentials } | null>(null);
  const [modalProductionReset, setModalProductionReset] = useState(false);
  const [openBalances, setOpenBalances] = useState({
    'acc-caixa': '0',
    'acc-bai': '0',
    'acc-bfa': '0',
    'acc-tpa': '0',
  });
  const [resetConfirmWord, setResetConfirmWord] = useState('');

  const handleExecuteProductionReset = () => {
    if (resetConfirmWord.trim().toUpperCase() !== 'PRODUCAO') {
      alert('Por favor escreva a palavra PRODUCAO para confirmar a limpeza.');
      return;
    }
    clearDatabaseForProduction({
      initialBalances: {
        'acc-caixa': Number(openBalances['acc-caixa'] || 0),
        'acc-bai': Number(openBalances['acc-bai'] || 0),
        'acc-bfa': Number(openBalances['acc-bfa'] || 0),
        'acc-tpa': Number(openBalances['acc-tpa'] || 0),
      },
    });
    refreshCreds();
    setModalProductionReset(false);
    setResetConfirmWord('');
    alert('Base de dados limpa com sucesso! O sistema está pronto para inserir clientes, faturas e contratos reais.');
  };

  const handleRestoreDemoData = () => {
    if (window.confirm('Deseja recarregar os dados de demonstração (clientes e faturas fictícias de teste)?')) {
      resetDatabaseToDefaults();
      refreshCreds();
      alert('Dados de demonstração recarregados com sucesso.');
    }
  };

  // New Staff form
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    username: '',
    role: 'tecnico' as StaffCredentials['role'],
    jobTitle: 'Técnico de Instalação & Piquete',
    department: 'Técnico',
    phone: '+244 923 000 000',
    salaryBase: '180000',
    pin: '1234',
    password: 'osdel@2026',
  });

  const refreshCreds = () => {
    setClientCreds(getAllClientCredentials());
    setStaffCreds(getAllStaffCredentials());
  };

  const togglePinVisibility = (id: string) => {
    setVisiblePins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Client credential actions
  const handleRegenerateClientPin = (client: any) => {
    if (window.confirm(`Deseja gerar um novo PIN de 4 dígitos para o cliente ${client.fullName}? O PIN anterior deixará de funcionar.`)) {
      generateOrResetClientCredentials(client, currentUser?.name || 'Super Admin (Deezy)');
      refreshCreds();
    }
  };

  const handleBulkGenerateClientPins = () => {
    let count = 0;
    allClients.forEach((client: any) => {
      if (!clientCreds[client.id]) {
        generateOrResetClientCredentials(client, currentUser?.name || 'Super Admin (Deezy)');
        count++;
      }
    });
    refreshCreds();
    alert(`${count} novas credenciais geradas com sucesso para clientes sem PIN!`);
  };

  const handleToggleClientStatus = (clientId: number) => {
    toggleClientCredentialStatus(clientId);
    refreshCreds();
  };

  const handleSendClientWhatsApp = (client: any, creds: ClientCredentials) => {
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(formatClientWhatsAppMessage(creds, companyPhone));
    window.open(`https://wa.me/${cleanPhone.startsWith('244') ? cleanPhone : '244' + cleanPhone}?text=${message}`, '_blank');
  };

  // Staff credential actions
  const handleRegenerateStaffPin = (user: any) => {
    if (window.confirm(`Deseja gerar um novo PIN operacional para o colaborador ${user.name}?`)) {
      generateOrResetStaffCredentials(user, currentUser?.name || 'Super Admin (Deezy)');
      refreshCreds();
    }
  };

  const handleToggleStaffStatus = (userId: number) => {
    toggleStaffCredentialStatus(userId);
    refreshCreds();
  };

  const handleSendStaffWhatsApp = (creds: StaffCredentials) => {
    const cleanPhone = (creds.phone || '').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(formatStaffWhatsAppMessage(creds));
    window.open(`https://wa.me/${cleanPhone.startsWith('244') ? cleanPhone : '244' + cleanPhone}?text=${message}`, '_blank');
  };

  const handleSaveCustomPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCustomPin || customPinInput.length !== 4 || !/^\d{4}$/.test(customPinInput)) {
      alert('O PIN deve conter exactamente 4 dígitos numéricos (ex: 4821).');
      return;
    }

    if (modalCustomPin.clientId) {
      updateClientPin(modalCustomPin.clientId, customPinInput, currentUser?.name || 'Super Admin');
    } else if (modalCustomPin.staffId) {
      updateStaffPin(modalCustomPin.staffId, customPinInput, currentUser?.name || 'Super Admin');
    }

    refreshCreds();
    setModalCustomPin(null);
    setCustomPinInput('');
  };

  const handleCreateNewStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.name || !newStaffForm.username) return;

    const newUserId = Date.now();
    generateOrResetStaffCredentials(
      {
        id: newUserId,
        name: newStaffForm.name,
        username: newStaffForm.username.toLowerCase().replace(/\s+/g, '.'),
        role: newStaffForm.role,
        jobTitle: newStaffForm.jobTitle,
        department: newStaffForm.department,
        phone: newStaffForm.phone,
        password: newStaffForm.password,
      },
      currentUser?.name || 'Super Admin (Deezy)',
      newStaffForm.pin,
    );

    refreshCreds();
    setModalNewStaff(false);
    setNewStaffForm({
      name: '',
      username: '',
      role: 'tecnico',
      jobTitle: 'Técnico de Instalação & Piquete',
      department: 'Técnico',
      phone: '+244 923 000 000',
      salaryBase: '180000',
      pin: '1234',
      password: 'osdel@2026',
    });
    alert('Colaborador cadastrado com sucesso com PIN móvel activo!');
  };

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return allClients.filter((c: any) => {
      const creds = clientCreds[c.id];
      const matchesSearch =
        c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.address?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesService =
        serviceFilter === 'todos' ||
        (serviceFilter === 'fibra' && (c.serviceType === 'internet' || c.serviceType === 'combo')) ||
        (serviceFilter === 'tv' && (c.serviceType === 'tv' || c.serviceType === 'combo')) ||
        c.serviceType === serviceFilter;

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'com_pin' && !!creds && creds.isActive) ||
        (statusFilter === 'sem_pin' && !creds) ||
        (statusFilter === 'bloqueados' && creds && !creds.isActive);

      return matchesSearch && matchesService && matchesStatus;
    });
  }, [allClients, clientCreds, searchTerm, serviceFilter, statusFilter]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    const list = Object.values(staffCreds);
    return list.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.jobTitle && s.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = staffRoleFilter === 'todos' || s.role === staffRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staffCreds, searchTerm, staffRoleFilter]);

  // ==================== RESTRICTION FOR NON-SUPERADMIN ====================
  if (!isSuper) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <ShieldAlert size={32} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 block">
              Módulo de Segurança Restrito
            </span>
            <h2 className="text-xl font-bold font-serif text-[hsl(var(--foreground))] mt-1">
              Acesso Exclusivo ao Super Administrador Supremo
            </h2>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            A gestão, geração e redefinição de credenciais de segurança dos clientes (APK Cliente) e colaboradores da empresa (APK Equipa / Web) é uma prerrogativa estrita do <b>Super Administrador Geral (Deezy)</b>.
          </p>
          <div className="pt-2">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-bold text-xs shadow-md"
            >
              Voltar ao Painel Geral
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SUPER ADMIN CONSOLE ====================
  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
              <ShieldCheck size={14} /> SUPER ADMIN SUPREMO (DEEZY)
            </span>
            <span aria-hidden="true">/</span>
            <span className="text-[hsl(var(--foreground))] font-bold">Gestão de Credenciais</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Consola Central de Credenciais & Acessos
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-2xl">
            Gere, redefina, audite e distribua senhas, PINs numéricos de 4 dígitos e acessos móveis via WhatsApp ou impressão para clientes e membros da empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModalProductionReset(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
            title="Apaga os clientes e faturas fictícias de teste e prepara a base de dados para dados reais"
          >
            <Trash2 size={14} />
            <span>Limpar Dados p/ Produção</span>
          </button>

          <button
            type="button"
            onClick={handleRestoreDemoData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))] text-xs font-semibold transition"
            title="Restaurar dados fictícios de demonstração"
          >
            <RefreshCw size={13} />
            <span>Dados Demo</span>
          </button>

          <button
            type="button"
            onClick={handleBulkGenerateClientPins}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
          >
            <Sparkles size={14} />
            <span>Gerar PINs em Falta</span>
          </button>

          <button
            type="button"
            onClick={() => setModalNewStaff(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition"
          >
            <Plus size={14} />
            <span>Novo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Main Tabs (Clientes vs Colaboradores) */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('clientes')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'clientes'
              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
          }`}
        >
          <Smartphone size={16} />
          <span>Credenciais de Clientes (APK Cliente)</span>
          <span className="text-xs px-2 py-0.2 rounded-full bg-black/20 text-white font-mono">
            {allClients.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colaboradores')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'colaboradores'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
          }`}
        >
          <Users size={16} />
          <span>Credenciais de Colaboradores (APK Equipa / Web)</span>
          <span className="text-xs px-2 py-0.2 rounded-full bg-black/20 text-white font-mono">
            {Object.keys(staffCreds).length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: CLIENTES ================= */}
      {activeTab === 'clientes' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] block">Total Assinantes</span>
              <b className="text-2xl font-serif text-[hsl(var(--foreground))]">{allClients.length}</b>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] block">PINs Activos</span>
              <b className="text-2xl font-serif text-emerald-600">
                {Object.values(clientCreds).filter((c) => c.isActive).length}
              </b>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] block">Clientes Fibra</span>
              <b className="text-2xl font-serif text-blue-600">
                {allClients.filter((c: any) => c.serviceType === 'internet' || c.serviceType === 'combo').length}
              </b>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] block">Clientes TV</span>
              <b className="text-2xl font-serif text-amber-600">
                {allClients.filter((c: any) => c.serviceType === 'tv' || c.serviceType === 'combo').length}
              </b>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[hsl(var(--card))] p-3.5 rounded-2xl border border-[hsl(var(--border))]">
            <div className="relative w-full sm:w-96">
              <Search size={16} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome, código (CLI-00001), telefone ou rua..."
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--primary))]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs font-bold">
              {/* Service filter */}
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value as any)}
                className="bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl px-2.5 py-1.5 outline-none"
              >
                <option value="todos">Todos os Serviços</option>
                <option value="fibra">Internet Fibra</option>
                <option value="tv">TV Comunitária</option>
                <option value="combo">Combo TV + Fibra</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl px-2.5 py-1.5 outline-none"
              >
                <option value="todos">Todos os Estados</option>
                <option value="com_pin">Com PIN Activo</option>
                <option value="sem_pin">Sem PIN Gerado</option>
                <option value="bloqueados">Acesso Desactivado</option>
              </select>
            </div>
          </div>

          {/* Clients Credential Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client: any) => {
              const creds = clientCreds[client.id] || {
                clientId: client.id,
                clientCode: client.code,
                clientName: client.fullName,
                phone: client.phone,
                pin: '----',
                password: 'Não gerado',
                generatedAt: '',
                generatedBy: '',
                isActive: false,
              };

              const hasCreds = !!clientCreds[client.id];
              const isPinVisible = visiblePins[`cli-${client.id}`];

              return (
                <div
                  key={client.id}
                  className={`rounded-2xl border p-4.5 space-y-3.5 transition shadow-xs ${
                    hasCreds && creds.isActive
                      ? 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:border-blue-400/60'
                      : 'bg-slate-500/5 border-dashed border-slate-400/40'
                  }`}
                >
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <b className="text-sm font-bold text-[hsl(var(--foreground))] truncate">
                          {client.fullName}
                        </b>
                      </div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                        {client.code} · {client.phone}
                      </span>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                        {client.address}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        hasCreds && creds.isActive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : hasCreds && !creds.isActive
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {hasCreds && creds.isActive ? 'Activo' : hasCreds ? 'Bloqueado' : 'Sem PIN'}
                    </span>
                  </div>

                  {/* Credentials Box */}
                  <div className="bg-[hsl(var(--secondary)/.5)] border border-[hsl(var(--border))] rounded-xl p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-sans font-bold">
                        PIN de Acesso (4 Dígitos):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <b className="text-sm tracking-widest text-[hsl(var(--primary))] font-black">
                          {isPinVisible ? creds.pin : '••••'}
                        </b>
                        <button
                          type="button"
                          onClick={() => togglePinVisibility(`cli-${client.id}`)}
                          className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          title={isPinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                        >
                          {isPinVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] border-t border-[hsl(var(--border))] pt-1.5">
                      <span className="text-[hsl(var(--muted-foreground))] font-sans">Senha Web:</span>
                      <span className="text-[hsl(var(--foreground))]">{creds.password || 'osdel123'}</span>
                    </div>

                    {creds.generatedAt && (
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-sans pt-1">
                        Gerado em: {new Date(creds.generatedAt).toLocaleDateString('pt-AO')} por {creds.generatedBy}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border))] text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      {/* WhatsApp Dispatch */}
                      <button
                        type="button"
                        onClick={() => handleSendClientWhatsApp(client, creds)}
                        className="p-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-500/20 transition"
                        title="Enviar credenciais completas via WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </button>

                      {/* Copy */}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`Código: ${client.code} | PIN: ${creds.pin}`, `cli-${client.id}`)}
                        className="p-2 rounded-xl bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition"
                        title="Copiar dados de acesso"
                      >
                        {copiedKey === `cli-${client.id}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>

                      {/* Custom PIN override */}
                      <button
                        type="button"
                        onClick={() => {
                          setModalCustomPin({
                            clientId: client.id,
                            name: client.fullName,
                            currentPin: creds.pin,
                          });
                          setCustomPinInput(creds.pin === '----' ? '1234' : creds.pin);
                        }}
                        className="p-2 rounded-xl bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition"
                        title="Definir PIN Manualmente"
                      >
                        <Edit size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Regenerate PIN */}
                      <button
                        type="button"
                        onClick={() => handleRegenerateClientPin(client)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-xs text-[11px] flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Novo PIN</span>
                      </button>

                      {/* Toggle status */}
                      {hasCreds && (
                        <button
                          type="button"
                          onClick={() => handleToggleClientStatus(client.id)}
                          className={`p-1.5 rounded-xl border text-[11px] transition ${
                            creds.isActive
                              ? 'border-rose-400 text-rose-600 hover:bg-rose-500 hover:text-white'
                              : 'border-emerald-400 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                          }`}
                          title={creds.isActive ? 'Desactivar acesso' : 'Activar acesso'}
                        >
                          <Lock size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ================= TAB 2: COLABORADORES ================= */}
      {activeTab === 'colaboradores' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] block">Membros Registados</span>
              <b className="text-2xl font-serif text-[hsl(var(--foreground))]">
                {Object.keys(staffCreds).length}
              </b>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] block">Técnicos & Piquete</span>
              <b className="text-2xl font-serif text-emerald-600">
                {Object.values(staffCreds).filter((s) => s.role === 'tecnico').length}
              </b>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] block">Operadores de Balcão</span>
              <b className="text-2xl font-serif text-blue-600">
                {Object.values(staffCreds).filter((s) => s.role === 'operador').length}
              </b>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs">
              <span className="text-xs text-[hsl(var(--muted-foreground))] block">Direcção & Admins</span>
              <b className="text-2xl font-serif text-purple-600">
                {Object.values(staffCreds).filter((s) => s.role === 'superadmin' || s.role === 'boss' || s.role === 'admin').length}
              </b>
            </div>
          </div>

          {/* Search & Role Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[hsl(var(--card))] p-3.5 rounded-2xl border border-[hsl(var(--border))]">
            <div className="relative w-full sm:w-96">
              <Search size={16} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar colaborador por nome, utilizador ou telefone..."
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:border-[hsl(var(--primary))]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value as any)}
                className="bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
              >
                <option value="todos">Todos os Cargos</option>
                <option value="superadmin">Super Admin Supremo</option>
                <option value="boss">Boss / Direcção Executiva</option>
                <option value="admin">Administrador Operacional</option>
                <option value="operador">Operador de Balcão</option>
                <option value="tecnico">Técnico de Campo</option>
              </select>
            </div>
          </div>

          {/* Staff Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((staff) => {
              const isPinVisible = visiblePins[`stf-${staff.userId}`];

              return (
                <div
                  key={staff.userId}
                  className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4.5 space-y-3.5 shadow-xs transition hover:border-purple-400/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <b className="text-sm font-bold text-[hsl(var(--foreground))] block truncate">
                        {staff.name}
                      </b>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        @{staff.username} · {staff.department || 'Operações'}
                      </span>
                      <p className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-0.5 truncate">
                        {staff.jobTitle || staff.role.toUpperCase()}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        staff.role === 'superadmin'
                          ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40'
                          : staff.role === 'boss'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                          : staff.role === 'admin'
                          ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                          : staff.role === 'operador'
                          ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {staff.role}
                    </span>
                  </div>

                  {/* Credentials Box */}
                  <div className="bg-[hsl(var(--secondary)/.5)] border border-[hsl(var(--border))] rounded-xl p-3 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-sans font-bold">
                        PIN Móvel (APK Equipa):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <b className="text-sm tracking-widest text-purple-600 dark:text-purple-400 font-black">
                          {isPinVisible ? staff.pin : '••••'}
                        </b>
                        <button
                          type="button"
                          onClick={() => togglePinVisibility(`stf-${staff.userId}`)}
                          className="p-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          title={isPinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
                        >
                          {isPinVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] border-t border-[hsl(var(--border))] pt-1.5">
                      <span className="text-[hsl(var(--muted-foreground))] font-sans">Senha Web/Desktop:</span>
                      <span className="text-[hsl(var(--foreground))]">{staff.password || 'admin'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] border-t border-[hsl(var(--border))] pt-1.5 font-sans">
                      <span className="text-[hsl(var(--muted-foreground))]">Telefone:</span>
                      <span className="font-mono text-[hsl(var(--foreground))]">{staff.phone || 'Sem registo'}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border))] text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      {staff.phone && (
                        <button
                          type="button"
                          onClick={() => handleSendStaffWhatsApp(staff)}
                          className="p-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-500/20 transition"
                          title="Enviar credenciais via WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => copyToClipboard(`Utilizador: ${staff.username} | PIN: ${staff.pin} | Senha: ${staff.password}`, `stf-${staff.userId}`)}
                        className="p-2 rounded-xl bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition"
                        title="Copiar credenciais"
                      >
                        {copiedKey === `stf-${staff.userId}` ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setModalCustomPin({
                            staffId: staff.userId,
                            name: staff.name,
                            currentPin: staff.pin,
                          });
                          setCustomPinInput(staff.pin);
                        }}
                        className="p-2 rounded-xl bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition"
                        title="Definir PIN Manual"
                      >
                        <Edit size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRegenerateStaffPin(staff)}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-xs text-[11px] flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        <span>Novo PIN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStaffStatus(staff.userId)}
                        className={`p-1.5 rounded-xl border text-[11px] transition ${
                          staff.isActive
                            ? 'border-rose-400 text-rose-600 hover:bg-rose-500 hover:text-white'
                            : 'border-emerald-400 text-emerald-600 hover:bg-emerald-500 hover:text-white'
                        }`}
                        title={staff.isActive ? 'Bloquear colaborador' : 'Desbloquear colaborador'}
                      >
                        <Lock size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ================= MODAL: EDITAR / DEFINIR PIN MANUAL ================= */}
      {modalCustomPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-purple-600" />
                <b className="text-sm text-[hsl(var(--foreground))]">Definir PIN Manual</b>
              </div>
              <button
                type="button"
                onClick={() => setModalCustomPin(null)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Definir código PIN de 4 dígitos para <b>{modalCustomPin.name}</b>:
            </p>

            <form onSubmit={handleSaveCustomPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1.5">
                  PIN Numérico (4 Dígitos):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={customPinInput}
                  onChange={(e) => setCustomPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Ex: 4821"
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl py-3 px-3 text-center text-2xl font-mono tracking-widest font-black text-[hsl(var(--primary))] outline-none focus:border-[hsl(var(--primary))]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
                <button
                  type="button"
                  onClick={() => setModalCustomPin(null)}
                  className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-xs font-bold text-[hsl(var(--foreground))]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[hsl(var(--primary))] hover:brightness-110 text-[hsl(var(--primary-foreground))] text-xs font-bold shadow-md"
                >
                  Salvar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CRIAR NOVO COLABORADOR ================= */}
      {modalNewStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-purple-600" />
                <b className="text-sm text-[hsl(var(--foreground))]">Novo Colaborador com Credenciais</b>
              </div>
              <button
                type="button"
                onClick={() => setModalNewStaff(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewStaffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[hsl(var(--foreground))] font-bold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newStaffForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const username = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
                    setNewStaffForm({ ...newStaffForm, name, username });
                  }}
                  placeholder="Ex: João Baptista Silva"
                  className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-[hsl(var(--foreground))] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[hsl(var(--foreground))] font-bold mb-1">Nome de Utilizador</label>
                  <input
                    type="text"
                    required
                    value={newStaffForm.username}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, username: e.target.value })}
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-[hsl(var(--foreground))] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[hsl(var(--foreground))] font-bold mb-1">Nível de Acesso (Papel)</label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value as any })}
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-[hsl(var(--foreground))] outline-none font-bold"
                  >
                    <option value="tecnico">Técnico de Campo</option>
                    <option value="operador">Operador de Balcão</option>
                    <option value="admin">Administrador Operacional</option>
                    <option value="boss">Boss / Direcção Executiva</option>
                    <option value="superadmin">Super Admin Supremo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[hsl(var(--foreground))] font-bold mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={newStaffForm.jobTitle}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, jobTitle: e.target.value })}
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-[hsl(var(--foreground))] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[hsl(var(--foreground))] font-bold mb-1">Telefone WhatsApp</label>
                  <input
                    type="text"
                    value={newStaffForm.phone}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-[hsl(var(--foreground))] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-[hsl(var(--secondary)/.4)] p-3 rounded-2xl border border-[hsl(var(--border))]">
                <div>
                  <label className="block text-[hsl(var(--foreground))] font-bold mb-1">PIN Móvel (4 Dígitos)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newStaffForm.pin}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, pin: e.target.value.replace(/[^0-9]/g, '') })}
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2 text-center text-lg font-mono font-black text-purple-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[hsl(var(--foreground))] font-bold mb-1">Senha Web/Desktop</label>
                  <input
                    type="text"
                    value={newStaffForm.password}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-[hsl(var(--foreground))] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
                <button
                  type="button"
                  onClick={() => setModalNewStaff(false)}
                  className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md"
                >
                  Criar Colaborador & Activar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREPARAR PARA PRODUÇÃO (LIMPAR DADOS DE DEMO E INICIAR DADOS REAIS) */}
      {modalProductionReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6 shadow-2xl space-y-5 animate-in fade-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 size={20} />
                <h3 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                  Entrada em Produção Oficial
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalProductionReset(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <AlertTriangle size={16} />
                <span>Atenção: Limpeza Completa de Dados de Demonstração</span>
              </div>
              <p>
                Esta ação apagará <b>todos os clientes fictícios, faturas de teste, pagamentos demonstrativos, contratos e chamados</b> para que possa cadastrar a sua carteira de clientes reais imediatamente.
              </p>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                ✓ As contas de utilizador (Deezy, Boss, Admin, Técnicos), credenciais e parâmetros da empresa NÃO serão apagados.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Definir Saldos Iniciais Reais de Abertura da Tesouraria (Opcional):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mb-1">
                    Caixa Físico Balcão (Kz):
                  </span>
                  <input
                    type="number"
                    value={openBalances['acc-caixa']}
                    onChange={(e) => setOpenBalances({ ...openBalances, 'acc-caixa': e.target.value })}
                    placeholder="0"
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-xs font-mono outline-none focus:border-[hsl(var(--primary))]"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mb-1">
                    Banco BAI Arrecadação (Kz):
                  </span>
                  <input
                    type="number"
                    value={openBalances['acc-bai']}
                    onChange={(e) => setOpenBalances({ ...openBalances, 'acc-bai': e.target.value })}
                    placeholder="0"
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-xs font-mono outline-none focus:border-[hsl(var(--primary))]"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mb-1">
                    Banco BFA Operações (Kz):
                  </span>
                  <input
                    type="number"
                    value={openBalances['acc-bfa']}
                    onChange={(e) => setOpenBalances({ ...openBalances, 'acc-bfa': e.target.value })}
                    placeholder="0"
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-xs font-mono outline-none focus:border-[hsl(var(--primary))]"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mb-1">
                    TPA / Multicaixa Express (Kz):
                  </span>
                  <input
                    type="number"
                    value={openBalances['acc-tpa']}
                    onChange={(e) => setOpenBalances({ ...openBalances, 'acc-tpa': e.target.value })}
                    placeholder="0"
                    className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-xl p-2.5 text-xs font-mono outline-none focus:border-[hsl(var(--primary))]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[hsl(var(--border))]">
              <label className="block text-xs font-bold text-rose-600">
                Confirmação de Segurança: Digite a palavra <code className="bg-rose-500/10 px-1 py-0.5 rounded font-mono">PRODUCAO</code> abaixo:
              </label>
              <input
                type="text"
                value={resetConfirmWord}
                onChange={(e) => setResetConfirmWord(e.target.value)}
                placeholder="PRODUCAO"
                className="w-full bg-[hsl(var(--background))] border border-rose-400 rounded-xl p-2.5 text-xs font-mono uppercase outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={() => setModalProductionReset(false)}
                className="px-4 py-2.5 rounded-xl border border-[hsl(var(--border))] text-xs font-bold hover:bg-[hsl(var(--secondary))]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteProductionReset}
                disabled={resetConfirmWord.trim().toUpperCase() !== 'PRODUCAO'}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-40 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition"
              >
                <Trash2 size={14} />
                <span>Confirmar & Limpar para Produção</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
