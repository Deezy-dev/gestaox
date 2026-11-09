# CAPÍTULO 4 · DEPLOY DO FRONTEND NA VERCEL (PLANO GRATUITO)

Este guia orienta a publicação da interface Web do **Gestão X** na **Vercel** com custo zero, suporte a HTTPS automático, CDN global de baixa latência e atualização contínua (CI/CD).

---

## 1. Como Criar Conta na Vercel
1. Acesse o site oficial: [https://vercel.com/signup](https://vercel.com/signup).
2. Escolha **"Continue with GitHub"** (Recomendado, pois simplifica a conexão com o repositório).
3. Autorize o acesso da Vercel à sua conta do GitHub.
4. Escolha o plano **Hobby (Free)**, que oferece largura de banda ilimitada e deploys automáticos sem custos.

---

## 2. Como Conectar o GitHub
1. Caso o seu projeto ainda não esteja no GitHub:
   - Crie um novo repositório privado ou público no GitHub chamado `gestaox`.
   - No terminal do seu computador, execute:
     ```bash
     git init
     git add .
     git commit -m "feat: release gestao x v2.0"
     git branch -M main
     git remote add origin https://github.com/<seu-usuario>/gestaox.git
     git push -u origin main
     ```
2. No painel da Vercel, clique no botão **"Add New..."** no canto superior direito e selecione **"Project"**.

---

## 3. Como Importar o Projeto
1. Na lista de repositórios do GitHub, localize o repositório `gestaox` e clique em **"Import"**.
2. No campo **Root Directory**, se o seu projeto estiver organizado na pasta `gestaox/frontend`, clique em **Edit** e selecione `gestaox/frontend` (ou mantenha `./` se o repositório contiver diretamente o frontend na raiz).
3. No campo **Framework Preset**, a Vercel detectará automaticamente **Vite**.
4. Verifique as configurações de compilação:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

---

## 4. Como Configurar Variáveis de Ambiente
Na tela de importação do projeto, expanda a seção **"Environment Variables"** e adicione as seguintes variáveis:

| Nome da Variável | Valor Recomendado | Descrição |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://<seu-usuario>.pythonanywhere.com` | URL pública da API no PythonAnywhere |
| `VITE_APP_NAME` | `Gestão X` | Nome comercial exibido no cabeçalho |
| `VITE_COMPANY_NAME` | `OSDEL TECNOLOGIA` | Razão social da empresa |
| `VITE_DEFAULT_SERVICE_MODE`| `combo` | Modalidade padrão (`fibra`, `tv` ou `combo`)|

---

## 5. Como Publicar
1. Clique no botão azul **"Deploy"**.
2. O pipeline da Vercel executará:
   - `npm install`
   - `npm run build`
   - Otimização e minificação de assets
   - Distribuição em servidores Edge globais
3. Em menos de 60 segundos, o projeto estará no ar com uma URL do tipo `https://gestaox.vercel.app` com certificado SSL/HTTPS gratuito ativo.

---

## 6. Como Atualizar uma Versão Posteriormente
Graças à integração com o Git, qualquer atualização futura é 100% automatizada:
1. Faça as alterações no código local.
2. Envie as modificações para o branch principal do GitHub:
   ```bash
   git add .
   git commit -m "fix: melhorias na emissão de faturas"
   git push origin main
   ```
3. A Vercel detectará o push instantaneamente, recompilará o projeto e publicará a nova versão sem derrubar o sistema (Zero Downtime).
