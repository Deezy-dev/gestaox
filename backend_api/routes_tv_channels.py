from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import (
    db,
    TvDecoderChannel,
    TvChannelPaymentHistory,
    TvChannelAudit,
    User,
    ActivityLog,
    Announcement,
    Expense
)

tv_channels_bp = Blueprint('tv_channels', __name__, url_prefix='/api/v1/tv-channels')


def _compute_status(decoder):
    """Atualiza o estado dinâmico com base na data de fim da subscrição"""
    if decoder.provider == 'Extravio' or decoder.status == 'extraviado':
        return 'extraviado'
    if decoder.is_free or decoder.provider == 'Banda Livre':
        return 'ativo'
    if not decoder.subscription_end_date:
        return decoder.status or 'ativo'
    
    delta = decoder.subscription_end_date - date.today()
    days = delta.days
    if days < 0:
        return 'expirado'
    if days <= 7:
        return 'alerta'
    return 'ativo'


@tv_channels_bp.route('', methods=['GET'])
def list_tv_channels():
    """Lista todos os descodificadores e canais com suporte a filtros e ordenação por canal"""
    provider = request.args.get('provider')
    status = request.args.get('status')
    search = request.args.get('search')
    
    query = TvDecoderChannel.query
    
    if provider and provider != 'todos':
        query = query.filter_by(provider=provider)
        
    decoders = query.order_by(TvDecoderChannel.channel_number.asc()).all()
    
    items = []
    for d in decoders:
        # Atualiza o status dinamicamente se necessário
        computed = _compute_status(d)
        if computed != d.status and d.status != 'manutencao' and d.status != 'extraviado':
            d.status = computed
            
        data = d.to_dict()
        
        # Filtro de busca textual
        if search:
            s = search.lower().strip()
            text = f"{d.channel_name} {d.channel_number} {d.provider_position} {d.card_number or ''} {d.provider} {d.decoder_model or ''}".lower()
            if s not in text:
                continue
                
        # Filtro de estado
        if status and status != 'todos':
            if status == 'extraviado' and (d.status != 'extraviado' and d.provider != 'Extravio'):
                continue
            elif status != 'extraviado' and d.status != status:
                continue
                
        items.append(data)
        
    db.session.commit()
    
    # Métricas instantâneas
    all_decoders = TvDecoderChannel.query.all()
    total_cost = sum(d.monthly_cost for d in all_decoders if not d.is_free and d.provider not in ['Banda Livre', 'Extravio'])
    extravio_count = len([d for d in all_decoders if d.provider == 'Extravio' or d.status == 'extraviado'])
    zap_count = len([d for d in all_decoders if d.provider == 'ZAP'])
    canal_count = len([d for d in all_decoders if d.provider == 'Canal+'])
    dstv_count = len([d for d in all_decoders if d.provider == 'DStv'])
    free_count = len([d for d in all_decoders if d.is_free or d.provider == 'Banda Livre'])
    alert_count = len([d for d in all_decoders if _compute_status(d) in ['alerta', 'expirado']])

    return jsonify({
        'success': True,
        'count': len(items),
        'items': items,
        'summary': {
            'total': len(all_decoders),
            'zapCount': zap_count,
            'canalCount': canal_count,
            'dstvCount': dstv_count,
            'freeCount': free_count,
            'extravioCount': extravio_count,
            'alertCount': alert_count,
            'totalMonthlyCost': total_cost
        }
    }), 200


@tv_channels_bp.route('/<string:decoder_id>', methods=['GET'])
def get_tv_channel(decoder_id):
    decoder = TvDecoderChannel.query.get(decoder_id)
    if not decoder:
        return jsonify({'success': False, 'message': 'Descodificador não encontrado'}), 404
        
    return jsonify({
        'success': True,
        'item': decoder.to_dict(),
        'paymentHistory': [p.to_dict() for p in decoder.payment_records]
    }), 200


