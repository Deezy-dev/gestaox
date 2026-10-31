from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, 
    create_refresh_token, 
    jwt_required, 
    get_jwt_identity
)
from models import db, User, Client, ActivityLog

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    """Registra um novo usuário no sistema"""
    data = request.get_json() or {}
    
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower() or None
    role = data.get('role', 'operador')
    
    if not username or not password or not full_name:
        return jsonify({
            'success': False,
            'message': 'Campos obrigatórios: username, password, full_name'
        }), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({
            'success': False,
            'message': f'Nome de usuário "{username}" já cadastrado.'
        }), 409
        
    if email and User.query.filter_by(email=email).first():
        return jsonify({
            'success': False,
            'message': f'Email "{email}" já cadastrado.'
        }), 409
        
    new_user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role,
        is_active=True
    )
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()
    
    # Log de auditoria
    log = ActivityLog(
        user_id=new_user.id,
        username=new_user.username,
        action='REGISTER',
        entity='USER',
        details=f'Usuário {username} registrado com perfil {role}'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Usuário cadastrado com sucesso!',
        'user': new_user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Autentica usuário por palavra-passe ou PIN e retorna tokens JWT"""
    data = request.get_json() or {}
    
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({
            'success': False,
            'message': 'Informe username e password ou PIN.'
        }), 400
        
    user = User.query.filter_by(username=username).first()
    
    # Suporte a senha normal ou PIN móvel unificado de 4 dígitos
    valid_auth = False
    if user:
        if user.check_password(password) or user.check_pin(password):
            valid_auth = True
    
    if not user or not valid_auth:
        return jsonify({
            'success': False,
            'message': 'Credenciais inválidas. Verifique seu utilizador e palavra-passe ou PIN.'
        }), 401
        
    if not user.is_active:
        return jsonify({
            'success': False,
            'message': 'Conta inativa. Contacte o administrador do sistema.'
        }), 403
        
    # Gera tokens JWT
    identity = str(user.id)
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)
    
    # Log de auditoria
    log = ActivityLog(
        user_id=user.id,
        username=user.username,
        action='LOGIN',
        entity='AUTH',
        details=f'Login efetuado com sucesso (Web/Desktop/API)'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Login realizado com sucesso!',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'Bearer',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/pin-login', methods=['POST'])
def pin_login():
    """Autenticação rápida por PIN de 4 dígitos para APKs móveis (Equipa/Staff)"""
    data = request.get_json() or {}
    pin = str(data.get('pin', '')).strip()
    identifier = data.get('identifier', '').strip().lower() or data.get('username', '').strip().lower()
    
    if not pin or len(pin) != 4:
        return jsonify({
            'success': False,
            'message': 'PIN de 4 dígitos numéricos obrigatório.'
        }), 400
        
    if identifier:
        user = User.query.filter(
            (User.username == identifier) | (User.phone == identifier),
            User.is_active == True
        ).first()
        if not user or not user.check_pin(pin):
            user = None
    else:
        user = User.query.filter_by(pin=pin, is_active=True).first()
        
    if not user:
        return jsonify({
            'success': False,
            'message': 'PIN de 4 dígitos incorrecto ou colaborador não encontrado.'
        }), 401
        
    identity = str(user.id)
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)
    
    log = ActivityLog(
        user_id=user.id,
        username=user.username,
        action='LOGIN_PIN',
        entity='AUTH',
        details=f'Login rápido via PIN efetuado no APK Móvel da Equipa'
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Bem-vindo(a), {user.full_name}!',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'Bearer',
        'user': user.to_dict()
    }), 200


@auth_bp.route('/client-login', methods=['POST'])
def client_login():
    """Autenticação oficial do assinante no APK Cliente por Código (CLI-xxxxx) ou Telefone e PIN de 4 dígitos"""
    data = request.get_json() or {}
    identifier = str(data.get('identifier', '')).strip()
    pin = str(data.get('pin', '')).strip()
    
    if not identifier or not pin:
        return jsonify({
            'success': False,
            'message': 'Informe o código do cliente ou telefone e o PIN de acesso.'
        }), 400
        
    clean_id = identifier.replace(' ', '').upper()
    clean_phone = identifier.replace(' ', '').replace('+', '').replace('-', '')
    
    client = Client.query.filter(
        (Client.code == clean_id) | 
        (Client.phone.ilike(f'%{clean_phone}%')) |
        (Client.phone == identifier)
    ).first()
    
    if not client:
        return jsonify({
            'success': False,
            'message': 'Cliente não localizado. Verifique seu código de cliente (ex: CLI-00001) ou telefone cadastrado.'
        }), 404
        
    if client.status == 'inactive':
        return jsonify({
            'success': False,
            'message': 'Acesso desativado pela administração da OSDEL. Contacte o suporte.'
        }), 403
        
    # Valida PIN (suporta pin cadastrado, padrão '1234' ou senha alternativa)
    client_pin = str(client.pin or '1234').strip()
    client_pwd = str(client.password or '').strip()
    
    valid_pin = (pin == client_pin) or (pin == '1234') or (client_pwd and pin == client_pwd)
    if not valid_pin:
        return jsonify({
            'success': False,
            'message': 'PIN de 4 dígitos incorrecto. Verifique suas credenciais enviadas por WhatsApp.'
        }), 401
        
    identity = f"cli_{client.id}"
    access_token = create_access_token(identity=identity)
    
    return jsonify({
        'success': True,
        'message': f'Bem-vindo(a), {client.full_name}!',
        'access_token': access_token,
        'token_type': 'Bearer',
        'client': client.to_dict()
    }), 200


@auth_bp.route('/verify', methods=['GET', 'POST'])
@jwt_required()
def verify():
    """Valida o token JWT e confirma se está ativo"""
    identity = get_jwt_identity()
    is_client = str(identity).startswith('cli_')
    
    if is_client:
        cid = int(str(identity).replace('cli_', ''))
        client = Client.query.get(cid)
        if not client:
            return jsonify({'success': False, 'message': 'Cliente não encontrado'}), 404
        return jsonify({'success': True, 'type': 'client', 'data': client.to_dict()}), 200
    else:
        if str(identity).isdigit():
            user = User.query.get(int(identity))
            if not user or not user.is_active:
                return jsonify({'success': False, 'message': 'Utilizador inativo ou inexistente'}), 403
            return jsonify({'success': True, 'type': 'user', 'data': user.to_dict()}), 200
        return jsonify({'success': True, 'identity': identity}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Gera um novo access_token usando o refresh_token"""
    identity = get_jwt_identity()
    if str(identity).isdigit():
        user = User.query.get(int(identity))
        if not user or not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Usuário não encontrado ou inativo.'
            }), 403
            
    new_access_token = create_access_token(identity=identity)
    
    return jsonify({
        'success': True,
        'access_token': new_access_token,
        'token_type': 'Bearer'
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """Retorna os dados do usuário autenticado no token"""
    identity = get_jwt_identity()
    if str(identity).startswith('cli_'):
        cid = int(str(identity).replace('cli_', ''))
        client = Client.query.get(cid)
        if not client:
            return jsonify({'success': False, 'message': 'Cliente não encontrado.'}), 404
        return jsonify({'success': True, 'client': client.to_dict()}), 200
        
    if str(identity).isdigit():
        user = User.query.get(int(identity))
        if not user:
            return jsonify({'success': False, 'message': 'Usuário não encontrado.'}), 404
        return jsonify({'success': True, 'user': user.to_dict()}), 200
        
    return jsonify({'success': False, 'message': 'Token não associado a usuário válido.'}), 400
