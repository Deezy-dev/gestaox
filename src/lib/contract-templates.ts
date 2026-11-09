/**
 * OSDEL TECNOLOGIA - Modelos Oficiais de Contratos Diferenciados
 *
 * Contratos distintos e especializados para:
 * 1. INTERNET FIBRA ÓPTICA (FTTH / BANDA LARGA)
 * 2. TELEVISÃO COMUNITÁRIA POR CABO (TV CABO)
 */

export interface ContractClause {
  id: string;
  title: string;
  text: string;
}

export interface ContractTemplateDefinition {
  type: 'fibra' | 'tv';
  name: string;
  badge: string;
  title: string;
  subtitle: string;
  intro: string;
  acceptanceText: string;
  closingText: string;
  clauses: ContractClause[];
}

/**
 * 1. MINUTA OFICIAL: INTERNET FIBRA ÓPTICA (FTTH)
 */
export const DEFAULT_FIBER_CONTRACT_CLAUSES: ContractClause[] = [
  {
    id: 'fib-1',
    title: 'Cláusula 1.ª (Objecto e Titularidade do Contrato)',
    text: 'O presente contrato regula a prestação de serviços de acesso à Internet em Banda Larga via Fibra Óptica (FTTH - Fiber to the Home) pela OSDEL TECNOLOGIA ao ASSINANTE identificado neste documento. A adesão exige a apresentação de Bilhete de Identidade válido e prova de residência no local de instalação.',
  },
  {
    id: 'fib-2',
    title: 'Cláusula 2.ª (Instalação Óptica e Ponto Terminal de Rede)',
    text: 'A instalação compreende o lançamento de cabo drop óptico desde a Caixa de Terminação Óptica (CTO/PDO) da OSDEL até à residência do ASSINANTE, com inclusão de {METROS_CABO} metros de cabo e conectores SC/APC. Metragem excedente será faturada a {PRECO_METRO_EXTRA} por metro. A taxa de instalação é de {VALOR_INSTALACAO}, a ser liquidada antes do início dos trabalhos.',
  },
  {
    id: 'fib-3',
    title: 'Cláusula 3.ª (Equipamento Óptico - Modem ONU/ONT em Comodato)',
    text: 'O terminal óptico (ONU/ONT GPON) é cedido pela OSDEL em regime de comodato (empréstimo de uso) ou aquisição direta. O ASSINANTE compromete-se a zelar pelo equipamento, mantendo-o conectado a fonte de alimentação estável. Em caso de rescisão ou cancelamento, a ONU e o respectivo transformador deverão ser devolvidos à OSDEL em perfeito estado de funcionamento no prazo de 5 dias úteis.',
  },
  {
    id: 'fib-4',
    title: 'Cláusula 4.ª (Velocidade, Banda Larga e Qualidade de Serviço)',
    text: 'A OSDEL assegura o débito de velocidade nominal (Download e Upload) contratado pelo ASSINANTE no plano de Fibra ({PLANO_SERVICO}), sem franquia de consumo de dados (tráfego ilimitado). A OSDEL garante uma disponibilidade mínima de rede de 98,5%, salvo interrupções por força maior, corte de cabos na via pública por terceiros ou quebra de trânsito internacional.',
  },
  {
    id: 'fib-5',
    title: 'Cláusula 5.ª (Mensalidade, Prazos de Pagamento e Vencimento)',
    text: 'O serviço de Internet Fibra funciona no regime pré-pago. A mensalidade contratada é de {MENSALIDADE}, com data limite de liquidação até ao dia {DIA_VENCIMENTO} de cada mês de utilização, através de Multicaixa Express, TPA, transferência bancária para o Banco BAI ou numerário no balcão oficial da OSDEL.',
  },
  {
    id: 'fib-6',
    title: 'Cláusula 6.ª (Atrasos, Suspensão Lógica e Taxa de Religação)',
    text: 'Decorrido o prazo limite de vencimento, concede-se uma tolerância de {DIAS_TOLERANCIA} dias. Findo este período sem regularização, aplica-se uma multa de {MULTA_ATRASO} e o sistema procede ao bloqueio lógico automático do acesso à Internet (suspensão do túnel PPPoE/RADIUS). A reactivação do serviço está sujeita ao pagamento do débito acrescido da taxa de religação de {TAXA_RELIGACAO}.',
  },
  {
    id: 'fib-7',
    title: 'Cláusula 7.ª (Uso Exclusivo e Proibição Expressa de Revenda)',
    text: 'O sinal de Internet fornecido destina-se exclusivamente ao uso residencial ou interno do local indicado. É expressamente proibida a revenda de sinal, partilha via cabo ou Wi-Fi com vizinhos, redistribuição comercial ou actuação como provedor não autorizado, sob pena de corte imediato, cancelamento contratual e procedimento legal competente.',
  },
  {
    id: 'fib-8',
    title: 'Cláusula 8.ª (Suporte Técnico, Manutenção e Piquete)',
    text: 'O piquete de campo da OSDEL presta assistência para falhas ópticas (rompimento de cabo drop, atenuação elevada, falha de sinal LOS/PON na ONU) no horário de suporte: {HORARIO_SUPORTE}. Chamados de emergência técnica devem ser abertos através da linha de apoio oficial: {TELEFONE_SUPORTE}.',
  },
  {
    id: 'fib-9',
    title: 'Cláusula 9.ª (Vigência e Rescisão Contratual)',
    text: 'O contrato tem a vigência de 1 (um) mês, renovando-se sucessivamente mediante pagamento das mensalidades. Qualquer das partes poderá rescindir o contrato com aviso prévio de 15 dias. Com {MESES_SUSPENSAO} meses consecutivos sem pagamento, o contrato é cancelado definitivamente e a porta na CTO/PDO é desatribuída.',
  },
];

