import React, { useState } from 'react';
import { WifiOff, RefreshCw, Eye, ShieldAlert } from 'lucide-react';
import { useOnlineSync } from '@/hooks/use-online-sync';
import { SyncCenterModal } from '@/components/sync-center-modal';

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, syncNow, isSimulated } = useOnlineSync();
  const [modalOpen, setModalOpen] = useState(false);

  if (isOnline) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-4 py-2.5 shadow-md print:hidden">
        <div className="mx-auto max-w-[1480px] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-white/20 p-1">
              <WifiOff size={15} className="animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold tracking-wide uppercase text-[10px] bg-amber-900/50 px-2 py-0.5 rounded-full mr-2">
                {isSimulated ? 'Modo Offline Simulado' : 'Modo Offline Activo'}
              </span>
              <span className="font-medium">
                O sistema continua 100% operacional no seu dispositivo. Clientes, pagamentos, ordens e fechos serão guardados e sincronizados automaticamente assim que voltar a ter rede.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="rounded-lg bg-black/30 px-2.5 py-1 text-[11px] font-bold">
                {pendingCount} {pendingCount === 1 ? 'operação em espera' : 'operações em espera'}
              </span>
            )}

            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1 text-[11px] font-bold hover:bg-white/25 transition cursor-pointer"
            >
              <Eye size={13} />
              <span>Ver Fila</span>
            </button>

            <button
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white text-amber-900 px-3 py-1 text-[11px] font-extrabold hover:bg-amber-50 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'A tentar...' : 'Testar Conexão'}</span>
            </button>
          </div>
        </div>
      </div>

      {modalOpen && <SyncCenterModal onClose={() => setModalOpen(false)} />}
    </>
  );
};
