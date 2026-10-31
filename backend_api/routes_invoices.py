from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Invoice, Client, ActivityLog, User

invoices_bp = Blueprint('invoices', __name__, url_prefix='/api/v1/invoices')

def generate_invoice_number():
    last_inv = Invoice.query.order_by(Invoice.id.desc()).first()
    next_num = (last_inv.id + 1) if last_inv else 1
    return f"FT-{next_num:05d}"

@invoices_bp.route('', methods=['GET'])
@jwt_required(optional=True)
def list_invoices():
    """Lista faturas com filtros por status e cliente"""
    status = request.args.get('status', '').strip().lower()
    client_id = request.args.get('client_id', type=int)
    
    query = Invoice.query
    if status and status != 'todos':
        query = query.filter_by(status=status)
    if client_id:
        query = query.filter_by(client_id=client_id)
        
    invoices = query.order_by(Invoice.id.desc()).all()
    return jsonify({
        'success': True,
        'count': len(invoices),
        'items': [inv.to_dict() for inv in invoices]
    }), 200

@invoices_bp.route('/<int:invoice_id>', methods=['GET'])
@jwt_required(optional=True)
def get_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    return jsonify({
        'success': True,
        'invoice': invoice.to_dict()
    }), 200

@invoices_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def create_invoice():
    data = request.get_json() or {}
    client_id = data.get('client_id')
    amount = float(data.get('amount', 0.0))
    
    if not client_id or amount <= 0:
        return jsonify({
            'success': False,
            'message': 'client_id e amount > 0 são obrigatórios.'
        }), 400
        
    client = Client.query.get_or_404(client_id)
    penalty = float(data.get('penalty', 0.0))
    total = amount + penalty
    
    # Datas
    due_date_str = data.get('due_date')
    if due_date_str:
        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
    else:
        # Padrão: dia 5 do mês seguinte ou 30 dias depois
        due_date = date.today()
        
    # Prevenção de faturas duplicadas para o mesmo cliente na mesma data/mês
    ref_month = data.get('payment_month') or date.today().strftime('%Y-%m')
    existing_inv = Invoice.query.filter_by(client_id=client.id, issue_date=date.today()).first()
    if existing_inv and data.get('status') != 'proforma':
        return jsonify({
            'success': False,
            'message': f'Operação Bloqueada: Já existe uma fatura emitida hoje ({existing_inv.number}) para o cliente {client.full_name}.'
        }), 409

    status_val = data.get('status', 'pendente')
    new_invoice = Invoice(
        number=generate_invoice_number(),
        client_id=client.id,
        client_name=client.full_name,
        amount=amount,
        penalty=penalty,
        total=total,
        status=status_val,
        issue_date=date.today(),
        due_date=due_date,
        reference_code=data.get('reference_code') or f"REF-{client.id:04d}",
        notes=data.get('notes')
    )
    
    db.session.add(new_invoice)
    db.session.flush()

    if status_val == 'paga':
        method = data.get('method') or data.get('payment_method') or 'Multicaixa'
        m_lower = method.lower()
        account_id = data.get('account_id') or ('acc-bai' if 'bai' in m_lower else ('acc-bfa' if 'bfa' in m_lower else ('acc-tpa' if 'multi' in m_lower else 'acc-caixa')))
        
        # Cria registo central de pagamento
        from models import Payment, FinancialAccount
        payment = Payment(
            client_id=client.id,
            client_name=client.full_name,
            amount=amount,
            penalty=penalty,
            total=total,
            payment_month=data.get('payment_month') or date.today().strftime('%Y-%m'),
            paid_at=datetime.utcnow(),
            method=method,
            reference=new_invoice.number,
            operator=data.get('operator', 'operador'),
            invoice_id=new_invoice.id,
            account_id=account_id,
            notes=data.get('notes')
        )
        db.session.add(payment)

        # Credita conta de tesouraria
        acc = FinancialAccount.query.get(account_id)
        if acc:
            acc.deposit(total)

        # Reativa cliente
        client.status = 'active'
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Fatura gerada com sucesso!',
        'invoice': new_invoice.to_dict()
    }), 201

@invoices_bp.route('/<int:invoice_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_invoice(invoice_id):
    """Atualiza dados de uma fatura"""
    invoice = Invoice.query.get_or_404(invoice_id)
    data = request.get_json() or {}
    
    if 'notes' in data:
        invoice.notes = data['notes']
    if 'status' in data:
        prev_status = invoice.status
        invoice.status = data['status']
        if data['status'] == 'paga' and prev_status != 'paga':
            invoice.payment_date = date.today()
            if invoice.client:
                invoice.client.status = 'active'
    if 'client_name' in data or 'clientName' in data:
        invoice.client_name = data.get('client_name') or data.get('clientName')
    if 'amount' in data:
        invoice.amount = float(data['amount'])
        invoice.total = invoice.amount + float(invoice.penalty or 0.0)
    if 'penalty' in data:
        invoice.penalty = float(data['penalty'])
        invoice.total = float(invoice.amount or 0.0) + invoice.penalty
        
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Fatura atualizada com sucesso!',
        'invoice': invoice.to_dict()
    }), 200

@invoices_bp.route('/<int:invoice_id>/pay', methods=['POST'])
@jwt_required(optional=True)
def pay_invoice(invoice_id):
    """Liquida a fatura, credita a conta bancária/caixa e atualiza status do cliente"""
    from models import Payment, FinancialAccount
    invoice = Invoice.query.get_or_404(invoice_id)
    data = request.get_json() or {}
    
    method = data.get('payment_method') or data.get('method') or 'Multicaixa'
    m_lower = method.lower()
    account_id = data.get('account_id') or ('acc-bai' if 'bai' in m_lower else ('acc-bfa' if 'bfa' in m_lower else ('acc-tpa' if 'multi' in m_lower else 'acc-caixa')))
    
    invoice.status = 'paga'
    invoice.payment_date = date.today()
    invoice.payment_method = method
    invoice.reference_code = data.get('reference_code', invoice.reference_code)
    
    # Credita conta financeira
    acc = FinancialAccount.query.get(account_id)
    if acc:
        acc.deposit(invoice.total or invoice.amount)
        
    # Registra no histórico central de pagamentos
    payment = Payment(
        client_id=invoice.client_id,
        client_name=invoice.client_name,
        amount=invoice.amount,
        penalty=invoice.penalty or 0.0,
        total=invoice.total,
        payment_month=data.get('payment_month') or date.today().strftime('%Y-%m'),
        paid_at=datetime.utcnow(),
        method=method,
        reference=invoice.number,
        operator=data.get('operator', 'operador'),
        invoice_id=invoice.id,
        account_id=account_id,
        notes=data.get('notes')
    )
    db.session.add(payment)

    # Atualiza o cliente para status 'active' se estiver em atraso
    if invoice.client and invoice.client.status == 'late':
        invoice.client.status = 'active'
        
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Fatura {invoice.number} liquidada com sucesso! Conta {account_id} creditada.',
        'invoice': invoice.to_dict()
    }), 200

@invoices_bp.route('/<int:invoice_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    db.session.delete(invoice)
    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Fatura {invoice.number} cancelada e removida.'
    }), 200
