# TaskWho - Recursos de Lembretes e Notificações

Este documento descreve os novos recursos de lembretes e notificações implementados no TaskWho.

## 📋 Recursos Implementados

### 1. Lembretes Opcionais para Tarefas

- **Checkbox de Lembrete**: Todas as tarefas (hábitos, diárias e afazeres) agora possuem uma opção para ativar lembretes
- **Seletor de Horário**: Quando ativado, permite definir um horário específico para o lembrete
- **Persistência**: Os lembretes são salvos no banco de dados e mantidos entre sessões

### 2. Sistema de Webhook para Notificações

- **Configuração Flexível**: Configure uma URL de webhook para receber notificações automáticas
- **Timing Personalizável**: Defina quantos minutos antes do horário da tarefa você quer ser notificado (padrão: 15 minutos)
- **Ativação/Desativação**: Sistema pode ser ligado/desligado facilmente
- **Teste de Webhook**: Função para testar se o webhook está funcionando corretamente

### 3. Painel de Notificações no Dashboard

- **Visualização em Tempo Real**: Mostra tarefas com lembretes nas próximas 2 horas
- **Informações Detalhadas**: Exibe título, tipo, prioridade, horário e tempo restante
- **Atualização Automática**: Refresh a cada 5 minutos
- **Interface Intuitiva**: Design limpo e organizado

### 4. Página de Configurações

- **Modal de Configurações**: Interface dedicada para gerenciar preferências de notificação
- **Validação de URL**: Verificação automática de URLs de webhook
- **Configurações Persistentes**: Todas as configurações são salvas no banco de dados

## 🗄️ Estrutura do Banco de Dados

### Tabelas Modificadas

#### `habits`, `dailies`, `todos`
- `reminder_time` (timestamp, nullable): Horário do lembrete
- `has_reminder` (boolean, default false): Se o lembrete está ativo

### Novas Tabelas

#### `user_settings`
```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  webhook_url TEXT,
  reminder_minutes_before INTEGER DEFAULT 15,
  webhook_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `notification_logs`
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  task_type VARCHAR(10) NOT NULL,
  reminder_time TIMESTAMP NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT
);
```

## 🔧 API Endpoints

### Configurações
- `GET /api/settings` - Buscar configurações do usuário
- `PUT /api/settings` - Atualizar configurações do usuário

### Notificações
- `GET /api/notifications/upcoming` - Buscar próximos lembretes (2 horas)

## 📡 Formato do Webhook

Quando um lembrete é disparado, o sistema envia um POST para a URL configurada com o seguinte payload:

```json
{
  "taskId": "uuid-da-tarefa",
  "title": "Título da Tarefa",
  "type": "habit|daily|todo",
  "reminderTime": "2024-01-15T14:30:00.000Z",
  "minutesBefore": 15,
  "priority": "trivial|easy|medium|hard",
  "notes": "Notas da tarefa ou null"
}
```

## 🚀 Como Usar

### 1. Configurando Lembretes em Tarefas

1. Ao criar ou editar uma tarefa, marque a checkbox "Definir lembrete"
2. Selecione o horário desejado no campo de tempo
3. Salve a tarefa

### 2. Configurando Webhooks

1. Clique no botão "Configurações" no dashboard
2. Ative "Ativar notificações por webhook"
3. Insira a URL do seu webhook
4. Configure quantos minutos antes você quer ser notificado
5. Use o botão "Testar Webhook" para verificar se está funcionando
6. Salve as configurações

### 3. Monitorando Lembretes

- O painel "Próximos Lembretes" no dashboard mostra automaticamente tarefas com lembretes nas próximas 2 horas
- As notificações são enviadas automaticamente no horário configurado
- O sistema evita enviar notificações duplicadas

## 🔧 Serviços Compatíveis

O sistema de webhook é compatível com:

- **Zapier**: Para integração com centenas de aplicativos
- **IFTTT**: Para automações simples
- **Discord**: Webhooks para notificações em canais
- **Slack**: Notificações em workspaces
- **Microsoft Teams**: Mensagens em canais
- **Endpoints customizados**: Qualquer API que aceite POST com JSON

## 🛠️ Arquivos Modificados/Criados

### Backend
- `shared/schema.ts` - Adicionados novos campos e tabelas
- `server/storage.ts` - Novos métodos para gerenciar configurações e notificações
- `server/routes.ts` - Novos endpoints e serviço de notificação
- `migrations/0001_add_reminders_and_settings.sql` - Migration para o banco

### Frontend
- `client/src/components/AddTaskModal.tsx` - Campos de lembrete
- `client/src/components/EditTaskModal.tsx` - Campos de lembrete
- `client/src/components/SettingsModal.tsx` - Modal de configurações (novo)
- `client/src/components/NotificationPanel.tsx` - Painel de notificações (novo)
- `client/src/pages/Dashboard.tsx` - Integração dos novos componentes

## 🔄 Serviço de Notificação

O serviço roda automaticamente no servidor e:

- Verifica a cada minuto se há lembretes para enviar
- Busca usuários com webhook ativado
- Identifica tarefas dentro da janela de lembrete
- Envia notificações via HTTP POST
- Registra logs de sucesso/erro
- Evita notificações duplicadas

## 🚨 Considerações de Segurança

- URLs de webhook são validadas antes do envio
- Timeout de 5 segundos para evitar travamentos
- Logs de erro para debugging
- Não exposição de dados sensíveis nos payloads
- Validação de entrada em todos os endpoints

## 📈 Próximos Passos Sugeridos

1. **Notificações Push**: Implementar notificações do navegador
2. **Templates de Webhook**: Permitir customização do payload
3. **Múltiplos Webhooks**: Suporte a várias URLs por usuário
4. **Retry Logic**: Tentar reenviar webhooks falhados
5. **Dashboard de Logs**: Interface para visualizar histórico de notificações
6. **Integração com Email**: Envio de lembretes por email
7. **Notificações Recorrentes**: Para hábitos e diárias

---

**Desenvolvido para TaskWho** - Sistema de gerenciamento de tarefas gamificado