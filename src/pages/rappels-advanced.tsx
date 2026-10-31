import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HelpCircle,
  Layers,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  User,
  UserCheck,
  Wrench,
  X,
  Zap,
  Scissors,
} from 'lucide-react';
import {
  getListClientsQueryKey,
  getListPaymentsQueryKey,
  getListServiceOrdersQueryKey,
  getListMessagesQueryKey,
  useListClients,
  useListPayments,
  useGetSettings,
  useCreatePayment,
  useCreateServiceOrder,
  useCreateMessage,
  useSetClientStatus,
  useRegisterPaymentPromise,
  session,
} from '@/lib/local-api';
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Badge,
  Status,
  Modal,
  PageHeader,
  kz,
  date,
  dateTime,
  serviceLabel,
} from '@/components/shared-ui';
import { useServiceMode } from '@/lib/service-mode';
import { FiberAutomaticCutsView } from '@/components/fiber-automatic-cuts-view';

export function RappelsPage() {
  const { mode, meta } = useServiceMode();
  const qc = useQueryClient();
  const currentUser = session();
  const isAdmin = currentUser?.role === 'admin';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'cobrança' | 'folha_corte' | 'acordos' | 'historico' | 'cortes_automaticos_fibra'>('cobrança');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [rappelFilter, setRappelFilter] = useState<'todos' | 'rappel1' | 'rappel2' | 'rappel3' | 'suspensos'>('todos');
  const [selectedPdo, setSelectedPdo] = useState('todas');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('todos');

  // Bulk selection for Piquete Cut Sheet
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);

  // Modals
  const [modalPay, setModalPay] = useState<any>(null);
  const [modalCutSheet, setModalCutSheet] = useState(false);
  const [modalWhatsApp, setModalWhatsApp] = useState<any>(null);
  const [modalAgreement, setModalAgreement] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  // Queries
  const clientsQuery = useListClients({ serviceMode: mode || undefined });
  const paymentsQuery = useListPayments({ serviceMode: mode || undefined });
  const settingsQuery = useGetSettings();

  // Mutations
  const createPayment = useCreatePayment();
  const createOS = useCreateServiceOrder();
  const createMsg = useCreateMessage();
  const setClientStatus = useSetClientStatus();
  const registerPromise = useRegisterPaymentPromise();

  const clients: any[] = (Array.isArray(clientsQuery.data) ? clientsQuery.data : clientsQuery.data?.items) || [];
  const payments: any[] = (Array.isArray(paymentsQuery.data) ? paymentsQuery.data : paymentsQuery.data?.items) || [];
  const settings = settingsQuery.data || {};

  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayDay = new Date().getDate();

  const showToast = (text: string, type: 'success' | 'warn' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  // Find who has paid for the current month
  const currentPaidClients = useMemo(() => {
    return new Set(
      payments
        .filter((p) => (p.referenceMonth || p.paidAt.slice(0, 7)) === currentMonth)
        .map((p) => p.clientId),
    );
  }, [payments, currentMonth]);

  // Enriched unpaid clients list
  const enrichedUnpaid = useMemo(() => {
    return clients
      .filter((c) => c.status === 'late' || c.status === 'suspended' || !currentPaidClients.has(c.id))
      .map((c) => {
        const isPaid = currentPaidClients.has(c.id);
        const isLate = c.status === 'late' || (!isPaid && todayDay > (settings.paymentDueDay || 5));
        const penaltyFee = isLate ? Number(settings.latePenalty || settings.penaltyAmount || 1500) : 0;
        const totalDebt = Number(c.monthlyFee || c.monthlyPrice || 8500) + penaltyFee;

        // Determine Rappel Severity Level:
        // Level 1: 5 to 10 days late (friendly reminder)
        // Level 2: 11 to 20 days late (pre-cut warning, 48h limit)
        // Level 3: > 20 days late or already flagged suspended
        let rappelLevel: 'rappel1' | 'rappel2' | 'rappel3' | 'suspenso' = 'rappel1';
        if (c.status === 'suspended') {
          rappelLevel = 'suspenso';
        } else if (todayDay > 20 || (c.status === 'late' && todayDay > 15)) {
          rappelLevel = 'rappel3';
        } else if (todayDay > 10 || c.status === 'late') {
          rappelLevel = 'rappel2';
        }

        const hasActivePromise =
          c.paymentPromiseDate && new Date(c.paymentPromiseDate) >= new Date(new Date().toISOString().slice(0, 10));

        return {
          ...c,
          isLate,
          penaltyFee,
          totalDebt,
          rappelLevel,
          hasActivePromise,
        };
      });
  }, [clients, currentPaidClients, todayDay, settings]);

  // Unique PDOs and Neighborhoods for filtering
  const allPdos = useMemo(() => {
    const set = new Set<string>();
    enrichedUnpaid.forEach((c) => {
      if (c.pdoNumber) set.add(c.pdoNumber);
    });
    return Array.from(set).sort();
  }, [enrichedUnpaid]);

  const allNeighborhoods = useMemo(() => {
    const set = new Set<string>();
    enrichedUnpaid.forEach((c) => {
      const b = c.neighborhood || c.address?.split(',')[0];
      if (b) set.add(b.trim());
    });
    return Array.from(set).sort();
  }, [enrichedUnpaid]);

  // Filtered List for Table
  const filteredList = useMemo(() => {
    return enrichedUnpaid
      .filter((c) => {
        if (rappelFilter === 'rappel1') return c.rappelLevel === 'rappel1';
        if (rappelFilter === 'rappel2') return c.rappelLevel === 'rappel2';
        if (rappelFilter === 'rappel3') return c.rappelLevel === 'rappel3';
        if (rappelFilter === 'suspensos') return c.status === 'suspended';
        return true;
      })
      .filter((c) => {
        if (selectedPdo !== 'todas' && c.pdoNumber !== selectedPdo) return false;
        if (selectedNeighborhood !== 'todos') {
          const b = c.neighborhood || c.address;
          if (!b || !b.toLowerCase().includes(selectedNeighborhood.toLowerCase())) return false;
        }
        return true;
      })
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          c.fullName?.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.houseCode?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.pdoNumber?.toLowerCase().includes(q)
        );
      });
  }, [enrichedUnpaid, rappelFilter, selectedPdo, selectedNeighborhood, search]);

  // Metrics
  const totalDebtSum = enrichedUnpaid.reduce((acc, c) => acc + c.totalDebt, 0);
  const totalRappel1 = enrichedUnpaid.filter((c) => c.rappelLevel === 'rappel1').length;
  const totalRappel2 = enrichedUnpaid.filter((c) => c.rappelLevel === 'rappel2').length;
  const totalRappel3 = enrichedUnpaid.filter((c) => c.rappelLevel === 'rappel3').length;
  const totalSuspended = enrichedUnpaid.filter((c) => c.status === 'suspended').length;
  const totalPromises = enrichedUnpaid.filter((c) => c.hasActivePromise).length;

  // Forms
  const [payForm, setPayForm] = useState({
    amount: '',
    penalty: '0',
    method: 'Multicaixa Express',
    paidAt: new Date().toISOString().slice(0, 10),
    receiptNumber: '',
    notes: '',
  });

  const [agreementForm, setAgreementForm] = useState({
    promiseDate: '',
    notes: '',
  });

  // Handle direct payment / settlement
  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPay) return;
    const finalAmount = Number(payForm.amount || modalPay.monthlyFee || 8500);
    const finalPenalty = Number(payForm.penalty || 0);

    createPayment.mutate(
      {
        data: {
          clientId: modalPay.id,
          amount: finalAmount,
          penalty: finalPenalty,
          referenceMonth: currentMonth,
          method: payForm.method,
          paidAt: payForm.paidAt,
          receiptNumber: payForm.receiptNumber,
          notes: payForm.notes || `Regularização rápida via módulo de Rappels`,
        },
      },
      {
        onSuccess: () => {
          // If the client was suspended, reactivate them
          if (modalPay.status === 'suspended') {
            setClientStatus.mutate({
              clientId: modalPay.id,
              status: 'active',
              notes: `Sinal reativado automaticamente após liquidação de ${kz(finalAmount + finalPenalty)}.`,
            });
          }
          qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
          showToast(`Pagamento de ${modalPay.fullName} confirmado com sucesso. Situação regularizada!`);
          setModalPay(null);
        },
      },
    );
  };

  // Handle single Cut Order
  const handleSendCutOrder = (c: any) => {
    if (
      confirm(
        `Emitir Ordem de Serviço de Corte para ${c.fullName}?\n\nMorada: Casa ${c.houseCode || 'S/N'}, ${c.address}\nCaixa PDO: ${c.pdoNumber || 'Pendente de localização'}\nDívida: ${kz(c.totalDebt)}`,
      )
    ) {
      createOS.mutate(
        {
          data: {
            clientId: c.id,
            type: 'corte',
            priority: 'urgente',
            technician: 'Piquete Técnico de Corte',
            scheduledDate: new Date().toISOString().slice(0, 10),
            description: `Corte de sinal por falta de pagamento. Valor da dívida: ${kz(c.totalDebt)}. Localização na PDO: ${c.pdoNumber || 'Geral'}.`,
          },
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListServiceOrdersQueryKey() });
            showToast(`Ordem de Serviço de Corte emitida para o Piquete com prioridade urgente!`);
          },
        },
      );
    }
  };

  // Handle direct immediate cut (marking suspended)
  const handleImmediateCut = (c: any) => {
    if (
      confirm(
        `ATENÇÃO: Deseja suspender e cortar o sinal do cliente ${c.fullName} de imediato no sistema?\n\nEsta ação mudará o estado para SUSPENSO e registrará a ocorrência na auditoria.`,
      )
    ) {
      setClientStatus.mutate(
        {
          clientId: c.id,
          status: 'suspended',
          notes: `Suspensão imediata de sinal por inadimplência executada por ${currentUser?.username || 'operador'} em ${new Date().toLocaleDateString('pt-AO')}.`,
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
            showToast(`Sinal de ${c.fullName} marcado como SUSPENSO no sistema.`, 'warn');
          },
        },
      );
    }
  };

  // Handle direct reconnection
  const handleDirectReconnect = (c: any) => {
    if (confirm(`Confirmar religação do sinal para ${c.fullName}? O estado voltará a ACTIVO.`)) {
      setClientStatus.mutate(
        {
          clientId: c.id,
          status: 'active',
          notes: `Religação manual autorizada por ${currentUser?.username || 'operador'} em ${new Date().toLocaleDateString('pt-AO')}.`,
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
            showToast(`Sinal de ${c.fullName} reativado com sucesso.`);
          },
        },
      );
    }
  };

  // Handle payment agreement
  const handleSaveAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAgreement || !agreementForm.promiseDate) return;

    registerPromise.mutate(
      {
        clientId: modalAgreement.id,
        promiseDate: agreementForm.promiseDate,
        notes: agreementForm.notes,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
          showToast(`Acordo de pagamento registado até ${date(agreementForm.promiseDate)}. Corte adiado.`);
          setModalAgreement(null);
        },
      },
    );
  };

  // Bulk OS Generation for selected clients
  const handleBatchCutOrders = () => {
    if (!selectedClientIds.length) {
      alert('Selecione pelo menos um cliente na tabela para emitir ordens de corte em lote.');
      return;
    }

    if (
      confirm(
        `Tem a certeza de que deseja emitir ${selectedClientIds.length} Ordens de Corte para o Piquete Técnico de uma só vez?`,
      )
    ) {
      selectedClientIds.forEach((id) => {
        const client = enrichedUnpaid.find((c) => c.id === id);
        if (client) {
          createOS.mutate({
            data: {
              clientId: client.id,
              type: 'corte',
              priority: 'urgente',
              technician: 'Piquete Técnico de Campo',
              scheduledDate: new Date().toISOString().slice(0, 10),
              description: `[CORTE EM LOTE] Desconexão de porta por dívida acumulada de ${kz(client.totalDebt)}. Caixa ${client.pdoNumber || 'S/N'}.`,
            },
          });
        }
      });
      qc.invalidateQueries({ queryKey: getListServiceOrdersQueryKey() });
      showToast(`${selectedClientIds.length} Ordens de Corte emitidas para o Piquete Técnico!`);
      setSelectedClientIds([]);
    }
  };

  // Toggle selection for all filtered
  const toggleSelectAll = () => {
    if (selectedClientIds.length === filteredList.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredList.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedClientIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // WhatsApp Message Generator
  const getWhatsAppMessage = (client: any, templateType: 'amigavel' | 'pre_corte' | 'corte_imediato') => {
    const entity = settings.mcxEntity || '10294';
    const cleanPhone = String(client.phone || '').replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('244') ? cleanPhone : `244${cleanPhone}`;

    let text = '';
    if (templateType === 'amigavel') {
      text = `Prezado(a) ${client.fullName}, saudações cordiais da OSDEL Tecnologia. Vimos por este meio lembrar que a sua mensalidade de ${serviceLabel(client.serviceType)} no valor de ${kz(client.monthlyFee || 8500)} venceu recentemente. Agradecemos a regularização via Multicaixa Express (Entidade: ${entity}) ou no nosso balcão para assegurar a continuidade dos serviços de internet/TV. Obrigado!`;
    } else if (templateType === 'pre_corte') {
      text = `*AVISO IMPORTANTE DE CORTE DE SINAL · OSDEL TECNOLOGIA*\n\nEstimado(a) Assinante ${client.fullName} (Casa ${client.houseCode || 'S/N'}), informamos que o seu serviço de ${serviceLabel(client.serviceType)} encontra-se em atraso crítico com o montante total de *${kz(client.totalDebt)}* (mensalidade + multa).\n\nSolicitamos a liquidação num prazo improrrogável de *48 horas* para evitar a desconexão física na Caixa PDO ${client.pdoNumber || 'Geral'}. Pode efetuar o pagamento por MCX Express (Entidade: ${entity}) ou contactar-nos de imediato.`;
    } else {
      text = `*COMUNICADO DE SUSPENSÃO DE SINAL · OSDEL TECNOLOGIA*\n\nInformamos o(a) cliente ${client.fullName} que, devido ao término do prazo de regularização financeira no valor de *${kz(client.totalDebt)}*, o sinal da sua residência foi submetido para suspensão técnica na caixa PDO.\n\nPara restabelecimento do sinal, será necessária a quitação integral do saldo pendente acrescido da taxa regulamentar de religação (2.500 Kz). Contacte com urgência o piquete de apoio: ${settings.companyPhone || '923 456 789'}.`;
    }

    return {
      phone: fullPhone,
      text,
      url: `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`,
    };
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Cobrança & Recuperação · Modo ${meta.shortName}`}
        title={`Rappels & Folha de Corte (${meta.shortName})`}
        detail={`Monitorização de assinantes de ${meta.name} em atraso, escalonamento automático de 1º, 2º e 3º avisos por WhatsApp e emissão da folha de corte oficial para o piquete de rua.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setModalCutSheet(true)}>
              <FileSpreadsheet size={16} /> Guia de Corte para Piquete
            </Button>
            {selectedClientIds.length > 0 && (
              <Button onClick={handleBatchCutOrders} className="bg-red-600 hover:bg-red-700 text-white">
                <Zap size={16} /> Emitir {selectedClientIds.length} Ordens de Corte
              </Button>
            )}
          </div>
        }
      />

      {toastMsg && (
        <div
          className={`p-4 rounded-xl font-bold text-sm flex items-center justify-between gap-3 border shadow-sm ${
            toastMsg.type === 'warn'
              ? 'bg-[#fdf3e7] text-[#9a5b13] border-[#fcd8a8]'
              : 'bg-[#dceee5] text-[#237052] border-[#c4e3d5]'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'warn' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toastMsg.text}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:opacity-75">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              1º Aviso (Leve)
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <Clock size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-blue-900">{totalRappel1}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">5 a 10 dias em atraso</small>
        </div>

        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#946c22]">
              2º Aviso (Pré-Corte)
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#f7e9c9] text-[#946c22]">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-[#946c22]">{totalRappel2}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">Prazo de 48h antes do corte</small>
        </div>

        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
              3º Corte Iminente
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-100 text-red-700">
              <Flame size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-red-700">{totalRappel3}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">Atraso &gt; 20 dias (Rua)</small>
        </div>

        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Sinal Suspenso
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700">
              <Zap size={16} />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900">{totalSuspended}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">Desligados na PDO</small>
        </div>

        <div className="surface rounded-xl p-5 border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
              Total em Dívida
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
              <Banknote size={16} />
            </div>
          </div>
          <p className="mt-3 text-xl font-black text-[hsl(var(--primary))]">{kz(totalDebtSum)}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            {enrichedUnpaid.length} clientes pendentes
          </small>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[hsl(var(--border))] pb-3">
        <button
          onClick={() => setActiveTab('cobrança')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'cobrança'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-slate-900'
          }`}
        >
          <Bell size={16} /> Fila Activa de Rappels ({enrichedUnpaid.length})
        </button>

        <button
          onClick={() => setActiveTab('folha_corte')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'folha_corte'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet size={16} /> Folha de Corte para o Piquete ({enrichedUnpaid.filter((c) => c.status !== 'suspended').length})
        </button>

        <button
          onClick={() => setActiveTab('acordos')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'acordos'
              ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-slate-900'
          }`}
        >
          <UserCheck size={16} /> Acordos & Promessas de Pagamento ({totalPromises})
        </button>

        <button
          onClick={() => setActiveTab('cortes_automaticos_fibra')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'cortes_automaticos_fibra'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-slate-900'
          }`}
        >
          <Scissors size={16} /> Cortes Automáticos (Só Fibra)
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500 text-white">
            MikroTik + PDO
          </span>
        </button>
      </div>

      {activeTab === 'cortes_automaticos_fibra' ? (
        <FiberAutomaticCutsView />
      ) : (
        <>
          {/* Filter Toolbar */}
          <div className="surface rounded-2xl p-4 border border-[hsl(var(--border))] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Pesquisar por cliente, telefone, casa, morada…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Severity selector */}
          <Select
            value={rappelFilter}
            onChange={(e) => setRappelFilter(e.target.value as any)}
            className="text-xs h-9 w-40"
          >
            <option value="todos">Todos os Graus</option>
            <option value="rappel1">1º Aviso (Leve)</option>
            <option value="rappel2">2º Aviso (Pré-Corte)</option>
            <option value="rappel3">3º Corte Iminente</option>
            <option value="suspensos">Suspensos</option>
          </Select>

          {/* PDO Filter */}
          <Select
            value={selectedPdo}
            onChange={(e) => setSelectedPdo(e.target.value)}
            className="text-xs h-9 w-36"
          >
            <option value="todas">Todas as PDOs</option>
            {allPdos.map((pdo) => (
              <option key={pdo} value={pdo}>
                {pdo}
              </option>
            ))}
          </Select>

          {/* Neighborhood Filter */}
          <Select
            value={selectedNeighborhood}
            onChange={(e) => setSelectedNeighborhood(e.target.value)}
            className="text-xs h-9 w-40"
          >
            <option value="todos">Todos os Bairros</option>
            {allNeighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>

          {(search || rappelFilter !== 'todos' || selectedPdo !== 'todas' || selectedNeighborhood !== 'todos') && (
            <button
              onClick={() => {
                setSearch('');
                setRappelFilter('todos');
                setSelectedPdo('todas');
                setSelectedNeighborhood('todos');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-2 cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: COBRANÇA ACTIVA */}
      {activeTab === 'cobrança' && (
        <div className="surface rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
          <div className="p-4 bg-[hsl(var(--secondary)/.3)] border-b border-[hsl(var(--border))] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">
                Apresentando {filteredList.length} de {enrichedUnpaid.length} clientes em cobrança
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-600" /> 1º Aviso
              </span>
              <span className="inline-flex items-center gap-1 text-[#946c22] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#946c22]" /> 2º Pré-Corte
              </span>
              <span className="inline-flex items-center gap-1 text-red-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-600" /> 3º Corte
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[hsl(var(--secondary)/.5)] text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="p-4">Assinante / Morada</th>
                  <th className="p-4">Telefone / WhatsApp</th>
                  <th className="p-4">Serviço & PDO</th>
                  <th className="p-4">Mensalidade</th>
                  <th className="p-4">Multa Atraso</th>
                  <th className="p-4">Total Devido</th>
                  <th className="p-4">Grau de Cobrança</th>
                  <th className="p-4 text-right">Acções Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-sm text-[#237052] space-y-2">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                      <p className="font-bold text-base">Nenhum cliente pendente encontrado com estes filtros!</p>
                      <p className="text-xs text-slate-500">
                        Todas as cobranças deste grupo encontram-se regularizadas ou em dia.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((c) => {
                    const cleanPhone = String(c.phone || '').replace(/\D/g, '');
                    const waPhone = cleanPhone.startsWith('244') ? cleanPhone : `244${cleanPhone}`;

                    // Quick default wa link (Level-appropriate)
                    const waObj = getWhatsAppMessage(
                      c,
                      c.status === 'suspended' ? 'corte_imediato' : c.rappelLevel === 'rappel3' ? 'corte_imediato' : c.rappelLevel === 'rappel2' ? 'pre_corte' : 'amigavel',
                    );

                    return (
                      <tr key={c.id} className="hover:bg-[hsl(var(--secondary)/.3)] transition">
                        <td className="p-4">
                          <Link
                            href={`/clientes/${c.id}`}
                            className="font-bold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                          >
                            {c.fullName}
                            <ChevronRight size={13} />
                          </Link>
                          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                            {c.houseCode ? <span className="font-bold text-slate-700">Casa: {c.houseCode} · </span> : ''}
                            {c.neighborhood || c.address || '—'}
                          </div>
                          {c.hasActivePromise && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              <Clock size={11} /> Promessa de pagar em {date(c.paymentPromiseDate)}
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-xs">
                          <span className="font-bold text-[hsl(var(--foreground))] block">{c.phone || '—'}</span>
                          {c.alternatePhone && (
                            <span className="text-[hsl(var(--muted-foreground))] block">Alt: {c.alternatePhone}</span>
                          )}
                        </td>

                        <td className="p-4 text-xs">
                          <Badge tone="neutral">{serviceLabel(c.serviceType)}</Badge>
                          <div className="mt-1 font-mono text-[11px] font-bold text-blue-900">
                            {c.pdoNumber ? `Caixa ${c.pdoNumber}` : <span className="text-slate-400">Sem PDO</span>}
                          </div>
                        </td>

                        <td className="p-4 font-mono text-xs">{kz(c.monthlyFee || c.monthlyPrice || 8500)}</td>

                        <td className="p-4 font-mono text-xs text-[#a24e3a]">
                          {c.penaltyFee > 0 ? kz(c.penaltyFee) : '0 Kz'}
                        </td>

                        <td className="p-4 font-black font-mono text-sm text-[hsl(var(--primary))]">
                          {kz(c.totalDebt)}
                        </td>

                        <td className="p-4">
                          {c.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-200 text-slate-800">
                              <Zap size={11} /> Cortado
                            </span>
                          ) : c.rappelLevel === 'rappel3' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-100 text-red-800">
                              <Flame size={11} /> 3º Corte Iminente
                            </span>
                          ) : c.rappelLevel === 'rappel2' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-[#f7e9c9] text-[#946c22]">
                              <AlertTriangle size={11} /> 2º Pré-Corte (48h)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                              <Clock size={11} /> 1º Lembrete
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* WhatsApp sender options */}
                          <button
                            onClick={() => setModalWhatsApp(c)}
                            title="Escolher Modelo de Aviso WhatsApp"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] text-white px-2.5 py-1.5 text-xs font-bold hover:brightness-105 transition cursor-pointer"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </button>

                          {/* Quick Payment modal */}
                          <button
                            title="Liquidar no Caixa"
                            onClick={() => {
                              setPayForm({
                                amount: String(c.monthlyFee || c.monthlyPrice || '8500'),
                                penalty: String(c.penaltyFee),
                                method: 'Multicaixa Express',
                                paidAt: new Date().toISOString().slice(0, 10),
                                receiptNumber: '',
                                notes: `Liquidação de dívida rappel ${c.fullName}`,
                              });
                              setModalPay(c);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--primary))] text-white px-2.5 py-1.5 text-xs font-bold hover:brightness-110 transition cursor-pointer"
                          >
                            <Banknote size={13} /> Liquidar
                          </button>

                          {/* Agreement / Promise */}
                          <button
                            title="Registar Acordo / Promessa de Pagamento"
                            onClick={() => {
                              setAgreementForm({
                                promiseDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
                                notes: '',
                              });
                              setModalAgreement(c);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 px-2 py-1.5 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                          >
                            <Calendar size={13} /> Acordo
                          </button>

                          {/* Emit Cut Order */}
                          {c.status !== 'suspended' ? (
                            <button
                              title="Emitir Ordem de Corte para o Piquete"
                              onClick={() => handleSendCutOrder(c)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#f8e1da] bg-[#f8e1da] text-[#a24e3a] px-2 py-1.5 text-xs font-bold hover:brightness-95 transition cursor-pointer"
                            >
                              <Zap size={13} /> OS Corte
                            </button>
                          ) : (
                            <button
                              title="Religar Sinal Manualmente"
                              onClick={() => handleDirectReconnect(c)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-2 py-1.5 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                            >
                              <Check size={13} /> Religar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: FOLHA DE CORTE OFICIAL PARA O PIQUETE */}
      {activeTab === 'folha_corte' && (
        <div className="space-y-4">
          <div className="surface rounded-2xl p-5 border border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Roteiro Técnico & Folha de Corte de Campo</h3>
              <p className="text-xs text-slate-500">
                Selecione os clientes em atraso nas PDOs e emita as Ordens de Corte em lote, ou imprima a folha oficial
                de campo para os técnicos de piquete.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setModalCutSheet(true)}>
                <Printer size={15} /> Imprimir Guia Oficial
              </Button>
              <Button
                disabled={selectedClientIds.length === 0}
                onClick={handleBatchCutOrders}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Zap size={15} /> Emitir {selectedClientIds.length} Ordens de Corte
              </Button>
            </div>
          </div>

          <div className="surface rounded-2xl overflow-hidden border border-[hsl(var(--border))]">
            <div className="p-3 bg-[hsl(var(--secondary)/.4)] border-b border-[hsl(var(--border))] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={filteredList.length > 0 && selectedClientIds.length === filteredList.length}
                  onChange={toggleSelectAll}
                  className="rounded text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="select-all" className="font-bold text-slate-700 cursor-pointer">
                  Seleccionar Todos ({filteredList.length} clientes)
                </label>
              </div>
              <span className="font-bold text-slate-600">
                {selectedClientIds.length} de {filteredList.length} seleccionados para o piquete
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[hsl(var(--secondary)/.2)] text-xs uppercase font-bold text-slate-600 border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="p-3 w-10 text-center">Sel.</th>
                    <th className="p-3">Código</th>
                    <th className="p-3">Assinante</th>
                    <th className="p-3">PDO / Porta</th>
                    <th className="p-3">Casa / Bairro / Rota</th>
                    <th className="p-3">Telefone</th>
                    <th className="p-3 text-right">Dívida Total</th>
                    <th className="p-3 text-center">Acção Imediata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {filteredList.map((c) => {
                    const isSelected = selectedClientIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-[hsl(var(--secondary)/.2)] transition ${
                          isSelected ? 'bg-red-50/60' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(c.id)}
                            className="rounded text-red-600 focus:ring-red-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-xs text-blue-900">{c.code}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {c.fullName}
                          {c.hasActivePromise && (
                            <span className="ml-2 px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-900 rounded font-bold">
                              Acordo
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-xs text-blue-800">
                          {c.pdoNumber ? (
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              {c.pdoNumber}
                            </span>
                          ) : (
                            'Sem PDO'
                          )}
                        </td>
                        <td className="p-3 text-xs text-slate-600">
                          <b>Casa {c.houseCode || 'S/N'}</b> · {c.neighborhood || c.address}
                        </td>
                        <td className="p-3 text-xs font-mono">{c.phone}</td>
                        <td className="p-3 font-mono font-black text-xs text-red-700 text-right">
                          {kz(c.totalDebt)}
                        </td>
                        <td className="p-3 text-center">
                          {c.status === 'suspended' ? (
                            <span className="text-[11px] font-bold text-slate-500">Já Desligado</span>
                          ) : (
                            <button
                              onClick={() => handleImmediateCut(c)}
                              className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold text-xs hover:bg-red-200 transition cursor-pointer"
                            >
                              Suspender Agora
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: ACORDOS & PROMESSAS DE PAGAMENTO */}
      {activeTab === 'acordos' && (
        <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-5">
          <div className="border-b border-[hsl(var(--border))] pb-4">
            <h3 className="text-base font-bold text-slate-900">Livro de Acordos & Promessas de Pagamento</h3>
            <p className="text-xs text-slate-500">
              Clientes que entraram em contacto com a secretaria/operador e negociaram uma data limite antes do corte.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrichedUnpaid
              .filter((c) => c.paymentPromiseDate || c.promiseNotes)
              .map((c) => (
                <div key={c.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <b className="text-sm text-slate-900 block">{c.fullName}</b>
                      <span className="text-xs text-slate-500">
                        {c.code} · Casa {c.houseCode || 'S/N'}
                      </span>
                    </div>
                    <Badge tone="warn">Acordo Activo</Badge>
                  </div>

                  <div className="text-xs space-y-1 bg-white p-2.5 rounded-lg border border-amber-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Data Prometida:</span>
                      <b className="text-amber-900 font-mono">{date(c.paymentPromiseDate)}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Valor Acordado:</span>
                      <b className="text-[hsl(var(--primary))] font-mono">{kz(c.totalDebt)}</b>
                    </div>
                    {c.promiseNotes && (
                      <div className="pt-1 text-[11px] text-slate-600 italic">
                        "{c.promiseNotes}"
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="text-xs h-8 py-0"
                      onClick={() => {
                        setPayForm({
                          amount: String(c.monthlyFee || '8500'),
                          penalty: String(c.penaltyFee),
                          method: 'Multicaixa Express',
                          paidAt: new Date().toISOString().slice(0, 10),
                          receiptNumber: '',
                          notes: `Cumprimento de acordo de pagamento ${c.fullName}`,
                        });
                        setModalPay(c);
                      }}
                    >
                      <Check size={12} /> Liquidar Acordo
                    </Button>
                  </div>
                </div>
              ))}

            {enrichedUnpaid.filter((c) => c.paymentPromiseDate || c.promiseNotes).length === 0 && (
              <div className="col-span-full p-12 text-center text-sm text-slate-500">
                Não há nenhum acordo ou promessa de pagamento em aberto de momento.
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {/* MODAL: MODELOS WHATSAPP INTELIGENTES */}
      {modalWhatsApp && (
        <Modal
          title={`Aviso WhatsApp · ${modalWhatsApp.fullName}`}
          eyebrow="Disparo Directo ao Cliente"
          onClose={() => setModalWhatsApp(null)}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Selecione o modelo mais apropriado para a fase de atraso do cliente. Ao clicar, o WhatsApp abrirá com o
              texto já pronto para envio:
            </p>

            {/* Template 1: Amigável */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 uppercase">1. Lembrete Amigável de Vencimento</span>
                <a
                  href={getWhatsAppMessage(modalWhatsApp, 'amigavel').url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setModalWhatsApp(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:brightness-105"
                >
                  <MessageSquare size={13} /> Enviar no WhatsApp
                </a>
              </div>
              <p className="text-xs text-slate-700 font-sans leading-relaxed bg-white p-2.5 rounded border border-blue-100">
                {getWhatsAppMessage(modalWhatsApp, 'amigavel').text}
              </p>
            </div>

            {/* Template 2: Pré-Corte 48h */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#946c22] uppercase">2. Aviso Formal de Pré-Corte (Prazo 48h)</span>
                <a
                  href={getWhatsAppMessage(modalWhatsApp, 'pre_corte').url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setModalWhatsApp(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:brightness-105"
                >
                  <MessageSquare size={13} /> Enviar no WhatsApp
                </a>
              </div>
              <p className="text-xs text-slate-700 font-sans leading-relaxed bg-white p-2.5 rounded border border-amber-100">
                {getWhatsAppMessage(modalWhatsApp, 'pre_corte').text}
              </p>
            </div>

            {/* Template 3: Suspensão Imediata */}
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-red-800 uppercase">3. Aviso de Desconexão Técnica (Corte)</span>
                <a
                  href={getWhatsAppMessage(modalWhatsApp, 'corte_imediato').url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setModalWhatsApp(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:brightness-105"
                >
                  <MessageSquare size={13} /> Enviar no WhatsApp
                </a>
              </div>
              <p className="text-xs text-slate-700 font-sans leading-relaxed bg-white p-2.5 rounded border border-red-100">
                {getWhatsAppMessage(modalWhatsApp, 'corte_imediato').text}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setModalWhatsApp(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: ACORDO DE PAGAMENTO */}
      {modalAgreement && (
        <Modal
          title={`Acordo de Pagamento · ${modalAgreement.fullName}`}
          eyebrow="Cobrança OSDEL"
          onClose={() => setModalAgreement(null)}
        >
          <form onSubmit={handleSaveAgreement} className="space-y-4">
            <p className="text-xs text-slate-600">
              Registe a promessa de pagamento acertada com o cliente. Durante este período, o cliente é marcado com
              alerta de acordo e pode ser poupado do corte de sinal.
            </p>

            <Field label="Data Prometida para Liquidação *">
              <Input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={agreementForm.promiseDate}
                onChange={(e) => setAgreementForm({ ...agreementForm, promiseDate: e.target.value })}
              />
            </Field>

            <Field label="Notas & Condições do Acordo">
              <Textarea
                rows={3}
                placeholder="Ex.: Cliente informou que recebe salário dia 20 e fará transferência via MCX Express logo de manhã."
                value={agreementForm.notes}
                onChange={(e) => setAgreementForm({ ...agreementForm, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setModalAgreement(null)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={15} /> Confirmar Acordo
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: LIQUIDAÇÃO RÁPIDA NO CAIXA */}
      {modalPay && (
        <Modal
          title={`Liquidação de Cobrança · ${modalPay.fullName}`}
          eyebrow="Caixa OSDEL"
          onClose={() => setModalPay(null)}
        >
          <form onSubmit={handlePay} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor da Mensalidade (Kz)">
                <Input
                  type="number"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                />
              </Field>
              <Field label="Multa de Atraso (Kz)">
                <Input
                  type="number"
                  value={payForm.penalty}
                  onChange={(e) => setPayForm({ ...payForm, penalty: e.target.value })}
                />
              </Field>
            </div>

            <div className="p-3.5 rounded-xl bg-[hsl(var(--secondary)/.6)] border border-[hsl(var(--border))] flex justify-between items-center text-sm font-bold">
              <span>Total a Liquidar no Caixa:</span>
              <span className="text-xl text-[hsl(var(--primary))] font-mono">
                {kz(Number(payForm.amount || 0) + Number(payForm.penalty || 0))}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Forma de Liquidação">
                <Select
                  value={payForm.method}
                  onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                >
                  <option value="Multicaixa Express">Multicaixa Express</option>
                  <option value="Terminal TPA">Terminal TPA</option>
                  <option value="Transferência Bancária (BAI/BFA)">Transferência Bancária</option>
                  <option value="Numerário (Dinheiro)">Numerário (Dinheiro)</option>
                </Select>
              </Field>
              <Field label="Nº de Talão / Comprovativo">
                <Input
                  placeholder="Ex.: MCX-901824"
                  value={payForm.receiptNumber}
                  onChange={(e) => setPayForm({ ...payForm, receiptNumber: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Notas Adicionais">
              <Input
                placeholder="Observações sobre a cobrança ou acordo"
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalPay(null)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Confirmar Liquidação & Regularizar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: FOLHA DE CORTE OFICIAL PARA IMPRESSÃO */}
      {modalCutSheet && (
        <Modal
          title="Folha de Corte de Sinal · Piquete Técnico"
          eyebrow="Roteiro de Campo Oficial"
          onClose={() => setModalCutSheet(false)}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6">
            <div className="flex justify-end gap-2 print:hidden">
              <Button variant="outline" onClick={() => setModalCutSheet(false)}>
                Fechar
              </Button>
              <Button onClick={() => window.print()}>
                <Printer size={16} /> Imprimir Folha de Corte
              </Button>
            </div>

            {/* Documento Impresso */}
            <div className="p-8 border-2 border-[hsl(var(--border))] rounded-xl bg-white text-black space-y-6">
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h2 className="text-2xl font-serif font-black tracking-tight text-blue-950">
                    {settings.companyName || 'OSDEL TECNOLOGIA'}
                  </h2>
                  <p className="text-xs uppercase font-bold tracking-widest text-slate-500">
                    GUIA OFICIAL DE CORTE DE SINAL · PIQUETE TÉCNICO DE CAMPO
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {settings.companyAddress || 'Luanda, Angola'} · Emitido em: {dateTime(new Date().toISOString())}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-red-100 text-red-900 rounded font-black text-sm uppercase">
                    Corte Obrigatório
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Total na Folha: {filteredList.length} clientes ({kz(filteredList.reduce((s, c) => s + c.totalDebt, 0))})
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                Autorização formal para o Piquete Técnico de Campo proceder à desconexão física de cabo coaxial ou fibra óptica nas caixas PDO indicadas abaixo por motivo de incumprimento superior ao prazo contratual.
              </p>

              <table className="w-full text-xs text-left border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                    <th className="p-2">Cód.</th>
                    <th className="p-2">Nome do Assinante</th>
                    <th className="p-2">Nº Casa / Bairro</th>
                    <th className="p-2">Caixa PDO / Porta</th>
                    <th className="p-2">Dívida Acumulada</th>
                    <th className="p-2">Telefone</th>
                    <th className="p-2 text-center">Cortado?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredList.map((c) => (
                    <tr key={c.id}>
                      <td className="p-2 font-mono font-bold">{c.code}</td>
                      <td className="p-2 font-bold">{c.fullName}</td>
                      <td className="p-2">{c.houseCode ? `Casa ${c.houseCode}` : c.address}</td>
                      <td className="p-2 font-bold text-blue-900">{c.pdoNumber || 'PDO-Geral'}</td>
                      <td className="p-2 font-mono text-red-800 font-bold">{kz(c.totalDebt)}</td>
                      <td className="p-2 font-mono">{c.phone}</td>
                      <td className="p-2 text-center">
                        <div className="inline-block w-4 h-4 border border-slate-400 rounded-sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-800">Assinatura do Técnico do Piquete</b>
                  <span className="text-[10px] text-slate-500">Confirmação de desconexão executada em campo</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-800">Supervisão Operacional OSDEL</b>
                  <span className="text-[10px] text-slate-500">Autorizado pela Direcção de Operações</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
