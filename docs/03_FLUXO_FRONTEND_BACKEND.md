# CAPÍTULO 3 · FLUXO FRONTEND → BACKEND · GESTÃO X

## 1. Topologia de Comunicação
O ecossistema Gestão X adota uma arquitetura desacoplada e assíncrona com fallback em caso de rede instável:

```
[ Frontend Web (Vercel) ] ──┐
[ Desktop Electron ]      ──┼──> [ API REST Flask (PythonAnywhere) ] ──> [ SQLite / PostgreSQL ]
[ APK Android Cliente ]   ──┤
[ APK Android Staff ]     ──┘
```

---

## 2. Autenticação e Segurança (JWT)
1. O utilizador submete o formulário de login (`POST /api/v1/auth/login`).
2. O servidor valida as credenciais cifradas via `werkzeug.security.check_password_hash`.
3. Um par de tokens é emitido:
   - `access_token` (JWT válido por 8 horas, enviado no cabeçalho `Authorization: Bearer <token>`).
   - `refresh_token` (JWT com validade alargada para renovação silenciosa).
4. O cliente armazena a sessão em memória e em armazenamento seguro (`sessionStorage`/`localStorage`), permitindo que operadores acedam às rotas autorizadas com base nas suas permissões de papel (`admin`, `superadmin`, `tecnico`, `comercial`).

---

## 3. Estratégia de Sincronização Online-First
Para garantir que técnicos de campo e caixas de balcão nunca parem por falta de internet:
1. **Leitura Imediata**: Toda consulta é primeiro respondida pelo cache local ultra-rápido.
2. **Ciclo de Pulso em Segundo Plano**: A cada 30 segundos, o cliente invoca `GET /api/v1/sync/full-snapshot`.
3. **Resolução de Conflitos**: A entidade com timestamp mais recente prevalece.
4. **Disseminação Local**: O sistema utiliza a API nativa `BroadcastChannel('osdel_data_channel')` para sincronizar abas do navegador, janelas do Electron e telas do app simultaneamente.
