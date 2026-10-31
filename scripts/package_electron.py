import os
import sys
import zipfile

ROOT_DIR = os.getcwd()
DOWNLOADS_DIR = os.path.join(ROOT_DIR, 'public', 'downloads')
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

zip_path = os.path.join(DOWNLOADS_DIR, 'OSDEL_Desktop_Electron_Windows.zip')
temp_zip = zip_path + '.tmp'
if os.path.exists(temp_zip):
    os.remove(temp_zip)

print(f"Creating {os.path.basename(zip_path)}...")
base_folder = 'OSDEL_Desktop_Electron_Windows'
electron_dir = os.path.join(ROOT_DIR, 'electron_app')

added_arcnames = set()

with zipfile.ZipFile(temp_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=5) as zf:
    # 1. Walk electron_app excluding linux-unpacked, node_modules, downloads, and git
    for root, dirs, files in os.walk(electron_dir):
        dirs[:] = [d for d in dirs if d not in ('linux-unpacked', 'node_modules', '.git', '__pycache__', 'downloads')]
        for f in files:
            if f.endswith(('.tmp', '.pyc', '.lock', '.zip')):
                continue
            full_p = os.path.join(root, f)
            if os.path.islink(full_p):
                continue
            rel = os.path.relpath(full_p, electron_dir)
            arcname = os.path.join(base_folder, rel)
            if arcname not in added_arcnames:
                zf.write(full_p, arcname)
                added_arcnames.add(arcname)

    # 2. Add LEIA-ME
    readme_content = """================================================================================
OSDEL TECNOLOGIA - GESTAO INTEGRADA DESKTOP (WINDOWS)
================================================================================

Este pacote contem a aplicacao oficial Desktop para Windows 10 e 11 (64-bit).
Ja inclui a compilacao completa dos sistemas de Fibra Optica e TV por Cabo.

COMO INICIAR:
-------------
1. Para abrir o sistema com foco em FIBRA OPTICA:
   -> De dois cliques em: iniciar_fibra.bat
   Ou aceda a pasta 'dist_fibra_exe\\win-unpacked' e abra:
   'OSDEL Gestao - Fibra Optica Desktop.exe'

2. Para abrir o sistema com foco em TV POR CABO:
   -> De dois cliques em: iniciar_tv_cabo.bat
   Ou aceda a pasta 'dist_tv_exe\\win-unpacked' e abra:
   'OSDEL Gestao - TV Cabo Desktop.exe'

NAO E NECESSARIO INSTALAR NODE.JS OU QUALQUER OUTRA FERRAMENTA.
O aplicativo e 100% nativo, autonomo e funciona totalmente offline ou ligado a API.

Suporte OSDEL TECNOLOGIA:
WhatsApp / Telefone: (+244) 926 153 736
================================================================================
"""
    zf.writestr(os.path.join(base_folder, 'LEIA-ME_PRIMEIROS_PASSOS.txt'), readme_content)

if os.path.exists(zip_path):
    os.remove(zip_path)
os.rename(temp_zip, zip_path)

size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f"✓ Created {os.path.basename(zip_path)} ({size_mb:.2f} MB)")

# Validation
with zipfile.ZipFile(zip_path, 'r') as zf:
    bad = zf.testzip()
    print(f"Validation: {len(zf.namelist())} files, testzip error={bad}")
