import { useState } from 'react';
import {
  Printer,
  Receipt,
  FileText,
  Sliders,
  CheckCircle2,
  Image as ImageIcon,
  HelpCircle,
  Sparkles,
  Scissors,
  Check,
} from 'lucide-react';
import { Field, Input, Button, Textarea } from '@/components/shared-ui';
import { getCompanyLogo } from '@/lib/company-logo';

interface ThermalPrinterTabProps {
  form: any;
  set: (key: string, value: any) => void;
  isAdmin: boolean;
}

export function ThermalPrinterTab({ form, set, isAdmin }: ThermalPrinterTabProps) {
  const [testPrinted, setTestPrinted] = useState(false);

  // Settings values with defaults
  const printerWidth = form.printerWidth || '80mm'; // '80mm' | '58mm'
  const printLogo = form.printThermalLogo ?? true;
  const logoContrast = form.thermalLogoContrast || 'alto'; // 'normal' | 'alto' | 'extremo'
  const autoCut = form.thermalAutoCut ?? true;
  const blankFeedLines = form.thermalFeedLines ?? 3;
  const footerMessage =
    form.thermalFooterMessage ||
    'Obrigado pela sua preferência!\nGuarde este talão como comprovativo e garantia de sinal.';
  const warningText =
    form.thermalWarningText ||
    'Atrasos superiores a 5 dias implicam suspensão imediata de sinal e cobrança de taxa de religação.';
  const printerName = form.thermalPrinterName || 'Epson TM-T20 / Bematech / POS-80';

  const handleTestPrint = () => {
    setTestPrinted(true);
    setTimeout(() => setTestPrinted(false), 3000);
    // Simular ou abrir janela de impressão do teste
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. CABEÇALHO & MODELO DA IMPRESSORA */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
            <Printer size={22} />
          </div>
          <div>
            <p className="eyebrow">Hardware de Facturação & Balcão</p>
            <h2 className="text-lg font-extrabold text-[hsl(var(--foreground))]">
              Configurações da Impressora Térmica POS & Talão de Factura
            </h2>
          </div>
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 leading-relaxed">
          Parametrize as impressoras térmicas não fiscais de talão contínuo (80mm e 58mm) utilizadas no caixa, na recepção e nos aplicativos executáveis (.exe).
          Permite activar o <b>logótipo nítido em tons de preto puro</b>, definir mensagens legais de rodapé e número de saltos de linha para corte automático da guilhotina.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Largura da Bobina */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              Formato de Papel / Bobina Térmica:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => isAdmin && set('printerWidth', '80mm')}
                className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                  printerWidth === '80mm'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                🧾 80mm Padrão
                <span className="block text-[10px] font-normal text-slate-500">Comum no balcão</span>
              </button>

              <button
                type="button"
                onClick={() => isAdmin && set('printerWidth', '58mm')}
                className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                  printerWidth === '58mm'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                🧾 58mm Compacto
                <span className="block text-[10px] font-normal text-slate-500">Impressora portátil</span>
              </button>
            </div>
          </div>

          {/* Nome / Identificador da Impressora */}
          <Field
            label="Identificador da Impressora Padrão"
            hint="Nome no Windows (Ex.: TM-T20, POS-80, Elgin)"
          >
            <Input
              type="text"
              value={printerName}
              onChange={(e) => set('thermalPrinterName', e.target.value)}
              disabled={!isAdmin}
            />
          </Field>

          {/* Linhas de salto antes do corte */}
          <Field
            label="Saltos de Linha Antes do Corte (Guilhotina)"
            hint="Evita que a guilhotina corte o texto do rodapé"
          >
            <Input
              type="number"
              min="1"
              max="8"
              value={blankFeedLines}
              onChange={(e) => set('thermalFeedLines', Number(e.target.value))}
              disabled={!isAdmin}
            />
          </Field>
        </div>
      </section>

      {/* 2. LOGÓTIPO & NITIDEZ TÉRMICA */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-blue-700">
            <ImageIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Logótipo Oficial no Talão Térmico
            </h3>
            <p className="text-[11px] text-slate-500">
              Controlo de exibição e conversão monocromática para cabeças de impressão de calor.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 items-center">
          <div className="space-y-4">
            {/* Toggle Logotipo */}
            <div
              onClick={() => isAdmin && set('printThermalLogo', !printLogo)}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition ${
                isAdmin ? 'cursor-pointer' : ''
              } ${printLogo ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}
            >
              <div>
                <b className="text-xs text-slate-900 block">
                  Imprimir Logótipo no Cabeçalho do Talão POS
                </b>
                <span className="text-[11px] text-slate-500">
                  Aplica contraste monocromático especial para não desbotar nem borrar na fita térmica.
                </span>
              </div>
              <div
                className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-200 shrink-0 ${
                  printLogo ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                    printLogo ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Contraste do Logótipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Nível de Escurecimento & Contraste Monocromático:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Normal (130%)' },
                  { id: 'alto', label: 'Alto (180%) [Recomendado]' },
                  { id: 'extremo', label: 'Extremo (220% Preto Puro)' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => isAdmin && set('thermalLogoContrast', c.id)}
                    className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-bold transition cursor-pointer ${
                      logoContrast === c.id
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guilhotina Automática */}
            <div
              onClick={() => isAdmin && set('thermalAutoCut', !autoCut)}
              className={`flex items-center justify-between p-3 rounded-xl border transition ${
                isAdmin ? 'cursor-pointer' : ''
              } ${autoCut ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50 border-slate-200'}`}
            >
              <div>
                <b className="text-xs text-slate-900 block flex items-center gap-1.5">
                  <Scissors size={14} className="text-blue-600" /> Comando de Corte Automático (GS V 66 0)
                </b>
                <span className="text-[11px] text-slate-500">
                  Envia o comando ESC/POS para acionar a guilhotina ao terminar a factura.
                </span>
              </div>
              <div
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition duration-200 shrink-0 ${
                  autoCut ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                    autoCut ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* PREVISÃO EM TEMPO REAL DO TALÃO POS */}
          <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pré-visualização do Talão Térmico (Fiel à Impressão)
            </span>

            <div
              className={`bg-white border-2 border-dashed border-slate-300 p-3 shadow-md font-mono text-[10.5px] leading-tight text-black transition-all ${
                printerWidth === '58mm' ? 'w-[230px]' : 'w-[280px]'
              }`}
            >
              {/* Logo preview */}
              {printLogo && (
                <div className="text-center pb-1.5 border-b border-dashed border-black">
                  <img
                    src={getCompanyLogo(form.logoUrl)}
                    alt="Logo"
                    className="h-10 w-10 object-contain mx-auto"
                    style={{
                      filter:
                        logoContrast === 'extremo'
                          ? 'grayscale(100%) contrast(220%) brightness(90%)'
                          : logoContrast === 'alto'
                          ? 'grayscale(100%) contrast(180%)'
                          : 'grayscale(100%) contrast(130%)',
                    }}
                  />
                  <b className="block text-xs uppercase mt-1">
                    {form.companyName || 'OSDEL TECNOLOGIA'}
                  </b>
                  <span className="text-[9px] text-slate-700 block">
                    TV COMUNITÁRIA & INTERNET FIBRA
                  </span>
                  <span className="text-[8.5px] block">NIF: {form.companyNif || '5417089214'}</span>
                </div>
              )}

              <div className="py-1.5 text-center border-b border-dashed border-black text-[9.5px]">
                <b>TALÃO DE FACTURA / RECIBO</b>
                <p className="font-bold">FT-2026/00482</p>
                <p>Data: {new Date().toLocaleDateString('pt-AO')} · 10:30</p>
              </div>

              <div className="py-1.5 border-b border-dashed border-black space-y-0.5 text-[9px]">
                <p><b>ASSINANTE:</b> Mateus de Sousa</p>
                <p><b>CÓDIGO:</b> CLI-00214 · CASA B12</p>
                <p><b>SERVIÇO:</b> Mensalidade TV & Fibra</p>
              </div>

              <div className="py-1.5 border-b-2 border-black text-right">
                <span className="text-[9px] block">TOTAL LIQUIDADO:</span>
                <b className="text-base">13.000 Kz</b>
                <span className="text-[8.5px] block font-bold text-emerald-800">
                  PAGO VIA MULTICAIXA
                </span>
              </div>

              <div className="pt-2 text-center text-[8.5px] text-slate-700 whitespace-pre-line leading-tight">
                {footerMessage}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MENSAGENS LEGAIS & TEXTO PERSONALIZADO */}
      <section className="surface rounded-2xl p-6 border border-[hsl(var(--border))] space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900">
          Mensagens Personalizadas de Rodapé do Talão
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Mensagem de Agradecimento & Garantia"
            hint="Impresso na parte inferior de cada talão POS"
          >
            <Textarea
              rows={3}
              value={footerMessage}
              onChange={(e) => set('thermalFooterMessage', e.target.value)}
              disabled={!isAdmin}
            />
          </Field>

          <Field
            label="Aviso Legal de Corte e Cobrança"
            hint="Impresso em facturas proforma e recibos em atraso"
          >
            <Textarea
              rows={3}
              value={warningText}
              onChange={(e) => set('thermalWarningText', e.target.value)}
              disabled={!isAdmin}
            />
          </Field>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Dica: No menu de impressão de facturas, o operador pode alternar a qualquer momento entre <b>Talão POS (Térmica)</b> e <b>Factura Oficial A4</b>.
          </span>

          <Button
            variant="outline"
            onClick={handleTestPrint}
            className="text-xs font-bold text-slate-800"
          >
            <Printer size={14} className="mr-1.5" />
            {testPrinted ? 'Comando Enviado!' : 'Imprimir Página de Teste'}
          </Button>
        </div>
      </section>
    </div>
  );
}
