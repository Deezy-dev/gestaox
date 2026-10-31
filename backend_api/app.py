import os
from flask import Flask, jsonify, request, send_from_directory, render_template_string
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db, User, FinancialAccount, Announcement

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Blindagem absoluta contra RuntimeError: SQLALCHEMY_DATABASE_URI
    if not app.config.get('SQLALCHEMY_DATABASE_URI'):
        base_dir = os.path.abspath(os.path.dirname(__file__))
        raw_db = os.environ.get('DATABASE_URL', f"sqlite:///{os.path.join(base_dir, 'gestaox.db')}")
        if raw_db.startswith("postgres://"):
            raw_db = raw_db.replace("postgres://", "postgresql://", 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = raw_db
        app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
        if "sqlite" in raw_db:
            app.config.setdefault('SQLALCHEMY_ENGINE_OPTIONS', {
                'connect_args': {'timeout': 30, 'check_same_thread': False}
            })
        else:
            app.config.setdefault('SQLALCHEMY_ENGINE_OPTIONS', {
                'pool_pre_ping': True,
                'pool_recycle': 300
            })
    
    # Habilita CORS completo (obrigatorio para integracao Desktop, Electron e Web)
    CORS(app, resources={r"/*": {"origins": "*"}}, 
         allow_headers=["Content-Type", "Authorization", "Accept"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
    
    # Inicializa SQLAlchemy e JWT
    db.init_app(app)
    jwt = JWTManager(app)

    # Optimização de Concorrência SQLite (WAL Mode & Busy Timeout 15s)
    from sqlalchemy import event
    from sqlalchemy.engine import Engine
    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if "sqlite" in str(app.config.get('SQLALCHEMY_DATABASE_URI', '')).lower():
            try:
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL;")
                cursor.execute("PRAGMA synchronous=NORMAL;")
                cursor.execute("PRAGMA busy_timeout=15000;")
                cursor.execute("PRAGMA foreign_keys=ON;")
                cursor.close()
            except Exception:
                pass

    
    # Customizacoes de erro JWT
    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({
            'success': False,
            'message': 'Token de autorização não fornecido ou cabeçalho ausente.'
        }), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'success': False,
            'message': 'O token JWT expirou. Utilize o refresh token para renovar.'
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({
            'success': False,
            'message': 'Token JWT inválido ou corrompido.'
        }), 422
        
    # Registro de Blueprints
    from auth import auth_bp
    from routes_clients import clients_bp
    from routes_budgets import budgets_bp
    from routes_invoices import invoices_bp
    from routes_dashboard import dashboard_bp
    from routes_users import users_bp
    from routes_ai import ai_bp
    from routes_operations import operations_bp
    from routes_tv_channels import tv_channels_bp
    from routes_settings import settings_bp
    from routes_payments import payments_bp
    from routes_loans import loans_bp
    from routes_sync import sync_bp
    from routes_messages import messages_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(invoices_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(operations_bp)
    app.register_blueprint(tv_channels_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(loans_bp)
    app.register_blueprint(sync_bp)
    app.register_blueprint(messages_bp)


    # Cabeçalhos de Segurança HTTP (Hardening de Produção)
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response
    
    # Detecção do diretório estático do Frontend (para hospedar Web SPA e API no mesmo PythonAnywhere)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    static_dirs = [
        os.path.join(base_dir, 'dist'),
        os.path.join(base_dir, 'static'),
        os.path.join(os.path.dirname(base_dir), 'dist'),
    ]
    frontend_dir = None
    for s_dir in static_dirs:
        if os.path.exists(os.path.join(s_dir, 'index.html')):
            frontend_dir = s_dir
            break

    # Rota raiz inteligente (serve JSON para API ou SPA / Painel para navegador)
    @app.route('/')
    def root():
        accept = request.headers.get('Accept', '')
        ua = request.headers.get('User-Agent', '').lower()
        is_browser = ('text/html' in accept or 'mozilla' in ua or 'chrome' in ua or 'safari' in ua) and not request.is_json

        # Se for cliente API ou requisição json
        if not is_browser or 'application/json' in accept or 'curl' in ua:
            return jsonify({
                'name': 'OSDEL Gestão X API REST',
                'version': '2.0.0',
                'status': 'online',
                'platform': 'PythonAnywhere Free Tier',
                'database': 'SQLite',
                'cors': 'enabled',
                'endpoints': {
                    'auth': '/api/v1/auth',
                    'clients': '/api/v1/clients',
                    'budgets': '/api/v1/budgets',
                    'invoices': '/api/v1/invoices',
                    'payments': '/api/v1/payments',
                    'settings': '/api/v1/settings',
                    'financial_accounts': '/api/v1/financial-accounts',
                    'expenses': '/api/v1/expenses',
                    'transfers': '/api/v1/transfers',
                    'inventory': '/api/v1/inventory',
                    'schedule': '/api/v1/schedule',
                    'missions': '/api/v1/missions',
                    'cash_closures': '/api/v1/cash-closures',
                    'monthly_closures': '/api/v1/monthly-closures',
                    'technician_loans': '/api/v1/technician-loans',
                    'sync': '/api/v1/sync/full-snapshot',
                    'dashboard': '/api/v1/dashboard/summary',
                    'users': '/api/v1/users',
                    'operations': '/api/v1/service-orders',
                    'tv_channels': '/api/v1/tv-channels',
                    'messages': '/api/v1/messages',
                    'ai': '/api/v1/ai/assist',
                    'health': '/api/v1/health'
                }
            }), 200

        # Se existir build do Frontend na pasta dist/ ou static/, entrega a SPA
        if frontend_dir and os.path.exists(os.path.join(frontend_dir, 'index.html')):
            return send_from_directory(frontend_dir, 'index.html')

        # Se for navegador e ainda não tiver bundle compilado, exibe painel informativo oficial
        status_html = """<!DOCTYPE html>
<html lang="pt-AO">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OSDEL Gestão X · Servidor PythonAnywhere Online</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; padding: 24px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .container { max-width: 680px; width: 100%; background: #131b2e; border: 1px solid #1e293b; border-radius: 20px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 999px; color: #34d399; font-size: 12px; font-weight: 700; margin-bottom: 16px; }
        .dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; }
        h1 { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 8px; }
        p { font-size: 13.5px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .stat { background: #0b1329; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; text-align: center; }
        .stat-val { font-size: 18px; font-weight: 800; color: #38bdf8; }
        .stat-lbl { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
        .btn-group { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
        .btn-secondary:hover { background: #334155; color: #fff; }
        .code-box { background: #060a12; border: 1px solid #1e293b; border-radius: 10px; padding: 12px; font-family: monospace; font-size: 12px; color: #a5f3fc; overflow-x: auto; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge"><span class="dot"></span> SERVIDOR EM PRODUÇÃO ACTIVO</div>
        <h1>OSDEL Gestão X · API REST Oficial</h1>
        <p>A API REST da OSDEL Tecnologia está a responder com sucesso no <b>PythonAnywhere Free Tier</b> com SQLite e autenticação JWT. Todos os serviços Web, APK Cliente, APK Equipa e Desktop estão autorizados via CORS.</p>
        
        <div class="grid">
            <div class="stat"><div class="stat-val">Online</div><div class="stat-lbl">Estado</div></div>
            <div class="stat"><div class="stat-val">SQLite</div><div class="stat-lbl">Base de Dados</div></div>
            <div class="stat"><div class="stat-val">2.0.0</div><div class="stat-lbl">Versão API</div></div>
            <div class="stat"><div class="stat-val">Activo</div><div class="stat-lbl">CORS Global</div></div>
        </div>

        <div class="btn-group">
            <a href="/api/v1/health" class="btn btn-primary" target="_blank">✓ Testar /health</a>
            <a href="/api/v1/sync/full-snapshot" class="btn btn-secondary" target="_blank">🔄 Ver Snapshot Geral</a>
            <a href="/api/v1/tv-channels" class="btn btn-secondary" target="_blank">📺 Canais & Headend</a>
        </div>

        <div class="code-box">
            GET /api/v1/health &rarr; {"engine": "Flask + SQLAlchemy + SQLite", "platform": "PythonAnywhere Free Tier", "status": "healthy", "success": true}
        </div>
    </div>
</body>
</html>"""
        return render_template_string(status_html), 200

    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        if frontend_dir and os.path.exists(os.path.join(frontend_dir, 'assets')):
            return send_from_directory(os.path.join(frontend_dir, 'assets'), filename)
        return jsonify({'error': 'Assets directory not found'}), 404

    @app.route('/<path:fallback_path>')
    def catch_all(fallback_path):
        if fallback_path.startswith('api/'):
            return jsonify({'success': False, 'message': 'Endpoint da API não encontrado.'}), 404
        if frontend_dir:
            target_f = os.path.join(frontend_dir, fallback_path)
            if os.path.exists(target_f) and not os.path.isdir(target_f):
                return send_from_directory(frontend_dir, fallback_path)
            if os.path.exists(os.path.join(frontend_dir, 'index.html')):
                return send_from_directory(frontend_dir, 'index.html')
        return jsonify({'success': False, 'message': f'Recurso {fallback_path} não encontrado.'}), 404

    @app.route('/api/v1/health')
    def health():
        return jsonify({
            'success': True,
            'status': 'healthy',
            'platform': 'PythonAnywhere Free Tier',
            'engine': 'Flask + SQLAlchemy + SQLite'
        }), 200

    @app.route('/api/v1/system/reset-production', methods=['POST'])
    def reset_production():
        """Zera saldos de todas as contas e remove dados operacionais de teste"""
        try:
            from models import (
                Client, Budget, Invoice, Payment, ServiceOrder, PaymentAgreement, 
                SupportTicket, Expense, AccountTransfer, CashClosure, 
                MonthlyClosureRecord, ScheduleEventRecord, TeamMissionRecord
            )
            Client.query.delete()
            Budget.query.delete()
            Invoice.query.delete()
            Payment.query.delete()
            try:
                ServiceOrder.query.delete()
                PaymentAgreement.query.delete()
                SupportTicket.query.delete()
                Expense.query.delete()
                AccountTransfer.query.delete()
                CashClosure.query.delete()
                MonthlyClosureRecord.query.delete()
                ScheduleEventRecord.query.delete()
                TeamMissionRecord.query.delete()
            except Exception:
                pass

            # Zera todas as contas financeiras
            for acc in FinancialAccount.query.all():
                acc.initial_balance = 0.0
                acc.current_balance = 0.0

            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'Todas as contas foram zeradas e os dados de exemplo removidos com sucesso!'
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Erro ao zerar produção: {str(e)}'
            }), 500
        
    # Handlers de erro globais
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            'success': False,
            'message': 'Endpoint não encontrado.'
        }), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            'success': False,
            'message': 'Erro interno do servidor.'
        }), 500

    # Cria tabelas no SQLite se não existirem e inicializa dados essenciais
    with app.app_context():
        db.create_all()
        
        # Migrações seguras de SQLite para colunas recém-adicionadas
        try:
            with db.engine.connect() as conn:
                for col_sql in [
                    "ALTER TABLE clients ADD COLUMN pin VARCHAR(10) DEFAULT '1234'",
                    "ALTER TABLE clients ADD COLUMN password VARCHAR(100)",
                    "ALTER TABLE clients ADD COLUMN optical_rx_dbm FLOAT DEFAULT -19.5",
                    "ALTER TABLE clients ADD COLUMN due_day INTEGER DEFAULT 5",
                    "ALTER TABLE users ADD COLUMN pin VARCHAR(10) DEFAULT '1234'",
                    "ALTER TABLE users ADD COLUMN phone VARCHAR(30)",
                    "ALTER TABLE users ADD COLUMN whatsapp VARCHAR(30)",
                    "ALTER TABLE users ADD COLUMN job_title VARCHAR(100)",
                    "ALTER TABLE users ADD COLUMN department VARCHAR(50)",
                    "ALTER TABLE users ADD COLUMN salary_base FLOAT DEFAULT 150000.0",
                    "ALTER TABLE users ADD COLUMN food_allowance FLOAT DEFAULT 30000.0",
                    "ALTER TABLE users ADD COLUMN transport_allowance FLOAT DEFAULT 25000.0",
                    "ALTER TABLE users ADD COLUMN bank_iban VARCHAR(60)",
                    "ALTER TABLE users ADD COLUMN work_status VARCHAR(30) DEFAULT 'disponivel'",
                    "ALTER TABLE users ADD COLUMN photo_url VARCHAR(255)",
                    "ALTER TABLE users ADD COLUMN bi_number VARCHAR(50)",
                    "ALTER TABLE users ADD COLUMN address VARCHAR(200)"
                ]:
                    try:
                        conn.execute(db.text(col_sql))
                    except Exception:
                        pass
                conn.commit()
        except Exception:
            pass

        # Cria / Sincroniza utilizadores oficiais do sistema
        unified_users = [
            {
                'username': 'deezy',
                'full_name': 'Albert Mbuyi (Deezy)',
                'email': 'deezy@osdeltecnologia.ao',
                'role': 'superadmin',
                'pin': '9999',
                'password': '52863400#',
                'job_title': 'Director Geral & Super Admin Supremo',
                'department': 'Direcção Executiva',
                'phone': '+244945882103'
            },
            {
                'username': 'boss',
                'full_name': 'Eng. António Costa (Boss)',
                'email': 'boss@osdeltecnologia.ao',
                'role': 'boss',
                'pin': '8888',
                'password': 'boss',
                'job_title': 'Director Executivo & Boss (Comercial / Financeiro)',
                'department': 'Direcção Comercial',
                'phone': '+244923000111'
            },
            {
                'username': 'admin',
                'full_name': 'Dra. Luísa Antunes',
                'email': 'admin@osdeltecnologia.ao',
                'role': 'admin',
                'pin': '5555',
                'password': 'admin123',
                'job_title': 'Gerente Administrativa & Supervisora',
                'department': 'Administração',
                'phone': '+244923000222'
            },
            {
                'username': 'mestre.job',
                'full_name': 'Job Baptista (Mestre Job)',
                'email': 'mestre.job@osdeltecnologia.ao',
                'role': 'tecnico',
                'pin': '1111',
                'password': 'job',
                'job_title': 'Mestre de Piquete & Líder de Redes Fibra',
                'department': 'Técnico',
                'phone': '+244923111222'
            },
            {
                'username': 'operador1',
                'full_name': 'Maria Teresa dos Santos',
                'email': 'maria.santos@osdeltecnologia.ao',
                'role': 'operador',
                'pin': '1234',
                'password': '123456',
                'job_title': 'Operadora Comercial & Atendimento de Balcão',
                'department': 'Comercial',
                'phone': '+244931445566'
            },
            {
                'username': 'helder',
                'full_name': 'Hélder Manuel',
                'email': 'helder.manuel@osdeltecnologia.ao',
                'role': 'tecnico',
                'pin': '2222',
                'password': 'helder',
                'job_title': 'Técnico Instalador de TV & Fibra',
                'department': 'Técnico',
                'phone': '+244923444888'
            }
        ]
        
        for udata in unified_users:
            u = User.query.filter_by(username=udata['username']).first()
            if not u:
                u = User(
                    username=udata['username'],
                    full_name=udata['full_name'],
                    email=udata['email'],
                    role=udata['role'],
                    pin=udata['pin'],
                    phone=udata['phone'],
                    job_title=udata['job_title'],
                    department=udata['department'],
                    is_active=True
                )
                u.set_password(udata['password'])
                db.session.add(u)
            else:
                u.pin = udata['pin']
                u.role = udata['role']
                u.job_title = udata['job_title']
                u.department = udata['department']
                u.phone = udata['phone']

        # Inicializa contas bancárias padrão da OSDEL
        default_accounts = [
            {'id': 'acc-caixa', 'name': 'Caixa Geral Balcão', 'type': 'caixa', 'initial_balance': 0.0},
            {'id': 'acc-bai', 'name': 'Banco BAI (AO06.0040.0000.1234.5678.9012.3)', 'type': 'banco', 'bank_name': 'Banco BAI', 'initial_balance': 0.0},
            {'id': 'acc-bfa', 'name': 'Banco BFA (AO06.0006.0000.9876.5432.1098.7)', 'type': 'banco', 'bank_name': 'Banco BFA', 'initial_balance': 0.0},
            {'id': 'acc-tpa', 'name': 'Multicaixa TPA Balcão', 'type': 'tpa', 'initial_balance': 0.0},
        ]
        for acc_data in default_accounts:
            if not FinancialAccount.query.get(acc_data['id']):
                acc = FinancialAccount(
                    id=acc_data['id'],
                    name=acc_data['name'],
                    type=acc_data['type'],
                    bank_name=acc_data.get('bank_name'),
                    initial_balance=acc_data.get('initial_balance', 0.0),
                    current_balance=acc_data.get('initial_balance', 0.0)
                )
                db.session.add(acc)
                
        # Inicializa comunicado informativo inicial se vazio
        if Announcement.query.count() == 0:
            ann = Announcement(
                title="Rede OSDEL Tecnologia Operacional",
                category="comunicado",
                content="Bem-vindo ao sistema oficial da OSDEL Tecnologia. Sistema integrado Web, Desktop e Aplicativos Móveis operando com sucesso.",
                date="Hoje"
            )
            db.session.add(ann)

        db.session.commit()
            
    return app

# Instancia da aplicacao para servidores WSGI (como PythonAnywhere e Gunicorn)
app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
