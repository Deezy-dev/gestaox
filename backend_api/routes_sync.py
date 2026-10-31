from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import (
    db, 
    Client, 
    Invoice, 
    Payment, 
    User, 
    Contract,
    FinancialAccount, 
    CompanySetting, 
    ServiceOrder, 
    TechnicianLoan,
    ActivityLog,
    Expense,
    AccountTransfer,
    InventoryItem,
    EquipmentAssignment,
    CashClosure,
    MonthlyClosureRecord,
    ScheduleEventRecord,
    TeamMissionRecord,
    TvDecoderChannel,
    ChatMessageRecord,
    TeamMessageRecord,
    SupportInterventionRecord,
    bump_system_version,
    get_system_version
)

sync_bp = Blueprint('sync', __name__, url_prefix='/api/v1/sync')

@sync_bp.route('/status', methods=['GET'])
def get_sync_status():
    """
    Verificação ultraleve de versão global do ecossistema e estado de sessão.
    Responde em < 2ms consumindo ZERO CPU no plano gratuito do PythonAnywhere.
    Permite que Web, Android APK e Electron saibam instantaneamente se há dados novos
    e se a sessão do colaborador foi revogada por um administrador.
    """
    client_version = request.args.get('version', '').strip()
    username = request.args.get('user', '').strip()
    user_id = request.args.get('user_id', '').strip()
    server_version = get_system_version()
    
    session_revoked = False
    if username and username.lower() != 'deezy':
        user = User.query.filter(db.func.lower(User.username) == username.lower()).first()
        if not user or not user.is_active:
            session_revoked = True
    elif user_id:
        try:
            u_id_int = int(user_id)
            user = User.query.get(u_id_int)
            if not user or not user.is_active:
                session_revoked = True
        except Exception:
            pass

    has_changes = True
    if client_version and client_version == server_version:
        has_changes = False

    return jsonify({
        'success': True,
        'has_changes': has_changes,
        'version': server_version,
        'session_revoked': session_revoked
    }), 200

@sync_bp.route('/full-snapshot', methods=['GET'])
def get_full_snapshot():
    """
    Retorna uma fotografia completa e sincronizada de todas as tabelas do ecossistema OSDEL.
    Permite que o Frontend Web, Electron e APKs se sincronizem com um único pedido.
    """
    clients = [c.to_dict() for c in Client.query.order_by(Client.id.asc()).all()]
    invoices = [i.to_dict() for i in Invoice.query.order_by(Invoice.id.desc()).all()]
    payments = [p.to_dict() for p in Payment.query.order_by(Payment.id.desc()).all()]
    contracts = [c.to_dict() for c in Contract.query.order_by(Contract.id.desc()).all()]
    users = [u.to_dict() for u in User.query.filter_by(is_active=True).all()]
    # Garante que as 5 contas padrão unificadas existem sempre na base de dados
    standard_accounts = [
        {'id': 'acc-caixa', 'name': 'Caixa Geral (Balcão Golf)', 'type': 'caixa'},
        {'id': 'acc-bai', 'name': 'Banco BAI (AO06.0040.0000.1234.5678.9012.3)', 'type': 'banco', 'bank_name': 'Banco BAI'},
        {'id': 'acc-bfa', 'name': 'Banco BFA (AO06.0006.0000.9876.5432.1098.7)', 'type': 'banco', 'bank_name': 'Banco BFA'},
        {'id': 'acc-tpa', 'name': 'Terminal Multicaixa Express (TPA / EMIS)', 'type': 'tpa', 'bank_name': 'Rede Multicaixa EMIS'},
        {'id': 'acc-piquete', 'name': 'Fundo de Maneio de Piquete Técnico', 'type': 'fundo_maneio'},
    ]
    created_any_acc = False
    for sacc in standard_accounts:
        if not FinancialAccount.query.get(sacc['id']):
            db.session.add(FinancialAccount(
                id=sacc['id'],
                name=sacc['name'],
                type=sacc['type'],
                bank_name=sacc.get('bank_name'),
                initial_balance=0.0,
                current_balance=0.0
            ))
            created_any_acc = True
    if created_any_acc:
        db.session.commit()

    accounts = [a.to_dict() for a in FinancialAccount.query.all()]
    transfers = [t.to_dict() for t in AccountTransfer.query.order_by(AccountTransfer.id.desc()).all()]
    orders = [o.to_dict() for o in ServiceOrder.query.order_by(ServiceOrder.id.desc()).limit(150).all()]
    loans = [l.to_dict() for l in TechnicianLoan.query.order_by(TechnicianLoan.requested_at.desc()).all()]
    expenses = [e.to_dict() for e in Expense.query.order_by(Expense.date.desc()).limit(150).all()]
    inventory = [it.to_dict() for it in InventoryItem.query.all()]
    cash_closures = [cc.to_dict() for cc in CashClosure.query.order_by(CashClosure.shift_date.desc()).all()]
    monthly_closures = [mc.to_dict() for mc in MonthlyClosureRecord.query.order_by(MonthlyClosureRecord.month_year.desc()).all()]
    schedule = [s.to_dict() for s in ScheduleEventRecord.query.all()]
    missions = [m.to_dict() for m in TeamMissionRecord.query.all()]
    decoders = [d.to_dict() for d in TvDecoderChannel.query.order_by(TvDecoderChannel.channel_number.asc()).all()]
    activities = [a.to_dict() for a in ActivityLog.query.order_by(ActivityLog.id.desc()).limit(200).all()]
    chat_messages = [cm.to_dict() for cm in ChatMessageRecord.query.order_by(ChatMessageRecord.id.desc()).limit(200).all()]
    team_messages = [tm.to_dict() for tm in TeamMessageRecord.query.order_by(TeamMessageRecord.id.desc()).limit(200).all()]
    interventions = [si.to_dict() for si in SupportInterventionRecord.query.order_by(SupportInterventionRecord.id.desc()).limit(100).all()]

    setting_rec = CompanySetting.query.filter_by(key='global_settings').first()
    settings_data = setting_rec.get_data() if setting_rec else {}

    return jsonify({
        'success': True,
        'timestamp': datetime.utcnow().isoformat(),
        'version': get_system_version(),
        'counts': {
            'clients': len(clients),
            'invoices': len(invoices),
            'payments': len(payments),
            'contracts': len(contracts),
            'users': len(users),
            'accounts': len(accounts),
            'transfers': len(transfers),
            'orders': len(orders),
            'loans': len(loans),
            'expenses': len(expenses),
            'inventory': len(inventory),
            'cashClosures': len(cash_closures),
            'monthlyClosures': len(monthly_closures),
            'schedule': len(schedule),
            'missions': len(missions),
            'tvChannels': len(decoders),
            'activities': len(activities),
            'chatMessages': len(chat_messages),
            'teamMessages': len(team_messages),
            'supportInterventions': len(interventions)
        },
        'data': {
            'clients': clients,
            'invoices': invoices,
            'payments': payments,
            'contracts': contracts,
            'users': users,
            'accounts': accounts,
            'transfers': transfers,
            'orders': orders,
            'loans': loans,
            'expenses': expenses,
            'inventory': inventory,
            'cashClosures': cash_closures,
            'monthlyClosures': monthly_closures,
            'schedule': schedule,
            'missions': missions,
            'tvChannels': decoders,
            'activities': activities,
            'chatMessages': chat_messages,
            'teamMessages': team_messages,
            'supportInterventions': interventions,
            'settings': settings_data,
            'version': get_system_version()
        }
    }), 200

