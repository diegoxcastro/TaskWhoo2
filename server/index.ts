import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { db } from "./db";
import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./db";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Setup database
async function setupDatabase() {
  console.log("Setting up Supabase database tables...");
  
  const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true';
  
  if (!useMemoryStorage) {
    try {
      // Verificar conexão com o banco
      const client = await pool.connect();
      
      // Execute schema creation queries
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          level INTEGER DEFAULT 1,
          experience INTEGER DEFAULT 0,
          health INTEGER DEFAULT 50,
          max_health INTEGER DEFAULT 50,
          coins INTEGER DEFAULT 0,
          avatar TEXT,
          auth_id TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Renomear a tabela TaskVida para task_vida caso exista
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'TaskVida') THEN
            ALTER TABLE "TaskVida" RENAME TO task_vida;
          END IF;
        END
        $$;

        CREATE TABLE IF NOT EXISTS task_vida (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          notes TEXT,
          type TEXT NOT NULL,
          priority TEXT NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          due_date TIMESTAMP WITH TIME ZONE,
          repeat BOOLEAN[] DEFAULT '{true,true,true,true,true,true,true}',
          direction TEXT,
          positive BOOLEAN,
          negative BOOLEAN,
          counter_up INTEGER DEFAULT 0,
          counter_down INTEGER DEFAULT 0,
          streak INTEGER DEFAULT 0,
          strength INTEGER DEFAULT 0,
          last_completed TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          task_type TEXT NOT NULL,
          task_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          value INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      client.release();
      console.log("✅ Database tables configuradas com sucesso");
    } catch (error) {
      console.error("Erro ao configurar tabelas do banco de dados:", error);
    }
  } else {
    console.log("Usando armazenamento em memória - sem operações no banco de dados");
  }
}

// Create admin user for testing if needed
async function createAdminUser() {
  const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true';

  // Ler usuário e senha das variáveis de ambiente ou usar padrão
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    let adminUser = await storage.getUserByUsername(adminUsername);
    if (!adminUser) {
      adminUser = await storage.createUser({
        username: adminUsername,
        password: adminPassword,
        level: 1,
        experience: 0,
        health: 50,
        maxHealth: 50,
        coins: 100,
        avatar: undefined,
        auth_id: undefined
      });
      console.log(`Usuário admin '${adminUsername}' criado com sucesso`);
    } else {
      // Atualiza a senha do admin para garantir que está igual à do ambiente
      await storage.updateUser(adminUser.id, { password: adminPassword });
      console.log(`Usuário admin '${adminUsername}' já existia, senha atualizada.`);
    }

    // Só cria o usuário awake se o admin não for awake
    if (adminUsername !== 'awake') {
      let awakeUser = await storage.getUserByUsername('awake');
      if (!awakeUser) {
        awakeUser = await storage.createUser({
          username: 'awake',
          password: '45Seo123$%',
          level: 1,
          experience: 0,
          health: 50,
          maxHealth: 50,
          coins: 100,
          avatar: undefined,
          auth_id: undefined
        });
        console.log("Usuário awake criado com sucesso");
      } else {
        // Atualiza a senha do awake para garantir que está igual à do ambiente
        await storage.updateUser(awakeUser.id, { password: '45Seo123$%' });
        console.log("Usuário awake já existe, senha atualizada.");
      }
    }
  } catch (error) {
    console.error("Erro ao criar usuário admin ou awake:", error);
  }
}

(async () => {
  // Setup database first
  await setupDatabase();
  
  // Criar usuário admin antes de iniciar o servidor
  await createAdminUser();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    log(`serving on port ${PORT}`);
  });
})();
