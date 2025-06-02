import { 
  users, type User, type InsertUser,
  habits, type Habit, type InsertHabit,
  dailies, type Daily, type InsertDaily,
  todos, type Todo, type InsertTodo,
  activityLogs, type ActivityLog, type InsertActivityLog,
  taskVida, type TaskVida, type InsertTaskVida
} from "@shared/schema";
import { db, supabase } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";

// Determinar o modo de armazenamento
const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true';

// Define the storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Habit methods
  getHabits(userId: number): Promise<Habit[]>;
  getHabit(id: number): Promise<Habit | undefined>;
  createHabit(userId: number, habit: InsertHabit): Promise<Habit>;
  updateHabit(id: number, habitData: Partial<Habit>): Promise<Habit | undefined>;
  deleteHabit(id: number): Promise<boolean>;
  scoreHabit(id: number, direction: 'up' | 'down'): Promise<{ habit: Habit; reward: number }>;
  
  // Daily methods
  getDailies(userId: number): Promise<Daily[]>;
  getDaily(id: number): Promise<Daily | undefined>;
  createDaily(userId: number, daily: InsertDaily): Promise<Daily>;
  updateDaily(id: number, dailyData: Partial<Daily>): Promise<Daily | undefined>;
  deleteDaily(id: number): Promise<boolean>;
  checkDaily(id: number, completed: boolean): Promise<{ daily: Daily, reward: number }>;
  resetDailies(): Promise<void>; // For daily reset at midnight
  
  // Todo methods
  getTodos(userId: number): Promise<Todo[]>;
  getTodo(id: number): Promise<Todo | undefined>;
  createTodo(userId: number, todo: InsertTodo): Promise<Todo>;
  updateTodo(id: number, todoData: Partial<Todo>): Promise<Todo | undefined>;
  deleteTodo(id: number): Promise<boolean>;
  checkTodo(id: number, completed: boolean): Promise<{ todo: Todo, reward: number }>;
  
  // Activity log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getUserActivityLogs(userId: number, limit?: number): Promise<ActivityLog[]>;
}

// Supabase Storage implementation that uses the TaskVida table
export class SupabaseStorage implements IStorage {
  private memStorage: MemStorage;

