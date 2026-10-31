# CAPÍTULO 5 · DEPLOY DO BACKEND NO PYTHONANYWHERE (PLANO GRATUITO)
## GUIA PARA USUÁRIOS WINDOWS 10 (CMD), NAVEGADOR E RESOLUÇÃO DE ERROS

Este guia orienta o deploy da API Python / Flask do **Gestão X** no plano gratuito do **PythonAnywhere**, com suporte a banco de dados SQLite persistente, autenticação JWT, Delta Sync leve e CORS configurado.

> **NOTA IMPORTANTE PARA QUEM ESTÁ NO WINDOWS 10:**  
> Você **NÃO precisa de terminal Linux ou Bash instalado no seu computador Windows**.  
> Todo o processo do PythonAnywhere é feito diretamente no seu navegador de internet (Chrome, Edge, etc.) usando a interface web e o console do próprio site.

---

## 1. Criação da Conta no PythonAnywhere
1. Acesse: [https://www.pythonanywhere.com/pricing/](https://www.pythonanywhere.com/pricing/)
2. Clique no plano **"Create a Beginner account"** (100% gratuito, sem cartão de crédito).
3. Escolha o seu nome de utilizador (exemplo: `osdelltecnologia`).
   - A sua API terá a URL permanente: `https://osdelltecnologia.pythonanywhere.com`.
4. Confirme o seu endereço de email.

---

## 2. Upload do Código (Sem Terminal no seu PC)

### Método Fácil pelo Navegador (Recomendado para Windows 10):
1. No seu computador Windows 10, você já tem o arquivo ZIP pronto: `public/downloads/OSDEL_API_PythonAnywhere.zip` (ou compacte a pasta `backend_api`).
2. Acesse o painel do PythonAnywhere no navegador e clique na aba **"Files"**.
3. Na seção **Upload a file**, selecione o arquivo `OSDEL_API_PythonAnywhere.zip` e clique em **Upload**.
4. Agora clique na aba **"Consoles"** e abra um console **Bash** (que abre uma janela de terminal direto na página da web).
5. No terminal web, digite:
   ```bash
   mkdir -p ~/backend_api
   unzip OSDEL_API_PythonAnywhere.zip -d ~/backend_api
   cd ~/backend_api
   ```

---

## 3. Criação do Ambiente Virtual (Virtualenv)
No terminal web do PythonAnywhere (não no seu PC):
```bash
mkvirtualenv --python=/usr/bin/python3.10 gestaox-env
pip install -r requirements.txt
```
O prompt exibirá `(gestaox-env)`, indicando que as bibliotecas estão instaladas de forma isolada.

---

## 4. Inicialização do Banco de Dados
Ainda no console do navegador:
```bash
# Para iniciar em produção real com as contas bancárias Caixa, BAI e BFA configuradas:
python seed_db.py --clean
```

---

## 5. Configuração do Arquivo WSGI
1. No painel superior do PythonAnywhere, clique na aba **"Web"**.
2. Clique no botão azul **"Add a new web app"**.
3. Escolha a opção **Manual configuration (including virtualenvs)** e selecione **Python 3.10**.
4. Na seção **Virtualenv**, informe o caminho exato:
   ```
   /home/<seu-usuario>/.virtualenvs/gestaox-env
   ```
   *(Substitua `<seu-usuario>` pelo seu nome de usuário real)*.
5. Na seção **Code**, clique no link do arquivo **WSGI configuration file** (exemplo: `/var/www/<seu-usuario>_pythonanywhere_com_wsgi.py`).
6. Apague todo o conteúdo padrão e cole a seguinte configuração de produção:

```python
import sys
import os

project_home = '/home/<seu-usuario>/backend_api'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ['SECRET_KEY'] = 'osdel-tecnologia-seguranca-jwt-2026'
os.environ['JWT_SECRET_KEY'] = 'osdel-jwt-chave-mestra-producao-2026'
os.environ['DATABASE_URL'] = f'sqlite:///{project_home}/gestaox.db'

from app import app as application
```
7. Clique em **Save** no canto superior direito.

---

## 6. Publicação e Teste da API
1. Volte à aba **"Web"**.
2. Clique no grande botão verde **"Reload <seu-usuario>.pythonanywhere.com"**.
3. Abra uma nova aba no navegador e teste a rota de integridade:
   ```
   https://<seu-usuario>.pythonanywhere.com/api/v1/health
   ```
   Deverá receber a resposta JSON:
   ```json
   {
     "engine": "Flask + SQLAlchemy + SQLite",
     "status": "healthy",
     "success": true
   }
   ```

---

## 7. PREVISÃO DE ERROS FREQUENTES E COMO EVITÁ-LOS OU REPARÁ-LOS

### ⚠️ Erro A: `502 Bad Gateway` ou `Something went wrong: Error running WSGI application`
- **Sintoma:** O link da API mostra uma página de erro do PythonAnywhere.
- **Diagnóstico Rápido:**
  1. Vá até a aba **Web** no PythonAnywhere.
  2. Role até a seção **Log files** e clique em **Error log** (`/var/log/<seu-usuario>.error.log`).
  3. Veja a última linha do log. Ela diz exatamente o que falhou.
- **Causas Comuns e Reparos:**
  - *Erro `No module named 'flask_cors'` ou outro pacote:* Abra a aba Consoles -> Bash e execute `workon gestaox-env && pip install -r requirements.txt`.
  - *Erro `FileNotFoundError` ou `ModuleNotFoundError: No module named 'app'`:* O caminho no arquivo WSGI está com o nome de usuário errado ou a pasta não é `backend_api`. Abra o arquivo WSGI e corrija `project_home = '/home/<seu-usuario>/backend_api'`.
  - Após corrigir, clique sempre em **Reload** na aba Web.

### ⚠️ Erro B: O site no Vercel não carrega dados da API (Bloqueio CORS / Mixed Content)
- **Causa:** O site na Vercel roda em `https://` seguro. Se você colocar `http://` (sem o `s`) na URL da API, o navegador bloqueia por segurança.
- **Reparo:**
  - Verifique se a variável `VITE_API_BASE_URL` na Vercel e no arquivo `.env` do seu projeto começa estritamente com `https://` (ex: `https://osdelltecnologia.pythonanywhere.com`).
  - Nunca coloque uma barra `/` no final da URL.

### ⚠️ Erro C: O plano gratuito expirar após 3 meses
- **Causa:** O PythonAnywhere Free requer que você confirme que o app ainda está ativo a cada 90 dias.
- **Prevenção:**
  - Eles enviam um e-mail com 7 dias de antecedência.
  - Basta entrar no site, ir na aba **Web** e clicar no botão verde: *"Run until 3 months from today"*. O site continua ativo sem pagar nada.

### ⚠️ Erro D: No seu Windows 10 CMD: `'python'` ou `'npm'` não é reconhecido
- **Causa:** O instalador do Python ou Node.js foi instalado sem marcar a opção "Add to PATH".
- **Reparo:**
  1. No Windows 10, baixe o instalador oficial do Python em [python.org](https://www.python.org).
  2. Marque a caixinha `☑ Add python.exe to PATH` antes de clicar em instalar.
  3. Feche e abra o Prompt de Comando (CMD) novamente.

---

## 8. Atualização de Versões do Backend
Quando fizer novas alterações:
1. Faça upload do novo arquivo pelo menu **Files** ou envie via git no console web.
2. Na aba **Web**, clique no botão **"Reload"**. A atualização entra no ar em 2 segundos.
