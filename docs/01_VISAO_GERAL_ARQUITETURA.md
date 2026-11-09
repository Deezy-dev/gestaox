# CAPÍTULO 1 · VISÃO GERAL DA ARQUITETURA · GESTÃO X

## 1. Contexto e Propósito
O **Gestão X** é uma plataforma empresarial completa de gestão técnica, comercial e financeira concebida para a **OSDEL Tecnologia**, operadora de telecomunicações que fornece **TV por Cabo (RF/DVB-C & Descodificadores)** e **Internet Fibra Óptica (FTTH / GPON)** em Luanda, Angola.

A arquitetura foi desenhada para operar com custo zero de infraestrutura nos primeiros anos através de planos gratuitos de alta disponibilidade (**Vercel Free Tier** para a interface Web SPA e **PythonAnywhere Free Tier** para a API REST), oferecendo redundância local (Online-First) para funcionamento sem interrupções mesmo durante falhas de conectividade.

---

## 2. Princípios de Engenharia
1. **Remoção de Código Morto**: O antigo módulo de reuniões por vídeo chamadas foi permanentemente removido, eliminando dependências desnecessárias, simplificando a navegação e aumentando o desempenho.
2. **Separação Clara de Responsabilidades**:
   - `frontend/`: Aplicação Single Page Application (SPA) em React 19 + TypeScript + Tailwind CSS.
   - `backend/`: API RESTful desacoplada em Python/Flask com SQLAlchemy e autenticação JWT.
   - `mobile/`: Aplicativos Android nativos compilados via Capacitor para Clientes e Técnicos de Piquete.
   - `desktop/`: Aplicativo nativo Windows via Electron com suporte a instalador (`setup.exe`) e versão portátil (`portable.exe`).
   - `docs/`: Documentação técnica exaustiva e operatória.
3. **Multi-Modalidade Inteligente**:
   O sistema adapta-se instantaneamente à modalidade pretendida pelo operador:
   - **Internet Fibra**: Planos de banda larga, gestão de ONUs, caixas PDO, portas ópticas e atenuação.
   - **TV por Cabo**: Descodificadores, caixas de distribuição TV, pacotes de canais e cobrança por pontos adicionais (> 4.000 Kz para 2 TVs).
   - **Combo (TV + Fibra)**: Faturação unificada e gestão integrada.
4. **Resiliência e Online-First**:
   O sistema armazena o estado operacional em cache local (`localStorage` + `BroadcastChannel`) para permitir transações de balcão e consultas imediatas, sincronizando em segundo plano com a API na nuvem.
