import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, CompanySetting, ActivityLog

settings_bp = Blueprint('settings', __name__, url_prefix='/api/v1/settings')

DEFAULT_COMPANY_SETTINGS = {
    'companyName': 'OSDEL TECNOLOGIA',
    'tradeName': 'OSDEL Gestão X - TV & Internet Fibra',
    'nif': '5417089201',
    'phone': '+244 945 882 103',
    'alternatePhone': '+244 923 000 111',
    'email': 'apoio@osdeltecnologia.ao',
    'address': 'Golf I, Rua 12, Luanda, Angola',
    'city': 'Luanda',
    'country': 'Angola',
    'currency': 'AOA',
    'tvMonthlyPrice': 4000,
    'installationFee': 15000,
    'urgentInstallationFee': 25000,
    'latePenalty': 1000,
    'paymentDueDay': 5,
    'gracePeriodDays': 5,
    'suspensionMonths': 2,
    'reconnectionFee': 2500,
    'cablePricePerMeter': 350,
    'includedCableMeters': 30,
    'supportSchedule': 'Segunda a Sábado, das 08h00 às 18h00',
    'invoicePrefix': 'FT',
    'receiptPrefix': 'RC',
    'proformaPrefix': 'FP',
    'internetPlans': [
        {'id': 'plan-10', 'name': 'Fibra 10', 'speed': '10 Mbps/s', 'price': 6500, 'description': 'Navegação residencial e redes sociais'},
        {'id': 'plan-20', 'name': 'Fibra 20', 'speed': '20 Mbps/s', 'price': 11500, 'description': 'Streaming HD e múltiplos utilizadores'},
        {'id': 'plan-50', 'name': 'Fibra 50', 'speed': '50 Mbps/s', 'price': 19500, 'description': 'Ultra velocidade e escritórios'}
    ],
    'bankAccounts': [
        {'id': 'acc-bai', 'name': 'Banco BAI', 'iban': 'AO06.0040.0000.1234.5678.9012.3', 'account': '12345678/10/001', 'holder': 'OSDEL TECNOLOGIA', 'isDefault': True},
        {'id': 'acc-bfa', 'name': 'Banco BFA', 'iban': 'AO06.0006.0000.9876.5432.1098.7', 'account': '98765432/01/001', 'holder': 'OSDEL TECNOLOGIA', 'isDefault': False}
    ],
    'thermalPrinter': {
        'paperWidth': '80mm',
        'autoPrint': True,
        'showLogo': True,
        'footerMessage': 'Obrigado por confiar na OSDEL TECNOLOGIA!'
    }
}

@settings_bp.route('', methods=['GET'])
def get_settings():
    """Retorna definições globais do sistema"""
    record = CompanySetting.query.filter_by(key='global_settings').first()
    if not record:
        record = CompanySetting(key='global_settings')
        record.set_data(DEFAULT_COMPANY_SETTINGS)
        db.session.add(record)
        db.session.commit()

    data = record.get_data()
    return jsonify({
        'success': True,
        'settings': data,
        'updated_at': record.updated_at.isoformat() if record.updated_at else None,
        'updated_by': record.updated_by
    }), 200

@settings_bp.route('', methods=['POST', 'PUT'])
@jwt_required(optional=True)
def update_settings():
    """Atualiza definições globais do sistema"""
    data = request.get_json() or {}
    record = CompanySetting.query.filter_by(key='global_settings').first()
    if not record:
        record = CompanySetting(key='global_settings')
        current = DEFAULT_COMPANY_SETTINGS.copy()
    else:
        current = record.get_data()

    # Mescla configurações
    payload = data.get('data') if 'data' in data else data
    current.update(payload)
    record.set_data(current)
    record.updated_at = datetime.utcnow()
    record.updated_by = request.headers.get('X-Operator-User') or 'administrador'

    db.session.add(record)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Definições do sistema atualizadas e sincronizadas com sucesso!',
        'settings': current
    }), 200
