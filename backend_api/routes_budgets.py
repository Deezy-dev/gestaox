from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Budget, Client, ActivityLog, User

budgets_bp = Blueprint('budgets', __name__, url_prefix='/api/v1/budgets')

def generate_budget_number():
    last_b = Budget.query.order_by(Budget.id.desc()).first()
    next_num = (last_b.id + 1) if last_b else 1
    return f"ORC-{next_num:05d}"

@budgets_bp.route('', methods=['GET'])
@jwt_required(optional=True)
def list_budgets():
    """Lista todos os orçamentos com filtros opcionais"""
    status = request.args.get('status', '').strip().lower()
    client_id = request.args.get('client_id', type=int)
    
    query = Budget.query
    if status and status != 'todos':
        query = query.filter_by(status=status)
    if client_id:
        query = query.filter_by(client_id=client_id)
        
    budgets = query.order_by(Budget.id.desc()).all()
    return jsonify({
        'success': True,
        'count': len(budgets),
        'items': [b.to_dict() for b in budgets]
    }), 200

@budgets_bp.route('/<int:budget_id>', methods=['GET'])
@jwt_required(optional=True)
def get_budget(budget_id):
    budget = Budget.query.get_or_404(budget_id)
    return jsonify({
        'success': True,
        'budget': budget.to_dict()
    }), 200

@budgets_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def create_budget():
    data = request.get_json() or {}
    client_name = data.get('client_name', '').strip()
    description = data.get('description', '').strip()
    
    if not client_name or not description:
        return jsonify({
            'success': False,
            'message': 'client_name e description são obrigatórios.'
        }), 400
        
    client_id = data.get('client_id')
    if client_id:
        client = Client.query.get(client_id)
        if client:
            client_name = client.full_name
            
    total = float(data.get('total_amount', 0.0))
    discount = float(data.get('discount', 0.0))
    final = total - discount
    
    new_budget = Budget(
        number=generate_budget_number(),
        client_id=client_id,
        client_name=client_name,
        service_type=data.get('service_type', 'fibra'),
        description=description,
        total_amount=total,
        discount=discount,
        final_amount=final,
        status=data.get('status', 'pendente'),
        validity_days=int(data.get('validity_days', 15))
    )
    
    db.session.add(new_budget)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Orçamento criado com sucesso!',
        'budget': new_budget.to_dict()
    }), 201

@budgets_bp.route('/<int:budget_id>', methods=['PUT'])
@jwt_required()
def update_budget(budget_id):
    budget = Budget.query.get_or_404(budget_id)
    data = request.get_json() or {}
    
    if 'description' in data:
        budget.description = data['description']
    if 'status' in data:
        budget.status = data['status']
    if 'total_amount' in data or 'discount' in data:
        total = float(data.get('total_amount', budget.total_amount))
        discount = float(data.get('discount', budget.discount))
        budget.total_amount = total
        budget.discount = discount
        budget.final_amount = total - discount
    if 'validity_days' in data:
        budget.validity_days = int(data['validity_days'])
        
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Orçamento atualizado com sucesso!',
        'budget': budget.to_dict()
    }), 200

@budgets_bp.route('/<int:budget_id>/status', methods=['PATCH'])
@jwt_required()
def update_budget_status(budget_id):
    budget = Budget.query.get_or_404(budget_id)
    data = request.get_json() or {}
    new_status = data.get('status')
    if not new_status:
        return jsonify({'success': False, 'message': 'Status é obrigatório.'}), 400
    budget.status = new_status
    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Status do orçamento {budget.number} atualizado para {new_status}!',
        'budget': budget.to_dict()
    }), 200

@budgets_bp.route('/<int:budget_id>', methods=['DELETE'])
@jwt_required()
def delete_budget(budget_id):
    budget = Budget.query.get_or_404(budget_id)
    db.session.delete(budget)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Orçamento {budget.number} excluído com sucesso.'
    }), 200
