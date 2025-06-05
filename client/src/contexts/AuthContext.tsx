import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user was previously authenticated
    try {
      const savedUser = localStorage.getItem('habittracker_user');
      return !!savedUser;
    } catch {
      return false;
    }
  });
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Fetch user data using React Query when authenticated
  const {
    data: user,
    isLoading,
    error
  } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error?.status === 401) {
        setIsAuthenticated(false);
        localStorage.removeItem('habittracker_user');
        return false;
      }
      return failureCount < 3;
    }
  });

  // Sync user state with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('habittracker_user', JSON.stringify(user));
    } else if (!isLoading && isAuthenticated) {
      // Only remove if we're not loading and should be authenticated
      localStorage.removeItem('habittracker_user');
      setIsAuthenticated(false);
    }
  }, [user, isLoading, isAuthenticated]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: (userData) => {
      setIsAuthenticated(true);
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], userData);
      localStorage.setItem('habittracker_user', JSON.stringify(userData));
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
      navigate("/");
    },
    onError: (error) => {
      setIsAuthenticated(false);
      localStorage.removeItem('habittracker_user');
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
      setIsAuthenticated(true);
      // Set the user data in the query cache
      queryClient.setQueryData(["/api/user"], userData);
      localStorage.setItem('habittracker_user', JSON.stringify(userData));
      toast({
        title: "Registration successful",
        description: `Welcome, ${userData.username}!`,
      });
      navigate("/");
    },
    onError: (error) => {
      setIsAuthenticated(false);
      localStorage.removeItem('habittracker_user');
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
      setIsAuthenticated(false);
      // Clear user data from query cache
      queryClient.setQueryData(["/api/user"], null);
      localStorage.removeItem('habittracker_user');
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta.",
      });
      navigate("/login");
    },
    onError: () => {
      toast({
        title: "Erro no logout",
        description: "Não foi possível fazer logout. Tente novamente.",
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

  const value: AuthContextValue = {
    user: user || null,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending,
    isAuthenticated: isAuthenticated && !!user,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
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
