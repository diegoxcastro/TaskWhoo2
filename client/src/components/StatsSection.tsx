import { useEffect, useState, useMemo } from "react";
import { useTasks } from "@/contexts/TasksContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import axios from "axios";
import type { ActivityLog } from "@shared/schema";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function StatsSection() {
  const { habits, dailies, todos } = useTasks();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const { data } = await axios.get("/api/stats/activity", {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY || "Uaapo3ihgoarfboufba",
          },
        });
        setActivityLogs(data);
      } catch (e) {
        setActivityLogs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // --- Métricas úteis ---
  // Dias únicos com atividade
  const activeDays = useMemo(() => {
    const days = new Set(activityLogs.map(log => new Date(log.createdAt ?? '').toDateString()));
    return days.size;
  }, [activityLogs]);

  // Tarefas concluídas por tipo
  const completedByType = useMemo(() => {
    const result: Record<string, number> = { habit: 0, daily: 0, todo: 0 };
    activityLogs.forEach(l => {
      if (["completed", "scored_up"].includes(l.action)) {
        result[l.taskType] = (result[l.taskType] || 0) + 1;
      }
    });
    return result;
  }, [activityLogs]);

  // Percentual de tarefas concluídas no prazo (todos)
  const todosCompleted = todos.filter(t => t.completed);
  const todosOnTime = todosCompleted.filter(t => t.dueDate && t.completedAt && new Date(t.completedAt ?? '').getTime() <= new Date(t.dueDate ?? '').getTime());
  const todosOnTimePercent = todosCompleted.length > 0 ? Math.round((todosOnTime.length / todosCompleted.length) * 100) : 0;

  // Streaks (sequência de dias com todas as diárias concluídas)
  const streaks = useMemo(() => {
    const daysMap: Record<string, number> = {};
    activityLogs.forEach(l => {
      if (l.taskType === "daily" && l.action === "completed") {
        const day = new Date(l.createdAt ?? '').toDateString();
        daysMap[day] = (daysMap[day] || 0) + 1;
      }
    });
    const allDailiesPerDay = Object.entries(daysMap).map(([day, count]) => ({ day, count }));
    const totalDailies = dailies.length;
    let currentStreak = 0, maxStreak = 0;
    let streakData: { day: string, streak: number }[] = [];
    allDailiesPerDay.sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
    let lastDate: string | null = null;
    allDailiesPerDay.forEach(({ day, count }) => {
      if (count === totalDailies && totalDailies > 0) {
        if (lastDate) {
          const diff = (new Date(day).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            currentStreak++;
          } else {
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        maxStreak = Math.max(maxStreak, currentStreak);
        streakData.push({ day, streak: currentStreak });
        lastDate = day;
      } else {
        currentStreak = 0;
        lastDate = null;
      }
    });
    return { current: currentStreak, max: maxStreak, streakData };
  }, [activityLogs, dailies.length]);

  // Gráfico de streaks
  const streakChartData = streaks.streakData.map(s => ({
    name: s.day.split(" ")[1] + "/" + s.day.split(" ")[2],
    streak: s.streak
  }));

  // Gráfico de tarefas concluídas por dia da semana
  const weeklyActivityData = weekDays.map((day, idx) => ({
    day,
    tarefas: activityLogs.filter(log => new Date(log.createdAt ?? '').getDay() === idx && ["completed", "scored_up"].includes(log.action)).length
  }));

  // Gráficos e métricas já existentes
  const totalHabits = habits.length;
  const totalDailies = dailies.length;
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const completedDailies = dailies.filter(daily => daily.completed).length;
  const todoCompletionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
  const dailyCompletionRate = totalDailies > 0 ? Math.round((completedDailies / totalDailies) * 100) : 0;
  const taskTypeData = [
    { name: 'Hábitos', value: totalHabits },
    { name: 'Diárias', value: totalDailies },
    { name: 'Afazeres', value: totalTodos }
  ];
  const completionData = [
    { name: 'Diárias', completas: completedDailies, pendentes: totalDailies - completedDailies },
    { name: 'Afazeres', completas: completedTodos, pendentes: totalTodos - completedTodos }
  ];

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
                <CardTitle className="text-lg">Estatísticas de Produtividade</CardTitle>
                <CardDescription>Resumo da sua produtividade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Dias ativos</p>
                    <p className="text-2xl font-bold mt-1">{activeDays}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Streak atual / máximo</p>
                    <p className="text-2xl font-bold mt-1">{streaks.current} / {streaks.max}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Afazeres concluídos no prazo</p>
                    <p className="text-2xl font-bold mt-1">{todosOnTimePercent}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tarefas concluídas por tipo</p>
                    <p className="text-sm mt-1">Hábitos: {completedByType.habit} | Diárias: {completedByType.daily} | Afazeres: {completedByType.todo}</p>
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
          <Card>
            <CardHeader>
              <CardTitle>Streaks (Sequência de Dias)</CardTitle>
              <CardDescription>Sequência de dias com todas as diárias concluídas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={streakChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="streak" stroke="#8884d8" name="Streak" />
                  </LineChart>
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