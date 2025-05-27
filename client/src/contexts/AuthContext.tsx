import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Try to restore user from localStorage on initial load
    try {
      const savedUser = localStorage.getItem('habittracker_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  // Sync user state with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('habittracker_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('habittracker_user');
    }
  }, [user]);

  // Check if user is already authenticated
  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/check"],
    retry: 1, // Retry once in case of network issues
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    onSuccess: (data) => {
      if (data) {
        setUser(data);
      } else if (!user) {
        // Only clear user if we don't have one stored locally
        setUser(null);
      }
    },
    onError: (error) => {
      console.warn('Auth check failed:', error);
      // Don't immediately clear user on error - keep localStorage user if available
      // Only clear if we're sure the user is not authenticated
      if (!user) {
        setUser(null);
      }
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
      navigate("/");
    },
    onError: (error) => {
      setUser(null);
      toast({
        title: "Falha no login",
        description: "Usuário ou senha incorretos.",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", credentials);
      return res.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
      navigate("/");
    },
    onError: (error) => {
      setUser(null);
      toast({
        title: "Falha no registro",
        description: "Não foi possível registrar. Tente outro nome de usuário.",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      setUser(null);
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta.",
      });
      navigate("/login");
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Only redirect to login if we're sure there's no authenticated user
    // and we're not already on auth pages
    if (!isLoading && !user && location !== "/login" && location !== "/register") {
      // Give a small delay to allow auth check to complete
      const timer = setTimeout(() => {
        if (!user) {
          navigate("/login");
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user, location, navigate]);

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const register = async (username: string, password: string) => {
    await registerMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
