import React, { useState, useEffect, useMemo } from 'react';
import {
  Tv,
  Layers,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  Send,
  MessageCircle,
  Copy,
  Check,
  RefreshCw,
  Printer,
  Trash2,
  Edit3,
  Eye,
  ShieldCheck,
  Wifi,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  DollarSign,
  Radio,
  Sliders,
  Users,
  Building2,
  X,
  AlertCircle,
  Zap,
  ArrowUpDown,
  History,
  Bot,
  FileText,
  Repeat,
} from 'lucide-react';
import {
  TvDecoderChannel,
  DecoderPaymentRecord,
  DecoderAuditEntry,
  getStoredTvDecoders,
  saveTvDecoders,
  createTvDecoder,
  updateTvDecoder,
  deleteTvDecoder,
  renewTvSubscription,
  swapDecoderPositions,
  replaceChannelOnDecoder,
  getDaysRemaining,
  getDecodersRequiringAlerts,
  generateAdminWhatsAppAlert,
  syncTvExpiryNotifications,
  runAiHeadendAudit,
  generateAiCustomerNotice,
  fetchTvDecodersFromBackend,
  type AiHeadendAuditReport,
} from '@/lib/tv-channels';
import { useListUsers, useGetSettings, session } from '@/lib/local-api';
import { triggerPrint } from '@/lib/printer';

const kz = (val?: number | string | null) => {
  const num = Number(val || 0);
  return `${num.toLocaleString('pt-AO', { maximumFractionDigits: 0 })} Kz`;
};

const formatDate = (isoStr?: string) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return isoStr;
  }
};

