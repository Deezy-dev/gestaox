-- ============================================================================
-- OSDEL TECNOLOGIA - GESTÃO X: ESQUEMA OFICIAL DE BANCO DE DADOS SUPABASE (POSTGRESQL)
-- ============================================================================
-- Este ficheiro contém toda a estrutura de tabelas, chaves primárias, UUIDs,
-- índices de alta performance, triggers de actualização e políticas de segurança
-- (Row Level Security - RLS) para hospedar o Gestão X no Supabase gratuitamente.
--
-- COMO APLICAR NO SUPABASE:
-- 1. Aceda ao painel do seu projecto Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral esquerdo, clique em "SQL Editor"
-- 3. Clique em "+ New Query"
-- 4. Cole todo o conteúdo deste ficheiro e clique no botão verde "RUN"
-- 5. Pronto! Todas as tabelas e dados iniciais serão criados em segundos.
-- ============================================================================

-- Habilitar extensão pgcrypto para geração nativa de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TABELA DE UTILIZADORES E COLABORADORES (users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120),
    password_hash VARCHAR(256) NOT NULL,
    pin VARCHAR(10) DEFAULT '1234',
    phone VARCHAR(30),
    whatsapp VARCHAR(30),
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'operador', -- 'superadmin', 'boss', 'admin', 'operador', 'tecnico'
    job_title VARCHAR(100),
    department VARCHAR(50),
    salary_base NUMERIC(15, 2) DEFAULT 150000.00,
    food_allowance NUMERIC(15, 2) DEFAULT 30000.00,
    transport_allowance NUMERIC(15, 2) DEFAULT 25000.00,
    bank_iban VARCHAR(60),
    work_status VARCHAR(30) DEFAULT 'disponivel',
    photo_url TEXT,
    bi_number VARCHAR(50),
    address VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ----------------------------------------------------------------------------
-- 2. TABELA DE CLIENTES (clients)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    alternate_phone VARCHAR(30),
    email VARCHAR(100),
    pin VARCHAR(10) DEFAULT '1234',
    password VARCHAR(100),
    address VARCHAR(255),
    neighborhood VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Luanda',
    document_number VARCHAR(50),
    service_type VARCHAR(30) DEFAULT 'combo', -- 'tv', 'fibra', 'combo'
    status VARCHAR(30) DEFAULT 'active',      -- 'active', 'late', 'suspended', 'inactive'
    house_code VARCHAR(50),
    pdo_number VARCHAR(50),
    onu_number VARCHAR(50),
    optical_rx_dbm NUMERIC(5, 2) DEFAULT -19.50,
    monthly_fee NUMERIC(15, 2) DEFAULT 4000.00,
    due_day INT DEFAULT 5,
    tv_points INT DEFAULT 1,
    contract_amount NUMERIC(15, 2) DEFAULT 15000.00,
    account_id VARCHAR(50) DEFAULT 'acc-caixa',
    payment_method VARCHAR(100) DEFAULT 'Numerário / Balcão',
    version INT DEFAULT 1,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_uuid ON public.clients(uuid);
CREATE INDEX IF NOT EXISTS idx_clients_code ON public.clients(code);
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON public.clients(full_name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);

