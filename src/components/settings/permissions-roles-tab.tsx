import { useState } from 'react';
import {
  ShieldCheck,
  Users,
  Lock,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Scissors,
  Wrench,
  Sliders,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/shared-ui';

interface PermissionsRolesTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
}

interface RolePermissionDef {
  id: string;
  category: string;
  name: string;
  description: string;
  defaultAdmin: boolean;
  defaultOperador: boolean;
  defaultTecnico: boolean;
  defaultCaixa: boolean;
}

const PERMISSION_DEFINITIONS: RolePermissionDef[] = [
  // Facturação & Finanças
  {
    id: 'emit_invoices',
    category: 'Facturação & Finanças',
    name: 'Emitir Facturas e Recibos',
    description: 'Permite gerar novas cobranças, emitir facturas/recibos e lançar pagamentos.',
    defaultAdmin: true,
    defaultOperador: true,
    defaultTecnico: false,
    defaultCaixa: true,
  },
  {
    id: 'print_pos_a4',
    category: 'Facturação & Finanças',
    name: 'Imprimir Talão POS e Factura A4',
    description: 'Permite descarregar e imprimir documentos em formato térmico 80mm ou folha A4.',
    defaultAdmin: true,
    defaultOperador: true,
    defaultTecnico: false,
    defaultCaixa: true,
  },
  {
    id: 'void_invoices',
    category: 'Facturação & Finanças',
    name: 'Anular Facturas Emitidas',
    description: 'Permite anular documentos fiscais já liquidados (requer motivo de estorno).',
    defaultAdmin: true,
    defaultOperador: false,
    defaultTecnico: false,
    defaultCaixa: false,
  },
  {
    id: 'view_cash_register',
    category: 'Facturação & Finanças',
    name: 'Consultar Caixa e Fecho Diário',
    description: 'Acesso aos totais em dinheiro numerário e Multicaixa arrecadados no dia.',
    defaultAdmin: true,
    defaultOperador: true,
    defaultTecnico: false,
    defaultCaixa: true,
  },
  {
    id: 'view_financial_reports',
    category: 'Facturação & Finanças',
    name: 'Relatórios Executivos & Margem de Lucro',
    description: 'Acesso a balanços, DRE, rentabilidade de planos e mapa mensal de receitas.',
    defaultAdmin: true,
    defaultOperador: false,
    defaultTecnico: false,
    defaultCaixa: false,
  },

  // Clientes & Contratos
  {
    id: 'view_all_clients',
    category: 'Clientes & Assinantes',
    name: 'Visualizar Todos os Assinantes',
    description: 'Consulta da carteira total de clientes de TV e Fibra com histórico e dados.',
    defaultAdmin: true,
    defaultOperador: true,
    defaultTecnico: false,
    defaultCaixa: true,
  },
  {
    id: 'edit_client_details',
    category: 'Clientes & Assinantes',
    name: 'Cadastrar e Editar Clientes',
    description: 'Criar novos contratos, alterar morada, telefone, NIF e planos contratados.',
    defaultAdmin: true,
    defaultOperador: true,
    defaultTecnico: false,
    defaultCaixa: false,
  },
  {
    id: 'grant_payment_promises',
    category: 'Clientes & Assinantes',
    name: 'Aprovar Acordos de Não-Corte',
    description: 'Validar promessas de pagamento submetidas por assinantes em atraso.',
    defaultAdmin: true,
    defaultOperador: true,
    defaultTecnico: false,
    defaultCaixa: false,
  },

  // Operações de Campo & Piquetes
  {
    id: 'execute_field_cuts',
    category: 'Piquete & Campo',
    name: 'Executar Cortes e Religacões',
    description: 'Assinalar cortes físicos no Tap/Divisor de TV ou caixas PDO de fibra.',
    defaultAdmin: true,
    defaultOperador: true,
    defaultTecnico: true,
    defaultCaixa: false,
  },
  {
    id: 'view_assigned_agenda',
    category: 'Piquete & Campo',
    name: 'Agenda & Intervenções Próprias',
    description: 'Visualizar rotas, ordens de serviço e tarefas de campo atribuídas ao seu nome.',
    defaultAdmin: true,
    defaultOperador: true,
    defaultTecnico: true,
    defaultCaixa: false,
  },
  {
    id: 'access_field_materials',
    category: 'Piquete & Campo',
    name: 'Carrinha & Stock Técnico de Campo',
    description: 'Registar uso de bobinas drop, conectores rápidos e verificar medidor óptico dBm.',
    defaultAdmin: true,
    defaultOperador: false,
    defaultTecnico: true,
    defaultCaixa: false,
  },

  // Configurações Globais & Segurança
  {
    id: 'change_system_settings',
    category: 'Sistema & Parâmetros',
    name: 'Modificar Definições Globais do Sistema',
    description: 'Alterar regras de corte, preços, banco, configurações de rede e impressora.',
    defaultAdmin: true,
    defaultOperador: false,
    defaultTecnico: false,
    defaultCaixa: false,
  },
  {
    id: 'manage_staff_users',
    category: 'Sistema & Parâmetros',
    name: 'Gerir Utilizadores e Salários',
    description: 'Criar contas de colaboradores, definir vencimentos, subsídios e aprovar adiantamentos.',
    defaultAdmin: true,
    defaultOperador: false,
    defaultTecnico: false,
    defaultCaixa: false,
  },
];

