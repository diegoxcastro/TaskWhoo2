import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/contexts/TasksContext";
import HabitsList from "@/components/HabitsList";
import DailiesList from "@/components/DailiesList";
import TodosList from "@/components/TodosList";
import AddTaskModal from "@/components/AddTaskModal";

export default function TasksSection() {
  const { 
    habits, 
    dailies, 
    todos, 
    isLoading,
    showAddTaskModal,
    taskModalType,
    closeAddTaskModal
  } = useTasks();
  
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter tasks based on search query
  const filteredHabits = habits.filter(habit => 
    habit.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredDailies = dailies.filter(daily => 
    daily.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredTodos = todos.filter(todo => 
    todo.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Count incomplete dailies
  const incompleteDailiesCount = dailies.filter(daily => !daily.completed).length;
  
  // Count incomplete todos
  const incompleteTodosCount = todos.filter(todo => !todo.completed).length;

  return (
    <main className="flex-grow container mx-auto px-4 py-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative flex items-center">
          <Input
            type="text"
            placeholder="Buscar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div className="absolute right-0 top-0 bottom-0 flex items-center px-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Tasks Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Habits Section */}
        <HabitsList habits={filteredHabits} isLoading={isLoading} />
        
        {/* Dailies Section */}
        <DailiesList 
          dailies={filteredDailies} 
          isLoading={isLoading} 
          incompleteDailiesCount={incompleteDailiesCount} 
        />
        
        {/* Todos Section */}
        <TodosList 
          todos={filteredTodos} 
          isLoading={isLoading}
          incompleteTodosCount={incompleteTodosCount}
        />
      </div>
      
      {/* Add Task Modal */}
      {showAddTaskModal && (
        <AddTaskModal 
          type={taskModalType} 
          onClose={closeAddTaskModal} 
        />
      )}
    </main>
  );
}
