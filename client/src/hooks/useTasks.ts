import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Habit, Daily, Todo, InsertHabit, InsertDaily, InsertTodo } from "@shared/schema";

// Definindo os tipos que estavam faltando
type HabitType = Habit;
type DailyType = Daily;
type TodoType = Todo;

type ScoreHabitType = {
  id: number;
  type: "up" | "down";
};

type ScoreHabitResponseType = {
  habit: any;
};

type CheckDailyType = {
  id: number;
  checked: boolean;
};

type CheckDailyResponseType = {
  daily: any;
};

type CheckTodoType = {
  id: number;
  checked: boolean;
};

type CheckTodoResponseType = {
  todo: any;
};

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
    mutationFn: async (data: ScoreHabitType) => {
      return apiRequest<ScoreHabitResponseType, ScoreHabitType>(
        `/api/habits/${data.id}/score/${data.type}`,
        {
          method: "POST",
          data: {},
        },
      );
    },
    onMutate: async (newHabitScoreData: ScoreHabitType) => {
      await queryClient.cancelQueries({ queryKey: ["/api/habits"] });
      const previousHabits = queryClient.getQueryData<HabitType[]>(["/api/habits"]);
      if (previousHabits) {
        queryClient.setQueryData<HabitType[]>(
          ["/api/habits"],
          previousHabits.map(habit =>
            habit.id === newHabitScoreData.id ? 
            { 
              ...habit, 
              // Simular a atualização do score aqui pode ser complexo 
              // dependendo da lógica do backend (ex: streak, valor do score).
              // Para uma UI simples, podemos apenas invalidar ou refetch.
              // Se a lógica de score for simples (ex: +1/-1), pode ser aplicada aqui.
              // Por ora, vamos focar na invalidação e deixar o backend cuidar do score.
              updatedAt: new Date().toISOString() 
            } : habit
          )
        );
      }
      return { previousHabits };
    },
    onSuccess: (data) => {
      // queryClient.invalidateQueries({ queryKey: ["/api/habits"] }); // Handled by onSettled
      // queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      
      toast({
        title: "Hábito pontuado!",
      });
    },
    onError: (error: any, newHabitScoreData, context) => {
      toast({
        title: "Erro ao pontuar hábito",
        description: error.message || "Ocorreu um erro",
        variant: "destructive",
      });
      if (context?.previousHabits) {
        queryClient.setQueryData<HabitType[]>(["/api/habits"], context.previousHabits);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
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
    mutationFn: async (data: CheckDailyType) => {
      return apiRequest<CheckDailyResponseType, CheckDailyType>(
        `/api/dailies/${data.id}/check`,
        {
          method: "POST",
          data: { completed: data.checked },
        },
      );
    },
    onMutate: async (newDailyData: CheckDailyType) => {
      await queryClient.cancelQueries({ queryKey: ["/api/dailies"] });
      const previousDailies = queryClient.getQueryData<DailyType[]>(["/api/dailies"]);
      if (previousDailies) {
        queryClient.setQueryData<DailyType[]>(
          ["/api/dailies"],
          previousDailies.map(daily =>
            daily.id === newDailyData.id ? { ...daily, completed: newDailyData.checked, updatedAt: new Date().toISOString() } : daily
          )
        );
      }
      return { previousDailies };
    },
    onSuccess: (data) => {
      // queryClient.invalidateQueries({ queryKey: ["/api/dailies"] }); // Handled by onSettled
      // queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      
      toast({
        title: "Tarefa diária atualizada!",
      });
    },
    onError: (error: any, newDailyData, context) => {
      toast({
        title: "Erro ao concluir tarefa diária",
        description: error.message || "Ocorreu um erro",
        variant: "destructive",
      });
      if (context?.previousDailies) {
        queryClient.setQueryData<DailyType[]>(["/api/dailies"], context.previousDailies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dailies"] });
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
    mutationFn: async (data: CheckTodoType) => {
      return apiRequest<CheckTodoResponseType, CheckTodoType>(
        `/api/todos/${data.id}/check`,
        {
          method: "POST",
          data: { completed: data.checked },
        },
      );
    },
    onMutate: async (newTodoData: CheckTodoType) => {
      // Cancelar queries pendentes para evitar sobrescrever a atualização otimista
      await queryClient.cancelQueries({ queryKey: ["/api/todos"] });

      // Salvar o estado anterior
      const previousTodos = queryClient.getQueryData<TodoType[]>(["/api/todos"]);

      // Atualizar otimisticamente para o novo valor
      if (previousTodos) {
        queryClient.setQueryData<TodoType[]>(
          ["/api/todos"],
          previousTodos.map(todo =>
            todo.id === newTodoData.id ? { ...todo, completed: newTodoData.checked, updatedAt: new Date().toISOString() } : todo
          )
        );
      }

      // Retornar o contexto com o estado anterior
      return { previousTodos };
    },
    onSuccess: (data, variables, context) => {
      // A invalidação de ["/api/todos"] agora é tratada por onSettled.
      // As invalidações de usuário/autenticação já estão comentadas da etapa anterior.
      
      toast({
        title: "Tarefa atualizada!",
      });
    },
    onError: (error: any, newTodoData, context) => {
      toast({
        title: "Erro ao concluir tarefa",
        description: error.message || "Ocorreu um erro",
        variant: "destructive",
      });
      // Reverter para o estado anterior em caso de erro
      if (context?.previousTodos) {
        queryClient.setQueryData<TodoType[]>(["/api/todos"], context.previousTodos);
      }
    },
    onSettled: (data, error, variables, context) => {
      // Invalidar a query de todos para garantir consistência com o servidor
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
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
