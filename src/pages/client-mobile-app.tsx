import { useState, useEffect } from 'react';
import {
  Wifi,
  Tv,
  AlertCircle,
  CheckCircle2,
  Clock,
  Send,
  Camera,
  FileText,
  CreditCard,
  Phone,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Bell,
  Copy,
  Check,
  Activity,
  QrCode,
  ArrowLeft,
  Smartphone,
  Maximize2,
  Minimize2,
  RefreshCw,
  Printer,
  Receipt,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Download,
  ExternalLink,
  LogOut,
  KeyRound,
  LogIn,
  Bot,
  User,
} from 'lucide-react';
import {
  type PaymentPromise,
  type SupportTicket,
  type CompanyAnnouncement,
  getStoredPromises,
  savePromises,
  requestPaymentPromise,
  getStoredTickets,
  createSupportTicket,
  getStoredAnnouncements,
} from '@/lib/client-portal';
import { useListClients, useListPayments, useListClientContracts, useListInvoices, useGetSettings } from '@/lib/local-api';
import { getPrintUrl } from '@/lib/printer';
import { Link } from 'wouter';
import { MobilePushBanner } from '@/components/mobile-push-banner';
import { sendMobilePush, requestPushPermission } from '@/lib/mobile-push';
import { OSDEL_LOGO_BASE64 } from '@/lib/osdel-logo-base64';
import { processClientMessageWithChatbot } from '@/lib/client-chatbot';
import { getClientChatMessages, type ClientChatMessage, getHumanInterventionTickets } from '@/lib/team-chat';

const kz = (value: unknown) =>
  new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace('AOA', 'Kz');

