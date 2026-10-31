from datetime import datetime, date
import json
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    pin = db.Column(db.String(10), default='1234')  # PIN de 4 dígitos unificado (APK, Web, Desktop)
    phone = db.Column(db.String(30), nullable=True)
    whatsapp = db.Column(db.String(30), nullable=True)
    full_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), default='operador')  # 'superadmin', 'boss', 'admin', 'operador', 'tecnico'
    job_title = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(50), nullable=True)
    salary_base = db.Column(db.Float, default=150000.0)
    food_allowance = db.Column(db.Float, default=30000.0)
    transport_allowance = db.Column(db.Float, default=25000.0)
    bank_iban = db.Column(db.String(60), nullable=True)
    work_status = db.Column(db.String(30), default='disponivel')
    photo_url = db.Column(db.String(255), nullable=True)
    bi_number = db.Column(db.String(50), nullable=True)
    address = db.Column(db.String(200), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
        
    def check_pin(self, pin):
        return str(self.pin).strip() == str(pin).strip()
        
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'full_name': self.full_name,
            'name': self.full_name,
            'role': self.role,
            'pin': self.pin,
            'phone': self.phone,
            'whatsapp': self.whatsapp or self.phone,
            'job_title': self.job_title,
            'jobTitle': self.job_title,
            'department': self.department,
            'salary_base': self.salary_base or 0.0,
            'salaryBase': self.salary_base or 0.0,
            'food_allowance': self.food_allowance or 0.0,
            'foodAllowance': self.food_allowance or 0.0,
            'transport_allowance': self.transport_allowance or 0.0,
            'transportAllowance': self.transport_allowance or 0.0,
            'bank_iban': self.bank_iban,
            'bankIban': self.bank_iban,
            'work_status': self.work_status or 'disponivel',
            'workStatus': self.work_status or 'disponivel',
            'photo_url': self.photo_url,
            'photoUrl': self.photo_url,
            'bi_number': self.bi_number,
            'biNumber': self.bi_number,
            'address': self.address,
            'is_active': self.is_active,
            'active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Client(db.Model):
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(150), nullable=False, index=True)
    phone = db.Column(db.String(30), nullable=False)
    alternate_phone = db.Column(db.String(30), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    pin = db.Column(db.String(10), default='1234')  # PIN de 4 dígitos para APK Cliente
    password = db.Column(db.String(100), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    neighborhood = db.Column(db.String(100), nullable=True)
    city = db.Column(db.String(100), default='Luanda')
    document_number = db.Column(db.String(50), nullable=True)
    service_type = db.Column(db.String(30), default='combo')  # 'tv', 'fibra', 'combo'
    status = db.Column(db.String(30), default='active')  # 'active', 'late', 'suspended', 'inactive'
    house_code = db.Column(db.String(50), nullable=True)
    pdo_number = db.Column(db.String(50), nullable=True)
    onu_number = db.Column(db.String(50), nullable=True)
    optical_rx_dbm = db.Column(db.Float, default=-19.5)
    monthly_fee = db.Column(db.Float, default=4000.0)
    due_day = db.Column(db.Integer, default=5)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    budgets = db.relationship('Budget', backref='client', lazy=True, cascade="all, delete-orphan")
    invoices = db.relationship('Invoice', backref='client', lazy=True, cascade="all, delete-orphan")
    
    def check_pin(self, pin):
        return str(self.pin or '1234').strip() == str(pin).strip()

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'full_name': self.full_name,
            'name': self.full_name,
            'phone': self.phone,
            'alternate_phone': self.alternate_phone,
            'email': self.email,
            'pin': self.pin or '1234',
            'address': self.address,
            'neighborhood': self.neighborhood,
            'city': self.city,
            'document_number': self.document_number,
            'service_type': self.service_type,
            'status': self.status,
            'house_code': self.house_code,
            'pdo_number': self.pdo_number,
            'onu_number': self.onu_number,
            'optical_rx_dbm': self.optical_rx_dbm,
            'monthly_fee': self.monthly_fee,
            'due_day': self.due_day or 5,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Budget(db.Model):
    """Orçamentos para instalação de TV a Cabo ou Internet Fibra"""
    __tablename__ = 'budgets'
    
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True)
    client_name = db.Column(db.String(150), nullable=False)
    service_type = db.Column(db.String(30), default='fibra')
    description = db.Column(db.Text, nullable=False)
    total_amount = db.Column(db.Float, default=0.0)
    discount = db.Column(db.Float, default=0.0)
    final_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(30), default='pendente')  # 'pendente', 'aprovado', 'rejeitado', 'convertido'
    validity_days = db.Column(db.Integer, default=15)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'number': self.number,
            'client_id': self.client_id,
            'client_name': self.client_name,
            'service_type': self.service_type,
            'description': self.description,
            'total_amount': self.total_amount,
            'discount': self.discount,
            'final_amount': self.final_amount,
            'status': self.status,
            'validity_days': self.validity_days,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Contract(db.Model):
    """Contratos Oficiais de Prestação de Serviço (TV por Cabo e Internet Fibra)"""
    __tablename__ = 'contracts'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True)
    client_name = db.Column(db.String(150), nullable=False)
    plan_name = db.Column(db.String(100), nullable=True)
    plan_speed = db.Column(db.String(50), nullable=True)
    monthly_price = db.Column(db.Float, default=4000.0)
    contract_fee = db.Column(db.Float, default=15000.0)
    urgent_fee = db.Column(db.Float, default=0.0)
    urgent_fee_discount = db.Column(db.Float, default=0.0)
    tv_points = db.Column(db.Integer, default=1)
    extra_tvs = db.Column(db.Integer, default=0)
    due_day = db.Column(db.Integer, default=5)
    start_date = db.Column(db.Date, default=date.today)
    end_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(30), default='active')  # 'active', 'suspended', 'cancelled'
    service_type = db.Column(db.String(30), default='tv')  # 'tv', 'internet', 'combo'
    remaining_days_choice = db.Column(db.String(30), default='assistir_restantes')
    remaining_days_count = db.Column(db.Integer, default=0)
    remaining_days_amount = db.Column(db.Float, default=0.0)
    account_id = db.Column(db.String(50), default='acc-caixa')
    payment_method = db.Column(db.String(100), default='Dinheiro (Em Mão)')
    terms = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'contractNumber': self.code,
            'clientId': self.client_id,
            'client_id': self.client_id,
            'clientName': self.client_name,
            'client_name': self.client_name,
            'planName': self.plan_name,
            'plan_name': self.plan_name,
            'planSpeed': self.plan_speed,
            'plan_speed': self.plan_speed,
            'monthlyPrice': self.monthly_price,
            'monthly_price': self.monthly_price,
            'monthlyFee': self.monthly_price,
            'monthly_fee': self.monthly_price,
            'contractFee': self.contract_fee,
            'contract_fee': self.contract_fee,
            'urgentFee': self.urgent_fee,
            'urgent_fee': self.urgent_fee,
            'urgentFeeDiscount': self.urgent_fee_discount,
            'urgent_fee_discount': self.urgent_fee_discount,
            'tvPoints': self.tv_points,
            'tv_points': self.tv_points,
            'extraTvs': self.extra_tvs,
            'extra_tvs': self.extra_tvs,
            'dueDay': self.due_day,
            'due_day': self.due_day,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'serviceType': self.service_type,
            'service_type': self.service_type,
            'remainingDaysChoice': self.remaining_days_choice or 'assistir_restantes',
            'remaining_days_choice': self.remaining_days_choice or 'assistir_restantes',
            'remainingDaysCount': self.remaining_days_count or 0,
            'remaining_days_count': self.remaining_days_count or 0,
            'remainingDaysAmount': self.remaining_days_amount or 0.0,
            'remaining_days_amount': self.remaining_days_amount or 0.0,
            'prorataDays': self.remaining_days_count or 0,
            'prorata_days': self.remaining_days_count or 0,
            'prorataAmount': self.remaining_days_amount or 0.0,
            'prorata_amount': self.remaining_days_amount or 0.0,
            'accountId': self.account_id or 'acc-caixa',
            'account_id': self.account_id or 'acc-caixa',
            'paymentMethod': self.payment_method or 'Dinheiro (Em Mão)',
            'payment_method': self.payment_method or 'Dinheiro (Em Mão)',
            'terms': self.terms,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Invoice(db.Model):
    """Faturas e Mensalidades de Serviço"""
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=False)
    client_name = db.Column(db.String(150), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    penalty = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default='pendente')  # 'paga', 'pendente', 'vencida', 'cancelada'
    issue_date = db.Column(db.Date, default=datetime.utcnow)
    due_date = db.Column(db.Date, nullable=False)
    payment_date = db.Column(db.Date, nullable=True)
    payment_method = db.Column(db.String(50), nullable=True)  # 'multicaixa', 'transferencia', 'dinheiro'
    reference_code = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'number': self.number,
            'invoice_number': self.number,
            'client_id': self.client_id,
            'client_name': self.client_name,
            'amount': self.amount,
            'penalty': self.penalty,
            'total': self.total,
            'status': self.status,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_method': self.payment_method,
            'reference_code': self.reference_code,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ServiceOrder(db.Model):
    """Ordens de Serviço de Campo (Instalação, Manutenção, Corte, Religação)"""
    __tablename__ = 'service_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    type = db.Column(db.String(30), nullable=False)  # 'instalacao', 'reparacao', 'corte', 'religacao'
    client_id = db.Column(db.Integer, nullable=True)
    client_name = db.Column(db.String(150), nullable=False)
    client_code = db.Column(db.String(30), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.String(255), nullable=True)
    pdo_box = db.Column(db.String(50), nullable=True)
    priority = db.Column(db.String(20), default='normal')  # 'alta', 'normal', 'baixa'
    status = db.Column(db.String(30), default='pendente')  # 'pendente', 'em_andamento', 'concluido', 'cancelado'
    service_type = db.Column(db.String(30), default='combo')
    optical_dbm = db.Column(db.Float, nullable=True)
    assigned_technician = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    scheduled_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'code': self.code,
            'type': self.type,
            'client_id': self.client_id,
            'client_name': self.client_name,
            'client_code': self.client_code,
            'phone': self.phone,
            'address': self.address,
            'pdo_box': self.pdo_box,
            'priority': self.priority,
            'status': self.status,
            'service_type': self.service_type,
            'optical_dbm': self.optical_dbm,
            'assigned_technician': self.assigned_technician,
            'notes': self.notes,
            'date': self.scheduled_date.isoformat() if self.scheduled_date else (self.created_at.strftime('%Y-%m-%d') if self.created_at else None),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PaymentAgreement(db.Model):
    """Acordos e Promessas de Pagamento (APK Cliente e Balcão)"""
    __tablename__ = 'payment_agreements'
    
    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, nullable=True)
    client_code = db.Column(db.String(30), nullable=False)
    client_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    service_type = db.Column(db.String(30), default='tv')
    requested_date = db.Column(db.Date, default=date.today)
    promised_date = db.Column(db.Date, nullable=False)
    promised_amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pendente')  # 'pendente', 'aprovado', 'rejeitado'
    operator_notes = db.Column(db.Text, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'client_id': self.client_id,
            'client_code': self.client_code,
            'client_name': self.client_name,
            'phone': self.phone,
            'service_type': self.service_type,
            'requested_date': self.requested_date.isoformat() if self.requested_date else None,
            'promised_date': self.promised_date.isoformat() if self.promised_date else None,
            'promised_amount': self.promised_amount,
            'reason': self.reason,
            'status': self.status,
            'operator_notes': self.operator_notes,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'reviewed_by': self.reviewed_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SupportTicket(db.Model):
    """Chamados de Suporte Técnico & Avarias"""
    __tablename__ = 'support_tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    client_id = db.Column(db.Integer, nullable=True)
    client_code = db.Column(db.String(30), nullable=True)
    client_name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), default='sinal_fraco')
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default='aberto')  # 'aberto', 'tecnico_a_caminho', 'resolvido'
    assigned_technician = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'code': self.code,
            'client_id': self.client_id,
            'client_code': self.client_code,
            'client_name': self.client_name,
            'category': self.category,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'assigned_technician': self.assigned_technician,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Expense(db.Model):
    """Despesas Operacionais, Caixa e Viaturas"""
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # 'combustivel', 'material', 'alimentacao', etc.
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, default=date.today)
    account = db.Column(db.String(100), default='Caixa Geral')
    account_id = db.Column(db.String(50), default='acc-caixa')
    payment_method = db.Column(db.String(50), default='Dinheiro')
    document_ref = db.Column(db.String(100), nullable=True)
    beneficiary = db.Column(db.String(150), nullable=True)
    status = db.Column(db.String(20), default='pago')
    reconciled = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'description': self.description,
            'reason': self.description,
            'category': self.category,
            'amount': self.amount,
            'date': self.date.isoformat() if self.date else None,
            'account': self.account,
            'account_id': self.account_id,
            'accountId': self.account_id,
            'payment_method': self.payment_method,
            'paymentMethod': self.payment_method,
            'document_ref': self.document_ref,
            'documentNumber': self.document_ref,
            'beneficiary': self.beneficiary,
            'supplier': self.beneficiary,
            'status': self.status,
            'reconciled': self.reconciled,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class FinancialAccount(db.Model):
    """Contas Bancárias e Caixas (BAI, BFA, Multicaixa TPA, Caixa)"""
    __tablename__ = 'financial_accounts'
    
    id = db.Column(db.String(50), primary_key=True)  # 'acc-caixa', 'acc-bai', 'acc-bfa', 'acc-tpa'
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(30), default='banco')  # 'caixa', 'banco', 'tpa'
    bank_name = db.Column(db.String(100), nullable=True)
    account_number = db.Column(db.String(50), nullable=True)
    iban = db.Column(db.String(60), nullable=True)
    initial_balance = db.Column(db.Float, default=0.0)
    current_balance = db.Column(db.Float, default=0.0)
    currency = db.Column(db.String(10), default='AOA')
    is_active = db.Column(db.Boolean, default=True)
    
    def deposit(self, amount):
        self.current_balance = round(float(self.current_balance or 0.0) + float(amount or 0.0), 2)
        return self.current_balance
        
    def withdraw(self, amount):
        self.current_balance = round(float(self.current_balance or 0.0) - float(amount or 0.0), 2)
        return self.current_balance

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'bank_name': self.bank_name,
            'bankName': self.bank_name,
            'account_number': self.account_number,
            'accountNumber': self.account_number,
            'iban': self.iban,
            'initial_balance': self.initial_balance,
            'initialBalance': self.initial_balance,
            'current_balance': self.current_balance,
            'currentBalance': self.current_balance,
            'currency': self.currency,
            'is_active': self.is_active
        }


