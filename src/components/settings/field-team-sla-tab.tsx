import {
  Wrench,
  Clock,
  Coins,
  ClipboardCheck,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import { Field, Input } from '@/components/shared-ui';

interface FieldTeamSlaTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
}

export function FieldTeamSlaTab({ form, set, isAdmin }: FieldTeamSlaTabProps) {
  return (
    <div className="space-y-7">
      {/* 1. SLAS DE ATENDIMENTO E REPARAÇÃO */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Clock size={20} />
          </div>
          <div>
            <p className="eyebrow">Prazos de Compromisso (SLA)</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Prazos de Atendimento e Reparação Técnica</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Janela Padrão de Instalação (Horas)" hint="Prazo máximo para ligar novo cliente">
            <Input
              type="number"
              min="1"
              max="168"
              value={form.installationWindowHours ?? 48}
              onChange={(e) => set('installationWindowHours', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Reposição de Avaria Individual (Horas)" hint="Prazo máximo para resolver avaria de cliente">
            <Input
              type="number"
              min="1"
              max="96"
              value={form.serviceRecoveryHours ?? 72}
              onChange={(e) => set('serviceRecoveryHours', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Resposta de Emergência de Tronco (Horas)" hint="Corte de backbone / rompimento de fibra">
            <Input
              type="number"
              min="1"
              max="24"
              value={form.emergencyResponseHours ?? 2}
              onChange={(e) => set('emergencyResponseHours', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Garantia Técnica de Campo (Dias)" hint="Garantia do serviço após a instalação">
            <Input
              type="number"
              min="1"
              max="90"
              value={form.fieldWarrantyDays ?? 30}
              onChange={(e) => set('fieldWarrantyDays', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Horário Oficial de Atendimento e Piquete de Campo">
            <Input
              value={form.supportHours || 'Segunda a sexta, 09h00–15h00 · Sábado, 08h00–11h00 · Piquete 24/7'}
              onChange={(e) => set('supportHours', e.target.value)}
              disabled={!isAdmin}
              placeholder="Segunda a sexta, 09h00–15h00..."
            />
          </Field>
        </div>
      </section>

      {/* 2. INCENTIVOS E BONIFICAÇÕES DA EQUIPA DE CAMPO */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Coins size={20} />
          </div>
          <div>
            <p className="eyebrow">Remuneração Variável</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Subsídios e Bonificações Técnicas de Campo</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field label="Subsídio por Nova Ligação Concluída (Kz)" hint="Atribuído à equipa por instalação com sinal aprovado">
            <Input
              type="number"
              min="0"
              value={form.installationAllowanceKz ?? 2500}
              onChange={(e) => set('installationAllowanceKz', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Bónus por Recuperação de Cliente Cortado (Kz)" hint="Religação de cliente em cobrança com sucesso">
            <Input
              type="number"
              min="0"
              value={form.recoveryBonusKz ?? 1000}
              onChange={(e) => set('recoveryBonusKz', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Limite Máximo de Ordens por Piquete / Dia" hint="Evita sobrecarga e garante qualidade da conectorização">
            <Input
              type="number"
              min="1"
              max="20"
              value={form.maxDailyOrdersPerTeam ?? 6}
              onChange={(e) => set('maxDailyOrdersPerTeam', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>
        </div>
      </section>

      {/* 3. CHECKLIST OBRIGATÓRIO DE INSTALAÇÃO */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className="eyebrow">Qualidade de Instalação</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Protocolo de Entrega e Checklist Técnico</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
            <div className="text-xs">
              <p className="font-bold text-[hsl(var(--foreground))]">1. Medição de Potência Óptica na Tomada</p>
              <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                Obrigatório registar o valor com Power Meter (mínimo exigido: -19 a -25 dBm).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
            <div className="text-xs">
              <p className="font-bold text-[hsl(var(--foreground))]">2. Fixação e Tensão do Cabo Drop</p>
              <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                Utilização obrigatória de esticadores em cunha nos postes para evitar barrigas no cabo.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
            <div className="text-xs">
              <p className="font-bold text-[hsl(var(--foreground))]">3. Teste ao Vivo na TV e Router Wi-Fi</p>
              <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                Sintonia de canais nacionais/desporto e teste de velocidade com o cliente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <span className="text-emerald-600 font-bold mt-0.5">✓</span>
            <div className="text-xs">
              <p className="font-bold text-[hsl(var(--foreground))]">4. Ficha de Entrega Assinada</p>
              <p className="text-[hsl(var(--muted-foreground))] mt-0.5">
                Assinatura do cliente confirmando a entrega do serviço e equipamentos operacionais.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
