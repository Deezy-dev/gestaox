from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, Client, Invoice, Budget, User

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/v1/dashboard')

@dashboard_bp.route('/summary', methods=['GET'])
@jwt_required(optional=True)
def get_dashboard_summary():
    """Retorna estatísticas consolidadas para a tela inicial do sistema e do Desktop (suporta ?service=tv e ?service=fibra)"""
    service_filter = request.args.get('service', '').strip().lower()
    
    if service_filter == 'tv':
        c_query = Client.query.filter_by(service_type='tv')
        total_clients = c_query.count()
        active_clients = Client.query.filter_by(service_type='tv', status='active').count()
        late_clients = Client.query.filter_by(service_type='tv', status='late').count()
        suspended_clients = Client.query.filter_by(service_type='tv', status='suspended').count()
        tv_clients = total_clients
        fiber_clients = 0
        combo_clients = 0
        
        paid_invoices = Invoice.query.join(Client).filter(Client.service_type == 'tv', Invoice.status == 'paga').all()
        pending_invoices = Invoice.query.join(Client).filter(Client.service_type == 'tv', Invoice.status == 'pendente').all()
        
        total_budgets = Budget.query.filter_by(service_type='tv').count()
        pending_budgets = Budget.query.filter_by(service_type='tv', status='pendente').count()
        approved_budgets = Budget.query.filter_by(service_type='tv', status='aprovado').count()
        
        recent_clients = [c.to_dict() for c in Client.query.filter_by(service_type='tv').order_by(Client.id.desc()).limit(5).all()]
        recent_payments = [inv.to_dict() for inv in Invoice.query.join(Client).filter(Client.service_type == 'tv', Invoice.status == 'paga').order_by(Invoice.id.desc()).limit(5).all()]
        
    elif service_filter in ['fibra', 'internet']:
        c_query = Client.query.filter(Client.service_type.in_(['fibra', 'combo']))
        total_clients = c_query.count()
        active_clients = Client.query.filter(Client.service_type.in_(['fibra', 'combo']), Client.status == 'active').count()
        late_clients = Client.query.filter(Client.service_type.in_(['fibra', 'combo']), Client.status == 'late').count()
        suspended_clients = Client.query.filter(Client.service_type.in_(['fibra', 'combo']), Client.status == 'suspended').count()
        tv_clients = 0
        fiber_clients = Client.query.filter_by(service_type='fibra').count()
        combo_clients = Client.query.filter_by(service_type='combo').count()
        
        paid_invoices = Invoice.query.join(Client).filter(Client.service_type.in_(['fibra', 'combo']), Invoice.status == 'paga').all()
        pending_invoices = Invoice.query.join(Client).filter(Client.service_type.in_(['fibra', 'combo']), Invoice.status == 'pendente').all()
        
        total_budgets = Budget.query.filter(Budget.service_type.in_(['fibra', 'combo'])).count()
        pending_budgets = Budget.query.filter(Budget.service_type.in_(['fibra', 'combo']), Budget.status == 'pendente').count()
        approved_budgets = Budget.query.filter(Budget.service_type.in_(['fibra', 'combo']), Budget.status == 'aprovado').count()
        
        recent_clients = [c.to_dict() for c in Client.query.filter(Client.service_type.in_(['fibra', 'combo'])).order_by(Client.id.desc()).limit(5).all()]
        recent_payments = [inv.to_dict() for inv in Invoice.query.join(Client).filter(Client.service_type.in_(['fibra', 'combo']), Invoice.status == 'paga').order_by(Invoice.id.desc()).limit(5).all()]
        
    else:
        total_clients = Client.query.count()
        active_clients = Client.query.filter_by(status='active').count()
        late_clients = Client.query.filter_by(status='late').count()
        suspended_clients = Client.query.filter_by(status='suspended').count()
        
        tv_clients = Client.query.filter_by(service_type='tv').count()
        fiber_clients = Client.query.filter_by(service_type='fibra').count()
        combo_clients = Client.query.filter_by(service_type='combo').count()
        
        paid_invoices = Invoice.query.filter_by(status='paga').all()
        pending_invoices = Invoice.query.filter_by(status='pendente').all()
        
        total_budgets = Budget.query.count()
        pending_budgets = Budget.query.filter_by(status='pendente').count()
        approved_budgets = Budget.query.filter_by(status='aprovado').count()
        
        recent_clients = [c.to_dict() for c in Client.query.order_by(Client.id.desc()).limit(5).all()]
        recent_payments = [inv.to_dict() for inv in Invoice.query.filter_by(status='paga').order_by(Invoice.id.desc()).limit(5).all()]

    revenue_total = sum((inv.total or 0.0) for inv in paid_invoices)
    pending_total = sum((inv.total or 0.0) for inv in pending_invoices)
    
    return jsonify({
        'success': True,
        'timestamp': datetime.utcnow().isoformat(),
        'metrics': {
            'clients': {
                'total': total_clients,
                'active': active_clients,
                'late': late_clients,
                'suspended': suspended_clients,
                'tv': tv_clients,
                'fibra': fiber_clients,
                'combo': combo_clients
            },
            'financial': {
                'revenue_total_kz': revenue_total,
                'pending_total_kz': pending_total,
                'invoices_paid_count': len(paid_invoices),
                'invoices_pending_count': len(pending_invoices)
            },
            'budgets': {
                'total': total_budgets,
                'pending': pending_budgets,
                'approved': approved_budgets
            }
        },
        'recent_clients': recent_clients,
        'recent_payments': recent_payments
    }), 200
