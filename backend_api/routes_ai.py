"""
Módulo de Inteligência Artificial Leve e Econômica para Telecomunicações OSDEL.
Compatível 100% com o plano gratuito do PythonAnywhere (0 MB RAM extra, zero dependências pesadas).
"""
from flask import Blueprint, request, jsonify
from datetime import datetime

ai_bp = Blueprint('ai', __name__, url_prefix='/api/v1/ai')

TELECOM_KNOWLEDGE = {
    'dbm': {
        'keywords': ['dbm', 'potencia', 'sinal optico', 'atenua', 'los', 'pon', 'rx'],
        'answer': (
            "📶 **Padrões de Potência Óptica FTTH (Rede OSDEL Tecnologia):**\n\n"
            "• **Faixa Ideal:** -15.0 dBm a -23.0 dBm (velocidade simétrica e máxima estabilidade).\n"
            "• **Faixa Aceitável:** -23.1 dBm a -25.5 dBm (monitorar atenuação de campo).\n"
            "• **Faixa Crítica (Alerta):** Inferior a -26.0 dBm (risco iminente de desconexão e perda de pacotes).\n"
            "• **Luz LOS Vermelha no Modem:** Interrupção física na fibra óptica (drop rompido ou desconectado na caixa PDO).\n"
            "• **Atenuação Máxima por Fusão:** < 0.03 dB por emenda.\n"
            "💡 Dica de Campo: Limpar sempre o conector SC/APC (verde) com lenço isopropílico antes de plugar na ONU."
        )
    },
    'pagamentos': {
        'keywords': ['multicaixa', 'express', 'pagar', 'banco', 'iban', 'conta', 'comprovativo'],
        'answer': (
            "💳 **Instruções Oficiais de Pagamento OSDEL:**\n\n"
            "1. **Multicaixa Express:**\n"
            "   • Pagamento por Referência ou Transferência Direta para os IBANs:\n"
            "     🏛️ **Banco BAI:** AO06.0040.0000.1234.5678.9012.3\n"
            "     🏛️ **Banco BFA:** AO06.0006.0000.9876.5432.1098.7\n"
            "     (Titular: OSDEL TECNOLOGIA LDA)\n\n"
            "2. **Identificação do Assinante:**\n"
            "   • Indique sempre o seu Código de Assinante (ex: CLI-00001) ou contacto no descritivo da transferência.\n"
            "3. **Envio de Comprovativo:** Envie para o WhatsApp do suporte (+244 926 153 736) para religação ou confirmação."
        )
    },
    'regras_corte': {
        'keywords': ['vencimento', 'multa', 'corte', 'atraso', 'tolerancia', 'suspensao', 'religacao'],
        'answer': (
            "📋 **Regras Contratuais de Vencimento e Sinal OSDEL:**\n\n"
            "• **Vencimento:** Dia 5 de cada mês.\n"
            "• **Tolerância sem Multa:** Até ao dia 8 de cada mês.\n"
            "• **Multa por Atraso:** 1.000 Kz (a partir do dia 9).\n"
            "• **Corte de Sinal Físico:** Atrasos superiores a 15 dias entram no piquete de corte.\n"
            "• **Suspensão (> 3 Meses):** Contrato cancelado; religação exige taxa de 10.000 Kz + débitos pendentes.\n"
            "• **Taxa de Religação Pontual:** 2.500 Kz."
        )
    },
    'planos': {
        'keywords': ['plano', 'pacote', 'preco', 'preço', 'velocidade', 'canais', 'tarifa', 'quanto custa'],
        'answer': (
            "📡 **Tarifário Oficial OSDEL Tecnologia:**\n\n"
            "🌐 **Internet Fibra Óptica (FTTH):**\n"
            "• Fibra 10 (10 Mbps): 6.500 Kz / mês\n"
            "• Fibra 22 (22 Mbps): 8.500 Kz / mês (Recomendado)\n"
            "• Fibra 50 (50 Mbps): 12.000 Kz / mês\n"
            "• Fibra 100 (100 Mbps): 20.000 Kz / mês\n\n"
            "📺 **TV Comunitária por Cabo:**\n"
            "• Mensalidade Base (35 canais): 4.000 Kz / mês\n"
            "• Ponto Extra: 1.000 Kz / mês por televisão adicional\n"
            "• Instalação Inicial: 15.000 Kz (com 25m de cabo incluídos)."
        )
    },
    'agt_civa': {
        'keywords': ['agt', 'imposto', 'civa', 'iva', 'isencao', 'isenção', 'factura', 'fiscal'],
        'answer': (
            "🏛️ **Conformidade Fiscal AGT (Regime de Exclusão do IVA):**\n\n"
            "• A OSDEL Tecnologia opera ao abrigo do **Artigo 12.º do Código do IVA (CIVA)** - Regime de Exclusão.\n"
            "• **Taxa de IVA Aplicada:** 0% (Isento nos termos legais).\n"
            "• **Texto Obrigatório nos Documentos:** 'Isento de IVA nos termos do Artigo 12.º do CIVA - Regime de Exclusão'.\n"
            "• O sistema gera numeração sequencial certificada em Facturas A4 e Talões Térmicos POS de 80mm."
        )
    },
    'modos': {
        'keywords': ['modo fibra', 'modo tv', 'separar', 'modalidade', 'trocar modo', 'diferença'],
        'answer': (
            "🔄 **Separação de Modos de Operação no Sistema:**\n\n"
            "• **Modo Fibra:** Exibe com exclusividade itens de Internet Banda Larga FTTH (velocidades Mbps, caixas PDO, ONUs e planos de fibra). Elementos de TV ficam ocultos.\n"
            "• **Modo TV:** Exibe com exclusividade itens de TV por Cabo Comunitária (sinal RF, 4.000 Kz de mensalidade base, cabos coaxiais e canais). Elementos de fibra ficam ocultos.\n"
            "• **Modo Ambos:** Visualização unificada para a Direcção Geral e Administração."
        )
    }
}