  constructor() {
    this.memStorage = new MemStorage();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    if (useMemoryStorage) {
      return this.memStorage.getUser(id);
    }

    try {
      // Primeiro, tenta buscar o usuário via Supabase Auth se disponível
      if (supabase && supabase.auth) {
        try {
          const { data: authUser, error } = await supabase.auth.admin.getUserById(id.toString());
          if (authUser && !error) {
            // Encontrou o usuário no auth, agora buscar dados complementares
            const [userData] = await db.select().from(users).where(eq(users.id, id));
            if (userData) {
              return userData;
            }
          }
        } catch (err) {
          console.error("Erro ao acessar Supabase Auth:", err);
        }
      }
      
      // Se não encontrou via Auth ou Auth não está disponível, busca direto na tabela
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      // Fallback para o MemStorage em caso de erro
      return this.memStorage.getUser(id);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (useMemoryStorage) {
      return this.memStorage.getUserByUsername(username);
    }

    try {
      // Primeiro, tenta buscar o usuário via Supabase Auth se disponível
      if (supabase && supabase.auth) {
        try {
          const { data: { users: authUsers }, error } = await supabase.auth.admin.listUsers();
          if (authUsers && !error) {
            // Encontrar usuário pelo email (assumindo que username é email)
            const authUser = authUsers.find(u => u.email === username);
            if (authUser) {
              // Encontrou o usuário no auth, agora buscar dados complementares
              const [userData] = await db.select().from(users).where(eq(users.username, username));
              if (userData) {
                return userData;
              }
            }
          }
        } catch (err) {
          console.error("Erro ao listar usuários do Supabase Auth:", err);
        }
      }
      
      // Se não encontrou via Auth ou Auth não está disponível, busca direto na tabela
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Erro ao buscar usuário pelo username:", error);
      // Fallback para o MemStorage em caso de erro
      return this.memStorage.getUserByUsername(username);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (useMemoryStorage) {
      return this.memStorage.createUser(insertUser);
    }

    try {
      // Primeiro, criar usuário no Supabase Auth se disponível
      if (supabase && supabase.auth) {
        // Verifica se o username é um email válido
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(insertUser.username);
        
        if (isEmail) {
          // Criar usuário no Supabase Auth
          const { data: authUser, error } = await supabase.auth.admin.createUser({
            email: insertUser.username,
            password: insertUser.password,
            email_confirm: true
          });
          
          if (error) {
            console.error("Erro ao criar usuário no Supabase Auth:", error);
          } else {
            console.log("Usuário criado com sucesso no Supabase Auth:", authUser.user?.id);
            // Adicionar ID do Supabase Auth ao insertUser para referência futura
            insertUser.auth_id = authUser.user?.id;
          }
        } else {
          console.log("Username não é um email válido, pulando criação no Supabase Auth");
        }
      }
      
      // Criar usuário no banco de dados local
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      // Fallback para o MemStorage em caso de erro
      return this.memStorage.createUser(insertUser);
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    if (useMemoryStorage) {
      return this.memStorage.updateUser(id, userData);
    }

    try {
      const [updated] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
      return updated;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      return this.memStorage.updateUser(id, userData);
    }
  }

  // Habit methods
  async getHabits(userId: number): Promise<Habit[]> {
    if (useMemoryStorage) {
      return this.memStorage.getHabits(userId);
    }
    // Get habits from TaskVida and convert to Habit type
    const tasks = await db
      .select()
      .from(taskVida)
      .where(and(
        eq(taskVida.userId, userId),
        eq(taskVida.type, 'habit')
      ))
      .orderBy(asc(taskVida.createdAt));
    
    // Convert TaskVida to Habit
    return tasks.map(task => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      direction: task.direction || 'both',
      strength: task.strength || 0,
      positive: task.positive || true,
      negative: task.negative || true,
      counterUp: task.counterUp || 0,
      counterDown: task.counterDown || 0,
      createdAt: task.createdAt
    }));
  }

  async getHabit(id: number): Promise<Habit | undefined> {
    const [task] = await db
      .select()
      .from(taskVida)
      .where(and(
        eq(taskVida.id, id),
        eq(taskVida.type, 'habit')
      ));
    
    if (!task) return undefined;
    
    // Convert TaskVida to Habit
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      direction: task.direction || 'both',
      strength: task.strength || 0,
      positive: task.positive || true,
      negative: task.negative || true,
      counterUp: task.counterUp || 0,
      counterDown: task.counterDown || 0,
      createdAt: task.createdAt
    };
  }

