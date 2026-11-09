import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Scissors,
  CheckCircle2,
  X,
  FileText,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  subscribeToPushNotifications,
  type MobilePushNotification,
  markPushAsRead,
} from '@/lib/mobile-push';

export function MobilePushBanner({ onActionClick }: { onActionClick?: (notif: MobilePushNotification) => void }) {
  const [activePush, setActivePush] = useState<MobilePushNotification | null>(null);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const unsubscribe = subscribeToPushNotifications((notif) => {
      setActivePush(notif);
      setProgress(100);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!activePush) return;

    // Barra de progresso para fechar após 6 segundos
    const stepTime = 60; // ms
    const totalTime = 6000;
    const decrement = (stepTime / totalTime) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= decrement) {
          clearInterval(interval);
          setActivePush(null);
          return 0;
        }
        return prev - decrement;
      });
    }, stepTime);

    return () => clearInterval(interval);
  }, [activePush]);

  if (!activePush) return null;

  const getCategoryTheme = (cat: MobilePushNotification['category']) => {
    switch (cat) {
      case 'corte_fibra':
        return {
          bg: 'bg-red-950/95 border-red-500/50 text-white',
          badge: 'bg-red-600 text-white',
          icon: Scissors,
          accent: 'text-red-400',
        };
      case 'fatura':
        return {
          bg: 'bg-amber-950/95 border-amber-500/50 text-white',
          badge: 'bg-amber-500 text-slate-900',
          icon: Bell,
          accent: 'text-amber-400',
        };
      case 'pagamento':
        return {
          bg: 'bg-emerald-950/95 border-emerald-500/50 text-white',
          badge: 'bg-emerald-600 text-white',
          icon: CheckCircle2,
          accent: 'text-emerald-400',
        };
      case 'piquete':
        return {
          bg: 'bg-blue-950/95 border-blue-500/50 text-white',
          badge: 'bg-blue-600 text-white',
          icon: ShieldCheck,
          accent: 'text-blue-400',
        };
      default:
        return {
          bg: 'bg-slate-900/95 border-slate-700 text-white',
          badge: 'bg-slate-700 text-slate-200',
          icon: Bell,
          accent: 'text-slate-300',
        };
    }
  };

  const theme = getCategoryTheme(activePush.category);
  const Icon = theme.icon;

  const handleClose = () => {
    if (activePush) markPushAsRead(activePush.id);
    setActivePush(null);
  };

  const handleAction = () => {
    if (activePush) {
      markPushAsRead(activePush.id);
      if (onActionClick) onActionClick(activePush);
    }
    setActivePush(null);
  };

  return (
    <div className="fixed top-2 left-2 right-2 z-[999] max-w-md mx-auto animate-in slide-in-from-top-4 duration-300">
      <div
        className={`rounded-2xl p-3.5 shadow-2xl border backdrop-blur-md transition-all ${theme.bg}`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 shrink-0 text-white">
              <Icon size={18} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${theme.badge}`}>
                  {activePush.category.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-white/60">Agora</span>
              </div>

              <h4 className="text-xs font-black text-white leading-tight truncate">
                {activePush.title}
              </h4>
              <p className="text-[11px] text-white/80 leading-snug line-clamp-2 mt-0.5">
                {activePush.body}
              </p>

              {activePush.actionLabel && (
                <button
                  type="button"
                  onClick={handleAction}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] font-extrabold text-white transition"
                >
                  <span>{activePush.actionLabel}</span>
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="text-white/60 hover:text-white p-1 rounded-lg"
          >
            <X size={15} />
          </button>
        </div>

        {/* Barra de Expiração */}
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-2.5">
          <div
            className="h-full bg-white/40 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
