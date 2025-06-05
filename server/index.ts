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

// Verificar se as tabelas necessárias existem
async function verifyRequiredTables(client: any) {
  const requiredTables = ['users', 'habits', 'dailies', 'todos', 'user_settings', 'notification_logs'];
  
  for (const table of requiredTables) {
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (!result.rows[0].exists) {
        throw new Error(`Tabela '${table}' não encontrada`);
      }
    } catch (error) {
      console.log(`⚠️ Tabela '${table}' não encontrada ou inacessível`);
      throw error;
    }
  }
  
  console.log("✅ Todas as tabelas necessárias estão presentes");
}

// Criar tabelas manualmente se as migrações falharam
async function createTablesManually(client: any) {
  const createTablesSQL = `
    -- Criar tabela users se não existir
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      avatar TEXT,
      auth_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Criar tabela habits se não existir
    CREATE TABLE IF NOT EXISTS habits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(10) DEFAULT 'medium',
      streak INTEGER DEFAULT 0,
      notes TEXT,
      reminder_time TIMESTAMP,
      has_reminder BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Criar tabela dailies se não existir
    CREATE TABLE IF NOT EXISTS dailies (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(10) DEFAULT 'medium',
      completed BOOLEAN DEFAULT false,
      notes TEXT,
      reminder_time TIMESTAMP,
      has_reminder BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Criar tabela todos se não existir
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(10) DEFAULT 'medium',
      completed BOOLEAN DEFAULT false,
      notes TEXT,
      reminder_time TIMESTAMP,
      has_reminder BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Criar tabela user_settings se não existir
    CREATE TABLE IF NOT EXISTS user_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      webhook_url TEXT,
      reminder_minutes_before INTEGER NOT NULL DEFAULT 15,
      webhook_enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP
    );
    
    -- Criar tabela notification_logs se não existir
    CREATE TABLE IF NOT EXISTS notification_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL,
      task_type VARCHAR(10) NOT NULL,
      reminder_time TIMESTAMP NOT NULL,
      sent_at TIMESTAMP DEFAULT NOW(),
      success BOOLEAN NOT NULL DEFAULT true,
      error_message TEXT
    );
    
    -- Criar tabela activity_logs se não existir
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      entity_type VARCHAR(20) NOT NULL,
      entity_id INTEGER NOT NULL,
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  
  await client.query(createTablesSQL);
  console.log("✅ Tabelas criadas/verificadas manualmente");
}

// Setup database tables if using PostgreSQL
async function setupDatabase() {
  const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true';
  
  if (!useMemoryStorage && pool) {
    console.log("Configurando banco de dados e tabelas...");
    
    try {
      // Primeiro, conectar ao banco postgres padrão para criar o banco habittracker
      const { Pool } = await import('pg');
      const adminPool = new Pool({
        connectionString: process.env.DATABASE_URL?.replace('/habittracker', '/postgres'),
        ssl: false
      });
      
      try {
        const adminClient = await adminPool.connect();
        
        // Verificar se o banco habittracker existe, se não, criar
        const dbCheckResult = await adminClient.query(
          "SELECT 1 FROM pg_database WHERE datname = 'habittracker'"
        );
        
        if (dbCheckResult.rows.length === 0) {
          console.log("Criando banco de dados 'habittracker'...");
          await adminClient.query('CREATE DATABASE habittracker');
          console.log("✅ Banco de dados 'habittracker' criado com sucesso");
        } else {
          console.log("✅ Banco de dados 'habittracker' já existe");
        }
        
        adminClient.release();
      } catch (adminError) {
        console.log("⚠️ Erro ao verificar/criar banco (pode já existir):", adminError.message);
      } finally {
        await adminPool.end();
      }
      
      // Aguardar um pouco para garantir que o banco está pronto
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Agora conectar ao banco habittracker
      const client = await pool.connect();
      
      // Verificar se o banco está acessível
      await client.query('SELECT NOW()');
      console.log("✅ Conexão com PostgreSQL/habittracker confirmada");
      
      client.release();
      console.log("✅ Conexão com PostgreSQL/habittracker confirmada");
      
      // Run Drizzle migrations
      console.log("Executando migrações do Drizzle...");
      try {
        await migrate(db, { migrationsFolder: "./migrations" });
        console.log("✅ Migrações executadas com sucesso");
        
        // Verificar se as tabelas necessárias existem
        await verifyRequiredTables(client);
        
      } catch (migrationError) {
        console.error("❌ Erro ao executar migrações:", migrationError);
        console.log("🔧 Tentando criar tabelas manualmente...");
        
        // Tentar criar as tabelas manualmente se as migrações falharam
        try {
          await createTablesManually(client);
          console.log("✅ Tabelas criadas manualmente com sucesso");
        } catch (manualError) {
          console.error("❌ Erro ao criar tabelas manualmente:", manualError);
          console.log("⚠️ Continuando com inicialização, mas algumas funcionalidades podem não funcionar...");
        }
      }
    } catch (error) {
      console.error("❌ Erro ao configurar tabelas do banco de dados:", error);
      console.log("⚠️ Continuando com inicialização...");
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
