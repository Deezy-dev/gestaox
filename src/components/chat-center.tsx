import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Search,
  Filter,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  Check,
  Wifi,
  Tv,
  Layers,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Bell,
  Volume2,
  VolumeX,
  Trash2,
  Radio,
  FileText,
  MapPin,
  Flame,
  CheckCheck,
  Info,
  Paperclip,
  Image as ImageIcon,
  Maximize2,
  CreditCard,
  Banknote,
  Receipt,
  X,
} from 'lucide-react';
import {
  TeamMessage,
  ClientChatMessage,
  SupportInterventionTicket,
  getStoredTeamMessages,
  sendTeamMessage,
  getClientChatMessages,
  sendClientMessage,
  getHumanInterventionTickets,
  claimHumanIntervention,
  resolveHumanIntervention,
  playNotificationSound,
} from '@/lib/team-chat';
import {
  session,
  useListClients,
  useGetSettings,
  useListInvoices,
  useCreatePayment,
  useListFinancialAccounts,
} from '@/lib/local-api';
import { processClientMessageWithBot } from '@/lib/client-chatbot';

/* ==========================================================================
   1. CHAT DE SUPORTE AO CLIENTE & INTERVENÇÃO HUMANA DO CHATBOT
   ========================================================================== */

export function ClientSupportChatView() {
  const currentSession = session();
  const operatorName = currentSession?.name || 'Administrador OSDEL';
  const operatorId = currentSession?.id || 1;

  const clientsQuery = useListClients();
  const allClients = clientsQuery.data?.items || [];
  const settingsQuery = useGetSettings();
  const settings = settingsQuery.data || {};
  const companyPhone = settings.companyWhatsApp || settings.companyPhone || '926153736';

  const invoicesQuery = useListInvoices();
  const allInvoices = (Array.isArray(invoicesQuery.data) ? invoicesQuery.data : invoicesQuery.data?.items) || [];
  const createPaymentMutation = useCreatePayment();

  const [selectedClientId, setSelectedClientId] = useState<number>(() => allClients[0]?.id || 1);
  const [messages, setMessages] = useState<ClientChatMessage[]>([]);
  const [interventions, setInterventions] = useState<SupportInterventionTicket[]>(() =>
    getHumanInterventionTickets()
  );
  const [inputText, setInputText] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'aguardando' | 'em_atendimento' | 'resolvido'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDossier, setShowDossier] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [attachmentDraft, setAttachmentDraft] = useState<{ url: string; name: string } | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [fastPayModal, setFastPayModal] = useState<{ invoice?: any; client: any } | null>(null);
  const [fastPayMethod, setFastPayMethod] = useState('Multicaixa Express');
  const [fastPayAccount, setFastPayAccount] = useState('acc-caixa');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeClient = allClients.find((c: any) => c.id === selectedClientId) || allClients[0] || {
    id: 1,
    code: 'CLI-00001',
    fullName: 'António Domingos Pedro',
    phone: '+244 923 456 789',
    address: 'Rua 12, Golf I',
    serviceType: 'combo',
    status: 'late',
  };

  const activeTicket = interventions.find((t) => t.clientId === activeClient.id);

  // Carrega mensagens do cliente selecionado
  const refreshMessages = () => {
    if (activeClient) {
      setMessages(getClientChatMessages(activeClient.id, activeClient.fullName, activeClient.code));
    }
    setInterventions(getHumanInterventionTickets());
  };

  useEffect(() => {
    refreshMessages();
  }, [selectedClientId, activeClient?.id]);

  useEffect(() => {
    const handleUpdate = () => refreshMessages();
    window.addEventListener('osdel-client-chat-updated', handleUpdate);
    window.addEventListener('osdel-interventions-updated', handleUpdate);
    return () => {
      window.removeEventListener('osdel-client-chat-updated', handleUpdate);
      window.removeEventListener('osdel-interventions-updated', handleUpdate);
    };
  }, [selectedClientId]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachmentDraft) return;

    // Envia mensagem pelo administrador
    sendClientMessage(
      activeClient.id,
      activeClient.code,
      activeClient.fullName,
      inputText.trim() || (attachmentDraft ? 'Comprovativo / Ficheiro em anexo' : ''),
      'admin',
      operatorName,
      attachmentDraft ? { url: attachmentDraft.url, name: attachmentDraft.name, type: 'receipt' } : undefined
    );

    // Se houver ticket aguardando atendente, assume automaticamente
    if (activeTicket && activeTicket.status === 'aguardando_atendente') {
      claimHumanIntervention(activeTicket.id, operatorName, operatorId);
    }

    setInputText('');
    setAttachmentDraft(null);
    refreshMessages();
    if (!soundMuted) playNotificationSound('success');
  };

  const handleSimulateClientQuestion = (question: string) => {
    // Simula mensagem enviada pelo cliente no app móvel
    sendClientMessage(
      activeClient.id,
      activeClient.code,
      activeClient.fullName,
      question,
      'client',
      activeClient.fullName
    );

    setIsTyping(true);

    // O bot processa em 700ms
    setTimeout(() => {
      setIsTyping(false);
      processClientMessageWithBot(question, {
        clientId: activeClient.id,
        clientCode: activeClient.code,
        clientName: activeClient.fullName,
        phone: activeClient.phone,
        address: activeClient.address,
        serviceType: activeClient.serviceType,
        planName: activeClient.planName,
        balanceDue: activeClient.status === 'late' ? 8000 : 0,
        dueDay: 5,
        companyWhatsApp: companyPhone,
      });
      refreshMessages();
      if (!soundMuted) playNotificationSound('message');
    }, 700);
  };

  const handleExecuteFastPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastPayModal) return;
    const inv = fastPayModal.invoice;
    const client = fastPayModal.client;
    const amount = inv ? Number(inv.amount || inv.total || 0) : Number(client.monthlyPrice || (client.serviceType === 'tv' ? 4000 : 6500));
    const ref = `REC-CHAT-${Date.now().toString().slice(-6)}`;
    const month = inv?.referenceMonth || new Date().toISOString().slice(0, 7);

    createPaymentMutation.mutate({
      clientId: client.id,
      clientName: client.fullName,
      amount,
      penalty: Number(inv?.penalty || 0),
      paymentMonth: month,
      referenceMonth: month,
      method: fastPayMethod,
      reference: ref,
      receiptNumber: ref,
      accountId: fastPayAccount,
      serviceType: client.serviceType,
      invoiceId: inv?.id,
      notes: `Liquidado via Central de Atendimento Messenger por ${operatorName}`,
    }, {
      onSuccess: () => {
        // Envia mensagem no chat confirmando baixa
        sendClientMessage(
          client.id,
          client.code,
          client.fullName,
          `✅ PAGAMENTO CONFIRMADO: Recebemos o valor de ${amount.toLocaleString('pt-AO')} Kz (${fastPayMethod}) referente à mensalidade de ${month}. O seu serviço está 100% activo e regularizado! Recibo #${ref}. Obrigado pela preferência!`,
          'admin',
          operatorName
        );
        setFastPayModal(null);
        refreshMessages();
        if (!soundMuted) playNotificationSound('success');
      }
    });
  };

  const handleClaimTicket = () => {
    if (activeTicket) {
      claimHumanIntervention(activeTicket.id, operatorName, operatorId);
      refreshMessages();
    }
  };

  const handleResolveTicket = () => {
    if (activeTicket) {
      resolveHumanIntervention(activeTicket.id, operatorName);
      refreshMessages();
    }
  };

  // Filtragem da lista lateral de clientes
  const filteredClients = allClients.filter((c: any) => {
    const ticket = interventions.find((t) => t.clientId === c.id);
    const matchesSearch =
      !searchTerm ||
      c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filterType === 'aguardando') {
      return ticket && ticket.status === 'aguardando_atendente';
    }
    if (filterType === 'em_atendimento') {
      return ticket && ticket.status === 'em_atendimento';
    }
    if (filterType === 'resolvido') {
      return ticket && ticket.status === 'resolvido';
    }
    return true;
  });

  const pendingCount = interventions.filter((t) => t.status === 'aguardando_atendente').length;

  return (
    <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-xl flex flex-col lg:flex-row h-[740px]">
      {/* PAINEL ESQUERDO: LISTA DE CLIENTES E TICKETS DE ATENDIMENTO */}
      <div className="w-full lg:w-80 border-r border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--card))] shrink-0">
        <div className="p-4 border-b border-[hsl(var(--border))] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Atendimento & Bot</h3>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Fila de Chamados e Chat</p>
              </div>
            </div>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[11px] font-black uppercase tracking-wider animate-pulse">
                <Flame size={12} /> {pendingCount} Aguardando
              </span>
            )}
          </div>

          {/* Barra de pesquisa de cliente */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" size={14} />
            <input
              type="text"
              placeholder="Buscar cliente, código ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-xs outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Filtros de Fila */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
            <button
              onClick={() => setFilterType('todos')}
              className={`py-1.5 px-2 rounded-lg transition text-center ${
                filterType === 'todos'
                  ? 'bg-[#0084ff] text-white shadow-xs'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Todos ({allClients.length})
            </button>
            <button
              onClick={() => setFilterType('aguardando')}
              className={`py-1.5 px-2 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                filterType === 'aguardando'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
              }`}
            >
              <AlertTriangle size={12} /> Alertas ({pendingCount})
            </button>
          </div>

          {/* Linha de Activos Agora (Estilo Facebook Messenger) */}
          <div className="pt-2 border-t border-[hsl(var(--border))]">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Activos Agora
              </span>
              <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{Math.min(allClients.length, 8)} online</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {allClients.slice(0, 8).map((c: any) => {
                const isSelected = c.id === selectedClientId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClientId(c.id)}
                    className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
                  >
                    <div className="relative">
                      <div
                        className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs transition group-hover:scale-105 ${
                          isSelected
                            ? 'ring-2 ring-[#0084ff] bg-[#0084ff]'
                            : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500'
                        }`}
                      >
                        {c.fullName?.slice(0, 2).toUpperCase() || 'CL'}
                      </div>
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[hsl(var(--card))]" />
                    </div>
                    <span className="text-[10px] text-[hsl(var(--foreground))] truncate w-12 text-center font-medium">
                      {c.fullName?.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lista rolável de clientes estilo Facebook Messenger */}
        <div className="flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]">
          {filteredClients.length > 0 ? (
            filteredClients.map((client: any) => {
              const ticket = interventions.find((t) => t.clientId === client.id);
              const isSelected = client.id === selectedClientId;
              const hasAlert = ticket && ticket.status === 'aguardando_atendente';

              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`w-full p-3.5 text-left transition flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-[#0084ff]'
                      : hasAlert
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-50'
                      : 'hover:bg-[hsl(var(--secondary))]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shadow-xs text-white ${
                        hasAlert
                          ? 'bg-rose-600'
                          : client.serviceType === 'tv'
                          ? 'bg-gradient-to-tr from-amber-500 to-orange-600'
                          : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
                      }`}
                    >
                      {client.fullName?.slice(0, 2).toUpperCase() || 'OS'}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[hsl(var(--card))]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <b className="text-xs font-bold text-[hsl(var(--foreground))] truncate">
                        {client.fullName}
                      </b>
                      <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                        {client.code}
                      </span>
                    </div>

                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                      {ticket?.lastClientMessage || client.phone || 'Sem histórico'}
                    </p>

                    {hasAlert && (
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-400 font-extrabold text-[9px] uppercase tracking-wider">
                        <Flame size={10} /> Solicita Atendente
                      </div>
                    )}
                    {ticket && ticket.status === 'em_atendimento' && (
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[9px]">
                        <CheckCheck size={10} /> Em atendimento por {ticket.assignedAdminName}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
              Nenhum cliente encontrado com estes filtros.
            </div>
          )}
        </div>
      </div>

      {/* PAINEL CENTRAL / DIREITO: CONVERSA, CHATBOT E INTERVENÇÃO HUMANA */}
      <div className="flex-1 flex flex-col bg-[hsl(var(--secondary)/.3)]">
        {/* Top Header do Cliente Ativo */}
        <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {activeClient.fullName?.slice(0, 2).toUpperCase() || 'CL'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[hsl(var(--foreground))]">
                  {activeClient.fullName}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-[hsl(var(--secondary))] px-2 py-0.5 rounded-md text-[hsl(var(--muted-foreground))]">
                  {activeClient.code}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    activeClient.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : activeClient.status === 'late'
                      ? 'bg-amber-500/15 text-amber-600'
                      : 'bg-rose-500/15 text-rose-600'
                  }`}
                >
                  {activeClient.status === 'active' ? 'Activo' : activeClient.status === 'late' ? 'Em Atraso' : 'Suspenso'}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-2 mt-0.5">
                <Phone size={11} /> {activeClient.phone} · <MapPin size={11} /> {activeClient.address || 'Bairro Golf I'}
              </p>
            </div>
          </div>

          {/* Ações de Intervenção Humana */}
          <div className="flex items-center gap-2">
            {activeTicket && activeTicket.status === 'aguardando_atendente' && (
              <button
                type="button"
                onClick={handleClaimTicket}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition animate-bounce"
              >
                <ShieldCheck size={14} /> Assumir Atendimento Humano
              </button>
            )}

            {activeTicket && activeTicket.status === 'em_atendimento' && (
              <button
                type="button"
                onClick={handleResolveTicket}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <CheckCircle2 size={14} /> Concluir Atendimento
              </button>
            )}

            <button
              type="button"
              onClick={() => setSoundMuted(!soundMuted)}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                soundMuted
                  ? 'border-[hsl(var(--border))] text-slate-400 hover:bg-[hsl(var(--secondary))]'
                  : 'border-blue-400/40 bg-blue-500/10 text-[#0084ff]'
              }`}
              title={soundMuted ? 'Activar alertas sonoros' : 'Silenciar alertas sonoros'}
            >
              {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <button
              type="button"
              onClick={() => setShowDossier(!showDossier)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                showDossier
                  ? 'bg-[#0084ff] text-white border-[#0084ff] shadow-sm'
                  : 'border-[hsl(var(--border))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]'
              }`}
              title="Abrir painel lateral com perfil e faturas do assinante"
            >
              <Info size={14} /> Detalhes
            </button>

            <a
              href={`https://wa.me/244${activeClient.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl border border-[hsl(var(--border))] text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition flex items-center gap-1.5"
            >
              WhatsApp <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Banner de Status de Intervenção */}
        {activeTicket && activeTicket.status === 'aguardando_atendente' && (
          <div className="bg-rose-600 text-white px-5 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>
                <b>Atenção:</b> O cliente solicitou intervenção de um membro administrativo devido a: <i>"{activeTicket.reason}"</i>
              </span>
            </div>
            <button
              type="button"
              onClick={handleClaimTicket}
              className="bg-white text-rose-700 px-3 py-1 rounded-lg font-bold text-[11px] hover:bg-rose-50 shrink-0 cursor-pointer"
            >
              Falar com Cliente Agora
            </button>
          </div>
        )}

        {/* Área de Mensagens (Scrollable) */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="text-center my-2">
            <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))] px-3 py-1 rounded-full border border-[hsl(var(--border))] shadow-2xs">
              Conversa Criptografada OSDEL Messenger · Atendimento Comercial & Suporte
            </span>
          </div>

          {messages.map((msg) => {
            const isClient = msg.sender === 'client';
            const isBot = msg.sender === 'bot';
            const isAdmin = msg.sender === 'admin';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  isClient ? 'mr-auto' : 'ml-auto flex-row-reverse'
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs shadow-xs text-white ${
                    isClient
                      ? 'bg-blue-600'
                      : isBot
                      ? 'bg-amber-500'
                      : 'bg-[#0084ff]'
                  }`}
                >
                  {isClient ? <User size={14} /> : isBot ? <Bot size={15} /> : <ShieldCheck size={14} />}
                </div>

                <div className="space-y-1">
                  <div
                    className={`text-[10px] font-bold text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 ${
                      isClient ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <span>{msg.senderName}</span>
                    <span>•</span>
                    <span className="font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString('pt-AO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Balão de Mensagem Estilo Facebook Messenger */}
                  <div
                    className={`rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                      isClient
                        ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-bl-xs'
                        : isBot
                        ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 border border-amber-300/40 rounded-tl-xs'
                        : 'bg-[#0084ff] text-white rounded-br-xs'
                    }`}
                  >
                    {/* Anexo de Imagem / Comprovativo */}
                    {msg.attachmentUrl && (
                      <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20">
                        <img
                          src={msg.attachmentUrl}
                          alt={msg.attachmentName || 'Comprovativo'}
                          className="max-h-56 max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                          onClick={() => setPreviewImageModal(msg.attachmentUrl!)}
                        />
                        <div className="mt-1 flex items-center justify-between text-[10px] opacity-80 px-1">
                          <span className="truncate">{msg.attachmentName || 'Comprovativo'}</span>
                          <span className="flex items-center gap-1 font-bold"><Maximize2 size={10} /> Ampliar</span>
                        </div>
                      </div>
                    )}

                    {msg.message}

                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/80">
                        <CheckCheck size={12} />
                        <span>Entregue</span>
                      </div>
                    )}
                  </div>

                  {/* Ações sugeridas pelo bot */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (act.action === 'request_human') {
                              handleSimulateClientQuestion('Preciso falar com um atendente humano urgente');
                            } else if (act.action === 'bank_info') {
                              handleSimulateClientQuestion('Quais são as coordenadas bancárias para pagar?');
                            } else if (act.action === 'check_balance') {
                              handleSimulateClientQuestion('Qual é o meu saldo atual e fatura?');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[#0084ff] hover:text-[#0084ff] text-[11px] font-semibold text-[hsl(var(--foreground))] transition cursor-pointer"
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Indicador de Digitação (Typing Indicator) Estilo Messenger */}
          {isTyping && (
            <div className="flex gap-2.5 items-center text-xs text-[hsl(var(--muted-foreground))] animate-pulse px-1">
              <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <Bot size={14} className="text-blue-500 animate-spin" />
              </div>
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl px-3 py-2 flex items-center gap-1 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-[#0084ff] animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-[#0084ff] animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-[#0084ff] animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1.5 text-[11px] font-semibold">A preparar resposta...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Modelos de Resposta Rápida do Atendente */}
        <div className="px-4 py-2 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar">
          <span className="text-[10.5px] font-bold text-[#0084ff] shrink-0 flex items-center gap-1">
            <Sparkles size={12} /> Respostas Rápidas:
          </span>
          {[
            { label: '✓ Pagamento Confirmado', text: `Estimado(a) ${activeClient.fullName}, confirmamos a boa recepção do seu pagamento. O seu serviço e sinal encontram-se regularizados e activos. Obrigado pela preferência!` },
            { label: '⚡ Piquete Despachado', text: `Informamos que a equipa técnica da OSDEL já foi despachada para a sua residência no ${activeClient.address || 'Golf'} para normalizar o sinal de fibra/TV.` },
            { label: '📡 Sinal Verificado', text: `Efectuámos o teste na porta PDO. O sinal de fibra óptica encontra-se com atenuação normal (-19.2 dBm). O serviço está operacional.` },
            { label: '💳 Dados Multicaixa', text: `Dados para pagamento via MCX Express: Entidade: 00543 | Referência: 926 153 736 (ou presencialmente no nosso balcão do Golf II).` },
            { label: '📸 Enviar Comprovativo', text: `Por favor envie-nos foto do comprovativo ou código de transacção do Multicaixa para procedermos à baixa imediata no sistema.` },
            { label: '🔌 Reiniciar Modem', text: `Sugerimos que desligue o modem da tomada por 30 segundos e volte a ligar. Se o sinal continuar sem acesso, a nossa equipa entrará em contacto.` },
          ].map((quick, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(quick.text)}
              className="px-2.5 py-1 rounded-lg bg-[hsl(var(--secondary))] hover:bg-[#0084ff] hover:text-white text-[11px] text-[hsl(var(--foreground))] shrink-0 font-medium transition cursor-pointer border border-[hsl(var(--border))]"
            >
              {quick.label}
            </button>
          ))}
        </div>

        {/* Barra de Simulação Rápida / Testes */}
        <div className="px-4 py-2 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] flex items-center gap-2 text-xs overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] shrink-0">
            🧪 Testar perguntas do cliente:
          </span>
          <button
            type="button"
            onClick={() => handleSimulateClientQuestion('Luz vermelha LOS no modem')}
            className="px-2.5 py-1 rounded-lg bg-[hsl(var(--secondary))] hover:bg-blue-500/10 text-xs text-[hsl(var(--foreground))] shrink-0 font-medium transition cursor-pointer"
          >
            "Luz vermelha LOS"
          </button>
          <button
            type="button"
            onClick={() => handleSimulateClientQuestion('Qual é o meu saldo pendente?')}
            className="px-2.5 py-1 rounded-lg bg-[hsl(var(--secondary))] hover:bg-blue-500/10 text-xs text-[hsl(var(--foreground))] shrink-0 font-medium transition cursor-pointer"
          >
            "Qual é meu saldo?"
          </button>
          <button
            type="button"
            onClick={() => handleSimulateClientQuestion('Preciso falar com atendente administrativo urgente')}
            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-xs text-rose-700 dark:text-rose-400 shrink-0 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Flame size={12} /> "Falar com atendente urgente"
          </button>
        </div>

        {/* Pré-visualização de Anexo no Compositor */}
        {attachmentDraft && (
          <div className="px-4 py-2 bg-blue-500/10 border-t border-blue-400/30 flex items-center justify-between text-xs animate-in fade-in-0">
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon size={15} className="text-[#0084ff] shrink-0" />
              <span className="font-bold text-[hsl(var(--foreground))] truncate max-w-sm">
                Anexo pronto: {attachmentDraft.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachmentDraft(null)}
              className="text-rose-600 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
              title="Remover anexo"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input Composer para o Operador / Membro Administrativo */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] flex items-center gap-2">
          {/* Botão de Anexo de Comprovativo ou Imagem */}
          <label
            className="h-10 w-10 rounded-full hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[#0084ff] flex items-center justify-center shrink-0 cursor-pointer transition border border-transparent hover:border-[hsl(var(--border))]"
            title="Anexar Comprovativo Bancário ou Foto de Avaria"
          >
            <Paperclip size={18} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const url = ev.target?.result as string;
                  if (url) {
                    setAttachmentDraft({ url, name: file.name });
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder={`Responder a ${activeClient.fullName} como ${operatorName}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full px-4 py-3 rounded-full border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] text-xs font-medium outline-none focus:border-[#0084ff] focus:ring-2 focus:ring-[#0084ff]/20 transition"
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() && !attachmentDraft}
            className="h-10 w-10 rounded-full bg-[#0084ff] hover:bg-blue-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-md transition cursor-pointer"
            title="Enviar mensagem"
          >
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* PAINEL LATERAL DIREITO: DOSSIÊ DO CLIENTE (ESTILO FACEBOOK MESSENGER) */}
      {showDossier && (() => {
        const clientInvoices = allInvoices.filter((inv: any) => Number(inv.clientId) === activeClient.id);
        const pendingInvoices = clientInvoices.filter((inv: any) => inv.status !== 'paga' && inv.status !== 'anulada');

        return (
          <div className="w-80 border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 flex flex-col shrink-0 animate-in slide-in-from-right duration-200 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Dossiê do Cliente
              </span>
              <button
                type="button"
                onClick={() => setShowDossier(false)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1 rounded-lg cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col items-center text-center py-5 border-b border-[hsl(var(--border))]">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {activeClient.fullName?.slice(0, 2).toUpperCase() || 'CL'}
                </div>
                <span className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-[hsl(var(--card))]" />
              </div>
              <h3 className="font-bold text-sm text-[hsl(var(--foreground))] mt-2.5">{activeClient.fullName}</h3>
              <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{activeClient.code}</span>
              <span className="mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {activeClient.serviceType === 'tv' ? 'TV Comunitária' : activeClient.serviceType === 'combo' ? 'TV + Internet Fibra' : 'Internet Fibra FTTH'}
              </span>
            </div>

            <div className="space-y-3 py-3 border-b border-[hsl(var(--border))] text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block">Telefone</span>
                <b className="text-[hsl(var(--foreground))]">{activeClient.phone || '—'}</b>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block">Morada & Residência</span>
                <span className="text-[hsl(var(--foreground))]">
                  {activeClient.houseCode ? `Casa ${activeClient.houseCode} · ` : ''}{activeClient.street || activeClient.address || 'Bairro Golf I'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block">Rede & Porta</span>
                <span className="text-[hsl(var(--foreground))]">
                  Caixa <b>{activeClient.pdoBox || 'PDO-01'}</b> {activeClient.port ? `(Porta ${activeClient.port})` : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block">Mensalidade Contratual</span>
                <b className="text-[#0084ff] text-sm">
                  {(Number(activeClient.monthlyPrice || activeClient.monthlyFee || (activeClient.serviceType === 'tv' ? 4000 : 6500))).toLocaleString('pt-AO')} Kz
                </b>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] block">Situação Financeira</span>
                <span className={`inline-block font-bold px-2.5 py-0.5 rounded-md text-[10px] mt-0.5 ${
                  activeClient.status === 'active' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
                }`}>
                  {activeClient.status === 'active' ? '✓ Regularizado' : '⚠️ Em Atraso / Suspenso'}
                </span>
              </div>
            </div>

            {/* Faturas Pendentes & Ação de Baixa Imediata */}
            <div className="py-3 border-b border-[hsl(var(--border))] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Faturas Pendentes</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  pendingInvoices.length > 0 ? 'bg-rose-500/15 text-rose-600' : 'bg-emerald-500/15 text-emerald-600'
                }`}>
                  {pendingInvoices.length} pendente(s)
                </span>
              </div>

              {pendingInvoices.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {pendingInvoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="p-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] flex items-center justify-between text-[11px]"
                    >
                      <div className="min-w-0 pr-1">
                        <b className="block text-[hsl(var(--foreground))] truncate">
                          {inv.referenceMonth || 'Mensalidade'}
                        </b>
                        <span className="font-mono text-[hsl(var(--muted-foreground))] text-[10px]">
                          {Number(inv.amount || inv.total || 0).toLocaleString()} Kz
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFastPayModal({ invoice: inv, client: activeClient })}
                        className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
                        title="Dar baixa e registar pagamento"
                      >
                        <Banknote size={11} /> Baixa
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <Check size={13} /> Todas as mensalidades em dia
                </div>
              )}

              <button
                type="button"
                onClick={() => setFastPayModal({ client: activeClient })}
                className="w-full mt-2 py-2 rounded-xl bg-[#0084ff] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <CreditCard size={13} /> Registar Pagamento Directo
              </button>
            </div>

            <div className="pt-3 space-y-2">
              <a
                href={`/clientes/${activeClient.id}`}
                className="w-full py-2.5 rounded-xl bg-[hsl(var(--secondary))] hover:bg-[#0084ff] hover:text-white text-[hsl(var(--foreground))] text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink size={13} /> Ver Ficha Cadastral
              </a>
              <a
                href={`https://wa.me/244${activeClient.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Phone size={13} /> Conversar no WhatsApp
              </a>
            </div>
          </div>
        );
      })()}

      {/* MODAL LIGHTBOX: VISUALIZADOR DE COMPROVATIVO / ANEXO AMPLIADO */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in-0"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-transparent" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImageModal}
              alt="Comprovativo Ampliado"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              type="button"
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold shadow-lg hover:bg-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: REGISTO RÁPIDO DE PAGAMENTO DIRECTO NO CHAT */}
      {fastPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0">
          <div className="surface max-w-md w-full rounded-2xl p-6 shadow-2xl border border-[hsl(var(--border))] space-y-4">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <Banknote size={20} />
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                  Registar Pagamento no Chat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFastPayModal(null)}
                className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Cliente:</span>
                <b className="text-[hsl(var(--foreground))]">{fastPayModal.client.fullName} ({fastPayModal.client.code})</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Competência:</span>
                <span className="font-mono text-[hsl(var(--foreground))]">
                  {fastPayModal.invoice?.referenceMonth || new Date().toISOString().slice(0, 7)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Valor a Liquidar:</span>
                <b className="font-mono text-emerald-600 text-sm">
                  {(fastPayModal.invoice ? Number(fastPayModal.invoice.amount || fastPayModal.invoice.total || 0) : Number(fastPayModal.client.monthlyPrice || (fastPayModal.client.serviceType === 'tv' ? 4000 : 6500))).toLocaleString()} Kz
                </b>
              </div>
            </div>

            <form onSubmit={handleExecuteFastPay} className="space-y-3.5">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-[hsl(var(--foreground))]">Canal / Método de Pagamento</span>
                <select
                  value={fastPayMethod}
                  onChange={(e) => setFastPayMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] text-xs font-medium outline-none focus:border-blue-500"
                >
                  <option value="Multicaixa Express">Multicaixa Express (MCX)</option>
                  <option value="Terminal TPA">Terminal TPA (Cartão de Débito)</option>
                  <option value="Transferência Bancária (BAI)">Transferência Bancária (BAI)</option>
                  <option value="Transferência Bancária (BFA)">Transferência Bancária (BFA)</option>
                  <option value="Numerário (Dinheiro em Mão)">Numerário (Dinheiro em Mão no Balcão)</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-bold text-[hsl(var(--foreground))]">Conta Financeira de Destino</span>
                <select
                  value={fastPayAccount}
                  onChange={(e) => setFastPayAccount(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] text-xs font-medium outline-none focus:border-blue-500"
                >
                  <option value="acc-caixa">Caixa Geral (Balcão Golf)</option>
                  <option value="acc-tpa">Terminal Multicaixa Express (TPA / EMIS)</option>
                  <option value="acc-bai">Banco BAI (Arrecadação Principal)</option>
                  <option value="acc-bfa">Banco BFA (Operações & Fornecedores)</option>
                  <option value="acc-piquete">Fundo de Maneio de Piquete Técnico</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
                <button
                  type="button"
                  onClick={() => setFastPayModal(null)}
                  className="px-4 py-2 rounded-xl border border-[hsl(var(--border))] text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {createPaymentMutation.isPending ? 'A registar...' : 'Confirmar & Notificar no Chat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   2. CHAT DA EQUIPA & PIQUETE (COMUNICAÇÃO INTERNA STAFF)
   ========================================================================== */

export function TeamChatView() {
  const currentSession = session();
  const userName = currentSession?.name || 'Albert Mbuyi (Deezy)';
  const userRole = currentSession?.role || 'superadmin';
  const userId = currentSession?.id || 1;

  const [activeChannel, setActiveChannel] = useState<'geral' | 'piquete-cortes' | 'tecnicos-fibra' | 'suporte-clientes'>('geral');
  const [messages, setMessages] = useState<TeamMessage[]>(() => getStoredTeamMessages());
  const [messageInput, setMessageInput] = useState('');
  const [priority, setPriority] = useState<'normal' | 'alta' | 'urgente'>('normal');
  const [teamAttachment, setTeamAttachment] = useState<{ url: string; name: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const refreshMessages = () => {
    setMessages(getStoredTeamMessages());
  };

  useEffect(() => {
    const handleUpdate = () => refreshMessages();
    window.addEventListener('osdel-team-message-received', handleUpdate);
    return () => window.removeEventListener('osdel-team-message-received', handleUpdate);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !teamAttachment) return;

    sendTeamMessage({
      channelId: activeChannel,
      senderId: userId,
      senderName: userName,
      senderRole: userRole,
      message: messageInput.trim() || (teamAttachment ? 'Foto / Anexo de Campo' : ''),
      priority,
      attachmentUrl: teamAttachment?.url,
      attachmentName: teamAttachment?.name,
      attachmentType: 'image',
    });

    setMessageInput('');
    setTeamAttachment(null);
    setPriority('normal');
    refreshMessages();
  };

  const channelMessages = messages.filter((m) => m.channelId === activeChannel);

  const CHANNELS = [
    {
      id: 'geral',
      name: '#geral',
      desc: 'Informações gerais, avisos da diretoria e alinhamento',
      color: 'blue',
    },
    {
      id: 'piquete-cortes',
      name: '#piquete-cortes',
      desc: 'Operações de corte, piquetes de rua e religações urgentes',
      color: 'rose',
    },
    {
      id: 'tecnicos-fibra',
      name: '#tecnicos-fibra',
      desc: 'Fusões de fibra, leitura de dBm e caixas PDO',
      color: 'emerald',
    },
    {
      id: 'suporte-clientes',
      name: '#suporte-clientes',
      desc: 'Alertas automáticos de chamados que pediram atendente',
      color: 'amber',
    },
  ];

  return (
    <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-xl flex flex-col lg:flex-row h-[740px]">
      {/* PAINEL ESQUERDO: CANAIS DA EQUIPA */}
      <div className="w-full lg:w-72 border-r border-[hsl(var(--border))] flex flex-col bg-[hsl(var(--card))] shrink-0 p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">Canais da Equipa</h3>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Piquete, Rede & Suporte</p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {CHANNELS.map((ch) => {
            const isSelected = activeChannel === ch.id;
            const count = messages.filter((m) => m.channelId === ch.id).length;

            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id as any)}
                className={`w-full p-3 rounded-2xl text-left transition flex flex-col space-y-1 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'hover:bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono tracking-tight">{ch.name}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
                    }`}
                  >
                    {count}
                  </span>
                </div>
                <p className={`text-[10.5px] line-clamp-1 ${isSelected ? 'text-white/80' : 'text-[hsl(var(--muted-foreground))]'}`}>
                  {ch.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Rodapé com identificação do usuário conectado */}
        <div className="border-t border-[hsl(var(--border))] pt-3 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
            {userName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <b className="text-xs font-bold text-[hsl(var(--foreground))] truncate block">
              {userName}
            </b>
            <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* PAINEL DIREITO: FEED DE MENSAGENS E COMPOSITOR */}
      <div className="flex-1 flex flex-col bg-[hsl(var(--secondary)/.3)]">
        {/* Header do Canal */}
        <div className="p-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center justify-between shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-[hsl(var(--foreground))] font-mono">
              #{activeChannel}
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {CHANNELS.find((c) => c.id === activeChannel)?.desc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => playNotificationSound('message')}
            className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
            title="Testar som de alerta"
          >
            <Volume2 size={16} />
          </button>
        </div>

        {/* Mensagens do Canal */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
          {channelMessages.length > 0 ? (
            channelMessages.map((msg) => {
              const isMe = msg.senderId === userId;
              const isUrgent = msg.priority === 'urgente';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-[85%] ${
                    isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[hsl(var(--card))]" />
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`text-[10px] font-bold text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 ${
                        isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <b className="text-[hsl(var(--foreground))]">{msg.senderName}</b>
                      <span>•</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.2 bg-[hsl(var(--secondary))] rounded">
                        {msg.senderRole}
                      </span>
                      <span>•</span>
                      <span className="font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString('pt-AO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isUrgent && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-500 text-white animate-pulse">
                          🚨 Urgente
                        </span>
                      )}
                    </div>

                    <div
                      className={`rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                        isUrgent
                          ? 'border-2 border-rose-500 bg-rose-500 text-white rounded-2xl'
                          : isMe
                          ? 'bg-[#0084ff] text-white rounded-br-xs'
                          : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-bl-xs'
                      }`}
                    >
                      {/* Anexo de Imagem da Equipe */}
                      {msg.attachmentUrl && (
                        <div className="mb-2.5 overflow-hidden rounded-xl border border-white/20">
                          <img
                            src={msg.attachmentUrl}
                            alt={msg.attachmentName || 'Foto de Campo'}
                            className="max-h-56 max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                            onClick={() => setPreviewImage(msg.attachmentUrl!)}
                          />
                          <div className="mt-1 flex items-center justify-between text-[10px] opacity-80 px-1">
                            <span className="truncate">{msg.attachmentName || 'Foto da Intervenção'}</span>
                            <span className="flex items-center gap-1 font-bold"><Maximize2 size={10} /> Ampliar</span>
                          </div>
                        </div>
                      )}

                      {msg.message}

                      {isMe && (
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/80">
                          <CheckCheck size={12} />
                          <span>Entregue à Equipa</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-xs text-[hsl(var(--muted-foreground))]">
              Nenhuma mensagem neste canal ainda. Seja o primeiro a publicar!
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Compositor de Mensagem da Equipe */}
        <form onSubmit={handleSend} className="p-3 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">Prioridade:</span>
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  priority === 'normal' ? 'bg-blue-600 text-white' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgente')}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  priority === 'urgente' ? 'bg-rose-600 text-white animate-pulse' : 'bg-[hsl(var(--secondary))] text-rose-600'
                }`}
              >
                🚨 Urgente (Alerta Sonoro)
              </button>
            </div>
          </div>

          {/* Atalhos Rápidos da Equipa & Piquete */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] shrink-0">⚡ Rápidas:</span>
            {[
              { label: '🚨 Alerta Piquete', text: '🚨 Alerta Piquete: Avaria de rede geral na zona do Golf II. Piquete despachado.' },
              { label: '✅ Fusão Concluída', text: '✅ Fusão de Fibra Concluída: Porta óptica normalizada na Caixa PDO.' },
              { label: '📦 Material Requisitado', text: '📦 Necessidade de Material: Requisitar bobina drop 1 FO e conectores SC/APC no inventário.' },
              { label: '💰 Pagamento no Terreno', text: '💰 Cobrança Concluída: Mensalidade recebida no terreno e faturada com sucesso.' },
              { label: '📡 Medição Óptica OK', text: '📡 Medição Óptica Realizada: Potência -19.2 dBm OK, cliente com link estabelecido.' },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMessageInput(item.text)}
                className="px-2.5 py-1 rounded-lg bg-[hsl(var(--secondary))] hover:bg-blue-600 hover:text-white text-[10.5px] text-[hsl(var(--foreground))] shrink-0 transition border border-[hsl(var(--border))] font-medium cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Preview de Anexo da Equipe */}
          {teamAttachment && (
            <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-400/30 rounded-xl flex items-center justify-between text-xs animate-in fade-in-0">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon size={14} className="text-[#0084ff] shrink-0" />
                <span className="font-bold text-[hsl(var(--foreground))] truncate">
                  {teamAttachment.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTeamAttachment(null)}
                className="text-rose-600 hover:text-rose-700 p-0.5 rounded cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label
              className="h-10 w-10 rounded-2xl hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-blue-600 flex items-center justify-center shrink-0 cursor-pointer transition border border-[hsl(var(--border))]"
              title="Anexar Foto de Fusão ou Caixa PDO"
            >
              <Paperclip size={17} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const url = ev.target?.result as string;
                    if (url) {
                      setTeamAttachment({ url, name: file.name });
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>

            <input
              type="text"
              placeholder={`Mensagem em #${activeChannel}...`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() && !teamAttachment}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Send size={15} />
              <span>Enviar</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal Lightbox Foto Equipe */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in-0"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-transparent" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Foto Ampliada"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold shadow-lg hover:bg-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
