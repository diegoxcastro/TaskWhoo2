import { 
  users, type User, type InsertUser,
  habits, type Habit, type InsertHabit,
  dailies, type Daily, type InsertDaily,
  todos, type Todo, type InsertTodo,
  activityLogs, type ActivityLog, type InsertActivityLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Habit methods
  async getHabits(userId: number): Promise<Habit[]> {
    return db
      .select()
      .from(habits)
      .where(eq(habits.userId, userId))
      .orderBy(asc(habits.createdAt));
  }

  async getHabit(id: number): Promise<Habit | undefined> {
    const [habit] = await db.select().from(habits).where(eq(habits.id, id));
    return habit;
  }

  async createHabit(userId: number, habitData: InsertHabit): Promise<Habit> {
    const [habit] = await db
      .insert(habits)
      .values({ ...habitData, userId })
      .returning();
    return habit;
  }

  async updateHabit(id: number, habitData: Partial<Habit>): Promise<Habit | undefined> {
    const [updated] = await db
      .update(habits)
      .set(habitData)
      .where(eq(habits.id, id))
      .returning();
    return updated;
  }

  async deleteHabit(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(habits)
      .where(eq(habits.id, id))
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
        .update(habits)
        .set({ 
          counterUp: habit.counterUp + 1,
          strength: habit.strength + 1
        })
        .where(eq(habits.id, id));
    } else if (direction === 'down' && habit.negative) {
      reward = -this.calculateReward(habit.priority);
      await db
        .update(habits)
        .set({ 
          counterDown: habit.counterDown + 1,
          strength: habit.strength - 1
        })
        .where(eq(habits.id, id));
    }

    // Get the updated habit
    const [updatedHabit] = await db.select().from(habits).where(eq(habits.id, id));
    
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
    return db
      .select()
      .from(dailies)
      .where(eq(dailies.userId, userId))
      .orderBy(asc(dailies.createdAt));
  }

  async getDaily(id: number): Promise<Daily | undefined> {
    const [daily] = await db.select().from(dailies).where(eq(dailies.id, id));
    return daily;
  }

  async createDaily(userId: number, dailyData: InsertDaily): Promise<Daily> {
    const [daily] = await db
      .insert(dailies)
      .values({ ...dailyData, userId })
      .returning();
    return daily;
  }

  async updateDaily(id: number, dailyData: Partial<Daily>): Promise<Daily | undefined> {
    const [updated] = await db
      .update(dailies)
      .set(dailyData)
      .where(eq(dailies.id, id))
      .returning();
    return updated;
  }

  async deleteDaily(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(dailies)
      .where(eq(dailies.id, id))
      .returning();
    return !!deleted;
  }

  async checkDaily(id: number, completed: boolean): Promise<{ daily: Daily, reward: number }> {
    // Get the daily task
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
        .update(dailies)
        .set({ 
          completed: true, 
          streak: updatedStreak,
          lastCompleted: now
        })
        .where(eq(dailies.id, id));
      
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
      updatedStreak = Math.max(0, updatedStreak - 1);
      
      // Update the daily
      await db
        .update(dailies)
        .set({ 
          completed: false, 
          streak: updatedStreak,
          lastCompleted: null
        })
        .where(eq(dailies.id, id));
      
      // Update user stats - don't penalize for unchecking
      const user = await this.getUser(daily.userId);
      if (user) {
        // Log activity
        await this.createActivityLog({
          userId: user.id,
          taskType: 'daily',
          taskId: daily.id,
          action: 'uncompleted',
          value: 0
        });
      }
    }

    // Get the updated daily
    const [updatedDaily] = await db.select().from(dailies).where(eq(dailies.id, id));
    return { daily: updatedDaily, reward };
  }

  async resetDailies(): Promise<void> {
    // This would be run daily at midnight to reset all dailies
    const allUsers = await db.select().from(users);
    
    for (const user of allUsers) {
      // Get all uncompleted dailies for penalties
      const uncompletedDailies = await db
        .select()
        .from(dailies)
        .where(and(
          eq(dailies.userId, user.id),
          eq(dailies.completed, false)
        ));
      
      // Apply penalties for uncompleted dailies
      let totalPenalty = 0;
      for (const daily of uncompletedDailies) {
        // Check if today is in the daily's repeat schedule
        const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        if (daily.repeat[today]) {
          const penalty = this.calculatePenalty(daily.priority);
          totalPenalty += penalty;
          
          // Log the missed daily
          await this.createActivityLog({
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
        await this.updateUser(user.id, { health: newHealth });
      }
      
      // Reset all dailies to uncompleted
      await db
        .update(dailies)
        .set({ completed: false })
        .where(eq(dailies.userId, user.id));
    }
  }

  // Todo methods
  async getTodos(userId: number): Promise<Todo[]> {
    return db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(asc(todos.createdAt));
  }

  async getTodo(id: number): Promise<Todo | undefined> {
    const [todo] = await db.select().from(todos).where(eq(todos.id, id));
    return todo;
  }

  async createTodo(userId: number, todoData: InsertTodo): Promise<Todo> {
    const [todo] = await db
      .insert(todos)
      .values({ ...todoData, userId })
      .returning();
    return todo;
  }

  async updateTodo(id: number, todoData: Partial<Todo>): Promise<Todo | undefined> {
    const [updated] = await db
      .update(todos)
      .set(todoData)
      .where(eq(todos.id, id))
      .returning();
    return updated;
  }

  async deleteTodo(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(todos)
      .where(eq(todos.id, id))
      .returning();
    return !!deleted;
  }

  async checkTodo(id: number, completed: boolean): Promise<{ todo: Todo, reward: number }> {
    // Get the todo
    const todo = await this.getTodo(id);
    if (!todo) throw new Error("Todo not found");

    let reward = 0;
    const now = new Date();
    
    // If marking as completed
    if (completed && !todo.completed) {
      reward = this.calculateReward(todo.priority);
      
      // Extra reward for completing before due date
      if (todo.dueDate && now < todo.dueDate) {
        reward += 2;
      }
      
      // Update the todo
      await db
        .update(todos)
        .set({ 
          completed: true, 
          completedAt: now 
        })
        .where(eq(todos.id, id));
      
      // Update user stats
      const user = await this.getUser(todo.userId);
      if (user) {
        await this.updateUser(user.id, {
          experience: user.experience + reward,
          coins: user.coins + Math.floor(reward / 2)
        });
        
        // Log activity
        await this.createActivityLog({
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
      // Update the todo
      await db
        .update(todos)
        .set({ 
          completed: false, 
          completedAt: null 
        })
        .where(eq(todos.id, id));
      
      // Log activity
      const user = await this.getUser(todo.userId);
      if (user) {
        await this.createActivityLog({
          userId: user.id,
          taskType: 'todo',
          taskId: todo.id,
          action: 'uncompleted',
          value: 0
        });
      }
    }

    // Get the updated todo
    const [updatedTodo] = await db.select().from(todos).where(eq(todos.id, id));
    return { todo: updatedTodo, reward };
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
    const id = this.userId++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
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
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getDaily(id: number): Promise<Daily | undefined> {
    return this.dailies.get(id);
  }

  async createDaily(userId: number, dailyData: InsertDaily): Promise<Daily> {
    const id = this.dailyId++;
    const now = new Date();
    const daily: Daily = { 
      ...dailyData, 
      id, 
      userId, 
      completed: false,
      streak: 0,
      createdAt: now,
      lastCompleted: undefined
    };
    this.dailies.set(id, daily);
    return daily;
  }

  async updateDaily(id: number, dailyData: Partial<Daily>): Promise<Daily | undefined> {
    const daily = this.dailies.get(id);
    if (!daily) return undefined;
    
    const updatedDaily = { ...daily, ...dailyData };
    this.dailies.set(id, updatedDaily);
    return updatedDaily;
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
    const todo = this.todos.get(id);
    if (!todo) return undefined;
    
    const updatedTodo = { ...todo, ...todoData };
    this.todos.set(id, updatedTodo);
    return updatedTodo;
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
      
      // Extra reward for completing before due date
      if (todo.dueDate && now < todo.dueDate) {
        reward += 2;
      }
      
      const updatedTodo = { 
        ...todo, 
        completed: true, 
        completedAt: now 
      };
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
      const updatedTodo = { 
        ...todo, 
        completed: false, 
        completedAt: undefined 
      };
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

// Check if we're running in development without a DB connection
const useDatabase = Boolean(process.env.DATABASE_URL);

// Export either the DatabaseStorage or MemStorage instance based on environment
export const storage = useDatabase 
  ? new DatabaseStorage() 
  : new MemStorage();
