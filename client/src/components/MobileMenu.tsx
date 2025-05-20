import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface MobileMenuProps {
  onClose: () => void;
}

export default function MobileMenu({ onClose }: MobileMenuProps) {
  const { logout, isLoading } = useAuth();

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="md:hidden bg-primary text-white py-2">
      <div className="container mx-auto px-4">
        <nav className="flex flex-col space-y-2">
          <Link 
            href="/" 
            className="px-3 py-2 rounded hover:bg-primary-dark transition-colors"
            onClick={onClose}
          >
            Tarefas
          </Link>
          <Link 
            href="#inventario" 
            className="px-3 py-2 rounded hover:bg-primary-dark transition-colors"
            onClick={onClose}
          >
            Inventário
          </Link>
          <Link 
            href="#lojas" 
            className="px-3 py-2 rounded hover:bg-primary-dark transition-colors"
            onClick={onClose}
          >
            Lojas
          </Link>
          <Link 
            href="#grupo" 
            className="px-3 py-2 rounded hover:bg-primary-dark transition-colors"
            onClick={onClose}
          >
            Grupo
          </Link>
          <Link 
            href="#desafios" 
            className="px-3 py-2 rounded hover:bg-primary-dark transition-colors"
            onClick={onClose}
          >
            Desafios
          </Link>
          <Link 
            href="#ajuda" 
            className="px-3 py-2 rounded hover:bg-primary-dark transition-colors"
            onClick={onClose}
          >
            Ajuda
          </Link>
          
          {isLoading ? (
            <Button variant="ghost" disabled className="justify-start">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saindo...
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="justify-start text-white hover:bg-primary-dark"
            >
              Sair
            </Button>
          )}
        </nav>
      </div>
    </div>
  );
}
