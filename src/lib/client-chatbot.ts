/**
 * OSDEL TECNOLOGIA - CHATBOT INTELIGENTE DE ATENDIMENTO AO CLIENTE
 * Triagem automática de dúvidas comuns (saldo, faturas, IBAN, falhas de sinal)
 * e escalonamento instantâneo com solicitação de intervenção administrativa humana.
 */

import {
  sendClientMessage,
  requestHumanIntervention,
  type ClientChatMessage,
} from './team-chat';
import { addSystemNotification } from './notifications';

export interface ChatbotContext {
  clientId: number;
  clientCode: string;
  clientName: string;
  phone: string;
  address?: string;
  serviceType: 'tv' | 'internet' | 'combo' | string;
  planName?: string;
  balanceDue?: number;
  status?: string;
  dueDay?: number;
  companyWhatsApp?: string;
}

export interface BotResponseResult {
  replyText: string;
  requiresHuman: boolean;
  suggestedActions?: { label: string; action: string; payload?: any }[];
  ticketCreated?: boolean;
}

// Detecção inteligente de problemas específicos que necessitam de intervenção administrativa/humana
const HUMAN_INTERVENTION_KEYWORDS = [
  'falar com atendente',
  'falar com humano',
  'humano',
  'atendente',
  'pessoa',
  'operador',
  'administrador',
  'gerente',
  'reclamação',
  'reclamar',
  'cabo partido',
  'cabo quebrado',
  'cabo rompido',
  'camião passou',
  'corte indevido',
  'cortado por engano',
  'já paguei e não religou',
  'religacao urgente',
  'estorno',
  'dinheiro de volta',
  'cancelar',
  'cancelamento',
  'roubo',
  'furto',
  'processo',
  'advogado',
  'falha grave',
  'problema nao resolvido',
  'nao resolveu',
  'insatisfeito',
];