class Announcement(db.Model):
    """Comunicados e Notícias para Clientes e Equipa"""
    __tablename__ = 'announcements'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(30), default='comunicado')  # 'manutencao', 'comunicado', 'novidade', 'urgente'
    content = db.Column(db.Text, nullable=False)
    date = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'title': self.title,
            'category': self.category,
            'content': self.content,
            'date': self.date or (self.created_at.strftime('%d de %B de %Y') if self.created_at else ''),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ActivityLog(db.Model):
    """Log de atividades e auditoria"""
    __tablename__ = 'activity_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    username = db.Column(db.String(50), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    entity = db.Column(db.String(50), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'action': self.action,
            'entity': self.entity,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TvDecoderChannel(db.Model):
    """
    Gestão de Descodificadores e Canais de TV do Headend OSDEL
    Controla cada descodificador (ZAP, Canal+, DStv, Banda Livre, Extravio),
    número de cartão, posição interna vs posição do fornecedor, subscrição mensal e extravios.
    """
    __tablename__ = 'tv_decoder_channels'
    
    id = db.Column(db.String(50), primary_key=True)  # ex: 'dec-zap-01', 'dec-extravio-01'
    channel_number = db.Column(db.Integer, nullable=False, default=1, index=True)  # Posição na nossa grelha (ex: 56)
    provider_position = db.Column(db.Integer, nullable=False, default=1)  # Posição na ZAP / Canal+ (ex: 22)
    channel_name = db.Column(db.String(100), nullable=False, index=True)
    category = db.Column(db.String(50), default='generalista')
    provider = db.Column(db.String(50), nullable=False, default='ZAP', index=True)  # ZAP, Canal+, DStv, Banda Livre, Extravio
    is_free = db.Column(db.Boolean, default=False)
    decoder_model = db.Column(db.String(100), default='ZAP HD PVR')
    decoder_serial = db.Column(db.String(100), nullable=True)
    card_number = db.Column(db.String(60), nullable=True, index=True)  # Número do Cartão / SmartCard
    subscription_package = db.Column(db.String(100), default='ZAP Max')
    monthly_cost = db.Column(db.Float, default=16500.0)
    balance = db.Column(db.Float, default=0.0)
    subscription_start_date = db.Column(db.Date, nullable=True)
    subscription_end_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(30), default='ativo')  # 'ativo', 'alerta', 'expirado', 'manutencao', 'extraviado'
    signal_status = db.Column(db.String(30), default='otimo')  # 'otimo', 'bom', 'fraco', 'sem_sinal'
    signal_quality = db.Column(db.Integer, default=95)
    frequency_mhz = db.Column(db.Float, default=474.00)
    rf_channel = db.Column(db.String(20), default='E21')
    rack_unit = db.Column(db.String(50), default='Rack 1 - U01')
    hdmi_encoder_port = db.Column(db.Integer, default=1)
    last_renewed_by = db.Column(db.String(100), nullable=True)
    last_edited_by = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Histórico de pagamentos
    payment_records = db.relationship('TvChannelPaymentHistory', backref='decoder', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        days_remaining = None
        if self.subscription_end_date and not self.is_free:
            delta = self.subscription_end_date - date.today()
            days_remaining = delta.days

        return {
            'id': self.id,
            'channelNumber': self.channel_number,
            'providerPosition': self.provider_position,
            'channelName': self.channel_name,
            'category': self.category,
            'provider': self.provider,
            'isFree': self.is_free,
            'decoderModel': self.decoder_model,
            'decoderSerial': self.decoder_serial,
            'cardNumber': self.card_number,
            'subscriptionPackage': self.subscription_package,
            'monthlyCost': self.monthly_cost,
            'balance': self.balance,
            'subscriptionStartDate': self.subscription_start_date.isoformat() if self.subscription_start_date else None,
            'subscriptionEndDate': self.subscription_end_date.isoformat() if self.subscription_end_date else None,
            'status': self.status,
            'signalStatus': self.signal_status,
            'signalQuality': self.signal_quality,
            'frequencyMhz': self.frequency_mhz,
            'rfChannel': self.rf_channel,
            'rackUnit': self.rack_unit,
            'hdmiEncoderPort': self.hdmi_encoder_port,
            'lastRenewedBy': self.last_renewed_by,
            'lastEditedBy': self.last_edited_by,
            'notes': self.notes,
            'daysRemaining': days_remaining,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class TvChannelPaymentHistory(db.Model):
    """Histórico de pagamentos e renovações de subscrições de TV"""
    __tablename__ = 'tv_channel_payment_history'
    
    id = db.Column(db.Integer, primary_key=True)
    decoder_id = db.Column(db.String(50), db.ForeignKey('tv_decoder_channels.id'), nullable=False)
    channel_name = db.Column(db.String(100), nullable=False)
    provider = db.Column(db.String(50), nullable=False)
    card_number = db.Column(db.String(60), nullable=True)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    paid_by = db.Column(db.String(100), nullable=False)
    payment_method = db.Column(db.String(50), default='multicaixa')
    period_start = db.Column(db.Date, nullable=True)
    period_end = db.Column(db.Date, nullable=True)
    receipt_reference = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'decoderId': self.decoder_id,
            'channelName': self.channel_name,
            'provider': self.provider,
            'cardNumber': self.card_number,
            'amount': self.amount,
            'paidBy': self.paid_by,
            'paymentMethod': self.payment_method,
            'periodStart': self.period_start.isoformat() if self.period_start else None,
            'periodEnd': self.period_end.isoformat() if self.period_end else None,
            'receiptReference': self.receipt_reference,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class TvChannelAudit(db.Model):
    """Registo de auditoria para trocas de canal, posições e extravios"""
    __tablename__ = 'tv_channel_audits'
    
    id = db.Column(db.Integer, primary_key=True)
    decoder_id = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # 'create', 'edit', 'replace', 'swap_position', 'renew', 'extravio', 'delete'
    user_name = db.Column(db.String(100), nullable=False)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'decoderId': self.decoder_id,
            'action': self.action,
            'userName': self.user_name,
            'details': self.details,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class Payment(db.Model):
    """Registo Central de Pagamentos e Quitações"""
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, nullable=True)
    client_name = db.Column(db.String(150), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    penalty = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, nullable=False, default=0.0)
    payment_month = db.Column(db.String(20), nullable=True)
    paid_at = db.Column(db.DateTime, default=datetime.utcnow)
    method = db.Column(db.String(50), default='Multicaixa Express')
    reference = db.Column(db.String(100), nullable=True)
    operator = db.Column(db.String(100), default='operador')
    invoice_id = db.Column(db.Integer, nullable=True)
    account_id = db.Column(db.String(50), default='acc-caixa')
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'client_id': self.client_id,
            'clientName': self.client_name,
            'client_name': self.client_name,
            'amount': self.amount,
            'penalty': self.penalty,
            'total': self.total or (self.amount + (self.penalty or 0)),
            'paymentMonth': self.payment_month,
            'payment_month': self.payment_month,
            'paidAt': self.paid_at.isoformat() if self.paid_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'method': self.method,
            'reference': self.reference,
            'operator': self.operator,
            'invoiceId': self.invoice_id,
            'invoice_id': self.invoice_id,
            'accountId': self.account_id,
            'account_id': self.account_id,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class CompanySetting(db.Model):
    """Definições Globais do Sistema OSDEL"""
    __tablename__ = 'company_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value_json = db.Column(db.Text, nullable=False, default='{}')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = db.Column(db.String(100), nullable=True)

    def get_data(self):
        try:
            return json.loads(self.value_json)
        except Exception:
            return {}

    def set_data(self, data):
        self.value_json = json.dumps(data, ensure_ascii=False)


class TechnicianLoan(db.Model):
    """Adiantamentos e Empréstimos Salariais a Colaboradores"""
    __tablename__ = 'technician_loans'

    id = db.Column(db.String(50), primary_key=True)
    technician_id = db.Column(db.Integer, nullable=False)
    technician_name = db.Column(db.String(150), nullable=False)
    department = db.Column(db.String(50), default='Técnico')
    amount = db.Column(db.Float, nullable=False, default=0.0)
    purpose = db.Column(db.String(255), nullable=False)
    installments = db.Column(db.Integer, default=1)
    status = db.Column(db.String(30), default='pendente')  # 'pendente', 'aprovado', 'rejeitado', 'liquidado'
    monthly_deduction = db.Column(db.Float, default=0.0)
    remaining_debt = db.Column(db.Float, default=0.0)
    receipt_method = db.Column(db.String(50), default='numerario')
    target_bank = db.Column(db.String(100), nullable=True)
    target_iban = db.Column(db.String(60), nullable=True)
    express_phone = db.Column(db.String(30), nullable=True)
    admin_name = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    repayments = db.relationship('LoanRepayment', backref='loan', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'technicianId': self.technician_id,
            'technicianName': self.technician_name,
            'department': self.department,
            'amount': self.amount,
            'purpose': self.purpose,
            'installments': self.installments,
            'status': self.status,
            'monthlyDeduction': self.monthly_deduction,
            'remainingDebt': self.remaining_debt,
            'receiptMethod': self.receipt_method,
            'targetBank': self.target_bank,
            'targetIban': self.target_iban,
            'expressPhone': self.express_phone,
            'adminName': self.admin_name,
            'notes': self.notes,
            'rejectionReason': self.rejection_reason,
            'requestedAt': self.requested_at.isoformat() if self.requested_at else None,
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'repaymentHistory': [r.to_dict() for r in self.repayments],
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class LoanRepayment(db.Model):
    """Amortizações e Pagamentos de Empréstimos Salariais"""
    __tablename__ = 'loan_repayments'

    id = db.Column(db.String(50), primary_key=True)
    loan_id = db.Column(db.String(50), db.ForeignKey('technician_loans.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    payment_method = db.Column(db.String(50), default='folha_salarial')
    receipt_reference = db.Column(db.String(100), nullable=True)
    registered_by = db.Column(db.String(100), default='Administrador')
    notes = db.Column(db.Text, nullable=True)
    remaining_debt_after = db.Column(db.Float, default=0.0)
    paid_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'loanId': self.loan_id,
            'amount': self.amount,
            'paymentMethod': self.payment_method,
            'receiptReference': self.receipt_reference,
            'registeredBy': self.registered_by,
            'notes': self.notes,
            'remainingDebtAfter': self.remaining_debt_after,
            'date': self.paid_at.isoformat() if self.paid_at else None,
            'paidAt': self.paid_at.isoformat() if self.paid_at else None
        }


class AccountTransfer(db.Model):
    """Transferências Financeiras entre Caixas e Bancos (ex: Caixa Geral -> BAI)"""
    __tablename__ = 'account_transfers'

    id = db.Column(db.String(50), primary_key=True)
    from_account_id = db.Column(db.String(50), nullable=False)
    to_account_id = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)
    date = db.Column(db.Date, default=date.today)
    description = db.Column(db.String(255), nullable=True)
    reference = db.Column(db.String(100), nullable=True)
    operator = db.Column(db.String(100), default='Operador')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'fromAccountId': self.from_account_id,
            'from_account_id': self.from_account_id,
            'toAccountId': self.to_account_id,
            'to_account_id': self.to_account_id,
            'amount': self.amount,
            'date': self.date.isoformat() if self.date else None,
            'description': self.description,
            'reference': self.reference,
            'operator': self.operator,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class CategoryBudget(db.Model):
    """Limites e Orçamentos Mensais por Categoria de Despesa"""
    __tablename__ = 'category_budgets'

    id = db.Column(db.String(50), primary_key=True)
    category = db.Column(db.String(50), unique=True, nullable=False)
    limit_amount = db.Column(db.Float, nullable=False, default=0.0)
    month = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'limitAmount': self.limit_amount,
            'limit_amount': self.limit_amount,
            'month': self.month,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class InventoryItem(db.Model):
    """Stock e Almoxarifado de Telecomunicações (Cabos, ONUs, Conectores, Caixas PDO)"""
    __tablename__ = 'inventory_items'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    category = db.Column(db.String(50), default='equipamento')  # 'equipamento', 'cabo', 'conector', 'ferramenta'
    unit = db.Column(db.String(30), default='unidade')  # 'unidade', 'metro', 'rolo', 'caixa'
    quantity = db.Column(db.Float, default=0.0)
    min_quantity = db.Column(db.Float, default=5.0)
    unit_cost = db.Column(db.Float, default=0.0)
    location = db.Column(db.String(100), default='Armazém Central')
    description = db.Column(db.Text, nullable=True)
    service_mode = db.Column(db.String(30), default='ambos')  # 'fibra', 'tv', 'ambos'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'category': self.category,
            'unit': self.unit,
            'quantity': self.quantity,
            'minQuantity': self.min_quantity,
            'min_quantity': self.min_quantity,
            'unitCost': self.unit_cost,
            'unit_cost': self.unit_cost,
            'location': self.location,
            'description': self.description,
            'serviceMode': self.service_mode,
            'service_mode': self.service_mode,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class EquipmentAssignment(db.Model):
    """Equipamentos Atribuídos a Clientes ou Técnicos (Modens ONU, Descodificadores)"""
    __tablename__ = 'equipment_assignments'

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True)
    inventory_item_id = db.Column(db.Integer, nullable=True)
    equipment_type = db.Column(db.String(50), default='ONU GPON')
    model = db.Column(db.String(100), nullable=True)
    serial_number = db.Column(db.String(100), nullable=False, index=True)
    mac_address = db.Column(db.String(50), nullable=True)
    pdo_number = db.Column(db.String(50), nullable=True)
    pdo_port = db.Column(db.String(50), nullable=True)
    technician = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(30), default='instalado')  # 'instalado', 'recolhido', 'avaria', 'perdido'
    notes = db.Column(db.Text, nullable=True)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'client_id': self.client_id,
            'inventoryItemId': self.inventory_item_id,
            'equipmentType': self.equipment_type,
            'model': self.model,
            'serialNumber': self.serial_number,
            'macAddress': self.mac_address,
            'pdoNumber': self.pdo_number,
            'pdoPort': self.pdo_port,
            'technician': self.technician,
            'status': self.status,
            'notes': self.notes,
            'assignedAt': self.assigned_at.isoformat() if self.assigned_at else None
        }


