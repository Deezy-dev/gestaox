import { useState } from 'react';
import {
  Building2,
  Image as ImageIcon,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Tv,
  Wifi,
  Sparkles,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { Field, Input, Textarea, Button, kz } from '@/components/shared-ui';
import { getCompanyLogo, saveCompanyLogo } from '@/lib/company-logo';
import { TvPackage, InternetPlan } from './settings-types';

interface CompanyPricingTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
}

export function CompanyPricingTab({ form, set, isAdmin }: CompanyPricingTabProps) {
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);

  const tvPackages: TvPackage[] = form.tvPackages || [
    { id: 'tv-basico', name: 'Pacote Básico Comunitário', channelsCount: 35, price: 4000, maxTvs: 1, description: 'Sinal digital RF com canais essenciais (TPA, Zap Viva, Record, SIC, Globo, Desporto).', active: true },
    { id: 'tv-familia', name: 'Pacote Família Digital', channelsCount: 60, price: 6500, maxTvs: 2, description: 'Canais infantis, novelas, filmes e entretenimento familiar para até 2 televisores.', active: true },
    { id: 'tv-premium', name: 'Pacote Premium Desporto & Filmes', channelsCount: 90, price: 9500, maxTvs: 2, description: 'Transmissões desportivas ao vivo (Girabola, Premier League, UEFA), cinema e séries HD.', active: true },
    { id: 'tv-comercial', name: 'Pacote Comercial / Estabelecimentos', channelsCount: 50, price: 15000, maxTvs: 4, description: 'Licença pública para bares, restaurantes e estabelecimentos comerciais.', active: true },
  ];

  const internetPlans: InternetPlan[] = form.internetPlans || [
    { id: 'fibra-10', name: 'Fibra 10', speed: '10 Mbps/s', price: 6500 },
    { id: 'fibra-22', name: 'Fibra 22', speed: '22 Mbps/s', price: 8500 },
    { id: 'fibra-50', name: 'Fibra 50', speed: '50 Mbps/s', price: 12000 },
    { id: 'fibra-100', name: 'Fibra 100', speed: '100 Mbps/s', price: 20000 },
  ];

  const updateTvPackage = (index: number, key: keyof TvPackage, val: any) => {
    if (!isAdmin) return;
    const updated = [...tvPackages];
    updated[index] = { ...updated[index], [key]: val };
    set('tvPackages', updated);
  };

  const addTvPackage = () => {
    if (!isAdmin) return;
    const newPkg: TvPackage = {
      id: `tv-pack-${Date.now()}`,
      name: 'Novo Pacote TV',
      channelsCount: 40,
      price: 5000,
      maxTvs: 1,
      description: 'Pacote de televisão por cabo comunitária.',
      active: true,
    };
    set('tvPackages', [...tvPackages, newPkg]);
  };

  const removeTvPackage = (index: number) => {
    if (!isAdmin) return;
    set('tvPackages', tvPackages.filter((_, i) => i !== index));
  };

  const updateInternetPlan = (index: number, key: keyof InternetPlan, val: any) => {
    if (!isAdmin) return;
    const updated = [...internetPlans];
    updated[index] = { ...updated[index], [key]: key === 'price' ? Number(val) : val };
    set('internetPlans', updated);
  };

  const addInternetPlan = () => {
    if (!isAdmin) return;
    const newPlan: InternetPlan = {
      id: `fibra-${Date.now()}`,
      name: 'Fibra Pro',
      speed: '30 Mbps/s',
      price: 10000,
    };
    set('internetPlans', [...internetPlans, newPlan]);
  };

  const removeInternetPlan = (index: number) => {
    if (!isAdmin) return;
    set('internetPlans', internetPlans.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-7">
      {/* 1. DADOS DA EMPRESA & LOGOTIPO */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Building2 size={20} />
            </div>
            <div>
              <p className="eyebrow">Identidade Oficial</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Dados da Empresa</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Nome Oficial da Empresa">
              <Input
                value={form.companyName || ''}
                onChange={(e) => set('companyName', e.target.value)}
                disabled={!isAdmin}
                placeholder="OSDEL TECNOLOGIA"
              />
            </Field>

            <Field label="NIF (Número de Identificação Fiscal)">
              <Input
                value={form.companyNif || ''}
                onChange={(e) => set('companyNif', e.target.value)}
                disabled={!isAdmin}
                placeholder="5600857127"
              />
            </Field>

            <Field label="Telefone Principal de Atendimento">
              <Input
                value={form.companyPhone || ''}
                onChange={(e) => set('companyPhone', e.target.value)}
                disabled={!isAdmin}
                placeholder="926 153 736"
              />
            </Field>

            <Field label="WhatsApp Comercial / Suporte">
              <Input
                value={form.companyWhatsApp || ''}
                onChange={(e) => set('companyWhatsApp', e.target.value)}
                disabled={!isAdmin}
                placeholder="+244 926 153 736"
              />
            </Field>

            <Field label="E-mail Geral de Contacto">
              <Input
                type="email"
                value={form.companyEmail || ''}
                onChange={(e) => set('companyEmail', e.target.value)}
                disabled={!isAdmin}
                placeholder="comercial@osdeltecnologia.ao"
              />
            </Field>

            <Field label="E-mail do Departamento Financeiro">
              <Input
                type="email"
                value={form.companyEmailSecondary || ''}
                onChange={(e) => set('companyEmailSecondary', e.target.value)}
                disabled={!isAdmin}
                placeholder="financeiro@osdeltecnologia.ao"
              />
            </Field>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Endereço / Sede Principal">
              <Input
                value={form.companyAddress || ''}
                onChange={(e) => set('companyAddress', e.target.value)}
                disabled={!isAdmin}
                placeholder="Rua 12, Bairro Golf I, Kilamba Kiaxi, Luanda"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website Institucional">
                <Input
                  value={form.companyWebsite || ''}
                  onChange={(e) => set('companyWebsite', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="www.osdeltecnologia.ao"
                />
              </Field>

              <Field label="Subtítulo dos Documentos Oficiais">
                <Input
                  value={form.companySubtitle || ''}
                  onChange={(e) => set('companySubtitle', e.target.value)}
                  disabled={!isAdmin}
                  placeholder="TV COMUNITÁRIA · INTERNET FIBRA"
                />
              </Field>
            </div>

            <Field label="Slogan / Mensagem Institucional">
              <Input
                value={form.companySlogan || ''}
                onChange={(e) => set('companySlogan', e.target.value)}
                disabled={!isAdmin}
                placeholder="Conectando lares e comunidades com alta tecnologia"
              />
            </Field>
          </div>
        </section>

        {/* LOGOTIPO DA EMPRESA */}
        <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
              <ImageIcon size={20} />
            </div>
            <div>
              <p className="eyebrow">Identidade Visual</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Logotipo da Empresa</h2>
            </div>
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            Utilizado no cabeçalho do sistema, faturas oficiais, recibos, termos de adesão e fichas técnicas de clientes.
          </p>

          <div className="flex flex-col items-center gap-4 p-5 rounded-xl bg-[hsl(var(--secondary)/.4)] border border-[hsl(var(--border))]">
            <div className="relative group">
              <img
                src={getCompanyLogo(form.logoUrl)}
                alt="Logotipo OSDEL"
                className="h-28 w-28 rounded-2xl border-2 border-[hsl(var(--primary))] object-contain bg-white p-2 shadow-sm"
              />
              <span className="absolute -bottom-2 -right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-black text-white uppercase shadow-xs">
                Em Uso
              </span>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-2 justify-center w-full">
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3.5 py-2 text-xs font-bold text-white hover:brightness-105 shadow-xs transition">
                  <Upload size={14} /> Carregar Novo Logotipo
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
                >
                  <RotateCcw size={14} /> Repor Padrão
                </button>
              </div>
            )}

            <div className="w-full">
              <Field label="Ou informe o URL da Imagem">
                <Input
                  value={form.logoUrl || ''}
                  onChange={(e) => {
                    set('logoUrl', e.target.value);
                    if (e.target.value) saveCompanyLogo(e.target.value);
                  }}
                  disabled={!isAdmin}
                  placeholder="https://exemplo.com/logo-osdel.png"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(var(--border))] p-4 bg-[hsl(var(--card))] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Moeda Principal:</span>
              <span className="font-bold">Kwanza Angolano (Kz / AOA)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Região Operacional:</span>
              <span className="font-bold">Luanda, Angola (GMT+1)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Formato Numérico:</span>
              <span className="font-mono font-bold">12.500 Kz (Padrão AO)</span>
            </div>
          </div>
        </section>
      </div>

      {/* 2. TABELA DE PREÇOS BASE DA TV */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Tv size={20} />
          </div>
          <div>
            <p className="eyebrow">Tabela de Serviços Básicos</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Preços Gerais do Serviço de TV</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Mensalidade Padrão da TV (Kz)">
            <Input
              type="number"
              min="0"
              value={form.tvMonthlyPrice ?? 4000}
              onChange={(e) => set('tvMonthlyPrice', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Ponto Extra de Televisão (Kz)">
            <Input
              type="number"
              min="0"
              value={form.tvExtraPrice ?? 1000}
              onChange={(e) => set('tvExtraPrice', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Taxa de Adesão / Ligação Inicial (Kz)">
            <Input
              type="number"
              min="0"
              value={form.connectionFee ?? 15000}
              onChange={(e) => set('connectionFee', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Taxa de Derivação de Sinal (Kz)">
            <Input
              type="number"
              min="0"
              value={form.derivationFee ?? 7000}
              onChange={(e) => set('derivationFee', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Metros de Cabo Coaxial Incluídos no Kit">
            <Input
              type="number"
              min="0"
              value={form.cableIncludedMeters ?? 25}
              onChange={(e) => set('cableIncludedMeters', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>

          <Field label="Preço por Metro de Cabo Excedente (Kz)">
            <Input
              type="number"
              min="0"
              value={form.extraMeterPrice ?? 250}
              onChange={(e) => set('extraMeterPrice', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>
        </div>
      </section>

      {/* 3. GERENCIADOR DE PACOTES DE TV COMUNITÁRIA */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="eyebrow">Grade de Programação</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Pacotes de TV por Cabo Comunitária</h2>
            </div>
          </div>

          {isAdmin && (
            <Button variant="outline" onClick={addTvPackage}>
              <Plus size={15} /> Adicionar Pacote TV
            </Button>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {tvPackages.map((pkg, idx) => (
            <div
              key={pkg.id || idx}
              className={`rounded-xl border p-4.5 transition ${
                pkg.active ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))]' : 'border-dashed border-slate-300 bg-slate-50/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pkg.active}
                      onChange={(e) => updateTvPackage(idx, 'active', e.target.checked)}
                      disabled={!isAdmin}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <Input
                      value={pkg.name}
                      onChange={(e) => updateTvPackage(idx, 'name', e.target.value)}
                      disabled={!isAdmin}
                      className="font-bold text-sm h-8"
                      placeholder="Nome do Pacote"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Canais">
                      <Input
                        type="number"
                        value={pkg.channelsCount}
                        onChange={(e) => updateTvPackage(idx, 'channelsCount', Number(e.target.value))}
                        disabled={!isAdmin}
                        className="h-8 text-xs font-mono"
                      />
                    </Field>
                    <Field label="TVs Suportadas">
                      <Input
                        type="number"
                        value={pkg.maxTvs}
                        onChange={(e) => updateTvPackage(idx, 'maxTvs', Number(e.target.value))}
                        disabled={!isAdmin}
                        className="h-8 text-xs font-mono"
                      />
                    </Field>
                    <Field label="Mensalidade">
                      <Input
                        type="number"
                        value={pkg.price}
                        onChange={(e) => updateTvPackage(idx, 'price', Number(e.target.value))}
                        disabled={!isAdmin}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </Field>
                  </div>

                  <Field label="Descrição e Canais em Destaque">
                    <Input
                      value={pkg.description}
                      onChange={(e) => updateTvPackage(idx, 'description', e.target.value)}
                      disabled={!isAdmin}
                      className="text-xs h-8"
                      placeholder="Canais incluídos neste pacote..."
                    />
                  </Field>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => removeTvPackage(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="Remover pacote"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PLANOS DE INTERNET FIBRA ÓPTICA (FTTH) */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Wifi size={20} />
            </div>
            <div>
              <p className="eyebrow">Internet FTTH Banda Larga</p>
              <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">Planos de Fibra Óptica</h2>
            </div>
          </div>

          {isAdmin && (
            <Button variant="outline" onClick={addInternetPlan}>
              <Plus size={15} /> Adicionar Plano Fibra
            </Button>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {internetPlans.map((plan, idx) => (
            <div key={plan.id || idx} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  value={plan.name}
                  onChange={(e) => updateInternetPlan(idx, 'name', e.target.value)}
                  disabled={!isAdmin}
                  className="font-bold text-sm h-8"
                  placeholder="Nome do Plano"
                />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => removeInternetPlan(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition cursor-pointer ml-2"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <Field label="Velocidade (Download / Upload)">
                <Input
                  value={plan.speed}
                  onChange={(e) => updateInternetPlan(idx, 'speed', e.target.value)}
                  disabled={!isAdmin}
                  className="h-8 text-xs font-mono"
                  placeholder="20 Mbps/s"
                />
              </Field>

              <Field label="Mensalidade (Kz)">
                <Input
                  type="number"
                  value={plan.price}
                  onChange={(e) => updateInternetPlan(idx, 'price', Number(e.target.value))}
                  disabled={!isAdmin}
                  className="h-8 text-xs font-mono font-bold"
                />
              </Field>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
