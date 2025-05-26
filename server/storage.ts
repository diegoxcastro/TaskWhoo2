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
  scoreHabit(id: number, direction: 'up' | 'down'): Promise<{ habit: Habit, reward: number }>;
  
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

  async scoreHabit(id: number, direction: 'up' | 'down'): Promise<{ habit: Habit, reward: number }> {
    // Get the habit first
    const habit = await this.getHabit(id);
    if (!habit) throw new Error("Habit not found");

    // Calculate reward based on priority
    let reward = 0;
    if (direction === 'up' && habit.positive) {
      reward = this.calculateReward(habit.priority);
      await db
        .update(taskVida)
        .set({ 
          counterUp: (habit.counterUp || 0) + 1,
          strength: (habit.strength || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(taskVida.id, id));
    } else if (direction === 'down' && habit.negative) {
      reward = -this.calculateReward(habit.priority);
      await db
        .update(taskVida)
        .set({ 
          counterDown: (habit.counterDown || 0) + 1,
          strength: (habit.strength || 0) - 1,
          updatedAt: new Date()
        })
        .where(eq(taskVida.id, id));
    }

    // Get the updated habit
    const updatedHabit = await this.getHabit(id);
    if (!updatedHabit) throw new Error("Failed to update habit");
    
    // Update user's XP and coins if there's a reward
    if (reward !== 0) {
      const user = await this.getUser(habit.userId);
      if (user) {
        // Add XP and coins for positive actions
        if (reward > 0) {
          await this.updateUser(user.id, {
            experience: user.experience + reward,
            coins: user.coins + Math.floor(reward / 2)
          });
        } 
        // Subtract health for negative actions
        else {
          const newHealth = Math.max(0, user.health + reward);
          await this.updateUser(user.id, { health: newHealth });
        }
        
        // Log the activity
        await this.createActivityLog({
          userId: user.id,
          taskType: 'habit',
          taskId: habit.id,
          action: direction === 'up' ? 'scored_up' : 'scored_down',
          value: reward
        });
      }
    }

    return { habit: updatedHabit, reward };
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
      .orderBy(asc(taskVida.createdAt));
    
    // Convert TaskVida to Daily
    return tasks.map(task => ({
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
      lastCompleted: task.lastCompleted || null
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
      lastCompleted: task.lastCompleted || null
    };
  }

  async createDaily(userId: number, dailyData: InsertDaily): Promise<Daily> {
    const id = this.dailyId++;
    const now = new Date();
    const repeatArray: boolean[] = Array.isArray(dailyData.repeat) ? dailyData.repeat : [true, true, true, true, true, true, true];
    const daily: Daily = {
      id,
      userId,
      title: dailyData.title,
      notes: dailyData.notes ?? null,
      priority: dailyData.priority ?? 'easy',
      completed: false,
      streak: 0,
      repeat: repeatArray,
      icon: dailyData.icon ?? "CheckCircle",
      createdAt: now,
      lastCompleted: null
    };
    this.dailies.set(id, daily);
    return daily;
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
        lastCompleted: task.lastCompleted || null
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
      reward = this.calculateReward(daily.priority);
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
      
      // Update user stats
      const user = await this.getUser(daily.userId);
      if (user) {
        await this.updateUser(user.id, {
          experience: user.experience + reward,
          coins: user.coins + Math.floor(reward / 2)
        });
        
        // Log activity
        await this.createActivityLog({
          userId: user.id,
          taskType: 'daily',
          taskId: daily.id,
          action: 'completed',
          value: reward
        });
      }
    } 
    // If marking as uncompleted
    else if (!completed && daily.completed) {
      reward = -this.calculateReward(daily.priority);
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
      
      // Update user stats (health penalty)
      const user = await this.getUser(daily.userId);
      if (user) {
        const newHealth = Math.max(0, user.health + reward);
        await this.updateUser(user.id, { health: newHealth });
        
        // Log activity
        await this.createActivityLog({
          userId: user.id,
          taskType: 'daily',
          taskId: daily.id,
          action: 'uncompleted',
          value: reward
        });
      }
    }
    
    // Get updated daily
    const updatedDaily = await this.getDaily(id);
    if (!updatedDaily) throw new Error("Failed to update daily");
    
    return { daily: updatedDaily, reward };
  }

  async resetDailies(): Promise<void> {
    // Get all dailies
    const allDailies = await db
      .select()
      .from(taskVida)
      .where(eq(taskVida.type, 'daily'));
    
    const now = new Date();
    const today = now.getDay(); // 0-6, Sunday is 0
    
    for (const daily of allDailies) {
      // Skip if this daily is not active today
      if (daily.repeat && !daily.repeat[today]) {
        continue;
      }
      
      // Skip if not completed and should be penalized
      if (!daily.completed) {
        // Calculate penalty based on priority
        const penalty = this.calculatePenalty(daily.priority);
        
        // Update user's health
        const user = await this.getUser(daily.userId);
        if (user) {
          const newHealth = Math.max(0, user.health - penalty);
          await this.updateUser(user.id, { health: newHealth });
          
          // Log activity
          await this.createActivityLog({
            userId: user.id,
            taskType: 'daily',
            taskId: daily.id,
            action: 'missed',
            value: -penalty
          });
        }
      }
      
      // Reset the daily's completed status
      await db
        .update(taskVida)
        .set({ 
          completed: false,
          updatedAt: now
        })
        .where(eq(taskVida.id, daily.id));
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
      .orderBy(asc(taskVida.createdAt));
    
    // Convert TaskVida to Todo
    return tasks.map(task => ({
      id: task.id,
      userId: task.userId,
      title: task.title,
      notes: task.notes || null,
      priority: task.priority,
      completed: task.completed || false,
      dueDate: task.dueDate || null,
      createdAt: task.createdAt,
      completedAt: task.completedAt || null
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
      completedAt: task.completedAt || null
    };
  }

  async createTodo(userId: number, todoData: InsertTodo): Promise<Todo> {
    const [task] = await db
      .insert(taskVida)
      .values({
        userId,
        title: todoData.title,
        notes: todoData.notes,
        type: 'todo',
        priority: todoData.priority,
        completed: false,
        dueDate: todoData.dueDate
      })
      .returning();
    
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
      completedAt: task.completedAt || null
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
        completedAt: task.completedAt || null
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
      const updatedTodo = { ...todo, completed: true, completedAt: now };
      this.todos.set(id, updatedTodo);
      // Update user stats
      const user = await this.getUser(todo.userId);
      if (user) {
        this.updateUser(user.id, {
          experience: user.experience + reward,
          coins: user.coins + Math.floor(reward / 2)
        });
        // Log activity
        this.createActivityLog({
          userId: user.id,
          taskType: 'todo',
          taskId: todo.id,
          action: 'completed',
          value: reward
        });
      }
    } 
    // If marking as uncompleted
    else if (!completed && todo.completed) {
      const updatedTodo = { ...todo, completed: false, completedAt: null };
      this.todos.set(id, updatedTodo);
      // Log activity
      const user = await this.getUser(todo.userId);
      if (user) {
        this.createActivityLog({
          userId: user.id,
          taskType: 'todo',
          taskId: todo.id,
          action: 'uncompleted',
          value: 0
        });
      }
    }
    return { todo: this.todos.get(id)!, reward };
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
  private calculateReward(priority: string): number {
    switch (priority) {
      case 'trivial': return 1;
      case 'easy': return 2;
      case 'medium': return 5;
      case 'hard': return 10;
      default: return 1;
    }
  }

  private calculatePenalty(priority: string): number {
    switch (priority) {
      case 'trivial': return 1;
      case 'easy': return 2;
      case 'medium': return 5;
      case 'hard': return 10;
      default: return 1;
    }
  }
}

// Create an instance of MemStorage as a fallback if database isn't connected
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private habits: Map<number, Habit>;
  private dailies: Map<number, Daily>;
  private todos: Map<number, Todo>;
  private activityLogs: Map<number, ActivityLog>;
  
  private userId: number = 1;
  private habitId: number = 1;
  private dailyId: number = 1;
  private todoId: number = 1;
  private logId: number = 1;

  constructor() {
    this.users = new Map();
    this.habits = new Map();
    this.dailies = new Map();
    this.todos = new Map();
    this.activityLogs = new Map();
    
    // Create a default user for testing
    this.createUser({
      username: "demo",
      password: "password",
      level: 1,
      experience: 0,
      health: 50,
      maxHealth: 50,
      coins: 0,
      avatar: undefined
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Verifica se já existe usuário com o mesmo username
    const existing = Array.from(this.users.values()).find(u => u.username === insertUser.username);
    if (existing) return existing;
    const id = this.userId++;
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      createdAt: now,
      avatar: insertUser.avatar ?? null,
      auth_id: insertUser.auth_id ?? null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Habit methods
  async getHabits(userId: number): Promise<Habit[]> {
    return Array.from(this.habits.values()).filter(
      (habit) => habit.userId === userId
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getHabit(id: number): Promise<Habit | undefined> {
    return this.habits.get(id);
  }

  async createHabit(userId: number, habitData: InsertHabit): Promise<Habit> {
    const id = this.habitId++;
    const now = new Date();
    const habit: Habit = { 
      ...habitData, 
      id, 
      userId, 
      strength: 0,
      counterUp: 0,
      counterDown: 0,
      createdAt: now 
    };
    this.habits.set(id, habit);
    return habit;
  }

  async updateHabit(id: number, habitData: Partial<Habit>): Promise<Habit | undefined> {
    const habit = this.habits.get(id);
    if (!habit) return undefined;
    
    const updatedHabit = { ...habit, ...habitData };
    this.habits.set(id, updatedHabit);
    return updatedHabit;
  }

  async deleteHabit(id: number): Promise<boolean> {
    return this.habits.delete(id);
  }

  async scoreHabit(id: number, direction: 'up' | 'down'): Promise<{ habit: Habit, reward: number }> {
    const habit = this.habits.get(id);
    if (!habit) throw new Error("Habit not found");

    let reward = 0;
    if (direction === 'up' && habit.positive) {
      reward = this.calculateReward(habit.priority);
      const updatedHabit = { 
        ...habit, 
        counterUp: habit.counterUp + 1,
        strength: habit.strength + 1
      };
      this.habits.set(id, updatedHabit);
    } else if (direction === 'down' && habit.negative) {
      reward = -this.calculateReward(habit.priority);
      const updatedHabit = { 
        ...habit, 
        counterDown: habit.counterDown + 1,
        strength: habit.strength - 1
      };
      this.habits.set(id, updatedHabit);
    }

    const updatedHabit = this.habits.get(id)!;
    
    // Update user's XP and coins if there's a reward
    if (reward !== 0) {
      const user = this.users.get(habit.userId);
      if (user) {
        // Add XP and coins for positive actions
        if (reward > 0) {
          this.updateUser(user.id, {
            experience: user.experience + reward,
            coins: user.coins + Math.floor(reward / 2)
          });
        } 
        // Subtract health for negative actions
        else {
          const newHealth = Math.max(0, user.health + reward);
          this.updateUser(user.id, { health: newHealth });
        }
        
        // Log the activity
        this.createActivityLog({
          userId: user.id,
          taskType: 'habit',
          taskId: habit.id,
          action: direction === 'up' ? 'scored_up' : 'scored_down',
          value: reward
        });
      }
    }

    return { habit: updatedHabit, reward };
  }

  // Daily methods
  async getDailies(userId: number): Promise<Daily[]> {
    return Array.from(this.dailies.values()).filter(
      (daily) => daily.userId === userId
    ).sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return aTime - bTime;
    });
  }

  async getDaily(id: number): Promise<Daily | undefined> {
    return this.dailies.get(id);
  }

  async createDaily(userId: number, dailyData: InsertDaily): Promise<Daily> {
    const id = this.dailyId++;
    const now = new Date();
    const repeatArray: boolean[] = Array.isArray(dailyData.repeat) ? dailyData.repeat : [true, true, true, true, true, true, true];
    const daily: Daily = {
      id,
      userId,
      title: dailyData.title,
      notes: dailyData.notes ?? null,
      priority: dailyData.priority ?? 'easy',
      completed: false,
      streak: 0,
      repeat: repeatArray,
      icon: dailyData.icon ?? "CheckCircle",
      createdAt: now,
      lastCompleted: null
    };
    this.dailies.set(id, daily);
    return daily;
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
        lastCompleted: task.lastCompleted || null
      };
    } catch (error) {
      console.error("Erro ao atualizar daily:", error);
      return this.memStorage.updateDaily(id, dailyData);
    }
  }

  async deleteDaily(id: number): Promise<boolean> {
    return this.dailies.delete(id);
  }

  async checkDaily(id: number, completed: boolean): Promise<{ daily: Daily, reward: number }> {
    const daily = this.dailies.get(id);
    if (!daily) throw new Error("Daily not found");

    let reward = 0;
    let updatedStreak = daily.streak;
    const now = new Date();
    
    // If marking as completed
    if (completed && !daily.completed) {
      reward = this.calculateReward(daily.priority);
      updatedStreak += 1;
      
      const updatedDaily = { 
        ...daily, 
        completed: true, 
        streak: updatedStreak,
        lastCompleted: now
      };
      this.dailies.set(id, updatedDaily);
      
      // Update user stats
      const user = this.users.get(daily.userId);
      if (user) {
        this.updateUser(user.id, {
          experience: user.experience + reward,
          coins: user.coins + Math.floor(reward / 2)
        });
        
        // Log activity
        this.createActivityLog({
          userId: user.id,
          taskType: 'daily',
          taskId: daily.id,
          action: 'completed',
          value: reward
        });
      }
    } 
    // If marking as uncompleted
    else if (!completed && daily.completed) {
      reward = -this.calculateReward(daily.priority);
      updatedStreak = Math.max(0, updatedStreak - 1);
      
      const updatedDaily = { 
        ...daily, 
        completed: false, 
        streak: updatedStreak,
        lastCompleted: undefined
      };
      this.dailies.set(id, updatedDaily);
      
      // Update user stats - don't penalize for unchecking
      const user = this.users.get(daily.userId);
      if (user) {
        // Log activity
        this.createActivityLog({
          userId: user.id,
          taskType: 'daily',
          taskId: daily.id,
          action: 'uncompleted',
          value: 0
        });
      }
    }

    return { daily: this.dailies.get(id)!, reward };
  }

  async resetDailies(): Promise<void> {
    // This would be run daily at midnight to reset all dailies
    const allUsers = Array.from(this.users.values());
    
    for (const user of allUsers) {
      // Get all uncompleted dailies for penalties
      const uncompletedDailies = Array.from(this.dailies.values()).filter(
        daily => daily.userId === user.id && !daily.completed
      );
      
      // Apply penalties for uncompleted dailies
      let totalPenalty = 0;
      for (const daily of uncompletedDailies) {
        // Check if today is in the daily's repeat schedule
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        if (daily.repeat[today]) {
          const penalty = this.calculatePenalty(daily.priority);
          totalPenalty += penalty;
          
          // Log the missed daily
          this.createActivityLog({
            userId: user.id,
            taskType: 'daily',
            taskId: daily.id,
            action: 'missed',
            value: penalty
          });
        }
      }
      
      // Apply the penalty to the user's health
      if (totalPenalty < 0) {
        const newHealth = Math.max(0, user.health + totalPenalty);
        this.updateUser(user.id, { health: newHealth });
      }
      
      // Reset all dailies to uncompleted
      for (const daily of Array.from(this.dailies.values()).filter(d => d.userId === user.id)) {
        this.dailies.set(daily.id, { ...daily, completed: false });
      }
    }
  }

  // Todo methods
  async getTodos(userId: number): Promise<Todo[]> {
    return Array.from(this.todos.values()).filter(
      (todo) => todo.userId === userId
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getTodo(id: number): Promise<Todo | undefined> {
    return this.todos.get(id);
  }

  async createTodo(userId: number, todoData: InsertTodo): Promise<Todo> {
    const id = this.todoId++;
    const now = new Date();
    const todo: Todo = { 
      ...todoData, 
      id, 
      userId, 
      completed: false,
      createdAt: now,
      completedAt: undefined
    };
    this.todos.set(id, todo);
    return todo;
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
        completedAt: task.completedAt || null
      };
    } catch (error) {
      console.error("Erro ao atualizar todo:", error);
      return this.memStorage.updateTodo(id, todoData);
    }
  }

  async deleteTodo(id: number): Promise<boolean> {
    return this.todos.delete(id);
  }

  async checkTodo(id: number, completed: boolean): Promise<{ todo: Todo, reward: number }> {
    const todo = this.todos.get(id);
    if (!todo) throw new Error("Todo not found");

    let reward = 0;
    const now = new Date();
    // If marking as completed
    if (completed && !todo.completed) {
      reward = this.calculateReward(todo.priority);
      const updatedTodo = { ...todo, completed: true, completedAt: now };
      this.todos.set(id, updatedTodo);
      // Update user stats
      const user = this.users.get(todo.userId);
      if (user) {
        this.updateUser(user.id, {
          experience: user.experience + reward,
          coins: user.coins + Math.floor(reward / 2)
        });
        // Log activity
        this.createActivityLog({
          userId: user.id,
          taskType: 'todo',
          taskId: todo.id,
          action: 'completed',
          value: reward
        });
      }
    } 
    // If marking as uncompleted
    else if (!completed && todo.completed) {
      const updatedTodo = { ...todo, completed: false, completedAt: null };
      this.todos.set(id, updatedTodo);
      // Log activity
      const user = this.users.get(todo.userId);
      if (user) {
        this.createActivityLog({
          userId: user.id,
          taskType: 'todo',
          taskId: todo.id,
          action: 'uncompleted',
          value: 0
        });
      }
    }
    return { todo: this.todos.get(id)!, reward };
  }

  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.logId++;
    const now = new Date();
    const activityLog: ActivityLog = { 
      ...log, 
      id, 
      createdAt: now 
    };
    this.activityLogs.set(id, activityLog);
    return activityLog;
  }

  async getUserActivityLogs(userId: number, limit = 50): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  // Helper methods for calculating rewards and penalties
  private calculateReward(priority: string): number {
    switch (priority) {
      case 'trivial': return 5;
      case 'easy': return 10;
      case 'medium': return 15;
      case 'hard': return 20;
      default: return 10;
    }
  }
  
  private calculatePenalty(priority: string): number {
    switch (priority) {
      case 'trivial': return -1;
      case 'easy': return -2;
      case 'medium': return -5;
      case 'hard': return -10;
      default: return -2;
    }
  }
}

// Use the appropriate storage implementation based on environment
export const storage = useMemoryStorage 
  ? new MemStorage() 
  : new SupabaseStorage();
