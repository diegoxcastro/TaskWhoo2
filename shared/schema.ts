import { pgTable, text, serial, integer, boolean, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for various task-related fields
export const taskTypeEnum = pgEnum('task_type', ['habit', 'daily', 'todo']);
export const taskPriorityEnum = pgEnum('task_priority', ['trivial', 'easy', 'medium', 'hard']);
export const habitDirectionEnum = pgEnum('habit_direction', ['positive', 'negative', 'both']);

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  health: integer("health").notNull().default(50),
  maxHealth: integer("max_health").notNull().default(50),
  coins: integer("coins").notNull().default(0),
  avatar: text("avatar"),
  auth_id: text("auth_id"),
  createdAt: timestamp("created_at").defaultNow()
});

// TaskVida table - Main table for all tasks in Supabase
// IMPORTANTE: O nome da tabela deve ser 'task_vida' em minúsculas para compatibilidade com o PostgreSQL
export const taskVida = pgTable("task_vida", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  notes: text("notes"),
  type: taskTypeEnum("type").notNull(), // habit, daily, or todo
  priority: taskPriorityEnum("priority").notNull().default('easy'),
  completed: boolean("completed").default(false),
  dueDate: timestamp("due_date"),
  repeat: boolean("repeat").array().notNull().default([true, true, true, true, true, true, true]), // Corrigido para array SQL
  direction: habitDirectionEnum("direction"), // For habits
  positive: boolean("positive"), // For habits
  negative: boolean("negative"), // For habits
  counterUp: integer("counter_up").default(0), // For habits
  counterDown: integer("counter_down").default(0), // For habits
  streak: integer("streak").default(0), // For dailies
  strength: integer("strength").default(0), // For habits
  lastCompleted: timestamp("last_completed"), // For dailies
  completedAt: timestamp("completed_at"), // For todos
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Habits (positive and/or negative tasks that can be triggered multiple times)
export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  priority: taskPriorityEnum("priority").notNull().default('easy'),
  direction: habitDirectionEnum("direction").notNull().default('both'),
  strength: integer("strength").notNull().default(0), // Tracks habit strength over time
  positive: boolean("positive").notNull().default(true), // Can be clicked "+"
  negative: boolean("negative").notNull().default(true), // Can be clicked "-"
  counterUp: integer("counter_up").notNull().default(0),
  counterDown: integer("counter_down").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow()
});

// Dailies (tasks that reset every day)
export const dailies = pgTable("dailies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  priority: taskPriorityEnum("priority").notNull().default('easy'),
  completed: boolean("completed").notNull().default(false),
  streak: integer("streak").notNull().default(0),
  // Weekdays when this daily is active (0-6, Sunday is 0)
  repeat: json("repeat").$type<boolean[]>().notNull().default([true, true, true, true, true, true, true]),
  icon: text("icon").default("CheckCircle"),
  createdAt: timestamp("created_at").defaultNow(),
  lastCompleted: timestamp("last_completed")
});

// Todos (one-time tasks)
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  priority: taskPriorityEnum("priority").notNull().default('easy'),
  completed: boolean("completed").notNull().default(false),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});

// Activity log for tracking history and statistics
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskType: taskTypeEnum("task_type").notNull(),
  taskId: integer("task_id").notNull(),
  action: text("action").notNull(), // completed, uncompleted, created, deleted, etc.
  value: integer("value"), // Points/coins earned or lost
  createdAt: timestamp("created_at").defaultNow()
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3),
  password: z.string().min(6),
  level: z.number().positive().default(1),
  experience: z.number().nonnegative().default(0),
  health: z.number().positive().default(50),
  maxHealth: z.number().positive().default(50),
  coins: z.number().nonnegative().default(0),
  avatar: z.string().optional(),
  auth_id: z.string().optional(),
});

