# GUIA OFICIAL DE DEPLOY 100% GRATUITO
## Vercel (Frontend & Serverless Node.js) + Supabase (PostgreSQL Grátis)
### OSDEL Gestão X · TV por Cabo & Fibra Óptica

---

## 🚀 VISÃO GERAL DA NOVA ARQUITETURA
Você migrou com sucesso o projeto para uma arquitetura moderna, unificada e sem custos mensais:
- **Frontend**: React 19 + Vite (compilado para a CDN ultrarrápida da Vercel).
- **Backend**: Node.js Serverless Functions (`/api/*`) na Vercel (sem necessidade de servidor Python ou PythonAnywhere).
- **Banco de Dados**: PostgreSQL Gratuito no **Supabase** (com suporte a UUIDs, concorrência ACID e backups).
- **APKs Móveis e Desktop**: Conectam diretamente à URL da sua Vercel com CORS liberado.

---

## PASSO 1: CRIAR O BANCO DE DADOS NO SUPABASE (GRÁTIS)

1. Aceda a [https://supabase.com](https://supabase.com) e crie uma conta gratuita (ou faça login com o GitHub).
2. Clique no botão **"New Project"**.
3. Preencha os dados:
   - **Name**: `osdel-gestao-x`
   - **Database Password**: Escolha uma senha segura e anote-a.
   - **Region**: Selecione a mais próxima (ex: `eu-central-1` ou `eu-west-1`).
   - **Pricing Plan**: Selecione o plano **Free ($0/mês)**.
4. Clique em **"Create new project"** e aguarde cerca de 1 a 2 minutos.

### Executar o Script de Tabelas (1 Clique):
1. No menu lateral esquerdo do Supabase, clique no ícone **SQL Editor** (`>_`).
2. Clique no botão verde **"+ New Query"**.
3. Abra o ficheiro `supabase_schema.sql` deste projeto, copie todo o seu conteúdo e cole no editor do Supabase.
4. Clique no botão verde **"Run"** (ou `Ctrl + Enter`).
5. Pronto! Todas as tabelas (`clients`, `contracts`, `invoices`, `payments`, `users`, `financial_accounts`, `expenses`, etc.), índices de busca rápida, utilizador master `deezy` e contas financeiras serão criados instantaneamente.

### Obter as Chaves de Conexão:
1. No menu lateral esquerdo do Supabase, clique em **Project Settings** (ícone de engrenagem) -> **API**.
2. Copie os seguintes valores:
   - **Project URL** (ex: `https://xyzcompany.supabase.co`)
   - **anon / public key** (chave longa que começa com `ey...`)
   - **service_role key** (chave de administração opcional para o backend)

---

## PASSO 2: HOSPEDAR NA VERCEL (100% GRÁTIS)

1. Aceda a [https://vercel.com](https://vercel.com) e faça login com a sua conta GitHub.
2. Clique no botão **"Add New..."** -> **"Project"**.
3. Selecione o repositório do seu projeto **Gestão X** e clique em **"Import"**.
4. Nas configurações do projeto (**Project Settings**):
   - **Framework Preset**: Deixe selecionado **Vite**.
   - **Root Directory**: `./` (padrão).
   - **Build Command**: `npm run build` (padrão).
   - **Output Directory**: `dist` (padrão).
5. Abra a secção **Environment Variables** (Variáveis de Ambiente) e adicione as seguintes variáveis:

| Nome da Variável | Valor | Descrição |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://seu-projeto.supabase.co` | A URL copiada do Supabase |
| `SUPABASE_ANON_KEY` | `sua-chave-anon-aqui` | A chave pública copiada do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `sua-service-key-aqui` | A chave de serviço do Supabase |
| `JWT_SECRET` | `osdel-master-2026-segredo` | Chave para assinar os tokens |
| `PORT` | `3000` | Porta padrão |

6. Clique no botão azul **"Deploy"**.
7. Em menos de 2 minutos, o seu sistema estará online com domínio próprio gratuito (ex: `https://gestao-x.vercel.app`)!

---

## PASSO 3: TESTAR E VALIDAR A SINCRONIZAÇÃO

1. Abra a URL gerada pela Vercel no navegador.
2. Inicie sessão com:
   - **Utilizador**: `deezy`
   - **Palavra-passe / PIN**: `1234`
3. No canto inferior ou na barra de navegação, abra o **Centro de Sincronização**:
   - Clique em **"Diagnosticar Conexão"**.
   - O sistema fará o teste completo da API Vercel Serverless e do Supabase PostgreSQL, exibindo todos os indicadores com status **Sucesso (Verde)**.
4. Qualquer cliente, fatura ou pagamento lançado no balcão ou no telemóvel será sincronizado em milissegundos para o Supabase!

---

## 📱 COMO FICA O APK DO CLIENTE E O ELECTRON DESKTOP?

- **No APK e no Desktop**: Eles continuam funcionando exatamente como antes, mas agora comunicam com a URL da sua Vercel (`https://sua-app.vercel.app`), com carregamento instantâneo e sem risco de expiração do servidor!