/**
 * 2. MINUTA OFICIAL: TELEVISÃO COMUNITÁRIA POR CABO (TV CABO)
 */
export const DEFAULT_TV_CONTRACT_CLAUSES: ContractClause[] = [
  {
    id: 'tv-1',
    title: 'Cláusula 1.ª (Objecto e Finalidade do Serviço de TV)',
    text: 'O presente contrato tem por objecto a ligação e transmissão de sinal de Televisão Comunitária por Cabo pela OSDEL TECNOLOGIA à residência do ASSINANTE, proporcionando acesso a canais de desporto, informação, entretenimento, novelas, cultura e cinema nacional e internacional.',
  },
  {
    id: 'tv-2',
    title: 'Cláusula 2.ª (Instalação, Cablagem Coaxial e Pontos de TV)',
    text: 'A instalação inclui a descida de cabo coaxial RG6 com mensageiro a partir do repartidor de rua até ao ponto principal de televisão da habitação, com direito a {METROS_CABO} metros de cabo. Cada metro adicional tem o custo de {PRECO_METRO_EXTRA}. A instalação de pontos de TV adicionais na mesma residência carece de autorização e do pagamento da taxa adicional correspondente.',
  },
  {
    id: 'tv-3',
    title: 'Cláusula 3.ª (Grelha de Canais e Recepção do Sinal)',
    text: 'O ASSINANTE terá acesso à grelha oficial de canais comunitários da OSDEL conforme o plano subscrito. A composição da grelha de canais pode sofrer alterações pontuais decorrentes de modificações na programação das emissoras parceiras, transmissões de satélite ou actualizações de Headend, sem prejuízo da manutenção da qualidade global do serviço.',
  },
  {
    id: 'tv-4',
    title: 'Cláusula 4.ª (Mensalidade e Calendário de Pagamentos)',
    text: 'A mensalidade do serviço de TV por Cabo é de {MENSALIDADE} para o ponto principal (acrescida de {VALOR_PONTO_EXTRA} por ponto extra, caso contratado). O pagamento deve ser realizado pontualmente até ao dia {DIA_VENCIMENTO} de cada mês através dos canais de pagamento credenciados (Multicaixa Express, TPA de balcão, transferência BAI ou numerário).',
  },
  {
    id: 'tv-5',
    title: 'Cláusula 5.ª (Tolerância, Desconexão Física e Taxa de Religação)',
    text: 'Após o dia {DIA_VENCIMENTO}, o ASSINANTE beneficia de uma tolerância de {DIAS_TOLERANCIA} dias. Ultrapassado este período, incidirá uma multa no valor de {MULTA_ATRASO}. Persistindo o incumprimento, os técnicos de piquete procederão à desconexão física do cabo de sinal na caixa de derivação de rua. A reposição do sinal implicará o pagamento das dívidas e da taxa de religação de {TAXA_RELIGACAO}.',
  },
  {
    id: 'tv-6',
    title: 'Cláusula 6.ª (Proibição de Puxadas e Derivações Clandestinas)',
    text: 'É terminantemente proibido ligar derivações para residências vizinhas, anexos não autorizados ou ceder sinal a terceiros. A detecção de puxada clandestina ou adulteração do repartidor implicará o cancelamento sumário do contrato, corte imediato de cabo e aplicação de coima por fraude de sinal.',
  },
  {
    id: 'tv-7',
    title: 'Cláusula 7.ª (Assistência Técnica e Reparação de Avarias)',
    text: 'A OSDEL garante a assistência técnica para restabelecimento de sinal em caso de quebra de cabos externos, amplificadores ou splitters avariados no horário de suporte: {HORARIO_SUPORTE}. Avarias no televisor ou instalações elétricas internas do imóvel são da exclusiva responsabilidade do ASSINANTE.',
  },
  {
    id: 'tv-8',
    title: 'Cláusula 8.ª (Desistência e Cancelamento por Inadimplência)',
    text: 'O ASSINANTE pode suspender ou cessar o contrato avisando a empresa até 10 dias antes do final do mês pago. Em caso de ausência de pagamento por período superior a {MESES_SUSPENSAO} meses consecutivos, a OSDEL recolherá o cabo de descida e cancelará em definitivo o contrato, exigindo-se taxa de renovação de {TAXA_RENOVACAO} para nova ligação.',
  },
];

