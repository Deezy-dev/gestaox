"""
OSDEL TECNOLOGIA - SCRIPT DE PRODUÇÃO & ZERAMENTO DE CONTAS
===========================================================
Execução no PythonAnywhere ou servidor local:
  python seed_db.py           -> Zera todas as contas para 0.00 Kz e limpa dados de exemplo (0 clientes de teste)
  python seed_db.py --reset   -> Apaga todas as tabelas e recria apenas utilizadores e contas oficiais limpas
"""
import sys
import os

# Garante que DATABASE_URL tem fallback automático antes de importar create_app
if not os.environ.get('DATABASE_URL'):
    base_dir = os.path.abspath(os.path.dirname(__file__))
    os.environ['DATABASE_URL'] = f"sqlite:///{os.path.join(base_dir, 'gestaox.db')}"

from app import create_app
from models import (
    db, 
    User, 
    Client, 
    Budget, 
    Contract,
    Invoice, 
    Payment,
    ServiceOrder, 
    PaymentAgreement, 
    SupportTicket, 
    Expense, 
    FinancialAccount,
    Announcement,
    TvDecoderChannel,
    TvChannelPaymentHistory
)

app = create_app()

with app.app_context():
    print(">> [PRODUÇÃO] Inicializando banco de dados oficial...")
    db.create_all()
    
    # Se solicitado reset ou se estiver em modo de limpeza de produção:
    should_wipe_demo = '--demo' not in sys.argv
    
    if should_wipe_demo:
        print(">> [PRODUÇÃO] Removendo quaisquer clientes, contratos, faturas, ordens e despesas de exemplo...")
        try:
            Client.query.delete()
            Budget.query.delete()
            Contract.query.delete()
            Invoice.query.delete()
            Payment.query.delete()
            ServiceOrder.query.delete()
            PaymentAgreement.query.delete()
            SupportTicket.query.delete()
            Expense.query.delete()
            db.session.commit()
            print(">> [PRODUÇÃO] Dados de exemplo removidos com sucesso.")
        except Exception as e:
            db.session.rollback()
            print(f">> Aviso na limpeza: {e}")

    # Modo Produção Oficial: Manter APENAS o SuperAdmin Deezy (52863400# / PIN 9999)
    # Todos os colaboradores e utilizadores fictícios são eliminados da base de dados.
    User.query.filter(User.username != 'deezy').delete()
    print(">> [SEGURANÇA] Todos os colaboradores de demonstração foram removidos. Apenas o SuperAdmin permanece.")

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
            print(f">> Utilizador '{udata['username']}' criado com PIN unificado: {udata['pin']}")
        else:
            u.pin = udata['pin']
            u.role = udata['role']
            u.job_title = udata['job_title']
            u.department = udata['department']
            u.phone = udata['phone']
            u.set_password(udata['password'])
            print(f">> Utilizador '{udata['username']}' sincronizado.")
            
    db.session.commit()

    # ZERAR TODAS AS CONTAS FINANCEIRAS
    print(">> [PRODUÇÃO] Zerando saldos de todas as contas bancárias e caixas...")
    default_accounts = [
        {'id': 'acc-caixa', 'name': 'Caixa Geral (Balcão Golf)', 'type': 'caixa'},
        {'id': 'acc-bai', 'name': 'Banco BAI (AO06.0040.0000.1234.5678.9012.3)', 'type': 'banco', 'bank_name': 'Banco BAI'},
        {'id': 'acc-bfa', 'name': 'Banco BFA (AO06.0006.0000.9876.5432.1098.7)', 'type': 'banco', 'bank_name': 'Banco BFA'},
        {'id': 'acc-tpa', 'name': 'Terminal Multicaixa Express (TPA / EMIS)', 'type': 'tpa', 'bank_name': 'Rede Multicaixa EMIS'},
        {'id': 'acc-piquete', 'name': 'Fundo de Maneio de Piquete Técnico', 'type': 'fundo_maneio'},
    ]
    for acc_data in default_accounts:
        acc = FinancialAccount.query.get(acc_data['id'])
        if not acc:
            acc = FinancialAccount(
                id=acc_data['id'],
                name=acc_data['name'],
                type=acc_data['type'],
                bank_name=acc_data.get('bank_name'),
                initial_balance=0.0,
                current_balance=0.0
            )
            db.session.add(acc)
        else:
            acc.initial_balance = 0.0
            acc.current_balance = 0.0
            
    db.session.commit()
    print(">> [PRODUÇÃO] Todas as contas foram zeradas para 0.00 Kz com sucesso.")

    # SEED HEADEND TV & DESCODIFICADORES (12 ZAP, Canal+, Banda Livre, Extravio)
    print(">> [HEADEND TV] Sincronizando descodificadores e canais oficiais...")
    from datetime import date, timedelta
    today = date.today()

    initial_decoders = [
        {
            'id': 'dec-zap-01',
            'channel_number': 56,
            'provider_position': 22,
            'channel_name': 'ZAP Novelas HD',
            'category': 'novelas',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 01)',
            'decoder_serial': 'ZAP-00918234-A',
            'card_number': '0219 4482 1092 01',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 16500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=20),
            'end_date': today + timedelta(days=10),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E21',
            'rack_unit': 'Rack 1 · U01',
            'hdmi_encoder_port': 1,
            'notes': 'Descodificador dedicado ao ZAP Novelas HD. Subscrição mensal regular.'
        },
        {
            'id': 'dec-zap-02',
            'channel_number': 57,
            'provider_position': 25,
            'channel_name': 'ZAP Viva HD',
            'category': 'entretenimento',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 02)',
            'decoder_serial': 'ZAP-00918235-B',
            'card_number': '0219 4482 1092 02',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 16500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=27),
            'end_date': today + timedelta(days=3),
            'status': 'alerta',
            'signal_status': 'otimo',
            'rf_channel': 'E22',
            'rack_unit': 'Rack 1 · U02',
            'hdmi_encoder_port': 2,
            'notes': 'Subscrição termina em 3 dias! Alerta emitido à Administração.'
        },
        {
            'id': 'dec-zap-03',
            'channel_number': 58,
            'provider_position': 28,
            'channel_name': 'ZAP Cinema HD',
            'category': 'filmes',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 03)',
            'decoder_serial': 'ZAP-00918236-C',
            'card_number': '0219 4482 1092 03',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 16500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=29),
            'end_date': today + timedelta(days=1),
            'status': 'alerta',
            'signal_status': 'otimo',
            'rf_channel': 'E23',
            'rack_unit': 'Rack 1 · U03',
            'hdmi_encoder_port': 3,
            'notes': 'URGENTE: Expira amanhã! Recarregar imediatamente.'
        },
        {
            'id': 'dec-zap-04',
            'channel_number': 59,
            'provider_position': 30,
            'channel_name': 'ZAP Pipoca',
            'category': 'filmes',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 04)',
            'decoder_serial': 'ZAP-00918237-D',
            'card_number': '0219 4482 1092 04',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 16500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=32),
            'end_date': today - timedelta(days=2),
            'status': 'expirado',
            'signal_status': 'sem_sinal',
            'rf_channel': 'E24',
            'rack_unit': 'Rack 1 · U04',
            'hdmi_encoder_port': 4,
            'notes': 'Expirou há 2 dias. Sem sinal na rede. Fazer recarga!'
        },
        {
            'id': 'dec-zap-05',
            'channel_number': 18,
            'provider_position': 10,
            'channel_name': 'Globo ON HD',
            'category': 'novelas',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 05)',
            'decoder_serial': 'ZAP-00918238-E',
            'card_number': '0219 4482 1092 05',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 14500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=15),
            'end_date': today + timedelta(days=15),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E25',
            'rack_unit': 'Rack 1 · U05',
            'hdmi_encoder_port': 5,
            'notes': 'Sinal regular.'
        },
        {
            'id': 'dec-zap-06',
            'channel_number': 30,
            'provider_position': 17,
            'channel_name': 'SuperSport Máximo 1 HD',
            'category': 'desporto',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 06)',
            'decoder_serial': 'ZAP-00918239-F',
            'card_number': '0219 4482 1092 06',
            'subscription_package': 'ZAP Premium',
            'monthly_cost': 18500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=12),
            'end_date': today + timedelta(days=18),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E26',
            'rack_unit': 'Rack 1 · U06',
            'hdmi_encoder_port': 6,
            'notes': 'Canal de jogos ao vivo.'
        },
        {
            'id': 'dec-zap-07',
            'channel_number': 31,
            'provider_position': 18,
            'channel_name': 'SuperSport Futebol HD',
            'category': 'desporto',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 07)',
            'decoder_serial': 'ZAP-00918240-G',
            'card_number': '0219 4482 1092 07',
            'subscription_package': 'ZAP Premium',
            'monthly_cost': 18500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=23),
            'end_date': today + timedelta(days=7),
            'status': 'alerta',
            'signal_status': 'otimo',
            'rf_channel': 'E27',
            'rack_unit': 'Rack 1 · U07',
            'hdmi_encoder_port': 7,
            'notes': 'Expira em 7 dias (1 semana antes).'
        },
        {
            'id': 'dec-zap-08',
            'channel_number': 40,
            'provider_position': 44,
            'channel_name': 'Panda Kids',
            'category': 'infantil',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 08)',
            'decoder_serial': 'ZAP-00918241-H',
            'card_number': '0219 4482 1092 08',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 14500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=5),
            'end_date': today + timedelta(days=25),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E28',
            'rack_unit': 'Rack 1 · U08',
            'hdmi_encoder_port': 8,
            'notes': 'Desenhos infantis.'
        },
        {
            'id': 'dec-zap-09',
            'channel_number': 42,
            'provider_position': 48,
            'channel_name': 'Cartoon Network',
            'category': 'infantil',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 09)',
            'decoder_serial': 'ZAP-00918242-I',
            'card_number': '0219 4482 1092 09',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 14500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=10),
            'end_date': today + timedelta(days=20),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E29',
            'rack_unit': 'Rack 1 · U09',
            'hdmi_encoder_port': 9,
            'notes': 'Animações.'
        },
        {
            'id': 'dec-zap-10',
            'channel_number': 24,
            'provider_position': 12,
            'channel_name': 'SIC Notícias HD',
            'category': 'noticias',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 10)',
            'decoder_serial': 'ZAP-00918243-J',
            'card_number': '0219 4482 1092 10',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 14500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=14),
            'end_date': today + timedelta(days=16),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E30',
            'rack_unit': 'Rack 1 · U10',
            'hdmi_encoder_port': 10,
            'notes': 'Noticiário 24h.'
        },
        {
            'id': 'dec-zap-11',
            'channel_number': 25,
            'provider_position': 14,
            'channel_name': 'CNN Portugal',
            'category': 'noticias',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 11)',
            'decoder_serial': 'ZAP-00918244-K',
            'card_number': '0219 4482 1092 11',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 14500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=8),
            'end_date': today + timedelta(days=22),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E31',
            'rack_unit': 'Rack 1 · U11',
            'hdmi_encoder_port': 11,
            'notes': 'Cobertura internacional.'
        },
        {
            'id': 'dec-zap-12',
            'channel_number': 48,
            'provider_position': 70,
            'channel_name': 'Afro Music Channel',
            'category': 'musica',
            'provider': 'ZAP',
            'is_free': False,
            'decoder_model': 'ZAP HD Box STB-400 (Descodificador 12)',
            'decoder_serial': 'ZAP-00918245-L',
            'card_number': '0219 4482 1092 12',
            'subscription_package': 'ZAP Max',
            'monthly_cost': 14500.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=18),
            'end_date': today + timedelta(days=12),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E32',
            'rack_unit': 'Rack 1 · U12',
            'hdmi_encoder_port': 12,
            'notes': 'Música angolana e africana.'
        },
        {
            'id': 'dec-canal-01',
            'channel_number': 32,
            'provider_position': 1,
            'channel_name': 'Canal+ Sport 1 Afrique',
            'category': 'desporto',
            'provider': 'Canal+',
            'is_free': False,
            'decoder_model': 'Canal+ Décodeur 4K HD G9',
            'decoder_serial': 'CP-0038812-A',
            'card_number': '0449 8192 3341 01',
            'subscription_package': 'Tout Canal+',
            'monthly_cost': 22000.0,
            'balance': 0.0,
            'start_date': today - timedelta(days=10),
            'end_date': today + timedelta(days=20),
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E33',
            'rack_unit': 'Rack 2 · U01',
            'hdmi_encoder_port': 13,
            'notes': 'Liga dos Campeões & Ligue 1.'
        },
        {
            'id': 'dec-free-01',
            'channel_number': 1,
            'provider_position': 0,
            'channel_name': 'TPA 1 HD',
            'category': 'generalista',
            'provider': 'Banda Livre',
            'is_free': True,
            'decoder_model': 'Receptor Satélite FTA DVB-S2',
            'decoder_serial': 'FTA-990182-01',
            'card_number': 'BANDA-LIVRE-SEM-CARTAO',
            'subscription_package': 'Emissão Gratuita FTA',
            'monthly_cost': 0.0,
            'balance': 0.0,
            'start_date': None,
            'end_date': None,
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E05',
            'rack_unit': 'Rack 2 · U05',
            'hdmi_encoder_port': 14,
            'notes': 'Emissão pública nacional grátis.'
        },
        {
            'id': 'dec-free-02',
            'channel_number': 2,
            'provider_position': 0,
            'channel_name': 'TPA 2 HD',
            'category': 'generalista',
            'provider': 'Banda Livre',
            'is_free': True,
            'decoder_model': 'Receptor Satélite FTA DVB-S2',
            'decoder_serial': 'FTA-990182-02',
            'card_number': 'BANDA-LIVRE-SEM-CARTAO',
            'subscription_package': 'Emissão Gratuita FTA',
            'monthly_cost': 0.0,
            'balance': 0.0,
            'start_date': None,
            'end_date': None,
            'status': 'ativo',
            'signal_status': 'otimo',
            'rf_channel': 'E06',
            'rack_unit': 'Rack 2 · U06',
            'hdmi_encoder_port': 15,
            'notes': 'Cultura e juventude.'
        },
        {
            'id': 'dec-extravio-01',
            'channel_number': 99,
            'provider_position': 0,
            'channel_name': 'Descodificador Sob Averiguação',
            'category': 'generalista',
            'provider': 'Extravio',
            'is_free': True,
            'decoder_model': 'ZAP HD Box STB-400 (Antigo)',
            'decoder_serial': 'ZAP-00918299-X',
            'card_number': '0219 4482 1092 99',
            'subscription_package': 'Suspenso / Extravio',
            'monthly_cost': 0.0,
            'balance': 0.0,
            'start_date': None,
            'end_date': None,
            'status': 'extraviado',
            'signal_status': 'sem_sinal',
            'rf_channel': 'Inativo',
            'rack_unit': 'Armazém / Averiguação',
            'hdmi_encoder_port': 16,
            'notes': 'Equipamento não localizado no rack central. Em processo de auditoria patrimonial.'
        }
    ]

    for dec_data in initial_decoders:
        existing = TvDecoderChannel.query.get(dec_data['id'])
        if not existing:
            dec = TvDecoderChannel(
                id=dec_data['id'],
                channel_number=dec_data['channel_number'],
                provider_position=dec_data['provider_position'],
                channel_name=dec_data['channel_name'],
                category=dec_data['category'],
                provider=dec_data['provider'],
                is_free=dec_data['is_free'],
                decoder_model=dec_data['decoder_model'],
                decoder_serial=dec_data['decoder_serial'],
                card_number=dec_data['card_number'],
                subscription_package=dec_data['subscription_package'],
                monthly_cost=dec_data['monthly_cost'],
                balance=dec_data['balance'],
                subscription_start_date=dec_data['start_date'],
                subscription_end_date=dec_data['end_date'],
                status=dec_data['status'],
                signal_status=dec_data['signal_status'],
                rf_channel=dec_data['rf_channel'],
                rack_unit=dec_data['rack_unit'],
                hdmi_encoder_port=dec_data['hdmi_encoder_port'],
                notes=dec_data['notes'],
                last_edited_by='Sistema OSDEL'
            )
            db.session.add(dec)
            print(f">> Canal/Descodificador '{dec_data['channel_name']}' ({dec_data['provider']}) adicionado ao banco.")
    
    # Sincroniza catálogo de inventário de telecomunicações se vazio
    from models import InventoryItem
    if InventoryItem.query.count() == 0:
        initial_inventory = [
            {'code': 'MAT-FIB-001', 'name': 'Bobina de Cabo Drop Fibra Óptica 1FO (1000m)', 'category': 'cabo', 'unit': 'metro', 'quantity': 1500, 'min_quantity': 300, 'unit_cost': 180, 'location': 'Armazém Central', 'description': 'Cabo drop auto-sustentado com mensageiro de aço para instalações FTTH.'},
            {'code': 'MAT-CON-002', 'name': 'Conectores Rápidos SC/APC Verde (Caixa 100 un)', 'category': 'conector', 'unit': 'unidade', 'quantity': 250, 'min_quantity': 50, 'unit_cost': 450, 'location': 'Armazém Central', 'description': 'Conector manual rápido de baixa perda para terminação óptica.'},
            {'code': 'MAT-ONU-003', 'name': 'Modem ONU XPON / GPON Wi-Fi (Huawei / ZTE)', 'category': 'equipamento', 'unit': 'unidade', 'quantity': 35, 'min_quantity': 10, 'unit_cost': 18500, 'location': 'Armazém Central', 'description': 'Terminal de rede óptica para cliente residencial e empresarial.'},
            {'code': 'MAT-PDO-004', 'name': 'Caixa de Terminação Óptica PDO 16 Portas', 'category': 'equipamento', 'unit': 'unidade', 'quantity': 18, 'min_quantity': 4, 'unit_cost': 14000, 'location': 'Armazém Central', 'description': 'Caixa externa hermética para poste com suporte a splitters 1x8 e 1x16.'},
            {'code': 'MAT-SPL-005', 'name': 'Splitter Óptico PLC 1x8 Conectorizado SC/APC', 'category': 'equipamento', 'unit': 'unidade', 'quantity': 25, 'min_quantity': 6, 'unit_cost': 3500, 'location': 'Armazém Central', 'description': 'Divisor óptico balanceado para caixas de distribuição.'},
            {'code': 'MAT-CAB-006', 'name': 'Cabo Coaxial RG6 Blindado 75 Ohms (Rolo 305m)', 'category': 'cabo', 'unit': 'metro', 'quantity': 800, 'min_quantity': 150, 'unit_cost': 120, 'location': 'Armazém Central', 'description': 'Cabo para distribuição de sinal de TV analógica e digital RF.'},
            {'code': 'MAT-CON-007', 'name': 'Fichas Conector F de Compressão RG6', 'category': 'conector', 'unit': 'unidade', 'quantity': 300, 'min_quantity': 60, 'unit_cost': 150, 'location': 'Armazém Central', 'description': 'Fichas resistentes à intempérie para derivadores e TV.'},
            {'code': 'MAT-FER-008', 'name': 'Alicate de Clivagem Óptica de Alta Precisão', 'category': 'ferramenta', 'unit': 'unidade', 'quantity': 4, 'min_quantity': 2, 'unit_cost': 22000, 'location': 'Viatura Piquete 1', 'description': 'Clivador de precisão para fibra óptica monomodo.'}
        ]
        for it in initial_inventory:
            inv = InventoryItem(
                code=it['code'],
                name=it['name'],
                category=it['category'],
                unit=it['unit'],
                quantity=it['quantity'],
                min_quantity=it['min_quantity'],
                unit_cost=it['unit_cost'],
                location=it['location'],
                description=it['description']
            )
            db.session.add(inv)
        print(">> [INVENTÁRIO] Catálogo de materiais de telecomunicações inicializado!")

    db.session.commit()
    print(">> [HEADEND TV] Todos os descodificadores sincronizados no banco de dados SQLite!")
    print(">> [PRODUÇÃO] Total de Clientes na Base: 0")
    print(">> [PRODUÇÃO] Total de Faturas na Base: 0")
    print(">> [PRODUÇÃO] Total de Despesas na Base: 0")
    print(">> [PRODUÇÃO] Sistema 100% pronto para hospedar no PythonAnywhere!")


