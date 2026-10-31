# MANUAL MESTRE DE ARQUITETURA DE SOFTWARE E SINCRONIZAÇÃO EMPRESARIAL UNIFICADA
## SISTEMA DE GESTÃO INTEGRADA · OSDEL TECNOLOGIA (WEB, ANDROID APK & ELECTRON DESKTOP)

---

### AUTOR: Arquiteto de Software Sênior & Especialista em Sistemas Distribuídos e ERPs
**Versão:** 4.0 - Especificação Técnica e Guia Passo a Passo Completo  
**Escopo:** Paridade Absoluta (100%) entre Plataformas, Backend Centralizado de Alta Performance, Sincronização Bidirecional em Tempo Real (WebSocket + Redis Pub/Sub), Motor Offline-First e Design System Unificado.

---

## ÍNDICE GERAL

1. [Princípios e Diretrizes Fundamentais da Arquitetura](#1-princípios-e-diretrizes-fundamentais-da-arquitetura)
2. [Topologia e Diagrama C4 do Sistema Distribuído](#2-topologia-e-diagrama-c4-do-sistema-distribuído)
3. [Design System Unificado & Experiência Multi-Plataforma](#3-design-system-unificado--experiência-multi-plataforma)
4. [Backend Centralizado (FastAPI / PostgreSQL Assíncrono / Redis)](#4-backend-centralizado-fastapi--postgresql-assíncrono--redis)
5. [Modelagem de Dados Universal, Idempotência e Auditoria](#5-modelagem-de-dados-universal-idempotência-e-auditoria)
6. [Motor de Sincronização Bidirecional em Tempo Real](#6-motor-de-sincronização-bidirecional-em-tempo-real)
7. [Motor de Persistência Offline-First & Resolução de Conflitos](#7-motor-de-persistência-offline-first--resolução-de-conflitos)
8. [Estrutura Universal de APIs (Endpoints Únicos e Idênticos)](#8-estrutura-universal-de-apis-endpoints-únicos-e-idênticos)
9. [Implementação no Web (React SPA + TanStack Query)](#9-implementação-no-web-react-spa--tanstack-query)
10. [Implementação no Desktop (Electron Standalone)](#10-implementação-no-desktop-electron-standalone)
11. [Implementação no Android APK (Capacitor / CLI 1-Clique)](#11-implementação-no-android-apk-capacitor--cli-1-clique)
12. [Segurança, Auditoria e Observabilidade Centralizada](#12-segurança-auditoria-e-observabilidade-centralizada)
13. [Roteiro de Implementação Passo a Passo (Checklist Executivo)](#13-roteiro-de-implementação-passo-a-passo-checklist-executivo)

---

## 1. PRINCÍPIOS E DIRETRIZES FUNDAMENTAIS DA ARQUITETURA

Para atingir a **paridade de 100%** de funcionalidades, design, dados e comportamento entre Web, Android APK e Electron Desktop sem duplicar esforço ou gerar versões defasadas, adotamos a regra:

> **"Single Source of Core, Universal Distribution, Zero Platform Logic Isolation"**

### Os 7 Pilares Mandatórios:
1. **Regra de Ouro da Lógica de Negócio:** Nenhuma regra financeira, cálculo de multa, validação fiscal ou autorização de acesso reside exclusivamente no cliente. O frontend executa apenas validações cosméticas e otimistas; a validação fática e imutável reside na camada de domínio da API Central.
2. **Identificadores Únicos Globais (UUID v4 / ULID):** Nenhum registro novo depende de auto-incremento de banco para existir. Tanto o Web, quanto o APK offline e o Desktop geram IDs globalmente únicos no momento do clique, permitindo relacionamento entre tabelas antes mesmo da conexão com o servidor.
3. **Optimistic UI com Reversão Determinística:** O usuário não espera latência de rede. Ao cadastrar um pagamento ou emitir uma ordem de serviço, a tela atualiza em 16ms. Se a requisição falhar no servidor, o estado local é revertido com alerta explicativo.
4. **Sincronização Incremental por Cursor de Versão:** A sincronização não transfere todo o banco de dados. Transfere apenas o `delta` (alterações ocorridas após o timestamp/versão que o cliente já possui).
5. **Comunicação Orientada a Eventos:** O backend emite eventos em tempo real via Redis Pub/Sub para todos os WebSockets ativos. Clientes recebem a notificação de mutação em menos de 50 milissegundos.
6. **Offline-First com Prioridade Online:** Se há internet, a gravação vai direto à API central e depois atualiza o cache local. Se a conexão cair, a operação cai na fila de mutação local (`IndexedDB` / `SQLite`), garantindo operação 24/7 para piquetes e técnicos de campo sem rede.
7. **Design System Monolítico Compartilhado:** Um único conjunto de componentes, paleta de cores (CSS Variables/Tailwind), ícones e tipografia é compartilhado entre as 3 plataformas. No Android, aplicam-se apenas micro-otimizações ergonômicas (haptic feedback, safe area de entalhe e pull-to-refresh).

---

## 2. TOPOLOGIA E DIAGRAMA C4 DO SISTEMA DISTRIBUÍDO

```
                                    +-------------------------------------------------------------+
                                    |                   USUÁRIOS E PLATAFORMAS                    |
                                    +-------------------------------------------------------------+
                                       |                           |                           |
                     +-----------------+           +---------------+           +---------------+
                     |                             |                           |
                     v                             v                           v
     +-------------------------------+ +-------------------------------+ +-------------------------------+
     |         NAVEGADOR WEB         | |       ANDROID APK (CLI)       | |       ELECTRON DESKTOP        |
     |   React 19 + TypeScript SPA   | |   React + Capacitor Native    | |  React + Electron Main Process|
     | IndexedDB Cache + TanStack Q. | | Local SQLite + BackgroundSync | | Local Cache + Local Database  |
     +-------------------------------+ +-------------------------------+ +-------------------------------+
                     |                             |                           |
                     | (HTTPS REST / WSS)          | (HTTPS REST / WSS)        | (HTTPS REST / WSS)
                     +-----------------------------+---------------------------+
                                                   |
                                                   v
                     +-------------------------------------------------------------+
                     |         NGINX REVERSE PROXY & SSL TERMINATION (Cloud)        |
                     +-------------------------------------------------------------+
                                                   |
                        +--------------------------+--------------------------+
                        |                                                     |
                        v (Port 8000 - REST)                                  v (Port 8001 - WebSocket)
     +----------------------------------------+            +----------------------------------------+
     |         FASTAPI ASYNC REST API         |            |         FASTAPI WEBSOCKET GATEWAY      |
     | - Validações de Negócio & Idempotência |            | - Conexões ativas persistentes (State) |
     | - Auth JWT / Roles / RBAC Centralizado |            | - Broadcast instantâneo multi-dispositivo
     | - Sincronização Delta (Push / Pull)    |            | - Ping/Pong Heartbeat automático       |
     +----------------------------------------+            +----------------------------------------+
                        |                                                     |
                        |                    +--------------------------------+
                        |                    |
                        v                    v
     +---------------------------------------------------------------------------------------------+
     |                                    REDIS 7 (PUB/SUB + CACHE)                                |
     | - Canal de Broadcast Universal: `channel:tenant:{id}:events`                                |
     | - Fila de Processamento em Background (Celery / ARQ)                                        |
     | - Cache de Sessões e Taxa de Throttle (Rate Limiting)                                       |
     +---------------------------------------------------------------------------------------------+
                        |
                        v
     +---------------------------------------------------------------------------------------------+
     |                                POSTGRESQL 16 (BANCO CENTRAL)                                 |
     | - Multi-tenant (Logical Partitioning ou Schema Isolation)                                   |
     | - Tabela de Auditoria com CDC (Change Data Capture)                                         |
     | - Índices com cobertura em `(tenant_id, updated_at DESC, version)`                         |
     +---------------------------------------------------------------------------------------------+
```

---

## 3. DESIGN SYSTEM UNIFICADO & EXPERIÊNCIA MULTI-PLATAFORMA

Para que o usuário tenha **100% de consistência visual**, o ecossistema utiliza uma biblioteca de estilos unificada:

### 3.1 Tokens de Design Obrigatórios

```css
/* Variáveis CSS Universais - Injetadas no index.html de Web, APK e Electron */
:root {
  /* Marca e Identidade OSDEL */
  --brand-primary: #106f53;        /* Verde Corporativo OSDEL */
  --brand-primary-hover: #0b503b;
  --brand-primary-light: rgba(16, 111, 83, 0.12);
  --brand-accent: #2563eb;         /* Azul Fibra Óptica */
  --brand-warning: #f59e0b;        /* Âmbar TV & Piquetes */
  --brand-danger: #ef4444;         /* Vermelho Cortes & Atrasos */

  /* Neutros e Superfícies (Modo Escuro & Claro) */
  --surface-ground: #0b0f19;
  --surface-sidebar: #0f172a;
  --surface-card: #131b2e;
  --surface-card-hover: #1a243d;
  --surface-border: #1e293b;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --text-dim: #64748b;

  /* Tipografia Corporativa */
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Geometria e Interação */
  --radius-button: 10px;
  --radius-card: 16px;
  --radius-modal: 20px;
  --transition-smooth: 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 3.2 Regra de Ouro de Paridade de Telas
Nenhum módulo é removido no APK ou Electron. Apenas a disposição é adaptada de forma responsiva:
- **Desktop e Web (Largura >= 1024px):** Menu lateral fixo (`sidebar`), grid multi-colunas, visualização detalhada lado a lado.
- **Android APK (Largura < 1024px):** Menu inferior dinâmico (`bottom navigation bar`), suporte a gaveta lateral (`drawer`), cartões verticais ergonômicos para uso com apenas um polegar em campo, e gatilhos tácteis nativos com Capacitor Haptics.

---

## 4. BACKEND CENTRALIZADO (FASTAPI / POSTGRESQL ASSÍNCRONO / REDIS)

O backend é construído em **Python 3.11+ assíncrono** com **FastAPI**, **SQLAlchemy 2.0 Async**, **Alembic**, e **Redis Pub/Sub**.

### 4.1 Estrutura de Pastas do Backend Central

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py           # Configurações Pydantic V2 e Variáveis de Ambiente
│   │   ├── database.py         # Engine Async Engine do PostgreSQL (pool_size=30)
│   │   ├── security.py         # Hash Argon2 / Bcrypt e Tokens JWT com RBAC
│   │   └── redis_bus.py        # Conexão assíncrona Redis Pub/Sub e Broadcast
│   ├── models/                 # Modelos SQLAlchemy mapeados
│   │   ├── base.py             # Classe abstrata com UUID, version, updated_at
│   │   ├── client.py           # Clientes de TV e Fibra
│   │   ├── invoice.py          # Faturas, Proformas e Pagamentos
│   │   ├── inventory.py        # Estoque, Bobinas, ONUs e Caixas PDO
│   │   ├── mission.py          # Ordens de Serviço, Piquetes e Cortes
│   │   └── audit.py            # Log imutável de todas as mutações
│   ├── schemas/                # Schemas Pydantic V2 para entrada/saída
│   │   ├── sync.py             # DTOs de Sync Push e Pull
│   │   └── client.py
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py
│   │   │   │   ├── clients.py
│   │   │   │   ├── invoices.py
│   │   │   │   ├── payments.py
│   │   │   │   ├── sync.py     # Endpoint central de sincronização incremental
│   │   │   │   └── ws.py       # Gateway WebSocket bidirecional em tempo real
│   │   │   └── router.py
│   ├── services/
│   │   ├── sync_service.py     # Resolução de conflitos, cursores e broadcast
│   │   └── billing_engine.py   # Validação de competências e corte automático
│   └── main.py                 # Instância FastAPI, Lifespan e Middlewares CORS
├── alembic/                    # Migrações versionadas do banco de dados
├── requirements.txt
└── Dockerfile
```

---

## 5. MODELAGEM DE DADOS UNIVERSAL, IDEMPOTÊNCIA E AUDITORIA

Todas as tabelas de negócio do sistema herdam de uma tabela base obrigatória contendo atributos de sincronização e controle de concorrência:

### 5.1 O Modelo Base Universal (`models/base.py`)

```python
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import BigInteger, DateTime, Boolean, String

class Base(DeclarativeBase):
    pass

class SyncableEntity(Base):
    """
    Classe Abstrata presente em TODAS as tabelas do ERP.
    Garante sincronização incremental determinística, resolução de conflitos e auditoria.
    """
    __abstract__ = True

    # Identificador Único Global (Criado no cliente ou no servidor)
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )
    
    # Identificador do Tenant (Multi-empresa)
    tenant_id: Mapped[str] = mapped_column(String(64), default="osdel", index=True)

    # Controle de Versão Otimista (Monotonically Increasing Version)
    version: Mapped[int] = mapped_column(BigInteger, default=1, nullable=False, index=True)

    # Timestamps UTC padronizados
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    # Soft Delete (Exclusão Lógica) para replicar remoções em clientes offline
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Auditoria de Autoria
    created_by_user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Chave de Idempotência do Cliente (evita processamento duplicado de requisições de rede)
    client_mutation_id: Mapped[str | None] = mapped_column(String(128), unique=True, index=True)
```

### 5.2 Validação Rigorosa de Duplicidade em Faturas e Pagamentos

Para impedir que a mesma mensalidade seja paga duas vezes ou que a mesma referência bancária seja utilizada por engano:

```python
# Trecho da modelagem de pagamentos com chave composta de idempotência
from sqlalchemy import UniqueConstraint

class Payment(SyncableEntity):
    __tablename__ = "payments"

    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    invoice_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    amount: Mapped[float] = mapped_column(nullable=False)
    penalty_applied: Mapped[float] = mapped_column(default=0.0)
    payment_method: Mapped[str] = mapped_column(String(32))  # multicaixa, tpa, dinheiro, transf_bai
    bank_account_id: Mapped[str] = mapped_column(String(32), default="acc-caixa")
    
    reference_code: Mapped[str | None] = mapped_column(String(64), index=True) # TXID ou Nº Operação
    reference_month: Mapped[str] = mapped_column(String(7), index=True)        # Formato YYYY-MM
    service_type: Mapped[str] = mapped_column(String(16))                      # tv, fibra, combo

    __table_args__ = (
        # Impede que o mesmo cliente tenha dois pagamentos idênticos registrados no mesmo mês
        UniqueConstraint('tenant_id', 'client_id', 'reference_month', 'service_type', 'is_deleted',
                         name='uq_payment_client_month_service'),
    )
```

---

## 6. MOTOR DE SINCRONIZAÇÃO BIDIRECIONAL EM TEMPO REAL

A sincronização de ponta a ponta combina **WebSockets bidirecionais** (para notificações instantâneas com latência de milissegundos) com uma rota **REST Incremental** (para transferir payloads com garantia de integridade).

### 6.1 O Hub Central de WebSocket + Redis Pub/Sub (`app/api/v1/endpoints/ws.py`)

```python
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.core.redis_bus import get_redis_connection
import redis.asyncio as aioredis

router = APIRouter()

class ConnectionManager:
    """Gerencia conexões ativas de Web, APK Android e Electron."""
    def __init__(self):
        # Mapeia tenant_id -> lista de WebSockets ativos
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
        self.active_connections[tenant_id].append(websocket)

    def disconnect(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.active_connections:
            if websocket in self.active_connections[tenant_id]:
                self.active_connections[tenant_id].remove(websocket)

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        if tenant_id in self.active_connections:
            payload = json.dumps(message)
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    pass

manager = ConnectionManager()

# Tarefa em Background contínua que escuta eventos do Redis e dispara para os WebSockets
async def redis_listener_task(tenant_id: str, redis_url: str):
    redis = aioredis.from_url(redis_url)
    pubsub = redis.pubsub()
    channel = f"osdel:events:{tenant_id}"
    await pubsub.subscribe(channel)
    
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                event_data = json.loads(message["data"])
                await manager.broadcast_to_tenant(tenant_id, event_data)
    except asyncio.CancelledError:
        await pubsub.unsubscribe(channel)
        await redis.close()

@router.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket, token: str, tenant_id: str = "osdel"):
    # Autenticar token JWT aqui
    await manager.connect(websocket, tenant_id)
    try:
        while True:
            # Mantém conexão viva via heartbeat (ping/pong)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, tenant_id)
```

### 6.2 O Disparador Universal de Eventos de Mutação (`app/core/redis_bus.py`)

Sempre que **qualquer operação** for salva no banco de dados (seja cadastro de cliente, fatura, pagamento ou ordem de serviço), o seguinte helper é invocado:

```python
import json
from datetime import datetime, timezone
import redis.asyncio as aioredis
from app.core.config import settings

redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

async def publish_entity_mutation(
    tenant_id: str,
    entity_name: str,          # Ex: "client", "payment", "invoice", "mission", "inventory"
    action: str,               # "CREATED", "UPDATED", "DELETED"
    entity_id: str,
    version: int,
    data: dict,
    origin_device_id: str | None = None
):
    """
    Publica o evento atômico no Redis.
    Todos os WebSockets distribuem o evento para os nós em tempo real.
    """
    event = {
        "event_id": str(uuid.uuid4()),
        "tenant_id": tenant_id,
        "entity": entity_name,
        "action": action,
        "entity_id": str(entity_id),
        "version": version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "origin_device_id": origin_device_id,
        "payload": data
    }
    channel = f"osdel:events:{tenant_id}"
    await redis_client.publish(channel, json.dumps(event))
```

---

## 7. MOTOR DE PERSISTÊNCIA OFFLINE-FIRST & RESOLUÇÃO DE CONFLITOS

### 7.1 Arquitetura do Cliente Offline-First
O frontend (em Web, APK e Electron) implementa uma máquina de estado com armazenamento local via **IndexedDB** (no Web/Electron) e **SQLite/Capacitor** (no Android).

```
   [ Ação do Usuário no Formulário ]
                 │
                 ▼
      [ Há Conexão com a Internet? ]
          ├── SIM (Online-First) ──► 1. Envia Mutation HTTP POST/PUT com idempotency_key
          │                          2. Sucesso: Atualiza Banco Local & UI
          │                          3. Backend emite WebSocket para outros nós
          │
          └── NÃO (Offline Fallback)
                 │
                 ▼
      1. Gera UUID v4 no Cliente
      2. Salva registro na tabela local (`clients`, `payments`, etc.)
      3. Insere a operação na `sync_queue`:
         - mutation_id: UUID
         - endpoint: "/api/v1/payments"
         - method: "POST"
         - payload: { ... }
         - status: "PENDING"
         - retries: 0
         - created_at: Timestamp UTC
      4. UI atualiza instantaneamente com indicador: "⏳ Salvo localmente (Pendente de Sincronização)"
```

### 7.2 O Algoritmo de Resolução de Conflitos (LWW + Version Vector)
Quando a conexão é restabelecida e a fila é descarregada:
1. **Regra de Monotonicidade:** Se o registro no servidor possui `version: 5` e o cliente offline envia uma mutação baseada na `version: 4`, o servidor analisa o diff.
2. **Campos Independentes:** Se a alteração offline tocou apenas no telefone do cliente e no servidor foi alterado o plano de fibra, ambas são mescladas (Merge Semântico).
3. **Colisão no Mesmo Campo:** Aplica-se **LWW (Last-Write-Wins)** comparando o timestamp UTC autenticado.
4. **Idempotência Garantida:** Se a mesma mutação for enviada mais de uma vez devido a instabilidades de rede, o cabeçalho `X-Mutation-ID` garante que a operação é processada apenas uma única vez.

---

## 8. ESTRUTURA UNIVERSAL DE APIS (ENDPOINTS ÚNICOS E IDÊNTICOS)

Todas as 3 plataformas (Web, Android APK e Electron Desktop) comunicam-se exatamente com os mesmos contratos REST:

| Método | Endpoint | Finalidade | Suporte Offline |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Autenticação unificada (JWT Bearer) | Cache de Sessão |
| `GET` | `/api/v1/sync/pull` | Busca incremental de alterações a partir de um cursor | Sim |
| `POST` | `/api/v1/sync/push` | Envia lote de operações acumuladas offline | Fila de Envio |
| `GET/POST`| `/api/v1/clients` | Listagem e criação com pesquisa multicritério | Sim |
| `GET/PUT` | `/api/v1/clients/{id}` | Detalhes e atualização completa | Sim |
| `GET/POST`| `/api/v1/invoices` | Faturas, proformas e notas com bloqueio duplicado | Sim |
| `GET/POST`| `/api/v1/payments` | Liquidação de mensalidades com validação de banco | Sim |
| `GET/POST`| `/api/v1/service-orders`| Ordens de serviço para técnicos de campo | Sim |
| `GET/POST`| `/api/v1/inventory` | Gestão de bobinas, caixas de emenda, ONUs e PDOs | Sim |
| `GET` | `/api/v1/dashboard/metrics`| Indicadores de faturamento, inadimplência e cortes | Cache Local |

---

## 9. IMPLEMENTAÇÃO NO WEB (REACT SPA + TANSTACK QUERY)

No Web, utilizamos o hook universal de sincronização com TanStack React Query. O hook ouve os eventos do WebSocket e invalida o cache automaticamente, fazendo com que as tabelas e gráficos se atualizem **sem F5**.

### 9.1 Hook Universal de Tempo Real (`src/hooks/use-realtime-sync.ts`)

```typescript
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface WebSocketSyncEvent {
  event_id: string;
  entity: string;   // 'client' | 'payment' | 'invoice' | 'inventory' | 'mission'
  action: 'CREATED' | 'UPDATED' | 'DELETED';
  entity_id: string;
  payload: any;
}

export function useRealtimeSync(tenantId = 'osdel') {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('osdel_token') || 'anonymous';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/events?token=${token}&tenant_id=${tenantId}`;

    const connect = () => {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[Realtime] Conectado ao Barramento Central.');
      };

      socket.onmessage = (event) => {
        try {
          const syncEvent: WebSocketSyncEvent = JSON.parse(event.data);
          
          // Mapeamento automático de chaves do TanStack Query
          const queryKeyMap: Record<string, string[]> = {
            client: ['clients'],
            payment: ['payments'],
            invoice: ['invoices'],
            inventory: ['inventory'],
            mission: ['missions'],
            schedule: ['schedule'],
          };

          const targetKey = queryKeyMap[syncEvent.entity];
          if (targetKey) {
            // Invalida e refaz o fetch em background imediatamente
            queryClient.invalidateQueries({ queryKey: targetKey });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          }

          // Notificação sutil para a equipe de atendimento/caixa
          if (syncEvent.action === 'CREATED' && syncEvent.entity === 'payment') {
            toast.success(`Novo pagamento recebido: ${syncEvent.payload?.amount?.toLocaleString('pt-AO')} Kz`, {
              description: `Registrado por ${syncEvent.payload?.operator || 'Operador'}`,
            });
          }
        } catch (err) {
          console.warn('[Realtime] Erro ao processar evento:', err);
        }
      };

      socket.onclose = () => {
        console.log('[Realtime] Desconectado. Reconectando em 3 segundos...');
        setTimeout(connect, 3000); // Reconexão automática resiliente
      };
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [queryClient, tenantId]);
}
```

---

## 10. IMPLEMENTAÇÃO NO DESKTOP (ELECTRON STANDALONE)

O Desktop não é apenas um navegador encapsulado. Ele opera como uma aplicação corporativa robusta:
1. **Comunicação por Protocolo Seguro Local:** Carrega o bundle compilado diretamente do disco rígido com `app://` ou arquivo local, com zero dependência de servidor web externo para abrir a interface inicial.
2. **Acesso Direto à Impressora Térmica:** O processo principal do Electron comunica diretamente com as portas USB/COM ou spooler do Windows (`win32`) para impressão silenciosa de faturas térmicas 80mm/58mm sem abrir a caixa de diálogo do Windows.
3. **Sincronização Nativa em Segundo Plano:** Mesmo minimizado na bandeja do sistema (System Tray), um worker continua sincronizando faturas e chamados de técnicos.

---

## 11. IMPLEMENTAÇÃO NO ANDROID APK (CAPACITOR / CLI 1-CLIQUE)

Para garantir máxima velocidade de compilação sem complicação, o projeto utiliza **Capacitor CLI**:
- **Um único comando para compilar:** Não é necessário configurar o Android Studio para builds de rotina.
- **Armazenamento Seguro:** Credenciais criptografadas via `Capacitor Preferences`.
- **Notificações Push Nativas:** Integração com Firebase Cloud Messaging (FCM) para avisos sonoros de ordens de serviço de emergência e ordens de corte para os técnicos na rua.

### Script de Build Automático Android (`clienteapk/GERAR_APK_AUTOMATICO.bat`)
```bat
@echo off
echo =====================================================================
echo  OSDEL TECNOLOGIA - COMPILADOR AUTOMATICO DE APK ANDROID
echo =====================================================================
cd ..
call npm run build
call npx cap copy android
cd clienteapk/android
call gradlew assembleRelease
echo =====================================================================
echo  APK GERADO COM SUCESSO EM:
echo  clienteapk/android/app/build/outputs/apk/release/app-release.apk
echo =====================================================================
pause
```

---

## 12. SEGURANÇA, AUDITORIA E OBSERVABILIDADE CENTRALIZADA

### 12.1 Trilha de Auditoria Imutável (`audit_logs`)
Toda mutação financeira, exclusão ou corte de sinal é registrada em log de auditoria com:
- `user_id` e `user_name` do autor
- `ip_address` e `user_agent` (indicando se veio de Web, APK Android ou Electron)
- `payload_before` e `payload_after` em JSONB estruturado
- `reason` (justificativa obrigatória em caso de estorno ou anulação de fatura)

---

## 13. ROTEIRO DE IMPLEMENTAÇÃO PASSO A PASSO (CHECKLIST EXECUTIVO)

Siga este roteiro em ordem estrita para colocar a arquitetura unificada em operação:

- [x] **Fase 1: Padronização do Design System**
  - Consolidar todas as variáveis de tema no `src/index.css`.
  - Garantir que todos os componentes (`Button`, `Table`, `Badge`, `Modal`) utilizem as classes universais.
- [x] **Fase 2: Validações Financeiras e Anti-Duplicidade**
  - Implementar bloqueio por referência e competência mês/ano tanto em `src/pages/business.tsx` (pagamentos) quanto em `src/pages/operations.tsx` (faturas).
- [ ] **Fase 3: Infraestrutura Central (FastAPI + Redis + Postgres)**
  - Configurar instância do PostgreSQL 16 e Redis 7 no provedor em nuvem.
  - Aplicar migrações com Alembic criando a coluna de versionamento `version` e chaves únicas.
- [ ] **Fase 4: Ativação dos WebSockets & Realtime Bus**
  - Conectar o hook `useRealtimeSync` no `Shell` da aplicação (`src/App.tsx`).
  - Testar mutação em um dispositivo e verificar atualização instantânea nos demais sem recarregar a página.
- [ ] **Fase 5: Build dos Binários Finais**
  - Executar `npm run build:electron` para gerar o instalador do Desktop Windows.
  - Executar `npx cap sync android && cd android && ./gradlew assembleRelease` para gerar os APKs de Cliente e Equipa.