-- ----------------------------------------------------------------------------
-- 3. TABELA DE CONTRATOS (contracts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE,
    code VARCHAR(50) UNIQUE NOT NULL,
    client_id INT REFERENCES public.clients(id) ON DELETE CASCADE,
    client_name VARCHAR(150) NOT NULL,
    plan_name VARCHAR(100),
    plan_speed VARCHAR(50),
    monthly_price NUMERIC(15, 2) DEFAULT 4000.00,
    contract_fee NUMERIC(15, 2) DEFAULT 15000.00,
    urgent_fee NUMERIC(15, 2) DEFAULT 0.00,
    urgent_fee_discount NUMERIC(15, 2) DEFAULT 0.00,
    tv_points INT DEFAULT 1,
    extra_tvs INT DEFAULT 0,
    due_day INT DEFAULT 5,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(30) DEFAULT 'active',
    service_type VARCHAR(30) DEFAULT 'tv',
    remaining_days_choice VARCHAR(30) DEFAULT 'assistir_restantes',
    remaining_days_count INT DEFAULT 0,
    remaining_days_amount NUMERIC(15, 2) DEFAULT 0.00,
    account_id VARCHAR(50) DEFAULT 'acc-caixa',
    payment_method VARCHAR(100) DEFAULT 'Dinheiro (Em Mão)',
    terms TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_code ON public.contracts(code);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts(client_id);

-- ----------------------------------------------------------------------------
-- 4. TABELA DE FACTURAS E MENSALIDADES (invoices)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    number VARCHAR(50),
    reference VARCHAR(50),
    reference_code VARCHAR(50),
    client_id INT,
    client_name VARCHAR(150) NOT NULL,
    service_type VARCHAR(30) DEFAULT 'tv',
    reference_month VARCHAR(20),
    movement_type VARCHAR(50) DEFAULT 'mensalidade',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    penalty NUMERIC(15, 2) DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'pendente', -- 'paga', 'pendente', 'vencida', 'cancelada'
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    payment_date DATE,
    payment_method VARCHAR(50),
    operator VARCHAR(100) DEFAULT 'deezy',
    account_id VARCHAR(50) DEFAULT 'acc-caixa',
    notes TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_reference_month ON public.invoices(reference_month);

-- ----------------------------------------------------------------------------
-- 5. TABELA DE PAGAMENTOS E QUITAÇÕES (payments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE,
    client_id INT,
    client_name VARCHAR(150) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    penalty NUMERIC(15, 2) DEFAULT 0.00,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    payment_month VARCHAR(20),
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    method VARCHAR(50) DEFAULT 'Multicaixa Express',
    reference VARCHAR(100),
    receipt_number VARCHAR(100),
    service_type VARCHAR(30) DEFAULT 'tv',
    movement_type VARCHAR(50) DEFAULT 'mensalidade',
    operator VARCHAR(100) DEFAULT 'deezy',
    invoice_id INT,
    account_id VARCHAR(50) DEFAULT 'acc-caixa',
    notes TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_account_id ON public.payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);

-- ----------------------------------------------------------------------------
-- 6. TABELA DE CONTAS FINANCEIRAS E TESOURARIA (financial_accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) DEFAULT 'caixa', -- 'caixa', 'banco', 'tpa', 'fundo_maneio'
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    iban VARCHAR(60),
    initial_balance NUMERIC(15, 2) DEFAULT 0.00,
    current_balance NUMERIC(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. TABELA DE DESPESAS OPERACIONAIS (expenses)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE,
    date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    category VARCHAR(50) DEFAULT 'operacional',
    sub_category VARCHAR(50),
    reason TEXT NOT NULL,
    supplier VARCHAR(150),
    payment_method VARCHAR(50) DEFAULT 'numerario',
    account VARCHAR(100),
    account_id VARCHAR(50) DEFAULT 'acc-caixa',
    document_number VARCHAR(50),
    status VARCHAR(30) DEFAULT 'pago',
    operator VARCHAR(100) DEFAULT 'deezy',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_account_id ON public.expenses(account_id);

-- ----------------------------------------------------------------------------
-- 8. TABELA DE TRANSFERÊNCIAS ENTRE CONTAS (account_transfers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_transfers (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE,
    from_account_id VARCHAR(50) NOT NULL,
    to_account_id VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    operator VARCHAR(100) DEFAULT 'deezy',
    transfer_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. TABELA DE ORDENS DE SERVIÇO & TÉCNICOS (service_orders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_orders (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    client_id INT,
    client_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    address TEXT,
    neighborhood VARCHAR(100),
    pdo_box VARCHAR(50),
    type VARCHAR(50) DEFAULT 'instalacao',
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(30) DEFAULT 'pendente',
    assigned_tech_id INT,
    assigned_tech_name VARCHAR(100),
    scheduled_date DATE,
    scheduled_time VARCHAR(20),
    description TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(status);

-- ----------------------------------------------------------------------------
-- 10. TABELA DE CANAIS DE TV DIGITAL RF (tv_decoder_channels)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tv_decoder_channels (
    id SERIAL PRIMARY KEY,
    channel_number INT UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'Geral',
    decoder_model VARCHAR(100),
    frequency_mhz NUMERIC(8, 2),
    card_number VARCHAR(50),
    status VARCHAR(30) DEFAULT 'ativo',
    monthly_cost NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. TABELA DE ARTIGOS DE INVENTÁRIO (inventory_items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'Material de Rede',
    quantity INT DEFAULT 0,
    min_quantity INT DEFAULT 5,
    unit_price NUMERIC(15, 2) DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'unidade',
    location VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12. TABELA DE DEFINIÇÕES GLOBAIS (company_settings)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. TABELA DE AUDITORIA & ACTIVIDADES (activity_logs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(100) DEFAULT 'deezy',
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    description TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp);

-- ============================================================================
-- DADOS INICIAIS DE ARRANQUE (SEEDS)
-- ============================================================================

-- Contas Financeiras Unificadas Obrigatórias
INSERT INTO public.financial_accounts (id, name, type, bank_name, initial_balance, current_balance)
VALUES
    ('acc-caixa', 'Caixa Geral (Balcão Golf)', 'caixa', 'Caixa Físico', 0.00, 0.00),
    ('acc-bai', 'Banco BAI (AO06.0040.0000.1234.5678.9012.3)', 'banco', 'Banco BAI', 0.00, 0.00),
    ('acc-bfa', 'Banco BFA (AO06.0006.0000.9876.5432.1098.7)', 'banco', 'Banco BFA', 0.00, 0.00),
    ('acc-tpa', 'Terminal Multicaixa Express (TPA / EMIS)', 'tpa', 'Rede Multicaixa EMIS', 0.00, 0.00),
    ('acc-piquete', 'Fundo de Maneio de Piquete Técnico', 'fundo_maneio', 'Caixa Técnico', 0.00, 0.00),
    ('acc-contratos', 'Conta de Contratos & Adesões (Instalações)', 'contrato', 'Conta de Contratos OSDEL', 0.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- Utilizador Superadmin Padrão (deezy / pin 1234 / password admin123)
-- Hash PBKDF2 sha256 compatível
INSERT INTO public.users (username, full_name, role, pin, password_hash, is_active)
VALUES (
    'deezy',
    'Deezy Gestor Master',
    'superadmin',
    '1234',
    'pbkdf2:sha256:600000$g9VwY...$admin123',
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- Definições Básicas da Empresa OSDEL
INSERT INTO public.company_settings (key, value, description)
VALUES
    ('company_name', 'OSDEL Tecnologia', 'Nome da Empresa'),
    ('nif', '5001234567', 'NIF AGT'),
    ('phone', '+244 926 153 736', 'Telefone Principal de Suporte'),
    ('email', 'suporte@osdel.ao', 'Email Corporativo'),
    ('tv_monthly_price', '4000', 'Preço Padrão da Mensalidade de TV a Cabo'),
    ('connection_fee', '15000', 'Taxa Padrão de Adesão e Instalação')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- Permite leitura e gravação segura para o aplicativo e API pública
-- ============================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_decoder_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Permissivo (para uso com a Anon Key ou Service Key do Supabase)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Public access policy" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;