@tv_channels_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def create_tv_channel():
    """Adiciona um novo descodificador ou canal ao Headend"""
    data = request.get_json() or {}
    
    decoder_id = data.get('id')
    if not decoder_id:
        import time
        decoder_id = f"dec-{int(time.time() * 1000)}"
        
    if TvDecoderChannel.query.get(decoder_id):
        return jsonify({'success': False, 'message': 'ID de descodificador já existe'}), 400
        
    channel_name = data.get('channelName') or data.get('channel_name')
    if not channel_name:
        return jsonify({'success': False, 'message': 'Nome do canal é obrigatório'}), 400

    provider = data.get('provider', 'ZAP')
    is_extravio = (provider == 'Extravio') or (data.get('status') == 'extraviado')
    is_free = bool(data.get('isFree') or data.get('is_free') or provider == 'Banda Livre' or is_extravio)
    
    start_date = None
    end_date = None
    if data.get('subscriptionStartDate'):
        try:
            start_date = datetime.strptime(data['subscriptionStartDate'][:10], '%Y-%m-%d').date()
        except:
            pass
    if data.get('subscriptionEndDate'):
        try:
            end_date = datetime.strptime(data['subscriptionEndDate'][:10], '%Y-%m-%d').date()
        except:
            pass
    elif not is_free and not is_extravio:
        start_date = date.today()
        end_date = date.today() + timedelta(days=30)

    user_name = data.get('userName') or data.get('lastEditedBy') or 'Administrador'

    decoder = TvDecoderChannel(
        id=decoder_id,
        channel_number=int(data.get('channelNumber') or data.get('channel_number') or 1),
        provider_position=int(data.get('providerPosition') or data.get('provider_position') or 1),
        channel_name=channel_name,
        category=data.get('category', 'generalista'),
        provider=provider,
        is_free=is_free,
        decoder_model=data.get('decoderModel') or data.get('decoder_model') or f"{provider} HD",
        decoder_serial=data.get('decoderSerial') or data.get('decoder_serial'),
        card_number=data.get('cardNumber') or data.get('card_number'),
        subscription_package=data.get('subscriptionPackage') or data.get('subscription_package') or 'Mensalidade',
        monthly_cost=float(data.get('monthlyCost') or data.get('monthly_cost') or (0 if is_free else 16500)),
        balance=float(data.get('balance') or 0.0),
        subscription_start_date=start_date,
        subscription_end_date=end_date,
        status='extraviado' if is_extravio else data.get('status', 'ativo'),
        signal_status='sem_sinal' if is_extravio else data.get('signalStatus', 'otimo'),
        signal_quality=int(data.get('signalQuality') or (0 if is_extravio else 95)),
        frequency_mhz=float(data.get('frequencyMhz') or 474.0),
        rf_channel=data.get('rfChannel') or 'E21',
        rack_unit=data.get('rackUnit') or 'Rack 1',
        hdmi_encoder_port=int(data.get('hdmiEncoderPort') or 1),
        last_renewed_by=data.get('lastRenewedBy'),
        last_edited_by=user_name,
        notes=data.get('notes')
    )
    
    db.session.add(decoder)
    
    # Registo de auditoria
    audit = TvChannelAudit(
        decoder_id=decoder_id,
        action='create',
        user_name=user_name,
        details=f"Criado descodificador/canal '{channel_name}' (Canal {decoder.channel_number}, Fornecedor {provider})"
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({'success': True, 'item': decoder.to_dict()}), 201


@tv_channels_bp.route('/<string:decoder_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_tv_channel(decoder_id):
    """Atualiza dados do descodificador, posição, fornecedor, extravio ou número de cartão"""
    decoder = TvDecoderChannel.query.get(decoder_id)
    if not decoder:
        return jsonify({'success': False, 'message': 'Descodificador não encontrado'}), 404
        
    data = request.get_json() or {}
    user_name = data.get('userName') or data.get('lastEditedBy') or 'Administrador'
    changes = []

    if 'channelNumber' in data or 'channel_number' in data:
        new_val = int(data.get('channelNumber') or data.get('channel_number'))
        if new_val != decoder.channel_number:
            changes.append(f"Posição na rede: {decoder.channel_number} -> {new_val}")
            decoder.channel_number = new_val
            
    if 'providerPosition' in data or 'provider_position' in data:
        new_val = int(data.get('providerPosition') or data.get('provider_position'))
        if new_val != decoder.provider_position:
            changes.append(f"Posição no fornecedor: {decoder.provider_position} -> {new_val}")
            decoder.provider_position = new_val
            
    if 'channelName' in data or 'channel_name' in data:
        new_name = data.get('channelName') or data.get('channel_name')
        if new_name != decoder.channel_name:
            changes.append(f"Nome do canal: '{decoder.channel_name}' -> '{new_name}'")
            decoder.channel_name = new_name
            
    if 'provider' in data:
        new_prov = data['provider']
        if new_prov != decoder.provider:
            changes.append(f"Fornecedor: '{decoder.provider}' -> '{new_prov}'")
            decoder.provider = new_prov
            if new_prov == 'Extravio':
                decoder.status = 'extraviado'
                decoder.signal_status = 'sem_sinal'
                decoder.is_free = True
                
    if 'cardNumber' in data or 'card_number' in data:
        new_card = data.get('cardNumber') or data.get('card_number')
        if new_card != decoder.card_number:
            changes.append(f"Cartão: {decoder.card_number} -> {new_card}")
            decoder.card_number = new_card
            
    if 'category' in data:
        decoder.category = data['category']
    if 'decoderModel' in data or 'decoder_model' in data:
        decoder.decoder_model = data.get('decoderModel') or data.get('decoder_model')
    if 'subscriptionPackage' in data or 'subscription_package' in data:
        decoder.subscription_package = data.get('subscriptionPackage') or data.get('subscription_package')
    if 'monthlyCost' in data or 'monthly_cost' in data:
        decoder.monthly_cost = float(data.get('monthlyCost') or data.get('monthly_cost') or 0)
    if 'balance' in data:
        decoder.balance = float(data['balance'] or 0)
    if 'status' in data:
        decoder.status = data['status']
    if 'signalStatus' in data or 'signal_status' in data:
        decoder.signal_status = data.get('signalStatus') or data.get('signal_status')
    if 'signalQuality' in data or 'signal_quality' in data:
        decoder.signal_quality = int(data.get('signalQuality') or data.get('signal_quality') or 0)
    if 'frequencyMhz' in data or 'frequency_mhz' in data:
        decoder.frequency_mhz = float(data.get('frequencyMhz') or data.get('frequency_mhz') or 474.0)
    if 'rfChannel' in data or 'rf_channel' in data:
        decoder.rf_channel = data.get('rfChannel') or data.get('rf_channel')
    if 'rackUnit' in data or 'rack_unit' in data:
        decoder.rack_unit = data.get('rackUnit') or data.get('rack_unit')
    if 'notes' in data:
        decoder.notes = data['notes']
    if 'isFree' in data or 'is_free' in data:
        decoder.is_free = bool(data.get('isFree') or data.get('is_free'))

    if 'subscriptionStartDate' in data and data['subscriptionStartDate']:
        try:
            decoder.subscription_start_date = datetime.strptime(data['subscriptionStartDate'][:10], '%Y-%m-%d').date()
        except:
            pass
    if 'subscriptionEndDate' in data and data['subscriptionEndDate']:
        try:
            decoder.subscription_end_date = datetime.strptime(data['subscriptionEndDate'][:10], '%Y-%m-%d').date()
        except:
            pass

    decoder.last_edited_by = user_name
    decoder.updated_at = datetime.utcnow()
    
    if changes:
        audit = TvChannelAudit(
            decoder_id=decoder.id,
            action='edit',
            user_name=user_name,
            details=" | ".join(changes)
        )
        db.session.add(audit)

    db.session.commit()
    return jsonify({'success': True, 'item': decoder.to_dict()}), 200


@tv_channels_bp.route('/<string:decoder_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_tv_channel(decoder_id):
    decoder = TvDecoderChannel.query.get(decoder_id)
    if not decoder:
        return jsonify({'success': False, 'message': 'Descodificador não encontrado'}), 404
        
    user_name = request.args.get('userName', 'Administrador')
    audit = TvChannelAudit(
        decoder_id=decoder_id,
        action='delete',
        user_name=user_name,
        details=f"Removido descodificador/canal {decoder.channel_name} ({decoder_id})"
    )
    db.session.add(audit)
    db.session.delete(decoder)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Descodificador removido com sucesso'}), 200


@tv_channels_bp.route('/swap-positions', methods=['POST'])
@jwt_required(optional=True)
def swap_positions():
    """Troca a posição de canais entre dois descodificadores"""
    data = request.get_json() or {}
    id_a = data.get('decoderIdA') or data.get('idA')
    id_b = data.get('decoderIdB') or data.get('idB')
    user_name = data.get('userName', 'Administrador')
    
    if not id_a or not id_b:
        return jsonify({'success': False, 'message': 'IDs de ambos descodificadores são necessários'}), 400
        
    dec_a = TvDecoderChannel.query.get(id_a)
    dec_b = TvDecoderChannel.query.get(id_b)
    
    if not dec_a or not dec_b:
        return jsonify({'success': False, 'message': 'Um ou ambos descodificadores não encontrados'}), 404
        
    pos_a = dec_a.channel_number
    pos_b = dec_b.channel_number
    
    dec_a.channel_number = pos_b
    dec_b.channel_number = pos_a
    dec_a.last_edited_by = user_name
    dec_b.last_edited_by = user_name
    
    audit = TvChannelAudit(
        decoder_id=f"{id_a},{id_b}",
        action='swap_position',
        user_name=user_name,
        details=f"Troca de posições: '{dec_a.channel_name}' passou para canal {pos_b} e '{dec_b.channel_name}' para canal {pos_a}"
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f"Posições trocadas com sucesso! ({dec_a.channel_name}: {pos_b}, {dec_b.channel_name}: {pos_a})",
        'items': [dec_a.to_dict(), dec_b.to_dict()]
    }), 200


@tv_channels_bp.route('/<string:decoder_id>/replace', methods=['POST'])
@jwt_required(optional=True)
def replace_channel_on_decoder(decoder_id):
    """Substitui o canal exibido num descodificador específico mantendo o equipamento"""
    decoder = TvDecoderChannel.query.get(decoder_id)
    if not decoder:
        return jsonify({'success': False, 'message': 'Descodificador não encontrado'}), 404
        
    data = request.get_json() or {}
    new_name = data.get('newChannelName') or data.get('channelName')
    if not new_name:
        return jsonify({'success': False, 'message': 'Novo nome do canal é obrigatório'}), 400
        
    old_name = decoder.channel_name
    user_name = data.get('userName', 'Administrador')
    
    decoder.channel_name = new_name
    if 'category' in data:
        decoder.category = data['category']
    if 'providerPosition' in data:
        decoder.provider_position = int(data['providerPosition'])
    if 'notes' in data:
        decoder.notes = data['notes']
        
    decoder.last_edited_by = user_name
    
    audit = TvChannelAudit(
        decoder_id=decoder_id,
        action='replace',
        user_name=user_name,
        details=f"Canal substituído no descodificador {decoder_id}: de '{old_name}' para '{new_name}' (Posição Fornecedor: {decoder.provider_position})"
    )
    db.session.add(audit)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f"Canal alterado com sucesso para '{new_name}'",
        'item': decoder.to_dict()
    }), 200