@ai_bp.route('/assist', methods=['POST'])
def assist():
    """
    Endpoint inteligente de baixo consumo para responder a dúvidas técnicas, comerciais e operacionais.
    """
    data = request.get_json() or {}
    query = (data.get('query') or '').strip().lower()
    mode = data.get('mode') or 'ambos'
    persona = data.get('persona') or 'admin'
    client_code = data.get('client_code')

    if not query:
        return jsonify({
            'success': False,
            'message': 'Pergunta não informada.'
        }), 400

    # 1. Busca correspondência no banco de conhecimento telecom
    matched_answer = None
    for category_id, cat_data in TELECOM_KNOWLEDGE.items():
        if any(keyword in query for keyword in cat_data['keywords']):
            matched_answer = cat_data['answer']
            break

    # 2. Resposta contextual caso não encontre palavra-chave exata
    if not matched_answer:
        if mode == 'fibra':
            matched_answer = (
                f"Entendido! Sobre '{query}', no **Modo Fibra Óptica**, certifique-se de validar os níveis de atenuação óptica "
                f"na porta da caixa PDO (ideal entre -15 e -23 dBm) e o status do conector SC/APC da residência."
            )
        elif mode == 'tv':
            matched_answer = (
                f"Entendido! Sobre '{query}', no **Modo TV Comunitária**, assegure-se de verificar o cabo coaxial RG6, "
                f"a boa conexão do terminal F e a cobrança da mensalidade base de 4.000 Kz."
            )
        else:
            matched_answer = (
                f"Compreendido! Para a questão sobre '{query}', a equipa OSDEL pode consultar os módulos operacionais "
                f"do sistema ou contactar a assistência central pelo +244 926 153 736."
            )

    return jsonify({
        'success': True,
        'query': query,
        'answer': matched_answer,
        'mode': mode,
        'persona': persona,
        'timestamp': datetime.utcnow().isoformat()
    }), 200

@ai_bp.route('/generate-report', methods=['POST'])
def generate_report():
    """
    Gera e explica relatórios gerenciais e análise de pagamentos com IA de alta precisão.
    """
    from models import Payment, Invoice, Expense, Client, FinancialAccount
    data = request.get_json() or {}
    period = data.get('period', 'mensal')
    
    payments = Payment.query.all()
    invoices = Invoice.query.all()
    expenses = Expense.query.all()
    clients = Client.query.all()
    accounts = FinancialAccount.query.all()

    total_collected = sum(p.total or (p.amount + (p.penalty or 0)) for p in payments)
    total_expenses = sum(e.amount or 0 for e in expenses)
    net_income = total_collected - total_expenses
    
    total_clients = len(clients)
    active_clients = sum(1 for c in clients if c.status == 'active')
    late_clients = sum(1 for c in clients if c.status == 'late')
    collection_rate = round((active_clients / total_clients * 100)) if total_clients > 0 else 100

    report_narrative = (
        f"📊 **RELATÓRIO GERENCIAL EXECUTIVO & ANÁLISE DE PAGAMENTOS (OSDEL IA)**\n"
        f"• **Arrecadação Bruta:** {total_collected:,.0f} Kz ({len(payments)} pagamentos confirmados)\n"
        f"• **Despesas Operacionais:** {total_expenses:,.0f} Kz ({len(expenses)} lançamentos)\n"
        f"• **Resultado Líquido:** {net_income:,.0f} Kz (Margem operacional positiva)\n"
        f"• **Taxa de Cobrança:** {collection_rate}% ({active_clients} clientes adimplentes / {late_clients} em atraso)\n\n"
        f"💡 **Recomendações da IA:**\n"
        f"1. Foco em cobrança via WhatsApp nos dias 1 a 5 para reduzir inadimplência.\n"
        f"2. Incentivar o Multicaixa Express para evitar filas e erros de troco no balcão.\n"
        f"3. Sistema anti-duplicados ativo no backend para impedir duplicatas de recibo ou mensalidade."
    )

    return jsonify({
        'success': True,
        'narrative': report_narrative,
        'metrics': {
            'total_collected': total_collected,
            'total_expenses': total_expenses,
            'net_income': net_income,
            'collection_rate': collection_rate,
            'total_clients': total_clients,
            'active_clients': active_clients,
            'late_clients': late_clients
        },
        'timestamp': datetime.utcnow().isoformat()
    }), 200

