# 📘 MANUAL MESTRE GESTÃO X · OSDEL TECNOLOGIA
### Arquitetura Reorganizada, Implantação Gratuita e Guia Operacional Definitivo

---

## 📑 Índice Geral de Documentação

1. [Capítulo 1: Visão Geral da Arquitetura](01_VISAO_GERAL_ARQUITETURA.md)
2. [Capítulo 2: Estrutura Completa de Pastas](02_ESTRUTURA_DE_PASTAS.md)
3. [Capítulo 3: Fluxo Frontend → Backend & Comunicação](03_FLUXO_FRONTEND_BACKEND.md)
4. [Capítulo 4: Deploy do Frontend na Vercel (Hospedagem Gratuita)](04_DEPLOY_FRONTEND_VERCEL.md)
5. [Capítulo 5: Deploy do Backend no PythonAnywhere Free (WSGI & CORS)](05_DEPLOY_BACKEND_PYTHONANYWHERE.md)
6. [Capítulo 6: Banco de Dados & Camada de Abstração para PostgreSQL](06_CONFIGURACAO_BANCO_DE_DADOS_POSTGRESQL.md)
7. [Capítulo 7: Compilação de APKs Android via Linha de Comando (Capacitor CLI)](07_BUILD_APK_ANDROID_CAPACITOR.md)
8. [Capítulo 8: Aplicativo Desktop Windows (Electron Setup & Portable)](08_BUILD_DESKTOP_ELECTRON_WINDOWS.md)
9. [Capítulo 9: Dicionário e Segregação de Variáveis de Ambiente](09_VARIAVEIS_DE_AMBIENTE.md)
10. [Capítulo 10: Política de Backup Diário e Recuperação de Desastres](10_BACKUP_E_RECUPERACAO.md)
11. [Capítulo 11: Fluxo de Atualizações Contínuas do Sistema](11_ATUALIZACOES_DO_SISTEMA.md)
12. [Capítulo 12: Boas Práticas, Higienização de Logs e Manutenção Preventiva](12_BOAS_PRATICAS_E_MANUTENCAO.md)

---

## 🎯 Síntese dos Destaques Implementados nesta Versão

- ✅ **Remoção Absoluta do Módulo de Reuniões**: Nenhuma página, rota, botão, banner, permissão ou modelo de dados de reuniões permaneceu no sistema.
- ✅ **Estrutura Modular `gestaox/`**: Pastas segregadas para `frontend/`, `backend/`, `mobile/`, `desktop/` e `docs/`.
- ✅ **Hospedagem 100% Gratuita Pronta para Produção**: Frontend configurado com `vercel.json` e backend com `wsgi.py` para PythonAnywhere.
- ✅ **Camada de Abstração de Banco de Dados**: SQLite atômico local para PythonAnywhere Free com migração imediata para PostgreSQL via `DATABASE_URL` sem tocar no frontend.
- ✅ **Build de APKs Automatizado**: Scripts prontos para Cliente e Staff Piquete via linha de comando para uso direto sem Google Play nos primeiros tempos.
- ✅ **Desktop Windows Multi-Modal**: Electron configurado para gerar `setup.exe` e `portable.exe` com modos específicos para Internet Fibra, TV por Cabo e Combo Integrado.
- ✅ **Tabela de TV Atualizada**: Cliente com 2 TVs paga valor superior a 4.000 Kz (padrão fixado em 5.000 Kz / mês).
- ✅ **Contratos Garantidos**: Auto-reparação contínua prevenindo qualquer contrato desassociado.
- ✅ **Mensagens e Anúncios em Tempo Real**: Sincronização reativa com áudio e persistência local/nuvem.