class CashClosure(db.Model):
    """Fecho de Caixa Diário por Operador com Auditoria de Numerário e TPA"""
    __tablename__ = 'cash_closures'

    id = db.Column(db.String(50), primary_key=True)
    operator_id = db.Column(db.Integer, nullable=True)
    operator_name = db.Column(db.String(100), nullable=False)
    shift_date = db.Column(db.Date, default=date.today)
    opened_at = db.Column(db.DateTime, default=datetime.utcnow)
    closed_at = db.Column(db.DateTime, default=datetime.utcnow)
    initial_cash = db.Column(db.Float, default=0.0)
    cash_sales = db.Column(db.Float, default=0.0)
    multicaixa_sales = db.Column(db.Float, default=0.0)
    transfer_sales = db.Column(db.Float, default=0.0)
    cash_expenses = db.Column(db.Float, default=0.0)
    declared_cash = db.Column(db.Float, default=0.0)
    difference = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(30), default='fechado')  # 'aberto', 'fechado', 'verificado'
    notes = db.Column(db.Text, nullable=True)
    verified_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_breakdown(self, breakdown):
        if isinstance(breakdown, dict):
            try:
                self.notes = (self.notes or '') + '\nBreakdown: ' + json.dumps(breakdown)
            except Exception:
                pass

    def to_dict(self):
        return {
            'id': self.id,
            'operatorId': self.operator_id,
            'operatorName': self.operator_name,
            'shiftDate': self.shift_date.isoformat() if self.shift_date else None,
            'openedAt': self.opened_at.isoformat() if self.opened_at else None,
            'closedAt': self.closed_at.isoformat() if self.closed_at else None,
            'initialCash': self.initial_cash,
            'cashSales': self.cash_sales,
            'multicaixaSales': self.multicaixa_sales,
            'transferSales': self.transfer_sales,
            'cashExpenses': self.cash_expenses,
            'declaredCash': self.declared_cash,
            'difference': self.difference,
            'status': self.status,
            'notes': self.notes,
            'verifiedBy': self.verified_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class MonthlyClosureRecord(db.Model):
    """Fecho Mensal Contabilístico Oficial"""
    __tablename__ = 'monthly_closures'

    id = db.Column(db.String(50), primary_key=True)
    code = db.Column(db.String(50), nullable=True)
    month_year = db.Column(db.String(20), nullable=False, index=True)  # ex: '2026-09'
    revenue_total = db.Column(db.Float, default=0.0)
    expenses_total = db.Column(db.Float, default=0.0)
    net_result = db.Column(db.Float, default=0.0)
    total_active_clients = db.Column(db.Integer, default=0)
    default_rate = db.Column(db.Float, default=0.0)
    closed_by = db.Column(db.String(100), default='Direcção Financeira')
    closed_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text, nullable=True)

    def set_breakdowns(self, breakdowns):
        if isinstance(breakdowns, dict):
            try:
                self.notes = (self.notes or '') + '\nBreakdowns: ' + json.dumps(breakdowns)
            except Exception:
                pass

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code or self.id,
            'monthYear': self.month_year,
            'revenueTotal': self.revenue_total,
            'expensesTotal': self.expenses_total,
            'netResult': self.net_result,
            'totalActiveClients': self.total_active_clients,
            'defaultRate': self.default_rate,
            'closedBy': self.closed_by,
            'closedAt': self.closed_at.isoformat() if self.closed_at else None,
            'notes': self.notes
        }


