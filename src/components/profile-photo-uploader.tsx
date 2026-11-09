import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import {
  Camera,
  UploadCloud,
  Trash2,
  Check,
  AlertCircle,
  Link2,
  FolderUp,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';

interface ProfilePhotoUploaderProps {
  currentPhotoUrl?: string;
  onChange: (photoUrl: string) => void;
  label?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Resizes and center-crops an uploaded image file into a square avatar data URL.
 * Keeps payload lightweight (~25-50KB) to prevent exceeding localStorage quotas.
 */
export function fileToCompressedAvatar(file: File, maxSize = 380, quality = 0.85): Promise<{ dataUrl: string; originalSize: number; compressedSize: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O ficheiro selecionado não é uma imagem válida (use JPG, PNG ou WebP).'));
      return;
    }

    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        const targetDim = Math.min(maxSize, minDim);
        canvas.width = targetDim;
        canvas.height = targetDim;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = e.target?.result as string;
          resolve({ dataUrl: raw, originalSize, compressedSize: raw.length });
          return;
        }

        // Draw center-cropped square
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedSize = Math.round((dataUrl.length * 3) / 4);
        resolve({ dataUrl, originalSize, compressedSize });
      };
      img.onerror = () => reject(new Error('Erro ao decodificar os dados da imagem.'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Não foi possível ler o ficheiro a partir deste dispositivo.'));
    reader.readAsDataURL(file);
  });
}