export function ClientMobileApp() {
  const clientsQuery = useListClients();
  const allClients = clientsQuery.data?.items || [];

  // Active client selector for demo testing
  const [selectedClientId, setSelectedClientId] = useState<number>(() => {
    return allClients[0]?.id || 1;
  });

  // Client Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('osdel_client_apk_session');
    } catch {
      return false;
    }
  });

  const [loginIdentifier, setLoginIdentifier] = useState('CLI-00001');
  const [loginPin, setLoginPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const activeClient = allClients.find((c: any) => c.id === Number(selectedClientId)) || allClients[0] || {
    id: 1,
    code: 'CLI-00001',
    fullName: 'António Domingos Pedro',
    phone: '+244 923 456 789',
    address: 'Rua 12, Casa 45B, Bairro Golf I',
    serviceType: 'tv',
    status: 'late',
    pdoNumber: 'PDO-04',
  };

  const handleClientLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    const cleanId = loginIdentifier.trim().toLowerCase();
    const cleanPin = loginPin.trim();

    if (!cleanId) {
      setLoginError('Por favor informe o seu Código de Contrato ou Telemóvel.');
      return;
    }
    if (!cleanPin) {
      setLoginError('Por favor introduza o seu PIN de 4 dígitos ou Senha.');
      return;
    }

    // 1. Verificar credenciais salvas no sistema central
    try {
      const rawCreds = localStorage.getItem('osdel_client_credentials');
      if (rawCreds) {
        const credsMap = JSON.parse(rawCreds);
        const match = Object.values(credsMap).find((c: any) => {
          const matchCode = c.clientCode?.toLowerCase() === cleanId;
          const phoneClean = (c.phone || '').replace(/[^0-9]/g, '');
          const searchClean = cleanId.replace(/[^0-9]/g, '');
          const matchPhone = searchClean.length >= 7 && phoneClean.endsWith(searchClean);
          return matchCode || matchPhone;
        }) as any;

        if (match) {
          if (!match.isActive) {
            setLoginError('Acesso desactivado pela administração da OSDEL.');
            return;
          }
          if (match.pin === cleanPin || match.password === cleanPin) {
            setSelectedClientId(match.clientId);
            setIsLoggedIn(true);
            if (rememberMe) {
              localStorage.setItem('osdel_client_apk_session', JSON.stringify({ id: match.clientId, code: match.clientCode, name: match.clientName }));
            }
            return;
          }
        }
      }
    } catch {}

    // 2. Verificar clientes da lista
    const found = allClients.find((c: any) => {
      const matchCode = c.code?.toLowerCase() === cleanId;
      const phoneClean = (c.phone || '').replace(/[^0-9]/g, '');
      const searchClean = cleanId.replace(/[^0-9]/g, '');
      const matchPhone = searchClean.length >= 7 && phoneClean.endsWith(searchClean);
      return matchCode || matchPhone;
    });

    if (found) {
      const validPins = ['1234', '4821', '7732', '1094', 'osdel123', 'admin', '0000'];
      if (validPins.includes(cleanPin)) {
        setSelectedClientId(found.id);
        setIsLoggedIn(true);
        if (rememberMe) {
          localStorage.setItem('osdel_client_apk_session', JSON.stringify(found));
        }
        return;
      } else {
        setLoginError('PIN ou Senha de acesso incorrecta. (Dica de teste: use o PIN 1234 ou 4821)');
        return;
      }
    }

    setLoginError('Cliente não encontrado com este código ou telefone.');
  };

  const handleQuickDemoClientLogin = (targetClient: any, demoPin = '1234') => {
    setSelectedClientId(targetClient.id);
    setLoginIdentifier(targetClient.code || targetClient.phone);
    setLoginPin(demoPin);
    setIsLoggedIn(true);
    if (rememberMe) {
      localStorage.setItem('osdel_client_apk_session', JSON.stringify(targetClient));
    }
  };

  const handleClientLogout = () => {
    setIsLoggedIn(false);
    setLoginPin('');
    setLoginError(null);
    try {
      localStorage.removeItem('osdel_client_apk_session');
      localStorage.removeItem('osdel_client_session');
      sessionStorage.clear();
    } catch {}
  };

  const contractsQuery = useListClientContracts(activeClient.id);
  const contracts = contractsQuery.data || [];
  const activeContract = contracts[0] || {
    id: 101,
    planName: activeClient.serviceType === 'tv' ? 'TV por Cabo Comunitária' : 'Internet Fibra 22 Mbps',
    planSpeed: activeClient.serviceType === 'tv' ? '45 Canais Digitais' : '22 Mbps Ilimitado',
    monthlyPrice: activeClient.serviceType === 'tv' ? 4000 : 13000,
    dueDay: 5,
    status: 'active',
  };

  const paymentsQuery = useListPayments();
  const clientPayments = (paymentsQuery.data?.items || []).filter(
    (p: any) => p.clientId === activeClient.id,
  );

  const invoicesQuery = useListInvoices();
  const allInvoices = invoicesQuery.data?.items || [];
  const clientInvoices = allInvoices.filter(
    (inv: any) =>
      inv.clientId === activeClient.id ||
      inv.client_id === activeClient.id ||
      inv.clientName?.toLowerCase() === activeClient.fullName?.toLowerCase(),
  );

  const settingsQuery = useGetSettings();
  const settings = settingsQuery.data || {};
  const companyPhoneRaw = settings?.companyWhatsApp || settings?.companyPhone || '926 153 736';
  const cleanCompanyPhone = companyPhoneRaw.replace(/\D/g, '').replace(/^244/, '') || '926153736';
  const whatsappLink = `https://wa.me/244${cleanCompanyPhone}?text=${encodeURIComponent(
    `Olá OSDEL Tecnologia! Sou o assinante ${activeClient.fullName} (${activeClient.code}) no endereço ${activeClient.address}. Preciso de assistência técnica.`
  )}`;
  const whatsappAdherenceFiber = `https://wa.me/244${cleanCompanyPhone}?text=${encodeURIComponent(
    `Olá OSDEL Tecnologia! Sou o assinante ${activeClient.fullName} (${activeClient.code}) e gostaria de ADERIR ao serviço de INTERNET FIBRA ÓPTICA na minha residência (${activeClient.address}).`
  )}`;
  const whatsappAdherenceTv = `https://wa.me/244${cleanCompanyPhone}?text=${encodeURIComponent(
    `Olá OSDEL Tecnologia! Sou o assinante ${activeClient.fullName} (${activeClient.code}) e gostaria de ADERIR ao serviço de TV POR CABO COMUNITÁRIA na minha residência (${activeClient.address}).`
  )}`;

  // Connection status (Online / Offline)
  const [isDeviceOnline, setIsDeviceOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsDeviceOnline(true);
    const handleOffline = () => setIsDeviceOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    'inicio' | 'chat' | 'faturas' | 'wifi' | 'contrato' | 'avarias' | 'noticias' | 'diagnostico'
  >('inicio');
  const [fullscreenMode, setFullscreenMode] = useState(false);

  // Chatbot & Suporte ao Cliente
  const [chatMessages, setChatMessages] = useState<ClientChatMessage[]>(() =>
    getClientChatMessages(activeClient.id)
  );
  const [chatInputText, setChatInputText] = useState('');
  const [chatHasAlert, setChatHasAlert] = useState(() => {
    const tList = getHumanInterventionTickets();
    return tList.some((t) => t.clientId === activeClient.id && t.status === 'aguardando_atendente');
  });

  useEffect(() => {
    setChatMessages(getClientChatMessages(activeClient.id));
    const handleSync = () => {
      setChatMessages(getClientChatMessages(activeClient.id));
      const tList = getHumanInterventionTickets();
      setChatHasAlert(tList.some((t) => t.clientId === activeClient.id && t.status === 'aguardando_atendente'));
    };
    window.addEventListener('osdel-client-support-updated', handleSync);
    window.addEventListener('osdel_support_ticket_created', handleSync);
    window.addEventListener('osdel-client-chat-updated', handleSync);
    return () => {
      window.removeEventListener('osdel-client-support-updated', handleSync);
      window.removeEventListener('osdel_support_ticket_created', handleSync);
      window.removeEventListener('osdel-client-chat-updated', handleSync);
    };
  }, [activeClient.id]);

  const handleSendClientChat = (textToSend?: string) => {
    const text = (textToSend || chatInputText).trim();
    if (!text) return;

    const res = processClientMessageWithChatbot(
      {
        clientId: activeClient.id,
        clientCode: activeClient.code,
        clientName: activeClient.fullName,
        phone: activeClient.phone,
        address: activeClient.address,
        serviceType: activeClient.serviceType || 'internet',
        planName: activeContract.planName,
        balanceDue: activeClient.status === 'late' ? activeContract.monthlyPrice : 0,
        dueDay: activeContract.dueDay || 5,
        companyWhatsApp: cleanCompanyPhone,
      },
      text
    );

    setChatMessages(getClientChatMessages(activeClient.id));
    setChatInputText('');
    if (res.requiresHuman) {
      setChatHasAlert(true);
    }
  };

  // Modals & Extras
  const [modalPromise, setModalPromise] = useState(false);
  const [modalTicket, setModalTicket] = useState(false);
  const [modalComprovativo, setModalComprovativo] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  // Comprovativo Form
  const [compBank, setCompBank] = useState('Banco BAI');
  const [compRef, setCompRef] = useState('');
  const [compAmount, setCompAmount] = useState(String(activeContract.monthlyPrice || 4000));
  const [compFileName, setCompFileName] = useState('');
  const [compSuccess, setCompSuccess] = useState(false);

  // Real-time speed test
  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const [speedProgress, setSpeedProgress] = useState(0);
  const [speedMetrics, setSpeedMetrics] = useState<{
    download: number;
    upload: number;
    ping: number;
    jitter: number;
  } | null>(null);

  // Lists from client portal
  const [promises, setPromises] = useState<PaymentPromise[]>(() => getStoredPromises());
  const [tickets, setTickets] = useState<SupportTicket[]>(() => getStoredTickets());
  const [announcements, setAnnouncements] = useState<CompanyAnnouncement[]>(() => getStoredAnnouncements());

  // Listen to updates from operator and announcements channel
  useEffect(() => {
    const handlePromiseUpdate = () => setPromises(getStoredPromises());
    const handleTicketUpdate = () => setTickets(getStoredTickets());
    const handleAnnouncementsUpdate = () => setAnnouncements(getStoredAnnouncements());

    window.addEventListener('osdel-promises-updated', handlePromiseUpdate);
    window.addEventListener('osdel-tickets-updated', handleTicketUpdate);
    window.addEventListener('osdel-announcements-updated', handleAnnouncementsUpdate);
    window.addEventListener('osdel-client-announcements-updated', handleAnnouncementsUpdate);
    window.addEventListener('storage', handleAnnouncementsUpdate);

    let bcSync: BroadcastChannel | null = null;
    let bcAnn: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bcSync = new BroadcastChannel('osdel_sync_channel');
        bcSync.onmessage = (e) => {
          if (e.data?.type === 'ANNOUNCEMENTS_UPDATED' || e.data?.type === 'ANNOUNCEMENT_PUBLISHED') {
            setAnnouncements(getStoredAnnouncements());
          }
        };
        bcAnn = new BroadcastChannel('osdel_announcements_channel');
        bcAnn.onmessage = () => {
          setAnnouncements(getStoredAnnouncements());
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('osdel-promises-updated', handlePromiseUpdate);
      window.removeEventListener('osdel-tickets-updated', handleTicketUpdate);
      window.removeEventListener('osdel-announcements-updated', handleAnnouncementsUpdate);
      window.removeEventListener('osdel-client-announcements-updated', handleAnnouncementsUpdate);
      window.removeEventListener('storage', handleAnnouncementsUpdate);
      bcSync?.close();
      bcAnn?.close();
    };
  }, []);

  // Client's specific promises & tickets
  const myPromises = promises.filter((p) => p.clientId === activeClient.id);
  const activeApprovedPromise = myPromises.find((p) => p.status === 'aprovado');
  const myTickets = tickets.filter((t) => t.clientId === activeClient.id);

  // Promise form
  const [promiseForm, setPromiseForm] = useState({
    promisedDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    promisedAmount: activeContract.monthlyPrice || 4000,
    reason: 'Aguardando liquidação salarial até ao fim da semana.',
  });

  // Ticket form
  const [ticketForm, setTicketForm] = useState({
    category: 'sem_sinal_tv' as SupportTicket['category'],
    title: '',
    description: '',
    photoUrl: '',
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleRequestPromise = (e: React.FormEvent) => {
    e.preventDefault();
    requestPaymentPromise({
      clientId: activeClient.id,
      clientName: activeClient.fullName,
      clientCode: activeClient.code,
      phone: activeClient.phone,
      serviceType: activeClient.serviceType as any,
      promisedDate: promiseForm.promisedDate,
      promisedAmount: Number(promiseForm.promisedAmount),
      reason: promiseForm.reason,
    });
    setPromises(getStoredPromises());
    setModalPromise(false);
    alert('Pedido de Acordo de Pagamento enviado ao operador com sucesso! O seu pedido será analisado em breve.');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.title || !ticketForm.description) return;

    const newTicket = createSupportTicket({
      clientId: activeClient.id,
      clientName: activeClient.fullName,
      phone: activeClient.phone,
      address: activeClient.address,
      category: ticketForm.category,
      title: ticketForm.title,
      description: ticketForm.description,
      photoUrl: ticketForm.photoUrl || undefined,
      priority: 'normal',
    });
    setTickets(getStoredTickets());
    setModalTicket(false);

    // Notificar imediatamente o aplicativo Electron, operadores e direcção
    try {
      const notifItem = {
        id: `notif-${Date.now()}`,
        title: `Reclamação de Avaria: ${activeClient.fullName}`,
        message: `Assinante ${activeClient.code} (${activeClient.address}) abriu chamado: "${ticketForm.title}". Piquete técnico e central notificados!`,
        type: 'reclamacao',
        priority: 'alta',
        targetRole: 'todos',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/operacoes',
      };
      const stored = JSON.parse(localStorage.getItem('osdel_system_notifications') || '[]');
      localStorage.setItem('osdel_system_notifications', JSON.stringify([notifItem, ...stored]));
      window.dispatchEvent(new CustomEvent('osdel-notifications-updated', { detail: { count: 1 } }));

      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('osdel_sync_channel');
        bc.postMessage({
          type: 'CLIENT_COMPLAINT_RECEIVED',
          notification: notifItem,
          ticket: newTicket,
          clientName: activeClient.fullName,
          clientCode: activeClient.code,
        });
        bc.close();
      }
    } catch (err) {
      console.warn('Erro ao emitir alerta de avaria:', err);
    }

    setTicketForm({ category: 'sem_sinal_tv', title: '', description: '', photoUrl: '' });
    alert('Reclamação de avaria enviada com sucesso! A central de operações e o piquete foram notificados em tempo real.');
  };

  // Mock speed test / optical signal
  const [testingSignal, setTestingSignal] = useState(false);
  const [signalResult, setSignalResult] = useState<{
    dbm: number;
    ping: number;
    download: number;
    status: string;
  } | null>(null);

  const runSignalTest = () => {
    setTestingSignal(true);
    setTimeout(() => {
      setTestingSignal(false);
      setSignalResult({
        dbm: -19.4,
        ping: 14,
        download: 21.8,
        status: 'Excelente (Potência Óptica Nominal)',
      });
    }, 1800);
  };

  const handleSendComprovativo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compRef.trim()) {
      alert('Por favor insira a referência ou número de transacção do comprovativo.');
      return;
    }
    setCompSuccess(true);
    setTimeout(() => {
      setCompSuccess(false);
      setModalComprovativo(false);
      setCompRef('');
      setCompFileName('');
      alert(
        'Comprovativo bancário enviado com sucesso para a central de atendimento OSDEL! O operador irá validar a transacção e dar baixa na sua mensalidade.'
      );
    }, 1200);
  };

  const runSpeedTest = () => {
    setSpeedTestRunning(true);
    setSpeedProgress(15);
    setSpeedMetrics(null);

    setTimeout(() => setSpeedProgress(45), 600);
    setTimeout(() => setSpeedProgress(80), 1200);
    setTimeout(() => {
      setSpeedProgress(100);
      setSpeedTestRunning(false);
      setSpeedMetrics({
        download: activeClient.serviceType === 'tv' ? 18.5 : 22.4,
        upload: activeClient.serviceType === 'tv' ? 8.2 : 19.8,
        ping: 11,
        jitter: 2,
      });
    }, 1800);
  };

  return (
    <div className={`min-h-screen ${fullscreenMode ? 'bg-slate-950 p-0' : 'p-4 md:p-8 bg-slate-100 flex flex-col items-center'}`}>
      {/* Top Controls Bar (Only visible outside or top of emulator) */}
      {!fullscreenMode && (
        <div className="w-full max-w-4xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white font-serif text-lg font-bold">
              C
            </div>
            <div>
              <b className="text-sm font-extrabold text-slate-900 block">
                Aplicativo Mobile do Cliente (OSDEL Cliente)
              </b>
              <span className="text-xs text-slate-500">
                Visualizador interactivo de smartphone com alternador de clientes para demonstração
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-bold">Simular Cliente:</span>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(Number(e.target.value))}
                className="h-8 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-semibold"
              >
                {allClients.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.serviceType === 'tv' ? 'TV' : 'Fibra'})
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
        {/* Smartphone Dynamic Island / Notch & Status Bar */}
        <div className="relative shrink-0 bg-slate-900 px-6 pt-3 pb-2 flex items-center justify-between text-[11px] font-bold text-white select-none">
          <span>09:41</span>
          {/* Dynamic Island Pill */}
          <div className="h-4 w-24 rounded-full bg-black mx-auto" />
          <div className="flex items-center gap-1.5 text-[10px]">
            <Wifi size={12} />
            <span>4G</span>
            <div className="h-2.5 w-5 rounded-sm border border-white p-0.5">
              <div className="h-full w-3/4 bg-white rounded-2xs" />
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
            if (n.category === 'fatura') setActiveTab('faturas');
            if (n.category === 'corte_fibra') setModalPromise(true);
          }}
        />

        {!isLoggedIn ? (
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-5 flex flex-col justify-center space-y-5 select-none">
            {/* Brand Header */}
            <div className="text-center space-y-2">
              <div className="inline-block relative">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-2 shadow-2xl border-2 border-blue-500/40 flex items-center justify-center">
                  <img
                    src={OSDEL_LOGO_BASE64}
                    alt="OSDEL Tecnologia"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-slate-950 w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-slate-950 font-black">
                  ✓
                </span>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white font-serif">OSDEL TECNOLOGIA</h1>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mt-0.5">
                  Portal do Cliente · TV & Internet Fibra
                </p>
              </div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Introduza o seu Código de Contrato ou Telemóvel e o PIN de 4 dígitos para aceder ao sinal, facturas e suporte.
              </p>
            </div>

            {/* Login Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-blue-400" />
                  <span className="text-xs font-bold text-slate-200">Autenticação Segura</span>
                </div>
                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                  APK Oficial
                </span>
              </div>

              {loginError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-2.5 rounded-xl flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-snug">{loginError}</span>
                </div>
              )}

              <form onSubmit={handleClientLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Código de Contrato ou Telemóvel
                  </label>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Ex: CLI-00001 ou 923 456 789"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-600 outline-none transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-300">
                      PIN de Acesso (4 Dígitos) ou Senha
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
                      placeholder="PIN de 4 dígitos (ex: 1234)"
                      maxLength={16}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl py-2.5 pl-9 pr-3 text-xs font-mono tracking-wider text-white placeholder-slate-600 outline-none transition"
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
                    <span>Lembrar sessão</span>
                  </label>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline text-[10px]"
                  >
                    Esqueceu o PIN?
                  </a>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] font-bold text-xs text-white shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-1.5"
                >
                  <LogIn size={14} /> Entrar no Aplicativo
                </button>
              </form>

              {/* Demo Quick Logins */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block text-center">
                  Entrada Rápida para Teste:
                </span>
                <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto pr-1">
                  {allClients.slice(0, 3).map((cl: any) => (
                    <button
                      key={cl.id}
                      type="button"
                      onClick={() => handleQuickDemoClientLogin(cl, '1234')}
                      className="flex items-center justify-between bg-slate-950/70 hover:bg-slate-800 border border-slate-800 rounded-lg px-2.5 py-1.5 text-left transition"
                    >
                      <div className="truncate">
                        <b className="text-[11px] text-white block truncate">{cl.fullName}</b>
                        <span className="text-[9px] text-slate-400">{cl.code} · {cl.serviceType === 'tv' ? 'TV' : 'Fibra'}</span>
                      </div>
                      <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded shrink-0">
                        PIN: 1234
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE APP HEADER */}
            <header className="shrink-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={OSDEL_LOGO_BASE64}
                    alt="OSDEL Logo"
                    className="w-9 h-9 rounded-xl bg-white p-1 object-contain shadow-xs shrink-0 border border-white/20"
                  />
                  <div>
                    <b className="text-xs tracking-wider uppercase opacity-95 block font-black">OSDEL TECNOLOGIA</b>
                    <span className="text-[10px] text-blue-200">Portal do Assinante · TV & Fibra</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title="Testar Envio de Mensagem Push-Up"
                    onClick={() => {
                      requestPushPermission();
                      sendMobilePush({
                        title: 'Lembrete de Pagamento · OSDEL',
                        body: `Sua factura de ${kz(activeContract.monthlyPrice || 8500)} vence em 3 dias. Pague via MCX para evitar corte de fibra na caixa PDO.`,
                        category: 'fatura',
                        targetAudience: 'cliente',
                        actionLabel: 'Ver Factura',
                      });
                    }}
                    className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1 text-[10px] font-bold"
                  >
                    <Bell size={13} />
                    <span className="hidden sm:inline">Push</span>
                  </button>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
                    {activeClient.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleClientLogout}
                    title="Terminar Sessão do Cliente"
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-rose-500/80 text-white transition"
                  >
                    <LogOut size={13} />
                  </button>
                </div>
              </div>

              {/* Banner de Dispositivo Offline */}
              {!isDeviceOnline && (
                <div className="mt-2.5 bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-[10.5px] font-bold flex items-center justify-between shadow-sm animate-pulse">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0 text-amber-900" />
                    <span>Sem Conexão à Internet: A exibir dados guardados. Não é possível ver dados em tempo real nem enviar comprovativos.</span>
                  </div>
                </div>
              )}

          {/* Quick Header Chips */}
          <div className="mt-2.5 pt-2 border-t border-white/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
            <button
              onClick={() => setActiveTab('inicio')}
              className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                activeTab === 'inicio' ? 'bg-white text-blue-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Tv size={12} /> Início
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 relative ${
                activeTab === 'chat' ? 'bg-white text-blue-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Bot size={12} className="text-amber-300" /> Chatbot & Suporte
              {chatHasAlert && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
            </button>
            <button
              onClick={() => setActiveTab('faturas')}
              className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                activeTab === 'faturas' ? 'bg-white text-blue-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Receipt size={12} /> Facturas & Comprovativo
            </button>
            <button
              onClick={() => setActiveTab('wifi')}
              className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                activeTab === 'wifi' ? 'bg-white text-blue-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Wifi size={12} /> Meu Wi-Fi
            </button>
            <button
              onClick={() => setActiveTab('avarias')}
              className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                activeTab === 'avarias' ? 'bg-white text-blue-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <AlertCircle size={12} /> Avarias
            </button>
            <button
              onClick={() => setActiveTab('diagnostico')}
              className={`px-2 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1 ${
                activeTab === 'diagnostico' ? 'bg-white text-blue-900' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              <Activity size={12} /> Velocidade
            </button>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg font-bold shrink-0 bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1 shadow-xs"
            >
              <MessageSquare size={12} /> WhatsApp Oficial
            </a>
          </div>
        </header>

        {/* SCROLLABLE SCREEN CONTENT */}
        <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900 p-4 space-y-4">
          {/* TAB 1: INÍCIO / RESUMO */}
          {activeTab === 'inicio' && (
            <div className="space-y-3.5">
              {/* Client Welcome Card */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                      Titular do Contrato
                    </span>
                    <h2 className="text-base font-extrabold leading-tight">{activeClient.fullName}</h2>
                    <p className="text-[11px] text-blue-200 mt-0.5">{activeClient.address}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      activeClient.status === 'active'
                        ? 'bg-emerald-400 text-emerald-950'
                        : activeClient.status === 'late'
                        ? 'bg-amber-400 text-amber-950'
                        : 'bg-red-400 text-red-950'
                    }`}
                  >
                    {activeClient.status === 'active'
                      ? 'Sinal Activo'
                      : activeClient.status === 'late'
                      ? 'Em Atraso'
                      : 'Suspenso'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 text-[11px]">
                  <div>
                    <span className="text-blue-200 text-[10px] block">Serviço Contratado:</span>
                    <b className="font-bold">{activeContract.planName}</b>
                  </div>
                  <div>
                    <span className="text-blue-200 text-[10px] block">Caixa de Ligação:</span>
                    <b className="font-mono">{activeClient.pdoNumber || 'PDO-04'}</b>
                  </div>
                </div>
              </div>

              {/* PAYMENT ALERT / NOTICE STRIP */}
              {activeClient.status !== 'active' ? (
                <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <b className="text-xs font-black text-red-900 block">
                        AVISO DE PAGAMENTO PENDENTE
                      </b>
                      <p className="text-[11px] text-red-800 leading-snug">
                        A sua mensalidade de <b>{kz(activeContract.monthlyPrice)}</b> encontra-se vencida. Evite o corte técnico do sinal pelo piquete da sua rua.
                      </p>
                    </div>
                  </div>

                  {/* Multicaixa Express payment box */}
                  <div className="rounded-xl bg-white p-3 border border-red-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>Pagamento por Multicaixa Express</span>
                      <CreditCard size={13} className="text-blue-600" />
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Entidade:</span>
                      <b className="font-mono text-slate-900">00142 (OSDEL)</b>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Referência:</span>
                      <div className="flex items-center gap-1">
                        <b className="font-mono text-slate-900">{activeClient.phone.replace(/[^0-9]/g, '').slice(-9)}</b>
                        <button
                          onClick={() => handleCopy(activeClient.phone.replace(/[^0-9]/g, '').slice(-9), 'ref')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Copiar referência"
                        >
                          {copiedField === 'ref' ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Montante:</span>
                      <b className="font-bold text-red-700">{kz(activeContract.monthlyPrice)}</b>
                    </div>
                  </div>

                  {/* PROMISE / ACORDO BUTTON */}
                  {activeApprovedPromise ? (
                    <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-2.5 text-emerald-900 text-xs flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
                      <div>
                        <b>Acordo de Pagamento Activo!</b>
                        <p className="text-[10px] text-emerald-800">
                          Sinal protegido contra corte até dia <b>{activeApprovedPromise.promisedDate}</b>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setModalPromise(true)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-slate-950 px-3 py-2 text-xs font-extrabold hover:bg-amber-400 transition shadow-sm"
                    >
                      <ShieldCheck size={14} /> Fazer Acordo para Não Sofrer Corte
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                    <div>
                      <b>Serviço Regularizado</b>
                      <p className="text-[10px] text-emerald-700">Mensalidade liquidada. Próximo vencimento no dia 5.</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">OK</span>
                </div>
              )}

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setModalTicket(true)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-400 transition shadow-xs flex flex-col justify-between h-24"
                >
                  <div className="h-7 w-7 rounded-lg bg-red-100 text-red-600 grid place-items-center">
                    <AlertCircle size={15} />
                  </div>
                  <div>
                    <b className="text-slate-900 block font-bold text-xs">Relatar Avaria</b>
                    <span className="text-[10px] text-slate-400">Sem sinal ou cabo partido</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('diagnostico')}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-400 transition shadow-xs flex flex-col justify-between h-24"
                >
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-600 grid place-items-center">
                    <Activity size={15} />
                  </div>
                  <div>
                    <b className="text-slate-900 block font-bold text-xs">Diagnóstico de Linha</b>
                    <span className="text-[10px] text-slate-400">Verificar atenuação dBm</span>
                  </div>
                </button>
              </div>

              {/* Company Announcements Feed */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <b className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Bell size={13} className="text-blue-600" /> Notícias da OSDEL
                  </b>
                  <span className="text-[10px] text-blue-600 font-bold">Oficial</span>
                </div>

                <div className="space-y-2">
                  {announcements.slice(0, 2).map((ann) => (
                    <div key={ann.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <b className="text-slate-900 block font-bold text-[11px] leading-tight">
                        {ann.title}
                      </b>
                      <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                        {ann.content}
                      </p>
                      <span className="text-[9px] text-slate-400 block">{ann.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: FACTURAS & COMPROVATIVOS DO CLIENTE */}
          {activeTab === 'faturas' && (
            <div className="space-y-3.5 text-xs">
              {/* Current Monthly Bill Banner */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Mensalidade Atual ({new Date().toLocaleString('pt-AO', { month: 'long' })})
                    </span>
                    <b className="text-2xl font-black text-amber-400 block mt-0.5">
                      {kz(activeContract.monthlyPrice || 4000)}
                    </b>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      activeClient.status === 'late'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                    }`}
                  >
                    {activeClient.status === 'late' ? 'Por Liquidar' : 'Em Dia'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">Vencimento: Dia 05</span>
                  <button
                    onClick={() => setModalComprovativo(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-[11px] hover:bg-emerald-400 shadow-sm transition"
                  >
                    <Upload size={13} /> Enviar Comprovativo
                  </button>
                </div>
              </div>

              {/* Bank Transfer Coordinates Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
                <b className="text-xs font-bold text-slate-800 block border-b border-slate-100 pb-2">
                  Coordenadas para Pagamento por Transferência
                </b>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <b className="text-slate-900 block text-xs">Banco BAI</b>
                      <span className="font-mono text-[10px] text-slate-500">AO06.0040.0000.1234.5678.9012.3</span>
                    </div>
                    <button
                      onClick={() => handleCopy('AO06.0040.0000.1234.5678.9012.3', 'iban_bai')}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 font-bold text-[10px] text-slate-700 hover:bg-slate-100"
                    >
                      {copiedField === 'iban_bai' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <b className="text-slate-900 block text-xs">Banco BFA</b>
                      <span className="font-mono text-[10px] text-slate-500">AO06.0006.0000.9876.5432.1098.7</span>
                    </div>
                    <button
                      onClick={() => handleCopy('AO06.0006.0000.9876.5432.1098.7', 'iban_bfa')}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 font-bold text-[10px] text-slate-700 hover:bg-slate-100"
                    >
                      {copiedField === 'iban_bfa' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Invoices List with Dual Formats (POS Thermal with Logo & A4) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <b className="text-xs font-bold text-slate-800 block">As Minhas Facturas & Recibos</b>
                    <span className="text-[10px] text-slate-400">Imprima o talão de recibo ou factura oficial</span>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    {clientInvoices.length > 0 ? clientInvoices.length : 1} Documentos
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(clientInvoices.length > 0
                    ? clientInvoices
                    : [
                        {
                          id: 101,
                          invoiceNumber: 'FT-2026/00142',
                          amount: activeContract.monthlyPrice || 4000,
                          total: activeContract.monthlyPrice || 4000,
                          status: 'paga',
                          issuedAt: new Date().toISOString(),
                          dueDate: 'Dia 05',
                          paymentMethod: 'Multicaixa',
                        },
                      ]
                  ).map((inv: any) => (
                    <div
                      key={inv.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-blue-700 block">
                            {inv.invoiceNumber || `FT-${inv.id}`}
                          </span>
                          <b className="text-slate-900 block text-xs">Mensalidade de Serviço</b>
                          <span className="text-[10px] text-slate-500">
                            Vencimento: {inv.dueDate || 'Dia 05'} · {inv.paymentMethod || 'Multicaixa'}
                          </span>
                        </div>
                        <div className="text-right">
                          <b className="text-sm font-black text-slate-900 block">{kz(inv.total || inv.amount)}</b>
                          <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {inv.status || 'Liquidada'}
                          </span>
                        </div>
                      </div>

                      {/* Download / Print Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <Link
                          href={getPrintUrl('fatura', { id: inv.id, formato: 'pos' })}
                          className="py-1.5 rounded-lg bg-slate-900 text-white font-bold text-[10.5px] hover:bg-black flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Receipt size={12} className="text-amber-400" />
                          <span>🧾 Talão POS (80mm)</span>
                        </Link>
                        <Link
                          href={getPrintUrl('fatura', { id: inv.id, formato: 'a4' })}
                          className="py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 font-bold text-[10.5px] hover:bg-slate-100 flex items-center justify-center gap-1"
                        >
                          <Printer size={12} />
                          <span>📄 Factura A4</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MEU WI-FI & GESTÃO DA ONT (CLIENTES FIBRA) */}
          {activeTab === 'wifi' && (
            <div className="space-y-3.5 text-xs">
              {activeClient.serviceType === 'tv' ? (
                /* Assinante possui apenas TV - Exibir Adesão à Fibra Óptica */
                <div className="rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-5 shadow-xl border border-blue-400/30 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/40 mx-auto flex items-center justify-center text-blue-300 shadow-md">
                    <Wifi size={28} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Disponível na sua Rua
                    </span>
                    <h3 className="text-lg font-black mt-2">Ainda não tem Internet Fibra Óptica?</h3>
                    <p className="text-[11px] text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
                      A sua residência possui apenas TV. A OSDEL já tem cobertura de fibra óptica FTTH no seu poste! Navegue a alta velocidade com tráfego ilimitado.
                    </p>
                  </div>

                  <div className="bg-white/10 p-3 rounded-2xl text-left text-xs space-y-2 border border-white/10">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-200">Plano Fibra 10 Mbps</span>
                      <span className="text-emerald-400">6.500 Kz/mês</span>
                    </div>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-200">Plano Fibra 22 Mbps</span>
                      <span className="text-emerald-400">8.500 Kz/mês</span>
                    </div>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-200">Plano Combo (TV + Fibra 22M)</span>
                      <span className="text-emerald-400">10.500 Kz/mês</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <a
                      href={whatsappAdherenceFiber}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Wifi size={14} /> Aderir à Fibra Óptica via WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setTicketForm({
                          category: 'outros',
                          title: 'Pedido de Adesão à Internet Fibra',
                          description: `Solicito instalação de fibra óptica para a minha residência no endereço ${activeClient.address}.`,
                          photoUrl: '',
                        });
                        setModalTicket(true);
                      }}
                      className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] border border-white/20"
                    >
                      Solicitar Visita Técnica para Instalação
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white p-4 space-y-3.5 shadow-md">
                    <div className="flex justify-between items-center border-b border-blue-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Wifi size={18} className="text-blue-400 animate-pulse" />
                        <div>
                          <b className="text-xs text-white block">Router Wi-Fi OSDEL FTTH</b>
                          <span className="text-[9.5px] text-blue-300">Terminal ONT Dual-Band (2.4G & 5G)</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        SINAL ONLINE
                      </span>
                    </div>

                    {/* Wi-Fi Name & Password */}
                    <div className="space-y-2.5 bg-black/40 rounded-xl p-3 border border-white/10">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-blue-200 block">Nome da Rede Wi-Fi (SSID):</span>
                          <b className="font-mono text-sm text-white">OSDEL-FIBRA-{activeClient.houseCode || 'CASA'}</b>
                        </div>
                        <button
                          onClick={() => handleCopy(`OSDEL-FIBRA-${activeClient.houseCode || 'CASA'}`, 'ssid')}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white border border-white/20"
                        >
                          {copiedField === 'ssid' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-white/10">
                        <div>
                          <span className="text-[10px] text-blue-200 block">Palavra-passe do Wi-Fi:</span>
                          <b className="font-mono text-sm text-amber-300">
                            {showWifiPassword ? 'osdel@2026#segura' : '••••••••••••'}
                          </b>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setShowWifiPassword(!showWifiPassword)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20"
                          >
                            {showWifiPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button
                            onClick={() => handleCopy('osdel@2026#segura', 'wifi_pass')}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white border border-white/20"
                          >
                            {copiedField === 'wifi_pass' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => alert('Pedido de reinicialização remota do router enviado! O equipamento sincronizará em 45 segundos.')}
                        className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-500 shadow-xs"
                      >
                        Reiniciar Router
                      </button>
                      <button
                        onClick={() => {
                          setTicketForm({
                            category: 'outros',
                            title: 'Troca de Senha do Wi-Fi',
                            description: `Gostaria de solicitar a alteração da minha senha do Wi-Fi para o cliente ${activeClient.fullName}.`,
                            photoUrl: '',
                          });
                          setModalTicket(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-white/10 text-white font-bold text-[11px] hover:bg-white/20 border border-white/20"
                      >
                        Pedir Nova Senha
                      </button>
                    </div>
                  </div>

                  {/* Connected Devices */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <b className="text-xs font-bold text-slate-800">Aparelhos Conectados Agora (4)</b>
                      <span className="text-[10px] text-emerald-600 font-bold">4 Dispositivos</span>
                    </div>

                    <div className="space-y-1.5">
                      {[
                        { name: 'Smart TV Sala (Samsung UHD)', ip: '192.168.1.102', band: '5 GHz' },
                        { name: 'iPhone 14 Pro Max', ip: '192.168.1.105', band: '5 GHz' },
                        { name: 'Computador HP Pavilion', ip: '192.168.1.110', band: '2.4 GHz' },
                        { name: 'Tablet Samsung Galaxy', ip: '192.168.1.118', band: '2.4 GHz' },
                      ].map((dev, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px] p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <div>
                            <b className="text-slate-900 block leading-tight">{dev.name}</b>
                            <span className="font-mono text-[9.5px] text-slate-400">{dev.ip}</span>
                          </div>
                          <span className="text-[9.5px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {dev.band}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: CONTRATO & FACTURAS */}
          {activeTab === 'contrato' && (
            <div className="space-y-3 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <FileText size={15} className="text-blue-600" /> Ficha do Contrato
                </h3>
                <div className="space-y-2 border-t border-slate-100 pt-2 text-[11px]">
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Plano:</span>
                    <b className="text-slate-900">{activeContract.planName}</b>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Valor Mensal:</span>
                    <b className="font-bold text-slate-900">{kz(activeContract.monthlyPrice)}</b>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Dia de Pagamento:</span>
                    <b className="text-slate-900">Dia 5 de cada mês</b>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Caixa PDO:</span>
                    <b className="font-mono text-slate-900">{activeClient.pdoNumber || 'PDO-04'}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Morada de Instalação:</span>
                    <b className="text-right text-slate-900">{activeClient.address}</b>
                  </div>
                </div>
              </div>

              {/* Invoices and Payments History */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <CreditCard size={15} className="text-emerald-600" /> Histórico de Pagamentos
                </h3>

                {clientPayments.length > 0 ? (
                  <div className="space-y-2">
                    {clientPayments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-[11px]">
                        <div>
                          <b className="text-slate-900 block">Mensalidade {p.paymentMonth}</b>
                          <span className="text-[10px] text-slate-400 capitalize">{p.method} · {p.reference || 'Ref MCX'}</span>
                        </div>
                        <div className="text-right">
                          <b className="font-bold text-emerald-700 block">{kz(p.amount)}</b>
                          <span className="text-[9px] text-emerald-600 font-bold">Liquidado ✓</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic py-2">
                    Nenhum pagamento anterior registado na base.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AVARIAS & SUPORTE */}
          {activeTab === 'avarias' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <b className="text-xs font-bold text-slate-800">Tickets de Assistência</b>
                <button
                  onClick={() => setModalTicket(true)}
                  className="rounded-lg bg-blue-600 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-blue-700"
                >
                  + Relatar Problema
                </button>
              </div>

              {myTickets.length > 0 ? (
                <div className="space-y-2">
                  {myTickets.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-slate-400">{t.ticketCode}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            t.status === 'resolvido'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'tecnico_a_caminho'
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.status === 'tecnico_a_caminho' ? 'Técnico a Caminho' : t.status}
                        </span>
                      </div>
                      <b className="text-xs text-slate-900 block">{t.title}</b>
                      <p className="text-[11px] text-slate-600">{t.description}</p>
                      {t.assignedTechnician && (
                        <span className="text-[10px] text-blue-700 font-medium block">
                          Técnico atribuído: <b>{t.assignedTechnician}</b>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                  <p className="text-xs">Não possui avarias pendentes.</p>
                </div>
              )}

              {/* Direct Support Contact */}
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3 text-xs space-y-2">
                <b className="text-blue-900 font-bold block">Linha Directa de Apoio OSDEL</b>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">WhatsApp Técnico:</span>
                  <b className="font-mono text-blue-800">+244 923 456 789</b>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Piquete de Emergência:</span>
                  <b className="font-mono text-blue-800">945 882 103</b>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTÍCIAS & AVISOS */}
          {activeTab === 'noticias' && (
            <div className="space-y-3 text-xs">
              <h3 className="text-xs font-bold uppercase text-slate-500">Comunicados da Empresa</h3>
              <div className="space-y-2.5">
                {announcements.map((ann) => (
                  <div key={ann.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1.5">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800">
                      {ann.category}
                    </span>
                    <b className="text-xs text-slate-900 block leading-snug">{ann.title}</b>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{ann.content}</p>
                    <span className="text-[9px] text-slate-400 block pt-1">{ann.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DIAGNÓSTICO DE SINAL & SPEEDTEST */}
          {activeTab === 'diagnostico' && (
            <div className="space-y-3.5 text-xs">
              {/* SPEEDTEST CARD */}
              <div className="rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white p-4 space-y-3.5 shadow-md">
                <div className="flex justify-between items-center border-b border-blue-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={18} className="text-blue-400" />
                    <b className="text-xs text-white">Medidor de Velocidade em Tempo Real</b>
                  </div>
                  <span className="text-[9.5px] font-mono text-blue-300">Servidor OSDEL Luanda</span>
                </div>

                <div className="text-center py-2">
                  <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">
                    Velocidade de Download
                  </span>
                  <b className="text-4xl font-black font-mono text-blue-400 block mt-1 tracking-tight">
                    {speedMetrics ? `${speedMetrics.download} Mbps` : speedTestRunning ? 'Testando...' : `${activeContract.planSpeed || '22 Mbps'}`}
                  </b>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {speedTestRunning ? `A calibrar pacote... (${speedProgress}%)` : 'Plano contratado: Sem limites de tráfego'}
                  </span>
                </div>

                {speedTestRunning && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${speedProgress}%` }}
                    />
                  </div>
                )}

                {speedMetrics && (
                  <div className="grid grid-cols-3 gap-2 bg-black/40 rounded-xl p-2.5 text-center text-[10.5px] border border-white/10">
                    <div>
                      <span className="text-[9px] text-slate-400 block">Upload</span>
                      <b className="font-mono text-emerald-400">{speedMetrics.upload} Mbps</b>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Ping</span>
                      <b className="font-mono text-white">{speedMetrics.ping} ms</b>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block">Jitter</span>
                      <b className="font-mono text-white">{speedMetrics.jitter} ms</b>
                    </div>
                  </div>
                )}

                <button
                  disabled={speedTestRunning}
                  onClick={runSpeedTest}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <RefreshCw size={14} className={speedTestRunning ? 'animate-spin' : ''} />
                  {speedTestRunning ? 'A medir velocidade...' : 'Iniciar Teste de Velocidade'}
                </button>
              </div>

              {/* Optical signal line quality */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Activity size={16} className="text-emerald-600" /> Atenuação da Fibra / Sinal TV
                </h3>
                <p className="text-[11px] text-slate-500">
                  Potência óptica RX medida na porta PDO ({activeClient.pdoNumber || 'PDO-04'}):
                </p>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2 text-[11px]">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Potência Óptica (RX):</span>
                    <b className="text-emerald-700 font-mono">-19.4 dBm</b>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Qualidade de Conexão:</span>
                    <b className="text-emerald-800">Excelente (Sem perdas de pacotes)</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Caixa PDO & Porta:</span>
                    <b className="font-mono text-slate-900">{activeClient.pdoNumber || 'PDO-04'} (Porta 6)</b>
                  </div>
                </div>
              </div>

              {/* Digital Client Card */}
              <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Cartão Digital de Cliente</span>
                  <QrCode size={18} className="text-white" />
                </div>
                <div>
                  <b className="text-sm font-bold block">{activeClient.fullName}</b>
                  <span className="font-mono text-xs text-blue-300">{activeClient.code}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-[10px] text-slate-400">
                  <span>OSDEL TECNOLOGIA ANGOLA</span>
                  <span>CLIENTE VÁLIDO</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CHATBOT & ATENDIMENTO AO CLIENTE */}
          {activeTab === 'chat' && (
            <div className="space-y-3 flex flex-col h-[65vh]">
              {/* Header do Chat / Status do Atendente */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-3.5 rounded-2xl shadow-md border border-blue-800 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                        <Bot size={22} className="text-amber-300" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-xs text-white">Assistente Virtual OSDEL</h3>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                          Online 24/7
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-200">
                        Atendimento instantâneo & escalonamento com equipa humana
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleSendClientChat('Quero falar com um atendente humano urgente');
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition"
                    title="Solicitar intervenção humana"
                  >
                    <User size={12} />
                    <span>Chamar Humano</span>
                  </button>
                </div>

                {chatHasAlert && (
                  <div className="mt-2.5 p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center gap-2 text-[10px] text-rose-200 font-semibold animate-pulse">
                    <AlertCircle size={13} className="text-rose-400 shrink-0" />
                    <span>Intervenção administrativa solicitada. Um operador da OSDEL assumirá este chat.</span>
                  </div>
                )}
              </div>

              {/* Sugestões Rápidas de Tópicos */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[10px] font-bold">
                {[
                  { label: '💰 Consultar Saldo', text: 'Qual o meu saldo devedor e data de vencimento?' },
                  { label: '💳 Coordenadas IBAN', text: 'Quais são as coordenadas bancárias e IBAN da OSDEL?' },
                  { label: '🔴 Luz Vermelha LOS', text: 'O meu modem está com luz vermelha LOS a piscar' },
                  { label: '📺 Sem Sinal de TV', text: 'A televisão está sem sinal ou com ecrã azul' },
                  { label: '👤 Falar c/ Humano', text: 'Preciso falar com um atendente humano agora' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendClientChat(chip.text)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 whitespace-nowrap transition"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Mensagens do Chat */}
              <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-slate-100/70 rounded-2xl border border-slate-200 text-xs">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <Bot size={32} className="mx-auto text-blue-500 opacity-60" />
                    <p className="font-semibold text-xs">Inicie uma conversa com o assistente OSDEL</p>
                    <p className="text-[10px]">Tire dúvidas sobre pagamentos, avarias ou solicite suporte humano.</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isClient = msg.sender === 'client';
                    const isAdmin = msg.sender === 'admin';
                    const isBot = msg.sender === 'bot';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isClient ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                          {isBot && (
                            <span className="font-bold text-blue-600 flex items-center gap-1">
                              <Bot size={11} /> {msg.senderName || 'Assistente OSDEL'}
                            </span>
                          )}
                          {isAdmin && (
                            <span className="font-bold text-indigo-700 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              <ShieldCheck size={11} /> {msg.senderName || 'Operador Administrativo'}
                            </span>
                          )}
                          {isClient && <span className="font-bold text-slate-600">Você</span>}
                          <span>·</span>
                          <span>
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isClient
                              ? 'bg-blue-600 text-white rounded-tr-xs'
                              : isAdmin
                              ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-indigo-700/60 rounded-tl-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs space-y-2'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.message}</p>

                          {msg.requiresHuman && (
                            <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-start gap-1.5 font-medium">
                              <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                              <span>
                                Um operador administrativo foi notificado com alta prioridade e entrará em contacto.
                              </span>
                            </div>
                          )}

                          {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                              {msg.suggestedActions.map((act, actIdx) => (
                                <button
                                  key={actIdx}
                                  type="button"
                                  onClick={() => {
                                    if (act.action === 'check_balance') {
                                      handleSendClientChat('Consultar o meu saldo devedor');
                                    } else if (act.action === 'bank_info') {
                                      handleSendClientChat('Quais as coordenadas bancárias da OSDEL?');
                                    } else if (act.action === 'los_fiber') {
                                      handleSendClientChat('Luz vermelha LOS acesa no modem de fibra');
                                    } else if (act.action === 'no_tv') {
                                      handleSendClientChat('Sem sinal de TV ou ecrã azul na televisão');
                                    } else if (act.action === 'request_human') {
                                      handleSendClientChat('Quero falar com um atendente humano da administração');
                                    } else {
                                      handleSendClientChat(act.label);
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition"
                                >
                                  {act.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Caixa de Entrada de Mensagem */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendClientChat();
                }}
                className="flex items-center gap-2 pt-1 shrink-0"
              >
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder="Escreva sua dúvida ou mensagem..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                />
                <button
                  type="submit"
                  disabled={!chatInputText.trim()}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-md shadow-blue-600/30 transition shrink-0"
                  title="Enviar Mensagem"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION TABS */}
        <nav className="shrink-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around text-[10px] font-bold">
          <button
            onClick={() => setActiveTab('inicio')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'inicio' ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            <Tv size={18} />
            <span>Início</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center gap-1 transition relative ${
              activeTab === 'chat' ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <MessageSquare size={18} />
              {chatHasAlert && (
                <span className="absolute -top-1 -right-1.5 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white animate-pulse">
                  !
                </span>
              )}
            </div>
            <span>Chat & Bot</span>
          </button>

          <button
            onClick={() => setActiveTab('faturas')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'faturas' ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            <Receipt size={18} />
            <span>Facturas</span>
          </button>

          <button
            onClick={() => setActiveTab('wifi')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'wifi' ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            <Wifi size={18} />
            <span>Meu Wi-Fi</span>
          </button>

          <button
            onClick={() => setActiveTab('avarias')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'avarias' ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            <AlertCircle size={18} />
            <span>Avarias</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostico')}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === 'diagnostico' ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            <Activity size={18} />
            <span>Velocidade</span>
          </button>
        </nav>
        </>
        )}
      </div>

      {/* MODAL: SOLICITAR ACORDO DE PAGAMENTO */}
      {modalPromise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <b className="text-sm text-slate-900">Pedir Acordo de Não-Corte</b>
              <button onClick={() => setModalPromise(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Submeta um compromisso de liquidação. Se aprovado pelo operador da OSDEL, o seu sinal não sofrerá corte até à data indicada.
            </p>

            <form onSubmit={handleRequestPromise} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Data Prometida de Pagamento</label>
                <input
                  required
                  type="date"
                  value={promiseForm.promisedDate}
                  onChange={(e) => setPromiseForm({ ...promiseForm, promisedDate: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor a Liquidar (Kz)</label>
                <input
                  required
                  type="number"
                  value={promiseForm.promisedAmount}
                  onChange={(e) => setPromiseForm({ ...promiseForm, promisedAmount: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo do Atraso</label>
                <textarea
                  rows={2}
                  required
                  value={promiseForm.reason}
                  onChange={(e) => setPromiseForm({ ...promiseForm, reason: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalPromise(false)}
                  className="px-3 py-1.5 rounded-lg border text-slate-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                >
                  Submeter Acordo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RELATAR PROBLEMA */}
      {modalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <b className="text-sm text-slate-900">Relatar Avaria Técnica</b>
              <button onClick={() => setModalTicket(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Problema</label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value as any })}
                  className="w-full h-9 rounded-lg border border-slate-300 px-2 text-xs"
                >
                  <option value="sem_sinal_tv">TV sem sinal / Chuvisco</option>
                  <option value="sem_internet">Sem Internet / Fibra Desligada</option>
                  <option value="router_los">Luz Vermelha (LOS) no Router</option>
                  <option value="cabo_partido">Cabo caído ou partido na rua</option>
                  <option value="lentidao">Internet lenta</option>
                  <option value="outros">Outro problema</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Título Resumido</label>
                <input
                  required
                  placeholder="Ex.: Televisão da sala sem canais"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição Detalhada</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva o que acontece..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalTicket(false)}
                  className="px-3 py-1.5 rounded-lg border text-slate-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
                >
                  Enviar Chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ENVIAR COMPROVATIVO DE TRANSFERÊNCIA BANCÁRIA */}
      {modalComprovativo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-emerald-600" />
                <b className="text-sm text-slate-900">Enviar Comprovativo Bancário</b>
              </div>
              <button
                onClick={() => setModalComprovativo(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Anexe ou digite a referência da sua transferência Multicaixa Express, BAI Directo ou BFA Net para validação e baixa de pagamento.
            </p>

            <form onSubmit={handleSendComprovativo} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Banco / Origem</label>
                <select
                  value={compBank}
                  onChange={(e) => setCompBank(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 px-2 text-xs bg-white"
                >
                  <option value="Banco BAI">Banco BAI (BAI Directo / Depósito)</option>
                  <option value="Banco BFA">Banco BFA (BFA Net / Depósito)</option>
                  <option value="Multicaixa Express">Multicaixa Express</option>
                  <option value="Banco BIC">Banco BIC</option>
                  <option value="Banco BCI">Banco BCI</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nº de Operação / Referência *</label>
                <input
                  required
                  placeholder="Ex.: MCX-2026-98124 ou BAI-TR-4421"
                  value={compRef}
                  onChange={(e) => setCompRef(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor Transferido (Kz) *</label>
                <input
                  required
                  type="number"
                  value={compAmount}
                  onChange={(e) => setCompAmount(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Anexo do Comprovativo (Foto / PDF)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 text-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                  <Upload size={18} className="mx-auto text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {compFileName || 'Toque para selecionar imagem ou PDF'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    id="comprovativo-file-input"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setCompFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <label
                    htmlFor="comprovativo-file-input"
                    className="text-[10px] text-blue-600 font-bold cursor-pointer hover:underline block mt-0.5"
                  >
                    Procurar no telemóvel
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setModalComprovativo(false)}
                  className="px-3 py-1.5 rounded-lg border text-slate-600 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={compSuccess}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                >
                  {compSuccess ? 'A validar...' : 'Enviar Comprovativo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export const ClientMobileAppPage = ClientMobileApp;
