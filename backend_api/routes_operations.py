from datetime import datetime, date
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import (
    db, 
    ServiceOrder, 
    PaymentAgreement, 
    SupportTicket, 
    Expense, 
    FinancialAccount, 
    Announcement, 
    Client, 
    ActivityLog, 
    User,
    AccountTransfer,
    CategoryBudget,
    InventoryItem,
    EquipmentAssignment,
    CashClosure,
    MonthlyClosureRecord,
    ScheduleEventRecord,
    TeamMissionRecord,
    Contract,
    bump_system_version
)

operations_bp = Blueprint('operations', __name__, url_prefix='/api/v1')

# ==================== ORDENS DE SERVIÇO ====================
@operations_bp.route('/service-orders', methods=['GET'])
def list_service_orders():
    service_type = request.args.get('service_type')
    status = request.args.get('status')
    
    query = ServiceOrder.query
    if service_type and service_type != 'todos':
        query = query.filter_by(service_type=service_type)
    if status and status != 'todos':
        query = query.filter_by(status=status)
        
    orders = query.order_by(ServiceOrder.id.desc()).all()
    return jsonify({
        'success': True,
        'count': len(orders),
        'items': [o.to_dict() for o in orders]
    }), 200

@operations_bp.route('/service-orders', methods=['POST'])
@jwt_required(optional=True)
def create_service_order():
    data = request.get_json() or {}
    last_os = ServiceOrder.query.order_by(ServiceOrder.id.desc()).first()
    next_num = (last_os.id + 1) if last_os else 1
    code = data.get('code') or f"OS-{next_num:05d}"
    
    client_name = data.get('client_name') or data.get('clientName', 'Cliente OSDEL')
    
    os = ServiceOrder(
        code=code,
        type=data.get('type', 'reparacao'),
        client_id=data.get('client_id'),
        client_name=client_name,
        client_code=data.get('client_code') or data.get('clientCode'),
        phone=data.get('phone'),
        address=data.get('address'),
        pdo_box=data.get('pdo_box') or data.get('pdoBox'),
        priority=data.get('priority', 'normal'),
        status=data.get('status', 'pendente'),
        service_type=data.get('service_type', 'combo'),
        optical_dbm=float(data['optical_dbm']) if 'optical_dbm' in data and data['optical_dbm'] is not None else None,
        assigned_technician=data.get('assigned_technician') or data.get('assignedTechnician'),
        notes=data.get('notes')
    )
    db.session.add(os)
    db.session.commit()
    return jsonify({'success': True, 'item': os.to_dict()}), 201

