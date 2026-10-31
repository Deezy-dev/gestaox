# Plano de Implementação: OSDEL ISP & Telecom (Versão Produção e Hospedagem)

Com base nas decisões confirmadas, este plano estabelece as melhorias críticas para colocar o sistema em produção imediata, com consistência financeira absoluta, sincronização robusta (Web, Electron Desktop e APKs Android), chat corporativo e com clientes estilo Facebook Messenger, perfis completos e Inteligência Artificial analítica.

---

## 1. Gestão Financeira & Prevenção Rigorosa de Duplicados

### 1.1 Bloqueio e Idempotência de Faturas e Pagamentos
- **Validação de Duplicidade por Competência (`Mês/Ano`) e Serviço**:
  - Antes de registrar nova fatura ou mensalidade, o sistema verifica se já existe lançamento pendente ou quitado para o mesmo `cliente_id` e competência (ex.: `03/2025 - Internet Fibra 200MB`).
  - Em caso de duplicidade, exibe modal de aviso com link direto para a fatura existente e impede o lançamento duplicado.
- **Validação de Duplicidade por Referência Bancária / TPA / Comprovativo**:
  - Verificação imediata do número de referência (`reference`, `txid` ou `nº de operação bancária`). Se a referência já constar na base (mesmo banco ou outro), o lançamento é bloqueado com alerta de segurança ("Referência já liquidada na data X pelo operador Y").
- **Conciliação e Livro Razão Seguro**:
  - Saldo em tempo real com validação de entrada/saída por conta (Caixa Geral, Banco BAI, BFA, Millenium Atlântico, etc.).
  - Impedimento de exclusão acidental de faturas que possuam pagamentos associados; estorno formal auditado.

---

## 2. Central de Comunicação Estilo Facebook Messenger

### 2.1 Interface & Experiência de Usuário
- **Layout Facebook Messenger Dual-Panel**:
  - Painel lateral com abas: **Clientes** (tickets/suporte/avisos de fatura) e **Equipe Interna** (chat entre funcionários, técnicos de campo e gerência).
  - Indicador de presença e status (Online/Offline, visto por último, digitando...).
  - Badge de mensagens não lidas e pesquisa rápida por cliente, telefone ou membro da equipe.
- **Área de Conversa Rica**:
  - Balões estilo Messenger com carimbo de hora, confirmação de envio e leitura (✓✓).
  - Envio de comprovativos, anexos de imagem e respostas rápidas predefinidas (ex.: "Sua fatura de Março vence hoje", "Técnico a caminho da morada", "Pagamento validado com sucesso").
  - Painel lateral recolhível à direita com perfil do cliente/colaborador, histórico de faturas pendentes e morada/PDO para atendimento rápido.

---

## 3. Inteligência Artificial Gerencial & Análise de Pagamentos

### 3.1 Gerador e Explicador de Relatórios Financeiros
- Integração do modelo `gemini-3.8-flash` via API proxy `/api/ai/*`:
  - **Explicador Executivo**: Analisa o faturamento mensal, taxa de inadimplência (% pago vs % em atraso), ticket médio por plano de fibra/TV e saldo disponível nos bancos.
  - **Auditor de Pagamentos & Alertas de Anomalias**: Identifica divergências de recebimentos, pagamentos sem referência válida, picos de inadimplência por bairro/PDO e sugere ações de cobrança amigável via WhatsApp/SMS.
  - **Gerador de Relatórios em PDF / Markdown / WhatsApp**: Produção em 1 clique de resumos executivos para a diretoria e balancetes periódicos.

---

## 4. Perfis Completos de Usuários e Equipe Técnica

- **Ficha Cadastral e Operacional Completa**:
  - Foto de perfil, cargo, departamento (Financeiro, Suporte NOC, Técnico de Campo, Atendimento Comercial).
  - Níveis de acesso e permissões (RBAC: Admin, Gerente, Caixa, Técnico).
  - Dados de contato, morada, documentos de identificação (BI/NIF), histórico de atividades no sistema e auditoria de ações (quem gerou, quem recebeu, quem deu baixa).

---

## 5. Sincronização Robusta (Web, Electron Desktop e APKs Android)

- **Garantia de Integridade e Offline-First**:
  - Reforço do mecanismo de fila de sincronização (`online-first-sync.ts`) com verificação de colisão e timestamp mais recente.
  - Sincronização fluida com a API do backend PythonAnywhere (`https://osdelltecnologia.pythonanywhere.com`), com retry exponencial automático e preservação local no IndexedDB/LocalStorage.
  - Atualização dos scripts de build de Electron (`electron_app/`) e APK Android (`clienteapk/`) para apontar para as rotas seguras e versionadas.

---

## 6. Verificação de Código, Compilação e Prontidão para Hospedagem

- Execução de `compile_applet` e `lint_applet` sem qualquer erro TypeScript ou warning obsoleto.
- Preparação de guias e rotas para deploy imediato no ambiente de produção.
