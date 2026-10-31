import { useState } from 'react';
import {
  FileSignature,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Eye,
  Check,
  Copy,
  Lock,
  Sparkles,
  ShieldAlert,
  Info,
  Printer,
  X,
  FileText,
  Wifi,
  Tv,
} from 'lucide-react';
import { Button } from '@/components/shared-ui';
import { type AnyRecord } from '@/lib/local-api';
import { getCompanyLogo } from '@/lib/company-logo';
import {
  DEFAULT_FIBER_CONTRACT_CLAUSES,
  DEFAULT_TV_CONTRACT_CLAUSES,
  resolveContractVariables,
  type ContractClause,
} from '@/lib/contract-templates';

interface ContractTemplateTabProps {
  form: AnyRecord;
  set: (key: string, value: unknown) => void;
  isAdmin: boolean;
}

export function ContractTemplateTab({ form, set, isAdmin }: ContractTemplateTabProps) {
  // Modalidade de Contrato seleccionada no separador: 'fibra' ou 'tv'
  const [selectedService, setSelectedService] = useState<'fibra' | 'tv'>('fibra');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const isFiberTab = selectedService === 'fibra';

  // Chaves do form correspondentes ao tipo selecionado
  const clausesKey = isFiberTab ? 'fiberContractClauses' : 'tvContractClauses';
  const titleKey = isFiberTab ? 'fiberContractTitle' : 'tvContractTitle';
  const introKey = isFiberTab ? 'fiberContractIntro' : 'tvContractIntro';

  // Cláusulas ativas
  const defaultClauses = isFiberTab ? DEFAULT_FIBER_CONTRACT_CLAUSES : DEFAULT_TV_CONTRACT_CLAUSES;
  const rawClauses = form[clausesKey] ?? (isFiberTab ? undefined : form.contractClauses);
  const clauses: ContractClause[] =
    Array.isArray(rawClauses) && rawClauses.length > 0 ? rawClauses : defaultClauses;

  const handleUpdateClause = (index: number, field: 'title' | 'text', value: string) => {
    if (!isAdmin) return;
    const next = [...clauses];
    next[index] = { ...next[index], [field]: value };
    set(clausesKey, next);
    if (!isFiberTab) {
      set('contractClauses', next);
    }
  };

  const handleAddClause = () => {
    if (!isAdmin) return;
    const newClause: ContractClause = {
      id: `cl-${selectedService}-${Date.now()}`,
      title: `Cláusula ${clauses.length + 1}.ª (Nova Condição)`,
      text: 'Insira aqui o texto legal e regulamentar da nova cláusula contratual...',
    };
    const next = [...clauses, newClause];
    set(clausesKey, next);
    if (!isFiberTab) {
      set('contractClauses', next);
    }
  };

  const handleRemoveClause = (index: number) => {
    if (!isAdmin) return;
    if (clauses.length <= 1) {
      alert('O contrato deve conter pelo menos uma cláusula legal.');
      return;
    }
    const next = clauses.filter((_, i) => i !== index);
    set(clausesKey, next);
    if (!isFiberTab) {
      set('contractClauses', next);
    }
  };

  const handleMoveClause = (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clauses.length) return;

    const next = [...clauses];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    set(clausesKey, next);
    if (!isFiberTab) {
      set('contractClauses', next);
    }
  };

  const handleResetDefaults = () => {
    if (!isAdmin) return;
    const serviceName = isFiberTab ? 'Fibra Óptica' : 'TV por Cabo';
    if (
      confirm(
        `Tem a certeza de que deseja restaurar as cláusulas e textos padrão da minuta de ${serviceName}? Todas as edições desta minuta serão reiniciadas para os termos oficiais da OSDEL.`
      )
    ) {
      if (isFiberTab) {
        set('fiberContractTitle', 'Contrato de Adesão · Internet Fibra Óptica (FTTH)');
        set(
          'fiberContractIntro',
          'A OSDEL TECNOLOGIA disponibiliza acesso à Internet de alta performance através de infraestrutura de fibra óptica FTTH, garantindo conectividade estável, alta velocidade e tráfego ilimitado para residências e empresas.'
        );
        set('fiberContractClauses', DEFAULT_FIBER_CONTRACT_CLAUSES);
      } else {
        set('tvContractTitle', 'Termos de Adesão · Televisão Comunitária por Cabo');
        set('contractTitle', 'Termos de Adesão · Televisão Comunitária por Cabo');
        set(
          'tvContractIntro',
          'A TV Comunitária por Cabo da OSDEL TECNOLOGIA é uma rede de distribuição audiovisual voltada à comunidade, transmitindo canais de informação, desporto, novelas, cultura e cinema com estabilidade e proximidade.'
        );
        set(
          'contractIntro',
          'A TV Comunitária por Cabo da OSDEL TECNOLOGIA é uma rede de distribuição audiovisual voltada à comunidade, transmitindo canais de informação, desporto, novelas, cultura e cinema com estabilidade e proximidade.'
        );
        set('tvContractClauses', DEFAULT_TV_CONTRACT_CLAUSES);
        set('contractClauses', DEFAULT_TV_CONTRACT_CLAUSES);
      }
    }
  };

  const copyVariableTag = (tag: string) => {
    navigator.clipboard?.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const tagsList = [
    { tag: '{MENSALIDADE}', label: 'Valor da mensalidade contratada (ex: 12.000 Kz)' },
    { tag: '{DIA_VENCIMENTO}', label: 'Dia limite de liquidação (ex: 5)' },
    { tag: '{DIAS_TOLERANCIA}', label: 'Dias de tolerância antes do corte (ex: 3)' },
    { tag: '{MULTA_ATRASO}', label: 'Valor da multa por atraso (ex: 1.000 Kz)' },
    { tag: '{VALOR_INSTALACAO}', label: 'Taxa de instalação e adesão (ex: 25.000 Kz)' },
    { tag: '{METROS_CABO}', label: 'Metros de cabo incluídos no plano (ex: 30)' },
    { tag: '{PRECO_METRO_EXTRA}', label: 'Preço cobrado por metro adicional (ex: 250 Kz)' },
    { tag: '{VALOR_PONTO_EXTRA}', label: 'Valor do ponto de TV extra (ex: 1.000 Kz)' },
    { tag: '{MESES_SUSPENSAO}', label: 'Meses de atraso para cancelamento definitivo' },
    { tag: '{TAXA_RENOVACAO}', label: 'Taxa para restabelecimento de contrato' },
    { tag: '{TAXA_RELIGACAO}', label: 'Taxa de religação após corte de sinal' },
    { tag: '{PLANO_SERVICO}', label: 'Nome do plano subscrito (ex: Fibra 20 Mbps)' },
    { tag: '{HORARIO_SUPORTE}', label: 'Horário de atendimento oficial e piquete' },
    { tag: '{TELEFONE_SUPORTE}', label: 'Telefone de apoio técnico e emergências' },
    { tag: '{NOME_CLIENTE}', label: 'Nome completo do assinante titular' },
    { tag: '{CODIGO_CLIENTE}', label: 'Código identificador do assinante' },
    { tag: '{BI_CLIENTE}', label: 'Número de Bilhete de Identidade' },
    { tag: '{TELEFONE_CLIENTE}', label: 'Contacto telefónico do assinante' },
    { tag: '{ENDERECO_CLIENTE}', label: 'Endereço e rua da instalação' },
    { tag: '{SERVICO}', label: 'Designação do serviço prestado' },
    { tag: '{EMPRESA}', label: 'Razão social oficial (OSDEL TECNOLOGIA)' },
    { tag: '{NIF}', label: 'Número de Identificação Fiscal' },
  ];

  // Dados simulados para pré-visualização A4
  const mockClient = {
    id: 1,
    fullName: isFiberTab ? 'Eng. Mateus Domingos da Silva' : 'Dona Teresa Garcia dos Santos',
    code: isFiberTab ? 'CLI-FBR-00104' : 'CLI-TV-00892',
    documentNumber: isFiberTab ? '004829104LA041' : '002918451LA039',
    phone: '+244 923 456 789',
    address: 'Rua 12, Casa 45B, Bairro Golf I, Kilamba Kiaxi, Luanda',
    serviceType: isFiberTab ? 'fibra' : 'tv',
    planName: isFiberTab ? 'Plano Fibra Residencial 20 Mbps (Tráfego Ilimitado)' : 'Pacote TV Comunitária Completo (45 Canais)',
    pdoNumber: isFiberTab ? 'CTO-GOLF-04 / Porta 07' : undefined,
    monthlyFee: isFiberTab ? 12000 : 4000,
  };

  return (
    <div className="space-y-6">
      {/* 1. SELETOR DE MODALIDADE DO CONTRATO: FIBRA VS TV */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
          <div>
            <h2 className="text-base font-black text-[hsl(var(--foreground))] flex items-center gap-2">
              <FileSignature className="text-blue-600" size={20} />
              Minutas Contratuais Diferenciadas (Fibra Óptica vs TV por Cabo)
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Defina cláusulas e termos jurídicos distintos e específicos para cada tipo de serviço comercializado.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPreviewModal(true)}
              className="h-9 text-xs font-bold bg-white dark:bg-slate-900 border-slate-300"
            >
              <Eye size={14} className="mr-1.5 text-blue-600" /> Pré-visualizar A4 ({isFiberTab ? 'Fibra' : 'TV'})
            </Button>

            {isAdmin && (
              <Button
                variant="outline"
                onClick={handleResetDefaults}
                className="h-9 text-xs font-bold text-slate-700 dark:text-slate-200 border-slate-300"
                title={`Repor minuta padrão de ${isFiberTab ? 'Fibra' : 'TV'}`}
              >
                <RotateCcw size={13} className="mr-1.5 text-slate-500" /> Repor {isFiberTab ? 'Fibra' : 'TV'}
              </Button>
            )}
          </div>
        </div>

        {/* Abas Alternadoras de Minuta */}
        <div className="grid grid-cols-2 gap-3 max-w-xl">
          <button
            onClick={() => setSelectedService('fibra')}
            className={`flex items-center justify-center gap-2 rounded-xl p-3 border-2 font-bold text-xs transition cursor-pointer ${
              isFiberTab
                ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-200 shadow-sm'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-indigo-300'
            }`}
          >
            <Wifi size={16} className={isFiberTab ? 'text-indigo-600' : 'text-slate-400'} />
            <div className="text-left">
              <span className="block font-black">1. Contrato Internet Fibra</span>
              <span className="text-[10px] font-normal opacity-80">FTTH · Velocidade · ONU Comodato · SLA</span>
            </div>
          </button>

          <button
            onClick={() => setSelectedService('tv')}
            className={`flex items-center justify-center gap-2 rounded-xl p-3 border-2 font-bold text-xs transition cursor-pointer ${
              !isFiberTab
                ? 'border-blue-600 bg-blue-50/80 text-blue-950 dark:bg-blue-950/40 dark:text-blue-200 shadow-sm'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-blue-300'
            }`}
          >
            <Tv size={16} className={!isFiberTab ? 'text-blue-600' : 'text-slate-400'} />
            <div className="text-left">
              <span className="block font-black">2. Contrato TV por Cabo</span>
              <span className="text-[10px] font-normal opacity-80">Cabo Coaxial · Grelha · Pontos TV · Sinal RF</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. CABEÇALHO, TÍTULO E PREÂMBULO DA MINUTA SELECIONADA */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="border-b border-[hsl(var(--border))] pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-[hsl(var(--foreground))] flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded text-white text-xs font-bold ${
                  isFiberTab ? 'bg-indigo-600' : 'bg-blue-600'
                }`}
              >
                {isFiberTab ? 'F' : 'T'}
              </span>
              Título e Preâmbulo Institucional ({isFiberTab ? 'Internet Fibra Óptica' : 'TV por Cabo'})
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Personalize o cabeçalho e texto introdutório que o cliente assinará.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
              isFiberTab
                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
            }`}
          >
            {isFiberTab ? 'Modelo FTTH' : 'Modelo TV Comunitária'}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
              Título Oficial do Contrato
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={
                form[titleKey] ??
                (isFiberTab
                  ? 'Contrato de Adesão · Internet Fibra Óptica (FTTH)'
                  : 'Termos de Adesão · Televisão Comunitária por Cabo')
              }
              onChange={(e) => set(titleKey, e.target.value)}
              placeholder="ex: Contrato de Prestação de Serviços..."
              className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm font-bold text-[hsl(var(--foreground))] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
              Preâmbulo / Introdução Técnica e Institucional
            </label>
            <textarea
              rows={3}
              disabled={!isAdmin}
              value={
                form[introKey] ??
                (isFiberTab
                  ? 'A OSDEL TECNOLOGIA disponibiliza acesso à Internet de alta performance através de infraestrutura de fibra óptica FTTH, garantindo conectividade estável, alta velocidade e tráfego ilimitado para residências e empresas.'
                  : 'A TV Comunitária por Cabo da OSDEL TECNOLOGIA é uma rede de distribuição audiovisual voltada à comunidade, transmitindo canais de informação, desporto, novelas, cultura e cinema com estabilidade e proximidade.')
              }
              onChange={(e) => set(introKey, e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-xs leading-relaxed text-[hsl(var(--foreground))] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* 3. LISTA DE CLÁUSULAS CONTRATUAIS */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
          <div>
            <h3 className="text-sm font-black text-[hsl(var(--foreground))]">
              Cláusulas Oficiais da Minuta ({clauses.length} cláusulas activas)
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Edite, reordene e acrescente novas cláusulas jurídicas para {isFiberTab ? 'Fibra Óptica' : 'TV por Cabo'}.
            </p>
          </div>

          {isAdmin && (
            <Button
              onClick={handleAddClause}
              className={`h-9 text-xs font-bold text-white ${
                isFiberTab ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Plus size={14} className="mr-1.5" /> Adicionar Nova Cláusula
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {clauses.map((clause, index) => (
            <div
              key={clause.id || index}
              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="grid h-6 w-6 place-items-center rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-300">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={clause.title}
                    onChange={(e) => handleUpdateClause(index, 'title', e.target.value)}
                    placeholder="Título da Cláusula..."
                    className="h-8 flex-1 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2.5 text-xs font-extrabold text-[hsl(var(--foreground))] outline-none focus:border-blue-600"
                  />
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveClause(index, 'up')}
                      disabled={index === 0}
                      title="Mover para cima"
                      className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveClause(index, 'down')}
                      disabled={index === clauses.length - 1}
                      title="Mover para baixo"
                      className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveClause(index)}
                      title="Apagar cláusula"
                      className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <textarea
                rows={3}
                disabled={!isAdmin}
                value={clause.text}
                onChange={(e) => handleUpdateClause(index, 'text', e.target.value)}
                placeholder="Texto legal da cláusula..."
                className="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-2.5 text-xs leading-relaxed text-[hsl(var(--foreground))] outline-none focus:border-blue-600 disabled:opacity-60"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 4. DICIONÁRIO DE VARIÁVEIS DINÂMICAS */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-3">
        <div className="border-b border-[hsl(var(--border))] pb-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-[hsl(var(--foreground))] flex items-center gap-2">
            <Sparkles size={14} className="text-blue-600" />
            Variáveis Dinâmicas Disponíveis para os Contratos
          </h3>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
            Clique em qualquer etiqueta abaixo para copiar a tag e inseri-la no texto das cláusulas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {tagsList.map(({ tag, label }) => (
            <button
              key={tag}
              onClick={() => copyVariableTag(tag)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-[11px] font-mono text-[hsl(var(--foreground))] hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition cursor-pointer"
              title={label}
            >
              <span className="font-bold text-blue-600">{tag}</span>
              {copiedTag === tag ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} className="text-slate-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* 5. MODAL DE PRÉ-VISUALIZAÇÃO A4 */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex flex-col max-h-[92vh] w-full max-w-4xl rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Pré-visualização Oficial A4 · {isFiberTab ? 'Contrato Fibra Óptica' : 'Contrato TV por Cabo'}
                </h3>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-6 font-sans text-xs">
              {/* Cabeçalho Oficial */}
              <div className="flex items-start justify-between gap-6 border-b-2 border-[#0b4a8a] pb-6">
                <div className="flex items-center gap-4">
                  <img
                    src={getCompanyLogo(form.logoUrl)}
                    alt="Logo OSDEL"
                    className="h-16 w-16 rounded-xl border-2 border-[#0b4a8a] object-contain p-1 bg-white"
                  />
                  <div>
                    <h1 className="font-serif text-xl font-black text-[#0b4a8a]">
                      {form.companyName || 'OSDEL TECNOLOGIA'}
                    </h1>
                    <p className="text-[11px] font-black uppercase text-[#1e90ff] tracking-wide">
                      {isFiberTab ? 'INTERNET BANDA LARGA FIBRA ÓPTICA (FTTH)' : 'TELEVISÃO COMUNITÁRIA POR CABO'}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600 leading-4">
                      NIF: {form.companyNif || '5600857127'} · Tel: {form.companyPhone || '926 153 736'}
                      <br />
                      {form.companyAddress || 'Rua 12, Golf I, Luanda'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block rounded px-2.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white ${
                      isFiberTab ? 'bg-indigo-700' : 'bg-[#0b4a8a]'
                    }`}
                  >
                    {isFiberTab ? 'CONTRATO · FIBRA ÓPTICA' : 'CONTRATO · TV POR CABO'}
                  </span>
                  <p className="mt-1 font-mono text-base font-black text-[#0b4a8a]">
                    CTR-{isFiberTab ? 'FIBRA' : 'TV'}-00001
                  </p>
                  <p className="text-[10px] text-slate-500">Data: {new Date().toLocaleDateString('pt-AO')}</p>
                </div>
              </div>

              {/* Preâmbulo */}
              <div
                className={`rounded-xl p-3.5 text-xs leading-relaxed border ${
                  isFiberTab
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                    : 'bg-blue-50/70 border-blue-200 text-blue-950'
                }`}
              >
                <span className="font-extrabold uppercase text-[9px] tracking-wider block mb-0.5 text-[#0b4a8a]">
                  Preâmbulo Institucional
                </span>
                {resolveContractVariables(
                  form[introKey] ||
                    (isFiberTab
                      ? 'A OSDEL TECNOLOGIA disponibiliza acesso à Internet de alta performance através de infraestrutura de fibra óptica FTTH, garantindo conectividade estável e alta velocidade.'
                      : 'A TV Comunitária por Cabo da OSDEL TECNOLOGIA é uma rede de distribuição audiovisual voltada à comunidade.'),
                  mockClient,
                  form,
                  mockClient.serviceType
                )}
              </div>

              <h2 className="text-center text-base font-black uppercase tracking-wider text-[#0b4a8a]">
                {form[titleKey] || (isFiberTab ? 'Contrato de Adesão · Internet Fibra' : 'Termos de Adesão · TV por Cabo')}
              </h2>

              {/* Identificação & Especificações */}
              <div className="grid gap-3 rounded-xl border border-slate-300 bg-slate-50/50 p-3.5 sm:grid-cols-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Assinante Titular</p>
                  <p className="mt-0.5 text-xs font-black text-slate-900">{mockClient.fullName}</p>
                  <p className="text-[10px] text-slate-600">Código: <b>{mockClient.code}</b> · BI: {mockClient.documentNumber}</p>
                  <p className="text-[10px] text-slate-600">Tel: {mockClient.phone} · Morada: {mockClient.address}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {isFiberTab ? 'Parâmetros Técnicos Fibra' : 'Parâmetros Técnicos TV'}
                  </p>
                  <p className="mt-0.5 text-xs font-black text-[#0b4a8a]">{mockClient.planName}</p>
                  <p className="text-[10px] text-slate-600">
                    Mensalidade: <b>{mockClient.monthlyFee.toLocaleString('pt-AO')} Kz</b> · Vencimento: dia {form.paymentDueDay || 5}
                  </p>
                  {isFiberTab ? (
                    <p className="text-[10px] text-slate-500">Porta CTO: {mockClient.pdoNumber} · ONU GPON Comodato</p>
                  ) : (
                    <p className="text-[10px] text-slate-500">Cabo Coaxial RG6 · 1 Ponto Principal · Sinal DVB-C</p>
                  )}
                </div>
              </div>

              {/* Cláusulas */}
              <div className="space-y-2.5">
                {clauses.map((clause, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5">
                    <span className="font-extrabold text-[#0b4a8a] block text-[11px] mb-0.5">
                      {clause.title}
                    </span>
                    <p className="text-slate-700 text-[11px] leading-relaxed">
                      {resolveContractVariables(clause.text, mockClient, form, mockClient.serviceType)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Assinaturas */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-900">Assinatura do Assinante</b>
                  <span className="text-[10px] text-slate-500">{mockClient.fullName}</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2" />
                  <b className="block text-slate-900">Pela Direcção da OSDEL TECNOLOGIA</b>
                  <span className="text-[10px] text-slate-500">Carimbo e Assinatura Oficial</span>
                </div>
              </div>
            </div>

            <footer className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
                className="h-8 text-xs font-bold"
              >
                Fechar Pré-visualização
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