export function processClientMessageWithBot(
  userText: string,
  context: ChatbotContext
): BotResponseResult {
  const clean = userText.trim().toLowerCase();

  // 1. Verificação de solicitação de intervenção de membro administrativo
  const needsHuman = HUMAN_INTERVENTION_KEYWORDS.some((kw) => clean.includes(kw));

  if (needsHuman) {
    // Registra ticket de intervenção humana
    const reason = clean.length > 90 ? clean.slice(0, 90) + '...' : clean;
    requestHumanIntervention({
      clientId: context.clientId,
      clientCode: context.clientCode,
      clientName: context.clientName,
      clientPhone: context.phone,
      clientAddress: context.address,
      serviceType: context.serviceType,
      reason: `Assunto específico / Chamado Humano: "${reason}"`,
      lastClientMessage: userText,
    });

    // Emite notificação de sistema para todos os membros administrativos no dashboard
    addSystemNotification({
      title: `🚨 Intervenção Administrativa Solicitada: ${context.clientName}`,
      message: `O cliente ${context.clientCode} (${context.phone}) solicitou auxílio de um atendente humano no chat do APK/Portal: "${reason}".`,
      type: 'avaria',
      priority: 'urgente',
      targetRole: 'operador',
      link: '/mensagens',
    });

    const reply = (
      `🔔 **Solicitação de Intervenção Humana Registrada com Sucesso!**\n\n` +
      `Identifiquei que você precisa de atenção específica da nossa equipe administrativa.\n\n` +
      `📋 **Dados do seu chamado:**\n` +
      `• Assinante: **${context.clientName}** (${context.clientCode})\n` +
      `• Situação relatada: *"${reason}"*\n` +
      `• Prioridade: **Alta / Urgente**\n\n` +
      `Um operador administrativo ou supervisor da OSDEL Tecnologia já foi alertado com aviso sonoro e assumirá este chat diretamente. Por favor, permaneça nesta tela ou aguarde uma resposta em instantes.`
    );

    sendClientMessage(
      context.clientId,
      context.clientCode,
      context.clientName,
      reply,
      'bot',
      'Assistente Virtual OSDEL'
    );

    return {
      replyText: reply,
      requiresHuman: true,
      ticketCreated: true,
      suggestedActions: [
        { label: '📞 Ligar para o Suporte', action: 'call_support' },
        { label: '💬 Abrir no WhatsApp', action: 'open_whatsapp' },
      ],
    };
  }

  // 2. Consulta de Saldo e Fatura
  if (
    clean.includes('saldo') ||
    clean.includes('fatura') ||
    clean.includes('divida') ||
    clean.includes('dívida') ||
    clean.includes('devo') ||
    clean.includes('quanto custa') ||
    clean.includes('vencimento')
  ) {
    const balance = context.balanceDue || 0;
    const isLate = balance > 0;
    const formatted = new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 0,
    }).format(balance).replace('AOA', 'Kz');

    const reply = (
      `📄 **Situação Financeira do seu Contrato (${context.clientCode}):**\n\n` +
      `• **Titular:** ${context.clientName}\n` +
      `• **Serviço:** ${context.serviceType === 'combo' ? 'TV + Internet Fibra' : context.serviceType === 'internet' ? 'Internet Fibra' : 'TV por Cabo'}\n` +
      `• **Plano:** ${context.planName || 'Plano Oficial'}\n` +
      `• **Dia de Vencimento:** Todo dia ${context.dueDay || 5} do mês\n` +
      `• **Saldo em Débito:** ${isLate ? `⚠️ **${formatted}** em atraso` : '✅ **0 Kz (Mensalidade em dia!)**'}\n\n` +
      (isLate
        ? `💡 Para evitar o corte de sinal da sua residência, efetue a liquidação através dos nossos dados bancários e envie o comprovativo.`
        : `Muito obrigado por manter a sua assinatura em dia com a OSDEL Tecnologia!`)
    );

    sendClientMessage(
      context.clientId,
      context.clientCode,
      context.clientName,
      reply,
      'bot',
      'Assistente Virtual OSDEL'
    );

    return {
      replyText: reply,
      requiresHuman: false,
      suggestedActions: [
        { label: '💳 Ver Coordenadas de Pagamento', action: 'bank_info' },
        { label: '📤 Enviar Comprovativo', action: 'upload_receipt' },
        { label: '👤 Falar com Atendente Humano', action: 'request_human' },
      ],
    };
  }

  // 3. Coordenadas Bancárias e Como Pagar
  if (
    clean.includes('pagar') ||
    clean.includes('iban') ||
    clean.includes('banco') ||
    clean.includes('multicaixa') ||
    clean.includes('express') ||
    clean.includes('transferencia') ||
    clean.includes('transferência') ||
    clean.includes('conta')
  ) {
    const reply = (
      `💳 **Coordenadas Oficiais de Pagamento - OSDEL TECNOLOGIA:**\n\n` +
      `1. **Banco BAI (Banco Angolano de Investimentos):**\n` +
      `   • IBAN: **AO06.0040.0000.1234.5678.9012.3**\n` +
      `   • Titular: OSDEL TECNOLOGIA LDA\n\n` +
      `2. **Banco BFA (Banco de Fomento Angola):**\n` +
      `   • IBAN: **AO06.0006.0000.9876.5432.1098.7**\n` +
      `   • Titular: OSDEL TECNOLOGIA LDA\n\n` +
      `3. **Multicaixa Express:**\n` +
      `   • Faça transferência direta para os IBANs acima indicando no descritivo o seu código **${context.clientCode}** ou o seu telefone.\n\n` +
      `📌 Após realizar o pagamento, pode carregar o comprovativo diretamente no aplicativo ou enviá-lo pelo WhatsApp para agilizar a baixa.`
    );

    sendClientMessage(
      context.clientId,
      context.clientCode,
      context.clientName,
      reply,
      'bot',
      'Assistente Virtual OSDEL'
    );

    return {
      replyText: reply,
      requiresHuman: false,
      suggestedActions: [
        { label: '📋 Copiar IBAN BAI', action: 'copy_iban_bai' },
        { label: '📋 Copiar IBAN BFA', action: 'copy_iban_bfa' },
        { label: '📤 Carregar Comprovativo', action: 'upload_receipt' },
        { label: '👤 Falar com Atendente Humano', action: 'request_human' },
      ],
    };
  }

  // 4. Problema com Luz Vermelha LOS na Fibra / Sem Internet
  if (
    clean.includes('los') ||
    clean.includes('vermelha') ||
    clean.includes('luz vermelha') ||
    clean.includes('sem internet') ||
    clean.includes('sinal caiu') ||
    clean.includes('pon piscando') ||
    clean.includes('pon apagar')
  ) {
    const reply = (
      `🔴 **Diagnóstico de Fibra Óptica (Luz LOS Vermelha / Sem Internet):**\n\n` +
      `A luz **LOS vermelha** no seu modem ONU indica ausência de sinal óptico proveniente da rua.\n\n` +
      `**Siga estes passos rápidos:**\n` +
      `1. Verifique se o **cabo amarelo fino de fibra** não está dobrado ou esmagado atrás do móvel.\n` +
      `2. Desconecte o cabo de energia do modem da tomada, aguarde **30 segundos** e volte a ligar.\n` +
      `3. Se a luz LOS continuar vermelha e a luz PON apagada, pode haver rompimento no cabo externo na sua rua ou desconexão na caixa PDO.\n\n` +
      `Deseja que eu chame um membro administrativo ou envie um piquete técnico à sua rua?`
    );

    sendClientMessage(
      context.clientId,
      context.clientCode,
      context.clientName,
      reply,
      'bot',
      'Assistente Virtual OSDEL'
    );

    return {
      replyText: reply,
      requiresHuman: false,
      suggestedActions: [
        { label: '🚨 Abrir Chamado Técnico de Rua', action: 'request_human' },
        { label: '🔄 Já reiniciei, continua sem sinal', action: 'request_human' },
        { label: '👤 Falar com Atendente Humano', action: 'request_human' },
      ],
    };
  }

  // 5. Problema com TV Comunitária / Sem Sinal nos Canais
  if (
    clean.includes('tv') ||
    clean.includes('canal') ||
    clean.includes('canais') ||
    clean.includes('sem sinal tv') ||
    clean.includes('imagem travando') ||
    clean.includes('chuvisco') ||
    clean.includes('ecrã preto')
  ) {
    const reply = (
      `📺 **Diagnóstico de TV por Cabo Comunitária:**\n\n` +
      `Para restabelecer a recepção normal dos canais na sua televisão:\n\n` +
      `1. Verifique se o **cabo coaxial branco ou preto** está bem enroscado na entrada ANTENA/CABLE da TV.\n` +
      `2. No comando da sua televisão, confirme se a fonte de sinal está selecionada em **TV / DTV / Cabo**.\n` +
      `3. Faça uma **Sintonia Automática de Canais** (Banda DVB-C ou Analógica/Digital) nas configurações da TV.\n` +
      `4. Se nenhuma televisão da sua casa der sinal, pode ter havido interrupção no ramal da sua rua.\n\n` +
      `Se os passos acima não resolverem, clique abaixo para solicitar a intervenção de um técnico.`
    );

    sendClientMessage(
      context.clientId,
      context.clientCode,
      context.clientName,
      reply,
      'bot',
      'Assistente Virtual OSDEL'
    );

    return {
      replyText: reply,
      requiresHuman: false,
      suggestedActions: [
        { label: '🛠️ Solicitar Piquete de TV', action: 'request_human' },
        { label: '👤 Falar com Membro Administrativo', action: 'request_human' },
      ],
    };
  }

  // 6. Resposta padrão inteligente com sugestões
  const defaultReply = (
    `🤖 **Assistente OSDEL:**\n\n` +
    `Recebi a sua mensagem: *"${userText}"*.\n\n` +
    `Posso ajudar com:\n` +
    `• **Consultar faturas e saldo**\n` +
    `• **Dados para pagamento e IBAN**\n` +
    `• **Diagnóstico de fibra óptica ou TV**\n` +
    `• **Horários de atendimento e planos**\n\n` +
    `Caso o seu problema seja específico ou necessite de um operador, basta clicar em **"Falar com Atendente Humano"** que notificarei a administração imediatamente.`
  );

  sendClientMessage(
    context.clientId,
    context.clientCode,
    context.clientName,
    defaultReply,
    'bot',
    'Assistente Virtual OSDEL'
  );

  return {
    replyText: defaultReply,
    requiresHuman: false,
    suggestedActions: [
      { label: '💰 Consultar Saldo', action: 'check_balance' },
      { label: '💳 Dados de Pagamento', action: 'bank_info' },
      { label: '👤 Falar com Atendente Humano', action: 'request_human' },
    ],
  };
}

export const processClientMessageWithChatbot = (
  context: ChatbotContext,
  userText: string
): BotResponseResult => processClientMessageWithBot(userText, context);
