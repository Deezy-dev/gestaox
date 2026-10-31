# 📘 MANUAL COMPLETO DE OPERAÇÃO, HOSPEDAGEM E ENGENHARIA
## OSDEL TECNOLOGIA · GESTÃO X (TV POR CABO & INTERNET FIBRA ÓPTICA)

---

### GUIA OFICIAL DE PRODUÇÃO, WINDOWS 10 (CMD), DEPLOY GRATUITO E RESOLUÇÃO DE ERROS
**Ambiente do Usuário:** Windows 10 (Prompt de Comando - CMD), Navegador Web (Chrome/Edge), Sem necessidade de terminal Linux local.  
**Infraestrutura:** Vercel (Frontend Grátis) + PythonAnywhere (Backend Flask/SQLite Grátis) + Electron Desktop + APKs Android.

---

## 📑 ÍNDICE GERAL

1. [Visão Geral da Arquitetura do Sistema](#1-visão-geral-da-arquitetura-do-sistema)
2. [Hospedagem no PythonAnywhere Free (Feito 100% pelo Navegador, Sem Terminal no seu PC)](#2-hospedagem-no-pythonanywhere-free-feito-100-pelo-navegador-sem-terminal-no-seu-pc)
3. [Operação no Windows 10 via Prompt de Comando (CMD) e Scripts .BAT](#3-operação-no-windows-10-via-prompt-de-comando-cmd-e-scripts-bat)
4. [Como Funciona a Gestão Financeira, Caixa e Tesouraria](#4-como-funciona-a-gestão-financeira-caixa-e-tesouraria)
5. [Autenticação Unificada por PIN (Web, Electron e APKs)](#5-autenticação-unificada-por-pin-web-electron-e-apks)
6. [Como Limpar os Dados de Demonstração e Iniciar com Dados Reais](#6-como-limpar-os-dados-de-demonstração-e-iniciar-com-dados-reais)
7. [Como Fazer o Build dos Aplicativos Móveis (APKs) no Windows 10](#7-como-fazer-o-build-dos-aplicativos-móveis-apks-no-windows-10)
8. [Como Fazer o Build do Aplicativo Desktop Windows (.exe) no Windows 10](#8-como-fazer-o-build-do-aplicativo-desktop-windows-exe-no-windows-10)
9. [Engenharia Futura: Cortes Automáticos com MikroTik & FreeRADIUS](#9-engenharia-futura-cortes-automáticos-com-mikrotik--freeradius)
10. [GUIA DEFINITIVO DE PREVENÇÃO E RESOLUÇÃO DE ERROS (TROUBLESHOOTING)](#10-guia-definitivo-de-prevenção-e-resolução-de-erros-troubleshooting)
11. [Tabela de Credenciais e Acessos Padrão](#11-tabela-de-credenciais-e-acessos-padrão)

---

## 1. VISÃO GERAL DA ARQUITETURA DO SISTEMA

O ecossistema **OSDEL Gestão X** foi desenvolvido em uma arquitetura híbrida de alta resiliência e custo zero de hospedagem:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ECOSSISTEMA GESTÃO X                            │
├──────────────────┬──────────────────┬─────────────────┬────────────────┤
│   FRONTEND WEB   │ DESKTOP WINDOWS  │   APK CLIENTE   │   APK EQUIPA   │
│   (Vercel Grátis)│ (.exe Electron)  │ (Capacitor/App) │ (Técnico/PMA)  │
└────────┬─────────┴────────┬─────────┴────────┬────────┴────────┬───────┘
         │                  │                  │                 │
         └──────────────────┼──────────────────┴─────────────────┘
                            │ (Chamadas HTTPS REST / Delta Sync)
                            ▼
              ┌───────────────────────────┐
              │  BACKEND REST API (Flask) │
              │  PythonAnywhere (Free)    │
              │  Banco SQLite Persistente │
              └─────────────┬─────────────┘
                            ▼ (Futuro)
              ┌───────────────────────────┐
              │ MikroTik RouterOS / RADIUS│
              │ Suspensão/Corte Automático│
              └───────────────────────────┘
```

---

## 2. HOSPEDAGEM NO PYTHONANYWHERE FREE (FEITO 100% PELO NAVEGADOR)

> **ATENÇÃO IMPORTANTE PARA QUEM USA WINDOWS 10:**  
> **Você NÃO precisa ter terminal Linux ou Bash instalado no seu computador.**  
> O PythonAnywhere roda na nuvem e fornece um terminal virtual Linux direto na tela do seu navegador (Google Chrome, Edge, etc.). Você só precisa acessar o site e digitar os comandos lá!

### Passo 2.1: Criar a Conta Gratuita
1. Acesse: [https://www.pythonanywhere.com](https://www.pythonanywhere.com) no seu navegador.
2. Clique em **Pricing & Signup** e escolha **Create a Beginner Account** (Gratuito, sem cartão de crédito).
3. Escolha seu nome de usuário (Exemplo: `osdelltecnologia` ou `tecnologiaosdel`).
4. Seu endereço público de API será: `https://seu_usuario.pythonanywhere.com`.
5. Confirme o e-mail de ativação que eles enviarem.

### Passo 2.2: Fazer Upload do Backend (Opção Fácil pelo Navegador)
Você já tem o arquivo `OSDEL_API_PythonAnywhere.zip` pronto para download na pasta `/public/downloads/`:
1. No painel do PythonAnywhere, clique na aba **Files** (no topo da página).
2. Na caixa **Upload a file**, clique em selecionar arquivo e envie o `OSDEL_API_PythonAnywhere.zip`.
3. Agora, clique na aba **Consoles** (no topo da página).
4. Em **Start a new console**, clique no link azul **Bash**.  
   *(Uma janela preta de terminal vai abrir diretamente dentro do seu navegador)*.
5. No terminal do navegador, digite os seguintes comandos (pressione `Enter` após cada linha):

```bash
mkdir -p ~/backend_api
unzip OSDEL_API_PythonAnywhere.zip -d ~/backend_api
cd ~/backend_api
```

### Passo 2.3: Criar o Ambiente Virtual Isolado
Ainda no terminal preto do navegador no PythonAnywhere, execute:

```bash
# 1. Cria o virtualenv com Python 3.10
mkvirtualenv --python=/usr/bin/python3.10 gestaox-env

# 2. Instala as bibliotecas necessárias (Flask, SQLAlchemy, PyJWT, etc.)
pip install -r requirements.txt
```

### Passo 2.4: Inicializar o Banco de Dados
Ainda no mesmo terminal do navegador:

- **Para iniciar em Produção Real (sem clientes fictícios de teste, com as contas bancárias Caixa, BAI e BFA):**
  ```bash
  python seed_db.py --clean
  ```

- **Ou para inicializar com dados de teste/demonstração:**
  ```bash
  python seed_db.py
  ```

### Passo 2.5: Configurar o Arquivo WSGI e Ativar o Site
1. No menu superior do PythonAnywhere, clique na aba **Web**.
2. Clique no botão azul **Add a new web app**.
3. Clique em **Next**, escolha **Manual Configuration** e selecione **Python 3.10**.
4. Na página que abrir:
   - Na seção **Virtualenv**, clique em *Enter path to a virtualenv* e digite:  
     `/home/seu_usuario/.virtualenvs/gestaox-env`  
     *(Substitua `seu_usuario` pelo seu nome de usuário no PythonAnywhere)*.
   - Na seção **Code**, clique no link azul do **WSGI configuration file** (algo como `/var/www/seu_usuario_pythonanywhere_com_wsgi.py`).
5. Uma tela de editor de texto vai abrir no navegador. **Apague tudo** o que estiver lá e cole este código:

```python
import sys
import os

project_home = '/home/seu_usuario/backend_api'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

os.environ['SECRET_KEY'] = 'osdel-tecnologia-seguranca-jwt-2026'
os.environ['JWT_SECRET_KEY'] = 'osdel-jwt-chave-mestra-producao-2026'
os.environ['DATABASE_URL'] = f'sqlite:///{project_home}/gestaox.db'

from app import app as application
```
*(Lembre-se de trocar `seu_usuario` pelo seu usuário real).*

6. Clique no botão verde **Save** no canto superior direito.
7. Volte à aba **Web** e clique no botão grande verde **Reload seu_usuario.pythonanywhere.com**.
8. Abra uma nova aba no seu navegador e teste:  
   `https://seu_usuario.pythonanywhere.com/api/v1/health`  
   Se aparecer `{"status":"healthy","success":true}`, sua API está **100% online e funcionando no mundo todo gratuitamente**!

---

## 3. OPERAÇÃO NO WINDOWS 10 VIA PROMPT DE COMANDO (CMD) E SCRIPTS .BAT

Para trabalhar no seu computador com Windows 10, você **NÃO precisa de comandos complexos**. O projeto já vem com scripts executáveis `.bat` prontos para rodar com **2 cliques**.

### 3.1. Como abrir o Prompt de Comando (CMD) na pasta do projeto:
1. Abra a pasta do projeto no Windows Explorer (`C:\seu-caminho\gestaox`).
2. Clique na barra de endereço da pasta (onde mostra o caminho).
3. Digite `cmd` e pressione `Enter`.
4. Uma janela preta do Prompt de Comando do Windows 10 abrirá exatamente dentro da pasta do projeto.

### 3.2. Comandos Principais no Windows 10 (CMD):

| Ação Desejada | Comando no Windows CMD | O que ele faz |
| :--- | :--- | :--- |
| **Iniciar o Sistema Web Local** | `npm run dev` ou `bun run dev` | Inicia o servidor local na porta 3000 (`http://localhost:3000`). |
| **Compilar o Sistema Web** | `npm run build` | Gera os arquivos otimizados na pasta `/dist`. |
| **Iniciar Desktop Fibra** | Clique duplo em `iniciar_fibra.bat` | Abre o aplicativo Desktop configurado para Fibra. |
| **Iniciar Desktop TV Cabo** | Clique duplo em `iniciar_tv_cabo.bat` | Abre o aplicativo Desktop configurado para TV. |
| **Gerar Executável .exe** | `npm run build:electron` | Compila o instalador oficial `.exe` para Windows. |
| **Verificar Arquivos na Pasta** | `dir` | Lista todos os arquivos da pasta atual. |
| **Sair ou Encerrar** | `Ctrl + C` (duas vezes) | Encerra um servidor em execução no CMD. |

---

## 4. COMO FUNCIONA A GESTÃO FINANCEIRA, CAIXA E TESOURARIA

O sistema opera com o princípio da **Partida Dobrada e Livro Caixa em Tempo Real**. Toda entrada e saída de dinheiro afeta diretamente as contas da empresa.

### 4.1. As 4 Contas Financeiras da Empresa:
1. **Caixa Geral (Balcão Golf I)**: Pagamentos em numerário (notas físicas entregues no balcão).
2. **Banco BAI (Arrecadação Principal)**: Transferências bancárias BAI Directo ou depósitos.
3. **Banco BFA (Operações & Fornecedores)**: Pagamentos BFA e liquidação de fornecedores.
4. **TPA / Multicaixa Express**: Pagamentos via cartão Multicaixa ou aplicativo Express.

### 4.2. Fluxo de uma Entrada de Dinheiro:
Quando um cliente realiza o pagamento da mensalidade:
1. O sistema registra o pagamento com recibo, cliente e mês de referência.
2. O valor é creditado na conta bancária correspondente.
3. O cliente passa instantaneamente para o estado **Activo**.
4. Caso exista fatura pendente, ela é marcada como **Paga**.

### 4.3. Prevenção de Faturas e Pagamentos Duplicados:
- **Por Mês/Competência:** O sistema bloqueia se o cliente já tiver a mensalidade do mesmo mês liquidada.
- **Por Referência Bancária:** Se o operador digitar uma referência ou comprovativo que já foi baixado, o sistema emite um alerta sonoro e bloqueia a duplicidade.

---

## 5. AUTENTICAÇÃO UNIFICADA POR PIN (WEB, ELECTRON E APKS)

Todos os colaboradores possuem credenciais idênticas e sincronizadas em todas as plataformas:

| Colaborador | Função | Utilizador | Palavra-passe | PIN Unificado |
| :--- | :--- | :--- | :--- | :---: |
| **Albert Mbuyi (Deezy)** | Super Admin Supremo & Director | `deezy` | `52863400#` | **9999** |
| **Eng. António Costa** | Boss (Comercial / Financeiro) | `boss` | `boss` | **8888** |
| **Dra. Luísa Antunes** | Gerente Administrativa | `admin` | `admin123` | **5555** |
| **Job Baptista (Mestre Job)** | Mestre de Rede / Piquete | `mestre.job` | `job` | **1111** |
| **Maria Teresa dos Santos** | Atendimento de Balcão & Caixa | `operador1` | `123456` | **1234** |
| **Hélder Manuel** | Técnico Instalador Fibra & TV | `helder` | `helder` | **2222** |

---

## 6. COMO LIMPAR OS DADOS DE DEMONSTRAÇÃO E INICIAR COM DADOS REAIS

Para começar a trabalhar com a sua empresa real hoje:
1. Inicie sessão como **Deezy** (Super Admin).
2. Aceda ao menu **Gerador de Credenciais** (`/credenciais-superadmin`) na barra lateral.
3. No canto superior direito, clique no botão vermelho: `🗑️ Limpar Dados p/ Produção`.
4. Digite os saldos reais de abertura do Caixa e dos Bancos.
5. Digite a palavra `PRODUCAO` e confirme.
6. O sistema limpa os clientes de teste, deixando o banco com **0 clientes**, pronto para a operação real.

---

## 7. COMO FAZER O BUILD DOS APLICATIVOS MÓVEIS (APKS) NO WINDOWS 10

Você **não precisa de Linux** para gerar os APKs do Android.

### Opção Recomendada (1 Clique via Arquivo .BAT):
1. Abra a pasta `clienteapk` no Windows Explorer.
2. Dê **dois cliques** no arquivo `GERAR_APK_AUTOMATICO.bat`.
3. O script do Windows compilará o código e gerará o APK release pronto para instalar em qualquer telefone Android.
4. Para o app dos técnicos, faça o mesmo na pasta `equipaapk\GERAR_APK_AUTOMATICO.bat`.

### Opção Manual no CMD do Windows 10:
```cmd
cd clienteapk
npm install
npm run build
npx cap sync android
cd android
gradlew.bat assembleRelease
```
O arquivo APK pronto estará em: `clienteapk\android\app\build\outputs\apk\release\app-release-unsigned.apk`.

---

## 8. COMO FAZER O BUILD DO APLICATIVO DESKTOP WINDOWS (.EXE) NO WINDOWS 10

Para criar o instalador `.exe` independente para computadores sem internet:

No CMD do Windows 10 na pasta raiz:
```cmd
npm run build
node electron_app\sync_dist.js
python scripts\package_electron.py
```
Ou simplesmente execute no CMD:
```cmd
npm run build:electron
```
Os executáveis `.exe` ficarão gravados na pasta `public\downloads\` e `electron_app\dist_fibra_exe\`.

---

## 9. ENGENHARIA FUTURA: CORTES AUTOMÁTICOS COM MIKROTIK & FREERADIUS

Quando a rede de Internet Fibra crescer:
- **Regra de Firewall Address List:** Bloqueio automático de navegação após o dia de tolerância configurado.
- **PPPoE Secret Profile:** Troca dinâmica de perfil para `plano-bloqueado` via API MikroTik.
- **Servidor FreeRADIUS:** Envio de pacotes CoA / Disconnect-Message (porta UDP 3799) restaurando a velocidade imediatamente após o pagamento.

---

## 10. GUIA DEFINITIVO DE PREVENÇÃO E RESOLUÇÃO DE ERROS (TROUBLESHOOTING)

Aqui estão as soluções para os 8 erros mais comuns enfrentados no Windows 10 e em hospedagens gratuitas:

---

### ERRO 1: `'python'`, `'pip'` ou `'npm'` não é reconhecido como um comando interno ou externo
- **Causa:** O Python ou o Node.js foi instalado no Windows 10 sem marcar a opção de adicionar ao PATH do sistema.
- **Como Evitar/Reparar:**
  1. Baixe o instalador do Python em [python.org](https://www.python.org).
  2. Na primeira tela de instalação, **MARQUE OBRIGATORIAMENTE A CAIXA**:  
     `☑ Add python.exe to PATH` (no rodapé da tela) antes de clicar em Install Now.
  3. Feche todas as janelas do Prompt de Comando (CMD) abertas e abra uma nova janela.
  4. Digite `python --version` para confirmar que agora funciona.

---

### ERRO 2: Porta 3000 ou 5000 Já em Uso (`EADDRINUSE: address already in use`)
- **Causa:** Um processo anterior do Node.js, Vite ou Python ficou rodando em segundo plano no Windows 10.
- **Como Evitar/Reparar no Windows 10 CMD:**
  1. Descubra o número do processo que está ocupando a porta:
     ```cmd
     netstat -ano | findstr :3000
     ```
     *(Aparecerá uma linha no final mostrando o PID, exemplo: `14520`)*.
  2. Finalize o processo travado com o comando:
     ```cmd
     taskkill /PID 14520 /F
     ```
  3. Pronto! A porta estará livre para iniciar novamente com `npm run dev`.

---

### ERRO 3: No PythonAnywhere: `502 Bad Gateway` ou `Error running WSGI application`
- **Causa:** Caminho errado de diretório no arquivo WSGI ou biblioteca faltando no virtualenv.
- **Como Diagnosticar com 1 Clique (Pelo Navegador):**
  1. Entre na sua conta no PythonAnywhere e clique na aba **Web**.
  2. Na seção **Log files**, clique no link do **Error log** (`/var/log/seu_usuario.error.log`).
  3. Role até o final da página. A última linha dirá o motivo exato em inglês (exemplo: `ModuleNotFoundError: No module named 'flask_cors'`).
- **Como Reparar:**
  1. Se for erro de módulo faltando: abra a aba **Consoles** -> **Bash** e digite `workon gestaox-env && pip install -r requirements.txt`.
  2. Se for erro de caminho: abra a aba **Web**, edite o arquivo WSGI e verifique se `project_home = '/home/seu_usuario/backend_api'` possui o seu nome de usuário correto (sem erros de digitação).
  3. Clique em **Reload** na aba Web.

---

### ERRO 4: Bloqueio de CORS ou Mixed Content no Navegador
- **Sintoma:** O app abre no navegador mas os dados não carregam, e no console (F12) aparece: `Blocked loading mixed active content http://...` ou `Access-Control-Allow-Origin missing`.
- **Causa:** O frontend está em `https://` seguro (Vercel) e está tentando chamar a API do PythonAnywhere usando `http://` (sem o `s`), ou a URL da API está com barra extra no final.
- **Como Evitar/Reparar:**
  1. A URL da API deve **sempre ter HTTPS**: `https://seu_usuario.pythonanywhere.com`.
  2. No painel do Gestão X, acesse o menu **API & Desktop** (`/api-pythonanywhere`).
  3. No campo de URL da API, confira se está exatamente `https://seu_usuario.pythonanywhere.com` (sem barra no final).
  4. Clique no botão **Testar Conexão**. O sistema testará a latência e confirmará a conexão verde.

---

### ERRO 5: Erro de Banco Bloqueado no SQLite (`database is locked`)
- **Causa:** Duas escritas simultâneas ocorreram na mesma fração de milissegundo no arquivo SQLite.
- **Como o Sistema Já Está Protegido:**
  O arquivo `config.py` e `models.py` da API já configuram o SQLite com:
  - `timeout=30` (espera até 30 segundos pela liberação em vez de dar erro).
  - `check_same_thread=False`.
  - Modo WAL ativado (`PRAGMA journal_mode=WAL`), que permite leituras e gravações concorrentes sem travar.

---

### ERRO 6: Erro de Build de APK no Windows (`JAVA_HOME is not set`)
- **Causa:** O compilador do Android (Gradle) precisa saber onde o Java (JDK) está instalado no seu Windows 10.
- **Como Evitar/Reparar:**
  1. Instale o Java JDK 17 ou 21 gratuito (Eclipse Temurin ou Oracle).
  2. No Windows 10, pressione a tecla `Windows` e digite: `variáveis de ambiente`.
  3. Clique em **Editar as variáveis de ambiente do sistema**.
  4. Clique no botão **Variáveis de Ambiente...** no rodapé.
  5. Em **Variáveis do Sistema**, clique em **Novo...**:
     - Nome da variável: `JAVA_HOME`
     - Valor da variável: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x` (o caminho onde o Java foi instalado).
  6. Clique em OK e reinicie o Prompt de Comando.

---

### ERRO 7: Antivírus do Windows Defender Bloqueando os Arquivos `.bat` ou o `.exe`
- **Causa:** Como o executável `.exe` é gerado por você no seu próprio computador e não possui uma assinatura digital cara comprada da Microsoft/DigiCert, o Windows Defender pode emitir um aviso azul: *"O Windows protegeu o seu computador"*.
- **Como Evitar/Reparar:**
  1. No aviso azul do Windows, clique no link **Mais informações**.
  2. Clique no botão **Executar assim mesmo**.
  3. Para compilar sem interrupções: Adicione a pasta do projeto nas exclusões do Windows Defender (Configurações do Windows -> Segurança do Windows -> Proteção contra vírus e ameaças -> Gerenciar configurações -> Exclusões -> Adicionar exclusão -> Pasta).

---

### ERRO 8: O Pill de Sincronização Está com Círculo Vermelho ou "Offline"
- **Causa:** O computador está sem acesso à internet ou a API do PythonAnywhere ainda não foi iniciada.
- **Como Proceder:**
  1. **Fique tranquilo:** O sistema **continua funcionando normalmente no modo local/offline**! Você pode emitir faturas, cadastrar clientes e receber pagamentos sem travar a recepção.
  2. Quando a internet voltar: O sistema descarrega a fila de sincronização automaticamente (`sync_queue`) e o indicador voltará a ficar verde com o aviso *"100% Sincronizado"*.

---

## 11. TABELA DE CREDENCIAIS E ACESSOS PADRÃO

| Utilizador | Nome Completo | Função no Sistema | Senha Padrão | PIN Móvel (4 Dígitos) | Permissões |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `deezy` | Albert Mbuyi (Deezy) | Super Admin Supremo | `52863400#` | **9999** | Acesso Total a Tudo |
| `boss` | Eng. António Costa | Director Comercial | `boss` | **8888** | Comercial & Financeiro |
| `admin` | Dra. Luísa Antunes | Gerente Administrativa | `admin123` | **5555** | Administração & Equipa |
| `mestre.job` | Job Baptista (Mestre) | Líder Técnico de Piquete | `job` | **1111** | Ordens, Cortes e Estoque |
| `operador1` | Maria Teresa | Atendimento de Balcão | `123456` | **1234** | Caixa, Facturação e Clientes |
| `helder` | Hélder Manuel | Técnico de TV & Fibra | `helder` | **2222** | Ordens e Instalações |

---

**OSDEL TECNOLOGIA, LDA · Luanda, Angola**  
*Qualidade, Estabilidade e Conectividade para Angola.*
