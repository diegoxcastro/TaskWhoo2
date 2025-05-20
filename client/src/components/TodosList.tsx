import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/contexts/TasksContext";
import { Todo } from "@shared/schema";
import { cn } from "@/lib/utils";
import { PlusCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface TodosListProps {
  todos: Todo[];
  isLoading: boolean;
  incompleteTodosCount: number;
}

export default function TodosList({ todos, isLoading, incompleteTodosCount }: TodosListProps) {
  const { openAddTaskModal, checkTodo } = useTasks();

  // Get priority class based on todo priority
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'trivial': return 'border-l-4 border-gray-400';
      case 'easy': return 'border-l-4 border-green-500';
      case 'medium': return 'border-l-4 border-amber-500';
      case 'hard': return 'border-l-4 border-red-500';
      default: return '';
    }
  };

  // Filter incomplete todos
  const incompleteTodos = todos.filter(todo => !todo.completed);
  // Filter completed todos
  const completedTodos = todos.filter(todo => todo.completed);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="mb-4 border-b pb-2">
        <div className="flex justify-between items-center">
          <h2 className="font-heading font-semibold text-xl flex items-center">
            Afazeres
            {incompleteTodosCount > 0 && (
              <span className="ml-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {incompleteTodosCount}
              </span>
            )}
          </h2>
          <div>
            {/* Tab navigation for todos categories */}
            <div className="text-xs text-gray-500 space-x-2">
              <a href="#" className="underline text-primary font-medium">Todos</a>
              <a href="#" className="hover:underline">Ativos</a>
              <a href="#" className="hover:underline">Com Data</a>
              <a href="#" className="hover:underline">Feitos</a>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add New Todo Button */}
      <button 
        className="w-full text-left mb-4 p-3 border border-dashed border-gray-300 rounded-md hover:border-primary hover:bg-gray-50 transition-colors flex items-center"
        onClick={() => openAddTaskModal('todo')}
      >
        <PlusCircle className="text-gray-400 mr-2 h-5 w-5" />
        <span className="text-gray-500">Adicionar Afazer</span>
      </button>
      
      {/* Incomplete Todos List */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading skeletons
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-md p-3">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ))
        ) : incompleteTodos.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            Nenhuma tarefa pendente. Adicione sua primeira tarefa!
          </div>
        ) : (
          incompleteTodos.map((todo) => (
            <div 
              key={todo.id} 
              className={cn(
                "task-card bg-white border border-gray-200 rounded-md p-3 transition-all",
                getPriorityClass(todo.priority)
              )}
            >
              <div className="flex items-start">
                <Checkbox
                  id={`todo-${todo.id}`}
                  checked={todo.completed}
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      checkTodo(todo.id, checked);
                    }
                  }}
                  className="mt-1 mr-3 h-5 w-5 rounded border-2 border-gray-300"
                />
                <div className="flex-grow">
                  <span className="font-medium">{todo.title}</span>
                  {todo.notes && (
                    <p className="text-xs text-gray-500 mt-1">{todo.notes}</p>
                  )}
                  {todo.dueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Prazo: {format(new Date(todo.dueDate), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Completed Todos Message */}
      {completedTodos.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-sm text-gray-700 mb-2">Completados ({completedTodos.length})</h3>
          <div className="space-y-2">
            {completedTodos.map((todo) => (
              <div 
                key={todo.id} 
                className="bg-gray-50 border border-gray-200 rounded-md p-2 transition-all"
              >
                <div className="flex items-start">
                  <Checkbox
                    id={`todo-completed-${todo.id}`}
                    checked={todo.completed}
                    onCheckedChange={(checked) => {
                      if (typeof checked === 'boolean') {
                        checkTodo(todo.id, checked);
                      }
                    }}
                    className="mt-1 mr-3 h-4 w-4 rounded border-2 border-gray-300"
                  />
                  <div className="flex-grow">
                    <span className="text-sm text-gray-500 line-through">{todo.title}</span>
                    {todo.completedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Completado em: {format(new Date(todo.completedAt), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Empty state if no todos at all */}
      {todos.length === 0 && !isLoading && (
        <div className="mt-6 text-center p-4 bg-gray-50 rounded-lg">
          <CheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Esses são os seus Afazeres</p>
          <p className="text-xs text-gray-400 mt-1">
            Afazeres concluídos são concluídos apenas uma vez. Adicione coisas em 
            sua lista para verificar em seus afazeres para aumentar o nível deles.
          </p>
        </div>
      )}
    </div>
  );
}
