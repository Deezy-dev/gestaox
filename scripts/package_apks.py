import os
import sys
import zipfile

# Determine root
ROOT_DIR = os.getcwd()
DOWNLOADS_DIR = os.path.join(ROOT_DIR, 'public', 'downloads')
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

def create_clean_zip(zip_path, base_folder, source_folder, extra_files=None):
    temp_zip = zip_path + '.tmp'
    if os.path.exists(temp_zip):
        os.remove(temp_zip)

    print(f"Creating {os.path.basename(zip_path)}...")
    with zipfile.ZipFile(temp_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        # Add extra files at root of base_folder
        if extra_files:
            for ef in extra_files:
                ef_path = os.path.join(ROOT_DIR, ef)
                if os.path.exists(ef_path):
                    arc = os.path.join(base_folder, os.path.basename(ef))
                    zf.write(ef_path, arc)

        # Walk source_folder
        src_full = os.path.join(ROOT_DIR, source_folder)
        for root, dirs, files in os.walk(src_full):
            # Exclude node_modules, .git, etc.
            dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', '.cache', '__pycache__', 'downloads', 'linux-unpacked')]
            for f in files:
                if f.endswith(('.pyc', '.tmp', '.lock')):
                    continue
                full_f = os.path.join(root, f)
                if os.path.islink(full_f):
                    continue
                rel = os.path.relpath(full_f, src_full)
                arc = os.path.join(base_folder, rel)
                zf.write(full_f, arc)

    if os.path.exists(zip_path):
        os.remove(zip_path)
    os.rename(temp_zip, zip_path)
    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"✓ Created {os.path.basename(zip_path)} ({size_mb:.2f} MB)")

# 1. CLIENTE APK ZIP
create_clean_zip(
    zip_path=os.path.join(DOWNLOADS_DIR, 'OSDEL_APK_Cliente.zip'),
    base_folder='OSDEL_APK_Cliente',
    source_folder='clienteapk',
)

# 2. EQUIPA STAFF APK ZIP
create_clean_zip(
    zip_path=os.path.join(DOWNLOADS_DIR, 'OSDEL_APK_Equipa_Staff.zip'),
    base_folder='OSDEL_APK_Equipa_Staff',
    source_folder='equipaapk',
)

print("\nValidating generated APK zip files:")
for f in ['OSDEL_APK_Cliente.zip', 'OSDEL_APK_Equipa_Staff.zip']:
    p = os.path.join(DOWNLOADS_DIR, f)
    with zipfile.ZipFile(p, 'r') as zf:
        bad = zf.testzip()
        print(f"  {f}: {len(zf.namelist())} files, testzip error={bad}")
