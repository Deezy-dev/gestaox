import random
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Client, User, ActivityLog

clients_bp = Blueprint('clients', __name__, url_prefix='/api/v1/clients')

def generate_client_code():
    """Gera código único para o cliente (ex: CLI-00124)"""
    last_client = Client.query.order_by(Client.id.desc()).first()
    next_num = (last_client.id + 1) if last_client else 1
    return f"CLI-{next_num:05d}"

def get_audit_user(user_id):
    if user_id and str(user_id).isdigit():
        return User.query.get(int(user_id))
    return None

@clients_bp.route('', methods=['GET'])
@jwt_required(optional=True)
def list_clients():
    """Lista clientes com filtros de pesquisa, status, modalidade e paginação"""
    search = request.args.get('search', '').strip().lower()
    status = request.args.get('status', '').strip().lower()
    service_type = request.args.get('service_type', '').strip().lower()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    query = Client.query
    
    if search:
        query = query.filter(
            db.or_(
                Client.full_name.ilike(f'%{search}%'),
                Client.phone.ilike(f'%{search}%'),
                Client.code.ilike(f'%{search}%'),
                Client.document_number.ilike(f'%{search}%'),
                Client.neighborhood.ilike(f'%{search}%')
            )
        )
        
    if status and status != 'todos':
        query = query.filter(Client.status == status)
        
    if service_type and service_type != 'todos':
        query = query.filter(Client.service_type == service_type)
        
    query = query.order_by(Client.id.desc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    clients_list = [c.to_dict() for c in pagination.items]
    
    return jsonify({
        'success': True,
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'per_page': pagination.per_page,
        'items': clients_list
    }), 200


@clients_bp.route('/<int:client_id>', methods=['GET'])
@jwt_required(optional=True)
def get_client(client_id):
    """Retorna detalhes de um cliente específico"""
    client = Client.query.get_or_404(client_id)
    
    client_dict = client.to_dict()
    client_dict['invoices'] = [inv.to_dict() for inv in client.invoices]
    client_dict['budgets'] = [b.to_dict() for b in client.budgets]
    
    return jsonify({
        'success': True,
        'client': client_dict
    }), 200


@clients_bp.route('/<int:client_id>/payments', methods=['GET'])
def get_client_payments(client_id):
    """Retorna faturas e histórico financeiro de um assinante"""
    client = Client.query.get_or_404(client_id)
    invoices = [inv.to_dict() for inv in client.invoices]
    return jsonify({
        'success': True,
        'client_id': client.id,
        'client_code': client.code,
        'payments': invoices,
        'invoices': invoices
    }), 200


@clients_bp.route('/<int:client_id>/contract', methods=['GET'])
def get_client_contract(client_id):
    """Retorna dados do contrato do assinante"""
    client = Client.query.get_or_404(client_id)
    contract_data = {
        'contractNumber': f"CTR-{client.created_at.year if client.created_at else 2026}-{client.id:05d}",
        'clientId': client.id,
        'clientCode': client.code,
        'clientName': client.full_name,
        'nif': client.document_number or 'Consumidor Final',
        'address': client.address or f"{client.neighborhood}, Luanda",
        'phone': client.phone,
        'serviceType': client.service_type,
        'planName': 'Plano OSDEL Família Max' if client.service_type == 'combo' else ('Plano Internet Fibra' if client.service_type == 'fibra' else 'TV a Cabo'),
        'monthlyFee': client.monthly_fee,
        'dueDay': client.due_day or 5,
        'status': client.status,
        'startDate': client.created_at.strftime('%d/%m/%Y') if client.created_at else '01/01/2026',
        'pdoBox': client.pdo_number or 'PDO-01',
        'onuNumber': client.onu_number or 'ONU-PADRAO',
        'opticalRxDbm': client.optical_rx_dbm or -19.5
    }
    return jsonify({
        'success': True,
        'contract': contract_data
    }), 200


@clients_bp.route('/<int:client_id>/reset-pin', methods=['POST'])
@jwt_required()
def reset_client_pin(client_id):
    """Gera ou atualiza o PIN de 4 dígitos do cliente"""
    client = Client.query.get_or_404(client_id)
    data = request.get_json() or {}
    new_pin = str(data.get('pin', '')).strip()
    if not new_pin or len(new_pin) != 4:
        new_pin = str(random.randint(1000, 9999))
        
    client.pin = new_pin
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'PIN do cliente {client.full_name} atualizado com sucesso.',
        'pin': client.pin,
        'client': client.to_dict()
    }), 200