const PRESET_AVATARS = [
  { label: 'Director Executivo', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
  { label: 'Atendimento Feminino', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80' },
  { label: 'Técnico Especialista', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80' },
  { label: 'Técnico de Campo', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
  { label: 'Informático / NOC', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80' },
  { label: 'Gestora Comercial', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80' },
];

export function ProfilePhotoUploader({
  currentPhotoUrl = '',
  onChange,
  label = 'Foto de Perfil',
  hint = 'Pode importar uma foto do seu computador, telemóvel ou tablet (JPG, PNG ou WebP).',
}: ProfilePhotoUploaderProps) {
  const [tab, setTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState<{ name: string; size: string } | null>(null);
  const [urlInput, setUrlInput] = useState(currentPhotoUrl.startsWith('http') ? currentPhotoUrl : '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const result = await fileToCompressedAvatar(file);
      onChange(result.dataUrl);
      setFileStats({
        name: file.name,
        size: `${formatBytes(result.originalSize)} ➔ ${formatBytes(result.compressedSize)} (otimizada)`,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao importar a foto do dispositivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be picked again if desired
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemovePhoto = () => {
    onChange('');
    setFileStats(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Camera size={14} className="text-[hsl(var(--primary))]" />
          {label}
        </label>
        <div className="flex items-center gap-1 text-[11px] bg-slate-100 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`px-2.5 py-1 rounded font-bold transition ${
              tab === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Do Dispositivo
          </button>
          <button
            type="button"
            onClick={() => setTab('url')}
            className={`px-2.5 py-1 rounded font-bold transition ${
              tab === 'url' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Link URL
          </button>
          <button
            type="button"
            onClick={() => setTab('presets')}
            className={`px-2.5 py-1 rounded font-bold transition ${
              tab === 'presets' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Predefinidos
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60">
        {/* Preview Avatar Box */}
        <div className="relative group shrink-0">
          {currentPhotoUrl ? (
            <img
              src={currentPhotoUrl}
              alt="Pré-visualização"
              className="h-24 w-24 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-[hsl(var(--primary)/.2)] bg-white"
            />
          ) : (
            <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400">
              <ImageIcon size={28} strokeWidth={1.5} />
              <span className="text-[10px] font-bold mt-1 text-slate-400">Sem Foto</span>
            </div>
          )}

          {currentPhotoUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              title="Remover fotografia"
              className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* Action Panel Based on Tab */}
        <div className="flex-1 w-full">
          {tab === 'upload' && (
            <div className="space-y-3">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                  dragOver
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)] scale-[0.99]'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-[hsl(var(--primary))]">
                    <FolderUp size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isProcessing ? 'A otimizar foto...' : 'Clique para escolher ou arraste para aqui'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Ficheiro do computador, telemóvel ou tablet (PNG, JPG, WebP)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Mobile / Quick Select */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                >
                  <UploadCloud size={14} className="text-[hsl(var(--primary))]" />
                  Procurar no Dispositivo
                </button>

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                >
                  <Camera size={14} className="text-emerald-600" />
                  Tirar Foto com a Câmara
                </button>
              </div>

              {fileStats && (
                <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <Check size={14} className="shrink-0" />
                  <span className="truncate">
                    <b>{fileStats.name}</b> ({fileStats.size})
                  </span>
                </div>
              )}
            </div>
          )}

          {tab === 'url' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://exemplo.com/minha-foto.jpg"
                  className="flex-1 h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs outline-none focus:border-[hsl(var(--primary))]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (urlInput.trim()) {
                      onChange(urlInput.trim());
                    }
                  }}
                  className="px-3 py-1.5 bg-[hsl(var(--primary))] text-white text-xs font-bold rounded-lg hover:brightness-110 shadow-sm flex items-center gap-1"
                >
                  <Link2 size={13} /> Aplicar
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Cole o endereço web directo (URL) de uma fotografia alojada na internet.
              </p>
            </div>
          )}

          {tab === 'presets' && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Seleccione um avatar profissional predefinido:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_AVATARS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    title={p.label}
                    onClick={() => {
                      onChange(p.url);
                      setUrlInput(p.url);
                    }}
                    className={`relative rounded-xl overflow-hidden border-2 transition hover:scale-105 ${
                      currentPhotoUrl === p.url ? 'border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary)/.3)]' : 'border-slate-200'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="h-14 w-full object-cover" />
                    {currentPhotoUrl === p.url && (
                      <div className="absolute inset-0 bg-[hsl(var(--primary)/.4)] flex items-center justify-center text-white">
                        <Check size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-200">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 mt-2">{hint}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Floating Avatar with direct click-to-upload button
 */
export function AvatarWithQuickUpload({
  photoUrl,
  name,
  onPhotoUploaded,
  size = 'lg',
}: {
  photoUrl?: string;
  name?: string;
  onPhotoUploaded: (newPhotoUrl: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [tempPhoto, setTempPhoto] = useState(photoUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-10 w-10 text-xs rounded-xl',
    md: 'h-14 w-14 text-sm rounded-xl',
    lg: 'h-20 w-20 text-lg rounded-2xl',
    xl: 'h-24 w-24 text-xl rounded-2xl',
  };

  const handleQuickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const res = await fileToCompressedAvatar(file);
        onPhotoUploaded(res.dataUrl);
      } catch (err: any) {
        alert(err.message || 'Erro ao carregar fotografia.');
      }
    }
    e.target.value = '';
  };

  const initials = (name || 'OS')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <div className="relative group inline-block">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleQuickFile}
          className="hidden"
        />

        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name || 'Foto'}
            className={`${sizeClasses[size]} object-cover border-2 border-white shadow-md ring-2 ring-[hsl(var(--primary)/.2)] bg-white`}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))] font-black flex items-center justify-center border-2 border-white shadow-sm`}
          >
            {initials}
          </div>
        )}

        {/* Hover Camera Overlay */}
        <button
          type="button"
          onClick={() => {
            setTempPhoto(photoUrl || '');
            setModalOpen(true);
          }}
          title="Importar ou alterar foto a partir do dispositivo"
          className="absolute inset-0 rounded-2xl bg-black/55 text-white opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1 backdrop-blur-[2px]"
        >
          <Camera size={20} />
          <span className="text-[9px] font-bold uppercase tracking-wider">Alterar</span>
        </button>

        {/* Badge on corner */}
        <button
          type="button"
          onClick={() => {
            setTempPhoto(photoUrl || '');
            setModalOpen(true);
          }}
          title="Importar foto de perfil"
          className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-[hsl(var(--primary))] text-white flex items-center justify-center shadow-md border-2 border-white hover:scale-110 transition"
        >
          <Camera size={12} />
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[hsl(var(--primary))]">
                  Foto do Perfil
                </span>
                <h3 className="text-xl font-bold text-slate-900">Importar Foto a partir do Dispositivo</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <ProfilePhotoUploader
              currentPhotoUrl={tempPhoto}
              onChange={(newUrl) => setTempPhoto(newUrl)}
              label="Fotografia Pessoal"
              hint="A foto é comprimida e gravada com segurança no seu navegador e perfil."
            />

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onPhotoUploaded(tempPhoto);
                  setModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-xs font-bold text-white hover:brightness-110 shadow-sm flex items-center gap-1.5 transition"
              >
                <Check size={15} /> Aplicar e Guardar Fotografia
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
