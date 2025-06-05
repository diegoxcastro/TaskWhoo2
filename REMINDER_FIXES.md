# Correções no Sistema de Lembretes

## Problemas Identificados e Corrigidos

### 1. Lógica de Tempo Invertida
**Problema:** O sistema estava buscando lembretes no futuro em vez de verificar lembretes que deveriam ser enviados.

**Correção:** 
- Antes: `reminderWindow = now + minutesBefore`
- Depois: `reminderWindowStart = now - minutesBefore - 1min` e `reminderWindowEnd = now + 1min`

### 2. Verificação de Horário de Notificação
**Problema:** Não havia verificação se era realmente hora de enviar o lembrete.

**Correção:** Adicionada verificação:
```javascript
const notificationTime = new Date(reminderTime.getTime() - settings.reminderMinutesBefore * 60 * 1000);
if (now < notificationTime) continue; // Ainda não é hora de enviar
```

### 3. Logs Melhorados
**Adicionado:** Logs detalhados para debug:
- Janela de tempo de busca
- Horário atual vs horário de notificação
- Status de cada tarefa processada

### 4. API de Próximos Lembretes
**Melhorado:** A rota `/api/notifications/upcoming` agora inclui:
- `notificationTime`: Quando a notificação será enviada
- Cálculo correto baseado nas configurações do usuário

## Como Funciona Agora

1. **Configuração:** Usuário define `reminderMinutesBefore` (ex: 15 minutos)
2. **Lembrete:** Tarefa tem `reminderTime` (ex: 14:00)
3. **Notificação:** Sistema envia às 13:45 (reminderTime - 15 minutos)
4. **Verificação:** Sistema roda a cada minuto verificando se há lembretes para enviar

## Configurações Necessárias

Para o sistema funcionar, o usuário precisa:
1. Configurar `webhookUrl` nas configurações
2. Habilitar `webhookEnabled = true`
3. Definir `reminderMinutesBefore` (padrão: 15 minutos)
4. Criar tarefas com `hasReminder = true` e `reminderTime` definido

## Testando o Sistema

1. Configure um webhook de teste (ex: webhook.site)
2. Crie uma tarefa com lembrete para alguns minutos no futuro
3. Verifique os logs do servidor para acompanhar o processamento
4. Confirme se o webhook é chamado no horário correto

## Logs de Debug

O sistema agora exibe logs detalhados:
```
[WEBHOOK] Checking for notifications to send...
[WEBHOOK] User username (1) - webhook enabled, checking tasks...
[WEBHOOK] Time window: 2024-01-20T12:30:00.000Z to 2024-01-20T13:46:00.000Z
[WEBHOOK] Task "Exemplo" - reminderTime: 2024-01-20T14:00:00.000Z, notificationTime: 2024-01-20T13:45:00.000Z
[WEBHOOK] Task "Exemplo" - ready to send notification
```