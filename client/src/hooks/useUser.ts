import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

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

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer upload do avatar');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
      toast({
        title: "Avatar atualizado",
        description: "Sua foto de perfil foi atualizada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar avatar",
        description: error instanceof Error ? error.message : "Por favor, tente novamente",
        variant: "destructive",
      });
    },
   });

   // Remove avatar mutation
   const removeAvatarMutation = useMutation({
     mutationFn: async () => {
       const response = await fetch('/api/user/avatar', {
         method: 'DELETE',
         credentials: 'include',
       });
       
       if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.message || 'Erro ao remover avatar');
       }
       
       return response.json();
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/user"] });
       queryClient.invalidateQueries({ queryKey: ["/api/auth/check"] });
       toast({
         title: "Avatar removido",
         description: "Sua foto de perfil foi removida com sucesso",
       });
     },
     onError: (error) => {
       toast({
         title: "Erro ao remover avatar",
         description: error instanceof Error ? error.message : "Por favor, tente novamente",
         variant: "destructive",
       });
     },
   });
   
   return {
    user,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutate,
     isUpdating: updateProfileMutation.isPending,
     uploadAvatar: uploadAvatarMutation.mutate,
     isUploadingAvatar: uploadAvatarMutation.isPending,
     removeAvatar: removeAvatarMutation.mutate,
     isRemovingAvatar: removeAvatarMutation.isPending,
  };
}
