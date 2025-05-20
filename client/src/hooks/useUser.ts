import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { calculateXpForNextLevel } from "@/lib/utils";

export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch user data
  const {
    data: user,
    isLoading,
    error,
    refetch
  } = useQuery<User>({
    queryKey: ["/api/user"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await apiRequest("PATCH", "/api/user", userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      toast({
        title: "Perfil atualizado",
        description: "Seu perfil foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
  });
  
  // Calculate various user stats
  const stats = user ? {
    healthPercentage: Math.min(100, Math.max(0, (user.health / user.maxHealth) * 100)),
    xpToNextLevel: calculateXpForNextLevel(user.level),
    xpPercentage: Math.min(100, Math.max(0, (user.experience / calculateXpForNextLevel(user.level)) * 100)),
    level: user.level,
    health: user.health,
    maxHealth: user.maxHealth,
    experience: user.experience,
    coins: user.coins
  } : null;
  
  return {
    user,
    stats,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending
  };
}
