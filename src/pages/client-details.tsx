import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useLocation } from 'wouter';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FilePenLine,
  FileSignature,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  PackageCheck,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Send,
  Trash2,
  Tv,
  User,
  Wifi,
  Wrench,
  Zap,
  Smartphone,
  Edit,
} from 'lucide-react';
import { MigrateToFiberModal } from '@/components/migrate-to-fiber-modal';
import { ClientCredentialsModal } from '@/components/client-credentials-modal';
import {
  getGetClientQueryKey,
  getListClientsQueryKey,
  getListPaymentsQueryKey,
  getListServiceOrdersQueryKey,
  getListEquipmentAssignmentsQueryKey,
  getListMessagesQueryKey,
  useGetClient,
  useListPayments,
  useListClientContracts,
  useListEquipmentAssignments,
  useListServiceOrders,
  useGetSettings,
  useCreatePayment,
  useCreateContract,
  useUpdateContract,
  useCreateServiceOrder,
  useCreateMessage,
  useSetClientStatus,
  useUpdateClient,
  useDeleteClient,
  checkClientDuplicate,
} from '@/lib/local-api';
import { Button, Field, Input, Select, Textarea, Badge, Status, Modal, PageHeader, kz, date, dateTime, initials, serviceLabel } from '@/components/shared-ui';
import { InvoicePreview, ContractPreview } from '@/pages/operations';

