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
  createdAt: timestamp("created_at").defaultNow()
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
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
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
});

export const insertTodoSchema = createInsertSchema(todos).omit({ 
  id: true, 
  userId: true, 
  completed: true, 
  createdAt: true, 
  completedAt: true 
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ 
  id: true, 
  createdAt: true 
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

export type Daily = typeof dailies.$inferSelect;
export type InsertDaily = z.infer<typeof insertDailySchema>;

export type Todo = typeof todos.$inferSelect;
export type InsertTodo = z.infer<typeof insertTodoSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