  async createHabit(userId: number, habitData: InsertHabit): Promise<Habit> {
    // Insert into TaskVida
    const [task] = await db
      .insert(taskVida)
      .values({
        userId,
        title: habitData.title,
        notes: habitData.notes,
        type: 'habit',
        priority: habitData.priority,
        direction: habitData.direction,
        positive: habitData.positive,
        negative: habitData.negative,
        strength: 0,
        counterUp: 0,
        counterDown: 0
      })
      .returning();
    
    // Convert TaskVida to Habit
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      direction: task.direction || 'both',
      strength: task.strength || 0,
      positive: task.positive || true,
      negative: task.negative || true,
      counterUp: task.counterUp || 0,
      counterDown: task.counterDown || 0,
      createdAt: task.createdAt
    };
  }

  async updateHabit(id: number, habitData: Partial<Habit>): Promise<Habit | undefined> {
    // Update in TaskVida
    const [task] = await db
      .update(taskVida)
      .set({
        title: habitData.title,
        notes: habitData.notes,
        priority: habitData.priority,
        direction: habitData.direction,
        positive: habitData.positive,
        negative: habitData.negative,
        strength: habitData.strength,
        counterUp: habitData.counterUp,
        counterDown: habitData.counterDown,
        updatedAt: new Date()
      })
      .where(and(
        eq(taskVida.id, id),
        eq(taskVida.type, 'habit')
      ))
      .returning();
    
    if (!task) return undefined;
    
    // Convert TaskVida to Habit
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      direction: task.direction || 'both',
      strength: task.strength || 0,
      positive: task.positive || true,
      negative: task.negative || true,
      counterUp: task.counterUp || 0,
      counterDown: task.counterDown || 0,
      createdAt: task.createdAt
    };
  }

  async deleteHabit(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(taskVida)
      .where(and(
        eq(taskVida.id, id),
        eq(taskVida.type, 'habit')
      ))
      .returning();
    return !!deleted;
  }

  async scoreHabit(id: number, direction: 'up' | 'down'): Promise<{ habit: Habit; reward: number }> {
    const habit = await this.getHabitById(id);
    if (!habit) {
      throw new Error('Habit not found');
    }

    // Update counters
    if (direction === 'up') {
      await db
        .update(taskVida)
        .set({
          counterUp: habit.counterUp + 1
        })
        .where(eq(taskVida.id, id));
    } else {
      await db
        .update(taskVida)
        .set({
          counterDown: habit.counterDown + 1
        })
        .where(eq(taskVida.id, id));
    }

    // Calculate reward (but don't apply to user)
    const baseReward = this.getRewardForPriority(habit.priority);
    const reward = direction === 'up' ? baseReward : -baseReward;

    // Log the activity
    await this.logActivity({
      userId: habit.userId,
      taskId: habit.id,
      taskType: 'habit',
      action: direction === 'up' ? 'scored_up' : 'scored_down',
      value: reward
    });

    const updatedHabit = await this.getHabitById(id);
    return { habit: updatedHabit!, reward };
  }

  // Daily methods
  async getDailies(userId: number): Promise<Daily[]> {
    if (useMemoryStorage) {
      return this.memStorage.getDailies(userId);
    }
    // Get dailies from TaskVida and convert to Daily type
    const tasks = await db
      .select()
      .from(taskVida)
      .where(and(
        eq(taskVida.userId, userId),
        eq(taskVida.type, 'daily')
      ))
      .orderBy(asc(taskVida.order), asc(taskVida.createdAt));
    // Convert TaskVida to Daily
    return tasks.map((task: any) => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      completed: task.completed || false,
      streak: task.streak || 0,
      repeat: task.repeat || [true, true, true, true, true, true, true],
      icon: task.icon || "CheckCircle",
      createdAt: task.createdAt,
      lastCompleted: task.lastCompleted || null,
      order: typeof task.order === 'number' ? task.order : 0
    }));
  }

  async getDaily(id: number): Promise<Daily | undefined> {
    const [task] = await db
      .select()
      .from(taskVida)
      .where(and(
        eq(taskVida.id, id),
        eq(taskVida.type, 'daily')
      ));
    
    if (!task) return undefined;
    
    // Convert TaskVida to Daily
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      completed: task.completed || false,
      streak: task.streak || 0,
      repeat: task.repeat || [true, true, true, true, true, true, true],
      icon: "CheckCircle",
      createdAt: task.createdAt,
      lastCompleted: task.lastCompleted || null,
      order: typeof task.order === 'number' ? task.order : 0
    };
  }

  async createDaily(userId: number, dailyData: InsertDaily): Promise<Daily> {
    if (useMemoryStorage) {
      return this.memStorage.createDaily(userId, dailyData);
    }
    // Buscar o maior valor de order atual
    const maxOrder = await db
      .select({ max: db.fn.max(taskVida.order) })
      .from(taskVida)
      .where(and(eq(taskVida.userId, userId), eq(taskVida.type, 'daily')))
      .then(res => res[0]?.max ?? 0);
    const [task] = await db
      .insert(taskVida)
      .values({
        userId,
        title: dailyData.title,
        notes: dailyData.notes,
        type: 'daily',
        priority: dailyData.priority,
        completed: false,
        repeat: dailyData.repeat,
        icon: dailyData.icon,
        order: maxOrder + 1
      })
      .returning();
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      completed: task.completed || false,
      streak: task.streak || 0,
      repeat: task.repeat || [true, true, true, true, true, true, true],
      icon: task.icon || "CheckCircle",
      createdAt: task.createdAt,
      lastCompleted: task.lastCompleted || null,
      order: typeof task.order === 'number' ? task.order : 0
    };
  }

  async updateDaily(id: number, dailyData: Partial<Daily>): Promise<Daily | undefined> {
    if (useMemoryStorage) {
      return this.memStorage.updateDaily(id, dailyData);
    }
    
    try {
      // Preparar os dados para atualização
      const updateData: any = {};
      
      if (dailyData.title !== undefined) updateData.title = dailyData.title;
      if (dailyData.notes !== undefined) updateData.notes = dailyData.notes;
      if (dailyData.priority !== undefined) updateData.priority = dailyData.priority;
      if (dailyData.completed !== undefined) updateData.completed = dailyData.completed;
      if (dailyData.streak !== undefined) updateData.streak = dailyData.streak;
      
      // Sempre atualizar a data de atualização
      updateData.updatedAt = new Date();
      
      // Construir a query
      const query = db.update(taskVida);
      
      // Adicionar todos os campos simples
      query.set(updateData);
      
      // Tratar o campo repeat separadamente se existir
      if (dailyData.repeat) {
        const repeatArray = dailyData.repeat;
        // Adicionar o campo repeat com formato adequado para o PostgreSQL
        query.set({
          repeat: db.sql`array[${db.sql.join(repeatArray.map(v => db.sql`${v}`), db.sql`, `)}]::boolean[]`
        });
      }
      
      // Executar a query
      const [task] = await query
        .where(and(
          eq(taskVida.id, id),
          eq(taskVida.type, 'daily')
        ))
        .returning();
      
      if (!task) return undefined;
      
      // Convert TaskVida to Daily
      return {
        id: task.id,
        userId: task.userId,
        title: task.title,
        notes: task.notes || null,
        priority: task.priority,
        completed: task.completed || false,
        streak: task.streak || 0,
        repeat: task.repeat || [true, true, true, true, true, true, true],
        icon: "CheckCircle",
        createdAt: task.createdAt,
        lastCompleted: task.lastCompleted || null,
        order: typeof task.order === 'number' ? task.order : 0
      };
    } catch (error) {
      console.error("Erro ao atualizar daily:", error);
      return this.memStorage.updateDaily(id, dailyData);
    }
  }

  async deleteDaily(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(taskVida)
      .where(and(
        eq(taskVida.id, id),
        eq(taskVida.type, 'daily')
      ))
      .returning();
    return !!deleted;
  }

  async checkDaily(id: number, completed: boolean): Promise<{ daily: Daily, reward: number }> {
    const daily = await this.getDaily(id);
    if (!daily) throw new Error("Daily not found");

    let reward = 0;
    let updatedStreak = daily.streak;
    const now = new Date();
    
    // If marking as completed
    if (completed && !daily.completed) {
      updatedStreak += 1;
      
      // Update the daily
      await db
        .update(taskVida)
        .set({ 
          completed: true, 
          streak: updatedStreak,
          lastCompleted: now,
          updatedAt: now
        })
        .where(eq(taskVida.id, id));
      
      // Log activity
      await this.createActivityLog({
        userId: daily.userId,
        taskType: 'daily',
        taskId: daily.id,
        action: 'completed',
        value: 0
      });
    } 
    // If marking as uncompleted
    else if (!completed && daily.completed) {
      updatedStreak = Math.max(0, daily.streak - 1);
      
      // Update the daily
      await db
        .update(taskVida)
        .set({ 
          completed: false, 
          streak: updatedStreak,
          updatedAt: now
        })
        .where(eq(taskVida.id, id));
      
      // Log activity
      await this.createActivityLog({
        userId: daily.userId,
        taskType: 'daily',
        taskId: daily.id,
        action: 'uncompleted',
        value: 0
      });
    }
    
    // Get updated daily
    const updatedDaily = await this.getDaily(id);
    if (!updatedDaily) throw new Error("Failed to update daily");
    
    return { daily: updatedDaily, reward };
  }

  async resetDailies(): Promise<void> {
    // This would be run daily at midnight to reset all dailies
    try {
      // Reset all dailies to uncompleted in the database
      await db
        .update(taskVida)
        .set({ 
          completed: false,
          updatedAt: new Date()
        })
        .where(eq(taskVida.type, 'daily'));
    } catch (error) {
      console.error('Error resetting dailies:', error);
      // Fallback to memory storage if database fails
      if (useMemoryStorage) {
        const allUsers = Array.from(this.users.values());
        
        for (const user of allUsers) {
          // Reset all dailies to uncompleted
          for (const daily of Array.from(this.dailies.values()).filter(d => d.userId === user.id)) {
            this.dailies.set(daily.id, { ...daily, completed: false });
          }
        }
      }
    }
  }

  // Todo methods
  async getTodos(userId: number): Promise<Todo[]> {
    if (useMemoryStorage) {
      return this.memStorage.getTodos(userId);
    }
    // Get todos from TaskVida and convert to Todo type
    const tasks = await db
      .select()
      .from(taskVida)
      .where(and(
        eq(taskVida.userId, userId),
        eq(taskVida.type, 'todo')
      ))
      .orderBy(asc(taskVida.order), asc(taskVida.createdAt));
    // Convert TaskVida to Todo
    return tasks.map((task: any) => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      completed: task.completed || false,
      dueDate: task.dueDate || null,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null,
      order: typeof task.order === 'number' ? task.order : 0
    }));
  }

  async getTodo(id: number): Promise<Todo | undefined> {
    const [task] = await db
      .select()
      .from(taskVida)
      .where(and(
        eq(taskVida.id, id),
        eq(taskVida.type, 'todo')
      ));
    
    if (!task) return undefined;
    
    // Convert TaskVida to Todo
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      completed: task.completed || false,
      dueDate: task.dueDate || null,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null,
      order: typeof task.order === 'number' ? task.order : 0
    };
  }

  async createTodo(userId: number, todoData: InsertTodo): Promise<Todo> {
    if (useMemoryStorage) {
      return this.memStorage.createTodo(userId, todoData);
    }
    // Buscar o maior valor de order atual
    const maxOrder = await db
      .select({ max: db.fn.max(taskVida.order) })
      .from(taskVida)
      .where(and(eq(taskVida.userId, userId), eq(taskVida.type, 'todo')))
      .then(res => res[0]?.max ?? 0);
    const [task] = await db
      .insert(taskVida)
      .values({
        userId,
        title: todoData.title,
        notes: todoData.notes,
        type: 'todo',
        priority: todoData.priority,
        completed: false,
        dueDate: todoData.dueDate,
        order: maxOrder + 1
      })
      .returning();
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      completed: task.completed || false,
      dueDate: task.dueDate || null,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null,
      order: typeof task.order === 'number' ? task.order : 0
    };
  }

  async updateTodo(id: number, todoData: Partial<Todo>): Promise<Todo | undefined> {
    if (useMemoryStorage) {
      return this.memStorage.updateTodo(id, todoData);
    }
    
    try {
      // Update in TaskVida
      const [task] = await db.update(taskVida)
        .set({
          title: todoData.title,
          notes: todoData.notes,
          priority: todoData.priority,
          completed: todoData.completed,
          dueDate: todoData.dueDate,
          completedAt: todoData.completedAt,
          updatedAt: new Date()
        })
        .where(and(
          eq(taskVida.id, id),
          eq(taskVida.type, 'todo')
        ))
        .returning();
      
      if (!task) return undefined;
      
      // Convert TaskVida to Todo
      return {
        id: task.id,
        userId: task.userId,
        title: task.title,
        notes: task.notes || null,
        priority: task.priority,
        completed: task.completed || false,
        dueDate: task.dueDate || null,
        createdAt: task.createdAt,
        completedAt: task.completedAt || null,
        order: typeof task.order === 'number' ? task.order : 0
      };
    } catch (error) {
      console.error("Erro ao atualizar todo:", error);
      return this.memStorage.updateTodo(id, todoData);
    }
  }

  async deleteTodo(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(taskVida)
      .where(and(
        eq(taskVida.id, id),
        eq(taskVida.type, 'todo')
      ))
      .returning();
    return !!deleted;
  }

  async checkTodo(id: number, completed: boolean): Promise<{ todo: Todo, reward: number }> {
    const todo = await this.getTodo(id);
    if (!todo) throw new Error("Todo not found");

    let reward = 0;
    const now = new Date();
    // If marking as completed
    if (completed && !todo.completed) {
      reward = this.calculateReward(todo.priority);
      
      // Update in TaskVida
      const [task] = await db.update(taskVida)
        .set({
          completed: true,
          completedAt: now,
          updatedAt: now
        })
        .where(and(
          eq(taskVida.id, id),
          eq(taskVida.type, 'todo')
        ))
        .returning();
      
      // Convert TaskVida to Todo
      const updatedTodo = this.convertTaskVidaToTodo(task);
      
      // Log activity
      await this.createActivityLog({
        userId: todo.userId,
        taskType: 'todo',
        taskId: todo.id,
        action: 'completed',
        value: reward
      });
      
      return { todo: updatedTodo, reward };
    } 
    // If marking as uncompleted
    else if (!completed && todo.completed) {
      // Update in TaskVida
      const [task] = await db.update(taskVida)
        .set({
          completed: false,
          completedAt: null,
          updatedAt: now
        })
        .where(and(
          eq(taskVida.id, id),
          eq(taskVida.type, 'todo')
        ))
        .returning();
      
      // Convert TaskVida to Todo
      const updatedTodo = this.convertTaskVidaToTodo(task);
      
      // Log activity
      await this.createActivityLog({
        userId: todo.userId,
        taskType: 'todo',
        taskId: todo.id,
        action: 'uncompleted',
        value: 0
      });
      
      return { todo: updatedTodo, reward: 0 };
    }
    
    return { todo, reward };
  }

  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [activityLog] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return activityLog;
  }

  async getUserActivityLogs(userId: number, limit = 50): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  // Helper methods
  private convertTaskVidaToTodo(task: any): Todo {
    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      completed: task.completed || false,
      dueDate: task.dueDate || null,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null,
      order: typeof task.order === 'number' ? task.order : 0
    };
  }
}

