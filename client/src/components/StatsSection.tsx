import { useEffect, useState } from "react";
import { useTasks } from "@/contexts/TasksContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function StatsSection() {
  const { habits, dailies, todos } = useTasks();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Stats calculations
  const totalHabits = habits.length;
  const totalDailies = dailies.length;
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const completedDailies = dailies.filter(daily => daily.completed).length;
  const todoCompletionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
  const dailyCompletionRate = totalDailies > 0 ? Math.round((completedDailies / totalDailies) * 100) : 0;
  
  // Sample data for charts
  const taskTypeData = [
    { name: 'Hábitos', value: totalHabits },
    { name: 'Diárias', value: totalDailies },
    { name: 'Afazeres', value: totalTodos }
  ];
  
  const completionData = [
    { name: 'Diárias', completas: completedDailies, pendentes: totalDailies - completedDailies },
    { name: 'Afazeres', completas: completedTodos, pendentes: totalTodos - completedTodos }
  ];

  // Weekly activity mock data (you would replace this with real data)
  const weeklyActivityData = [
    { day: 'Dom', tarefas: 2 },
    { day: 'Seg', tarefas: 5 },
    { day: 'Ter', tarefas: 7 },
    { day: 'Qua', tarefas: 3 },
    { day: 'Qui', tarefas: 6 },
    { day: 'Sex', tarefas: 4 },
    { day: 'Sáb', tarefas: 1 }
  ];
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="container mx-auto pb-20 px-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start mb-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="habits">Hábitos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tarefas Totais</CardTitle>
                <CardDescription>Distribuição por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {taskTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Taxa de Conclusão</CardTitle>
                <CardDescription>Diárias e Afazeres</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={completionData}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completas" stackId="a" fill="#82ca9d" name="Completas" />
                      <Bar dataKey="pendentes" stackId="a" fill="#8884d8" name="Pendentes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Estatísticas</CardTitle>
                <CardDescription>Resumo da sua produtividade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Taxa de conclusão de diárias</p>
                    <div className="flex justify-between items-center mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${dailyCompletionRate}%` }}></div>
                      </div>
                      <span className="ml-2 text-sm font-medium">{dailyCompletionRate}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Taxa de conclusão de afazeres</p>
                    <div className="flex justify-between items-center mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${todoCompletionRate}%` }}></div>
                      </div>
                      <span className="ml-2 text-sm font-medium">{todoCompletionRate}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Total de XP acumulada</p>
                    <p className="text-2xl font-bold mt-1">{user?.experience || 0}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Nível atual</p>
                    <p className="text-2xl font-bold mt-1">{user?.level || 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Atividade Semanal</CardTitle>
              <CardDescription>Tarefas concluídas por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyActivityData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tarefas" fill="#8884d8" name="Tarefas Concluídas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="habits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempenho de Hábitos</CardTitle>
              <CardDescription>Contadores positivos vs. negativos</CardDescription>
            </CardHeader>
            <CardContent>
              {habits.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Você ainda não possui hábitos para analisar.</p>
              ) : (
                <div className="space-y-4">
                  {habits.map(habit => (
                    <div key={habit.id} className="border rounded-lg p-3">
                      <p className="font-medium">{habit.title}</p>
                      <div className="flex justify-between mt-2">
                        <div>
                          <span className="text-xs text-gray-500">Positivos:</span>
                          <span className="ml-1 text-green-600 font-medium">{habit.counterUp}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Negativos:</span>
                          <span className="ml-1 text-red-600 font-medium">{habit.counterDown}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}