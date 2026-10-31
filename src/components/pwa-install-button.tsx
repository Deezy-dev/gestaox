import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

interface PWAInstallButtonProps {
  variant?: 'header' | 'compact' | 'modal' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedNotice, setInstalledNotice] = useState(false);

  // If already running inside standalone PWA
  if (isInstalled) {
    if (variant === 'modal') {
      return (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Check size={16} className="text-emerald-600" />
          <span>Aplicativo PWA já instalado e a correr em modo nativo</span>
        </div>
      );
    }
    return null;
  }

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setInstalledNotice(true);
      setTimeout(() => setInstalledNotice(false), 4000);
    }
  };

  // Android, Chrome, Edge, Desktop prompt
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          onClick={handleInstall}
          title="Instalar App no Telemóvel ou Computador para acesso sem internet"
          className={`inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-sm hover:brightness-110 transition cursor-pointer ${className}`}
        >
          <Download size={14} />
          <span>Instalar App</span>
        </button>
      );
    }

    return (
      <>
        <button
          onClick={handleInstall}
          title="Instalar OSDEL Gestão no Computador ou Telemóvel para funcionamento 100% offline"
          className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-blue-500 hover:to-indigo-500 transition cursor-pointer ${className}`}
        >
          <Download size={15} />
          <span>Instalar no Dispositivo</span>
        </button>
        {installedNotice && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-emerald-700 text-white p-4 shadow-xl text-xs font-bold flex items-center gap-2">
            <Check size={18} />
            Aplicação instalada com sucesso no seu dispositivo!
          </div>
        )}
      </>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition cursor-pointer ${className}`}
        >
          <Smartphone size={14} />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-[hsl(var(--card))] p-6 shadow-2xl border border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-serif font-bold text-[hsl(var(--foreground))]">
                  Instalar no iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-[hsl(var(--foreground))]">
                <p className="text-[hsl(var(--muted-foreground))]">
                  Para aceder à OSDEL mesmo sem sinal de rede ou internet:
                </p>
                <div className="rounded-xl bg-[hsl(var(--secondary)/.7)] p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Toque no botão de <b>Partilha</b> no Safari (ícone com quadrado e seta para cima).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Desça na lista e seleccione <b>«Adicionar ao Ecrã Principal»</b>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Confirme em <b>Adicionar</b>. O ícone oficial da OSDEL ficará disponível mesmo offline!</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[hsl(var(--primary))] py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:brightness-110 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