/**
 * Retorna as cláusulas adequadas para o tipo de serviço (Fibra vs TV)
 */
export function getClausesForService(
  serviceType: string | undefined,
  settings: any
): { clauses: ContractClause[]; templateType: 'fibra' | 'tv'; title: string; intro: string } {
  const isFiber =
    serviceType === 'fibra' ||
    serviceType === 'fiber' ||
    serviceType === 'internet' ||
    serviceType === 'combo';

  if (isFiber) {
    const configuredClauses =
      Array.isArray(settings?.fiberContractClauses) && settings.fiberContractClauses.length > 0
        ? settings.fiberContractClauses
        : DEFAULT_FIBER_CONTRACT_CLAUSES;

    return {
      templateType: 'fibra',
      clauses: configuredClauses,
      title: settings?.fiberContractTitle || 'Contrato de Adesão · Internet Fibra Óptica (FTTH)',
      intro:
        settings?.fiberContractIntro ||
        'A OSDEL TECNOLOGIA disponibiliza acesso à Internet de alta performance através de infraestrutura de fibra óptica FTTH, garantindo conectividade estável, alta velocidade e tráfego ilimitado para residências e empresas.',
    };
  }

  // TV por Cabo
  const configuredClauses =
    Array.isArray(settings?.tvContractClauses) && settings.tvContractClauses.length > 0
      ? settings.tvContractClauses
      : Array.isArray(settings?.contractClauses) && settings.contractClauses.length > 0
      ? settings.contractClauses
      : DEFAULT_TV_CONTRACT_CLAUSES;

  return {
    templateType: 'tv',
    clauses: configuredClauses,
    title: settings?.tvContractTitle || settings?.contractTitle || 'Termos de Adesão · Televisão Comunitária por Cabo',
    intro:
      settings?.tvContractIntro ||
      settings?.contractIntro ||
      'A TV Comunitária por Cabo da OSDEL TECNOLOGIA é uma rede de distribuição audiovisual voltada à comunidade, transmitindo canais de informação, desporto, novelas, cultura e cinema com estabilidade e proximidade.',
  };
}

