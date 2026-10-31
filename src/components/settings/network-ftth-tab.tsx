import { useState } from 'react';
import {
  Radio,
  Server,
  Network,
  Activity,
  MapPin,
  Plus,
  Trash2,
  Tv,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Cpu,
} from 'lucide-react';
import { Field, Input, Button } from '@/components/shared-ui';
import { CoverageNeighborhood } from './settings-types';

interface NetworkFtthTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
}

export function NetworkFtthTab({ form, set, isAdmin }: NetworkFtthTabProps) {
  const neighborhoods: CoverageNeighborhood[] = form.coverageNeighborhoods || [
    { id: 'bairro-1', name: 'Golf I', sector: 'Sector Central & Rua 12', pdosCount: 24, status: 'ativo', notes: 'Sede e centro de transmissão principal' },
    { id: 'bairro-2', name: 'Golf II', sector: 'Zonas A, B e C', pdosCount: 18, status: 'ativo', notes: 'Alta densidade de clientes fibra e TV' },
    { id: 'bairro-3', name: 'Palanca', sector: 'Palanca 1 & 2', pdosCount: 16, status: 'ativo', notes: 'Backbone interligado via anel óptico' },
    { id: 'bairro-4', name: 'Kilamba Kiaxi', sector: 'Sede Municipal', pdosCount: 30, status: 'ativo', notes: 'Infraestrutura com OLT redundante' },
    { id: 'bairro-5', name: 'Sapú', sector: 'Sapú 1 & 2', pdosCount: 12, status: 'ativo', notes: 'Expansão recente de rede primária' },
    { id: 'bairro-6', name: 'Rocha Pinto', sector: 'Encosta & Parte Alta', pdosCount: 14, status: 'ativo', notes: 'Rede mista coaxial e fibra FTTH' },
    { id: 'bairro-7', name: 'Vila Estoril', sector: 'Projecto Novo', pdosCount: 8, status: 'expansao', notes: 'Lançamento de cabos de 48 FO em curso' },
  ];

  const updateNeighborhood = (index: number, key: keyof CoverageNeighborhood, val: any) => {
    if (!isAdmin) return;
    const updated = [...neighborhoods];
    updated[index] = { ...updated[index], [key]: key === 'pdosCount' ? Number(val) : val };
    set('coverageNeighborhoods', updated);
  };

  const addNeighborhood = () => {
    if (!isAdmin) return;
    const newNeighborhood: CoverageNeighborhood = {
      id: `bairro-${Date.now()}`,
      name: 'Novo Bairro / Zona',
      sector: 'Sector 1',
      pdosCount: 10,
      status: 'expansao',
      notes: 'Projecto de cablagem e instalação de caixas PDO',
    };
    set('coverageNeighborhoods', [...neighborhoods, newNeighborhood]);
  };

  const removeNeighborhood = (index: number) => {
    if (!isAdmin) return;
    set('coverageNeighborhoods', neighborhoods.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-7">
      {/* 1. OLT & CONCENTRADOR MIKROTIK ROUTEROS */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Server size={20} />
          </div>
          <div>
            <p className="eyebrow">Núcleo de Rede & Telecomunicações</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Concentrador PPPoE e OLT GPON</h2>
          </div>
        </div>

        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Parâmetros de interligação entre o sistema de gestão e o equipamento de borda (Mikrotik RouterOS / OLT FTTH).
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="IP da OLT GPON Principal">
            <Input
              value={form.oltIp || '10.200.0.1'}
              onChange={(e) => set('oltIp', e.target.value)}
              disabled={!isAdmin}
              className="font-mono"
              placeholder="10.200.0.1"
            />
          </Field>

          <Field label="Modelo / Fabricante da OLT">
            <Input
              value={form.oltModel || 'Huawei SmartAX EA5800 / ZTE C320 GPON'}
              onChange={(e) => set('oltModel', e.target.value)}
              disabled={!isAdmin}
              placeholder="Huawei / ZTE GPON"
            />
          </Field>

          <Field label="IP do Concentrador Mikrotik">
            <Input
              value={form.routerOsIp || '10.200.0.254'}
              onChange={(e) => set('routerOsIp', e.target.value)}
              disabled={!isAdmin}
              className="font-mono"
              placeholder="10.200.0.254"
            />
          </Field>

          <Field label="Porta API RouterOS">
            <Input
              type="number"
              value={form.routerOsApiPort ?? 8728}
              onChange={(e) => set('routerOsApiPort', Number(e.target.value))}
              disabled={!isAdmin}
              className="font-mono"
              placeholder="8728"
            />
          </Field>

          <Field label="DNS Primário (IPv4)">
            <Input
              value={form.dnsPrimary || '1.1.1.1'}
              onChange={(e) => set('dnsPrimary', e.target.value)}
              disabled={!isAdmin}
              className="font-mono"
              placeholder="1.1.1.1 (Cloudflare)"
            />
          </Field>

          <Field label="DNS Secundário (IPv4)">
            <Input
              value={form.dnsSecondary || '8.8.8.8'}
              onChange={(e) => set('dnsSecondary', e.target.value)}
              disabled={!isAdmin}
              className="font-mono"
              placeholder="8.8.8.8 (Google)"
            />
          </Field>

          <Field label="Faixa de IPs PPPoE (CGNAT)">
            <Input
              value={form.pppoePoolRange || '100.64.10.1 - 100.64.13.254'}
              onChange={(e) => set('pppoePoolRange', e.target.value)}
              disabled={!isAdmin}
              className="font-mono"
              placeholder="100.64.10.0/22"
            />
          </Field>

          <Field label="Sub-rede de Gestão de ONUs">
            <Input
              value={form.onuManagementSubnet || '192.168.100.0/24'}
              onChange={(e) => set('onuManagementSubnet', e.target.value)}
              disabled={!isAdmin}
              className="font-mono"
              placeholder="192.168.100.0/24"
            />
          </Field>
        </div>
      </section>

      {/* 2. POTÊNCIA ÓPTICA & SINAL RF DA TV */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* PARÂMETROS ÓPTICOS FTTH */}
        <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
              <Activity size={20} />
            </div>
            <div>
              <p className="eyebrow">Calibração de Linha</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Níveis de Sinal Óptico (FTTH)</h2>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Potência Ideal (RX)">
              <Input
                value={form.opticalIdealPowerRx || '-19 dBm'}
                onChange={(e) => set('opticalIdealPowerRx', e.target.value)}
                disabled={!isAdmin}
                className="font-mono font-bold text-emerald-700 bg-emerald-50/50"
              />
            </Field>

            <Field label="Limite Mínimo Aceitável">
              <Input
                value={form.opticalMinPowerRx || '-25 dBm'}
                onChange={(e) => set('opticalMinPowerRx', e.target.value)}
                disabled={!isAdmin}
                className="font-mono font-bold text-amber-700 bg-amber-50/50"
              />
            </Field>

            <Field label="Atenuação Crítica / Queda">
              <Input
                value={form.opticalCriticalPowerRx || '-27 dBm'}
                onChange={(e) => set('opticalCriticalPowerRx', e.target.value)}
                disabled={!isAdmin}
                className="font-mono font-bold text-rose-700 bg-rose-50/50"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] p-4 bg-[hsl(var(--card))] text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">Splitter Primário (NOC para Bairro):</span>
              <span className="font-mono font-bold">1:8 (-10.5 dB)</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">Splitter Secundário (Caixa PDO de Rua):</span>
              <span className="font-mono font-bold">1:16 (-13.8 dB)</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">Comprimento de Onda de Recepção (Down):</span>
              <span className="font-mono font-bold">1490 nm / 1550 nm CATV</span>
            </div>
          </div>
        </section>

        {/* PARÂMETROS RF DA TV */}
        <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Tv size={20} />
            </div>
            <div>
              <p className="eyebrow">Transmissão Coaxial / RF</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Parâmetros de Sinal RF (TV)</h2>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Frequência Inicial">
              <Input
                type="number"
                value={form.rfInitialFrequencyMhz ?? 306}
                onChange={(e) => set('rfInitialFrequencyMhz', Number(e.target.value))}
                disabled={!isAdmin}
                className="font-mono font-bold"
              />
            </Field>

            <Field label="Modulação Digital">
              <Input
                value={form.rfModulation || 'DVB-C 256-QAM'}
                onChange={(e) => set('rfModulation', e.target.value)}
                disabled={!isAdmin}
                className="font-mono"
              />
            </Field>

            <Field label="Potência Alvo na Tomada">
              <Input
                value={form.rfTargetPowerDbuv || '65 - 75 dBuV'}
                onChange={(e) => set('rfTargetPowerDbuv', e.target.value)}
                disabled={!isAdmin}
                className="font-mono font-bold text-blue-700"
              />
            </Field>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] p-4 bg-[hsl(var(--card))] text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">Largura de Banda por Canal:</span>
              <span className="font-mono font-bold">8 MHz (Norma PAL-I / DVB)</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">Amplificador de Linha Tronco:</span>
              <span className="font-mono font-bold">Ganho 34 dB com AGC Automático</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">Cabo Coaxial Padrão de Drop:</span>
              <span className="font-mono font-bold">RG-6 75 Ohms Dupla Malha</span>
            </div>
          </div>
        </section>
      </div>

      {/* 3. GESTOR DE BAIRROS E ZONAS DE COBERTURA */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <MapPin size={20} />
            </div>
            <div>
              <p className="eyebrow">Mapeamento Geográfico</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Bairros e Zonas de Cobertura da Rede</h2>
            </div>
          </div>

          {isAdmin && (
            <Button variant="outline" onClick={addNeighborhood}>
              <Plus size={15} /> Adicionar Bairro / Zona
            </Button>
          )}
        </div>

        <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
          Zonas urbanas cobertas pela infraestrutura de TV comunitária e fibra óptica da OSDEL Tecnologia.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {neighborhoods.map((bairro, idx) => (
            <div key={bairro.id || idx} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  value={bairro.name}
                  onChange={(e) => updateNeighborhood(idx, 'name', e.target.value)}
                  disabled={!isAdmin}
                  className="font-bold text-sm h-8"
                  placeholder="Nome do Bairro"
                />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => removeNeighborhood(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition cursor-pointer ml-2"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Caixas PDO">
                  <Input
                    type="number"
                    value={bairro.pdosCount}
                    onChange={(e) => updateNeighborhood(idx, 'pdosCount', Number(e.target.value))}
                    disabled={!isAdmin}
                    className="h-8 text-xs font-mono"
                  />
                </Field>
                <Field label="Estado da Rede">
                  <select
                    value={bairro.status}
                    onChange={(e) => updateNeighborhood(idx, 'status', e.target.value as any)}
                    disabled={!isAdmin}
                    className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 text-xs h-8 font-bold"
                  >
                    <option value="ativo">Activo</option>
                    <option value="expansao">Em Expansão</option>
                    <option value="planeado">Planeado</option>
                  </select>
                </Field>
              </div>

              <Field label="Sector / Ruas Principais">
                <Input
                  value={bairro.sector}
                  onChange={(e) => updateNeighborhood(idx, 'sector', e.target.value)}
                  disabled={!isAdmin}
                  className="text-xs h-8"
                  placeholder="Ex.: Rua 12, Sector Central..."
                />
              </Field>

              <Field label="Observações Técnicas">
                <Input
                  value={bairro.notes}
                  onChange={(e) => updateNeighborhood(idx, 'notes', e.target.value)}
                  disabled={!isAdmin}
                  className="text-xs h-8 text-[hsl(var(--muted-foreground))]"
                  placeholder="Notas do anel ou OLT..."
                />
              </Field>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
