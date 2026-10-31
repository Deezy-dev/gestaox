# CAPÍTULO 9 · DICIONÁRIO DE VARIÁVEIS DE AMBIENTE

As variáveis de ambiente do **Gestão X** foram estritamente segregadas entre **Frontend** e **Backend** para garantir que credenciais e segredos de servidor nunca vazem para o código executado nos navegadores ou dispositivos móveis dos clientes.

---

## 1. Variáveis do Frontend (`gestaox/frontend/.env`)

As variáveis do frontend devem sempre possuir o prefixo `VITE_` para que o empacotador Vite as exponha de forma segura:

| Variável | Exemplo de Valor | Obrigatória? | Descrição |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://osdelltecnologia.pythonanywhere.com` | **Sim** | URL base da API REST para requisições HTTP |
| `VITE_APP_NAME` | `Gestão X` | Não | Nome exibido na barra de título e ecrãs |
| `VITE_COMPANY_NAME` | `OSDEL TECNOLOGIA` | Não | Nome da empresa exibido em cabeçalhos |
| `VITE_DEFAULT_SERVICE_MODE` | `combo` | Não | Modalidade inicial (`fibra`, `tv` ou `combo`) |
| `VITE_SYNC_INTERVAL_MS` | `30000` | Não | Intervalo do ciclo de sincronização em milissegundos |

---

## 2. Variáveis do Backend (`gestaox/backend/.env`)

Estas variáveis residem exclusivamente no servidor e controlam a segurança, banco de dados e políticas de acesso:

| Variável | Exemplo de Valor | Obrigatória? | Descrição |
| :--- | :--- | :--- | :--- |
| `FLASK_ENV` | `production` | **Sim** | Modo de execução (`development` ou `production`) |
| `FLASK_DEBUG` | `0` | **Sim** | Ativa ou desativa o depurador interativo |
| `PORT` | `5000` | Não | Porta do servidor web (quando não executado via WSGI) |
| `SECRET_KEY` | `ch@ve-ultr@-secur@-osdel-2026-xyz` | **Sim** | Segredo para assinatura de cookies e sessões |
| `JWT_SECRET_KEY` | `jwt-sec-osdel-operacoes-luanda-2026` | **Sim** | Chave privada para assinatura dos tokens JWT |
| `DATABASE_URL` | `sqlite:///gestaox.db` | **Sim** | String de conexão SQLite ou PostgreSQL |
| `ALLOWED_ORIGINS` | `https://gestaox.vercel.app,http://localhost:3000` | **Sim** | Origens autorizadas a consumir a API via CORS |
| `SUPERADMIN_USERNAME`| `deezy` | Não | Utilizador padrão do Super Administrador |
| `SUPERADMIN_PASSWORD`| `osdel@master#2026` | Não | Palavra-passe inicial do Super Administrador |

---

## 3. Boas Práticas de Gestão de Chaves
1. **Nunca envie arquivos `.env` para o repositório público**: O arquivo `.gitignore` já está configurado para ignorar qualquer arquivo terminado em `.env`.
2. **Utilize geradores de alta entropia para as chaves secretas**:
   No terminal, execute:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
3. **Mantenha o arquivo `.env.example` atualizado** sempre que uma nova variável for introduzida na aplicação.
