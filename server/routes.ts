import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from 'zod-validation-error';
import { 
  insertUserSchema, 
  insertHabitSchema, 
  insertDailySchema, 
  insertTodoSchema 
} from "@shared/schema";

const MemoryStoreSession = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "taskvida-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        secure: process.env.NODE_ENV === "production",
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
    })
  );

  // Initialize passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }

        // In a real app, you would use bcrypt.compare
        // For simplicity here, we'll just do a direct comparison
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password" });
        }

        // Don't send the password back to the client
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize and deserialize user for passport session support
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      // Don't send the password back to the client
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (err) {
      done(err);
    }
  });

  // Error handling middleware for Zod validation errors
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ message: validationError.message });
    }
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  };

  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // API Routes
  // ===============================

  // === Auth Routes ===
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // In a real app, you would hash the password
      // const hashedPassword = await bcrypt.hash(userData.password, 10);
      // const user = await storage.createUser({ ...userData, password: hashedPassword });

      const user = await storage.createUser(userData);
      
      // Don't send the password back to the client
      const { password: _, ...userWithoutPassword } = user;
      
      // Log the user in
      req.login(userWithoutPassword, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging in" });
        }
        return res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/check", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // === User Routes ===
  app.get("/api/user", isAuthenticated, (req, res) => {
    res.json(req.user);
  });

  app.patch("/api/user", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const updateUserSchema = z.object({
        avatar: z.string().optional(),
      });
      
      const userData = updateUserSchema.parse(req.body);
      const updatedUser = await storage.updateUser(userId, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send the password back to the client
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // === Habit Routes ===
  app.get("/api/habits", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const habits = await storage.getHabits(userId);
      res.json(habits);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/habits/:id", isAuthenticated, async (req, res) => {
    try {
      const habit = await storage.getHabit(parseInt(req.params.id));
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      // Ensure the user can only access their own habits
      if (habit.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(habit);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/habits", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const habitData = insertHabitSchema.parse(req.body);
      const habit = await storage.createHabit(userId, habitData);
      res.status(201).json(habit);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.patch("/api/habits/:id", isAuthenticated, async (req, res) => {
    try {
      const habit = await storage.getHabit(parseInt(req.params.id));
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      // Ensure the user can only update their own habits
      if (habit.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updateHabitSchema = insertHabitSchema.partial();
      const habitData = updateHabitSchema.parse(req.body);
      
      const updatedHabit = await storage.updateHabit(habit.id, habitData);
      res.json(updatedHabit);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.delete("/api/habits/:id", isAuthenticated, async (req, res) => {
    try {
      const habit = await storage.getHabit(parseInt(req.params.id));
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      // Ensure the user can only delete their own habits
      if (habit.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteHabit(habit.id);
      res.json({ message: "Habit deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/habits/:id/score/:direction", isAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id);
      const direction = req.params.direction as 'up' | 'down';
      
      if (direction !== 'up' && direction !== 'down') {
        return res.status(400).json({ message: "Direction must be 'up' or 'down'" });
      }
      
      const habit = await storage.getHabit(habitId);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      // Ensure the user can only score their own habits
      if (habit.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await storage.scoreHabit(habitId, direction);
      
      // Get updated user info after scoring
      const user = await storage.getUser((req.user as any).id);
      const { password: _, ...userWithoutPassword } = user!;
      
      res.json({
        habit: result.habit,
        reward: result.reward,
        user: userWithoutPassword
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Daily Routes ===
  app.get("/api/dailies", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const dailies = await storage.getDailies(userId);
      res.json(dailies);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dailies/:id", isAuthenticated, async (req, res) => {
    try {
      const daily = await storage.getDaily(parseInt(req.params.id));
      
      if (!daily) {
        return res.status(404).json({ message: "Daily not found" });
      }
      
      // Ensure the user can only access their own dailies
      if (daily.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(daily);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/dailies", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const dailyData = insertDailySchema.parse(req.body);
      const daily = await storage.createDaily(userId, dailyData);
      res.status(201).json(daily);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.patch("/api/dailies/:id", isAuthenticated, async (req, res) => {
    try {
      const daily = await storage.getDaily(parseInt(req.params.id));
      
      if (!daily) {
        return res.status(404).json({ message: "Daily not found" });
      }
      
      // Ensure the user can only update their own dailies
      if (daily.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updateDailySchema = insertDailySchema.partial();
      const dailyData = updateDailySchema.parse(req.body);
      
      const updatedDaily = await storage.updateDaily(daily.id, dailyData);
      res.json(updatedDaily);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.delete("/api/dailies/:id", isAuthenticated, async (req, res) => {
    try {
      const daily = await storage.getDaily(parseInt(req.params.id));
      
      if (!daily) {
        return res.status(404).json({ message: "Daily not found" });
      }
      
      // Ensure the user can only delete their own dailies
      if (daily.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteDaily(daily.id);
      res.json({ message: "Daily deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/dailies/:id/check", isAuthenticated, async (req, res) => {
    try {
      const dailyId = parseInt(req.params.id);
      const { completed } = req.body;
      
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: "Completed status must be a boolean" });
      }
      
      const daily = await storage.getDaily(dailyId);
      
      if (!daily) {
        return res.status(404).json({ message: "Daily not found" });
      }
      
      // Ensure the user can only check their own dailies
      if (daily.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await storage.checkDaily(dailyId, completed);
      
      // Get updated user info after checking
      const user = await storage.getUser((req.user as any).id);
      const { password: _, ...userWithoutPassword } = user!;
      
      res.json({
        daily: result.daily,
        reward: result.reward,
        user: userWithoutPassword
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Todo Routes ===
  app.get("/api/todos", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const todos = await storage.getTodos(userId);
      res.json(todos);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/todos/:id", isAuthenticated, async (req, res) => {
    try {
      const todo = await storage.getTodo(parseInt(req.params.id));
      
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }
      
      // Ensure the user can only access their own todos
      if (todo.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(todo);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/todos", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const todoData = insertTodoSchema.parse(req.body);
      const todo = await storage.createTodo(userId, todoData);
      res.status(201).json(todo);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.patch("/api/todos/:id", isAuthenticated, async (req, res) => {
    try {
      const todo = await storage.getTodo(parseInt(req.params.id));
      
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }
      
      // Ensure the user can only update their own todos
      if (todo.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updateTodoSchema = insertTodoSchema.partial();
      const todoData = updateTodoSchema.parse(req.body);
      
      const updatedTodo = await storage.updateTodo(todo.id, todoData);
      res.json(updatedTodo);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.delete("/api/todos/:id", isAuthenticated, async (req, res) => {
    try {
      const todo = await storage.getTodo(parseInt(req.params.id));
      
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }
      
      // Ensure the user can only delete their own todos
      if (todo.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.deleteTodo(todo.id);
      res.json({ message: "Todo deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/todos/:id/check", isAuthenticated, async (req, res) => {
    try {
      const todoId = parseInt(req.params.id);
      const { completed } = req.body;
      
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ message: "Completed status must be a boolean" });
      }
      
      const todo = await storage.getTodo(todoId);
      
      if (!todo) {
        return res.status(404).json({ message: "Todo not found" });
      }
      
      // Ensure the user can only check their own todos
      if (todo.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await storage.checkTodo(todoId, completed);
      
      // Get updated user info after checking
      const user = await storage.getUser((req.user as any).id);
      const { password: _, ...userWithoutPassword } = user!;
      
      res.json({
        todo: result.todo,
        reward: result.reward,
        user: userWithoutPassword
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Stats Routes ===
  app.get("/api/stats/activity", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activityLogs = await storage.getUserActivityLogs(userId, limit);
      res.json(activityLogs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Every day at midnight, reset all dailies
  if (process.env.NODE_ENV === "production") {
    const resetDailies = async () => {
      try {
        await storage.resetDailies();
        console.log("Dailies reset successfully");
      } catch (err) {
        console.error("Error resetting dailies:", err);
      }
    };

    // Schedule the daily reset job
    const scheduleReset = () => {
      const now = new Date();
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // tomorrow
        0, 0, 0 // midnight
      );
      const timeToMidnight = night.getTime() - now.getTime();
      
      setTimeout(() => {
        resetDailies();
        // Schedule the next reset
        scheduleReset();
      }, timeToMidnight);
    };

    // Start the scheduling
    scheduleReset();
  }

  const httpServer = createServer(app);
  return httpServer;
}
