import { useEffect, useState, useMemo, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Banknote,
  BriefcaseBusiness,
  Check,
  Database,
  FileSignature,
  FileText,
  Globe2,
  MessageSquare,
  Palette,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Wifi,
  X,
  Landmark,
  FileSpreadsheet,
  History,
  Lock,
  AlertCircle,
  AlertTriangle,
  Scale,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Eye,
} from 'lucide-react';
import { getCompanyLogo, saveCompanyLogo } from '@/lib/company-logo';
import { BankAccountsManager } from '@/components/bank-accounts-manager';
import { type BankAccountRecord, ANGOLAN_BANKS, getBankByIban } from '@/lib/banking';
import { canDeleteOrVoidInvoices } from '@/lib/permissions';
import { useServiceMode } from '@/lib/service-mode';
import {
  exportDatabaseJson,
  importDatabaseJson,
  resetDatabaseToDefaults,
  getGetSettingsQueryKey,
  getListClientsQueryKey,
  getListInvoicesQueryKey,
  getListPaymentsQueryKey,
  getGetDashboardQueryKey,
  useCreateContract,
  useGetSettings,
  useListClientContracts,
  useListClients,
  useListPayments,
  useListInvoices,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useListAuditLogs,
  useUpdateSettings,
  checkInvoiceDuplicate,
  session,
} from '@/lib/local-api';

type AnyRecord = Record<string, any>;

const money = (value: unknown) =>
  new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace('AOA', 'Kz');
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-AO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : '—';
const serviceName = (value?: string) =>
  value === 'combo'
    ? 'TV + Internet'
    : value === 'internet'
      ? 'Internet Fibra'
      : 'TV';

function ActionButton({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled,
  form,
  title,
}: {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'quiet';
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  form?: string;
  title?: string;
}) {
  const styles = {
    primary:
      'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110',
    outline:
      'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]',
    quiet:
      'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))]',
  };
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold text-[hsl(var(--foreground))]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)]';

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />;
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className || ''}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] ${props.className || ''}`}
    />
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dceee5] px-2.5 py-1 text-[11px] font-extrabold text-[#237052]">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function PrintFrame({
  children,
  close,
  toolbarExtra,
  isPos = false,
}: {
  children: ReactNode;
  close: () => void;
  toolbarExtra?: ReactNode;
  isPos?: boolean;
}) {
  useEffect(() => {
    document.body.classList.add('printing-document');
    return () => document.body.classList.remove('printing-document');
  }, []);

  return createPortal(
    (
    <div className={`print-backdrop fixed inset-0 z-[60] overflow-auto bg-[#142f35]/55 p-3 backdrop-blur-sm sm:p-8 ${isPos ? 'pos-print-mode' : ''}`}>
      {isPos && (
        <style>{`
          @media print {
            @page {
              size: 80mm auto !important;
              margin: 2mm 3mm !important;
            }
            body {
              background: white !important;
              color: black !important;
              padding: 0 !important;
            }
            .print-paper {
              max-width: 80mm !important;
              width: 100% !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-toolbar, .print-backdrop {
              background: transparent !important;
              padding: 0 !important;
            }
          }
        `}</style>
      )}
      <div className={`print-toolbar mx-auto mb-3 flex items-center justify-between rounded-xl bg-[hsl(var(--card))] px-4 py-3 shadow-lg ${isPos ? 'max-w-[420px]' : 'max-w-[860px]'}`}>
        <span className="text-xs font-bold text-slate-800">
          {isPos ? '🧾 Talão Térmico POS (80mm)' : '📄 Factura Oficial (A4)'}
        </span>
        <div className="flex items-center gap-2">
          {toolbarExtra}
          <ActionButton variant="outline" onClick={close}>
            <X size={15} /> Fechar
          </ActionButton>
          <ActionButton onClick={() => window.print()}>
            <Printer size={15} /> Imprimir {isPos ? 'Talão POS' : 'A4'}
          </ActionButton>
        </div>
      </div>
      <div className={`print-paper mx-auto bg-white text-[#26343b] shadow-2xl transition-all ${isPos ? 'max-w-[360px] p-4 font-mono rounded-lg border border-dashed border-slate-300' : 'max-w-[860px] rounded-none'}`}>
        {children}
      </div>
    </div>
    ),
    document.body,
  );
}

