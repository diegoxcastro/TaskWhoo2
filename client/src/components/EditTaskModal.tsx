import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTasks } from "@/contexts/TasksContext";
import { Habit, Daily, Todo } from "@shared/schema";
import { CheckCircle, Clock, Activity, Dumbbell, Sun, Moon, Coffee, Book, Music, Heart, Globe, Star } from "lucide-react";

const TASK_ICONS = [
  { name: "CheckCircle", component: CheckCircle },
  { name: "Clock", component: Clock },
  { name: "Activity", component: Activity },
  { name: "Dumbbell", component: Dumbbell },
  { name: "Sun", component: Sun },
  { name: "Moon", component: Moon },
  { name: "Coffee", component: Coffee },
  { name: "Book", component: Book },
  { name: "Music", component: Music },
  { name: "Heart", component: Heart },
  { name: "Globe", component: Globe },
  { name: "Star", component: Star }
];

interface EditTaskModalProps {
  type: 'habit' | 'daily' | 'todo';
  task: Habit | Daily | Todo;
  onClose: () => void;
}

export default function EditTaskModal({ type, task, onClose }: EditTaskModalProps) {
  const { updateHabit, updateDaily, updateTodo } = useTasks();

  // Common fields
  const [title, setTitle] = useState(task.title || "");
  const [notes, setNotes] = useState(task.notes || "");
  const [priority, setPriority] = useState<"trivial" | "easy" | "medium" | "hard">((task.priority as any) || "easy");
  const [duration, setDuration] = useState((task as any).duration || 0);
  
  // Reminder fields
  const [hasReminder, setHasReminder] = useState((task as any).hasReminder || false);
  const [reminderTime, setReminderTime] = useState(() => {
    if ((task as any).reminderTime) {
      const time = new Date((task as any).reminderTime);
      return time.toTimeString().slice(0, 5); // HH:MM format
    }
    return '';
  });

  // Habit-specific fields
  const [positive, setPositive] = useState((type === 'habit' && 'positive' in task) ? !!task.positive : true);
  const [negative, setNegative] = useState((type === 'habit' && 'negative' in task) ? !!task.negative : true);

  // Daily-specific fields
  const [repeat, setRepeat] = useState(type === 'daily' && 'repeat' in task ? [...(task.repeat as boolean[])] : [true, true, true, true, true, true, true]);
  const [selectedIcon, setSelectedIcon] = useState(type === 'daily' && 'icon' in task && task.icon ? task.icon : "CheckCircle");

  // Todo-specific fields
  const [dueDate, setDueDate] = useState(type === 'todo' && 'dueDate' in task && task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");

  const handleSubmit = async () => {
    if (!title.trim()) {
      return;
    }
    try {
      if (type === 'habit') {
        await updateHabit(task.id, {
          title,
          notes: notes || undefined,
          priority,
          positive,
          negative,
          direction: positive && negative ? 'both' : positive ? 'positive' : 'negative',
          duration,
          hasReminder,
          reminderTime: hasReminder && reminderTime ? new Date(`1970-01-01T${reminderTime}:00`) : undefined,
        });
      } else if (type === 'daily') {
        await updateDaily(task.id, {
          title,
          notes: notes || undefined,
          priority,
          repeat,
          icon: selectedIcon,
          duration,
          hasReminder,
          reminderTime: hasReminder && reminderTime ? new Date(`1970-01-01T${reminderTime}:00`) : undefined,
        });
      } else if (type === 'todo') {
        await updateTodo(task.id, {
          title,
          notes: notes || undefined,
          priority,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          duration,
          hasReminder,
          reminderTime: hasReminder && reminderTime ? new Date(`1970-01-01T${reminderTime}:00`) : undefined,
        });
      }
      onClose();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleRepeatToggle = (dayIndex: number) => {
    const newRepeat = [...repeat];
    newRepeat[dayIndex] = !newRepeat[dayIndex];
    setRepeat(newRepeat);
  };

  const modalTitle = type === 'habit' 
    ? 'Editar Hábito' 
    : type === 'daily' 
      ? 'Editar Diária' 
      : 'Editar Afazer';

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              className="w-full"
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-notes">Notas (opcional)</Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais"
              className="w-full"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-difficulty">Dificuldade</Label>
            <Select 
              value={priority} 
              onValueChange={(value) => setPriority(value as any)}
            >
              <SelectTrigger id="task-difficulty">
                <SelectValue placeholder="Selecione a dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trivial">Trivial</SelectItem>
                <SelectItem value="easy">Fácil</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="hard">Difícil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="task-duration">Duração estimada (minutos)</Label>
            <Input
              id="task-duration"
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="w-full"
            />
          </div>
          
          {/* Reminder options */}
          <div className="grid gap-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="task-reminder" 
                checked={hasReminder} 
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean') {
                    setHasReminder(checked);
                    if (!checked) {
                      setReminderTime('');
                    }
                  }
                }}
              />
              <Label htmlFor="task-reminder">Definir lembrete</Label>
            </div>
            
            {hasReminder && (
              <div className="grid gap-2 ml-6">
                <Label htmlFor="reminder-time">Horário do lembrete</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </div>
          
          {/* Habit-specific options */}
          {type === 'habit' && (
            <div className="grid gap-2">
              <Label>Opções de Hábito</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="habit-positive" 
                    checked={positive} 
                    onCheckedChange={(checked) => {
                      if (typeof checked === 'boolean') {
                        setPositive(checked);
                        if (!checked && !negative) {
                          setNegative(true);
                        }
                      }
                    }}
                  />
                  <Label htmlFor="habit-positive">Positivo (+)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="habit-negative" 
                    checked={negative} 
                    onCheckedChange={(checked) => {
                      if (typeof checked === 'boolean') {
                        setNegative(checked);
                        if (!checked && !positive) {
                          setPositive(true);
                        }
                      }
                    }}
                  />
                  <Label htmlFor="habit-negative">Negativo (-)</Label>
                </div>
              </div>
            </div>
          )}
          {/* Daily-specific options */}
          {type === 'daily' && (
            <>
              <div className="grid gap-2">
                <Label>Repetir nos dias</Label>
                <div className="flex flex-wrap gap-1">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={repeat[index] ? "default" : "outline"}
                      className="w-8 h-8 p-0 rounded-full"
                      onClick={() => handleRepeatToggle(index)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Escolher ícone</Label>
                <div className="grid grid-cols-6 gap-2">
                  {TASK_ICONS.map((icon) => {
                    const IconComponent = icon.component;
                    return (
                      <div
                        key={icon.name}
                        onClick={() => setSelectedIcon(icon.name)}
                        className={`flex items-center justify-center p-2 rounded-md cursor-pointer border ${
                          selectedIcon === icon.name 
                            ? 'border-primary bg-primary/10' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {/* Todo-specific options */}
          {type === 'todo' && (
            <div className="grid gap-2">
              <Label htmlFor="task-due-date">Data de vencimento (opcional)</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full"
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}