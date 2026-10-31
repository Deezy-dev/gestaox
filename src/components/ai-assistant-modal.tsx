import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  X,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  Wifi,
  Tv,
  Layers,
  HelpCircle,
  Lightbulb,
  ShieldCheck,
  CornerDownLeft,
  Wrench,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Wallet,
  Boxes,
  FileText,
  UserPlus,
  Receipt,
  Scissors,
  Zap,
} from 'lucide-react';
import {
  AssistantMessage,
  AssistantAction,
  AssistantContext,
  QUICK_SUGGESTIONS,
  queryAssistant,
  executeAssistantAction,
} from '@/lib/ai-assistant';
import { useServiceMode } from '@/lib/service-mode';
import { session } from '@/lib/local-api';
import { API_BASE_URL } from '@/lib/api-config';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona?: 'admin' | 'client' | 'technician';
  clientCode?: string;
}

export function AiAssistantModal({
  isOpen,
  onClose,
  persona = 'admin',
  clientCode,
}: AiAssistantModalProps) {
  const { mode, meta } = useServiceMode();
  const currentUser = session();
  const [messages, setMessages] = useState<AssistantMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'assistant',
      text:
        persona === 'client'
          ? 'Olá! Sou o Assistente Inteligente da OSDEL. Posso ajudá-lo a verificar o seu sinal de TV ou Fibra, consultar faturas e solicitar acordos de pagamento.'
          : persona === 'technician'
          ? 'Saudações, Técnico! Estou conectado à rede de campo. Posso despachar ordens de serviço, diagnosticar níveis de atenuação (dBm), conferir rotas e materiais de carrinha.'
          : `Olá, ${currentUser?.name || 'Administrador'}! Sou o Agente IA de Resolução Operacional da OSDEL. Estou pronto para resolver casos com clientes (avarias, cortes, acordos) e coordenar os membros da equipa técnica.`,
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = QUICK_SUGGESTIONS[persona] || QUICK_SUGGESTIONS.admin;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages, isTyping]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isTyping) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setActionFeedback(null);

    try {
      const context: AssistantContext = {
        mode,
        persona,
        userName: currentUser?.name,
        clientCode,
      };

      const result = await queryAssistant(textToSend, context, API_BASE_URL);

      const botMsg: AssistantMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: result.text,
        actions: result.actions,
        timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Desculpe, ocorreu uma instabilidade momentânea. Pode repetir a sua pergunta?',
        timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteAction = (action: AssistantAction) => {
    const res = executeAssistantAction(action);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(null), 4000);

    // Adiciona feedback na conversa para transparência
    if (res.success && action.type !== 'copy_text') {
      const confirmMsg: AssistantMessage = {
        id: `confirm-${Date.now()}`,
        sender: 'assistant',
        text: `✅ **Ação Executada:** ${res.message}`,
        timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, confirmMsg]);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Conversa reiniciada. Em que caso posso apoiar a operação da OSDEL agora?`,
        timestamp: new Date().toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="surface flex flex-col w-full max-w-xl h-[90vh] sm:h-[680px] rounded-t-3xl sm:rounded-3xl border border-[hsl(var(--border))] shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Cabeçalho do Agente IA */}
        <header className="px-5 py-3.5 border-b border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--secondary)/.4)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Bot size={22} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[hsl(var(--card))]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-[hsl(var(--foreground))]">
                  OSDEL Agente Operacional
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold px-2 py-0.5 border border-blue-500/20">
                  <Sparkles size={11} /> Resolução Ativa
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                {mode === 'fibra' ? (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                    <Wifi size={12} /> Fibra FTTH
                  </span>
                ) : mode === 'tv' ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <Tv size={12} /> TV RF
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Layers size={12} /> TV + Fibra
                  </span>
                )}
                <span>·</span>
                <span>Golf I, Luanda</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {persona === 'admin' && (
              <button
                type="button"
                onClick={() => handleSend('Gerar e explicar relatório gerencial completo deste mês com análise de pagamentos e inadimplência')}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs transition"
                title="Gerar e explicar relatório gerencial de pagamentos e cobrança"
              >
                <FileText size={13} />
                <span>Relatório IA</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClearHistory}
              title="Limpar histórico da conversa"
              className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fechar assistente"
              className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Feedback flutuante de ação executada */}
        {actionFeedback && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-inner animate-in fade-in duration-150">
            <CheckCircle2 size={16} className="shrink-0" />
            <span className="truncate">{actionFeedback}</span>
          </div>
        )}

        {/* Sugestões Rápidas de Casos */}
        <div className="px-4 py-2.5 bg-[hsl(var(--secondary)/.3)] border-b border-[hsl(var(--border))] shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1 shrink-0">
              <Lightbulb size={12} className="text-amber-500" /> Casos Comuns:
            </span>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(item.query)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition shadow-2xs"
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Mensagens com Renderização de Action Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs font-medium'
                    : 'surface border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-tl-xs space-y-3'
                }`}
              >
                {/* Texto da Mensagem Formatado */}
                <div className="whitespace-pre-wrap space-y-1">
                  {msg.text.split('\n').map((line, idx) => {
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={idx} className={line.startsWith('•') ? 'pl-2' : ''}>
                        {parts.map((p, pIdx) => {
                          if (p.startsWith('**') && p.endsWith('**')) {
                            return <strong key={pIdx}>{p.slice(2, -2)}</strong>;
                          }
                          if (p.startsWith('`') && p.endsWith('`')) {
                            return (
                              <code
                                key={pIdx}
                                className="px-1.5 py-0.5 rounded bg-[hsl(var(--secondary))] font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400"
                              >
                                {p.slice(1, -1)}
                              </code>
                            );
                          }
                          return p;
                        })}
                      </p>
                    );
                  })}
                </div>

                {/* CARTÕES DE AÇÃO EXECUTÁVEIS (ACTION CARDS) */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="pt-2 border-t border-[hsl(var(--border))] space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                      Ações Recomendadas para Resolver este Caso:
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {msg.actions.map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => handleExecuteAction(act)}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition shadow-xs active:scale-[0.99] ${
                            act.type === 'whatsapp'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                              : act.type === 'create_order'
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                              : act.type === 'create_client'
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                              : act.type === 'create_invoice'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                              : act.type === 'cut_signal'
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                              : act.type === 'reconnect_signal'
                              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                              : act.type === 'create_agreement'
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                              : 'bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))]'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            {act.type === 'whatsapp' && <MessageCircle size={14} />}
                            {act.type === 'create_order' && <Wrench size={14} />}
                            {act.type === 'create_client' && <UserPlus size={14} />}
                            {act.type === 'create_invoice' && <Receipt size={14} />}
                            {act.type === 'cut_signal' && <Scissors size={14} />}
                            {act.type === 'reconnect_signal' && <Zap size={14} />}
                            {act.type === 'create_agreement' && <ShieldCheck size={14} />}
                            {act.type === 'copy_text' && <Copy size={14} />}
                            <span className="truncate">{act.label}</span>
                          </span>
                          <span className="text-[10px] opacity-80 shrink-0">Executar ➔</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {msg.sender === 'assistant' && (
                  <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/.6)] text-[10px] text-[hsl(var(--muted-foreground))]">
                    <span>{msg.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(msg.text, msg.id)}
                      className="inline-flex items-center gap-1 hover:text-blue-500 transition"
                      title="Copiar resposta"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={12} className="text-emerald-500" /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] pl-2">
              <div className="h-6 w-6 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Bot size={14} className="animate-pulse" />
              </div>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
              </div>
              <span className="text-[11px]">A diagnosticar na base de dados da OSDEL...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Caixa de Entrada */}
        <footer className="p-3 sm:p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ex: cliente António sem sinal, despachar OS ao Job, saldo de caixa..."
              className="flex-1 h-11 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 text-xs sm:text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <span>Resolver</span>
              <Send size={14} />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-[hsl(var(--muted-foreground))]">
            ⚡ Resolução activa de casos: gera O.S., envia WhatsApp e formaliza acordos de pagamento.
          </div>
        </footer>
      </div>
    </div>
  );
}

export function AiAssistantWidget({
  persona = 'admin',
  clientCode,
  buttonLabel = 'Assistente IA',
}: {
  persona?: 'admin' | 'client' | 'technician';
  clientCode?: string;
  buttonLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { mode } = useServiceMode();

  return (
    <>
      <button
        type="button"
        data-testid="ai-assistant-floating-button"
        onClick={() => setIsOpen(true)}
        title="Abrir Assistente Inteligente OSDEL"
        aria-label="Abrir Assistente Inteligente OSDEL"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full text-white font-bold text-xs shadow-xl hover:scale-105 active:scale-95 transition-all backdrop-blur bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25"
      >
        <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Sparkles size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <span className="hidden sm:inline font-mono tracking-tight">{buttonLabel}</span>
      </button>

      <AiAssistantModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        persona={persona}
        clientCode={clientCode}
      />
    </>
  );
}
