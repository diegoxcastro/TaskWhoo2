import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet";
import Header from "@/components/Header";
import UserProfile from "@/components/UserProfile";
import TasksSection from "@/components/TasksSection";
import StatsSection from "@/components/StatsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isHome] = useRoute("/");
  const [activeTab, setActiveTab] = useState("tasks");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && isHome) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, isHome, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Helmet>
        <title>TaskVida - Painel de Tarefas</title>
        <meta name="description" content="Gerencie suas tarefas diárias, hábitos e afazeres de forma gamificada com o TaskVida." />
      </Helmet>
      
      <Header />
      <UserProfile />
      
      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tasks">
            <TasksSection />
          </TabsContent>
          
          <TabsContent value="stats">
            <StatsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
