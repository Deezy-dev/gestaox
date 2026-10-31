import {
  CalendarClock,
  Coins,
  FileSpreadsheet,
  Landmark,
  ShieldAlert,
  Percent,
  Handshake,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { Field, Input, Button, kz } from '@/components/shared-ui';
import { BankAccountsManager } from '@/components/bank-accounts-manager';

interface BillingRulesTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
}

export function BillingRulesTab({ form, set, isAdmin }: BillingRulesTabProps) {
  return (
    <div className="space-y-7">
      {/* 1. PRAZOS, VENCIMENTOS E TOLERÂNCIA */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="eyebrow">Ciclo de Facturação</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Prazos de Vencimento e Tolerância de Corte</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Dia Padrão de Vencimento Mensal" hint="Dia do mês (ex.: dia 5 de cada mês)">
            <Input
              type="number"
              min="1"
              max="28"
              value={form.paymentDueDay ?? 5}
              onChange={(e) => set('paymentDueDay', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Dias de Tolerância Após Vencimento" hint="Prazo de carência antes do corte de sinal">
            <Input
              type="number"
              min="0"
              max="30"
              value={form.toleranceDays ?? 3}
              onChange={(e) => set('toleranceDays', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Multa Fixa por Atraso (Kz)" hint="Aplicada após expirar a tolerância">
            <Input
              type="number"
              min="0"
              value={form.latePenalty ?? 1000}
              onChange={(e) => set('latePenalty', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Meses para Suspensão Definitiva" hint="Recolha de cabo e corte de drop">
            <Input
              type="number"
              min="1"
              max="12"
              value={form.suspensionAfterMonths ?? 3}
              onChange={(e) => set('suspensionAfterMonths', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>
        </div>
      </section>

      {/* 2. TAXAS TÉCNICAS E ADMINISTRATIVAS */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Coins size={20} />
          </div>
          <div>
            <p className="eyebrow">Taxas e Encargos</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Taxas Técnicas e Administrativas</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Taxa de Religação pós-corte (Kz)" hint="Cobrada para restabelecer o sinal cortado">
            <Input
              type="number"
              min="0"
              value={form.reconnectionFee ?? 2500}
              onChange={(e) => set('reconnectionFee', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Taxa de Transferência de Titular (Kz)" hint="Mudança contratual de cliente">
            <Input
              type="number"
              min="0"
              value={form.transferFee ?? 3000}
              onChange={(e) => set('transferFee', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Taxa de Renovação Anual (Kz)" hint="Renovação do contrato de serviço">
            <Input
              type="number"
              min="0"
              value={form.renewalFee ?? 10000}
              onChange={(e) => set('renewalFee', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Taxa de Urgência Técnica (Kz)" hint="Instalação / Reparação no mesmo dia">
            <Input
              type="number"
              min="0"
              value={form.urgentInstallationFee ?? 2000}
              onChange={(e) => set('urgentInstallationFee', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>
        </div>
      </section>

      {/* 3. POLÍTICA DE ACORDOS DE PAGAMENTO & PARCELAMENTO DE DÍVIDAS */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
            <Handshake size={20} />
          </div>
          <div>
            <p className="eyebrow">Recuperação de Crédito</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Política de Acordos de Pagamento e Parcelamento</h2>
          </div>
        </div>

        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Parâmetros utilizados pelos operadores de caixa para negociação e formalização de acordos com clientes com mensalidades em atraso.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Entrada Mínima Obrigatória (%)" hint="Percentual mínimo pago no ato do acordo">
            <div className="relative">
              <Input
                type="number"
                min="10"
                max="80"
                value={form.minInitialPaymentPercentage ?? 30}
                onChange={(e) => set('minInitialPaymentPercentage', Number(e.target.value))}
                disabled={!isAdmin}
                className="pr-8"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
            </div>
          </Field>

          <Field label="Número Máximo de Prestações" hint="Prestações mensais permitidas no parcelamento">
            <Input
              type="number"
              min="1"
              max="12"
              value={form.maxInstallments ?? 4}
              onChange={(e) => set('maxInstallments', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Dias de Tolerância de Parcela" hint="Dias para cancelar acordo se atrasar parcela">
            <Input
              type="number"
              min="1"
              max="10"
              value={form.autoCancelGraceDays ?? 3}
              onChange={(e) => set('autoCancelGraceDays', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <div className="flex flex-col justify-center pt-2">
            <label className="flex items-center gap-2.5 text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer">
              <input
                type="checkbox"
                checked={form.provisionalReconnectionAllowed ?? true}
                onChange={(e) => set('provisionalReconnectionAllowed', e.target.checked)}
                disabled={!isAdmin}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              Religação Imediata ao Pagar Entrada
            </label>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] ml-6.5 mt-1">
              Restabelece o sinal do cliente logo após o registo do pagamento inicial da entrada.
            </p>
          </div>
        </div>
      </section>

      {/* 4. POLÍTICA DE DESCONTOS E FIDELIZAÇÃO */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Percent size={20} />
          </div>
          <div>
            <p className="eyebrow">Fidelização Comunitária</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Descontos Comerciais e Promoções</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field label="Desconto para Pagamento Anual (%)" hint="Desconto concedido se o cliente pagar 12 meses adiantados">
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="50"
                value={form.annualDiscountPercentage ?? 10}
                onChange={(e) => set('annualDiscountPercentage', Number(e.target.value))}
                disabled={!isAdmin}
                className="pr-8"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
            </div>
          </Field>

          <Field label="Desconto para Pagamento Semestral (%)" hint="Desconto para 6 meses adiantados">
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="30"
                value={form.semiannualDiscountPercentage ?? 5}
                onChange={(e) => set('semiannualDiscountPercentage', Number(e.target.value))}
                disabled={!isAdmin}
                className="pr-8"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
            </div>
          </Field>

          <Field label="Bónus por Indicação de Vizinho (Kz)" hint="Crédito abatido na mensalidade ao indicar novo aderente">
            <Input
              type="number"
              min="0"
              value={form.neighborReferralDiscountKz ?? 1000}
              onChange={(e) => set('neighborReferralDiscountKz', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>
        </div>
      </section>

      {/* 5. COORDENADAS BANCÁRIAS DA EMPRESA */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
            <Landmark size={20} />
          </div>
          <div>
            <p className="eyebrow">Canais de Liquidação</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Contas Bancárias Oficiais para Pagamento</h2>
          </div>
        </div>

        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Estas contas e IBANs são impressos automaticamente no rodapé de facturas, recibos e enviadas via SMS/WhatsApp para os clientes.
        </p>

        <div className="mt-6">
          <BankAccountsManager
            accounts={form.bankAccounts || []}
            onChange={(accounts) => set('bankAccounts', accounts)}
            defaultHolderName={form.companyName || 'OSDEL TECNOLOGIA'}
            isCompany={true}
            readOnly={!isAdmin}
          />
        </div>
      </section>
    </div>
  );
}
