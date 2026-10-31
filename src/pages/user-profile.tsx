import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Calendar,
  Camera,
  Check,
  Clock,
  DollarSign,
  Edit,
  Eye,
  EyeOff,
  FolderUp,
  IdCard,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Smartphone,
  UploadCloud,
  User,
  UserCheck,
  CreditCard,
  Landmark,
  Plus,
} from 'lucide-react';
import {
  session,
  signOut,
  useListUsers,
  useUpdateUser,
  useUpdateUserWorkStatus,
  getListUsersQueryKey,
} from '@/lib/local-api';
import { Button, Field, Input, Select, Textarea, Badge, Modal, PageHeader, kz, date } from '@/components/shared-ui';
import { ProfilePhotoUploader, AvatarWithQuickUpload } from '@/components/profile-photo-uploader';
import { BankAccountsManager } from '@/components/bank-accounts-manager';
import { type BankAccountRecord, getBankByIban } from '@/lib/banking';

export function UserProfilePage() {
  const qc = useQueryClient();
  const currentSession = session();
  const usersQuery = useListUsers();
  const updateUser = useUpdateUser();
  const updateWorkStatus = useUpdateUserWorkStatus();

  const users: any[] = (Array.isArray(usersQuery.data) ? usersQuery.data : usersQuery.data?.items) || [];
  // Find current user object from database or fallback to session
  const currentUser = users.find((u) => u.id === currentSession?.id || u.username === currentSession?.username) || currentSession;

  const [modalEditProfile, setModalEditProfile] = useState(false);
  const [modalChangePass, setModalChangePass] = useState(false);
  const [modalUploadPhoto, setModalUploadPhoto] = useState(false);
  const [modalManageBanks, setModalManageBanks] = useState(false);
  const [photoDraft, setPhotoDraft] = useState(currentUser?.photoUrl || '');

  // User's multiple bank accounts
  const [userBankAccounts, setUserBankAccounts] = useState<BankAccountRecord[]>(() => {
    if (currentUser?.bankAccounts && Array.isArray(currentUser.bankAccounts)) {
      return currentUser.bankAccounts;
    }
    if (currentUser?.bankIban) {
      const bank = getBankByIban(currentUser.bankIban);
      return [
        {
          id: 'acc-user-1',
          bankCode: bank?.code || '0040',
          bankName: bank?.name || 'Banco BAI',
          accountHolder: currentUser.name || 'Titular',
          iban: currentUser.bankIban,
          accountType: 'salario',
          isDefault: true,
        },
      ];
    }
    return [
      {
        id: 'acc-user-bai',
        bankCode: '0040',
        bankName: 'Banco Angolano de Investimentos (BAI)',
        accountHolder: currentUser?.name || 'Colaborador OSDEL',
        iban: 'AO06.0040.0000.8392.1029.3012.4',
        accountType: 'salario',
        isDefault: true,
      },
    ];
  });

  // Edit profile form
  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    whatsapp: currentUser?.whatsapp || '',
    emergencyContact: currentUser?.emergencyContact || '',
    email: currentUser?.email || '',
    address: currentUser?.address || '',
    photoUrl: currentUser?.photoUrl || '',
    age: currentUser?.age || 28,
    biNumber: currentUser?.biNumber || '',
    currentTask: currentUser?.currentTask || '',
  });

  const handleSavePhotoDirectly = (newPhoto: string) => {
    if (!currentUser?.id) return;
    updateUser.mutate(
      {
        userId: currentUser.id,
        data: {
          photoUrl: newPhoto,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setModalUploadPhoto(false);
          setProfileForm((prev) => ({ ...prev, photoUrl: newPhoto }));
        },
      },
    );
  };

  // Password form
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleUpdateProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    updateUser.mutate(
      {
        userId: currentUser.id,
        data: {
          ...profileForm,
          age: Number(profileForm.age),
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setModalEditProfile(false);
          alert('Dados do perfil atualizados com sucesso!');
        },
      },
    );
  };

  const handleChangePassword = (e: FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      alert('A nova palavra-passe e a confirmação não coincidem.');
      return;
    }
    if (passForm.newPassword.length < 4) {
      alert('A palavra-passe deve ter pelo menos 4 caracteres.');
      return;
    }
    if (!currentUser?.id) return;

    updateUser.mutate(
      {
        userId: currentUser.id,
        data: {
          password: passForm.newPassword,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setModalChangePass(false);
          setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          alert('Palavra-passe alterada com sucesso!');
        },
      },
    );
  };

  const handleStatusChange = (newStatus: any) => {
    if (!currentUser?.id) return;
    updateWorkStatus.mutate(
      {
        userId: currentUser.id,
        workStatus: newStatus,
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
      },
    );
  };

  const totalGrossSalary =
    Number(currentUser?.salaryBase || 0) +
    Number(currentUser?.foodAllowance || 0) +
    Number(currentUser?.transportAllowance || 0);

  return (
    <div className="space-y-7 max-w-5xl">
      <PageHeader
        eyebrow="A Minha Conta & Identidade"
        title="Perfil do Utilizador"
        detail="Os seus dados cadastrais, cargo, remuneração, credenciais de acesso e estado de serviço na OSDEL."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.05)] font-bold"
              onClick={() => {
                setPhotoDraft(currentUser?.photoUrl || '');
                setModalUploadPhoto(true);
              }}
            >
              <Camera size={16} /> Importar Foto do Dispositivo
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setProfileForm({
                  name: currentUser?.name || '',
                  phone: currentUser?.phone || '',
                  whatsapp: currentUser?.whatsapp || '',
                  emergencyContact: currentUser?.emergencyContact || '',
                  email: currentUser?.email || '',
                  address: currentUser?.address || '',
                  photoUrl: currentUser?.photoUrl || '',
                  age: currentUser?.age || 28,
                  biNumber: currentUser?.biNumber || '',
                  currentTask: currentUser?.currentTask || '',
                });
                setModalEditProfile(true);
              }}
            >
              <Edit size={16} /> Editar Dados
            </Button>
            <Button variant="outline" onClick={() => setModalChangePass(true)}>
              <KeyRound size={16} /> Alterar Senha
            </Button>
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50"
              onClick={() => {
                signOut();
                window.location.href = '/login';
              }}
            >
              <LogOut size={16} /> Terminar Sessão
            </Button>
          </div>
        }
      />

      {/* Main Identity Banner */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-[hsl(var(--border))] pb-6">
          <div className="flex items-center gap-5">
            <AvatarWithQuickUpload
              photoUrl={currentUser?.photoUrl}
              name={currentUser?.name}
              size="xl"
              onPhotoUploaded={(newPhoto) => handleSavePhotoDirectly(newPhoto)}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold text-slate-900">{currentUser?.name || 'Utilizador OSDEL'}</h2>
                <Badge tone={currentUser?.role === 'admin' ? 'good' : 'neutral'}>
                  {currentUser?.role === 'admin' ? 'Administrador Geral' : 'Operador'}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-[hsl(var(--primary))] mt-1">
                {currentUser?.jobTitle || 'Colaborador OSDEL'} · {currentUser?.department || 'Operações'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Nome de Utilizador: <b className="text-slate-600 font-mono">@{currentUser?.username || 'utilizador'}</b> · Contrato: {currentUser?.contractType || 'Efectivo'}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDraft(currentUser?.photoUrl || '');
                    setModalUploadPhoto(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--primary))] font-bold hover:underline"
                >
                  <Camera size={13} />
                  Alterar fotografia a partir do dispositivo
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Work Status Selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs w-full sm:w-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              O Seu Estado Operacional Agora:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'disponivel', label: 'Disponível', color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { id: 'em_campo', label: 'Em Campo', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { id: 'em_deslocacao', label: 'Em Deslocação', color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { id: 'em_pausa', label: 'Em Pausa', color: 'text-slate-700 bg-slate-100 border-slate-200' },
              ].map((st) => (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => handleStatusChange(st.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                    (currentUser?.workStatus || 'disponivel') === st.id
                      ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] shadow-sm'
                      : `${st.color} hover:brightness-95`
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-xs">
          {/* Personal Data */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <h3 className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User size={14} /> Dados Pessoais & Registo
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Nº de Bilhete (BI):</span>
                <b className="font-mono text-slate-800">{currentUser?.biNumber || '004829104LA042'}</b>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Idade / Nascimento:</span>
                <b className="text-slate-800">{currentUser?.age || 28} anos ({currentUser?.birthDate || '1996-05-12'})</b>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Género:</span>
                <b className="text-slate-800">{currentUser?.gender || 'Masculino'}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Morada Residencial:</span>
                <b className="text-slate-800 text-right">{currentUser?.address || 'Golf I, Luanda'}</b>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <h3 className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Phone size={14} /> Contactos Directos
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Telefone Principal:</span>
                <b className="font-mono text-slate-800">{currentUser?.phone || '+244 923 102 938'}</b>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">WhatsApp Profissional:</span>
                <b className="font-mono text-slate-800">{currentUser?.whatsapp || '+244 923 102 938'}</b>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Email Corporativo:</span>
                <b className="text-slate-800">{currentUser?.email || `${currentUser?.username || 'user'}@osdeltecnologia.ao`}</b>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Contacto de Emergência:</span>
                <b className="text-slate-800">{currentUser?.emergencyContact || '+244 912 000 111 (Familiar)'}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data de Admissão:</span>
                <b className="text-slate-800">{date(currentUser?.admissionDate || '2023-01-15')}</b>
              </div>
            </div>
          </div>

          {/* Financial & Contractual Details */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <h3 className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign size={14} /> Remuneração & Benefícios
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Salário Base Mensal:</span>
                <b className="font-mono text-slate-800">{kz(currentUser?.salaryBase || 150000)}</b>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Subs. Alimentação:</span>
                <b className="font-mono text-slate-800">{kz(currentUser?.foodAllowance || 30000)}</b>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Subs. Transporte:</span>
                <b className="font-mono text-slate-800">{kz(currentUser?.transportAllowance || 25000)}</b>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-bold text-slate-800">Total Ilíquido:</span>
                <b className="font-mono text-sm font-extrabold text-emerald-700">{kz(totalGrossSalary || 205000)}</b>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details & Task Status */}
        <div className="mt-4 grid gap-4 md:grid-cols-2 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Landmark size={14} className="text-[hsl(var(--primary))]" />
                <span className="text-slate-500 uppercase font-bold text-[10px]">
                  Contas Bancárias ({userBankAccounts.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalManageBanks(true)}
                className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Gerir Contas
              </button>
            </div>

            <div className="space-y-2">
              {userBankAccounts.map((acc) => (
                <div key={acc.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <b className="text-slate-900 text-[11px]">{acc.bankName}</b>
                      {acc.isDefault && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold">
                          Salário
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 block">{acc.iban}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize">{acc.accountType}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-slate-400 uppercase font-bold text-[10px] block">Tarefa Operacional em Curso</span>
            <p className="mt-1 font-bold text-slate-800 text-sm">
              {currentUser?.currentTask || 'Atendimento ao público e supervisão geral do sistema de clientes OSDEL.'}
            </p>
          </div>
        </div>
      </div>

      {/* Personal Agenda / Today's Schedule */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <div className="flex items-center gap-3">
            <Calendar className="text-[hsl(var(--primary))]" size={20} />
            <div>
              <h3 className="text-base font-bold text-slate-900">A Minha Agenda & Intervenções de Hoje</h3>
              <p className="text-xs text-slate-500">Lista de compromissos e ordens atribuídas ao seu utilizador.</p>
            </div>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full">
            {Array.isArray(currentUser?.schedule) ? currentUser.schedule.length : 0} Tarefas
          </span>
        </div>

        {Array.isArray(currentUser?.schedule) && currentUser.schedule.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentUser.schedule.map((item: any, idx: number) => (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-700">{item.time}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                    {item.priority}
                  </span>
                </div>
                <b className="block text-slate-900 font-bold">{item.title}</b>
                <div className="text-slate-500 space-y-0.5 text-[11px]">
                  <p className="flex items-center gap-1.5">
                    <User size={12} /> {item.clientName || 'Geral'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin size={12} /> {item.location || 'Bairro Golf I'}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Status: {item.status === 'concluida' ? 'Concluída ✅' : 'Em Curso ⏱️'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-3">
            Nenhuma tarefa agendada para hoje. O seu estado actual é "Disponível".
          </p>
        )}
      </div>

      {/* MODAL: EDITAR PERFIL */}
      {modalEditProfile && (
        <Modal
          title="Editar Dados do Meu Perfil"
          eyebrow="Dados Pessoais"
          onClose={() => setModalEditProfile(false)}
        >
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Field label="Nome Completo *">
              <Input
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nº de Bilhete (BI)">
                <Input
                  value={profileForm.biNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, biNumber: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Idade">
                <Input
                  type="number"
                  value={profileForm.age}
                  onChange={(e) => setProfileForm({ ...profileForm, age: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefone Principal *">
                <Input
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </Field>
              <Field label="WhatsApp">
                <Input
                  value={profileForm.whatsapp}
                  onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="E-mail Institucional">
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                />
              </Field>
              <Field label="Contacto de Emergência (Nome & Tel)">
                <Input
                  value={profileForm.emergencyContact}
                  onChange={(e) => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                  placeholder="Ex: Esposa (+244 912 345 678)"
                />
              </Field>
            </div>

            <Field label="Endereço Residencial">
              <Input
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              />
            </Field>

            <ProfilePhotoUploader
              currentPhotoUrl={profileForm.photoUrl}
              onChange={(newUrl) => setProfileForm({ ...profileForm, photoUrl: newUrl })}
              label="Foto de Perfil (Carregar do Dispositivo ou URL)"
              hint="Importe uma foto tirada pelo seu telemóvel ou guardada no computador. O sistema corta em formato quadrado e otimiza a imagem automaticamente."
            />

            <Field label="Tarefa Actual em Curso">
              <Input
                value={profileForm.currentTask}
                onChange={(e) => setProfileForm({ ...profileForm, currentTask: e.target.value })}
                placeholder="Descreva o que está a fazer no momento..."
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setModalEditProfile(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Save size={16} /> Guardar Alterações
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL DEDICADO: IMPORTAR FOTO A PARTIR DO DISPOSITIVO */}
      {modalUploadPhoto && (
        <Modal
          title="Importar Foto a partir do Dispositivo"
          eyebrow="Identidade do Colaborador"
          onClose={() => setModalUploadPhoto(false)}
        >
          <div className="space-y-5">
            <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <UploadCloud className="shrink-0 text-blue-600 mt-0.5" size={18} />
              <div>
                <p className="font-bold">Carregamento directo a partir deste equipamento:</p>
                <p className="text-blue-700 mt-0.5">
                  Seleccione uma fotografia a partir do seu disco local, telemóvel ou tire uma nova fotografia usando a câmara integrada. A imagem será enquadrada e otimizada automaticamente para o seu perfil.
                </p>
              </div>
            </div>

            <ProfilePhotoUploader
              currentPhotoUrl={photoDraft}
              onChange={(newUrl) => setPhotoDraft(newUrl)}
              label="Selecione ou Arraste a Fotografia"
              hint="Formatos suportados: PNG, JPG ou WebP. A foto é convertida para proporção quadrada de avatar."
            />

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setModalUploadPhoto(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  handleSavePhotoDirectly(photoDraft);
                }}
              >
                <Check size={16} /> Gravar Fotografia no Perfil
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: ALTERAR SENHA */}
      {modalChangePass && (
        <Modal
          title="Alterar Palavra-passe de Acesso"
          eyebrow="Segurança"
          onClose={() => setModalChangePass(false)}
        >
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Field label="Nova Palavra-passe *">
              <Input
                required
                type="password"
                value={passForm.newPassword}
                onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                placeholder="Mínimo de 4 caracteres"
              />
            </Field>

            <Field label="Confirmar Nova Palavra-passe *">
              <Input
                required
                type="password"
                value={passForm.confirmPassword}
                onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                placeholder="Repita a nova palavra-passe"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setModalChangePass(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <KeyRound size={16} /> Gravar Nova Senha
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: GERIR CONTAS BANCÁRIAS (MÚLTIPLOS BANCOS) */}
      {modalManageBanks && (
        <Modal
          title="Gestão de Contas Bancárias & IBAN"
          eyebrow="Finanças Pessoais & Salário"
          onClose={() => setModalManageBanks(false)}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Adicione e seleccione as suas contas bancárias em Angola (BAI, BFA, BIC, Sol, Atlântico, etc.) para recepção do salário mensal e benefícios. Pode designar qual é a sua conta preferencial.
            </p>

            <BankAccountsManager
              accounts={userBankAccounts}
              defaultHolderName={currentUser?.name || 'Colaborador OSDEL'}
              isCompany={false}
              onChange={(updatedAccounts) => {
                setUserBankAccounts(updatedAccounts);
                const defaultAcc = updatedAccounts.find((a) => a.isDefault) || updatedAccounts[0];
                if (currentUser?.id) {
                  updateUser.mutate({
                    userId: currentUser.id,
                    data: {
                      bankAccounts: updatedAccounts,
                      bankIban: defaultAcc ? defaultAcc.iban : '',
                    },
                  });
                  qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
                }
              }}
            />

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setModalManageBanks(false)}>
                <Check size={16} /> Concluir
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
