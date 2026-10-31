import { useState } from 'react';
import {
  MessageSquare,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
} from 'lucide-react';
import { Field, Input, Textarea, Button } from '@/components/shared-ui';

interface CommunicationsTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
}

export function CommunicationsTab({ form, set, isAdmin }: CommunicationsTabProps) {
  const [testPhone, setTestPhone] = useState('926153736');
  const [testSent, setTestSent] = useState(false);
  const [activePreviewTemplate, setActivePreviewTemplate] = useState<'reminder' | 'due' | 'cut' | 'receipt' | 'welcome'>('reminder');

  const sampleData = {
    cliente: 'António Sebastião Manuel',
    valor: '4.000 Kz',
    vencimento: '05 de Outubro',
    referencia: 'CLI-00042',
    iban: form.bank1Iban || 'AO06.0040.0000.1234.5678.9012.3',
    recibo: 'FR-2026/00189',
    mes: 'Outubro/2026',
    plano: 'TV + Fibra 22',
  };

  const getPreviewText = (template: string) => {
    return (template || '')
      .replace(/{cliente}/g, sampleData.cliente)
      .replace(/{valor}/g, sampleData.valor)
      .replace(/{vencimento}/g, sampleData.vencimento)
      .replace(/{referencia}/g, sampleData.referencia)
      .replace(/{iban}/g, sampleData.iban)
      .replace(/{recibo}/g, sampleData.recibo)
      .replace(/{mes}/g, sampleData.mes)
      .replace(/{plano}/g, sampleData.plano);
  };

  const templates = {
    reminder: form.templateReminderBefore || 'Olá {cliente}, lembramos que a mensalidade do seu serviço OSDEL vence dia {vencimento} no valor de {valor}. Pague por Multicaixa Express ou no nosso balcão para evitar interrupções.',
    due: form.templateDueToday || 'OSDEL: A sua mensalidade de {valor} vence hoje ({vencimento}). Referência de pagamento: {referencia}. IBAN BAI: {iban}. Obrigado pela preferência!',
    cut: form.templateCutWarning || 'Aviso OSDEL: O prazo de tolerância expirou. Evite o corte do sinal e a taxa de religação liquidando hoje o valor de {valor}. Apoio: 926 153 736.',
    receipt: form.templatePaymentConfirmation || 'OSDEL: Confirmamos a recepção do seu pagamento de {valor} referente a {mes}. O seu sinal encontra-se regularizado. Recibo n.º {recibo}.',
    welcome: form.templateWelcome || 'Bem-vindo à OSDEL Tecnologia, {cliente}! A sua adesão ao serviço ({plano}) foi concluída com sucesso. Apoio técnico: 926 153 736.',
  };

  return (
    <div className="space-y-7">
      {/* 1. GATEWAYS DE ENVIO (SMS & WHATSAPP) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* GATEWAY SMS */}
        <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <MessageSquare size={20} />
            </div>
            <div>
              <p className="eyebrow">Gateway de Mensagens</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Configuração de SMS</h2>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer">
              <input
                type="checkbox"
                checked={form.smsEnabled ?? true}
                onChange={(e) => set('smsEnabled', e.target.checked)}
                disabled={!isAdmin}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              Activar Envio Automático de SMS
            </label>

            <Field label="Provedor de SMS">
              <Input
                value={form.smsProvider || 'BulkSMS Angola / Unitel API'}
                onChange={(e) => set('smsProvider', e.target.value)}
                disabled={!isAdmin}
                placeholder="BulkSMS Angola / Unitel API"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do Remetente (Sender ID)">
                <Input
                  value={form.smsSender || 'OSDEL'}
                  onChange={(e) => set('smsSender', e.target.value)}
                  disabled={!isAdmin}
                  className="font-bold uppercase"
                  placeholder="OSDEL"
                />
              </Field>

              <Field label="Dias de Antecedência do Lembrete">
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={form.reminderDaysBeforeDue ?? 2}
                  onChange={(e) => set('reminderDaysBeforeDue', Number(e.target.value))}
                  disabled={!isAdmin}
                />
              </Field>
            </div>

            <Field label="URL da API de SMS">
              <Input
                value={form.smsApiUrl || 'https://api.bulksmsangola.ao/v2/messages'}
                onChange={(e) => set('smsApiUrl', e.target.value)}
                disabled={!isAdmin}
                className="font-mono text-xs"
                placeholder="https://api.bulksmsangola.ao/..."
              />
            </Field>

            <Field label="Chave de Autenticação / Token API">
              <Input
                type="password"
                value={form.smsApiKey || '••••••••••••••••••••'}
                onChange={(e) => set('smsApiKey', e.target.value)}
                disabled={!isAdmin}
                className="font-mono text-xs"
              />
            </Field>
          </div>
        </section>

        {/* GATEWAY WHATSAPP */}
        <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <Zap size={20} />
            </div>
            <div>
              <p className="eyebrow">Canal Alternativo</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Integração WhatsApp API</h2>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer">
              <input
                type="checkbox"
                checked={form.whatsappEnabled ?? true}
                onChange={(e) => set('whatsappEnabled', e.target.checked)}
                disabled={!isAdmin}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              Activar Notificações por WhatsApp
            </label>

            <Field label="Gateway / API WhatsApp">
              <Input
                value={form.whatsappGateway || 'https://api.whatsapp.com/send'}
                onChange={(e) => set('whatsappGateway', e.target.value)}
                disabled={!isAdmin}
                placeholder="Z-API / Evolution API / Link Direto"
              />
            </Field>

            <Field label="Número WhatsApp Oficial da OSDEL">
              <Input
                value={form.companyWhatsApp || '+244 926 153 736'}
                onChange={(e) => set('companyWhatsApp', e.target.value)}
                disabled={!isAdmin}
                placeholder="+244 926 153 736"
              />
            </Field>

            <div className="p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-xs space-y-2">
              <p className="font-bold text-[hsl(var(--foreground))]">Teste de Disparo de Notificação</p>
              <div className="flex gap-2">
                <Input
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="926153736"
                  className="h-8 text-xs font-mono"
                />
                <Button
                  variant="outline"
                  className="h-8 text-xs whitespace-nowrap"
                  onClick={() => {
                    setTestSent(true);
                    setTimeout(() => setTestSent(false), 3000);
                  }}
                >
                  <Send size={13} /> {testSent ? 'Enviado!' : 'Simular'}
                </Button>
              </div>
              {testSent && (
                <p className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                  <CheckCircle2 size={13} /> Notificação de teste enviada com sucesso para +244 {testPhone}!
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 2. MODELOS DE MENSAGENS PERSONALIZADOS & PRÉ-VISUALIZAÇÃO */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
              <Smartphone size={20} />
            </div>
            <div>
              <p className="eyebrow">Personalização de Textos</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Modelos de Notificação & Variáveis</h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 bg-[hsl(var(--secondary))] p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActivePreviewTemplate('reminder')}
              className={`px-3 py-1.5 rounded-lg transition ${activePreviewTemplate === 'reminder' ? 'bg-[hsl(var(--card))] shadow-xs text-blue-600' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Lembrete
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTemplate('due')}
              className={`px-3 py-1.5 rounded-lg transition ${activePreviewTemplate === 'due' ? 'bg-[hsl(var(--card))] shadow-xs text-blue-600' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Vencimento
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTemplate('cut')}
              className={`px-3 py-1.5 rounded-lg transition ${activePreviewTemplate === 'cut' ? 'bg-[hsl(var(--card))] shadow-xs text-blue-600' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Aviso de Corte
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTemplate('receipt')}
              className={`px-3 py-1.5 rounded-lg transition ${activePreviewTemplate === 'receipt' ? 'bg-[hsl(var(--card))] shadow-xs text-blue-600' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Recibo
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTemplate('welcome')}
              className={`px-3 py-1.5 rounded-lg transition ${activePreviewTemplate === 'welcome' ? 'bg-[hsl(var(--card))] shadow-xs text-blue-600' : 'text-[hsl(var(--muted-foreground))]'}`}
            >
              Boas-vindas
            </button>
          </div>
        </div>

        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Variáveis disponíveis: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-[11px]">{'{cliente}'}</code>,{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-[11px]">{'{valor}'}</code>,{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-[11px]">{'{vencimento}'}</code>,{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-[11px]">{'{referencia}'}</code>,{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-[11px]">{'{iban}'}</code>,{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-[11px]">{'{recibo}'}</code>,{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-[11px]">{'{mes}'}</code>,{' '}
          <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono text-[11px]">{'{plano}'}</code>.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="space-y-4">
            {activePreviewTemplate === 'reminder' && (
              <Field label="Texto do Lembrete Preventivo (Antes do Vencimento)">
                <Textarea
                  rows={4}
                  value={form.templateReminderBefore || ''}
                  onChange={(e) => set('templateReminderBefore', e.target.value)}
                  disabled={!isAdmin}
                />
              </Field>
            )}

            {activePreviewTemplate === 'due' && (
              <Field label="Texto da Mensagem no Dia do Vencimento">
                <Textarea
                  rows={4}
                  value={form.templateDueToday || ''}
                  onChange={(e) => set('templateDueToday', e.target.value)}
                  disabled={!isAdmin}
                />
              </Field>
            )}

            {activePreviewTemplate === 'cut' && (
              <Field label="Texto do Aviso de Corte Iminente">
                <Textarea
                  rows={4}
                  value={form.templateCutWarning || ''}
                  onChange={(e) => set('templateCutWarning', e.target.value)}
                  disabled={!isAdmin}
                />
              </Field>
            )}

            {activePreviewTemplate === 'receipt' && (
              <Field label="Texto de Confirmação de Pagamento / Recibo">
                <Textarea
                  rows={4}
                  value={form.templatePaymentConfirmation || ''}
                  onChange={(e) => set('templatePaymentConfirmation', e.target.value)}
                  disabled={!isAdmin}
                />
              </Field>
            )}

            {activePreviewTemplate === 'welcome' && (
              <Field label="Texto de Boas-vindas para Novo Cliente">
                <Textarea
                  rows={4}
                  value={form.templateWelcome || ''}
                  onChange={(e) => set('templateWelcome', e.target.value)}
                  disabled={!isAdmin}
                />
              </Field>
            )}
          </div>

          {/* SIMULADOR DE MENSAGEM NO TELEMÓVEL */}
          <div className="rounded-2xl border-2 border-slate-300 bg-slate-900 p-4 text-white shadow-md flex flex-col justify-between max-w-sm mx-auto w-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="font-bold flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                OSDEL Informa
              </span>
              <span>Hoje 10:45</span>
            </div>

            <div className="my-4 bg-slate-800/90 rounded-xl p-3.5 border border-slate-700 text-xs leading-relaxed text-slate-100">
              <p className="whitespace-pre-line font-sans">{getPreviewText(templates[activePreviewTemplate])}</p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Remetente: {form.smsSender || 'OSDEL'}</span>
              <span className="font-mono">{getPreviewText(templates[activePreviewTemplate]).length} carateres</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