class ScheduleEventRecord(db.Model):
    """Agenda e Escala de Piquetes de Campo e Operações Técnicas"""
    __tablename__ = 'schedule_events'

    id = db.Column(db.String(50), primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), default='piquete_corte')  # 'piquete_corte', 'alinhamento_optico', 'manutencao_headend', 'atendimento'
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.String(10), default='08:30')
    end_time = db.Column(db.String(10), default='12:00')
    priority = db.Column(db.String(20), default='alta')
    status = db.Column(db.String(30), default='pendente')  # 'pendente', 'em_curso', 'concluida', 'cancelada'
    leader_id = db.Column(db.Integer, nullable=True)
    leader_name = db.Column(db.String(100), default='Mestre Job')
    technicians_json = db.Column(db.Text, default='[]')
    street = db.Column(db.String(150), nullable=True)
    pdo_number = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=True)
    checklist_json = db.Column(db.Text, default='[]')
    is_predefined_routine = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_technicians(self, ids, names):
        self.technicians_json = json.dumps(names or ids or [])

    def set_checklist(self, items):
        self.checklist_json = json.dumps(items or [])

    def to_dict(self):
        try:
            techs = json.loads(self.technicians_json or '[]')
        except:
            techs = []
        try:
            checklist = json.loads(self.checklist_json or '[]')
        except:
            checklist = []

        return {
            'id': self.id,
            'title': self.title,
            'type': self.type,
            'date': self.date.isoformat() if self.date else None,
            'startTime': self.start_time,
            'endTime': self.end_time,
            'priority': self.priority,
            'status': self.status,
            'leaderId': self.leader_id,
            'leaderName': self.leader_name,
            'assignedTechnicianNames': techs,
            'street': self.street,
            'pdoNumber': self.pdo_number,
            'description': self.description,
            'checklist': checklist,
            'isPredefinedRoutine': self.is_predefined_routine,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class TeamMissionRecord(db.Model):
    """Missões Coletivas de Piquete e Cortes em Massa por Rua"""
    __tablename__ = 'team_missions'

    id = db.Column(db.String(50), primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), default='corte')  # 'corte', 'reparacao', 'fiscalizacao'
    leader_id = db.Column(db.Integer, nullable=True)
    leader_name = db.Column(db.String(100), default='Mestre Job')
    technicians_json = db.Column(db.Text, default='[]')
    streets_json = db.Column(db.Text, default='[]')
    scheduled_date = db.Column(db.Date, default=date.today)
    status = db.Column(db.String(30), default='ativa')  # 'ativa', 'concluida', 'arquivada'
    tasks_json = db.Column(db.Text, default='[]')
    notes = db.Column(db.Text, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_technicians(self, ids, names):
        self.technicians_json = json.dumps(names or ids or [])

    def set_streets(self, streets):
        self.streets_json = json.dumps(streets or [])

    def set_tasks(self, tasks):
        self.tasks_json = json.dumps(tasks or [])

    def to_dict(self):
        try:
            techs = json.loads(self.technicians_json or '[]')
        except:
            techs = []
        try:
            streets = json.loads(self.streets_json or '[]')
        except:
            streets = []
        try:
            tasks = json.loads(self.tasks_json or '[]')
        except:
            tasks = []

        return {
            'id': self.id,
            'title': self.title,
            'type': self.type,
            'leaderId': self.leader_id,
            'leaderName': self.leader_name,
            'technicianNames': techs,
            'streets': streets,
            'scheduledDate': self.scheduled_date.isoformat() if self.scheduled_date else None,
            'status': self.status,
            'tasks': tasks,
            'totalTasks': len(tasks),
            'completedTasks': len([t for t in tasks if t.get('status') in ['cortado', 'concluido', 'resolvido']]),
            'notes': self.notes,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class TeamMessageRecord(db.Model):
    """Mensagens Internas da Equipa, Canais e Piquetes Técnicos"""
    __tablename__ = 'team_messages'

    id = db.Column(db.String(50), primary_key=True)
    channel_id = db.Column(db.String(50), default='geral', index=True)  # 'geral', 'piquete-cortes', 'tecnicos-fibra', 'suporte-clientes'
    sender_id = db.Column(db.Integer, nullable=True)
    sender_name = db.Column(db.String(100), nullable=False)
    sender_role = db.Column(db.String(50), default='tecnico')
    message = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='normal')  # 'normal', 'alta', 'urgente'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'channelId': self.channel_id,
            'senderId': self.sender_id,
            'senderName': self.sender_name,
            'senderRole': self.sender_role,
            'message': self.message,
            'priority': self.priority,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class ChatMessageRecord(db.Model):
    """Mensagens entre Clientes (APK/Web) e Atendimento Empresa / Bot"""
    __tablename__ = 'client_chat_messages'

    id = db.Column(db.String(50), primary_key=True)
    client_id = db.Column(db.Integer, nullable=False, index=True)
    client_code = db.Column(db.String(30), nullable=False, index=True)
    client_name = db.Column(db.String(150), nullable=False)
    sender = db.Column(db.String(20), default='client')  # 'client', 'bot', 'admin'
    sender_name = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    requires_human = db.Column(db.Boolean, default=False)
    handled_by_admin = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'clientCode': self.client_code,
            'clientName': self.client_name,
            'sender': self.sender,
            'senderName': self.sender_name,
            'message': self.message,
            'requiresHuman': self.requires_human,
            'handledByAdminName': self.handled_by_admin,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class SupportInterventionRecord(db.Model):
    """Chamados de Intervenção Humana Escalados pelo Chatbot para Administração"""
    __tablename__ = 'support_interventions'

    id = db.Column(db.String(50), primary_key=True)
    client_id = db.Column(db.Integer, nullable=False, index=True)
    client_code = db.Column(db.String(30), nullable=False)
    client_name = db.Column(db.String(150), nullable=False)
    client_phone = db.Column(db.String(50), nullable=False)
    client_address = db.Column(db.String(200), nullable=True)
    service_type = db.Column(db.String(30), default='tv')
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(30), default='aguardando_atendente', index=True)  # 'aguardando_atendente', 'em_atendimento', 'resolvido'
    assigned_admin_name = db.Column(db.String(100), nullable=True)
    assigned_admin_id = db.Column(db.Integer, nullable=True)
    last_client_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'clientId': self.client_id,
            'clientCode': self.client_code,
            'clientName': self.client_name,
            'clientPhone': self.client_phone,
            'clientAddress': self.client_address,
            'serviceType': self.service_type,
            'reason': self.reason,
            'status': self.status,
            'assignedAdminName': self.assigned_admin_name,
            'assignedAdminId': self.assigned_admin_id,
            'lastClientMessage': self.last_client_message,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


def bump_system_version():
    """Atualiza a versão dos dados globais para notificar instantaneamente todos os clientes conectados."""
    try:
        import time
        v_str = str(int(time.time() * 1000))
        rec = CompanySetting.query.filter_by(key='system_data_version').first()
        if not rec:
            rec = CompanySetting(key='system_data_version', value_json=json.dumps({'version': v_str}))
            db.session.add(rec)
        else:
            rec.value_json = json.dumps({'version': v_str})
        db.session.commit()
        return v_str
    except Exception:
        db.session.rollback()
        return None


def get_system_version():
    """Retorna o timestamp da última versão de dados do ecossistema."""
    try:
        rec = CompanySetting.query.filter_by(key='system_data_version').first()
        if rec:
            data = rec.get_data()
            return data.get('version', '0')
        return '0'
    except Exception:
        return '0'

