import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Share2,
  ShieldCheck,
  KeyRound,
  X,
  Lock,
} from 'lucide-react';
import {
  getClientCredentials,
  generateOrResetClientCredentials,
  type ClientCredentials,
} from '@/lib/client-auth';
import { getCompanyLogo } from '@/lib/company-logo';
import { triggerPrint } from '@/lib/printer';

interface ClientCredentialsModalProps {
  client: any;
  onClose: () => void;
}

export function ClientCredentialsModal({ client, onClose }: ClientCredentialsModalProps) {
  const [creds, setCreds] = useState<ClientCredentials | null>(() => {
    let existing = getClientCredentials(client.id);
    if (!existing) {
      existing = generateOrResetClientCredentials(client);
    }
    return existing;
  });

  const [copied, setCopied] = useState(false);
  const logoUrl = getCompanyLogo();

  const handleRegenerate = () => {
    if (window.confirm(`Deseja gerar um novo PIN para o cliente ${client.fullName}? O PIN anterior deixará de funcionar.`)) {
      const fresh = generateOrResetClientCredentials(client);
      setCreds(fresh);
    }
  };

  const handleCopy = () => {
    if (!creds) return;
    const text = `*OSDEL TECNOLOGIA - DADOS DE ACESSO AO APLICATIVO MOBILE*\n` +
      `Olá ${client.fullName},\n` +
      `Seguem os seus dados de acesso ao aplicativo da OSDEL:\n` +
      `• *Código de Contrato:* ${creds.clientCode}\n` +
      `• *PIN de Acesso (4 Dígitos):* ${creds.pin}\n` +
      `• *Senha Alternativa:* ${creds.password}\n` +
      `Descarregue o app para ver suas facturas, fazer acordos e relatar avarias!\n` +
      `Suporte OSDEL: +244 945 882 103`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsApp = () => {
    if (!creds) return;
    const cleanPhone = client.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `*OSDEL TECNOLOGIA - ACESSO AO APLICATIVO CLIENTE*\n` +
      `Olá ${client.fullName},\n` +
      `Os seus dados de acesso ao app OSDEL foram gerados:\n` +
      `👤 *Código do Cliente:* ${creds.clientCode}\n` +
      `🔑 *PIN de Acesso:* ${creds.pin}\n` +
      `Use este PIN para consultar suas facturas, contratos e protecção de sinal.\n` +
      `Atendimento OSDEL TECNOLOGIA`,
    );
    window.open(`https://wa.me/${cleanPhone.startsWith('244') ? cleanPhone : '244' + cleanPhone}?text=${message}`, '_blank');
  };

  const handlePrint = () => {
    triggerPrint({ elementId: 'printable-credentials-card' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142f35]/50 p-4 backdrop-blur-sm printable-modal-overlay print:static print:p-0 print:bg-white print:z-auto print:block">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[hsl(var(--card))] shadow-2xl border border-[hsl(var(--border))] modal-printable-container print:max-w-none print:shadow-none print:border-none print:p-0 print:overflow-visible">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.98)] px-6 py-4 backdrop-blur print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Smartphone size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">APK Cliente Mobile</p>
              <h3 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">Credenciais de Acesso</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-6 space-y-6 print:p-0">
          {/* Printable Credentials Card */}
          <div id="printable-credentials-card" className="credentials-print-card relative overflow-hidden rounded-2xl border-2 border-blue-500/40 bg-gradient-to-br from-slate-900 to-blue-950 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="OSDEL"
                  className="h-11 w-11 rounded-full border border-white/30 bg-white p-0.5 object-contain"
                />
                <div>
                  <h4 className="font-serif text-base font-bold tracking-tight">OSDEL TECNOLOGIA</h4>
                  <p className="text-[9px] uppercase tracking-widest text-blue-300 font-semibold">
                    Cartão de Acesso do Assinante
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                Acesso Activo
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[10px] uppercase text-slate-400 font-medium">Nome do Assinante</p>
                <p className="text-base font-black text-white">{client.fullName}</p>
                <p className="text-xs text-blue-200 font-mono">{client.code} · {client.phone}</p>
              </div>

              {/* PIN Box */}
              <div className="rounded-xl bg-black/40 border border-white/15 p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-blue-300 tracking-wider flex items-center gap-1.5">
                    <KeyRound size={12} /> PIN de Acesso (APK Mobile)
                  </p>
                  <p className="font-mono text-3xl font-black tracking-widest text-emerald-400 mt-0.5">
                    {creds?.pin || '----'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-400">Senha Padrão</p>
                  <p className="font-mono text-xs font-bold text-slate-200">{creds?.password}</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-300 flex items-center gap-2 pt-1">
                <ShieldCheck size={14} className="text-blue-400 shrink-0" />
                <span>Válido para o app móvel Android oficial da OSDEL Tecnologia.</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 print:hidden">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition cursor-pointer"
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              {copied ? 'Copiado!' : 'Copiar Dados'}
            </button>

            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold hover:bg-emerald-500 transition shadow-sm cursor-pointer"
            >
              <Share2 size={15} /> Enviar WhatsApp
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition cursor-pointer"
            >
              <Printer size={15} /> Imprimir Cartão
            </button>

            <button
              onClick={handleRegenerate}
              className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 px-4 py-2.5 text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw size={15} /> Gerar Novo PIN
            </button>
          </div>

          <div className="rounded-xl bg-[hsl(var(--secondary)/.6)] p-3.5 text-xs text-[hsl(var(--muted-foreground))] space-y-1 print:hidden">
            <p className="font-bold text-[hsl(var(--foreground))]">Como o cliente entra no aplicativo:</p>
            <p>1. O cliente abre o APK no seu telemóvel Android.</p>
            <p>2. Insere o código do contrato (<b>{client.code}</b>) ou o seu número de telefone.</p>
            <p>3. Digita o PIN de 4 dígitos (<b>{creds?.pin}</b>) e clica em <b>Entrar</b>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
