import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Clock, AlertCircle, Zap } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface UpcomingNotification {
  id: string;
  title: string;
  type: 'habit' | 'daily' | 'todo';
  reminderTime: string;
  priority: 'trivial' | 'easy' | 'medium' | 'hard';
  notes?: string;
}

interface UserSettings {
  id?: string;
  userId: string;
  webhookUrl?: string;
  reminderMinutesBefore: number;
  webhookEnabled: boolean;
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<UpcomingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUpcomingNotifications();
    loadSettings();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadUpcomingNotifications, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadUpcomingNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/upcoming', {
        credentials: 'include',
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY || 'Uaapo3ihgoarfboufba'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        console.error('Failed to load upcoming notifications');
      }
    } catch (error) {
      console.error('Error loading upcoming notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include',
        headers: {
          'x-api-key': import.meta.env.VITE_API_KEY || 'Uaapo3ihgoarfboufba'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const testWebhook = async () => {
    if (!settings?.webhookUrl) {
      toast({
        title: "Erro",
        description: "Configure uma URL de webhook nas configurações primeiro",
        variant: "destructive"
      });
      return;
    }

    setTestingWebhook(true);
    try {
      const testPayload = {
        taskId: "test-task-id",
        title: "Teste de Webhook - TaskWho",
        type: "habit",
        reminderTime: new Date().toISOString(),
        minutesBefore: settings.reminderMinutesBefore,
        priority: "medium",
        notes: "Esta é uma notificação de teste enviada do dashboard"
      };

      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Webhook testado com sucesso!"
        });
      } else {
        toast({
          title: "Erro",
          description: `Webhook retornou status ${response.status}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Erro",
        description: "Falha ao testar webhook. Verifique a URL.",
        variant: "destructive"
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const formatReminderTime = (reminderTime: string) => {
    const time = new Date(reminderTime);
    const now = new Date();
    const diffMs = time.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 0) {
      return 'Agora';
    } else if (diffMinutes < 60) {
      return `em ${diffMinutes}min`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      if (remainingMinutes === 0) {
        return `em ${diffHours}h`;
      } else {
        return `em ${diffHours}h ${remainingMinutes}min`;
      }
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'habit': return 'Hábito';
      case 'daily': return 'Diária';
      case 'todo': return 'Afazer';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'habit': return 'bg-green-100 text-green-800';
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'trivial': return 'bg-gray-100 text-gray-600';
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'trivial': return 'Trivial';
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return priority;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Próximos Lembretes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Próximos Lembretes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Nenhum lembrete nas próximas 2 horas
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Próximos Lembretes
          <Badge variant="secondary" className="ml-auto">
            {notifications.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => {
            const reminderTime = new Date(notification.reminderTime);
            const timeString = reminderTime.toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            return (
              <div 
                key={notification.id} 
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm truncate">
                        {notification.title}
                      </h4>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getTypeColor(notification.type)}`}
                        >
                          {getTypeLabel(notification.type)}
                        </Badge>
                        
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(notification.priority)}`}
                        >
                          {getPriorityLabel(notification.priority)}
                        </Badge>
                      </div>
                      
                      {notification.notes && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-medium text-gray-900">
                        {timeString}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatReminderTime(notification.reminderTime)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-t space-y-3">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Atualizando a cada 5 minutos
          </div>
          
          {settings?.webhookEnabled && settings?.webhookUrl && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={testWebhook}
              disabled={testingWebhook}
              className="w-full flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {testingWebhook ? 'Testando...' : 'Testar Webhook'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}