@tv_channels_bp.route('/<string:decoder_id>/renew', methods=['POST'])
@jwt_required(optional=True)
def renew_subscription(decoder_id):
    """
    Renovação de subscrição mensal do descodificador (1 mês = 30 dias)
    Guarda histórico de pagamento e quem realizou o pagamento.
    """
    decoder = TvDecoderChannel.query.get(decoder_id)
    if not decoder:
        return jsonify({'success': False, 'message': 'Descodificador não encontrado'}), 404
        
    data = request.get_json() or {}
    amount = float(data.get('amount') or decoder.monthly_cost or 16500)
    paid_by = data.get('paidBy') or data.get('userName') or 'Administrador'
    payment_method = data.get('paymentMethod', 'multicaixa')
    receipt = data.get('receiptReference') or data.get('receipt') or f"REC-TV-{int(datetime.utcnow().timestamp())}"
    notes = data.get('notes', 'Renovação de mensalidade 30 dias')

    # Calcula novo período (se já estiver vencido, começa a partir de hoje; senão acrescenta 30 dias à data final atual)
    today = date.today()
    if not decoder.subscription_end_date or decoder.subscription_end_date < today:
        start_date = today
        end_date = today + timedelta(days=30)
    else:
        start_date = decoder.subscription_end_date
        end_date = decoder.subscription_end_date + timedelta(days=30)

    decoder.subscription_start_date = start_date
    decoder.subscription_end_date = end_date
    decoder.status = 'ativo'
    decoder.last_renewed_by = paid_by
    decoder.last_edited_by = paid_by
    
    # Regista histórico de pagamento
    payment = TvChannelPaymentHistory(
        decoder_id=decoder.id,
        channel_name=decoder.channel_name,
        provider=decoder.provider,
        card_number=decoder.card_number,
        amount=amount,
        paid_by=paid_by,
        payment_method=payment_method,
        period_start=start_date,
        period_end=end_date,
        receipt_reference=receipt,
        notes=notes
    )
    db.session.add(payment)
    
    # Registo de auditoria
    audit = TvChannelAudit(
        decoder_id=decoder.id,
        action='renew',
        user_name=paid_by,
        details=f"Subscrição renovada por 30 dias: {start_date.isoformat()} até {end_date.isoformat()} ({amount:.2f} Kz via {payment_method})"
    )
    db.session.add(audit)
    
    # Regista também como Despesa operacional do sistema
    try:
        expense = Expense(
            code=f"DSP-TV-{payment.id or int(datetime.utcnow().timestamp())}",
            category='subscricoes_tv',
            description=f"Subscrição Headend TV: {decoder.channel_name} ({decoder.provider}) - Cartão {decoder.card_number or 'S/N'}",
            amount=amount,
            beneficiary=f"Operadora {decoder.provider}",
            payment_method=payment_method,
            status='pago',
            approved_by=paid_by,
            notes=f"Recibo {receipt}"
        )
        db.session.add(expense)
    except:
        pass
        
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f"Subscrição de '{decoder.channel_name}' renovada com sucesso até {end_date.strftime('%d/%m/%Y')}!",
        'item': decoder.to_dict(),
        'payment': payment.to_dict()
    }), 200