@sync_bp.route('/delta', methods=['GET'])
def get_delta_sync():
    """
    Sincronização Incremental Ultra-Leve (Delta Polling por Cursor).
    Ideal para o PythonAnywhere Free: se nada mudou, responde em ~3ms com has_changes=False,
    gastando quase zero CPU e sem precisar de WebSockets pesados.
    """
    since_str = request.args.get('since')
    if not since_str:
        return get_full_snapshot()

    try:
        clean_since = since_str.replace('Z', '+00:00')
        since_dt = datetime.fromisoformat(clean_since).replace(tzinfo=None)
    except Exception:
        return get_full_snapshot()

    recent_clients = [c.to_dict() for c in Client.query.filter((Client.created_at >= since_dt) | (Client.updated_at >= since_dt)).all()]
    recent_payments = [p.to_dict() for p in Payment.query.filter(Payment.created_at >= since_dt).all()]
    recent_invoices = [i.to_dict() for i in Invoice.query.filter(Invoice.created_at >= since_dt).all()]
    recent_orders = [o.to_dict() for o in ServiceOrder.query.filter(ServiceOrder.created_at >= since_dt).all()]
    recent_expenses = [e.to_dict() for e in Expense.query.filter(Expense.created_at >= since_dt).all()]
    recent_chats = [cm.to_dict() for cm in ChatMessageRecord.query.filter(ChatMessageRecord.created_at >= since_dt).all()]
    recent_teams = [tm.to_dict() for tm in TeamMessageRecord.query.filter(TeamMessageRecord.created_at >= since_dt).all()]

    has_changes = any([
        recent_clients, recent_payments, recent_invoices,
        recent_orders, recent_expenses, recent_chats, recent_teams
    ])

    now_iso = datetime.utcnow().isoformat()
    if not has_changes:
        return jsonify({
            'success': True,
            'has_changes': False,
            'timestamp': now_iso,
            'data': {}
        }), 200

    return jsonify({
        'success': True,
        'has_changes': True,
        'timestamp': now_iso,
        'data': {
            'clients': recent_clients,
            'payments': recent_payments,
            'invoices': recent_invoices,
            'orders': recent_orders,
            'expenses': recent_expenses,
            'chatMessages': recent_chats,
            'teamMessages': recent_teams
        }
    }), 200

