import os
import sys
import zipfile
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOADS_DIR = os.path.join(ROOT_DIR, 'public', 'downloads')
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

zip_path = os.path.join(DOWNLOADS_DIR, 'OSDEL_API_PythonAnywhere.zip')
temp_zip = zip_path + '.tmp'
if os.path.exists(temp_zip):
    os.remove(temp_zip)

print(f"[*] A empacotar API oficial PythonAnywhere em {zip_path}...")
base_folder = 'gestaox-api'
backend_dir = os.path.join(ROOT_DIR, 'backend_api')

quick_guide = """================================================================================
OSDEL TECNOLOGIA · GESTÃO X - PACOTE OFICIAL DE HOSPEDAGEM (PYTHONANYWHERE)
================================================================================

Este pacote contém todos os arquivos prontos para colocar a API e o backend do
sistema OSDEL Gestão X no ar no plano gratuito do PythonAnywhere em menos de 3 minutos.

PASSO A PASSO ULTRA RÁPIDO:
---------------------------
1. Crie uma conta gratuita em: https://www.pythonanywhere.com/ (usuário: osdelltecnologia)
2. Abra a aba 'Consoles' -> 'Bash' e execute os seguintes comandos:
   mkdir -p ~/gestaox-api
   cd ~/gestaox-api

3. Envie este arquivo zip na aba 'Files' para /home/osdelltecnologia/gestaox-api e descompacte:
   unzip -o OSDEL_API_PythonAnywhere.zip

4. Execute o script de instalação automática:
   bash deploy_pythonanywhere.sh

5. Na aba 'Web' do PythonAnywhere:
   - Defina o Virtualenv para: /home/osdelltecnologia/.virtualenvs/gestaox-venv
   - No ficheiro WSGI (/var/www/osdelltecnologia_pythonanywhere_com_wsgi.py), cole o conteúdo de:
     wsgi_pythonanywhere.py
   - Clique em 'Reload osdelltecnologia.pythonanywhere.com'

Pronto! Sua API estará ativa e segura com certificado SSL HTTPS grátis em:
https://osdelltecnologia.pythonanywhere.com/api/v1/health

Credenciais padrão unificadas:
- deezy: 52863400# (PIN: 9999) - Super Admin Supremo
- boss: boss (PIN: 8888) - Director Comercial
- admin: admin123 (PIN: 5555) - Gerente Administrativa
- mestre.job: job (PIN: 1111) - Mestre Técnico de Piquete
- operador1: 123456 (PIN: 1234) - Operadora de Balcão

Suporte Técnico OSDEL: (+244) 926 153 736
================================================================================
"""

with zipfile.ZipFile(temp_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    zf.writestr(os.path.join(base_folder, 'COMO_PUBLICAR_NO_PYTHONANYWHERE.txt'), quick_guide)
    
    for root, dirs, files in os.walk(backend_dir):
        dirs[:] = [d for d in dirs if d not in ('__pycache__', '.git', '.cache', 'venv', '.virtualenvs')]
        for f in files:
            if f.endswith(('.pyc', '.tmp', '.db', '.sqlite')):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, backend_dir)
            arcname = os.path.join(base_folder, rel_path)
            zf.write(full_path, arcname)

if os.path.exists(zip_path):
    os.remove(zip_path)
os.rename(temp_zip, zip_path)

size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f"✓ Pacote gerado com sucesso: {os.path.basename(zip_path)} ({size_mb:.2f} MB)")

# Validação do Zip
with zipfile.ZipFile(zip_path, 'r') as zf:
    bad = zf.testzip()
    print(f"  Validação: {len(zf.namelist())} ficheiros incluídos, testzip={bad}")
