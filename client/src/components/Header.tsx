import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MobileMenu from "@/components/MobileMenu";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Header() {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <img
            src="https://images.unsplash.com/photo-1560807707-8cc77767d783?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=50&h=50"
            alt="TaskVida Logo"
            className="h-10 w-10 rounded-full mr-3"
          />
          <h1 className="font-heading font-bold text-xl">TaskVida</h1>
        </div>
        
        {isAuthenticated && (
          <>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="px-3 py-2 rounded hover:bg-primary-dark transition-colors">
                Tarefas
              </Link>
              <Link href="#inventario" className="px-3 py-2 rounded hover:bg-primary-dark transition-colors">
                Inventário
              </Link>
              <Link href="#lojas" className="px-3 py-2 rounded hover:bg-primary-dark transition-colors">
                Lojas
              </Link>
              <Link href="#grupo" className="px-3 py-2 rounded hover:bg-primary-dark transition-colors">
                Grupo
              </Link>
              <Link href="#desafios" className="px-3 py-2 rounded hover:bg-primary-dark transition-colors">
                Desafios
              </Link>
              <Link href="#ajuda" className="px-3 py-2 rounded hover:bg-primary-dark transition-colors">
                Ajuda
              </Link>
              
              {isLoading ? (
                <Button variant="ghost" disabled>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saindo...
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  onClick={() => logout()}
                  className="text-white hover:bg-primary-dark"
                >
                  Sair
                </Button>
              )}
            </nav>
            
            <button 
              className="md:hidden text-white" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </>
        )}
      </div>
      
      {mobileMenuOpen && <MobileMenu onClose={() => setMobileMenuOpen(false)} />}
    </header>
  );
}
