import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Habit } from "@shared/schema";
import { useTasks } from "@/contexts/TasksContext";
import { cn } from "@/lib/utils";
import { PlusCircle, Plus, Minus, Trash2 } from "lucide-react";

interface HabitsListProps {
  habits: Habit[];
  isLoading: boolean;
}

export default function HabitsList({ habits, isLoading }: HabitsListProps) {
  const { openAddTaskModal, scoreHabit, deleteHabit } = useTasks();

  // Get priority class based on habit priority
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'trivial': return 'border-l-4 border-gray-400';
      case 'easy': return 'border-l-4 border-green-500';
      case 'medium': return 'border-l-4 border-amber-500';
      case 'hard': return 'border-l-4 border-red-500';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-4 border-b pb-2">
        <div className="flex justify-between items-center">
          <h2 className="font-heading font-semibold text-xl">Hábitos</h2>
          <div>
            {/* Tab navigation for habits categories */}
            <div className="text-xs text-gray-500 space-x-2">
              <a href="#" className="underline text-primary font-medium">Todos</a>
              <a href="#" className="hover:underline">Físicos</a>
              <a href="#" className="hover:underline">Fortes</a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add New Habit Button */}
      <button 
        className="w-full text-left mb-4 p-3 border border-dashed border-gray-300 rounded-md hover:border-primary hover:bg-gray-50 transition-colors flex items-center"
        onClick={() => openAddTaskModal('habit')}
      >
        <PlusCircle className="text-gray-400 mr-2 h-5 w-5" />
        <span className="text-gray-500">Adicionar Hábito</span>
      </button>
      
      {/* Habits List */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading skeletons
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))
        ) : habits.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            Nenhum hábito encontrado. Adicione seu primeiro hábito!
          </div>
        ) : (
          habits.map((habit) => (
            <div 
              key={habit.id} 
              className={cn(
                "task-card bg-white border border-gray-200 rounded-md p-3 transition-all flex items-center justify-between",
                getPriorityClass(habit.priority)
              )}
            >
              <div className="flex items-center">
                {habit.positive && (
                  <Button
                    size="sm"
                    className="w-8 h-8 p-0 rounded-full bg-green-500 text-white hover:bg-green-600 mr-3 flex items-center justify-center"
                    onClick={() => scoreHabit(habit.id, 'up')}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex-grow">
                  <div className="flex justify-between">
                    <span className="font-medium">{habit.title}</span>
                    <button 
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Tem certeza que deseja excluir este hábito?')) {
                          deleteHabit(habit.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex text-xs text-gray-500 mt-1">
                    {habit.counterUp > 0 && (
                      <span className="flex items-center mr-2 text-green-600">
                        <Plus className="h-3 w-3 mr-1" />
                        +{habit.counterUp}
                      </span>
                    )}
                    {habit.counterDown > 0 && (
                      <span className="flex items-center mr-2 text-red-600">
                        <Minus className="h-3 w-3 mr-1" />
                        -{habit.counterDown}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {habit.negative && (
                <Button
                  size="sm"
                  className="w-8 h-8 p-0 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center"
                  onClick={() => scoreHabit(habit.id, 'down')}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
