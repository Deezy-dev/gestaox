import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Users,
  Filter,
  Layers,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import {
  type ScheduleEvent,
  type PredefinedRoutineTemplate,
  PREDEFINED_ROUTINES,
  getStoredSchedule,
  saveSchedule,
  createScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
} from '@/lib/schedule-advanced';
import { useListUsers, useListClients, getAllStreetsFromSystem } from '@/lib/local-api';
import { Link } from 'wouter';
import { useMemo } from 'react';

export function SchedulePage() {
  const usersQuery = useListUsers();
  const clientsQuery = useListClients();
  const allUsers = usersQuery.data || [];
  const technicians = allUsers.filter((u: any) => u.active !== false);

  const availableStreets = useMemo(() => {
    const fromHelper = getAllStreetsFromSystem();
    const fromClients = (clientsQuery.data?.items || [])
      .map((c: any) => (c.street || c.neighborhood || c.address || '').trim())
      .filter((s: string) => s && s.length <= 40);
    return Array.from(new Set([...fromHelper, ...fromClients])).sort((a, b) => a.localeCompare(b));
  }, [clientsQuery.data]);

  const [events, setEvents] = useState<ScheduleEvent[]>(() => getStoredSchedule());
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10),
  );
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterTechnician, setFilterTechnician] = useState<string>('todos');
  const [search, setSearch] = useState<string>('');

  const [modalNewEvent, setModalNewEvent] = useState(false);
  const [modalRoutine, setModalRoutine] = useState<PredefinedRoutineTemplate | null>(null);

  // Form state for manual event
  const [form, setForm] = useState({
    title: '',
    type: 'piquete_corte' as ScheduleEvent['type'],
    date: selectedDate,
    startTime: '08:30',
    endTime: '12:00',
    leaderId: '',
    selectedTechIds: [] as number[],
    street: 'Rua 12 e Rua 13',
    pdoNumber: 'PDO-04',
    priority: 'alta' as ScheduleEvent['priority'],
    description: '',
    checklistText: 'Conferir lista de corte\nDesconectar drop do conector\nAssinalar concluído no app móvel',
  });

  // Listen to schedule updates
  useEffect(() => {
    const handleUpdate = () => {
      setEvents(getStoredSchedule());
    };
    window.addEventListener('osdel-schedule-updated', handleUpdate);
    return () => window.removeEventListener('osdel-schedule-updated', handleUpdate);
  }, []);

  const handleApplyRoutine = (routine: PredefinedRoutineTemplate) => {
    const defaultLeader = technicians.find((t: any) => t.jobTitle?.includes('Mestre') || t.name?.includes('Job')) || technicians[0];
    const techIds = technicians.slice(0, 3).map((t: any) => t.id);
    const techNames = technicians.slice(0, 3).map((t: any) => t.name);

    const newEvent = createScheduleEvent({
      title: routine.title,
      type: routine.type,
      date: selectedDate,
      startTime: routine.defaultStartTime,
      endTime: routine.defaultEndTime,
      priority: routine.priority,
      status: 'pendente',
      assignedTechnicianIds: techIds,
      assignedTechnicianNames: techNames,
      leaderId: defaultLeader?.id,
      leaderName: defaultLeader?.name || 'Mestre Job',
      street: 'Ruas Principais do Bairro Golf I',
      pdoNumber: 'Todas as Caixas da Rota',
      description: routine.description,
      checklist: routine.checklist.map((item, idx) => ({
        id: `ck-${idx}-${Date.now()}`,
        label: item,
        done: false,
      })),
      isPredefinedRoutine: true,
    });

    setEvents(getStoredSchedule());
    setModalRoutine(null);
    alert(`Rotina "${routine.title}" aplicada para o dia ${selectedDate}!`);
  };

  const handleCreateManualEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    const leaderObj = technicians.find((t: any) => t.id === Number(form.leaderId));
    const assignedTechs = technicians.filter((t: any) => form.selectedTechIds.includes(t.id));

    const checklistItems = form.checklistText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label, idx) => ({
        id: `ck-${Date.now()}-${idx}`,
        label,
        done: false,
      }));

    createScheduleEvent({
      title: form.title,
      type: form.type,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      priority: form.priority,
      status: 'pendente',
      leaderId: leaderObj?.id,
      leaderName: leaderObj?.name,
      assignedTechnicianIds: form.selectedTechIds,
      assignedTechnicianNames: assignedTechs.map((t: any) => t.name),
      street: form.street,
      pdoNumber: form.pdoNumber,
      description: form.description,
      checklist: checklistItems,
      isPredefinedRoutine: false,
    });

    setEvents(getStoredSchedule());
    setModalNewEvent(false);
    // Reset
    setForm({
      title: '',
      type: 'piquete_corte',
      date: selectedDate,
      startTime: '08:30',
      endTime: '12:00',
      leaderId: '',
      selectedTechIds: [],
      street: 'Rua 12 e Rua 13',
      pdoNumber: 'PDO-04',
      priority: 'alta',
      description: '',
      checklistText: 'Conferir lista de corte\nDesconectar drop do conector\nAssinalar concluído no app móvel',
    });
  };

  const handleToggleChecklist = (eventId: string, checkId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev || !ev.checklist) return;

    const updatedChecklist = ev.checklist.map((c) =>
      c.id === checkId ? { ...c, done: !c.done } : c,
    );
    const allDone = updatedChecklist.every((c) => c.done);
    const newStatus = allDone ? 'concluida' : 'em_curso';

    updateScheduleEvent(eventId, {
      checklist: updatedChecklist,
      status: newStatus,
    });
    setEvents(getStoredSchedule());
  };

  const handleStatusChange = (eventId: string, newStatus: ScheduleEvent['status']) => {
    updateScheduleEvent(eventId, { status: newStatus });
    setEvents(getStoredSchedule());
  };

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Deseja eliminar este agendamento da agenda operacional?')) {
      deleteScheduleEvent(eventId);
      setEvents(getStoredSchedule());
    }
  };

  // Filtered list
  const filteredEvents = events.filter((ev) => {
    const matchesDate = !selectedDate || ev.date === selectedDate;
    const matchesType = filterType === 'todos' || ev.type === filterType;
    const matchesTech =
      filterTechnician === 'todos' ||
      ev.assignedTechnicianIds?.includes(Number(filterTechnician)) ||
      ev.leaderId === Number(filterTechnician);
    const matchesSearch =
      !search ||
      `${ev.title} ${ev.street || ''} ${ev.pdoNumber || ''} ${ev.leaderName || ''}`
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesDate && matchesType && matchesTech && matchesSearch;
  });

  const getPriorityBadge = (priority: ScheduleEvent['priority']) => {
    switch (priority) {
      case 'urgente':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700">Urgente</span>;
      case 'alta':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Alta</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-100 text-slate-700">Normal</span>;
    }
  };

  const getStatusBadge = (status: ScheduleEvent['status']) => {
    switch (status) {
      case 'concluida':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={12} /> Concluída
          </span>
        );
      case 'em_curso':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <Clock size={12} className="animate-spin" /> Em Curso
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Planeamento Operacional & Escalas de Campo</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.5rem]">
            Agenda Operacional & Piquetes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            Gestão avançada de intervenções técnicas, rotinas pré-definidas da empresa e agendamento manual com designação de equipas e líder de missão.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/missoes"
            className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--primary))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.08)] shadow-sm"
          >
            <Users size={15} /> Missões de Corte por Rua
          </Link>
          <button
            onClick={() => setModalNewEvent(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110 shadow-sm"
          >
            <Plus size={15} /> Agendar Intervenção Manual
          </button>
        </div>
      </div>

      {/* Predefined Routines Strip */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-500" size={18} />
            <b className="text-sm text-slate-800">Rotinas Predefinidas da Empresa (1-Clique)</b>
          </div>
          <span className="text-xs text-slate-500">
            Adicione modelos operacionais testados à agenda de {selectedDate}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PREDEFINED_ROUTINES.map((routine) => (
            <div
              key={routine.id}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 transition hover:border-[hsl(var(--primary))] hover:bg-white hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {routine.defaultStartTime} - {routine.defaultEndTime}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-200 text-slate-700 uppercase">
                    {routine.suggestedDepartment}
                  </span>
                </div>
                <h2 className="text-xs font-extrabold text-slate-900 group-hover:text-[hsl(var(--primary))] leading-snug">
                  {routine.title}
                </h2>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                  {routine.description}
                </p>
              </div>

              <button
                onClick={() => handleApplyRoutine(routine)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-slate-200/80 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 transition hover:bg-[hsl(var(--primary))] hover:text-white"
              >
                Aplicar na Agenda <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-[hsl(var(--primary))]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-bold"
            />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className="h-9 rounded-lg border border-slate-200 bg-slate-100 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
            >
              Hoje
            </button>
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-semibold"
          >
            <option value="todos">Todos os Tipos</option>
            <option value="piquete_corte">Piquete de Corte</option>
            <option value="instalacao">Instalação Nova</option>
            <option value="vistoria">Vistoria de PDO</option>
            <option value="fusao_fibra">Fusão de Fibra</option>
            <option value="manutencao_noc">Manutenção NOC</option>
            <option value="reuniao">Reunião de Alinhamento</option>
          </select>

          {/* Technician Filter */}
          <select
            value={filterTechnician}
            onChange={(e) => setFilterTechnician(e.target.value)}
            className="h-9 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-semibold"
          >
            <option value="todos">Todos os Técnicos</option>
            {technicians.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.jobTitle || 'Técnico'})
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar rua, caixa, técnico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[hsl(var(--input))] pl-9 pr-3 text-xs"
          />
        </div>
      </div>

      {/* Events Display */}
      {filteredEvents.length === 0 ? (
        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-12 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <CalendarIcon size={24} />
          </div>
          <b className="text-slate-800 text-sm">Nenhum evento agendado para os filtros selecionados</b>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Utilize os botões de rotina pré-definida acima ou clique em "Agendar Intervenção Manual" para criar tarefas.
          </p>
          <button
            onClick={() => handleApplyRoutine(PREDEFINED_ROUTINES[1])}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-white shadow-sm"
          >
            <Sparkles size={14} /> Aplicar Piquete de Cortes de Hoje
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="surface rounded-2xl border border-[hsl(var(--border))] p-5 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header line */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-black text-[hsl(var(--primary))] flex items-center gap-1">
                        <Clock size={13} /> {ev.startTime} - {ev.endTime}
                      </span>
                      {getPriorityBadge(ev.priority)}
                      {ev.isPredefinedRoutine && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-700 font-bold">
                          Predefinida
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                      {ev.title}
                    </h3>
                  </div>
                  {getStatusBadge(ev.status)}
                </div>

                {/* Street & Location */}
                <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-xs text-slate-600 border border-slate-200/70">
                  {ev.street && (
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <MapPin size={13} className="text-red-500 shrink-0" />
                      <span>{ev.street}</span>
                    </div>
                  )}
                  {ev.pdoNumber && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Layers size={13} className="shrink-0" />
                      <span>Caixa de Distribuição: <b>{ev.pdoNumber}</b></span>
                    </div>
                  )}
                  {ev.leaderName && (
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                      <span>Líder do Piquete: <b>{ev.leaderName}</b></span>
                    </div>
                  )}
                  {ev.assignedTechnicianNames?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Users size={13} className="shrink-0" />
                      <span>Equipa: {ev.assignedTechnicianNames.join(', ')}</span>
                    </div>
                  )}
                </div>

                {ev.description && (
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{ev.description}"
                  </p>
                )}

                {/* Checklist */}
                {ev.checklist && ev.checklist.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Tarefas de Verificação ({ev.checklist.filter((c) => c.done).length}/{ev.checklist.length})
                    </span>
                    <div className="space-y-1">
                      {ev.checklist.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleToggleChecklist(ev.id, item.id)}
                          className="flex items-center gap-2 text-left w-full text-xs text-slate-700 hover:text-slate-900 transition"
                        >
                          {item.done ? (
                            <CheckSquare size={14} className="text-emerald-600 shrink-0" />
                          ) : (
                            <Square size={14} className="text-slate-400 shrink-0" />
                          )}
                          <span className={item.done ? 'line-through text-slate-400' : ''}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <select
                    value={ev.status}
                    onChange={(e) => handleStatusChange(ev.id, e.target.value as any)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_curso">Em Curso</option>
                    <option value="concluida">Concluída ✅</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Eliminar evento"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: MANUAL EVENT CREATION */}
      {modalNewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="eyebrow">Agendamento Manual</p>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Criar Nova Intervenção na Agenda
                </h2>
              </div>
              <button
                onClick={() => setModalNewEvent(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualEvent} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título da Intervenção *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex.: Piquete de Cortes: Rua 12 e 13"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Actividade</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold"
                  >
                    <option value="piquete_corte">Piquete de Corte</option>
                    <option value="instalacao">Instalação de Cliente</option>
                    <option value="vistoria">Vistoria de PDO / Caixas</option>
                    <option value="fusao_fibra">Fusão de Fibra Óptica</option>
                    <option value="manutencao_noc">Manutenção NOC / Central</option>
                    <option value="reuniao">Reunião de Alinhamento</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prioridade</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente (Sinal Caído)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora Início</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora Fim</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Rua Gravada no Sistema *</label>
                    <span className="text-[10px] text-blue-600 font-semibold">{availableStreets.length} ruas no sistema</span>
                  </div>
                  <select
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold bg-white"
                  >
                    <option value="">Seleccione uma rua cadastrada...</option>
                    {availableStreets.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                    <option value="custom">+ Outra Rua (Escrever abaixo)</option>
                  </select>
                  {(!availableStreets.includes(form.street) || form.street === 'custom') && (
                    <input
                      type="text"
                      value={form.street === 'custom' ? '' : form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      placeholder="Digitar nome da rua..."
                      className="w-full h-8 mt-1.5 rounded-lg border border-slate-300 px-2.5 text-xs bg-slate-50"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Caixa PDO / Armário</label>
                  <input
                    type="text"
                    value={form.pdoNumber}
                    onChange={(e) => setForm({ ...form, pdoNumber: e.target.value })}
                    placeholder="Ex.: PDO-04 e PDO-05"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Leader Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Líder do Piquete / Encarregado</label>
                <select
                  value={form.leaderId}
                  onChange={(e) => setForm({ ...form, leaderId: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold"
                >
                  <option value="">Seleccionar Líder da Equipa</option>
                  {technicians.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.jobTitle || 'Técnico'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-Technician selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Técnicos da Equipa de Campo</label>
                <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-2.5 max-h-32 overflow-y-auto">
                  {technicians.map((t: any) => {
                    const isChecked = form.selectedTechIds.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer text-[11px] p-1 rounded hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm({ ...form, selectedTechIds: [...form.selectedTechIds, t.id] });
                            } else {
                              setForm({ ...form, selectedTechIds: form.selectedTechIds.filter((id) => id !== t.id) });
                            }
                          }}
                        />
                        <span>{t.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tarefas de Checklist (1 por linha)</label>
                <textarea
                  rows={3}
                  value={form.checklistText}
                  onChange={(e) => setForm({ ...form, checklistText: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalNewEvent(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-xs font-bold text-white hover:brightness-110"
                >
                  Guardar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
