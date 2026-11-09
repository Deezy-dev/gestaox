# CAPÍTULO 2 · ESTRUTURA DE PASTAS · GESTÃO X

A organização do ecossistema Gestão X segue padrões rigorosos de engenharia modular:

```text
gestaox/
│
├── frontend/                     # Aplicação Web SPA (Vite / React 19 / Vercel)
│   ├── public/                  # Ícones, manifest PWA, sons de notificação
│   ├── src/
│   │   ├── assets/              # Logos oficiais OSDEL em SVG e WebP
│   │   ├── components/          # Modais de pagamento, faturas, gráficos e botões
│   │   ├── contexts/            # Contextos de autenticação, tema e modo de serviço
│   │   ├── hooks/               # useTenants, useServiceMode, useDebounce
│   │   ├── layouts/             # Sidebar, cabeçalho de navegação, rodapé
│   │   ├── pages/               # Clientes, contratos, faturas, TV, estoque, relatórios
│   │   ├── services/            # Clientes HTTP, abstração de chamadas REST
│   │   ├── styles/              # Configurações globais Tailwind CSS
│   │   └── utils/               # Formatadores Kwanza (Kz), datas e máscaras
│   ├── .env.example             # Variáveis de ambiente de desenvolvimento e produção
│   ├── package.json             # Dependências NPM do frontend
│   ├── tsconfig.json            # Configuração do TypeScript 5
│   ├── vercel.json              # Regras de rewrite SPA, headers e cache Vercel
│   └── vite.config.ts           # Configuração de build e plugins Vite
│
├── backend/                      # API REST em Python / Flask (PythonAnywhere Free)
│   ├── api/                     # Blueprints e endpoints da API
│   ├── config/                  # Definições de ambiente, JWT e CORS
│   │   ├── __init__.py
│   │   └── settings.py
│   ├── database/                # Camada de Abstração de Banco de Dados
│   │   ├── __init__.py
│   │   └── db_engine.py         # Suporte SQLite e migração transparente para PostgreSQL
│   ├── middleware/              # Autenticação JWT, verificação de papéis e logs
│   │   ├── __init__.py
│   │   └── auth.py
│   ├── models/                  # Entidades SQLAlchemy (Clientes, Faturas, Contratos, etc.)
│   │   ├── __init__.py
│   │   └── models.py
│   ├── routes/                  # Rotas modulares da API REST
│   │   ├── routes_ai.py         # Assistente IA com execução de tarefas reais
│   │   ├── routes_clients.py    # CRUD de clientes e contratos automáticos
│   │   ├── routes_invoices.py   # Emissão e quitação de faturas
│   │   ├── routes_payments.py   # Registro de caixa e recibos
│   │   ├── routes_sync.py       # Sincronização full-snapshot e em lote
│   │   ├── routes_tv_channels.py# Gestão de canais e descodificadores TV
│   │   └── routes_users.py      # Gestão de equipa e credenciais
│   ├── services/                # Regras de negócio e rotinas de corte automático
│   ├── utils/                   # Formatadores de resposta JSON padronizados
│   ├── app.py                   # Fábrica da aplicação (create_app)
│   ├── requirements.txt         # Pacotes Python necessários
│   └── wsgi.py                  # Entrypoint WSGI para PythonAnywhere
│
├── mobile/                       # Aplicativos Android (Capacitor)
│   ├── cliente/                 # App Android para Clientes OSDEL
│   │   ├── build_apk_cli.sh     # Script CLI de compilação automática
│   │   ├── capacitor.config.ts  # Configuração Capacitor (ID: ao.osdel.cliente)
│   │   ├── gerar_keystore.sh    # Gerador de chave criptográfica para assinatura
│   │   └── package.json
│   └── staff/                   # App Android para Técnicos de Piquete
│       ├── build_apk_cli.sh     # Script CLI de compilação automática
│       ├── capacitor.config.ts  # Configuração Capacitor (ID: ao.osdel.staff)
│       ├── gerar_keystore.sh    # Gerador de chave criptográfica para assinatura
│       └── package.json
│
├── desktop/                      # Aplicativo Nativo Windows (Electron)
│   └── electron/
│       ├── build-assets/        # Ícones .ico e imagens de instalação
│       ├── electron-builder.yml # Configuração de empacotamento NSIS e Portable
│       ├── main.js              # Processo principal multi-modal (Fibra, TV, Combo)
│       ├── package.json         # Scripts de execução e build
│       └── preload.js           # Ponte de segurança IPC
│
└── docs/                         # Manuais e documentações de engenharia (12 capítulos)
```
