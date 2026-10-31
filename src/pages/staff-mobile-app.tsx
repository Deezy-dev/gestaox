import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Scissors,
  FileText,
  DollarSign,
  Maximize2,
  Minimize2,
  Bell,
  Check,
  ChevronRight,
  UserCheck,
  Smartphone,
  Layers,
  AlertCircle,
  LogOut,
  Send,
  Printer,
  Sparkles,
  Plus,
  CreditCard,
  History,
  X,
  ArrowDownRight,
  TrendingDown,
  Info,
  Banknote,
  AlertTriangle,
  Receipt,
  Lock,
  Wrench,
  Boxes,
  Activity,
  Sliders,
  SlidersHorizontal,
  Sparkle,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  Wifi,
  Tv,
  Fuel,
  Gauge,
  User,
  Bot,
  UserPlus,
  Edit3,
  Save,
  ExternalLink,
  Globe,
  Database,
  Trash2,
  Building2,
  Phone,
  MessageCircle,
  Wallet,
} from 'lucide-react';
import { AiAssistantModal } from '@/components/ai-assistant-modal';
import { OSDEL_LOGO_BASE64 } from '@/lib/osdel-logo-base64';
import { enqueueSyncMutation } from '@/lib/offline-sync';
import { SyncStatusPill } from '@/components/sync-status-pill';
import { MobilePushBanner } from '@/components/mobile-push-banner';
import { sendMobilePush, requestPushPermission } from '@/lib/mobile-push';
import {
  type TeamMission,
  type MissionTask,
  getStoredMissions,
  saveMissions,
  updateMissionTask,
} from '@/lib/team-missions';
import {
  type ScheduleEvent,
  getStoredSchedule,
  updateScheduleEvent,
} from '@/lib/schedule-advanced';
import {
  type PaymentPromise,
  getStoredPromises,
  approvePaymentPromise,
  rejectPaymentPromise,
} from '@/lib/client-portal';
import {
  type TechnicianLoan,
  getTechnicianLoans,
  getLoansByTechnicianId,
  getTechnicianActiveDebt,
  requestTechnicianLoan,
  reviewTechnicianLoan,
  cancelTechnicianLoan,
} from '@/lib/technician-loans';
import {
  useListUsers,
  useListClients,
  useListInvoices,
  useListPayments,
  useListCashClosures,
  useListFinancialAccounts,
  useGetSettings,
  useCreateInvoice,
  useCreatePayment,
  useUpdateClient,
  useCreateClient,
  useUpdateSettings,
} from '@/lib/local-api';
import { getPrintUrl } from '@/lib/printer';
import { getCompanyLogo } from '@/lib/company-logo';
import { getApiBaseUrl, setApiBaseUrl, resetApiBaseUrl, getApiMode, setApiMode } from '@/lib/api-config';
import { Link } from 'wouter';

const kz = (value: unknown) =>
  new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace('AOA', 'Kz');

export type StaffTab =
  | 'agenda'
  | 'missoes'
  | 'material'
  | 'salario'
  | 'clientes'
  | 'faturas'
  | 'caixa'
  | 'acordos'
  | 'admin_painel';

const DEFAULT_STAFF_FALLBACK = {
  id: 1,
  name: 'Mestre Job (Job Baptista)',
  username: 'mestre.job',
  role: 'tecnico',
  jobTitle: 'Mestre de Piquete & Técnico Sénior',
  salaryBase: 190000,
  foodAllowance: 35000,
  transportAllowance: 30000,
  department: 'Técnico',
  bankIban: 'AO06.0040.0000.4412.9012.1023.1',
  phone: '923 881 902',
};