@tv_channels_bp.route('/alerts', methods=['GET'])
def get_subscription_alerts():
    """
    Retorna os descodificadores com alertas de expiração:
    - 7 dias antes (1 semana)
    - 3 dias antes
    - 1 dia antes
    - Já expirados
    - Extravios
    """
    decoders = TvDecoderChannel.query.all()
    today = date.today()
    
    alerts_7_days = []
    alerts_3_days = []
    alerts_1_day = []
    expired = []
    extraviados = []
    
    for d in decoders:
        if d.provider == 'Extravio' or d.status == 'extraviado':
            extraviados.append(d.to_dict())
            continue
        if d.is_free or d.provider == 'Banda Livre' or not d.subscription_end_date:
            continue
            
        delta = d.subscription_end_date - today
        days = delta.days
        
        info = d.to_dict()
        info['daysRemaining'] = days
        
        if days < 0:
            expired.append(info)
        elif days <= 1:
            alerts_1_day.append(info)
        elif days <= 3:
            alerts_3_days.append(info)
        elif days <= 7:
            alerts_7_days.append(info)

    total_requiring_attention = len(expired) + len(alerts_1_day) + len(alerts_3_days) + len(alerts_7_days)
    
    return jsonify({
        'success': True,
        'today': today.isoformat(),
        'totalRequiringAttention': total_requiring_attention,
        'alerts': {
            'expired': expired,
            'oneDayBefore': alerts_1_day,
            'threeDaysBefore': alerts_3_days,
            'oneWeekBefore': alerts_7_days,
            'extraviados': extraviados
        }
    }), 200