const CATEGORIES_META: Record<string, { label: string; color: string }> = {
  novelas: { label: 'Novelas & Dramas', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  desporto: { label: 'Desporto & Futebol', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  filmes: { label: 'Filmes & Séries', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  noticias: { label: 'Notícias & Info', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  infantil: { label: 'Infantil & Desenhos', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  musica: { label: 'Música & Cultura', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  generalista: { label: 'Generalista', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  religioso: { label: 'Religioso', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
};

export function TvChannelsPage() {
  const currentSession = session();
  const operatorName = currentSession?.name || 'Administrador do Sistema';

  const [decoders, setDecoders] = useState<TvDecoderChannel[]>(() => getStoredTvDecoders());
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'table' | 'rack'>('table');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDecoder, setEditingDecoder] = useState<TvDecoderChannel | null>(null);
  const [renewingDecoder, setRenewingDecoder] = useState<TvDecoderChannel | null>(null);
  const [replacingDecoder, setReplacingDecoder] = useState<TvDecoderChannel | null>(null);
  const [historyDecoder, setHistoryDecoder] = useState<TvDecoderChannel | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAdminAlertModal, setShowAdminAlertModal] = useState(false);
  const [showLineupPrintModal, setShowLineupPrintModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Swap State
  const [swapChannelA, setSwapChannelA] = useState<string>('');
  const [swapChannelB, setSwapChannelB] = useState<string>('');

  // Renewal Form
  const [renewAmount, setRenewAmount] = useState<number>(0);
  const [renewMethod, setRenewMethod] = useState<string>('Multicaixa Express');
  const [renewReceiptRef, setRenewReceiptRef] = useState<string>('');

  // Replace Channel Form
  const [replaceForm, setReplaceForm] = useState({
    newChannelName: '',
    newCategory: 'novelas' as TvDecoderChannel['category'],
    newPlanName: '',
    newProviderPosition: 1,
    notes: '',
  });

  // AI State
  const [aiReport, setAiReport] = useState<AiHeadendAuditReport | null>(null);
  const [aiNoticeType, setAiNoticeType] = useState<'novo_canal' | 'mudanca_posicao' | 'manutencao'>('novo_canal');
  const [aiSelectedChannel, setAiSelectedChannel] = useState<string>('');
  const [aiGeneratedNotice, setAiGeneratedNotice] = useState<string>('');

  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Queries
  const usersQuery = useListUsers();
  const allUsers = usersQuery.data || [];
  const settingsQuery = useGetSettings();
  const settings = settingsQuery.data || {};

  // Membros Administrativos apenas (técnicos excluídos)
  const adminUsers = useMemo(() => {
    return allUsers.filter((u: any) => {
      const r = String(u.role || '').toLowerCase();
      return r === 'superadmin' || r === 'boss' || r === 'admin' || r === 'operador' || u.department?.toLowerCase().includes('admin') || u.department?.toLowerCase().includes('caixa');
    });
  }, [allUsers]);

  // Sync events & notifications
  useEffect(() => {
    syncTvExpiryNotifications();
    fetchTvDecodersFromBackend().then((list) => {
      if (list && list.length > 0) setDecoders(list);
    }).catch(() => {});
    const handleUpdate = () => {
      setDecoders(getStoredTvDecoders());
      syncTvExpiryNotifications();
    };
    window.addEventListener('osdel-tv-decoders-updated', handleUpdate);
    return () => window.removeEventListener('osdel-tv-decoders-updated', handleUpdate);
  }, []);

  const alerts = useMemo(() => getDecodersRequiringAlerts(), [decoders]);

  // Stats
  const stats = useMemo(() => {
    const total = decoders.length;
    const zapCount = decoders.filter((d) => d.provider === 'ZAP').length;
    const canalPlusCount = decoders.filter((d) => d.provider === 'Canal+').length;
    const dstvCount = decoders.filter((d) => d.provider === 'DStv').length;
    const freeCount = decoders.filter((d) => (d.isFree || d.provider === 'Banda Livre') && d.provider !== 'Extravio').length;
    const extravioCount = decoders.filter((d) => d.provider === 'Extravio' || d.status === 'extraviado').length;
    const paidCount = decoders.filter((d) => !d.isFree && d.provider !== 'Banda Livre' && d.provider !== 'Extravio').length;

    const totalMonthlyCost = decoders
      .filter((d) => !d.isFree && d.provider !== 'Banda Livre' && d.provider !== 'Extravio')
      .reduce((sum, d) => sum + (d.monthlyCost || 0), 0);

    const expiringSoon = alerts.critical1Day.length + alerts.high3Days.length + alerts.warning7Days.length;
    const expiredCount = alerts.expired.length;

    return {
      total,
      zapCount,
      canalPlusCount,
      dstvCount,
      freeCount,
      extravioCount,
      paidCount,
      totalMonthlyCost,
      expiringSoon,
      expiredCount,
    };
  }, [decoders, alerts]);

  // Filtered decoders (Sorted by our position / channelNumber)
  const filteredDecoders = useMemo(() => {
    return decoders
      .filter((d) => {
        const matchesSearch =
          d.channelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.smartcardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.decoderSerial.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.modulatorChannel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.planName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(d.channelNumber).includes(searchTerm) ||
          String(d.providerPosition || '').includes(searchTerm);

        const matchesProvider =
          providerFilter === 'todos'
            ? true
            : providerFilter === 'Banda Livre'
            ? (d.isFree || d.provider === 'Banda Livre') && d.provider !== 'Extravio'
            : providerFilter === 'Extravio'
            ? d.provider === 'Extravio' || d.status === 'extraviado'
            : d.provider === providerFilter;

        let matchesStatus = true;
        if (statusFilter === 'alerta') {
          matchesStatus = d.status === 'alerta_1d' || d.status === 'alerta_3d' || d.status === 'alerta_7d';
        } else if (statusFilter === 'expirado') {
          matchesStatus = d.status === 'expirado';
        } else if (statusFilter === 'ativo') {
          matchesStatus = d.status === 'ativo';
        } else if (statusFilter === 'gratis') {
          matchesStatus = (d.isFree || d.status === 'gratis') && d.provider !== 'Extravio';
        } else if (statusFilter === 'extraviado') {
          matchesStatus = d.status === 'extraviado' || d.provider === 'Extravio';
        }

        return matchesSearch && matchesProvider && matchesStatus;
      })
      .sort((a, b) => a.channelNumber - b.channelNumber);
  }, [decoders, searchTerm, providerFilter, statusFilter]);

  const copySmartcard = (card: string, id: string) => {
    navigator.clipboard?.writeText(card.replace(/\s/g, ''));
    setCopiedCardId(id);
    setTimeout(() => setCopiedCardId(null), 2500);
  };

  const handleOpenRenewModal = (decoder: TvDecoderChannel) => {
    setRenewingDecoder(decoder);
    setRenewAmount(decoder.monthlyCost || 9500);
    setRenewReceiptRef(`MCX-${Date.now().toString().slice(-6)}`);
  };

  const handleConfirmRenewal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingDecoder) return;

    renewTvSubscription(
      renewingDecoder.id,
      operatorName,
      renewAmount,
      renewMethod,
      renewReceiptRef,
    );

    setDecoders(getStoredTvDecoders());
    setRenewingDecoder(null);
  };

  const handleOpenReplaceModal = (decoder: TvDecoderChannel) => {
    setReplacingDecoder(decoder);
    setReplaceForm({
      newChannelName: '',
      newCategory: decoder.category,
      newPlanName: decoder.planName,
      newProviderPosition: decoder.providerPosition || 1,
      notes: '',
    });
  };

  const handleConfirmReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingDecoder || !replaceForm.newChannelName.trim()) return;

    replaceChannelOnDecoder(
      replacingDecoder.id,
      replaceForm,
      operatorName,
    );

    setDecoders(getStoredTvDecoders());
    setReplacingDecoder(null);
  };

  const handleExecuteSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapChannelA || !swapChannelB || swapChannelA === swapChannelB) {
      alert('Selecione dois canais diferentes para trocar de posição.');
      return;
    }

    swapDecoderPositions(swapChannelA, swapChannelB, operatorName);
    setDecoders(getStoredTvDecoders());
    setShowSwapModal(false);
    setSwapChannelA('');
    setSwapChannelB('');
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem a certeza que deseja eliminar o descodificador/canal "${name}" da central?`)) {
      deleteTvDecoder(id);
      setDecoders(getStoredTvDecoders());
    }
  };

  const handleRunAiAudit = () => {
    const report = runAiHeadendAudit();
    setAiReport(report);
    setShowAiModal(true);
  };

  const handleGenerateNotice = () => {
    const target = decoders.find((d) => d.id === aiSelectedChannel) || decoders[0];
    const text = generateAiCustomerNotice(
      aiNoticeType,
      target?.channelName || 'Canal TV',
      { ourPosition: target?.channelNumber, date: new Date().toLocaleDateString('pt-AO') },
      settings.tradingName || 'OSDEL TECNOLOGIA',
    );
    setAiGeneratedNotice(text);
  };

  const adminAlertMessage = useMemo(() => {
    return generateAdminWhatsAppAlert(settings.tradingName || 'OSDEL TECNOLOGIA');
  }, [settings.tradingName, decoders]);

  const copyAlertMessage = () => {
    navigator.clipboard?.writeText(adminAlertMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Central Headend & Moduladores RF
            </span>
            <span className="text-xs text-slate-500">· 1 Canal por Descodificador</span>
          </div>
          <h1 className="mt-1.5 font-serif text-3xl tracking-tight sm:text-[2.5rem]">
            Central de TV & Descodificadores
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[hsl(var(--muted-foreground))]">
            Controlo completo de canais e descodificadores (ZAP, Canal+, DStv, Banda Livre). Posição na operadora vs. na nossa rede, substituição de canais, histórico de pagamentos de subscrição, auditoria de edições e <b>tarefas de Inteligência Artificial</b>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Auditor Button */}
          <button
            onClick={handleRunAiAudit}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition"
          >
            <Bot size={15} />
            <span>Inteligência Artificial (IA)</span>
          </button>

          {/* Swap Positions Button */}
          <button
            onClick={() => setShowSwapModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-[hsl(var(--secondary))] transition"
          >
            <ArrowUpDown size={15} />
            <span>Trocar Posição</span>
          </button>

          {/* Admin Alert Button */}
          <button
            onClick={() => setShowAdminAlertModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400 bg-amber-500/15 hover:bg-amber-500/25 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 transition shadow-xs"
          >
            <MessageCircle size={15} />
            <span>Alerta WhatsApp Administradores</span>
            {alerts.totalAlertsCount > 0 && (
              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-black">
                {alerts.totalAlertsCount}
              </span>
            )}
          </button>

          {/* Print Lineup */}
          <button
            onClick={() => setShowLineupPrintModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-[hsl(var(--secondary))] transition"
          >
            <Printer size={15} />
            <span>Grelha</span>
          </button>

          {/* Add Decoder */}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
          >
            <Plus size={16} />
            <span>Novo Descodificador</span>
          </button>
        </div>
      </div>

      {/* Destaque Explicativo da Mapeação de Canais (Ex: ZAP 22 vs Nosso 56) */}
      <div className="surface rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Tv size={18} />
          </div>
          <div>
            <b className="text-blue-950 dark:text-blue-200 text-sm block">
              Mapeamento de Posições: Na Operadora vs. Na Nossa Rede
            </b>
            <p className="text-slate-600 dark:text-slate-400">
              Cada descodificador sintoniza a posição original do fornecedor (ex: <b>ZAP Novelas no 22 da ZAP</b>) e transmite na nossa frequência modulada (ex: <b>Canal 56 na TV do cliente</b>). Pode editar, trocar ou substituir a qualquer momento.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSwapModal(true)}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
        >
          <Repeat size={13} /> Trocar Ordem de Canais
        </button>
      </div>

      {/* Alerta Preventivo de Subscrição */}
      {(alerts.expired.length > 0 || alerts.critical1Day.length > 0 || alerts.high3Days.length > 0) && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-900/60 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-xs">
                <AlertTriangle size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <b className="text-sm font-bold text-rose-900 dark:text-rose-200">
                    Atenção Administrativa: {alerts.totalAlertsCount} subscrição(ões) requerem recarga imediata
                  </b>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200 px-2 py-0.5 rounded-full">
                    Acesso Exclusivo à Administração
                  </span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300">
                  {alerts.expired.length > 0 && (
                    <span className="font-bold text-rose-900 dark:text-rose-100">
                      • {alerts.expired.length} canal(is) expirados.{' '}
                    </span>
                  )}
                  {alerts.critical1Day.length > 0 && (
                    <span className="font-semibold">• {alerts.critical1Day.length} expira(m) amanhã (1d). </span>
                  )}
                  {alerts.high3Days.length > 0 && (
                    <span>• {alerts.high3Days.length} expira(m) em até 3 dias. </span>
                  )}
                  <span>Recarregue os cartões para evitar queixas de corte de TV nos clientes.</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAdminAlertModal(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition"
            >
              <Send size={14} />
              <span>Notificar Administradores</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total de Canais</span>
            <Tv size={16} className="text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black">{stats.total}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">Grelha ativa na rede</div>
        </div>

        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Descodificadores ZAP</span>
            <Radio size={16} className="text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">
            {stats.zapCount} <span className="text-xs font-normal text-slate-500">aparelhos</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">1 canal por caixa ZAP</div>
        </div>

        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Canal+ & DStv</span>
            <Layers size={16} className="text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-purple-700 dark:text-purple-400">
            {stats.canalPlusCount + stats.dstvCount}{' '}
            <span className="text-xs font-normal text-slate-500">aparelhos</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Desporto & Cinema</div>
        </div>

        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Banda Livre (FTA)</span>
            <Wifi size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {stats.freeCount} <span className="text-xs font-normal text-slate-500">canais</span>
          </div>
          <div className="mt-0.5 text-[11px] text-emerald-600 font-semibold">100% Grátis (Sinal Aberto)</div>
        </div>

        <div
          onClick={() => {
            setProviderFilter('Extravio');
            setStatusFilter('todos');
          }}
          className={`surface rounded-2xl border p-4 shadow-xs cursor-pointer transition hover:scale-[1.02] ${
            stats.extravioCount > 0
              ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/30'
              : 'border-[hsl(var(--border))]'
          }`}
          title="Clique para filtrar apenas aparelhos em Extravio"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Fornec. Extravio</span>
            <AlertTriangle
              size={16}
              className={stats.extravioCount > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-400'}
            />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">
            {stats.extravioCount}{' '}
            <span className="text-xs font-normal text-slate-500">aparelhos</span>
          </div>
          <div className="mt-0.5 text-[11px] text-rose-600 font-semibold truncate">
            {stats.extravioCount > 0 ? 'Requer averiguação' : '0 extravios'}
          </div>
        </div>

        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Custo Mensal Total</span>
            <DollarSign size={16} className="text-slate-600" />
          </div>
          <div className="mt-2 text-lg font-black text-slate-900 dark:text-slate-100 truncate">
            {kz(stats.totalMonthlyCost)}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Subscrições ativas</div>
        </div>

        <div className={`surface rounded-2xl border p-4 shadow-xs ${
          stats.expiringSoon > 0 || stats.expiredCount > 0
            ? 'border-rose-300 bg-rose-50/50 dark:bg-rose-950/20'
            : 'border-[hsl(var(--border))]'
        }`}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Alertas Ativos</span>
            <Clock size={16} className={stats.expiringSoon > 0 ? 'text-rose-600' : 'text-slate-400'} />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700 dark:text-rose-400">
            {stats.expiringSoon + stats.expiredCount}
          </div>
          <div className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
            {stats.expiredCount > 0 ? `${stats.expiredCount} expirado(s)!` : 'Requerem recarga breve'}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por canal, posição (nossa ou operadora), cartão, STB ou RF..."
              className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] pl-10 pr-4 text-xs font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end md:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers size={14} /> Tabela Detalhada
            </button>
            <button
              onClick={() => setViewMode('rack')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'rack'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Radio size={14} /> Bastidor Físico (Rack)
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Fornecedor:</span>
            {['todos', 'ZAP', 'Canal+', 'DStv', 'Banda Livre', 'Extravio'].map((prov) => (
              <button
                key={prov}
                onClick={() => setProviderFilter(prov)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  providerFilter === prov
                    ? prov === 'Extravio'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-blue-600 text-white shadow-xs'
                    : prov === 'Extravio'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {prov === 'Extravio' && <AlertTriangle size={12} className="shrink-0" />}
                <span>{prov === 'todos' ? 'Todos os Fornecedores' : prov}</span>
                {prov === 'Extravio' && stats.extravioCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      providerFilter === 'Extravio'
                        ? 'bg-white text-rose-700'
                        : 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                    }`}
                  >
                    {stats.extravioCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Estado:</span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'alerta', label: '⚠️ Em Alerta (< 7d)' },
              { id: 'expirado', label: '❌ Expirados' },
              { id: 'ativo', label: '✅ Ativos' },
              { id: 'gratis', label: '🆓 Banda Livre' },
              { id: 'extraviado', label: '🚨 Extraviado' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  statusFilter === st.id
                    ? st.id === 'extraviado'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : st.id === 'extraviado'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table View */}
      {viewMode === 'table' ? (
        <div className="surface rounded-2xl border border-[hsl(var(--border))] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-[hsl(var(--border))] text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Canal / Grelha</th>
                  <th className="py-3 px-4">Posições (Nossa vs. Operadora)</th>
                  <th className="py-3 px-4">Fornecedor & Descodificador</th>
                  <th className="py-3 px-4">Cartão Inteligente</th>
                  <th className="py-3 px-4">Modulador RF & Rack</th>
                  <th className="py-3 px-4">Mensalidade</th>
                  <th className="py-3 px-4">Validade / Estado</th>
                  <th className="py-3 px-4 text-right">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))] font-normal">
                {filteredDecoders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      Nenhum descodificador ou canal encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredDecoders.map((decoder) => {
                    const days = getDaysRemaining(decoder.subscriptionEndDate);
                    const isExp = days <= 0 && !decoder.isFree;
                    const is1d = days === 1 && !decoder.isFree;
                    const is3d = days > 1 && days <= 3 && !decoder.isFree;
                    const is7d = days > 3 && days <= 7 && !decoder.isFree;

                    return (
                      <tr
                        key={decoder.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition ${
                          isExp
                            ? 'bg-rose-50/40 dark:bg-rose-950/20'
                            : is1d
                            ? 'bg-amber-50/40 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        {/* Canal */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-mono font-black text-xs shadow-xs">
                              {decoder.channelNumber}
                            </span>
                            <div>
                              <div className="font-extrabold text-sm flex items-center gap-1.5">
                                <span>{decoder.channelName}</span>
                                {decoder.previousChannelName && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    (ex-{decoder.previousChannelName})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                <span>{CATEGORIES_META[decoder.category]?.label || decoder.category}</span>
                                <span>·</span>
                                <span className="font-mono text-slate-600 dark:text-slate-400">
                                  {decoder.planName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Posições Comparadas: Nossa vs Operadora */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500">Na nossa rede:</span>
                              <b className="font-mono text-blue-600 dark:text-blue-400 font-black">
                                Canal {decoder.channelNumber}
                              </b>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500">Na {decoder.provider}:</span>
                              <span className="font-mono text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 text-[11px]">
                                Pos. {decoder.providerPosition || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Fornecedor & Descodificador */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          <div className="font-bold flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                decoder.provider === 'ZAP'
                                  ? 'bg-amber-500'
                                  : decoder.provider === 'Canal+'
                                  ? 'bg-purple-500'
                                  : decoder.provider === 'Banda Livre'
                                  ? 'bg-emerald-500'
                                  : decoder.provider === 'Extravio'
                                  ? 'bg-rose-600 ring-2 ring-rose-300 animate-pulse'
                                  : 'bg-blue-500'
                              }`}
                            />
                            <span>{decoder.provider}</span>
                            {decoder.provider === 'Extravio' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-black uppercase">
                                Extraviado
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {decoder.decoderModel}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            STB: {decoder.decoderSerial}
                          </div>
                        </td>

                        {/* Cartão Inteligente */}
                        <td className="py-3.5 px-4">
                          {decoder.provider === 'Extravio' ? (
                            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-mono text-[11px] font-bold">
                              <AlertCircle size={13} className="shrink-0" />
                              <span>{decoder.smartcardNumber || 'CARTÃO EXTRAVIADO'}</span>
                            </div>
                          ) : decoder.isFree ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Sinal Aberto (Sem Cartão)
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {decoder.smartcardNumber}
                              </span>
                              <button
                                onClick={() => copySmartcard(decoder.smartcardNumber, decoder.id)}
                                title="Copiar número do cartão para recarga rápida"
                                className="text-slate-400 hover:text-blue-600 p-1"
                              >
                                {copiedCardId === decoder.id ? (
                                  <Check size={14} className="text-emerald-600" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Modulador & Rack */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {decoder.modulatorChannel}
                          </div>
                          <div className="text-[11px] text-slate-500">{decoder.rackPosition}</div>
                        </td>

                        {/* Mensalidade */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {decoder.provider === 'Extravio' || decoder.status === 'extraviado' ? (
                            <div>
                              <span className="text-rose-600 font-semibold text-xs">0 Kz (Suspensa)</span>
                              <span className="text-[10px] text-slate-400 font-normal block">em averiguação</span>
                            </div>
                          ) : decoder.isFree ? (
                            <span className="text-emerald-600 font-semibold text-xs">0 Kz (Grátis)</span>
                          ) : (
                            <div>
                              <span>{kz(decoder.monthlyCost)}</span>
                              <span className="text-[10px] text-slate-400 font-normal block">por mês</span>
                            </div>
                          )}
                        </td>

                        {/* Validade */}
                        <td className="py-3.5 px-4">
                          {decoder.provider === 'Extravio' || decoder.status === 'extraviado' ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                                <AlertTriangle size={12} className="shrink-0" />
                                Em Extravio
                              </span>
                              <div className="text-[10px] text-slate-500">Subscrição Suspensa</div>
                            </div>
                          ) : decoder.isFree ? (
                            <span className="text-xs text-emerald-600 font-bold">Livre Permanente</span>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {formatDate(decoder.subscriptionEndDate)}
                              </div>
                              <div className="text-[11px]">
                                {isExp ? (
                                  <span className="font-black text-rose-600">Expirou!</span>
                                ) : is1d ? (
                                  <span className="font-black text-rose-600 animate-pulse">
                                    Termina Amanhã (1d)
                                  </span>
                                ) : is3d ? (
                                  <span className="font-bold text-amber-600">Restam {days} dias</span>
                                ) : is7d ? (
                                  <span className="font-semibold text-amber-500">Restam {days} dias</span>
                                ) : (
                                  <span className="text-slate-500 font-medium">Restam {days} dias</span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!decoder.isFree && decoder.provider !== 'Extravio' && decoder.status !== 'extraviado' && (
                              <button
                                onClick={() => handleOpenRenewModal(decoder)}
                                title="Renovar subscrição por mais 1 mês"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition"
                              >
                                <RefreshCw size={12} />
                                <span>Renovar 1 Mês</span>
                              </button>
                            )}

                            {/* Substituir canal no mesmo aparelho */}
                            <button
                              onClick={() => handleOpenReplaceModal(decoder)}
                              title="Substituir este canal por outro neste descodificador"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition"
                            >
                              <Repeat size={14} />
                            </button>

                            {/* Histórico & Auditoria */}
                            <button
                              onClick={() => setHistoryDecoder(decoder)}
                              title="Ver histórico de pagamentos e quem editou"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <History size={14} />
                            </button>

                            {/* Editar tudo */}
                            <button
                              onClick={() => setEditingDecoder(decoder)}
                              title="Editar qualquer configuração do canal"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Edit3 size={14} />
                            </button>

                            {/* Apagar */}
                            <button
                              onClick={() => handleDelete(decoder.id, decoder.channelName)}
                              title="Eliminar este descodificador"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* RACK VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDecoders.map((decoder) => {
            const days = getDaysRemaining(decoder.subscriptionEndDate);
            const isExp = days <= 0 && !decoder.isFree;
            const is1d = days === 1 && !decoder.isFree;
            const is3d = days > 1 && days <= 3 && !decoder.isFree;
            const is7d = days > 3 && days <= 7 && !decoder.isFree;

            return (
              <div
                key={decoder.id}
                className={`surface rounded-2xl border p-4 shadow-sm flex flex-col justify-between space-y-3 transition ${
                  decoder.provider === 'Extravio' || decoder.status === 'extraviado'
                    ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-950/30 ring-1 ring-rose-400'
                    : isExp
                    ? 'border-rose-400 bg-rose-50/30 dark:bg-rose-950/20 ring-1 ring-rose-400'
                    : is1d
                    ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20 ring-1 ring-amber-400'
                    : 'border-[hsl(var(--border))] hover:border-blue-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-mono text-xs font-black shadow-xs">
                        {decoder.channelNumber}
                      </span>
                      <div>
                        <span className="text-xs font-extrabold block truncate max-w-[140px]">
                          {decoder.channelName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Na {decoder.provider}: Pos. {decoder.providerPosition || '—'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        decoder.provider === 'Extravio'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {decoder.provider === 'Extravio' ? '⚠️ Extravio' : decoder.provider}
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-900 text-white font-mono text-[11px] space-y-1.5 shadow-inner">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span>{decoder.decoderModel}</span>
                      {decoder.provider === 'Extravio' || decoder.status === 'extraviado' ? (
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                          EXTRAVIADO
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          SINAL OK
                        </span>
                      )}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Cartão:</span>
                      <span className="text-amber-300 font-bold">
                        {decoder.isFree ? 'SINAL ABERTO' : decoder.smartcardNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{decoder.modulatorChannel}</span>
                      <span>{decoder.rackPosition}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 text-xs space-y-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Mensalidade:</span>
                      <b className="text-slate-900 dark:text-slate-100 font-bold">
                        {decoder.isFree ? 'Grátis' : kz(decoder.monthlyCost)}
                      </b>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Validade:</span>
                      <b className="text-slate-900 dark:text-slate-100">
                        {decoder.isFree ? 'Permanente' : formatDate(decoder.subscriptionEndDate)}
                      </b>
                    </div>

                    {!decoder.isFree && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Estado:</span>
                        {isExp ? (
                          <span className="text-xs font-black text-rose-600">EXPIRADO!</span>
                        ) : is1d ? (
                          <span className="text-xs font-black text-rose-600 animate-pulse">
                            EXPIRA AMANHÃ (1D)
                          </span>
                        ) : is3d ? (
                          <span className="text-xs font-bold text-amber-600">Restam {days}d (Alerta)</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold">{days}d restantes</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  {!decoder.isFree ? (
                    <button
                      onClick={() => handleOpenRenewModal(decoder)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                    >
                      <RefreshCw size={12} />
                      <span>Renovar</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Livre
                    </span>
                  )}

                  <button
                    onClick={() => handleOpenReplaceModal(decoder)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-purple-50"
                    title="Substituir Canal"
                  >
                    <Repeat size={13} />
                  </button>

                  <button
                    onClick={() => setHistoryDecoder(decoder)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                    title="Histórico de Pagamentos e Auditoria"
                  >
                    <History size={13} />
                  </button>

                  <button
                    onClick={() => setEditingDecoder(decoder)}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                    title="Editar"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL: TROCAR DE POSIÇÃO (SWAP) ================= */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-blue-600 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <ArrowUpDown size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Trocar Posição de Dois Canais</h3>
                  <p className="text-xs text-blue-100">
                    Reordene a numeração na nossa grelha comunitária
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSwapModal(false)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleExecuteSwap} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Escolha os dois canais que deseja trocar de posição entre si. A mudança é registada na auditoria de edições do sistema.
              </p>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Canal A (Primeiro Canal):
                </label>
                <select
                  required
                  value={swapChannelA}
                  onChange={(e) => setSwapChannelA(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-blue-500"
                >
                  <option value="">Selecione o canal...</option>
                  {decoders.map((d) => (
                    <option key={d.id} value={d.id}>
                      Canal {d.channelNumber} — {d.channelName} ({d.provider})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center text-slate-400">
                <ArrowUpDown size={20} />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Canal B (Segundo Canal a Trocar com A):
                </label>
                <select
                  required
                  value={swapChannelB}
                  onChange={(e) => setSwapChannelB(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-blue-500"
                >
                  <option value="">Selecione o canal...</option>
                  {decoders.map((d) => (
                    <option key={d.id} value={d.id}>
                      Canal {d.channelNumber} — {d.channelName} ({d.provider})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[hsl(var(--border))] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Repeat size={14} /> Trocar Posições Agora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: SUBSTITUIR CANAL NO MESMO APARELHO ================= */}
      {replacingDecoder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-purple-600 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <Repeat size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Substituir Canal no Aparelho</h3>
                  <p className="text-xs text-purple-100">
                    Substitui o canal transmitido mantendo o mesmo descodificador e cartão
                  </p>
                </div>
              </div>
              <button onClick={() => setReplacingDecoder(null)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleConfirmReplace} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Canal Atual no Aparelho:</span>
                  <b className="text-slate-900 dark:text-white font-bold">{replacingDecoder.channelName}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Posição na Nossa Rede:</span>
                  <b className="font-mono text-blue-600">Canal {replacingDecoder.channelNumber}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cartão / Descodificador:</span>
                  <span className="font-mono font-bold">{replacingDecoder.smartcardNumber}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Novo Nome do Canal a Transmitir:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ZAP Novelas 2, SuperSport LaLiga, Telecine..."
                  value={replaceForm.newChannelName}
                  onChange={(e) => setReplaceForm({ ...replaceForm, newChannelName: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-bold outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Posição na {replacingDecoder.provider}:
                  </label>
                  <input
                    type="number"
                    value={replaceForm.newProviderPosition}
                    onChange={(e) =>
                      setReplaceForm({ ...replaceForm, newProviderPosition: Number(e.target.value) })
                    }
                    className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Categoria de Conteúdo:
                  </label>
                  <select
                    value={replaceForm.newCategory}
                    onChange={(e) =>
                      setReplaceForm({ ...replaceForm, newCategory: e.target.value as any })
                    }
                    className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
                  >
                    <option value="novelas">Novelas</option>
                    <option value="desporto">Desporto</option>
                    <option value="filmes">Filmes & Séries</option>
                    <option value="noticias">Notícias</option>
                    <option value="infantil">Infantil</option>
                    <option value="musica">Música</option>
                    <option value="generalista">Generalista</option>
                    <option value="religioso">Religioso</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Motivo da Substituição / Observações:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pedido dos moradores por mais desporto..."
                  value={replaceForm.notes}
                  onChange={(e) => setReplaceForm({ ...replaceForm, notes: e.target.value })}
                  className="w-full h-9 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[hsl(var(--border))] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplacingDecoder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Check size={14} /> Confirmar Substituição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: HISTÓRICO DE PAGAMENTOS & AUDITORIA ================= */}
      {historyDecoder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    Histórico & Auditoria: {historyDecoder.channelName} (Canal {historyDecoder.channelNumber})
                  </h3>
                  <p className="text-xs text-slate-300">
                    Registo de quem pagou a subscrição e quem editou as configurações
                  </p>
                </div>
              </div>
              <button onClick={() => setHistoryDecoder(null)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </header>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* HISTÓRICO DE PAGAMENTOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <b className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <DollarSign size={16} className="text-emerald-600" />
                    Histórico de Subscrições Pagas
                  </b>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Cartão: {historyDecoder.smartcardNumber}
                  </span>
                </div>

                {(!historyDecoder.paymentHistory || historyDecoder.paymentHistory.length === 0) ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                    Nenhum pagamento registado ainda para este descodificador. Ao renovar subscrição, o registo fica gravado automaticamente aqui.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {historyDecoder.paymentHistory.map((pay) => (
                      <div key={pay.id} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{kz(pay.amount)}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {pay.method}
                            </span>
                            {pay.receiptRef && (
                              <span className="text-[10px] text-slate-500 font-mono">Ref: {pay.receiptRef}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Período: {formatDate(pay.periodStart)} até {formatDate(pay.periodEnd)}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                            👤 {pay.operatorName}
                          </span>
                          <span className="text-[10px] text-slate-400">{pay.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AUDITORIA DE QUEM EDITOU */}
              <div className="space-y-3 pt-4 border-t border-[hsl(var(--border))]">
                <b className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-blue-600" />
                  Registo de Edições & Auditoria
                </b>

                {(!historyDecoder.auditLog || historyDecoder.auditLog.length === 0) ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                    Nenhuma alteração recente registada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyDecoder.auditLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {log.details}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Ação: <span className="uppercase font-bold">{log.action}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block">
                            👤 {log.operatorName}
                          </span>
                          <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAREFAS DE INTELIGÊNCIA ARTIFICIAL ================= */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-purple-600 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Bot size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Inteligência Artificial · Central de TV</h3>
                  <p className="text-xs text-purple-100">
                    Auditoria diagnóstica de descodificadores, análise orçamentária e redator de avisos
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </header>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* TAREFA 1: AUDITORIA DIAGNÓSTICA POR IA */}
              {aiReport && (
                <div className="space-y-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20 p-4">
                  <div className="flex items-center justify-between">
                    <b className="text-sm font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-purple-600" />
                      Diagnóstico Geral da Central de TV (Gerado por IA)
                    </b>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded">
                      {aiReport.generatedAt}
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {aiReport.summary}
                  </p>

                  {/* Métricas Financeiras da IA */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800">
                      <span className="text-[10px] text-slate-500 block">Orçamento Mensal:</span>
                      <b className="text-sm font-black text-slate-900 dark:text-white">
                        {kz(aiReport.financialAnalysis.monthlyBudgetKz)}
                      </b>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800">
                      <span className="text-[10px] text-slate-500 block">Recargas Urgentes:</span>
                      <b className="text-sm font-black text-rose-600">
                        {kz(aiReport.financialAnalysis.urgentFundingRequiredKz)}
                      </b>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800">
                      <span className="text-[10px] text-slate-500 block">Participação ZAP:</span>
                      <b className="text-sm font-black text-amber-600">
                        {aiReport.financialAnalysis.zapSharePercent}%
                      </b>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800">
                      <span className="text-[10px] text-slate-500 block">Participação Canal+:</span>
                      <b className="text-sm font-black text-purple-600">
                        {aiReport.financialAnalysis.canalPlusSharePercent}%
                      </b>
                    </div>
                  </div>

                  {/* Recomendações Estratégicas */}
                  <div className="space-y-1.5 pt-2">
                    <b className="text-xs text-purple-900 dark:text-purple-300 font-bold block">
                      Recomendações Práticas da IA:
                    </b>
                    <ul className="space-y-1 list-disc list-inside text-slate-700 dark:text-slate-300">
                      {aiReport.strategicRecommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAREFA 2: REDATOR DE COMUNICADOS POR IA */}
              <div className="space-y-3 pt-2">
                <b className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageCircle size={16} className="text-emerald-600" />
                  Redator de Comunicados para Clientes (WhatsApp Oficial)
                </b>
                <p className="text-slate-500 text-xs">
                  Gere comunicados automáticos redigidos pela IA para avisar os clientes e moradores sobre novos canais, manutenção ou mudança de posição.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Tipo de Comunicado:
                    </label>
                    <select
                      value={aiNoticeType}
                      onChange={(e) => setAiNoticeType(e.target.value as any)}
                      className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
                    >
                      <option value="novo_canal">🎉 Anunciar Novo Canal na Grelha</option>
                      <option value="mudanca_posicao">📢 Informar Mudança de Posição de Canal</option>
                      <option value="manutencao">⚠️ Aviso de Manutenção Técnica no Modulador</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Canal Alvo:
                    </label>
                    <select
                      value={aiSelectedChannel}
                      onChange={(e) => setAiSelectedChannel(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
                    >
                      <option value="">Selecione o canal...</option>
                      {decoders.map((d) => (
                        <option key={d.id} value={d.id}>
                          Canal {d.channelNumber} — {d.channelName} ({d.provider})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateNotice}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs flex items-center gap-2"
                >
                  <Sparkles size={14} /> Redigir Comunicado com IA
                </button>

                {aiGeneratedNotice && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        Texto Gerado pela IA:
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(aiGeneratedNotice);
                          alert('Texto copiado para a área de transferência!');
                        }}
                        className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <Copy size={13} /> Copiar Mensagem
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={7}
                      value={aiGeneratedNotice}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 p-3 font-mono text-xs leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          window.open(
                            `https://api.whatsapp.com/send?text=${encodeURIComponent(aiGeneratedNotice)}`,
                            '_blank',
                          );
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-2"
                      >
                        <MessageCircle size={15} /> Disparar para WhatsApp dos Clientes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RENOVAÇÃO DE SUBSCRIÇÃO (1 MÊS) ================= */}
      {renewingDecoder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-emerald-600 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <RefreshCw size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Renovar Subscrição (Ciclo de 1 Mês)</h3>
                  <p className="text-xs text-emerald-100">
                    Canal: <b>{renewingDecoder.channelName}</b> ({renewingDecoder.provider})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRenewingDecoder(null)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleConfirmRenewal} className="p-6 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cartão Inteligente (Smartcard):</span>
                  <b className="font-mono text-sm text-slate-900 dark:text-slate-100">
                    {renewingDecoder.smartcardNumber}
                  </b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Posição na Rede / Operadora:</span>
                  <b>Canal {renewingDecoder.channelNumber} (Pos. {renewingDecoder.providerPosition || '—'})</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data de Expiração Atual:</span>
                  <span className="font-bold text-rose-600">
                    {formatDate(renewingDecoder.subscriptionEndDate)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    Nova Data (+30 Dias de Sinal):
                  </span>
                  <b className="text-emerald-700 dark:text-emerald-400 font-bold">
                    {(() => {
                      const base = new Date();
                      base.setDate(base.getDate() + 30);
                      return formatDate(base.toISOString());
                    })()}
                  </b>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Valor da Subscrição (Kz):
                  </label>
                  <input
                    type="number"
                    required
                    value={renewAmount}
                    onChange={(e) => setRenewAmount(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Ref. Comprovativo / MCX:
                  </label>
                  <input
                    type="text"
                    value={renewReceiptRef}
                    onChange={(e) => setRenewReceiptRef(e.target.value)}
                    placeholder="MCX-123456"
                    className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 font-mono text-xs outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Forma de Pagamento da Recarga:
                </label>
                <select
                  value={renewMethod}
                  onChange={(e) => setRenewMethod(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-emerald-500"
                >
                  <option value="Multicaixa Express">Multicaixa Express (MCX)</option>
                  <option value="Transferência BAI Direto">Transferência BAI Direto</option>
                  <option value="Transferência BFA Net">Transferência BFA Net</option>
                  <option value="Numerário / Caixa">Numerário / Caixa da Empresa</option>
                  <option value="Agente ZAP / Canal+">Agente Autorizado ZAP / Canal+</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Operador / Responsável pela Recarga:
                </label>
                <input
                  type="text"
                  readOnly
                  value={operatorName}
                  className="w-full h-9 rounded-xl border border-[hsl(var(--input))] bg-slate-100 dark:bg-slate-800 px-3 text-xs font-medium text-slate-600 dark:text-slate-400"
                />
              </div>

              <div className="pt-4 border-t border-[hsl(var(--border))] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenewingDecoder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2"
                >
                  <Check size={14} />
                  <span>Confirmar Recarga de 1 Mês</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ALERTA WHATSAPP PARA ADMINISTRAÇÃO ================= */}
      {showAdminAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-amber-600 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Alerta Exclusivo para Membros Administrativos</h3>
                  <p className="text-xs text-amber-100">
                    Avisos de 7 dias, 3 dias e 1 dia · Os técnicos de campo são excluídos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminAlertModal(false)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <b className="text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Users size={14} /> Membros da Administração & Direção:
                  </b>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-200 dark:bg-amber-900 px-2 py-0.5 rounded-full">
                    {adminUsers.length} membros
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {adminUsers.map((adm: any) => (
                    <span
                      key={adm.id}
                      className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-[11px] font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1"
                    >
                      <span>👤 {adm.name}</span>
                      <span className="text-[9px] text-slate-500 uppercase">({adm.role})</span>
                      {adm.phone && (
                        <a
                          href={`https://wa.me/${adm.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            adminAlertMessage,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Enviar WhatsApp individual"
                          className="ml-1 text-emerald-600 hover:text-emerald-700"
                        >
                          <Send size={11} />
                        </a>
                      )}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 italic">
                  * Os técnicos de rua não recebem estes dados nem valores de subscrição.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Mensagem de Alerta Formatada:
                  </label>
                  <button
                    onClick={copyAlertMessage}
                    className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
                  >
                    {copiedMsg ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedMsg ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={9}
                  value={adminAlertMessage}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-slate-100 p-3 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-slate-500 text-[11px]">
                  Total a recarregar:{' '}
                  <b className="text-slate-900 dark:text-white font-bold">
                    {kz(
                      [
                        ...alerts.expired,
                        ...alerts.critical1Day,
                        ...alerts.high3Days,
                        ...alerts.warning7Days,
                      ].reduce((sum, d) => sum + (d.monthlyCost || 0), 0),
                    )}
                  </b>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminAlertModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      copyAlertMessage();
                      window.open(
                        `https://api.whatsapp.com/send?text=${encodeURIComponent(adminAlertMessage)}`,
                        '_blank',
                      );
                    }}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-2"
                  >
                    <MessageCircle size={15} />
                    <span>Disparar WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADICIONAR / EDITAR QUALQUER COISA ================= */}
      {(showAddModal || editingDecoder) && (
        <DecoderFormModal
          initialData={editingDecoder || undefined}
          operatorName={operatorName}
          onClose={() => {
            setShowAddModal(false);
            setEditingDecoder(null);
          }}
          onSave={(data) => {
            if (editingDecoder) {
              updateTvDecoder(editingDecoder.id, data, operatorName);
            } else {
              createTvDecoder(data, operatorName);
            }
            setDecoders(getStoredTvDecoders());
            setShowAddModal(false);
            setEditingDecoder(null);
          }}
        />
      )}

      {/* ================= MODAL: IMPRESSÃO DA GRELHA ================= */}
      {showLineupPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Grelha Oficial de Canais da Central</h3>
                  <p className="text-xs text-slate-300">
                    Posições na Rede, Posições na Operadora e Frequências RF
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerPrint()}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer size={14} /> Imprimir Agora
                </button>
                <button
                  onClick={() => setShowLineupPrintModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="p-6 overflow-y-auto space-y-4 print:p-0">
              <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-serif text-2xl font-bold">
                  {settings.tradingName || 'OSDEL TECNOLOGIA'} · GRELHA DE CANAIS
                </h2>
                <p className="text-xs text-slate-500">
                  Central Comunitária de Distribuição de TV por Cabo
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {decoders.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                        {dec.channelNumber}
                      </span>
                      <div>
                        <div className="font-bold">{dec.channelName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {dec.modulatorChannel} · Na {dec.provider}: Pos. {dec.providerPosition || '—'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {dec.provider}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= MODAL: EDITAR QUALQUER COISA / NOVO DESCODIFICADOR =================
function DecoderFormModal({
  initialData,
  operatorName,
  onClose,
  onSave,
}: {
  initialData?: TvDecoderChannel;
  operatorName: string;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const isEditing = Boolean(initialData);

  const [form, setForm] = useState({
    channelNumber: initialData?.channelNumber || 1, // Posição na nossa rede (ex: 56)
    providerPosition: initialData?.providerPosition || 1, // Posição na operadora (ex: 22)
    channelName: initialData?.channelName || '',
    category: initialData?.category || 'novelas',
    provider: initialData?.provider || 'ZAP',
    customProvider: '',
    isFree: initialData?.isFree ?? false,
    decoderModel: initialData?.decoderModel || 'ZAP HD Box STB-400',
    decoderSerial: initialData?.decoderSerial || '',
    smartcardNumber: initialData?.smartcardNumber || '',
    modulatorChannel: initialData?.modulatorChannel || 'Canal RF 21 (471.25 MHz)',
    rackPosition: initialData?.rackPosition || 'Bastidor A · Slot 01',
    planName: initialData?.planName || 'ZAP Max',
    monthlyCost: initialData?.monthlyCost ?? 9500,
    currentBalance: initialData?.currentBalance ?? 0,
    subscriptionStartDate:
      initialData?.subscriptionStartDate || new Date().toISOString().slice(0, 10),
    subscriptionEndDate: (() => {
      if (initialData?.subscriptionEndDate) return initialData.subscriptionEndDate;
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    })(),
    status: initialData?.status || (initialData?.provider === 'Extravio' ? 'extraviado' : 'ativo'),
    signalStatus: initialData?.signalStatus || (initialData?.provider === 'Extravio' ? 'sem_sinal' : 'otimo'),
    notes: initialData?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.channelName.trim()) {
      alert('Por favor insira o nome do canal.');
      return;
    }
    const finalProvider = form.provider === 'Outro' && form.customProvider.trim()
      ? form.customProvider.trim()
      : form.provider;

    onSave({
      ...form,
      provider: finalProvider,
    });
  };

  const handleProviderChange = (newProvider: any) => {
    const isFree = newProvider === 'Banda Livre';
    const isExtravio = newProvider === 'Extravio';
    setForm((prev) => ({
      ...prev,
      provider: newProvider,
      isFree: isFree || isExtravio,
      monthlyCost: isFree || isExtravio ? 0 : prev.monthlyCost || 9500,
      smartcardNumber: isFree
        ? 'SEM CARTÃO (Sinal Aberto)'
        : isExtravio
        ? prev.smartcardNumber || 'CARTÃO EXTRAVIADO'
        : prev.smartcardNumber,
      planName: isFree
        ? 'Banda Livre (Gratuito)'
        : isExtravio
        ? 'Fornecedor Extravio (Sob Averiguação)'
        : prev.planName,
      status: isExtravio ? 'extraviado' : prev.status === 'extraviado' ? 'ativo' : prev.status,
      signalStatus: isExtravio ? 'sem_sinal' : prev.signalStatus === 'sem_sinal' ? 'otimo' : prev.signalStatus,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Tv size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isEditing ? `Editar Canal & Descodificador: ${form.channelName}` : 'Cadastrar Novo Descodificador (1 Canal)'}
              </h3>
              <p className="text-xs text-slate-300">
                Todos os dados são 100% editáveis · Operador responsável: <b>{operatorName}</b>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* BLOCO 1: NOME E AS DUAS POSIÇÕES (NOSSA REDE VS OPERADORA) */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
            <b className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
              <ArrowUpDown size={14} className="text-blue-600" />
              Identificação & Mapeamento de Posições (Ex: ZAP 22 vs Nosso 56)
            </b>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="font-bold text-blue-900 dark:text-blue-300 block mb-1">
                  Posição na Nossa Rede (TV Cliente):
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 56"
                  value={form.channelNumber}
                  onChange={(e) => setForm({ ...form, channelNumber: Number(e.target.value) })}
                  className="w-full h-10 rounded-xl border border-blue-300 dark:border-blue-700 bg-[hsl(var(--card))] px-3 text-sm font-black text-blue-600 outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Canal na TV dos moradores</span>
              </div>

              <div className="sm:col-span-1">
                <label className="font-bold text-amber-900 dark:text-amber-300 block mb-1">
                  Posição na Operadora Original:
                </label>
                <input
                  type="number"
                  placeholder="Ex: 22"
                  value={form.providerPosition}
                  onChange={(e) => setForm({ ...form, providerPosition: Number(e.target.value) })}
                  className="w-full h-10 rounded-xl border border-amber-300 dark:border-amber-700 bg-[hsl(var(--card))] px-3 text-sm font-black text-amber-700 outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Ex: Canal na caixa ZAP oficial</span>
              </div>

              <div className="sm:col-span-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome do Canal:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ZAP Novelas"
                  value={form.channelName}
                  onChange={(e) => setForm({ ...form, channelName: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* BLOCO 2: FORNECEDOR / OPERADORA E CATEGORIA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Fornecedor / Operadora:
              </label>
              <select
                value={form.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
              >
                <option value="ZAP">ZAP (Descodificador)</option>
                <option value="Canal+">Canal+ (Décodeur)</option>
                <option value="DStv">DStv (Decoder)</option>
                <option value="Banda Livre">Banda Livre (FTA / Grátis)</option>
                <option value="Extravio">🚨 Extravio (Aparelho / Cartão Extraviado)</option>
                <option value="Startimes">Startimes</option>
                <option value="TV Cabo">TV Cabo Angola</option>
                <option value="Parabólica">Parabólica Satélite</option>
                <option value="Outro">Outro Fornecedor</option>
              </select>
            </div>

            {form.provider === 'Extravio' && (
              <div className="sm:col-span-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <div>
                  <b className="font-bold text-rose-900 dark:text-rose-100">Fornecedor Selecionado: Extravio</b>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Este equipamento fica registado no fornecedor <b>Extravio</b>. A subscrição mensal é suspensa automaticamente (0 Kz), o status é marcado como <b>Extraviado</b> e o sinal colocado como <b>Sem Sinal</b> para auditoria patrimonial e processo de cancelamento/substituição.
                  </p>
                </div>
              </div>
            )}

            {form.provider === 'Outro' && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome do Fornecedor Personalizado:
                </label>
                <input
                  type="text"
                  placeholder="Nome da operadora..."
                  value={form.customProvider}
                  onChange={(e) => setForm({ ...form, customProvider: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
                />
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Categoria de Conteúdo:
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
              >
                <option value="novelas">Novelas & Séries</option>
                <option value="desporto">Desporto & Futebol</option>
                <option value="filmes">Filmes & Cinema</option>
                <option value="noticias">Notícias & Informação</option>
                <option value="infantil">Infantil & Desenhos</option>
                <option value="musica">Música & Entretenimento</option>
                <option value="generalista">Generalista</option>
                <option value="religioso">Religioso</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Pacote / Plano Contratado:
              </label>
              <input
                type="text"
                placeholder="Ex: ZAP Max, Canal+ Evasion..."
                value={form.planName}
                onChange={(e) => setForm({ ...form, planName: e.target.value })}
                className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
              />
            </div>
          </div>

          {/* BLOCO 3: APARELHO, CARTÃO INTELIGENTE & MODULADOR */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <b className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Dados Físicos do Aparelho & Cartão
            </b>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Número do Cartão Inteligente (Smartcard):
                </label>
                <input
                  type="text"
                  required={!form.isFree}
                  disabled={form.isFree}
                  placeholder="Ex: 0219 4482 1092 01"
                  value={form.smartcardNumber}
                  onChange={(e) => setForm({ ...form, smartcardNumber: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 font-mono text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Número de Série do Descodificador (STB):
                </label>
                <input
                  type="text"
                  placeholder="Ex: ZAP-00918234-A"
                  value={form.decoderSerial}
                  onChange={(e) => setForm({ ...form, decoderSerial: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 font-mono text-xs outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Modelo do Descodificador:
                </label>
                <input
                  type="text"
                  placeholder="Ex: ZAP HD Box STB-400"
                  value={form.decoderModel}
                  onChange={(e) => setForm({ ...form, decoderModel: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
                />
              </div>
              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Posição no Bastidor / Rack:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bastidor A · Slot 01"
                  value={form.rackPosition}
                  onChange={(e) => setForm({ ...form, rackPosition: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
                />
              </div>
              <div>
                <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Canal RF / Modulador:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Canal RF 21 (471.25 MHz)"
                  value={form.modulatorChannel}
                  onChange={(e) => setForm({ ...form, modulatorChannel: e.target.value })}
                  className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-semibold outline-none"
                />
              </div>
            </div>
          </div>

          {/* BLOCO 4: SUBSCRIÇÃO E DATAS */}
          {!form.isFree && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <b className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Controlo da Subscrição Mensal (Ciclo de 1 Mês)
              </b>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Custo Mensal da Subscrição (Kz):
                  </label>
                  <input
                    type="number"
                    value={form.monthlyCost}
                    onChange={(e) => setForm({ ...form, monthlyCost: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Data de Ativação:
                  </label>
                  <input
                    type="date"
                    value={form.subscriptionStartDate}
                    onChange={(e) => setForm({ ...form, subscriptionStartDate: e.target.value })}
                    className="w-full h-10 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-rose-700 dark:text-rose-400 block mb-1">
                    Data de Expiração (Fim da Mensalidade):
                  </label>
                  <input
                    type="date"
                    required
                    value={form.subscriptionEndDate}
                    onChange={(e) => setForm({ ...form, subscriptionEndDate: e.target.value })}
                    className="w-full h-10 rounded-xl border border-rose-300 dark:border-rose-800 bg-[hsl(var(--card))] px-3 text-xs font-bold text-rose-700 dark:text-rose-400 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="font-medium text-slate-600 dark:text-slate-400 block mb-1">
              Observações / Notas da Central:
            </label>
            <textarea
              rows={2}
              placeholder="Instruções sobre este canal, prioridade de recarga ou observações técnicas..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-xs outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[hsl(var(--border))] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>{isEditing ? 'Guardar Alterações' : 'Cadastrar Descodificador'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