export function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'payments' | 'contracts' | 'equipment' | 'orders' | 'messages'>('payments');
  const [modalPay, setModalPay] = useState(false);
  const [modalOS, setModalOS] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [modalMessage, setModalMessage] = useState(false);
  const [modalPrintCard, setModalPrintCard] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [modalMigrateFiber, setModalMigrateFiber] = useState(false);
  const [modalCredentials, setModalCredentials] = useState(false);
  const [modalEditContract, setModalEditContract] = useState(false);
  const [contractEditForm, setContractEditForm] = useState<any>(null);

  const clientQuery = useGetClient(clientId);
  const paymentsQuery = useListPayments();
  const contractsQuery = useListClientContracts(clientId);
  const equipmentQuery = useListEquipmentAssignments(clientId);
  const ordersQuery = useListServiceOrders({ clientId });
  const settingsQuery = useGetSettings();

  const createPayment = useCreatePayment();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const createOS = useCreateServiceOrder();
  const createMsg = useCreateMessage();
  const setClientStatus = useSetClientStatus();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  // Sincronização automática em tempo real para os detalhes do cliente
  useEffect(() => {
    const handleSync = () => {
      qc.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
      qc.invalidateQueries({ queryKey: ['client-contracts', clientId] });
      qc.invalidateQueries({ queryKey: ['contracts', clientId] });
      qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
    };

    window.addEventListener('osdel-contracts-updated', handleSync);
    window.addEventListener('osdel-payments-updated', handleSync);
    window.addEventListener('osdel-clients-updated', handleSync);
    window.addEventListener('osdel-financial-accounts-updated', handleSync);
    window.addEventListener('osdel-data-sync', handleSync);

    return () => {
      window.removeEventListener('osdel-contracts-updated', handleSync);
      window.removeEventListener('osdel-payments-updated', handleSync);
      window.removeEventListener('osdel-clients-updated', handleSync);
      window.removeEventListener('osdel-financial-accounts-updated', handleSync);
      window.removeEventListener('osdel-data-sync', handleSync);
    };
  }, [clientId, qc]);

  const client = clientQuery.data;
  const allPayments: any[] = (Array.isArray(paymentsQuery.data) ? paymentsQuery.data : paymentsQuery.data?.items) || [];
  const clientPayments = allPayments.filter((p: any) => Number(p.clientId) === clientId || String(p.clientId) === String(clientId));
  const contracts = (Array.isArray(contractsQuery.data) ? contractsQuery.data : contractsQuery.data?.items) || [];
  const equipment = (Array.isArray(equipmentQuery.data) ? equipmentQuery.data : equipmentQuery.data?.items) || [];
  const orders = (Array.isArray(ordersQuery.data) ? ordersQuery.data : ordersQuery.data?.items) || [];
  const settings = settingsQuery.data || {};

  // Form states
  const [payForm, setPayForm] = useState({
    amount: '',
    penalty: '0',
    referenceMonth: new Date().toISOString().slice(0, 7),
    method: 'Multicaixa Express',
    paidAt: new Date().toISOString().slice(0, 10),
    receiptNumber: '',
    accountId: 'acc-tpa',
    notes: '',
  });

  const [osForm, setOsForm] = useState({
    type: 'avaria',
    priority: 'normal',
    technician: 'Piquete Central',
    scheduledDate: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const [statusForm, setStatusForm] = useState({
    status: 'active',
    notes: '',
  });

  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    documentNumber: '',
    phone: '',
    alternatePhone: '',
    email: '',
    houseCode: '',
    address: '',
    neighborhood: '',
    serviceType: 'tv',
    planName: '',
    monthlyFee: '',
    onuNumber: '',
    pdoNumber: '',
    notes: '',
  });

  const [msgForm, setMsgForm] = useState({
    channel: 'sms',
    recipient: '',
    title: 'Aviso OSDEL Tecnologia',
    content: '',
  });

  if (clientQuery.isLoading) {
    return (
      <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
        A carregar dados do cliente…
      </div>
    );
  }

  if (!client) {
    return (
      <div className="surface rounded-2xl p-8 text-center space-y-4">
        <AlertCircle size={40} className="mx-auto text-amber-500" />
        <h2 className="text-xl font-bold">Cliente não encontrado</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          O cliente com ID #{clientId} não existe ou foi removido.
        </p>
        <Button onClick={() => setLocation('/clientes')}>
          <ArrowLeft size={16} /> Voltar à Lista de Clientes
        </Button>
      </div>
    );
  }

  const handlePay = (e: FormEvent) => {
    e.preventDefault();
    const finalMonth = payForm.referenceMonth || new Date().toISOString().slice(0, 7);
    const finalReceipt = payForm.receiptNumber || `REC-${Date.now().toString().slice(-6)}`;
    const finalAmount = Number(payForm.amount !== '' ? payForm.amount : (client.monthlyFee || client.monthlyPrice || (client.serviceType === 'tv' ? 4000 : client.serviceType === 'combo' ? 10500 : 6500)));
    const finalPenalty = Number(payForm.penalty || 0);

    createPayment.mutate(
      {
        data: {
          clientId,
          client_id: clientId,
          clientName: client.fullName,
          client_name: client.fullName,
          amount: finalAmount,
          penalty: finalPenalty,
          total: finalAmount + finalPenalty,
          paymentMonth: finalMonth,
          payment_month: finalMonth,
          referenceMonth: finalMonth,
          reference_month: finalMonth,
          method: payForm.method,
          reference: finalReceipt,
          receiptNumber: finalReceipt,
          receipt_number: finalReceipt,
          paidAt: payForm.paidAt ? `${payForm.paidAt}T12:00:00.000Z` : new Date().toISOString(),
          accountId: payForm.accountId || 'acc-tpa',
          notes: payForm.notes,
          serviceType: client.serviceType || 'internet',
          service_type: client.serviceType || 'internet',
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries();
          setModalPay(false);
        },
      },
    );
  };

  const handleCreateOS = (e: FormEvent) => {
    e.preventDefault();
    createOS.mutate(
      {
        data: {
          ...osForm,
          clientId,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListServiceOrdersQueryKey() });
          setModalOS(false);
        },
      },
    );
  };

  const handleStatusChange = (e: FormEvent) => {
    e.preventDefault();
    setClientStatus.mutate(
      {
        clientId,
        status: statusForm.status,
        notes: statusForm.notes || client.notes,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
          qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
          setModalStatus(false);
        },
      },
    );
  };

  const duplicateStatus = useMemo(() => {
    return checkClientDuplicate({
      fullName: editForm.fullName,
      documentNumber: editForm.documentNumber,
      excludeClientId: clientId,
    });
  }, [editForm.fullName, editForm.documentNumber, clientId]);

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (duplicateStatus.isDuplicate) {
      setEditError(duplicateStatus.message || 'Dados duplicados detectados.');
      return;
    }

    updateClient.mutate(
      {
        clientId,
        data: {
          ...editForm,
          monthlyFee: Number(editForm.monthlyFee || client.monthlyFee || 0),
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
          qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
          setModalEdit(false);
        },
        onError: (err: any) => {
          setEditError(err?.message || 'Erro ao guardar dados do cliente.');
        },
      },
    );
  };

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    createMsg.mutate(
      {
        data: {
          clientId,
          channel: msgForm.channel,
          recipient: msgForm.recipient || client.phone,
          title: msgForm.title,
          content: msgForm.content,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMessagesQueryKey() });
          setModalMessage(false);
          alert('Mensagem registada e enviada com sucesso.');
        },
      },
    );
  };

  // WhatsApp quick text
  const cleanPhone = String(client.phone || '').replace(/\D/g, '');
  const waPhone = cleanPhone.startsWith('244') ? cleanPhone : `244${cleanPhone}`;
  const waText = encodeURIComponent(
    `Olá estimado(a) ${client.fullName}, da OSDEL Tecnologia. Vimos por este meio informar sobre a sua subscrição de ${serviceLabel(client.serviceType)}.`,
  );
  const waUrl = `https://wa.me/${waPhone}?text=${waText}`;

  return (
    <div className="space-y-6">
      {/* Top navigation back */}
      <div className="flex items-center justify-between">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
        >
          <ArrowLeft size={14} /> Voltar aos Clientes
        </Link>
        <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
          Ficha Cadastral OSDEL · #{client.code}
        </span>
      </div>

      {/* Main Client Profile Card */}
      <div className="surface rounded-2xl p-6 sm:p-7 border border-[hsl(var(--border))] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--primary))] text-2xl sm:text-3xl font-serif font-bold text-[hsl(var(--primary-foreground))] shadow-md">
              {initials(client.fullName)}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {client.fullName}
                </h1>
                <Status value={client.status} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                <span className="font-mono font-bold text-[hsl(var(--primary))]">
                  {client.code}
                </span>
                {client.houseCode && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> Casa: <b className="text-[hsl(var(--foreground))]">{client.houseCode}</b>
                  </span>
                )}
                <span>
                  Bairro: <b className="text-[hsl(var(--foreground))]">{client.neighborhood || client.address || 'Central'}</b>
                </span>
                {client.createdAt && (
                  <span>
                    Cliente desde: <b className="text-[hsl(var(--foreground))]">{date(client.createdAt)}</b>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-1 font-bold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))]"
                  >
                    <Phone size={13} /> {client.phone}
                  </a>
                )}
                {client.alternatePhone && (
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Alt: {client.alternatePhone}
                  </span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                    <Mail size={13} /> {client.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-[hsl(var(--border))]">
            <Button
              onClick={() => {
                const defaultFee = client.monthlyFee || client.monthlyPrice || (client.serviceType === 'tv' ? 4000 : client.serviceType === 'combo' ? 10500 : 6500);
                setPayForm({
                  amount: String(defaultFee),
                  penalty: client.status === 'late' ? String(settings.latePenalty || 1000) : '0',
                  referenceMonth: new Date().toISOString().slice(0, 7),
                  method: 'Multicaixa Express',
                  paidAt: new Date().toISOString().slice(0, 10),
                  receiptNumber: '',
                  accountId: 'acc-tpa',
                  notes: `Mensalidade ${client.fullName}`,
                });
                setModalPay(true);
              }}
            >
              <Banknote size={16} /> Registar Pagamento
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setOsForm({
                  type: 'avaria',
                  priority: 'normal',
                  technician: 'Piquete Central',
                  scheduledDate: new Date().toISOString().slice(0, 10),
                  description: `Verificação de sinal do cliente ${client.fullName}`,
                });
                setModalOS(true);
              }}
            >
              <Wrench size={16} /> Emitir O.S.
            </Button>

            {client.phone && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-bold bg-[#25D366] text-white hover:brightness-105 shadow-xs transition"
              >
                <MessageSquare size={16} /> WhatsApp
              </a>
            )}

            <Button
              variant="outline"
              onClick={() => setModalCredentials(true)}
              className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/30"
              title="Gerar / Ver dados de login e PIN do APK Cliente"
            >
              <Smartphone size={16} /> Acesso APK
            </Button>

            {client.serviceType !== 'internet' && (
              <Button
                variant="outline"
                onClick={() => setModalMigrateFiber(true)}
                className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/30"
                title="Migrar cliente de TV para Fibra Óptica e emitir novo contrato"
              >
                <Zap size={16} /> Migrar p/ Fibra
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setStatusForm({ status: client.status, notes: client.notes || '' });
                setModalStatus(true);
              }}
            >
              Estado
            </Button>

            <Button variant="outline" onClick={() => setModalPrintCard(true)}>
              <Printer size={16} /> Ficha
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setEditError(null);
                setEditForm({
                  fullName: client.fullName || '',
                  documentNumber: client.documentNumber || (client as any).document_number || (client as any).nif || '',
                  phone: client.phone || '',
                  alternatePhone: client.alternatePhone || '',
                  email: client.email || '',
                  houseCode: client.houseCode || '',
                  address: client.address || '',
                  neighborhood: client.neighborhood || '',
                  serviceType: client.serviceType || 'tv',
                  planName: client.planName || '',
                  monthlyFee: String(client.monthlyFee || ''),
                  onuNumber: client.onuNumber || '',
                  pdoNumber: client.pdoNumber || '',
                  notes: client.notes || '',
                });
                setModalEdit(true);
              }}
            >
              <FilePenLine size={16} /> Editar
            </Button>

            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Tem a certeza que deseja eliminar o registo de ${client.fullName}?`)) {
                  deleteClient.mutate(
                    { clientId: client.id },
                    {
                      onSuccess: () => {
                        qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
                        setLocation('/clientes');
                      },
                    },
                  );
                }
              }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>

        {/* Technical & Contract Highlights Bar */}
        <div className="mt-6 pt-5 border-t border-[hsl(var(--border))] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[hsl(var(--muted-foreground))] block">Plano Contratado:</span>
            <b className="text-sm font-bold text-[hsl(var(--foreground))]">
              {client.planName || serviceLabel(client.serviceType)}
            </b>
            <small className="block text-[hsl(var(--muted-foreground))]">
              {serviceLabel(client.serviceType)}
            </small>
          </div>

          <div>
            <span className="text-[hsl(var(--muted-foreground))] block">Mensalidade:</span>
            <b className="text-sm font-extrabold text-[hsl(var(--primary))]">
              {kz(client.monthlyFee)}
            </b>
            <small className="block text-[hsl(var(--muted-foreground))]">Cobrança mensal</small>
          </div>

          <div>
            <span className="text-[hsl(var(--muted-foreground))] block">Caixa PDO:</span>
            <b className="text-sm font-mono font-bold text-[hsl(var(--foreground))]">
              {client.pdoNumber || 'Não atribuída'}
            </b>
            <small className="block text-[hsl(var(--muted-foreground))]">Ponto de distribuição</small>
          </div>

          <div>
            <span className="text-[hsl(var(--muted-foreground))] block">ONU / Receptor:</span>
            <b className="text-sm font-mono font-bold text-[hsl(var(--foreground))]">
              {client.onuNumber || 'Sem número'}
            </b>
            <small className="block text-[hsl(var(--muted-foreground))]">Série do dispositivo</small>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[hsl(var(--border))] overflow-x-auto">
        <button
          onClick={() => setTab('payments')}
          className={`cursor-pointer whitespace-nowrap px-5 py-3 text-sm font-bold transition border-b-2 ${
            tab === 'payments'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Pagamentos ({clientPayments.length})
        </button>

        <button
          onClick={() => setTab('orders')}
          className={`cursor-pointer whitespace-nowrap px-5 py-3 text-sm font-bold transition border-b-2 ${
            tab === 'orders'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Ordens de Serviço ({orders.length})
        </button>

        <button
          onClick={() => setTab('contracts')}
          className={`cursor-pointer whitespace-nowrap px-5 py-3 text-sm font-bold transition border-b-2 ${
            tab === 'contracts'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Contratos ({contracts.length})
        </button>

        <button
          onClick={() => setTab('equipment')}
          className={`cursor-pointer whitespace-nowrap px-5 py-3 text-sm font-bold transition border-b-2 ${
            tab === 'equipment'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Equipamentos ({equipment.length})
        </button>

        <button
          onClick={() => setTab('messages')}
          className={`cursor-pointer whitespace-nowrap px-5 py-3 text-sm font-bold transition border-b-2 ${
            tab === 'messages'
              ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
              : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
          }`}
        >
          Histórico & Notas
        </button>
      </div>

      {/* Tab: Pagamentos */}
      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="surface rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Financeiro do Cliente</p>
              <h3 className="text-lg font-bold">Histórico de Mensalidades & Recibos</h3>
            </div>
            <Button
              onClick={() => {
                const defaultFee = client.monthlyFee || client.monthlyPrice || (client.serviceType === 'tv' ? 4000 : client.serviceType === 'combo' ? 10500 : 6500);
                setPayForm({
                  amount: String(defaultFee),
                  penalty: client.status === 'late' ? String(settings.latePenalty || 1000) : '0',
                  referenceMonth: new Date().toISOString().slice(0, 7),
                  method: 'Multicaixa Express',
                  paidAt: new Date().toISOString().slice(0, 10),
                  receiptNumber: '',
                  accountId: 'acc-tpa',
                  notes: `Mensalidade ${client.fullName}`,
                });
                setModalPay(true);
              }}
            >
              <Plus size={16} /> Registar Pagamento
            </Button>
          </div>

          <div className="surface rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[hsl(var(--secondary)/.5)] text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="p-4">Mês de Ref.</th>
                    <th className="p-4">Valor Base</th>
                    <th className="p-4">Multa</th>
                    <th className="p-4">Total Pago</th>
                    <th className="p-4">Forma & Conta</th>
                    <th className="p-4">Data Pagamento</th>
                    <th className="p-4 text-right">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {clientPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Nenhum pagamento registado para este cliente.
                      </td>
                    </tr>
                  ) : (
                    clientPayments.map((p) => {
                      const total = Number(p.amount) + Number(p.penalty || 0);
                      const accLabel =
                        p.accountId === 'acc-bai' ? 'Banco BAI' :
                        p.accountId === 'acc-bfa' ? 'Banco BFA' :
                        p.accountId === 'acc-caixa' ? 'Caixa Balcão' : 'MCX Express / TPA';
                      return (
                        <tr key={p.id} className="hover:bg-[hsl(var(--secondary)/.3)] transition">
                          <td className="p-4 font-bold text-[hsl(var(--primary))]">
                            {p.paymentMonth || p.referenceMonth || (p.paidAt ? p.paidAt.slice(0, 7) : '—')}
                          </td>
                          <td className="p-4 font-mono text-xs">{kz(p.amount)}</td>
                          <td className="p-4 font-mono text-xs text-[#a24e3a]">
                            {Number(p.penalty) > 0 ? kz(p.penalty) : '—'}
                          </td>
                          <td className="p-4 font-bold font-mono text-xs">{kz(total)}</td>
                          <td className="p-4 text-xs">
                            <span className="font-semibold block">{p.method}</span>
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{accLabel}</span>
                          </td>
                          <td className="p-4 text-xs">{date(p.paidAt)}</td>
                          <td className="p-4 text-right">
                            <button
                              title="Imprimir Factura / Recibo"
                              onClick={() => setSelectedInvoice(p)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-2.5 py-1.5 text-xs font-bold hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
                            >
                              <Printer size={13} /> Factura
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Ordens de Serviço */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="surface rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Piquete de Terreno</p>
              <h3 className="text-lg font-bold">Intervenções Técnicas na Residência</h3>
            </div>
            <Button
              onClick={() => {
                setOsForm({
                  type: 'avaria',
                  priority: 'normal',
                  technician: 'Piquete Central',
                  scheduledDate: new Date().toISOString().slice(0, 10),
                  description: `Intervenção técnica para ${client.fullName}`,
                });
                setModalOS(true);
              }}
            >
              <Plus size={16} /> Nova O.S.
            </Button>
          </div>

          <div className="surface rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[hsl(var(--secondary)/.5)] text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="p-4">Nº O.S.</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4">Piquete</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Nenhuma ordem de serviço registada para esta morada.
                      </td>
                    </tr>
                  ) : (
                    orders.map((so) => (
                      <tr key={so.id} className="hover:bg-[hsl(var(--secondary)/.3)] transition">
                        <td className="p-4 font-mono font-bold text-[hsl(var(--primary))]">
                          {so.code}
                        </td>
                        <td className="p-4 uppercase text-xs font-bold">{so.type}</td>
                        <td className="p-4 text-xs max-w-sm">{so.description}</td>
                        <td className="p-4 text-xs">{so.technician}</td>
                        <td className="p-4 text-xs">{date(so.scheduledDate)}</td>
                        <td className="p-4">
                          <Status value={so.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Contratos */}
      {tab === 'contracts' && (
        <div className="space-y-4">
          <div className="surface rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Documentação Jurídica</p>
              <h3 className="text-lg font-bold">Contratos de Prestação de Serviço</h3>
            </div>
            <Button
              onClick={async () => {
                if (!client) return;
                const tvPts = Number(client.tvPoints || (client.serviceType === 'tv' ? 1 : 0));
                const fee = client.serviceType === 'tv'
                  ? (tvPts > 1 ? 4000 + (tvPts - 1) * 1000 : 4000)
                  : (client.monthlyFee || 6500);
                await createContract.mutateAsync({
                  clientId: client.id,
                  planName: client.planName || (client.serviceType === 'tv' ? `TV por Cabo (${tvPts} TV${tvPts > 1 ? 's' : ''})` : 'Internet Fibra 10 Mbps'),
                  monthlyFee: fee,
                  monthlyPrice: fee,
                  tvPoints: tvPts,
                  status: 'active',
                  startDate: new Date().toISOString().slice(0, 10),
                });
                qc.invalidateQueries({ queryKey: ['client-contracts', clientId] });
              }}
            >
              <Plus size={16} /> Emitir Contrato
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {contracts.length === 0 ? (
              <div className="surface rounded-xl p-8 text-center col-span-2 space-y-3">
                <FileSignature size={32} className="mx-auto text-[hsl(var(--primary))]" />
                <p className="text-sm font-bold text-[hsl(var(--foreground))]">
                  Nenhum contrato formalizado ainda para este cliente.
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Todos os clientes da OSDEL devem possuir contrato activo com especificação de pontos de TV e mensalidade.
                </p>
                <Button
                  onClick={async () => {
                    if (!client) return;
                    const tvPts = Number(client.tvPoints || (client.serviceType === 'tv' ? 1 : 0));
                    const fee = client.serviceType === 'tv'
                      ? (tvPts > 1 ? 4000 + (tvPts - 1) * 1000 : 4000)
                      : (client.monthlyFee || 6500);
                    await createContract.mutateAsync({
                      clientId: client.id,
                      planName: client.planName || (client.serviceType === 'tv' ? `TV por Cabo (${tvPts || 1} TV${(tvPts || 1) > 1 ? 's' : ''})` : 'Internet Fibra'),
                      monthlyFee: fee,
                      monthlyPrice: fee,
                      tvPoints: tvPts || 1,
                      status: 'active',
                      startDate: new Date().toISOString().slice(0, 10),
                    });
                    qc.invalidateQueries({ queryKey: ['client-contracts', clientId] });
                  }}
                >
                  <Plus size={16} /> Gerar e Associar Contrato Activo Imediato
                </Button>
              </div>
            ) : (
              contracts.map((c: any) => {
                const tvPts = c.tvPoints || client?.tvPoints || (Number(c.extraTvs || 0) + 1) || 1;
                const price = c.monthlyFee || c.monthlyPrice || client?.monthlyFee || 4000;
                return (
                  <div key={c.id} className="surface rounded-xl p-5 space-y-3 border border-[hsl(var(--border))]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-[hsl(var(--primary))]">
                        {c.code || c.contractNumber || `CTR-${String(c.id).padStart(5, '0')}`}
                      </span>
                      <Badge tone={c.status === 'active' ? 'good' : 'neutral'}>
                        {c.status === 'active' ? 'Activo' : c.status}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-base">{c.planName || 'Contrato de Prestação de Serviço'}</h4>
                    <div className="text-xs space-y-1.5 text-[hsl(var(--muted-foreground))]">
                      <p>Início: {date(c.startDate)} {c.endDate ? `· Fim: ${date(c.endDate)}` : '· Vigência Contínua'}</p>
                      <p>
                        Mensalidade Contratual:{' '}
                        <b className="text-[hsl(var(--foreground))] text-sm">{kz(price)}</b>
                      </p>
                      {(client?.serviceType === 'tv' || c.tvPoints || c.extraTvs) && (
                        <p className="rounded-lg bg-[hsl(var(--secondary)/.6)] p-2 text-[11px] text-[hsl(var(--foreground))]">
                          📺 <b>Pontos de TV:</b> {tvPts} Televisão(ões){' '}
                          {tvPts > 1 ? (
                            <span className="text-emerald-600 font-bold">
                              (Base 4.000 Kz + {tvPts - 1} Ponto(s) Extra de 1.000 Kz = {kz(price)})
                            </span>
                          ) : (
                            <span className="text-[hsl(var(--muted-foreground))]">(Ponto Único Base)</span>
                          )}
                        </p>
                      )}
                      {c.speed && <p>Velocidade Garantida: <b className="text-[hsl(var(--foreground))]">{c.speed}</b></p>}

                      {/* Dados Contratuais de Pró-rata e Conta de Tesouraria */}
                      <div className="rounded-lg bg-[hsl(var(--secondary)/.4)] border border-[hsl(var(--border))] p-2.5 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[hsl(var(--foreground))]">⚖️ Pró-rata Dias:</span>
                          <span className="font-mono font-bold text-[hsl(var(--primary))]">
                            {Number(c.remainingDaysCount || c.prorataDays || 0) > 0
                              ? `${c.remainingDaysCount || c.prorataDays} dias (${kz(c.remainingDaysAmount || c.prorataAmount)})`
                              : '0 dias (Incluso no mês)'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[hsl(var(--muted-foreground))]">Opção Pró-rata:</span>
                          <span className="font-semibold text-[hsl(var(--foreground))]">
                            {c.remainingDaysChoice === 'pagar_restantes' ? 'Liquidação de Dias Restantes' : 'Assistir Restantes sem Custo Extra'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[hsl(var(--muted-foreground))]">🏛️ Conta de Tesouraria:</span>
                          <span className="font-bold text-[hsl(var(--foreground))]">
                            {c.accountName || (
                              c.accountId === 'acc-bai' ? 'Banco BAI (Arrecadação)' :
                              c.accountId === 'acc-bfa' ? 'Banco BFA (Operações)' :
                              c.accountId === 'acc-tpa' ? 'Terminal TPA / EMIS' :
                              c.accountId === 'acc-piquete' ? 'Fundo Piquete' : 'Caixa Geral (Balcão)'
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-[hsl(var(--muted-foreground))]">💳 Forma de Pagamento:</span>
                          <span className="font-medium text-[hsl(var(--foreground))]">{c.paymentMethod || 'Dinheiro (Em Mão)'}</span>
                        </div>
                        {Number(c.contractFee) > 0 && (
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-[hsl(var(--muted-foreground))]">Valor do Contrato (Adesão):</span>
                            <span className="font-bold text-emerald-600">{kz(c.contractFee)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[hsl(var(--border))] flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setContractEditForm({
                            ...c,
                            monthlyFee: c.monthlyFee || c.monthlyPrice || 4000,
                            monthlyPrice: c.monthlyFee || c.monthlyPrice || 4000,
                            tvPoints: c.tvPoints || 1,
                            contractFee: c.contractFee || 15000,
                            remainingDaysChoice: c.remainingDaysChoice || 'assistir_restantes',
                            remainingDaysCount: c.remainingDaysCount ?? c.prorataDays ?? 0,
                            remainingDaysAmount: c.remainingDaysAmount ?? c.prorataAmount ?? 0,
                            accountId: c.accountId || 'acc-caixa',
                            paymentMethod: c.paymentMethod || 'Dinheiro (Em Mão)',
                          });
                          setModalEditContract(true);
                        }}
                      >
                        <Edit size={14} /> Editar Contrato
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedContract(c)}>
                        <Printer size={14} /> Imprimir Contrato
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab: Equipamentos */}
      {tab === 'equipment' && (
        <div className="space-y-4">
          <div className="surface rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Infraestrutura em Casa do Cliente</p>
              <h3 className="text-lg font-bold">Equipamentos & Pontos de Rede</h3>
            </div>
            <Link href="/inventario">
              <Button variant="outline">
                <Boxes size={16} /> Gerir no Inventário
              </Button>
            </Link>
          </div>

          <div className="surface rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[hsl(var(--secondary)/.5)] text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="p-4">Dispositivo</th>
                    <th className="p-4">Modelo</th>
                    <th className="p-4">Nº de Série (SN)</th>
                    <th className="p-4">Endereço MAC</th>
                    <th className="p-4">PDO / Porta</th>
                    <th className="p-4">Instalado em</th>
                    <th className="p-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border))]">
                  {equipment.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                        Nenhum equipamento especificamente atribuído nas fichas de stock.
                      </td>
                    </tr>
                  ) : (
                    equipment.map((eq) => (
                      <tr key={eq.id} className="hover:bg-[hsl(var(--secondary)/.3)] transition">
                        <td className="p-4 font-bold">{eq.equipmentType}</td>
                        <td className="p-4 text-xs">{eq.model || 'Padrão'}</td>
                        <td className="p-4 font-mono text-xs">{eq.serialNumber || '—'}</td>
                        <td className="p-4 font-mono text-xs">{eq.macAddress || '—'}</td>
                        <td className="p-4 text-xs">{eq.pdoNumber || client.pdoNumber || '—'}</td>
                        <td className="p-4 text-xs">{date(eq.installedAt)}</td>
                        <td className="p-4">
                          <Status value={eq.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Mensagens & Notas */}
      {tab === 'messages' && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="surface rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-base">Notas & Histórico Operacional</h4>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Registe anotações sobre este cliente (horários preferenciais, histórico de contacto, avisos).
            </p>
            <div className="p-4 rounded-lg bg-[hsl(var(--secondary)/.6)] border border-[hsl(var(--border))] text-sm whitespace-pre-wrap">
              {client.notes || 'Sem observações adicionais registadas.'}
            </div>
          </div>

          <div className="surface rounded-xl p-5 space-y-4">
            <h4 className="font-bold text-base">Enviar Aviso SMS / WhatsApp</h4>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              Dispare um lembrete rápido para o cliente com registo no sistema de mensagens.
            </p>
            <form onSubmit={handleSendMessage} className="space-y-3">
              <Field label="Título / Assunto">
                <Input
                  required
                  value={msgForm.title}
                  onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })}
                />
              </Field>
              <Field label="Texto da Mensagem">
                <Textarea
                  required
                  rows={4}
                  placeholder={`Prezado ${client.fullName}, lembramos que a sua mensalidade OSDEL de ${kz(client.monthlyFee)} vence dia 05...`}
                  value={msgForm.content}
                  onChange={(e) => setMsgForm({ ...msgForm, content: e.target.value })}
                />
              </Field>
              <div className="flex justify-end">
                <Button type="submit">
                  <Send size={15} /> Registar e Enviar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registar Pagamento */}
      {modalPay && (
        <Modal
          title={`Registar Pagamento · ${client.fullName}`}
          eyebrow="Caixa & Cobrança"
          onClose={() => setModalPay(false)}
        >
          <form onSubmit={handlePay} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mês de Referência *">
                <Input
                  type="month"
                  required
                  value={payForm.referenceMonth}
                  onChange={(e) => setPayForm({ ...payForm, referenceMonth: e.target.value })}
                />
              </Field>
              <Field label="Data de Pagamento *">
                <Input
                  type="date"
                  required
                  value={payForm.paidAt}
                  onChange={(e) => setPayForm({ ...payForm, paidAt: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor Base (Kz) *">
                <Input
                  type="number"
                  required
                  min="0"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                />
              </Field>
              <Field label="Multa / Juro de Atraso (Kz)">
                <Input
                  type="number"
                  min="0"
                  value={payForm.penalty}
                  onChange={(e) => setPayForm({ ...payForm, penalty: e.target.value })}
                />
              </Field>
            </div>

            <div className="p-3.5 rounded-lg bg-[hsl(var(--secondary)/.6)] border border-[hsl(var(--border))] flex justify-between items-center text-sm font-bold">
              <span>Total a Liquidar:</span>
              <span className="text-lg text-[hsl(var(--primary))]">
                {kz(Number(payForm.amount || 0) + Number(payForm.penalty || 0))}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Forma de Pagamento">
                <Select
                  value={payForm.method}
                  onChange={(e) => {
                    const m = e.target.value;
                    let acc = payForm.accountId;
                    if (m === 'Dinheiro') acc = 'acc-caixa';
                    else if (m.includes('Multicaixa') || m === 'TPA') acc = 'acc-tpa';
                    else if (m.includes('Transferência') || m.includes('Depósito')) acc = 'acc-bai';
                    setPayForm({ ...payForm, method: m, accountId: acc });
                  }}
                >
                  <option value="Multicaixa Express">Multicaixa Express</option>
                  <option value="TPA">Terminal TPA</option>
                  <option value="Depósito / Transferência">Depósito / Transferência Bancária</option>
                  <option value="Dinheiro">Dinheiro Físico / Caixa</option>
                </Select>
              </Field>
              <Field label="Conta de Destino">
                <Select
                  value={payForm.accountId}
                  onChange={(e) => setPayForm({ ...payForm, accountId: e.target.value })}
                >
                  <option value="acc-tpa">Multicaixa / TPA Golf</option>
                  <option value="acc-caixa">Caixa Geral (Balcão Golf)</option>
                  <option value="acc-bai">Banco BAI (Arrecadação)</option>
                  <option value="acc-bfa">Banco BFA (Operações)</option>
                </Select>
              </Field>
              <Field label="Nº de Talão / Transacção">
                <Input
                  placeholder="Ex.: MCX-998822"
                  value={payForm.receiptNumber}
                  onChange={(e) => setPayForm({ ...payForm, receiptNumber: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalPay(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Confirmar Pagamento
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Nova O.S. */}
      {modalOS && (
        <Modal
          title={`Emitir Ordem de Serviço · ${client.fullName}`}
          eyebrow="Piquete Técnico"
          onClose={() => setModalOS(false)}
        >
          <form onSubmit={handleCreateOS} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de Intervenção">
                <Select
                  value={osForm.type}
                  onChange={(e) => setOsForm({ ...osForm, type: e.target.value })}
                >
                  <option value="avaria">Avaria Técnica / Falta de Sinal</option>
                  <option value="corte">Corte por Inadimplência</option>
                  <option value="religacao">Religação de Sinal</option>
                  <option value="instalacao">Nova Instalação</option>
                  <option value="derivacao">Derivação / Ponto Extra de TV</option>
                </Select>
              </Field>

              <Field label="Prioridade">
                <Select
                  value={osForm.priority}
                  onChange={(e) => setOsForm({ ...osForm, priority: e.target.value })}
                >
                  <option value="normal">Normal</option>
                  <option value="urgente">Urgente</option>
                  <option value="imediata">Imediata</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Piquete Designado">
                <Input
                  value={osForm.technician}
                  onChange={(e) => setOsForm({ ...osForm, technician: e.target.value })}
                />
              </Field>

              <Field label="Data Agendada">
                <Input
                  type="date"
                  required
                  value={osForm.scheduledDate}
                  onChange={(e) => setOsForm({ ...osForm, scheduledDate: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Instruções para a Equipa">
              <Textarea
                required
                rows={3}
                value={osForm.description}
                onChange={(e) => setOsForm({ ...osForm, description: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalOS(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Emitir O.S.
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Alterar Estado */}
      {modalStatus && (
        <Modal
          title={`Alterar Estado · ${client.fullName}`}
          eyebrow="Gestão Cadastral"
          onClose={() => setModalStatus(false)}
        >
          <form onSubmit={handleStatusChange} className="space-y-4">
            <Field label="Novo Estado do Cliente *">
              <Select
                value={statusForm.status}
                onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              >
                <option value="active">Activo (Sinal Operacional)</option>
                <option value="late">Em Atraso (Pendente de Pagamento)</option>
                <option value="suspended">Suspenso (Sinal Cortado)</option>
                <option value="inactive">Inactivo / Cancelado</option>
              </Select>
            </Field>

            <Field label="Motivo ou Nota Operacional">
              <Textarea
                rows={3}
                placeholder="Ex.: Sinal cortado na PDO-04 porta 2 por atraso de 2 meses."
                value={statusForm.notes}
                onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalStatus(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Gravar Estado
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Editar Cliente */}
      {modalEdit && (
        <Modal
          title={`Editar Dados Cadastrais · ${client.fullName}`}
          eyebrow="Cadastro de Cliente"
          onClose={() => setModalEdit(false)}
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            {editError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <b className="font-bold block">Erro ao Atualizar:</b>
                  <span>{editError}</span>
                </div>
              </div>
            )}

            {duplicateStatus.isDuplicate && !editError && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <b className="font-bold block">Registo Duplicado Detectado:</b>
                  <span>{duplicateStatus.message}</span>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome Completo *">
                <Input
                  required
                  value={editForm.fullName}
                  onChange={(e) => {
                    setEditForm({ ...editForm, fullName: e.target.value });
                    setEditError(null);
                  }}
                  className={duplicateStatus.isDuplicate && duplicateStatus.field === 'name' ? 'border-rose-500 focus:border-rose-600' : ''}
                />
                {duplicateStatus.isDuplicate && duplicateStatus.field === 'name' && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle size={13} /> {duplicateStatus.message}
                  </p>
                )}
              </Field>

              <Field label="N.º de Bilhete de Identidade (BI/NIF) *">
                <Input
                  required
                  value={editForm.documentNumber}
                  onChange={(e) => {
                    setEditForm({ ...editForm, documentNumber: e.target.value });
                    setEditError(null);
                  }}
                  placeholder="Ex.: 004829104LA041"
                  className={duplicateStatus.isDuplicate && duplicateStatus.field === 'document' ? 'border-rose-500 focus:border-rose-600' : ''}
                />
                {duplicateStatus.isDuplicate && duplicateStatus.field === 'document' && (
                  <p className="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertCircle size={13} /> {duplicateStatus.message}
                  </p>
                )}
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Telefone Principal *">
                <Input
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </Field>
              <Field label="Telefone Alternativo">
                <Input
                  value={editForm.alternatePhone}
                  onChange={(e) => setEditForm({ ...editForm, alternatePhone: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nº da Casa / Ponto">
                <Input
                  value={editForm.houseCode}
                  onChange={(e) => setEditForm({ ...editForm, houseCode: e.target.value })}
                />
              </Field>
              <Field label="Bairro / Zona">
                <Input
                  value={editForm.neighborhood}
                  onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Endereço Completo">
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Serviço">
                <Select
                  value={editForm.serviceType}
                  onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value })}
                >
                  <option value="tv">TV</option>
                  <option value="internet">Internet Fibra</option>
                  <option value="combo">TV + Internet</option>
                </Select>
              </Field>
              <Field label="Plano">
                <Input
                  value={editForm.planName}
                  onChange={(e) => setEditForm({ ...editForm, planName: e.target.value })}
                />
              </Field>
              <Field label="Mensalidade (Kz)">
                <Input
                  type="number"
                  value={editForm.monthlyFee}
                  onChange={(e) => setEditForm({ ...editForm, monthlyFee: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Caixa PDO">
                <Input
                  value={editForm.pdoNumber}
                  onChange={(e) => setEditForm({ ...editForm, pdoNumber: e.target.value })}
                />
              </Field>
              <Field label="Nº da ONU / Dispositivo">
                <Input
                  value={editForm.onuNumber}
                  onChange={(e) => setEditForm({ ...editForm, onuNumber: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Observações">
              <Textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalEdit(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={duplicateStatus.isDuplicate || updateClient.isPending}
                className={duplicateStatus.isDuplicate ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <Check size={16} /> {updateClient.isPending ? 'A guardar…' : 'Guardar Alterações'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal / Impressão de Ficha Cadastral 360° */}
      {modalPrintCard && (
        <Modal
          title={`Ficha Cadastral 360° · ${client.fullName}`}
          eyebrow="Registo em Arquivo"
          onClose={() => setModalPrintCard(false)}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="flex justify-end gap-2 print:hidden">
              <Button variant="outline" onClick={() => setModalPrintCard(false)}>
                Fechar
              </Button>
              <Button onClick={() => window.print()}>
                <Printer size={16} /> Imprimir Ficha
              </Button>
            </div>

            {/* Folha Oficial de Registo */}
            <div className="p-8 border-2 border-[hsl(var(--border))] rounded-xl bg-white text-black space-y-6">
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h2 className="text-2xl font-serif font-black tracking-tight text-blue-900">
                    {settings.companyName || 'OSDEL TECNOLOGIA'}
                  </h2>
                  <p className="text-xs uppercase font-bold tracking-widest text-slate-500">
                    FICHA CADASTRAL DO CLIENTE · ARQUIVO GERAL
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {settings.companyAddress || 'Luanda, Angola'} · Tel: {settings.companyPhone || '926 153 736'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-blue-50 text-blue-950 rounded border border-blue-200 font-mono font-black text-lg">
                    {client.code}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Data: {date(new Date().toISOString())}
                  </p>
                </div>
              </div>

              {/* Dados Pessoais */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                  1. Identificação do Assinante
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Nome Completo:</span>
                    <b className="text-sm text-slate-900">{client.fullName}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Estado Actual:</span>
                    <b className="uppercase text-slate-900">{client.status}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Telefone Principal:</span>
                    <b className="text-slate-900">{client.phone}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Telefone Alternativo:</span>
                    <b className="text-slate-900">{client.alternatePhone || '—'}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">E-mail:</span>
                    <b className="text-slate-900">{client.email || '—'}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Casa / Ponto:</span>
                    <b className="text-slate-900">{client.houseCode || '—'}</b>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Morada Completa:</span>
                    <b className="text-slate-900">
                      {client.address} {client.neighborhood ? `(${client.neighborhood})` : ''}
                    </b>
                  </div>
                </div>
              </div>

              {/* Dados Técnicos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                  2. Dados Técnicos da Ligação
                </h4>
                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border">
                  <div>
                    <span className="text-slate-500 block">Tipo de Serviço:</span>
                    <b className="text-slate-900">{serviceLabel(client.serviceType)}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Plano:</span>
                    <b className="text-slate-900">{client.planName || 'Padrão'}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mensalidade:</span>
                    <b className="text-blue-900 font-black">{kz(client.monthlyFee)}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Caixa PDO:</span>
                    <b className="text-slate-900 font-mono">{client.pdoNumber || '—'}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nº de Série ONU:</span>
                    <b className="text-slate-900 font-mono">{client.onuNumber || '—'}</b>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Data de Adesão:</span>
                    <b className="text-slate-900">{date(client.createdAt)}</b>
                  </div>
                </div>
              </div>

              {/* Histórico Recente de Pagamentos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                  3. Últimos Pagamentos Registados
                </h4>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-1">Mês Ref.</th>
                      <th className="py-1">Valor</th>
                      <th className="py-1">Forma</th>
                      <th className="py-1">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {clientPayments.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td className="py-1 font-bold">{p.referenceMonth}</td>
                        <td className="py-1 font-mono">{kz(Number(p.amount) + Number(p.penalty || 0))}</td>
                        <td className="py-1">{p.method}</td>
                        <td className="py-1">{date(p.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Assinatura */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-center">
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-800">Assinatura do Assinante</b>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-800">Pela OSDEL Tecnologia</b>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice modal preview */}
      {selectedInvoice && (
        <InvoicePreview
          payment={selectedInvoice}
          client={client}
          settings={settings}
          close={() => setSelectedInvoice(null)}
        />
      )}

      {/* Contract modal preview */}
      {selectedContract && (
        <ContractPreview
          contract={selectedContract}
          client={client}
          settings={settings}
          close={() => setSelectedContract(null)}
        />
      )}

      {/* Modal Migração para Fibra */}
      {modalMigrateFiber && client && (
        <MigrateToFiberModal
          client={client}
          onClose={() => setModalMigrateFiber(false)}
          onSuccess={(newContract) => {
            setModalMigrateFiber(false);
            qc.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
            qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
            setSelectedContract(newContract);
          }}
        />
      )}

      {/* Modal Credenciais APK Cliente */}
      {modalCredentials && client && (
        <ClientCredentialsModal
          client={client}
          onClose={() => setModalCredentials(false)}
        />
      )}

      {/* Modal Editar Contrato & Pró-rata */}
      {modalEditContract && contractEditForm && (
        <Modal
          title={`Editar Contrato ${contractEditForm.code || contractEditForm.contractNumber}`}
          onClose={() => {
            setModalEditContract(false);
            setContractEditForm(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateContract.mutate(
                { contractId: contractEditForm.id, data: contractEditForm },
                {
                  onSuccess: () => {
                    qc.invalidateQueries({ queryKey: ['client-contracts', clientId] });
                    qc.invalidateQueries({ queryKey: ['contracts', clientId] });
                    qc.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
                    setModalEditContract(false);
                    setContractEditForm(null);
                  },
                }
              );
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do Plano Contratado">
                <Input
                  value={contractEditForm.planName || ''}
                  onChange={(e) => setContractEditForm({ ...contractEditForm, planName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Mensalidade Contratual (Kz)">
                <Input
                  type="number"
                  value={contractEditForm.monthlyFee || contractEditForm.monthlyPrice || ''}
                  onChange={(e) =>
                    setContractEditForm({
                      ...contractEditForm,
                      monthlyFee: Number(e.target.value),
                      monthlyPrice: Number(e.target.value),
                    })
                  }
                  required
                />
              </Field>
              <Field label="Pontos de TV (Televisores Conectados)">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={contractEditForm.tvPoints || 1}
                  onChange={(e) =>
                    setContractEditForm({
                      ...contractEditForm,
                      tvPoints: Number(e.target.value),
                      extraTvs: Math.max(0, Number(e.target.value) - 1),
                    })
                  }
                />
              </Field>
              <Field label="Taxa de Adesão / Contrato (Kz)">
                <Input
                  type="number"
                  value={contractEditForm.contractFee || ''}
                  onChange={(e) =>
                    setContractEditForm({
                      ...contractEditForm,
                      contractFee: Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>

            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3.5 space-y-3">
              <p className="text-xs font-bold text-[hsl(var(--foreground))]">⚖️ Configuração de Pró-rata e Dias Restantes</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Opção Pró-rata">
                  <Select
                    value={contractEditForm.remainingDaysChoice || 'assistir_restantes'}
                    onChange={(e) => setContractEditForm({ ...contractEditForm, remainingDaysChoice: e.target.value })}
                  >
                    <option value="assistir_restantes">Assistir Restantes (Incluso)</option>
                    <option value="pagar_restantes">Pagar Dias Restantes</option>
                  </Select>
                </Field>
                <Field label="Dias Pró-rata (Contagem)">
                  <Input
                    type="number"
                    min="0"
                    max="31"
                    value={contractEditForm.remainingDaysCount ?? contractEditForm.prorataDays ?? 0}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      const dailyRate = Number(settings.dailyGuarantee || 150);
                      setContractEditForm({
                        ...contractEditForm,
                        remainingDaysCount: count,
                        prorataDays: count,
                        remainingDaysAmount: count * dailyRate,
                        prorataAmount: count * dailyRate,
                      });
                    }}
                  />
                </Field>
                <Field label="Valor Pró-rata (Kz)">
                  <Input
                    type="number"
                    value={contractEditForm.remainingDaysAmount ?? contractEditForm.prorataAmount ?? 0}
                    onChange={(e) =>
                      setContractEditForm({
                        ...contractEditForm,
                        remainingDaysAmount: Number(e.target.value),
                        prorataAmount: Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="🏛️ Conta Financeira / Tesouraria">
                <Select
                  value={contractEditForm.accountId || 'acc-caixa'}
                  onChange={(e) => setContractEditForm({ ...contractEditForm, accountId: e.target.value, account_id: e.target.value })}
                >
                  <option value="acc-caixa">Caixa Geral (Balcão Golf)</option>
                  <option value="acc-bai">Banco BAI (Arrecadação Principal)</option>
                  <option value="acc-bfa">Banco BFA (Operações & Fornecedores)</option>
                  <option value="acc-tpa">Terminal Multicaixa Express (TPA / EMIS)</option>
                  <option value="acc-piquete">Fundo de Maneio de Piquete Técnico</option>
                </Select>
              </Field>
              <Field label="Forma de Pagamento">
                <Input
                  value={contractEditForm.paymentMethod || 'Dinheiro (Em Mão)'}
                  onChange={(e) => setContractEditForm({ ...contractEditForm, paymentMethod: e.target.value })}
                  placeholder="Ex.: Multicaixa Express, Transferência BAI, Dinheiro"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setModalEditContract(false);
                  setContractEditForm(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar Alterações do Contrato</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
