"""
Módulo de Mensagens, Chat da Equipa, Atendimento ao Cliente e Chatbot OSDEL.
Compatível 100% com o plano gratuito do PythonAnywhere (SQLite, zero dependências externas).
"""
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, TeamMessageRecord, ChatMessageRecord, SupportInterventionRecord, Client, User

messages_bp = Blueprint('messages', __name__, url_prefix='/api/v1/messages')

# Palavras-chave que ativam intervenção humana imediata
HUMAN_KEYWORDS = [
    'atendente', 'humano', 'operador', 'administrador', 'falar com atendente',
    'falar com humano', 'reclamacao', 'reclamação', 'cabo partido', 'cabo rompido',
    'corte indevido', 'paguei e nao religou', 'estorno', 'cancelar', 'cancelamento',
    'advogado', 'procon', 'problema grave'
]

# -------------------------------------------------------------
# 1. MENSAGENS DA EQUIPA (INTERNAS)
# -------------------------------------------------------------

@messages_bp.route('/team', methods=['GET'])
def get_team_messages():
    """Retorna mensagens do chat da equipa por canal ou todas"""
    channel_id = request.args.get('channelId')
    limit = int(request.args.get('limit', 100))
    
    query = TeamMessageRecord.query
    if channel_id:
        query = query.filter_by(channel_id=channel_id)
    
    messages = query.order_by(TeamMessageRecord.created_at.asc()).limit(limit).all()
    return jsonify({
        'success': True,
        'items': [m.to_dict() for m in messages],
        'total': len(messages)
    }), 200

