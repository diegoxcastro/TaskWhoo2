import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/contexts/TasksContext";
import { Daily } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusCircle, CheckCircle, Clock, Activity, Dumbbell, Sun, 
  Moon, Coffee, Book, Music, Heart, Globe, Star 
} from "lucide-react";
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from 'axios';

interface DailiesListProps {
  dailies: Daily[];
  isLoading: boolean;
  incompleteDailiesCount: number;
}

function SortableDaily({ daily, children }: { daily: Daily, children: (listeners: any) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: daily.id });
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

export default function DailiesList({ dailies, isLoading, incompleteDailiesCount }: DailiesListProps) {
  const { openAddTaskModal, checkDaily, deleteDaily, openEditTaskModal } = useTasks();
  const [activeTab, setActiveTab] = useState("all");
  const [items, setItems] = useState(dailies.map(d => d.id));

  useEffect(() => { setItems(dailies.map(d => d.id)); }, [dailies]);

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
  
  // Function to get the correct icon component based on the icon name
  const getIconComponent = (iconName: string | null) => {
    switch (iconName) {
      case 'CheckCircle': return CheckCircle;
      case 'Clock': return Clock;
      case 'Activity': return Activity;
      case 'Dumbbell': return Dumbbell;
      case 'Sun': return Sun;
      case 'Moon': return Moon;
      case 'Coffee': return Coffee;
      case 'Book': return Book;
      case 'Music': return Music;
      case 'Heart': return Heart;
      case 'Globe': return Globe;
      case 'Star': return Star;
      default: return CheckCircle;
    }
  };

  // Filtra as tarefas diárias com base na aba ativa
  const filteredDailies = dailies.filter(daily => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return !daily.completed;
    if (activeTab === "completed") return daily.completed;
    return true;
  });

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      // Atualiza ordem no backend
      await axios.patch('/api/dailies/order', { ids: newItems });
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-transparent h-6 p-0">
                <TabsTrigger 
                  value="all" 
                  className="text-xs px-2 h-6 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:underline data-[state=active]:shadow-none"
                >
                  Todos
                </TabsTrigger>
                <TabsTrigger 
                  value="active" 
                  className="text-xs px-2 h-6 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:underline data-[state=active]:shadow-none"
                >
                  Pendentes
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="text-xs px-2 h-6 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:underline data-[state=active]:shadow-none"
                >
                  Concluídos
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
        ) : filteredDailies.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            {activeTab === "all" 
              ? "Nenhuma tarefa diária encontrada. Adicione sua primeira tarefa diária!"
              : activeTab === "active" 
                ? "Nenhuma tarefa pendente. Bom trabalho!"
                : "Nenhuma tarefa concluída ainda."}
          </div>
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              {filteredDailies.map((daily) => (
                <SortableDaily key={daily.id} daily={daily}>
                  {(listeners) => (
                    <div
                      className={cn(
                        "task-card bg-white border border-gray-200 rounded-md p-3 transition-all",
                        daily.completed ? "bg-gray-50" : "",
                        getPriorityClass(daily.priority)
                      )}
                      onClick={() => openEditTaskModal('daily', daily)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-start">
                        {/* Drag handle */}
                        <button
                          className="mr-2 cursor-grab text-gray-400 hover:text-primary"
                          style={{ background: 'none', border: 'none', padding: 0 }}
                          {...listeners}
                          tabIndex={-1}
                          aria-label="Mover tarefa"
                        >
                          <span style={{ fontSize: 18, lineHeight: 1 }}>☰</span>
                        </button>
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
                            <div className="flex items-center">
                              {daily.icon && (
                                <div className="mr-2 text-primary">
                                  {React.createElement(getIconComponent(daily.icon), { size: 16 })}
                                </div>
                              )}
                              <span className={cn("font-medium", daily.completed && "line-through text-gray-500")}>
                                {daily.title}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mr-2">
                                +{daily.priority === 'trivial' ? '1' : daily.priority === 'easy' ? '2' : daily.priority === 'medium' ? '5' : '10'}
                              </span>
                              <button 
                                className="text-gray-400 hover:text-red-500 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Tem certeza que deseja excluir esta tarefa diária?')) {
                                    deleteDaily(daily.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {daily.notes && (
                            <p className="text-xs text-gray-500 mt-1">{daily.notes}</p>
                          )}
                          {daily.streak > 0 && (
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-amber-600 font-medium">
                                Sequência: {daily.streak} {daily.streak === 1 ? 'dia' : 'dias'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </SortableDaily>
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
