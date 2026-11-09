# CAPÍTULO 11 · FLUXO DE ATUALIZAÇÕES DO SISTEMA

Este guia descreve as etapas recomendadas para manter o **Gestão X** atualizado com novas funcionalidades, correções de bugs e atualizações de segurança.

---

## 1. Fluxo Git (Versionamento)

Adotamos a estratégia baseada em branch principal estável:

```
feature/nova-tabela-precos ──> Pull Request ──> main (Produção Automática)
```

1. **Desenvolvimento Local**:
   - Crie um branch de trabalho para a nova melhoria:
     ```bash
     git checkout -b feature/melhoria-corte-automatico
     ```
   - Faça os testes e edições necessárias.
2. **Homologação**:
   - Verifique a compilação limpa do TypeScript e Vite:
     ```bash
     npm run build
     ```
3. **Merge para Produção**:
   - Envie as alterações para o branch `main`:
     ```bash
     git checkout main
     git merge feature/melhoria-corte-automatico
     git push origin main
     ```

---

## 2. Deploy Automático do Frontend (Vercel)
- Assim que o `git push` for recebido no GitHub, a Vercel aciona o Webhook de build.
- O site é reconstruído e publicado com Zero Downtime. Os utilizadores conectados recebem as atualizações assim que recarregarem a página ou trocarem de rota.

---

## 3. Atualização do Backend (PythonAnywhere)
No Bash Console do PythonAnywhere:
```bash
cd /home/<seu-usuario>/gestaox/backend
git pull origin main
source venv/bin/activate
pip install -r requirements.txt
touch /var/www/<seu-usuario>_pythonanywhere_com_wsgi.py  # Recarrega a aplicação WSGI
```

---

## 4. Atualização dos Aplicativos Móveis (APKs)
1. Altere a versão no arquivo `capacitor.config.ts` e `package.json` (ex: `1.0.0` -> `1.0.1`).
2. Execute o build automático:
   ```bash
   bash build_apk_cli.sh debug
   ```
3. Distribua o novo arquivo APK para a equipa ou clientes.
4. O app Android atualizará por cima da versão existente mantendo o login ativo.

---

## 5. Atualização do Aplicativo Desktop Windows (Electron)
1. Atualize a versão no `gestaox/desktop/electron/package.json` (ex: `2.0.0` -> `2.0.1`).
2. Gere os novos instaladores:
   ```bash
   npm run build:all
   ```
3. Disponibilize o novo executável `GestaoX-Setup-2.0.1.exe` aos operadores.
