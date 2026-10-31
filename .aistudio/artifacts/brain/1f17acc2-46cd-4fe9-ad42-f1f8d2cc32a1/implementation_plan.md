# Plano de Implementação: Otimização de Clientes, Sincronização Silenciosa e Desempenho Local

Este plano detalha o aprimoramento completo do sistema **OSDEL Gestão X** com foco nas três áreas selecionadas:
1. **Sincronização visual silenciosa em segundo plano com aviso discreto**
2. **Listagem de clientes com pesquisa multicritério e filtros avançados**
3. **Desempenho ultrarrápido com cache local resiliente e sem travamentos**

---

## 1. Sincronização Silenciosa com Aviso Discreto
- **Comportamento não-invasivo:** A sincronização com a API do PythonAnywhere rodará totalmente em segundo plano (background worker) sem bloquear botões, telas ou formulários.
- **Indicador Visual Discreto na Barra Superior (`SyncStatusPill`):**
  - Ícone sutil de nuvem com micro-ponto luminoso verde (Sincronizado) / âmbar (A atualizar em 2º plano) / cinzento (Trabalho local offline).
  - Texto conciso com hora da última atualização (ex.: *"Atualizado há momentos"*, *"4 clientes sincronizados"*).
  - Modal expansível apenas sob demanda quando o usuário clicar no indicador para ver o log técnico ou disparar verificação manual.
- **Feedback Discreto:** Toast mínimo (apenas quando novos dados chegarem da nuvem ou ao recuperar conexão), sem alertas intrusivos ou ruídos na tela.

---

## 2. Listagem de Clientes com Pesquisa e Filtros Avançados (`ClientsPage`)
- **Pesquisa Multicritério Instantânea:**
  - Busca inteligente unificada por:
    - **Nome do Cliente** (ex: *António Pedro*)
    - **Código** (ex: *CLI-00001*)
    - **Telefone** e **Telefone Alternativo**
    - **Código da Residência / Casa** (ex: *G1-C45B*, *Rua 12*)
    - **NIF / Bilhete de Identidade (BI)**
    - **Caixa PDO e Modem ONU** (ex: *PDO-04*, *ONU-HG8310*)
  - Atualização instantânea com debounce de 150ms sem atrasos na digitação.
- **Filtros e Chips Rápidos:**
  - Filtro por Serviço: *Todos*, *TV Comunitária*, *Internet Fibra (FTTH)*, *Pacote Combo*.
  - Filtro por Estado Operacional: *Todos*, *Ativos (Online)*, *Em Atraso (Risco de Corte)*, *Suspensos (>3m)*, *Novos Registos*.
  - Filtro Geográfico por Bairro / Rua principal de atendimento (Golf I, Golf II, Rua 12, Rua 13, etc.).
- **Tabela e Ações Rápidas Enriquecidas:**
  - Exibição limpa de dados essenciais: avatar com iniciais, código, casa, contacto telefónico clicável com atalho para WhatsApp, valor da mensalidade (em Kwanzas) e data de vencimento.
  - Ações rápidas diretas na linha: Ver perfil completo, Emitir fatura/recibo, Copiar credenciais do app do cliente, e Trocar estado.

---

## 3. Desempenho e Cache Local Ultrarrápido
- **Carregamento Local Imediato (0ms):**
  - Leitura instantânea dos dados na inicialização direto da memória/localStorage antes mesmo de qualquer chamada de rede.
  - Zero congelamento ou spinner de carregamento longo ao alternar entre páginas e abas.
- **Mesclagem Inteligente de Registros:**
  - Função de conciliação que une registros do PythonAnywhere com mutações locais sem perda de dados e sem sobrescrever edições feitas localmente.
  - Normalização antecipada de todos os campos (`fullName`/`full_name`, `serviceType`/`service_type`) para indexação em memória ultraveloz.
- **Resiliência a Quedas de Conexão:**
  - Se a internet oscilar ou o servidor estiver indisponível, o sistema continua trabalhando a 100% de velocidade e reenvia dados silenciosamente assim que restabelecer contato.

---

## 4. Fases de Execução
- **Fase 1:** Atualização do motor `online-first-sync.ts` e do componente `sync-status-pill.tsx` para sincronização em segundo plano limpa e discreta.
- **Fase 2:** Reformulação e enriquecimento da interface de `ClientsPage` (`src/pages/business.tsx`) com a nova barra de pesquisa multicritério, chips de filtro rápido e tabela aprimorada.
- **Fase 3:** Validação completa de compilação, testes de velocidade de renderização e checagem de integridade com o banco PythonAnywhere.
