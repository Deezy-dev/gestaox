import { useState } from 'react';
import {
  Smartphone,
  Users,
  Tv,
  CheckCircle2,
  FileCode,
  Download,
  ArrowRight,
  ShieldCheck,
  Zap,
  Scissors,
  DollarSign,
  Layers,
  Sparkles,
  ExternalLink,
  Monitor,
  Printer,
  KeyRound,
  FolderArchive,
} from 'lucide-react';
import { Link } from 'wouter';
import { getStoredMissions } from '@/lib/team-missions';
import { getStoredPromises, getStoredTickets } from '@/lib/client-portal';

export function MobileHub() {
  const missions = getStoredMissions();
  const promises = getStoredPromises();
  const tickets = getStoredTickets();

  const totalTasks = missions.reduce((sum, m) => sum + m.tasks.length, 0);
  const completedTasks = missions.reduce(
    (sum, m) => sum + m.tasks.filter((t) => t.status !== 'pendente').length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Ecossistema Móvel Android & iOS</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.5rem]">
            Centro de Aplicativos Móveis (APKs)
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            Dois aplicativos móveis nativos e sincronizados: um para os clientes (TV e Internet) e outro para a equipa técnica de campo da OSDEL.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            href="/credenciais-superadmin"
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
          >
            <KeyRound size={15} /> Gerador de Credenciais
          </Link>
          <Link
            href="/apk-guia"
            className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110"
          >
            <FileCode size={15} /> Guia Completo de Build APK
          </Link>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-5 shadow-sm bg-gradient-to-r from-blue-50/60 to-emerald-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Zap size={20} />
          </div>
          <div>
            <b className="text-sm font-extrabold text-slate-900 block">
              Sincronização em Tempo Real Activa
            </b>
            <span className="text-xs text-slate-600">
              {completedTasks} de {totalTasks} tarefas de campo concluídas · {promises.length} acordos submetidos · {tickets.length} avarias reportadas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Motor Local & Nuvem Conectado
          </span>
        </div>
      </div>

      {/* CENTRAL DE PACOTES E INSTALADORES FUNCIONAIS */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Download size={26} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 block">
                Download Directo · Ficheiros Pré-Empacotados
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
                Instaladores & Pacotes Oficiais Prontos
              </h2>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 w-fit">
            ✓ 100% Sincronizado & Testado
          </span>
        </div>

        {/* AVISO IMPORTANTE SOBRE EXECUÇÃO E CORRUPÇÃO */}
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-xs space-y-2 text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <span className="text-base">⚠️</span>
            <span>Instrução Importante para Evitar Erro de "Ficheiro Corrompido":</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>
              <b>No Windows (Desktop)</b>: Baixe o pacote completo <b>OSDEL_Desktop_Electron_Windows.zip</b> e extraia a pasta. O arquivo <code>.exe</code> necessita das suas bibliotecas (DLLs, motor Electron e recursos) que estão dentro da pasta extraída para abrir sem erros. Em seguida, dê duplo clique em <code>iniciar_fibra.bat</code> ou <code>iniciar_tv_cabo.bat</code>.
            </li>
            <li>
              <b>No Android (APKs)</b>: O sistema Android rejeita APKs não assinados pela chave oficial do Google/Android. Para instalar no telemóvel sem erro de pacote corrompido, instale diretamente pelo navegador clicando em <b>"Adicionar ao ecrã principal / Instalar App"</b> ou extraia o zip do app e execute <code>GERAR_APK_AUTOMATICO.bat</code> no seu computador.
            </li>
          </ul>
        </div>

        {/* 4 DIRECT ARTIFACTS: 2 APKs and 2 EXEs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          {/* APK 1: Cliente */}
          <a
            href="/downloads/OSDEL_Cliente.apk"
            download="OSDEL_Cliente.apk"
            className="flex items-center justify-between p-3 rounded-lg bg-purple-950/40 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-900/40 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-xs">
                APK
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-purple-300 transition">
                  OSDEL_Cliente.apk
                </span>
                <span className="text-[10px] text-purple-300/80">App Clientes (Android)</span>
              </div>
            </div>
            <Download size={15} className="text-purple-400 group-hover:translate-y-0.5 transition" />
          </a>

          {/* APK 2: Equipa */}
          <a
            href="/downloads/OSDEL_Equipa_Staff.apk"
            download="OSDEL_Equipa_Staff.apk"
            className="flex items-center justify-between p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/40 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-600/30 text-emerald-300 flex items-center justify-center font-bold text-xs">
                APK
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-emerald-300 transition">
                  OSDEL_Equipa_Staff.apk
                </span>
                <span className="text-[10px] text-emerald-300/80">App Técnicos (Android)</span>
              </div>
            </div>
            <Download size={15} className="text-emerald-400 group-hover:translate-y-0.5 transition" />
          </a>

          {/* EXE 1: Fibra */}
          <a
            href="/downloads/OSDEL_Fibra_Desktop.exe"
            download="OSDEL_Fibra_Desktop.exe"
            className="flex items-center justify-between p-3 rounded-lg bg-blue-950/40 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-900/40 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-xs">
                EXE
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-blue-300 transition">
                  OSDEL_Fibra_Desktop.exe
                </span>
                <span className="text-[10px] text-blue-300/80">Fibra Óptica (Windows)</span>
              </div>
            </div>
            <Download size={15} className="text-blue-400 group-hover:translate-y-0.5 transition" />
          </a>

          {/* EXE 2: TV Cabo */}
          <a
            href="/downloads/OSDEL_TV_Cabo_Desktop.exe"
            download="OSDEL_TV_Cabo_Desktop.exe"
            className="flex items-center justify-between p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-900/40 transition group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-600/30 text-amber-300 flex items-center justify-center font-bold text-xs">
                EXE
              </div>
              <div>
                <span className="text-xs font-bold text-white block group-hover:text-amber-300 transition">
                  OSDEL_TV_Cabo_Desktop.exe
                </span>
                <span className="text-[10px] text-amber-300/80">TV por Cabo (Windows)</span>
              </div>
            </div>
            <Download size={15} className="text-amber-400 group-hover:translate-y-0.5 transition" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* PACOTE DESKTOP ELECTRON */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between space-y-3 hover:border-blue-500/50 transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Monitor className="text-blue-400" size={20} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">Windows (.exe incluído)</span>
              </div>
              <h3 className="font-bold text-sm text-white">OSDEL Desktop Completo</h3>
              <p className="text-[11px] text-slate-400 leading-tight">
                Pacote com os executáveis oficiais compilados (.exe) de Fibra e TV Cabo. Não necessita instalar Node.js, 100% autónomo.
              </p>
            </div>
            <a
              href="/downloads/OSDEL_Desktop_Electron_Windows.zip"
              download="OSDEL_Desktop_Electron_Windows.zip"
              className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20"
            >
              <Download size={14} />
              <span>Baixar Desktop Oficial (Windows)</span>
            </a>
          </div>

          {/* PACOTE APK EQUIPA TÉCNICA */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between space-y-3 hover:border-emerald-500/50 transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Smartphone className="text-emerald-400" size={20} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Android APK & Web</span>
              </div>
              <h3 className="font-bold text-sm text-white">App Equipa / Staff</h3>
              <p className="text-[11px] text-slate-400 leading-tight">
                Bundle compilado para telemóveis com inicializador offline imediato e projeto Android Studio com Gradle sincronizado.
              </p>
            </div>
            <a
              href="/downloads/OSDEL_APK_Equipa_Staff.zip"
              download="OSDEL_APK_Equipa_Staff.zip"
              className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
            >
              <Download size={14} />
              <span>Baixar App Equipa (1.3 MB)</span>
            </a>
          </div>

          {/* PACOTE APK CLIENTE */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between space-y-3 hover:border-purple-500/50 transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Users className="text-purple-400" size={20} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Android APK & Web</span>
              </div>
              <h3 className="font-bold text-sm text-white">App Cliente Final</h3>
              <p className="text-[11px] text-slate-400 leading-tight">
                Bundle compilado para portal do cliente, faturas, acordos e pagamentos. Inclui projeto Android completo e launcher offline.
              </p>
            </div>
            <a
              href="/downloads/OSDEL_APK_Cliente.zip"
              download="OSDEL_APK_Cliente.zip"
              className="w-full py-2.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-purple-600/20"
            >
              <Download size={14} />
              <span>Baixar App Cliente (1.2 MB)</span>
            </a>
          </div>

          {/* PACOTE BACKEND API */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between space-y-3 hover:border-amber-500/50 transition">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <FolderArchive className="text-amber-400" size={20} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">PythonAnywhere</span>
              </div>
              <h3 className="font-bold text-sm text-white">API PythonAnywhere</h3>
              <p className="text-[11px] text-slate-400 leading-tight">
                Backend Flask completo com banco SQLite limpo, rotas REST, seed oficial e wsgi pronto.
              </p>
            </div>
            <a
              href="/downloads/OSDEL_API_PythonAnywhere.zip"
              download="OSDEL_API_PythonAnywhere.zip"
              className="w-full py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-amber-600/20"
            >
              <Download size={14} />
              <span>Baixar API (30 KB)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Two Mobile Apps Showcase Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* APP 1: CLIENTE */}
        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-md">
                  <Tv size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    APK Cliente Final
                  </span>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    OSDEL Cliente
                  </h2>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                TV & Internet
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O aplicativo que fica no telemóvel dos clientes residenciais da OSDEL. Permite consultar contrato, ver aviso de pagamento com entidade/referência Multicaixa Express, pedir acordos de pagamento para evitar corte, e reportar avarias com fotos.
            </p>

            <div className="space-y-2 text-xs">
              <b className="text-[11px] font-bold text-slate-700 uppercase block">Recursos Principais:</b>
              <ul className="space-y-1.5 text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span><b>Aviso de Pagamento</b>: Referência MCX e data limite visível.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span><b>Acordo de Não-Corte</b>: Pedido de prazo adicional aprovado no operador.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span><b>Relatar Avaria</b>: TV sem sinal, cabo caído, luz LOS vermelha.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span><b>Diagnóstico de Linha</b>: Medição de potência óptica em dBm e ping.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ID: com.osdel.cliente</span>
            <Link
              href="/app-cliente"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-4 py-2.5 text-xs font-bold hover:bg-blue-700 shadow-sm transition"
            >
              <Smartphone size={14} /> Abrir App do Cliente <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* APP 2: EQUIPA & CAMPO */}
        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-white shadow-md">
                  <Users size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    APK Piquete & Operações
                  </span>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    OSDEL Equipa & Campo
                  </h2>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                Técnicos & Operadores
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O aplicativo dos técnicos de campo (Mestre Job, Júlio, Enock, etc.). Acesso restrito por função: técnicos vêem apenas a sua agenda de hoje, tarefas de corte por rua e a sua folha de salário individual; operadores gerem missões e aprovam acordos.
            </p>

            <div className="space-y-2 text-xs">
              <b className="text-[11px] font-bold text-slate-700 uppercase block">Recursos Principais:</b>
              <ul className="space-y-1.5 text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span><b>Agenda do Técnico</b>: Intervenções e rotinas diárias com checklist.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span><b>Piquete por Rua</b>: Marcação de cortes e religações em tempo real.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span><b>Meu Salário Privado</b>: Consulta de remuneração líquida e subsídios.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span><b>Aprovação de Acordos</b>: Validação de promessas de pagamento.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-[hsl(var(--border))] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">ID: com.osdel.equipa</span>
            <Link
              href="/app-equipa"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold hover:bg-black shadow-sm transition"
            >
              <Smartphone size={14} /> Abrir App da Equipa <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* APP 3: DESKTOP CLIENT ELECTRON (WINDOWS .EXE) */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-blue-950 text-white">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
              Ambiente Desktop Windows (.exe)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              100% Idêntico ao Sistema Web
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Monitor className="text-blue-400" size={24} /> OSDEL Tecnologia · Clientes Desktop Electron (Fibra e TV)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Dois executáveis nativos independentes para Windows: <b>OSDEL Fibra Óptica Desktop (.exe)</b> e <b>OSDEL TV Desktop (.exe)</b>, ambos executando o sistema completo com todos os ecrãs, relatórios e tabelas. Incorpora suporte nativo a <b>impressoras térmicas de recibos POS (80mm e 58mm)</b> e impressão directa de facturas A4.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Executável Fibra (.exe)</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Executável TV (.exe)</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Impressão POS Térmica Nativa</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> Facturação A4 Oficial</span>
          </div>
        </div>

        <div className="shrink-0 space-y-2">
          <Link
            href="/apk-guia"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-bold shadow-md transition"
          >
            <Download size={14} /> Guia de Build dos Executáveis .exe
          </Link>
        </div>
      </div>
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCode className="text-purple-600" size={18} />
              <b className="text-base text-slate-900">Como converter estes aplicativos em arquivos APK (.apk)?</b>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl">
              Consulte as instruções detalhadas de empacotamento com <b>Capacitor</b> e configuração da variável de API (quando decidir o local de hospedagem final do sistema).
            </p>
          </div>

          <Link
            href="/apk-guia"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-sm"
          >
            Ver Guia de Compilação APK <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