@messages_bp.route('/team', methods=['POST'])
def send_team_message():
    """Publica mensagem num canal da equipa"""
    data = request.get_json() or {}
    message_text = (data.get('message') or '').strip()
    if not message_text:
        return jsonify({'success': False, 'message': 'Mensagem vazia.'}), 400

    msg_id = data.get('id') or f"tm-{uuid.uuid4().hex[:8]}"
    channel_id = data.get('channelId') or 'geral'
    sender_id = data.get('senderId')
    sender_name = data.get('senderName') or 'Colaborador OSDEL'
    sender_role = data.get('senderRole') or 'tecnico'
    priority = data.get('priority') or 'normal'

    record = TeamMessageRecord(
        id=msg_id,
        channel_id=channel_id,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        message=message_text,
        priority=priority,
        created_at=datetime.utcnow()
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({
        'success': True,
        'item': record.to_dict(),
        'message': 'Mensagem enviada com sucesso à equipa.'
    }), 201

# -------------------------------------------------------------
# 2. CHAT CLIENTE & CHATBOT & INTERVENÇÃO HUMANA
# -------------------------------------------------------------

@messages_bp.route('/client/<int:client_id>', methods=['GET'])
def get_client_chat(client_id):
    """Retorna o histórico de conversas do cliente com a empresa/bot"""
    messages = ChatMessageRecord.query.filter_by(client_id=client_id).order_by(ChatMessageRecord.created_at.asc()).all()
    
    # Se não houver mensagens ainda, envia mensagem de boas-vindas do Bot
    if not messages:
        client = Client.query.get(client_id)
        client_name = client.full_name if client else "Assinante"
        client_code = client.code if client else f"CLI-{client_id:05d}"
        
        welcome = ChatMessageRecord(
            id=f"cmsg-welcome-{client_id}",
            client_id=client_id,
            client_code=client_code,
            client_name=client_name,
            sender='bot',
            sender_name='Assistente Virtual OSDEL',
            message=f"Olá {client_name}! Seja bem-vindo ao Atendimento Digital da OSDEL Tecnologia. Sou o seu assistente virtual. Como posso ajudar hoje?",
            requires_human=False,
            created_at=datetime.utcnow()
        )
        db.session.add(welcome)
        db.session.commit()
        messages = [welcome]

    return jsonify({
        'success': True,
        'items': [m.to_dict() for m in messages],
        'total': len(messages)
    }), 200

@messages_bp.route('/client', methods=['POST'])
def send_client_chat_message():
    """
    Envia mensagem no chat do cliente. Se o remetente for o cliente,
    executa o motor inteligente do chatbot e avalia necessidade de intervenção humana.
    """
    data = request.get_json() or {}
    client_id = data.get('clientId')
    client_code = data.get('clientCode') or f"CLI-{client_id}"
    client_name = data.get('clientName') or "Cliente"
    message_text = (data.get('message') or '').strip()
    sender = data.get('sender') or 'client'
    sender_name = data.get('senderName') or ('Cliente' if sender == 'client' else 'Operador')

    if not client_id or not message_text:
        return jsonify({'success': False, 'message': 'Cliente ou mensagem inválida.'}), 400

    # 1. Salva a mensagem do remetente
    user_msg_id = data.get('id') or f"cmsg-{uuid.uuid4().hex[:8]}"
    user_record = ChatMessageRecord(
        id=user_msg_id,
        client_id=client_id,
        client_code=client_code,
        client_name=client_name,
        sender=sender,
        sender_name=sender_name,
        message=message_text,
        requires_human=False,
        created_at=datetime.utcnow()
    )
    db.session.add(user_record)
    db.session.commit()

    bot_reply_dict = None
    intervention_ticket = None

    # 2. Se for mensagem do cliente, faz análise do Bot
    if sender == 'client':
        clean = message_text.lower()
        requires_human = any(kw in clean for kw in HUMAN_KEYWORDS)

        if requires_human:
            # Cria ticket de intervenção humana
            ticket_id = f"ticket-{uuid.uuid4().hex[:6]}"
            client_obj = Client.query.get(client_id)
            phone = client_obj.phone if client_obj else ""
            address = client_obj.address if client_obj else ""
            stype = client_obj.service_type if client_obj else "tv"

            existing_ticket = SupportInterventionRecord.query.filter_by(
                client_id=client_id,
                status='aguardando_atendente'
            ).first()

            if existing_ticket:
                existing_ticket.last_client_message = message_text
                existing_ticket.updated_at = datetime.utcnow()
                intervention_ticket = existing_ticket
            else:
                intervention_ticket = SupportInterventionRecord(
                    id=ticket_id,
                    client_id=client_id,
                    client_code=client_code,
                    client_name=client_name,
                    client_phone=phone,
                    client_address=address,
                    service_type=stype,
                    reason=f"Solicitação Humana: {message_text[:80]}",
                    status='aguardando_atendente',
                    last_client_message=message_text,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.session.add(intervention_ticket)

            # Notifica canal da equipa
            team_alert = TeamMessageRecord(
                id=f"tm-alert-{uuid.uuid4().hex[:6]}",
                channel_id='suporte-clientes',
                sender_id=0,
                sender_name='Bot Atendimento OSDEL',
                sender_role='sistema',
                message=f"🚨 INTERVENÇÃO HUMANA: O cliente {client_name} ({client_code}) solicitou apoio administrativo: '{message_text[:90]}'.",
                priority='urgente',
                created_at=datetime.utcnow()
            )
            db.session.add(team_alert)

            bot_msg_text = (
                f"🔔 **Solicitação de Intervenção Humana Registrada com Sucesso!**\n\n"
                f"Identifiquei que você precisa de atenção específica da nossa equipa administrativa.\n\n"
                f"📋 Assinante: **{client_name}** ({client_code})\n"
                f"• Prioridade: **Alta / Urgente**\n\n"
                f"Um operador administrativo da OSDEL Tecnologia já foi alertado e assumirá este chat diretamente. Por favor aguarde um momento."
            )
        elif 'saldo' in clean or 'fatura' in clean or 'divida' in clean:
            bot_msg_text = (
                f"📄 **Consulta de Fatura OSDEL ({client_code}):**\n\n"
                f"As mensalidades vencem no dia 5 de cada mês. Pode efetuar a liquidação por Multicaixa Express "
                f"ou transferência bancária BAI / BFA. Digite 'pagar' para obter os números de IBAN oficiais."
            )
        elif 'pagar' in clean or 'iban' in clean or 'banco' in clean:
            bot_msg_text = (
                f"💳 **Coordenadas Bancárias OSDEL Tecnologia:**\n\n"
                f"🏛️ **Banco BAI:** AO06.0040.0000.1234.5678.9012.3\n"
                f"🏛️ **Banco BFA:** AO06.0006.0000.9876.5432.1098.7\n"
                f"Titular: OSDEL TECNOLOGIA LDA\n"
                f"Por favor insira o seu código {client_code} no descritivo da transferência."
            )
        elif 'los' in clean or 'vermelha' in clean or 'sem internet' in clean:
            bot_msg_text = (
                f"🔴 **Luz LOS Vermelha / Sem Internet:**\n\n"
                f"Indica que não há sinal óptico a chegar ao modem. Reinicie a ONU desligando da tomada por 30 segundos. "
                f"Se continuar vermelha, clique em 'Falar com Atendente' para envio do piquete de rua."
            )
        else:
            bot_msg_text = (
                f"🤖 **Assistente OSDEL:** Recebi a sua mensagem. "
                f"Para questões financeiras, técnicas ou para falar com um colaborador humano da nossa administração, "
                f"escreva 'falar com atendente'."
            )

        bot_record = ChatMessageRecord(
            id=f"cmsg-bot-{uuid.uuid4().hex[:8]}",
            client_id=client_id,
            client_code=client_code,
            client_name=client_name,
            sender='bot',
            sender_name='Assistente Virtual OSDEL',
            message=bot_msg_text,
            requires_human=requires_human,
            created_at=datetime.utcnow()
        )
        db.session.add(bot_record)
        db.session.commit()
        bot_reply_dict = bot_record.to_dict()

    return jsonify({
        'success': True,
        'userMessage': user_record.to_dict(),
        'botReply': bot_reply_dict,
        'requiresHuman': intervention_ticket is not None,
        'interventionTicket': intervention_ticket.to_dict() if intervention_ticket else None
    }), 201

# -------------------------------------------------------------
# 3. INTERVENÇÕES ADMINISTRATIVAS (GESTÃO DE FILA)
# -------------------------------------------------------------

@messages_bp.route('/interventions', methods=['GET'])
def get_interventions():
    """Lista todos os chamados de suporte aguardando ou em atendimento"""
    status_filter = request.args.get('status')
    query = SupportInterventionRecord.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    
    tickets = query.order_by(SupportInterventionRecord.created_at.desc()).all()
    return jsonify({
        'success': True,
        'items': [t.to_dict() for t in tickets],
        'total': len(tickets)
    }), 200

@messages_bp.route('/interventions/<string:ticket_id>/claim', methods=['POST'])
def claim_intervention(ticket_id):
    """Membro administrativo assume o atendimento do cliente"""
    data = request.get_json() or {}
    admin_name = data.get('adminName') or "Administrador OSDEL"
    admin_id = data.get('adminId')

    ticket = SupportInterventionRecord.query.get(ticket_id)
    if not ticket:
        return jsonify({'success': False, 'message': 'Ticket não encontrado.'}), 404

    ticket.status = 'em_atendimento'
    ticket.assigned_admin_name = admin_name
    ticket.assigned_admin_id = admin_id
    ticket.updated_at = datetime.utcnow()

    # Publica mensagem no chat do cliente
    reply = ChatMessageRecord(
        id=f"cmsg-admin-{uuid.uuid4().hex[:8]}",
        client_id=ticket.client_id,
        client_code=ticket.client_code,
        client_name=ticket.client_name,
        sender='admin',
        sender_name=admin_name,
        message=f"👋 Olá! Sou o(a) {admin_name} da Administração OSDEL e assumi o seu atendimento. Como posso ajudá-lo(a)?",
        handled_by_admin=admin_name,
        created_at=datetime.utcnow()
    )
    db.session.add(reply)
    db.session.commit()

    return jsonify({
        'success': True,
        'ticket': ticket.to_dict(),
        'adminMessage': reply.to_dict()
    }), 200

@messages_bp.route('/interventions/<string:ticket_id>/resolve', methods=['POST'])
def resolve_intervention(ticket_id):
    """Finaliza o chamado de intervenção humana"""
    data = request.get_json() or {}
    admin_name = data.get('adminName') or "Administrador OSDEL"

    ticket = SupportInterventionRecord.query.get(ticket_id)
    if not ticket:
        return jsonify({'success': False, 'message': 'Ticket não encontrado.'}), 404

    ticket.status = 'resolvido'
    ticket.updated_at = datetime.utcnow()

    reply = ChatMessageRecord(
        id=f"cmsg-admin-{uuid.uuid4().hex[:8]}",
        client_id=ticket.client_id,
        client_code=ticket.client_code,
        client_name=ticket.client_name,
        sender='admin',
        sender_name=admin_name,
        message=f"✅ Atendimento concluído por {admin_name}. A OSDEL Tecnologia agradece o seu contacto!",
        handled_by_admin=admin_name,
        created_at=datetime.utcnow()
    )
    db.session.add(reply)
    db.session.commit()

    return jsonify({
        'success': True,
        'ticket': ticket.to_dict()
    }), 200
