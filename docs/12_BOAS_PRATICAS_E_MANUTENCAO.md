# CAPÍTULO 12 · BOAS PRÁTICAS E MANUTENÇÃO PREVENTIVA

Para assegurar estabilidade contínua, alta velocidade e longevidade da plataforma **Gestão X**, siga este conjunto de rotinas e boas práticas recomendadas.

---

## 1. Monitoramento do Plano Gratuito do PythonAnywhere
- **Renovação de 3 em 3 meses**: No plano gratuito do PythonAnywhere (Beginner), é necessário clicar no botão **"Extend expiry date"** na aba Web a cada 3 meses para manter a aplicação ativa.
- **Quota de CPU diária**: O plano gratuito oferece 100 segundos de CPU diários. A API do Gestão X consome em média menos de 3 a 5 segundos de CPU por dia devido ao cache no cliente e consultas SQL indexadas.

---

## 2. Higienização Periódica de Logs e Dados Temporários
Na aba Bash do PythonAnywhere, configure uma limpeza mensal de arquivos temporários:
```bash
# Limpa arquivos de log antigos
truncate -s 0 /var/log/<seu-usuario>.pythonanywhere.com.error.log
truncate -s 0 /var/log/<seu-usuario>.pythonanywhere.com.server.log

# Otimiza o banco de dados SQLite (recupera espaço e reindexa)
sqlite3 /home/<seu-usuario>/gestaox/backend/gestaox.db "VACUUM; PRAGMA optimize;"
```

---

## 3. Segurança e Auditoria
1. **Controle de Acessos**: Apenas o Super Administrador (`deezy`) e o `boss` devem ter permissões de alteração de tabelas de preços, licenças e geração de APKs.
2. **Troca Periódica de Senhas**: Assegure que técnicos desligados da empresa tenham as suas credenciais desativadas no painel `Equipa`. O sistema revoga o acesso imediatamente na próxima requisição.
3. **Assinatura de Documentos e Faturas**: Todas as faturas possuem hash único e QR Code para comprovação de autenticidade fiscal.

---

## 4. Checklist Semanal do Administrador
- [ ] Verificar integridade da API: `curl https://<seu-usuario>.pythonanywhere.com/api/v1/health`
- [ ] Confirmar execução do backup diário do banco de dados na pasta `backups/`.
- [ ] Checar saldo e fecho de caixa semanal na aba `Contabilidade & Fecho`.
- [ ] Validar a sincronização dos técnicos de piquete no app móvel Staff.
- [ ] Verificar se há contratos pendentes ou sem associação e executar a auto-reparação caso necessário.