// Create an instance of MemStorage as a fallback if database isn't connected
export class MemStorage implements IStorage {
  private users: User[] = [];
  private habits: Habit[] = [];
  private dailies: Daily[] = [];
  private todos: Todo[] = [];
  private activityLogs: ActivityLog[] = [];
  private nextId = 1;

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      ...user,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) return undefined;
    
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      updatedAt: new Date()
    };
    return this.users[userIndex];
  }
  
  // Habit methods
  async getHabits(userId: number): Promise<Habit[]> {
    return this.habits.filter(habit => habit.userId === userId);
  }

  async getHabit(id: number): Promise<Habit | undefined> {
    return this.habits.find(habit => habit.id === id);
  }

  async createHabit(userId: number, habit: InsertHabit): Promise<Habit> {
    const newHabit: Habit = {
      ...habit,
      id: this.nextId++,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.habits.push(newHabit);
    return newHabit;
  }

  async updateHabit(id: number, habitData: Partial<Habit>): Promise<Habit | undefined> {
    const habitIndex = this.habits.findIndex(habit => habit.id === id);
    if (habitIndex === -1) return undefined;
    
    this.habits[habitIndex] = {
      ...this.habits[habitIndex],
      ...habitData,
      updatedAt: new Date()
    };
    return this.habits[habitIndex];
  }

  async deleteHabit(id: number): Promise<boolean> {
    const habitIndex = this.habits.findIndex(habit => habit.id === id);
    if (habitIndex === -1) return false;
    
    this.habits.splice(habitIndex, 1);
    return true;
  }

  async scoreHabit(id: number, direction: 'up' | 'down'): Promise<{ habit: Habit; reward: number }> {
    const habit = await this.getHabit(id);
    if (!habit) throw new Error('Habit not found');
    
    const updatedHabit = await this.updateHabit(id, {
      value: habit.value + (direction === 'up' ? 1 : -1)
    });
    
    return { habit: updatedHabit!, reward: 0 };
  }
  
  // Daily methods
  async getDailies(userId: number): Promise<Daily[]> {
    return this.dailies.filter(daily => daily.userId === userId);
  }

  async getDaily(id: number): Promise<Daily | undefined> {
    return this.dailies.find(daily => daily.id === id);
  }

  async createDaily(userId: number, daily: InsertDaily): Promise<Daily> {
    const newDaily: Daily = {
      ...daily,
      id: this.nextId++,
      userId,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dailies.push(newDaily);
    return newDaily;
  }

  async updateDaily(id: number, dailyData: Partial<Daily>): Promise<Daily | undefined> {
    const dailyIndex = this.dailies.findIndex(daily => daily.id === id);
    if (dailyIndex === -1) return undefined;
    
    this.dailies[dailyIndex] = {
      ...this.dailies[dailyIndex],
      ...dailyData,
      updatedAt: new Date()
    };
    return this.dailies[dailyIndex];
  }

  async deleteDaily(id: number): Promise<boolean> {
    const dailyIndex = this.dailies.findIndex(daily => daily.id === id);
    if (dailyIndex === -1) return false;
    
    this.dailies.splice(dailyIndex, 1);
    return true;
  }

  async checkDaily(id: number, completed: boolean): Promise<{ daily: Daily, reward: number }> {
    const daily = await this.updateDaily(id, { completed });
    if (!daily) throw new Error('Daily not found');
    
    return { daily, reward: 0 };
  }

  async resetDailies(): Promise<void> {
    for (const daily of this.dailies) {
      daily.completed = false;
      daily.updatedAt = new Date();
    }
  }
  
  // Todo methods
  async getTodos(userId: number): Promise<Todo[]> {
    return this.todos.filter(todo => todo.userId === userId);
  }

  async getTodo(id: number): Promise<Todo | undefined> {
    return this.todos.find(todo => todo.id === id);
  }

  async createTodo(userId: number, todo: InsertTodo): Promise<Todo> {
    const newTodo: Todo = {
      ...todo,
      id: this.nextId++,
      userId,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.todos.push(newTodo);
    return newTodo;
  }

  async updateTodo(id: number, todoData: Partial<Todo>): Promise<Todo | undefined> {
    const todoIndex = this.todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) return undefined;
    
    this.todos[todoIndex] = {
      ...this.todos[todoIndex],
      ...todoData,
      updatedAt: new Date()
    };
    return this.todos[todoIndex];
  }

  async deleteTodo(id: number): Promise<boolean> {
    const todoIndex = this.todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) return false;
    
    this.todos.splice(todoIndex, 1);
    return true;
  }

  async checkTodo(id: number, completed: boolean): Promise<{ todo: Todo, reward: number }> {
    const todo = await this.updateTodo(id, { completed });
    if (!todo) throw new Error('Todo not found');
    
    return { todo, reward: 0 };
  }
  
  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const newLog: ActivityLog = {
      ...log,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.activityLogs.push(newLog);
    return newLog;
  }

  async getUserActivityLogs(userId: number, limit = 50): Promise<ActivityLog[]> {
    return this.activityLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = useMemoryStorage 
  ? new MemStorage() 
  : new SupabaseStorage();
