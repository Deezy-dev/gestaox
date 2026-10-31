import { useState, useEffect } from 'react';
import {
  Smartphone,
  CreditCard,
  Building2,
  Megaphone,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Phone,
  Layers,
  Lock,
} from 'lucide-react';
import { Field, Input, Textarea, Button } from '@/components/shared-ui';
import { getStoredAnnouncements, saveAnnouncements } from '@/lib/client-portal';

interface ClientApkTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export function ClientApkTab({ form, set, isAdmin, isSuperAdmin }: ClientApkTabProps) {
  const [announcements, setAnnouncements] = useState<any[]>(() => getStoredAnnouncements());

  useEffect(() => {
    const handleSync = () => setAnnouncements(getStoredAnnouncements());
    window.addEventListener('osdel-announcements-updated', handleSync);
    window.addEventListener('osdel-client-announcements-updated', handleSync);
    return () => {
      window.removeEventListener('osdel-announcements-updated', handleSync);
      window.removeEventListener('osdel-client-announcements-updated', handleSync);
    };
  }, []);

  const [modalNewAnn, setModalNewAnn] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'comunicado' | 'manutencao' | 'novidade' | 'urgente'>('comunicado');
  const [newContent, setNewContent] = useState('');

  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const item = {
      id: `ann-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      date: new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' }),
      content: newContent.trim(),
      active: true,
    };

    const updated = [item, ...announcements];
    setAnnouncements(updated);
    saveAnnouncements(updated);

    setNewTitle('');
    setNewContent('');
    setModalNewAnn(false);
  };

  const handleDeleteAnnouncement = (id: string) => {
    if (confirm('Deseja eliminar este anúncio do aplicativo dos clientes?')) {
      const updated = announcements.filter((a) => a.id !== id);
      setAnnouncements(updated);
      saveAnnouncements(updated);
    }
  };

  return (
    <div className="space-y-7">
      {/* Banner Informativo */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 p-6 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-bold border border-blue-400/30">
            <Smartphone size={13} /> Gestão Dinâmica dos Aplicativos Móveis (APK)
          </div>
          <h2 className="text-xl font-bold font-serif text-white">
            Controlo de Contas Bancárias (IBANs) & Anúncios nos Telemóveis dos Clientes
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Todas as alterações feitas aqui são sincronizadas instantaneamente com o <b>App do Cliente (APK)</b>. Pode trocar o IBAN de recebimento, as coordenadas Multicaixa Express e os avisos na tela inicial a qualquer momento.
          </p>
        </div>

        {isSuperAdmin ? (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Permissão Super Admin (deezy)
          </span>
        ) : (
          <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
            <Lock size={14} /> Modo Leitura (Apenas Super Admin)
          </span>
        )}
      </div>

      {/* 1. COORDENADAS BANCÁRIAS E MULTICAIXA EXIBIDAS NO APK */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-5">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard size={18} />
            </div>
            <div>
              <b className="text-sm font-bold text-[hsl(var(--foreground))]">
                Contas Bancárias & IBANs Visíveis no App do Cliente
              </b>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Os clientes visualizam estes dados na aba "Facturas" e ao submeterem comprovativos de transferência.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* BANCO 1 (BAI) */}
          <div className="space-y-3 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <b className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
              <Building2 size={14} /> Conta Bancária Primária (Banco 1)
            </b>
            <Field label="Nome do Banco 1:">
              <Input
                disabled={!isSuperAdmin}
                value={form.bank1Name || 'Banco BAI'}
                onChange={(e) => set('bank1Name', e.target.value)}
                placeholder="ex.: Banco BAI"
              />
            </Field>
            <Field label="IBAN do Banco 1 (Angola):">
              <Input
                disabled={!isSuperAdmin}
                value={form.bank1Iban || form.bankIban || 'AO06.0040.0000.1111.2222.3333.4'}
                onChange={(e) => {
                  set('bank1Iban', e.target.value);
                  set('bankIban', e.target.value);
                }}
                className="font-mono text-xs font-bold"
                placeholder="AO06.0040...."
              />
            </Field>
          </div>

          {/* BANCO 2 (BFA) */}
          <div className="space-y-3 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <b className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
              <Building2 size={14} /> Conta Bancária Secundária (Banco 2)
            </b>
            <Field label="Nome do Banco 2:">
              <Input
                disabled={!isSuperAdmin}
                value={form.bank2Name || 'Banco BFA'}
                onChange={(e) => set('bank2Name', e.target.value)}
                placeholder="ex.: Banco BFA"
              />
            </Field>
            <Field label="IBAN do Banco 2:">
              <Input
                disabled={!isSuperAdmin}
                value={form.bank2Iban || 'AO06.0006.0000.9921.8741.2012.3'}
                onChange={(e) => set('bank2Iban', e.target.value)}
                className="font-mono text-xs font-bold"
                placeholder="AO06.0006...."
              />
            </Field>
          </div>

          {/* BANCO 3 (OPCIONAL - ATLÂNTICO) */}
          <div className="space-y-3 p-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <b className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
              <Building2 size={14} /> Conta Bancária Opcional (Banco 3)
            </b>
            <Field label="Nome do Banco 3:">
              <Input
                disabled={!isSuperAdmin}
                value={form.bank3Name || 'Millennium Atlântico'}
                onChange={(e) => set('bank3Name', e.target.value)}
                placeholder="ex.: Millennium Atlântico"
              />
            </Field>
            <Field label="IBAN do Banco 3:">
              <Input
                disabled={!isSuperAdmin}
                value={form.bank3Iban || 'AO06.0055.0000.3341.1122.9011.5'}
                onChange={(e) => set('bank3Iban', e.target.value)}
                className="font-mono text-xs font-bold"
                placeholder="AO06.0055...."
              />
            </Field>
          </div>
        </div>

        {/* MULTICAIXA EXPRESS & WHATSAPP DE SUPORTE */}
        <div className="grid gap-4 sm:grid-cols-3 pt-2">
          <Field label="Entidade Multicaixa Express (5 dígitos):">
            <Input
              disabled={!isSuperAdmin}
              value={form.companyEntityNumber || form.mcxEntity || '00142'}
              onChange={(e) => {
                set('companyEntityNumber', e.target.value);
                set('mcxEntity', e.target.value);
              }}
              className="font-mono font-bold"
              placeholder="00142"
            />
          </Field>

          <Field label="Referência Base de Pagamento:">
            <Input
              disabled={!isSuperAdmin}
              value={form.mcxReference || '901 248 102'}
              onChange={(e) => set('mcxReference', e.target.value)}
              className="font-mono font-bold"
              placeholder="901 248 102"
            />
          </Field>

          <Field label="WhatsApp de Suporte aos Clientes:">
            <Input
              disabled={!isSuperAdmin}
              value={form.companyWhatsApp || form.companyPhone || '+244 926 153 736'}
              onChange={(e) => set('companyWhatsApp', e.target.value)}
              placeholder="+244 926 153 736"
            />
          </Field>
        </div>
      </section>

      {/* 2. GESTÃO DE ANÚNCIOS NO APP DO CLIENTE */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Megaphone size={18} />
            </div>
            <div>
              <b className="text-sm font-bold text-[hsl(var(--foreground))]">
                Anúncios & Comunicados Exibidos no App do Cliente
              </b>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Aparecem no carrossel e na aba "Notícias" de todos os assinantes conectados.
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <Button variant="primary" onClick={() => setModalNewAnn(true)} className="text-xs gap-1.5">
              <Plus size={14} /> Novo Anúncio para o APK
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 text-[9px] font-black uppercase">
                    {ann.category}
                  </span>
                  <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{ann.date}</span>
                </div>
                <h4 className="text-xs font-bold text-[hsl(var(--foreground))] line-clamp-2">{ann.title}</h4>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed line-clamp-3">
                  {ann.content}
                </p>
              </div>

              {isSuperAdmin && (
                <div className="border-t border-[hsl(var(--border))] pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Remover Anúncio
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* MODAL ADICIONAR NOVO ANÚNCIO */}
      {modalNewAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[hsl(var(--card))] p-6 shadow-2xl space-y-4 border border-[hsl(var(--border))]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-2">
              <b className="text-sm font-bold text-[hsl(var(--foreground))]">Novo Anúncio para o App do Cliente</b>
              <button onClick={() => setModalNewAnn(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAnnouncement} className="space-y-3 text-xs">
              <Field label="Título do Comunicado *">
                <Input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ex.: Novos Canais de Desporto Adicionados"
                />
              </Field>

              <Field label="Categoria:">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none"
                >
                  <option value="comunicado">Comunicado Geral</option>
                  <option value="manutencao">Manutenção Técnica</option>
                  <option value="novidade">Novidade & Novos Canais</option>
                  <option value="urgente">Aviso Urgente (Corte / Falha)</option>
                </select>
              </Field>

              <Field label="Conteúdo do Comunicado *">
                <Textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Escreva a mensagem que aparecerá nos telemóveis dos clientes..."
                />
              </Field>

              <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
                <Button variant="outline" onClick={() => setModalNewAnn(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!newTitle.trim() || !newContent.trim()}>
                  <Sparkles size={14} /> Publicar Imediatamente
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
