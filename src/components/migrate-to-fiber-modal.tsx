import React, { useState } from 'react';
import {
  Wifi,
  Tv,
  CheckCircle2,
  FileSignature,
  Printer,
  X,
  Zap,
  Boxes,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  useUpdateClient,
  useCreateContract,
  type Client,
} from '@/lib/local-api';
import { pushNotification } from '@/lib/notifications';
import { getCompanyLogo } from '@/lib/company-logo';

const FIBER_PLANS = [
  {
    id: 'fibra-15m',
    name: 'OSDEL Fibra Residencial 15M',
    type: 'internet' as const,
    speed: '15 Mbps',
    price: 9500,
    description: 'Navegação rápida para redes sociais, YouTube Full HD e streaming',
  },
  {
    id: 'fibra-25m',
    name: 'OSDEL Fibra Ultra 25M',
    type: 'internet' as const,
    speed: '25 Mbps',
    price: 13500,
    description: 'Ideal para famílias, múltiplos telemóveis, Smart TVs e aulas online',
  },
  {
    id: 'fibra-50m',
    name: 'OSDEL Fibra Pro 50M',
    type: 'internet' as const,
    speed: '50 Mbps',
    price: 22000,
    description: 'Alta capacidade para jogos online, downloads pesados e trabalho remoto',
  },
  {
    id: 'combo-tv-fibra',
    name: 'COMBO OSDEL: TV Comunitária + Fibra 20M',
    type: 'combo' as const,
    speed: '20 Mbps + Todos os Canais TV',
    price: 15500,
    description: 'O pacote mais vantajoso: TV completa + Internet Fibra dedicada',
  },
];

interface MigrateToFiberModalProps {
  client: Client;
  onClose: () => void;
  onSuccess: (newContract: any) => void;
}

export function MigrateToFiberModal({ client, onClose, onSuccess }: MigrateToFiberModalProps) {
  const updateClientMutation = useUpdateClient();
  const createContractMutation = useCreateContract();

  const [selectedPlan, setSelectedPlan] = useState(FIBER_PLANS[0]);
  const [pdoNumber, setPdoNumber] = useState(client.pdoNumber || 'PDO-04');
  const [onuNumber, setOnuNumber] = useState(client.onuNumber || `ONU-OSD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [migrationFee, setMigrationFee] = useState('0'); // Isenção promocional por defeito
  const [dueDate, setDueDate] = useState('5');
  const [notes, setNotes] = useState(`Migração autorizada de TV para ${selectedPlan.name}. ONU fornecida em regime de comodato.`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Update client serviceType, pdoNumber, onuNumber
      await updateClientMutation.mutateAsync({
        clientId: client.id,
        data: {
          serviceType: selectedPlan.type,
          pdoNumber,
          onuNumber,
          notes: `${client.notes ? client.notes + ' | ' : ''}Migrado para ${selectedPlan.name} em ${new Date().toLocaleDateString('pt-AO')}`,
        },
      });

      // 2. Create the brand new Fiber Contract
      const contractPayload = {
        planName: selectedPlan.name,
        planSpeed: selectedPlan.speed,
        monthlyPrice: selectedPlan.price,
        dueDay: Number(dueDate),
        startDate: new Date().toISOString().slice(0, 10),
        terms: `Contrato de Adesão ao Serviço de Telecomunicações Fibra Óptica OSDEL TECNOLOGIA.\n` +
          `Equipamento ONU Terminal Óptico instalado: ${onuNumber}.\n` +
          `Ponto de Distribuição Óptica: ${pdoNumber}.\n` +
          `Taxa de Migração/Instalação: Kz ${Number(migrationFee).toLocaleString('pt-AO')}.\n` +
          `${notes}`,
      };

      const newContract = await createContractMutation.mutateAsync({
        clientId: client.id,
        data: contractPayload,
      });

      // 3. Emit real system notification
      pushNotification({
        title: `Migração Realizada: ${client.fullName}`,
        message: `O cliente ${client.code} foi migrado com sucesso para ${selectedPlan.name} (${selectedPlan.speed}). Novo contrato emitido.`,
        type: 'sistema',
        priority: 'normal',
        targetRole: 'todos',
        link: `/clientes/${client.id}`,
      });

      onSuccess(newContract);
    } catch (err) {
      console.error('Erro na migração:', err);
      alert('Ocorreu um erro ao processar a migração. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142f35]/50 p-4 backdrop-blur-sm">
      <div className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[hsl(var(--card))] shadow-2xl border border-[hsl(var(--border))]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.98)] px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Zap size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Upgrade Tecnológico</p>
              <h3 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                Migrar para Internet Fibra Óptica & Gerar Novo Contrato
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Summary */}
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">Cliente em Migração:</p>
              <h4 className="text-sm font-black text-[hsl(var(--foreground))]">{client.fullName} ({client.code})</h4>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">{client.address} · {client.phone}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Serviço Actual: {client.serviceType === 'tv' ? 'TV' : client.serviceType}
              </span>
            </div>
          </div>

          {/* Plan Selector */}
          <div>
            <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-2">
              Seleccione o Novo Plano de Fibra Óptica *
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIBER_PLANS.map((plan) => {
                const isSelected = selectedPlan.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setNotes(`Migração autorizada para ${plan.name}. ONU em regime de comodato.`);
                    }}
                    className={`cursor-pointer rounded-xl border p-3.5 transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/20 shadow-sm ring-1 ring-purple-600'
                        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary)/.4)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[hsl(var(--foreground))]">{plan.name}</span>
                        {isSelected && <CheckCircle2 size={16} className="text-purple-600 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-purple-600 font-bold mt-1 flex items-center gap-1">
                        <Wifi size={12} /> {plan.speed}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                        {plan.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[hsl(var(--border))] flex items-baseline justify-between">
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Mensalidade:</span>
                      <b className="text-sm font-black text-[hsl(var(--foreground))]">
                        {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 })
                          .format(plan.price)
                          .replace('AOA', 'Kz')} / mês
                      </b>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technical and Hardware Settings */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
                Caixa PDO / Porta *
              </label>
              <input
                type="text"
                required
                value={pdoNumber}
                onChange={(e) => setPdoNumber(e.target.value)}
                placeholder="Ex.: PDO-04 / Porta 02"
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
                Número de Série / Modelo da ONU *
              </label>
              <input
                type="text"
                required
                value={onuNumber}
                onChange={(e) => setOnuNumber(e.target.value)}
                placeholder="Ex.: ONU-OSD-8821"
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
                Taxa de Migração / Instalação (Kz)
              </label>
              <input
                type="number"
                min="0"
                value={migrationFee}
                onChange={(e) => setMigrationFee(e.target.value)}
                placeholder="0"
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-purple-600"
              />
              <small className="text-[10px] text-[hsl(var(--muted-foreground))]">
                Coloque 0 para manter isenção promocional da OSDEL.
              </small>
            </div>

            <div>
              <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
                Dia de Vencimento Mensal
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-purple-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-1">
              Observações & Cláusulas Específicas do Contrato
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2 text-sm outline-none focus:border-purple-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-[hsl(var(--border))]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition shadow-md disabled:opacity-50"
            >
              <FileSignature size={15} />
              {isSubmitting ? 'A processar migração…' : 'Efectuar Migração & Emitir Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