/**
 * Resolve todas as variáveis dinâmicas do contrato ({MENSALIDADE}, {NOME_CLIENTE}, etc.)
 */
export function resolveContractVariables(
  text: string,
  client: any,
  settings: any,
  serviceType: string = 'tv'
): string {
  if (!text) return '';

  const company = settings?.companyName || 'OSDEL TECNOLOGIA';
  const nif = settings?.companyNif || '5600857127';
  const dueDay = settings?.paymentDueDay || 5;
  const isFiber =
    serviceType === 'fibra' ||
    serviceType === 'fiber' ||
    serviceType === 'internet' ||
    serviceType === 'combo';

  const defaultPrice = isFiber
    ? Number(settings?.fiberMonthlyPrice || settings?.defaultMonthlyPrice || 12000)
    : Number(settings?.tvMonthlyPrice || settings?.defaultMonthlyPrice || 4000);

  const monthlyPrice = Number(client?.monthlyFee || defaultPrice);

  const kz = (val?: number | string | null) => {
    const num = Number(val || 0);
    return `${num.toLocaleString('pt-AO', { maximumFractionDigits: 0 })} Kz`;
  };

  return text
    .replace(/{MENSALIDADE}/g, kz(monthlyPrice))
    .replace(/{DIA_VENCIMENTO}/g, String(dueDay))
    .replace(/{DIAS_TOLERANCIA}/g, String(settings?.toleranceDays || 3))
    .replace(/{MULTA_ATRASO}/g, kz(settings?.latePenalty || 1000))
    .replace(/{VALOR_INSTALACAO}/g, kz(settings?.connectionFee || (isFiber ? 25000 : 15000)))
    .replace(/{METROS_CABO}/g, String(settings?.cableIncludedMeters || (isFiber ? 30 : 25)))
    .replace(/{PRECO_METRO_EXTRA}/g, kz(settings?.extraMeterPrice || 250))
    .replace(/{VALOR_PONTO_EXTRA}/g, kz(settings?.tvExtraPrice || 1000))
    .replace(/{MESES_SUSPENSAO}/g, String(settings?.suspensionAfterMonths || 3))
    .replace(/{TAXA_RENOVACAO}/g, kz(settings?.renewalFee || 10000))
    .replace(/{TAXA_RELIGACAO}/g, kz(settings?.reconnectionFee || 2500))
    .replace(
      /{HORARIO_SUPORTE}/g,
      settings?.supportHours || 'Segunda a Sexta das 08h às 17h · Sábados das 08h às 13h'
    )
    .replace(/{TELEFONE_SUPORTE}/g, settings?.companySupportPhone || settings?.companyPhone || '926 153 736')
    .replace(/{NOME_CLIENTE}/g, client?.fullName || '—')
    .replace(/{CODIGO_CLIENTE}/g, client?.code || '—')
    .replace(/{BI_CLIENTE}/g, client?.documentNumber || '—')
    .replace(/{TELEFONE_CLIENTE}/g, client?.phone || '—')
    .replace(/{ENDERECO_CLIENTE}/g, client?.address || '—')
    .replace(
      /{PLANO_SERVICO}/g,
      client?.planName || (isFiber ? 'Plano Fibra 20 Mbps Ilimitado' : 'Pacote TV Completo')
    )
    .replace(/{SERVICO}/g, isFiber ? 'Internet Fibra Óptica FTTH' : 'Televisão Comunitária por Cabo')
    .replace(/{EMPRESA}/g, company)
    .replace(/{NIF}/g, nif);
}
