# CAPÍTULO 6 · CONFIGURAÇÃO DO BANCO DE DADOS & MIGRAÇÃO PARA POSTGRESQL

## 1. Arquitetura da Camada de Abstração
O **Gestão X** foi desenvolvido utilizando uma camada de abstração baseada em **SQLAlchemy ORM**. Isso significa que as consultas, inserções, relacionamentos e modelos de dados (`Client`, `Contract`, `Invoice`, etc.) são totalmente agnósticos em relação ao motor de banco de dados subjacente.

- **Fase Atual (Custo Zero)**: SQLite local (`sqlite:///gestaox.db`), ideal para a hospedagem gratuita no PythonAnywhere Free, com zero configuração de servidores e sem limites de conexões externas.
- **Fase de Escala (Futura)**: Migração para PostgreSQL (Supabase, Neon, Cloud SQL, AWS RDS) alterando **apenas 1 linha** no arquivo `.env` do backend, **sem tocar em qualquer linha do frontend**.

---

## 2. Como Funciona a Camada de Abstração
No módulo `gestaox/backend/database/db_engine.py`:
1. A função `get_database_uri()` inspeciona a variável de ambiente `DATABASE_URL`.
2. Se a URL começar por `sqlite:///`:
   - Configura o motor SQLite com `check_same_thread=False` e timeout de 30 segundos para suportar requisições concorrentes sem travamento.
3. Se a URL começar por `postgresql://`:
   - Ativa o pool de conexões com `pool_pre_ping=True` (testa se a conexão está viva antes de usá-la) e `pool_recycle=300` (recicla conexões a cada 5 minutos para evitar timeouts de provedores em nuvem).
   - Normaliza automaticamente strings antigas do tipo `postgres://` fornecidas por serviços como Heroku ou Supabase.

---

## 3. Passo a Passo para Migração para PostgreSQL

Quando a empresa desejar migrar para PostgreSQL na nuvem:

### Passo 1: Criar a Base de Dados PostgreSQL
Pode utilizar qualquer serviço gerenciado gratuito ou pago:
- **Supabase**: Criação em 30 segundos, 500 MB grátis.
- **Neon.tech**: PostgreSQL serverless com escalabilidade automática.
- **Render / ElephantSQL / Cloud SQL**: Totalmente compatíveis.

Copie a string de conexão fornecida pelo provedor, no formato:
```
postgresql://usuario:palavra_passe@host.supabase.co:5432/postgres
```

### Passo 2: Atualizar a Variável no Backend
No arquivo `.env` do backend ou nas variáveis de ambiente do servidor:
```bash
DATABASE_URL=postgresql://usuario:palavra_passe@host.supabase.co:5432/postgres
```

### Passo 3: Executar a Criação Automática das Tabelas
No console do servidor, execute:
```bash
python3 seed_db.py
```
O script criará automaticamente todas as tabelas, índices e credenciais do Super Administrador (`deezy`) sem necessidade de criar tabelas manualmente no SQL.

O Frontend Web, Electron e APKs continuarão a operar normalmente sem necessidade de qualquer alteração de código ou nova compilação!
