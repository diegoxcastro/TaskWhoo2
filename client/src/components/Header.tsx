import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import MobileMenu from "@/components/MobileMenu";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Header() {
  const { isAuthenticated, logout, isLoading } = useAuth();

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center mr-3">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-primary"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h1 className="font-heading font-bold text-xl">TaskVida</h1>
        </div>
        
        {isAuthenticated && (
          <div>
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
          </div>
        )}
      </div>
    </header>
  );
}
