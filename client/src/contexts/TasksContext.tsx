import { createContext, useContext, ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { Habit, Daily, Todo, InsertHabit, InsertDaily, InsertTodo } from "@shared/schema";

interface TasksContextValue {
  habits: Habit[];
  dailies: Daily[];
  todos: Todo[];
  isLoading: boolean;
  createHabit: (habit: InsertHabit) => Promise<void>;
  updateHabit: (id: number, habit: Partial<InsertHabit>) => Promise<void>;
  deleteHabit: (id: number) => Promise<void>;
  scoreHabit: (id: number, direction: 'up' | 'down') => Promise<void>;
  createDaily: (daily: InsertDaily) => Promise<void>;
  updateDaily: (id: number, daily: Partial<InsertDaily>) => Promise<void>;
  deleteDaily: (id: number) => Promise<void>;
  checkDaily: (id: number, completed: boolean) => Promise<void>;
  createTodo: (todo: InsertTodo) => Promise<void>;
  updateTodo: (id: number, todo: Partial<InsertTodo>) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  checkTodo: (id: number, completed: boolean) => Promise<void>;
  showAddTaskModal: boolean;
  taskModalType: 'habit' | 'daily' | 'todo';
  openAddTaskModal: (type: 'habit' | 'daily' | 'todo') => void;
  closeAddTaskModal: () => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [taskModalType, setTaskModalType] = useState<'habit' | 'daily' | 'todo'>('habit');

  // Fetch tasks only if authenticated
  const { data: habits = [], isLoading: habitsLoading } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: isAuthenticated
  });

  const { data: dailies = [], isLoading: dailiesLoading } = useQuery<Daily[]>({
    queryKey: ["/api/dailies"],
    enabled: isAuthenticated
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
    enabled: isAuthenticated
  });

  // Habit mutations
  const createHabitMutation = useMutation({
    mutationFn: async (habitData: InsertHabit) => {
      const res = await apiRequest("POST", "/api/habits", habitData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Habit created",
        description: "Your new habit has been created successfully",
      });
      closeAddTaskModal();
    },
    onError: (error) => {
      toast({
        title: "Failed to create habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, habit }: { id: number; habit: Partial<InsertHabit> }) => {
      const res = await apiRequest("PATCH", `/api/habits/${id}`, habit);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Habit updated",
        description: "Your habit has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/habits/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Habit deleted",
        description: "Your habit has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const scoreHabitMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: 'up' | 'down' }) => {
      const res = await apiRequest("POST", `/api/habits/${id}/score/${direction}`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      
      const rewardText = data.reward > 0 
        ? `+${data.reward} XP, +${Math.floor(data.reward / 2)} coins` 
        : `${data.reward} health`;
      
      toast({
        title: data.reward > 0 ? "Habit scored!" : "Negative habit",
        description: `${data.habit.title}: ${rewardText}`,
        variant: data.reward > 0 ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to score habit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  // Daily mutations
  const createDailyMutation = useMutation({
    mutationFn: async (dailyData: InsertDaily) => {
      const res = await apiRequest("POST", "/api/dailies", dailyData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dailies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Daily created",
        description: "Your new daily task has been created successfully",
      });
      closeAddTaskModal();
    },
    onError: (error) => {
      toast({
        title: "Failed to create daily",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateDailyMutation = useMutation({
    mutationFn: async ({ id, daily }: { id: number; daily: Partial<InsertDaily> }) => {
      const res = await apiRequest("PATCH", `/api/dailies/${id}`, daily);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dailies"] });
      toast({
        title: "Daily updated",
        description: "Your daily task has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update daily",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteDailyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/dailies/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dailies"] });
      toast({
        title: "Daily deleted",
        description: "Your daily task has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete daily",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const checkDailyMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("POST", `/api/dailies/${id}/check`, { completed });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dailies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      
      if (data.reward > 0) {
        toast({
          title: "Daily completed!",
          description: `${data.daily.title}: +${data.reward} XP, +${Math.floor(data.reward / 2)} coins`,
        });
      } else if (data.reward < 0) {
        toast({
          title: "Daily missed",
          description: `${data.daily.title}: ${data.reward} health`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Daily unchecked",
          description: `${data.daily.title} marked as incomplete`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to check daily",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  // Todo mutations
  const createTodoMutation = useMutation({
    mutationFn: async (todoData: InsertTodo) => {
      const res = await apiRequest("POST", "/api/todos", todoData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Todo created",
        description: "Your new todo has been created successfully",
      });
      closeAddTaskModal();
    },
    onError: (error) => {
      toast({
        title: "Failed to create todo",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, todo }: { id: number; todo: Partial<InsertTodo> }) => {
      const res = await apiRequest("PATCH", `/api/todos/${id}`, todo);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Todo updated",
        description: "Your todo has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update todo",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/todos/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Todo deleted",
        description: "Your todo has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete todo",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const checkTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("POST", `/api/todos/${id}/check`, { completed });
      return res.json();
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/todos"] });
      const previousTodos = queryClient.getQueryData<Todo[]>(["/api/todos"]);
      if (previousTodos) {
        queryClient.setQueryData<Todo[]>(["/api/todos"],
          previousTodos.map(todo =>
            todo.id === id ? { ...todo, completed } : todo
          )
        );
      }
      return { previousTodos };
    },
    onError: (err, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(["/api/todos"], context.previousTodos);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
    },
    onSuccess: (data) => {
      if (data.reward > 0) {
        toast({
          title: "Todo completed!",
          description: `${data.todo.title}: +${data.reward} XP, +${Math.floor(data.reward / 2)} coins`,
        });
      } else {
        toast({
          title: "Todo unchecked",
          description: `${data.todo.title} marked as incomplete`,
        });
      }
    },
  });

  // Task modal functions
  const openAddTaskModal = (type: 'habit' | 'daily' | 'todo') => {
    setTaskModalType(type);
    setShowAddTaskModal(true);
  };

  const closeAddTaskModal = () => {
    setShowAddTaskModal(false);
  };

  // Create methods
  const createHabit = async (habit: InsertHabit) => {
    await createHabitMutation.mutateAsync(habit);
  };

  const updateHabit = async (id: number, habit: Partial<InsertHabit>) => {
    await updateHabitMutation.mutateAsync({ id, habit });
  };

  const deleteHabit = async (id: number) => {
    await deleteHabitMutation.mutateAsync(id);
  };

  const scoreHabit = async (id: number, direction: 'up' | 'down') => {
    await scoreHabitMutation.mutateAsync({ id, direction });
  };

  const createDaily = async (daily: InsertDaily) => {
    await createDailyMutation.mutateAsync(daily);
  };

  const updateDaily = async (id: number, daily: Partial<InsertDaily>) => {
    await updateDailyMutation.mutateAsync({ id, daily });
  };

  const deleteDaily = async (id: number) => {
    await deleteDailyMutation.mutateAsync(id);
  };

  const checkDaily = async (id: number, completed: boolean) => {
    await checkDailyMutation.mutateAsync({ id, completed });
  };

  const createTodo = async (todo: InsertTodo) => {
    await createTodoMutation.mutateAsync(todo);
  };

  const updateTodo = async (id: number, todo: Partial<InsertTodo>) => {
    await updateTodoMutation.mutateAsync({ id, todo });
  };

  const deleteTodo = async (id: number) => {
    await deleteTodoMutation.mutateAsync(id);
  };

  const checkTodo = async (id: number, completed: boolean) => {
    await checkTodoMutation.mutateAsync({ id, completed });
  };

  return (
    <TasksContext.Provider
      value={{
        habits,
        dailies,
        todos,
        isLoading: habitsLoading || dailiesLoading || todosLoading,
        createHabit,
        updateHabit,
        deleteHabit,
        scoreHabit,
        createDaily,
        updateDaily,
        deleteDaily,
        checkDaily,
        createTodo,
        updateTodo,
        deleteTodo,
        checkTodo,
        showAddTaskModal,
        taskModalType,
        openAddTaskModal,
        closeAddTaskModal,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
}
