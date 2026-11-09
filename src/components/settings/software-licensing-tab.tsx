import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { ShieldCheck, KeyRound, Cpu, CheckCircle2, ExternalLink, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { getMachineHardwareId, getCurrentLicense, activateProductKey } from '@/lib/product-licensing';
import { toast } from 'sonner';

export function SoftwareLicensingTab() {
  const [license, setLicense] = useState(() => getCurrentLicense());
  const [hwid, setHwid] = useState(() => getMachineHardwareId());
  const [newKey, setNewKey] = useState('');

  useEffect(() => {
    const refresh = () => {
      setLicense(getCurrentLicense());
      setHwid(getMachineHardwareId());
    };
    window.addEventListener('gx-license-updated', refresh);
    return () => window.removeEventListener('gx-license-updated', refresh);
  }, []);

  const handleQuickActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    const res = activateProductKey(newKey);
    if (res.success) {
      toast.success(res.message);
      setNewKey('');
      setLicense(getCurrentLicense());
    } else {
      toast.error(res.message);
    }
  };

  const isActive = license.status === 'active';

  return (
    <div className="space-y-6">
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-5">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white font-serif text-xl font-bold ${
              isActive ? 'bg-emerald-600' : 'bg-amber-600'
            }`}>
              GX
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                Chave de Produto Semestral (6 Meses)
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Vinculação obrigatória ao Hardware ID deste computador.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isActive ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {isActive ? `Válida (${license.validDays} dias restantes)` : 'Chave Necessária'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-slate-50 p-4">
            <span className="text-[11px] text-slate-500 block font-bold uppercase">
              Hardware ID deste PC
            </span>
            <div className="mt-1 font-mono font-bold text-xs text-slate-900 break-all">
              {hwid}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Se instalado noutro computador, pedirá nova chave semestral.
            </span>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] bg-slate-50 p-4">
            <span className="text-[11px] text-slate-500 block font-bold uppercase">
              Ciclo de Validade
            </span>
            <div className="mt-1 font-bold text-sm text-slate-900">
              6 Meses (180 Dias)
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-0.5 block">
              Expira a: {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString('pt-AO') : '—'}
            </span>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] bg-slate-50 p-4">
            <span className="text-[11px] text-slate-500 block font-bold uppercase">
              Chave Instalada
            </span>
            <div className="mt-1 font-mono font-bold text-xs text-slate-900 truncate">
              {license.productKey || 'OSDEL2026FIBRA6M'}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {license.companyName}
            </span>
          </div>
        </div>

        {/* Quick Key Activation Box */}
        <form onSubmit={handleQuickActivate} className="pt-2 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Inserir nova Chave de Produto de 6 meses..."
            className="flex-1 h-10 rounded-xl border border-slate-300 font-mono text-xs px-3 uppercase font-bold focus:border-[hsl(var(--primary))] outline-none"
          />
          <button
            type="submit"
            className="h-10 px-4 rounded-xl bg-[hsl(var(--primary))] text-white text-xs font-bold hover:brightness-110 shrink-0"
          >
            Activar / Renovar 6 Meses
          </button>
        </form>

        <div className="border-t border-[hsl(var(--border))] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            <p>
              Caso execute o Gestão X num novo PC, copie o Hardware ID e use o gerador de chaves para emitir a chave autorizada de 6 meses.
            </p>
          </div>

          <Link
            href="/licenciamento"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-black transition"
          >
            <ShieldCheck size={15} />
            <span>Painel Completo de Chave & Gerador</span>
            <ExternalLink size={12} className="opacity-70" />
          </Link>
        </div>
      </div>
    </div>
  );
}
