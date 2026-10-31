import { useState } from 'react';
import {
  Receipt,
  FileText,
  Printer,
  Sparkles,
  RotateCcw,
  Eye,
  Check,
  Copy,
  Lock,
  Building2,
  ShieldCheck,
  Landmark,
  X,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/shared-ui';
import { getCompanyLogo } from '@/lib/company-logo';
import type { AnyRecord } from '@/lib/local-api';

interface InvoiceTemplateTabProps {
  form: AnyRecord;
  set: (key: string, value: unknown) => void;
  isAdmin: boolean;
}

export function InvoiceTemplateTab({ form, set, isAdmin }: InvoiceTemplateTabProps) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'a4' | 'pos'>('a4');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const copyVariableTag = (tag: string) => {
    navigator.clipboard?.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleResetDefaults = () => {
    if (!isAdmin) return;
    if (confirm('Tem a certeza de que deseja restaurar os textos padrão de Factura e Recibo da OSDEL?')) {
      set('invoiceTitle', 'Factura / Recibo');
      set('invoiceProformaTitle', 'Factura Proforma');
      set('invoiceVoidTitle', 'Factura Anulada');
      set('invoiceSubtitle', 'TV COMUNITÁRIA · INTERNET FIBRA ÓPTICA');
      set('invoiceDefaultItemDescription', 'Mensalidade de Serviço OSDEL ({MES_REFERENCIA})');
      set('invoiceDefaultItemNotes', 'Fornecimento de sinal de TV por cabo / Internet Fibra nos termos acordados.');
      set('invoiceTaxExemptionReason', 'Regime de Exclusão do IVA nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA).');
      set('invoiceFooter', 'Documento emitido pelo sistema de gestão da OSDEL TECNOLOGIA. Processado por computador. Válido com carimbo oficial.');
      set('invoiceBankingNotes', 'Por favor, indique o número da factura ou código do assinante no descritivo da transferência bancária.');
      set('invoiceStampTitle', 'OSDEL TECNOLOGIA');
      set('invoiceStampSubtitle', 'Carimbo & Chancela Digital');
      set('invoiceStampBadge', 'AUTENTICADO');
      set('thermalFooterMessage', 'Obrigado pela sua preferência!\nGuarde este talão como comprovativo de pagamento e garantia de sinal.');
      set('thermalWarningText', 'Atrasos superiores a 5 dias implicam suspensão imediata de sinal e cobrança de taxa de religação.');
    }
  };

  const tagsList = [
    { tag: '{CLIENTE}', label: 'Nome do cliente ou assinante' },
    { tag: '{CODIGO_CLIENTE}', label: 'Código do cliente (ex: CLI-00101)' },
    { tag: '{MES_REFERENCIA}', label: 'Mês ou período (ex: Outubro 2026)' },
    { tag: '{VALOR}', label: 'Valor base do serviço (ex: 4.000 Kz)' },
    { tag: '{MULTA}', label: 'Valor da multa por atraso (ex: 1.000 Kz)' },
    { tag: '{TOTAL}', label: 'Total final liquidado' },
    { tag: '{FORMA_PAGAMENTO}', label: 'Forma de pagamento (Multicaixa / Cash)' },
    { tag: '{NUMERO_FACTURA}', label: 'Número da factura (ex: FT-2026/00142)' },
    { tag: '{DATA}', label: 'Data de emissão da factura' },
    { tag: '{OPERADOR}', label: 'Nome do operador ou caixa' },
    { tag: '{EMPRESA}', label: 'Nome comercial da empresa' },
    { tag: '{NIF}', label: 'NIF oficial da empresa' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. STATUS DE AUTORIZAÇÃO / RBAC */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isAdmin ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
      }`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
            isAdmin ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}>
            {isAdmin ? <Receipt size={18} /> : <Lock size={18} />}
          </div>
          <div>
            <h3 className={`text-sm font-black ${isAdmin ? 'text-emerald-950' : 'text-amber-950'}`}>
              {isAdmin
                ? 'Perfil Administrador: Edição dos Textos e Menções da Factura Autorizada'
                : 'Acesso Restrito: Apenas Administradores podem alterar os textos da Factura'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Personalize títulos, subtítulos, descritivos padrão, menção de isenção de IVA, rodapé institucional e carimbo digital da Factura A4 e do Talão Térmico POS.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => setShowPreviewModal(true)}
            className="h-9 text-xs font-bold bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
          >
            <Eye size={14} className="mr-1.5 text-blue-600" /> Pré-visualizar Factura
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleResetDefaults}
              className="h-9 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-50"
              title="Voltar aos textos originais da OSDEL"
            >
              <RotateCcw size={13} className="mr-1.5 text-slate-500" /> Repor Padrão
            </Button>
          )}
        </div>
      </div>

      {/* 2. TÍTULOS E IDENTIFICAÇÃO DO DOCUMENTO */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-blue-600 text-white text-xs font-bold">1</span>
            Títulos Principais dos Documentos Fiscais
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Defina o nome dos documentos impressos para facturação regular, proformas e documentos anulados.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Título da Factura Regular
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.invoiceTitle ?? 'Factura / Recibo'}
              onChange={(e) => set('invoiceTitle', e.target.value)}
              placeholder="ex: Factura / Recibo"
              className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm font-bold text-blue-900 outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Título da Factura Proforma
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.invoiceProformaTitle ?? 'Factura Proforma'}
              onChange={(e) => set('invoiceProformaTitle', e.target.value)}
              placeholder="ex: Factura Proforma"
              className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Título de Documento Anulado
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.invoiceVoidTitle ?? 'Factura Anulada'}
              onChange={(e) => set('invoiceVoidTitle', e.target.value)}
              placeholder="ex: Factura Anulada"
              className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm font-bold text-red-700 outline-none focus:border-red-600 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">
            Subtítulo Institucional da Empresa na Factura
          </label>
          <input
            type="text"
            disabled={!isAdmin}
            value={form.invoiceSubtitle ?? 'TV COMUNITÁRIA · INTERNET FIBRA ÓPTICA'}
            onChange={(e) => set('invoiceSubtitle', e.target.value)}
            placeholder="ex: TV COMUNITÁRIA · INTERNET FIBRA ÓPTICA"
            className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm font-bold text-blue-600 outline-none focus:border-blue-600 disabled:opacity-60"
          />
        </div>
      </div>

      {/* 3. DESCRIÇÃO PADRÃO DE SERVIÇO & OBSERVAÇÕES */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-blue-600 text-white text-xs font-bold">2</span>
            Descrições Padrão de Linha & Observações Técnicas
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Texto predefinido das linhas de itens ao emitir uma cobrança ou factura automática.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Descrição Padrão do Item de Serviço
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.invoiceDefaultItemDescription ?? 'Mensalidade de Serviço OSDEL ({MES_REFERENCIA})'}
              onChange={(e) => set('invoiceDefaultItemDescription', e.target.value)}
              placeholder="ex: Mensalidade de Serviço OSDEL ({MES_REFERENCIA})"
              className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-blue-600 disabled:opacity-60"
            />
            <span className="text-[11px] text-slate-500">
              Pode utilizar a tag <code>{'{MES_REFERENCIA}'}</code> para inserir automaticamente o mês correspondente.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Observações / Nota Explicativa do Serviço
            </label>
            <textarea
              rows={2}
              disabled={!isAdmin}
              value={form.invoiceDefaultItemNotes ?? 'Fornecimento de sinal de TV por cabo / Internet Fibra nos termos acordados.'}
              onChange={(e) => set('invoiceDefaultItemNotes', e.target.value)}
              placeholder="Texto explicativo impresso abaixo do nome do item..."
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-sm outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* 4. ENQUADRAMENTO FISCAL DO IVA & COORDENADAS BANCÁRIAS */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-blue-600 text-white text-xs font-bold">3</span>
            Enquadramento Fiscal do IVA & Coordenadas Bancárias
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Nota de isenção tributária legal e orientações para pagamento via transferência.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Menção Legal de Isenção / Regime do IVA (AGT Angola)
            </label>
            <textarea
              rows={2}
              disabled={!isAdmin}
              value={form.invoiceTaxExemptionReason ?? 'Regime de Exclusão do IVA nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA).'}
              onChange={(e) => set('invoiceTaxExemptionReason', e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-sm outline-none focus:border-blue-600 disabled:opacity-60"
            />
            <span className="text-[11px] text-slate-500">
              Texto obrigatório que aparece na caixa de resumo tributário da Factura A4.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Instruções de Pagamento Bancário (Coordenadas)
            </label>
            <input
              type="text"
              disabled={!isAdmin}
              value={form.invoiceBankingNotes ?? 'Por favor, indique o número da factura ou código do assinante no descritivo da transferência bancária.'}
              onChange={(e) => set('invoiceBankingNotes', e.target.value)}
              placeholder="ex: Por favor, indique o número da factura no descritivo..."
              className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* 5. RODAPÉ INSTITUCIONAL & CARIMBO DIGITAL */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-blue-600 text-white text-xs font-bold">4</span>
            Rodapé da Factura A4 & Chancela Digital
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Texto de encerramento da página A4 e carimbo digital de validação.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Texto de Rodapé da Factura A4
            </label>
            <textarea
              rows={2}
              disabled={!isAdmin}
              value={form.invoiceFooter ?? 'Documento emitido pelo sistema de gestão da OSDEL TECNOLOGIA. Processado por computador. Válido com carimbo oficial.'}
              onChange={(e) => set('invoiceFooter', e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-sm outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Nome no Carimbo Digital
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.invoiceStampTitle ?? 'OSDEL TECNOLOGIA'}
                onChange={(e) => set('invoiceStampTitle', e.target.value)}
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-bold outline-none focus:border-blue-600 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Subtítulo do Carimbo
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.invoiceStampSubtitle ?? 'Carimbo & Chancela Digital'}
                onChange={(e) => set('invoiceStampSubtitle', e.target.value)}
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs outline-none focus:border-blue-600 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Selo de Autenticação
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={form.invoiceStampBadge ?? 'AUTENTICADO'}
                onChange={(e) => set('invoiceStampBadge', e.target.value)}
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-xs font-mono font-bold text-blue-700 outline-none focus:border-blue-600 disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. TEXTO DO TALÃO TÉRMICO POS (80MM / 58MM) */}
      <div className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-emerald-600 text-white text-xs font-bold">5</span>
            Textos do Talão Térmico POS (Impressora de Balcão)
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
            Mensagens impressas no final do talão térmico POS 80mm ou 58mm.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Mensagem de Agradecimento e Comprovativo
            </label>
            <textarea
              rows={2}
              disabled={!isAdmin}
              value={form.thermalFooterMessage ?? 'Obrigado pela sua preferência!\nGuarde este talão como comprovativo de pagamento e garantia de sinal.'}
              onChange={(e) => set('thermalFooterMessage', e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-sm font-mono outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Aviso de Corte / Regularização de Sinal
            </label>
            <textarea
              rows={2}
              disabled={!isAdmin}
              value={form.thermalWarningText ?? 'Atrasos superiores a 5 dias implicam suspensão imediata de sinal e cobrança de taxa de religação.'}
              onChange={(e) => set('thermalWarningText', e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] p-3 text-sm font-mono outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* 7. GUIA DE VARIÁVEIS DINÂMICAS */}
      <div className="surface rounded-2xl p-5 border border-blue-200 bg-blue-50/40 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-600" />
          <h3 className="text-xs font-black text-blue-950 uppercase tracking-wider">
            Variáveis Dinâmicas Disponíveis para Textos de Factura
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Pode inserir qualquer uma das seguintes tags nas descrições de serviço ou notas de rodapé:
        </p>

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {tagsList.map((item) => {
            const isCopied = copiedTag === item.tag;
            return (
              <button
                key={item.tag}
                type="button"
                onClick={() => copyVariableTag(item.tag)}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-blue-200 hover:border-blue-400 text-left transition shadow-2xs group"
              >
                <div className="truncate pr-1">
                  <code className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded">
                    {item.tag}
                  </code>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.label}</p>
                </div>
                <span className="shrink-0 text-slate-400 group-hover:text-blue-600">
                  {isCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL DE PRÉ-VISUALIZAÇÃO DA FACTURA (A4 E POS 80MM)                 */}
      {/* ==================================================================== */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header com Selector A4 vs POS */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <FileCheck className="text-blue-600" size={20} />
                <h3 className="font-black text-slate-900 text-base">
                  Pré-visualização da Factura com Textos Configurados
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewFormat('a4')}
                    className={`px-3 py-1 rounded-md transition ${previewFormat === 'a4' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    📄 Formato A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFormat('pos')}
                    className={`px-3 py-1 rounded-md transition ${previewFormat === 'pos' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    🧾 Térmica POS
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Corpo do Documento */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100 flex justify-center">
              {previewFormat === 'pos' ? (
                /* SIMULAÇÃO TALÃO TÉRMICO POS */
                <div className="bg-white w-[320px] p-4 font-mono text-[11px] leading-tight text-black shadow-md border border-slate-300">
                  <div className="text-center pb-2 border-b border-dashed border-black">
                    <img
                      src={getCompanyLogo(form.logoUrl)}
                      alt="Logo OSDEL"
                      className="h-12 w-12 object-contain mx-auto mb-1"
                      style={{ filter: 'grayscale(100%) contrast(180%)' }}
                    />
                    <p className="text-sm font-black uppercase">{form.companyName || 'OSDEL TECNOLOGIA'}</p>
                    <p className="text-[10px] font-bold text-slate-700">{form.invoiceSubtitle || 'TV · INTERNET FIBRA'}</p>
                    <p className="text-[9px]">NIF: {form.companyNif || '5417089214'}</p>
                    <p className="text-[9px]">Tel: {form.companyPhone || '+244 923 000 000'}</p>
                  </div>

                  <div className="py-2 border-b border-dashed border-black text-center">
                    <p className="text-xs font-black uppercase">
                      {form.invoiceTitle || 'FACTURA / RECIBO'}
                    </p>
                    <p className="text-sm font-black mt-0.5">FT-2026/00142</p>
                    <p className="text-[9px] mt-0.5">Data: {new Date().toLocaleDateString('pt-AO')}</p>
                  </div>

                  <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
                    <p><b>CLIENTE:</b> António Domingos Pedro</p>
                    <p><b>CÓDIGO:</b> CLI-00101 · <b>CAIXA:</b> PDO-04</p>
                    <p><b>ENDEREÇO:</b> Rua 12, Casa 45B, Bairro Golf I</p>
                  </div>

                  <div className="py-2 border-b border-dashed border-black">
                    <div className="flex justify-between font-bold text-[10px] border-b border-black/30 pb-0.5 mb-1">
                      <span>DESCRIÇÃO</span>
                      <span>TOTAL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="truncate max-w-[200px]">
                        {(form.invoiceDefaultItemDescription || 'Mensalidade de Serviço OSDEL').replace('{MES_REFERENCIA}', 'Outubro 2026')}
                      </span>
                      <b>4.000 Kz</b>
                    </div>
                  </div>

                  <div className="py-2.5 border-b-2 border-black text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-700">VALOR TOTAL PAGO:</p>
                    <p className="text-2xl font-black">4.000 Kz</p>
                    <p className="text-[9px] mt-0.5 font-bold uppercase">Forma: Multicaixa / TPA</p>
                    <p className="text-[9px] font-semibold text-emerald-800 mt-0.5">Estado: LIQUIDADO</p>
                  </div>

                  <div className="pt-2 text-center text-[9px] text-slate-700 space-y-1">
                    <p className="font-bold whitespace-pre-line">
                      {form.thermalFooterMessage || 'Obrigado pela sua preferência!'}
                    </p>
                    {form.thermalWarningText && (
                      <p className="text-[8.5px] text-amber-900 font-semibold">{form.thermalWarningText}</p>
                    )}
                    <p className="font-mono text-[8px] text-slate-500 pt-1">
                      Operador: Maria (Caixa) · Sistema OSDEL
                    </p>
                  </div>
                </div>
              ) : (
                /* SIMULAÇÃO FACTURA A4 */
                <div className="bg-white w-full max-w-[210mm] p-8 sm:p-12 shadow-md border border-slate-200 text-slate-900 text-xs leading-relaxed">
                  {/* Header A4 */}
                  <div className="flex items-start justify-between gap-6 border-b-2 border-[#0b4a8a] pb-6">
                    <div className="flex items-center gap-4">
                      <img
                        src={getCompanyLogo(form.logoUrl)}
                        alt="Logo OSDEL"
                        className="h-20 w-20 rounded-full border-2 border-[#0b4a8a] object-contain p-1 bg-white shrink-0"
                      />
                      <div>
                        <p className="text-xl font-black tracking-tight text-[#0b4a8a]">
                          {form.companyName || 'OSDEL TECNOLOGIA'}
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-[#1e90ff]">
                          {form.invoiceSubtitle || 'TV COMUNITÁRIA · INTERNET FIBRA ÓPTICA'}
                        </p>
                        <p className="mt-1.5 max-w-[340px] text-[10px] leading-4 text-[#5d6870]">
                          NIF: {form.companyNif || '5417089214'} · Tel: {form.companyPhone || '926 153 736'}
                          <br />
                          {form.companyAddress || 'Rua 12, Bairro Golf I, Kilamba Kiaxi, Luanda'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block rounded bg-[#0b4a8a] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                        {form.invoiceTitle || 'Factura / Recibo'}
                      </span>
                      <p className="mt-2 font-mono text-xl font-black text-[#0b4a8a]">FT-2026/00142</p>
                      <p className="mt-1 text-xs text-[#687680]">
                        Data: {new Date().toLocaleDateString('pt-AO')}
                      </p>
                    </div>
                  </div>

                  {/* Dados Cliente e Transação */}
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div className="rounded-lg border border-[#e2e8f0] p-4 bg-[#fbfcfe]">
                      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6b7780]">Dados do Cliente</p>
                      <p className="mt-1 text-base font-black text-[#0b4a8a]">António Domingos Pedro</p>
                      <p className="mt-1 text-xs text-[#687680]"><b>Código:</b> CLI-00101 · <b>BI:</b> 004829104LA041</p>
                      <p className="mt-0.5 text-xs text-[#687680]"><b>Endereço:</b> Rua 12, Casa 45B, Bairro Golf I, Luanda</p>
                    </div>

                    <div className="rounded-lg bg-[#f0f5fa] border border-[#d7e3ee] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#0b4a8a]">Detalhes de Cobrança</p>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-[#687680]">Referência:</span>
                        <b className="font-mono">Outubro 2026</b>
                      </div>
                      <div className="mt-1.5 flex justify-between text-xs">
                        <span className="text-[#687680]">Forma de Pagamento:</span>
                        <b>Multicaixa / TPA</b>
                      </div>
                      <div className="mt-1.5 flex justify-between text-xs">
                        <span className="text-[#687680]">Estado:</span>
                        <b className="text-emerald-700">Pago / Liquidado</b>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Itens */}
                  <table className="mt-6 w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b-2 border-[#0b4a8a] text-left text-[10px] uppercase tracking-wider text-[#6b7780]">
                        <th className="py-2.5">Descrição do Serviço / Artigo</th>
                        <th className="py-2.5 text-center">Qtd</th>
                        <th className="py-2.5 text-right">Preço Unit.</th>
                        <th className="py-2.5 text-right">Taxa IVA</th>
                        <th className="py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#e7edf1]">
                        <td className="py-3.5">
                          <b className="block text-sm text-[#0b4a8a]">
                            {(form.invoiceDefaultItemDescription || 'Mensalidade de Serviço OSDEL ({MES_REFERENCIA})').replace('{MES_REFERENCIA}', 'Outubro 2026')}
                          </b>
                          <span className="text-[11px] text-[#687680]">
                            {form.invoiceDefaultItemNotes || 'Fornecimento de sinal de TV por cabo / Internet Fibra nos termos acordados.'}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">1</td>
                        <td className="py-3.5 text-right">4.000 Kz</td>
                        <td className="py-3.5 text-right text-[11px] text-[#687680]">Isento*</td>
                        <td className="py-3.5 text-right font-bold">4.000 Kz</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Totais & Nota de Isenção */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="text-[11px] text-[#687680] rounded border border-[#e2e8f0] p-3 bg-[#fafbfd]">
                      <p className="font-bold text-[#1c2930] mb-1">Enquadramento Fiscal:</p>
                      <p>
                        * {form.invoiceTaxExemptionReason || 'Regime de Exclusão do IVA nos termos do Artigo 12.º do CIVA.'}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#0b4a8a] p-4 text-white text-right ml-auto w-full sm:w-[260px]">
                      <div className="flex justify-between text-xs opacity-80">
                        <span>Subtotal</span>
                        <span>4.000 Kz</span>
                      </div>
                      <div className="flex justify-between text-xs opacity-80 mt-1 border-t border-white/20 pt-1">
                        <span>Total Liquidado</span>
                        <span className="font-bold">4.000 Kz</span>
                      </div>
                      <div className="mt-2 text-2xl font-black">4.000 Kz</div>
                    </div>
                  </div>

                  {/* Coordenadas Bancárias */}
                  <div className="mt-6 rounded-lg border border-[#d7e3ee] bg-[#f8fafc] p-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#0b4a8a] mb-1 flex items-center gap-1.5">
                      <Landmark size={13} /> Coordenadas Bancárias Oficiais para Pagamento
                    </p>
                    {form.invoiceBankingNotes && (
                      <p className="text-[11px] text-[#556976] mb-2">{form.invoiceBankingNotes}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded border border-[#e2e8f0]">
                        <b className="text-[#0b4a8a] block text-xs">Banco BAI</b>
                        <span className="font-mono text-xs font-bold block text-[#1c2930]">AO06.0040.0000.1234.5678.9012.3</span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-[#e2e8f0]">
                        <b className="text-[#0b4a8a] block text-xs">Banco BFA</b>
                        <span className="font-mono text-xs font-bold block text-[#1c2930]">AO06.0006.0000.9876.5432.1098.7</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Carimbo */}
                  <div className="mt-8 grid gap-6 border-t-2 border-[#d7e1e8] pt-4 text-[10px] text-[#687680] sm:grid-cols-2 items-center">
                    <div>
                      <p className="font-bold text-[#1c2930]">{form.companyName || 'OSDEL TECNOLOGIA'}</p>
                      <p>{form.invoiceFooter || 'Documento processado por computador com validade fiscal interna.'}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="border border-[#0b4a8a]/40 rounded-lg p-2 text-center w-48 bg-[#f0f5fa]">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#0b4a8a] block">
                          {form.invoiceStampTitle || 'OSDEL TECNOLOGIA'}
                        </span>
                        <span className="text-[8px] text-[#5d6870] block">
                          {form.invoiceStampSubtitle || 'Carimbo & Chancela Digital'}
                        </span>
                        <span className="font-mono text-[9px] text-[#0b4a8a] font-bold block mt-0.5">
                          {form.invoiceStampBadge || 'AUTENTICADO'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-xs text-slate-600">
                Pré-visualização em tempo real das definições de facturação em vigor.
              </span>
              <Button
                variant="primary"
                onClick={() => setShowPreviewModal(false)}
                className="h-9 px-4 text-xs font-bold"
              >
                Concluir Pré-visualização
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
