"""
ARQUIVO DE CONFIGURAÇÃO WSGI OFICIAL PARA PYTHONANYWHERE (PLANO GRATUITO)
==========================================================================
Usuário: osdelltecnologia
Domínio: https://osdelltecnologia.pythonanywhere.com
Ficheiro WSGI no PythonAnywhere:
  /var/www/osdelltecnologia_pythonanywhere_com_wsgi.py

Instruções rápidas:
1. No painel PythonAnywhere, vá até a aba 'Web'.
2. Na secção 'Code', clique no link:
   /var/www/osdelltecnologia_pythonanywhere_com_wsgi.py
3. Apague todo o conteúdo e cole este código!
4. Clique em 'Save' (canto superior direito) e depois em 'Reload' na aba Web.
"""

import sys
import os

# 1. Definição do diretório do projeto no PythonAnywhere
user_home = os.path.expanduser('~')
possible_project_dirs = [
    '/home/osdelltecnologia/crm-dx/gestaox-api',
    os.path.join(user_home, 'crm-dx', 'gestaox-api'),
    '/home/osdelltecnologia/gestaox-api',
    os.path.join(user_home, 'gestaox-api'),
    os.path.join(user_home, 'backend_api'),
    '/home/osdelltecnologia/backend_api',
    user_home,
]

project_home = None
for p in possible_project_dirs:
    if os.path.exists(os.path.join(p, 'app.py')):
        project_home = p
        break

if not project_home:
    project_home = '/home/osdelltecnologia/gestaox-api'

if project_home not in sys.path:
    sys.path.insert(0, project_home)

# 2. Configuração de variáveis de ambiente para Produção Segura
os.environ.setdefault('SECRET_KEY', 'gestaox-producao-super-segura-osdel-2026')
os.environ.setdefault('JWT_SECRET_KEY', 'gestaox-jwt-producao-super-segura-osdel-2026')
os.environ.setdefault('DATABASE_URL', f'sqlite:///{os.path.abspath(os.path.join(project_home, "gestaox.db"))}')

# 3. Importa a aplicação Flask oficial com a variável 'application' exigida pelo WSGI
try:
    from app import app as application
except Exception:
    from app import create_app
    application = create_app()

