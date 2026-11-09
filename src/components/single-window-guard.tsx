import { useEffect, useState, type ReactNode } from 'react';
import { Layers, ShieldAlert, ArrowRight, ExternalLink } from 'lucide-react';

interface SingleWindowGuardProps {
  children: ReactNode;
}

export function SingleWindowGuard({ children }: SingleWindowGuardProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  useEffect(() => {
    // Se estiver em ambiente sem window (SSR)
    if (typeof window === 'undefined') return;

    // Gera identificador único desta janela/aba
    const myWindowId = `win_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem('osdel_current_window_id', myWindowId);

    let channel: BroadcastChannel | null = null;
    let heartbeatInterval: any = null;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('osdel_single_window_lock');
      }
    } catch {
      channel = null;
    }

    // Função para verificar se outra janela está viva no momento
    const checkActiveWindow = () => {
      const storedActiveId = localStorage.getItem('osdel_active_window_id');
      const lastHeartbeatStr = localStorage.getItem('osdel_active_window_heartbeat');
      const lastHeartbeat = lastHeartbeatStr ? parseInt(lastHeartbeatStr, 10) : 0;
      const now = Date.now();

      // Se o batimento for recente (menos de 4 segundos) e de outra janela, bloqueia esta!
      if (storedActiveId && storedActiveId !== myWindowId && (now - lastHeartbeat) < 4000) {
        setIsBlocked(true);
        setActiveWindowId(storedActiveId);
        return true;
      }

      // Caso contrário, esta janela torna-se a janela ativa
      claimActiveWindow();
      return false;
    };

    const claimActiveWindow = () => {
      setIsBlocked(false);
      localStorage.setItem('osdel_active_window_id', myWindowId);
      localStorage.setItem('osdel_active_window_heartbeat', Date.now().toString());

      if (channel) {
        channel.postMessage({
          type: 'CLAIM_ACTIVE_WINDOW',
          activeWindowId: myWindowId,
        });
      }
    };

    // Ouvinte do BroadcastChannel
    if (channel) {
      channel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        // Outra janela perguntou se há alguém ativo
        if (data.type === 'QUERY_ACTIVE_WINDOW') {
          const currentActive = localStorage.getItem('osdel_active_window_id');
          if (currentActive === myWindowId) {
            channel?.postMessage({
              type: 'CLAIM_ACTIVE_WINDOW',
              activeWindowId: myWindowId,
            });
          }
        }

        // Outra janela reivindicou ser a janela ativa
        if (data.type === 'CLAIM_ACTIVE_WINDOW' && data.activeWindowId !== myWindowId) {
          setIsBlocked(true);
          setActiveWindowId(data.activeWindowId);
        }

        // Outra janela forçou assumir o controlo ("Assumir Esta Janela")
        if (data.type === 'FORCE_TAKE_OVER' && data.newActiveWindowId !== myWindowId) {
          setIsBlocked(true);
          setActiveWindowId(data.newActiveWindowId);
        }

        // A janela ativa anterior foi fechada
        if (data.type === 'WINDOW_CLOSED' && data.closedWindowId === activeWindowId) {
          claimActiveWindow();
        }
      };

      // Pergunta se já existe alguma janela ativa
      channel.postMessage({
        type: 'QUERY_ACTIVE_WINDOW',
        senderId: myWindowId,
      });
    }

    // Executa verificação inicial
    checkActiveWindow();

    // Mantém batimento cardíaco da janela activa a cada 1.5 segundos
    heartbeatInterval = setInterval(() => {
      const currentActive = localStorage.getItem('osdel_active_window_id');
      if (currentActive === myWindowId) {
        localStorage.setItem('osdel_active_window_heartbeat', Date.now().toString());
      } else {
        const lastHeartbeat = parseInt(localStorage.getItem('osdel_active_window_heartbeat') || '0', 10);
        // Se a outra janela parou de responder há mais de 4.5s (fechada/travada), assume o controlo automaticamente
        if (Date.now() - lastHeartbeat > 4500) {
          claimActiveWindow();
        }
      }
    }, 1500);

    // Quando esta janela for fechada, liberta o bloqueio
    const handleUnload = () => {
      const currentActive = localStorage.getItem('osdel_active_window_id');
      if (currentActive === myWindowId) {
        localStorage.removeItem('osdel_active_window_id');
        localStorage.removeItem('osdel_active_window_heartbeat');
        if (channel) {
          channel.postMessage({
            type: 'WINDOW_CLOSED',
            closedWindowId: myWindowId,
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleUnload);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  const handleTakeOver = () => {
    const myWindowId = sessionStorage.getItem('osdel_current_window_id') || `win_${Date.now()}`;
    localStorage.setItem('osdel_active_window_id', myWindowId);
    localStorage.setItem('osdel_active_window_heartbeat', Date.now().toString());
    setIsBlocked(false);

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('osdel_single_window_lock');
        channel.postMessage({
          type: 'FORCE_TAKE_OVER',
          newActiveWindowId: myWindowId,
        });
        channel.close();
      }
    } catch {}
  };

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 select-none">
        <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 text-white">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10">
            <Layers size={32} />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 block mb-1">
              Segurança Operacional · Janela Única
            </span>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-white">
              Já Existe Uma Janela Aberta
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            O <b>OSDEL Gestão X</b> detectou que já tem uma janela deste sistema aberta e activa no seu computador.
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 text-left space-y-2 leading-relaxed">
            <div className="flex items-start gap-2">
              <ShieldAlert size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Para proteger a integridade dos lançamentos de caixa, emissão de faturas e evitar registos duplicados, o sistema não permite duas janelas abertas simultaneamente.
              </span>
            </div>
            <p className="pt-1 border-t border-slate-800/80 text-[10px] text-slate-500">
              Utilize a janela já aberta ou clique abaixo para fechar as outras e assumir esta janela.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleTakeOver}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition cursor-pointer"
            >
              <span>Assumir Esta Janela (Fechar Outras)</span>
              <ArrowRight size={15} />
            </button>
            <p className="text-[10px] text-slate-500">
              Dica: Fechar esta aba/janela manterá a anterior em pleno funcionamento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
