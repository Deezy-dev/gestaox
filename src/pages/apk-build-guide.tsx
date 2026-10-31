import { useState } from 'react';
import {
  FileCode,
  Terminal,
  Smartphone,
  Server,
  Download,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  Globe,
  Settings,
  AlertTriangle,
  Sparkles,
  Monitor,
  Printer,
} from 'lucide-react';
import {
  getApiBaseUrl,
  setCustomApiBaseUrl,
  resetApiBaseUrl,
  isUsingCustomApi,
} from '@/lib/api-config';
import { Link } from 'wouter';

export function ApkBuildGuidePage() {
  const [currentApiUrl, setCurrentApiUrl] = useState<string>(getApiBaseUrl());
  const [tempApiUrl, setTempApiUrl] = useState<string>(getApiBaseUrl());
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomApiBaseUrl(tempApiUrl);
    setCurrentApiUrl(tempApiUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetApi = () => {
    resetApiBaseUrl();
    const def = getApiBaseUrl();
    setTempApiUrl(def);
    setCurrentApiUrl(def);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const capacitorConfigClient = `{
  "appId": "com.osdel.cliente",
  "appName": "OSDEL Cliente",
  "webDir": "dist",
  "server": {
    "url": "${currentApiUrl}",
    "cleartext": true
  }
}`;

  const capacitorConfigStaff = `{
  "appId": "com.osdel.equipa",
  "appName": "OSDEL Equipa",
  "webDir": "dist",
  "server": {
    "url": "${currentApiUrl}",
    "cleartext": true
  }
}`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div>
        <p className="eyebrow">Engenharia & Distribuição Mobile</p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight sm:text-[2.5rem]">
          Guia de Build dos Aplicativos em APK
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[hsl(var(--muted-foreground))]">
          Instruções práticas para compilar o <b>App do Cliente</b> e o <b>App da Empresa</b> em ficheiros <code>.apk</code> para Android, além de gerir a variável central de API para quando hospedar o backend.
        </p>
      </div>

      {/* SECTION 1: VARIÁVEL CENTRAL DE API */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
            <Server size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Passo 1: Endereço do Servidor
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Configuração da Variável Central de API
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Como solicitado, o link das APIs do sistema fica armazenado num arquivo centralizado: <code>src/lib/api-config.ts</code>. Quando decidir onde hospedar o sistema (exemplo: VPS própria, Cloud Run, cPanel, Supabase ou servidor local na central da OSDEL), basta alterar este endereço e todos os aplicativos (web e móveis) passarão a comunicar com a sua nova hospedagem.
        </p>

        {/* Interactive URL Editor */}
        <form onSubmit={handleSaveApiUrl} className="rounded-xl bg-slate-50 p-4 border border-slate-200/70 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-700">
              URL Base das APIs da OSDEL (Guarde ou edite aqui):
            </label>
            {isUsingCustomApi() && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                URL Personalizada Activa
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Globe size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={tempApiUrl}
                onChange={(e) => setTempApiUrl(e.target.value)}
                placeholder="https://api.osdel.ao ou http://192.168.1.100:3000"
                className="w-full h-9 rounded-lg border border-slate-300 pl-9 pr-3 text-xs font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-[hsl(var(--primary))] text-white text-xs font-bold hover:brightness-110 shadow-sm"
              >
                Guardar Nova URL
              </button>
              <button
                type="button"
                onClick={handleResetApi}
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100"
              >
                Repor Padrão
              </button>
            </div>
          </div>

          {saveSuccess && (
            <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> URL da API actualizada com sucesso no sistema e nos APKs!
            </div>
          )}

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
            <span>Onde editar manualmente no código:</span>
            <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-800 font-mono">
              src/lib/api-config.ts
            </code>
          </div>
        </form>
      </div>

      {/* SECTION 2: COMO GERAR O APK (MÉTODO CAPACITOR OFICIAL) */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white">
            <Smartphone size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Passo 2: Compilação Android
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Como Converter em APK Nativo com o Capacitor
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          O <b>Capacitor</b> (desenvolvido pela equipa do Ionic) é o padrão da indústria para empacotar aplicações React/Vite em APKs nativos do Android com total suporte a câmara, notificações push e armazenamento local no dispositivo.
        </p>

        {/* Steps */}
        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <b className="text-slate-900 text-sm flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white text-xs font-bold">1</span>
                Instalar as dependências do Capacitor
              </b>
              <button
                onClick={() =>
                  handleCopy(
                    'npm install @capacitor/core @capacitor/cli @capacitor/android',
                    'step1',
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                {copiedSection === 'step1' ? <Check size={13} /> : <Copy size={13} />} Copiar
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
              npm install @capacitor/core @capacitor/cli @capacitor/android
            </pre>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <b className="text-slate-900 text-sm flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white text-xs font-bold">2</span>
                Gerar o Build de Produção
              </b>
              <button
                onClick={() => handleCopy('npm run build', 'step2')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                {copiedSection === 'step2' ? <Check size={13} /> : <Copy size={13} />} Copiar
              </button>
            </div>
            <p className="text-slate-600 text-[11px]">
              Gera os ficheiros estáticos optimizados na pasta <code>dist/</code>:
            </p>
            <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
              npm run build
            </pre>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <b className="text-slate-900 text-sm flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white text-xs font-bold">3</span>
                Inicializar e Adicionar a Plataforma Android
              </b>
              <button
                onClick={() =>
                  handleCopy(
                    'npx cap add android\nnpx cap sync',
                    'step3',
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                {copiedSection === 'step3' ? <Check size={13} /> : <Copy size={13} />} Copiar
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
              npx cap add android{'\n'}npx cap sync
            </pre>
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <b className="text-slate-900 text-sm flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white text-xs font-bold">4</span>
                Abrir no Android Studio e Gerar o Ficheiro .APK
              </b>
              <button
                onClick={() => handleCopy('npx cap open android', 'step4')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                {copiedSection === 'step4' ? <Check size={13} /> : <Copy size={13} />} Copiar
              </button>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
              npx cap open android
            </pre>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              No menu superior do Android Studio: vá a <b>Build</b> → <b>Build Bundle(s) / APK(s)</b> → <b>Build APK(s)</b>. Em menos de 2 minutos terá o ficheiro <code>app-debug.apk</code> ou <code>app-release.apk</code> pronto na pasta <code>android/app/build/outputs/apk/</code> para distribuir por WhatsApp aos técnicos e clientes!
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: FICHEIROS DE CONFIGURAÇÃO PRONTOS */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Config 1: App Cliente */}
        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-5 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <b className="text-slate-900 font-bold">capacitor.config.json (App Cliente)</b>
            <button
              onClick={() => handleCopy(capacitorConfigClient, 'confClient')}
              className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
            >
              {copiedSection === 'confClient' ? <Check size={12} /> : <Copy size={12} />} Copiar JSON
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
            {capacitorConfigClient}
          </pre>
        </div>

        {/* Config 2: App Equipa */}
        <div className="surface rounded-2xl border border-[hsl(var(--border))] p-5 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <b className="text-slate-900 font-bold">capacitor.config.json (App Equipa)</b>
            <button
              onClick={() => handleCopy(capacitorConfigStaff, 'confStaff')}
              className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline"
            >
              {copiedSection === 'confStaff' ? <Check size={12} /> : <Copy size={12} />} Copiar JSON
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
            {capacitorConfigStaff}
          </pre>
        </div>
      </div>

      {/* SECTION 4: MÉTODO ALTERNATIVO ULTRA RÁPIDO (PWABUILDER / SEM ANDROID STUDIO) */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-amber-500" size={18} />
          <b className="text-sm font-bold text-slate-900">
            Alternativa Sem Instalar Android Studio (PWABuilder / Bubblewrap)
          </b>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Se não tiver o Android Studio instalado no computador, pode gerar o APK diretamente no navegador utilizando o serviço oficial da Microsoft <b>PWABuilder (pwabuilder.com)</b>:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-slate-700">
          <li>Publique a aplicação ou use a URL de partilha pública do AI Studio.</li>
          <li>Aceda a <b>https://www.pwabuilder.com</b> e cole o link da aplicação.</li>
          <li>Clique em <b>Package for Android</b>. O sistema gera automaticamente o arquivo APK assinado para download imediato!</li>
        </ol>
      </div>

      {/* SECTION 5: APLICATIVO DESKTOP ELECTRON (.EXE PARA WINDOWS) */}
      <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white">
            <Monitor size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Ambiente Desktop Windows
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Aplicativos Desktop Electron (Dois Executáveis .exe: Fibra e TV)
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          O aplicativo desktop em <b>Electron</b> é dividido em <b>dois ficheiros .exe independentes</b> (um para Internet Fibra FTTH e outro para TV), ambos executando 100% do sistema oficial com todas as tabelas, modais, dados reais e integração nativa com impressoras térmicas POS (80mm/58mm) e facturas A4.
        </p>

        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          {/* Card 1: Fibra */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              Edição Fibra Óptica
            </span>
            <b className="text-slate-900 block font-bold">1. Gerar .exe de Fibra:</b>
            <pre className="p-2 rounded bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
              npm run electron:build:fibra
            </pre>
            <p className="text-[11px] text-slate-600">
              Ou clique em <code>build_fibra_exe.bat</code>. Gera <code>OSDEL_Fibra_Desktop_Setup_1.0.0.exe</code>.
            </p>
          </div>

          {/* Card 2: TV */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
              Edição TV
            </span>
            <b className="text-slate-900 block font-bold">2. Gerar .exe de TV:</b>
            <pre className="p-2 rounded bg-slate-900 text-amber-400 font-mono text-[11px] overflow-x-auto">
              npm run electron:build:tv
            </pre>
            <p className="text-[11px] text-slate-600">
              Ou clique em <code>build_tv_exe.bat</code>. Gera <code>OSDEL_TV_Desktop_Setup_1.0.0.exe</code>.
            </p>
          </div>

          {/* Card 3: Ambos */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
              Ambos os Executáveis
            </span>
            <b className="text-slate-900 block font-bold">3. Compilar Ambos (.exe):</b>
            <pre className="p-2 rounded bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto">
              npm run electron:build:both
            </pre>
            <p className="text-[11px] text-slate-600">
              Ou clique em <code>build_both_exe.bat</code>. Compila os dois instaladores e portáteis.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-[hsl(var(--border))]">
        <Link
          href="/mobile"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          ← Voltar ao Hub Mobile
        </Link>
        <Link
          href="/missoes"
          className="inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--primary))] hover:underline"
        >
          Ver Missões de Piquete →
        </Link>
      </div>
    </div>
  );
}