@tv_channels_bp.route('/notify-admins', methods=['POST'])
@jwt_required(optional=True)
def notify_administrative_members():
    """
    Envia alertas de subscrição EXCLUSIVAMENTE a todos os membros administrativos:
    - SuperAdmin ('superadmin')
    - Boss / Director ('boss')
    - Administrador ('admin')
    - Operador ('operador')
    
    IMPORTANTE: Os técnicos ('tecnico') NÃO recebem esta notificação,
    cumprindo a regra do negócio: 'mandar mensagem a todos os membros administrativos, os tecnicos nao'.
    """
    # 1. Busca todos os utilizadores com funções administrativas
    admin_roles = ['superadmin', 'boss', 'admin', 'operador']
    admins = User.query.filter(User.role.in_(admin_roles), User.is_active == True).all()
    
    # 2. Coleta os canais que estão a expirar ou já expiraram
    today = date.today()
    decoders = TvDecoderChannel.query.all()
    
    urgent_channels = []
    warning_channels = []
    expired_channels = []
    extraviado_channels = []
    
    for d in decoders:
        if d.provider == 'Extravio' or d.status == 'extraviado':
            extraviado_channels.append(d)
            continue
        if d.is_free or d.provider == 'Banda Livre' or not d.subscription_end_date:
            continue
            
        days = (d.subscription_end_date - today).days
        if days < 0:
            expired_channels.append((d, abs(days)))
        elif days <= 1:
            urgent_channels.append((d, days))
        elif days <= 3:
            urgent_channels.append((d, days))
        elif days <= 7:
            warning_channels.append((d, days))

    total_alerts = len(expired_channels) + len(urgent_channels) + len(warning_channels)
    
    # 3. Formata mensagem profissional para WhatsApp e SMS
    lines = [
        "📺 *ALERTA DO HEADEND OSDEL - SUBSCRIÇÕES DE CANAIS TV*",
        f"📅 Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        "⚠️ *Atenção:* Mensagem enviada exclusivamente aos membros da Administração.\n"
    ]
    
    if expired_channels:
        lines.append("🔴 *CANAIS EXPIRADOS (SEM SINAL/URGENTE):*")
        for d, days in expired_channels:
            lines.append(f"• *{d.channel_name}* (Canal {d.channel_number}) - Fornecedor: {d.provider} | Cartão: `{d.card_number or 'S/N'}` | Expirou há {days} dia(s)")
        lines.append("")
        
    if urgent_channels:
        lines.append("🟠 *EXPIRAM EM BREVE (1 A 3 DIAS):*")
        for d, days in urgent_channels:
            term = "AMANHÃ" if days == 1 else f"em {days} dias"
            lines.append(f"• *{d.channel_name}* (Canal {d.channel_number}) - Fornecedor: {d.provider} | Cartão: `{d.card_number or 'S/N'}` | Expira: {term} ({d.subscription_end_date.strftime('%d/%m')})")
        lines.append("")
        
    if warning_channels:
        lines.append("🟡 *EXPIRAM EM 1 SEMANA (7 DIAS):*")
        for d, days in warning_channels:
            lines.append(f"• *{d.channel_name}* (Canal {d.channel_number}) - Fornecedor: {d.provider} | Cartão: `{d.card_number or 'S/N'}` | Expira em {days} dias ({d.subscription_end_date.strftime('%d/%m')})")
        lines.append("")

    if extraviado_channels:
        lines.append("⚠️ *DESCODIFICADORES EXTRAVIADOS / AVERIGUAÇÃO:*")
        for d in extraviado_channels:
            lines.append(f"• *{d.channel_name}* - Fornecedor: {d.provider} | Cartão: `{d.card_number or 'S/N'}`")
        lines.append("")
        
    lines.append("💡 *Ação Necessária:* Efetue a recarga do cartão via Multicaixa Express ou no agente da operadora para evitar corte de emissão aos clientes.")
    lines.append("💻 *Gestão do Headend:* Aceda ao painel OSDEL Gestão > Canais TV.")
    
    message_text = "\n".join(lines)
    
    # 4. Cria links diretos de WhatsApp para cada membro administrativo
    import urllib.parse
    encoded_msg = urllib.parse.quote(message_text)
    
    recipients = []
    for admin in admins:
        phone = admin.phone or ''
        clean_phone = ''.join(c for c in phone if c.isdigit())
        if clean_phone and not clean_phone.startswith('244'):
            clean_phone = '244' + clean_phone
            
        wa_link = f"https://wa.me/{clean_phone}?text={encoded_msg}" if clean_phone else None
        
        recipients.append({
            'id': admin.id,
            'name': admin.full_name,
            'role': admin.role,
            'roleTitle': admin.job_title or admin.role.upper(),
            'phone': admin.phone,
            'email': admin.email,
            'whatsappUrl': wa_link
        })

    # 5. Registo no mural do sistema e no log de auditoria
    try:
        ann = Announcement(
            title="Alerta de Subscrições do Headend TV",
            content=f"Notificação enviada a {len(recipients)} membros administrativos sobre {total_alerts} canais a expirar ou expirados.",
            category="alerta",
            date=datetime.now().strftime('%d de %B de %Y'),
            is_active=True
        )
        db.session.add(ann)
        
        log = ActivityLog(
            action="notify_admins",
            entity="tv_channels",
            details=f"Notificação de canais TV enviada para {len(recipients)} administradores (técnicos excluídos com sucesso)."
        )
        db.session.add(log)
        db.session.commit()
    except:
        pass

    return jsonify({
        'success': True,
        'message': f"Notificações geradas com sucesso para {len(recipients)} membros administrativos! (Técnicos foram expressamente excluídos conforme a política).",
        'recipientsCount': len(recipients),
        'recipients': recipients,
        'alertsCount': total_alerts,
        'messagePreview': message_text
    }), 200


