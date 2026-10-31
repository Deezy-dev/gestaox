import { useState, useEffect, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Calendar,
  Check,
  Clock,
  DollarSign,
  IdCard,
  MapPin,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  Edit,
  Building2,
  FileBadge,
  Sparkles,
  Smartphone,
  Landmark,
  CreditCard,
  TrendingDown,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  Receipt,
  PiggyBank,
  Wallet,
  Coins,
  Ban,
} from 'lucide-react';
import {
  getListUsersQueryKey,
  getListJobRolesQueryKey,
  useListUsers,
  useListJobRoles,
  useCreateUser,
  useUpdateUser,
  useUpdateUserWorkStatus,
  useAssignTaskToUserSchedule,
  useDeleteUser,
  useCreateJobRole,
  useDeleteJobRole,
  session,
  type JobRole,
} from '@/lib/local-api';
import { isSuperAdmin } from '@/lib/permissions';
import { Button, Field, Input, Select, Textarea, Badge, Modal, PageHeader, kz, date } from '@/components/shared-ui';
import { ProfilePhotoUploader, AvatarWithQuickUpload } from '@/components/profile-photo-uploader';
import { BankAccountsManager } from '@/components/bank-accounts-manager';
import { ANGOLAN_BANKS, getBankByIban, formatAngolanIban, type BankAccountRecord } from '@/lib/banking';
import {
  type TechnicianLoan,
  type LoanRepaymentRecord,
  getTechnicianLoans,
  getCompanyLoanStats,
  reviewTechnicianLoan,
  registerLoanRepayment,
  applyMonthlyPayrollDeductions,
  createDirectLoanByAdmin,
  getTechnicianActiveDebt,
} from '@/lib/technician-loans';