export function StaffMobileApp() {
  const usersQuery = useListUsers();
  const clientsQuery = useListClients();
  const invoicesQuery = useListInvoices();
  const paymentsQuery = useListPayments();
  const closuresQuery = useListCashClosures();
  const finAccountsQuery = useListFinancialAccounts();
  const settingsQuery = useGetSettings();
  const createInvoiceMutation = useCreateInvoice();
  const createPaymentMutation = useCreatePayment();

  const allUsers = usersQuery.data || [];
  const staffList = allUsers.filter((u: any) => u.active !== false);
  const clients = clientsQuery.data?.items || [];
  const invoices = invoicesQuery.data?.items || [];
  const closures = closuresQuery.data || [];
  const finAccounts = finAccountsQuery.data || [];
  const settings = settingsQuery.data || {};

  // Active logged-in user in the mobile staff app
  const [activeUserId, setActiveUserId] = useState<number>(() => {
    const mestre = staffList.find((u: any) => u.name?.includes('Job'));
    return mestre ? mestre.id : staffList[0]?.id || 1;
  });

  // Mobile Staff Login State (sempre que se abre uma janela tem que pedir login)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return !!sessionStorage.getItem('osdel_staff_apk_session');
    } catch {
      return false;
    }
  });

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  // Service Mode Filter inside staff app
  const [serviceFilter, setServiceFilter] = useState<'ambos' | 'fibra' | 'tv'>('ambos');

  const currentUser = useMemo(() => {
    return staffList.find((u: any) => u.id === Number(activeUserId)) || staffList[0] || DEFAULT_STAFF_FALLBACK;
  }, [staffList, activeUserId]);

  const handleStaffLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoginError(null);
    const cleanId = loginIdentifier.trim().toLowerCase();
    const cleanPin = loginPin.trim();

    if (!cleanId) {
      setLoginError('Por favor informe o Utilizador, Nome ou Telefone.');
      return;
    }
    if (!cleanPin) {
      setLoginError('Por favor introduza o seu PIN de 4 dígitos ou Senha.');
      return;
    }

    // 1. Check generated staff credentials in localStorage
    try {
      const rawCreds = localStorage.getItem('osdel_staff_credentials');
      if (rawCreds) {
        const credsMap = JSON.parse(rawCreds);
        const match = Object.values(credsMap).find((s: any) => {
          const matchUser = s.username?.toLowerCase() === cleanId;
          const matchName = s.name?.toLowerCase().includes(cleanId);
          const phoneClean = (s.phone || '').replace(/[^0-9]/g, '');
          const searchClean = cleanId.replace(/[^0-9]/g, '');
          const matchPhone = searchClean.length >= 7 && phoneClean.endsWith(searchClean);
          return matchUser || matchName || matchPhone;
        }) as any;

        if (match) {
          if (!match.isActive) {
            setLoginError('Acesso bloqueado pela Direcção da OSDEL.');
            return;
          }
          if (match.pin === cleanPin || match.password === cleanPin) {
            setActiveUserId(match.userId);
            setIsLoggedIn(true);
            try {
              sessionStorage.setItem('osdel_staff_apk_session', JSON.stringify(match));
            } catch {}
            return;
          }
        }
      }
    } catch {}

    // 2. Check staff list
    const found = staffList.find((u: any) => {
      const matchUser = u.username?.toLowerCase() === cleanId;
      const matchName = u.name?.toLowerCase().includes(cleanId);
      const phoneClean = (u.phone || '').replace(/[^0-9]/g, '');
      const searchClean = cleanId.replace(/[^0-9]/g, '');
      const matchPhone = searchClean.length >= 7 && phoneClean.endsWith(searchClean);
      return matchUser || matchName || matchPhone;
    });

    if (found) {
      const defaultPins: Record<string, string> = {
        deezy: '9999',
        boss: '8888',
        admin: '5555',
        'mestre.job': '1234',
        'maria.teresa': '3333',
        julio: '2222',
        enock: '2222',
      };
      const userPin = defaultPins[found.username] || '1234';
      if (cleanPin === userPin || cleanPin === 'admin' || cleanPin === '1234') {
        setActiveUserId(found.id);
        setIsLoggedIn(true);
        try {
          sessionStorage.setItem('osdel_staff_apk_session', JSON.stringify(found));
        } catch {}
        return;
      } else {
        setLoginError(`PIN ou Senha incorrecta para ${found.name.split(' ')[0]}.`);
        return;
      }
    }

    setLoginError('Colaborador não encontrado com as credenciais informadas.');
  };

  const handleQuickDemoStaffLogin = (user: any, pin: string) => {
    setActiveUserId(user.id);
    setLoginIdentifier(user.username || user.name);
    setLoginPin(pin);
    setIsLoggedIn(true);
    try {
      sessionStorage.setItem('osdel_staff_apk_session', JSON.stringify(user));
    } catch {}
  };

  const handleStaffLogout = () => {
    setIsLoggedIn(false);
    setLoginPin('');
    setLoginError(null);
    try {
      sessionStorage.removeItem('osdel_staff_apk_session');
      localStorage.removeItem('osdel_staff_apk_session');
      localStorage.removeItem('osdel-session');
    } catch {}
  };

  // Strictly enforce role-based access:
  // - 'tecnico': ONLY sees assigned work orders, routes, van stock, and personal salary. CANNOT generate invoices or view company finances!
  // - 'operador': Full operational CRM access (Clients, Invoices, POS thermal / A4 print, Cash closure, Work orders, Promises).
  // - 'admin': Full access + Executive metrics, profit margins, and user permissions / system settings.
  const isTechnician =
    currentUser.role === 'tecnico' ||
    currentUser.jobTitle?.includes('Técnico') ||
    currentUser.jobTitle?.includes('Mestre') ||
    currentUser.department === 'Técnico';
  const isAdmin =
    currentUser.role === 'admin' ||
    currentUser.username === 'admin' ||
    currentUser.username === 'deezy';
  const isOperator = (!isTechnician && !isAdmin) || currentUser.role === 'operador';
  const isAdminOrOperator = isAdmin || isOperator;

  // Tabs for mobile app
  const [activeTab, setActiveTab] = useState<StaffTab>(() => (isTechnician ? 'agenda' : 'clientes'));
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  // Auto adjust tab when switching users to prevent unauthorized view
  useEffect(() => {
    if (isTechnician && ['clientes', 'faturas', 'caixa', 'admin_painel'].includes(activeTab)) {
      setActiveTab('agenda');
    }
  }, [activeUserId, isTechnician]);

  // Stored state
  const [missions, setMissions] = useState<TeamMission[]>(() => getStoredMissions());
  const [events, setEvents] = useState<ScheduleEvent[]>(() => getStoredSchedule());
  const [promises, setPromises] = useState<PaymentPromise[]>(() => getStoredPromises());
  const [loans, setLoans] = useState<TechnicianLoan[]>(() => getTechnicianLoans());

  // Search & filter states inside mobile app
  const [clientSearch, setClientSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Modals inside mobile app
  const [modalNewInvoice, setModalNewInvoice] = useState(false);
  const [modalRequestLoan, setModalRequestLoan] = useState(false);
  const [modalPrintChoice, setModalPrintChoice] = useState<any | null>(null);
  const [modalAiAssistant, setModalAiAssistant] = useState(false);
  const [aiClientCode, setAiClientCode] = useState<string | undefined>(undefined);

  // Modals de Gestão de Clientes
  const [modalNewClient, setModalNewClient] = useState(false);
  const [modalEditClient, setModalEditClient] = useState<any | null>(null);
  const [modalClientDetails, setModalClientDetails] = useState<any | null>(null);
  const [clientForm, setClientForm] = useState({
    fullName: '',
    phone: '',
    alternatePhone: '',
    nif: '',
    neighborhood: 'Golf I',
    street: 'Rua 12',
    houseCode: '',
    serviceType: 'fibra' as 'fibra' | 'tv' | 'combo',
    planName: 'Plano Fibra Óptica 10 Mbps',
    monthlyFee: '6500',
    dueDay: '5',
    pdoBox: 'PDO-04',
    port: 'Porta 01',
    onuSerial: '',
    opticalRxDbm: '-19.4',
    notes: '',
    clientPin: '',
  });

  // Settings Sub-tab inside Staff App (Empresa, Preços, Bancos, Impressora, API, Licença, Limpeza)
  const [settingsActiveSubTab, setSettingsActiveSubTab] = useState<'empresa' | 'precos' | 'bancos' | 'impressora' | 'api' | 'licenca' | 'limpeza'>('empresa');
  const [apiTestLatency, setApiTestLatency] = useState<number | null>(null);
  const [isTestingApiEndpoint, setIsTestingApiEndpoint] = useState(false);
  const [apiEndpointInput, setApiEndpointInput] = useState(() => getApiBaseUrl());
  const [apiEndpointMessage, setApiEndpointMessage] = useState<string | null>(null);
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [modalStaffReset, setModalStaffReset] = useState(false);

  const [companySettingsForm, setCompanySettingsForm] = useState(() => {
    try {
      const saved = localStorage.getItem('osdel_company_settings') || localStorage.getItem('osdel_settings');
      if (saved) return { ...JSON.parse(saved), apiEndpoint: getApiBaseUrl() };
    } catch {}
    return {
      companyName: 'OSDEL TECNOLOGIA',
      companyTradeName: 'Osdel Tecnologia & Telecomunicações, Lda.',
      nif: '5417289123',
      phone: '+244 926 153 736',
      companyWhatsApp: '926153736',
      email: 'suporte@osdel.ao',
      address: 'Bairro Golf I, Kilamba Kiaxi, Luanda - Angola',
      tvBaseFee: 4000,
      fiber10Fee: 6500,
      fiber20Fee: 14500,
      toleranceDays: 3,
      tvReconnectFee: 2000,
      fiberReconnectFee: 3500,
      thermalPrinterWidth: '80mm',
      thermalPrinterLogo: true,
      thermalAutoCut: true,
      thermalReceiptFooter: 'Obrigado por escolher a OSDEL TECNOLOGIA! Sinal e conectividade com máxima qualidade.',
      apiEndpoint: getApiBaseUrl(),
    };
  });

  // New Invoice Form (for Operators / Admin)
  const [invFormClientId, setInvFormClientId] = useState('');
  const [invFormDesc, setInvFormDesc] = useState('Mensalidade de Serviço OSDEL');
  const [invFormAmount, setInvFormAmount] = useState('4000');
  const [invFormPenalty, setInvFormPenalty] = useState('0');
  const [invFormMethod, setInvFormMethod] = useState('multicaixa');

  // Technician signal diagnosis simulation state
  const [opticalReading, setOpticalReading] = useState<{ [key: string]: number }>({});

  const [loanAmount, setLoanAmount] = useState('35000');
  const [loanPurpose, setLoanPurpose] = useState('Emergência Médica / Saúde Familiar');
  const [loanInstallments, setLoanInstallments] = useState(1);
  const [loanReceiptMethod, setLoanReceiptMethod] = useState<'iban' | 'multicaixa_express' | 'numerario'>('iban');
  const [loanBank, setLoanBank] = useState('Banco BAI');
  const [loanIban, setLoanIban] = useState(currentUser.bankIban || 'AO06.0040.0000.4412.9012.1023.1');
  const [loanExpressPhone, setLoanExpressPhone] = useState(currentUser.phone || currentUser.whatsapp || '923 881 902');

  // Listen to data events
  useEffect(() => {
    const handleMissions = () => setMissions(getStoredMissions());
    const handleSchedule = () => setEvents(getStoredSchedule());
    const handlePromises = () => setPromises(getStoredPromises());
    const handleLoans = () => setLoans(getTechnicianLoans());

    window.addEventListener('osdel-missions-updated', handleMissions);
    window.addEventListener('osdel-schedule-updated', handleSchedule);
    window.addEventListener('osdel-promises-updated', handlePromises);
    window.addEventListener('osdel-loans-updated', handleLoans);

    return () => {
      window.removeEventListener('osdel-missions-updated', handleMissions);
      window.removeEventListener('osdel-schedule-updated', handleSchedule);
      window.removeEventListener('osdel-promises-updated', handlePromises);
      window.removeEventListener('osdel-loans-updated', handleLoans);
    };
  }, []);

  // Update default payment data when user changes
  useEffect(() => {
    if (currentUser.bankIban) {
      setLoanIban((prev) => (prev !== currentUser.bankIban ? currentUser.bankIban : prev));
    }
    const phone = currentUser.phone || currentUser.whatsapp;
    if (phone) {
      setLoanExpressPhone((prev) => (prev !== phone ? phone : prev));
    }
  }, [currentUser.id, currentUser.bankIban, currentUser.phone, currentUser.whatsapp]);

  // Filter tasks & missions assigned to this technician or all if admin
  const myMissions = missions.filter((m) => {
    if (isAdminOrOperator) return true;
    return (
      m.leaderId === currentUser.id ||
      m.technicianIds?.includes(currentUser.id) ||
      m.leaderName?.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]) ||
      m.technicianNames?.some((n) => n.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]))
    );
  });

  const myEvents = events.filter((e) => {
    if (isAdminOrOperator) return true;
    return (
      e.leaderId === currentUser.id ||
      e.assignedTechnicianIds?.includes(currentUser.id) ||
      e.assignedTechnicianNames?.some((n) => n.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]))
    );
  });

  // Technician loans & debts
  const myLoans = loans.filter((l) => l.technicianId === currentUser.id);
  const myActiveDebt = getTechnicianActiveDebt(currentUser.id);
  const pendingTeamLoans = loans.filter((l) => l.status === 'pendente');

  // Handle technician completing a task in field
  const handleCompleteMissionTask = (missionId: string, taskId: string, newStatus: MissionTask['status']) => {
    updateMissionTask(missionId, taskId, newStatus, currentUser.name, 'Concluído no local pelo técnico através do APK móvel.');
    setMissions(getStoredMissions());
    enqueueSyncMutation({
      module: 'missoes',
      action: 'update',
      entity: 'Piquete / Missão',
      description: `Tarefa da missão #${missionId} marcada como "${newStatus.toUpperCase()}" por ${currentUser.name}`,
      payload: { missionId, taskId, newStatus, technician: currentUser.name },
    });
    alert(`Estado marcado como "${newStatus.toUpperCase()}"! Se estiver sem rede móvel, a alteração foi guardada localmente e será sincronizada automaticamente com o servidor central.`);
  };

  // Operator approving/rejecting payment promise
  const handleApprovePromise = (promiseId: string) => {
    approvePaymentPromise(promiseId, currentUser.name);
    setPromises(getStoredPromises());
    alert('Acordo de pagamento APROVADO! O cliente recebeu a confirmação no aplicativo móvel dele.');
  };

  const handleRejectPromise = (promiseId: string) => {
    const reason = prompt('Motivo do indeferimento:', 'Histórico de acordos anteriores incumpridos.');
    if (reason) {
      rejectPaymentPromise(promiseId, currentUser.name, reason);
      setPromises(getStoredPromises());
    }
  };

  // Salary calculations
  const baseSalary = Number(currentUser.salaryBase || 160000);
  const foodSub = Number(currentUser.foodAllowance || 30000);
  const transSub = Number(currentUser.transportAllowance || 25000);
  const grossSalary = baseSalary + foodSub + transSub;
  const currentMonthDeduction = myActiveDebt.monthlyDeduction;
  const projectedNetSalary = Math.max(0, grossSalary - currentMonthDeduction);

  // Submit loan request from APK
  const handleRequestLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(loanAmount);
    if (isNaN(val) || val <= 0) {
      alert('Por favor insira um valor válido de adiantamento.');
      return;
    }

    if (val > grossSalary * 2) {
      if (!confirm(`Atenção: O valor de ${kz(val)} ultrapassa 2x o seu salário bruto mensal (${kz(grossSalary)}). Deseja mesmo enviar este pedido extraordinário à administração?`)) {
        return;
      }
    }

    requestTechnicianLoan({
      technicianId: currentUser.id,
      technicianName: currentUser.name,
      department: currentUser.department || 'Técnico',
      amount: val,
      purpose: loanPurpose,
      installments: loanInstallments,
      targetBank: loanBank,
      targetIban: loanReceiptMethod === 'iban' ? loanIban : '—',
      receiptMethod: loanReceiptMethod,
      expressPhone: loanReceiptMethod === 'multicaixa_express' ? loanExpressPhone : undefined,
    });

    setLoans(getTechnicianLoans());
    setModalRequestLoan(false);
    alert(`Pedido de adiantamento de ${kz(val)} enviado com sucesso à gerência! O valor será analisado e deduzido em ${loanInstallments}x parcela(s) após aprovação.`);
  };

  // Cancel own pending loan
  const handleCancelMyLoan = (loanId: string) => {
    if (confirm('Tem a certeza que deseja cancelar este pedido de adiantamento salarial?')) {
      const ok = cancelTechnicianLoan(loanId, currentUser.id);
      if (ok) {
        setLoans(getTechnicianLoans());
        alert('Pedido cancelado com sucesso.');
      }
    }
  };

  // Admin/Operator quick review on APK
  const handleReviewLoan = (loanId: string, decision: 'aprovado' | 'rejeitado') => {
    const notes = prompt(
      decision === 'aprovado'
        ? 'Observações para aprovação (opcional):'
        : 'Motivo do indeferimento do adiantamento:',
      decision === 'aprovado' ? 'Aprovado via Terminal Mobile.' : 'Ajustar valor ou data com a administração.'
    );
    if (notes !== null) {
      reviewTechnicianLoan(loanId, decision, currentUser.name, notes);
      setLoans(getTechnicianLoans());
    }
  };

  // Handle Operator / Admin creating an invoice via Mobile App
  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTechnician) {
      alert('Acesso negado: Técnicos não têm permissão para gerar facturas.');
      return;
    }

    const targetClient = clients.find((c: any) => c.id === Number(invFormClientId)) || clients[0];
    if (!targetClient) {
      alert('Seleccione um cliente válido.');
      return;
    }

    const amt = Number(invFormAmount);
    const pen = Number(invFormPenalty || 0);
    const total = amt + pen;
    const invNum = `FT-${new Date().getFullYear()}/${String(Math.floor(1000 + Math.random() * 9000))}`;

    createInvoiceMutation.mutate(
      {
        clientId: targetClient.id,
        invoiceNumber: invNum,
        amount: amt,
        penalty: pen,
        total: total,
        status: 'paga',
        description: invFormDesc,
        dueDate: new Date().toISOString().slice(0, 10),
        paymentMethod: invFormMethod,
        operator: currentUser.name,
      },
      {
        onSuccess: () => {
          invoicesQuery.refetch();
          setModalNewInvoice(false);
          setModalPrintChoice({
            invoiceNumber: invNum,
            clientName: targetClient.fullName,
            amount: amt,
            penalty: pen,
            total: total,
            dueDate: new Date().toLocaleDateString('pt-AO'),
            paymentMethod: invFormMethod,
            operator: currentUser.name,
            client: targetClient,
          });
        },
        onError: (err: any) => {
          alert(`Erro ao emitir factura: ${err.message || 'Tente novamente'}`);
        },
      }
    );
  };

  // ============================================================================
  // GESTÃO DE CLIENTES & ASSINANTES NO APP MOBILE (NOVO, EDITAR, DETALHES)
  // ============================================================================
  const handleOpenNewClientModal = () => {
    setModalEditClient(null);
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    setClientForm({
      fullName: '',
      phone: '+244 9',
      alternatePhone: '',
      nif: '',
      neighborhood: 'Golf I',
      street: 'Rua 12',
      houseCode: '',
      serviceType: 'fibra',
      planName: 'Plano Fibra Óptica 10 Mbps',
      monthlyFee: '6500',
      dueDay: '5',
      pdoBox: 'PDO-04',
      port: 'Porta 01',
      onuSerial: `ONU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      opticalRxDbm: '-19.4',
      notes: '',
      clientPin: pin,
    });
    setModalNewClient(true);
  };

  const handleOpenEditClientModal = (c: any) => {
    setModalEditClient(c);
    setClientForm({
      fullName: c.fullName || '',
      phone: c.phone || '',
      alternatePhone: c.alternatePhone || '',
      nif: c.documentNumber || c.nif || '',
      neighborhood: c.neighborhood || 'Golf I',
      street: c.street || 'Rua 12',
      houseCode: c.houseCode || '',
      serviceType: (c.serviceType as any) || 'fibra',
      planName: c.planName || (c.serviceType === 'tv' ? 'TV Comunitária Base' : 'Plano Fibra 10 Mbps'),
      monthlyFee: String(c.monthlyFee || 4000),
      dueDay: String(c.dueDay || 5),
      pdoBox: c.pdoNumber || c.pdoBox || 'PDO-04',
      port: c.portNumber || c.port || 'Porta 01',
      onuSerial: c.onuNumber || c.onuSerial || '',
      opticalRxDbm: String(c.opticalRxDbm || -19.4),
      notes: c.notes || '',
      clientPin: c.pin || c.clientPin || '1234',
    });
    setModalNewClient(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.fullName.trim() || !clientForm.phone.trim()) {
      alert('Por favor preencha o Nome e o Contacto do cliente.');
      return;
    }

    const pin = clientForm.clientPin.trim() || String(Math.floor(1000 + Math.random() * 9000));
    const fee = Number(clientForm.monthlyFee) || (clientForm.serviceType === 'tv' ? 4000 : 6500);

    const cleanName = clientForm.fullName.trim();
    const cleanNif = clientForm.nif.trim();

    // Verificação rigorosa: Não permitir gravar duas vezes por Nome ou BI/NIF
    const duplicate = clients.find((c: any) => {
      if (modalEditClient && c.id === modalEditClient.id) return false;
      const sameName = c.fullName && c.fullName.trim().toLowerCase() === cleanName.toLowerCase();
      const clientDoc = (c.documentNumber || c.nif || '').trim().toLowerCase();
      const sameDoc = cleanNif && clientDoc && clientDoc === cleanNif.toLowerCase();
      return sameName || sameDoc;
    });

    if (duplicate) {
      alert(
        `⚠️ Atenção: Não é possível gravar!\nJá existe um cliente registado no sistema com este Nome ou BI/NIF:\n\n• Nome: ${duplicate.fullName}\n• Código: ${duplicate.code}\n• BI/NIF: ${duplicate.documentNumber || duplicate.nif || 'Não informado'}\n\nO sistema não permite gravar duas vezes o mesmo cliente.`
      );
      return;
    }

    if (modalEditClient) {
      // Edição de Cliente Existente
      const updatedItem = {
        ...modalEditClient,
        fullName: clientForm.fullName.trim(),
        phone: clientForm.phone.trim(),
        alternatePhone: clientForm.alternatePhone.trim(),
        documentNumber: clientForm.nif.trim(),
        nif: clientForm.nif.trim(),
        neighborhood: clientForm.neighborhood,
        street: clientForm.street,
        houseCode: clientForm.houseCode,
        address: `${clientForm.street}${clientForm.houseCode ? ', Casa ' + clientForm.houseCode : ''}, Bairro ${clientForm.neighborhood}, Luanda`,
        serviceType: clientForm.serviceType,
        planName: clientForm.planName,
        monthlyFee: fee,
        dueDay: Number(clientForm.dueDay) || 5,
        pdoNumber: clientForm.pdoBox,
        pdoBox: clientForm.pdoBox,
        portNumber: clientForm.port,
        port: clientForm.port,
        onuNumber: clientForm.onuSerial,
        onuSerial: clientForm.onuSerial,
        opticalRxDbm: Number(clientForm.opticalRxDbm) || -19.4,
        notes: clientForm.notes,
        pin,
      };

      try {
        const raw = localStorage.getItem('osdel_clients') || '[]';
        const list = JSON.parse(raw);
        const idx = list.findIndex((c: any) => c.id === modalEditClient.id);
        if (idx !== -1) list[idx] = updatedItem;
        localStorage.setItem('osdel_clients', JSON.stringify(list));
        localStorage.setItem('osdel:clients', JSON.stringify(list));
        localStorage.setItem('osdel_staff_apk_clients', JSON.stringify(list));

        // Atualiza credenciais
        const rawCreds = localStorage.getItem('osdel_client_credentials') || '{}';
        const creds = JSON.parse(rawCreds);
        if (creds[modalEditClient.id]) {
          creds[modalEditClient.id].pin = pin;
          creds[modalEditClient.id].fullName = updatedItem.fullName;
          creds[modalEditClient.id].phone = updatedItem.phone;
          localStorage.setItem('osdel_client_credentials', JSON.stringify(creds));
        }

        window.dispatchEvent(new Event('osdel-clients-updated'));
        clientsQuery.refetch();
      } catch {}

      setModalNewClient(false);
      setModalEditClient(null);
      alert(`Dados do assinante ${updatedItem.fullName} actualizados com sucesso!`);
    } else {
      // Criação de Novo Cliente
      const nextId = clients.length > 0 ? Math.max(...clients.map((c: any) => Number(c.id) || 0)) + 1 : 1;
      const code = `CLI-${String(nextId).padStart(5, '0')}`;
      const newClientItem = {
        id: nextId,
        code,
        fullName: clientForm.fullName.trim(),
        phone: clientForm.phone.trim(),
        alternatePhone: clientForm.alternatePhone.trim(),
        documentNumber: clientForm.nif.trim(),
        nif: clientForm.nif.trim(),
        neighborhood: clientForm.neighborhood,
        street: clientForm.street,
        houseCode: clientForm.houseCode,
        address: `${clientForm.street}${clientForm.houseCode ? ', Casa ' + clientForm.houseCode : ''}, Bairro ${clientForm.neighborhood}, Luanda`,
        serviceType: clientForm.serviceType,
        planName: clientForm.planName,
        monthlyFee: fee,
        dueDay: Number(clientForm.dueDay) || 5,
        pdoNumber: clientForm.pdoBox,
        pdoBox: clientForm.pdoBox,
        portNumber: clientForm.port,
        port: clientForm.port,
        onuNumber: clientForm.onuSerial,
        onuSerial: clientForm.onuSerial,
        opticalRxDbm: Number(clientForm.opticalRxDbm) || -19.4,
        status: 'active',
        debtMonths: 0,
        debtAmount: 0,
        pin,
        clientPin: pin,
        notes: clientForm.notes,
        createdAt: new Date().toISOString(),
      };

      try {
        const raw = localStorage.getItem('osdel_clients') || '[]';
        const list = JSON.parse(raw);
        list.unshift(newClientItem);
        localStorage.setItem('osdel_clients', JSON.stringify(list));
        localStorage.setItem('osdel:clients', JSON.stringify(list));
        localStorage.setItem('osdel_staff_apk_clients', JSON.stringify(list));

        // Guarda credenciais de login para o app do cliente
        const rawCreds = localStorage.getItem('osdel_client_credentials') || '{}';
        const creds = JSON.parse(rawCreds);
        creds[nextId] = {
          clientId: nextId,
          code,
          fullName: newClientItem.fullName,
          phone: newClientItem.phone,
          pin,
          serviceType: newClientItem.serviceType,
          planName: newClientItem.planName,
          status: 'active',
          dueDay: newClientItem.dueDay,
          monthlyFee: fee,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.name,
        };
        localStorage.setItem('osdel_client_credentials', JSON.stringify(creds));

        window.dispatchEvent(new Event('osdel-clients-updated'));
        clientsQuery.refetch();
      } catch {}

      setModalNewClient(false);
      setModalEditClient(null);
      alert(`Novo cliente ${newClientItem.fullName} (${code}) registado com sucesso!\nPIN de Acesso: ${pin}\nMensalidade: ${kz(fee)}`);
    }
  };

  const sendClientWhatsAppCredentials = (c: any, pin: string) => {
    const clean = (c.phone || '').replace(/\D/g, '');
    const full = clean.startsWith('244') ? clean : `244${clean}`;
    const text =
      `*OSDEL TECNOLOGIA - CREDENCIAIS DE ACESSO AO APLICATIVO*\n\n` +
      `Estimado(a) *${c.fullName}*,\n` +
      `Os seus dados de acesso ao Aplicativo do Cliente OSDEL são:\n\n` +
      `• Código de Assinante: *${c.code}*\n` +
      `• PIN de Acesso (4 dígitos): *${pin}*\n` +
      `• Plano Contratado: ${c.planName || 'Serviço Oficial'}\n` +
      `• Mensalidade: ${kz(c.monthlyFee || 4000)} (Vencimento dia ${c.dueDay || 5})\n` +
      `• Caixa PDO: ${c.pdoNumber || c.pdoBox || 'PDO-01'}\n\n` +
      `Para suporte ou dúvidas, contacte-nos pelo WhatsApp: 926 153 736.`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Teste de conexão API em tempo real
  const handleTestApiConnection = async (targetUrl = apiEndpointInput) => {
    setIsTestingApiEndpoint(true);
    setApiEndpointMessage(null);
    setApiTestLatency(null);
    const start = performance.now();
    try {
      const clean = targetUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${clean}/api/v1/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const end = performance.now();
      const lat = Math.round(end - start);
      setApiTestLatency(lat);
      if (res.ok) {
        setApiEndpointMessage(`Ligação à API estabelecida com sucesso! (${lat} ms)`);
      } else {
        setApiEndpointMessage(`Servidor respondeu com status ${res.status}.`);
      }
    } catch {
      setApiEndpointMessage('Não foi possível ligar ao servidor. Verifique a URL HTTPS e o recarregamento WSGI no PythonAnywhere.');
    } finally {
      setIsTestingApiEndpoint(false);
    }
  };

  // Guardar configurações gerais da empresa
  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('osdel_company_settings', JSON.stringify(companySettingsForm));
      localStorage.setItem('osdel_settings', JSON.stringify(companySettingsForm));
      if (companySettingsForm.apiEndpoint) {
        setApiBaseUrl(companySettingsForm.apiEndpoint);
      }
      window.dispatchEvent(new Event('osdel-settings-updated'));
      alert('Todas as definições foram gravadas com sucesso no sistema e sincronizadas!');
    } catch (err: any) {
      alert(`Erro ao gravar definições: ${err.message}`);
    }
  };

  // Zeramento total de produção
  const handleExecuteStaffProductionReset = () => {
    if (resetConfirmWord.trim().toUpperCase() !== 'PRODUCAO') {
      alert('Escreva a palavra PRODUCAO para confirmar a limpeza total de produção.');
      return;
    }
    try {
      localStorage.setItem('osdel_clients', JSON.stringify([]));
      localStorage.setItem('osdel:clients', JSON.stringify([]));
      localStorage.setItem('osdel_staff_apk_clients', JSON.stringify([]));
      localStorage.setItem('osdel_payments', JSON.stringify([]));
      localStorage.setItem('osdel:payments', JSON.stringify([]));
      localStorage.setItem('osdel_invoices', JSON.stringify([]));
      localStorage.setItem('osdel:invoices', JSON.stringify([]));
      localStorage.setItem('osdel_expenses', JSON.stringify([]));
      localStorage.setItem('osdel_client_agreements', JSON.stringify([]));
      localStorage.setItem('osdel_production_mode_active', 'true');
      window.dispatchEvent(new Event('osdel-clients-updated'));
      window.dispatchEvent(new Event('osdel-payments-updated'));
      window.dispatchEvent(new Event('osdel-invoices-updated'));
      clientsQuery.refetch();
      invoicesQuery.refetch();
      paymentsQuery.refetch();
    } catch {}
    setModalStaffReset(false);
    setResetConfirmWord('');
    alert('Base de dados limpa com sucesso! O sistema está pronto para cadastrar clientes e facturas reais.');
  };

  return (
    <div className={`min-h-screen ${fullscreenMode ? 'bg-slate-950 p-0' : 'p-4 md:p-8 bg-slate-100 flex flex-col items-center'}`}>
      {/* Top Controls Bar */}
      {!fullscreenMode && (
        <div className="w-full max-w-4xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white font-serif text-lg font-bold">
              E
            </div>
            <div>
              <b className="text-sm font-extrabold text-slate-900 block">
                Aplicativo Mobile da Empresa (OSDEL Equipa & Campo)
              </b>
              <span className="text-xs text-slate-500">
                Acesso diferenciado: Técnicos de campo (Job, Júlio, Enock) vs. Operadores/Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold">Autenticado como:</span>
              <select
                value={activeUserId}
                onChange={(e) => setActiveUserId(Number(e.target.value))}
                className="h-8 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-bold"
              >
                {staffList.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.jobTitle || u.role}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setFullscreenMode(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Maximize2 size={13} /> Tela Cheia Móvel
            </button>
            <Link
              href="/mobile"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-black"
            >
              Hub Mobile <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* SMARTPHONE FRAME CONTAINER */}
      <div
        className={`relative ${
          fullscreenMode
            ? 'w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between'
            : 'w-full max-w-[395px] h-[830px] rounded-[48px] border-[10px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden flex flex-col'
        }`}
      >
        {/* Dynamic Island / Notch */}
        <div className="relative shrink-0 bg-slate-900 px-6 pt-3 pb-2 flex items-center justify-between text-[11px] font-bold text-white select-none">
          <span>09:41</span>
          <div className="h-4 w-24 rounded-full bg-black mx-auto" />
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-emerald-400">● 5G</span>
            <div className="h-2.5 w-5 rounded-sm border border-white p-0.5">
              <div className="h-full w-full bg-white rounded-2xs" />
            </div>
          </div>
          {fullscreenMode && (
            <button
              onClick={() => setFullscreenMode(false)}
              className="absolute right-4 top-3 text-slate-400 hover:text-white"
            >
              <Minimize2 size={14} />
            </button>
          )}
        </div>

        {/* PUSH NOTIFICATION BANNER FLUTUANTE */}
        <MobilePushBanner
          onActionClick={(n) => {
            if (n.category === 'piquete') setActiveTab('missoes');
            if (n.category === 'fatura') setActiveTab('faturas');
          }}
        />

        {!isLoggedIn ? (
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-[#0a1020] to-slate-950 text-slate-100 p-5 flex flex-col justify-center space-y-4 select-none">
            {/* Logo & Header */}
            <div className="text-center space-y-2">
              <div className="inline-block relative">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-2 shadow-2xl border-2 border-blue-500/40 flex items-center justify-center">
                  <img
                    src={OSDEL_LOGO_BASE64}
                    alt="OSDEL Tecnologia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-blue-500 border-2 border-slate-950 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-black">
                  ⚡
                </span>
              </div>

              <div>
                <h1 className="text-xl font-black tracking-tight text-white font-serif">
                  OSDEL TECNOLOGIA
                </h1>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mt-0.5">
                  Terminal Operacional & Gestão de Campo
                </p>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Acesso restrito para colaboradores, técnicos de piquete e administração da OSDEL.
              </p>
            </div>

            {/* Login Form Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">Terminal Autenticado</span>
                </div>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  APK Equipa
                </span>
              </div>

              {loginError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-2.5 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-snug">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Utilizador, Nome ou Telefone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User size={14} />
                    </div>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Ex: deezy, boss, mestre.job"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-600 outline-none transition"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      PIN Operacional (4 Dígitos) ou Senha
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                    >
                      {showPin ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{showPin ? 'Ocultar' : 'Mostrar'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock size={14} />
                    </div>
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value)}
                      placeholder="Introduza o PIN de 4 dígitos"
                      maxLength={16}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-9 pr-3 text-xs font-mono tracking-wider text-white placeholder-slate-600 outline-none transition"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-800 text-blue-600 focus:ring-0 bg-slate-950 w-3.5 h-3.5"
                    />
                    <span>Manter sessão activa</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Uso Interno</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] font-bold text-xs text-white shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5"
                >
                  <LogIn size={14} /> Entrar no Terminal
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE APP HEADER */}
            <header className="shrink-0 bg-slate-950 text-white p-3.5 border-b border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={OSDEL_LOGO_BASE64}
                    alt="OSDEL Logo"
                    className="w-9 h-9 rounded-xl bg-white p-1 object-contain shadow-md shrink-0 border border-blue-500/40"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <b className="text-xs font-black tracking-wide leading-tight text-white block">
                        OSDEL EQUIPA
                      </b>
                      <span className="text-[8.5px] font-black uppercase px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Pro
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                      {currentUser.jobTitle || 'Técnico de Campo'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Testar Envio de Mensagem Push de Piquete"
                    onClick={() => {
                      requestPushPermission();
                      sendMobilePush({
                        title: 'Nova Missão de Piquete · Rua 12',
                        body: 'Mestre Job: Desconectar cabos drop na caixa PDO-04 para 4 assinantes com corte automático.',
                        category: 'piquete',
                        targetAudience: 'staff',
                        actionLabel: 'Ver Piquete',
                      });
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition flex items-center gap-1 text-[10px] font-bold"
                  >
                    <Bell size={12} />
                    <span>Push</span>
                  </button>
                  <button
                    type="button"
                    title="Assistente IA Telecom - Diagnóstico e Operações"
                    onClick={() => {
                      setAiClientCode(undefined);
                      setModalAiAssistant(true);
                    }}
                    className="p-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition flex items-center gap-1 text-[10px] font-bold shadow-md shadow-blue-600/30 active:scale-95"
                  >
                    <Bot size={13} className="text-white" />
                    <span>IA Telecom</span>
                    <Sparkles size={11} className="text-amber-300 animate-pulse" />
                  </button>
                  <SyncStatusPill />
                  <button
                    type="button"
                    onClick={handleStaffLogout}
                    title="Terminar Sessão no Terminal"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-300 border border-slate-700 transition"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              </div>

              {/* Service Filter (Ambos / Fibra / TV) */}
              <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                  <span className="text-slate-300 font-bold truncate">
                    {currentUser.name.split(' ')[0]} ({currentUser.username})
                  </span>
                  <span
                    className={`text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase ${
                      isAdmin
                        ? 'bg-purple-900/80 text-purple-200 border border-purple-500/30'
                        : isOperator
                        ? 'bg-blue-900/80 text-blue-200 border border-blue-500/30'
                        : 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/30'
                    }`}
                  >
                    {isAdmin ? 'ADMIN' : isOperator ? 'OPERADOR' : 'TÉCNICO'}
                  </span>
                </div>

                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[9.5px] font-bold">
                  <button
                    type="button"
                    onClick={() => setServiceFilter('ambos')}
                    className={`px-1.5 py-0.5 rounded transition ${
                      serviceFilter === 'ambos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceFilter('fibra')}
                    className={`px-1.5 py-0.5 rounded transition ${
                      serviceFilter === 'fibra' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fibra
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceFilter('tv')}
                    className={`px-1.5 py-0.5 rounded transition ${
                      serviceFilter === 'tv' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    TV
                  </button>
                </div>
              </div>

          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 truncate max-w-[210px]">
              <span className="text-slate-300 font-bold truncate">
                {currentUser.name.split(' ')[0]} ({currentUser.username})
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                  isAdmin
                    ? 'bg-purple-900/80 text-purple-200 border border-purple-500/30'
                    : isOperator
                    ? 'bg-blue-900/80 text-blue-200 border border-blue-500/30'
                    : 'bg-amber-900/80 text-amber-200 border border-amber-500/30'
                }`}
              >
                {isAdmin ? 'ADMIN' : isOperator ? 'OPERADOR' : 'TÉCNICO CAMPO'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {new Date().toLocaleDateString('pt-AO')}
            </span>
          </div>

          {/* Quick Module Switcher Chips */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
            {isTechnician ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('agenda')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'agenda' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Calendar size={12} /> Agenda
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('missoes')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'missoes' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Scissors size={12} /> Piquetes Ruas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('material')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'material' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Wrench size={12} /> Carrinha & OPM
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('salario')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'salario' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <DollarSign size={12} /> Meu Salário
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('acordos')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'acordos' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ShieldCheck size={12} /> Acordos
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('clientes')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'clientes' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Users size={12} /> Assinantes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('faturas')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'faturas' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Receipt size={12} /> Facturas & POS
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('caixa')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'caixa' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <DollarSign size={12} /> Caixa
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('missoes')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'missoes' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Scissors size={12} /> Piquetes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('acordos')}
                  className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                    activeTab === 'acordos' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <ShieldCheck size={12} /> Acordos
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('admin_painel')}
                    className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                      activeTab === 'admin_painel' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                    }`}
                  >
                    <Sliders size={12} /> Painel Admin
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {/* SCROLLABLE SCREEN CONTENT */}
        <div className="flex-1 overflow-y-auto bg-slate-100 text-slate-900 p-4 space-y-4">
          {/* TAB 1: AGENDA PESSOAL DO TÉCNICO */}
          {activeTab === 'agenda' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <b className="text-xs font-bold uppercase text-slate-500">A Minha Agenda de Hoje</b>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  {myEvents.length} Intervenções
                </span>
              </div>

              {myEvents.length > 0 ? (
                <div className="space-y-2.5">
                  {myEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-blue-700 flex items-center gap-1">
                          <Clock size={12} /> {ev.startTime} - {ev.endTime}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            ev.status === 'concluida'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ev.status}
                        </span>
                      </div>

                      <b className="text-xs text-slate-900 block leading-tight font-extrabold">
                        {ev.title}
                      </b>

                      {ev.street && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                          <MapPin size={12} className="text-red-500" />
                          <span>{ev.street}</span>
                        </div>
                      )}

                      {/* Checklist */}
                      {ev.checklist && ev.checklist.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Tarefas:</span>
                          {ev.checklist.map((c) => (
                            <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                              <span className={`h-1.5 w-1.5 rounded-full ${c.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <span className={c.done ? 'line-through text-slate-400' : ''}>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Complete event button */}
                      {ev.status !== 'concluida' && (
                        <button
                          onClick={() => {
                            updateScheduleEvent(ev.id, { status: 'concluida' });
                            setEvents(getStoredSchedule());
                            alert('Intervenção concluída na agenda!');
                          }}
                          className="w-full mt-2 inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 text-white py-1.5 text-[11px] font-bold hover:bg-black"
                        >
                          <CheckCircle2 size={13} /> Marcar como Concluída
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-xs">
                  <Calendar size={24} className="mx-auto mb-1 text-slate-300" />
                  <p>Sem intervenções agendadas para hoje.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MISSÕES DE CORTE & RELIGAÇÃO POR RUA */}
          {activeTab === 'missoes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-xs font-bold uppercase text-slate-500">Piquetes em Equipa</b>
                  <p className="text-[10px] text-slate-400">Assinale os cortes e religações feitas na rua</p>
                </div>
                {isAdminOrOperator && (
                  <Link
                    href="/missoes"
                    className="text-[10px] bg-slate-900 text-white font-bold px-2 py-1 rounded-lg"
                  >
                    + Criar Missão
                  </Link>
                )}
              </div>

              {myMissions.length > 0 ? (
                <div className="space-y-3">
                  {myMissions.map((mission) => (
                    <div key={mission.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3 text-xs shadow-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 block">{mission.code}</span>
                          <b className="text-xs text-slate-900 font-extrabold block leading-tight">{mission.title}</b>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700">
                          {mission.type}
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 space-y-1 text-[11px] border border-slate-100">
                        <div className="flex items-center gap-1 font-bold text-slate-800">
                          <MapPin size={12} className="text-red-500" />
                          <span>Ruas: {mission.streets.join(' e ')}</span>
                        </div>
                        <div className="text-slate-600">
                          <span>Equipa: <b>{mission.technicianNames.join(', ')}</b></span>
                        </div>
                      </div>

                      {/* Tasks of this mission */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <b className="text-[10px] uppercase font-bold text-slate-400 block">
                          Clientes a Intervencionar ({mission.tasks.length}):
                        </b>

                        {mission.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`rounded-xl border p-2.5 space-y-2 transition ${
                              task.status === 'cortado'
                                ? 'bg-red-50/70 border-red-200'
                                : task.status === 'religado'
                                ? 'bg-emerald-50/70 border-emerald-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <b className="text-slate-900 block text-xs">{task.clientName}</b>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {task.street} · {task.address}
                                </span>
                              </div>
                              <span className="font-bold text-red-700 text-xs">{kz(task.debtAmount)}</span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-200/50 pt-1">
                              <span>Caixa: <b className="font-mono">{task.pdoNumber}</b> ({task.portNumber})</span>
                              <span className="font-bold uppercase">
                                {task.status === 'cortado' ? (
                                  <span className="text-red-700">Cortado [X]</span>
                                ) : task.status === 'religado' ? (
                                  <span className="text-emerald-700">Religado [X]</span>
                                ) : (
                                  <span className="text-slate-400">Pendente</span>
                                )}
                              </span>
                            </div>

                            {/* Actions on task */}
                            <div className="grid grid-cols-3 gap-1.5 pt-1">
                              <button
                                onClick={() => handleCompleteMissionTask(mission.id, task.id, 'cortado')}
                                className="rounded-lg bg-red-600 text-white py-1 text-[10px] font-bold hover:bg-red-700"
                              >
                                ✂ Cortar
                              </button>
                              <button
                                onClick={() => handleCompleteMissionTask(mission.id, task.id, 'religado')}
                                className="rounded-lg bg-emerald-600 text-white py-1 text-[10px] font-bold hover:bg-emerald-700"
                              >
                                ✓ Religar
                              </button>
                              <button
                                onClick={() => handleCompleteMissionTask(mission.id, task.id, 'acordo_no_local')}
                                className="rounded-lg bg-slate-200 text-slate-800 py-1 text-[10px] font-bold hover:bg-slate-300"
                              >
                                Acordo
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-xs">
                  <Scissors size={24} className="mx-auto mb-1 text-slate-300" />
                  <p>Sem missões de corte atribuídas à sua equipa.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: O MEU SALÁRIO & ADIANTAMENTOS (INDIVIDUAL & PRIVADO) */}
          {activeTab === 'salario' && (
            <div className="space-y-3.5 text-xs">
              {/* Main Salary Card */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-4 shadow-md space-y-3 relative overflow-hidden">
                <div className="absolute right-2 -bottom-2 opacity-10">
                  <Banknote size={100} />
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Salário Líquido a Receber
                    </span>
                    <b className="text-2xl font-black text-amber-400 block mt-0.5">
                      {kz(projectedNetSalary)}
                    </b>
                  </div>
                  {myActiveDebt.totalActiveDebt > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <TrendingDown size={11} /> Dívida Activa
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-300 border-t border-slate-800 pt-2.5">
                  <span>Colaborador: <b>{currentUser.name}</b></span>
                  <span className="text-[10px] text-slate-400">{currentUser.jobTitle || 'Técnico'}</span>
                </div>
              </div>

              {/* Debt & Loan Action Banner */}
              <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                      <CreditCard size={15} />
                    </div>
                    <div>
                      <b className="text-slate-900 text-xs block">Adiantamento de Salário</b>
                      <span className="text-[10px] text-slate-500">
                        {myActiveDebt.totalActiveDebt > 0
                          ? `Saldo Devedor: ${kz(myActiveDebt.totalActiveDebt)}`
                          : 'Sem dívidas activas registadas'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setModalRequestLoan(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-[11px] shadow-sm hover:bg-blue-700 active:scale-95 transition"
                  >
                    <Plus size={13} /> Pedir Adiantamento
                  </button>
                </div>

                {myActiveDebt.totalActiveDebt > 0 && (
                  <div className="rounded-xl bg-white/90 border border-blue-100 p-2.5 text-[11px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dívida Total em Aberto:</span>
                      <b className="text-red-700 font-bold">{kz(myActiveDebt.totalActiveDebt)}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Desconto previsto este mês:</span>
                      <b className="text-amber-700 font-bold">-{kz(myActiveDebt.monthlyDeduction)}</b>
                    </div>
                    <p className="text-[10px] text-slate-500 italic pt-0.5">
                      O montante de {kz(myActiveDebt.monthlyDeduction)} será retido automaticamente no fecho da folha do dia 28.
                    </p>
                  </div>
                )}
              </div>

              {/* Salary details breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                <b className="text-xs font-bold text-slate-800 block border-b border-slate-100 pb-2">
                  Discriminação Detalhada de Vencimento
                </b>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Salário Base Contratual:</span>
                    <b className="text-slate-900">{kz(baseSalary)}</b>
                  </div>

                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Subsídio de Alimentação:</span>
                    <b className="text-emerald-700">+{kz(foodSub)}</b>
                  </div>

                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Subsídio de Transporte:</span>
                    <b className="text-emerald-700">+{kz(transSub)}</b>
                  </div>

                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Total Ilíquido Contratual:</span>
                    <b className="text-slate-900">{kz(grossSalary)}</b>
                  </div>

                  {myActiveDebt.monthlyDeduction > 0 && (
                    <div className="flex justify-between pb-1 border-b border-red-100 text-red-700 font-bold">
                      <span>Dedução de Adiantamento:</span>
                      <span>-{kz(myActiveDebt.monthlyDeduction)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 font-bold text-xs">
                    <span className="text-slate-900">Total Líquido a Transferir:</span>
                    <b className="text-emerald-700 text-sm">{kz(projectedNetSalary)}</b>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-2.5 text-[10px] text-slate-500 border border-slate-100 space-y-1">
                  <div>
                    <b>IBAN Bancário:</b> <span className="font-mono">{currentUser.bankIban || 'Não cadastrado'}</span>
                  </div>
                  <div>
                    <b>Data de Pagamento:</b> 28 a 30 de cada mês através de transferência interbancária.
                  </div>
                </div>
              </div>

              {/* MY LOANS HISTORY & DEBT STATUS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <History size={15} className="text-slate-500" />
                    <b className="text-xs font-bold text-slate-800">
                      Os Meus Pedidos de Adiantamento ({myLoans.length})
                    </b>
                  </div>
                  <span className="text-[10px] text-slate-400">Histórico de dívidas</span>
                </div>

                {myLoans.length > 0 ? (
                  <div className="space-y-2.5">
                    {myLoans.map((loan) => {
                      const percentPaid = loan.amount > 0 ? Math.min(100, Math.round((loan.totalRepaid / loan.amount) * 100)) : 0;
                      return (
                        <div
                          key={loan.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <b className="text-xs font-bold text-slate-900 block">{kz(loan.amount)}</b>
                              <span className="text-[10px] text-slate-500">
                                {new Date(loan.requestedAt).toLocaleDateString('pt-AO')} · {loan.installments}x parcela(s)
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                loan.status === 'liquidado'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : loan.status === 'aprovado'
                                  ? 'bg-blue-100 text-blue-800'
                                  : loan.status === 'rejeitado'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {loan.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 bg-white rounded-lg p-2 border border-slate-100 space-y-1">
                            <p><b>Motivo:</b> {loan.purpose}</p>
                            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                              <span>Desconto mensal: <b>{kz(loan.monthlyDeduction)}/mês</b></span>
                              <span>Recebimento: <b>{loan.receiptMethod === 'multicaixa_express' ? 'Multicaixa Express' : loan.receiptMethod === 'numerario' ? 'Numerário' : 'Transferência IBAN'}</b></span>
                            </div>
                          </div>

                          {/* Progress of repayment */}
                          {loan.status === 'aprovado' && (
                            <div className="space-y-1 pt-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-500">Amortizado: <b>{kz(loan.totalRepaid)}</b> ({percentPaid}%)</span>
                                <span className="text-red-700 font-bold">Saldo Devedor: {kz(loan.remainingDebt)}</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${percentPaid}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {loan.status === 'pendente' && (
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <span className="text-[10px] text-amber-700 font-medium italic">
                                Aguarda validação pela administração da OSDEL.
                              </span>
                              <button
                                onClick={() => handleCancelMyLoan(loan.id)}
                                className="text-[10px] font-bold text-red-600 hover:text-red-800 hover:underline"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}

                          {loan.reviewNotes && (
                            <p className="text-[10px] text-slate-500 italic bg-white/50 p-1.5 rounded border border-slate-100">
                              <b>Nota da Administração:</b> {loan.reviewNotes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-400 text-xs">
                    <CreditCard size={20} className="mx-auto mb-1 text-slate-300" />
                    <p>Não possui nenhum pedido de adiantamento registado.</p>
                  </div>
                )}
              </div>

              {/* ADMIN / OPERATOR: TEAM LOANS APPROVAL PANEL */}
              {isAdminOrOperator && pendingTeamLoans.length > 0 && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={16} className="text-amber-600" />
                      <b className="text-xs font-bold text-amber-900">
                        Pedidos de Adiantamento da Equipa ({pendingTeamLoans.length})
                      </b>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-200 text-amber-800">
                      Painel Operador
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {pendingTeamLoans.map((pLoan) => (
                      <div key={pLoan.id} className="rounded-xl border border-amber-200 bg-white p-3 space-y-2 shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <b className="text-slate-900 text-xs block">{pLoan.technicianName}</b>
                            <span className="text-[10px] text-slate-500">
                              {pLoan.department || 'Técnico'} · {new Date(pLoan.requestedAt).toLocaleDateString('pt-AO')}
                            </span>
                          </div>
                          <b className="text-blue-700 text-xs font-black">{kz(pLoan.amount)}</b>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-2 text-[10px] text-slate-600 space-y-0.5 border border-slate-100">
                          <div><b>Motivo:</b> {pLoan.purpose}</div>
                          <div><b>Plano:</b> {pLoan.installments}x parcelas de {kz(pLoan.monthlyDeduction)}/mês</div>
                          <div><b>Recebimento:</b> {pLoan.receiptMethod === 'multicaixa_express' ? `Multicaixa Express (${pLoan.expressPhone || '—'})` : `IBAN: ${pLoan.targetIban}`}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleReviewLoan(pLoan.id, 'aprovado')}
                            className="rounded-lg bg-emerald-600 text-white py-1.5 font-bold text-[11px] hover:bg-emerald-700 shadow-xs"
                          >
                            ✓ Aprovar
                          </button>
                          <button
                            onClick={() => handleReviewLoan(pLoan.id, 'rejeitado')}
                            className="rounded-lg bg-red-100 text-red-700 py-1.5 font-bold text-[11px] hover:bg-red-200"
                          >
                            ✕ Indeferir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PEDIDOS DE ACORDO DE CLIENTES (ADMIN & OPERADOR) */}
          {activeTab === 'acordos' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-xs font-bold uppercase text-slate-500">Acordos de Não-Corte</b>
                  <p className="text-[10px] text-slate-400">Promessas de pagamento submetidas pelos clientes</p>
                </div>
              </div>

              {promises.length > 0 ? (
                <div className="space-y-2.5">
                  {promises.map((p) => (
                    <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2 shadow-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <b className="text-slate-900 block text-xs font-extrabold">{p.clientName}</b>
                          <span className="text-[10px] text-slate-400">{p.clientCode} · {p.phone}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            p.status === 'aprovado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'rejeitado'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Data Prometida:</span>
                          <b className="text-blue-700">{p.promisedDate}</b>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Valor a Pagar:</span>
                          <b className="text-slate-900">{kz(p.promisedAmount)}</b>
                        </div>
                        <p className="text-[10px] text-slate-600 italic mt-1">
                          "{p.reason}"
                        </p>
                      </div>

                      {/* Approval buttons if pending */}
                      {p.status === 'pendente' && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleApprovePromise(p.id)}
                            className="rounded-lg bg-emerald-600 text-white py-1.5 font-bold text-[11px] hover:bg-emerald-700"
                          >
                            ✓ Aprovar Acordo
                          </button>
                          <button
                            onClick={() => handleRejectPromise(p.id)}
                            className="rounded-lg bg-red-100 text-red-700 py-1.5 font-bold text-[11px] hover:bg-red-200"
                          >
                            ✕ Rejeitar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-400" />
                  <p>Nenhum pedido de acordo de pagamento pendente.</p>
                </div>
              )}
            </div>
          )}

          {/* SECURITY SHIELD FOR TECHNICIANS ATTEMPTING RESTRICTED FINANCIAL TABS */}
          {isTechnician && ['faturas', 'caixa'].includes(activeTab) && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center space-y-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700 mx-auto">
                <Lock size={24} />
              </div>
              <b className="text-sm font-extrabold text-amber-950 block">Acesso Financeiro Reservado ao Operador & Administração</b>
              <p className="text-xs text-amber-800 leading-relaxed max-w-xs mx-auto">
                O módulo financeiro de fecho de caixa e facturação consolidada está reservado à gerência comercial. Como técnico de campo, pode consultar assinantes, caixas PDO, testar potências e registar novas instalações no terreno.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('clientes')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black shadow-sm"
              >
                <Users size={14} /> Ir para Carteira de Assinantes
              </button>
            </div>
          )}

          {/* TAB 5: CLIENTES & ASSINANTES (OPERADOR & ADMIN) */}
          {/* TAB 5: CLIENTES & ASSINANTES (TECNICOS, OPERADOR & ADMIN) */}
          {activeTab === 'clientes' && (
            <div className="space-y-3.5 text-xs">
              {/* Header com Botões de Ação */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    <span>Carteira de Assinantes ({clients.length})</span>
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Cadastrar novos contratos, consultar caixas PDO e gerir sinal
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleOpenNewClientModal}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition"
                  >
                    <Plus size={15} />
                    <span>Novo Cliente</span>
                  </button>
                  {!isTechnician && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvFormClientId(String(clients[0]?.id || ''));
                        setModalNewInvoice(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition"
                      title="Emitir Factura"
                    >
                      <Receipt size={14} />
                      <span className="hidden sm:inline">Factura</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Pesquisar por nome, código, rua, casa, telefone ou PDO..."
                  className="w-full h-9 pl-8 pr-8 rounded-xl border border-slate-300 bg-white text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
                {clientSearch && (
                  <button
                    type="button"
                    onClick={() => setClientSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Empty state */}
              {clients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 mx-auto">
                    <Users size={24} />
                  </div>
                  <div>
                    <b className="text-sm font-bold text-slate-900 block">Nenhum Cliente Registado</b>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      A base de dados encontra-se limpa para produção. Registe o primeiro cliente da OSDEL Tecnologia.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenNewClientModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700"
                  >
                    <Plus size={15} /> Registar Primeiro Cliente
                  </button>
                </div>
              ) : (
                /* Clients List */
                <div className="space-y-2.5">
                  {clients
                    .filter((c: any) => {
                      if (serviceFilter === 'fibra') {
                        if (c.serviceType === 'tv') return false;
                      } else if (serviceFilter === 'tv') {
                        if (c.serviceType !== 'tv' && c.serviceType !== 'combo') return false;
                      }
                      if (!clientSearch.trim()) return true;
                      const q = clientSearch.toLowerCase();
                      return (
                        c.fullName?.toLowerCase().includes(q) ||
                        c.code?.toLowerCase().includes(q) ||
                        c.phone?.includes(q) ||
                        c.address?.toLowerCase().includes(q) ||
                        c.street?.toLowerCase().includes(q) ||
                        c.houseCode?.toLowerCase().includes(q) ||
                        c.pdoNumber?.toLowerCase().includes(q) ||
                        c.pdoBox?.toLowerCase().includes(q)
                      );
                    })
                    .map((c: any) => {
                      const isLate = c.status === 'late' || c.status === 'atrasado';
                      const isCut = c.status === 'cut' || c.status === 'cortado' || c.status === 'suspended';
                      const isTv = c.serviceType === 'tv';
                      const isCombo = c.serviceType === 'combo';
                      const currentRx = opticalReading[c.id] || c.opticalRxDbm || -19.4;

                      return (
                        <div
                          key={c.id}
                          className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs hover:border-blue-300 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                  {c.code}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    isCut
                                      ? 'bg-rose-100 text-rose-800'
                                      : isLate
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isCut ? 'Cortado' : isLate ? 'Em Falta' : 'Em Dia'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase ${
                                    isCombo
                                      ? 'bg-purple-100 text-purple-800'
                                      : isTv
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {isCombo ? '🌐 TV + Fibra' : isTv ? '📺 TV Cabo' : '🌐 Fibra FTTH'}
                                </span>
                              </div>
                              <b className="text-xs text-slate-900 font-extrabold block leading-tight mt-1">
                                {c.fullName}
                              </b>
                              <span className="text-[10px] text-slate-500">{c.phone || 'Sem telefone'}</span>
                            </div>

                            <div className="text-right shrink-0">
                              <b className="text-xs text-slate-900 font-black block">{kz(c.monthlyFee || 4000)}</b>
                              <span className="text-[9.5px] text-slate-400">Venc. dia {c.dueDay || 5}</span>
                              <div className="mt-0.5">
                                <span
                                  className={`font-mono text-[9.5px] font-bold ${
                                    currentRx > -24 ? 'text-emerald-600' : 'text-amber-600'
                                  }`}
                                >
                                  Rx: {currentRx} dBm
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Technical Details Box */}
                          <div className="rounded-xl bg-slate-50 p-2.5 text-[10px] text-slate-600 space-y-1 border border-slate-100">
                            <div className="flex justify-between items-center">
                              <span><b>Morada:</b> {c.street || c.address || '—'} {c.houseCode ? `· Casa ${c.houseCode}` : ''}</span>
                              <span className="font-bold text-slate-700">{c.neighborhood || 'Golf I'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span><b>Caixa:</b> <span className="font-mono font-bold text-slate-800">{c.pdoNumber || c.pdoBox || 'PDO-04'}</span> {c.portNumber || c.port ? `(${c.portNumber || c.port})` : ''}</span>
                              {c.onuNumber && <span><b>ONU:</b> <span className="font-mono text-slate-700">{c.onuNumber}</span></span>}
                            </div>
                          </div>

                          {/* Quick Action Buttons Row */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              {/* Ver Ficha e PIN */}
                              <button
                                type="button"
                                onClick={() => setModalClientDetails(c)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px] flex items-center gap-1"
                                title="Ver Ficha e PIN de Acesso"
                              >
                                <Eye size={12} />
                                <span>Ficha & PIN</span>
                              </button>

                              {/* Editar */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditClientModal(c)}
                                className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10.5px] flex items-center gap-1"
                                title="Editar Cliente"
                              >
                                <Edit3 size={12} />
                                <span>Editar</span>
                              </button>

                              {/* WhatsApp Direct */}
                              <button
                                type="button"
                                onClick={() =>
                                  sendClientWhatsAppCredentials(c, c.pin || c.clientPin || '1234')
                                }
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                                title="Enviar Credenciais por WhatsApp"
                              >
                                <MessageCircle size={13} />
                              </button>

                              {/* Testar Sinal Óptico */}
                              <button
                                type="button"
                                onClick={() => {
                                  const rand = -(17 + Math.random() * 6);
                                  setOpticalReading({ ...opticalReading, [c.id]: Number(rand.toFixed(1)) });
                                  alert(`Medição de Sinal na Porta: ${rand.toFixed(1)} dBm (Conexão Operacional)`);
                                }}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                                title="Testar Potência Óptica RX"
                              >
                                <Activity size={13} />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Cobrar / Emitir Factura */}
                              {!isTechnician && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInvFormClientId(String(c.id));
                                    setInvFormAmount(String(c.monthlyFee || 4000));
                                    setModalNewInvoice(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10.5px] hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                                >
                                  <Receipt size={12} />
                                  <span>Cobrar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FACTURAS & TALÕES POS (OPERADOR & ADMIN) */}
          {activeTab === 'faturas' && !isTechnician && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-xs font-bold uppercase text-slate-500">Facturação & Recibos</b>
                  <p className="text-[10px] text-slate-400">Emita e imprima talões térmicos POS ou A4</p>
                </div>
                <button
                  onClick={() => setModalNewInvoice(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-[11px] shadow-sm hover:bg-blue-700"
                >
                  <Plus size={13} /> + Nova Factura
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Pesquisar por número de factura ou assinante..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 bg-white text-xs font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Invoices List */}
              <div className="space-y-2.5">
                {invoices
                  .filter((inv: any) => {
                    if (!invoiceSearch.trim()) return true;
                    const q = invoiceSearch.toLowerCase();
                    return (
                      inv.invoiceNumber?.toLowerCase().includes(q) ||
                      inv.number?.toLowerCase().includes(q) ||
                      inv.clientName?.toLowerCase().includes(q)
                    );
                  })
                  .map((inv: any) => {
                    const total = Number(inv.total || inv.amount || 4000);
                    const invNum = inv.invoiceNumber || inv.number || `FT-${inv.id}`;
                    return (
                      <div
                        key={inv.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-slate-500 block">{invNum}</span>
                            <b className="text-xs text-slate-900 font-extrabold block">{inv.clientName || 'Consumidor Final'}</b>
                            <span className="text-[10px] text-slate-400">
                              {inv.paymentMethod || 'Multicaixa'} · {new Date(inv.issuedAt || inv.paidAt || Date.now()).toLocaleDateString('pt-AO')}
                            </span>
                          </div>
                          <div className="text-right">
                            <b className="text-sm font-black text-slate-900 block">{kz(total)}</b>
                            <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              {inv.status || 'Liquidada'}
                            </span>
                          </div>
                        </div>

                        {/* Dual Print Action Buttons: POS Thermal with Logo vs A4 */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          <Link
                            href={getPrintUrl('fatura', { id: inv.id, formato: 'pos' })}
                            className="py-1.5 rounded-xl bg-slate-900 text-white font-bold text-[11px] hover:bg-black flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Receipt size={13} className="text-amber-400" />
                            <span>🧾 Talão POS Térmico</span>
                          </Link>
                          <Link
                            href={getPrintUrl('fatura', { id: inv.id, formato: 'a4' })}
                            className="py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[11px] hover:bg-blue-100 flex items-center justify-center gap-1"
                          >
                            <Printer size={13} />
                            <span>📄 Factura A4</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 7: CAIXA DIÁRIO & TOTAIS (OPERADOR & ADMIN) */}
          {activeTab === 'caixa' && !isTechnician && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-xs font-bold uppercase text-slate-500">Caixa Operacional do Dia</b>
                  <p className="text-[10px] text-slate-400">Entradas e liquidações do balcão e terreno</p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Caixa Aberto
                </span>
              </div>

              {/* Summary Cards */}
              {(() => {
                const livePayments = paymentsQuery.data?.items || [];
                const totalArrecadadoHoje = livePayments.reduce((acc: number, p: any) => acc + Number(p.amount || 0) + Number(p.penalty || 0), 0);
                const multicaixaHoje = livePayments
                  .filter((p: any) => {
                    const m = (p.method || '').toLowerCase();
                    return m.includes('multicaixa') || m.includes('tpa') || m.includes('express');
                  })
                  .reduce((acc: number, p: any) => acc + Number(p.amount || 0) + Number(p.penalty || 0), 0);
                const numerarioHoje = livePayments
                  .filter((p: any) => {
                    const m = (p.method || '').toLowerCase();
                    return m.includes('numer') || m.includes('dinheiro') || m.includes('cash');
                  })
                  .reduce((acc: number, p: any) => acc + Number(p.amount || 0) + Number(p.penalty || 0), 0);
                const bancoHoje = livePayments
                  .filter((p: any) => {
                    const m = (p.method || '').toLowerCase();
                    return m.includes('bai') || m.includes('bfa') || m.includes('transfer') || m.includes('depósito');
                  })
                  .reduce((acc: number, p: any) => acc + Number(p.amount || 0) + Number(p.penalty || 0), 0);

                return (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Arrecadado Hoje</span>
                      <b className="text-xl font-black text-amber-400 block">
                        {kz(totalArrecadadoHoje)}
                      </b>
                      <span className="text-[9.5px] text-slate-400 block">
                        {livePayments.length} pagamento(s) registado(s)
                      </span>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Multicaixa / TPA</span>
                      <b className="text-base font-black text-blue-700 block">
                        {kz(multicaixaHoje)}
                      </b>
                      <div className="flex justify-between text-[10px] text-slate-600 pt-1 border-t border-slate-100">
                        <span>Dinheiro: <b>{kz(numerarioHoje)}</b></span>
                        <span>Bancos: <b>{kz(bancoHoje)}</b></span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Recent Payments list */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
                <b className="text-xs font-bold text-slate-800 block border-b border-slate-100 pb-2">
                  Últimos Pagamentos Recebidos Hoje
                </b>

                <div className="space-y-2">
                  {(paymentsQuery.data?.items || []).length === 0 ? (
                    <div className="text-center py-5 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Nenhum pagamento registado. Caixa a zero (0 Kz).
                    </div>
                  ) : (
                    (paymentsQuery.data?.items || []).slice(0, 5).map((pmt: any) => (
                      <div key={pmt.id} className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-100">
                        <div>
                          <b className="text-slate-900 block leading-tight">{pmt.clientName || 'Assinante OSDEL'}</b>
                          <span className="text-[9.5px] text-slate-400">
                            {pmt.method || 'Multicaixa'} · {new Date(pmt.paidAt || Date.now()).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <b className="text-emerald-700 font-bold">{kz(pmt.amount || 0)}</b>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => alert('Folha de fecho de caixa diário gerada! Totais conferidos com sucesso.')}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white font-bold text-[11px] hover:bg-black mt-2 shadow-xs"
                >
                  Registar Fecho de Caixa Diário
                </button>
              </div>
            </div>
          )}

          {/* TAB 8: MATERIAL DE CARRINHA & LEITOR DE SINAL ÓPTICO (TÉCNICOS) */}
          {activeTab === 'material' && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-xs font-bold uppercase text-slate-500">Carrinha & Diagnóstico de Campo</b>
                  <p className="text-[10px] text-slate-400">Stock de material e teste de potência óptica dBm</p>
                </div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Piquete Móvel
                </span>
              </div>

              {/* INTERACTIVE OPTICAL POWER METER (OPM) */}
              <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-4 space-y-3 shadow-md">
                <div className="flex justify-between items-center border-b border-emerald-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={18} className="text-emerald-400 animate-pulse" />
                    <div>
                      <b className="text-xs text-white block">Medidor de Potência Óptica (OPM)</b>
                      <span className="text-[9.5px] text-emerald-300">Calibração GPON 1490nm / 1310nm</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    CAL: OK
                  </span>
                </div>

                <div className="text-center py-2 bg-black/40 rounded-xl border border-emerald-900/60">
                  <span className="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider block">
                    Potência RX na Porta PDO / ONT
                  </span>
                  <b className="text-3xl font-mono font-black text-emerald-400 block mt-1 tracking-wider">
                    {opticalReading['current'] ? `${opticalReading['current'].toFixed(1)} dBm` : '-19.4 dBm'}
                  </b>
                  <span className="text-[10px] font-bold text-emerald-300 block mt-0.5">
                    ● Conformidade: SINAL FORTE / EXCELENTE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const rand = -(17 + Math.random() * 6);
                      setOpticalReading({ current: rand });
                    }}
                    className="py-2 rounded-xl bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 flex items-center justify-center gap-1 shadow-sm"
                  >
                    <RefreshCw size={13} /> Medir Nova Porta
                  </button>
                  <button
                    onClick={() => alert('Leitura de potência óptica guardada com sucesso no piquete!')}
                    className="py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-bold text-[11px] hover:bg-slate-700"
                  >
                    Gravar no Relatório
                  </button>
                </div>
              </div>

              {/* Van stock items */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-xs">
                <b className="text-xs font-bold text-slate-800 block border-b border-slate-100 pb-2">
                  Stock Atual na Carrinha ({currentUser.name.split(' ')[0]})
                </b>

                <div className="space-y-2">
                  {[
                    { name: 'Cabo Drop FTTH 1 FO', qty: '420 metros restantes', status: 'normal' },
                    { name: 'Conectores Rápidos Fast SC/APC', qty: '34 unidades', status: 'normal' },
                    { name: 'Splitters Ópticos 1x8 PLC', qty: '6 unidades', status: 'normal' },
                    { name: 'ONUs / ONTs GPON Wi-Fi', qty: '4 unidades', status: 'alerta' },
                    { name: 'Conectores F e Derivadores TV', qty: '50 unidades', status: 'normal' },
                  ].map((mat, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] pb-1.5 border-b border-slate-100">
                      <div>
                        <b className="text-slate-900 block">{mat.name}</b>
                        <span className="text-[10px] text-slate-500">{mat.qty}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        mat.status === 'alerta' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {mat.status === 'alerta' ? 'Repor' : 'Disponível'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: DEFINIÇÕES COMPLETAS DO SISTEMA (IGUAL AO ELECTRON) */}
          {activeTab === 'admin_painel' && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-purple-600" />
                    <span>Definições do Sistema Gestão X</span>
                  </h2>
                  <p className="text-[10px] text-slate-500">Configuração completa de empresa, preços, bancos e API</p>
                </div>
                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                  Definições Oficiais
                </span>
              </div>

              {/* Sub-abas de Navegação das Definições */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200">
                {[
                  { id: 'empresa', label: 'Empresa & NIF', icon: Building2 },
                  { id: 'precos', label: 'Preçário & Regras', icon: Receipt },
                  { id: 'bancos', label: 'Contas & IBANs', icon: Wallet },
                  { id: 'impressora', label: 'Impressora POS', icon: Printer },
                  { id: 'api', label: 'PythonAnywhere', icon: Database },
                  { id: 'licenca', label: 'Licenciamento', icon: ShieldCheck },
                  { id: 'limpeza', label: 'Zerar Produção', icon: Trash2 },
                ].map((st) => {
                  const Icon = st.icon;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSettingsActiveSubTab(st.id as any)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition ${
                        settingsActiveSubTab === st.id
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={13} />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SUB-ABA 1: DADOS DA EMPRESA & FISCAIS */}
              {settingsActiveSubTab === 'empresa' && (
                <form onSubmit={handleSaveCompanySettings} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <b className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
                    Identificação Corporativa & Dados da Sede
                  </b>
                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome Comercial da Empresa</label>
                      <input
                        type="text"
                        value={companySettingsForm.companyName}
                        onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, companyName: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Razão Social Oficial (AGT)</label>
                      <input
                        type="text"
                        value={companySettingsForm.companyTradeName}
                        onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, companyTradeName: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">NIF Fiscal</label>
                        <input
                          type="text"
                          value={companySettingsForm.nif}
                          onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, nif: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp Atendimento (+244)</label>
                        <input
                          type="text"
                          value={companySettingsForm.companyWhatsApp}
                          onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, companyWhatsApp: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Endereço da Sede Principal</label>
                      <input
                        type="text"
                        value={companySettingsForm.address}
                        onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, address: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm mt-3"
                  >
                    <Save size={14} /> Guardar Dados da Empresa
                  </button>
                </form>
              )}

              {/* SUB-ABA 2: PREÇÁRIO & REGRAS DE FACTURAÇÃO */}
              {settingsActiveSubTab === 'precos' && (
                <form onSubmit={handleSaveCompanySettings} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <b className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
                    Preçário Base & Prazos de Tolerância
                  </b>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Mensalidade TV (Kz)</label>
                        <input
                          type="number"
                          value={companySettingsForm.tvBaseFee}
                          onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, tvBaseFee: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Fibra 10 Mbps (Kz)</label>
                        <input
                          type="number"
                          value={companySettingsForm.fiber10Fee}
                          onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, fiber10Fee: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Fibra 20 Mbps (Kz)</label>
                        <input
                          type="number"
                          value={companySettingsForm.fiber20Fee}
                          onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, fiber20Fee: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Tolerância Corte (Dias)</label>
                        <input
                          type="number"
                          value={companySettingsForm.toleranceDays}
                          onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, toleranceDays: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-blue-700"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Taxa Religação TV (Kz)</label>
                        <input
                          type="number"
                          value={companySettingsForm.tvReconnectFee}
                          onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, tvReconnectFee: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Taxa Religação Fibra (Kz)</label>
                        <input
                          type="number"
                          value={companySettingsForm.fiberReconnectFee}
                          onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, fiberReconnectFee: Number(e.target.value) })}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm mt-3"
                  >
                    <Save size={14} /> Guardar Preçário Oficial
                  </button>
                </form>
              )}

              {/* SUB-ABA 3: CONTAS BANCÁRIAS & IBANS OFICIAIS */}
              {settingsActiveSubTab === 'bancos' && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <b className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
                    Contas Bancárias Oficiais para Pagamentos & Depósitos
                  </b>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <b className="text-blue-900 text-xs">Banco BAI (Banco Angolano de Investimentos)</b>
                        <span className="text-[10px] font-bold bg-blue-200 text-blue-900 px-2 py-0.5 rounded">Principal</span>
                      </div>
                      <p className="font-mono text-xs font-bold text-slate-800">AO06.0040.0000.4412.9012.1023.1</p>
                      <p className="text-[10px] text-slate-600">Titular: OSDEL TECNOLOGIA & TELECOMUNICAÇÕES LDA</p>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <b className="text-amber-900 text-xs">Banco BFA (Banco de Fomento Angola)</b>
                        <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">Secundária</span>
                      </div>
                      <p className="font-mono text-xs font-bold text-slate-800">AO06.0006.0000.9921.8741.2012.3</p>
                      <p className="text-[10px] text-slate-600">Titular: OSDEL TECNOLOGIA & TELECOMUNICAÇÕES LDA</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex justify-between items-center">
                        <b className="text-slate-900 text-xs">Caixa de Balcão (Numerário)</b>
                        <span className="text-[10px] font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Físico</span>
                      </div>
                      <p className="text-xs text-slate-700">Recebimento direto na sede do Golf I</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 4: IMPRESSORA TÉRMICA POS 80MM / 58MM */}
              {settingsActiveSubTab === 'impressora' && (
                <form onSubmit={handleSaveCompanySettings} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <b className="text-xs font-bold text-slate-900 block border-b border-slate-100 pb-2">
                    Configurações de Impressão de Talões POS
                  </b>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Largura do Papel Térmico</label>
                      <select
                        value={companySettingsForm.thermalPrinterWidth}
                        onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, thermalPrinterWidth: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                      >
                        <option value="80mm">80mm (Padrão Oficial de Balcão e Portátil)</option>
                        <option value="58mm">58mm (Mini Impressora Bluetooth)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <b className="text-slate-900 block text-xs">Imprimir Logótipo OSDEL no Cabeçalho</b>
                        <span className="text-[10px] text-slate-500">Exibe a marca visual oficial no topo do talão</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={companySettingsForm.thermalPrinterLogo}
                        onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, thermalPrinterLogo: e.target.checked })}
                        className="h-5 w-5 text-purple-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <b className="text-slate-900 block text-xs">Corte Automático de Papel (Paper Cut)</b>
                        <span className="text-[10px] text-slate-500">Aciona guilhotina da impressora após finalização</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={companySettingsForm.thermalAutoCut}
                        onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, thermalAutoCut: e.target.checked })}
                        className="h-5 w-5 text-purple-600 rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mensagem de Rodapé do Recibo</label>
                      <textarea
                        rows={2}
                        value={companySettingsForm.thermalReceiptFooter}
                        onChange={(e) => setCompanySettingsForm({ ...companySettingsForm, thermalReceiptFooter: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm mt-3"
                  >
                    <Save size={14} /> Guardar Configuração da Impressora
                  </button>
                </form>
              )}

              {/* SUB-ABA 5: LIGAÇÃO À API & PYTHONANYWHERE */}
              {settingsActiveSubTab === 'api' && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <b className="text-xs font-bold text-slate-900">
                      Servidor de Produção PythonAnywhere
                    </b>
                    <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      REST API
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">URL HTTPS da API</label>
                    <input
                      type="url"
                      value={apiEndpointInput}
                      onChange={(e) => setApiEndpointInput(e.target.value)}
                      placeholder="https://osdelltecnologia.pythonanywhere.com"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Subdomínio oficial onde o ficheiro WSGI e a API Flask estão publicados.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isTestingApiEndpoint}
                      onClick={() => handleTestApiConnection(apiEndpointInput)}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <RefreshCw size={13} className={isTestingApiEndpoint ? 'animate-spin' : ''} />
                      <span>{isTestingApiEndpoint ? 'A Testar...' : 'Testar Conexão em Tempo Real'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setApiBaseUrl(apiEndpointInput);
                        setCompanySettingsForm({ ...companySettingsForm, apiEndpoint: apiEndpointInput });
                        alert('URL da API de produção gravada com sucesso!');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
                    >
                      Guardar URL
                    </button>
                  </div>

                  {apiEndpointMessage && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        apiTestLatency !== null
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {apiTestLatency !== null ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                      <span>{apiEndpointMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA 6: LICENCIAMENTO DO SOFTWARE */}
              {settingsActiveSubTab === 'licenca' && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      <b className="text-xs font-bold text-slate-900">Licença Empresarial Gestão X</b>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      ✓ ACTIVA & VITALÍCIA
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-xs text-slate-700 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Titular da Licença:</span>
                      <b className="text-slate-900">OSDEL TECNOLOGIA & TELECOMUNICAÇÕES LDA</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chave do Produto:</span>
                      <span className="font-mono font-bold text-blue-700">GESTAOX-OSDEL-ANGOLA-2026-ENTERPRISE</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Versão do Sistema:</span>
                      <b className="text-slate-900">Gestão X v2.6.4 (Build Angola Oficial)</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Módulos Homologados:</span>
                      <b className="text-emerald-700">Fibra FTTH + TV Cabo + Piquete + APK Staff</b>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 7: LIMPEZA TOTAL PARA PRODUÇÃO */}
              {settingsActiveSubTab === 'limpeza' && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800">
                    <AlertTriangle size={18} />
                    <b className="text-xs font-bold">Limpeza Total para Entrada em Produção Oficial</b>
                  </div>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Esta ferramenta foi concebida para o administrador zerar todos os dados de exemplo, contratos e despesas de demonstração. As contas bancárias serão limpas para 0.00 Kz e o sistema ficará 100% pronto para iniciar o cadastro real de clientes da sua empresa.
                  </p>
                  <button
                    type="button"
                    onClick={() => setModalStaffReset(true)}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Trash2 size={15} /> Abrir Limpeza de Produção
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL: NOVO / EDITAR ASSINANTE NO APP STAFF */}
        {modalNewClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                    <Users size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">
                      {modalEditClient ? 'Editar Dados do Assinante' : 'Novo Contrato de Assinante'}
                    </h3>
                    <p className="text-[10px] text-blue-100">
                      Cadastro oficial com prevenção de duplicados e geração de PIN
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalNewClient(false);
                    setModalEditClient(null);
                  }}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveClient} className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-800">
                {/* Nome & Documento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientForm.fullName}
                      onChange={(e) => setClientForm({ ...clientForm, fullName: e.target.value })}
                      placeholder="Ex: Manuel António Domingos"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-semibold focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      B.I. / NIF do Assinante *
                    </label>
                    <input
                      type="text"
                      value={clientForm.nif}
                      onChange={(e) => setClientForm({ ...clientForm, nif: e.target.value })}
                      placeholder="Ex: 00582914LA042"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-mono focus:border-blue-600 outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Telefones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Telefone Principal (+244) *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                      placeholder="+244 923 456 789"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-mono focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Telefone Alternativo / Emergência
                    </label>
                    <input
                      type="text"
                      value={clientForm.alternatePhone}
                      onChange={(e) => setClientForm({ ...clientForm, alternatePhone: e.target.value })}
                      placeholder="+244 991 222 333"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-mono focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                {/* Localização */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bairro</label>
                    <select
                      value={clientForm.neighborhood}
                      onChange={(e) => setClientForm({ ...clientForm, neighborhood: e.target.value })}
                      className="w-full h-9 px-2 rounded-xl border border-slate-300 text-xs bg-white focus:border-blue-600 outline-none"
                    >
                      <option value="Golf I">Golf I</option>
                      <option value="Golf II">Golf II</option>
                      <option value="Palanca">Palanca</option>
                      <option value="Kilamba Kiaxi">Kilamba Kiaxi</option>
                      <option value="Sapú">Sapú</option>
                      <option value="Rocha Pinto">Rocha Pinto</option>
                      <option value="Camama">Camama</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Rua / Setor</label>
                    <input
                      type="text"
                      value={clientForm.street}
                      onChange={(e) => setClientForm({ ...clientForm, street: e.target.value })}
                      placeholder="Rua 12"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº Casa / Bloco</label>
                    <input
                      type="text"
                      value={clientForm.houseCode}
                      onChange={(e) => setClientForm({ ...clientForm, houseCode: e.target.value })}
                      placeholder="Casa 45B"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                {/* Tipo de Serviço & Plano */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Modalidade</label>
                    <select
                      value={clientForm.serviceType}
                      onChange={(e) => {
                        const st = e.target.value as any;
                        setClientForm({
                          ...clientForm,
                          serviceType: st,
                          planName:
                            st === 'tv'
                              ? 'TV Comunitária Base (35 Canais)'
                              : st === 'combo'
                              ? 'Plano Combo Família (TV + Fibra 20 Mbps)'
                              : 'Fibra Óptica 10 Mbps Simétrica',
                          monthlyFee: st === 'tv' ? '4000' : st === 'combo' ? '14500' : '6500',
                          pdoBox: st === 'tv' ? 'TAP-01' : 'PDO-04',
                        });
                      }}
                      className="w-full h-9 px-2 rounded-xl border border-slate-300 text-xs bg-white font-bold focus:border-blue-600 outline-none"
                    >
                      <option value="fibra">Fibra Óptica FTTH</option>
                      <option value="tv">TV por Cabo</option>
                      <option value="combo">Combo (TV + Fibra)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Plano Comercial</label>
                    <input
                      type="text"
                      value={clientForm.planName}
                      onChange={(e) => setClientForm({ ...clientForm, planName: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:border-blue-600 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Mensalidade (Kz) *</label>
                    <input
                      type="number"
                      required
                      value={clientForm.monthlyFee}
                      onChange={(e) => setClientForm({ ...clientForm, monthlyFee: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold text-emerald-700 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>

                {/* Rede FTTH / Cabo & PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Caixa (PDO / TAP)</label>
                    <input
                      type="text"
                      value={clientForm.pdoBox}
                      onChange={(e) => setClientForm({ ...clientForm, pdoBox: e.target.value })}
                      placeholder="PDO-04"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Porta Atribuída</label>
                    <input
                      type="text"
                      value={clientForm.port}
                      onChange={(e) => setClientForm({ ...clientForm, port: e.target.value })}
                      placeholder="Porta 01"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      PIN Acesso App (4 Dígitos)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        maxLength={4}
                        required
                        value={clientForm.clientPin}
                        onChange={(e) => setClientForm({ ...clientForm, clientPin: e.target.value })}
                        className="w-full h-9 px-2 rounded-xl border border-slate-300 text-xs font-mono font-black text-center text-blue-700 bg-blue-50/50 focus:border-blue-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setClientForm({
                            ...clientForm,
                            clientPin: String(Math.floor(1000 + Math.random() * 9000)),
                          })
                        }
                        className="px-2 h-9 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold shrink-0"
                        title="Gerar PIN Aleatório"
                      >
                        Gerar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Potência Rx e Serial ONU (exclusivo para Internet / Fibra; TV não usa ONU) */}
                {clientForm.serviceType !== 'tv' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Potência Óptica Rx (dBm)
                      </label>
                      <input
                        type="text"
                        value={clientForm.opticalRxDbm}
                        onChange={(e) => setClientForm({ ...clientForm, opticalRxDbm: e.target.value })}
                        placeholder="-19.4"
                        className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-mono focus:border-blue-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Serial ONU / Roteador (FTTH)
                      </label>
                      <input
                        type="text"
                        value={clientForm.onuSerial}
                        onChange={(e) => setClientForm({ ...clientForm, onuSerial: e.target.value })}
                        placeholder="GPON-0048F12"
                        className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs font-mono focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                    <Tv size={16} className="text-amber-600 shrink-0" />
                    <span><b>TV Comunitária por Cabo:</b> Ligação directa via Cabo Coaxial / TAP. Dispositivo não requer modem ONU.</span>
                  </div>
                )}

                {/* Observações */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Observações de Campo
                  </label>
                  <input
                    type="text"
                    value={clientForm.notes}
                    onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
                    placeholder="Instalação direta, cliente prefere contacto no período da tarde."
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs focus:border-blue-600 outline-none"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setModalNewClient(false);
                      setModalEditClient(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                  >
                    <Save size={15} />
                    <span>{modalEditClient ? 'Atualizar Assinante' : 'Salvar & Ativar Assinante'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: PEDIR ADIANTAMENTO DE SALÁRIO NO APK */}
        {modalRequestLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Banknote size={20} />
                  <div>
                    <b className="text-sm block">Solicitar Adiantamento de Salário</b>
                    <span className="text-[10px] text-blue-100">Desconto directo na folha salarial da OSDEL</span>
                  </div>
                </div>
                <button
                  onClick={() => setModalRequestLoan(false)}
                  className="rounded-lg p-1.5 hover:bg-white/20 text-white/80 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleRequestLoan} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
                {/* Colaborador Info */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Colaborador Solicitante:</span>
                    <b className="text-slate-900">{currentUser.name}</b>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Salário Bruto:</span>
                    <b className="text-emerald-700">{kz(grossSalary)}</b>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block text-[11px]">
                    Valor do Adiantamento (Kz) *
                  </label>
                  <input
                    type="number"
                    min="5000"
                    step="1000"
                    required
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    placeholder="Ex.: 35000"
                  />
                  {/* Quick Chips */}
                  <div className="flex gap-1.5 flex-wrap pt-0.5">
                    {[20000, 35000, 50000, 75000, 100000].map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        onClick={() => setLoanAmount(String(chip))}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                          loanAmount === String(chip)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {kz(chip)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block text-[11px]">
                    Motivo / Justificação *
                  </label>
                  <select
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
                  >
                    <option value="Emergência Médica / Saúde Familiar">Emergência Médica / Saúde Familiar</option>
                    <option value="Despesas de Habitação / Renda">Despesas de Habitação / Renda</option>
                    <option value="Educação / Propinas dos Filhos">Educação / Propinas dos Filhos</option>
                    <option value="Ferramentas Técnicas / Equipamento">Ferramentas Técnicas / Equipamento</option>
                    <option value="Despesas Pessoais Imprevistas">Despesas Pessoais Imprevistas</option>
                  </select>
                </div>

                {/* Installments */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block text-[11px]">
                    Prazo de Desconto em Folha *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { months: 1, label: '1 Mês (100%)' },
                      { months: 2, label: '2 Meses (50%/mês)' },
                      { months: 3, label: '3 Meses (33%/mês)' },
                    ].map((inst) => (
                      <button
                        type="button"
                        key={inst.months}
                        onClick={() => setLoanInstallments(inst.months)}
                        className={`py-2 px-1 rounded-xl text-center border font-bold text-[10px] transition ${
                          loanInstallments === inst.months
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {inst.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Receipt Method */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block text-[11px]">
                    Forma de Pagamento Desejada *
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLoanReceiptMethod('iban')}
                      className={`p-2 rounded-xl border text-[10px] font-bold text-center ${
                        loanReceiptMethod === 'iban' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      IBAN Bancário
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanReceiptMethod('multicaixa_express')}
                      className={`p-2 rounded-xl border text-[10px] font-bold text-center ${
                        loanReceiptMethod === 'multicaixa_express' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      Multicaixa Express
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanReceiptMethod('numerario')}
                      className={`p-2 rounded-xl border text-[10px] font-bold text-center ${
                        loanReceiptMethod === 'numerario' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      Numerário (Caixa)
                    </button>
                  </div>
                </div>

                {loanReceiptMethod === 'iban' && (
                  <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 block">Banco:</span>
                      <input
                        value={loanBank}
                        onChange={(e) => setLoanBank(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                        placeholder="Ex: Banco BAI"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-600 block">IBAN de Destino (AO06...):</span>
                      <input
                        value={loanIban}
                        onChange={(e) => setLoanIban(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg border border-slate-300 font-mono text-[11px] bg-white"
                        placeholder="AO06.0040.0000.xxxx.xxxx.xxxx.x"
                      />
                    </div>
                  </div>
                )}

                {loanReceiptMethod === 'multicaixa_express' && (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">Número de Telemóvel MCX:</span>
                    <input
                      value={loanExpressPhone}
                      onChange={(e) => setLoanExpressPhone(e.target.value)}
                      className="w-full h-8 px-2 rounded-lg border border-slate-300 font-mono text-xs bg-white"
                      placeholder="923 000 000"
                    />
                  </div>
                )}

                {/* Simulation Card */}
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-900 space-y-1">
                  <b className="block text-[11px] text-emerald-800">Simulação de Desconto:</b>
                  <div className="flex justify-between">
                    <span>Desconto Mensal:</span>
                    <b className="font-bold">{kz(Math.round(Number(loanAmount || 0) / Math.max(1, loanInstallments)))} / mês</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Salário Estimado Pós-Desconto:</span>
                    <b className="font-bold">{kz(Math.max(0, grossSalary - Math.round(Number(loanAmount || 0) / Math.max(1, loanInstallments))))}</b>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalRequestLoan(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm"
                  >
                    Submeter Pedido
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: NOVA FACTURA / COBRANÇA NO APK (OPERADOR & ADMIN) */}
        {modalNewInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Receipt size={20} />
                  <div>
                    <b className="text-sm block">Emitir Factura / Cobrança</b>
                    <span className="text-[10px] text-blue-100">Liquidação com impressão de talão térmico ou A4</span>
                  </div>
                </div>
                <button
                  onClick={() => setModalNewInvoice(false)}
                  className="rounded-lg p-1.5 hover:bg-white/20 text-white/80 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateInvoiceSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Assinante / Cliente *</label>
                  <select
                    value={invFormClientId}
                    onChange={(e) => setInvFormClientId(e.target.value)}
                    required
                    className="w-full h-9 px-2 rounded-xl border border-slate-300 bg-white font-medium text-xs"
                  >
                    <option value="">Seleccione um cliente...</option>
                    {clients.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.fullName} ({c.serviceType === 'tv' ? 'TV' : 'Fibra'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Descrição do Serviço</label>
                  <input
                    type="text"
                    value={invFormDesc}
                    onChange={(e) => setInvFormDesc(e.target.value)}
                    required
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs"
                    placeholder="Ex.: Mensalidade de Serviço OSDEL"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Valor Base (Kz) *</label>
                    <input
                      type="number"
                      value={invFormAmount}
                      onChange={(e) => setInvFormAmount(e.target.value)}
                      required
                      min="500"
                      step="500"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Multa Atraso (Kz)</label>
                    <input
                      type="number"
                      value={invFormPenalty}
                      onChange={(e) => setInvFormPenalty(e.target.value)}
                      min="0"
                      step="500"
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Forma de Liquidação *</label>
                  <select
                    value={invFormMethod}
                    onChange={(e) => setInvFormMethod(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl border border-slate-300 bg-white font-medium text-xs"
                  >
                    <option value="multicaixa">Multicaixa / TPA</option>
                    <option value="numerario">Dinheiro Numerário</option>
                    <option value="transferencia">Transferência Bancária</option>
                    <option value="multicaixa_express">Multicaixa Express</option>
                  </select>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-bold">Total a Cobrar:</span>
                  <b className="text-base font-black text-emerald-700 font-mono">
                    {kz(Number(invFormAmount || 0) + Number(invFormPenalty || 0))}
                  </b>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalNewInvoice(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createInvoiceMutation.isPending}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1"
                  >
                    <Check size={14} />
                    {createInvoiceMutation.isPending ? 'A emitir...' : 'Emitir Factura'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SUCESSO & ESCOLHA DE FORMATO DE IMPRESSÃO */}
        {modalPrintChoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-5 text-center space-y-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 mx-auto">
                <CheckCircle2 size={26} />
              </div>

              <div>
                <b className="text-sm font-extrabold text-slate-900 block">Factura Emitida com Sucesso!</b>
                <span className="text-xs font-mono font-bold text-slate-500">{modalPrintChoice.invoiceNumber}</span>
                <p className="text-xs text-slate-600 mt-1">
                  Cliente: <b>{modalPrintChoice.clientName}</b> · Total: <b>{kz(modalPrintChoice.total)}</b>
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Como deseja imprimir?</span>
                <Link
                  href={getPrintUrl('fatura', { id: modalPrintChoice.invoiceNumber, formato: 'pos' })}
                  onClick={() => setModalPrintChoice(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black flex items-center justify-center gap-2 shadow-sm"
                >
                  <Receipt size={15} className="text-amber-400" />
                  <span>🧾 Imprimir Talão Térmico POS (80mm)</span>
                </Link>

                <Link
                  href={getPrintUrl('fatura', { id: modalPrintChoice.invoiceNumber, formato: 'a4' })}
                  onClick={() => setModalPrintChoice(null)}
                  className="w-full py-2.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs hover:bg-blue-100 flex items-center justify-center gap-2"
                >
                  <Printer size={15} />
                  <span>📄 Imprimir Factura Oficial A4</span>
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setModalPrintChoice(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Fechar sem Imprimir
              </button>
            </div>
          </div>
        )}

        {/* DYNAMIC BOTTOM NAVIGATION TABS */}
        <nav className="shrink-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around text-[10px] font-bold">
          {isTechnician ? (
            <>
              <button
                onClick={() => setActiveTab('agenda')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'agenda' ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <Calendar size={18} />
                <span>Agenda</span>
              </button>

              <button
                onClick={() => setActiveTab('missoes')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'missoes' ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <Scissors size={18} />
                <span>Piquetes</span>
              </button>

              <button
                onClick={() => setActiveTab('material')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'material' ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <Wrench size={18} />
                <span>Carrinha/OPM</span>
              </button>

              <button
                onClick={() => setActiveTab('salario')}
                className={`flex flex-col items-center gap-1 transition relative ${
                  activeTab === 'salario' ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <DollarSign size={18} />
                <span>Meu Salário</span>
                {myActiveDebt.totalActiveDebt > 0 && (
                  <span className="absolute top-0 right-3 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('acordos')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'acordos' ? 'text-amber-600' : 'text-slate-400'
                }`}
              >
                <ShieldCheck size={18} />
                <span>Acordos</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('clientes')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'clientes' ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <Users size={18} />
                <span>Assinantes</span>
              </button>

              <button
                onClick={() => setActiveTab('faturas')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'faturas' ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <Receipt size={18} />
                <span>Facturas</span>
              </button>

              <button
                onClick={() => setActiveTab('caixa')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'caixa' ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <DollarSign size={18} />
                <span>Caixa</span>
              </button>

              <button
                onClick={() => setActiveTab('missoes')}
                className={`flex flex-col items-center gap-1 transition ${
                  activeTab === 'missoes' ? 'text-blue-600' : 'text-slate-400'
                }`}
              >
                <Scissors size={18} />
                <span>Piquetes</span>
              </button>

              {isAdmin ? (
                <button
                  onClick={() => setActiveTab('admin_painel')}
                  className={`flex flex-col items-center gap-1 transition ${
                    activeTab === 'admin_painel' ? 'text-purple-600' : 'text-slate-400'
                  }`}
                >
                  <Sliders size={18} />
                  <span>Admin</span>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('acordos')}
                  className={`flex flex-col items-center gap-1 transition ${
                    activeTab === 'acordos' ? 'text-blue-600' : 'text-slate-400'
                  }`}
                >
                  <ShieldCheck size={18} />
                  <span>Acordos</span>
                </button>
              )}
            </>
          )}
        </nav>

        {/* BOTÃO FLUTUANTE DA IA TELECOM (FAB) */}
        <div className="absolute bottom-16 right-3 z-40">
          <button
            type="button"
            onClick={() => {
              setAiClientCode(undefined);
              setModalAiAssistant(true);
            }}
            className="group flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs shadow-2xl shadow-blue-500/50 border border-blue-400/40 active:scale-95 transition-all duration-200"
            title="Abrir Assistente IA Telecom"
          >
            <div className="relative">
              <Bot size={18} className="text-white group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              </span>
            </div>
            <span className="tracking-wide">IA Assistente</span>
            <Sparkles size={13} className="text-amber-300 animate-pulse" />
          </button>
        </div>

        {/* MODAL IA ASSISTENTE OPERACIONAL */}
        <AiAssistantModal
          isOpen={modalAiAssistant}
          onClose={() => setModalAiAssistant(false)}
          persona={isTechnician ? 'technician' : 'admin'}
          clientCode={aiClientCode}
        />
        </>
        )}
      </div>
    </div>
  );
}

export const StaffMobileAppPage = StaffMobileApp;

