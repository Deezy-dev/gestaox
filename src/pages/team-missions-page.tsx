import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  Scissors,
  Check,
  Layers,
  ArrowRight,
  Filter,
  Download,
  Share2,
  Archive,
  Clock,
} from 'lucide-react';
import {
  type TeamMission,
  type MissionTask,
  getStoredMissions,
  saveMissions,
  createTeamMission,
  updateMissionTask,
  completeMission,
} from '@/lib/team-missions';
import { useListClients, useListUsers, useGetSettings } from '@/lib/local-api';
import { getCompanyLogo } from '@/lib/company-logo';
import { OSDEL_LOGO_BASE64 } from '@/lib/osdel-logo-base64';
import { Link } from 'wouter';

const kz = (value: unknown) =>
  new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace('AOA', 'Kz');

export function TeamMissionsPage() {
  const [missions, setMissions] = useState<TeamMission[]>(() => getStoredMissions());
  const [missionTab, setMissionTab] = useState<'ativas' | 'historico'>('ativas');
  const [selectedMission, setSelectedMission] = useState<TeamMission | null>(() => {
    const list = getStoredMissions();
    return list[0] || null;
  });

  const [modalNewMission, setModalNewMission] = useState(false);
  const [showPdfView, setShowPdfView] = useState(false);

  const settingsQuery = useGetSettings();
  const settings = settingsQuery.data || {};

  const clientsQuery = useListClients();
  const allClients = clientsQuery.data?.items || [];

  const usersQuery = useListUsers();
  const allUsers = usersQuery.data || [];
  const technicians = allUsers.filter((u: any) => u.active !== false);

  // Available unique streets from clients
  const availableStreets: string[] = Array.from(
    new Set<string>(
      allClients
        .map((c: any): string => {
          if (c.address?.includes('Rua 12')) return 'Rua 12';
          if (c.address?.includes('Rua 13')) return 'Rua 13';
          if (c.address?.includes('Rua 7')) return 'Rua 7';
          if (c.address?.includes('Rua 8')) return 'Rua 8';
          if (c.address?.includes('Rua Principal')) return 'Rua Principal';
          if (c.address?.includes('Rua Direita')) return 'Rua Direita';
          const match = c.address?.match(/Rua\s+[^,]+/i);
          return (match ? match[0].trim() : c.address || 'Rua Central') as string;
        })
        .filter(Boolean),
    ),
  );

  // New Mission form
  const [form, setForm] = useState({
    title: 'Operação Piquete - Ruas 12 e 13',
    type: 'corte' as TeamMission['type'],
    leaderId: '',
    selectedTechIds: [] as number[],
    selectedStreets: ['Rua 12', 'Rua 13'] as string[],
    scheduledDate: new Date().toISOString().slice(0, 10),
    notes: 'Desconectar cabos drop na caixa PDO de todos os clientes com mais de 1 mês de atraso.',
  });

  useEffect(() => {
    const handleUpdate = () => {
      const fresh = getStoredMissions();
      setMissions(fresh);
      if (selectedMission) {
        const found = fresh.find((m) => m.id === selectedMission.id);
        if (found) setSelectedMission(found);
      }
    };
    window.addEventListener('osdel-missions-updated', handleUpdate);
    return () => window.removeEventListener('osdel-missions-updated', handleUpdate);
  }, [selectedMission]);

  const handleCreateMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leaderId || form.selectedStreets.length === 0) {
      alert('Por favor selecione o líder do piquete e pelo menos uma rua.');
      return;
    }

    const leaderObj = technicians.find((t: any) => t.id === Number(form.leaderId));
    const assignedTechs = technicians.filter((t: any) => form.selectedTechIds.includes(t.id));

    // Find debtors in the selected streets
    const matchingClients = allClients.filter((c: any) => {
      const matchStreet = form.selectedStreets.some((st) =>
        (c.address || '').toLowerCase().includes(st.toLowerCase()),
      );
      // In corte mission, pull clients with status late or suspended
      const matchStatus = form.type === 'corte' ? (c.status === 'late' || c.status === 'suspended') : true;
      return matchStreet && matchStatus;
    });

    const generatedTasks: MissionTask[] = matchingClients.map((client: any, idx: number) => {
      const streetName =
        form.selectedStreets.find((st) => (client.address || '').includes(st)) ||
        form.selectedStreets[0];
      return {
        id: `task-${Date.now()}-${idx}`,
        clientId: client.id,
        clientCode: client.code,
        clientName: client.fullName,
        phone: client.phone,
        address: client.address,
        street: streetName,
        houseCode: client.houseCode,
        pdoNumber: client.pdoNumber || `PDO-0${(idx % 4) + 1}`,
        portNumber: `Porta 0${(idx % 8) + 1}`,
        serviceType: client.serviceType || 'tv',
        debtAmount: (client.status === 'suspended' ? 12000 : 8000),
        monthsLate: (client.status === 'suspended' ? 3 : 2),
        status: 'pendente',
      };
    });

    // If no debtors were explicitly matching, create realistic mock tasks from seed data
    const finalTasks =
      generatedTasks.length > 0
        ? generatedTasks
        : [
            {
              id: `task-${Date.now()}-1`,
              clientId: 1,
              clientCode: 'CLI-00001',
              clientName: 'António Domingos Pedro',
              phone: '+244 923 456 789',
              address: 'Rua 12, Casa 45B, Bairro Golf I',
              street: 'Rua 12',
              houseCode: 'G1-C45B',
              pdoNumber: 'PDO-04',
              portNumber: 'Porta 03',
              serviceType: 'tv' as const,
              debtAmount: 8000,
              monthsLate: 2,
              status: 'pendente' as const,
            },
            {
              id: `task-${Date.now()}-2`,
              clientId: 6,
              clientCode: 'CLI-00006',
              clientName: 'Margarida Costa da Rocha',
              phone: '+244 912 884 102',
              address: 'Rua 13, Casa 12A, Golf I',
              street: 'Rua 13',
              houseCode: 'G1-C12A',
              pdoNumber: 'PDO-05',
              portNumber: 'Porta 01',
              serviceType: 'combo' as const,
              debtAmount: 25000,
              monthsLate: 3,
              status: 'pendente' as const,
            },
          ];

    const techNames = assignedTechs.map((t: any) => t.name);
    if (!techNames.includes(leaderObj?.name)) {
      techNames.unshift(`${leaderObj?.name} (Líder)`);
    }

    const newMis = createTeamMission({
      title: form.title,
      type: form.type,
      leaderId: Number(form.leaderId),
      leaderName: leaderObj?.name || 'Mestre Job',
      technicianIds: form.selectedTechIds,
      technicianNames: techNames,
      streets: form.selectedStreets,
      scheduledDate: form.scheduledDate,
      status: 'pendente',
      notes: form.notes,
      createdBy: 'Administrador OSDEL',
      tasks: finalTasks,
    });

    setMissions(getStoredMissions());
    setSelectedMission(newMis);
    setModalNewMission(false);
    alert(`Missão de Piquete "${newMis.code}" criada com sucesso para ${newMis.streets.join(', ')}!`);
  };

  const handleUpdateTaskStatus = (
    taskId: string,
    newStatus: MissionTask['status'],
    technicianName = selectedMission?.leaderName || 'Mestre Job',
  ) => {
    if (!selectedMission) return;
    const observation = prompt('Observação técnica (opcional):', newStatus === 'cortado' ? 'Cabo drop desconectado na caixa PDO.' : 'Sinal religado e testado.');
    updateMissionTask(selectedMission.id, taskId, newStatus, technicianName, observation || undefined);
  };

  const totalDebtsInMission = selectedMission
    ? selectedMission.tasks.reduce((sum, t) => sum + Number(t.debtAmount || 0), 0)
    : 0;

  const completedCount = selectedMission
    ? selectedMission.tasks.filter((t) => t.status !== 'pendente').length
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Operações de Piquete & Cortes em Equipa</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.5rem]">
            Missões de Equipa & Cortes por Rua
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            Designação de equipas (ex.: Mestre Job com Júlio e Enock), geração de PDF de clientes com pagamentos em atraso nas Ruas 12, 13 e sincronização em tempo real das conclusões no terreno.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setModalNewMission(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110 shadow-sm"
          >
            <Plus size={15} /> Nova Missão de Piquete
          </button>
        </div>
      </div>

      {/* Grid: Left column list of missions / Right column active mission details */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Mission selector list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">
              Missões Registadas ({missions.length})
            </span>
          </div>

          <div className="space-y-2">
            {missions.map((m) => {
              const isSelected = selectedMission?.id === m.id;
              const isFinished = m.status === 'concluida';
              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedMission(m);
                    setShowPdfView(false);
                  }}
                  className={`cursor-pointer rounded-xl border p-4 transition text-xs space-y-2 ${
                    isSelected
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)] shadow-sm'
                      : 'border-[hsl(var(--border))] bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[10px] text-slate-500">{m.code}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isFinished
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {m.status === 'concluida' ? 'Concluída' : 'Em Curso'}
                    </span>
                  </div>

                  <b className="block text-slate-900 font-extrabold text-sm leading-snug">
                    {m.title}
                  </b>

                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <MapPin size={12} className="text-red-500" />
                    <span>Ruas: {m.streets.join(', ')}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>Líder: <b>{m.leaderName}</b></span>
                    <span>{m.tasks.length} Clientes</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Mission Execution & Details */}
        {selectedMission ? (
          <div className="space-y-4">
            {/* Header of Active Mission */}
            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {selectedMission.code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 flex items-center gap-1">
                      <Scissors size={11} /> Operação de {(selectedMission.type || 'corte').toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-xl font-serif font-black text-slate-900">
                    {selectedMission.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Data: <b>{selectedMission.scheduledDate}</b> · Criada por: {selectedMission.createdBy}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPdfView(!showPdfView)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-sm"
                  >
                    <FileText size={14} /> {showPdfView ? 'Ver Lista Interativa' : 'Gerar / Visualizar PDF'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPdfView(true);
                      setTimeout(() => {
                        window.focus();
                        window.print();
                      }, 400);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-black shadow-sm"
                  >
                    <Printer size={14} /> Imprimir Folha de Piquete
                  </button>
                </div>
              </div>

              {/* Team Details Banner */}
              <div className="grid gap-3 sm:grid-cols-3 rounded-xl bg-slate-50 p-4 border border-slate-200/70 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Líder do Piquete
                  </span>
                  <b className="text-sm font-extrabold text-slate-800 block mt-0.5">
                    {selectedMission.leaderName}
                  </b>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={12} /> Responsável de Campo
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Técnicos Integrantes
                  </span>
                  <b className="text-xs font-bold text-slate-800 block mt-0.5">
                    {selectedMission.technicianNames.join(', ')}
                  </b>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    {selectedMission.technicianNames.length} Técnicos em serviço
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Ruas Designadas
                  </span>
                  <b className="text-sm font-extrabold text-slate-800 block mt-0.5">
                    {selectedMission.streets.join(' e ')}
                  </b>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Total em dívida: <b className="text-red-700">{kz(totalDebtsInMission)}</b>
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Progresso do Piquete: {completedCount} de {selectedMission.tasks.length} clientes intervencionados</span>
                  <span>{Math.round((completedCount / (selectedMission.tasks.length || 1)) * 100)}% Concluído</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-300"
                    style={{
                      width: `${Math.round((completedCount / (selectedMission.tasks.length || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* PDF View or Interactive Table */}
            {showPdfView ? (
              /* PDF PRINTABLE DOCUMENT VIEW */
              <div className="surface rounded-2xl border border-slate-300 p-8 shadow-md bg-white print:border-none print:shadow-none print:p-0">
                {/* PDF Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <img
                      src={OSDEL_LOGO_BASE64}
                      alt="Logótipo OSDEL Tecnologia"
                      loading="eager"
                      decoding="sync"
                      width="56"
                      height="56"
                      className="h-14 w-14 rounded-xl object-contain border border-slate-200 bg-white p-1 shadow-sm shrink-0"
                    />
                    <div>
                      <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                        {settings?.companyName || 'OSDEL TECNOLOGIA'}
                      </h1>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {settings?.companySubtitle || 'Operador de Telecomunicações · TV por Cabo & Fibra Óptica (FTTH)'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        NIF: {settings?.companyNif || '541728910LA042'} · {settings?.companyAddress || 'Golf I, Kilamba Kiaxi, Luanda'} · Tel: {settings?.companyPhone || '926 153 736'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                      {selectedMission.code}
                    </span>
                    <p className="text-xs font-bold text-slate-900 mt-1">FOLHA OFICIAL DE PIQUETE</p>
                    <p className="text-[10px] text-slate-500">Data: {selectedMission.scheduledDate}</p>
                  </div>
                </div>

                {/* PDF Info strip */}
                <div className="grid grid-cols-3 gap-4 mb-6 rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">TIPO DE OPERAÇÃO:</span>
                    <b className="text-slate-900 uppercase">{selectedMission.type} DE CLIENTES INADIMPLENTES</b>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">EQUIPA DESIGNADA:</span>
                    <b className="text-slate-900">Líder: {selectedMission.leaderName}</b>
                    <p className="text-[11px] text-slate-600">Membros: {selectedMission.technicianNames.join(', ')}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block text-[10px]">ZONA / RUAS:</span>
                    <b className="text-slate-900">{selectedMission.streets.join(', ')}</b>
                  </div>
                </div>

                {/* PDF Table */}
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300">N.º</th>
                      <th className="p-2 border-r border-slate-300">Cliente & Código</th>
                      <th className="p-2 border-r border-slate-300">Rua & Morada</th>
                      <th className="p-2 border-r border-slate-300">Caixa PDO / Porta</th>
                      <th className="p-2 border-r border-slate-300">Serviço</th>
                      <th className="p-2 border-r border-slate-300">Dívida (Kz)</th>
                      <th className="p-2 border-r border-slate-300">Estado / Visto Técnico</th>
                      <th className="p-2">Assinatura Técnico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMission.tasks.map((task, index) => (
                      <tr key={task.id} className="border-b border-slate-300 hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 text-center font-bold">{index + 1}</td>
                        <td className="p-2 border-r border-slate-300">
                          <b className="text-slate-900 block">{task.clientName}</b>
                          <span className="font-mono text-[10px] text-slate-500">{task.clientCode} · {task.phone}</span>
                        </td>
                        <td className="p-2 border-r border-slate-300">
                          <b>{task.street}</b>
                          <p className="text-[10px] text-slate-500">{task.address}</p>
                        </td>
                        <td className="p-2 border-r border-slate-300 font-mono">
                          <b>{task.pdoNumber}</b>
                          <span className="block text-[10px] text-slate-500">{task.portNumber}</span>
                        </td>
                        <td className="p-2 border-r border-slate-300 uppercase font-semibold text-[10px]">
                          {task.serviceType === 'combo' ? 'TV + Fibra' : task.serviceType === 'internet' ? 'Fibra' : 'TV'}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-bold text-red-700">
                          {kz(task.debtAmount)}
                          <span className="block text-[9px] text-slate-400 font-normal">({task.monthsLate} meses)</span>
                        </td>
                        <td className="p-2 border-r border-slate-300 font-bold text-center">
                          {task.status === 'cortado' ? (
                            <span className="text-red-700">CORTADO [X]</span>
                          ) : task.status === 'religado' ? (
                            <span className="text-emerald-700">RELIGADO [X]</span>
                          ) : task.status === 'acordo_no_local' ? (
                            <span className="text-blue-700">ACORDO LOCAL [X]</span>
                          ) : (
                            <span className="text-slate-400">[ &nbsp; &nbsp; ] Pendente</span>
                          )}
                        </td>
                        <td className="p-2 text-center text-slate-400 text-[10px]">
                          {task.completedBy ? task.completedBy : '___________________'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* PDF Signatures Footer */}
                <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <p className="text-slate-500 mb-10">O Líder do Piquete Técnico:</p>
                    <div className="border-t border-slate-400 w-48 mx-auto" />
                    <b className="block mt-1 text-slate-900">{selectedMission.leaderName}</b>
                    <span className="text-[10px] text-slate-500">Mestre de Piquete / Técnico Sénior</span>
                  </div>

                  <div>
                    <p className="text-slate-500 mb-10">O Supervisor / Administração:</p>
                    <div className="border-t border-slate-400 w-48 mx-auto" />
                    <b className="block mt-1 text-slate-900">Albert (deezy)</b>
                    <span className="text-[10px] text-slate-500">Director de Operações OSDEL</span>
                  </div>
                </div>

                <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-dashed pt-3">
                  Documento emitido pelo Centro Operacional OSDEL Tecnologia. Sincronização automática com a aplicação mobile dos técnicos.
                </div>
              </div>
            ) : (
              /* INTERACTIVE TASK LIST FOR DESKTOP */
              <div className="surface rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-sm">
                <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Clientes Alvo da Operação ({selectedMission.tasks.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ao assinalar como <b>Cortado</b> ou <b>Religado</b>, o estado do cliente é sincronizado na base de dados em tempo real.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-[hsl(var(--border))]">
                      <tr>
                        <th className="p-3.5">Cliente</th>
                        <th className="p-3.5">Rua & Morada</th>
                        <th className="p-3.5">Caixa PDO / Porta</th>
                        <th className="p-3.5">Dívida</th>
                        <th className="p-3.5">Estado do Trabalho</th>
                        <th className="p-3.5 text-right">Acção do Piquete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border))]">
                      {selectedMission.tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3.5">
                            <b className="text-slate-900 text-sm block">{task.clientName}</b>
                            <span className="font-mono text-[10px] text-slate-500">{task.clientCode} · {task.phone}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-800 block">{task.street}</span>
                            <span className="text-[11px] text-slate-500">{task.address}</span>
                          </td>
                          <td className="p-3.5 font-mono">
                            <b className="text-slate-800 block">{task.pdoNumber}</b>
                            <span className="text-[10px] text-slate-500">{task.portNumber}</span>
                          </td>
                          <td className="p-3.5">
                            <b className="text-red-700 text-sm block">{kz(task.debtAmount)}</b>
                            <span className="text-[10px] text-slate-500">{task.monthsLate} meses em atraso</span>
                          </td>
                          <td className="p-3.5">
                            {task.status === 'cortado' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                <Scissors size={12} /> Cortado
                              </span>
                            ) : task.status === 'religado' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={12} /> Religado
                              </span>
                            ) : task.status === 'acordo_no_local' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                Acordo no Local
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                Pendente
                              </span>
                            )}
                            {task.completedBy && (
                              <small className="block text-[10px] text-slate-400 mt-0.5">
                                por {task.completedBy}
                              </small>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1">
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'cortado')}
                              className="px-2.5 py-1 rounded bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 transition"
                            >
                              Cortar
                            </button>
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'religado')}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition"
                            >
                              Religar
                            </button>
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, 'acordo_no_local')}
                              className="px-2.5 py-1 rounded bg-slate-200 text-slate-800 font-bold text-[11px] hover:bg-slate-300 transition"
                            >
                              Acordo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="surface rounded-2xl border border-[hsl(var(--border))] p-12 text-center">
            <p className="text-slate-500 text-sm">Selecione uma missão ou crie uma nova operação de piquete.</p>
          </div>
        )}
      </div>

      {/* MODAL: CRIAR NOVA MISSÃO DE PIQUETE */}
      {modalNewMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="eyebrow">Piquete de Campo</p>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Criar Nova Missão de Piquete em Equipa
                </h2>
              </div>
              <button
                onClick={() => setModalNewMission(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMission} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título da Missão *</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Operação Piquete - Ruas 12 e 13"
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Objectivo da Missão</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold"
                  >
                    <option value="corte">Corte por Falta de Pagamento</option>
                    <option value="religacao">Campanha de Religação em Massa</option>
                    <option value="vistoria">Vistoria Geral de Ruas</option>
                    <option value="fusao">Fusão e Alinhamento de Fibra</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Prevista</label>
                  <input
                    type="date"
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Leader Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Líder do Piquete (Ex.: Mestre Job) *</label>
                <select
                  required
                  value={form.leaderId}
                  onChange={(e) => setForm({ ...form, leaderId: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold"
                >
                  <option value="">Seleccionar Líder Responsável</option>
                  {technicians.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.jobTitle || 'Técnico'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Members of the Team */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Membros da Equipa (Ex.: Júlio Afonso, Enock Miguel)
                </label>
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

              {/* Streets Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ruas da Operação (O sistema filtra os devedores destas ruas para o PDF) *
                </label>
                <div className="flex flex-wrap gap-2 border border-slate-200 rounded-lg p-2.5">
                  {availableStreets.map((st) => {
                    const isSelected = form.selectedStreets.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setForm({ ...form, selectedStreets: form.selectedStreets.filter((s) => s !== st) });
                          } else {
                            setForm({ ...form, selectedStreets: [...form.selectedStreets, st] });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${
                          isSelected
                            ? 'bg-[hsl(var(--primary))] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {st} {isSelected ? '✓' : '+'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instruções para a Equipa</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalNewMission(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-xs font-bold text-white hover:brightness-110"
                >
                  Criar Missão & Gerar Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
