# CAPÍTULO 10 · BACKUP E RECUPERAÇÃO DE DESASTRES

A integridade dos dados de faturamento, contratos e clientes da **OSDEL Tecnologia** é de máxima prioridade. Este capítulo detalha a rotina automatizada e manual de cópias de segurança.

---

## 1. Backup do Banco de Dados SQLite (PythonAnywhere)

No plano gratuito do PythonAnywhere, o banco de dados é um arquivo único no disco (`gestaox.db`).

### Script de Backup Rápido com Timestamp:
Crie um script `backup_sqlite.sh` na pasta do backend:
```bash
#!/usr/bin/env bash
BACKUP_DIR="/home/<seu-usuario>/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# Realiza uma cópia atômica segura usando a ferramenta sqlite3
sqlite3 /home/<seu-usuario>/gestaox/backend/gestaox.db ".backup '$BACKUP_DIR/gestaox_backup_$TIMESTAMP.db'"

# Compacta a cópia para poupar espaço
gzip "$BACKUP_DIR/gestaox_backup_$TIMESTAMP.db"

# Remove backups com mais de 30 dias
find "$BACKUP_DIR" -type f -name "*.db.gz" -mtime +30 -delete

echo "✅ Backup concluído: gestaox_backup_$TIMESTAMP.db.gz"
```

### Agendamento Diário Gratuito:
No painel do PythonAnywhere, acesse a aba **"Tasks"** e agende uma tarefa diária para executar o script:
```
bash /home/<seu-usuario>/gestaox/backend/backup_sqlite.sh
```

---

## 2. Backup do Banco de Dados PostgreSQL

Caso esteja utilizando PostgreSQL (Supabase / Neon / Cloud SQL):

### Exportação Completa (Dump):
```bash
pg_dump -h <host> -U <usuario> -d <nome_banco> -F c -b -v -f gestaox_postgres_backup.dump
```

---

## 3. Procedimento de Restauração (Recuperação de Desastre)

### Restaurar Banco SQLite:
1. No painel PythonAnywhere, vá à aba **Web** e pare a aplicação web momentaneamente.
2. Descompacte e substitua o arquivo do banco:
   ```bash
   gunzip -c /home/<seu-usuario>/backups/gestaox_backup_20261028.db.gz > /home/<seu-usuario>/gestaox/backend/gestaox.db
   ```
3. Na aba **Web**, clique em **Reload**.

### Restaurar Banco PostgreSQL:
```bash
pg_restore -h <host> -U <usuario> -d <nome_banco> -v gestaox_postgres_backup.dump
```

---

## 4. Backup do Frontend
O código do Frontend está 100% versionado no repositório GitHub. Em caso de perda do ambiente da Vercel, basta reconectar o repositório e a Vercel reconstruirá o site em 1 minuto.
