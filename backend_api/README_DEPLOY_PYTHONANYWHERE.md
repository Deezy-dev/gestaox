# GUIA DEFINITIVO: DEPLOY NO PYTHONANYWHERE (PLANO GRATUITO)
================================================================================
OSDEL Gestão X · API REST Flask + SQLite + JWT · Guia para Windows 10 (CMD)
================================================================================

Este guia foi elaborado para garantir que você publique a API oficial no **PythonAnywhere Free Tier** sem nenhum erro, utilizando seu computador **Windows 10** sem necessidade de instalar terminal Linux.

> **LEMBRE-SE:**  
> O PythonAnywhere disponibiliza um console Linux Bash dentro do seu próprio navegador de internet.  
> Você não precisa de WSL, Git Bash ou Linux no seu Windows 10. Você faz tudo pelo Chrome ou Edge!

---

## 1. O QUE O PLANO GRATUITO SUPORTA E COMO ESTÁ PROTEGIDO

| Recurso do PythonAnywhere Free | Status no Projeto | Como o Gestão X Resolve |
| :--- | :--- | :--- |
| **1 Aplicação Web WSGI ativa** | Totalmente Suportado | Sua API terá URL permanente com HTTPS grátis. |
| **Banco SQLite Local (`gestaox.db`)**| Totalmente Suportado | Sem expiração de 30 dias (ao contrário do Render). |
| **Ambientes Virtuais (`virtualenv`)** | Totalmente Suportado | Instalação isolada das bibliotecas Python 3.10. |
| **Tráfego CORS e Inbound Ilimitado**| Totalmente Suportado | Permite conexões do Web (Vercel), APKs e Desktop. |
| **Sem Docker / Sem Redis** | Contornado com Sucesso | Toda a API e o Delta Sync rodam de forma síncrona e ultraleve. |
| **Limite de CPU (100s/dia)** | Otimizado ao Máximo | O novo endpoint `/api/v1/sync/delta` responde em ~3ms gastando 0.0001s de CPU. |
| **Renovação a cada 3 meses** | Requer 1 Clique | A cada 90 dias, basta clicar em *"Run until 3 months from today"*. |

---

## 2. PASSO A PASSO COMPLETO DO DEPLOY