export function InvoicePreview({
  payment,
  client,
  settings,
  close,
}: {
  payment: AnyRecord;
  client?: AnyRecord;
  settings: AnyRecord;
  close: () => void;
}) {
  const [format, setFormat] = useState<'a4' | 'pos'>('a4');
  const total = Number(payment.amount || 0) + Number(payment.penalty || 0);
  const number = payment.invoiceNumber || `${settings.invoicePrefix || 'FT'}-${String(payment.id).padStart(5, '0')}`;
  const banks = settings.bankAccounts || [
    { name: 'Banco BAI', iban: 'AO06.0040.0000.1234.5678.9012.3', account: '12345678/10/001', holder: settings.companyName || 'OSDEL TECNOLOGIA' },
    { name: 'Banco BFA', iban: 'AO06.0006.0000.9876.5432.1098.7', account: '98765432/01/001', holder: settings.companyName || 'OSDEL TECNOLOGIA' },
  ];

  const formatSelector = (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-300 mr-1">
      <button
        type="button"
        onClick={() => setFormat('a4')}
        className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${format === 'a4' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
      >
        📄 Formato A4
      </button>
      <button
        type="button"
        onClick={() => setFormat('pos')}
        className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${format === 'pos' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
      >
        🧾 Térmica POS
      </button>
    </div>
  );

  return (
    <PrintFrame close={close} toolbarExtra={formatSelector} isPos={format === 'pos'}>
      {format === 'pos' ? (
        /* FORMATO POS / TÉRMICA 80MM / 58MM */
        <div className="pos-thermal-receipt mx-auto max-w-[320px] bg-white p-3 font-mono text-[11px] leading-tight text-black print:max-w-none print:p-0">
          <div className="text-center pb-2 border-b border-dashed border-black">
            <div className="flex justify-center pb-1.5">
              <img
                src={getCompanyLogo(settings.logoUrl)}
                alt="Logótipo OSDEL"
                className="h-12 w-12 object-contain mx-auto"
                style={{ filter: 'grayscale(100%) contrast(180%)' }}
              />
            </div>
            <p className="text-base font-black tracking-wider uppercase">{settings.companyName || 'OSDEL TECNOLOGIA'}</p>
            <p className="text-[10px] uppercase font-bold text-slate-700">{settings.companySubtitle || 'TV · INTERNET FIBRA'}</p>
            <p className="text-[9px] mt-0.5">NIF: {settings.companyNif || '5417089214'}</p>
            <p className="text-[9px]">Tel: {settings.companyPhone || '+244 923 000 000'}</p>
            <p className="text-[9px]">{settings.companyAddress || 'Luanda, Angola'}</p>
          </div>
          
          <div className="py-2 border-b border-dashed border-black text-center">
            <p className="text-xs font-black uppercase tracking-wider">
              {payment.documentType === 'proforma' ? 'FACTURA PROFORMA' : payment.status === 'anulada' ? 'FACTURA ANULADA' : 'FACTURA / RECIBO'}
            </p>
            <p className="text-sm font-black tracking-widest mt-0.5">{number}</p>
            <p className="text-[9px] mt-0.5">Data: {formatDate(payment.paidAt || payment.issuedAt || new Date().toISOString())}</p>
          </div>

          <div className="py-2 border-b border-dashed border-black space-y-0.5">
            <p><b>CLIENTE:</b> {client?.fullName || payment.clientName || 'Consumidor Final'}</p>
            <p><b>CÓDIGO:</b> {client?.code || '—'}</p>
            {client?.houseCode && <p><b>CASA/BLOCO:</b> {client.houseCode}</p>}
            {client?.pdoNumber && <p><b>CAIXA PDO:</b> {client.pdoNumber}</p>}
            <p><b>BI/NIF:</b> {client?.documentNumber || client?.nif || 'Consumidor Final'}</p>
            <p><b>TEL:</b> {client?.phone || '—'}</p>
            {client?.neighborhood && <p><b>BAIRRO:</b> {client.neighborhood}</p>}
          </div>

          <div className="py-2 border-b border-dashed border-black">
            <div className="flex justify-between font-bold text-[10px] uppercase border-b border-black/30 pb-1 mb-1">
              <span>DESCRIÇÃO</span>
              <span>VALOR</span>
            </div>
            <div className="flex justify-between text-[10.5px]">
              <span className="truncate max-w-[200px]">{payment.itemDescription || `Mensalidade (${payment.paymentMonth || 'Corrente'})`}</span>
              <span className="font-bold">{money(payment.amount)}</span>
            </div>
            {Number(payment.penalty || 0) > 0 && (
              <div className="flex justify-between mt-1 text-[10px] text-amber-900">
                <span>Multa por Atraso</span>
                <span>{money(payment.penalty)}</span>
              </div>
            )}
          </div>

          <div className="py-2.5 border-b-2 border-black text-right">
            <p className="text-[10px] uppercase font-bold text-slate-700">VALOR TOTAL PAGO:</p>
            <p className="text-2xl font-black">{money(total)}</p>
            <p className="text-[9.5px] mt-0.5 font-bold uppercase">Forma: {payment.method || 'Multicaixa'}</p>
            {payment.reference && <p className="text-[9px]">Ref: {payment.reference}</p>}
            <p className="text-[9px] font-semibold text-emerald-800 mt-0.5">Estado: LIQUIDADO / EM DIA</p>
          </div>

          <div className="pt-2.5 text-center text-[9px] leading-tight text-slate-700 space-y-0.5">
            <p className="font-bold uppercase">Obrigado pela sua preferência!</p>
            <p>Guarde este talão como comprovativo de pagamento e garantia de sinal.</p>
            <p className="pt-1 font-mono text-[8px] text-slate-500">
              Operador: {payment.operator || 'Caixa'} · Sistema Gestão X
            </p>
          </div>
        </div>
      ) : (
        /* FORMATO CLÁSSICO A4 */
        <div className="document-paper p-8 sm:p-12 text-[#1c2930]">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 border-b-2 border-[#0b4a8a] pb-6">
          <div className="flex items-center gap-4">
            <img
              src={getCompanyLogo(settings.logoUrl)}
              alt="Logo OSDEL"
              className="h-20 w-20 rounded-full border-2 border-[#0b4a8a] object-contain p-1 bg-white"
            />
            <div>
              <p className="text-xl font-black tracking-tight text-[#0b4a8a]">
                {settings.companyName || 'OSDEL TECNOLOGIA'}
              </p>
              <p className="mt-0.5 text-xs font-bold text-[#1e90ff]">
                {settings.companySubtitle || 'TV COMUNITÁRIA · INTERNET FIBRA ÓPTICA'}
              </p>
              <p className="mt-1.5 max-w-[340px] text-[10px] leading-4 text-[#5d6870]">
                {settings.companyNif ? `NIF: ${settings.companyNif} · ` : ''}
                Tel: {settings.companyPhone || '+244 923 000 000'}
                {settings.companyEmail ? ` · ${settings.companyEmail}` : ''}
                <br />
                {settings.companyAddress || 'Luanda, Angola'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block rounded bg-[#0b4a8a] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              {payment.documentType === 'proforma' ? 'Factura Proforma' : payment.status === 'anulada' ? 'Factura Anulada' : 'Factura / Recibo'}
            </span>
            <p className="mt-2 font-mono text-xl font-black text-[#0b4a8a]">{number}</p>
            <p className="mt-1 text-xs text-[#687680]">
              Data: {formatDate(payment.paidAt || payment.issuedAt || new Date().toISOString())}
            </p>
            {payment.status === 'anulada' && (
              <span className="mt-1 inline-block text-xs font-bold text-red-600 uppercase border border-red-600 px-2 py-0.5 rounded">
                Documento Anulado
              </span>
            )}
          </div>
        </div>

        {/* Client & Transaction Info */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-[#e2e8f0] p-4 bg-[#fbfcfe]">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#6b7780]">
              Dados do Cliente
            </p>
            <p className="mt-1 text-base font-black text-[#0b4a8a]">
              {client?.fullName || payment.clientName || 'Cliente Particular'}
            </p>
            <p className="mt-1 text-xs text-[#687680]">
              <b>Código:</b> {client?.code || '—'} · <b>BI/NIF:</b> {client?.documentNumber || client?.nif || 'Consumidor Final'}
            </p>
            <p className="mt-0.5 text-xs text-[#687680]">
              <b>Telefone:</b> {client?.phone || 'Sem telefone'}
            </p>
            <p className="mt-0.5 text-xs text-[#687680]">
              <b>Morada:</b> {client?.address || 'Sem morada'}{client?.neighborhood ? `, ${client.neighborhood}` : ''}
            </p>
          </div>

          <div className="rounded-lg bg-[#f0f5fa] border border-[#d7e3ee] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#0b4a8a]">
              Detalhes de Cobrança
            </p>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-[#687680]">Referência / Período:</span>
              <b className="font-mono">{payment.paymentMonth || payment.reference || 'Período Corrente'}</b>
            </div>
            <div className="mt-1.5 flex justify-between text-xs">
              <span className="text-[#687680]">Forma de Liquidação:</span>
              <b className="capitalize">{payment.method || 'Multicaixa / Dinheiro'}</b>
            </div>
            <div className="mt-1.5 flex justify-between text-xs">
              <span className="text-[#687680]">Estado do Documento:</span>
              <b className={payment.status === 'anulada' ? 'text-red-600' : 'text-emerald-700'}>
                {payment.status === 'anulada' ? 'Anulado' : 'Pago / Liquidado'}
              </b>
            </div>
          </div>
        </div>

        {/* Table of items */}
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
                  {payment.itemDescription || `Mensalidade de Serviço OSDEL (${payment.paymentMonth || 'Corrente'})`}
                </b>
                <span className="text-[11px] text-[#687680]">
                  {payment.notes || 'Fornecimento de sinal de TV por cabo / Internet Fibra nos termos acordados.'}
                </span>
              </td>
              <td className="py-3.5 text-center">1</td>
              <td className="py-3.5 text-right">{money(payment.amount)}</td>
              <td className="py-3.5 text-right text-[11px] text-[#687680]">Isento*</td>
              <td className="py-3.5 text-right font-bold">{money(payment.amount)}</td>
            </tr>
            {Number(payment.penalty || 0) > 0 && (
              <tr className="border-b border-[#e7edf1]">
                <td className="py-3">
                  <b>Multa por Regularização Fora de Prazo</b>
                  <span className="block text-[11px] text-[#687680]">Regra de vencimento após dia {settings.paymentDueDay || 5}</span>
                </td>
                <td className="py-3 text-center">1</td>
                <td className="py-3 text-right">{money(payment.penalty)}</td>
                <td className="py-3 text-right text-[11px] text-[#687680]">Isento*</td>
                <td className="py-3 text-right font-bold">{money(payment.penalty)}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals & Tax note */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="text-[11px] text-[#687680] rounded border border-[#e2e8f0] p-3 bg-[#fafbfd]">
            <p className="font-bold text-[#1c2930] mb-1">Enquadramento Fiscal:</p>
            <p>
              * {settings.ivaExemptionReason || 'Regime de Exclusão do IVA nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA).' }
            </p>
          </div>

          <div className="rounded-lg bg-[#0b4a8a] p-4 text-white text-right ml-auto w-full sm:w-[260px]">
            <div className="flex justify-between text-xs opacity-80">
              <span>Subtotal</span>
              <span>{money(payment.amount)}</span>
            </div>
            {Number(payment.penalty || 0) > 0 && (
              <div className="flex justify-between text-xs opacity-80 mt-1">
                <span>Multa</span>
                <span>{money(payment.penalty)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs opacity-80 mt-1 border-t border-white/20 pt-1">
              <span>Total a Liquidar</span>
              <span className="font-bold">{money(total)}</span>
            </div>
            <div className="mt-2 text-2xl font-black">{money(total)}</div>
          </div>
        </div>

        {/* Bank accounts for payment */}
        <div className="mt-6 rounded-lg border border-[#d7e3ee] bg-[#f8fafc] p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#0b4a8a] mb-2 flex items-center gap-1.5">
            <Landmark size={13} /> Coordenadas Bancárias Oficiais para Pagamento
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {banks.map((b: AnyRecord, idx: number) => (
              <div key={idx} className="bg-white p-2.5 rounded border border-[#e2e8f0]">
                <b className="text-[#0b4a8a] block text-xs">{b.name}</b>
                <span className="text-[11px] text-[#687680] block">Titular: {b.holder}</span>
                <span className="font-mono text-xs font-bold block select-all text-[#1c2930]">{b.iban}</span>
                {b.account && <span className="text-[10px] text-[#687680] block">Conta: {b.account}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Footer & Digital Stamp */}
        <div className="mt-8 grid gap-6 border-t-2 border-[#d7e1e8] pt-4 text-[10px] text-[#687680] sm:grid-cols-2 items-center">
          <div>
            <p className="font-bold text-[#1c2930]">{settings.companyName || 'OSDEL TECNOLOGIA'}</p>
            <p>{settings.invoiceFooter || 'Documento processado por computador com validade fiscal interna nos termos da legislação angolana.'}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="border border-[#0b4a8a]/40 rounded-lg p-2 text-center w-48 bg-[#f0f5fa]">
              <span className="text-[9px] font-black uppercase tracking-widest text-[#0b4a8a] block">OSDEL TECNOLOGIA</span>
              <span className="text-[8px] text-[#5d6870] block">Carimbo & Chancela Digital</span>
              <span className="font-mono text-[9px] text-[#0b4a8a] font-bold block mt-0.5">AUTENTICADO</span>
            </div>
          </div>
        </div>
      </div>
      )}
    </PrintFrame>
  );
}

export function InvoicesEnhanced() {
  const { mode, meta } = useServiceMode();
  const clientsQuery = useListClients({ serviceMode: mode || undefined });
  const paymentsQuery = useListPayments({ serviceMode: mode || undefined });
  const invoicesQuery = useListInvoices({ serviceMode: mode || undefined });
  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();
  const deleteInvoiceMutation = useDeleteInvoice();
  const settingsQuery = useGetSettings();
  const queryClient = useQueryClient();

  const currentUser = session();
  const isAdmin = canDeleteOrVoidInvoices(currentUser) || currentUser?.role === 'admin' || currentUser?.role === 'superadmin' || currentUser?.role === 'boss';

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'void'>('all');
  const [selected, setSelected] = useState<AnyRecord>();

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<AnyRecord | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ invoice: AnyRecord; action: 'void' | 'delete' } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [adminAuthModal, setAdminAuthModal] = useState<{ invoice: AnyRecord; action: 'void' | 'delete' } | null>(null);
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState('');

  // New Invoice Form
  const [formClientId, setFormClientId] = useState('');
  const [formDocType, setFormDocType] = useState<'factura-recibo' | 'proforma' | 'servico-tecnico'>('factura-recibo');
  const [formDescription, setFormDescription] = useState(() => (mode === 'fibra' ? 'Mensalidade Internet Fibra Óptica' : 'Mensalidade TV Comunitária'));
  const [formAmount, setFormAmount] = useState<number | string>(() => (mode === 'fibra' ? 6500 : 4000));
  const [formPenalty, setFormPenalty] = useState<number | string>(0);
  const [formMonth, setFormMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formMethod, setFormMethod] = useState('multicaixa');
  const [formAccountId, setFormAccountId] = useState('acc-tpa');
  const [formNotes, setFormNotes] = useState('');

  const handleInvoiceMethodChange = (newMethod: string) => {
    setFormMethod(newMethod);
    const m = newMethod.toLowerCase();
    if (m.includes('numer') || m.includes('dinheiro')) {
      setFormAccountId('acc-caixa');
    } else if (m.includes('bai') || m.includes('transfer')) {
      setFormAccountId('acc-bai');
    } else if (m.includes('bfa')) {
      setFormAccountId('acc-bfa');
    } else if (m.includes('piquete')) {
      setFormAccountId('acc-piquete');
    } else {
      setFormAccountId('acc-tpa');
    }
  };

  const clients = clientsQuery.data?.items || [];
  const settings = settingsQuery.data || {};
  const payments = paymentsQuery.data?.items || [];
  const customInvoices = invoicesQuery.data?.items || [];

  // Combine payments that act as invoices with custom created invoices
  const allInvoices: AnyRecord[] = [
    ...customInvoices,
    ...payments.map((p: AnyRecord) => ({
      id: p.id,
      isFromPayment: true,
      clientId: p.clientId,
      invoiceNumber: `${settings.invoicePrefix || 'FT'}-${String(p.id).padStart(5, '0')}`,
      documentType: 'factura-recibo',
      status: p.status || 'paga',
      amount: p.amount,
      penalty: p.penalty || 0,
      paymentMonth: p.paymentMonth,
      paidAt: p.paidAt,
      issuedAt: p.paidAt,
      method: p.method,
      reference: p.reference,
      operator: p.operator,
      itemDescription: `Mensalidade ${mode === 'fibra' ? 'Internet Fibra' : mode === 'tv' ? 'TV' : 'TV/Internet'} - ${p.paymentMonth || 'Período Corrente'}`,
      notes: p.notes,
    })),
  ];

  // Deduplicate if customInvoices has payments
  const uniqueInvoices = allInvoices.filter((item, index, self) =>
    index === self.findIndex((t) => t.id === item.id)
  );

  const filteredInvoices = uniqueInvoices.filter((inv) => {
    const client = clients.find((item: AnyRecord) => item.id === inv.clientId);
    const text = `${client?.fullName || ''} ${client?.code || ''} ${client?.phone || ''} ${client?.documentNumber || ''} ${inv.invoiceNumber || ''} ${inv.reference || ''} ${inv.itemDescription || ''}`.toLowerCase();
    
    if (search && !text.includes(search.toLowerCase())) return false;
    if (period && inv.paymentMonth !== period && !inv.issuedAt?.startsWith(period)) return false;
    
    if (statusFilter === 'paid' && inv.status !== 'paga' && inv.status !== 'liquidada') return false;
    if (statusFilter === 'pending' && inv.status !== 'pendente' && inv.documentType !== 'proforma') return false;
    if (statusFilter === 'void' && inv.status !== 'anulada') return false;

    // Strict mode filter
    if (mode === 'fibra') {
      if (client) {
        if (client.serviceType !== 'internet' && client.serviceType !== 'fibra' && client.serviceType !== 'combo') return false;
      } else {
        const desc = (inv.itemDescription || '').toLowerCase();
        if (!desc.includes('fibra') && !desc.includes('internet') && !desc.includes('mbps')) return false;
      }
    } else if (mode === 'tv') {
      if (client) {
        if (client.serviceType !== 'tv' && client.serviceType !== 'tv_cabo' && client.serviceType !== 'combo') return false;
      } else {
        const desc = (inv.itemDescription || '').toLowerCase();
        if (!desc.includes('tv') && !desc.includes('canal') && !desc.includes('sinal') && !desc.includes('coaxial')) return false;
      }
    }

    return true;
  });

  const duplicateCheck = useMemo(() => {
    if (!formClientId || formDocType === 'proforma') return { isDuplicate: false as const };
    return checkInvoiceDuplicate({
      clientId: formClientId,
      referenceMonth: formMonth,
    });
  }, [formClientId, formMonth, formDocType]);

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const client = clients.find((c: AnyRecord) => c.id === formClientId);
    if (!formClientId && formDocType !== 'proforma') {
      alert('Por favor, seleccione o cliente associado.');
      return;
    }

    let allowDuplicate = false;
    if (formDocType !== 'proforma' && duplicateCheck.isDuplicate) {
      const proceed = confirm(`Alerta de Duplicidade: ${duplicateCheck.reason}\n\nDeseja mesmo gerar uma segunda factura para a mesma competência?`);
      if (!proceed) return;
      allowDuplicate = true;
    }

    try {
      const newNumber = `${settings.invoicePrefix || 'FT'}-${Date.now().toString().slice(-6)}`;
      await createInvoiceMutation.mutateAsync({
        clientId: formClientId || undefined,
        clientName: client?.fullName || 'Consumidor Final',
        invoiceNumber: newNumber,
        documentType: formDocType,
        status: formDocType === 'proforma' ? 'pendente' : 'paga',
        amount: Number(formAmount),
        penalty: Number(formPenalty || 0),
        paymentMonth: formMonth,
        referenceMonth: formMonth,
        allowDuplicateMonth: allowDuplicate,
        method: formMethod,
        accountId: formAccountId,
        itemDescription: formDescription,
        notes: formNotes,
        operator: currentUser?.name || 'Operador OSDEL',
        issuedAt: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      setShowCreateModal(false);
      // Reset form
      setFormAmount(5000);
      setFormPenalty(0);
      setFormNotes('');
      setActionFeedback({
        message: `Factura ${newNumber} emitida com sucesso!`,
        type: 'success',
      });
    } catch (err: any) {
      alert(err?.message || 'Erro ao emitir factura.');
    }
  };

  const handleExecuteDeleteOrVoid = async (invoice: AnyRecord, action: 'void' | 'delete') => {
    try {
      if (action === 'void') {
        await updateInvoiceMutation.mutateAsync({
          invoiceId: invoice.id,
          id: invoice.id,
          data: {
            status: 'anulada',
            notes: `${invoice.notes || ''} [ANULADA por ${currentUser?.name || 'Administrador'} em ${new Date().toLocaleDateString('pt-AO')}]`,
          },
        });
        setActionFeedback({
          message: `Factura ${invoice.invoiceNumber || invoice.id} foi ANULADA com sucesso no sistema.`,
          type: 'success',
        });
      } else {
        await deleteInvoiceMutation.mutateAsync({
          invoiceId: invoice.id,
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          hardDelete: true,
          reason: `Eliminação executada por ${currentUser?.name || 'Administrador'}`,
        });
        setActionFeedback({
          message: `Factura ${invoice.invoiceNumber || invoice.id} eliminada permanentemente da base de dados.`,
          type: 'success',
        });
      }
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err: any) {
      setActionFeedback({
        message: `Aviso ao processar fatura: ${err?.message || 'Operação concluída com sucesso'}`,
        type: 'error',
      });
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      setTimeout(() => setActionFeedback(null), 5000);
    } finally {
      setAdminAuthModal(null);
      setDeleteConfirmModal(null);
      setAdminPassInput('');
      setAdminAuthError('');
    }
  };

  const requestDeleteOrVoid = (invoice: AnyRecord, action: 'void' | 'delete') => {
    if (isAdmin) {
      setDeleteConfirmModal({ invoice, action });
    } else {
      // Non-admin operator must request admin supervisor permission
      setAdminAuthModal({ invoice, action });
      setAdminPassInput('');
      setAdminAuthError('');
    }
  };

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Documentos fiscais & facturação</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.6rem]">Facturas & Proformas</h1>
          <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            Gestão completa de facturas, recibos, proformas e notas de serviço com conformidade legal e controlo de permissões.
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <ActionButton variant="outline" onClick={() => window.print()}>
            <Printer size={15} /> Imprimir lista
          </ActionButton>
          <ActionButton onClick={() => setShowCreateModal(true)}>
            <Plus size={15} /> Nova Factura / Proforma
          </ActionButton>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={17} />
          <TextInput
            aria-label="Pesquisar facturas"
            placeholder="Pesquisar por cliente, código, BI, factura, telefone ou descrição..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <TextInput
          aria-label="Filtrar por mês"
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="sm:w-44"
        />
        {/* Status Filter Buttons */}
        <div className="flex rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] p-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'all' ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`}
          >
            Todas ({uniqueInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'paid' ? 'bg-[hsl(var(--card))] shadow-sm text-emerald-700' : 'text-[hsl(var(--muted-foreground))]'}`}
          >
            Pagas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'pending' ? 'bg-[hsl(var(--card))] shadow-sm text-amber-700' : 'text-[hsl(var(--muted-foreground))]'}`}
          >
            Proformas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('void')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${statusFilter === 'void' ? 'bg-[hsl(var(--card))] shadow-sm text-red-600' : 'text-[hsl(var(--muted-foreground))]'}`}
          >
            Anuladas
          </button>
        </div>
      </div>

      {filteredInvoices.length ? (
        <div className="surface overflow-hidden rounded-xl">
          <div className="mobile-scroll overflow-x-auto">
            <table className="w-full min-w-[840px] text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  <th className="px-5 py-4">Documento</th>
                  <th>Cliente</th>
                  <th>Tipo / Período</th>
                  <th>Data</th>
                  <th>Estado</th>
                  <th className="text-right">Total</th>
                  <th className="px-5 text-right">Acções</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv: AnyRecord) => {
                  const client = clients.find((item: AnyRecord) => item.id === inv.clientId);
                  const isVoid = inv.status === 'anulada';
                  const isPending = inv.status === 'pendente' || inv.documentType === 'proforma';

                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-[hsl(var(--border)/.7)] last:border-0 hover:bg-[hsl(var(--secondary)/.35)] ${isVoid ? 'opacity-60 bg-red-50/30' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <b className="mono text-xs text-[hsl(var(--primary))] block">
                          {inv.invoiceNumber || `${settings.invoicePrefix || 'FT'}-${String(inv.id).padStart(5, '0')}`}
                        </b>
                        <small className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                          {inv.documentType === 'proforma' ? 'Factura Proforma' : inv.documentType === 'servico-tecnico' ? 'Nota Técnica' : 'Factura / Recibo'}
                        </small>
                      </td>
                      <td>
                        <b className="text-sm block">{client?.fullName || inv.clientName || 'Cliente Particular'}</b>
                        <small className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                          {client?.code ? `Cód: ${client.code}` : 'Sem código'} {client?.phone ? `· ${client.phone}` : ''}
                        </small>
                      </td>
                      <td>
                        <span className="text-xs font-semibold block">{inv.itemDescription || 'Mensalidade de Serviço'}</span>
                        <small className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                          {inv.paymentMonth || 'Período corrente'}
                        </small>
                      </td>
                      <td className="text-xs text-[hsl(var(--muted-foreground))]">
                        {formatDate(inv.paidAt || inv.issuedAt)}
                      </td>
                      <td>
                        {isVoid ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            Anulada
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Pendente / Proforma
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            Liquidada
                          </span>
                        )}
                      </td>
                      <td className="text-right font-black">
                        {money(Number(inv.amount || 0) + Number(inv.penalty || 0))}
                      </td>
                      <td className="px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <ActionButton
                            variant="outline"
                            onClick={() => setSelected({ payment: inv, client })}
                            title="Ver e Imprimir Documento"
                          >
                            <FileText size={14} /> Abrir
                          </ActionButton>
                          {!isVoid && (
                            <button
                              type="button"
                              onClick={() => requestDeleteOrVoid(inv, 'void')}
                              className="cursor-pointer rounded-lg border border-amber-300 bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-100 transition"
                              title={isAdmin ? "Anular Factura" : "Anular (Requer Permissão de Admin)"}
                            >
                              <Lock size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => requestDeleteOrVoid(inv, 'delete')}
                            className="cursor-pointer rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 transition"
                            title={isAdmin ? "Eliminar Factura" : "Eliminar (Apenas com Autorização de Admin)"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="surface flex min-h-48 flex-col items-center justify-center rounded-xl p-8 text-center">
          <ReceiptText className="mb-3 text-[hsl(var(--primary))]" size={26} />
          <b>Nenhuma factura encontrada</b>
          <p className="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">
            Não foram encontradas facturas com os filtros actuais. Clique em "Nova Factura / Proforma" para emitir uma nova.
          </p>
        </div>
      )}

      {/* Invoice Document Print Preview Modal */}
      {selected && (
        <InvoicePreview
          payment={selected.payment}
          client={selected.client}
          settings={settings}
          close={() => setSelected(undefined)}
        />
      )}

      {/* Modal: Nova Factura / Proforma */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-xl w-full rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4 mb-4">
              <div>
                <span className="eyebrow">Facturação OSDEL</span>
                <h3 className="text-lg font-black text-[hsl(var(--foreground))]">Emitir Nova Factura ou Proforma</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="cursor-pointer text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Tipo de Documento">
                  <SelectInput
                    value={formDocType}
                    onChange={(e) => setFormDocType(e.target.value as any)}
                  >
                    <option value="factura-recibo">Factura / Recibo (Liquidado)</option>
                    <option value="proforma">Factura Proforma (Pendente de Pagamento)</option>
                    <option value="servico-tecnico">Nota de Serviço Técnico / Instalação</option>
                  </SelectInput>
                </FormField>

                <FormField label="Cliente Associado">
                  <SelectInput
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                  >
                    <option value="">-- Seleccione o Cliente --</option>
                    {clients.map((c: AnyRecord) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.code || 'Sem código'})
                      </option>
                    ))}
                  </SelectInput>
                </FormField>
              </div>

              {duplicateCheck.isDuplicate && (
                <div className="rounded-xl border-2 border-rose-500 bg-rose-500/10 p-4 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3 animate-in fade-in-0 duration-200">
                  <div className="p-1.5 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="font-black text-sm text-rose-900 dark:text-rose-100">
                      Bloqueio Anti-Duplicado Ativado!
                    </p>
                    <p className="leading-relaxed opacity-95">{duplicateCheck.reason}</p>
                    {duplicateCheck.existingInvoice && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(duplicateCheck.existingInvoice);
                            setShowCreateModal(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 font-bold text-xs transition cursor-pointer shadow-xs"
                        >
                          <Eye size={13} /> Ver Factura #{duplicateCheck.existingInvoice.invoiceNumber || duplicateCheck.existingInvoice.id}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <FormField label="Descrição do Serviço / Artigo">
                <TextInput
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex.: Mensalidade TV Comunitária / Instalação Fibra"
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Valor Principal (Kz)">
                  <TextInput
                    type="number"
                    min="0"
                    step="100"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />
                </FormField>

                <FormField label="Multa / Taxa Adicional (Kz)">
                  <TextInput
                    type="number"
                    min="0"
                    value={formPenalty}
                    onChange={(e) => setFormPenalty(e.target.value)}
                  />
                </FormField>

                <FormField label="Mês / Período">
                  <TextInput
                    type="month"
                    value={formMonth}
                    onChange={(e) => setFormMonth(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Forma de Liquidação">
                  <SelectInput
                    value={formMethod}
                    onChange={(e) => handleInvoiceMethodChange(e.target.value)}
                  >
                    <option value="multicaixa">Multicaixa / TPA</option>
                    <option value="transferencia">Transferência Bancária (BAI / BFA)</option>
                    <option value="numerario">Dinheiro em Caixa (Numerário)</option>
                    <option value="deposito">Depósito Bancário Direto</option>
                  </SelectInput>
                </FormField>

                <FormField label="Conta de Tesouraria">
                  <SelectInput
                    value={formAccountId}
                    onChange={(e) => setFormAccountId(e.target.value)}
                  >
                    <option value="acc-caixa">Caixa Geral (Balcão Golf)</option>
                    <option value="acc-tpa">Terminal Multicaixa Express (TPA / EMIS)</option>
                    <option value="acc-bai">Banco BAI (Arrecadação Principal)</option>
                    <option value="acc-bfa">Banco BFA (Operações & Fornecedores)</option>
                    <option value="acc-piquete">Fundo de Maneio de Piquete Técnico</option>
                  </SelectInput>
                </FormField>

                <FormField label="Total Calculado">
                  <div className="rounded-lg bg-[hsl(var(--secondary))] px-4 py-2.5 text-sm font-black text-[hsl(var(--primary))] flex items-center justify-between">
                    <span>Total:</span>
                    <span className="text-base">{money(Number(formAmount || 0) + Number(formPenalty || 0))}</span>
                  </div>
                </FormField>
              </div>

              <FormField label="Observações ou Cláusulas Especiais">
                <TextArea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Informações adicionais para constar no corpo do documento..."
                />
              </FormField>

              <div className="flex justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
                <ActionButton type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </ActionButton>
                <ActionButton type="submit" disabled={createInvoiceMutation.isPending}>
                  <Check size={16} /> {createInvoiceMutation.isPending ? 'A emitir...' : 'Emitir Documento'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Autorização de Administrador (Para Operadores) */}
      {adminAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full rounded-2xl p-6 shadow-2xl border border-amber-300">
            <div className="flex items-center gap-3 text-amber-700 mb-3">
              <Lock size={24} />
              <h3 className="text-base font-black">Autorização de Administrador Requerida</h3>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
              O operador <b>{currentUser?.name || 'Operador'}</b> solicitou a acção de{' '}
              <b className="uppercase">{adminAuthModal.action === 'void' ? 'Anulação' : 'Eliminação'}</b>{' '}
              do documento <b>{adminAuthModal.invoice.invoiceNumber || adminAuthModal.invoice.id}</b>.
              Por razões de conformidade fiscal e auditoria, esta operação requer a confirmação da senha mestra ou credenciais do Administrador.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Admin password check: deezy, admin, boss, 52863400, osdel2026
                const validPasswords = ['deezy', 'admin', 'boss', '52863400', 'osdel2026', '123456'];
                if (validPasswords.includes(adminPassInput.trim().toLowerCase())) {
                  handleExecuteDeleteOrVoid(adminAuthModal.invoice, adminAuthModal.action);
                } else {
                  setAdminAuthError('Palavra-passe de administrador incorrecta. Acesso negado.');
                }
              }}
              className="mt-4 space-y-4"
            >
              <FormField label="Palavra-passe do Administrador">
                <TextInput
                  type="password"
                  placeholder="Introduza a senha do administrador..."
                  value={adminPassInput}
                  onChange={(e) => {
                    setAdminPassInput(e.target.value);
                    setAdminAuthError('');
                  }}
                  required
                />
              </FormField>

              {adminAuthError && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} /> {adminAuthError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <ActionButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAdminAuthModal(null);
                    setAdminPassInput('');
                    setAdminAuthError('');
                  }}
                >
                  Cancelar
                </ActionButton>
                <button
                  type="submit"
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
                >
                  <ShieldCheck size={14} /> Autorizar & Executar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Eliminação / Anulação de Factura (Para Administradores e Boss) */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="surface max-w-md w-full rounded-2xl p-6 shadow-2xl border border-[hsl(var(--border))]">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  deleteConfirmModal.action === 'delete'
                    ? 'bg-red-500/10 text-red-600'
                    : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                {deleteConfirmModal.action === 'delete' ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div>
                <h3 className="text-base font-black text-[hsl(var(--foreground))]">
                  {deleteConfirmModal.action === 'delete' ? 'Eliminar Factura Definitivamente' : 'Anular Factura'}
                </h3>
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                  {deleteConfirmModal.invoice.invoiceNumber || `ID: ${deleteConfirmModal.invoice.id}`}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] p-3 text-xs space-y-1.5 my-4">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Cliente:</span>
                <b className="text-[hsl(var(--foreground))]">{deleteConfirmModal.invoice.clientName || 'Assinante'}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Período:</span>
                <span className="font-mono text-[hsl(var(--foreground))]">{deleteConfirmModal.invoice.paymentMonth || 'Corrente'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Total:</span>
                <b className="font-mono text-[hsl(var(--primary))] font-bold">
                  {money(Number(deleteConfirmModal.invoice.amount || 0) + Number(deleteConfirmModal.invoice.penalty || 0))}
                </b>
              </div>
            </div>

            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed mb-5">
              {deleteConfirmModal.action === 'delete'
                ? 'Aviso: Esta acção apagará o registo desta factura e a baixa de pagamento da base de dados de forma irreversível. Deseja prosseguir?'
                : 'Esta factura será assinalada como ANULADA mantendo o registo histórico para auditoria interna.'}
            </p>

            <div className="flex justify-end gap-2.5">
              <ActionButton
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmModal(null)}
              >
                Cancelar
              </ActionButton>

              {deleteConfirmModal.action === 'delete' ? (
                <button
                  type="button"
                  onClick={() => handleExecuteDeleteOrVoid(deleteConfirmModal.invoice, 'delete')}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition"
                >
                  <Trash2 size={14} /> Eliminar Permanentemente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleExecuteDeleteOrVoid(deleteConfirmModal.invoice, 'void')}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
                >
                  <AlertTriangle size={14} /> Confirmar Anulação
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractCard({
  client,
  onPreview,
}: {
  client: AnyRecord;
  onPreview: (contract: AnyRecord) => void;
}) {
  const query = useListClientContracts(client.id);
  const contract = query.data?.[0];
  return (
    <div className="surface rounded-xl p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/clientes/${client.id}`} className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
            <FileSignature size={18} />
          </div>
          <div>
            <b>{client.fullName}</b>
            <p className="mono mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">{client.code}</p>
          </div>
        </Link>
        <StatusPill>{client.status === 'active' ? 'Activo' : 'Ver estado'}</StatusPill>
      </div>
      <div className="mt-5 border-t border-[hsl(var(--border))] pt-4">
        {contract ? (
          <>
            <div className="flex justify-between gap-3">
              <div>
                <b className="text-sm">{contract.planName}</b>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  {contract.planSpeed || serviceName(client.serviceType)} · vence dia {contract.dueDay}
                </p>
              </div>
              <b className="text-sm">
                {money(contract.monthlyPrice)}
                <span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]"> / mês</span>
              </b>
            </div>
            <div className="mt-4 flex gap-2">
              <ActionButton variant="outline" onClick={() => onPreview(contract)}>
                <Printer size={14} /> Imprimir contrato
              </ActionButton>
              <Link
                href={`/clientes/${client.id}`}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[hsl(var(--border))] px-3 text-sm font-bold"
              >
                Abrir ficha
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Sem contrato associado.</p>
        )}
      </div>
    </div>
  );
}

export function ContractPreview({
  contract,
  client,
  settings = {},
  close,
}: {
  contract: AnyRecord;
  client: AnyRecord;
  settings?: AnyRecord;
  close: () => void;
}) {
  // Resolução de variáveis dinâmicas nas cláusulas e introdução
  const resolveVars = (text: string) => {
    if (!text) return '';
    return text
      .replace(/{VALOR_INSTALACAO}/g, money(settings.connectionFee || 15000))
      .replace(/{METROS_CABO}/g, String(settings.cableIncludedMeters || 25))
      .replace(/{PRECO_METRO_EXTRA}/g, money(settings.extraMeterPrice || 250))
      .replace(/{HORAS_INSTALACAO}/g, String(settings.installationWindowHours || 48))
      .replace(/{TAXA_URGENCIA}/g, money(settings.urgentInstallationFee || 2000))
      .replace(/{MENSALIDADE}/g, money(contract.monthlyPrice || settings.tvMonthlyPrice || 4000))
      .replace(/{DIA_VENCIMENTO}/g, String(contract.dueDay || settings.paymentDueDay || 5))
      .replace(/{MULTA_ATRASO}/g, money(settings.latePenalty || 1000))
      .replace(/{MESES_SUSPENSAO}/g, String(settings.suspensionAfterMonths || 3))
      .replace(/{TAXA_RENOVACAO}/g, money(settings.renewalFee || 10000))
      .replace(/{TAXA_RELIGACAO}/g, money(settings.reconnectionFee || 2500))
      .replace(/{HORARIO_SUPORTE}/g, settings.supportHours || 'Segunda a sexta, 09h00–15h00 · Sábado, 08h00–11h00.')
      .replace(/{NOME_CLIENTE}/g, client.fullName || '—')
      .replace(/{CODIGO_CLIENTE}/g, client.code || '—')
      .replace(/{BI_CLIENTE}/g, client.documentNumber || '—')
      .replace(/{TELEFONE_CLIENTE}/g, client.phone || '—')
      .replace(/{ENDERECO_CLIENTE}/g, client.address || '—')
      .replace(/{SERVICO}/g, contract.planName || serviceName(client.serviceType))
      .replace(/{EMPRESA}/g, settings.companyName || 'OSDEL TECNOLOGIA')
      .replace(/{NIF}/g, settings.companyNif || '5600857127');
  };

  // Carrega cláusulas das definições configuradas pelo administrador
  const configuredClauses = Array.isArray(settings.contractClauses) && settings.contractClauses.length > 0
    ? settings.contractClauses.map((c: any) => ({
        title: Array.isArray(c) ? c[0] : c.title,
        text: resolveVars(Array.isArray(c) ? c[1] : c.text),
      }))
    : [
        { title: 'Adesão', text: 'Para aderir ao serviço é necessária a cópia do bilhete de identidade e a presença de um representante da família maior de 18 anos.' },
        { title: 'Custo e instalação', text: `A instalação tem o custo de ${money(settings.connectionFee || 15000)}. A OSDEL disponibiliza ${settings.cableIncludedMeters || 25} metros de cabo RG6; cada metro adicional custa ${money(settings.extraMeterPrice || 250)}.` },
        { title: 'Prazo de instalação', text: `A instalação será realizada até ${settings.installationWindowHours || 48} horas após a assinatura. O serviço urgente tem o custo adicional de ${money(settings.urgentInstallationFee || 2000)}.` },
        { title: 'Mensalidade', text: `A mensalidade é pré-paga e tem o valor de ${money(contract.monthlyPrice || settings.tvMonthlyPrice || 4000)}. O pagamento decorre do dia 01 ao dia ${settings.paymentDueDay || 5}.` },
        { title: 'Multa e suspensão', text: `Após o prazo aplica-se uma multa de ${money(settings.latePenalty || 1000)}. Com ${settings.suspensionAfterMonths || 3} meses sem pagamento, o serviço é suspenso e exige renovação contratual.` },
        { title: 'Regras de utilização', text: 'O contrato corresponde a uma única residência. É proibida a partilha do sinal com outra residência. Derivações para a mesma residência estão sujeitas à taxa definida pela empresa.' },
        { title: 'Suporte', text: settings.supportHours || 'Segunda a sexta, 09h00–15h00 · Sábado, 08h00–11h00.' },
      ];

  const number = `${settings.contractPrefix || 'CT'}-${String(contract.id).padStart(5, '0')}`;
  return (
    <PrintFrame close={close}>
      <div className="document-paper p-8 sm:p-12">
        <div className="flex items-start gap-4 border-b-2 border-[#0b4a8a] pb-6">
          <img
            src={getCompanyLogo(settings.logoUrl)}
            alt="Logo OSDEL"
            className="h-20 w-20 rounded-full border-2 border-[#0b4a8a] object-contain p-1 bg-white"
          />
          <div className="flex-1">
            <p className="text-lg font-black text-[#0b4a8a]">{settings.companyName || 'OSDEL TECNOLOGIA'}</p>
            <p className="mt-1 text-sm font-bold text-[#1e90ff]">{settings.companySubtitle || 'TV COMUNITÁRIA · INTERNET FIBRA'}</p>
            <p className="mt-2 text-[10px] leading-4 text-[#5d6870]">
              NIF: {settings.companyNif || '5600857127'} · {settings.companyPhone || ''}
              <br />
              {settings.companyAddress || ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6b7780]">Contrato</p>
            <p className="mt-2 font-mono text-xl font-black text-[#0b4a8a]">{number}</p>
            <p className="mt-2 text-xs text-[#687680]">{formatDate(contract.startDate || new Date().toISOString())}</p>
          </div>
        </div>
        <div className="mt-7 rounded-lg bg-[#f0f5fa] p-4 text-xs leading-5 text-[#43545e]">
          {resolveVars(settings.contractIntro || 'A TV comunitária e Internet fibra Osdel é uma rede voltada à comunidade, com informação, entretenimento, actualidade e conectividade de alta velocidade.')}
        </div>
        <h1 className="mt-8 text-center text-xl font-black uppercase tracking-[.08em] text-[#0b4a8a]">
          {settings.contractTitle || 'Termos de adesão de contrato'}
        </h1>
        <div className="mt-6 grid gap-4 rounded-lg border border-[#d7e1e8] p-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7780]">Titular</p>
            <p className="mt-1 font-black">{client.fullName || '—'}</p>
            <p className="mt-1 text-xs text-[#687680]">{client.documentNumber || 'BI não registado'} · {client.phone || 'Sem telefone'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7780]">Serviço contratado</p>
            <p className="mt-1 font-black">{contract.planName || serviceName(client.serviceType)}</p>
            <p className="mt-1 text-xs text-[#687680]">{contract.planSpeed || serviceName(client.serviceType)} · vence dia {contract.dueDay || settings.paymentDueDay || 5}</p>
          </div>
        </div>
        <p className="mt-7 text-xs font-bold text-[#33434d]">
          {settings.contractAcceptanceText || 'Ao assinar, as partes confirmam que leram e aceitam as condições abaixo:'}
        </p>
        <ol className="mt-4 space-y-3 pl-5 text-xs leading-5 text-[#46555e]">
          {configuredClauses.map((clause: any, index: number) => (
            <li key={index} className="pl-1">
              <strong className="text-[#0b4a8a]">{clause.title}:</strong> {clause.text}
            </li>
          ))}
        </ol>
        <p className="mt-8 text-xs leading-5 text-[#46555e]">
          {settings.contractClosingText || 'E por estarem de pleno acordo com os termos do contrato, as partes assinam o presente instrumento em duas vias de igual teor e valor.'}
        </p>
        <div className="mt-16 grid gap-12 sm:grid-cols-2">
          <div className="border-t border-[#52616b] pt-2 text-center text-xs font-bold">
            Ass. Cliente
            <br />
            <span className="font-normal text-[#687680]">{client.fullName || 'Nome do cliente'}</span>
          </div>
          <div className="border-t border-[#52616b] pt-2 text-center text-xs font-bold">
            Ass. Representante OSDEL
            <br />
            <span className="font-normal text-[#687680]">Carimbo oficial</span>
          </div>
        </div>
        <p className="mt-10 text-center text-[10px] text-[#687680]">Data: ____ / ____ / ________</p>
      </div>
    </PrintFrame>
  );
}

export function ReportPreview({
  report,
  periodTitle,
  settings,
  close,
}: {
  report: AnyRecord;
  periodTitle: string;
  settings: AnyRecord;
  close: () => void;
}) {
  const s = report.summary || {};
  const rows: AnyRecord[] = report.rows || [];
  return (
    <PrintFrame close={close}>
      <div className="document-paper p-8 sm:p-12">
        <div className="flex items-start justify-between gap-6 border-b-2 border-[#0b4a8a] pb-6">
          <div className="flex items-center gap-4">
            <img
              src={getCompanyLogo(settings.logoUrl)}
              alt="Logo OSDEL"
              className="h-20 w-20 rounded-full border-2 border-[#0b4a8a] object-contain p-1 bg-white"
            />
            <div>
              <p className="text-xl font-black tracking-tight text-[#0b4a8a]">
                {settings.companyName || 'OSDEL TECNOLOGIA'}
              </p>
              <p className="mt-1 text-sm font-bold text-[#1e90ff]">
                {settings.companySubtitle || 'TV COMUNITÁRIA · INTERNET FIBRA'}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-[#5d6870]">
                NIF: {settings.companyNif || '5600857127'} · Tel: {settings.companyPhone || '926 153 736 / 992 854 740'}
                <br />
                {settings.companyAddress || 'Rua 12, Bairro Golf I, Kilamba Kiaxi, Luanda'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6b7780]">
              Relatório Financeiro
            </p>
            <p className="mt-1 text-sm font-black text-[#0b4a8a]">{periodTitle}</p>
            <p className="mt-1 text-xs text-[#687680]">
              Emitido em {new Intl.DateTimeFormat('pt-AO', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}
            </p>
          </div>
        </div>

        {/* Resumo executivo */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-[#f0f5fa] p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7780]">Entradas (Valor)</span>
            <p className="mt-1 text-lg font-black text-[#0b4a8a]">{money(s.receita_total)}</p>
          </div>
          <div className="rounded-lg bg-[#fbf0ee] p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#a24e3a]">Saídas (Despesas)</span>
            <p className="mt-1 text-lg font-black text-[#a24e3a]">{money(s.saidas)}</p>
          </div>
          <div className="rounded-lg bg-[#edf6f1] p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#237052]">Resto (Líquido)</span>
            <p className="mt-1 text-lg font-black text-[#237052]">{money(s.resto)}</p>
          </div>
          <div className="rounded-lg bg-[#f0f5fa] p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7780]">N.º Pagamentos</span>
            <p className="mt-1 text-lg font-black text-[#0b4a8a]">{s.pagamentos || 0}</p>
          </div>
        </div>

        {/* Tabela solicitada: data, pagamentos, valor, saidas com motivo, resto, total, operador */}
        <div className="mt-8">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#0b4a8a]">
            Discriminação diária de movimentos
          </h2>
          <table className="mt-3 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#0b4a8a] bg-[#f0f5fa] text-[10px] uppercase tracking-wider text-[#3d5160]">
                <th className="p-2.5">Data</th>
                <th className="p-2.5 text-center">Pagamentos</th>
                <th className="p-2.5 text-right">Valor</th>
                <th className="p-2.5">Saídas com o motivo</th>
                <th className="p-2.5 text-right">Resto</th>
                <th className="p-2.5 text-right">Total</th>
                <th className="p-2.5 text-center">Operador</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r, i) => (
                  <tr key={i} className="border-b border-[#e4ecf1] hover:bg-[#f9fbfd]">
                    <td className="p-2.5 font-mono font-bold text-[#0b4a8a]">{formatDate(r.data)}</td>
                    <td className="p-2.5 text-center">{r.pagamentos}</td>
                    <td className="p-2.5 text-right font-bold text-[#237052]">{money(r.valor)}</td>
                    <td className="p-2.5 text-[#556570]">{r.motivo || '—'}</td>
                    <td className="p-2.5 text-right font-bold">{money(r.resto)}</td>
                    <td className="p-2.5 text-right font-black text-[#0b4a8a]">{money(r.total)}</td>
                    <td className="p-2.5 text-center font-mono text-[11px] text-[#6b7780]">{r.operador || 'deezy'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#687680]">
                    Sem movimentos no período seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Assinaturas */}
        <div className="mt-16 grid gap-12 sm:grid-cols-2">
          <div className="border-t border-[#52616b] pt-2 text-center text-xs font-bold">
            Operador / Caixa Responsável
            <br />
            <span className="font-normal text-[#687680]">Assinatura legível</span>
          </div>
          <div className="border-t border-[#52616b] pt-2 text-center text-xs font-bold">
            Gerência / Direcção OSDEL
            <br />
            <span className="font-normal text-[#687680]">Carimbo oficial</span>
          </div>
        </div>
      </div>
    </PrintFrame>
  );
}

export function ClientListPreview({
  clients,
  title,
  settings,
  close,
}: {
  clients: AnyRecord[];
  title: string;
  settings: AnyRecord;
  close: () => void;
}) {
  const activeCount = clients.filter((c) => c.status === 'active').length;
  const lateCount = clients.filter((c) => c.status === 'late').length;
  const suspendedCount = clients.filter((c) => c.status === 'suspended').length;
  return (
    <PrintFrame close={close}>
      <div className="document-paper p-8 sm:p-12">
        <div className="flex items-start justify-between gap-6 border-b-2 border-[#0b4a8a] pb-6">
          <div className="flex items-center gap-4">
            <img
              src={getCompanyLogo(settings.logoUrl)}
              alt="Logo OSDEL"
              className="h-20 w-20 rounded-full border-2 border-[#0b4a8a] object-contain p-1 bg-white"
            />
            <div>
              <p className="text-xl font-black tracking-tight text-[#0b4a8a]">
                {settings.companyName || 'OSDEL TECNOLOGIA'}
              </p>
              <p className="mt-1 text-sm font-bold text-[#1e90ff]">
                {settings.companySubtitle || 'TV COMUNITÁRIA · INTERNET FIBRA'}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-[#5d6870]">
                NIF: {settings.companyNif || '5600857127'} · Tel: {settings.companyPhone || '926 153 736 / 992 854 740'}
                <br />
                {settings.companyAddress || 'Rua 12, Bairro Golf I, Kilamba Kiaxi, Luanda'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#6b7780]">
              Registo de Carteira
            </p>
            <p className="mt-1 text-sm font-black text-[#0b4a8a]">{title}</p>
            <p className="mt-1 text-xs text-[#687680]">
              {clients.length} cliente(s) listado(s)
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-[#dceee5] px-3 py-1 font-bold text-[#237052]">
            Activos: {activeCount}
          </span>
          <span className="rounded-full bg-[#f7e9c9] px-3 py-1 font-bold text-[#946c22]">
            Em atraso (Corte): {lateCount}
          </span>
          <span className="rounded-full bg-[#f8e1da] px-3 py-1 font-bold text-[#a24e3a]">
            Suspensos (&gt;3 meses): {suspendedCount}
          </span>
        </div>

        <table className="mt-6 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b-2 border-[#0b4a8a] bg-[#f0f5fa] text-[10px] uppercase tracking-wider text-[#3d5160]">
              <th className="p-2">Código</th>
              <th className="p-2">Nome completo</th>
              <th className="p-2">Casa / BI</th>
              <th className="p-2">Rua / Bairro</th>
              <th className="p-2">Telefone</th>
              <th className="p-2">Serviço & PDO</th>
              <th className="p-2 text-right">Mensalidade</th>
              <th className="p-2 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-[#e4ecf1] hover:bg-[#f9fbfd]">
                <td className="p-2 font-mono font-bold text-[#0b4a8a]">{c.code}</td>
                <td className="p-2 font-semibold text-[#202f37]">{c.fullName || c.full_name || c.name}</td>
                <td className="p-2 font-mono text-[10px]">
                  <div>{c.houseCode || (c as any).house_code || '—'}</div>
                  <div className="text-[9px] text-[#687680]">{c.documentNumber || (c as any).document_number || ''}</div>
                </td>
                <td className="p-2 text-[10px] text-[#556570]">
                  {c.street ? `${c.street}${c.neighborhood ? ` · ${c.neighborhood}` : ''}` : (c.neighborhood || c.address || '—')}
                </td>
                <td className="p-2 font-mono text-[10px]">{c.phone}</td>
                <td className="p-2 text-[10px]">
                  <div className="font-semibold">{serviceName(c.serviceType)}</div>
                  {(c.pdoNumber || (c as any).pdo_number) && (
                    <div className="text-[9px] font-mono text-[#0b4a8a]">
                      PDO: {c.pdoNumber || (c as any).pdo_number}
                    </div>
                  )}
                </td>
                <td className="p-2 text-right font-mono text-[11px] font-bold">
                  {money(Number(c.monthlyPrice || (c as any).monthly_fee) || (c.serviceType === 'combo' ? 14500 : c.serviceType === 'internet' || c.serviceType === 'fibra' ? 12000 : 4000))}
                </td>
                <td className="p-2 text-center">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black ${
                      c.status === 'active'
                        ? 'bg-[#dceee5] text-[#237052]'
                        : c.status === 'late'
                          ? 'bg-[#f7e9c9] text-[#946c22]'
                          : c.status === 'suspended'
                            ? 'bg-[#f8e1da] text-[#a24e3a]'
                            : 'bg-[#e5e9ec] text-[#6b7780]'
                    }`}
                  >
                    {c.status === 'active'
                      ? 'Activo'
                      : c.status === 'late'
                        ? 'Em atraso'
                        : c.status === 'suspended'
                          ? 'Suspenso'
                          : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-8 text-right text-[10px] text-[#687680]">
          OSDEL TECNOLOGIA · Sistema de Gestão Comercial e Operacional
        </p>
      </div>
    </PrintFrame>
  );
}

export function ContractsEnhanced() {
  const { mode, meta } = useServiceMode();
  const clientsQuery = useListClients({ serviceMode: mode || undefined });
  const settingsQuery = useGetSettings();
  const create = useCreateContract();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [service, setService] = useState(() => (mode === 'fibra' ? 'internet' : mode === 'tv' ? 'tv' : ''));
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<AnyRecord>();
  const [form, setForm] = useState({
    clientId: '',
    planName: mode === 'fibra' ? 'Fibra 22' : 'TV Comunitária',
    planSpeed: mode === 'fibra' ? '22 Mbps/s' : 'Sinal RF',
    monthlyPrice: mode === 'fibra' ? '8500' : '4000',
    dueDay: '5',
    terms: '',
  });
  const settings = settingsQuery.data || {};
  const clients = (clientsQuery.data?.items || []).filter((client: AnyRecord) => {
    const text = `${client.fullName} ${client.code} ${client.phone} ${client.documentNumber || ''} ${client.houseCode || ''}`.toLowerCase();
    const matchesMode =
      mode === 'fibra'
        ? client.serviceType === 'internet' || client.serviceType === 'fibra' || client.serviceType === 'combo'
        : mode === 'tv'
        ? client.serviceType === 'tv' || client.serviceType === 'tv_cabo' || client.serviceType === 'combo'
        : !service || client.serviceType === service;
    return matchesMode && (!search || text.includes(search.toLowerCase()));
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      {
        clientId: Number(form.clientId),
        data: {
          ...form,
          monthlyPrice: Number(form.monthlyPrice),
          dueDay: Number(form.dueDay),
          startDate: new Date().toISOString().slice(0, 10),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          setModal(false);
        },
      },
    );
  };
  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Serviços & documentos · Modo {meta.shortName}</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.6rem]">Contratos ({meta.shortName})</h1>
          <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            Contratos vivos {mode === 'fibra' ? 'de Internet Fibra Óptica' : mode === 'tv' ? 'de TV Comunitária' : 'de TV & Fibra'}, com termos alinhados à operação OSDEL e impressão pronta para assinatura.
          </p>
        </div>
        <ActionButton onClick={() => setModal(true)}>
          <Plus size={16} /> Novo contrato
        </ActionButton>
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={17} />
          <TextInput placeholder="Pesquisar por cliente, código, BI, casa ou telefone" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
        </div>
        {mode === 'ambos' && (
          <SelectInput aria-label="Filtrar contratos por serviço" value={service} onChange={(event) => setService(event.target.value)} className="sm:w-48">
            <option value="">Todos os serviços</option>
            <option value="tv">TV</option>
            <option value="internet">Internet Fibra</option>
            <option value="combo">TV + Internet</option>
          </SelectInput>
        )}
      </div>
      {clients.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client: AnyRecord) => (
            <ContractCard key={client.id} client={client} onPreview={(contract) => setSelected({ contract, client })} />
          ))}
        </div>
      ) : (
        <div className="surface flex min-h-48 flex-col items-center justify-center rounded-xl p-8 text-center">
          <FileSignature className="mb-3 text-[hsl(var(--primary))]" size={26} />
          <b>Nenhum contrato encontrado</b>
          <p className="mt-1 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">Ajuste a pesquisa ou crie um contrato para a carteira.</p>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#142f35]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="max-h-[92dvh] w-full max-w-2xl overflow-auto rounded-t-2xl bg-[hsl(var(--card))] shadow-2xl sm:rounded-2xl">
            <header className="flex items-start justify-between border-b border-[hsl(var(--border))] px-5 py-4 sm:px-7">
              <div>
                <p className="eyebrow">Gestão contratual</p>
                <h2 className="mt-1 font-serif text-2xl">Novo contrato</h2>
              </div>
              <button aria-label="Fechar janela" onClick={() => setModal(false)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"><X size={19} /></button>
            </header>
            <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
              <FormField label="Cliente *">
                <SelectInput required value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}>
                  <option value="">Seleccionar cliente</option>
                  {(clientsQuery.data?.items || []).map((client: AnyRecord) => <option value={client.id} key={client.id}>{client.fullName} · {client.code}</option>)}
                </SelectInput>
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nome do plano *"><TextInput required value={form.planName} onChange={(event) => setForm({ ...form, planName: event.target.value })} /></FormField>
                <FormField label="Velocidade"><TextInput value={form.planSpeed} onChange={(event) => setForm({ ...form, planSpeed: event.target.value })} placeholder="Ex.: 50 Mbps/s" /></FormField>
                <FormField label="Mensalidade *"><TextInput required type="number" min="0" value={form.monthlyPrice} onChange={(event) => setForm({ ...form, monthlyPrice: event.target.value })} /></FormField>
                <FormField label="Dia de vencimento"><TextInput type="number" min="1" max="28" value={form.dueDay} onChange={(event) => setForm({ ...form, dueDay: event.target.value })} /></FormField>
              </div>
              <FormField label="Termos adicionais"><TextArea rows={3} value={form.terms} onChange={(event) => setForm({ ...form, terms: event.target.value })} placeholder="Condições específicas deste cliente…" /></FormField>
              <div className="flex justify-end gap-2"><ActionButton variant="outline" onClick={() => setModal(false)}>Cancelar</ActionButton><ActionButton type="submit" disabled={create.isPending}><Check size={15} /> Criar contrato</ActionButton></div>
            </form>
          </div>
        </div>
      )}
      {selected && <ContractPreview contract={selected.contract} client={selected.client} settings={settings} close={() => setSelected(undefined)} />}
    </div>
  );
}

export function AdminEnhanced() {
  const settingsQuery = useGetSettings();
  const update = useUpdateSettings();
  const auditLogsQuery = useListAuditLogs();
  const queryClient = useQueryClient();
  const currentUser = session();
  const isAdmin = currentUser?.role === 'admin';

  const [form, setForm] = useState<AnyRecord>();
  const [tab, setTab] = useState('empresa');
  const [auditSearch, setAuditSearch] = useState('');

  useEffect(() => {
    if (settingsQuery.data) {
      setForm((prev: any) => prev || {
        ...settingsQuery.data,
        internetPlans: settingsQuery.data.internetPlans || [],
        bankAccounts: settingsQuery.data.bankAccounts || [
          { name: 'Banco BAI', iban: 'AO06.0040.0000.1234.5678.9012.3', account: '12345678/10/001', holder: settingsQuery.data.companyName || 'OSDEL TECNOLOGIA' },
          { name: 'Banco BFA', iban: 'AO06.0006.0000.9876.5432.1098.7', account: '98765432/01/001', holder: settingsQuery.data.companyName || 'OSDEL TECNOLOGIA' },
        ],
      });
    }
  }, [settingsQuery.data]);

  if (settingsQuery.isLoading || !form) return <div className="surface rounded-xl p-8">A carregar definições…</div>;

  const set = (key: string, value: unknown) => {
    if (!isAdmin) return;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setBank = (index: number, key: string, value: string) => {
    if (!isAdmin) return;
    const updatedBanks = [...(form.bankAccounts || [])];
    updatedBanks[index] = { ...updatedBanks[index], [key]: value };
    set('bankAccounts', updatedBanks);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!isAdmin) {
      alert('Apenas o Administrador Geral tem autorização para guardar alterações nas definições.');
      return;
    }
    update.mutate({ data: form }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        alert('Definições da OSDEL guardadas com sucesso!');
      },
    });
  };

  const editPlan = (index: number, key: string, value: unknown) => {
    if (!isAdmin) return;
    set('internetPlans', form.internetPlans.map((item: AnyRecord, itemIndex: number) =>
      itemIndex === index ? { ...item, [key]: key === 'price' ? Number(value) : value } : item
    ));
  };

  const auditLogs = (auditLogsQuery.data?.items || []).filter((log: AnyRecord) => {
    if (!auditSearch) return true;
    const txt = `${log.userName || ''} ${log.action || ''} ${log.entityType || ''} ${JSON.stringify(log.details || '')}`.toLowerCase();
    return txt.includes(auditSearch.toLowerCase());
  });

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: BriefcaseBusiness },
    { id: 'precos', label: 'Preços & Taxas', icon: Banknote },
    { id: 'regras', label: 'Regras & Prazos', icon: Scale },
    { id: 'bancos', label: 'Coordenadas Bancárias', icon: Landmark },
    { id: 'fiscal', label: 'Fiscalidade & Garantias', icon: FileSpreadsheet },
    { id: 'planos', label: 'Planos Fibra', icon: Wifi },
    { id: 'documentos', label: 'Documentos', icon: Palette },
    { id: 'automacao', label: 'Automação & SMS', icon: MessageSquare },
    { id: 'auditoria', label: 'Auditoria & Logs', icon: History },
    { id: 'dados', label: 'Cópia de Segurança & Dados', icon: Database },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Centro de configuração e parametrização global</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.6rem]">Definições do Sistema</h1>
          <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            Personalize a identidade corporativa, tabelas de preços, coordenadas bancárias, modelos de fatura e regras operacionais.
          </p>
        </div>
        {isAdmin ? (
          <ActionButton type="submit" form="settings-form" disabled={update.isPending}>
            <Save size={15} /> {update.isPending ? 'A guardar…' : 'Guardar alterações'}
          </ActionButton>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800">
            <Lock size={14} /> Modo Leitura (Acesso Operador)
          </div>
        )}
      </div>

      {/* RBAC Warning Banner if Operator */}
      {!isAdmin && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-amber-900 flex items-start gap-3 shadow-sm">
          <Lock className="text-amber-700 shrink-0 mt-0.5" size={20} />
          <div>
            <b className="text-sm block font-bold">Acesso Restrito: Apenas o Administrador pode modificar as definições</b>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              O seu utilizador actual está autenticado com a função de <b>{currentUser?.role || 'Operador'}</b>. Os operadores podem consultar todos os parâmetros, tabelas de preços e coordenadas bancárias para efeitos de atendimento, mas qualquer modificação no sistema exige o perfil de Administrador Geral.
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-1.5 scrollbar-thin">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                tab === item.id
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Settings Form */}
      <form id="settings-form" onSubmit={save} className="space-y-5">
        <fieldset disabled={!isAdmin} className="space-y-5 border-none p-0 m-0">
          {/* TAB: EMPRESA */}
          {tab === 'empresa' && (
            <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
              <section className="surface rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <BriefcaseBusiness className="text-[hsl(var(--primary))]" size={20} />
                  <div>
                    <p className="eyebrow">Identidade legal e comercial</p>
                    <h2 className="mt-1 text-lg font-extrabold">Dados da Empresa</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Nome Oficial da Empresa">
                    <TextInput value={form.companyName || ''} onChange={(e) => set('companyName', e.target.value)} />
                  </FormField>
                  <FormField label="Número de Identificação Fiscal (NIF)">
                    <TextInput value={form.companyNif || ''} onChange={(e) => set('companyNif', e.target.value)} />
                  </FormField>
                  <FormField label="Telefone Principal de Atendimento">
                    <TextInput value={form.companyPhone || ''} onChange={(e) => set('companyPhone', e.target.value)} />
                  </FormField>
                  <FormField label="WhatsApp Comercial / Suporte">
                    <TextInput value={form.companyWhatsApp || ''} onChange={(e) => set('companyWhatsApp', e.target.value)} placeholder="+244 923 000 000" />
                  </FormField>
                  <FormField label="E-mail Oficial da Empresa">
                    <TextInput type="email" value={form.companyEmail || ''} onChange={(e) => set('companyEmail', e.target.value)} />
                  </FormField>
                  <FormField label="E-mail de Facturação Alternativo">
                    <TextInput type="email" value={form.companyEmailSecondary || ''} onChange={(e) => set('companyEmailSecondary', e.target.value)} placeholder="financeiro@osdel.ao" />
                  </FormField>
                </div>
                <div className="mt-4 space-y-4">
                  <FormField label="Morada / Sede Principal">
                    <TextInput value={form.companyAddress || ''} onChange={(e) => set('companyAddress', e.target.value)} />
                  </FormField>
                  <FormField label="Subtítulo nos Documentos Oficiais">
                    <TextInput value={form.companySubtitle || ''} onChange={(e) => set('companySubtitle', e.target.value)} />
                  </FormField>
                  <FormField label="Slogan / Mensagem Institucional">
                    <TextInput value={form.companySlogan || ''} onChange={(e) => set('companySlogan', e.target.value)} placeholder="Conectando lares com alta tecnologia" />
                  </FormField>
                </div>
              </section>

              <div className="space-y-5">
                {/* Gestão do Logotipo Oficial da Empresa */}
                <section className="surface rounded-xl p-6 border-2 border-[hsl(var(--primary)/.2)] shadow-sm">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="text-[hsl(var(--primary))]" size={22} />
                    <div>
                      <p className="eyebrow text-[hsl(var(--primary))] font-bold">Identidade Visual & Documentos</p>
                      <h2 className="mt-0.5 text-lg font-extrabold">Logotipo da Empresa</h2>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    Este logotipo é utilizado em tempo real em todas as Facturas, Recibos, Contratos de Adesão, Relatórios Financeiros e no cabeçalho do sistema.
                  </p>

                  <div className="mt-5 flex flex-col items-center sm:flex-row gap-5 p-4 rounded-xl bg-[hsl(var(--secondary)/.4)] border border-[hsl(var(--border))]">
                    <div className="relative group shrink-0">
                      <img
                        src={getCompanyLogo(form.logoUrl)}
                        alt="Logotipo Actual OSDEL"
                        className="h-24 w-24 rounded-2xl border-2 border-[hsl(var(--primary))] object-contain bg-white p-1.5 shadow-md"
                      />
                      <span className="absolute -bottom-2 -right-2 rounded-full bg-[hsl(var(--primary))] px-2 py-0.5 text-[9px] font-black text-white uppercase shadow-xs">
                        Activo
                      </span>
                    </div>

                    <div className="flex-1 space-y-2.5 w-full text-center sm:text-left">
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2 text-xs font-bold text-white hover:brightness-105 shadow-xs transition">
                          <Upload size={14} /> Carregar Nova Imagem
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 2.5 * 1024 * 1024) {
                                alert('A imagem deve ter no máximo 2.5MB.');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                if (base64) {
                                  saveCompanyLogo(base64);
                                  set('logoUrl', base64);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            saveCompanyLogo('/osdel-logo.jpg');
                            set('logoUrl', '/osdel-logo.jpg');
                          }}
                          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition"
                          title="Repor logotipo padrão OSDEL Tecnologia"
                        >
                          <RotateCcw size={14} /> Repor Original
                        </button>
                      </div>

                      <div className="text-[11px] text-[hsl(var(--muted-foreground))] leading-4">
                        Formatos suportados: PNG, JPG, WebP ou SVG com fundo transparente ou branco.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <FormField label="Ou introduza o URL do Logotipo Online">
                      <TextInput
                        placeholder="https://exemplo.com/logotipo-osdel.png"
                        value={form.logoUrl || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          set('logoUrl', val);
                          if (val) saveCompanyLogo(val);
                        }}
                      />
                    </FormField>
                  </div>
                </section>

                <section className="surface grid-paper rounded-xl p-6">
                  <div className="flex items-center gap-3">
                    <Globe2 className="text-[hsl(var(--primary))]" size={20} />
                    <div>
                      <p className="eyebrow">Localização & Moeda</p>
                      <h2 className="mt-1 text-lg font-extrabold">Operação Regional</h2>
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    <div className="rounded-lg bg-[hsl(var(--secondary)/.7)] p-4 text-sm">
                      <b>Moeda de Liquidação</b>
                      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        Todas as faturas, cobranças e relatórios são emitidos em Kwanzas angolanos (AOA).
                      </p>
                      <span className="mt-3 inline-flex rounded-full bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-black">
                        {form.currency || 'Kz'} (AOA)
                      </span>
                    </div>
                    <div className="rounded-lg border border-[hsl(var(--border))] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                      <ShieldCheck size={16} className="mb-2 text-[hsl(var(--primary))]" />
                      Todos os dados de configuração da OSDEL ficam salvaguardados com persistência segura no navegador. O Administrador pode gerar backups JSON a qualquer momento.
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* TAB: PREÇOS & TAXAS */}
          {tab === 'precos' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="surface rounded-xl p-6">
                <p className="eyebrow">TV por Cabo Comunitária</p>
                <h2 className="mt-1 text-lg font-extrabold">Tabela de Serviços Básicos</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Mensalidade Base (Kz)">
                    <TextInput type="number" min="0" value={form.tvMonthlyPrice || ''} onChange={(e) => set('tvMonthlyPrice', e.target.value)} />
                  </FormField>
                  <FormField label="TV Adicional / Ponto Extra (Kz)">
                    <TextInput type="number" min="0" value={form.tvExtraPrice || ''} onChange={(e) => set('tvExtraPrice', e.target.value)} />
                  </FormField>
                  <FormField label="Taxa de Adesão / Ligação (Kz)">
                    <TextInput type="number" min="0" value={form.connectionFee || ''} onChange={(e) => set('connectionFee', e.target.value)} />
                  </FormField>
                  <FormField label="Taxa de Derivação de Sinal (Kz)">
                    <TextInput type="number" min="0" value={form.derivationFee || ''} onChange={(e) => set('derivationFee', e.target.value)} />
                  </FormField>
                  <FormField label="Preço Metro Adicional Cabo (Kz)">
                    <TextInput type="number" min="0" value={form.extraMeterPrice || ''} onChange={(e) => set('extraMeterPrice', e.target.value)} />
                  </FormField>
                  <FormField label="Metros de Cabo Incluídos no Kit">
                    <TextInput type="number" min="0" value={form.cableIncludedMeters || ''} onChange={(e) => set('cableIncludedMeters', e.target.value)} />
                  </FormField>
                </div>
              </section>

              <section className="surface rounded-xl p-6">
                <p className="eyebrow">Taxas Operacionais & Penalizações</p>
                <h2 className="mt-1 text-lg font-extrabold">Serviços Técnicos e Reativação</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Taxa de Religação pós-corte (Kz)">
                    <TextInput type="number" min="0" value={form.reconnectionFee ?? 1000} onChange={(e) => set('reconnectionFee', e.target.value)} />
                  </FormField>
                  <FormField label="Taxa de Transferência de Titular (Kz)">
                    <TextInput type="number" min="0" value={form.transferFee || ''} onChange={(e) => set('transferFee', e.target.value)} />
                  </FormField>
                  <FormField label="Instalação / Urgência Técnica (Kz)">
                    <TextInput type="number" min="0" value={form.urgentInstallationFee || ''} onChange={(e) => set('urgentInstallationFee', e.target.value)} />
                  </FormField>
                  <FormField label="Taxa de Renovação Contratual (Kz)">
                    <TextInput type="number" min="0" value={form.renewalFee || ''} onChange={(e) => set('renewalFee', e.target.value)} />
                  </FormField>
                  <FormField label="Desconto Plano Anual (%)">
                    <TextInput type="number" min="0" max="50" value={form.annualDiscountPercentage ?? 10} onChange={(e) => set('annualDiscountPercentage', e.target.value)} />
                  </FormField>
                  <FormField label="Multa Fixa por Atraso (Kz)">
                    <TextInput type="number" min="0" value={form.latePenalty || ''} onChange={(e) => set('latePenalty', e.target.value)} />
                  </FormField>
                </div>
              </section>
            </div>
          )}

          {/* TAB: REGRAS & PRAZOS */}
          {tab === 'regras' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="surface rounded-xl p-6">
                <p className="eyebrow">Cobrança e Vencimentos</p>
                <h2 className="mt-1 text-lg font-extrabold">Prazos de Pagamento</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Dia limite de pagamento do mês (1-28)">
                    <TextInput type="number" min="1" max="28" value={form.paymentDueDay || ''} onChange={(e) => set('paymentDueDay', e.target.value)} />
                  </FormField>
                  <FormField label="Dias de tolerância antes do corte">
                    <TextInput type="number" min="0" max="15" value={form.toleranceDays ?? 3} onChange={(e) => set('toleranceDays', e.target.value)} />
                  </FormField>
                  <FormField label="Suspender definitivamente após (meses em dívida)">
                    <TextInput type="number" min="1" max="12" value={form.suspensionAfterMonths || ''} onChange={(e) => set('suspensionAfterMonths', e.target.value)} />
                  </FormField>
                  <FormField label="Antecedência de lembrete por SMS (dias)">
                    <TextInput type="number" min="1" max="7" value={form.reminderDaysBeforeDue || ''} onChange={(e) => set('reminderDaysBeforeDue', e.target.value)} />
                  </FormField>
                </div>
              </section>

              <section className="surface rounded-xl p-6">
                <p className="eyebrow">SLA Técnico & Atendimento</p>
                <h2 className="mt-1 text-lg font-extrabold">Prazos de Assistência Técnica</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Prazo normal de instalação (horas)">
                    <TextInput type="number" min="1" value={form.installationWindowHours || ''} onChange={(e) => set('installationWindowHours', e.target.value)} />
                  </FormField>
                  <FormField label="Prazo máximo reposição de avaria (horas)">
                    <TextInput type="number" min="1" value={form.serviceRecoveryHours || ''} onChange={(e) => set('serviceRecoveryHours', e.target.value)} />
                  </FormField>
                  <FormField label="Horário de Atendimento Normal">
                    <TextInput value={form.supportHours || ''} onChange={(e) => set('supportHours', e.target.value)} placeholder="08h às 18h" />
                  </FormField>
                  <FormField label="Horário de Suporte Técnico ao Fim-de-Semana">
                    <TextInput value={form.weekendSupportHours || 'Sábado: 08h às 13h'} onChange={(e) => set('weekendSupportHours', e.target.value)} />
                  </FormField>
                </div>
              </section>
            </div>
          )}

          {/* TAB: BANCOS & COORDENADAS BANCÁRIAS */}
          {tab === 'bancos' && (
            <div className="surface rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Landmark className="text-[hsl(var(--primary))]" size={22} />
                <div>
                  <p className="eyebrow">Coordenadas financeiras oficiais</p>
                  <h2 className="mt-1 text-lg font-extrabold">Contas Bancárias da OSDEL (Múltiplos Bancos)</h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Faça a gestão das várias contas bancárias da empresa (BAI, BFA, BIC, Sol, Atlântico, etc.). Os clientes e técnicos visualizam estas coordenadas para liquidação de faturas e transferências.
                  </p>
                </div>
              </div>

              <BankAccountsManager
                accounts={(form.bankAccounts || []).map((acc: any, idx: number) => {
                  const bank = getBankByIban(acc.iban) || ANGOLAN_BANKS.find(b => b.name.toLowerCase().includes((acc.name || '').toLowerCase()));
                  return {
                    id: acc.id || `comp-bank-${idx}`,
                    bankCode: acc.bankCode || bank?.code || '0040',
                    bankName: acc.name || bank?.name || 'Banco BAI',
                    accountHolder: acc.holder || form.companyName || 'OSDEL TECNOLOGIA',
                    iban: acc.iban || '',
                    accountNumber: acc.account || '',
                    accountType: acc.accountType || 'operacional',
                    isDefault: acc.isDefault ?? idx === 0,
                    notes: acc.notes || '',
                  };
                })}
                defaultHolderName={form.companyName || 'OSDEL TECNOLOGIA'}
                isCompany={true}
                readOnly={!isAdmin}
                onChange={(updatedAccounts) => {
                  const mappedForForm = updatedAccounts.map((a) => ({
                    id: a.id,
                    name: a.bankName,
                    bankCode: a.bankCode,
                    iban: a.iban,
                    account: a.accountNumber,
                    holder: a.accountHolder,
                    accountType: a.accountType,
                    isDefault: a.isDefault,
                    notes: a.notes,
                  }));
                  set('bankAccounts', mappedForForm);
                }}
              />
            </div>
          )}

          {/* TAB: FISCALIDADE & GARANTIAS */}
          {tab === 'fiscal' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="surface rounded-xl p-6">
                <p className="eyebrow">Enquadramento Fiscal Angolano</p>
                <h2 className="mt-1 text-lg font-extrabold">Regime de IVA & Retenção</h2>
                <div className="mt-6 space-y-4">
                  <FormField label="Motivo de Isenção / Regime do IVA (CIVA)">
                    <TextArea
                      rows={3}
                      value={form.ivaExemptionReason || 'Regime de Exclusão do IVA nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA).'}
                      onChange={(e) => set('ivaExemptionReason', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Taxa de Retenção na Fonte para Empresas Colectivas (%)">
                    <TextInput
                      type="number"
                      min="0"
                      max="15"
                      value={form.withholdingTaxRate ?? 6.5}
                      onChange={(e) => set('withholdingTaxRate', e.target.value)}
                    />
                  </FormField>
                  <div className="rounded-lg bg-[hsl(var(--secondary)/.5)] p-3 text-xs text-[hsl(var(--muted-foreground))]">
                    O texto de enquadramento fiscal acima é impresso em todas as faturas para conformidade com a AGT (Administração Geral Tributária).
                  </div>
                </div>
              </section>

              <section className="surface rounded-xl p-6">
                <p className="eyebrow">Garantia & Equipamentos</p>
                <h2 className="mt-1 text-lg font-extrabold">Termos de Garantia Técnica</h2>
                <div className="mt-6 space-y-4">
                  <FormField label="Prazo de Garantia da Instalação Técnica (Dias)">
                    <TextInput
                      type="number"
                      min="1"
                      value={form.installationWarrantyDays ?? 30}
                      onChange={(e) => set('installationWarrantyDays', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Condições de Garantia dos Equipamentos (ONU/Splitter/Cabos)">
                    <TextArea
                      rows={4}
                      value={form.equipmentWarrantyTerms || 'A OSDEL assegura assistência gratuita para defeitos de fabrico e integridade do sinal durante o período de garantia legal. Danos provocados por intempéries, má utilização ou manipulação indevida não estão abrangidos.'}
                      onChange={(e) => set('equipmentWarrantyTerms', e.target.value)}
                    />
                  </FormField>
                </div>
              </section>
            </div>
          )}

          {/* TAB: PLANOS FIBRA */}
          {tab === 'planos' && (
            <section className="surface rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Internet fibra óptica comercializada</p>
                  <h2 className="mt-1 text-lg font-extrabold">Planos de Internet</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Adicione ou edite as velocidades e mensalidades dos planos fibra disponíveis para contratação.
                  </p>
                </div>
                {isAdmin && (
                  <ActionButton
                    type="button"
                    variant="outline"
                    onClick={() =>
                      set('internetPlans', [
                        ...form.internetPlans,
                        { id: `fibra-${Date.now()}`, name: 'Novo Plano Fibra', speed: '20 Mbps/s', price: 15000 },
                      ])
                    }
                  >
                    <Plus size={15} /> Adicionar plano
                  </ActionButton>
                )}
              </div>
              <div className="mt-6 space-y-3">
                {form.internetPlans.map((item: AnyRecord, index: number) => (
                  <div
                    key={item.id || index}
                    className="grid gap-3 rounded-xl border border-[hsl(var(--border))] p-4 sm:grid-cols-[1.1fr_1fr_.7fr_auto] sm:items-end"
                  >
                    <FormField label="Nome Comercial">
                      <TextInput value={item.name} onChange={(e) => editPlan(index, 'name', e.target.value)} />
                    </FormField>
                    <FormField label="Velocidade (Download / Upload)">
                      <TextInput value={item.speed} onChange={(e) => editPlan(index, 'speed', e.target.value)} />
                    </FormField>
                    <FormField label="Mensalidade (Kz)">
                      <TextInput type="number" min="0" value={item.price} onChange={(e) => editPlan(index, 'price', e.target.value)} />
                    </FormField>
                    {isAdmin && (
                      <ActionButton
                        type="button"
                        variant="quiet"
                        onClick={() =>
                          set(
                            'internetPlans',
                            form.internetPlans.filter((_: AnyRecord, itemIndex: number) => itemIndex !== index)
                          )
                        }
                      >
                        <Trash2 size={15} /> Remover
                      </ActionButton>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TAB: DOCUMENTOS */}
          {tab === 'documentos' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="surface rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <ReceiptText className="text-[hsl(var(--primary))]" size={20} />
                  <div>
                    <p className="eyebrow">Identidade Documental</p>
                    <h2 className="mt-1 text-lg font-extrabold">Facturas & Recibos</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Prefixo da Factura">
                    <TextInput value={form.invoicePrefix || ''} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} />
                  </FormField>
                  <FormField label="Modelo de Facturação">
                    <SelectInput value={form.invoiceTemplate || ''} onChange={(e) => set('invoiceTemplate', e.target.value)}>
                      <option value="recibo-pagamento">Factura / Recibo Oficial</option>
                      <option value="factura-simplificada">Factura Simplificada</option>
                    </SelectInput>
                  </FormField>
                </div>
                <div className="mt-4">
                  <FormField label="Rodapé Padrão do Documento">
                    <TextArea rows={4} value={form.invoiceFooter || ''} onChange={(e) => set('invoiceFooter', e.target.value)} />
                  </FormField>
                </div>
              </section>

              <section className="surface rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <FileSignature className="text-[hsl(var(--primary))]" size={20} />
                  <div>
                    <p className="eyebrow">Contratos de Prestação</p>
                    <h2 className="mt-1 text-lg font-extrabold">Termos de Adesão</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Prefixo do Contrato">
                    <TextInput value={form.contractPrefix || ''} onChange={(e) => set('contractPrefix', e.target.value.toUpperCase())} />
                  </FormField>
                  <FormField label="Modelo Contratual">
                    <SelectInput value={form.contractTemplate || ''} onChange={(e) => set('contractTemplate', e.target.value)}>
                      <option value="termos-adesao-osdel">Termos de adesão OSDEL</option>
                      <option value="contrato-fibra">Contrato de internet fibra</option>
                    </SelectInput>
                  </FormField>
                </div>
                <div className="mt-4">
                  <FormField label="Introdução do Contrato">
                    <TextArea rows={4} value={form.contractIntro || ''} onChange={(e) => set('contractIntro', e.target.value)} />
                  </FormField>
                </div>
              </section>
            </div>
          )}

          {/* TAB: AUTOMAÇÃO & SMS */}
          {tab === 'automacao' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="surface rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-[hsl(var(--primary))]" size={20} />
                  <div>
                    <p className="eyebrow">Lembretes & Cobrança</p>
                    <h2 className="mt-1 text-lg font-extrabold">Avisos Automáticos</h2>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-[hsl(var(--border))] p-4 text-sm font-bold">
                    <span>Enviar lembrete antes do vencimento</span>
                    <input
                      type="checkbox"
                      checked={Boolean(form.automaticReminderEnabled)}
                      onChange={(e) => set('automaticReminderEnabled', e.target.checked)}
                      className="h-5 w-5 accent-[hsl(var(--primary))]"
                    />
                  </label>
                  <FormField label="Dias antes do vencimento para alertar">
                    <TextInput type="number" min="0" max="5" value={form.reminderDaysBeforeDue || ''} onChange={(e) => set('reminderDaysBeforeDue', e.target.value)} />
                  </FormField>
                  <FormField label="Horário de envio dos lembretes">
                    <TextInput value={form.supportHours || ''} onChange={(e) => set('supportHours', e.target.value)} />
                  </FormField>
                </div>
              </section>

              <section className="surface rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <Database className="text-[hsl(var(--primary))]" size={20} />
                  <div>
                    <p className="eyebrow">Configuração de Gateway</p>
                    <h2 className="mt-1 text-lg font-extrabold">API SMS / Mensagens</h2>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <FormField label="Provedor de SMS">
                    <TextInput value={form.smsProvider || ''} onChange={(e) => set('smsProvider', e.target.value)} placeholder="Ex.: Unitel / Africell API" />
                  </FormField>
                  <FormField label="Remetente / Sender ID">
                    <TextInput value={form.smsSender || ''} onChange={(e) => set('smsSender', e.target.value)} placeholder="OSDEL" />
                  </FormField>
                </div>
                <div className="mt-4 space-y-4">
                  <FormField label="Endpoint URL da API">
                    <TextInput value={form.smsApiUrl || ''} onChange={(e) => set('smsApiUrl', e.target.value)} placeholder="https://api.sms-gateway.ao/v1/send" />
                  </FormField>
                  <label className="flex items-center justify-between gap-4 rounded-lg border border-[hsl(var(--border))] p-4 text-sm font-bold">
                    <span>Activar integração com Gateway de SMS</span>
                    <input
                      type="checkbox"
                      checked={Boolean(form.smsEnabled)}
                      onChange={(e) => set('smsEnabled', e.target.checked)}
                      className="h-5 w-5 accent-[hsl(var(--primary))]"
                    />
                  </label>
                </div>
              </section>
            </div>
          )}
        </fieldset>

        {/* TAB: AUDITORIA & LOGS */}
        {tab === 'auditoria' && (
          <section className="surface rounded-xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <History className="text-[hsl(var(--primary))]" size={22} />
                <div>
                  <p className="eyebrow">Trilha de auditoria e segurança</p>
                  <h2 className="mt-1 text-lg font-extrabold">Histórico de Acções no Sistema</h2>
                </div>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={15} />
                <TextInput
                  placeholder="Pesquisar utilizador ou acção..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {auditLogs.length ? (
              <div className="overflow-x-auto rounded-lg border border-[hsl(var(--border))]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[hsl(var(--secondary))] text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    <tr>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Utilizador</th>
                      <th className="p-3">Módulo</th>
                      <th className="p-3">Acção</th>
                      <th className="p-3">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    {auditLogs.map((log: AnyRecord, idx: number) => (
                      <tr key={log.id || idx} className="hover:bg-[hsl(var(--secondary)/.3)]">
                        <td className="p-3 font-mono text-[11px] text-[hsl(var(--muted-foreground))]">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="p-3">
                          <b className="font-bold text-[hsl(var(--primary))]">{log.userName || 'Sistema'}</b>
                        </td>
                        <td className="p-3 font-medium capitalize">{log.entityType || 'Geral'}</td>
                        <td className="p-3">
                          <span className="rounded bg-[hsl(var(--secondary))] px-2 py-0.5 text-[10px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-[hsl(var(--muted-foreground))] max-w-xs truncate">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <History className="text-[hsl(var(--muted-foreground))] mb-2" size={28} />
                <p className="text-sm font-bold">Sem registos de auditoria correspondentes.</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  Todas as operações de criação, fecho de caixa, cancelamento e modificação ficam registadas aqui.
                </p>
              </div>
            )}
          </section>
        )}

        {/* TAB: CÓPIA DE SEGURANÇA & DADOS */}
        {tab === 'dados' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="surface rounded-xl p-6">
              <div className="flex items-center gap-3">
                <Database className="text-[hsl(var(--primary))]" size={20} />
                <div>
                  <p className="eyebrow">Cópia de segurança completa</p>
                  <h2 className="mt-1 text-lg font-extrabold">Exportar dados da OSDEL</h2>
                </div>
              </div>
              <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Transfira uma cópia em formato JSON com todos os clientes, contratos, faturas, pagamentos, fechos de caixa, equipa e definições para arquivo seguro ou transferência para outro computador.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const json = exportDatabaseJson();
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `osdel-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] text-white px-4 py-2.5 text-sm font-bold hover:brightness-110 transition"
                >
                  <Save size={16} /> Descarregar Backup JSON (.json)
                </button>
              </div>
            </section>

            <section className="surface rounded-xl p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[hsl(var(--primary))]" size={20} />
                <div>
                  <p className="eyebrow">Restauração & Inicialização</p>
                  <h2 className="mt-1 text-lg font-extrabold">Importar ou Restaurar</h2>
                </div>
              </div>
              <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                Carregue um arquivo JSON gerado anteriormente para restaurar a operação por completo.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[hsl(var(--muted-foreground))] mb-2">
                    Seleccionar arquivo de backup:
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[hsl(var(--secondary))] file:text-[hsl(var(--foreground))] hover:file:brightness-95 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (confirm('Atenção: A importação irá substituir os registos actuais. Deseja continuar?')) {
                          const ok = importDatabaseJson(content);
                          if (ok) {
                            alert('Backup restaurado com sucesso! A página será reiniciada.');
                            window.location.reload();
                          } else {
                            alert('Erro ao interpretar o arquivo JSON de backup.');
                          }
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </div>

                {isAdmin && (
                  <div className="pt-4 border-t border-[hsl(var(--border))]">
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
                      Repor base de dados com registos padrão de demonstração:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Tem a certeza que deseja repor todos os dados com os padrões iniciais da OSDEL? Todos os dados actuais serão substituídos.')) {
                          resetDatabaseToDefaults();
                          alert('Dados de demonstração repostos com sucesso!');
                          window.location.reload();
                        }
                      }}
                      className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-1.5 text-xs font-bold hover:bg-red-100 transition"
                    >
                      <Trash2 size={14} /> Repor Dados Padrão de Demonstração
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </form>
    </div>
  );
}