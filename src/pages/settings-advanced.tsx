import { useState, useEffect, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Receipt,
  Radio,
  Clock,
  MessageSquare,
  ShieldCheck,
  Search,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Users,
  Printer,
  FileSignature,
  FileText,
  Smartphone,
  Database,
} from 'lucide-react';
import { Button } from '@/components/shared-ui';
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
  session,
  type AnyRecord,
} from '@/lib/local-api';
import { isSuperAdmin } from '@/lib/permissions';

import { CompanyPricingTab } from '@/components/settings/company-pricing-tab';
import { BillingRulesTab } from '@/components/settings/billing-rules-tab';
import { NetworkFtthTab } from '@/components/settings/network-ftth-tab';
import { FieldTeamSlaTab } from '@/components/settings/field-team-sla-tab';
import { CommunicationsTab } from '@/components/settings/communications-tab';
import { SecurityFiscalDataTab } from '@/components/settings/security-fiscal-data-tab';
import { SoftwareLicensingTab } from '@/components/settings/software-licensing-tab';
import { PermissionsRolesTab } from '@/components/settings/permissions-roles-tab';
import { ThermalPrinterTab } from '@/components/settings/thermal-printer-tab';
import { ContractTemplateTab } from '@/components/settings/contract-template-tab';
import { InvoiceTemplateTab } from '@/components/settings/invoice-template-tab';
import { ClientApkTab } from '@/components/settings/client-apk-tab';
import { IndexedDbStorageTab } from '@/components/settings/indexeddb-storage-tab';

