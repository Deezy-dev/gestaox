import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Printer, ArrowLeft, X, Check, FileText, Receipt, Landmark } from 'lucide-react';
import {
  useListExpenses,
  useListCashClosures,
  useListServiceOrders,
  useListClients,
  useGetSettings,
  useListInvoices,
  useListPayments
} from '@/lib/local-api';
import { getMonthlyClosures, type MonthlyClosure } from '@/lib/monthly-closures';
import { getCompanyLogo } from '@/lib/company-logo';
import { OSDEL_LOGO_BASE64 } from '@/lib/osdel-logo-base64';
import { kz, date, dateTime } from '@/components/shared-ui';

export function PrintPage() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const tipo = searchParams.get('tipo') || 'guia-saida';
  const idParam = searchParams.get('id');

  const { data: settings } = useGetSettings();
  const expensesQuery = useListExpenses();
  const closuresQuery = useListCashClosures();
  const serviceOrdersQuery = useListServiceOrders();
  const clientsQuery = useListClients();
  const invoicesQuery = useListInvoices();
  const paymentsQuery = useListPayments();

  // Dual format for invoices: 'pos' (impressora térmica 80mm/58mm) ou 'a4' (página padrão A4)
  const initialFormat = searchParams.get('formato') === 'a4' ? 'a4' : 'pos';
  const [invoiceFormat, setInvoiceFormat] = useState<'a4' | 'pos'>(initialFormat);
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);

  const expenses = (expensesQuery.data as any[]) || [];
  const cashClosures = (closuresQuery.data as any[]) || [];
  const serviceOrders = (serviceOrdersQuery.data?.items as any[]) || [];
  const clients = (clientsQuery.data?.items as any[]) || [];
  const invoices = (invoicesQuery.data?.items as any[]) || [];
  const payments = (Array.isArray(paymentsQuery.data) ? paymentsQuery.data : paymentsQuery.data?.items) || [];
  const monthlyClosures = getMonthlyClosures();

  const isInvoiceType = ['fatura', 'factura', 'recibo', 'pagamento', 'invoice'].includes(tipo.toLowerCase());
  const isContractType = ['contrato', 'contract'].includes(tipo.toLowerCase());

  // Find target item
  const selectedExpense = idParam
    ? expenses.find((e) => String(e.id) === String(idParam))
    : expenses[0];

  const selectedCashClosure = idParam
    ? cashClosures.find((c) => String(c.id) === String(idParam))
    : cashClosures[0];

  const selectedMonthlyClosure = idParam
    ? monthlyClosures.find((m) => String(m.id) === String(idParam) || m.code === idParam)
    : monthlyClosures[0];

  const selectedServiceOrder = idParam
    ? serviceOrders.find((s) => String(s.id) === String(idParam))
    : serviceOrders[0];

  const selectedInvoice = idParam
    ? invoices.find((inv) => String(inv.id) === String(idParam) || inv.invoiceNumber === idParam) ||
      payments.find((p) => String(p.id) === String(idParam) || p.invoiceNumber === idParam)
    : invoices[0] || payments[0];

  const selectedInvoiceClient = selectedInvoice
    ? clients.find((c) => c.id === selectedInvoice.clientId)
    : undefined;

  const selectedContractClient = idParam
    ? clients.find((c) => String(c.id) === String(idParam) || c.code === idParam)
    : clients[0];

  // Auto trigger print when ready
  useEffect(() => {
    if (hasAutoPrinted) return;
    const timer = setTimeout(() => {
      try {
        window.focus();
        window.print();
        setHasAutoPrinted(true);
      } catch (err) {
        console.warn('Erro na chamada automática de impressão:', err);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [hasAutoPrinted, selectedExpense, selectedCashClosure, selectedMonthlyClosure, selectedInvoice, selectedContractClient]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white print:p-0">
      {/* CSS Dinâmico para Impressora Térmica POS 80mm */}
      {isInvoiceType && invoiceFormat === 'pos' && (
        <style>{`
          @media print {
            @page {
              size: 80mm auto !important;
              margin: 2mm 3mm !important;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            header, .print\\:hidden {
              display: none !important;
            }
            main {
              max-width: 80mm !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .pos-receipt-paper {
              max-width: 80mm !important;
              width: 72mm !important;
              margin: 0 !important;
              padding: 2mm !important;
              border: none !important;
              box-shadow: none !important;
            }
          }
        `}</style>
      )}

      {/* Top Floating Control Bar - Hidden on print */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-300 bg-white/95 px-6 py-3 shadow-md backdrop-blur-md print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                setLocation('/');
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft size={14} />
            <span>Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {isInvoiceType
                ? (invoiceFormat === 'pos' ? 'Talão Térmico POS (80mm)' : 'Factura Oficial (A4)')
                : 'Documento Pronto para Impressão / PDF'}
            </span>
          </div>
        </div>

        {/* Seletor Dual de Formato (A4 vs Térmica POS) quando for factura */}
        <div className="flex items-center gap-2">
          {isInvoiceType && (
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-300 mr-2">
              <button
                type="button"
                onClick={() => setInvoiceFormat('pos')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  invoiceFormat === 'pos'
                    ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🧾 Térmica POS (80mm)
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFormat('a4')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  invoiceFormat === 'a4'
                    ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📄 Formato A4
              </button>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Printer size={15} />
            <span>Imprimir {isInvoiceType ? (invoiceFormat === 'pos' ? 'Talão POS' : 'A4') : 'Agora'} (Ctrl + P)</span>
          </button>
          <button
            onClick={() => window.close()}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            title="Fechar aba"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Main Printable Document Canvas */}
      <main className={`mx-auto p-4 sm:p-8 print:max-w-none print:p-0 ${isInvoiceType && invoiceFormat === 'pos' ? 'max-w-[420px]' : 'max-w-[800px]'}`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl print:rounded-none print:border-none print:p-0 print:shadow-none">
          {/* TIPO: FACTURA / RECIBO (DUAL FORMATO: TÉRMICA POS OU A4) */}
          {isInvoiceType && selectedInvoice && (
            invoiceFormat === 'pos' ? (
              <ThermalInvoiceReceipt
                invoice={selectedInvoice}
                client={selectedInvoiceClient}
                settings={settings}
              />
            ) : (
              <A4InvoiceOfficial
                invoice={selectedInvoice}
                client={selectedInvoiceClient}
                settings={settings}
              />
            )
          )}

          {/* TIPO: GUIA DE SAÍDA / VOUCHER */}
          {tipo === 'guia-saida' && selectedExpense && (
            <ExpenseVoucherDocument
              expense={selectedExpense}
              settings={settings}
            />
          )}

          {/* TIPO: FECHO MENSAL CONSOLIDADO */}
          {tipo === 'fecho-mensal' && selectedMonthlyClosure && (
            <MonthlyClosureDocument
              closure={selectedMonthlyClosure}
              settings={settings}
            />
          )}

          {/* TIPO: FECHO DIÁRIO */}
          {tipo === 'fecho-diario' && selectedCashClosure && (
            <DailyClosureDocument
              closure={selectedCashClosure}
              settings={settings}
            />
          )}

          {/* TIPO: ORDEM DE SERVIÇO */}
          {tipo === 'ordem-servico' && selectedServiceOrder && (
            <ServiceOrderDocument
              order={selectedServiceOrder}
              client={clients.find((c) => c.id === selectedServiceOrder.clientId)}
              settings={settings}
            />
          )}

          {/* TIPO: CONTRATO DE ADESÃO OFICIAL */}
          {isContractType && selectedContractClient && (
            <OfficialContractDocument
              client={selectedContractClient}
              settings={settings}
            />
          )}

          {/* FALLBACK: ITEM NÃO ENCONTRADO */}
          {!selectedExpense && !selectedMonthlyClosure && !selectedCashClosure && !selectedServiceOrder && (!isInvoiceType || !selectedInvoice) && (!isContractType || !selectedContractClient) && (
            <div className="p-12 text-center">
              <FileText size={36} className="mx-auto text-slate-400 mb-3" />
              <h2 className="text-lg font-bold text-slate-800">Documento não encontrado</h2>
              <p className="text-xs text-slate-500 mt-1">
                O identificador solicitado não existe ou ainda não foi sincronizado.
              </p>
              <button
                onClick={() => setLocation('/')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
              >
                Voltar ao Painel
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// 1. COMPONENTE: GUIA OFICIAL DE SAÍDA DE CAIXA (VOUCHER)
// ---------------------------------------------------------------------------------------
function ExpenseVoucherDocument({ expense, settings }: { expense: any; settings?: any }) {
  const company = settings?.companyName || 'OSDEL TECNOLOGIA LDA';
  const phone = settings?.companyPhone || '+244 923 000 000';
  const address = settings?.companyAddress || 'Luanda, Angola';

  return (
    <div id="printable-voucher" className="space-y-6 text-xs text-slate-900 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-black tracking-tight text-slate-900">{company}</h1>
          <p className="text-[11px] text-slate-600 mt-0.5">
            NIF: 5417089214 · {address} · Tel: {phone}
          </p>
          <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            TV por Cabo Comunitária & Internet Banda Larga Fibra Óptica
          </span>
        </div>
        <div className="text-right">
          <div className="inline-block rounded-lg bg-slate-100 px-3 py-1 font-mono text-xs font-black text-slate-900 border border-slate-300">
            GUIA-EXP/{String(expense.id).padStart(5, '0')}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            Data: <strong>{date(expense.date)}</strong>
          </div>
        </div>
      </div>

      <div className="text-center py-1">
        <h2 className="text-base font-black uppercase tracking-widest text-slate-900">
          GUIA DE SAÍDA DE CAIXA / COMPROVATIVO DE LIQUIDAÇÃO
        </h2>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-4 bg-slate-50/50">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Conta de Saída:</span>
          <b className="text-xs text-slate-900">{expense.account || 'Caixa Geral'}</b>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Forma de Pagamento:</span>
          <b className="text-xs text-slate-900">{expense.paymentMethod || 'Numerário'}</b>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Beneficiário / Fornecedor:</span>
          <b className="text-xs text-slate-900">
            {expense.supplier || 'Particular / Equipa Interna'}
            {expense.supplierNif && (
              <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-600">
                (NIF: {expense.supplierNif})
              </span>
            )}
          </b>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Motivo / Descrição da Despesa:</span>
          <div className="mt-1 rounded-md bg-white p-3 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
            {expense.reason}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Categoria Contabilística:</span>
          <span className="text-xs font-semibold text-slate-800 uppercase">{expense.category}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Documento Suporte:</span>
          <span className="font-mono text-xs font-semibold text-slate-800">{expense.documentNumber || '—'}</span>
        </div>
      </div>

      {/* Amount Box */}
      <div className="rounded-xl border-2 border-slate-900 bg-slate-900 p-5 text-white text-center">
        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300">
          VALOR TOTAL LIQUIDADO
        </span>
        <div className="mt-1 text-3xl font-black tracking-tight">{kz(expense.amount)}</div>
        {Number(expense.taxWithheld || 0) > 0 && (
          <p className="mt-1 text-xs text-amber-300">
            (Inclui retenção na fonte 6.5%: {kz(expense.taxWithheld)})
          </p>
        )}
      </div>

      {/* Audit & Signatures */}
      <div className="grid grid-cols-2 gap-8 pt-10 text-center">
        <div className="space-y-1">
          <div className="border-t border-slate-400 pt-2" />
          <b className="block text-xs text-slate-900">O Operador / Tesoureiro</b>
          <span className="text-[11px] text-slate-500">@{expense.operator || 'deezy'}</span>
        </div>
        <div className="space-y-1">
          <div className="border-t border-slate-400 pt-2" />
          <b className="block text-xs text-slate-900">O Beneficiário / Fornecedor</b>
          <span className="text-[11px] text-slate-500">Assinatura / Carimbo</span>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 flex justify-between">
        <span>Documento processado por computador · Sistema de Gestão OSDEL</span>
        <span>Impresso em: {dateTime(new Date().toISOString())}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// 2. COMPONENTE: TERMO OFICIAL DE ENCERRAMENTO MENSAL
// ---------------------------------------------------------------------------------------
function MonthlyClosureDocument({ closure, settings }: { closure: MonthlyClosure; settings?: any }) {
  const company = settings?.companyName || 'OSDEL TECNOLOGIA LDA';

  return (
    <div className="space-y-6 text-xs text-slate-900 font-sans">
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-black text-slate-900">{company}</h1>
          <p className="text-[11px] text-slate-600 mt-0.5">
            NIF: 5417089214 · Luanda, Angola · Departamento Financeiro & Contabilístico
          </p>
        </div>
        <div className="text-right">
          <div className="rounded bg-slate-100 px-3 py-1 font-mono text-xs font-black border border-slate-300">
            {closure.auditCertificate?.certificateNumber || closure.code}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">Exercício: <strong>{closure.monthName}</strong></div>
        </div>
      </div>

      <div className="text-center py-1">
        <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
          TERMO OFICIAL DE ENCERRAMENTO CONTABILÍSTICO MENSAL
        </h2>
        <p className="text-[11px] text-slate-500">
          Fecho consolidado e certificado nos termos das normas financeiras de Angola
        </p>
      </div>

      {/* Demonstrativo Resumido */}
      <div className="border border-slate-300 rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px] uppercase">
              <th className="p-2.5">Rubrica Orçamental / Contabilística</th>
              <th className="p-2.5 text-right">Montante (AOA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr className="bg-emerald-50/50">
              <td className="p-2.5 font-bold text-emerald-950">(+) RECEITA BRUTA OPERACIONAL</td>
              <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                +{kz(closure.financials.revenueCollected || closure.financials.invoicedTotal)}
              </td>
            </tr>
            <tr className="bg-rose-50/50">
              <td className="p-2.5 font-bold text-rose-950">(-) CUSTOS OPERACIONAIS (OPEX)</td>
              <td className="p-2.5 text-right font-mono font-bold text-rose-800">
                -{kz(closure.financials.operatingExpenses)}
              </td>
            </tr>
            <tr className="bg-amber-50/50">
              <td className="p-2.5 font-bold text-amber-950">(-) FOLHA SALARIAL LÍQUIDA</td>
              <td className="p-2.5 text-right font-mono font-bold text-amber-900">
                -{kz(closure.financials.payrollNetPaid)}
              </td>
            </tr>
            <tr className="bg-slate-900 text-white font-bold">
              <td className="p-3 text-sm font-black">(=) RESULTADO LÍQUIDO DO MÊS</td>
              <td className="p-3 text-right font-mono text-sm font-black text-emerald-400">
                {kz(closure.financials.netResult)} ({closure.financials.profitMargin.toFixed(1)}%)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-3 gap-3 border border-slate-300 rounded-lg p-3 bg-slate-50 text-[11px]">
        <div>
          <span className="text-slate-500 block">Assinantes no Fecho:</span>
          <b className="font-mono text-xs">{closure.clientMetrics.activeClientsEnd} Activos</b>
        </div>
        <div>
          <span className="text-slate-500 block">Eficiência de Cobrança:</span>
          <b className="font-mono text-xs">{closure.financials.collectionRate.toFixed(1)}%</b>
        </div>
        <div>
          <span className="text-slate-500 block">Ordens Resolvidas:</span>
          <b className="font-mono text-xs">{closure.technicalMetrics.serviceOrdersResolved} Intervenções</b>
        </div>
      </div>

      {/* Notes */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        <b className="block text-slate-800 text-[11px] uppercase font-bold">Parecer da Auditoria:</b>
        <p className="text-slate-600 mt-1">
          {closure.validationNotes || 'Fecho mensal conferido e homologado pela Direcção Geral e Contabilidade.'}
        </p>
      </div>

      {/* 3 Signatures */}
      <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <div className="h-10 border-b border-dashed border-slate-400" />
          <b className="mt-1 block text-slate-900">Albert (deezy)</b>
          <span className="text-[10px] text-slate-500">Director Geral</span>
        </div>
        <div>
          <div className="h-10 border-b border-dashed border-slate-400" />
          <b className="mt-1 block text-slate-900">Dr. Manuel Domingos</b>
          <span className="text-[10px] text-slate-500">Contabilista Certificado</span>
        </div>
        <div>
          <div className="h-10 border-b border-dashed border-slate-400" />
          <b className="mt-1 block text-slate-900">Maria Teresa dos Santos</b>
          <span className="text-[10px] text-slate-500">Responsável de Caixa</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// 3. COMPONENTE: FECHO DE CAIXA E TURNO DIÁRIO
// ---------------------------------------------------------------------------------------
function DailyClosureDocument({ closure, settings }: { closure: any; settings?: any }) {
  const company = settings?.companyName || 'OSDEL TECNOLOGIA LDA';

  return (
    <div className="space-y-6 text-xs text-slate-900 font-sans">
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-black text-slate-900">{company}</h1>
          <p className="text-[11px] text-slate-600 mt-0.5">Folha Diária de Conferência e Fecho de Caixa</p>
        </div>
        <div className="text-right">
          <div className="rounded bg-slate-100 px-3 py-1 font-mono text-xs font-black border border-slate-300">
            {closure.closureNumber || `FC-${String(closure.id).padStart(5, '0')}`}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">Data: <strong>{date(closure.closureDate || closure.createdAt)}</strong></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border p-4 rounded-lg bg-slate-50">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Operador Responsável:</span>
          <b className="text-xs">@{closure.operator || 'deezy'}</b>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Turno:</span>
          <b className="text-xs uppercase">{closure.shift || 'Integral'}</b>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Fundo de Abertura:</span>
          <span className="font-mono font-bold">{kz(closure.openingBalance || 0)}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Saldo em Dinheiro Contado:</span>
          <span className="font-mono font-bold">{kz(closure.countedBalance || closure.closingBalance || 0)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-300 p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span>(+) Entradas do Turno:</span>
          <span className="font-mono font-bold text-emerald-700">+{kz(closure.totalIncome || 0)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>(-) Saídas / Despesas do Turno:</span>
          <span className="font-mono font-bold text-rose-700">-{kz(closure.totalExpenses || 0)}</span>
        </div>
        <div className="flex justify-between text-xs pt-2 border-t font-bold">
          <span>Saldo Teórico Calculado:</span>
          <span className="font-mono">{kz(closure.closingBalance || 0)}</span>
        </div>
        {Number(closure.difference || 0) !== 0 && (
          <div className="flex justify-between text-xs pt-1 font-bold text-rose-600">
            <span>Diferença / Quebra de Caixa:</span>
            <span className="font-mono">{kz(closure.difference)}</span>
          </div>
        )}
      </div>

      {closure.notes && (
        <div className="p-3 bg-slate-50 border rounded-lg text-xs">
          <b className="block text-[10px] uppercase font-bold text-slate-500">Observações:</b>
          <p className="text-slate-700 mt-1">{closure.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
        <div>
          <div className="border-t border-slate-400 pt-2" />
          <b className="block">Assinatura do Operador</b>
          <span className="text-[10px] text-slate-500">@{closure.operator}</span>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-2" />
          <b className="block">Homologação da Direcção</b>
          <span className="text-[10px] text-slate-500">
            {closure.validatedBy ? `Validado por @${closure.validatedBy}` : 'Pendente de validação'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// 4. COMPONENTE: ORDEM DE SERVIÇO TÉCNICA
// ---------------------------------------------------------------------------------------
function ServiceOrderDocument({ order, client, settings }: { order: any; client?: any; settings?: any }) {
  const company = settings?.companyName || 'OSDEL TECNOLOGIA LDA';

  return (
    <div className="space-y-6 text-xs text-slate-900 font-sans">
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-black text-slate-900">{company}</h1>
          <p className="text-[11px] text-slate-600 mt-0.5">Guia de Intervenção Técnica no Cliente</p>
        </div>
        <div className="text-right">
          <div className="rounded bg-slate-100 px-3 py-1 font-mono text-xs font-black border border-slate-300">
            {order.orderNumber || `OS-${String(order.id).padStart(5, '0')}`}
          </div>
          <div className="mt-1 text-[11px] text-slate-600">Data: <strong>{date(order.scheduledDate || order.createdAt)}</strong></div>
        </div>
      </div>

      <div className="border p-4 rounded-lg bg-slate-50 space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-500">Cliente:</span>
          <b className="text-slate-900">{client?.fullName || '—'}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Telefone:</span>
          <b className="text-slate-900">{client?.phone || '—'}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Morada / Bairro:</span>
          <span className="text-slate-900">{client?.address || '—'} ({client?.neighborhood || '—'})</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tipo de Intervenção:</span>
          <b className="uppercase text-slate-900">{order.type}</b>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Técnico / Piquete:</span>
          <span className="font-semibold text-slate-900">{order.technician || 'Piquete Central'}</span>
        </div>
      </div>

      <div>
        <span className="text-[10px] uppercase font-bold text-slate-500 block">Descrição do Problema / Pedido:</span>
        <div className="mt-1 rounded-md bg-white p-3 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
          {order.description || 'Sem descrição registada.'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
        <div>
          <div className="border-t border-slate-400 pt-2" />
          <b className="block">O Técnico Responsável</b>
          <span className="text-[10px] text-slate-500">Assinatura</span>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-2" />
          <b className="block">O Cliente (Conformidade)</b>
          <span className="text-[10px] text-slate-500">Assinatura</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// HELPER: RESOLUÇÃO DINÂMICA DE VARIÁVEIS DA FACTURA CONFIGURADAS PELO ADMINISTRADOR
// ---------------------------------------------------------------------------------------
function resolveInvoiceVars(
  template: string | undefined,
  invoice: any,
  client: any,
  settings: any,
  fallback = ''
): string {
  if (!template) return fallback;
  const amount = Number(invoice?.amount || invoice?.monthlyFee || 4000);
  const penalty = Number(invoice?.penalty || 0);
  const total = Number(invoice?.total || (amount + penalty));
  const num = invoice?.invoiceNumber || invoice?.number || `FT-${String(invoice?.id || 1).padStart(5, '0')}`;
  const issueDate = invoice?.paidAt || invoice?.issuedAt || invoice?.createdAt || new Date().toISOString();
  const paymentMethod = invoice?.paymentMethod || invoice?.method || invoice?.payment_method || 'Multicaixa';
  const company = settings?.companyName || 'OSDEL TECNOLOGIA';
  const nif = settings?.companyNif || '5417089214';
  const operator = invoice?.operator || 'Caixa Central';
  const month = invoice?.paymentMonth || 'Período Corrente';
  const clientName = client?.fullName || invoice?.clientName || invoice?.client_name || 'Consumidor Final';
  const clientCode = client?.code || `CLI-${String(invoice?.clientId || invoice?.client_id || 1).padStart(5, '0')}`;

  return template
    .replace(/{CLIENTE}/g, clientName)
    .replace(/{CODIGO_CLIENTE}/g, clientCode)
    .replace(/{MES_REFERENCIA}/g, month)
    .replace(/{VALOR}/g, kz(amount))
    .replace(/{MULTA}/g, kz(penalty))
    .replace(/{TOTAL}/g, kz(total))
    .replace(/{FORMA_PAGAMENTO}/g, paymentMethod)
    .replace(/{NUMERO_FACTURA}/g, num)
    .replace(/{DATA}/g, date(issueDate))
    .replace(/{OPERADOR}/g, operator)
    .replace(/{EMPRESA}/g, company)
    .replace(/{NIF}/g, nif);
}

// ---------------------------------------------------------------------------------------
// 5. COMPONENTE: TALÃO TÉRMICO POS (80MM / 58MM) - IMPRESSORAS DE RECIBO
// ---------------------------------------------------------------------------------------
function ThermalInvoiceReceipt({
  invoice,
  client,
  settings,
}: {
  invoice: any;
  client?: any;
  settings?: any;
}) {
  const company = settings?.companyName || 'OSDEL TECNOLOGIA LDA';
  const subtitle = settings?.invoiceSubtitle || settings?.companySubtitle || 'TV COMUNITÁRIA & INTERNET FIBRA';
  const phone = settings?.companyPhone || '+244 923 000 000';
  const nif = settings?.companyNif || '5417089214';
  const address = settings?.companyAddress || 'Luanda, Angola';

  const amount = Number(invoice.amount || invoice.monthlyFee || 4000);
  const penalty = Number(invoice.penalty || 0);
  const total = Number(invoice.total || (amount + penalty));
  const num = invoice.invoiceNumber || invoice.number || `FT-${String(invoice.id || 1).padStart(5, '0')}`;
  const issueDate = invoice.paidAt || invoice.issuedAt || invoice.createdAt || new Date().toISOString();
  const dueDate = invoice.dueDate || invoice.due_date || invoice.paymentMonth || 'Dia 05';
  const paymentMethod = invoice.paymentMethod || invoice.method || invoice.payment_method || 'Multicaixa';
  const refCode = invoice.referenceCode || invoice.reference || invoice.reference_code || `MCX-${String(invoice.id || 1).padStart(6, '0')}`;
  const operator = invoice.operator || 'Caixa Central';

  const isVoid = invoice.status === 'anulada';
  const isPending = invoice.status === 'pendente' || invoice.documentType === 'proforma';

  // Título e enquadramento dinâmicos editados pelo administrador
  const docTitle = isVoid
    ? resolveInvoiceVars(settings?.invoiceVoidTitle, invoice, client, settings, '*** FACTURA ANULADA ***')
    : isPending
      ? resolveInvoiceVars(settings?.invoiceProformaTitle, invoice, client, settings, 'FACTURA PROFORMA')
      : resolveInvoiceVars(settings?.invoiceTitle, invoice, client, settings, 'FACTURA / RECIBO DE PAGAMENTO');

  const taxExemption = resolveInvoiceVars(
    settings?.invoiceTaxExemptionReason,
    invoice,
    client,
    settings,
    'Regime de Exclusão do IVA nos termos do Art. 12.º do CIVA'
  );

  const customFooter = resolveInvoiceVars(
    settings?.thermalFooterMessage,
    invoice,
    client,
    settings,
    'Obrigado pela sua preferência!\nGuarde este talão como comprovativo e garantia de sinal ligado.'
  );

  const warningText = settings?.thermalWarningText
    ? resolveInvoiceVars(settings.thermalWarningText, invoice, client, settings)
    : '';

  return (
    <div className="pos-receipt-paper mx-auto w-full max-w-[320px] bg-white p-3 font-mono text-[11px] leading-tight text-black print:max-w-none print:p-0">
      {/* Cabeçalho com Logótipo Oficial para Impressora Térmica */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        <div className="flex justify-center pb-1.5">
          <img
            src={getCompanyLogo(settings?.logoUrl) || OSDEL_LOGO_BASE64}
            alt="Logótipo OSDEL"
            className="h-14 w-14 object-contain mx-auto"
            style={{ filter: 'grayscale(100%) contrast(180%)' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = OSDEL_LOGO_BASE64;
            }}
          />
        </div>
        <h2 className="text-sm font-black uppercase tracking-wider">{company}</h2>
        <p className="text-[10px] font-bold text-slate-800 uppercase mt-0.5">{subtitle}</p>
        <p className="text-[9.5px] mt-0.5 font-bold">NIF: {nif}</p>
        <p className="text-[9px]">Tel: {phone}</p>
        <p className="text-[9px]">{address}</p>
      </div>

      {/* Identificação do Documento Customizável */}
      <div className="py-2 border-b border-dashed border-black text-center">
        <p className="text-xs font-black uppercase tracking-wider text-black">
          {docTitle}
        </p>
        <p className="text-sm font-black tracking-widest mt-0.5">{num}</p>
        <p className="text-[9px] mt-0.5">
          Data: <strong>{date(issueDate)}</strong> · Hora: {new Date(issueDate).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-[9px] text-slate-800">Vencimento: {dueDate}</p>
      </div>

      {/* Dados do Cliente / Assinante */}
      <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
        <p><b>ASSINANTE:</b> {client?.fullName || invoice.clientName || invoice.client_name || 'Consumidor Final'}</p>
        <p><b>CÓDIGO:</b> {client?.code || `CLI-${String(invoice.clientId || invoice.client_id || 1).padStart(5, '0')}`}</p>
        <p><b>NIF / BI:</b> {client?.documentNumber || client?.nif || 'Consumidor Final'}</p>
        <p><b>TEL:</b> {client?.phone || '—'}</p>
        {(client?.neighborhood || client?.address) && (
          <p><b>ZONA:</b> {client?.neighborhood || client?.address}</p>
        )}
        {client?.houseCode && <p><b>CASA / BLOCO:</b> {client.houseCode}</p>}
        {client?.pdoNumber && <p><b>CAIXA PDO:</b> {client.pdoNumber}</p>}
        {client?.onuNumber && <p><b>ONU SERIAL:</b> {client.onuNumber}</p>}
      </div>

      {/* Linha de Artigos / Serviços */}
      <div className="py-2 border-b border-dashed border-black">
        <div className="flex justify-between font-bold text-[10px] uppercase border-b border-black pb-1 mb-1">
          <span>DESCRIÇÃO</span>
          <span className="text-right">VALOR</span>
        </div>
        <div className="flex justify-between text-[10.5px]">
          <span className="truncate max-w-[200px]">
            {invoice.itemDescription || invoice.description || resolveInvoiceVars(settings?.invoiceDefaultItemDescription, invoice, client, settings, `Mensalidade (${invoice.paymentMonth || 'Corrente'})`)}
          </span>
          <span className="font-bold">{kz(amount)}</span>
        </div>
        {penalty > 0 && (
          <div className="flex justify-between mt-1 text-[10px]">
            <span>Multa por Regularização</span>
            <span className="font-bold">{kz(penalty)}</span>
          </div>
        )}
      </div>

      {/* Total Liquidado e Pagamento */}
      <div className="py-2.5 border-b-2 border-black text-right">
        <p className="text-[10px] uppercase font-bold text-slate-800">VALOR TOTAL LIQUIDADO:</p>
        <p className="text-2xl font-black">{kz(total)}</p>
        <p className="text-[9.5px] mt-0.5 font-bold uppercase">Forma: {paymentMethod}</p>
        <p className="text-[9px]">Ref: {refCode}</p>
        <p className="text-[9.5px] font-bold text-slate-900 mt-0.5">
          Estado: {isVoid ? 'ANULADA' : isPending ? 'PENDENTE' : 'LIQUIDADO / EM DIA'}
        </p>
      </div>

      {/* Enquadramento Fiscal Personalizado por Administrador */}
      <div className="py-1.5 border-b border-dashed border-black text-center text-[8.5px] text-slate-800 leading-tight">
        {taxExemption}
      </div>

      {/* Aviso de Corte / Suspensão (Se configurado) */}
      {warningText && (
        <div className="py-1.5 border-b border-dashed border-black text-center text-[8.5px] font-bold text-slate-900 leading-tight">
          ⚠ {warningText}
        </div>
      )}

      {/* Rodapé de Cortesia e Mensagem Customizada */}
      <div className="pt-2 text-center text-[9px] leading-tight text-slate-800 space-y-0.5 whitespace-pre-line">
        <p className="font-bold uppercase">{customFooter}</p>
        <p className="pt-1 font-mono text-[8px] text-slate-600">
          Operador: @{operator} · Gestão X Desktop
        </p>
        <p className="text-[8px] tracking-widest text-slate-500 mt-1">*** OBRIGADO / VOLTE SEMPRE ***</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// 6. COMPONENTE: FACTURA OFICIAL A4 (PADRÃO FISCAL CORPORATIVO CUSTOMIZÁVEL)
// ---------------------------------------------------------------------------------------
function A4InvoiceOfficial({
  invoice,
  client,
  settings,
}: {
  invoice: any;
  client?: any;
  settings?: any;
}) {
  const company = settings?.companyName || 'OSDEL TECNOLOGIA LDA';
  const subtitle = settings?.invoiceSubtitle || settings?.companySubtitle || 'TV COMUNITÁRIA & INTERNET FIBRA ÓPTICA';
  const phone = settings?.companyPhone || '+244 923 000 000';
  const email = settings?.companyEmail || 'geral@osdeltecnologia.ao';
  const nif = settings?.companyNif || '5417089214';
  const address = settings?.companyAddress || 'Rua 12, Bairro Golf I, Kilamba Kiaxi, Luanda';

  const amount = Number(invoice.amount || invoice.monthlyFee || 4000);
  const penalty = Number(invoice.penalty || 0);
  const total = Number(invoice.total || (amount + penalty));
  const num = invoice.invoiceNumber || invoice.number || `FT-${String(invoice.id || 1).padStart(5, '0')}`;
  const issueDate = invoice.paidAt || invoice.issuedAt || invoice.createdAt || new Date().toISOString();
  const dueDate = invoice.dueDate || invoice.due_date || invoice.paymentMonth || 'Dia 05';
  const paymentMethod = invoice.paymentMethod || invoice.method || invoice.payment_method || 'Multicaixa';
  const refCode = invoice.referenceCode || invoice.reference || invoice.reference_code || `MCX-${String(invoice.id || 1).padStart(6, '0')}`;
  const operator = invoice.operator || 'Caixa Central';

  const isVoid = invoice.status === 'anulada';
  const isPending = invoice.status === 'pendente' || invoice.documentType === 'proforma';

  const banks = settings?.bankAccounts || [
    { name: 'Banco BAI', iban: 'AO06.0040.0000.1234.5678.9012.3', account: '12345678/10/001', holder: company },
    { name: 'Banco BFA', iban: 'AO06.0006.0000.9876.5432.1098.7', account: '98765432/01/001', holder: company },
  ];

  // Textos customizados configurados pelo Administrador em Definições
  const docBadgeText = isVoid
    ? resolveInvoiceVars(settings?.invoiceVoidTitle, invoice, client, settings, 'FACTURA ANULADA')
    : isPending
      ? resolveInvoiceVars(settings?.invoiceProformaTitle, invoice, client, settings, 'FACTURA PROFORMA')
      : resolveInvoiceVars(settings?.invoiceTitle, invoice, client, settings, 'FACTURA / RECIBO OFICIAL');

  const taxExemption = resolveInvoiceVars(
    settings?.invoiceTaxExemptionReason,
    invoice,
    client,
    settings,
    'Regime de Exclusão do IVA nos termos do Artigo 12.º do Código do Imposto sobre o Valor Acrescentado (CIVA).'
  );

  const bankingNotes = resolveInvoiceVars(
    settings?.invoiceBankingNotes,
    invoice,
    client,
    settings,
    'Por favor, indique o número da factura ou código do assinante no descritivo da transferência bancária.'
  );

  const footerText = resolveInvoiceVars(
    settings?.invoiceFooter,
    invoice,
    client,
    settings,
    'Documento emitido pelo sistema de gestão da OSDEL TECNOLOGIA. Processado por computador. Válido com carimbo oficial.'
  );

  const stampTitle = settings?.invoiceStampTitle || company;
  const stampSubtitle = settings?.invoiceStampSubtitle || 'Carimbo & Chancela Digital';
  const stampBadge = settings?.invoiceStampBadge || (isVoid ? 'ANULADO' : isPending ? 'PROFORMA' : 'AUTENTICADO');

  return (
    <div className="a4-invoice-paper space-y-6 text-xs text-slate-900 font-sans">
      {/* Cabeçalho Oficial com Logótipo */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-[#0b4a8a] pb-6">
        <div className="flex items-center gap-4">
          <img
            src={getCompanyLogo(settings?.logoUrl) || OSDEL_LOGO_BASE64}
            alt="Logótipo OSDEL"
            className="h-20 w-20 rounded-2xl border-2 border-[#0b4a8a] object-contain p-1.5 bg-white shadow-sm shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = OSDEL_LOGO_BASE64;
            }}
          />
          <div>
            <h1 className="font-serif text-2xl font-black tracking-tight text-[#0b4a8a]">{company}</h1>
            <p className="mt-0.5 text-xs font-bold text-[#1e90ff] uppercase">{subtitle}</p>
            <p className="mt-1.5 text-[11px] leading-4 text-slate-600">
              NIF: <strong>{nif}</strong> · Tel: {phone} · Email: {email}
              <br />
              {address}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-block rounded px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-white ${
            isVoid ? 'bg-rose-600' : isPending ? 'bg-amber-600' : 'bg-[#0b4a8a]'
          }`}>
            {docBadgeText}
          </span>
          <p className="mt-2 font-mono text-xl font-black text-[#0b4a8a]">{num}</p>
          <p className="mt-1 text-xs text-slate-600">
            Data de Emissão: <strong>{date(issueDate)}</strong>
          </p>
          <p className="text-[11px] text-slate-500">Vencimento: {dueDate}</p>
        </div>
      </div>

      {/* Cards de Identificação: Cliente & Transacção */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-300 bg-slate-50/60 p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dados do Assinante / Cliente</p>
          <p className="text-sm font-black text-[#0b4a8a]">
            {client?.fullName || invoice.clientName || invoice.client_name || 'Consumidor Final'}
          </p>
          <p className="text-xs text-slate-700">
            <b>Código:</b> {client?.code || `CLI-${String(invoice.clientId || invoice.client_id || 1).padStart(5, '0')}`} · <b>NIF/BI:</b> {client?.documentNumber || client?.nif || 'Consumidor Final'}
          </p>
          <p className="text-xs text-slate-700">
            <b>Telefone:</b> {client?.phone || 'Sem telefone associado'}
          </p>
          <p className="text-xs text-slate-700">
            <b>Morada:</b> {client?.address || '—'} {client?.neighborhood ? `(${client.neighborhood})` : ''}
          </p>
          {(client?.houseCode || client?.pdoNumber || client?.onuNumber) && (
            <div className="pt-1 text-[11px] text-slate-600 flex flex-wrap gap-2">
              {client?.houseCode && <span>Casa: <b>{client.houseCode}</b></span>}
              {client?.pdoNumber && <span>PDO: <b>{client.pdoNumber}</b></span>}
              {client?.onuNumber && <span>ONU: <b>{client.onuNumber}</b></span>}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#0b4a8a]">Detalhes da Liquidação</p>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Período de Referência:</span>
            <b className="font-mono">{invoice.paymentMonth || 'Período Corrente'}</b>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Forma de Pagamento:</span>
            <b className="capitalize">{paymentMethod}</b>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Código de Referência:</span>
            <b className="font-mono">{refCode}</b>
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-blue-200">
            <span className="text-slate-600">Estado do Documento:</span>
            <b className={isVoid ? 'text-rose-600' : isPending ? 'text-amber-700' : 'text-emerald-700 font-black'}>
              {isVoid ? 'ANULADO' : isPending ? 'PENDENTE DE PAGAMENTO' : 'LIQUIDADO / REGULARIZADO'}
            </b>
          </div>
        </div>
      </div>

      {/* Tabela de Artigos e Serviços */}
      <div className="overflow-hidden rounded-xl border border-slate-300">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[10px] uppercase tracking-wider">
              <th className="p-3">Descrição do Serviço / Artigo</th>
              <th className="p-3 text-center">Qtd</th>
              <th className="p-3 text-right">Preço Unit.</th>
              <th className="p-3 text-right">Taxa IVA</th>
              <th className="p-3 text-right">Total (AOA)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="p-3.5">
                <b className="block text-sm text-[#0b4a8a]">
                  {invoice.itemDescription || invoice.description || resolveInvoiceVars(settings?.invoiceDefaultItemDescription, invoice, client, settings, `Mensalidade de Serviço OSDEL (${invoice.paymentMonth || 'Corrente'})`)}
                </b>
                <span className="text-[11px] text-slate-600">
                  {invoice.notes || resolveInvoiceVars(settings?.invoiceDefaultItemNotes, invoice, client, settings, 'Fornecimento e manutenção regular de sinal com garantia de estabilidade.')}
                </span>
              </td>
              <td className="p-3.5 text-center font-mono font-bold">1</td>
              <td className="p-3.5 text-right font-mono">{kz(amount)}</td>
              <td className="p-3.5 text-right text-[11px] text-slate-500">Isento*</td>
              <td className="p-3.5 text-right font-mono font-bold text-slate-900">{kz(amount)}</td>
            </tr>
            {penalty > 0 && (
              <tr>
                <td className="p-3">
                  <b className="text-slate-900">Multa por Regularização Fora de Prazo</b>
                  <span className="block text-[11px] text-slate-500">Acordo de vencimento após o dia de referência</span>
                </td>
                <td className="p-3 text-center font-mono font-bold">1</td>
                <td className="p-3 text-right font-mono">{kz(penalty)}</td>
                <td className="p-3 text-right text-[11px] text-slate-500">Isento*</td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">{kz(penalty)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Caixa de Totais e Enquadramento Fiscal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600 space-y-1">
          <p className="font-bold text-slate-900 uppercase text-[10px]">Enquadramento Fiscal:</p>
          <p className="leading-relaxed">
            * {taxExemption}
          </p>
          <p className="text-[10px] text-slate-500 pt-1">
            Operador Responsável: <b>@{operator}</b>
          </p>
        </div>

        <div className="rounded-xl bg-[#0b4a8a] p-5 text-white text-right space-y-1 ml-auto w-full sm:w-[280px]">
          <div className="flex justify-between text-xs opacity-80">
            <span>Subtotal:</span>
            <span className="font-mono">{kz(amount)}</span>
          </div>
          {penalty > 0 && (
            <div className="flex justify-between text-xs opacity-80">
              <span>Multa:</span>
              <span className="font-mono">{kz(penalty)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs opacity-90 pt-1.5 border-t border-white/20 font-bold">
            <span>Total Liquidado:</span>
            <span className="font-mono">{kz(total)}</span>
          </div>
          <div className="text-2xl font-black pt-1">{kz(total)}</div>
        </div>
      </div>

      {/* Coordenadas Bancárias Oficiais e Notas */}
      <div className="rounded-xl border border-slate-300 bg-slate-50/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#0b4a8a] flex items-center gap-1.5">
            <Landmark size={14} /> Coordenadas Bancárias Oficiais para Pagamento
          </p>
        </div>

        {bankingNotes && (
          <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
            ℹ {bankingNotes}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {banks.map((b: any, idx: number) => (
            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
              <b className="text-[#0b4a8a] block text-xs">{b.name}</b>
              <span className="text-[11px] text-slate-600 block">Titular: {b.holder || company}</span>
              <span className="font-mono text-[10.5px] text-slate-800 block mt-0.5 select-all">IBAN: {b.iban}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Assinaturas & Carimbo Digital Oficial */}
      <div className="grid grid-cols-2 gap-8 pt-6 items-end text-center text-xs">
        <div>
          <div className="border-t border-slate-400 pt-2" />
          <b className="block text-slate-900">O Assinante / Destinatário</b>
          <span className="text-[11px] text-slate-500">{client?.fullName || 'Assinatura legível'}</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="border-2 border-[#0b4a8a] rounded-xl px-4 py-2 text-center bg-blue-50/60 max-w-[220px] shadow-xs">
            <p className="text-[10px] font-black uppercase text-[#0b4a8a] tracking-wider">{stampTitle}</p>
            <p className="text-[8.5px] text-slate-600">{stampSubtitle}</p>
            <span className="inline-block mt-1 text-[8.5px] font-black px-2 py-0.5 rounded bg-[#0b4a8a] text-white">
              {stampBadge}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Carimbo e Assinatura Autorizada</span>
        </div>
      </div>

      {/* Rodapé Legal Oficial Customizável */}
      <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
        <span>{footerText}</span>
        <span className="shrink-0 text-slate-400 font-mono">Impresso em: {dateTime(new Date().toISOString())}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// 7. COMPONENTE: CONTRATO DE ADESÃO OFICIAL (PERSONALIZADO POR ADMINISTRADOR)
// ---------------------------------------------------------------------------------------
function OfficialContractDocument({
  client,
  settings,
}: {
  client: any;
  settings?: any;
}) {
  const company = settings?.companyName || 'OSDEL TECNOLOGIA';
  const subtitle = settings?.companySubtitle || 'TV COMUNITÁRIA & INTERNET FIBRA';
  const nif = settings?.companyNif || '5600857127';
  const phone = settings?.companyPhone || '+244 923 000 000';
  const address = settings?.companyAddress || 'Luanda, Angola';

  const monthlyPrice = Number(client?.monthlyFee || settings?.tvMonthlyPrice || 4000);
  const dueDay = settings?.paymentDueDay || 5;

  const resolveContractVars = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/{MENSALIDADE}/g, kz(monthlyPrice))
      .replace(/{DIA_VENCIMENTO}/g, String(dueDay))
      .replace(/{MULTA_ATRASO}/g, kz(settings?.latePenalty || 1000))
      .replace(/{VALOR_INSTALACAO}/g, kz(settings?.connectionFee || 15000))
      .replace(/{MESES_SUSPENSAO}/g, String(settings?.suspensionAfterMonths || 3))
      .replace(/{TAXA_RENOVACAO}/g, kz(settings?.renewalFee || 10000))
      .replace(/{TAXA_RELIGACAO}/g, kz(settings?.reconnectionFee || 2500))
      .replace(/{HORARIO_SUPORTE}/g, settings?.supportHours || 'Segunda a sexta, 09h00–15h00 · Sábado, 08h00–11h00.')
      .replace(/{NOME_CLIENTE}/g, client?.fullName || '—')
      .replace(/{CODIGO_CLIENTE}/g, client?.code || '—')
      .replace(/{BI_CLIENTE}/g, client?.documentNumber || '—')
      .replace(/{TELEFONE_CLIENTE}/g, client?.phone || '—')
      .replace(/{ENDERECO_CLIENTE}/g, client?.address || '—')
      .replace(/{SERVICO}/g, client?.serviceType === 'fiber' ? 'Internet Fibra Óptica FTTH' : 'TV por Cabo Comunitária')
      .replace(/{EMPRESA}/g, company)
      .replace(/{NIF}/g, nif);
  };

  // Cláusulas configuradas pelo administrador em Definições
  const configuredClauses = Array.isArray(settings?.contractClauses) && settings.contractClauses.length > 0
    ? settings.contractClauses.map((c: any) => ({
        title: Array.isArray(c) ? c[0] : c.title,
        text: resolveContractVars(Array.isArray(c) ? c[1] : c.text),
      }))
    : [
        { title: 'Adesão', text: 'Para aderir ao serviço é necessária a cópia do bilhete de identidade e a presença de um representante da família maior de 18 anos.' },
        { title: 'Custo e instalação', text: `A instalação tem o custo de ${kz(settings?.connectionFee || 15000)}. A OSDEL disponibiliza ${settings?.cableIncludedMeters || 25} metros de cabo RG6/Drop incluídos.` },
        { title: 'Prazo de instalação', text: `A instalação será realizada até ${settings?.installationWindowHours || 48} horas após a assinatura do contrato.` },
        { title: 'Mensalidade', text: `A mensalidade é pré-paga no valor de ${kz(monthlyPrice)}. O pagamento decorre do dia 01 ao dia ${dueDay} de cada mês.` },
        { title: 'Multa e suspensão', text: `Após o prazo aplica-se uma multa de ${kz(settings?.latePenalty || 1000)}. Com 3 meses sem pagamento, o sinal é suspenso.` },
        { title: 'Regras de utilização', text: 'O contrato corresponde a uma única residência, sendo proibida a partilha do sinal com terceiros.' },
        { title: 'Suporte', text: settings?.supportHours || 'Segunda a sexta, 09h00–15h00 · Sábado, 08h00–11h00.' },
      ];

  const contractNum = `CTR-${String(client?.id || 1).padStart(5, '0')}`;

  return (
    <div className="a4-invoice-paper space-y-6 text-xs text-slate-900 font-sans p-8 sm:p-12">
      {/* Cabeçalho Oficial do Contrato */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-[#0b4a8a] pb-6">
        <div className="flex items-center gap-4">
          <img
            src={getCompanyLogo(settings?.logoUrl)}
            alt="Logo OSDEL"
            className="h-20 w-20 rounded-2xl border-2 border-[#0b4a8a] object-contain p-1.5 bg-white shadow-sm"
          />
          <div>
            <h1 className="font-serif text-2xl font-black text-[#0b4a8a]">{company}</h1>
            <p className="mt-0.5 text-xs font-bold text-[#1e90ff] uppercase">{subtitle}</p>
            <p className="mt-1.5 text-[11px] leading-4 text-slate-600">
              NIF: <strong>{nif}</strong> · Tel: {phone}
              <br />
              {address}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block rounded px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-white bg-[#0b4a8a]">
            CONTRATO DE ADESÃO
          </span>
          <p className="mt-2 font-mono text-xl font-black text-[#0b4a8a]">{contractNum}</p>
          <p className="mt-1 text-xs text-slate-600">Data: {date(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Preâmbulo / Introdução Configurado */}
      <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 text-xs leading-relaxed text-slate-700">
        {resolveContractVars(settings?.contractIntro || 'A TV comunitária e Internet fibra Osdel é uma rede voltada à comunidade, com informação, entretenimento, actualidade e conectividade de alta velocidade.')}
      </div>

      {/* Título Oficial do Contrato */}
      <h2 className="text-center text-lg font-black uppercase tracking-wider text-[#0b4a8a]">
        {settings?.contractTitle || 'Termos de adesão de contrato'}
      </h2>

      {/* Identificação das Partes */}
      <div className="grid gap-4 rounded-xl border border-slate-300 bg-slate-50/50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Titular do Contrato (Assinante)</p>
          <p className="mt-1 text-sm font-black text-slate-900">{client?.fullName || '—'}</p>
          <p className="mt-0.5 text-xs text-slate-600">Código: <b>{client?.code || '—'}</b> · BI: {client?.documentNumber || 'BI não registado'}</p>
          <p className="text-xs text-slate-600">Tel: {client?.phone || 'Sem telefone'} · Morada: {client?.address || '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Serviço Contratado & Condições</p>
          <p className="mt-1 text-sm font-black text-[#0b4a8a]">
            {client?.serviceType === 'fiber' ? 'Internet Fibra Óptica FTTH' : 'TV por Cabo Comunitária'}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Mensalidade: <b>{kz(monthlyPrice)}</b> · Vencimento: todo dia <b>{dueDay}</b>
          </p>
          {client?.pdoNumber && <p className="text-xs text-slate-600">Porta PDO / Caixa: {client.pdoNumber}</p>}
        </div>
      </div>

      {/* Texto de Aceitação */}
      <p className="text-xs font-bold text-slate-900">
        {settings?.contractAcceptanceText || 'Ao assinar, as partes confirmam que leram e aceitam as condições abaixo:'}
      </p>

      {/* Cláusulas Legais Numeradas */}
      <ol className="space-y-3 pl-4 text-xs leading-relaxed text-slate-700 list-decimal">
        {configuredClauses.map((clause: any, index: number) => (
          <li key={index} className="pl-1">
            <strong className="text-[#0b4a8a]">{clause.title}:</strong> {clause.text}
          </li>
        ))}
      </ol>

      {/* Texto de Fecho do Contrato */}
      <p className="text-xs leading-relaxed text-slate-700 pt-2 border-t border-slate-200">
        {settings?.contractClosingText || 'E por estarem de pleno acordo com os termos do contrato, as partes assinam o presente instrumento em duas vias de igual teor e valor.'}
      </p>

      {/* Assinaturas Oficiais */}
      <div className="grid grid-cols-2 gap-8 pt-10 text-center text-xs">
        <div>
          <div className="border-t border-slate-400 pt-2" />
          <b className="block text-slate-900">Assinatura do Cliente / Assinante</b>
          <span className="text-[11px] text-slate-500">{client?.fullName || 'Nome do cliente'}</span>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-2" />
          <b className="block text-slate-900">Pela Direcção da {company}</b>
          <span className="text-[11px] text-slate-500">Carimbo e Assinatura Oficial</span>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400 pt-6">
        Documento contratual registado no sistema OSDEL TECNOLOGIA em {date(new Date().toISOString())}
      </p>
    </div>
  );
}
