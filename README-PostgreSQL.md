# TaskWho - Configuração PostgreSQL com Docker

Este projeto foi configurado para usar PostgreSQL remoto, conectando-se ao mesmo banco usado pelo n8n.

## 🚀 Configuração Rápida

### 1. Pré-requisitos
- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local)
- Rede Docker `digital_network` criada
- PostgreSQL do n8n já em execução

### 2. Verificar a Rede Docker
```bash
# A rede deve já existir (criada pelo n8n)
docker network ls | grep digital_network
```

### 3. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e ajuste conforme necessário:
```bash
cp .env.example .env
```

### 4. Iniciar os Serviços
```bash
# Subir todos os serviços
npm run docker:up

# Ou usando docker-compose diretamente
docker-compose up -d
```

### 5. Verificar os Logs
```bash
# Ver logs de todos os serviços
npm run docker:logs

# Ver logs apenas do app
docker-compose logs -f app

# Ver logs apenas do PostgreSQL
docker-compose logs -f postgres
```

## 🗄️ Gerenciamento do Banco de Dados

### Scripts Disponíveis
```bash
# Gerar migrações
npm run db:generate

# Aplicar migrações
npm run db:migrate

# Push do schema diretamente
npm run db:push

# Abrir Drizzle Studio
npm run db:studio
```

### Conexão Direta ao PostgreSQL
```bash
# Conectar ao container PostgreSQL
docker exec -it taskwho_postgres_1 psql -U postgres -d habittracker

# Ou usando cliente externo
psql -h localhost -p 5432 -U postgres -d habittracker
```

## 🔧 Configuração da Infraestrutura

### Estrutura dos Serviços
- **App**: Aplicação Node.js na porta 3000
- **PostgreSQL**: Usa o banco do n8n (container externo)
- **Rede**: `digital_network` (compartilhada com n8n)
- **Banco**: `habittracker` (criado automaticamente no PostgreSQL do n8n)

### Variáveis de Ambiente Importantes
```env
# Desabilitar armazenamento em memória
USE_MEMORY_STORAGE=false

# URL de conexão com o PostgreSQL
DATABASE_URL=postgres://postgres:ew0iuurghbhb239ubf92fb92ufb290@postgres:5432/habittracker?sslmode=disable

# Configurações do banco
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=habittracker
DB_USER=postgres
DB_PASSWORD=ew0iuurghbhb239ubf92fb92ufb290
```

## 🐛 Troubleshooting

### Problema: Erro de Conexão com o Banco
```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps

# Verificar logs do PostgreSQL
docker-compose logs postgres

# Testar conexão
docker exec taskwho_postgres_1 pg_isready -U postgres
```

### Problema: Tabelas Não Criadas
```bash
# Executar migrações manualmente
npm run db:push

# Ou recriar o banco
docker-compose down -v
docker-compose up -d
```

### Problema: App Não Conecta ao Banco
1. Verificar se a rede `digital_network` existe
2. Verificar se o PostgreSQL do n8n está rodando:
   ```bash
   docker ps | grep postgres
   ```
3. Verificar se as variáveis de ambiente estão corretas
4. Verificar se o banco `habittracker` foi criado:
   ```bash
   docker exec -it <postgres_container> psql -U postgres -l
   ```

## 📊 Monitoramento

### Health Checks
O PostgreSQL do n8n deve estar healthy. Verificar com:
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep postgres
```

### Logs Estruturados
O app registra informações detalhadas sobre:
- Status da conexão com o banco
- Queries executadas
- Erros de conexão
- Fallback para modo memória

## 🔄 Comandos Úteis

```bash
# Parar todos os serviços
npm run docker:down

# Rebuild completo
npm run docker:rebuild

# Backup do banco
docker exec taskwho_postgres_1 pg_dump -U postgres habittracker > backup.sql

# Restaurar backup
docker exec -i taskwho_postgres_1 psql -U postgres habittracker < backup.sql

# Limpar volumes (CUIDADO: apaga dados)
docker-compose down -v
```

## 🌐 Integração com n8n

Este setup usa a mesma rede (`digital_network`) do n8n, permitindo:
- Comunicação entre serviços
- Compartilhamento de recursos
- Integração com workflows do n8n

### Acessar TaskWho do n8n
URL interna: `http://app:3000`
URL externa: `http://localhost:3000`

## 📝 Notas Importantes

1. **Senha do PostgreSQL**: Use a mesma senha do n8n para consistência
2. **Rede Docker**: Certifique-se que `digital_network` existe antes de subir os serviços
3. **Volumes**: Os dados do PostgreSQL são persistidos no volume `postgres_data`
4. **SSL**: Desabilitado para conexões locais do Docker
5. **Encoding**: UTF8 configurado para suporte completo a caracteres especiais