@tv_channels_bp.route('/history', methods=['GET'])
def get_payment_and_audit_history():
    """Retorna o histórico de pagamentos de subscrições e histórico de auditoria"""
    decoder_id = request.args.get('decoderId')
    
    payments_query = TvChannelPaymentHistory.query
    audits_query = TvChannelAudit.query
    
    if decoder_id:
        payments_query = payments_query.filter_by(decoder_id=decoder_id)
        audits_query = audits_query.filter_by(decoder_id=decoder_id)
        
    payments = payments_query.order_by(TvChannelPaymentHistory.id.desc()).limit(100).all()
    audits = audits_query.order_by(TvChannelAudit.id.desc()).limit(100).all()
    
    return jsonify({
        'success': True,
        'payments': [p.to_dict() for p in payments],
        'audits': [a.to_dict() for a in audits]
    }), 200


@tv_channels_bp.route('/stats', methods=['GET'])
def get_headend_stats():
    """Estatísticas globais e KPIs do Headend"""
    decoders = TvDecoderChannel.query.all()
    today = date.today()
    
    zap_decoders = [d for d in decoders if d.provider == 'ZAP']
    canal_decoders = [d for d in decoders if d.provider == 'Canal+']
    dstv_decoders = [d for d in decoders if d.provider == 'DStv']
    free_decoders = [d for d in decoders if d.is_free or d.provider == 'Banda Livre']
    extravio_decoders = [d for d in decoders if d.provider == 'Extravio' or d.status == 'extraviado']
    
    expiring_soon = [
        d for d in decoders
        if not d.is_free and d.provider not in ['Banda Livre', 'Extravio'] and d.subscription_end_date and 0 <= (d.subscription_end_date - today).days <= 7
    ]
    expired = [
        d for d in decoders
        if not d.is_free and d.provider not in ['Banda Livre', 'Extravio'] and d.subscription_end_date and (d.subscription_end_date - today).days < 0
    ]
    
    total_cost = sum(d.monthly_cost for d in decoders if not d.is_free and d.provider not in ['Banda Livre', 'Extravio'])
    zap_cost = sum(d.monthly_cost for d in zap_decoders)
    canal_cost = sum(d.monthly_cost for d in canal_decoders)
    
    return jsonify({
        'success': True,
        'stats': {
            'totalDecoders': len(decoders),
            'zapCount': len(zap_decoders),
            'canalCount': len(canal_decoders),
            'dstvCount': len(dstv_decoders),
            'freeCount': len(free_decoders),
            'extravioCount': len(extravio_decoders),
            'expiringSoonCount': len(expiring_soon),
            'expiredCount': len(expired),
            'totalMonthlyCost': total_cost,
            'zapCost': zap_cost,
            'canalCost': canal_cost
        }
    }), 200
