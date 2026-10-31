import time
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, TechnicianLoan, LoanRepayment, User, FinancialAccount

loans_bp = Blueprint('loans', __name__, url_prefix='/api/v1/technician-loans')

def generate_loan_id():
    return f"loan-{int(time.time() * 1000)}"

def generate_repay_id():
    return f"rep-{int(time.time() * 1000)}"

@loans_bp.route('', methods=['GET'])
def list_loans():
    status = request.args.get('status')
    tech_id = request.args.get('technician_id', type=int)

    query = TechnicianLoan.query
    if status and status != 'todos':
        query = query.filter_by(status=status)
    if tech_id:
        query = query.filter_by(technician_id=tech_id)

    loans = query.order_by(TechnicianLoan.requested_at.desc()).all()
    return jsonify({
        'success': True,
        'count': len(loans),
        'items': [loan.to_dict() for loan in loans]
    }), 200

@loans_bp.route('/stats', methods=['GET'])
def get_loan_stats():
    loans = TechnicianLoan.query.all()
    total_requested = sum(l.amount for l in loans)
    total_approved = sum(l.amount for l in loans if l.status in ['aprovado', 'liquidado'])
    total_active_debt = sum(l.remaining_debt for l in loans if l.status == 'aprovado')
    total_repaid = sum(l.amount - l.remaining_debt for l in loans if l.status in ['aprovado', 'liquidado'])
    pending_count = sum(1 for l in loans if l.status == 'pendente')
    active_count = sum(1 for l in loans if l.status == 'aprovado')

    return jsonify({
        'success': True,
        'stats': {
            'totalRequested': total_requested,
            'totalApproved': total_approved,
            'totalActiveDebt': total_active_debt,
            'totalRepaid': total_repaid,
            'pendingCount': pending_count,
            'activeCount': active_count
        }
    }), 200

@loans_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def create_loan():
    data = request.get_json() or {}
    payload = data.get('data') if 'data' in data else data

    tech_id = int(payload.get('technician_id') or payload.get('technicianId') or 0)
    user = User.query.get(tech_id) if tech_id else None

    amount = float(payload.get('amount') or 0.0)
    if amount <= 0:
        return jsonify({'success': False, 'message': 'O montante do adiantamento deve ser superior a 0.'}), 400

    installments = max(1, int(payload.get('installments') or 1))
    purpose = payload.get('purpose') or 'Adiantamento Solicitado no Escritório'
    admin_name = payload.get('admin_name') or payload.get('adminName') or 'Administração'
    is_direct = bool(payload.get('is_direct', True))

    monthly_deduction = round(amount / installments, 2)

    loan = TechnicianLoan(
        id=generate_loan_id(),
        technician_id=tech_id,
        technician_name=payload.get('technician_name') or payload.get('technicianName') or (user.full_name if user else 'Colaborador'),
        department=payload.get('department') or (user.department if user else 'Técnico'),
        amount=amount,
        purpose=purpose,
        installments=installments,
        status='aprovado' if is_direct else 'pendente',
        monthly_deduction=monthly_deduction,
        remaining_debt=amount if is_direct else 0.0,
        receipt_method=payload.get('receipt_method') or payload.get('receiptMethod') or 'numerario',
        target_bank=payload.get('target_bank') or payload.get('targetBank'),
        target_iban=payload.get('target_iban') or payload.get('targetIban'),
        express_phone=payload.get('express_phone') or payload.get('expressPhone'),
        admin_name=admin_name,
        notes=payload.get('notes'),
        requested_at=datetime.utcnow(),
        reviewed_at=datetime.utcnow() if is_direct else None
    )

    db.session.add(loan)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Adiantamento de {amount:.0f} Kz registado com sucesso!',
        'item': loan.to_dict()
    }), 201

@loans_bp.route('/<string:loan_id>/review', methods=['POST'])
@jwt_required(optional=True)
def review_loan(loan_id):
    loan = TechnicianLoan.query.get_or_404(loan_id)
    data = request.get_json() or {}

    decision = data.get('decision', 'aprovado').strip().lower()
    admin_name = data.get('admin_name') or data.get('adminName') or 'Administrador'
    notes = data.get('notes') or ''

    if decision == 'aprovado':
        loan.status = 'aprovado'
        loan.remaining_debt = loan.amount
        loan.reviewed_at = datetime.utcnow()
        loan.admin_name = admin_name
        loan.notes = notes
    else:
        loan.status = 'rejeitado'
        loan.rejection_reason = notes or 'Indeferido pela Direcção'
        loan.reviewed_at = datetime.utcnow()
        loan.admin_name = admin_name

    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Adiantamento {decision} com sucesso!',
        'item': loan.to_dict()
    }), 200

@loans_bp.route('/<string:loan_id>/repay', methods=['POST'])
@jwt_required(optional=True)
def repay_loan(loan_id):
    loan = TechnicianLoan.query.get_or_404(loan_id)
    data = request.get_json() or {}

    amount = float(data.get('amount') or 0.0)
    if amount <= 0:
        return jsonify({'success': False, 'message': 'Valor de amortização inválido.'}), 400

    new_debt = max(0.0, round(loan.remaining_debt - amount, 2))
    loan.remaining_debt = new_debt
    if new_debt <= 0.0:
        loan.status = 'liquidado'

    repay = LoanRepayment(
        id=generate_repay_id(),
        loan_id=loan.id,
        amount=amount,
        payment_method=data.get('payment_method') or data.get('paymentMethod') or 'folha_salarial',
        receipt_reference=data.get('receipt_reference') or data.get('receiptReference'),
        registered_by=data.get('registered_by') or data.get('registeredBy') or 'Tesouraria',
        notes=data.get('notes') or 'Amortização de dívida de adiantamento',
        remaining_debt_after=new_debt,
        paid_at=datetime.utcnow()
    )
    db.session.add(repay)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Amortização de {amount:.0f} Kz registada com sucesso! Saldo restante: {new_debt:.0f} Kz.',
        'item': loan.to_dict()
    }), 200