export function PermissionsRolesTab({ form, set, isAdmin }: PermissionsRolesTabProps) {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'operador' | 'tecnico' | 'caixa'>('tecnico');

  // Permissions state stored in settings form or fallbacks
  const storedPermissions: Record<string, Record<string, boolean>> = form.rolePermissions || {
    admin: {},
    operador: {},
    tecnico: {},
    caixa: {},
  };

  const getPermission = (role: string, permId: string, defaultVal: boolean) => {
    if (storedPermissions[role]?.[permId] !== undefined) {
      return storedPermissions[role][permId];
    }
    return defaultVal;
  };

  const togglePermission = (role: string, permId: string, defaultVal: boolean) => {
    if (!isAdmin) return;
    const current = getPermission(role, permId, defaultVal);
    const updated = {
      ...storedPermissions,
      [role]: {
        ...(storedPermissions[role] || {}),
        [permId]: !current,
      },
    };
    set('rolePermissions', updated);
  };

  const handleResetToDefaults = () => {
    if (!isAdmin) return;
    if (confirm('Deseja repor as permissões padrão recomendadas para todos os perfis?')) {
      const resetObj: Record<string, Record<string, boolean>> = {
        admin: {},
        operador: {},
        tecnico: {},
        caixa: {},
      };
      PERMISSION_DEFINITIONS.forEach((def) => {
        resetObj.admin[def.id] = def.defaultAdmin;
        resetObj.operador[def.id] = def.defaultOperador;
        resetObj.tecnico[def.id] = def.defaultTecnico;
        resetObj.caixa[def.id] = def.defaultCaixa;
      });
      set('rolePermissions', resetObj);
    }
  };

  // Group definitions by category
  const categories = Array.from(new Set(PERMISSION_DEFINITIONS.map((p) => p.category)));

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="eyebrow">Segurança & Controlo de Acesso (RBAC)</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">
                Permissões e Níveis de Acesso por Cargo
              </h2>
            </div>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
              className="text-xs font-bold text-slate-700 hover:bg-slate-100 self-start sm:self-auto"
            >
              <RotateCcw size={13} className="mr-1.5" /> Repor Padrões
            </Button>
          )}
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3 leading-relaxed">
          Configure detalhadamente o que cada colaborador pode ver e fazer no sistema (Web, Aplicativos Executáveis .exe e Aplicativo Mobile da Empresa).
          Garante que os <b>técnicos de campo</b> visualizem estritamente intervenções e rotas sem acesso a dados financeiros ou emissão de facturas, enquanto <b>operadores</b> e <b>administradores</b> mantêm os controlos adequados.
        </p>

        {/* ROLE SELECTOR CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            {
              id: 'tecnico' as const,
              label: 'Técnico de Campo',
              badge: 'Piquete / Ruas',
              color: 'border-amber-400 bg-amber-50/50 text-amber-900',
              icon: Wrench,
              summary: 'Acesso estrito a tarefas, piquetes e rotas.',
            },
            {
              id: 'operador' as const,
              label: 'Operador Comercial',
              badge: 'Atendimento & Caixa',
              color: 'border-blue-400 bg-blue-50/50 text-blue-900',
              icon: Users,
              summary: 'Gestão de clientes, cobrança e facturas.',
            },
            {
              id: 'caixa' as const,
              label: 'Operador de Caixa',
              badge: 'Financeiro Balcão',
              color: 'border-emerald-400 bg-emerald-50/50 text-emerald-900',
              icon: DollarSign,
              summary: 'Recebimento de mensalidades e POS.',
            },
            {
              id: 'admin' as const,
              label: 'Administrador Geral',
              badge: 'Acesso Total',
              color: 'border-purple-400 bg-purple-50/50 text-purple-900',
              icon: ShieldCheck,
              summary: 'Controlo absoluto, parametrização e lucros.',
            },
          ].map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`p-3.5 rounded-xl border-2 text-left transition cursor-pointer relative ${
                  isSelected
                    ? `${role.color} shadow-sm`
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon size={18} className={isSelected ? 'text-blue-700' : 'text-slate-400'} />
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/80 border border-black/10">
                    {role.badge}
                  </span>
                </div>
                <b className="text-xs block text-slate-900">{role.label}</b>
                <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">
                  {role.summary}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* MATRIX OF PERMISSIONS FOR SELECTED ROLE */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Permissões Ativas para: <span className="text-blue-700 uppercase">{selectedRole}</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Clique nos interruptores para conceder ou revogar cada privilégio.
            </span>
          </div>

          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
            {PERMISSION_DEFINITIONS.filter((d) => {
              const defVal =
                selectedRole === 'admin'
                  ? d.defaultAdmin
                  : selectedRole === 'operador'
                  ? d.defaultOperador
                  : selectedRole === 'tecnico'
                  ? d.defaultTecnico
                  : d.defaultCaixa;
              return getPermission(selectedRole, d.id, defVal);
            }).length}{' '}
            / {PERMISSION_DEFINITIONS.length} Permissões Concedidas
          </span>
        </div>

        {categories.map((cat) => (
          <div key={cat} className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {cat}
            </h4>

            <div className="space-y-2">
              {PERMISSION_DEFINITIONS.filter((p) => p.category === cat).map((perm) => {
                const defVal =
                  selectedRole === 'admin'
                    ? perm.defaultAdmin
                    : selectedRole === 'operador'
                    ? perm.defaultOperador
                    : selectedRole === 'tecnico'
                    ? perm.defaultTecnico
                    : perm.defaultCaixa;
                const isEnabled = getPermission(selectedRole, perm.id, defVal);

                return (
                  <div
                    key={perm.id}
                    onClick={() => isAdmin && togglePermission(selectedRole, perm.id, defVal)}
                    className={`flex items-start justify-between gap-4 p-3 rounded-xl border transition ${
                      isAdmin ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isEnabled
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {isEnabled ? (
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-slate-300 shrink-0" />
                        )}
                        <b className="text-xs text-slate-900">{perm.name}</b>
                        {selectedRole === 'tecnico' && perm.id.includes('invoice') && !isEnabled && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Bloqueado no Técnico
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 pl-6 leading-tight">
                        {perm.description}
                      </p>
                    </div>

                    {/* Interactive Toggle Switch */}
                    <div className="pt-0.5 shrink-0">
                      <div
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-200 ${
                          isEnabled ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