@operations_bp.route('/service-orders/<int:order_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_service_order(order_id):
    os = ServiceOrder.query.get_or_404(order_id)
    data = request.get_json() or {}
    
    if 'status' in data:
        os.status = data['status']
    if 'assigned_technician' in data:
        os.assigned_technician = data['assigned_technician']
    if 'optical_dbm' in data:
        os.optical_dbm = float(data['optical_dbm']) if data['optical_dbm'] is not None else None
    if 'notes' in data:
        os.notes = data['notes']
    if 'priority' in data:
        os.priority = data['priority']
        
    db.session.commit()
    return jsonify({'success': True, 'item': os.to_dict()}), 200

# ==================== ACORDOS DE PAGAMENTO (PROMISES) ====================
@operations_bp.route('/payment-promises', methods=['GET'])
def list_payment_promises():
    client_code = request.args.get('client_code')
    query = PaymentAgreement.query
    if client_code:
        query = query.filter_by(client_code=client_code)
    promises = query.order_by(PaymentAgreement.id.desc()).all()
    return jsonify({'success': True, 'count': len(promises), 'items': [p.to_dict() for p in promises]}), 200

@operations_bp.route('/payment-promises', methods=['POST'])
def create_payment_promise():
    data = request.get_json() or {}
    client_code = data.get('client_code') or data.get('clientCode', '')
    client_name = data.get('client_name') or data.get('clientName', 'Cliente OSDEL')
    reason = data.get('reason', '')
    promised_amount = float(data.get('promised_amount') or data.get('promisedAmount') or 0.0)
    
    promised_date_str = data.get('promised_date') or data.get('promisedDate')
    if promised_date_str:
        try:
            promised_date = datetime.strptime(promised_date_str.split('T')[0], '%Y-%m-%d').date()
        except:
            promised_date = date.today()
    else:
        promised_date = date.today()
        
    promise = PaymentAgreement(
        client_code=client_code,
        client_name=client_name,
        phone=data.get('phone'),
        service_type=data.get('service_type') or data.get('serviceType', 'tv'),
        promised_date=promised_date,
        promised_amount=promised_amount,
        reason=reason,
        status='pendente'
    )
    db.session.add(promise)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Acordo submetido com sucesso à direcção.', 'item': promise.to_dict()}), 201

# ==================== CHAMADOS DE SUPORTE (TICKETS) ====================
@operations_bp.route('/support-tickets', methods=['GET'])
def list_support_tickets():
    client_code = request.args.get('client_code')
    query = SupportTicket.query
    if client_code:
        query = query.filter_by(client_code=client_code)
    tickets = query.order_by(SupportTicket.id.desc()).all()
    return jsonify({'success': True, 'count': len(tickets), 'items': [t.to_dict() for t in tickets]}), 200

@operations_bp.route('/support-tickets', methods=['POST'])
def create_support_ticket():
    data = request.get_json() or {}
    last_tk = SupportTicket.query.order_by(SupportTicket.id.desc()).first()
    next_num = (last_tk.id + 1) if last_tk else 1
    code = f"TK-{next_num:05d}"
    
    ticket = SupportTicket(
        code=code,
        client_code=data.get('client_code') or data.get('clientCode'),
        client_name=data.get('client_name') or data.get('clientName', 'Cliente'),
        category=data.get('category', 'sinal_fraco'),
        title=data.get('title', 'Avaria Técnica'),
        description=data.get('description', ''),
        status='aberto'
    )
    db.session.add(ticket)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Chamado registado com sucesso.', 'item': ticket.to_dict()}), 201

# ==================== DESPESAS & CAIXA ====================
@operations_bp.route('/expenses', methods=['GET'])
@jwt_required(optional=True)
def list_expenses():
    category = request.args.get('category')
    query = Expense.query
    if category and category != 'todos':
        query = query.filter_by(category=category)
    expenses = query.order_by(Expense.date.desc(), Expense.id.desc()).all()
    return jsonify({'success': True, 'count': len(expenses), 'items': [e.to_dict() for e in expenses]}), 200

@operations_bp.route('/expenses', methods=['POST'])
@jwt_required(optional=True)
def create_expense():
    data = request.get_json() or {}
    description = data.get('description', '').strip()
    amount = float(data.get('amount', 0.0))
    if not description or amount <= 0:
        return jsonify({'success': False, 'message': 'Descrição e valor > 0 são obrigatórios.'}), 400
        
    date_str = data.get('date')
    if date_str:
        try:
            exp_date = datetime.strptime(date_str.split('T')[0], '%Y-%m-%d').date()
        except:
            exp_date = date.today()
    else:
        exp_date = date.today()
        
    acc_id = data.get('account_id') or data.get('accountId', 'acc-caixa')
    exp = Expense(
        description=description,
        category=data.get('category', 'operacional'),
        amount=amount,
        date=exp_date,
        account=data.get('account', 'Caixa Geral'),
        account_id=acc_id,
        payment_method=data.get('payment_method') or data.get('paymentMethod', 'Dinheiro'),
        document_ref=data.get('document_ref') or data.get('documentRef'),
        beneficiary=data.get('beneficiary'),
        status='pago'
    )
    db.session.add(exp)
    
    # Atualiza saldo da conta financeira se existir
    acc = FinancialAccount.query.get(acc_id)
    if acc:
        acc.withdraw(amount)

    db.session.commit()
    return jsonify({'success': True, 'message': 'Despesa registada com sucesso.', 'item': exp.to_dict()}), 201

@operations_bp.route('/expenses/<int:expense_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_expense(expense_id):
    exp = Expense.query.get_or_404(expense_id)
    data = request.get_json() or {}
    if 'description' in data: exp.description = data['description']
    if 'category' in data: exp.category = data['category']
    if 'amount' in data: exp.amount = float(data['amount'])
    if 'beneficiary' in data: exp.beneficiary = data['beneficiary']
    if 'document_ref' in data or 'documentRef' in data:
        exp.document_ref = data.get('document_ref') or data.get('documentRef')
    if 'reconciled' in data: exp.reconciled = bool(data['reconciled'])
    if 'status' in data: exp.status = data['status']
    db.session.commit()
    return jsonify({'success': True, 'item': exp.to_dict()}), 200

@operations_bp.route('/expenses/<int:expense_id>/reconcile', methods=['PATCH'])
@jwt_required(optional=True)
def toggle_expense_reconcile(expense_id):
    exp = Expense.query.get_or_404(expense_id)
    exp.reconciled = not exp.reconciled
    db.session.commit()
    return jsonify({'success': True, 'reconciled': exp.reconciled, 'item': exp.to_dict()}), 200

@operations_bp.route('/expenses/<int:expense_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_expense(expense_id):
    exp = Expense.query.get_or_404(expense_id)
    # Estorno do valor na conta financeira vinculada
    if exp.account_id and exp.amount:
        acc = FinancialAccount.query.get(exp.account_id)
        if acc:
            acc.deposit(exp.amount)
    db.session.delete(exp)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Despesa eliminada e valor estornado na conta financeira.'}), 200

# ==================== CONTAS FINANCEIRAS ====================
@operations_bp.route('/financial-accounts', methods=['GET'])
def list_financial_accounts():
    accounts = FinancialAccount.query.all()
    return jsonify({'success': True, 'items': [a.to_dict() for a in accounts]}), 200

@operations_bp.route('/financial-accounts', methods=['POST'])
@jwt_required(optional=True)
def create_financial_account():
    data = request.get_json() or {}
    acc_id = data.get('id') or f"acc-{int(datetime.utcnow().timestamp())}"
    acc = FinancialAccount(
        id=acc_id,
        name=data.get('name', 'Nova Conta'),
        type=data.get('type', 'banco'),
        bank_name=data.get('bankName') or data.get('bank_name'),
        account_number=data.get('accountNumber') or data.get('account_number'),
        iban=data.get('iban'),
        initial_balance=float(data.get('initialBalance') or data.get('initial_balance', 0.0)),
        current_balance=float(data.get('initialBalance') or data.get('initial_balance', 0.0))
    )
    db.session.add(acc)
    db.session.commit()
    return jsonify({'success': True, 'item': acc.to_dict()}), 201

@operations_bp.route('/financial-accounts/<string:account_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_financial_account(account_id):
    acc = FinancialAccount.query.get_or_404(account_id)
    data = request.get_json() or {}
    if 'name' in data: acc.name = data['name']
    if 'type' in data: acc.type = data['type']
    if 'bankName' in data or 'bank_name' in data:
        acc.bank_name = data.get('bankName') or data.get('bank_name')
    if 'iban' in data: acc.iban = data['iban']
    if 'initialBalance' in data or 'initial_balance' in data:
        acc.initial_balance = float(data.get('initialBalance') or data.get('initial_balance', 0.0))
    if 'currentBalance' in data or 'current_balance' in data:
        acc.current_balance = float(data.get('currentBalance') or data.get('current_balance', 0.0))
    db.session.commit()
    return jsonify({'success': True, 'item': acc.to_dict()}), 200

@operations_bp.route('/financial-accounts/<string:account_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_financial_account(account_id):
    acc = FinancialAccount.query.get_or_404(account_id)
    db.session.delete(acc)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Conta financeira eliminada.'}), 200

# ==================== TRANSFERÊNCIAS ENTRE CONTAS ====================
@operations_bp.route('/transfers', methods=['GET'])
def list_transfers():
    transfers = AccountTransfer.query.order_by(AccountTransfer.created_at.desc()).all()
    return jsonify({'success': True, 'items': [t.to_dict() for t in transfers]}), 200

@operations_bp.route('/transfers', methods=['POST'])
@jwt_required(optional=True)
def create_transfer():
    data = request.get_json() or {}
    amount = float(data.get('amount', 0.0))
    from_acc_id = data.get('fromAccountId') or data.get('from_account_id')
    to_acc_id = data.get('toAccountId') or data.get('to_account_id')
    if amount <= 0 or not from_acc_id or not to_acc_id:
        return jsonify({'success': False, 'message': 'Origem, destino e valor > 0 são obrigatórios.'}), 400

    tr_id = data.get('id') or f"tr-{int(datetime.utcnow().timestamp())}"
    tr = AccountTransfer(
        id=tr_id,
        from_account_id=from_acc_id,
        to_account_id=to_acc_id,
        amount=amount,
        description=data.get('description', 'Transferência interna'),
        reference=data.get('reference'),
        operator=data.get('operator', 'Operador')
    )
    db.session.add(tr)

    # Executa a movimentação de saldo
    acc_from = FinancialAccount.query.get(from_acc_id)
    acc_to = FinancialAccount.query.get(to_acc_id)
    if acc_from: acc_from.withdraw(amount)
    if acc_to: acc_to.deposit(amount)

    db.session.commit()
    return jsonify({'success': True, 'message': 'Transferência concluída.', 'item': tr.to_dict()}), 201

@operations_bp.route('/transfers/<string:transfer_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_transfer(transfer_id):
    tr = AccountTransfer.query.get_or_404(transfer_id)
    # Estorno dos saldos da transferência
    if tr.from_account_id:
        acc_from = FinancialAccount.query.get(tr.from_account_id)
        if acc_from:
            acc_from.deposit(tr.amount)
    if tr.to_account_id:
        acc_to = FinancialAccount.query.get(tr.to_account_id)
        if acc_to:
            acc_to.withdraw(tr.amount)
    db.session.delete(tr)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Transferência eliminada e saldos das contas estornados.'}), 200

# ==================== ORÇAMENTOS POR CATEGORIA ====================
@operations_bp.route('/category-budgets', methods=['GET'])
def list_category_budgets():
    budgets = CategoryBudget.query.all()
    return jsonify({'success': True, 'items': [b.to_dict() for b in budgets]}), 200

@operations_bp.route('/category-budgets', methods=['POST', 'PUT'])
@jwt_required(optional=True)
def update_category_budgets():
    data = request.get_json() or {}
    items = data.get('items', [])
    updated = []
    for item in items:
        cat = item.get('category')
        limit = float(item.get('limitAmount') or item.get('limit_amount', 0.0))
        if cat:
            cb = CategoryBudget.query.filter_by(category=cat).first()
            if not cb:
                cb = CategoryBudget(
                    id=f"cb-{cat}",
                    category=cat,
                    limit_amount=limit,
                    month=item.get('month', date.today().strftime('%Y-%m'))
                )
                db.session.add(cb)
            else:
                cb.limit_amount = limit
            updated.append(cb)
    db.session.commit()
    return jsonify({'success': True, 'items': [u.to_dict() for u in updated]}), 200

# ==================== INVENTÁRIO & STOCK ====================
@operations_bp.route('/inventory', methods=['GET'])
def list_inventory():
    category = request.args.get('category')
    search = request.args.get('search', '').strip().lower()
    query = InventoryItem.query
    if category and category != 'todos':
        query = query.filter_by(category=category)
    if search:
        query = query.filter(
            db.or_(
                InventoryItem.name.ilike(f'%{search}%'),
                InventoryItem.code.ilike(f'%{search}%')
            )
        )
    items = query.order_by(InventoryItem.name.asc()).all()
    return jsonify({'success': True, 'items': [i.to_dict() for i in items]}), 200

@operations_bp.route('/inventory', methods=['POST'])
@jwt_required(optional=True)
def create_inventory_item():
    data = request.get_json() or {}
    code = data.get('code') or f"MAT-{int(datetime.utcnow().timestamp()) % 100000:05d}"
    item = InventoryItem(
        code=code,
        name=data.get('name', 'Novo Material'),
        category=data.get('category', 'equipamento'),
        unit=data.get('unit', 'unidade'),
        quantity=float(data.get('quantity', 0.0)),
        min_quantity=float(data.get('minQuantity') or data.get('min_quantity', 5.0)),
        unit_cost=float(data.get('unitCost') or data.get('unit_cost', 0.0)),
        location=data.get('location', 'Armazém Central'),
        description=data.get('description'),
        service_mode=data.get('serviceMode') or data.get('service_mode', 'ambos')
    )
    db.session.add(item)
    db.session.commit()
    return jsonify({'success': True, 'item': item.to_dict()}), 201

@operations_bp.route('/inventory/<int:item_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_inventory_item(item_id):
    item = InventoryItem.query.get_or_404(item_id)
    data = request.get_json() or {}
    if 'name' in data: item.name = data['name']
    if 'category' in data: item.category = data['category']
    if 'unit' in data: item.unit = data['unit']
    if 'quantity' in data: item.quantity = float(data['quantity'])
    if 'minQuantity' in data or 'min_quantity' in data:
        item.min_quantity = float(data.get('minQuantity') or data.get('min_quantity', 5.0))
    if 'unitCost' in data or 'unit_cost' in data:
        item.unit_cost = float(data.get('unitCost') or data.get('unit_cost', 0.0))
    if 'location' in data: item.location = data['location']
    if 'description' in data: item.description = data['description']
    db.session.commit()
    return jsonify({'success': True, 'item': item.to_dict()}), 200

@operations_bp.route('/inventory/<int:item_id>/adjust', methods=['POST'])
@jwt_required(optional=True)
def adjust_inventory_stock(item_id):
    item = InventoryItem.query.get_or_404(item_id)
    data = request.get_json() or {}
    delta = float(data.get('delta', 0.0))
    adjust_type = data.get('type', 'in') # 'in' or 'out'
    if adjust_type == 'out':
        item.quantity = max(0.0, item.quantity - delta)
    else:
        item.quantity += delta
    db.session.commit()
    return jsonify({'success': True, 'item': item.to_dict(), 'newQuantity': item.quantity}), 200

@operations_bp.route('/inventory/<int:item_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_inventory_item(item_id):
    item = InventoryItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Item eliminado.'}), 200

# ==================== EQUIPAMENTOS ATRIBUÍDOS ====================
@operations_bp.route('/equipment-assignments', methods=['GET'])
def list_equipment_assignments():
    assignments = EquipmentAssignment.query.order_by(EquipmentAssignment.assigned_at.desc()).all()
    return jsonify({'success': True, 'items': [a.to_dict() for a in assignments]}), 200

@operations_bp.route('/equipment-assignments', methods=['POST'])
@jwt_required(optional=True)
def create_equipment_assignment():
    data = request.get_json() or {}
    assign = EquipmentAssignment(
        client_id=data.get('clientId') or data.get('client_id'),
        inventory_item_id=data.get('inventoryItemId') or data.get('inventory_item_id'),
        equipment_type=data.get('equipmentType') or data.get('equipment_type', 'ONU GPON'),
        model=data.get('model'),
        serial_number=data.get('serialNumber') or data.get('serial_number', f"SN-{int(datetime.utcnow().timestamp())}"),
        mac_address=data.get('macAddress') or data.get('mac_address'),
        pdo_number=data.get('pdoNumber') or data.get('pdo_number'),
        pdo_port=data.get('pdoPort') or data.get('pdo_port'),
        technician=data.get('technician', 'Piquete Técnico'),
        status='instalado',
        notes=data.get('notes')
    )
    db.session.add(assign)
    db.session.commit()
    return jsonify({'success': True, 'item': assign.to_dict()}), 201

# ==================== FECHOS DE CAIXA DIÁRIOS & MENSAIS ====================
@operations_bp.route('/cash-closures', methods=['GET'])
def list_cash_closures():
    closures = CashClosure.query.order_by(CashClosure.shift_date.desc(), CashClosure.closed_at.desc()).all()
    return jsonify({'success': True, 'items': [c.to_dict() for c in closures]}), 200

@operations_bp.route('/cash-closures', methods=['POST'])
@jwt_required(optional=True)
def create_cash_closure():
    data = request.get_json() or {}
    cid = data.get('id') or f"cx-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    closure = CashClosure(
        id=cid,
        operator_name=data.get('operatorName') or data.get('operator_name', 'Operador de Balcão'),
        initial_cash=float(data.get('initialCash', 0.0)),
        cash_sales=float(data.get('cashSales', 0.0)),
        multicaixa_sales=float(data.get('multicaixaSales', 0.0)),
        transfer_sales=float(data.get('transferSales', 0.0)),
        cash_expenses=float(data.get('cashExpenses', 0.0)),
        declared_cash=float(data.get('declaredCash', 0.0)),
        difference=float(data.get('difference', 0.0)),
        notes=data.get('notes')
    )
    db.session.add(closure)
    db.session.commit()
    return jsonify({'success': True, 'item': closure.to_dict()}), 201

@operations_bp.route('/monthly-closures', methods=['GET'])
def list_monthly_closures():
    m_closures = MonthlyClosureRecord.query.order_by(MonthlyClosureRecord.month_year.desc()).all()
    return jsonify({'success': True, 'items': [m.to_dict() for m in m_closures]}), 200

@operations_bp.route('/monthly-closures', methods=['POST'])
@jwt_required(optional=True)
def create_monthly_closure():
    data = request.get_json() or {}
    my = data.get('monthYear') or data.get('month_year') or date.today().strftime('%Y-%m')
    cid = data.get('id') or f"fecho-{my}"
    mc = MonthlyClosureRecord.query.get(cid)
    if not mc:
        mc = MonthlyClosureRecord(id=cid, month_year=my)
        db.session.add(mc)
    mc.code = data.get('code', f"FCH-{my}")
    mc.revenue_total = float(data.get('revenueTotal', 0.0))
    mc.expenses_total = float(data.get('expensesTotal', 0.0))
    mc.net_result = float(data.get('netResult', 0.0))
    mc.total_active_clients = int(data.get('totalActiveClients', 0))
    mc.default_rate = float(data.get('defaultRate', 0.0))
    mc.closed_by = data.get('closedBy', 'Direcção')
    mc.notes = data.get('notes')
    db.session.commit()
    return jsonify({'success': True, 'item': mc.to_dict()}), 201

# ==================== AGENDA & ESCALAS TÉCNICAS ====================
@operations_bp.route('/schedule', methods=['GET'])
def list_schedule_events():
    events = ScheduleEventRecord.query.order_by(ScheduleEventRecord.date.asc(), ScheduleEventRecord.start_time.asc()).all()
    return jsonify({'success': True, 'items': [e.to_dict() for e in events]}), 200

@operations_bp.route('/schedule', methods=['POST'])
@jwt_required(optional=True)
def create_schedule_event():
    data = request.get_json() or {}
    eid = data.get('id') or f"sch-{int(datetime.utcnow().timestamp())}"
    date_val = date.today()
    if data.get('date'):
        try: date_val = datetime.strptime(data['date'].split('T')[0], '%Y-%m-%d').date()
        except: pass

    ev = ScheduleEventRecord(
        id=eid,
        title=data.get('title', 'Piquete Técnico'),
        type=data.get('type', 'piquete_corte'),
        date=date_val,
        start_time=data.get('startTime') or data.get('start_time', '08:30'),
        end_time=data.get('endTime') or data.get('end_time', '12:00'),
        priority=data.get('priority', 'alta'),
        status=data.get('status', 'pendente'),
        leader_id=data.get('leaderId') or data.get('leader_id'),
        leader_name=data.get('leaderName') or data.get('leader_name', 'Mestre Job'),
        technicians_json=json.dumps(data.get('assignedTechnicianNames', [])),
        street=data.get('street'),
        pdo_number=data.get('pdoNumber') or data.get('pdo_number'),
        description=data.get('description'),
        checklist_json=json.dumps(data.get('checklist', [])),
        is_predefined_routine=bool(data.get('isPredefinedRoutine', False))
    )
    db.session.add(ev)
    db.session.commit()
    return jsonify({'success': True, 'item': ev.to_dict()}), 201

@operations_bp.route('/schedule/<string:event_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_schedule_event(event_id):
    ev = ScheduleEventRecord.query.get_or_404(event_id)
    data = request.get_json() or {}
    if 'status' in data: ev.status = data['status']
    if 'title' in data: ev.title = data['title']
    if 'checklist' in data: ev.checklist_json = json.dumps(data['checklist'])
    if 'description' in data: ev.description = data['description']
    db.session.commit()
    return jsonify({'success': True, 'item': ev.to_dict()}), 200

@operations_bp.route('/schedule/<string:event_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_schedule_event(event_id):
    ev = ScheduleEventRecord.query.get_or_404(event_id)
    db.session.delete(ev)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Agendamento eliminado.'}), 200

# ==================== MISSÕES DE PIQUETE & CORTES EM MASSA ====================
@operations_bp.route('/missions', methods=['GET'])
def list_team_missions():
    missions = TeamMissionRecord.query.order_by(TeamMissionRecord.created_at.desc()).all()
    return jsonify({'success': True, 'items': [m.to_dict() for m in missions]}), 200

@operations_bp.route('/missions', methods=['POST'])
@jwt_required(optional=True)
def create_team_mission():
    data = request.get_json() or {}
    mid = data.get('id') or f"mis-{int(datetime.utcnow().timestamp())}"
    m = TeamMissionRecord(
        id=mid,
        title=data.get('title', 'Operação Piquete'),
        type=data.get('type', 'corte'),
        leader_id=data.get('leaderId') or data.get('leader_id'),
        leader_name=data.get('leaderName') or data.get('leader_name', 'Mestre Job'),
        technicians_json=json.dumps(data.get('technicianNames', [])),
        streets_json=json.dumps(data.get('streets', [])),
        tasks_json=json.dumps(data.get('tasks', [])),
        notes=data.get('notes'),
        status=data.get('status', 'ativa')
    )
    db.session.add(m)
    db.session.commit()
    return jsonify({'success': True, 'item': m.to_dict()}), 201

@operations_bp.route('/missions/<string:mission_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_team_mission(mission_id):
    m = TeamMissionRecord.query.get_or_404(mission_id)
    data = request.get_json() or {}
    if 'status' in data:
        m.status = data['status']
        if data['status'] == 'concluida' and not m.completed_at:
            m.completed_at = datetime.utcnow()
    if 'tasks' in data: m.tasks_json = json.dumps(data['tasks'])
    if 'notes' in data: m.notes = data['notes']
    db.session.commit()
    return jsonify({'success': True, 'item': m.to_dict()}), 200

# ==================== COMUNICADOS ====================
@operations_bp.route('/announcements', methods=['GET'])
def list_announcements():
    announcements = Announcement.query.filter_by(is_active=True).order_by(Announcement.id.desc()).all()
    return jsonify({'success': True, 'items': [a.to_dict() for a in announcements]}), 200

@operations_bp.route('/announcements', methods=['POST'])
@jwt_required(optional=True)
def create_announcement():
    data = request.get_json() or {}
    ann = Announcement(
        title=data.get('title', 'Comunicado'),
        category=data.get('category', 'comunicado'),
        content=data.get('content', ''),
        date=data.get('date', 'Hoje')
    )
    db.session.add(ann)
    db.session.commit()
    bump_system_version()
    return jsonify({'success': True, 'item': ann.to_dict()}), 201

# ==================== CONTRATOS (TV POR CABO E FIBRA) ====================
@operations_bp.route('/contracts', methods=['GET'])
def list_contracts():
    client_id = request.args.get('client_id', type=int)
    query = Contract.query
    if client_id:
        query = query.filter_by(client_id=client_id)
    items = query.order_by(Contract.id.desc()).all()
    return jsonify({
        'success': True,
        'count': len(items),
        'items': [c.to_dict() for c in items]
    }), 200

@operations_bp.route('/contracts', methods=['POST'])
@jwt_required(optional=True)
def create_contract():
    data = request.get_json() or {}
    client_id = data.get('client_id') or data.get('clientId')
    client_name = data.get('client_name') or data.get('clientName', 'Assinante OSDEL')
    
    # Gerar código oficial de contrato se não fornecido
    last_c = Contract.query.order_by(Contract.id.desc()).first()
    next_id = (last_c.id + 1) if last_c else 1
    code = data.get('code') or data.get('contractNumber') or f"CT-{datetime.utcnow().year}/{next_id:05d}"
    
    contract = Contract(
        code=code,
        client_id=client_id,
        client_name=client_name,
        plan_name=data.get('plan_name') or data.get('planName'),
        plan_speed=data.get('plan_speed') or data.get('planSpeed'),
        monthly_price=float(data.get('monthly_price') or data.get('monthlyPrice') or data.get('monthlyFee', 4000)),
        contract_fee=float(data.get('contract_fee') or data.get('contractFee', 15000)),
        urgent_fee=float(data.get('urgent_fee') or data.get('urgentFee', 0)),
        urgent_fee_discount=float(data.get('urgent_fee_discount') or data.get('urgentFeeDiscount', 0)),
        tv_points=int(data.get('tv_points') or data.get('tvPoints', 1)),
        due_day=int(data.get('due_day') or data.get('dueDay', 5)),
        status=data.get('status', 'active'),
        service_type=data.get('service_type') or data.get('serviceType', 'tv'),
        terms=data.get('terms')
    )
    db.session.add(contract)
    db.session.commit()
    bump_system_version()
    return jsonify({'success': True, 'message': 'Contrato oficial gerado e persistido com sucesso.', 'item': contract.to_dict()}), 201

@operations_bp.route('/contracts/<int:contract_id>', methods=['PUT', 'PATCH'])
@jwt_required(optional=True)
def update_contract(contract_id):
    contract = Contract.query.get_or_404(contract_id)
    data = request.get_json() or {}
    if 'status' in data: contract.status = data['status']
    if 'terms' in data: contract.terms = data['terms']
    if 'monthly_price' in data or 'monthlyPrice' in data or 'monthlyFee' in data:
        contract.monthly_price = float(data.get('monthly_price') or data.get('monthlyPrice') or data.get('monthlyFee'))
    if 'tv_points' in data or 'tvPoints' in data:
        contract.tv_points = int(data.get('tv_points') or data.get('tvPoints'))
    if 'urgent_fee' in data or 'urgentFee' in data:
        contract.urgent_fee = float(data.get('urgent_fee') or data.get('urgentFee'))
    if 'urgent_fee_discount' in data or 'urgentFeeDiscount' in data:
        contract.urgent_fee_discount = float(data.get('urgent_fee_discount') or data.get('urgentFeeDiscount'))
    db.session.commit()
    bump_system_version()
    return jsonify({'success': True, 'item': contract.to_dict()}), 200

@operations_bp.route('/contracts/<int:contract_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_contract(contract_id):
    contract = Contract.query.get_or_404(contract_id)
    db.session.delete(contract)
    db.session.commit()
    bump_system_version()
    return jsonify({'success': True, 'message': 'Contrato removido com sucesso.'}), 200


