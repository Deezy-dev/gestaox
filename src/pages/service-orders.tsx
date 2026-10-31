import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileCheck2,
  Filter,
  Layers,
  MapPin,
  Phone,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  Wrench,
  X,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { triggerPrint, getPrintUrl } from '@/lib/printer';
import { useServiceMode } from '@/lib/service-mode';
import {
  getListServiceOrdersQueryKey,
  getListClientsQueryKey,
  useListServiceOrders,
  useListClients,
  useListUsers,
  useAssignTaskToUserSchedule,
  useGetSettings,
  useCreateServiceOrder,
  useUpdateServiceOrder,
  useDeleteServiceOrder,
} from '@/lib/local-api';
import { addSystemNotification } from '@/lib/notifications';
import { sendMobilePush } from '@/lib/mobile-push';
import { Button, Field, Input, Select, Textarea, Badge, Status, Modal, PageHeader, kz, date, dateTime } from '@/components/shared-ui';

export function ServiceOrdersPage() {
  const { mode, meta } = useServiceMode();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modalNew, setModalNew] = useState(false);
  const [modalComplete, setModalComplete] = useState<any>(null);
  const [printOrder, setPrintOrder] = useState<any>(null);

  const ordersQuery = useListServiceOrders({ status: statusFilter, type: typeFilter, serviceMode: mode || undefined });
  const clientsQuery = useListClients({ serviceMode: mode || undefined });
  const usersQuery = useListUsers();
  const assignTask = useAssignTaskToUserSchedule();
  const settingsQuery = useGetSettings();

  const createOrder = useCreateServiceOrder();
  const updateOrder = useUpdateServiceOrder();
  const deleteOrder = useDeleteServiceOrder();

  const orders = ordersQuery.data || [];
  const clients = clientsQuery.data?.items || [];
  const allUsers: any[] = (Array.isArray(usersQuery.data) ? usersQuery.data : usersQuery.data?.items) || [];
  const technicians = allUsers.filter((u: any) => u.active !== false);
  const settings = settingsQuery.data || {};

  // Form states
  const [newForm, setNewForm] = useState({
    clientId: '',
    type: 'instalacao',
    priority: 'normal',
    technicianId: '',
    technician: technicians[0]?.name || (mode === 'fibra' ? 'Técnico de Fibra (Fusão & FTTH)' : 'Piquete Central TV (Mateus & João)'),
    scheduledDate: new Date().toISOString().slice(0, 10),
    description: '',
    cableUsedMeters: '0',
    materialNotes: '',
  });

  const [completeForm, setCompleteForm] = useState({
    resolution: 'Serviço executado com sucesso e parâmetros de sinal validados.',
    cableUsedMeters: '0',
    materialNotes: '',
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newForm.clientId) {
      alert('Seleccione o cliente para a Ordem de Serviço.');
      return;
    }

    const targetClient = clients.find((c: any) => c.id === Number(newForm.clientId));
    const selectedTech = technicians.find((t: any) => String(t.id) === String(newForm.technicianId)) ||
      technicians.find((t: any) => t.name === newForm.technician) ||
      technicians[0];

    const techName = selectedTech?.name || newForm.technician;

    createOrder.mutate(
      {
        data: {
          ...newForm,
          clientId: Number(newForm.clientId),
          technician: techName,
          cableUsedMeters: Number(newForm.cableUsedMeters || 0),
        },
      },
      {
        onSuccess: (created: any) => {
          qc.invalidateQueries({ queryKey: getListServiceOrdersQueryKey({ serviceMode: mode || undefined }) });

          // 1. Notificação Imediata para o Técnico Selecionado com Detalhes da Ordem
          try {
            const orderCode = created?.code || `OS-${Date.now().toString().slice(-4)}`;
            addSystemNotification({
              title: `📋 Nova O.S. Atribuída: ${orderCode} (${typeLabels[newForm.type]?.label || newForm.type})`,
              message: `Técnico ${techName}: Missão para o cliente ${targetClient?.fullName || 'Assinante'} em ${targetClient?.address || targetClient?.street || 'Golf I'}. Prioridade: ${newForm.priority.toUpperCase()}. Instruções: ${newForm.description || 'Executar conforme normas da rede.'}`,
              type: 'operacao',
              priority: newForm.priority === 'urgente' || newForm.priority === 'imediata' ? 'urgente' : 'alta',
              link: '/ordens-servico',
            });
            sendMobilePush({
              title: `📋 Nova O.S. Atribuída: ${orderCode}`,
              body: `Técnico ${techName}: Missão para ${targetClient?.fullName || 'Cliente'} em ${targetClient?.address || targetClient?.street || 'Golf I'}. Prioridade: ${newForm.priority.toUpperCase()}`,
              category: 'piquete',
              targetAudience: 'staff',
              actionLabel: 'Ver O.S.',
            });
          } catch {}

          // 2. Vincula à agenda do técnico
          if (selectedTech?.id) {
            try {
              assignTask.mutate({
                userId: selectedTech.id,
                task: {
                  time: '09:00 - 12:00',
                  title: `O.S. ${newForm.type.toUpperCase()}: ${targetClient?.fullName || 'Cliente'}`,
                  clientName: targetClient?.fullName || 'Assinante',
                  location: targetClient?.address || 'Golf I',
                  priority: newForm.priority,
                  status: 'pendente',
                },
              });
            } catch {}
          }

          setModalNew(false);
          setNewForm({
            clientId: '',
            type: 'instalacao',
            priority: 'normal',
            technicianId: '',
            technician: technicians[0]?.name || (mode === 'fibra' ? 'Técnico de Fibra (Fusão & FTTH)' : 'Piquete Central TV (Mateus & João)'),
            scheduledDate: new Date().toISOString().slice(0, 10),
            description: '',
            cableUsedMeters: '0',
            materialNotes: '',
          });
          alert(`Ordem de Serviço criada com sucesso! O técnico ${techName} foi notificado com os detalhes da missão.`);
        },
      },
    );
  };

  const handleComplete = (e: FormEvent) => {
    e.preventDefault();
    if (!modalComplete) return;

    updateOrder.mutate(
      {
        orderId: modalComplete.id,
        data: {
          status: 'concluida',
          resolution: completeForm.resolution,
          cableUsedMeters: Number(completeForm.cableUsedMeters || 0),
          materialNotes: completeForm.materialNotes,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListServiceOrdersQueryKey({ serviceMode: mode || undefined }) });
          qc.invalidateQueries({ queryKey: getListClientsQueryKey({ serviceMode: mode || undefined }) });
          setModalComplete(null);
        },
      },
    );
  };

  // Filtered orders with search
  const filteredOrders = orders.filter((so) => {
    const client = clients.find((c) => c.id === so.clientId);
    const text = `${so.code} ${so.type} ${so.description} ${so.technician} ${client?.fullName || ''} ${
      client?.houseCode || ''
    } ${client?.address || ''}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });

  const pendingCount = orders.filter((o) => o.status === 'pendente' || o.status === 'em_curso').length;
  const completedCount = orders.filter((o) => o.status === 'concluida').length;
  const cutsCount = orders.filter((o) => o.type === 'corte').length;

  const typeLabels: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }> = {
    instalacao: { label: mode === 'fibra' ? 'Instalação FTTH' : 'Instalação TV', tone: 'good' },
    corte: { label: mode === 'fibra' ? 'Corte / Suspensão Fibra' : 'Corte de Sinal TV', tone: 'bad' },
    religacao: { label: 'Religação / Desbloqueio', tone: 'good' },
    avaria: { label: mode === 'fibra' ? 'Atenuação Óptica / LOS' : 'Avaria / Sinal RF Fraco', tone: 'warn' },
    derivacao: { label: mode === 'fibra' ? 'Ponto Extra Wi-Fi' : 'Derivação / Ponto TV Extra', tone: 'neutral' },
    manutencao: { label: mode === 'fibra' ? 'Fusão / Reparação Drop' : 'Manutenção de Rede Coaxial', tone: 'neutral' },
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={`Operações Técnicas · Modo ${meta.shortName}`}
        title={`Ordens de Serviço (${meta.shortName})`}
        detail={
          mode === 'fibra'
            ? 'Coordenação do piquete técnico de Fibra Óptica para instalações FTTH, atenuação de sinal óptico, trocas de ONU e fusões.'
            : mode === 'tv'
            ? 'Coordenação do piquete técnico de TV para instalações coaxiais, cortes no poste, religações e sinal RF.'
            : 'Coordenação do piquete de campo para instalações, cortes de sinal, religações e reparação de avarias.'
        }
        action={
          <Button
            onClick={() => {
              setNewForm({
                clientId: clients[0]?.id ? String(clients[0].id) : '',
                type: 'instalacao',
                priority: 'normal',
                technicianId: technicians[0]?.id ? String(technicians[0].id) : '',
                technician: technicians[0]?.name || (mode === 'fibra' ? 'Técnico de Fibra (Fusão & FTTH)' : 'Piquete Central TV (Mateus & João)'),
                scheduledDate: new Date().toISOString().slice(0, 10),
                description: '',
                cableUsedMeters: '0',
                materialNotes: '',
              });
              setModalNew(true);
            }}
          >
            <Plus size={16} /> Nova Ordem de Serviço
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Total de O.S.
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
              <Layers size={18} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold">{orders.length}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            Registos técnicos acumulados
          </small>
        </div>

        <div className="surface rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Pendentes / Na Rua
            </span>
            <div
              className={`grid h-8 w-8 place-items-center rounded-lg ${
                pendingCount > 0 ? 'bg-[#f7e9c9] text-[#946c22]' : 'bg-[#dceee5] text-[#237052]'
              }`}
            >
              <Clock size={18} />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-extrabold ${pendingCount > 0 ? 'text-[#946c22]' : ''}`}>
            {pendingCount}
          </p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            Aguardam execução pelo piquete
          </small>
        </div>

        <div className="surface rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Concluídas com Sucesso
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#dceee5] text-[#237052]">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[#237052]">{completedCount}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            Intervenções finalizadas
          </small>
        </div>

        <div className="surface rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Ordens de Corte
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#f8e1da] text-[#a24e3a]">
              <Zap size={18} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-[#a24e3a]">{cutsCount}</p>
          <small className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
            Desconexões por atraso
          </small>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="surface rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"
          />
          <Input
            placeholder="Pesquisar por nº O.S., cliente, morada, técnico…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-[hsl(var(--muted-foreground))]" />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="">Todos os estados</option>
            <option value="pendente">Pendente</option>
            <option value="em_curso">Em curso</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </Select>

          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full sm:w-44"
          >
            <option value="">Todos os tipos</option>
            <option value="instalacao">Nova Instalação</option>
            <option value="corte">Corte de Sinal</option>
            <option value="religacao">Religação</option>
            <option value="avaria">Avaria Técnica</option>
            <option value="derivacao">Derivação de TV</option>
            <option value="manutencao">Manutenção de Rede</option>
          </Select>
        </div>
      </div>

      {/* Service Orders Table */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[hsl(var(--secondary)/.5)] text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="p-4">Ordem / Tipo</th>
                <th className="p-4">Cliente & Localização</th>
                <th className="p-4">Piquete / Técnico</th>
                <th className="p-4">Agendamento</th>
                <th className="p-4">Prioridade</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    Nenhuma ordem de serviço encontrada.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((so) => {
                  const client = clients.find((c) => c.id === so.clientId);
                  const typeInfo = typeLabels[so.type] || { label: so.type, tone: 'neutral' };
                  return (
                    <tr key={so.id} className="hover:bg-[hsl(var(--secondary)/.3)] transition">
                      <td className="p-4">
                        <span className="font-mono font-extrabold text-[hsl(var(--primary))] block">
                          {so.code}
                        </span>
                        <div className="mt-1">
                          <Badge tone={typeInfo.tone}>{typeInfo.label}</Badge>
                        </div>
                        {so.description && (
                          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-xs truncate">
                            {so.description}
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        {client ? (
                          <Link
                            href={`/clientes/${client.id}`}
                            className="font-bold text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                          >
                            {client.fullName}
                          </Link>
                        ) : (
                          <b className="font-bold">Cliente #{so.clientId}</b>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          <MapPin size={12} />
                          <span>{client?.houseCode ? `Casa: ${client.houseCode} · ` : ''}{client?.address || '—'}</span>
                        </div>
                        {client?.phone && (
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                            <Phone size={12} />
                            <span>{client.phone}</span>
                            {client.pdoNumber && <span className="font-bold text-[hsl(var(--primary))]">({client.pdoNumber})</span>}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-xs">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Wrench size={13} className="text-[hsl(var(--primary))]" />
                          <span>{so.technician || 'Piquete de Turno'}</span>
                        </div>
                        <small className="text-[11px] text-[hsl(var(--muted-foreground))] block mt-0.5">
                          Criado por @{so.operator || 'deezy'}
                        </small>
                      </td>

                      <td className="p-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} className="text-[hsl(var(--muted-foreground))]" />
                          <span>{date(so.scheduledDate)}</span>
                        </div>
                        {so.completedAt && (
                          <small className="text-[10px] text-[#237052] block mt-0.5">
                            Concluída: {date(so.completedAt)}
                          </small>
                        )}
                      </td>

                      <td className="p-4">
                        <Badge
                          tone={
                            so.priority === 'imediata'
                              ? 'bad'
                              : so.priority === 'urgente'
                              ? 'warn'
                              : 'neutral'
                          }
                        >
                          {so.priority === 'imediata'
                            ? 'Imediata'
                            : so.priority === 'urgente'
                            ? 'Urgente'
                            : 'Normal'}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <Status value={so.status} />
                      </td>

                      <td className="p-4 text-right space-x-1 whitespace-nowrap">
                        {so.status !== 'concluida' && (
                          <button
                            title="Concluir Ordem de Serviço"
                            onClick={() => {
                              setModalComplete(so);
                              setCompleteForm({
                                resolution: 'Serviço executado com sucesso e sinal restabelecido.',
                                cableUsedMeters: String(so.cableUsedMeters || 0),
                                materialNotes: so.materialNotes || '',
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#dceee5] text-[#237052] px-2.5 py-1.5 text-xs font-bold hover:brightness-95 transition cursor-pointer"
                          >
                            <Check size={13} /> Concluir
                          </button>
                        )}

                        <button
                          title="Imprimir Guia de Intervenção Técnica para a equipa de campo"
                          onClick={() => setPrintOrder(so)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[hsl(var(--border))] px-2.5 py-1.5 text-xs font-bold hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
                        >
                          <Printer size={13} /> Guia
                        </button>

                        <button
                          title="Eliminar ordem"
                          onClick={() => {
                            if (confirm(`Eliminar Ordem de Serviço ${so.code}?`)) {
                              deleteOrder.mutate(
                                { orderId: so.id },
                                {
                                  onSuccess: () =>
                                    qc.invalidateQueries({ queryKey: getListServiceOrdersQueryKey() }),
                                },
                              );
                            }
                          }}
                          className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:text-red-600 hover:bg-[hsl(var(--secondary))] cursor-pointer"
                        >
                          <Trash2 size={15} />
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

      {/* Modal: Nova O.S. */}
      {modalNew && (
        <Modal
          title="Nova Ordem de Serviço (O.S.)"
          eyebrow="Piquete Técnico"
          onClose={() => setModalNew(false)}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Field label="Seleccionar Cliente *">
              <Select
                required
                value={newForm.clientId}
                onChange={(e) => setNewForm({ ...newForm, clientId: e.target.value })}
              >
                <option value="">-- Escolha o cliente --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.code} · {c.houseCode || c.neighborhood || c.address})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo de Intervenção *">
                <Select
                  value={newForm.type}
                  onChange={(e) => setNewForm({ ...newForm, type: e.target.value })}
                >
                  <option value="instalacao">Nova Instalação de Sinal</option>
                  <option value="corte">Corte por Inadimplência / Atraso</option>
                  <option value="religacao">Religação de Sinal (Pós-pagamento)</option>
                  <option value="avaria">Avaria Técnica / Falta de Sinal</option>
                  <option value="derivacao">Derivação / Ponto Extra de TV</option>
                  <option value="manutencao">Manutenção Preventiva de Rede</option>
                </Select>
              </Field>

              <Field label="Prioridade">
                <Select
                  value={newForm.priority}
                  onChange={(e) => setNewForm({ ...newForm, priority: e.target.value })}
                >
                  <option value="normal">Normal (até 48h)</option>
                  <option value="urgente">Urgente (hoje)</option>
                  <option value="imediata">Imediata (emergência)</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Técnico ou Piquete Designado *" hint="Receberá notificação imediata no app e sistema">
                <Select
                  value={newForm.technicianId}
                  onChange={(e) => {
                    const sel = technicians.find((t: any) => String(t.id) === e.target.value);
                    setNewForm({
                      ...newForm,
                      technicianId: e.target.value,
                      technician: sel?.name || e.target.value,
                    });
                  }}
                  required
                >
                  <option value="">Seleccione o técnico...</option>
                  {technicians.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.jobTitle || 'Técnico'} ({t.department || 'Operações'})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Data Agendada">
                <Input
                  type="date"
                  required
                  value={newForm.scheduledDate}
                  onChange={(e) => setNewForm({ ...newForm, scheduledDate: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Descrição da Intervenção / Instruções Técnicas">
              <Textarea
                required
                placeholder="Detalhes da intervenção, porta PDO a verificar, queixa do cliente…"
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalNew(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Emitir Ordem de Serviço
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Concluir O.S. */}
      {modalComplete && (
        <Modal
          title={`Concluir Ordem de Serviço: ${modalComplete.code}`}
          eyebrow="Relatório de Fecho Técnico"
          onClose={() => setModalComplete(null)}
        >
          <form onSubmit={handleComplete} className="space-y-4">
            <div className="p-3.5 rounded-lg bg-[hsl(var(--secondary)/.6)] border border-[hsl(var(--border))] text-sm">
              <p className="font-bold">Intervenção: {(modalComplete.type || 'intervenção').toUpperCase()}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {modalComplete.description}
              </p>
            </div>

            <Field label="Relatório de Resolução / Parecer do Técnico *">
              <Textarea
                required
                rows={3}
                placeholder="Ex.: Sinal medido em -18.2 dBm. Cabo drop substituído na porta 3 da PDO-04. Cliente assinou a folha de serviço."
                value={completeForm.resolution}
                onChange={(e) => setCompleteForm({ ...completeForm, resolution: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Metros de Cabo Gastos">
                <Input
                  type="number"
                  min="0"
                  value={completeForm.cableUsedMeters}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, cableUsedMeters: e.target.value })
                  }
                />
              </Field>

              <Field label="Outros Materiais Utilizados">
                <Input
                  placeholder="Ex.: 2 conectores SC/APC, 1 abraçadeira"
                  value={completeForm.materialNotes}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, materialNotes: e.target.value })
                  }
                />
              </Field>
            </div>

            {modalComplete.type === 'corte' && (
              <div className="p-3 rounded-lg bg-[#f8e1da] text-[#a24e3a] text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> Ao concluir esta O.S., o cliente será automaticamente alterado para SUSPENSO.
              </div>
            )}

            {(modalComplete.type === 'religacao' || modalComplete.type === 'instalacao') && (
              <div className="p-3 rounded-lg bg-[#dceee5] text-[#237052] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> Ao concluir esta O.S., o cliente será automaticamente activado no sistema.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[hsl(var(--border))]">
              <Button variant="outline" onClick={() => setModalComplete(null)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Fechar e Concluir O.S.
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal / Impressão de Guia Técnica Oficial de Campo */}
      {printOrder && (
        <Modal
          title={`Guia de Intervenção Técnica · ${printOrder.code}`}
          eyebrow="Documento de Campo"
          onClose={() => setPrintOrder(null)}
          maxWidth="max-w-3xl"
          printable={true}
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
              <a
                href={getPrintUrl('ordem-servico', { id: printOrder.id })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                title="Abre o documento numa nova aba sem restrição de iframe para imprimir ou guardar em PDF"
              >
                <ExternalLink size={14} />
                <span>Abrir em Nova Aba (PDF)</span>
              </a>
              <Button
                variant="primary"
                onClick={() => triggerPrint({ elementId: 'printable-service-order' })}
              >
                <Printer size={16} /> Imprimir Guia
              </Button>
              <Button variant="outline" onClick={() => setPrintOrder(null)}>
                Fechar
              </Button>
            </div>

            {/* Folha Oficial em Papel */}
            <div
              id="printable-service-order"
              className="p-8 border-2 border-[hsl(var(--border))] rounded-xl bg-white text-black space-y-6 print:border-none print:p-0 print:shadow-none"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <h2 className="text-2xl font-serif font-black tracking-tight text-blue-900">
                    {settings.companyName || 'OSDEL TECNOLOGIA'}
                  </h2>
                  <p className="text-xs uppercase font-bold tracking-widest text-slate-500">
                    {settings.companySubtitle || 'TV COMUNITÁRIA · INTERNET FIBRA ÓPTICA'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {settings.companyAddress || 'Luanda, Angola'} · Tel: {settings.companyPhone || '926 153 736'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-slate-100 rounded border font-mono font-black text-lg">
                    {printOrder.code}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Emissão: {dateTime(printOrder.createdAt)}
                  </p>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border text-xs">
                <div>
                  <span className="font-bold text-slate-500 block uppercase">Tipo de Intervenção:</span>
                  <b className="text-sm text-blue-900 uppercase">
                    {typeLabels[printOrder.type]?.label || printOrder.type}
                  </b>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block uppercase">Prioridade:</span>
                  <b className="text-sm uppercase text-slate-800">{printOrder.priority}</b>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block uppercase">Piquete / Técnico Designado:</span>
                  <b className="text-sm text-slate-800">{printOrder.technician || 'Piquete Central'}</b>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block uppercase">Data Prevista:</span>
                  <b className="text-sm text-slate-800">{date(printOrder.scheduledDate)}</b>
                </div>
              </div>

              {/* Client Info */}
              {(() => {
                const c = clients.find((client) => client.id === printOrder.clientId);
                return (
                  <div className="border p-4 rounded-lg space-y-2 text-xs">
                    <h4 className="font-bold uppercase tracking-wider text-slate-700 border-b pb-1">
                      Dados da Instalação / Cliente
                    </h4>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-500">Nome do Cliente:</span>
                        <b className="block text-sm text-slate-900">{c?.fullName || '—'}</b>
                      </div>
                      <div>
                        <span className="text-slate-500">Código de Cliente:</span>
                        <b className="block font-mono text-slate-900">{c?.code || '—'}</b>
                      </div>
                      <div>
                        <span className="text-slate-500">Telefones:</span>
                        <b className="block text-slate-900">
                          {c?.phone || '—'} {c?.alternatePhone ? ` / ${c.alternatePhone}` : ''}
                        </b>
                      </div>
                      <div>
                        <span className="text-slate-500">Nº da Casa / Ponto:</span>
                        <b className="block text-slate-900">{c?.houseCode || '—'}</b>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500">Endereço / Bairro:</span>
                        <b className="block text-slate-900">
                          {c?.address || '—'} {c?.neighborhood ? `(${c.neighborhood})` : ''}
                        </b>
                      </div>
                      <div>
                        <span className="text-slate-500">Caixa PDO:</span>
                        <b className="block text-blue-900 font-bold">{c?.pdoNumber || 'PDO-01'}</b>
                      </div>
                      <div>
                        <span className="text-slate-500">ONU / Equipamento:</span>
                        <b className="block font-mono text-slate-900">{c?.onuNumber || '—'}</b>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Instructions */}
              <div className="border p-4 rounded-lg space-y-1 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-slate-700">
                  Instruções & Descrição do Trabalho
                </h4>
                <p className="text-slate-800 leading-relaxed font-sans">{printOrder.description}</p>
              </div>

              {/* Field Notes for Technician to Fill by Hand */}
              <div className="border p-4 rounded-lg space-y-3 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-slate-700">
                  Registo do Técnico no Terreno (Preencher à mão)
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border-b pb-4">
                    <span className="text-slate-500 block">Sinal Óptico / RF Medido:</span>
                    <span className="text-slate-400">______ dBm</span>
                  </div>
                  <div className="border-b pb-4">
                    <span className="text-slate-500 block">Metros de Cabo Utilizados:</span>
                    <span className="text-slate-400">______ metros</span>
                  </div>
                  <div className="border-b pb-4">
                    <span className="text-slate-500 block">Hora Início / Fim:</span>
                    <span className="text-slate-400">___:___ às ___:___</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block">Materiais e Conectores Usados:</span>
                  <div className="h-10 border-b border-dashed border-slate-300" />
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-xs text-center">
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-800">Assinatura do Técnico / Piquete</b>
                  <span className="text-[10px] text-slate-500">Declaro o serviço conferido</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-800">Assinatura do Cliente / Recebedor</b>
                  <span className="text-[10px] text-slate-500">Conforme e testado na residência</span>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
