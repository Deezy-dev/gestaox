import { type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

export const kz = (value: unknown) =>
  new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace('AOA', 'Kz');

export const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-AO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : '—';

export const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('pt-AO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'OS';

export const serviceLabel = (service?: string) =>
  service === 'combo' ? 'TV + Internet' : service === 'internet' ? 'Internet Fibra' : 'TV';

export function Button({
  children,
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  testId,
  form,
  title,
}: {
  children: ReactNode;
  variant?: 'primary' | 'quiet' | 'outline' | 'danger';
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
  testId?: string;
  form?: string;
  title?: string;
}) {
  const styles = {
    primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-110 shadow-sm',
    quiet: 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))]',
    outline:
      'border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] shadow-xs',
    danger: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:brightness-110',
  };

  return (
    <button
      data-testid={testId}
      form={form}
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-bold text-[hsl(var(--foreground))]">{label}</span>
      {children}
      {hint && <small className="block text-[11px] text-[hsl(var(--muted-foreground))]">{hint}</small>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      autoComplete={props.autoComplete || (props.type === 'password' ? 'current-password' : undefined)}
      className={`h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none transition focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.15)] ${
        props.className || ''
      }`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 text-sm outline-none focus:border-[hsl(var(--primary))] bg-[hsl(var(--card))] ${
        props.className || ''
      }`}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] ${
        props.className || ''
      }`}
    />
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const colors = {
    good: 'bg-[#dceee5] text-[#237052]',
    warn: 'bg-[#f7e9c9] text-[#946c22]',
    bad: 'bg-[#f8e1da] text-[#a24e3a]',
    neutral: 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${colors[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function Status({ value }: { value?: string }) {
  const label: Record<string, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    late: 'Em atraso',
    suspended: 'Suspenso',
    paid: 'Pago',
    pending: 'Pendente',
    pendente: 'Pendente',
    em_curso: 'Em Curso',
    concluida: 'Concluída',
    cancelada: 'Cancelada',
    installed: 'Instalado',
    recovered: 'Recolhido',
    damaged: 'Danificado',
  };

  const tone =
    value === 'active' || value === 'paid' || value === 'concluida' || value === 'installed'
      ? 'good'
      : value === 'late' || value === 'pending' || value === 'pendente' || value === 'em_curso'
      ? 'warn'
      : value === 'suspended' || value === 'inactive' || value === 'cancelada' || value === 'damaged'
      ? 'bad'
      : 'neutral';

  return <Badge tone={tone}>{label[value || ''] || value || '—'}</Badge>;
}

export function Modal({
  title,
  eyebrow = 'Registo',
  children,
  onClose,
  maxWidth = 'max-w-2xl',
  printable = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  printable?: boolean;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-[#142f35]/45 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        printable
          ? 'print:fixed print:inset-0 print:bg-white print:z-[9999] print:p-0 print:m-0 print:overflow-visible print:block printable-modal-overlay'
          : 'print:hidden'
      }`}
    >
      <div
        className={`max-h-[92dvh] w-full ${maxWidth} overflow-auto rounded-t-2xl bg-[hsl(var(--card))] shadow-2xl sm:rounded-2xl ${
          printable
            ? 'print:max-h-none print:shadow-none print:rounded-none print:border-none print:bg-white print:text-black print:overflow-visible print:w-full print:max-w-none print:p-0 modal-printable-container'
            : ''
        }`}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.96)] px-5 py-4 backdrop-blur sm:px-7 print:hidden">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-1 font-serif text-2xl">{title}</h2>
          </div>
          <button
            aria-label="Fechar janela"
            data-testid="button-close-modal"
            onClick={onClose}
            className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] cursor-pointer print:hidden"
          >
            <X size={19} />
          </button>
        </header>
        <div className="p-5 sm:p-7 print:p-0 print:m-0">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end print:hidden">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.6rem]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{detail}</p>
      </div>
      {action}
    </div>
  );
}
