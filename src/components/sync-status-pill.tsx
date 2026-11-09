import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Cloud, CloudOff, Check } from 'lucide-react';
import { useOnlineSync } from '@/hooks/use-online-sync';
import { SyncCenterModal } from '@/components/sync-center-modal';

export const SyncStatusPill: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, isSimulated, lastSyncTime, syncNow } = useOnlineSync();
  const [modalOpen, setModalOpen] = useState(false);
  const [justSyncedBanner, setJustSyncedBanner] = useState<string | null>(null);
  const [timeAgo, setTimeAgo] = useState<string>('há momentos');

  // Calcula tempo relativo da última sincronização
  useEffect(() => {
    const updateTime = () => {
      if (!lastSyncTime) {
        setTimeAgo('agora');
        return;
      }
      const diffMs = Date.now() - new Date(lastSyncTime).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);

      if (diffSec < 45) setTimeAgo('há momentos');
      else if (diffMin === 1) setTimeAgo('há 1 min');
      else if (diffMin < 60) setTimeAgo(`há ${diffMin} min`);
      else setTimeAgo(new Date(lastSyncTime).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  // Alerta discreto quando dados chegam silenciosamente da nuvem
  useEffect(() => {
    const handleCloudSync = (e: any) => {
      const { receivedCounts, sentCount } = e.detail || {};
      const clientsCount = receivedCounts?.clients || 0;
      if (clientsCount > 0 || sentCount > 0) {
        setJustSyncedBanner(
          clientsCount > 0
            ? `Nuvem sincronizada (${clientsCount} ${clientsCount === 1 ? 'cliente' : 'clientes'} em dia)`
            : 'Dados locais sincronizados com a nuvem!'
        );
        const t = setTimeout(() => setJustSyncedBanner(null), 3500);
        return () => clearTimeout(t);
      }
    };

    const handleCompleted = (e: any) => {
      const { syncedCount } = e.detail || {};
      if (syncedCount > 0) {
        setJustSyncedBanner(`${syncedCount} ${syncedCount === 1 ? 'operação enviada' : 'operações enviadas'} para a nuvem!`);
        const t = setTimeout(() => setJustSyncedBanner(null), 3500);
        return () => clearTimeout(t);
      }
    };

    window.addEventListener('osdel-data-synced-from-cloud', handleCloudSync);
    window.addEventListener('osdel-sync-completed', handleCompleted);
    return () => {
      window.removeEventListener('osdel-data-synced-from-cloud', handleCloudSync);
      window.removeEventListener('osdel-sync-completed', handleCompleted);
    };
  }, []);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setModalOpen(true)}
          title="Clique para detalhes da sincronização e diagnóstico na nuvem"
          className={`group relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs ${
            isSyncing
              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
              : !isOnline
              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/25'
              : pendingCount > 0
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-400/30 hover:bg-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
          }`}
        >
          {isSyncing ? (
            <>
              <RefreshCw size={13} className="animate-spin text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">A sincronizar...</span>
              <span className="sm:hidden">Sync</span>
            </>
          ) : !isOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
              </span>
              <WifiOff size={13} className="text-amber-600 dark:text-amber-400" />
              <span className="font-extrabold">Offline</span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-600 text-white px-1.5 py-0.2 text-[10px] font-black">
                  {pendingCount}
                </span>
              )}
              {isSimulated && (
                <span className="hidden md:inline text-[10px] opacity-75 font-normal">(Simulado)</span>
              )}
            </>
          ) : pendingCount > 0 ? (
            <>
              <CloudOff size={13} className="text-amber-600" />
              <span>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <Cloud size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Online</span>
              <span className="hidden md:inline text-[11px] font-medium opacity-80">· {timeAgo}</span>
            </>
          )}
        </button>

        {/* Botão de disparo manual rápido 1-click */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            syncNow();
          }}
          disabled={isSyncing}
          title="Sincronizar imediatamente agora com o PythonAnywhere"
          className="h-7 w-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={12} className={isSyncing ? 'animate-spin text-blue-600' : ''} />
        </button>
      </div>

      {/* Alerta flutuante discreto ao concluir sincronização silenciosa */}
      {justSyncedBanner && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 backdrop-blur text-white px-4 py-2.5 shadow-2xl border border-emerald-500/40 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-full bg-emerald-500/20 p-1 text-emerald-400">
            <Check size={14} />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-emerald-300">{justSyncedBanner}</p>
          </div>
        </div>
      )}

      {modalOpen && <SyncCenterModal onClose={() => setModalOpen(false)} />}
    </>
  );
};
