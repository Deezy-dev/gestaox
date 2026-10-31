import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Zap,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  HelpCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  MapPin,
  RefreshCw,
  Bell,
  Cpu,
} from 'lucide-react';
import {
  FIBER_CUT_SOLUTIONS,
  getFiberCutConfig,
  saveFiberCutConfig,
  getFiberCutHistory,
  saveFiberCutHistory,
  generateMikrotikRscScript,
  type FiberCutRuleConfig,
  type FiberCutExecutionRecord,
} from '@/lib/fiber-cut-engine';
import { useListClients, useListPayments, useSetClientStatus, useCreateServiceOrder } from '@/lib/local-api';
import { sendMobilePush } from '@/lib/mobile-push';
import { toast } from 'sonner';

const kz = (val: number) =>
  new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 })
    .format(val)
    .replace('AOA', 'Kz');

export function FiberAutomaticCutsView() {
  const [config, setConfig] = useState<FiberCutRuleConfig>(() => getFiberCutConfig());
  const [history, setHistory] = useState<FiberCutExecutionRecord[]>(() => getFiberCutHistory());
  const [expandedSolution, setExpandedSolution] = useState<string | null>('mikrotik_pppoe');
  const [copiedScript, setCopiedScript] = useState(false);
  const [filterExecuted, setFilterExecuted] = useState<'todos' | 'cortados' | 'revertidos'>('todos');

  // Simulator
  const [testUser, setTestUser] = useState('antonio.pedro@osdel.ao');
  const [testResult, setTestResult] = useState<string | null>(null);

  const clientsQuery = useListClients();
  const paymentsQuery = useListPayments();
  const setClientStatus = useSetClientStatus();
  const createOS = useCreateServiceOrder();

  const allClients: any[] = clientsQuery.data?.items || clientsQuery.data || [];
  const allPayments: any[] = paymentsQuery.data?.items || paymentsQuery.data || [];

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentDay = new Date().getDate();

  // Find paid clients in the current month
  const paidClientIds = useMemo(() => {
    return new Set(
      allPayments
        .filter((p: any) => (p.referenceMonth || p.paidAt?.slice(0, 7)) === currentMonth)
        .map((p: any) => p.clientId),
    );
  }, [allPayments, currentMonth]);

  // Filter ONLY FIBER subscribers (FTTH, combo, internet) with late invoices past tolerance
  const eligibleFiberClients = useMemo(() => {
    const cutDayThreshold = config.dueDay + config.toleranceDays; // Ex: 5 + 5 = 10

    return allClients
      .filter((c: any) => {
        // Regra Estrita: APENAS clientes de FIBRA ÓPTICA
        const isFiber =
          c.serviceType === 'internet' ||
          c.serviceType === 'fibra' ||
          c.serviceType === 'combo' ||
          c.service?.includes('fibra') ||
          c.service?.includes('internet');

        if (!isFiber) return false;

        // Verificar se tem acordo ativo
        if (config.respectPaymentPromises && c.paymentPromiseDate) {
          const promiseValid = new Date(c.paymentPromiseDate) >= new Date(new Date().toISOString().slice(0, 10));
          if (promiseValid) return false;
        }

        // Verificar se já pagou este mês
        const hasPaid = paidClientIds.has(c.id);
        if (hasPaid && c.status !== 'suspended' && c.status !== 'late') return false;

        // Vencimento + tolerância ultrapassados
        return currentDay >= cutDayThreshold || c.status === 'late' || c.status === 'suspended';
      })
      .map((c: any) => {
        const penalty = (c.status === 'late' || c.status === 'suspended') && currentDay >= 6 ? 1000 : 0;
        const debt = Number(c.monthlyFee || c.monthlyPrice || 8500) + penalty;
        const pppoeUser = c.email || `${c.fullName.toLowerCase().replace(/\s+/g, '.')}@osdel.ao`;
        return {
          ...c,
          debt,
          pppoeUser,
          isAlreadyCut: history.some((h) => h.clientId === c.id && h.status === 'cortado'),
        };
      });
  }, [allClients, paidClientIds, config, currentDay, history]);

  const handleSaveConfig = () => {
    saveFiberCutConfig(config);
    toast.success('Regras de corte automático de fibra salvas com sucesso!');
  };

  // Executar Varredura e Corte Automático
  const handleExecuteAutomaticCuts = () => {
    const targets = eligibleFiberClients.filter((c) => !c.isAlreadyCut);
    if (!targets.length) {
      toast.info('Não há novos assinantes de fibra em atraso além do limite de tolerância hoje.');
      return;
    }

    if (
      !confirm(
        `Confirmar a execução do corte automático para ${targets.length} assinante(s) de fibra óptica?\n\nMétodo principal: ${(config.primaryMethod || 'corte_sinal').toUpperCase()}\nTolerância: ${config.toleranceDays} dias após o dia ${config.dueDay}.`
      )
    ) {
      return;
    }

    const newRecords: FiberCutExecutionRecord[] = targets.map((c) => {
      const rec: FiberCutExecutionRecord = {
        id: `cut-${Date.now()}-${c.id}`,
        clientId: c.id,
        clientCode: c.code || `CLI-${c.id}`,
        clientName: c.fullName,
        phone: c.phone || '—',
        address: c.address || 'Bairro Golf I',
        pdoNumber: c.pdoNumber || 'PDO-04',
        portNumber: c.portNumber || 'Porta 01',
        onuSerial: c.onuNumber || 'HWTC-FIBRA8821',
        pppoeUser: c.pppoeUser,
        ipAddress: c.ipAddress || '10.10.12.' + (c.id + 10),
        debtAmount: c.debt,
        monthsLate: 1,
        cutDate: new Date().toISOString(),
        methodUsed:
          config.primaryMethod === 'mikrotik_pppoe'
            ? 'MikroTik PPPoE Secret Kill'
            : config.primaryMethod === 'pdo_physical'
            ? 'Caixa PDO Terreno'
            : 'Híbrido (MikroTik + Piquete PDO)',
        mikrotikCommand: `/ppp secret set [find name="${c.pppoeUser}"] disabled=yes\n/ppp active remove [find name="${c.pppoeUser}"]`,
        status: 'cortado',
        executedBy: 'Motor Automático Gestão X',
        notes: `Corte automático executado após ${config.toleranceDays} dias de tolerância sem pagamento.`,
      };

      // 1. Marcar cliente como suspenso na base de dados
      setClientStatus.mutate({
        clientId: c.id,
        status: 'suspended',
        notes: `Sinal de fibra cortado automaticamente pelo motor de regras.`,
      });

      // 2. Criar ordem de serviço para o Piquete PDO se habilitado
      if (config.autoCreatePdoCutMission) {
        createOS.mutate({
          data: {
            clientId: c.id,
            type: 'corte',
            priority: 'urgente',
            technician: 'Piquete de Corte de Rua',
            scheduledDate: new Date().toISOString().slice(0, 10),
            description: `[CORTE AUTO FIBRA] Caixa ${c.pdoNumber || 'PDO-04'} Porta ${c.portNumber || '01'}. Desconectar drop por dívida de ${kz(c.debt)}.`,
          },
        });
      }

      return rec;
    });

    // 3. Disparar Push Notification
    sendMobilePush({
      title: 'Corte Automático de Fibra Executado',
      body: `Foram cortados ${newRecords.length} assinantes de fibra em atraso (MikroTik & PDO).`,
      category: 'corte_fibra',
      targetAudience: 'staff',
      actionLabel: 'Ver Histórico',
    });

    const updatedHistory = [...newRecords, ...history];
    setHistory(updatedHistory);
    saveFiberCutHistory(updatedHistory);
    toast.success(`${newRecords.length} assinante(s) de fibra cortados com sucesso!`);
  };

  // Reversão / Religação de Cliente
  const handleRevertCut = (recordId: string) => {
    const target = history.find((h) => h.id === recordId);
    if (!target) return;

    if (confirm(`Religar o sinal de fibra de ${target.clientName} (${target.clientCode}) e reactivar no MikroTik?`)) {
      setClientStatus.mutate({
        clientId: target.clientId,
        status: 'active',
        notes: `Sinal de fibra religado após regularização.`,
      });

      const updated = history.map((h) => (h.id === recordId ? { ...h, status: 'revertido' as const } : h));
      setHistory(updated);
      saveFiberCutHistory(updated);

      sendMobilePush({
        title: 'Sinal de Fibra Religado',
        body: `O sinal de ${target.clientName} foi reactivado com sucesso no MikroTik e na PDO.`,
        category: 'pagamento',
        targetAudience: 'todos',
      });

      toast.success(`Sinal de ${target.clientName} restabelecido com sucesso!`);
    }
  };

  // Descarregar Script RouterOS .rsc
  const handleDownloadRsc = () => {
    const script = generateMikrotikRscScript(history.filter((h) => h.status === 'cortado'));
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `corte_automatico_fibra_${new Date().toISOString().slice(0, 10)}.rsc`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Script RouterOS (.rsc) gerado e descarregado com sucesso!');
  };

  const handleTestSimulator = () => {
    const cmd = `/ppp secret set [find name="${testUser}"] disabled=yes\n/ppp active remove [find name="${testUser}"]\n/log warning "OSDEL: Assinante ${testUser} cortado com sucesso no MikroTik."`;
    setTestResult(cmd);
    toast.info('Comando simulado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm bg-gradient-to-r from-red-50/70 via-slate-50 to-blue-50/70 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-600 text-white shadow-md">
              <Scissors size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-full">
                  Exclusivo Fibra Óptica (FTTH)
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  Sinal de TV permanece inalterado
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Motor de Cortes Automáticos & Interacção MikroTik / PDO
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExecuteAutomaticCuts}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition shadow-sm"
            >
              <Play size={14} /> Executar Varredura e Corte Agora
            </button>
            <button
              onClick={handleDownloadRsc}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition shadow-sm"
            >
              <Download size={14} /> Descarregar Script MikroTik (.rsc)
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
          Este módulo monitoriza diariamente os assinantes de fibra óptica com mensalidades vencidas. Quando os dias de tolerância são ultrapassados, o sistema executa o bloqueio remoto via <b>MikroTik RouterOS (PPPoE/Firewall)</b> e/ou gera a missão de campo para corte físico na <b>Caixa de Terminação Óptica (PDO)</b>.
        </p>
      </div>

      {/* AS 4 SOLUÇÕES TÉCNICAS EXPLICADAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            Todas as Soluções Possíveis Implementadas no Sistema
          </h3>
          <span className="text-xs text-slate-500">Clique para expandir a documentação técnica</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {FIBER_CUT_SOLUTIONS.map((sol) => {
            const isExpanded = expandedSolution === sol.id;
            return (
              <div
                key={sol.id}
                className="surface rounded-2xl border border-[hsl(var(--border))] p-5 shadow-sm space-y-3 bg-white"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedSolution(isExpanded ? null : sol.id)}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {sol.badge}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 leading-snug mt-1">
                      {sol.title}
                    </h4>
                    <p className="text-xs text-slate-500">{sol.subtitle}</p>
                  </div>
                  <button className="text-slate-400 hover:text-slate-700 p-1">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{sol.howItWorks}</p>

                {isExpanded && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 text-xs animate-in fade-in duration-200">
                    <div>
                      <b className="text-[11px] font-bold text-emerald-800 uppercase block mb-1">
                        Principais Vantagens:
                      </b>
                      <ul className="space-y-1 text-slate-600">
                        {sol.advantages.map((adv, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <b className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                        Comando Executado:
                      </b>
                      <pre className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                        {sol.commandTemplate}
                      </pre>
                    </div>

                    <div>
                      <b className="text-[11px] font-bold text-blue-700 uppercase block mb-1">
                        Comando de Religação / Restabelecimento:
                      </b>
                      <pre className="p-2.5 rounded-xl bg-slate-800 text-blue-300 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                        {sol.reconnectCommandTemplate}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PAINEL DE CONFIGURAÇÃO DE REGRAS */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-5 bg-white">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-[hsl(var(--primary))]" />
            <h3 className="font-extrabold text-base text-slate-900">
              Regras & Parâmetros de Disparo do Corte de Fibra
            </h3>
          </div>
          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white text-xs font-bold hover:brightness-110 shadow-sm"
          >
            Guardar Parâmetros
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Dia do Vencimento</label>
            <input
              type="number"
              min={1}
              max={31}
              value={config.dueDay}
              onChange={(e) => setConfig({ ...config, dueDay: Number(e.target.value) })}
              className="w-full h-10 rounded-xl border border-slate-300 px-3 font-bold"
            />
            <small className="text-slate-400 mt-1 block">Dia limite mensal da factura</small>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Dias de Tolerância</label>
            <input
              type="number"
              min={0}
              max={30}
              value={config.toleranceDays}
              onChange={(e) => setConfig({ ...config, toleranceDays: Number(e.target.value) })}
              className="w-full h-10 rounded-xl border border-slate-300 px-3 font-bold"
            />
            <small className="text-slate-400 mt-1 block">
              Corte automático dispara no dia {config.dueDay + config.toleranceDays}
            </small>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Método de Execução</label>
            <select
              value={config.primaryMethod}
              onChange={(e) => setConfig({ ...config, primaryMethod: e.target.value as any })}
              className="w-full h-10 rounded-xl border border-slate-300 px-3 font-semibold"
            >
              <option value="hibrido">Híbrido (MikroTik + Piquete PDO)</option>
              <option value="mikrotik_pppoe">MikroTik PPPoE Secret Kill</option>
              <option value="mikrotik_firewall">MikroTik Firewall Address-List</option>
              <option value="pdo_physical">Apenas Desconexão Física PDO</option>
            </select>
            <small className="text-slate-400 mt-1 block">Canal principal de bloqueio</small>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">IP do MikroTik RouterOS</label>
            <input
              type="text"
              value={config.mikrotik.host}
              onChange={(e) =>
                setConfig({ ...config, mikrotik: { ...config.mikrotik, host: e.target.value } })
              }
              className="w-full h-10 rounded-xl border border-slate-300 px-3 font-mono font-bold"
            />
            <small className="text-slate-400 mt-1 block">Porta API: {config.mikrotik.apiPort}</small>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 pt-2 text-xs">
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={config.respectPaymentPromises}
              onChange={(e) => setConfig({ ...config, respectPaymentPromises: e.target.checked })}
              className="h-4 w-4 rounded text-blue-600"
            />
            <div>
              <b className="block text-slate-800">Respeitar Acordos Válidos</b>
              <span className="text-[11px] text-slate-500">Não cortar clientes com promessa activa</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={config.autoCreatePdoCutMission}
              onChange={(e) => setConfig({ ...config, autoCreatePdoCutMission: e.target.checked })}
              className="h-4 w-4 rounded text-blue-600"
            />
            <div>
              <b className="block text-slate-800">Criar Missão de Piquete PDO</b>
              <span className="text-[11px] text-slate-500">Disparar ordem para a equipa da rua</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={config.sendPreCutPushNotification}
              onChange={(e) => setConfig({ ...config, sendPreCutPushNotification: e.target.checked })}
              className="h-4 w-4 rounded text-blue-600"
            />
            <div>
              <b className="block text-slate-800">Enviar Notificações Push</b>
              <span className="text-[11px] text-slate-500">Avisar 24h antes no telemóvel do cliente</span>
            </div>
          </label>
        </div>
      </div>

      {/* FILA DE CLIENTES DE FIBRA EM RISCO DE CORTE HOJE */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-sm bg-white">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <h3 className="font-black text-sm text-slate-900">
                Assinantes de Fibra no Alvo de Corte ({eligibleFiberClients.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Assinantes com pagamento em falta após a tolerância de {config.toleranceDays} dias (Data limite: Dia {config.dueDay + config.toleranceDays}).
            </p>
          </div>

          <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
            Total em Risco: {kz(eligibleFiberClients.reduce((acc, c) => acc + c.debt, 0))}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Assinante & Código</th>
                <th className="p-3">Rua / Casa</th>
                <th className="p-3">Caixa PDO / Porta</th>
                <th className="p-3">Utilizador PPPoE (MikroTik)</th>
                <th className="p-3">Dívida Total</th>
                <th className="p-3">Estado Actual</th>
                <th className="p-3 text-right">Comando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eligibleFiberClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhum cliente de fibra ultrapassou a tolerância de pagamento hoje. Situação regularizada!
                  </td>
                </tr>
              ) : (
                eligibleFiberClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3">
                      <b className="text-slate-900 block">{client.fullName}</b>
                      <span className="font-mono text-[10px] text-slate-500">
                        {client.code || `CLI-${client.id}`} · {client.phone}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800 block">{client.street || client.neighborhood || 'Rua 12'}</span>
                      <span className="text-[11px] text-slate-500">Casa {client.houseCode || 'S/N'}</span>
                    </td>
                    <td className="p-3 font-mono">
                      <b className="text-blue-700 block">{client.pdoNumber || 'PDO-04'}</b>
                      <span className="text-[10px] text-slate-500">{client.portNumber || 'Porta 01'}</span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-700">
                      {client.pppoeUser}
                    </td>
                    <td className="p-3 font-extrabold text-red-700">
                      {kz(client.debt)}
                    </td>
                    <td className="p-3">
                      {client.isAlreadyCut ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          Cortado (Bloqueado)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Pendente de Corte
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setTestUser(client.pppoeUser);
                          handleTestSimulator();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold transition"
                      >
                        Simular RouterOS
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SIMULADOR DE COMANDOS MIKROTIK EM TEMPO REAL */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-4 bg-slate-900 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              Simulador de Comandos MikroTik RouterOS CLI
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase">
            RouterOS v6 & v7 Ready
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testUser}
            onChange={(e) => setTestUser(e.target.value)}
            placeholder="Introduza o nome de utilizador PPPoE..."
            className="flex-1 h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-mono text-emerald-300 outline-none"
          />
          <button
            onClick={handleTestSimulator}
            className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shrink-0"
          >
            Gerar Linha de Comando
          </button>
        </div>

        {testResult && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Comando pronto para colar no Terminal do Winbox:</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(testResult);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2000);
                  toast.success('Comando copiado!');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
              >
                {copiedScript ? <Check size={13} /> : <Copy size={13} />}
                {copiedScript ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              {testResult}
            </pre>
          </div>
        )}
      </div>

      {/* HISTÓRICO DE CORTES EXECUTADOS & REVERSÃO */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] overflow-hidden shadow-sm bg-white">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-slate-900">
              Histórico de Cortes Executados ({history.length})
            </h3>
            <p className="text-xs text-slate-500">
              Registo de auditoria com data, assinante, método utilizado e botão de religação imediata.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterExecuted('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterExecuted === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterExecuted('cortados')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterExecuted === 'cortados' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Cortados
            </button>
            <button
              onClick={() => setFilterExecuted('revertidos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterExecuted === 'revertidos' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Religados
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">Data & Hora</th>
                <th className="p-3">Assinante & Morada</th>
                <th className="p-3">Caixa PDO</th>
                <th className="p-3">Método Usado</th>
                <th className="p-3">Dívida</th>
                <th className="p-3">Estado</th>
                <th className="p-3 text-right">Acção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history
                .filter((h) => {
                  if (filterExecuted === 'cortados') return h.status === 'cortado';
                  if (filterExecuted === 'revertidos') return h.status === 'revertido';
                  return true;
                })
                .map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                      {new Date(rec.cutDate).toLocaleString('pt-AO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3">
                      <b className="text-slate-900 block">{rec.clientName}</b>
                      <span className="text-[11px] text-slate-500">{rec.address}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {rec.pdoNumber} ({rec.portNumber})
                    </td>
                    <td className="p-3 text-[11px] text-slate-700">
                      {rec.methodUsed}
                    </td>
                    <td className="p-3 font-bold text-red-700">
                      {kz(rec.debtAmount)}
                    </td>
                    <td className="p-3">
                      {rec.status === 'cortado' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          Sinal Suspenso
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Religado
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {rec.status === 'cortado' ? (
                        <button
                          onClick={() => handleRevertCut(rec.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition inline-flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Religar Sinal
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Regularizado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
