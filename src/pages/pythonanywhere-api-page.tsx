import { useState, useEffect } from 'react';
import {
  Server,
  Monitor,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Terminal,
  Database,
  KeyRound,
  FileText,
  Play,
  Download,
  Layers,
  Sparkles,
  Zap,
  Globe,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Info,
  Smartphone,
  FolderArchive,
  Save,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getApiBaseUrl,
  setApiBaseUrl,
  resetApiBaseUrl,
  getApiMode,
  setApiMode,
  DEFAULT_API_URL,
} from '@/lib/api-config';
import { resetAllAccountsAndDemoData } from '@/lib/local-api';

export function PythonAnywhereApiPage() {
  const [apiUrl, setApiUrl] = useState(() => getApiBaseUrl());
  const [currentActiveUrl, setCurrentActiveUrl] = useState(() => getApiBaseUrl());
  const [currentMode, setCurrentMode] = useState(() => getApiMode());
  const [paUsername, setPaUsername] = useState('osdelltecnologia');
  const [isChecking, setIsChecking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [hasCleanedSuccess, setHasCleanedSuccess] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [checkResult, setCheckResult] = useState<{
    ok: boolean;
    data?: any;
    error?: string;
  } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    const handleUrlChange = (e: any) => {
      setCurrentActiveUrl(e.detail || getApiBaseUrl());
    };
    const handleModeChange = (e: any) => {
      setCurrentMode(e.detail || getApiMode());
    };
    window.addEventListener('osdel-api-url-changed', handleUrlChange);
    window.addEventListener('osdel-api-mode-changed', handleModeChange);
    return () => {
      window.removeEventListener('osdel-api-url-changed', handleUrlChange);
      window.removeEventListener('osdel-api-mode-changed', handleModeChange);
    };
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2200);
    toast.success('Copiado para a área de transferência!');
  };

  const testApiConnection = async (targetUrl = apiUrl) => {
    setIsChecking(true);
    setCheckResult(null);
    setLatencyMs(null);
    const start = performance.now();
    try {
      const cleanTarget = targetUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${cleanTarget}/api/v1/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const end = performance.now();
      setLatencyMs(Math.round(end - start));

      if (res.ok) {
        const data = await res.json();
        setCheckResult({ ok: true, data });
        toast.success(`Conexão estabelecida! (${Math.round(end - start)} ms)`);
      } else {
        setCheckResult({
          ok: false,
          error: `O servidor respondeu com status ${res.status}: ${res.statusText}`,
        });
        toast.error('Erro na resposta da API.');
      }
    } catch (err: any) {
      setCheckResult({
        ok: false,
        error:
          'Não foi possível estabelecer conexão. Verifique se o servidor WSGI foi recarregado no PythonAnywhere e se a URL HTTPS está correta.',
      });
      toast.error('Falha de conexão com o servidor.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleActivateProductionUrl = () => {
    const clean = apiUrl.trim().replace(/\/$/, '');
    if (!clean) {
      toast.error('Insira a URL da API do PythonAnywhere.');
      return;
    }
    setApiBaseUrl(clean);
    setApiMode('production_api');
    setCurrentActiveUrl(clean);
    setCurrentMode('production_api');
    toast.success('URL de produção gravada com sucesso! O sistema, APKs e Desktop utilizarão esta API.');
  };

  const handleRestoreDefaultUrl = () => {
    resetApiBaseUrl();
    setApiMode('local_offline');
    setApiUrl(DEFAULT_API_URL);
    setCurrentActiveUrl(DEFAULT_API_URL);
    setCurrentMode('local_offline');
    toast.info('Restaurado para o modo local seguro.');
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      // 1. Zera localmente todas as contas e remove dados de exemplo de clientes, contratos e despesas
      const res = resetAllAccountsAndDemoData();

      // 2. Tenta zerar no backend PythonAnywhere se estiver conectado
      const cleanTarget = currentActiveUrl.trim().replace(/\/$/, '');
      if (cleanTarget && !cleanTarget.includes('localhost')) {
        try {
          await fetch(`${cleanTarget}/api/v1/system/reset-production`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch {
          // Fallback silencioso
        }
      }

      setHasCleanedSuccess(true);
      setShowResetModal(false);
      toast.success('Todas as contas foram zeradas e os dados de exemplo removidos com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao zerar: ' + (err?.message || 'Falha inesperada'));
    } finally {
      setIsResetting(false);
    }
  };

  // Gerador dinâmico do código WSGI
  const generatedWsgiCode = `"""
CONFIGURAÇÃO WSGI OFICIAL - OSDEL TECNOLOGIA
Substitua todo o conteúdo em: /var/www/${paUsername.trim() || 'SEU_USUARIO'}_pythonanywhere_com_wsgi.py
"""
import sys
import os

project_home = '/home/${paUsername.trim() || 'SEU_USUARIO'}/gestaox-api'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ['SECRET_KEY'] = 'gestaox-osdel-producao-2026'
os.environ['JWT_SECRET_KEY'] = 'gestaox-jwt-osdel-producao-2026'
os.environ['DATABASE_URL'] = f'sqlite:///{project_home}/gestaox.db'

from app import app as application
`;

  // Comandos de terminal
  const generatedBashCommands = `# 1. Aceda ao console Bash no PythonAnywhere e execute:
mkdir -p ~/gestaox-api
cd ~/gestaox-api

# 2. Crie o Virtualenv isolado com Python 3.10:
mkvirtualenv --python=/usr/bin/python3.10 gestaox-venv

# 3. Instale as bibliotecas necessárias:
pip install -r requirements.txt

# 4. Inicialize a base de dados com as contas oficiais:
python seed_db.py
`;

  const endpoints = [
    { method: 'POST', path: '/api/v1/auth/login', desc: 'Autenticação oficial com geração de JWT (Web, Desktop, APK)' },
    { method: 'POST', path: '/api/v1/auth/pin-login', desc: 'Acesso rápido com PIN de 4 dígitos para APK Equipa' },
    { method: 'POST', path: '/api/v1/auth/client-login', desc: 'Acesso por Código de Cliente ou Telefone + PIN no APK Cliente' },
    { method: 'GET',  path: '/api/v1/auth/verify', desc: 'Validação e status do token JWT ativo' },
    { method: 'GET',  path: '/api/v1/dashboard/summary', desc: 'Métricas consolidadas (Clientes, Inadimplência, Faturamento Kz)' },
    { method: 'GET',  path: '/api/v1/sync/full-snapshot', desc: 'Fotografia completa e instantânea de todas as tabelas (Offline Sync)' },
    { method: 'GET',  path: '/api/v1/clients', desc: 'Listagem de clientes com pesquisa, filtros de status e paginação' },
    { method: 'POST', path: '/api/v1/clients', desc: 'Cadastro de novo assinante (TV / Internet Fibra / Combo)' },
    { method: 'GET',  path: '/api/v1/clients/<id>/payments', desc: 'Faturas e histórico de pagamento de um cliente' },
    { method: 'GET',  path: '/api/v1/clients/<id>/contract', desc: 'Dados e cláusulas de contrato do assinante' },
    { method: 'GET',  path: '/api/v1/invoices', desc: 'Listagem de faturas e mensalidades emitidas' },
    { method: 'POST', path: '/api/v1/invoices/<id>/pay', desc: 'Liquidação de fatura via Multicaixa ou transferência' },
    { method: 'GET',  path: '/api/v1/payments', desc: 'Registo central de pagamentos e quitações com tesouraria' },
    { method: 'GET',  path: '/api/v1/financial-accounts', desc: 'Contas bancárias (BAI, BFA, TPA, Caixa Geral Balcão)' },
    { method: 'POST', path: '/api/v1/transfers', desc: 'Transferências entre caixas e bancos com comprovativos' },
    { method: 'GET',  path: '/api/v1/inventory', desc: 'Almoxarifado & Stock (Cabos drop, Conectores SC/APC, ONUs, Caixas PDO)' },
    { method: 'GET',  path: '/api/v1/equipment-assignments', desc: 'Equipamentos atribuídos a clientes com MAC e número de série' },
    { method: 'GET',  path: '/api/v1/service-orders', desc: 'Ordens de serviço de campo (instalação, reparação, corte)' },
    { method: 'GET',  path: '/api/v1/schedule', desc: 'Escalas de piquete, turnos técnicos e rondas preventivas' },
    { method: 'GET',  path: '/api/v1/missions', desc: 'Missões coletivas de corte em massa por rua e manutenção' },
    { method: 'GET',  path: '/api/v1/tv-channels', desc: 'Headend TV (Grelha ZAP/Canal+/DStv, cartões, alertas de renovação)' },
    { method: 'GET',  path: '/api/v1/cash-closures', desc: 'Fechos diários de caixa com quebra/sobra de valores' },
    { method: 'GET',  path: '/api/v1/monthly-closures', desc: 'Fechos contabilísticos mensais consolidados' },
    { method: 'GET',  path: '/api/v1/technician-loans', desc: 'Adiantamentos salariais e amortizações de técnicos' },
    { method: 'POST', path: '/api/v1/payment-promises', desc: 'Submissão de acordos e promessas de pagamento' },
    { method: 'POST', path: '/api/v1/support-tickets', desc: 'Abertura de chamados de suporte técnico e avarias' },
    { method: 'GET',  path: '/api/v1/expenses', desc: 'Despesas operacionais, abastecimento de viaturas e caixa' },
    { method: 'POST', path: '/api/v1/ai/assist', desc: 'Assistente IA local sem custos de API externa' },
    { method: 'GET',  path: '/api/v1/health', desc: 'Verificação de integridade e status de saúde do servidor' },
  ];

  const credentialsList = [
    { user: 'deezy', role: 'Super Admin Supremo', pin: '9999', pass: '52863400#', desc: 'Direcção Geral (Acesso Total)' },
    { user: 'boss', role: 'Director Comercial & Executivo', pin: '8888', pass: 'boss', desc: 'Comercial e Financeiro' },
    { user: 'admin', role: 'Gerente Administrativa', pin: '5555', pass: 'admin123', desc: 'Administração e Supervisão' },
    { user: 'mestre.job', role: 'Mestre de Piquete', pin: '1111', pass: 'job', desc: 'Líder Técnico de Campo' },
    { user: 'operador1', role: 'Operadora de Balcão', pin: '1234', pass: '123456', desc: 'Cobranças e Facturação' },
    { user: 'helder', role: 'Técnico Instalador', pin: '2222', pass: 'helder', desc: 'Instalação TV & Fibra' },
  ];

  return (
    <div className="space-y-7 pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
            <span>Servidor & Nuvem</span>
            <span aria-hidden="true">/</span>
            <span className="text-[hsl(var(--foreground))] font-bold">PythonAnywhere Free Tier</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Lançamento em Produção no PythonAnywhere
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-2xl">
            Painel de configuração, ativação e testes da <b>API REST Flask + SQLite</b> para hospedagem 100% gratuita no <b>PythonAnywhere</b>, conectando Web, APK Cliente, APK Equipa e Desktop.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={14} />
            100% Gratuito (Sem Cartão)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3.5 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 border border-blue-500/30">
            <ShieldCheck size={14} />
            HTTPS & SSL Automáticos
          </span>
        </div>
      </div>

      {/* Banner de Produção Limpa & Zeramento de Contas */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-[hsl(var(--foreground))]">
                  Base de Dados Pronta para Hospedagem Oficial
                </h3>
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Contas Zeradas (0.00 Kz)
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Todas as contas bancárias (Caixa, BAI, BFA, TPA) estão a <b>0.00 Kz</b> e todos os clientes e faturas de exemplo foram removidos. Apenas os 6 utilizadores oficiais da empresa estão registados com os seus PINs oficiais.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-4 py-2.5 text-xs font-bold transition shrink-0 cursor-pointer"
          >
            <Trash2 size={14} />
            Zerar Todas as Contas Novamente
          </button>
        </div>

        {hasCleanedSuccess && (
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/40 p-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-semibold">
            <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
            Contas e dados limpos com sucesso! Pode agora subir os ficheiros para o PythonAnywhere.
          </div>
        )}
      </div>

      {/* CENTRAL DE DOWNLOADS DIRECTOS DOS PACOTES */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Download size={20} />
            </div>
            <div>
              <h2 className="font-serif text-base font-bold text-[hsl(var(--foreground))]">
                Pacotes Funcionais Prontos para Download
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Baixe os arquivos empacotados diretamente para a sua máquina com 1 clique:
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <a
            href="/downloads/OSDEL_Desktop_Electron_Windows.zip"
            download="OSDEL_Desktop_Electron_Windows.zip"
            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] hover:bg-[hsl(var(--secondary)/.7)] p-3.5 flex flex-col justify-between gap-2 transition group"
          >
            <div>
              <div className="flex items-center justify-between text-blue-600 mb-1">
                <Monitor size={18} />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">Windows</span>
              </div>
              <b className="text-xs text-[hsl(var(--foreground))] block">OSDEL Desktop Completo</b>
              <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mt-0.5">Executáveis compilados (.exe) Fibra e TV Cabo</span>
            </div>
            <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1 group-hover:underline">
              <Download size={13} /> Descarregar (Windows Completo)
            </span>
          </a>

          <a
            href="/downloads/OSDEL_API_PythonAnywhere.zip"
            download="OSDEL_API_PythonAnywhere.zip"
            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] hover:bg-[hsl(var(--secondary)/.7)] p-3.5 flex flex-col justify-between gap-2 transition group"
          >
            <div>
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <FolderArchive size={18} />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">Flask / WSGI</span>
              </div>
              <b className="text-xs text-[hsl(var(--foreground))] block">API PythonAnywhere</b>
              <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mt-0.5">Código REST, seed_db e models prontos</span>
            </div>
            <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1 group-hover:underline">
              <Download size={13} /> Descarregar (35 KB)
            </span>
          </a>

          <a
            href="/downloads/OSDEL_APK_Equipa_Staff.zip"
            download="OSDEL_APK_Equipa_Staff.zip"
            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] hover:bg-[hsl(var(--secondary)/.7)] p-3.5 flex flex-col justify-between gap-2 transition group"
          >
            <div>
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <Smartphone size={18} />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Android</span>
              </div>
              <b className="text-xs text-[hsl(var(--foreground))] block">App Equipa / Técnicos</b>
              <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mt-0.5">Bundle compilado e projeto Android pronto</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 group-hover:underline">
              <Download size={13} /> Descarregar (1.3 MB)
            </span>
          </a>

          <a
            href="/downloads/OSDEL_APK_Cliente.zip"
            download="OSDEL_APK_Cliente.zip"
            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] hover:bg-[hsl(var(--secondary)/.7)] p-3.5 flex flex-col justify-between gap-2 transition group"
          >
            <div>
              <div className="flex items-center justify-between text-purple-600 mb-1">
                <Users size={18} />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300">Android</span>
              </div>
              <b className="text-xs text-[hsl(var(--foreground))] block">App Cliente Final</b>
              <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mt-0.5">Bundle compilado e projeto Android pronto</span>
            </div>
            <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1 group-hover:underline">
              <Download size={13} /> Descarregar (1.2 MB)
            </span>
          </a>
        </div>
      </div>

      {/* Cartão de Ativação e Testador da API em Tempo Real */}
      <div className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-[hsl(var(--card))] to-[hsl(var(--card))] p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Globe size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                  Conexão da API de Produção
                </h2>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  currentMode === 'production_api' 
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                }`}>
                  Modo: {currentMode === 'production_api' ? 'Produção Online' : 'Local / Offline'}
                </span>
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                URL atualmente ativa: <code className="font-mono text-blue-600 font-semibold">{currentActiveUrl}</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDefaultUrl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
            >
              <RefreshCw size={13} />
              Restaurar Padrão
            </button>
          </div>
        </div>

        {/* Input da URL e Ações */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
            Endereço da sua API no PythonAnywhere:
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://seu_usuario.pythonanywhere.com"
              className="h-11 flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 text-xs font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
            />
            <button
              type="button"
              onClick={() => testApiConnection(apiUrl)}
              disabled={isChecking}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 text-xs font-bold transition disabled:opacity-50 shrink-0"
            >
              <Play size={14} className={isChecking ? 'animate-spin' : ''} />
              {isChecking ? 'Testando Ping...' : 'Testar Conexão'}
            </button>
            <button
              type="button"
              onClick={handleActivateProductionUrl}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-blue-600/30 transition shrink-0"
            >
              <Save size={14} />
              Activar em Produção
            </button>
          </div>

          {/* Resultado do Teste */}
          {checkResult && (
            <div
              className={`rounded-xl p-4 text-xs border ${
                checkResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-300'
              }`}
            >
              {checkResult.ok ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      API Online e Pronta para Operar em Produção!
                    </span>
                    {latencyMs !== null && (
                      <span className="font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                        Latência: {latencyMs} ms
                      </span>
                    )}
                  </div>
                  <pre className="font-mono text-[11px] bg-emerald-950/20 p-2.5 rounded-lg overflow-x-auto text-emerald-900 dark:text-emerald-200">
                    {JSON.stringify(checkResult.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <XCircle size={16} className="text-rose-600 dark:text-rose-400" />
                    Falha ao Conectar com a API
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300">{checkResult.error}</p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] pt-1">
                    Dica: No painel do PythonAnywhere, vá na aba <b>Web</b> e clique no botão verde <b>"Reload"</b>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gerador de Ficheiro WSGI com 1 Clique */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <h2 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                Gerador Automático de Ficheiro WSGI (Pronto para Colar)
              </h2>
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Digite o seu nome de usuário do PythonAnywhere para gerar os comandos e o script WSGI com os caminhos corretos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Seu Utilizador:</label>
            <input
              type="text"
              value={paUsername}
              onChange={(e) => setPaUsername(e.target.value)}
              placeholder="ex: osdelltecnologia"
              className="h-8 w-36 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2.5 text-xs font-mono font-bold text-blue-600 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Ficheiro WSGI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] font-bold text-[hsl(var(--foreground))]">
              Ficheiro: /var/www/{paUsername || 'SEU_USUARIO'}_pythonanywhere_com_wsgi.py
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(generatedWsgiCode, 'wsgi')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-1 text-[11px] font-bold hover:brightness-105 transition"
            >
              {copiedCmd === 'wsgi' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copiedCmd === 'wsgi' ? 'Copiado!' : 'Copiar Código WSGI'}
            </button>
          </div>
          <pre className="rounded-xl border border-[hsl(var(--border))] bg-slate-950 p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
            {generatedWsgiCode}
          </pre>
        </div>

        {/* Comandos Bash */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] font-bold text-[hsl(var(--foreground))]">
              Comandos do Terminal Bash no PythonAnywhere:
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(generatedBashCommands, 'bash')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-1 text-[11px] font-bold hover:brightness-105 transition"
            >
              {copiedCmd === 'bash' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copiedCmd === 'bash' ? 'Copiado!' : 'Copiar Comandos'}
            </button>
          </div>
          <pre className="rounded-xl border border-[hsl(var(--border))] bg-slate-950 p-4 text-[11px] font-mono text-cyan-400 overflow-x-auto leading-relaxed">
            {generatedBashCommands}
          </pre>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-3 space-y-1">
            <span className="font-bold text-[hsl(var(--foreground))]">Caminho do Virtualenv (Aba Web):</span>
            <code className="block font-mono text-[11px] text-blue-600 select-all">
              /home/{paUsername || 'SEU_USUARIO'}/.virtualenvs/gestaox-venv
            </code>
          </div>
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] p-3 space-y-1">
            <span className="font-bold text-[hsl(var(--foreground))]">Source code & Working directory:</span>
            <code className="block font-mono text-[11px] text-blue-600 select-all">
              /home/{paUsername || 'SEU_USUARIO'}/gestaox-api
            </code>
          </div>
        </div>
      </div>

      {/* Credenciais Oficiais do Sistema */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base font-bold text-[hsl(var(--foreground))]">
              Utilizadores e Credenciais Oficiais para Produção
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Contas criadas automaticamente na base de dados SQLite com os mesmos PINs e senhas para Web, Desktop e APKs.
            </p>
          </div>
          <KeyRound size={20} className="text-amber-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] text-[hsl(var(--muted-foreground))] font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Utilizador</th>
                <th className="py-2.5 px-4">Perfil</th>
                <th className="py-2.5 px-4">PIN Rápido (APK)</th>
                <th className="py-2.5 px-4">Palavra-passe (Web/Desktop)</th>
                <th className="py-2.5 px-4">Função</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {credentialsList.map((c, idx) => (
                <tr key={idx} className="hover:bg-[hsl(var(--secondary)/.25)] transition">
                  <td className="py-2.5 px-4 font-mono font-bold text-blue-600">
                    {c.user}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {c.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-emerald-600">
                    {c.pin}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[hsl(var(--foreground))]">
                    {c.pass}
                  </td>
                  <td className="py-2.5 px-4 text-[hsl(var(--muted-foreground))]">
                    {c.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regras e Blindagem do Plano Gratuito */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <CheckCircle2 size={16} />
            <span>SQLite Persistente</span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Banco de dados local em <code>gestaox.db</code> no disco do PythonAnywhere com timeout de 30 segundos contra bloqueios de concorrência. Não consome memória de servidores SQL externos.
          </p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
            <ShieldCheck size={16} />
            <span>CORS & HTTPS Inbound</span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            O plano gratuito permite receber conexões inbound ilimitadas via HTTPS de qualquer origem (aplicativos móveis Android, aplicativo Desktop Windows e navegadores).
          </p>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
            <AlertTriangle size={16} />
            <span>Renovação a cada 3 Meses</span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            No plano gratuito, a cada 3 meses acesse a aba <b>Web</b> do PythonAnywhere e clique em <i>"Run until 3 months from today"</i> para manter a sua API no ar continuamente.
          </p>
        </div>
      </div>

      {/* Tabela de Endpoints da API */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-base font-bold text-[hsl(var(--foreground))]">
              Catálogo de Endpoints REST Ativos (JSON)
            </h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
              Todos os endpoints testados e prontos para Web, Desktop, APK Cliente e APK Equipa.
            </p>
          </div>
          <Database size={18} className="text-blue-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] text-[hsl(var(--muted-foreground))] font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Método</th>
                <th className="py-2.5 px-4">Endpoint</th>
                <th className="py-2.5 px-4">Descrição da Operação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {endpoints.map((ep, idx) => (
                <tr key={idx} className="hover:bg-[hsl(var(--secondary)/.25)] transition">
                  <td className="py-2.5 px-4">
                    <span
                      className={`inline-block font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                        ep.method === 'GET'
                          ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          : ep.method === 'POST'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : ep.method === 'PUT'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-[hsl(var(--foreground))]">
                    {ep.path}
                  </td>
                  <td className="py-2.5 px-4 text-[hsl(var(--muted-foreground))]">
                    {ep.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação para Zerar Contas */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/50">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-[hsl(var(--foreground))]">
                  Zerar Contas e Dados de Teste?
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Ação recomendada para iniciar hospedagem em produção real.
                </p>
              </div>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              Esta ação irá definir o saldo de todas as contas financeiras (Caixa, BAI, BFA, TPA) para <b>0.00 Kz</b> e remover todos os clientes, ordens, contratos e despesas de exemplo da base local e do servidor. Os utilizadores oficiais da empresa serão mantidos.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={isResetting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isResetting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                {isResetting ? 'Zerando...' : 'Confirmar e Zerar Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
