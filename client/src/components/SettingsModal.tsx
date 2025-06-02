import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
  id?: string;
  userId: string;
  webhookUrl?: string;
  reminderMinutesBefore: number;
  webhookEnabled: boolean;
}

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState<UserSettings>({
    userId: '',
    webhookUrl: '',
    reminderMinutesBefore: 15,
    webhookEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error('Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          webhookUrl: settings.webhookUrl || undefined,
          reminderMinutesBefore: settings.reminderMinutesBefore,
          webhookEnabled: settings.webhookEnabled
        })
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso"
        });
        onClose();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    if (!settings.webhookUrl) {
      toast({
        title: "Erro",
        description: "Por favor, insira uma URL de webhook primeiro",
        variant: "destructive"
      });
      return;
    }

    try {
      const testPayload = {
        taskId: "test-task-id",
        title: "Tarefa de Teste",
        type: "habit",
        reminderTime: new Date().toISOString(),
        minutesBefore: settings.reminderMinutesBefore,
        priority: "medium",
        notes: "Esta é uma notificação de teste do TaskWho"
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
    }
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="text-sm text-gray-500">Carregando...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações de Notificação</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="webhook-enabled" 
                checked={settings.webhookEnabled} 
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean') {
                    setSettings(prev => ({ ...prev, webhookEnabled: checked }));
                  }
                }}
              />
              <Label htmlFor="webhook-enabled">Ativar notificações por webhook</Label>
            </div>
          </div>
          
          {settings.webhookEnabled && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="webhook-url">URL do Webhook</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={settings.webhookUrl || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  placeholder="https://exemplo.com/webhook"
                  className="w-full"
                />
                <div className="text-xs text-gray-500">
                  URL que receberá as notificações de lembrete das tarefas
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="reminder-minutes">Lembrar quantos minutos antes</Label>
                <Input
                  id="reminder-minutes"
                  type="number"
                  min="1"
                  max="1440"
                  value={settings.reminderMinutesBefore}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    reminderMinutesBefore: parseInt(e.target.value) || 15 
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500">
                  Tempo em minutos antes do horário da tarefa para enviar o lembrete
                </div>
              </div>
              
              <div className="flex justify-start">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={testWebhook}
                  disabled={!settings.webhookUrl}
                >
                  Testar Webhook
                </Button>
              </div>
            </>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="text-sm font-medium text-blue-800 mb-2">Como funciona:</div>
            <div className="text-xs text-blue-700 space-y-1">
              <div>• Configure um webhook para receber notificações automáticas</div>
              <div>• Defina horários de lembrete nas suas tarefas</div>
              <div>• O sistema enviará um POST com dados da tarefa no horário configurado</div>
              <div>• Use serviços como Zapier, IFTTT ou seu próprio endpoint</div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}