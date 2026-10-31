#!/bin/bash
# ==============================================================================
# SCRIPT DE DEPLOY AUTOMATIZADO - OSDEL GESTÃO X (PYTHONANYWHERE FREE TIER)
# ==============================================================================
# Como executar no Console Bash do PythonAnywhere:
#   cd ~/gestaox-api
#   bash deploy_pythonanywhere.sh
# ==============================================================================

set -e

echo "======================================================================"
echo ">> [OSDEL GESTÃO X] A INICIAR DEPLOY OFICIAL NO PYTHONANYWHERE..."
echo "======================================================================"

# 1. Diretório do projeto
PROJECT_DIR="$(pwd)"
echo ">> Diretório actual: $PROJECT_DIR"

# 2. Configura / Ativa o Virtualenv com Python 3.10
VENV_DIR="$HOME/.virtualenvs/gestaox-venv"
mkdir -p "$HOME/.virtualenvs"

if [ ! -d "$VENV_DIR" ]; then
    echo ">> A criar novo virtualenv 'gestaox-venv' com Python 3.10..."
    if command -v python3.10 >/dev/null 2>&1; then
        python3.10 -m venv "$VENV_DIR"
    elif command -v mkvirtualenv >/dev/null 2>&1; then
        mkvirtualenv --python=/usr/bin/python3.10 "gestaox-venv"
    else
        python3 -m venv "$VENV_DIR"
    fi
fi

echo ">> A activar virtualenv '$VENV_DIR'..."
source "$VENV_DIR/bin/activate"

# 3. Actualiza pip e instala dependências
echo ">> A instalar dependências de requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# 4. Executa o seed de produção LIMPO (Zera todas as contas a 0 Kz e limpa dados demo)
echo ">> A inicializar base de dados oficial e zerar contas para produção real..."
python seed_db.py

# 5. Informações Finais para Activação na Aba Web
USER_NAME="$(whoami)"
if [ -z "$USER_NAME" ] || [ "$USER_NAME" = "root" ]; then
    USER_NAME="osdelltecnologia"
fi
echo "======================================================================"
echo ">> DEPLOY CONCLUÍDO COM SUCESSO!"
echo "======================================================================"
echo ""
echo ">> PRÓXIMOS PASSOS NO PAINEL DO PYTHONANYWHERE:"
echo "1. Aceda à aba 'Web' no menu superior do PythonAnywhere."
echo "2. Se ainda não criou, clique em 'Add a new web app' -> 'Manual configuration' -> 'Python 3.10'."
echo "3. Na secção 'Virtualenv', defina o caminho:"
echo "   /home/$USER_NAME/.virtualenvs/gestaox-venv"
echo ""
echo "4. Na secção 'Code' -> 'WSGI configuration file', clique no link:"
echo "   /var/www/${USER_NAME}_pythonanywhere_com_wsgi.py"
echo "   Substitua o conteúdo por:"
echo "----------------------------------------------------------------------"
echo "import sys"
echo "import os"
echo "project_home = '/home/$USER_NAME/gestaox-api'"
echo "if project_home not in sys.path:"
echo "    sys.path.insert(0, project_home)"
echo "os.environ['SECRET_KEY'] = 'gestaox-osdel-producao-2026'"
echo "os.environ['JWT_SECRET_KEY'] = 'gestaox-jwt-osdel-producao-2026'"
echo "os.environ['DATABASE_URL'] = f'sqlite:///{project_home}/gestaox.db'"
echo "try:"
echo "    from app import app as application"
echo "except Exception:"
echo "    from app import create_app"
echo "    application = create_app()"
echo "----------------------------------------------------------------------"
echo ""
echo "5. Clique no botão verde 'Reload $USER_NAME.pythonanywhere.com' no topo da aba Web."
echo ">> A sua API oficial estará online e respondendo em:"
echo "   https://$USER_NAME.pythonanywhere.com/api/v1/health"
echo "======================================================================"
