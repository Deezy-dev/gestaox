import { useState } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Check,
  Building2,
  Copy,
  Star,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  ANGOLAN_BANKS,
  type BankAccountRecord,
  validateAngolanIban,
  formatAngolanIban,
} from '@/lib/banking';

interface BankAccountsManagerProps {
  accounts: BankAccountRecord[];
  onChange: (updatedAccounts: BankAccountRecord[]) => void;
  defaultHolderName?: string;
  isCompany?: boolean;
  readOnly?: boolean;
}

export function BankAccountsManager({
  accounts = [],
  onChange,
  defaultHolderName = '',
  isCompany = false,
  readOnly = false,
}: BankAccountsManagerProps) {
  const [modalAdd, setModalAdd] = useState(false);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  const [form, setForm] = useState<{
    bankCode: string;
    accountHolder: string;
    iban: string;
    accountNumber: string;
    accountType: 'salario' | 'corrente' | 'poupanca' | 'operacional';
    isDefault: boolean;
    notes: string;
  }>({
    bankCode: '0040', // BAI default
    accountHolder: defaultHolderName,
    iban: 'AO06.0040.',
    accountNumber: '',
    accountType: isCompany ? 'operacional' : 'salario',
    isDefault: accounts.length === 0,
    notes: '',
  });

  const [error, setError] = useState<string | null>(null);

  const handleCopyIban = (iban: string) => {
    navigator.clipboard?.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2500);
  };

  const handleBankSelect = (code: string) => {
    const selectedBank = ANGOLAN_BANKS.find((b) => b.code === code);
    if (!selectedBank) return;

    // Preserve the suffix if user already typed digits
    const cleanCurrent = form.iban.replace(/[^A-Za-z0-9]/g, '');
    let suffix = '';
    if (cleanCurrent.length > 8) {
      suffix = cleanCurrent.substring(8);
    }

    const newIban = `AO06.${code}.${suffix ? suffix.match(/.{1,4}/g)?.join('.') : ''}`;
    setForm((prev) => ({
      ...prev,
      bankCode: code,
      iban: newIban,
    }));
  };

  const handleIbanInput = (val: string) => {
    // Keep uppercase alphanumeric and dots
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9.]/g, '');
    setForm((prev) => ({ ...prev, iban: cleaned }));
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateAngolanIban(form.iban);
    if (!validation.valid) {
      setError(validation.message || 'IBAN inválido.');
      return;
    }

    if (!form.accountHolder.trim()) {
      setError('O nome do titular da conta é obrigatório.');
      return;
    }

    const selectedBank = ANGOLAN_BANKS.find((b) => b.code === form.bankCode);
    const bankName = selectedBank ? selectedBank.fullName : 'Banco Comercial';

    const formatted = formatAngolanIban(form.iban);

    const newAccount: BankAccountRecord = {
      id: `bank-${Date.now()}`,
      bankCode: form.bankCode,
      bankName: `${selectedBank?.shortName ? `Banco ${selectedBank.shortName}` : bankName}`,
      accountHolder: form.accountHolder.trim(),
      iban: formatted,
      accountNumber: form.accountNumber.trim() || undefined,
      accountType: form.accountType,
      isDefault: form.isDefault || accounts.length === 0,
      notes: form.notes.trim() || undefined,
    };

    let updatedList = [...accounts];
    if (newAccount.isDefault) {
      updatedList = updatedList.map((a) => ({ ...a, isDefault: false }));
    }
    updatedList.push(newAccount);

    onChange(updatedList);
    setModalAdd(false);
    setForm({
      bankCode: '0040',
      accountHolder: defaultHolderName,
      iban: 'AO06.0040.',
      accountNumber: '',
      accountType: isCompany ? 'operacional' : 'salario',
      isDefault: false,
      notes: '',
    });
  };

  const handleDeleteAccount = (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    // If we deleted the default, make the first one default
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    onChange(updated);
  };

  const handleSetDefault = (id: string) => {
    const updated = accounts.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-[hsl(var(--primary))]" />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {isCompany ? 'Contas Bancárias Oficiais da Empresa' : 'Contas Bancárias do Colaborador'}
          </h4>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                accountHolder: defaultHolderName || prev.accountHolder,
                isDefault: accounts.length === 0,
              }));
              setModalAdd(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-bold hover:brightness-110 shadow-sm transition"
          >
            <Plus size={14} /> Adicionar Banco & IBAN
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-center">
          <CreditCard className="mx-auto text-slate-400 mb-1" size={24} />
          <p className="text-xs text-slate-600 font-semibold">Nenhuma conta bancária registada.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Pode cadastrar múltiplas contas (ex: BAI, BFA, BIC) para recebimento de pagamentos ou processamento salarial.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((acc, idx) => {
            const bankMeta = ANGOLAN_BANKS.find((b) => b.code === acc.bankCode);
            const itemKey = acc.id ? `${acc.id}-${idx}` : `bank-acc-${acc.bankCode}-${acc.iban || 'none'}-${idx}`;
            return (
              <div
                key={itemKey}
                className={`relative rounded-xl border p-3.5 bg-white transition shadow-sm ${
                  acc.isDefault
                    ? 'border-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/.3)]'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[11px] font-black tracking-wide"
                      style={{
                        backgroundColor: bankMeta?.badgeBg || '#e2e8f0',
                        color: bankMeta?.color || '#0f172a',
                      }}
                    >
                      {bankMeta?.shortName || acc.bankName}
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[140px]">
                      {acc.bankName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {acc.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <Star size={10} className="fill-emerald-600" /> Principal
                      </span>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Remover conta"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 space-y-1">
                  <div className="text-[11px] text-slate-500">
                    Titular: <b className="text-slate-800">{acc.accountHolder}</b>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 font-mono text-xs text-slate-800">
                    <span className="tracking-wider truncate">{acc.iban}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyIban(acc.iban)}
                      title="Copiar IBAN"
                      className="p-1 text-slate-500 hover:text-[hsl(var(--primary))] shrink-0"
                    >
                      {copiedIban === acc.iban ? (
                        <CheckCircle2 size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                  {acc.accountNumber && (
                    <div className="text-[10px] text-slate-400">
                      Nº de Conta: <span className="font-mono text-slate-600 font-bold">{acc.accountNumber}</span>
                    </div>
                  )}
                  {acc.notes && (
                    <div className="text-[10px] text-slate-400 italic truncate">
                      {acc.notes}
                    </div>
                  )}
                </div>

                {!readOnly && !acc.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(acc.id)}
                    className="mt-2 text-[10px] text-[hsl(var(--primary))] font-bold hover:underline block"
                  >
                    Marcar como conta principal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Adicionar Conta */}
      {modalAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[hsl(var(--primary))]">
                  Sistema Bancário Angolano
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {isCompany ? 'Nova Conta da OSDEL' : 'Nova Conta Bancária'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAdd(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              {/* Seleção do Banco */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  1. Seleccionar o Banco de Angola:
                </label>
                <select
                  value={form.bankCode}
                  onChange={(e) => handleBankSelect(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-800 outline-none focus:border-[hsl(var(--primary))]"
                >
                  {ANGOLAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.shortName} - {b.fullName} (Cód: {b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Titular da Conta */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  2. Nome do Titular da Conta (Pessoa ou Empresa):
                </label>
                <input
                  type="text"
                  required
                  value={form.accountHolder}
                  onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
                  placeholder={isCompany ? 'OSDEL TECNOLOGIA, LDA' : 'Nome Completo conforme no Banco'}
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-slate-800 outline-none focus:border-[hsl(var(--primary))]"
                />
              </div>

              {/* IBAN Angolano */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">3. Número de IBAN Angolano (AO06...):</label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {form.iban.replace(/[^A-Za-z0-9]/g, '').length}/25 carateres
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={form.iban}
                  onChange={(e) => handleIbanInput(e.target.value)}
                  placeholder="AO06.0040.0000.1234.5678.9012.3"
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 font-mono font-bold text-slate-800 outline-none focus:border-[hsl(var(--primary))]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  O código do banco seleccionado (<b className="font-mono">{form.bankCode}</b>) deve coincidir com os 4 dígitos após AO06.
                </p>
              </div>

              {/* Número de Conta e Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nº de Conta (Opcional):</label>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    placeholder="Ex: 1234567810"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 font-mono text-slate-800 outline-none focus:border-[hsl(var(--primary))]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Conta:</label>
                  <select
                    value={form.accountType}
                    onChange={(e) => setForm({ ...form, accountType: e.target.value as any })}
                    className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 outline-none focus:border-[hsl(var(--primary))]"
                  >
                    <option value="salario">Conta Salário</option>
                    <option value="corrente">Conta À Ordem / Corrente</option>
                    <option value="poupanca">Conta Poupança</option>
                    <option value="operacional">Operacional Empresa</option>
                  </select>
                </div>
              </div>

              {/* Opção Padrão */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-default-bank"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[hsl(var(--primary))]"
                />
                <label htmlFor="chk-default-bank" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Definir como conta principal / padrão
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalAdd(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-bold hover:brightness-110 shadow-sm flex items-center gap-1.5 transition"
                >
                  <Check size={14} /> Guardar Conta Bancária
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