@sync_bp.route('/batch', methods=['POST'])
@jwt_required(optional=True)
def sync_batch():
    """
    Recebe um lote de mutações locais ou offline do Web/Desktop/APK e sincroniza na base de dados.
    """
    data = request.get_json() or {}
    mutations = data.get('mutations', [])
    applied = 0
    errors = []

    applied_ids = []
    for item in mutations:
        try:
            entity = item.get('entity', '').lower()
            action = item.get('action', '').lower()
            payload = item.get('payload', {})
            item_id = item.get('id')

            is_delete = action in ['delete', 'destroy', 'remove', 'anular', 'cancel']

            if entity in ['cliente', 'client', 'clients']:
                code = payload.get('code')
                cid = payload.get('id') or payload.get('clientId')
                phone = payload.get('phone') or ''
                
                existing_c = None
                if code:
                    existing_c = Client.query.filter_by(code=code).first()
                if not existing_c and cid:
                    try: existing_c = Client.query.get(int(cid))
                    except: pass
                if not existing_c and phone:
                    existing_c = Client.query.filter_by(phone=phone).first()

                if is_delete:
                    if existing_c:
                        # Cascade delete related contracts, invoices, payments
                        Contract.query.filter_by(client_id=existing_c.id).delete()
                        Invoice.query.filter_by(client_id=existing_c.id).delete()
                        Payment.query.filter_by(client_id=existing_c.id).delete()
                        db.session.delete(existing_c)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_c:
                    full_name = payload.get('fullName') or payload.get('full_name')
                    if full_name: existing_c.full_name = full_name
                    if phone: existing_c.phone = phone
                    if payload.get('address'): existing_c.address = payload['address']
                    if payload.get('serviceType') or payload.get('service_type'):
                        existing_c.service_type = payload.get('serviceType') or payload.get('service_type')
                    if payload.get('status'): existing_c.status = payload['status']
                    if payload.get('monthlyPrice') or payload.get('monthly_fee'):
                        existing_c.monthly_fee = float(payload.get('monthlyPrice') or payload.get('monthly_fee'))
                    if payload.get('houseCode') or payload.get('house_code'):
                        existing_c.house_code = payload.get('houseCode') or payload.get('house_code')
                    if payload.get('documentNumber') or payload.get('document_number'):
                        existing_c.document_number = payload.get('documentNumber') or payload.get('document_number')
                    if payload.get('pdoNumber') or payload.get('pdo_number'):
                        existing_c.pdo_number = payload.get('pdoNumber') or payload.get('pdo_number')
                    if payload.get('onuNumber') or payload.get('onu_number'):
                        existing_c.onu_number = payload.get('onuNumber') or payload.get('onu_number')
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    full_name = payload.get('fullName') or payload.get('full_name') or ''
                    if full_name:
                        new_code = code or f"CLI-{Client.query.count()+1:05d}"
                        if Client.query.filter_by(code=new_code).first():
                            new_code = f"CLI-{Client.query.count()+2:05d}"
                        c = Client(
                            code=new_code,
                            full_name=full_name,
                            phone=phone or '900000000',
                            address=payload.get('address'),
                            service_type=payload.get('serviceType') or payload.get('service_type', 'combo'),
                            status=payload.get('status', 'active'),
                            monthly_fee=float(payload.get('monthlyPrice') or payload.get('monthly_fee', 4000)),
                            house_code=payload.get('houseCode') or payload.get('house_code'),
                            document_number=payload.get('documentNumber') or payload.get('document_number'),
                            neighborhood=payload.get('neighborhood'),
                            pdo_number=payload.get('pdoNumber') or payload.get('pdo_number'),
                            onu_number=payload.get('onuNumber') or payload.get('onu_number')
                        )
                        db.session.add(c)
                        applied += 1
                        if item_id: applied_ids.append(item_id)

            elif entity in ['pagamento', 'payment', 'payments']:
                raw_ref = (payload.get('reference') or payload.get('receiptNumber') or '').strip()
                pid = payload.get('id') or payload.get('paymentId')
                cid = payload.get('clientId') or payload.get('client_id')
                p_month = payload.get('paymentMonth') or payload.get('payment_month')
                
                existing_p = None
                if pid:
                    try:
                        existing_p = Payment.query.get(int(pid))
                    except Exception:
                        pass
                if not existing_p and raw_ref and raw_ref not in ['—', '-']:
                    existing_p = Payment.query.filter(Payment.reference == raw_ref).first()
                if not existing_p and cid and p_month and not raw_ref:
                    existing_p = Payment.query.filter_by(client_id=cid, payment_month=p_month).first()
                
                if is_delete:
                    if existing_p:
                        # Adjust account balance
                        acc_id = existing_p.account_id or 'acc-caixa'
                        acc = FinancialAccount.query.get(acc_id)
                        if acc:
                            acc.withdraw(existing_p.total or existing_p.amount or 0)
                        # Reverte status da factura vinculada se existir
                        if existing_p.invoice_id:
                            inv = Invoice.query.get(existing_p.invoice_id)
                            if inv:
                                inv.status = 'pendente'
                                inv.payment_date = None
                                inv.payment_method = None
                        db.session.delete(existing_p)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_p:
                    if item_id: applied_ids.append(item_id)
                else:
                    tot = float(payload.get('total') or (float(payload.get('amount', 0)) + float(payload.get('penalty', 0))))
                    p = Payment(
                        client_id=cid,
                        client_name=payload.get('clientName') or payload.get('client_name', 'Cliente'),
                        amount=float(payload.get('amount', 0)),
                        penalty=float(payload.get('penalty', 0)),
                        total=tot,
                        payment_month=p_month,
                        method=payload.get('method', 'Multicaixa'),
                        reference=raw_ref if raw_ref else None,
                        account_id=payload.get('accountId') or payload.get('account_id', 'acc-caixa')
                    )
                    db.session.add(p)
                    acc = FinancialAccount.query.get(p.account_id)
                    if acc: acc.deposit(p.total)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['factura', 'fatura', 'invoice', 'invoices']:
                inv_num = payload.get('invoiceNumber') or payload.get('invoice_number') or payload.get('number')
                invid = payload.get('id') or payload.get('invoiceId')
                cid = payload.get('clientId') or payload.get('client_id')
                
                existing_inv = None
                if invid:
                    try: existing_inv = Invoice.query.get(int(invid))
                    except: pass
                if not existing_inv and inv_num:
                    existing_inv = Invoice.query.filter((Invoice.number == inv_num) | (Invoice.reference_code == inv_num)).first()
                
                if is_delete:
                    if existing_inv:
                        db.session.delete(existing_inv)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_inv:
                    if payload.get('status'): existing_inv.status = payload['status']
                    if payload.get('notes'): existing_inv.notes = payload['notes']
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    tot = float(payload.get('total') or payload.get('amount', 0))
                    due_d_str = payload.get('dueDate') or payload.get('due_date')
                    try:
                        due_d = datetime.strptime(str(due_d_str).split('T')[0], '%Y-%m-%d').date() if due_d_str else date.today()
                    except Exception:
                        due_d = date.today()
                    inv = Invoice(
                        number=inv_num or f"FT-{int(datetime.utcnow().timestamp())}",
                        client_id=cid,
                        client_name=payload.get('clientName') or payload.get('client_name', 'Cliente'),
                        amount=float(payload.get('amount') or tot),
                        penalty=float(payload.get('penalty', 0)),
                        total=tot,
                        due_date=due_d,
                        status=payload.get('status', 'paga'),
                        notes=payload.get('notes'),
                        reference_code=payload.get('reference') or payload.get('reference_code') or inv_num
                    )
                    db.session.add(inv)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['contrato', 'contract', 'contracts']:
                c_code = payload.get('code') or payload.get('contractNumber')
                ctid = payload.get('id')
                existing_ct = None
                if ctid:
                    try: existing_ct = Contract.query.get(int(ctid))
                    except: pass
                if not existing_ct and c_code:
                    existing_ct = Contract.query.filter_by(code=c_code).first()
                
                if is_delete:
                    if existing_ct:
                        db.session.delete(existing_ct)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_ct:
                    if payload.get('status'): existing_ct.status = payload['status']
                    if payload.get('monthlyPrice') or payload.get('monthly_fee'):
                        existing_ct.monthly_price = float(payload.get('monthlyPrice') or payload.get('monthly_fee'))
                    if payload.get('terms'): existing_ct.terms = payload['terms']
                    if payload.get('planName') or payload.get('plan_name'):
                        existing_ct.plan_name = payload.get('planName') or payload.get('plan_name')
                    if payload.get('planSpeed') or payload.get('plan_speed'):
                        existing_ct.plan_speed = payload.get('planSpeed') or payload.get('plan_speed')
                    if payload.get('tvPoints') or payload.get('tv_points'):
                        existing_ct.tv_points = int(payload.get('tvPoints') or payload.get('tv_points'))
                    if 'remainingDaysChoice' in payload or 'remaining_days_choice' in payload:
                        existing_ct.remaining_days_choice = payload.get('remainingDaysChoice') or payload.get('remaining_days_choice')
                    if 'remainingDaysCount' in payload or 'remaining_days_count' in payload or 'prorataDays' in payload:
                        existing_ct.remaining_days_count = int(payload.get('remainingDaysCount') or payload.get('remaining_days_count') or payload.get('prorataDays') or 0)
                    if 'remainingDaysAmount' in payload or 'remaining_days_amount' in payload or 'prorataAmount' in payload:
                        existing_ct.remaining_days_amount = float(payload.get('remainingDaysAmount') or payload.get('remaining_days_amount') or payload.get('prorataAmount') or 0.0)
                    if 'accountId' in payload or 'account_id' in payload:
                        existing_ct.account_id = payload.get('accountId') or payload.get('account_id')
                    if 'paymentMethod' in payload or 'payment_method' in payload:
                        existing_ct.payment_method = payload.get('paymentMethod') or payload.get('payment_method')
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_ct = Contract(
                        code=c_code or f"CT-{int(datetime.utcnow().timestamp())}",
                        client_id=payload.get('clientId') or payload.get('client_id'),
                        client_name=payload.get('clientName') or payload.get('client_name', 'Assinante'),
                        plan_name=payload.get('planName') or payload.get('plan_name', 'Plano Padrão'),
                        plan_speed=payload.get('planSpeed') or payload.get('plan_speed', 'Sinal Digital RF'),
                        monthly_price=float(payload.get('monthlyPrice') or payload.get('monthly_fee', 4000)),
                        contract_fee=float(payload.get('contractFee') or payload.get('contract_fee', 15000)),
                        urgent_fee=float(payload.get('urgentFee') or payload.get('urgent_fee', 0)),
                        urgent_fee_discount=float(payload.get('urgentFeeDiscount') or payload.get('urgent_fee_discount', 0)),
                        tv_points=int(payload.get('tvPoints') or payload.get('tv_points', 1)),
                        due_day=int(payload.get('dueDay') or payload.get('due_day', 5)),
                        status=payload.get('status', 'active'),
                        service_type=payload.get('serviceType') or payload.get('service_type', 'tv'),
                        terms=payload.get('terms'),
                        remaining_days_choice=payload.get('remainingDaysChoice') or payload.get('remaining_days_choice'),
                        remaining_days_count=int(payload.get('remainingDaysCount') or payload.get('remaining_days_count') or payload.get('prorataDays') or 0),
                        remaining_days_amount=float(payload.get('remainingDaysAmount') or payload.get('remaining_days_amount') or payload.get('prorataAmount') or 0.0),
                        account_id=payload.get('accountId') or payload.get('account_id'),
                        payment_method=payload.get('paymentMethod') or payload.get('payment_method')
                    )
                    db.session.add(new_ct)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['despesa', 'expense', 'expenses', 'despesas', 'saida', 'saída', 'saidas', 'saídas'] or 'despesa' in entity or 'saida' in entity or 'saída' in entity or item.get('module') == 'despesas':
                eid = payload.get('id')
                existing_e = None
                if eid:
                    try: existing_e = Expense.query.get(int(eid))
                    except: pass
                if not existing_e:
                    # Verifica duplicado por data, valor e motivo
                    desc_check = payload.get('description') or payload.get('reason') or payload.get('title') or 'Despesa'
                    amt_check = float(payload.get('amount', 0))
                    raw_d = payload.get('date')
                    if raw_d:
                        try:
                            d_parsed = datetime.strptime(str(raw_d).split('T')[0], '%Y-%m-%d').date()
                            existing_e = Expense.query.filter_by(date=d_parsed, amount=amt_check, description=desc_check).first()
                        except Exception:
                            pass

                if is_delete:
                    if existing_e:
                        acc = FinancialAccount.query.get(existing_e.account_id)
                        if acc: acc.deposit(existing_e.amount)
                        db.session.delete(existing_e)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_e:
                    # Atualiza dados se necessário
                    if payload.get('reason') or payload.get('description'):
                        existing_e.description = payload.get('description') or payload.get('reason')
                    if payload.get('category'):
                        existing_e.category = payload.get('category')
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    exp_date = date.today()
                    raw_date = payload.get('date')
                    if raw_date:
                        try:
                            exp_date = datetime.strptime(str(raw_date).split('T')[0], '%Y-%m-%d').date()
                        except Exception:
                            exp_date = date.today()

                    desc = payload.get('description') or payload.get('reason') or payload.get('title') or 'Despesa Operacional'
                    acc_id = payload.get('accountId') or payload.get('account_id') or 'acc-caixa'
                    acc_name = payload.get('account', 'Caixa Geral')

                    exp = Expense(
                        description=desc,
                        category=payload.get('category', 'operacional'),
                        amount=float(payload.get('amount', 0)),
                        date=exp_date,
                        account_id=acc_id,
                        account=acc_name,
                        beneficiary=payload.get('beneficiary') or payload.get('supplier'),
                        payment_method=payload.get('payment_method') or payload.get('paymentMethod', 'Dinheiro'),
                        document_ref=payload.get('document_ref') or payload.get('documentNumber') or payload.get('documentRef'),
                        status=payload.get('status', 'pago')
                    )
                    db.session.add(exp)
                    # Deduz valor da conta financeira correspondente
                    acc = FinancialAccount.query.get(acc_id)
                    if acc: acc.withdraw(exp.amount)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['ordem', 'ordem_servico', 'service_order', 'orders']:
                so_id = payload.get('id')
                existing_so = None
                if so_id:
                    try: existing_so = ServiceOrder.query.get(int(so_id))
                    except: pass
                if is_delete:
                    if existing_so:
                        db.session.delete(existing_so)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_so:
                    if payload.get('status'): existing_so.status = payload['status']
                    if payload.get('notes'): existing_so.notes = payload['notes']
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_so = ServiceOrder(
                        code=payload.get('code') or f"OS-{int(datetime.utcnow().timestamp())}",
                        client_id=payload.get('clientId') or payload.get('client_id'),
                        client_name=payload.get('clientName') or payload.get('client_name', 'Cliente'),
                        service_type=payload.get('serviceType') or 'tv',
                        type=payload.get('type', 'instalacao'),
                        priority=payload.get('priority', 'media'),
                        status=payload.get('status', 'pendente'),
                        address=payload.get('address'),
                        notes=payload.get('notes')
                    )
                    db.session.add(new_so)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['utilizador', 'user', 'users', 'colaborador']:
                uid = payload.get('id') or payload.get('userId')
                uname = (payload.get('username') or '').strip().lower()
                existing_u = None
                if uid:
                    try: existing_u = User.query.get(int(uid))
                    except: pass
                if not existing_u and uname:
                    existing_u = User.query.filter(db.func.lower(User.username) == uname).first()

                if is_delete:
                    # NUNCA apagar o SuperAdmin Supremo Deezy
                    if existing_u and existing_u.username.lower() != 'deezy':
                        existing_u.is_active = False
                        db.session.delete(existing_u)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_u:
                    if payload.get('name') or payload.get('full_name'):
                        existing_u.full_name = payload.get('name') or payload.get('full_name')
                    if payload.get('phone'): existing_u.phone = payload['phone']
                    if payload.get('jobTitle') or payload.get('job_title'):
                        existing_u.job_title = payload.get('jobTitle') or payload.get('job_title')
                    if payload.get('role') and existing_u.username.lower() != 'deezy':
                        existing_u.role = payload['role']
                    if payload.get('pin'): existing_u.pin = str(payload['pin'])
                    if payload.get('salaryBase') or payload.get('salary_base'):
                        existing_u.salary_base = float(payload.get('salaryBase') or payload.get('salary_base'))
                    if 'active' in payload: existing_u.is_active = bool(payload['active'])
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_u = User(
                        username=uname or f"user_{int(datetime.utcnow().timestamp())}",
                        full_name=payload.get('name') or payload.get('full_name', 'Colaborador'),
                        role=payload.get('role', 'tecnico'),
                        pin=str(payload.get('pin', '1234')),
                        phone=payload.get('phone'),
                        job_title=payload.get('jobTitle') or payload.get('job_title'),
                        department=payload.get('department', 'Técnico'),
                        salary_base=float(payload.get('salaryBase') or payload.get('salary_base', 150000)),
                        is_active=True
                    )
                    new_u.set_password(payload.get('password', 'osdel@2026'))
                    db.session.add(new_u)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['inventario', 'inventory', 'stock']:
                iid = payload.get('id')
                icode = payload.get('code')
                existing_it = None
                if iid:
                    try: existing_it = InventoryItem.query.get(int(iid))
                    except: pass
                if not existing_it and icode:
                    existing_it = InventoryItem.query.filter_by(code=icode).first()
                if is_delete:
                    if existing_it:
                        db.session.delete(existing_it)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_it:
                    if 'quantity' in payload: existing_it.quantity = int(payload['quantity'])
                    if 'minQuantity' in payload or 'min_quantity' in payload:
                        existing_it.min_quantity = int(payload.get('minQuantity') or payload.get('min_quantity'))
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_it = InventoryItem(
                        code=icode or f"MAT-{int(datetime.utcnow().timestamp())}",
                        name=payload.get('name', 'Material'),
                        category=payload.get('category', 'fibra'),
                        quantity=int(payload.get('quantity', 0)),
                        min_quantity=int(payload.get('minQuantity', 5)),
                        unit=payload.get('unit', 'unidade'),
                        unit_cost=float(payload.get('unitCost', 0))
                    )
                    db.session.add(new_it)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['agenda', 'schedule', 'schedule_event']:
                sid = str(payload.get('id', ''))
                existing_s = ScheduleEventRecord.query.get(sid) if sid else None
                if is_delete:
                    if existing_s:
                        db.session.delete(existing_s)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_s:
                    if payload.get('status'): existing_s.status = payload['status']
                    existing_s.set_checklist(payload.get('checklist', []))
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_s = ScheduleEventRecord(
                        id=sid or f"sched_{int(datetime.utcnow().timestamp()*1000)}",
                        title=payload.get('title', 'Evento'),
                        type=payload.get('type', 'piquete'),
                        date=payload.get('date', datetime.utcnow().strftime('%Y-%m-%d')),
                        start_time=payload.get('startTime', '08:00'),
                        end_time=payload.get('endTime', '12:00'),
                        priority=payload.get('priority', 'media'),
                        status=payload.get('status', 'pendente'),
                        leader_name=payload.get('leaderName'),
                        street=payload.get('street'),
                        pdo_number=payload.get('pdoNumber'),
                        description=payload.get('description')
                    )
                    new_s.set_technicians(payload.get('assignedTechnicianIds', []), payload.get('assignedTechnicianNames', []))
                    new_s.set_checklist(payload.get('checklist', []))
                    db.session.add(new_s)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['missao', 'mission', 'team_mission']:
                mid = str(payload.get('id', ''))
                existing_m = TeamMissionRecord.query.get(mid) if mid else None
                if is_delete:
                    if existing_m:
                        db.session.delete(existing_m)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_m:
                    if payload.get('status'): existing_m.status = payload['status']
                    existing_m.set_tasks(payload.get('tasks', []))
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_m = TeamMissionRecord(
                        id=mid or f"mis_{int(datetime.utcnow().timestamp()*1000)}",
                        title=payload.get('title', 'Missão de Piquete'),
                        type=payload.get('type', 'corte'),
                        leader_name=payload.get('leaderName'),
                        status=payload.get('status', 'em_curso'),
                        scheduled_date=payload.get('scheduledDate', datetime.utcnow().strftime('%Y-%m-%d')),
                        notes=payload.get('notes')
                    )
                    new_m.set_technicians(payload.get('technicianIds', []), payload.get('technicianNames', []))
                    new_m.set_streets(payload.get('streets', []))
                    new_m.set_tasks(payload.get('tasks', []))
                    db.session.add(new_m)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['transferencia', 'transfer', 'account_transfer']:
                tid = str(payload.get('id') or payload.get('transferId') or '')
                if is_delete:
                    if tid:
                        tr = AccountTransfer.query.get(tid)
                        if not tr and payload.get('code'):
                            tr = AccountTransfer.query.filter_by(reference=payload.get('code')).first()
                        if tr:
                            # Reverter saldos de ambas as contas
                            if tr.from_account_id:
                                src_acc = FinancialAccount.query.get(tr.from_account_id)
                                if src_acc: src_acc.deposit(tr.amount)
                            if tr.to_account_id:
                                dst_acc = FinancialAccount.query.get(tr.to_account_id)
                                if dst_acc: dst_acc.withdraw(tr.amount)
                            db.session.delete(tr)
                            applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    amount = float(payload.get('amount', 0))
                    src_id = payload.get('sourceAccountId') or payload.get('from_account') or payload.get('fromAccountId') or payload.get('from_account_id')
                    dst_id = payload.get('targetAccountId') or payload.get('to_account') or payload.get('toAccountId') or payload.get('to_account_id')
                    tr_id = str(payload.get('id') or payload.get('code') or f"trf_{int(time.time()*1000)}")
                    new_tr = AccountTransfer(
                        id=tr_id,
                        from_account_id=src_id,
                        to_account_id=dst_id,
                        amount=amount,
                        description=payload.get('description', 'Transferência'),
                        operator=payload.get('operator', 'Sistema')
                    )
                    db.session.add(new_tr)
                    src_acc = FinancialAccount.query.get(src_id) if src_id else None
                    dst_acc = FinancialAccount.query.get(dst_id) if dst_id else None
                    if src_acc: src_acc.withdraw(amount)
                    if dst_acc: dst_acc.deposit(amount)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['fecho_caixa', 'cash_closure']:
                cid = payload.get('id')
                existing_cc = CashClosure.query.get(cid) if cid else None
                if is_delete:
                    if existing_cc:
                        db.session.delete(existing_cc)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_cc:
                    if payload.get('status'): existing_cc.status = payload['status']
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_cc = CashClosure(
                        id=str(cid or f"cc_{int(datetime.utcnow().timestamp()*1000)}"),
                        shift_date=datetime.strptime(str(payload.get('date', datetime.utcnow().strftime('%Y-%m-%d'))).split('T')[0], '%Y-%m-%d').date(),
                        operator_name=payload.get('operator') or payload.get('operatorName', 'Caixa'),
                        initial_cash=float(payload.get('initialCashAmount', 0)),
                        declared_cash=float(payload.get('physicalCashCounted') or payload.get('declaredCash', 0)),
                        difference=float(payload.get('difference', 0)),
                        status=payload.get('status', 'fechado')
                    )
                    new_cc.set_breakdown(payload.get('breakdowns', {}))
                    db.session.add(new_cc)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['fecho_mensal', 'monthly_closure']:
                mid = str(payload.get('id') or payload.get('code', ''))
                existing_mc = MonthlyClosureRecord.query.get(mid) if mid else None
                if is_delete:
                    if existing_mc:
                        db.session.delete(existing_mc)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_mc:
                    if payload.get('status'): existing_mc.status = payload['status']
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_mc = MonthlyClosureRecord(
                        id=mid or f"mclose_{int(datetime.utcnow().timestamp()*1000)}",
                        month_year=payload.get('month', datetime.utcnow().strftime('%Y-%m')),
                        revenue_total=float(payload.get('totalRevenue') or payload.get('revenueTotal') or payload.get('financials', {}).get('revenueCollected', 0)),
                        expenses_total=float(payload.get('totalExpenses') or payload.get('expensesTotal') or payload.get('financials', {}).get('totalCosts', 0)),
                        net_result=float(payload.get('netProfit') or payload.get('netResult') or payload.get('financials', {}).get('netResult', 0)),
                        notes=payload.get('notes') or payload.get('validationNotes')
                    )
                    bdowns = payload.get('breakdowns') or {
                        'revenue': payload.get('revenueBreakdown'),
                        'paymentMethods': payload.get('paymentMethodsBreakdown'),
                        'expenses': payload.get('expensesBreakdown'),
                        'clients': payload.get('clientMetrics'),
                        'technical': payload.get('technicalMetrics'),
                        'bank': payload.get('bankReconciliation')
                    }
                    new_mc.set_breakdowns(bdowns)
                    db.session.add(new_mc)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['atividade', 'activity', 'audit', 'activity_log', 'atividades', 'audit_log']:
                al = ActivityLog(
                    user_id=payload.get('user_id') or payload.get('userId'),
                    username=payload.get('username') or payload.get('userName', 'Sistema'),
                    action=payload.get('action', 'operacao'),
                    entity=payload.get('entity', 'geral'),
                    details=payload.get('details') or payload.get('description', '')
                )
                db.session.add(al)
                applied += 1
                if item_id: applied_ids.append(item_id)

            elif entity in ['chat', 'chat_message', 'client_chat', 'mensagem_cliente']:
                cm_id = payload.get('id') or f"cm_{int(datetime.utcnow().timestamp()*1000)}"
                existing_cm = ChatMessageRecord.query.get(cm_id)
                if is_delete:
                    if existing_cm:
                        db.session.delete(existing_cm)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif not existing_cm:
                    cm = ChatMessageRecord(
                        id=cm_id,
                        client_id=int(payload.get('clientId') or payload.get('client_id') or 0),
                        client_code=payload.get('clientCode') or payload.get('client_code', ''),
                        client_name=payload.get('clientName') or payload.get('client_name', 'Cliente'),
                        sender=payload.get('sender', 'client'),
                        sender_name=payload.get('senderName') or payload.get('sender_name', 'Cliente'),
                        message=payload.get('message', ''),
                        requires_human=bool(payload.get('requiresHuman') or payload.get('requires_human', False)),
                        handled_by_admin=payload.get('handledByAdminName') or payload.get('handled_by_admin')
                    )
                    db.session.add(cm)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['team_message', 'mensagem_equipa', 'mensagens']:
                tm_id = payload.get('id') or f"tm_{int(datetime.utcnow().timestamp()*1000)}"
                existing_tm = TeamMessageRecord.query.get(tm_id)
                if is_delete:
                    if existing_tm:
                        db.session.delete(existing_tm)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif not existing_tm:
                    tm = TeamMessageRecord(
                        id=tm_id,
                        channel_id=payload.get('channelId') or payload.get('channel_id', 'geral'),
                        sender_id=payload.get('senderId') or payload.get('sender_id'),
                        sender_name=payload.get('senderName') or payload.get('sender_name', 'Equipa'),
                        sender_role=payload.get('senderRole') or payload.get('sender_role', 'tecnico'),
                        message=payload.get('message', ''),
                        priority=payload.get('priority', 'normal')
                    )
                    db.session.add(tm)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['canal', 'tv_channel', 'decoder', 'descodificador', 'canais']:
                dec_id = payload.get('id')
                ch_num = payload.get('channelNumber') or payload.get('channel_number')
                existing_dec = None
                if dec_id:
                    existing_dec = TvDecoderChannel.query.get(dec_id)
                if not existing_dec and ch_num:
                    existing_dec = TvDecoderChannel.query.filter_by(channel_number=int(ch_num)).first()
                if is_delete:
                    if existing_dec:
                        db.session.delete(existing_dec)
                        applied += 1
                    if item_id: applied_ids.append(item_id)
                elif existing_dec:
                    if payload.get('channelName') or payload.get('channel_name'):
                        existing_dec.channel_name = payload.get('channelName') or payload.get('channel_name')
                    if payload.get('status'):
                        existing_dec.status = payload['status']
                    if payload.get('monthlyCost') or payload.get('monthly_cost'):
                        existing_dec.monthly_cost = float(payload.get('monthlyCost') or payload.get('monthly_cost'))
                    applied += 1
                    if item_id: applied_ids.append(item_id)
                else:
                    new_id = dec_id or f"dec_{ch_num or int(datetime.utcnow().timestamp())}"
                    dec = TvDecoderChannel(
                        id=new_id,
                        channel_number=int(ch_num or 1),
                        channel_name=payload.get('channelName') or payload.get('channel_name', 'Canal TV'),
                        provider=payload.get('provider', 'ZAP'),
                        status=payload.get('status', 'ativo'),
                        category=payload.get('category', 'generalista'),
                        monthly_cost=float(payload.get('monthlyCost') or payload.get('monthly_cost', 0))
                    )
                    db.session.add(dec)
                    applied += 1
                    if item_id: applied_ids.append(item_id)

            elif entity in ['configuracoes', 'definicoes', 'settings']:
                setting_rec = CompanySetting.query.filter_by(key='global_settings').first()
                if not setting_rec:
                    setting_rec = CompanySetting(key='global_settings', value_json='{}')
                    db.session.add(setting_rec)
                current_set = setting_rec.get_data()
                current_set.update(payload)
                setting_rec.set_data(current_set)
                applied += 1
                if item_id: applied_ids.append(item_id)

            elif entity in ['intervencao', 'support_intervention', 'intervencoes']:
                si_id = payload.get('id')
                if si_id:
                    si = SupportInterventionRecord.query.get(si_id)
                    if is_delete:
                        if si:
                            db.session.delete(si)
                            applied += 1
                        if item_id: applied_ids.append(item_id)
                    elif si:
                        if payload.get('status'): si.status = payload['status']
                        if payload.get('assignedAdminName'): si.assigned_admin_name = payload['assignedAdminName']
                        applied += 1
                        if item_id: applied_ids.append(item_id)
                    else:
                        new_si = SupportInterventionRecord(
                            id=si_id,
                            client_id=int(payload.get('clientId') or payload.get('client_id') or 0),
                            client_code=payload.get('clientCode') or payload.get('client_code', ''),
                            client_name=payload.get('clientName') or payload.get('client_name', 'Cliente'),
                            client_phone=payload.get('clientPhone') or payload.get('client_phone', ''),
                            service_type=payload.get('serviceType') or 'tv',
                            reason=payload.get('reason', 'Solicitação de suporte'),
                            status=payload.get('status', 'aguardando_atendente')
                        )
                        db.session.add(new_si)
                        applied += 1
                        if item_id: applied_ids.append(item_id)

            elif entity in ['conta_financeira', 'financial_account', 'contas', 'conta', 'accounts', 'account']:
                acc_id = payload.get('id')
                if acc_id:
                    existing_acc = FinancialAccount.query.get(acc_id)
                    if is_delete:
                        # Contas principais do sistema nunca são eliminadas
                        if existing_acc and existing_acc.id not in ['acc-caixa', 'acc-bai', 'acc-bfa', 'acc-tpa', 'acc-piquete']:
                            db.session.delete(existing_acc)
                            applied += 1
                        if item_id: applied_ids.append(item_id)
                    elif existing_acc:
                        if payload.get('name'): existing_acc.name = payload['name']
                        if payload.get('type'): existing_acc.type = payload['type']
                        if payload.get('bankName') or payload.get('bank_name'):
                            existing_acc.bank_name = payload.get('bankName') or payload.get('bank_name')
                        if payload.get('iban'): existing_acc.iban = payload['iban']
                        if payload.get('accountNumber') or payload.get('account_number'):
                            existing_acc.account_number = payload.get('accountNumber') or payload.get('account_number')
                        if 'initialBalance' in payload or 'initial_balance' in payload:
                            existing_acc.initial_balance = float(payload.get('initialBalance') or payload.get('initial_balance', 0))
                        if 'currentBalance' in payload or 'current_balance' in payload:
                            existing_acc.current_balance = float(payload.get('currentBalance') or payload.get('current_balance', 0))
                        applied += 1
                        if item_id: applied_ids.append(item_id)
                    else:
                        new_acc = FinancialAccount(
                            id=acc_id,
                            name=payload.get('name', 'Nova Conta'),
                            type=payload.get('type', 'caixa'),
                            bank_name=payload.get('bankName') or payload.get('bank_name'),
                            iban=payload.get('iban'),
                            account_number=payload.get('accountNumber') or payload.get('account_number'),
                            initial_balance=float(payload.get('initialBalance') or payload.get('initial_balance', 0)),
                            current_balance=float(payload.get('currentBalance') or payload.get('current_balance', 0)),
                            currency='AOA'
                        )
                        db.session.add(new_acc)
                        applied += 1
                        if item_id: applied_ids.append(item_id)

            elif entity in ['emprestimo', 'technician_loan', 'loans', 'loan']:
                loan_id = str(payload.get('id', ''))
                if loan_id:
                    existing_loan = TechnicianLoan.query.get(loan_id)
                    if is_delete:
                        if existing_loan:
                            db.session.delete(existing_loan)
                            applied += 1
                        if item_id: applied_ids.append(item_id)
                    elif existing_loan:
                        if payload.get('status'): existing_loan.status = payload['status']
                        if 'remainingDebt' in payload or 'remaining_debt' in payload:
                            existing_loan.remaining_debt = float(payload.get('remainingDebt') or payload.get('remaining_debt', 0))
                        if payload.get('notes'): existing_loan.notes = payload['notes']
                        applied += 1
                        if item_id: applied_ids.append(item_id)
                    else:
                        new_loan = TechnicianLoan(
                            id=loan_id,
                            technician_id=int(payload.get('technicianId') or payload.get('technician_id') or 1),
                            technician_name=payload.get('technicianName') or payload.get('technician_name', 'Técnico'),
                            department=payload.get('department', 'Técnico'),
                            amount=float(payload.get('amount', 0)),
                            purpose=payload.get('purpose', 'Adiantamento'),
                            installments=int(payload.get('installments', 1)),
                            status=payload.get('status', 'aprovado'),
                            monthly_deduction=float(payload.get('monthlyDeduction') or payload.get('monthly_deduction', 0)),
                            remaining_debt=float(payload.get('remainingDebt') or payload.get('remaining_debt', payload.get('amount', 0))),
                            receipt_method=payload.get('receiptMethod') or payload.get('receipt_method', 'numerario'),
                            notes=payload.get('notes')
                        )
                        db.session.add(new_loan)
                        applied += 1
                        if item_id: applied_ids.append(item_id)

            elif entity in ['orcamento', 'category_budget', 'budgets', 'budget', 'orcamentos']:
                setting_rec = CompanySetting.query.filter_by(key='global_settings').first()
                if not setting_rec:
                    setting_rec = CompanySetting(key='global_settings', value_json='{}')
                    db.session.add(setting_rec)
                current_set = setting_rec.get_data()
                cur_budgets = current_set.get('categoryBudgets', [])
                cat_id = payload.get('id') or payload.get('category')
                updated_list = []
                found = False
                for b in cur_budgets:
                    if b.get('id') == cat_id or b.get('category') == payload.get('category'):
                        updated_list.append({**b, **payload})
                        found = True
                    else:
                        updated_list.append(b)
                if not found:
                    updated_list.append(payload)
                current_set['categoryBudgets'] = updated_list
                setting_rec.set_data(current_set)
                applied += 1
                if item_id: applied_ids.append(item_id)
        except Exception as e:
            errors.append(str(e))

    db.session.commit()
    if applied > 0:
        bump_system_version()

    return jsonify({
        'success': True,
        'applied': applied,
        'applied_count': applied,
        'applied_ids': applied_ids,
        'errors_count': len(errors),
        'errors': errors[:5],
        'version': get_system_version()
    }), 200
