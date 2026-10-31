from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, ActivityLog, bump_system_version

users_bp = Blueprint('users', __name__, url_prefix='/api/v1/users')

@users_bp.route('', methods=['GET'])
@jwt_required(optional=True)
def list_users():
    users = User.query.order_by(User.id.asc()).all()
    return jsonify({
        'success': True,
        'count': len(users),
        'items': [u.to_dict() for u in users]
    }), 200

@users_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def create_user():
    data = request.get_json() or {}
    username = data.get('username', '').strip().lower()
    password = data.get('password', '') or 'osdel@2026'
    full_name = (data.get('full_name') or data.get('name') or '').strip()
    email = data.get('email', '').strip().lower() or None
    role = data.get('role', 'operador')
    
    if not username or not full_name:
        return jsonify({
            'success': False,
            'message': 'Campos obrigatórios: username e full_name (ou name)'
        }), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({
            'success': False,
            'message': f'Nome de usuário "{username}" já cadastrado.'
        }), 409
        
    new_user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role,
        pin=str(data.get('pin', '1234')).strip(),
        phone=data.get('phone', '').strip() or None,
        whatsapp=data.get('whatsapp', '').strip() or None,
        job_title=data.get('job_title') or data.get('jobTitle') or 'Colaborador',
        department=data.get('department', 'Técnico'),
        salary_base=float(data.get('salary_base') or data.get('salaryBase') or 150000.0),
        food_allowance=float(data.get('food_allowance') or data.get('foodAllowance') or 30000.0),
        transport_allowance=float(data.get('transport_allowance') or data.get('transportAllowance') or 25000.0),
        bank_iban=data.get('bank_iban') or data.get('bankIban'),
        work_status=data.get('work_status') or data.get('workStatus') or 'disponivel',
        photo_url=data.get('photo_url') or data.get('photoUrl'),
        bi_number=data.get('bi_number') or data.get('biNumber'),
        address=data.get('address'),
        is_active=True
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Colaborador cadastrado com sucesso!',
        'user': new_user.to_dict()
    }), 201

@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required(optional=True)
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify({
        'success': True,
        'user': user.to_dict()
    }), 200

@users_bp.route('/<int:user_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    
    name_val = data.get('full_name') or data.get('name')
    if name_val and str(name_val).strip():
        user.full_name = str(name_val).strip()
    if 'username' in data and data['username'].strip():
        user.username = data['username'].strip().lower()
    if 'email' in data:
        user.email = data['email'].strip() or None
    if 'role' in data:
        user.role = data['role']
    if 'pin' in data and str(data['pin']).strip():
        user.pin = str(data['pin']).strip()
    if 'phone' in data:
        user.phone = data['phone'].strip() or None
    if 'whatsapp' in data:
        user.whatsapp = data['whatsapp'].strip() or None
    if 'job_title' in data or 'jobTitle' in data:
        user.job_title = data.get('job_title') or data.get('jobTitle')
    if 'department' in data:
        user.department = data['department']
    if 'salary_base' in data or 'salaryBase' in data:
        user.salary_base = float(data.get('salary_base') or data.get('salaryBase') or 0.0)
    if 'food_allowance' in data or 'foodAllowance' in data:
        user.food_allowance = float(data.get('food_allowance') or data.get('foodAllowance') or 0.0)
    if 'transport_allowance' in data or 'transportAllowance' in data:
        user.transport_allowance = float(data.get('transport_allowance') or data.get('transportAllowance') or 0.0)
    if 'bank_iban' in data or 'bankIban' in data:
        user.bank_iban = data.get('bank_iban') or data.get('bankIban')
    if 'work_status' in data or 'workStatus' in data:
        user.work_status = data.get('work_status') or data.get('workStatus')
    if 'photo_url' in data or 'photoUrl' in data:
        user.photo_url = data.get('photo_url') or data.get('photoUrl')
    if 'bi_number' in data or 'biNumber' in data:
        user.bi_number = data.get('bi_number') or data.get('biNumber')
    if 'address' in data:
        user.address = data['address']
    if 'is_active' in data or 'active' in data:
        user.is_active = bool(data.get('is_active', data.get('active', True)))
    if 'password' in data and data['password']:
        user.set_password(data['password'])
        
    db.session.commit()
    bump_system_version()
    return jsonify({
        'success': True,
        'message': 'Dados de colaborador atualizados com sucesso!',
        'user': user.to_dict()
    }), 200

@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.username.lower() == 'deezy':
        return jsonify({
            'success': False,
            'message': 'Operação Bloqueada: O SuperAdmin Supremo (deezy) não pode ser eliminado.'
        }), 403
        
    user.is_active = False
    db.session.delete(user)
    db.session.commit()
    bump_system_version()
    return jsonify({
        'success': True,
        'message': f'Colaborador {user.username} excluído e todas as suas sessões foram encerradas.'
    }), 200