export function SettingsAdvancedPage() {
  const settingsQuery = useGetSettings();
  const update = useUpdateSettings();
  const queryClient = useQueryClient();
  const currentUser = session();
  const isSuper = isSuperAdmin(currentUser);
  const isAdminNormal = currentUser?.role === 'admin' || currentUser?.role === 'boss';

  const [form, setForm] = useState<AnyRecord>();
  const [activeTab, setActiveTab] = useState('empresa-precos');

  // O Super Admin (deezy) pode alterar tudo sem excepção.
  // O Administrador normal pode alterar apenas itens básicos operacionais (impressora térmica, modelos e SLAs).
  // Não pode mexer em permissões, colaboradores, fiscalidade, licenciamento, coordenadas do APK ou dados estruturais da empresa.
  // Demais perfis (operadores, técnicos) apenas visualizam em modo leitura.
  const isBasicTab = ['impressora-termica', 'piquete-sla', 'texto-contrato', 'texto-factura'].includes(activeTab);
  const canEditCurrentTab = isSuper || (isAdminNormal && isBasicTab);
  const isAdmin = canEditCurrentTab;
  const [searchQuery, setSearchQuery] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) {
      setForm((prev: any) => {
        if (prev && isDirty) return prev;
        return {
          ...settingsQuery.data,
          internetPlans: settingsQuery.data.internetPlans || [],
          bankAccounts: settingsQuery.data.bankAccounts || [
            {
              name: 'Banco BAI',
              iban: 'AO06.0040.0000.1234.5678.9012.3',
              account: '12345678/10/001',
              holder: settingsQuery.data.companyName || 'OSDEL TECNOLOGIA',
            },
            {
              name: 'Banco BFA',
              iban: 'AO06.0006.0000.9876.5432.1098.7',
              account: '98765432/01/001',
              holder: settingsQuery.data.companyName || 'OSDEL TECNOLOGIA',
            },
          ],
        };
      });
    }
  }, [settingsQuery.data, isDirty]);

  if (settingsQuery.isLoading || !form) {
    return (
      <div className="surface rounded-2xl p-12 text-center border border-[hsl(var(--border))]">
        <RefreshCw className="animate-spin mx-auto h-8 w-8 text-blue-600 mb-3" />
        <p className="text-sm font-bold text-slate-700">A carregar definições do sistema OSDEL...</p>
      </div>
    );
  }

  const set = (key: string, value: unknown) => {
    if (!isAdmin) return;
    setIsDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!canEditCurrentTab) {
      if (isAdminNormal && !isBasicTab) {
        alert('Acesso Restrito: Como Administrador padrão, só pode alterar itens básicos operacionais (Impressora Térmica, Textos e SLAs). Permissões, Fiscalidade, Licenciamento, Dados da Empresa e APK só podem ser alterados pelo Super Administrador (deezy).');
      } else {
        alert('Modo Somente Leitura: Pode consultar todas as definições, mas não tem permissão para alterar nada.');
      }
      return;
    }

    update.mutate(
      { data: form },
      {
        onSuccess: (updatedSettings: any) => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          setIsDirty(false);
          setSavedToast(true);
          setTimeout(() => setSavedToast(false), 3500);

          // Sincronização imediata com todos os dispositivos, Electron e APKs
          try {
            const dataToSync = updatedSettings || form;
            localStorage.setItem('osdel_company_settings', JSON.stringify(dataToSync));
            localStorage.setItem('osdel_settings', JSON.stringify(dataToSync));
            window.dispatchEvent(new CustomEvent('osdel-template-updated', { detail: dataToSync }));
            window.dispatchEvent(new CustomEvent('osdel-settings-updated', { detail: dataToSync }));

            if (typeof BroadcastChannel !== 'undefined') {
              const bc = new BroadcastChannel('osdel_sync_channel');
              bc.postMessage({
                type: 'TEMPLATE_UPDATED',
                settings: dataToSync,
                timestamp: Date.now(),
              });
              bc.close();
            }
          } catch (e) {
            console.warn('Broadcast sync notice:', e);
          }
        },
        onError: (err: any) => {
          alert(`Erro ao guardar: ${err.message || 'Erro desconhecido'}`);
        },
      },
    );
  };

  const tabs = [
    {
      id: 'empresa-precos',
      label: 'Identidade & Preços',
      badge: 'Geral',
      icon: Building2,
      description: 'Nome, NIF, logótipo, TV base, pacotes de canais e planos de fibra.',
    },
    {
      id: 'cobranca-bancos',
      label: 'Cobrança & Bancos',
      badge: 'Financeiro',
      icon: Receipt,
      description: 'Prazos de vencimento, tolerância, taxas, acordos de dívida e contas bancárias.',
    },
    {
      id: 'texto-contrato',
      label: 'Texto do Contrato',
      badge: 'Minuta Legal',
      icon: FileSignature,
      description: 'Edição de cláusulas legais, preâmbulo, título e condições gerais de adesão por Administrador.',
    },
    {
      id: 'texto-factura',
      label: 'Textos da Factura',
      badge: 'Fiscal & POS',
      icon: FileText,
      description: 'Títulos, menções legais de isenção de IVA, descritivo padrão, notas bancárias e rodapé por Administrador.',
    },
    {
      id: 'rede-ftth',
      label: 'Rede FTTH & TV',
      badge: 'Telecom / NOC',
      icon: Radio,
      description: 'Mikrotik PPPoE, OLT GPON, faixas de IP, potência óptica RX e zonas cobertas.',
    },
    {
      id: 'piquete-sla',
      label: 'Piquete & SLAs',
      badge: 'Campo',
      icon: Clock,
      description: 'Prazos de atendimento, reparação, subsídios técnicos e checklist de entrega.',
    },
    {
      id: 'comunicacoes',
      label: 'Mensagens & SMS',
      badge: 'Automação',
      icon: MessageSquare,
      description: 'Gateway de SMS, WhatsApp, simulador de ecrã e modelos de notificação.',
    },
    {
      id: 'seguranca-fiscal',
      label: 'Fiscalidade & Segurança',
      badge: 'Auditoria',
      icon: ShieldCheck,
      description: 'Certificação AGT, faturas, políticas de sessão, logs e cópia de segurança JSON.',
    },
    {
      id: 'permissoes-papeis',
      label: 'Perfis & Permissões',
      badge: 'RBAC',
      icon: Users,
      description: 'Controlo estrito de privilégios para Técnico, Operador, Admin e Caixa.',
    },
    {
      id: 'apk-controle',
      label: 'App do Cliente (APK)',
      badge: 'Mobile / IBANs',
      icon: Smartphone,
      description: 'Controlo dos IBANs bancários (BAI, BFA, Atlântico), Entidade MCX, WhatsApp e comunicados exibidos no APK do cliente.',
    },
    {
      id: 'impressora-termica',
      label: 'Impressão & POS',
      badge: 'Térmica',
      icon: Printer,
      description: 'Largura 80mm/58mm, logótipo, corte automático de talão e rodapé.',
    },
    {
      id: 'licenciamento',
      label: 'Software & Licença',
      badge: 'Gestão X',
      icon: ShieldCheck,
      description: 'Chave de ativação, titular da licença e portal comercial do distribuidor.',
    },
    {
      id: 'indexeddb-storage',
      label: 'Banco IndexedDB',
      badge: '+100k Dados',
      icon: Database,
      description: 'Motor de persistência de alta capacidade (supera o teto de 5MB do LocalStorage para gerir mais de 10.000 clientes sem restrições de cota).',
    },
  ];

  // Quick search matching tabs
  const filteredTabs = tabs.filter((t) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.label.toLowerCase().includes(query) ||
      t.badge.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 pb-20">
      {/* CABEÇALHO PRINCIPAL COM STATUS E ACÇÕES */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="eyebrow">Administração & Parâmetros Globais</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                OSDEL v2.4-AO
              </span>
              {isSuper ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 flex items-center gap-1 shadow-xs">
                  <Sparkles size={12} className="text-purple-500" /> Super Admin Supremo (deezy - Acesso Total e Irrestrito)
                </span>
              ) : isAdminNormal ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Admin Operacional (Edição de Parâmetros Básicos)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 flex items-center gap-1">
                  <Lock size={12} /> Modo Somente Leitura (Consulta sem permissão de alteração)
                </span>
              )}
            </div>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
              Definições do Sistema
            </h1>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              Parametrização completa da OSDEL Tecnologia: telecomunicações FTTH, TV comunitária, políticas financeiras, fiscalidade e auditoria.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5 animate-pulse">
                <AlertTriangle size={14} /> Alterações não guardadas
              </span>
            )}

            {isAdmin && (
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={update.isPending}
                className="px-5 shadow-sm"
              >
                {update.isPending ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> A guardar...
                  </>
                ) : (
                  <>
                    <Save size={15} /> Guardar Definições
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* BARRA DE PESQUISA RÁPIDA NAS DEFINIÇÕES */}
        <div className="mt-5 pt-4 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Localizar secção (ex: OLT, Mikrotik, IBAN, Multa, AGT, SMS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="text-[11px] text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-2">
            <SlidersHorizontal size={13} /> {tabs.length} Módulos de Configuração Globais
          </div>
        </div>
      </div>

      {/* TOAST DE SUCESSO AO GUARDAR */}
      {savedToast && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>Todas as definições da OSDEL Tecnologia foram guardadas e propagadas no sistema com sucesso!</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedToast(false)}
            className="text-white/80 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* NAVEGAÇÃO POR ABAS (TABS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {filteredTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer relative ${
                isActive
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                  : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary)/.5)]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Icon
                  size={18}
                  className={isActive ? 'text-blue-600' : 'text-[hsl(var(--muted-foreground))]'}
                />
                <span
                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.badge}
                </span>
              </div>
              <span
                className={`text-xs font-bold leading-tight ${
                  isActive ? 'text-blue-950' : 'text-[hsl(var(--foreground))]'
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* CONTEÚDO DA ABA SELECCIONADA */}
      <div
        className="space-y-6"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            const target = e.target as HTMLElement;
            // Don't intercept Enter inside any child form or button
            if (!target.closest('form') && target.tagName === 'INPUT') {
              e.preventDefault();
              handleSave();
            }
          }
        }}
      >
        {activeTab === 'empresa-precos' && (
          <CompanyPricingTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'cobranca-bancos' && (
          <BillingRulesTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'texto-contrato' && (
          <ContractTemplateTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'texto-factura' && (
          <InvoiceTemplateTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'rede-ftth' && (
          <NetworkFtthTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'piquete-sla' && (
          <FieldTeamSlaTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'comunicacoes' && (
          <CommunicationsTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'seguranca-fiscal' && (
          <SecurityFiscalDataTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'permissoes-papeis' && (
          <PermissionsRolesTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'apk-controle' && (
          <ClientApkTab form={form} set={set} isAdmin={isAdmin} isSuperAdmin={isSuper} />
        )}

        {activeTab === 'impressora-termica' && (
          <ThermalPrinterTab form={form} set={set} isAdmin={isAdmin} />
        )}

        {activeTab === 'licenciamento' && (
          <SoftwareLicensingTab />
        )}

        {activeTab === 'indexeddb-storage' && (
          <IndexedDbStorageTab isAdmin={isAdmin} />
        )}

        {/* BARRA FIXA FLUTUANTE DE GRAVAÇÃO (CASO HAJA ALTERAÇÕES) */}
        {isDirty && isAdmin && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            <span className="text-xs font-bold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
              Tem alterações pendentes
            </span>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={update.isPending}
              className="h-8 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-500"
            >
              {update.isPending ? 'A gravar...' : 'Guardar Agora'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
