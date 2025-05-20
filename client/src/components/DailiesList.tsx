import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/contexts/TasksContext";
import { Daily } from "@shared/schema";
import { cn } from "@/lib/utils";
import { PlusCircle, Bell } from "lucide-react";

interface DailiesListProps {
  dailies: Daily[];
  isLoading: boolean;
  incompleteDailiesCount: number;
}

export default function DailiesList({ dailies, isLoading, incompleteDailiesCount }: DailiesListProps) {
  const { openAddTaskModal, checkDaily } = useTasks();

  // Get priority class based on daily priority
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
          <h2 className="font-heading font-semibold text-xl flex items-center">
            Diárias
            {incompleteDailiesCount > 0 && (
              <span className="ml-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {incompleteDailiesCount}
              </span>
            )}
          </h2>
          <div>
            {/* Tab navigation for dailies categories */}
            <div className="text-xs text-gray-500 space-x-2">
              <a href="#" className="underline text-primary font-medium">Todos</a>
              <a href="#" className="hover:underline">Ativos</a>
              <a href="#" className="hover:underline">Inativos</a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add New Daily Button */}
      <button 
        className="w-full text-left mb-4 p-3 border border-dashed border-gray-300 rounded-md hover:border-primary hover:bg-gray-50 transition-colors flex items-center"
        onClick={() => openAddTaskModal('daily')}
      >
        <PlusCircle className="text-gray-400 mr-2 h-5 w-5" />
        <span className="text-gray-500">Adicionar Diária</span>
      </button>
      
      {/* Daily Tasks Notification */}
      {/* Notification box removed as requested */}
      
      {/* Daily Tasks List */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading skeletons
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-md p-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            </div>
          ))
        ) : dailies.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            Nenhuma tarefa diária encontrada. Adicione sua primeira tarefa diária!
          </div>
        ) : (
          dailies.map((daily) => (
            <div 
              key={daily.id} 
              className={cn(
                "task-card bg-white border border-gray-200 rounded-md p-3 transition-all",
                daily.completed ? "bg-gray-50" : "",
                getPriorityClass(daily.priority)
              )}
            >
              <div className="flex items-start">
                <Checkbox
                  id={`daily-${daily.id}`}
                  checked={daily.completed}
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      checkDaily(daily.id, checked);
                    }
                  }}
                  className="mt-1 mr-3 h-5 w-5 rounded border-2 border-gray-300"
                />
                <div className="flex-grow">
                  <div className="flex justify-between">
                    <span className={cn("font-medium", daily.completed && "line-through text-gray-500")}>
                      {daily.title}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      +{daily.priority === 'trivial' ? '1' : daily.priority === 'easy' ? '2' : daily.priority === 'medium' ? '5' : '10'}
                    </span>
                  </div>
                  {daily.notes && (
                    <p className="text-xs text-gray-500 mt-1">{daily.notes}</p>
                  )}
                  {daily.streak > 0 && (
                    <div className="flex items-center mt-1">
                      <span className="text-xs text-amber-600 font-medium">
                        🔥 Sequência: {daily.streak} {daily.streak === 1 ? 'dia' : 'dias'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
