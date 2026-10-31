from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, Payment, Client, Invoice, FinancialAccount, ActivityLog

payments_bp = Blueprint('payments', __name__, url_prefix='/api/v1/payments')

@payments_bp.route('', methods=['GET'])
@jwt_required(optional=True)
def list_payments():
    """Lista histórico de pagamentos com filtros"""
    client_id = request.args.get('client_id', type=int)
    month = request.args.get('month', '').strip()
    method = request.args.get('method', '').strip()

    query = Payment.query
    if client_id:
        query = query.filter_by(client_id=client_id)
    if month:
        query = query.filter(Payment.payment_month == month)
    if method and method != 'todos':
        query = query.filter(Payment.method.ilike(f'%{method}%'))

    payments = query.order_by(Payment.paid_at.desc(), Payment.id.desc()).all()
    return jsonify({
        'success': True,
        'count': len(payments),
        'items': [p.to_dict() for p in payments]
    }), 200

@payments_bp.route('', methods=['POST'])
@jwt_required(optional=True)
def create_payment():
    """Regista um pagamento, credita a tesouraria e liquida fatura se vinculada"""
    data = request.get_json() or {}
    payload = data.get('data') if 'data' in data else data

    client_id = payload.get('client_id') or payload.get('clientId')
    client_name = payload.get('client_name') or payload.get('clientName') or 'Cliente'
    amount = float(payload.get('amount') or 0.0)
    penalty = float(payload.get('penalty') or 0.0)
    total = float(payload.get('total') or (amount + penalty))

    if amount <= 0:
        return jsonify({'success': False, 'message': 'O montante do pagamento deve ser superior a zero.'}), 400

    method = payload.get('method') or 'Multicaixa Express'
    m_lower = method.lower()
    account_id = payload.get('account_id') or payload.get('accountId') or (
        'acc-bai' if 'bai' in m_lower else (
            'acc-bfa' if 'bfa' in m_lower else (
                'acc-tpa' if 'multi' in m_lower else 'acc-caixa'
            )
        )
    )

    payment_month = payload.get('payment_month') or payload.get('paymentMonth') or date.today().strftime('%Y-%m')

    client = None
    if client_id:
        client = Client.query.get(client_id)
        if client:
            client_name = client.full_name
            # Regra OSDEL: Multa de 1.000 Kz a partir do dia 6 (dias 1 a 5 tolerância regular).
            # O cliente SÓ fica com status 'active' se pagar a mensalidade na totalidade (4.000 Kz em dias 1-5, ou 4.000 + 1.000 Kz multa a partir de dia 6).
            current_day = date.today().day
            expected_fee = float(client.monthly_fee or (4000.0 if getattr(client, 'service_type', 'tv') == 'tv' else 6500.0))
            required_penalty = 1000.0 if (current_day >= 6 or client.status in ['late', 'suspended']) else 0.0
            required_total = expected_fee + required_penalty

            past_payments = Payment.query.filter_by(client_id=client_id, payment_month=payment_month).all()
            total_paid_month = sum(float(p.amount or 0.0) + float(p.penalty or 0.0) for p in past_payments) + total

            if total_paid_month >= required_total:
                client.status = 'active'
            else:
                client.status = 'late'

    raw_reference = (payload.get('reference') or '').strip()

    # BLOQUEIO RIGOROSO DE DUPLICADOS (Backend PythonAnywhere)
    # 1. Bloqueio por Referência Bancária / Comprovativo existente
    if raw_reference and not raw_reference.startswith('REC-AUTO-') and len(raw_reference) >= 4:
        dup_ref = Payment.query.filter(Payment.reference == raw_reference).first()
        if dup_ref:
            return jsonify({
                'success': False,
                'message': f'Operação Bloqueada: A referência "{raw_reference}" já foi liquidada anteriormente no recibo #{dup_ref.id} em {dup_ref.paid_at.strftime("%Y-%m-%d") if dup_ref.paid_at else ""}.'
            }), 409

    # 2. Bloqueio por Mês/Competência do Cliente (se já estiver liquidado totalmente)
    if client_id and payment_month:
        existing_payments = Payment.query.filter_by(client_id=client_id, payment_month=payment_month).all()
        if existing_payments:
            past_paid = sum(float(p.amount or 0.0) + float(p.penalty or 0.0) for p in existing_payments)
            expected_fee = float(client.monthly_fee or 4000.0) if client else 4000.0
            current_day = date.today().day
            required_total = expected_fee + (1000.0 if current_day >= 6 else 0.0)
            if past_paid >= required_total:
                return jsonify({
                    'success': False,
                    'message': f'Operação Bloqueada: O cliente #{client_id} já liquidou integralmente a mensalidade de {payment_month} no recibo #{existing_payments[0].id}.'
                }), 409

    reference = raw_reference or f"REC-{Date_now_id()}"

    payment = Payment(
        client_id=client_id,
        client_name=client_name,
        amount=amount,
        penalty=penalty,
        total=total,
        payment_month=payment_month,
        paid_at=datetime.utcnow(),
        method=method,
        reference=reference,
        operator=payload.get('operator') or 'operador',
        invoice_id=payload.get('invoice_id') or payload.get('invoiceId'),
        account_id=account_id,
        notes=payload.get('notes')
    )
    db.session.add(payment)

    # Credita conta financeira
    acc = FinancialAccount.query.get(account_id)
    if acc:
        acc.deposit(total)

    # Se há fatura vinculada, marca como paga
    inv_id = payload.get('invoice_id') or payload.get('invoiceId')
    if inv_id:
        inv = Invoice.query.get(inv_id)
        if inv:
            inv.status = 'paga'
            inv.payment_date = date.today()
            inv.payment_method = method

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Pagamento de {total:.0f} Kz registado com sucesso!',
        'item': payment.to_dict()
    }), 201

def Date_now_id():
    import time
    return str(int(time.time()))[-6:]

@payments_bp.route('/<int:payment_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_payment(payment_id):
    p = Payment.query.get_or_404(payment_id)
    # Estorno da conta financeira
    if p.account_id:
        acc = FinancialAccount.query.get(p.account_id)
        if acc:
            acc.withdraw(p.total or p.amount)

    # Reverte o estado da factura vinculada para pendente
    if p.invoice_id:
        inv = Invoice.query.get(p.invoice_id)
        if inv:
            inv.status = 'pendente'
            inv.payment_date = None
            inv.payment_method = None

    db.session.delete(p)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Pagamento anulado, conta estornada e factura reaberta com sucesso.'}), 200