@clients_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def create_client():
    """Cadastra um novo cliente no sistema"""
    data = request.get_json() or {}
    
    full_name = data.get('full_name', '').strip()
    phone = data.get('phone', '').strip()
    
    if not full_name or not phone:
        return jsonify({
            'success': False,
            'message': 'Campos obrigatórios: full_name e phone.'
        }), 400

    # 1. Validação de Duplicidade por Nome Completo (case-insensitive)
    existing_name = Client.query.filter(db.func.lower(Client.full_name) == full_name.lower()).first()
    if existing_name:
        return jsonify({
            'success': False,
            'message': f'Já existe um cliente registado com este Nome ({existing_name.full_name} - Código: {existing_name.code}). Não é permitido duplicar nomes!'
        }), 409

    # 2. Validação de Duplicidade por B.I. / NIF (document_number ou nif)
    doc_num = (data.get('document_number') or data.get('nif') or '').strip()
    if doc_num:
        existing_doc = Client.query.filter(db.func.lower(Client.document_number) == doc_num.lower()).first()
        if existing_doc:
            return jsonify({
                'success': False,
                'message': f'O B.I. / NIF "{doc_num}" já se encontra registado para o cliente {existing_doc.full_name} ({existing_doc.code}). Não é permitido duplicar documentos!'
            }), 409
        
    code = data.get('code') or generate_client_code()
    
    # Verifica duplicidade de código
    if Client.query.filter_by(code=code).first():
        code = generate_client_code()
        
    pin = str(data.get('pin', '')).strip()
    if not pin or len(pin) != 4:
        pin = str(random.randint(1000, 9999))
        
    new_client = Client(
        code=code,
        full_name=full_name,
        phone=phone,
        alternate_phone=data.get('alternate_phone', '').strip() or None,
        email=data.get('email', '').strip() or None,
        pin=pin,
        address=data.get('address', '').strip() or None,
        neighborhood=data.get('neighborhood', '').strip() or None,
        city=data.get('city', 'Luanda').strip(),
        document_number=doc_num or None,
        service_type=data.get('service_type', 'combo'),
        status=data.get('status', 'active'),
        house_code=data.get('house_code', '').strip() or None,
        pdo_number=data.get('pdo_number', '').strip() or None,
        onu_number=data.get('onu_number', '').strip() or None,
        monthly_fee=float(data.get('monthly_fee', 4000.0)),
        due_day=int(data.get('due_day', 5)),
        notes=data.get('notes', '').strip() or None
    )
    
    db.session.add(new_client)
    db.session.commit()
    
    # Auditoria
    user_id = get_jwt_identity()
    user = get_audit_user(user_id)
    log = ActivityLog(
        user_id=int(user_id) if user_id and str(user_id).isdigit() else None,
        username=user.username if user else 'sistema',
        action='CREATE_CLIENT',
        entity='CLIENT',
        details=f'Criado cliente {new_client.full_name} ({new_client.code}) com PIN {new_client.pin}'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Cliente cadastrado com sucesso!',
        'client': new_client.to_dict()
    }), 201