export const insertTaskVidaSchema = createInsertSchema(taskVida).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertHabitSchema = createInsertSchema(habits).omit({ 
  id: true, 
  userId: true, 
  strength: true, 
  counterUp: true, 
  counterDown: true, 
  createdAt: true 
});

export const insertDailySchema = createInsertSchema(dailies).omit({ 
  id: true, 
  userId: true, 
  completed: true, 
  streak: true, 
  createdAt: true, 
  lastCompleted: true 
}).extend({
  priority: z.enum(taskPriorityEnum.enumValues).default('easy'),
});

export const insertTodoSchema = createInsertSchema(todos).omit({ 
  id: true, 
  userId: true, 
  completed: true, 
  createdAt: true, 
  completedAt: true 
}).extend({
  dueDate: z.preprocess(
    (arg) => typeof arg === "string" ? new Date(arg) : arg,
    z.date().optional()
  ),
  priority: z.enum(taskPriorityEnum.enumValues).default('easy'),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ 
  id: true, 
  createdAt: true 
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type TaskVida = typeof taskVida.$inferSelect;
export type InsertTaskVida = z.infer<typeof insertTaskVidaSchema>;

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

export type Daily = typeof dailies.$inferSelect;
export type InsertDaily = z.infer<typeof insertDailySchema>;

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Definição de tipos para o Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          username: string
          password: string
          level: number
          experience: number
          health: number
          max_health: number
          coins: number
          avatar: string | null
          auth_id: string | null
          created_at: string
        }
        Insert: {
          username: string
          password: string
          level?: number
          experience?: number
          health?: number
          max_health?: number
          coins?: number
          avatar?: string | null
          auth_id?: string | null
        }
        Update: {
          username?: string
          password?: string
          level?: number
          experience?: number
          health?: number
          max_health?: number
          coins?: number
          avatar?: string | null
          auth_id?: string | null
        }
      }
      task_vida: {
        Row: {
          id: number
          user_id: number
          title: string
          notes: string | null
          type: 'habit' | 'daily' | 'todo'
          priority: 'trivial' | 'easy' | 'medium' | 'hard'
          completed: boolean | null
          due_date: string | null
          repeat: any | null
          direction: 'positive' | 'negative' | 'both' | null
          positive: boolean | null
          negative: boolean | null
          counter_up: number | null
          counter_down: number | null
          streak: number | null
          strength: number | null
          last_completed: string | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: number
          title: string
          notes?: string | null
          type: 'habit' | 'daily' | 'todo'
          priority?: 'trivial' | 'easy' | 'medium' | 'hard'
          completed?: boolean | null
          due_date?: string | null
          repeat?: any | null
          direction?: 'positive' | 'negative' | 'both' | null
          positive?: boolean | null
          negative?: boolean | null
          counter_up?: number | null
          counter_down?: number | null
          streak?: number | null
          strength?: number | null
          last_completed?: string | null
          completed_at?: string | null
        }
        Update: {
          user_id?: number
          title?: string
          notes?: string | null
          type?: 'habit' | 'daily' | 'todo'
          priority?: 'trivial' | 'easy' | 'medium' | 'hard'
          completed?: boolean | null
          due_date?: string | null
          repeat?: any | null
          direction?: 'positive' | 'negative' | 'both' | null
          positive?: boolean | null
          negative?: boolean | null
          counter_up?: number | null
          counter_down?: number | null
          streak?: number | null
          strength?: number | null
          last_completed?: string | null
          completed_at?: string | null
        }
      }
      activity_logs: {
        Row: {
          id: number
          user_id: number
          task_type: 'habit' | 'daily' | 'todo'
          task_id: number
          action: string
          value: number | null
          created_at: string | null
        }
        Insert: {
          user_id: number
          task_type: 'habit' | 'daily' | 'todo'
          task_id: number
          action: string
          value?: number | null
        }
        Update: {
          user_id?: number
          task_type?: 'habit' | 'daily' | 'todo'
          task_id?: number
          action?: string
          value?: number | null
        }
      }
    }
  }
}
