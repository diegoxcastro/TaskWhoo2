import React, { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Upload, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { uploadAvatar, isUploadingAvatar, updateProfile, removeAvatar, isRemovingAvatar } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  if (!user) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Use apenas arquivos JPEG, PNG, GIF ou WebP.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 5MB.",
        variant: "destructive",
      });
      return;
    }

    uploadAvatar(file);
    setIsDialogOpen(false);
  };

  const handlePredefinedAvatar = (avatarUrl: string) => {
    updateProfile({ avatar: avatarUrl });
    setIsDialogOpen(false);
  };

  const handleRemoveAvatar = () => {
    removeAvatar();
    setIsDialogOpen(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-primary-dark text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center">
          <div className="mr-4 relative">
            <Avatar className="h-16 w-16 border-2 border-white">
              <AvatarImage src={user.avatar || AVATAR_OPTIONS[0]} alt={user.username} />
              <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                   size="sm"
                   className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary hover:bg-primary-dark border-2 border-white"
                   disabled={isUploadingAvatar || isRemovingAvatar}
                 >
                   {isUploadingAvatar || isRemovingAvatar ? (
                     <Loader2 className="h-3 w-3 animate-spin" />
                   ) : (
                     <Camera className="h-3 w-3" />
                   )}
                 </Button>
              </DialogTrigger>
              
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Alterar foto de perfil</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Upload custom image */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Enviar sua própria foto</h4>
                    <Button
                      onClick={triggerFileInput}
                       className="w-full"
                       variant="outline"
                       disabled={isUploadingAvatar || isRemovingAvatar}
                     >
                       <Upload className="h-4 w-4 mr-2" />
                       Escolher arquivo
                     </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500">
                      Formatos suportados: JPEG, PNG, GIF, WebP (máx. 5MB)
                    </p>
                  </div>
                  
                  {/* Predefined avatars */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Ou escolha um avatar</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {AVATAR_OPTIONS.map((avatarUrl, index) => (
                        <button
                          key={index}
                          onClick={() => handlePredefinedAvatar(avatarUrl)}
                          className="relative group"
                        >
                          <Avatar className="h-12 w-12 border-2 border-gray-200 group-hover:border-primary transition-colors">
                            <AvatarImage src={avatarUrl} alt={`Avatar ${index + 1}`} />
                            <AvatarFallback>{index + 1}</AvatarFallback>
                          </Avatar>
                        </button>
                      ))}
                    </div>
                   </div>
                   
                   {/* Remove avatar option */}
                   {user.avatar && (
                     <div className="space-y-2 pt-4 border-t">
                       <h4 className="text-sm font-medium">Remover foto</h4>
                       <Button
                         onClick={handleRemoveAvatar}
                         className="w-full"
                         variant="destructive"
                         disabled={isUploadingAvatar || isRemovingAvatar}
                       >
                         {isRemovingAvatar ? (
                           <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                         ) : (
                           <Trash2 className="h-4 w-4 mr-2" />
                         )}
                         Remover foto atual
                       </Button>
                     </div>
                   )}
                 </div>
               </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex-grow">
            <div className="flex items-center">
              <h2 className="font-heading font-semibold text-lg text-black">{user.username}</h2>
            </div>
            <p className="text-gray-300 text-sm">
              Usuário
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