@clients_bp.route('/<int:client_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_client(client_id):
    """Atualiza dados cadastrais de um cliente e propaga alterações em cascata"""
    from models import Invoice, ServiceOrder, PaymentAgreement, Payment, Contract
    client = Client.query.get_or_404(client_id)
    data = request.get_json() or {}
    
    old_name = client.full_name
    name_val = data.get('full_name') or data.get('name')
    if name_val and str(name_val).strip():
        check_name = str(name_val).strip()
        existing_name = Client.query.filter(
            db.func.lower(Client.full_name) == check_name.lower(),
            Client.id != client_id
        ).first()
        if existing_name:
            return jsonify({
                'success': False,
                'message': f'Já existe outro cliente registado com este Nome ({existing_name.full_name} - {existing_name.code}). Não é permitido duplicar nomes!'
            }), 409
        client.full_name = check_name

    if 'phone' in data and str(data['phone']).strip():
        client.phone = str(data['phone']).strip()
    if 'alternate_phone' in data:
        client.alternate_phone = str(data['alternate_phone']).strip() if data['alternate_phone'] else None
    if 'email' in data:
        client.email = str(data['email']).strip() if data['email'] else None
    if 'pin' in data and str(data['pin']).strip():
        client.pin = str(data['pin']).strip()
    if 'address' in data:
        client.address = str(data['address']).strip() if data['address'] else None
    if 'neighborhood' in data:
        client.neighborhood = str(data['neighborhood']).strip() if data['neighborhood'] else None
    if 'city' in data and str(data['city']).strip():
        client.city = str(data['city']).strip()
    if 'document_number' in data or 'nif' in data:
        doc = (data.get('document_number') or data.get('nif') or '').strip()
        if doc:
            existing_doc = Client.query.filter(
                db.func.lower(Client.document_number) == doc.lower(),
                Client.id != client_id
            ).first()
            if existing_doc:
                return jsonify({
                    'success': False,
                    'message': f'O B.I. / NIF "{doc}" já pertence ao cliente {existing_doc.full_name} ({existing_doc.code}). Não é permitido duplicar documentos!'
                }), 409
            client.document_number = doc
        else:
            client.document_number = None
    if 'service_type' in data or 'serviceType' in data:
        client.service_type = data.get('service_type') or data.get('serviceType')
    if 'status' in data:
        client.status = data['status']
    if 'house_code' in data or 'houseCode' in data:
        hc = data.get('house_code') or data.get('houseCode')
        client.house_code = str(hc).strip() if hc else None
    if 'pdo_number' in data or 'pdoNumber' in data or 'pdoBox' in data:
        pdo = data.get('pdo_number') or data.get('pdoNumber') or data.get('pdoBox')
        client.pdo_number = str(pdo).strip() if pdo else None
    if 'onu_number' in data or 'onuNumber' in data:
        onu = data.get('onu_number') or data.get('onuNumber')
        client.onu_number = str(onu).strip() if onu else None
    if 'optical_rx_dbm' in data and data['optical_rx_dbm'] is not None:
        client.optical_rx_dbm = float(data['optical_rx_dbm'])
    if 'monthly_fee' in data or 'monthlyFee' in data:
        client.monthly_fee = float(data.get('monthly_fee') or data.get('monthlyFee') or 0.0)
    if 'due_day' in data or 'dueDay' in data:
        client.due_day = int(data.get('due_day') or data.get('dueDay') or 5)
    if 'notes' in data:
        client.notes = data['notes']

    # Sincronização em cascata quando o nome for alterado
    if client.full_name != old_name:
        try:
            Contract.query.filter_by(client_id=client.id).update({'client_name': client.full_name})
            Invoice.query.filter_by(client_id=client.id).update({'client_name': client.full_name})
            ServiceOrder.query.filter_by(client_id=client.id).update({'client_name': client.full_name})
            PaymentAgreement.query.filter_by(client_id=client.id).update({'client_name': client.full_name})
            Payment.query.filter_by(client_id=client.id).update({'client_name': client.full_name})
        except Exception:
            pass
        
    db.session.commit()
    
    # Auditoria
    user_id = get_jwt_identity()
    user = get_audit_user(user_id)
    log = ActivityLog(
        user_id=int(user_id) if user_id and str(user_id).isdigit() else None,
        username=user.username if user else 'sistema',
        action='UPDATE_CLIENT',
        entity='CLIENT',
        details=f'Atualizados dados do cliente {client.full_name} ({client.code})'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Cliente atualizado com sucesso!',
        'client': client.to_dict()
    }), 200


@clients_bp.route('/<int:client_id>', methods=['DELETE'])
@jwt_required()
def delete_client(client_id):
    """Exclui um cliente do sistema"""
    client = Client.query.get_or_404(client_id)
    client_name = client.full_name
    client_code = client.code
    
    db.session.delete(client)
    db.session.commit()
    
    # Auditoria
    user_id = get_jwt_identity()
    user = get_audit_user(user_id)
    log = ActivityLog(
        user_id=int(user_id) if user_id and str(user_id).isdigit() else None,
        username=user.username if user else 'sistema',
        action='DELETE_CLIENT',
        entity='CLIENT',
        details=f'Excluído cliente {client_name} ({client_code})'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Cliente "{client_name}" excluído com sucesso.'
    }), 200
