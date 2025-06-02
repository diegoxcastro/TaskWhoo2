import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage, MemStorage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import { Parser } from "json2csv";
import { 
  insertUserSchema, 
  insertHabitSchema, 
  insertDailySchema, 
  insertTodoSchema,
  insertUserSettingsSchema,
  User, // Import User type
  Daily // Import Daily type
} from "@shared/schema";
import express from "express";
import path from "path";

// Extend Request interface to include user and multer file properties
declare module "express" {
  interface Request {
    user?: User; // Add user property with User type
    file?: Express.Multer.File; // Add file property for multer
  }
}

const MemoryStoreSession = MemoryStore(session);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Note: API key authentication is now handled in the isAuthenticated middleware
// This avoids conflicts between global API key auth and endpoint-specific authentication

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "taskvida-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for better persistence
        secure: false, // HTTP, não usar secure
        sameSite: "lax", // 'lax' para dev/local sem SSL
        httpOnly: false, // Allow client-side access for better persistence
      },
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
        max: 1000, // Maximum number of sessions to store
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL
        dispose: function(key: string, val: any) {
          // Optional: log when sessions are disposed
          console.log('Session disposed:', key);
        }
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

        // In the strategy, call done with the full user object (or a simplified version if preferred, but consistent)
        // Passport will then serialize this user object.
        // Pass the user object fetched from storage
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize and deserialize user for passport session support
  // Use the User type for the user parameter
  passport.serializeUser((user: any, done) => {
    // Serialize only the user ID to store in the session
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      // Deserialize by fetching the user from the database using the ID
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      // Pass the fetched user object to done
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Error handling middleware for Zod validation errors
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      res.status(400).json({ 
        message: "Validation error", 
        errors: validationError.details
      });
    } else {
      console.error("API Error:", err);
      
      // Verificar se é um erro de conexão com o banco de dados
      if (err instanceof Error) {
        if (err.message.includes('ENOTFOUND') || 
            err.message.includes('connection') || 
            err.message.includes('timeout')) {
          return res.status(503).json({ 
            message: "Erro de conexão com o banco de dados. Por favor, tente novamente mais tarde.",
            error: err.message
          });
        }
      }
      
      res.status(500).json({ 
        message: "Internal server error", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };

  // Authentication middleware
  const isAuthenticated: RequestHandler = async (req, res, next) => {
    // Permitir acesso se a API Key for válida
    let apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (Array.isArray(apiKey)) apiKey = apiKey[0];
    const validKey = process.env.API_KEY;
    if (apiKey && validKey && apiKey === validKey) {
      // Buscar usuário admin e atribuir a req.user
      const adminUser = await storage.getUserByUsername(process.env.ADMIN_USERNAME || 'awake');
      if (adminUser) {
        (req as any).user = adminUser;
        return next();
      } else {
        return res.status(403).json({ message: "Usuário admin não encontrado para autenticação via API Key" });
      }
    }
    if (process.env.NODE_ENV === "development") {
      if (!(req as any).user) {
        (req as any).user = {
          id: 1,
          username: "dev-user",
          password: "dev-password",
          avatar: null,
          auth_id: null,
          createdAt: new Date()
        };
      }
      return next();
    }
    if ((req as any).isAuthenticated && (req as any).isAuthenticated() && (req as any).user) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // API key authentication is handled individually by the isAuthenticated middleware
  // This allows for more flexible authentication (session OR API key)

  // API Routes
  // ===============================

  // TEMPORARY: List all users for debugging
  app.get("/api/debug/users", async (req, res) => {
    try {
      // For MemStorage, we need to get users differently
      if (storage instanceof MemStorage) {
        const users = Array.from((storage as any).users.values()).map((user: User) => {
          // Make a copy without the password
          const { password, ...userWithoutPassword } = user as any;
          return userWithoutPassword;
        });
        return res.json({ users, count: users.length });
      } else {
        return res.json({ message: "Debug only available with memory storage" });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error fetching users" });
    }
  });

  // Create a default admin user (FOR DEVELOPMENT ONLY)
  app.get("/api/setup", async (req, res) => {
    try {
      // Check if admin user already exists
      const existingUser = await storage.getUserByUsername("admin");
      if (existingUser) {
        return res.json({ message: "Admin user already exists", username: "admin", password: "admin123" });
      }
      
      // Create admin user
      const userData = {
        username: "admin",
        password: "admin123"
      };
      
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      
      return res.json({ 
        message: "Admin user created successfully", 
        user: userWithoutPassword,
        username: "admin",
        password: "admin123"
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Error creating admin user" });
    }
  });

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
    const user = (req as any).user;
    res.json(user);
  });

  app.patch("/api/user", isAuthenticated, async (req, res) => {
    try {
      // Access userId directly from req.user which is now typed
      const userId = (req as any).user!.id; // Use non-null assertion as isAuthenticated ensures user exists
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

  // Upload avatar image
  app.post("/api/user/avatar", isAuthenticated, upload.single('avatar'), async (req, res) => {
    try {
      const userId = (req as any).user!.id;
      
      if (!req.file) {
        return res.status(400).json({ message: "Nenhuma imagem enviada" });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Tipo de arquivo não suportado. Use JPEG, PNG, GIF ou WebP." });
      }

      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "Arquivo muito grande. Tamanho máximo: 5MB." });
      }

      // Convert image to base64 data URL
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Update user avatar in database
      const updatedUser = await storage.updateUser(userId, { avatar: base64Image });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Don't send the password back to the client
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ 
        message: "Avatar atualizado com sucesso", 
        user: userWithoutPassword 
      });
    } catch (err) {
      console.error("Erro ao fazer upload do avatar:", err);
      res.status(500).json({ 
        message: "Erro interno do servidor", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
   });

  // Remove avatar (set to null)
  app.delete("/api/user/avatar", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user!.id;
      
      // Update user avatar to null in database
      const updatedUser = await storage.updateUser(userId, { avatar: null });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Don't send the password back to the client
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ 
        message: "Avatar removido com sucesso", 
        user: userWithoutPassword 
      });
    } catch (err) {
      console.error("Erro ao remover avatar:", err);
      res.status(500).json({ 
        message: "Erro interno do servidor", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // === Habit Routes ===
  app.get("/api/habits", isAuthenticated, async (req, res) => {
    try {
      // Access userId directly from req.user
      const userId = (req as any).user!.id;
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
      // Access userId directly from req.user
      if (habit.userId !== (req as any).user!.id) {
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
      // Access userId directly from req.user
      const userId = (req as any).user!.id;
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
      // Access userId directly from req.user
      if (habit.userId !== (req as any).user!.id) {
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
      // Access userId directly from req.user
      if (habit.userId !== (req as any).user!.id) {
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
      // Access userId directly from req.user
      if (habit.userId !== (req as any).user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await storage.scoreHabit(habitId, direction);
      
      // Get updated user info after scoring
      // Access userId directly from req.user
      const user = await storage.getUser((req as any).user!.id);
      
      if (user) {
        // Destructure user to omit password
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
          habit: result.habit,
          user: userWithoutPassword
        });
      } else {
        res.json({
          habit: result.habit
        });
      }
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // === Daily Routes ===
  app.get("/api/dailies", isAuthenticated, async (req, res) => {
    try {
      // Access userId directly from req.user
      const userId = (req as any).user!.id;
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
      // Access userId directly from req.user
      if (daily.userId !== (req as any).user!.id) {
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
      // Access userId directly from req.user
      const userId = (req as any).user!.id;
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
      // Access userId directly from req.user
      if (daily.userId !== (req as any).user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updateDailySchema = insertDailySchema.partial();
      const dailyData = updateDailySchema.parse(req.body);
      
      // Cast dailyData to Partial<Daily> as it matches the expected type
      const updatedDaily = await storage.updateDaily(daily.id, dailyData as Partial<Daily>);
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
      // Access userId directly from req.user
      if (daily.userId !== (req as any).user!.id) {
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
      // Access userId directly from req.user
      if (daily.userId !== (req as any).user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await storage.checkDaily(dailyId, completed);
      
      // Get updated user info after checking
      // Access userId directly from req.user
      const user = await storage.getUser((req as any).user!.id);
      const { password: _, ...userWithoutPassword } = user!;
      
      res.json({
        daily: result.daily,
        user: userWithoutPassword
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint para atualizar ordem das dailies
  app.patch("/api/dailies/order", isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const { ids } = req.body; // array de IDs na nova ordem
    if (!Array.isArray(ids)) return res.status(400).json({ message: "Formato inválido" });
    try {
      for (let i = 0; i < ids.length; i++) {
        await storage.updateDaily(ids[i], { order: i });
      }
      return res.json({ message: "Ordem das dailies atualizada" });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao atualizar ordem das dailies", error: String(error) });
    }
  });

  // === Todo Routes ===
  app.get("/api/todos", isAuthenticated, async (req, res) => {
    try {
      // Access userId directly from req.user
      const userId = (req as any).user!.id;
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
      // Access userId directly from req.user
      if (todo.userId !== (req as any).user!.id) {
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
      // Access userId directly from req.user
      const userId = (req as any).user!.id;
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
      // Access userId directly from req.user
      if (todo.userId !== (req as any).user!.id) {
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
      // Access userId directly from req.user
      if (todo.userId !== (req as any).user!.id) {
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
      // Access userId directly from req.user
      if (todo.userId !== (req as any).user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const result = await storage.checkTodo(todoId, completed);
      
      // Get updated user info after checking
      // Access userId directly from req.user
      const user = await storage.getUser((req as any).user!.id);
      const { password: _, ...userWithoutPassword } = user!;
      
      res.json({
        todo: result.todo,
        user: userWithoutPassword
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Endpoint para atualizar ordem dos todos
  app.patch("/api/todos/order", isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const { ids } = req.body; // array de IDs na nova ordem
    if (!Array.isArray(ids)) return res.status(400).json({ message: "Formato inválido" });
    try {
      for (let i = 0; i < ids.length; i++) {
        await storage.updateTodo(ids[i], { order: i });
      }
      return res.json({ message: "Ordem dos todos atualizada" });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao atualizar ordem dos todos", error: String(error) });
    }
  });

  // === Stats Routes ===
  app.get("/api/stats/activity", isAuthenticated, async (req, res) => {
    try {
      // Access userId directly from req.user
      const userId = (req as any).user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activityLogs = await storage.getUserActivityLogs(userId, limit);
      res.json(activityLogs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Importação e Exportação de Dados ===
  // Exportar todos os dados do usuário (habits, dailies, todos) como JSON
  app.get("/api/export/json", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar todos os dados do usuário
      const habits = await storage.getHabits(userId);
      const dailies = await storage.getDailies(userId);
      const todos = await storage.getTodos(userId);
      const userData = await storage.getUser(userId);

      // Remover senha do usuário
      if (userData) {
        delete (userData as any).password;
      }

      // Criar objeto de dados completo
      const exportData = {
        exportedAt: new Date(),
        userData,
        habits,
        dailies,
        todos
      };

      // Enviar como JSON
      res.setHeader('Content-Disposition', 'attachment; filename="habittracker-export.json"');
      res.setHeader('Content-Type', 'application/json');
      return res.json(exportData);
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      return res.status(500).json({ message: "Erro ao exportar dados", error: String(error) });
    }
  });

  // Exportar todos os dados do usuário (habits, dailies, todos) como CSV
  app.get("/api/export/csv", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar todos os dados do usuário
      const habits = await storage.getHabits(userId);
      const dailies = await storage.getDailies(userId);
      const todos = await storage.getTodos(userId);

      // Criar parsers para cada tipo de dado
      const habitsParser = new Parser({ fields: ['id', 'title', 'notes', 'priority', 'direction', 'positive', 'negative', 'counterUp', 'counterDown', 'strength', 'createdAt'] });
      const dailiesParser = new Parser({ fields: ['id', 'title', 'notes', 'priority', 'completed', 'streak', 'repeat', 'lastCompleted', 'createdAt'] });
      const todosParser = new Parser({ fields: ['id', 'title', 'notes', 'priority', 'completed', 'dueDate', 'completedAt', 'createdAt'] });

      // Converter para CSV
      const habitsCSV = habitsParser.parse(habits);
      const dailiesCSV = dailiesParser.parse(dailies);
      const todosCSV = todosParser.parse(todos);

      // Combinar em um único arquivo
      const combinedCSV = `# HABITS\n${habitsCSV}\n\n# DAILIES\n${dailiesCSV}\n\n# TODOS\n${todosCSV}`;

      // Enviar como CSV
      res.setHeader('Content-Disposition', 'attachment; filename="habittracker-export.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(combinedCSV);
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      return res.status(500).json({ message: "Erro ao exportar dados", error: String(error) });
    }
  });

  // Exportar para Excel (XLSX)
  app.get("/api/export/excel", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Este endpoint geraria um arquivo Excel, mas por simplicidade, 
      // vamos sugerir ao cliente que use a exportação CSV que é facilmente 
      // importada no Excel.
      res.redirect("/api/export/csv");
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      return res.status(500).json({ message: "Erro ao exportar dados", error: String(error) });
    }
  });

  // Importar dados de um arquivo JSON
  app.post("/api/import/json", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // Analisar o arquivo JSON
      const fileContent = req.file.buffer.toString('utf8');
      let importData;
      
      try {
        importData = JSON.parse(fileContent);
      } catch (parseError) {
        return res.status(400).json({ message: "Arquivo JSON inválido", error: String(parseError) });
      }

      // Validar o formato do arquivo importado
      if (!importData.habits || !importData.dailies || !importData.todos) {
        return res.status(400).json({ message: "Formato de arquivo inválido" });
      }

      // Importar hábitos
      let importedHabits = 0;
      for (const habit of importData.habits) {
        try {
          // Preparar dados do hábito
          const habitData = {
            title: habit.title,
            notes: habit.notes || "",
            priority: habit.priority || "easy",
            direction: habit.direction || "both",
            positive: habit.positive !== undefined ? habit.positive : true,
            negative: habit.negative !== undefined ? habit.negative : false
          };
          
          await storage.createHabit(userId, habitData);
          importedHabits++;
        } catch (err) {
          console.error("Erro ao importar hábito:", err);
          // Continuar com outros hábitos mesmo se um falhar
        }
      }

      // Importar tarefas diárias
      let importedDailies = 0;
      for (const daily of importData.dailies) {
        try {
          // Preparar dados da tarefa diária
          const dailyData = {
            title: daily.title,
            notes: daily.notes || "",
            priority: daily.priority || "easy",
            repeat: daily.repeat || [true, true, true, true, true, true, true]
          };
          
          await storage.createDaily(userId, dailyData);
          importedDailies++;
        } catch (err) {
          console.error("Erro ao importar tarefa diária:", err);
          // Continuar com outras tarefas mesmo se uma falhar
        }
      }

      // Importar tarefas
      let importedTodos = 0;
      for (const todo of importData.todos) {
        try {
          // Preparar dados da tarefa
          const todoData = {
            title: todo.title,
            notes: todo.notes || "",
            priority: todo.priority || "easy",
            dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined
          };
          
          await storage.createTodo(userId, todoData);
          importedTodos++;
        } catch (err) {
          console.error("Erro ao importar tarefa:", err);
          // Continuar com outras tarefas mesmo se uma falhar
        }
      }

      return res.json({
        message: "Importação concluída com sucesso",
        stats: {
          habits: importedHabits,
          dailies: importedDailies,
          todos: importedTodos
        }
      });
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      return res.status(500).json({ message: "Erro ao importar dados", error: String(error) });
    }
  });

  // Importar dados de um arquivo CSV
  app.post("/api/import/csv", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // Analisar o arquivo CSV
      const fileContent = req.file.buffer.toString('utf8');
      
      // Dividir o arquivo em seções
      const sections = fileContent.split(/^#\s*([A-Z]+)\s*$/m);
      
      let importedHabits = 0;
      let importedDailies = 0;
      let importedTodos = 0;
      
      // Procurar seção de hábitos
      const habitsIndex = sections.findIndex(s => s.trim() === 'HABITS');
      if (habitsIndex !== -1 && habitsIndex + 1 < sections.length) {
        const habitsCSV = sections[habitsIndex + 1].trim();
        if (habitsCSV) {
          // Converter CSV para objetos
          const habitsLines = habitsCSV.split('\n');
          const headers = habitsLines[0].split(',').map(h => h.trim());
          
          for (let i = 1; i < habitsLines.length; i++) {
            try {
              const values = habitsLines[i].split(',').map(v => v.trim());
              const habit = headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
              }, {} as any);
              
              // Criar hábito
              if (habit.title) {
                await storage.createHabit(userId, {
                  title: habit.title,
                  notes: habit.notes || "",
                  priority: habit.priority || "easy",
                  direction: habit.direction || "both",
                  positive: habit.positive === 'true',
                  negative: habit.negative === 'true'
                });
                importedHabits++;
              }
            } catch (err) {
              console.error("Erro ao importar hábito do CSV:", err);
            }
          }
        }
      }
      
      // Procurar seção de tarefas diárias
      const dailiesIndex = sections.findIndex(s => s.trim() === 'DAILIES');
      if (dailiesIndex !== -1 && dailiesIndex + 1 < sections.length) {
        const dailiesCSV = sections[dailiesIndex + 1].trim();
        if (dailiesCSV) {
          // Converter CSV para objetos
          const dailiesLines = dailiesCSV.split('\n');
          const headers = dailiesLines[0].split(',').map(h => h.trim());
          
          for (let i = 1; i < dailiesLines.length; i++) {
            try {
              const values = dailiesLines[i].split(',').map(v => v.trim());
              const daily = headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
              }, {} as any);
              
              // Criar tarefa diária
              if (daily.title) {
                await storage.createDaily(userId, {
                  title: daily.title,
                  notes: daily.notes || "",
                  priority: daily.priority || "easy",
                  repeat: daily.repeat ? JSON.parse(daily.repeat) : [true, true, true, true, true, true, true]
                });
                importedDailies++;
              }
            } catch (err) {
              console.error("Erro ao importar tarefa diária do CSV:", err);
            }
          }
        }
      }
      
      // Procurar seção de tarefas
      const todosIndex = sections.findIndex(s => s.trim() === 'TODOS');
      if (todosIndex !== -1 && todosIndex + 1 < sections.length) {
        const todosCSV = sections[todosIndex + 1].trim();
        if (todosCSV) {
          // Converter CSV para objetos
          const todosLines = todosCSV.split('\n');
          const headers = todosLines[0].split(',').map(h => h.trim());
          
          for (let i = 1; i < todosLines.length; i++) {
            try {
              const values = todosLines[i].split(',').map(v => v.trim());
              const todo = headers.reduce((obj, header, index) => {
                obj[header] = values[index] || '';
                return obj;
              }, {} as any);
              
              // Criar tarefa
              if (todo.title) {
                await storage.createTodo(userId, {
                  title: todo.title,
                  notes: todo.notes || "",
                  priority: todo.priority || "easy",
                  dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined
                });
                importedTodos++;
              }
            } catch (err) {
              console.error("Erro ao importar tarefa do CSV:", err);
            }
          }
        }
      }
      
      return res.json({
        message: "Importação concluída com sucesso",
        stats: {
          habits: importedHabits,
          dailies: importedDailies,
          todos: importedTodos
        }
      });
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      return res.status(500).json({ message: "Erro ao importar dados", error: String(error) });
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



  // Start notification service
  startNotificationService();

  // === Settings Routes ===
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user!.id;
      const settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = {
          webhookUrl: undefined,
          reminderMinutesBefore: 15,
          webhookEnabled: false
        };
        const newSettings = await storage.createUserSettings(userId, defaultSettings);
        return res.json(newSettings);
      }
      
      res.json(settings);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  app.put("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user!.id;
      const settingsData = insertUserSettingsSchema.parse(req.body);
      
      // Check if settings exist
      const existingSettings = await storage.getUserSettings(userId);
      
      let settings;
      if (existingSettings) {
        settings = await storage.updateUserSettings(userId, settingsData);
      } else {
        settings = await storage.createUserSettings(userId, settingsData);
      }
      
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      res.json(settings);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // === Notification Routes ===
  app.get("/api/notifications/upcoming", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user!.id;
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      const tasksWithReminders = await storage.getTasksWithReminders(userId, now, twoHoursLater);
      
      const upcomingNotifications = tasksWithReminders.map(({ task, type }) => ({
        id: task.id,
        title: task.title,
        type,
        reminderTime: (task as any).reminderTime,
        priority: task.priority,
        notes: task.notes
      }));
      
      res.json(upcomingNotifications);
    } catch (err) {
      handleZodError(err, res);
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
