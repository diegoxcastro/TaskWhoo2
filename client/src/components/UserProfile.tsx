import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, CheckCircle, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Lista de avatares predefinidos
const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80",
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=80&h=80"
];

export default function UserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  
  if (!user) return null;
  
  // Calculate percentages for progress bars
  const healthPercentage = Math.min(100, Math.max(0, (user.health / user.maxHealth) * 100));
  const xpToNextLevel = 50 * (user.level); // Simple formula: level * 50
  const xpPercentage = Math.min(100, Math.max(0, (user.experience / xpToNextLevel) * 100));

  const handleSaveAvatar = async () => {
    try {
      const newAvatar = selectedAvatar || customAvatarUrl || user.avatar;
      
      // Fazer a requisição para atualizar o avatar
      const response = await apiRequest("PATCH", "/api/user", { avatar: newAvatar });
      
      if (response.ok) {
        toast({
          title: "Avatar atualizado",
          description: "Seu avatar foi atualizado com sucesso!",
        });
        
        // Recarregar a página para atualizar o avatar
        window.location.reload();
      } else {
        throw new Error("Falha ao atualizar o avatar");
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o avatar",
        variant: "destructive",
      });
    } finally {
      setIsEditingAvatar(false);
    }
  };

  return (
    <div className="bg-primary-dark text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center">
          <div className="mr-4 relative">
            {isEditingAvatar ? (
              <div className="bg-white p-3 rounded-lg absolute -bottom-2 -left-2 shadow-lg z-10" style={{ width: "250px" }}>
                <div className="flex justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Escolha um avatar</h3>
                  <button onClick={() => setIsEditingAvatar(false)} className="text-gray-500">
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {AVATAR_OPTIONS.map((avatar, index) => (
                    <div 
                      key={index}
                      className={`cursor-pointer rounded-full border-2 ${selectedAvatar === avatar ? 'border-primary' : 'border-transparent'}`}
                      onClick={() => setSelectedAvatar(avatar)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={avatar} alt="Avatar option" />
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <Input
                    placeholder="URL da imagem personalizada"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className="text-xs h-7 mb-2"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSaveAvatar} className="text-xs">
                      <CheckCircle size={14} className="mr-1" /> Salvar
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 cursor-pointer shadow-md"
                onClick={() => setIsEditingAvatar(true)}
              >
                <Pencil size={12} className="text-primary" />
              </div>
            )}
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage src={user.avatar || AVATAR_OPTIONS[0]} alt={user.username} />
              <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-grow">
            <div className="flex items-center">
              <h2 className="font-heading font-semibold text-lg text-black">{user.username}</h2>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 ml-2 text-yellow-300"
              >
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-300 text-sm">
              Nível {user.level} Aventureiro
            </p>
            
            {/* Progress bars */}
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-300">Saúde</span>
                <span className="text-green-300">{user.health}/{user.maxHealth}</span>
              </div>
              <Progress value={healthPercentage} className="h-2 bg-green-900" indicatorClassName="bg-green-500" />
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-300">Experiência</span>
                <span className="text-yellow-300">{user.experience}/{xpToNextLevel} XP</span>
              </div>
              <Progress value={xpPercentage} className="h-2 bg-yellow-900" indicatorClassName="bg-yellow-400" />
            </div>
          </div>
          
          <div className="ml-4">
            <div className="bg-primary-dark/50 rounded-full px-3 py-1 text-center">
              <span className="text-yellow-400 font-medium">{user.coins}</span>
              <span className="text-xs text-yellow-200 ml-1">moedas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