export function TeamManagement() {
  const qc = useQueryClient();
  const currentUser = session();
  const isSuper = isSuperAdmin(currentUser);
  const isAdmin = isSuper || currentUser?.role === 'admin';

  const [tab, setTab] = useState<'colaboradores' | 'agenda' | 'cargos' | 'folha' | 'adiantamentos'>('colaboradores');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('todos');

  // Modals
  const [modalNewMember, setModalNewMember] = useState(false);
  const [modalNewRole, setModalNewRole] = useState(false);
  const [modalAssignTask, setModalAssignTask] = useState<any>(null);
  const [modalViewMember, setModalViewMember] = useState<any>(null);
  const [modalEditMember, setModalEditMember] = useState<any>(null);

  // Loans & Debt Management State
  const [loans, setLoans] = useState<TechnicianLoan[]>(() => getTechnicianLoans());
  const [loanStats, setLoanStats] = useState(() => getCompanyLoanStats());
  const [loanStatusFilter, setLoanStatusFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'liquidado' | 'rejeitado'>('todos');
  const [modalDirectLoan, setModalDirectLoan] = useState(false);
  const [modalRepayLoan, setModalRepayLoan] = useState<TechnicianLoan | null>(null);
  const [modalLoanHistory, setModalLoanHistory] = useState<TechnicianLoan | null>(null);

  const [directLoanForm, setDirectLoanForm] = useState({
    technicianId: '',
    amount: '50000',
    purpose: 'Adiantamento Solicitado Presencialmente no Escritório',
    installments: 1,
    receiptMethod: 'numerario' as 'iban' | 'multicaixa_express' | 'numerario',
    targetBank: 'Banco BAI',
    targetIban: '',
    expressPhone: '',
    notes: 'Concedido directamente pela Administração Financeira.',
  });

  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    paymentMethod: 'folha_salarial' as 'folha_salarial' | 'transferencia' | 'multicaixa_express' | 'numerario',
    receiptReference: '',
    notes: 'Amortização processada na tesouraria.',
  });

  // Queries & mutations
  const usersQuery = useListUsers();
  const rolesQuery = useListJobRoles();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateWorkStatus = useUpdateUserWorkStatus();
  const assignTask = useAssignTaskToUserSchedule();
  const deleteUser = useDeleteUser();
  const createJobRole = useCreateJobRole();
  const deleteJobRole = useDeleteJobRole();

  const users: any[] = (Array.isArray(usersQuery.data) ? usersQuery.data : usersQuery.data?.items) || [];
  const jobRoles: JobRole[] = (Array.isArray(rolesQuery.data) ? rolesQuery.data : rolesQuery.data?.items) || [];

  // Form states for New Member
  const [memberForm, setMemberForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'operador',
    jobRoleId: '',
    jobTitle: '',
    department: 'Técnico',
    photoUrl: '',
    biNumber: '',
    age: '28',
    birthDate: '1996-01-01',
    gender: 'Masculino',
    phone: '',
    whatsapp: '',
    emergencyContact: '',
    email: '',
    address: 'Golf I, Luanda',
    salaryBase: '150000',
    foodAllowance: '30000',
    transportAllowance: '25000',
    bankIban: '',
    admissionDate: new Date().toISOString().slice(0, 10),
    contractType: 'Efectivo',
    workStatus: 'disponivel',
    currentTask: '',
  });

  // Form states for New Role
  const [roleForm, setRoleForm] = useState({
    title: '',
    department: 'Técnico',
    permissionLevel: 'operador',
    baseSalaryMin: '120000',
    baseSalaryMax: '200000',
    description: '',
  });

  // Form states for Assign Task
  const [taskForm, setTaskForm] = useState({
    time: '09:00 - 11:30',
    title: '',
    clientName: '',
    location: 'Golf I, Rua 12',
    priority: 'normal',
    status: 'pendente',
  });

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesDept = departmentFilter === 'todos' || u.department === departmentFilter;
    const text = `${u.name} ${u.username} ${u.jobTitle || ''} ${u.biNumber || ''} ${u.phone || ''} ${u.department || ''}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    return matchesDept && matchesSearch && u.active !== false;
  });

  // Payroll metrics
  const totalSalaries = users.filter(u => u.active !== false).reduce((sum, u) => sum + Number(u.salaryBase || 0), 0);
  const totalAllowances = users.filter(u => u.active !== false).reduce(
    (sum, u) => sum + Number(u.foodAllowance || 0) + Number(u.transportAllowance || 0),
    0,
  );
  const grandTotalPayroll = totalSalaries + totalAllowances;

  // Real-time synchronization of technician loans and debt calculations
  useEffect(() => {
    const handleLoansUpdated = () => {
      setLoans(getTechnicianLoans());
      setLoanStats(getCompanyLoanStats());
    };
    window.addEventListener('osdel-loans-updated', handleLoansUpdated);
    return () => window.removeEventListener('osdel-loans-updated', handleLoansUpdated);
  }, []);

  // Total deductions planned for current active staff in monthly payroll
  const totalMonthlyLoanDeductions = users
    .filter((u) => u.active !== false)
    .reduce((sum, u) => sum + getTechnicianActiveDebt(u.id).monthlyDeduction, 0);

  const netPayrollAfterLoanDeductions = Math.max(0, grandTotalPayroll - totalMonthlyLoanDeductions);

  // Administrative loan handlers
  const handleReviewLoan = (loanId: string, decision: 'aprovado' | 'rejeitado') => {
    const notes = prompt(
      decision === 'aprovado'
        ? 'Observações de aprovação (opcional):'
        : 'Motivo do indeferimento:',
      decision === 'aprovado' ? 'Aprovado pela Administração Geral.' : 'Capacidade de amortização incompatível com o vencimento.'
    );
    if (notes !== null) {
      reviewTechnicianLoan(loanId, decision, currentUser?.name || 'Administrador OSDEL', notes);
      setLoans(getTechnicianLoans());
      setLoanStats(getCompanyLoanStats());
      alert(decision === 'aprovado' ? 'Adiantamento APROVADO! O técnico já pode visualizar o saldo disponível no APK.' : 'Adiantamento indeferido.');
    }
  };

  const handleApplyMonthlyPayrollDeductions = () => {
    if (!confirm('Deseja processar os descontos das parcelas de adiantamento na folha de pagamento deste mês para todos os colaboradores com dívida activa?')) {
      return;
    }
    const result = applyMonthlyPayrollDeductions(currentUser?.name || 'Administrador OSDEL');
    setLoans(getTechnicianLoans());
    setLoanStats(getCompanyLoanStats());
    alert(`Processamento de folha concluído com sucesso!\n\n• Colaboradores deduzidos: ${result.deductionsCount}\n• Total amortizado nesta folha: ${kz(result.totalDeducted)}\n\nOs saldos devedores foram actualizados no sistema central e nos telemóveis dos colaboradores.`);
  };

  const handleCreateDirectLoan = (e: FormEvent) => {
    e.preventDefault();
    const tech = users.find((u) => String(u.id) === String(directLoanForm.technicianId));
    if (!tech) {
      alert('Por favor seleccione um colaborador.');
      return;
    }
    const val = Number(directLoanForm.amount);
    if (isNaN(val) || val <= 0) {
      alert('Valor de adiantamento inválido.');
      return;
    }

    createDirectLoanByAdmin({
      technicianId: tech.id,
      technicianName: tech.name,
      department: tech.department || 'Técnico',
      amount: val,
      purpose: directLoanForm.purpose,
      installments: Number(directLoanForm.installments) || 1,
      adminName: currentUser?.name || 'Administrador OSDEL',
      notes: directLoanForm.notes,
      receiptMethod: directLoanForm.receiptMethod,
      targetBank: directLoanForm.targetBank,
      targetIban: directLoanForm.targetIban || tech.bankIban || '—',
      expressPhone: directLoanForm.expressPhone || tech.phone || undefined,
    });

    setLoans(getTechnicianLoans());
    setLoanStats(getCompanyLoanStats());
    setModalDirectLoan(false);
    setDirectLoanForm({
      technicianId: '',
      amount: '50000',
      purpose: 'Adiantamento Solicitado Presencialmente no Escritório',
      installments: 1,
      receiptMethod: 'numerario',
      targetBank: 'Banco BAI',
      targetIban: '',
      expressPhone: '',
      notes: 'Concedido directamente pela Administração Financeira.',
    });
    alert(`Adiantamento de ${kz(val)} concedido com sucesso a ${tech.name}! A dívida já foi lançada e aparecerá sincronizada no APK do colaborador.`);
  };

  const handleRegisterRepayment = (e: FormEvent) => {
    e.preventDefault();
    if (!modalRepayLoan) return;
    const val = Number(repaymentForm.amount);
    if (isNaN(val) || val <= 0) {
      alert('Valor de amortização inválido.');
      return;
    }

    const updated = registerLoanRepayment({
      loanId: modalRepayLoan.id,
      amount: val,
      paymentMethod: repaymentForm.paymentMethod,
      registeredBy: currentUser?.name || 'Administrador OSDEL',
      notes: repaymentForm.notes,
      receiptReference: repaymentForm.receiptReference,
    });

    if (updated) {
      setLoans(getTechnicianLoans());
      setLoanStats(getCompanyLoanStats());
      setModalRepayLoan(null);
      setRepaymentForm({
        amount: '',
        paymentMethod: 'folha_salarial',
        receiptReference: '',
        notes: 'Amortização processada na tesouraria.',
      });
      alert(`Amortização de ${kz(val)} registada com sucesso! Saldo restante da dívida: ${kz(updated.remainingDebt)}.`);
    }
  };

  const handleCreateMember = (e: FormEvent) => {
    e.preventDefault();
    if (!isSuper) {
      alert('Acesso restrito: Apenas o Super Administrador Supremo (deezy) pode cadastrar novos colaboradores na equipa.');
      return;
    }
    const selectedRole = jobRoles.find((r) => String(r.id) === String(memberForm.jobRoleId));
    createUser.mutate(
      {
        data: {
          ...memberForm,
          jobRoleId: selectedRole ? selectedRole.id : undefined,
          jobTitle: memberForm.jobTitle || selectedRole?.title || 'Colaborador',
          department: memberForm.department || selectedRole?.department || 'Técnico',
          age: Number(memberForm.age || 25),
          salaryBase: Number(memberForm.salaryBase || 0),
          foodAllowance: Number(memberForm.foodAllowance || 0),
          transportAllowance: Number(memberForm.transportAllowance || 0),
          photoUrl:
            memberForm.photoUrl ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
          schedule: [],
          workStatus: 'disponivel',
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setModalNewMember(false);
          alert('Colaborador adicionado à equipa com sucesso!');
        },
        onError: (err: any) => {
          alert(err.message || 'Erro ao criar colaborador.');
        },
      },
    );
  };

  const [editMemberForm, setEditMemberForm] = useState({
    name: '',
    username: '',
    password: '',
    pin: '',
    role: 'operador',
    jobRoleId: '',
    jobTitle: '',
    department: 'Técnico',
    photoUrl: '',
    biNumber: '',
    age: '28',
    birthDate: '1996-01-01',
    gender: 'Masculino',
    phone: '',
    whatsapp: '',
    emergencyContact: '',
    email: '',
    address: 'Golf I, Luanda',
    salaryBase: '150000',
    foodAllowance: '30000',
    transportAllowance: '25000',
    bankIban: '',
    contractType: 'Efectivo',
    workStatus: 'disponivel',
    currentTask: '',
  });

  const openEditMember = (u: any) => {
    setModalEditMember(u);
    setEditMemberForm({
      name: u.name || '',
      username: u.username || '',
      password: u.password || '',
      pin: u.pin || '1234',
      role: u.role || 'operador',
      jobRoleId: u.jobRoleId ? String(u.jobRoleId) : '',
      jobTitle: u.jobTitle || '',
      department: u.department || 'Técnico',
      photoUrl: u.photoUrl || '',
      biNumber: u.biNumber || '',
      age: String(u.age || 28),
      birthDate: u.birthDate || '1996-01-01',
      gender: u.gender || 'Masculino',
      phone: u.phone || '',
      whatsapp: u.whatsapp || '',
      emergencyContact: u.emergencyContact || '',
      email: u.email || '',
      address: u.address || 'Golf I, Luanda',
      salaryBase: String(u.salaryBase || 0),
      foodAllowance: String(u.foodAllowance || 0),
      transportAllowance: String(u.transportAllowance || 0),
      bankIban: u.bankIban || '',
      contractType: u.contractType || 'Efectivo',
      workStatus: u.workStatus || 'disponivel',
      currentTask: u.currentTask || '',
    });
  };

  const handleUpdateMember = (e: FormEvent) => {
    e.preventDefault();
    if (!modalEditMember) return;
    const selectedRole = jobRoles.find((r) => String(r.id) === String(editMemberForm.jobRoleId));

    updateUser.mutate(
      {
        userId: modalEditMember.id,
        data: {
          ...editMemberForm,
          jobRoleId: selectedRole ? selectedRole.id : modalEditMember.jobRoleId,
          jobTitle: editMemberForm.jobTitle || selectedRole?.title || modalEditMember.jobTitle || 'Colaborador',
          department: editMemberForm.department || selectedRole?.department || modalEditMember.department || 'Técnico',
          age: Number(editMemberForm.age || modalEditMember.age || 25),
          salaryBase: Number(editMemberForm.salaryBase || 0),
          foodAllowance: Number(editMemberForm.foodAllowance || 0),
          transportAllowance: Number(editMemberForm.transportAllowance || 0),
        },
      },
      {
        onSuccess: (updated) => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setModalEditMember(null);
          if (modalViewMember && modalViewMember.id === modalEditMember.id) {
            setModalViewMember(updated);
          }
          alert('Dados do colaborador atualizados e sincronizados em todo o sistema com sucesso!');
        },
        onError: (err: any) => {
          alert(err?.message || 'Erro ao atualizar dados do colaborador.');
        },
      },
    );
  };

  const handleCreateRole = (e: FormEvent) => {
    e.preventDefault();
    if (!isSuper) {
      alert('Acesso restrito: Apenas o Super Administrador Supremo (deezy) pode cadastrar novos cargos.');
      return;
    }
    createJobRole.mutate(
      {
        data: {
          ...roleForm,
          baseSalaryMin: Number(roleForm.baseSalaryMin || 0),
          baseSalaryMax: Number(roleForm.baseSalaryMax || 0),
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListJobRolesQueryKey() });
          setModalNewRole(false);
          setRoleForm({
            title: '',
            department: 'Técnico',
            permissionLevel: 'operador',
            baseSalaryMin: '120000',
            baseSalaryMax: '200000',
            description: '',
          });
          alert('Cargo adicionado com sucesso!');
        },
        onError: (err: any) => {
          alert(err.message || 'Erro ao adicionar cargo.');
        },
      },
    );
  };

  const handleAssignTask = (e: FormEvent) => {
    e.preventDefault();
    if (!modalAssignTask) return;
    assignTask.mutate(
      {
        userId: modalAssignTask.id,
        task: taskForm,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setModalAssignTask(null);
          setTaskForm({
            time: '09:00 - 11:30',
            title: '',
            clientName: '',
            location: 'Golf I, Rua 12',
            priority: 'normal',
            status: 'pendente',
          });
          alert('Tarefa atribuída à agenda do colaborador com sucesso!');
        },
      },
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_campo':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5"><span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" /> Em Campo / Piquete</span>;
      case 'em_deslocacao':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5"><span className="h-2 w-2 rounded-full bg-amber-600" /> Em Deslocação</span>;
      case 'em_pausa':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold px-2.5 py-0.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> Em Pausa</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5"><span className="h-2 w-2 rounded-full bg-blue-600" /> Disponível</span>;
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Recursos Humanos & Operações"
        title="Equipa & Quadro da Empresa"
        detail="Gestão completa de técnicos, secretárias, informáticos, mestres, ajudantes, remunerações e agendas operacionais."
        action={
          <div className="flex flex-wrap gap-2">
            {isSuper ? (
              <>
                <Button variant="outline" onClick={() => setModalNewRole(true)}>
                  <Briefcase size={16} /> Adicionar Cargo Manual
                </Button>
                <Button onClick={() => setModalNewMember(true)}>
                  <UserPlus size={16} /> Cadastrar Colaborador
                </Button>
              </>
            ) : (
              <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5 bg-[hsl(var(--secondary))] px-3 py-1.5 rounded-lg">
                <Shield size={13} /> Criação de colaboradores exclusiva do Super Admin (deezy)
              </span>
            )}
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[hsl(var(--border))] pb-3">
        <button
          type="button"
          onClick={() => setTab('colaboradores')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            tab === 'colaboradores'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <Users size={15} /> Colaboradores ({filteredUsers.length})
        </button>

        <button
          type="button"
          onClick={() => setTab('agenda')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            tab === 'agenda'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <Calendar size={15} /> Agendas de Campo & Técnicos (Mobile Ready)
        </button>

        <button
          type="button"
          onClick={() => setTab('cargos')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            tab === 'cargos'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <Briefcase size={15} /> Cargos & Funções da Empresa ({jobRoles.length})
        </button>

        <button
          type="button"
          onClick={() => setTab('folha')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
            tab === 'folha'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <DollarSign size={15} /> Folha Salarial & Estatísticas
        </button>

        <button
          type="button"
          onClick={() => setTab('adiantamentos')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition relative ${
            tab === 'adiantamentos'
              ? 'bg-[hsl(var(--primary))] text-white'
              : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:bg-slate-200'
          }`}
        >
          <Receipt size={15} /> Adiantamentos & Dívidas
          {loanStats.pendingRequests > 0 ? (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black animate-pulse">
              {loanStats.pendingRequests}
            </span>
          ) : loanStats.totalOutstandingDebt > 0 ? (
            <span className="ml-1 text-[10px] opacity-80 font-mono">
              ({kz(loanStats.totalOutstandingDebt)})
            </span>
          ) : null}
        </button>
      </div>

      {/* TAB 1: COLABORADORES */}
      {tab === 'colaboradores' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-400" size={17} />
              <Input
                placeholder="Pesquisar por nome, cargo, BI, telefone ou utilizador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="sm:w-56"
            >
              <option value="todos">Todos os Departamentos</option>
              <option value="Técnico">Técnico (Mestres & Piquete)</option>
              <option value="Atendimento">Atendimento & Secretárias</option>
              <option value="TI / NOC">TI, Programadores & NOC</option>
              <option value="Administração">Administração</option>
              <option value="Direcção">Direcção Geral</option>
            </Select>
          </div>

          {/* User Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="surface rounded-xl border border-[hsl(var(--border))] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                        alt={u.name}
                        className="h-13 w-13 rounded-full object-cover border-2 border-[hsl(var(--primary))]"
                      />
                      <div>
                        <b className="text-sm font-extrabold text-slate-900 block leading-tight">{u.name}</b>
                        <p className="text-xs font-semibold text-[hsl(var(--primary))] mt-0.5">
                          {u.jobTitle || (u.role === 'admin' ? 'Administrador Geral' : 'Operador')}
                        </p>
                        <p className="text-[11px] text-slate-400">@{u.username} · {u.department || 'Operações'}</p>
                      </div>
                    </div>
                    {getStatusBadge(u.workStatus || 'disponivel')}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">BI / Identificação</span>
                      <span className="font-mono font-medium">{u.biNumber || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Idade</span>
                      <span className="font-medium">{u.age ? `${u.age} anos` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Telefone</span>
                      <span className="font-mono">{u.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Salário Base</span>
                      <span className="font-mono font-bold text-emerald-700">{kz(u.salaryBase || 0)}</span>
                    </div>
                  </div>

                  {u.currentTask && (
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Tarefa em Curso:</span>
                      <p className="text-slate-700 line-clamp-2 mt-0.5">{u.currentTask}</p>
                    </div>
                  )}

                  {/* Pending schedule count */}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {Array.isArray(u.schedule) ? u.schedule.length : 0} tarefas na agenda
                    </span>
                    <Badge tone={u.role === 'admin' ? 'good' : 'neutral'}>
                      {u.role === 'admin' ? 'Acesso Admin' : 'Acesso Operador'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between gap-1.5">
                  <Button variant="outline" className="text-xs py-1.5 flex-1" onClick={() => setModalViewMember(u)}>
                    Ver Ficha
                  </Button>
                  <Button
                    variant="primary"
                    className="text-xs py-1.5"
                    onClick={() => openEditMember(u)}
                    title="Editar dados do colaborador"
                  >
                    <Edit size={13} /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="text-xs py-1.5"
                    onClick={() => {
                      setModalAssignTask(u);
                    }}
                  >
                    <Plus size={13} /> Agenda
                  </Button>
                  {isAdmin && (
                    <button
                      title={u.id === currentUser?.id ? 'Não é possível eliminar a sua própria conta em sessão' : 'Eliminar colaborador'}
                      disabled={u.id === currentUser?.id}
                      onClick={() => {
                        if (u.id === currentUser?.id) {
                          alert('Não pode eliminar a sua própria conta enquanto estiver com a sessão iniciada.');
                          return;
                        }
                        if (confirm(`Tem a certeza que deseja eliminar permanentemente o colaborador "${u.name}" (${u.jobTitle || u.role})?\n\nEsta acção revogará acessos, credenciais e removerá o registo da base de dados.`)) {
                          deleteUser.mutate(
                            { userId: u.id },
                            {
                              onSuccess: () => {
                                qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
                                alert(`Colaborador ${u.name} eliminado com sucesso!`);
                              },
                              onError: (err: any) => {
                                alert(`Erro ao eliminar colaborador: ${err?.message || 'Falha na operação'}`);
                              },
                            },
                          );
                        }
                      }}
                      className={`p-2 rounded-lg transition ${
                        u.id === currentUser?.id ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: AGENDAS DE CAMPO & TÉCNICOS */}
      {tab === 'agenda' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Smartphone className="text-blue-600" size={24} />
              <div>
                <b className="text-sm text-blue-900 block">Módulo Preparado para Aplicativo Mobile dos Técnicos</b>
                <p className="text-xs text-blue-700">
                  Todas as ordens e rotas atribuídas aqui serão sincronizadas em tempo real com o futuro app móvel de campo da OSDEL.
                </p>
              </div>
            </div>
            <span className="text-xs bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
              API Mobile Activa
            </span>
          </div>

          <div className="space-y-5">
            {users
              .filter((u) => u.department === 'Técnico' || (Array.isArray(u.schedule) && u.schedule.length > 0))
              .map((u) => (
                <div key={u.id} className="surface rounded-xl border border-[hsl(var(--border))] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                        alt={u.name}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                      <div>
                        <b className="text-sm font-extrabold">{u.name}</b>
                        <span className="text-xs text-slate-500 block">{u.jobTitle} · {u.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(u.workStatus || 'disponivel')}
                      <Button
                        variant="outline"
                        className="text-xs py-1"
                        onClick={() => {
                          setModalAssignTask(u);
                        }}
                      >
                        <Plus size={14} /> Atribuir Tarefa
                      </Button>
                    </div>
                  </div>

                  {/* Schedule items */}
                  {Array.isArray(u.schedule) && u.schedule.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {u.schedule.map((item: any, sIdx: number) => (
                        <div
                          key={item.id || sIdx}
                          className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                            item.priority === 'urgente'
                              ? 'border-red-300 bg-red-50/50'
                              : item.status === 'concluida'
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-700">{item.time}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                item.priority === 'urgente'
                                  ? 'bg-red-200 text-red-800'
                                  : item.priority === 'alta'
                                  ? 'bg-amber-200 text-amber-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {item.priority}
                            </span>
                          </div>
                          <b className="block text-slate-900 font-bold leading-snug">{item.title}</b>
                          <div className="text-slate-500 space-y-0.5 text-[11px]">
                            <p className="flex items-center gap-1.5">
                              <Users size={12} /> {item.clientName || 'Geral'}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <MapPin size={12} /> {item.location || 'Bairro Golf I'}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-600">
                              Status: {item.status === 'concluida' ? 'Concluída ✅' : item.status === 'em_curso' ? 'A decorrer ⏳' : 'Pendente ⏱️'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-2">
                      Nenhuma tarefa atribuída na agenda deste técnico no momento.
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 3: GESTÃO DE CARGOS DA EMPRESA */}
      {tab === 'cargos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Estrutura de Cargos & Plano de Carreira</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Cargos padronizados e manuais para toda a estrutura corporativa da OSDEL Tecnologia.
              </p>
            </div>
            {isAdmin && (
              <Button onClick={() => setModalNewRole(true)}>
                <Plus size={16} /> Adicionar Cargo Manual
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobRoles.map((role) => (
              <div key={role.id} className="surface rounded-xl border border-[hsl(var(--border))] p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {role.department}
                      </span>
                      <b className="text-sm font-extrabold text-slate-900 block mt-0.5">{role.title}</b>
                    </div>
                    {role.isCustom && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded">
                        Manual
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mt-2">{role.description}</p>
                </div>

                <div className="pt-3 border-t border-[hsl(var(--border))] space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Faixa Salarial:</span>
                    <b className="font-mono text-slate-800">{kz(role.baseSalaryMin)} – {kz(role.baseSalaryMax)}</b>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Nível de Permissão:</span>
                    <Badge tone={role.permissionLevel === 'admin' ? 'good' : 'neutral'}>
                      {role.permissionLevel === 'admin' ? 'Acesso Admin' : 'Acesso Operador'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FOLHA SALARIAL & ESTATÍSTICAS */}
      {tab === 'folha' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold uppercase text-slate-400 block">Colaboradores Activos</span>
              <b className="text-3xl font-extrabold text-slate-900 mt-2 block">{users.filter(u => u.active !== false).length}</b>
              <small className="text-xs text-slate-500">Membros no quadro</small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold uppercase text-slate-400 block">Total Salários Base</span>
              <b className="text-2xl font-extrabold text-slate-900 mt-2 block">{kz(totalSalaries)}</b>
              <small className="text-xs text-slate-500">Remuneração contratual</small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <span className="text-xs font-bold uppercase text-slate-400 block">Subsídios (Alim. + Transp.)</span>
              <b className="text-2xl font-extrabold text-amber-700 mt-2 block">{kz(totalAllowances)}</b>
              <small className="text-xs text-slate-500">Benefícios de deslocação e refeição</small>
            </div>

            <div className="surface rounded-xl p-5 border border-red-200 bg-red-50/40">
              <span className="text-xs font-bold uppercase text-red-700 block">Descontos de Adiantamentos</span>
              <b className="text-2xl font-extrabold text-red-700 mt-2 block">
                -{kz(totalMonthlyLoanDeductions)}
              </b>
              <small className="text-xs text-red-600">Amortizações retidas este mês</small>
            </div>

            <div className="surface rounded-xl p-5 border border-emerald-200 bg-emerald-50/50">
              <span className="text-xs font-bold uppercase text-emerald-800 block">Líquido a Transferir</span>
              <b className="text-2xl font-extrabold text-emerald-700 mt-2 block">{kz(netPayrollAfterLoanDeductions)}</b>
              <small className="text-xs text-emerald-600 font-semibold">Valor final líquido bancário</small>
            </div>
          </div>

          {/* Action to process deductions */}
          {totalMonthlyLoanDeductions > 0 && (
            <div className="surface rounded-xl border border-blue-200 bg-blue-50/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-600 text-white">
                  <Receipt size={20} />
                </div>
                <div>
                  <b className="text-xs font-bold text-slate-900 block">Deduções de Adiantamentos Prontas para Fecho</b>
                  <p className="text-[11px] text-slate-600">
                    Há {kz(totalMonthlyLoanDeductions)} previstos para desconto no fecho salarial. Clique para consolidar e abater nas dívidas dos colaboradores.
                  </p>
                </div>
              </div>
              <Button onClick={handleApplyMonthlyPayrollDeductions} className="whitespace-nowrap">
                <Check size={16} /> Processar Descontos na Folha
              </Button>
            </div>
          )}

          {/* Detailed Payroll Table */}
          <div className="surface rounded-xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))] flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Discriminação Individual da Folha com Dedução de Adiantamentos</h3>
              <span className="text-xs text-slate-500 font-medium">Sincronizado com os telemóveis APK</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Cargo / Dept</th>
                    <th className="py-3 px-4 text-right">Salário Base</th>
                    <th className="py-3 px-4 text-right">Subsídios</th>
                    <th className="py-3 px-4 text-right text-slate-900">Total Ilíquido</th>
                    <th className="py-3 px-4 text-right text-red-700">Dívida Activa</th>
                    <th className="py-3 px-4 text-right text-red-700">Desconto Mês</th>
                    <th className="py-3 px-4 text-right font-bold text-emerald-700">Líquido a Pagar</th>
                    <th className="py-3 px-4">IBAN Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users
                    .filter((u) => u.active !== false)
                    .map((u) => {
                      const totalAllowancesMember = Number(u.foodAllowance || 0) + Number(u.transportAllowance || 0);
                      const gross = Number(u.salaryBase || 0) + totalAllowancesMember;
                      const debtInfo = getTechnicianActiveDebt(u.id);
                      const net = Math.max(0, gross - debtInfo.monthlyDeduction);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {u.jobTitle || '—'}
                            <span className="text-[10px] block text-slate-400">{u.department}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono">{kz(u.salaryBase || 0)}</td>
                          <td className="py-3 px-4 text-right font-mono">{kz(totalAllowancesMember)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{kz(gross)}</td>
                          <td className="py-3 px-4 text-right font-mono text-red-600 font-semibold">
                            {debtInfo.totalActiveDebt > 0 ? kz(debtInfo.totalActiveDebt) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-red-700">
                            {debtInfo.monthlyDeduction > 0 ? `-${kz(debtInfo.monthlyDeduction)}` : '0 Kz'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">{kz(net)}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{u.bankIban || '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ADIANTAMENTOS DE SALÁRIO & GESTÃO DE DÍVIDAS */}
      {tab === 'adiantamentos' && (
        <div className="space-y-6">
          {/* Header & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gestão Corporativa de Adiantamentos & Dívidas da Equipa</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Controlo em tempo real de pedidos submetidos no APK pelos técnicos, concessão directa em tesouraria, amortizações e sincronização de folha.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleApplyMonthlyPayrollDeductions}>
                <Receipt size={15} /> Processar Descontos na Folha
              </Button>
              <Button onClick={() => setModalDirectLoan(true)}>
                <Plus size={15} /> Conceder Adiantamento Directo
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Total Concedido</span>
                <Wallet size={18} className="text-blue-600" />
              </div>
              <b className="text-2xl font-extrabold text-slate-900 mt-2 block">{kz(loanStats.totalLoaned)}</b>
              <small className="text-xs text-slate-500">{loanStats.totalLoans} adiantamentos emitidos</small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Total Recuperado</span>
                <PiggyBank size={18} className="text-emerald-600" />
              </div>
              <b className="text-2xl font-extrabold text-emerald-700 mt-2 block">{kz(loanStats.totalRepaid)}</b>
              <small className="text-xs text-emerald-600 font-medium">{loanStats.fullyLiquidatedLoans} adiantamentos liquidados</small>
            </div>

            <div className="surface rounded-xl p-5 border border-red-300 bg-red-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-red-700">Dívida Activa Global</span>
                <TrendingDown size={18} className="text-red-700" />
              </div>
              <b className="text-2xl font-extrabold text-red-700 mt-2 block">{kz(loanStats.totalOutstandingDebt)}</b>
              <small className="text-xs text-red-600 font-semibold">{loanStats.activeLoans} empréstimos em aberto</small>
            </div>

            <div className="surface rounded-xl p-5 border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-400">Dedução Prevista / Mês</span>
                <Coins size={18} className="text-amber-600" />
              </div>
              <b className="text-2xl font-extrabold text-amber-700 mt-2 block">{kz(totalMonthlyLoanDeductions)}</b>
              <small className="text-xs text-slate-500">A reter no fecho salarial</small>
            </div>

            <div className="surface rounded-xl p-5 border border-amber-300 bg-amber-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-amber-800">Pedidos Pendentes</span>
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <b className="text-2xl font-extrabold text-amber-800 mt-2 block">{loanStats.pendingRequests}</b>
              <small className="text-xs text-amber-700 font-semibold">Aguardam validação</small>
            </div>
          </div>

          {/* PENDING LOAN REQUESTS TABLE */}
          {loans.filter((l) => l.status === 'pendente').length > 0 && (
            <div className="surface rounded-xl border-2 border-amber-300 overflow-hidden shadow-xs">
              <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <div>
                    <b className="text-xs font-bold text-amber-900 block">
                      Pedidos de Adiantamento Salarial Pendentes de Aprovação ({loans.filter((l) => l.status === 'pendente').length})
                    </b>
                    <span className="text-[10px] text-amber-700">Submetidos por colaboradores através do APK móvel</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-100/50 text-amber-900 font-bold uppercase border-b border-amber-200">
                    <tr>
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-4">Departamento</th>
                      <th className="py-3 px-4">Data Pedido</th>
                      <th className="py-3 px-4 text-right">Valor Desejado</th>
                      <th className="py-3 px-4">Motivo / Finalidade</th>
                      <th className="py-3 px-4">Parcelas</th>
                      <th className="py-3 px-4">Forma de Pagamento</th>
                      <th className="py-3 px-4 text-center">Decisão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 bg-white">
                    {loans
                      .filter((l) => l.status === 'pendente')
                      .map((loan) => (
                        <tr key={loan.id} className="hover:bg-amber-50/40">
                          <td className="py-3 px-4 font-bold text-slate-900">{loan.technicianName}</td>
                          <td className="py-3 px-4 text-slate-600">{loan.department}</td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {new Date(loan.requestedAt).toLocaleDateString('pt-AO')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-blue-700 text-sm">
                            {kz(loan.amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs">{loan.purpose}</td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {loan.installments}x ({kz(loan.monthlyDeduction)}/mês)
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600">
                            {loan.receiptMethod === 'multicaixa_express' ? (
                              <span>Multicaixa Express ({loan.expressPhone || '—'})</span>
                            ) : loan.receiptMethod === 'numerario' ? (
                              <span>Numerário (Caixa)</span>
                            ) : (
                              <span className="font-mono text-[10px]">IBAN: {loan.targetIban}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleReviewLoan(loan.id, 'aprovado')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 shadow-xs"
                              >
                                ✓ Aprovar
                              </button>
                              <button
                                onClick={() => handleReviewLoan(loan.id, 'rejeitado')}
                                className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 font-bold text-[11px] hover:bg-red-200"
                              >
                                ✕ Indeferir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GENERAL LOANS & DEBT MANAGEMENT TABLE */}
          <div className="surface rounded-xl border border-[hsl(var(--border))] overflow-hidden space-y-3 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[hsl(var(--border))]">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Quadro de Dívidas & Histórico de Adiantamentos</h3>
                <p className="text-xs text-slate-500">Monitorize o estado de amortização de cada funcionário</p>
              </div>

              {/* Status Filter */}
              <div className="flex gap-1.5 flex-wrap">
                {(['todos', 'aprovado', 'pendente', 'liquidado', 'rejeitado'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setLoanStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                      loanStatusFilter === st
                        ? 'bg-[hsl(var(--primary))] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'todos' ? 'Todos' : st === 'aprovado' ? 'Activos / Dívida' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-[hsl(var(--border))]">
                  <tr>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Data & Prazo</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Amortizado</th>
                    <th className="py-3 px-4 text-right text-red-700">Saldo Devedor</th>
                    <th className="py-3 px-4 text-right">Desconto Mês</th>
                    <th className="py-3 px-4">Progresso</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-right">Ações de Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loans
                    .filter((l) => (loanStatusFilter === 'todos' ? true : l.status === loanStatusFilter))
                    .map((loan) => {
                      const percentPaid = loan.amount > 0 ? Math.min(100, Math.round((loan.totalRepaid / loan.amount) * 100)) : 0;
                      return (
                        <tr key={loan.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <b className="font-bold text-slate-900 block">{loan.technicianName}</b>
                            <span className="text-[10px] text-slate-500">{loan.department} · {loan.purpose}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            {new Date(loan.requestedAt).toLocaleDateString('pt-AO')}
                            <span className="block text-[10px] text-slate-400 font-sans">{loan.installments}x parcelas</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{kz(loan.amount)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">{kz(loan.totalRepaid)}</td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-red-700 text-sm">
                            {loan.status === 'aprovado' && loan.remainingDebt > 0 ? kz(loan.remainingDebt) : '0 Kz'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">{kz(loan.monthlyDeduction)}</td>
                          <td className="py-3 px-4 min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${percentPaid === 100 ? 'bg-emerald-600' : 'bg-blue-600'}`}
                                  style={{ width: `${percentPaid}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-slate-600 font-bold">{percentPaid}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
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
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {loan.status === 'aprovado' && loan.remainingDebt > 0 && (
                                <button
                                  onClick={() => {
                                    setModalRepayLoan(loan);
                                    setRepaymentForm({
                                      amount: String(loan.monthlyDeduction || loan.remainingDebt),
                                      paymentMethod: 'numerario',
                                      receiptReference: `REC-${Date.now().toString().slice(-4)}`,
                                      notes: 'Amortização avulsa recebida na tesouraria.',
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700"
                                >
                                  + Amortizar
                                </button>
                              )}
                              <button
                                onClick={() => setModalLoanHistory(loan)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold text-[10px] hover:bg-slate-100"
                              >
                                Histórico ({loan.repaymentHistory?.length || 0})
                              </button>
                            </div>
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

      {/* MODAL: ADICIONAR NOVO COLABORADOR COMPLETO */}
      {modalNewMember && (
        <Modal
          title="Cadastrar Colaborador da Equipa"
          eyebrow="Recursos Humanos"
          onClose={() => setModalNewMember(false)}
        >
          <form onSubmit={handleCreateMember} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome Completo *">
                <Input
                  required
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  placeholder="Ex.: António Gonçalves Manuel"
                />
              </Field>
              <Field label="Cargo / Função *">
                <Select
                  required
                  value={memberForm.jobRoleId}
                  onChange={(e) => {
                    const sel = jobRoles.find((r) => String(r.id) === e.target.value);
                    setMemberForm({
                      ...memberForm,
                      jobRoleId: e.target.value,
                      jobTitle: sel?.title || '',
                      department: sel?.department || 'Técnico',
                      salaryBase: sel ? String(sel.baseSalaryMin) : memberForm.salaryBase,
                    });
                  }}
                >
                  <option value="">Seleccionar cargo...</option>
                  {jobRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.department})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Utilizador (Login) *">
                <Input
                  required
                  value={memberForm.username}
                  onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value.toLowerCase().trim() })}
                  placeholder="ex.: antonio.tecnico"
                />
              </Field>
              <Field label="Palavra-passe *">
                <Input
                  required
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                />
              </Field>
              <Field label="Nível de Permissão">
                <Select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                >
                  <option value="operador">Operador (Atendimento / Técnico)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nº de Bilhete (BI) *">
                <Input
                  required
                  value={memberForm.biNumber}
                  onChange={(e) => setMemberForm({ ...memberForm, biNumber: e.target.value.toUpperCase() })}
                  placeholder="004829104LA042"
                />
              </Field>
              <Field label="Idade">
                <Input
                  type="number"
                  value={memberForm.age}
                  onChange={(e) => setMemberForm({ ...memberForm, age: e.target.value })}
                />
              </Field>
              <Field label="Data de Nascimento">
                <Input
                  type="date"
                  value={memberForm.birthDate}
                  onChange={(e) => setMemberForm({ ...memberForm, birthDate: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Telefone *">
                <Input
                  required
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  placeholder="923 000 000"
                />
              </Field>
              <Field label="WhatsApp">
                <Input
                  value={memberForm.whatsapp}
                  onChange={(e) => setMemberForm({ ...memberForm, whatsapp: e.target.value })}
                  placeholder="923 000 000"
                />
              </Field>
              <Field label="E-mail Institucional">
                <Input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="nome@osdeltecnologia.ao"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contacto de Emergência (Nome & Tel)">
                <Input
                  value={memberForm.emergencyContact}
                  onChange={(e) => setMemberForm({ ...memberForm, emergencyContact: e.target.value })}
                  placeholder="Ex.: Esposa (+244 912 345 678)"
                />
              </Field>
              <Field label="Endereço Residencial">
                <Input
                  value={memberForm.address}
                  onChange={(e) => setMemberForm({ ...memberForm, address: e.target.value })}
                  placeholder="Bairro, Rua, Casa..."
                />
              </Field>
            </div>

            <ProfilePhotoUploader
              currentPhotoUrl={memberForm.photoUrl}
              onChange={(newUrl) => setMemberForm({ ...memberForm, photoUrl: newUrl })}
              label="Foto do Colaborador (Dispositivo ou URL)"
              hint="Importe uma foto a partir do computador ou telemóvel para identificação do colaborador na empresa."
            />

            <div className="p-3 bg-slate-50 border rounded-lg space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-600">Dados Financeiros & Contrato</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Salário Base (Kz) *">
                  <Input
                    type="number"
                    required
                    value={memberForm.salaryBase}
                    onChange={(e) => setMemberForm({ ...memberForm, salaryBase: e.target.value })}
                  />
                </Field>
                <Field label="Subsídio de Alimentação">
                  <Input
                    type="number"
                    value={memberForm.foodAllowance}
                    onChange={(e) => setMemberForm({ ...memberForm, foodAllowance: e.target.value })}
                  />
                </Field>
                <Field label="Subsídio de Transporte">
                  <Input
                    type="number"
                    value={memberForm.transportAllowance}
                    onChange={(e) => setMemberForm({ ...memberForm, transportAllowance: e.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Banco em Angola">
                  <Select
                    value={getBankByIban(memberForm.bankIban)?.code || '0040'}
                    onChange={(e) => {
                      const selectedBank = ANGOLAN_BANKS.find((b) => b.code === e.target.value);
                      if (selectedBank) {
                        const cleanDigits = memberForm.bankIban.replace(/[^0-9]/g, '');
                        const rest = cleanDigits.length >= 8 ? cleanDigits.slice(6) : '0000000000000000000';
                        setMemberForm({
                          ...memberForm,
                          bankIban: formatAngolanIban(`AO06${selectedBank.code}${rest}`),
                        });
                      }
                    }}
                  >
                    {ANGOLAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name} ({b.shortName || b.code})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="IBAN Oficial (AO06...)">
                  <Input
                    className="font-mono text-xs"
                    value={memberForm.bankIban}
                    onChange={(e) => setMemberForm({ ...memberForm, bankIban: formatAngolanIban(e.target.value) })}
                    placeholder="AO06.0040.0000.1234.5678.9012.3"
                  />
                </Field>
                <Field label="Tipo de Contrato">
                  <Select
                    value={memberForm.contractType}
                    onChange={(e) => setMemberForm({ ...memberForm, contractType: e.target.value })}
                  >
                    <option value="Efectivo">Efectivo (Quadro Permanente)</option>
                    <option value="A Termo">A Termo Certo (1 Ano)</option>
                    <option value="Estágio">Estágio Profissional</option>
                    <option value="Prestador">Prestador de Serviços</option>
                  </Select>
                </Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setModalNewMember(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Gravar Colaborador
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADICIONAR CARGO MANUAL */}
      {modalNewRole && (
        <Modal
          title="Cadastrar Novo Cargo Manual"
          eyebrow="Plano de Cargos & Salários"
          onClose={() => setModalNewRole(false)}
        >
          <form onSubmit={handleCreateRole} className="space-y-4">
            <Field label="Título Oficial do Cargo *">
              <Input
                required
                value={roleForm.title}
                onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })}
                placeholder="Ex.: Técnico de Fusão de Fibra Óptica"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Departamento *">
                <Select
                  value={roleForm.department}
                  onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value as any })}
                >
                  <option value="Técnico">Técnico</option>
                  <option value="Atendimento">Atendimento</option>
                  <option value="TI / NOC">TI / NOC</option>
                  <option value="Administração">Administração</option>
                  <option value="Direcção">Direcção</option>
                  <option value="Logística">Logística</option>
                </Select>
              </Field>
              <Field label="Nível de Acesso Recomendado">
                <Select
                  value={roleForm.permissionLevel}
                  onChange={(e) => setRoleForm({ ...roleForm, permissionLevel: e.target.value as any })}
                >
                  <option value="operador">Operador (Padrão)</option>
                  <option value="admin">Administrador Geral</option>
                  <option value="tecnico">Técnico de Campo</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Salário Mínimo da Faixa (Kz)">
                <Input
                  type="number"
                  value={roleForm.baseSalaryMin}
                  onChange={(e) => setRoleForm({ ...roleForm, baseSalaryMin: e.target.value })}
                />
              </Field>
              <Field label="Salário Máximo da Faixa (Kz)">
                <Input
                  type="number"
                  value={roleForm.baseSalaryMax}
                  onChange={(e) => setRoleForm({ ...roleForm, baseSalaryMax: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Descrição das Atribuições e Responsabilidades *">
              <Textarea
                required
                rows={3}
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Descreva detalhadamente o que este profissional executa na empresa..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setModalNewRole(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Adicionar Cargo
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ATRIBUIR TAREFA NA AGENDA */}
      {modalAssignTask && (
        <Modal
          title={`Atribuir Tarefa na Agenda: ${modalAssignTask.name}`}
          eyebrow="Agenda & Piquete de Campo"
          onClose={() => setModalAssignTask(null)}
        >
          <form onSubmit={handleAssignTask} className="space-y-4">
            <Field label="Título / Descrição da Tarefa *">
              <Input
                required
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Ex.: Instalação de Fibra 22 no Cliente ou Fusão na CTO-04"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Horário Previsto *">
                <Input
                  required
                  value={taskForm.time}
                  onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                  placeholder="10:00 - 12:30"
                />
              </Field>
              <Field label="Nível de Prioridade">
                <Select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                >
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente / Emergência</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente / Entidade de Referência">
                <Input
                  value={taskForm.clientName}
                  onChange={(e) => setTaskForm({ ...taskForm, clientName: e.target.value })}
                  placeholder="Ex.: Joaquim Santos (CLI-00002)"
                />
              </Field>
              <Field label="Localidade / Ponto de Intervenção">
                <Input
                  value={taskForm.location}
                  onChange={(e) => setTaskForm({ ...taskForm, location: e.target.value })}
                  placeholder="Golf I, Rua 12, Poste 14"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setModalAssignTask(null)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Confirmar Tarefa na Agenda
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: FICHA COMPLETA DO COLABORADOR */}
      {modalViewMember && (
        <Modal
          title={`Ficha de Colaborador: ${modalViewMember.name}`}
          eyebrow="Dados Pessoais & Contratuais"
          onClose={() => setModalViewMember(null)}
        >
          <div className="space-y-5 text-xs">
            <div className="flex items-center gap-4 border-b pb-4">
              <AvatarWithQuickUpload
                photoUrl={modalViewMember.photoUrl}
                name={modalViewMember.name}
                size="lg"
                onPhotoUploaded={(newPhoto) => {
                  updateUser.mutate(
                    { userId: modalViewMember.id, data: { photoUrl: newPhoto } },
                    {
                      onSuccess: () => {
                        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
                        setModalViewMember((prev: any) => (prev ? { ...prev, photoUrl: newPhoto } : null));
                      },
                    },
                  );
                }}
              />
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{modalViewMember.name}</h3>
                <p className="text-sm text-[hsl(var(--primary))] font-bold">{modalViewMember.jobTitle}</p>
                <p className="text-slate-500">@{modalViewMember.username} · {modalViewMember.department}</p>
                <span className="text-[11px] text-[hsl(var(--primary))] font-bold mt-1 block">
                  Toque na foto para alterar a partir do dispositivo
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border">
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Nº de Bilhete (BI)</span>
                <b className="text-slate-800 font-mono text-sm">{modalViewMember.biNumber || '—'}</b>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Idade / Nascimento</span>
                <b className="text-slate-800 text-sm">{modalViewMember.age || '—'} anos ({modalViewMember.birthDate || '—'})</b>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Telefone Directo</span>
                <b className="text-slate-800 font-mono text-sm">{modalViewMember.phone || '—'}</b>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">WhatsApp</span>
                <b className="text-slate-800 font-mono text-sm">{modalViewMember.whatsapp || '—'}</b>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">E-mail</span>
                <b className="text-slate-800 text-xs">{modalViewMember.email || '—'}</b>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Contacto Emergência</span>
                <b className="text-slate-800 text-xs">{modalViewMember.emergencyContact || '—'}</b>
              </div>
              <div>
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Morada</span>
                <b className="text-slate-800 text-xs">{modalViewMember.address || '—'}</b>
              </div>
            </div>

            <div className="p-4 rounded-xl border space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Remuneração & Benefícios</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block">Salário Base:</span>
                  <b className="text-emerald-700 font-mono text-sm">{kz(modalViewMember.salaryBase || 0)}</b>
                </div>
                <div>
                  <span className="text-slate-500 block">Subs. Alimentação:</span>
                  <b className="text-slate-800 font-mono text-sm">{kz(modalViewMember.foodAllowance || 0)}</b>
                </div>
                <div>
                  <span className="text-slate-500 block">Subs. Transporte:</span>
                  <b className="text-slate-800 font-mono text-sm">{kz(modalViewMember.transportAllowance || 0)}</b>
                </div>
              </div>
              <div className="pt-2 border-t mt-2 flex justify-between items-center">
                <span className="font-bold text-slate-700">Total Ilíquido Mensal:</span>
                <b className="text-base font-extrabold text-emerald-800 font-mono">
                  {kz(
                    Number(modalViewMember.salaryBase || 0) +
                      Number(modalViewMember.foodAllowance || 0) +
                      Number(modalViewMember.transportAllowance || 0),
                  )}
                </b>
              </div>
              <p className="text-[11px] text-slate-500 font-mono pt-1">
                IBAN Principal para Transferência: {modalViewMember.bankIban || 'Não registado'}
              </p>
            </div>

            {/* CONTAS BANCÁRIAS DO MEMBRO (MÚLTIPLOS BANCOS) */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark size={14} className="text-[hsl(var(--primary))]" />
                  Contas Bancárias do Colaborador (Vários Bancos)
                </h4>
              </div>

              <BankAccountsManager
                accounts={
                  Array.isArray(modalViewMember.bankAccounts) && modalViewMember.bankAccounts.length > 0
                    ? modalViewMember.bankAccounts
                    : [
                        {
                          id: `acc-${modalViewMember.id || '1'}`,
                          bankCode: getBankByIban(modalViewMember.bankIban)?.code || '0040',
                          bankName: getBankByIban(modalViewMember.bankIban)?.name || 'Banco BAI',
                          accountHolder: modalViewMember.name,
                          iban: modalViewMember.bankIban || 'AO06.0040.0000.8392.1029.3012.4',
                          accountType: 'salario',
                          isDefault: true,
                        },
                      ]
                }
                defaultHolderName={modalViewMember.name}
                isCompany={false}
                readOnly={!isAdmin}
                onChange={(updatedAccounts) => {
                  const defaultAcc = updatedAccounts.find((a) => a.isDefault) || updatedAccounts[0];
                  updateUser.mutate(
                    {
                      userId: modalViewMember.id,
                      data: {
                        bankAccounts: updatedAccounts,
                        bankIban: defaultAcc?.iban || '',
                      },
                    },
                    {
                      onSuccess: () => {
                        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
                        setModalViewMember((prev: any) =>
                          prev
                            ? {
                                ...prev,
                                bankAccounts: updatedAccounts,
                                bankIban: defaultAcc?.iban || '',
                              }
                            : null,
                        );
                      },
                    },
                  );
                }}
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <Button
                variant="primary"
                onClick={() => {
                  const m = modalViewMember;
                  setModalViewMember(null);
                  openEditMember(m);
                }}
              >
                <Edit size={16} /> Editar Dados do Colaborador
              </Button>
              <Button variant="outline" onClick={() => setModalViewMember(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: EDITAR COLABORADOR */}
      {modalEditMember && (
        <Modal
          title={`Editar Colaborador: ${modalEditMember.name}`}
          eyebrow="Gestão de Pessoal & Acessos"
          onClose={() => setModalEditMember(null)}
        >
          <form onSubmit={handleUpdateMember} className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow flex-shrink-0">
                <img
                  src={
                    editMemberForm.photoUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={editMemberForm.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <Field label="URL da Foto de Perfil">
                  <Input
                    value={editMemberForm.photoUrl}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, photoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome Completo *">
                <Input
                  required
                  value={editMemberForm.name}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                />
              </Field>

              <Field label="Nome de Utilizador / Login *">
                <Input
                  required
                  value={editMemberForm.username}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, username: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Palavra-passe (Web)">
                <Input
                  type="password"
                  value={editMemberForm.password}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, password: e.target.value })}
                  placeholder="Deixe em branco para manter a actual"
                />
              </Field>

              <Field label="PIN Rápido (APK Móvel - 4 Dígitos)">
                <Input
                  type="text"
                  maxLength={4}
                  value={editMemberForm.pin}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="Ex.: 1234"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Telefone Principal *">
                <Input
                  required
                  value={editMemberForm.phone}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                  placeholder="+244 9..."
                />
              </Field>

              <Field label="WhatsApp">
                <Input
                  value={editMemberForm.whatsapp}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, whatsapp: e.target.value })}
                  placeholder="+244 9..."
                />
              </Field>

              <Field label="Nº do Bilhete de Identidade (BI)">
                <Input
                  value={editMemberForm.biNumber}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, biNumber: e.target.value.toUpperCase() })}
                  placeholder="000000000LA000"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Departamento *">
                <Select
                  value={editMemberForm.department}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, department: e.target.value })}
                >
                  <option value="Técnico">Técnico & Fibra</option>
                  <option value="Operações">Operações de Rede</option>
                  <option value="Comercial">Comercial & Balcão</option>
                  <option value="Financeiro">Financeiro / Contabilidade</option>
                  <option value="Direcção">Direcção Geral</option>
                  <option value="Apoio ao Cliente">Apoio ao Cliente</option>
                </Select>
              </Field>

              <Field label="Cargo / Função *">
                <Input
                  required
                  value={editMemberForm.jobTitle}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, jobTitle: e.target.value })}
                  placeholder="Ex.: Técnico Sénior FTTH"
                />
              </Field>

              <Field label="Nível de Permissão / Acesso *">
                <Select
                  value={editMemberForm.role}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, role: e.target.value })}
                >
                  <option value="operador">Operador (Balcão / Caixa)</option>
                  <option value="tecnico">Técnico (Piquete / Campo)</option>
                  <option value="admin">Administrador (Gerente)</option>
                  <option value="boss">Boss (Direcção Executiva)</option>
                  <option value="superadmin">Super Admin Supremo</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Salário Base (Kz)">
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={editMemberForm.salaryBase}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, salaryBase: e.target.value })}
                />
              </Field>

              <Field label="Subsídio de Alimentação (Kz)">
                <Input
                  type="number"
                  min="0"
                  step="500"
                  value={editMemberForm.foodAllowance}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, foodAllowance: e.target.value })}
                />
              </Field>

              <Field label="Subsídio de Transporte (Kz)">
                <Input
                  type="number"
                  min="0"
                  step="500"
                  value={editMemberForm.transportAllowance}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, transportAllowance: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="IBAN Bancário (para Salários)">
                <Input
                  value={editMemberForm.bankIban}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, bankIban: e.target.value })}
                  placeholder="AO06.0040...."
                />
              </Field>

              <Field label="Estado Operacional">
                <Select
                  value={editMemberForm.workStatus}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, workStatus: e.target.value })}
                >
                  <option value="disponivel">Disponível</option>
                  <option value="em_servico">Em Serviço no Terreno</option>
                  <option value="pausa">Em Pausa / Almoço</option>
                  <option value="ausente">Ausente</option>
                  <option value="ferias">Em Férias</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contacto de Emergência (Nome & Tel)">
                <Input
                  value={editMemberForm.emergencyContact}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, emergencyContact: e.target.value })}
                  placeholder="Ex.: Esposa (+244 912 345 678)"
                />
              </Field>
              <Field label="Morada / Residência">
                <Input
                  value={editMemberForm.address}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, address: e.target.value })}
                  placeholder="Bairro, Rua, Casa..."
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" type="button" onClick={() => setModalEditMember(null)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                <Check size={16} /> Guardar Alterações
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CONCEDER ADIANTAMENTO DIRECTO */}
      {modalDirectLoan && (
        <Modal
          title="Conceder Adiantamento Directo a Colaborador"
          eyebrow="Tesouraria & Finanças"
          onClose={() => setModalDirectLoan(false)}
        >
          <form onSubmit={handleCreateDirectLoan} className="space-y-4">
            <Field label="Seleccionar Colaborador *">
              <Select
                required
                value={directLoanForm.technicianId}
                onChange={(e) => {
                  const selUser = users.find((u) => String(u.id) === e.target.value);
                  setDirectLoanForm({
                    ...directLoanForm,
                    technicianId: e.target.value,
                    targetIban: selUser?.bankIban || '',
                    expressPhone: selUser?.phone || '',
                  });
                }}
              >
                <option value="">-- Seleccione o Colaborador --</option>
                {users
                  .filter((u) => u.active !== false)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.jobTitle || u.department || 'Colaborador'}) — Salário: {kz(u.salaryBase || 0)}
                    </option>
                  ))}
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Montante do Adiantamento (Kz) *">
                <Input
                  required
                  type="number"
                  min={1000}
                  step={500}
                  value={directLoanForm.amount}
                  onChange={(e) => setDirectLoanForm({ ...directLoanForm, amount: e.target.value })}
                  placeholder="Ex.: 50000"
                />
              </Field>

              <Field label="Plano de Amortização *">
                <Select
                  value={directLoanForm.installments}
                  onChange={(e) => setDirectLoanForm({ ...directLoanForm, installments: Number(e.target.value) })}
                >
                  <option value={1}>1x (Desconto integral na próxima folha)</option>
                  <option value={2}>2x parcelas mensais (50% cada)</option>
                  <option value={3}>3x parcelas mensais</option>
                  <option value={4}>4x parcelas mensais</option>
                  <option value={6}>6x parcelas mensais</option>
                </Select>
              </Field>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
              <span className="text-slate-600 font-medium">Desconto Previsto por Folha Salarial:</span>
              <b className="text-sm font-extrabold text-blue-700 font-mono">
                {kz(Math.round(Number(directLoanForm.amount || 0) / Number(directLoanForm.installments || 1)))} / mês
              </b>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Forma de Entrega do Valor *">
                <Select
                  value={directLoanForm.receiptMethod}
                  onChange={(e) => setDirectLoanForm({ ...directLoanForm, receiptMethod: e.target.value as any })}
                >
                  <option value="numerario">Numerário em Mão (Caixa Tesouraria)</option>
                  <option value="iban">Transferência Bancária (IBAN)</option>
                  <option value="multicaixa_express">Multicaixa Express</option>
                </Select>
              </Field>

              {directLoanForm.receiptMethod === 'iban' ? (
                <Field label="IBAN de Destino">
                  <Input
                    value={directLoanForm.targetIban}
                    onChange={(e) => setDirectLoanForm({ ...directLoanForm, targetIban: e.target.value })}
                    placeholder="AO06.0040...."
                  />
                </Field>
              ) : directLoanForm.receiptMethod === 'multicaixa_express' ? (
                <Field label="Nº de Telemóvel Express">
                  <Input
                    value={directLoanForm.expressPhone}
                    onChange={(e) => setDirectLoanForm({ ...directLoanForm, expressPhone: e.target.value })}
                    placeholder="923 000 000"
                  />
                </Field>
              ) : (
                <Field label="Local de Entrega">
                  <Input readOnly value="Caixa Central da OSDEL Tecnologia" className="bg-slate-100" />
                </Field>
              )}
            </div>

            <Field label="Finalidade / Justificativo *">
              <Input
                required
                value={directLoanForm.purpose}
                onChange={(e) => setDirectLoanForm({ ...directLoanForm, purpose: e.target.value })}
                placeholder="Ex.: Despesas médicas familiares, urgência habitacional..."
              />
            </Field>

            <Field label="Observações Internas">
              <Textarea
                rows={2}
                value={directLoanForm.notes}
                onChange={(e) => setDirectLoanForm({ ...directLoanForm, notes: e.target.value })}
                placeholder="Notas da administração ou da tesouraria..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" type="button" onClick={() => setModalDirectLoan(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Conceder e Lançar Dívida
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: REGISTAR AMORTIZAÇÃO DE DÍVIDA */}
      {modalRepayLoan && (
        <Modal
          title={`Registar Amortização: ${modalRepayLoan.technicianName}`}
          eyebrow="Tesouraria & Amortização"
          onClose={() => setModalRepayLoan(null)}
        >
          <form onSubmit={handleRegisterRepayment} className="space-y-4">
            {/* Debt status summary banner */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Valor Inicial do Adiantamento:</span>
                <b className="font-mono text-slate-800 font-bold">{kz(modalRepayLoan.amount)}</b>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Já Amortizado:</span>
                <b className="font-mono text-emerald-700 font-bold">{kz(modalRepayLoan.totalRepaid)}</b>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-red-700 font-bold">Saldo Devedor Actual Restante:</span>
                <b className="font-mono text-base font-extrabold text-red-700">{kz(modalRepayLoan.remainingDebt)}</b>
              </div>
            </div>

            {/* Quick value suggestion buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRepaymentForm({ ...repaymentForm, amount: String(modalRepayLoan.monthlyDeduction) })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700"
              >
                Parcela do Mês ({kz(modalRepayLoan.monthlyDeduction)})
              </button>
              <button
                type="button"
                onClick={() => setRepaymentForm({ ...repaymentForm, amount: String(modalRepayLoan.remainingDebt) })}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-[11px] font-bold text-emerald-800"
              >
                Liquidar Tudo ({kz(modalRepayLoan.remainingDebt)})
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Valor a Amortizar (Kz) *">
                <Input
                  required
                  type="number"
                  min={1}
                  max={modalRepayLoan.remainingDebt}
                  step={100}
                  value={repaymentForm.amount}
                  onChange={(e) => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                  placeholder="Ex.: 25000"
                />
              </Field>

              <Field label="Método de Pagamento *">
                <Select
                  value={repaymentForm.paymentMethod}
                  onChange={(e) => setRepaymentForm({ ...repaymentForm, paymentMethod: e.target.value as any })}
                >
                  <option value="numerario">Numerário / Dinheiro Físico</option>
                  <option value="transferencia">Transferência Bancária Direta</option>
                  <option value="multicaixa_express">Multicaixa Express</option>
                  <option value="folha_salarial">Retenção Extraordinária em Folha</option>
                </Select>
              </Field>
            </div>

            <Field label="Nº de Recibo / Referência da Transação">
              <Input
                value={repaymentForm.receiptReference}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, receiptReference: e.target.value })}
                placeholder="Ex.: REC-9821 ou Nº Transação Bancária"
              />
            </Field>

            <Field label="Observações da Tesouraria">
              <Textarea
                rows={2}
                value={repaymentForm.notes}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                placeholder="Ex.: Pagamento em mão no balcão da tesouraria..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" type="button" onClick={() => setModalRepayLoan(null)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Check size={16} /> Confirmar Amortização
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: HISTÓRICO DE AMORTIZAÇÕES */}
      {modalLoanHistory && (
        <Modal
          title={`Histórico de Pagamentos: ${modalLoanHistory.technicianName}`}
          eyebrow="Auditoria de Dívida"
          onClose={() => setModalLoanHistory(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border rounded-lg text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Concedido</span>
                <b className="font-mono text-slate-800 font-bold">{kz(modalLoanHistory.amount)}</b>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Amortizado</span>
                <b className="font-mono text-emerald-700 font-bold">{kz(modalLoanHistory.totalRepaid)}</b>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Saldo Devedor</span>
                <b className="font-mono text-red-700 font-bold">{kz(modalLoanHistory.remainingDebt)}</b>
              </div>
            </div>

            {Array.isArray(modalLoanHistory.repaymentHistory) && modalLoanHistory.repaymentHistory.length > 0 ? (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3 text-right">Valor Pago</th>
                      <th className="py-2.5 px-3">Método</th>
                      <th className="py-2.5 px-3 text-right">Saldo Restante</th>
                      <th className="py-2.5 px-3">Ref / Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {modalLoanHistory.repaymentHistory.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {new Date(rep.date || rep.paidAt || Date.now()).toLocaleDateString('pt-AO')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          +{kz(rep.amount)}
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-700">
                          {(rep.paymentMethod || rep.source || 'pagamento').replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {kz(rep.remainingDebtAfter ?? 0)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {rep.receiptReference ? `Ref: ${rep.receiptReference} · ` : ''}{rep.note || rep.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">
                Nenhuma amortização registada para este adiantamento até ao momento.
              </p>
            )}

            <div className="flex justify-end pt-3 border-t">
              <Button variant="outline" onClick={() => setModalLoanHistory(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: VER FICHA COMPLETA DO COLABORADOR */}
      {modalViewMember && (
        <Modal
          title={`Ficha Completa: ${modalViewMember.name}`}
          eyebrow={`ID #${modalViewMember.id} · ${modalViewMember.department || 'Operações'}`}
          onClose={() => setModalViewMember(null)}
        >
          <div className="space-y-6">
            {/* Top Header Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <img
                src={modalViewMember.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'}
                alt={modalViewMember.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
              />
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg font-black text-slate-900">{modalViewMember.name}</h3>
                  {getStatusBadge(modalViewMember.workStatus || 'disponivel')}
                </div>
                <p className="text-sm font-semibold text-[hsl(var(--primary))]">
                  {modalViewMember.jobTitle || (modalViewMember.role === 'admin' ? 'Administrador Geral' : 'Operador')}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  Utilizador: @{modalViewMember.username} · Nível: {modalViewMember.role === 'admin' ? 'Administrador' : 'Operador'}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
                  {modalViewMember.phone && (
                    <a
                      href={`tel:${modalViewMember.phone}`}
                      className="inline-flex items-center gap-1 text-blue-700 hover:underline font-mono bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-bold"
                    >
                      <Phone size={12} /> {modalViewMember.phone}
                    </a>
                  )}
                  {modalViewMember.whatsapp && (
                    <a
                      href={`https://wa.me/244${String(modalViewMember.whatsapp || modalViewMember.phone).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-mono bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Grid of Information */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <b className="text-[11px] uppercase tracking-wider text-slate-500 block border-b pb-1">
                  Dados Pessoais & Documentação
                </b>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nº de Bilhete (BI):</span>
                    <span className="font-mono font-bold text-slate-800">{modalViewMember.biNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Idade / Nascimento:</span>
                    <span className="font-semibold text-slate-800">
                      {modalViewMember.age ? `${modalViewMember.age} anos` : '—'} 
                      {modalViewMember.birthDate ? ` (${modalViewMember.birthDate})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Género:</span>
                    <span className="font-semibold text-slate-800">{modalViewMember.gender || 'Masculino'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Residência:</span>
                    <span className="font-medium text-slate-800">{modalViewMember.address || 'Golf I, Luanda'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <b className="text-[11px] uppercase tracking-wider text-slate-500 block border-b pb-1">
                  Contactos & Emergência
                </b>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Telefone Principal:</span>
                    <span className="font-mono font-bold text-slate-800">{modalViewMember.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">WhatsApp:</span>
                    <span className="font-mono font-semibold text-slate-800">{modalViewMember.whatsapp || modalViewMember.phone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contacto de Emergência:</span>
                    <span className="font-semibold text-amber-800">{modalViewMember.emergencyContact || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email Corporativo:</span>
                    <span className="font-mono text-slate-800">{modalViewMember.email || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <b className="text-[11px] uppercase tracking-wider text-slate-500 block border-b pb-1">
                  Enquadramento Salarial & Remuneração
                </b>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Salário Base:</span>
                    <b className="font-mono text-emerald-700 font-bold">{kz(modalViewMember.salaryBase || 0)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subsídio de Alimentação:</span>
                    <span className="font-mono text-slate-800">{kz(modalViewMember.foodAllowance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subsídio de Transporte:</span>
                    <span className="font-mono text-slate-800">{kz(modalViewMember.transportAllowance || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="font-bold text-slate-700">Remuneração Bruta:</span>
                    <b className="font-mono text-emerald-800 font-extrabold">
                      {kz(
                        Number(modalViewMember.salaryBase || 0) +
                        Number(modalViewMember.foodAllowance || 0) +
                        Number(modalViewMember.transportAllowance || 0)
                      )}
                    </b>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                <b className="text-[11px] uppercase tracking-wider text-slate-500 block border-b pb-1">
                  Dados Bancários & Vínculo
                </b>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data de Admissão:</span>
                    <span className="font-medium text-slate-800">
                      {modalViewMember.admissionDate ? new Date(modalViewMember.admissionDate).toLocaleDateString('pt-AO') : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipo de Contrato:</span>
                    <span className="font-semibold text-slate-800">{modalViewMember.contractType || 'Efectivo'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">IBAN Bancário Registado:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-800 break-all">
                      {modalViewMember.bankIban || 'Nenhum IBAN cadastrado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dívida Activa / Adiantamentos:</span>
                    <b className="font-mono text-red-600 font-bold">
                      {kz(getTechnicianActiveDebt(modalViewMember.id))}
                    </b>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Task & Schedule */}
            {modalViewMember.currentTask && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                <span className="font-bold text-blue-900 block mb-0.5">Actividade Operacional em Curso:</span>
                <p className="text-blue-800">{modalViewMember.currentTask}</p>
              </div>
            )}

            {Array.isArray(modalViewMember.schedule) && modalViewMember.schedule.length > 0 && (
              <div className="space-y-2">
                <b className="text-xs font-bold text-slate-700 block">
                  Tarefas Agendadas ({modalViewMember.schedule.length})
                </b>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {modalViewMember.schedule.map((task: any, idx: number) => (
                    <div key={task.id || idx} className="p-2 rounded border bg-slate-50 text-xs flex justify-between items-center">
                      <div>
                        <b className="text-slate-900">{task.title}</b>
                        <p className="text-slate-500 text-[11px]">{task.time} · {task.clientName || 'Cliente'} · {task.location}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        task.status === 'concluida' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {task.status || 'pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-3 border-t">
              <div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="text-xs text-red-600 hover:bg-red-50 border-red-200"
                    disabled={modalViewMember.id === currentUser?.id}
                    onClick={() => {
                      if (modalViewMember.id === currentUser?.id) {
                        alert('Não é possível eliminar a sua própria conta.');
                        return;
                      }
                      if (confirm(`Tem a certeza que deseja eliminar permanentemente ${modalViewMember.name}?`)) {
                        deleteUser.mutate(
                          { userId: modalViewMember.id },
                          {
                            onSuccess: () => {
                              qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
                              setModalViewMember(null);
                              alert('Colaborador eliminado com sucesso!');
                            },
                          }
                        );
                      }
                    }}
                  >
                    <Trash2 size={14} /> Eliminar Colaborador
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const u = modalViewMember;
                    setModalViewMember(null);
                    openEditMember(u);
                  }}
                >
                  <Edit size={14} /> Editar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const u = modalViewMember;
                    setModalViewMember(null);
                    setModalAssignTask(u);
                  }}
                >
                  <Plus size={14} /> Atribuir Tarefa
                </Button>
                <Button variant="primary" onClick={() => setModalViewMember(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
