import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  DollarSign,
  Calendar,
  X,
  CheckCheck,
} from 'lucide-react';
import {
  getStoredNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  type SystemNotification,
} from '@/lib/notifications';
import { Link, useLocation } from 'wouter';

interface NotificationsModalProps {
  onClose: () => void;
}

export function NotificationsModal({ onClose }: NotificationsModalProps) {
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => getStoredNotifications());
  const [filter, setFilter] = useState<'todas' | 'acordo' | 'emprestimo' | 'avaria' | 'missao' | 'corte' | 'financeiro'>('todas');

  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(getStoredNotifications());
    };
    window.addEventListener('osdel-notifications-updated', handleUpdate);
    return () => window.removeEventListener('osdel-notifications-updated', handleUpdate);
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === 'todas') return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    markAllAsRead();
    setNotifications(getStoredNotifications());
  };

  const handleItemClick = (n: SystemNotification) => {
    if (!n.read) {
      markAsRead(n.id);
      setNotifications(getStoredNotifications());
    }
    if (n.link) {
      onClose();
      setLocation(n.link);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
    setNotifications(getStoredNotifications());
  };

  const getIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'acordo':
        return <ShieldCheck className="text-emerald-500" size={18} />;
      case 'emprestimo':
        return <DollarSign className="text-blue-500" size={18} />;
      case 'avaria':
        return <Wrench className="text-amber-500" size={18} />;
      case 'missao':
        return <Calendar className="text-purple-500" size={18} />;
      case 'corte':
        return <AlertTriangle className="text-rose-500" size={18} />;
      case 'financeiro':
        return <DollarSign className="text-emerald-500" size={18} />;
      default:
        return <Bell className="text-blue-500" size={18} />;
    }
  };

  const formatTime = (iso: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
      if (diff < 1) return 'Agora mesmo';
      if (diff < 60) return `Há ${diff} min`;
      const hours = Math.floor(diff / 60);
      if (hours < 24) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
      return new Date(iso).toLocaleDateString('pt-AO');
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142f35]/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90dvh] w-full max-w-xl overflow-hidden rounded-2xl bg-[hsl(var(--card))] shadow-2xl border border-[hsl(var(--border))] flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.98)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center relative">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">Central de Notificações</h3>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {unreadCount > 0 ? `${unreadCount} alerta(s) não lido(s)` : 'Todas as notificações em dia'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 rounded-lg bg-[hsl(var(--secondary))] px-2.5 py-1 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                title="Marcar todas como lidas"
              >
                <CheckCheck size={14} /> Marcar lidas
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-5 py-2.5 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)]">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'acordo', label: 'Acordos Clientes' },
            { id: 'emprestimo', label: 'Empréstimos Técnicos' },
            { id: 'avaria', label: 'Avarias' },
            { id: 'missao', label: 'Missões' },
            { id: 'corte', label: 'Cortes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold shrink-0 transition ${
                filter === tab.id
                  ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                  : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[60vh]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-[hsl(var(--muted-foreground))]">
              <Bell size={28} className="mx-auto mb-2 opacity-30" />
              Nenhuma notificação encontrada nesta categoria.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group relative rounded-xl border p-3.5 transition cursor-pointer flex items-start gap-3 ${
                  item.read
                    ? 'border-[hsl(var(--border))] bg-[hsl(var(--card))] opacity-85 hover:bg-[hsl(var(--secondary)/.3)]'
                    : 'border-blue-500/30 bg-blue-500/5 shadow-sm hover:bg-blue-500/10'
                }`}
              >
                <div className="mt-0.5 shrink-0 rounded-lg bg-[hsl(var(--secondary))] p-2">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-bold truncate ${item.read ? 'text-[hsl(var(--foreground))]' : 'text-blue-600 font-extrabold'}`}>
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] shrink-0 font-medium">
                      {formatTime(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed line-clamp-2">
                    {item.message}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        item.priority === 'urgente'
                          ? 'bg-rose-500/15 text-rose-600'
                          : item.priority === 'alta'
                          ? 'bg-amber-500/15 text-amber-700'
                          : 'bg-slate-500/15 text-slate-600'
                      }`}
                    >
                      {item.priority}
                    </span>

                    {item.link && (
                      <span className="text-[10px] text-[hsl(var(--primary))] font-bold flex items-center gap-0.5 group-hover:underline">
                        Abrir módulo <ExternalLink size={10} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => handleDelete(e, item.id)}
                  title="Eliminar notificação"
                  className="absolute top-3 right-3 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 hover:text-rose-600 transition p-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
