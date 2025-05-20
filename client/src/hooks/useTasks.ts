import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Habit, Daily, Todo, InsertHabit, InsertDaily, InsertTodo } from "@shared/schema";

export function useTasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch habits
  const {
    data: habits = [],
    isLoading: habitsLoading,
    error: habitsError
  } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Fetch dailies
  const {
    data: dailies = [],
    isLoading: dailiesLoading,
    error: dailiesError
  } = useQuery<Daily[]>({
    queryKey: ["/api/dailies"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Fetch todos
  const {
    data: todos = [],
    isLoading: todosLoading,
    error: todosError
  } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Create habit mutation
  const createHabitMutation = useMutation({
    mutationFn: async (habitData: InsertHabit) => {
      const res = await apiRequest("POST", "/api/habits", habitData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Hábito criado",
        description: "Seu novo hábito foi criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar hábito",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Update habit mutation
  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, habit }: { id: number; habit: Partial<InsertHabit> }) => {
      const res = await apiRequest("PATCH", `/api/habits/${id}`, habit);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Hábito atualizado",
        description: "Seu hábito foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar hábito",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Delete habit mutation
  const deleteHabitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/habits/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Hábito removido",
        description: "Seu hábito foi removido com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover hábito",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Score habit mutation
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
        ? `+${data.reward} XP, +${Math.floor(data.reward / 2)} moedas` 
        : `${data.reward} vida`;
      
      toast({
        title: data.reward > 0 ? "Hábito pontuado!" : "Hábito negativo",
        description: `${data.habit.title}: ${rewardText}`,
        variant: data.reward > 0 ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao pontuar hábito",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Create daily mutation
  const createDailyMutation = useMutation({
    mutationFn: async (dailyData: InsertDaily) => {
      const res = await apiRequest("POST", "/api/dailies", dailyData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dailies"] });
      toast({
        title: "Diária criada",
        description: "Sua nova tarefa diária foi criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar diária",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Update daily mutation
  const updateDailyMutation = useMutation({
    mutationFn: async ({ id, daily }: { id: number; daily: Partial<InsertDaily> }) => {
      const res = await apiRequest("PATCH", `/api/dailies/${id}`, daily);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dailies"] });
      toast({
        title: "Diária atualizada",
        description: "Sua tarefa diária foi atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar diária",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Delete daily mutation
  const deleteDailyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/dailies/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dailies"] });
      toast({
        title: "Diária removida",
        description: "Sua tarefa diária foi removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover diária",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Check daily mutation
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
          title: "Diária completada!",
          description: `${data.daily.title}: +${data.reward} XP, +${Math.floor(data.reward / 2)} moedas`,
        });
      } else if (data.reward < 0) {
        toast({
          title: "Diária perdida",
          description: `${data.daily.title}: ${data.reward} vida`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Diária desmarcada",
          description: `${data.daily.title} marcada como incompleta`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao marcar diária",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Create todo mutation
  const createTodoMutation = useMutation({
    mutationFn: async (todoData: InsertTodo) => {
      const res = await apiRequest("POST", "/api/todos", todoData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Afazer criado",
        description: "Seu novo afazer foi criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar afazer",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Update todo mutation
  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, todo }: { id: number; todo: Partial<InsertTodo> }) => {
      const res = await apiRequest("PATCH", `/api/todos/${id}`, todo);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Afazer atualizado",
        description: "Seu afazer foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar afazer",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Delete todo mutation
  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/todos/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Afazer removido",
        description: "Seu afazer foi removido com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover afazer",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Check todo mutation
  const checkTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("POST", `/api/todos/${id}/check`, { completed });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      
      if (data.reward > 0) {
        toast({
          title: "Afazer completado!",
          description: `${data.todo.title}: +${data.reward} XP, +${Math.floor(data.reward / 2)} moedas`,
        });
      } else {
        toast({
          title: "Afazer desmarcado",
          description: `${data.todo.title} marcado como incompleto`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao marcar afazer",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Return all the data and functions
  return {
    // Data
    habits,
    dailies,
    todos,
    
    // Loading states
    isLoading: habitsLoading || dailiesLoading || todosLoading,
    errors: {
      habits: habitsError,
      dailies: dailiesError,
      todos: todosError
    },
    
    // Habit functions
    createHabit: createHabitMutation.mutateAsync,
    updateHabit: updateHabitMutation.mutateAsync,
    deleteHabit: deleteHabitMutation.mutateAsync,
    scoreHabit: scoreHabitMutation.mutateAsync,
    
    // Daily functions
    createDaily: createDailyMutation.mutateAsync,
    updateDaily: updateDailyMutation.mutateAsync,
    deleteDaily: deleteDailyMutation.mutateAsync,
    checkDaily: checkDailyMutation.mutateAsync,
    
    // Todo functions
    createTodo: createTodoMutation.mutateAsync,
    updateTodo: updateTodoMutation.mutateAsync,
    deleteTodo: deleteTodoMutation.mutateAsync,
    checkTodo: checkTodoMutation.mutateAsync,
    
    // Mutation states
    isMutating: 
      createHabitMutation.isPending ||
      updateHabitMutation.isPending ||
      deleteHabitMutation.isPending ||
      scoreHabitMutation.isPending ||
      createDailyMutation.isPending ||
      updateDailyMutation.isPending ||
      deleteDailyMutation.isPending ||
      checkDailyMutation.isPending ||
      createTodoMutation.isPending ||
      updateTodoMutation.isPending ||
      deleteTodoMutation.isPending ||
      checkTodoMutation.isPending
  };
}
