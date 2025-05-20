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
          <img
            src="https://images.unsplash.com/photo-1560807707-8cc77767d783?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=50&h=50"
            alt="TaskVida Logo"
            className="h-10 w-10 rounded-full mr-3"
          />
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
