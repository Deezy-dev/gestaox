import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Laptop,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Lock,
  Calendar,
  Layers,
  HelpCircle,
  Cpu,
} from 'lucide-react';
import {
  getMachineHardwareId,
  getCurrentLicense,
  activateProductKey,
  generate6MonthProductKey,
  simulateNewComputerForTesting,
  type ProductLicense,
} from '@/lib/product-licensing';
import { toast } from 'sonner';

export function SoftwareLicensingPage() {
  const [license, setLicense] = useState<ProductLicense>(() => getCurrentLicense());
  const [currentHwid, setCurrentHwid] = useState(() => getMachineHardwareId());
  const [inputKey, setInputKey] = useState('');
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Admin Key Generator Tool state
  const [genHwid, setGenHwid] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    const refresh = () => {
      setLicense(getCurrentLicense());
      setCurrentHwid(getMachineHardwareId());
    };
    window.addEventListener('gx-license-updated', refresh);
    return () => window.removeEventListener('gx-license-updated', refresh);
  }, []);

  const handleCopyHwid = (hwidText: string) => {
    navigator.clipboard.writeText(hwidText);
    setCopiedHwid(true);
    setTimeout(() => setCopiedHwid(false), 2500);
    toast.success('Hardware ID copiado para a área de transferência!');
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      toast.error('Introduza uma chave de produto de 6 meses.');
      return;
    }

    const res = activateProductKey(inputKey);
    if (res.success) {
      toast.success(res.message);
      setInputKey('');
      setLicense(getCurrentLicense());
    } else {
      toast.error(res.message);
    }
  };

  const handleGenerateAdminKey = () => {
    const target = genHwid.trim() || currentHwid;
    const newKey = generate6MonthProductKey(target);
    setGeneratedKey(newKey);
    toast.success('Chave Semestral (6 Meses) gerada com sucesso!');
  };

  const handleSimulateNewPc = () => {
    if (confirm('Deseja simular a execução deste software num NOVO computador? O sistema irá gerar um novo Hardware ID e solicitar a chave de activação.')) {
      simulateNewComputerForTesting();
      setLicense(getCurrentLicense());
      setCurrentHwid(getMachineHardwareId());
      toast.info('Novo Computador detectado! A licença anterior ficou bloqueada até introdução de nova chave.');
    }
  };

  const isInvalidMachine = license.status === 'invalid_machine';
  const isExpired = license.status === 'expired';
  const isActive = license.status === 'active';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Segurança & Activação de Estação de Trabalho</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.4rem] font-bold text-slate-900">
            Chave de Produto & Licença Semestral
          </h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] max-w-2xl">
            Validação de produto por período de 6 meses, com bloqueio automático vinculado ao Hardware ID do computador. Se instalado num novo PC, exige a activação com chave semestral.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSimulateNewPc}
            title="Testa a regra de detecção de novo computador"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <Laptop size={14} /> Testar: Simular Novo PC
          </button>
        </div>
      </div>

      {/* ALERT BANNER: NOVO COMPUTADOR DETECTADO */}
      {isInvalidMachine && (
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-6 shadow-md text-amber-900 space-y-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-white shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-amber-950">
                Novo Computador Detectado!
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Este software foi instalado ou transferido para uma nova máquina (Hardware ID: <b>{currentHwid}</b>). 
                Para continuar a utilizar o sistema neste novo PC, introduza a <b>Chave de Produto Semestral (6 Meses)</b> autorizada abaixo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ALERT BANNER: LICENÇA EXPIRADA */}
      {isExpired && (
        <div className="rounded-2xl border-2 border-red-500 bg-red-50 p-6 shadow-md text-red-900 space-y-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-white shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-red-950">
                Licença Semestral Expirada (6 Meses)
              </h3>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                O ciclo de 6 meses desta licença expirou a {new Date(license.expiresAt).toLocaleDateString('pt-AO')}. 
                Insira a nova chave de produto para renovar por mais 6 meses.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STATUS CARD: HARDWARE ID & STATUS */}
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        {/* Left: Current Machine & License Card */}
        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-5 bg-white">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-xl text-white shadow-sm ${
                isActive ? 'bg-emerald-600' : isInvalidMachine ? 'bg-amber-500' : 'bg-red-600'
              }`}>
                {isActive ? <ShieldCheck size={24} /> : <Lock size={22} />}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Estado da Licença
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {isActive
                    ? 'Licença Semestral Activa'
                    : isInvalidMachine
                    ? 'Chave Necessária (Novo PC)'
                    : 'Licença Expirada'}
                </h3>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              isActive
                ? 'bg-emerald-100 text-emerald-800'
                : isInvalidMachine
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {isActive ? '6 Meses Válido' : isInvalidMachine ? 'Bloqueado' : 'Expirado'}
            </span>
          </div>

          {/* Machine Hardware ID Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Cpu size={14} className="text-blue-600" /> ID Único deste Computador (Hardware ID):
              </span>
              <button
                type="button"
                onClick={() => handleCopyHwid(currentHwid)}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
              >
                {copiedHwid ? <Check size={13} /> : <Copy size={13} />}
                {copiedHwid ? 'Copiado!' : 'Copiar ID'}
              </button>
            </div>
            <div className="font-mono text-xs font-bold bg-slate-900 text-emerald-400 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span>{currentHwid}</span>
              <span className="text-[10px] text-slate-400 font-sans uppercase">Bloqueio Físico</span>
            </div>
            <small className="block text-[11px] text-slate-500">
              Identificador imutável deste processador e motherboard. Impede a clonagem não autorizada do software.
            </small>
          </div>

          {/* Validity details */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Dias Restantes
              </span>
              <b className="text-xl font-black text-slate-900 block mt-0.5">
                {license.validDays} dias
              </b>
              <span className="text-[11px] text-slate-500">Ciclo de 180 dias</span>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Expiração Prevista
              </span>
              <b className="text-sm font-black text-slate-900 block mt-1">
                {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString('pt-AO') : '—'}
              </b>
              <span className="text-[11px] text-slate-500">Renovação a cada 6 meses</span>
            </div>
          </div>

          {/* Current Key in use */}
          {license.productKey && (
            <div className="pt-2 border-t text-xs flex items-center justify-between text-slate-500">
              <span>Chave Instalada: <b className="font-mono text-slate-800">{license.productKey}</b></span>
              <span>Empresa: <b>{license.companyName}</b></span>
            </div>
          )}
        </div>

        {/* Right: Activation Form */}
        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-5 bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound size={20} className="text-[hsl(var(--primary))]" />
              <h3 className="font-extrabold text-base text-slate-900">
                Introduzir Chave de 6 Meses
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Para validar este computador ou renovar por mais 6 meses, introduza a chave de produto fornecida pelo suporte ou gerador mestre.
            </p>

            <form onSubmit={handleActivate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chave do Produto (Formato: GX6M-XXXX-XXXX-XXXX)
                </label>
                <input
                  type="text"
                  required
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="ex.: GX6M-7F3A-4E90-112B ou OSDEL2026FIBRA6M"
                  className="w-full h-11 rounded-xl border border-slate-300 font-mono text-xs px-3 font-bold uppercase tracking-wider focus:border-[hsl(var(--primary))] outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[hsl(var(--primary))] text-white text-xs font-bold hover:brightness-110 shadow-sm transition flex items-center justify-center gap-2"
              >
                <ShieldCheck size={16} /> Activar Licença de 6 Meses
              </button>
            </form>
          </div>

          <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-200/80 text-[11px] text-blue-900 space-y-1">
            <b className="flex items-center gap-1">
              <Sparkles size={13} className="text-blue-600" /> Chaves Universais de Inicialização:
            </b>
            <p className="text-blue-800">
              Pode utilizar a chave autorizada <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300">OSDEL2026FIBRA6M</code> para desbloqueio imediato por 6 meses.
            </p>
          </div>
        </div>
      </div>

      {/* GERADOR DE CHAVES SEMESTRAIS PARA ADMINISTRADORES */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-4 bg-slate-900 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white">
              <KeyRound size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Ferramenta do Administrador / Gestor do Sistema
              </span>
              <h3 className="text-lg font-black text-white">
                Gerador de Chaves de Produto (6 Meses)
              </h3>
            </div>
          </div>

          <span className="text-xs text-slate-400">
            Acesso Restrito: Albert / Deezy
          </span>
        </div>

        <p className="text-xs text-slate-300 max-w-2xl">
          Sempre que um novo computador for instalado num posto de trabalho, copie o Hardware ID dessa máquina e clique abaixo para gerar a respectiva Chave de Produto de 6 meses vinculada.
        </p>

        <div className="grid sm:grid-cols-[1fr_auto] gap-3">
          <input
            type="text"
            value={genHwid}
            onChange={(e) => setGenHwid(e.target.value)}
            placeholder={`Hardware ID do computador destino (padrão: ${currentHwid})`}
            className="h-10 rounded-xl bg-slate-800 border border-slate-700 px-3 text-xs font-mono text-emerald-300 outline-none"
          />
          <button
            type="button"
            onClick={handleGenerateAdminKey}
            className="h-10 px-5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-2 shrink-0"
          >
            <Sparkles size={15} /> Gerar Chave Semestral
          </button>
        </div>

        {generatedKey && (
          <div className="mt-3 p-4 rounded-xl bg-slate-800 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Chave Gerada (Válida por 180 dias):
              </span>
              <span className="font-mono text-lg font-black text-emerald-400 tracking-wider">
                {generatedKey}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                  toast.success('Chave copiada!');
                }}
                className="px-3.5 py-2 rounded-lg bg-emerald-500 text-slate-900 font-bold text-xs hover:bg-emerald-400 transition flex items-center gap-1.5"
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                {copiedKey ? 'Copiada' : 'Copiar Chave'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputKey(generatedKey);
                  toast.info('Chave colada no campo de activação acima!');
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-700 text-white font-bold text-xs hover:bg-slate-600 transition"
              >
                Usar Neste PC
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
