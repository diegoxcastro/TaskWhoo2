import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/contexts/TasksContext";
import { Todo } from "@shared/schema";
import { cn } from "@/lib/utils";
import { PlusCircle, CheckCircle, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from 'axios';

interface TodosListProps {
  todos: Todo[];
  isLoading: boolean;
  incompleteTodosCount: number;
}

function SortableTodo({ todo, children }: { todo: Todo, children: (listeners: any) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </div>
  );
}

export default function TodosList({ todos, isLoading, incompleteTodosCount }: TodosListProps) {
  const { openAddTaskModal, checkTodo, deleteTodo, openEditTaskModal } = useTasks();
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState(todos.map(t => t.id));

  useEffect(() => { setItems(todos.map(t => t.id)); }, [todos]);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      // Atualiza ordem no backend
      await axios.patch('/api/todos/order', { ids: newItems });
    }
  };

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

  // Filtra as tarefas com base na aba ativa
  const filteredTodos = todos.filter(todo => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return !todo.completed;
    if (activeTab === "completed") return todo.completed;
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="mb-4 border-b border-gray-200 pb-2">
        <div className="flex justify-between items-center">
          <h2 className="font-heading font-semibold text-xl flex items-center text-amber-800">
            Afazeres
            {incompleteTodosCount > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {incompleteTodosCount}
              </span>
            )}
          </h2>
          <div>
            {/* Tab navigation for todos categories */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-transparent h-6 p-0">
                <TabsTrigger 
                  value="all" 
                  className="text-xs px-2 h-6 data-[state=active]:bg-transparent data-[state=active]:text-amber-600 data-[state=active]:underline data-[state=active]:shadow-none"
                >
                  Todos
                </TabsTrigger>
                <TabsTrigger 
                  value="active" 
                  className="text-xs px-2 h-6 data-[state=active]:bg-transparent data-[state=active]:text-amber-600 data-[state=active]:underline data-[state=active]:shadow-none"
                >
                  Pendentes
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="text-xs px-2 h-6 data-[state=active]:bg-transparent data-[state=active]:text-amber-600 data-[state=active]:underline data-[state=active]:shadow-none"
                >
                  Concluídos
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Add New Todo Button */}
      <button 
        className="w-full text-left mb-4 p-3 border border-dashed border-yellow-300 rounded-md hover:border-amber-500 hover:bg-yellow-100 transition-colors flex items-center"
        onClick={() => openAddTaskModal('todo')}
      >
        <PlusCircle className="text-amber-500 mr-2 h-5 w-5" />
        <span className="text-amber-700">Adicionar Afazer</span>
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
        ) : filteredTodos.length === 0 ? (
          <div className="text-center p-4 text-amber-700">
            {activeTab === "all" 
              ? "Nenhuma tarefa encontrada. Adicione sua primeira tarefa!"
              : activeTab === "active" 
                ? "Nenhuma tarefa pendente. Bom trabalho!"
                : "Nenhuma tarefa concluída ainda."}
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              {filteredTodos.map((todo) => (
                <SortableTodo key={todo.id} todo={todo}>
                  {(listeners) => (
                    <div
                      className={cn(
                        "task-card bg-white border border-gray-200 rounded-md p-3 transition-all",
                        todo.completed ? "bg-yellow-100" : "",
                        getPriorityClass(todo.priority)
                      )}
                      onClick={() => openEditTaskModal('todo', todo)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-start">
                        {/* Drag handle */}
                        <button
                          className="mr-2 cursor-grab text-amber-400 hover:text-amber-600"
                          style={{ background: 'none', border: 'none', padding: 0 }}
                          {...listeners}
                          tabIndex={-1}
                          aria-label="Mover tarefa"
                        >
                          <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
                        </button>
                        <Checkbox
                          id={`todo-${todo.id}`}
                          checked={todo.completed}
                          onCheckedChange={(checked) => {
                            if (typeof checked === 'boolean') {
                              checkTodo(todo.id, checked);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "mt-1 mr-3 h-5 w-5 rounded-full border-2",
                            todo.completed 
                              ? "border-amber-500 bg-amber-500 text-white" 
                              : "border-amber-300"
                          )}
                        />
                        <div className="flex-grow">
                          <div className="flex justify-between">
                            <span className={cn(
                              "font-medium", 
                              todo.completed 
                                ? "line-through text-amber-400" 
                                : "text-amber-800"
                            )}>
                              {todo.title}
                            </span>
                            <div className="flex items-center">
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full mr-2">
                                +{todo.priority === 'trivial' ? '1' : todo.priority === 'easy' ? '2' : todo.priority === 'medium' ? '5' : '10'}
                              </span>
                              <button 
                                className="text-amber-400 hover:text-red-500 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                                    deleteTodo(todo.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {todo.notes && (
                            <p className="text-xs text-amber-600 mt-1">{todo.notes}</p>
                          )}
                          {todo.dueDate && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Prazo: {todo.dueDate instanceof Date ? format(todo.dueDate, 'dd/MM/yyyy') : format(new Date(todo.dueDate), 'dd/MM/yyyy')}
                            </p>
                          )}
                          {todo.completed && todo.completedAt && (
                            <p className="text-xs text-amber-400 mt-1 flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completado em: {format(new Date(todo.completedAt), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </SortableTodo>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
      
      {/* Empty state if no todos at all */}
      {todos.length === 0 && !isLoading && (
        <div className="mt-6 text-center p-4 bg-yellow-100 rounded-lg">
          <CheckCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-amber-700">Esses são os seus Afazeres</p>
          <p className="text-xs text-amber-600 mt-1">
            Afazeres concluídos são concluídos apenas uma vez. Adicione coisas em 
            sua lista para verificar em seus afazeres para aumentar o nível deles.
          </p>
        </div>
      )}
    </div>
  );
}