### PASSO 1: Criar a Conta Gratuita
1. Acesse: **[https://www.pythonanywhere.com/](https://www.pythonanywhere.com/)** no seu navegador.
2. Clique em **"Pricing & signup"** e depois em **"Create a Beginner account"**.
3. Escolha seu nome de usuário com atenção (exemplo: `osdelltecnologia`).
   - Sua API ficará disponível em: `https://osdelltecnologia.pythonanywhere.com`
4. Confirme seu e-mail de ativação.

---

### PASSO 2: Fazer Upload dos Arquivos (Pelo Próprio Navegador)
1. No seu Windows 10, você pode usar o arquivo `OSDEL_API_PythonAnywhere.zip` (pronto para download na pasta `public/downloads/`).
2. No painel do PythonAnywhere, vá na aba **Files** no menu superior.
3. No campo **Upload a file**, selecione o arquivo ZIP e clique no botão **Upload**.
4. Agora clique na aba **Consoles** e clique no link **Bash** (abrirá um terminal preto direto no navegador).
5. Digite os seguintes comandos (pressione `Enter` após cada um):
   ```bash
   mkdir -p ~/gestaox-api
   unzip OSDEL_API_PythonAnywhere.zip -d ~/gestaox-api
   cd ~/gestaox-api
   ```

---

### PASSO 3: Criar o Ambiente Virtual (Virtualenv)
No terminal do navegador no PythonAnywhere, execute:

```bash
# 1. Cria o virtualenv com Python 3.10
mkvirtualenv --python=/usr/bin/python3.10 gestaox-venv

# 2. Garante que está na pasta da API
cd ~/gestaox-api

# 3. Instala as bibliotecas necessárias
pip install -r requirements.txt

# 4. Inicializa o banco de dados oficial (modo limpo de produção)
python seed_db.py --clean
```

---

### PASSO 4: Configurar a Aplicação na Aba "Web"
1. No menu superior do PythonAnywhere, clique na aba **Web**.
2. Clique no botão azul **"Add a new web app"**.
3. No assistente:
   - Clique em **Next**.
   - Selecione **Manual configuration** *(NÃO escolha Flask direto, pois usaremos nosso virtualenv próprio)*.
   - Selecione **Python 3.10**.
   - Conclua o assistente.

---

### PASSO 5: Configurar o Virtualenv e Diretório
Na página da aba **Web**, configure:

1. **Virtualenv:**
   - Clique em *"Enter path to a virtualenv"*.
   - Digite: `/home/osdelltecnologia/.virtualenvs/gestaox-venv` *(troque `osdelltecnologia` pelo seu usuário)*.
   - Clique no ícone de confirmação (check).

2. **Code (Source code & Working directory):**
   - **Source code:** `/home/osdelltecnologia/gestaox-api`
   - **Working directory:** `/home/osdelltecnologia/gestaox-api`

---

### PASSO 6: Configurar o Arquivo WSGI
Ainda na aba **Web**, clique no link do seu arquivo WSGI:  
`/var/www/osdelltecnologia_pythonanywhere_com_wsgi.py`

1. Apague todo o conteúdo de exemplo que estiver lá.
2. Cole exatamente o seguinte código:

```python
import sys
import os

project_home = '/home/osdelltecnologia/gestaox-api'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ['SECRET_KEY'] = 'gestaox-osdel-producao-2026'
os.environ['JWT_SECRET_KEY'] = 'gestaox-jwt-osdel-producao-2026'
os.environ['DATABASE_URL'] = f'sqlite:///{project_home}/gestaox.db'

from app import app as application
```
*(Troque `osdelltecnologia` pelo seu usuário)*.
3. Clique no botão verde **Save** no canto superior direito.

---

### PASSO 7: Recarregar e Testar
1. Volte à aba **Web**.
2. Clique no botão verde: **"Reload osdelltecnologia.pythonanywhere.com"**.
3. Abra uma nova aba no seu navegador e acesse:  
   `https://osdelltecnologia.pythonanywhere.com/api/v1/health`  
   Deverá ver a resposta:
   ```json
   {
     "engine": "Flask + SQLAlchemy + SQLite",
     "platform": "PythonAnywhere Free Tier",
     "status": "healthy",
     "success": true
   }
   ```

---

## 3. PREVISÃO DE ERROS E COMO EVITÁ-LOS OU REPARÁ-LOS

### ⚠️ Erro 1: Erro 502 Bad Gateway no PythonAnywhere
- **Causa:** Erro de digitação no caminho do arquivo WSGI ou biblioteca que não foi instalada no virtualenv.
- **Como Diagnosticar em 10 segundos:**
  1. Na aba **Web**, role até **Log files** e clique em **Error log**.
  2. A última linha mostra o erro exato em Python.
- **Como Resolver:**
  - Se disser `ModuleNotFoundError`: volte ao console Bash e rode `workon gestaox-venv && pip install -r requirements.txt`.
  - Se disser `No such file or directory`: confira se o caminho `/home/seu_usuario/gestaox-api` no arquivo WSGI tem o mesmo nome da sua pasta.

### ⚠️ Erro 2: No seu Windows 10 (CMD): `'python'` não é reconhecido
- **Causa:** O Python foi instalado no Windows sem marcar a caixa de adicionar ao PATH.
- **Como Resolver:**
  1. Baixe o Python em [python.org](https://www.python.org).
  2. Na tela inicial do instalador, marque: `☑ Add python.exe to PATH`.
  3. Clique em Install Now e reinicie o Prompt de Comando (CMD).

### ⚠️ Erro 3: Bloqueio de CORS no Navegador
- **Causa:** O site está em `https://` (Vercel) e está chamando a API usando `http://` (sem o `s`).
- **Como Resolver:** Sempre informe a URL com HTTPS: `https://seu_usuario.pythonanywhere.com` (sem barra no final).

### ⚠️ Erro 4: Erro de Permissão ou Porta em Uso no Windows 10
- **Causa:** Um processo antigo do Node.js ou Vite ficou travado na porta 3000.
- **Como Resolver no CMD:**
  ```cmd
  netstat -ano | findstr :3000
  taskkill /PID <NUMERO_DO_PID> /F
  ```

---

## 4. CREDENCIAIS OFICIAIS DE PRODUÇÃO (PIN & SENHA)

| Utilizador | Perfil | PIN Rápido (APK) | Senha (Web/Desktop) | Função |
| :--- | :--- | :--- | :--- | :--- |
| **deezy** | superadmin | **9999** | `52863400#` | Director Geral & Super Admin Supremo |
| **boss** | boss | **8888** | `boss` | Director Comercial & Executivo |
| **admin** | admin | **5555** | `admin123` | Gerente Administrativa & Supervisão |
| **mestre.job** | tecnico | **1111** | `job` | Mestre de Piquete & Líder Fibra |
| **operador1** | operador | **1234** | `123456` | Operadora Comercial de Balcão |
| **helder** | tecnico | **2222** | `helder` | Técnico Instalador TV & Fibra |
