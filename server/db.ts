import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@shared/schema';

// Log environment variables for debugging
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("USE_MEMORY_STORAGE:", process.env.USE_MEMORY_STORAGE);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_DATABASE:", process.env.DB_DATABASE);

// URL padrão para modo development - impede erros quando não há variáveis de ambiente
const FALLBACK_URL = "http://localhost:8000";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.xxxxxxx";

// Default to memory storage if explicitly set to true
const useMemoryStorage = process.env.USE_MEMORY_STORAGE === 'true';
console.log("Using memory storage:", useMemoryStorage);

// Create database connection
let pool: Pool | null = null;
let db: any;
// Criar cliente Supabase para o servidor
export let supabase: SupabaseClient<Database>;

if (!useMemoryStorage) {
  console.log("Conectando ao banco PostgreSQL local...");
  try {
    // Verificar se temos uma conexão de banco válida
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não definida. Configure-a no seu arquivo .env ou variáveis de ambiente.");
    }
    
    console.log("Tentando conexão com a URL:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"));
    
    // Configura o pool de conexões
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: false, // Desabilitar SSL para conexões locais do Docker
      connectionTimeoutMillis: 30000, // 30 segundos de timeout
      max: 10, // máximo de conexões no pool
      idleTimeoutMillis: 60000, // quanto tempo uma conexão pode ficar ociosa
      acquireTimeoutMillis: 30000, // timeout para adquirir conexão do pool
      createTimeoutMillis: 30000, // timeout para criar nova conexão
      reapIntervalMillis: 1000, // intervalo para verificar conexões ociosas
      createRetryIntervalMillis: 200 // intervalo entre tentativas de reconexão
    });
    
    // Criar instância do Drizzle usando o pool de conexões
    db = drizzle(pool, { schema });
    
    // Adicionar método execute para executar SQL bruto
    db.execute = async (sql: string) => {
      const client = await pool!.connect();
      try {
        return await client.query(sql);
      } finally {
        client.release();
      }
    };
    
    // Configurar cliente Supabase apenas se as variáveis estiverem definidas
    if (process.env.SUPABASE_URL_BROWSER && process.env.SUPABASE_KEY) {
      const supabaseUrl = process.env.SUPABASE_URL_BROWSER;
      const supabaseKey = process.env.SUPABASE_KEY;
      
      supabase = createClient<Database>(supabaseUrl, supabaseKey);
      console.log("Cliente Supabase inicializado com sucesso");
    } else {
      console.log("Variáveis do Supabase não configuradas - usando apenas PostgreSQL");
      supabase = null as any;
    }
    
    // Testar a conexão imediatamente
    console.log("Testando conexão com o PostgreSQL local...");
    
    (async () => {
      try {
        const client = await pool!.connect();
        console.log('✅ Conexão com PostgreSQL estabelecida com sucesso!');
        
        try {
          const result = await client.query('SELECT NOW()');
          console.log(`Hora no servidor: ${result.rows[0].now}`);
        } catch (error) {
          const qErr = error as Error;
          console.error('❌ Erro ao executar query:', qErr.message);
        } finally {
          client.release();
        }
      } catch (error) {
        const connErr = error as Error;
        console.error('❌ Erro ao conectar ao PostgreSQL:', connErr.message);
        console.error('Detalhes do erro:', connErr);
        
        // Mudar temporariamente para armazenamento em memória em caso de falha
        console.log("⚠️ Mudando automaticamente para modo de armazenamento em memória devido a falha de conexão");
        setupMemoryStorage();
      }
    })();
    
    // Monitorar erros de conexão
    pool.on('error', (err) => {
      console.error('❌ Erro no pool de conexão PostgreSQL:', err.message);
    });
    
  } catch (err: any) {
    console.error('❌ Erro ao inicializar conexão com banco de dados:', err);
    
    // Usar armazenamento em memória como fallback
    console.log("⚠️ Usando armazenamento em memória como fallback devido ao erro");
    setupMemoryStorage();
  }
} else {
  console.log("Usando armazenamento em memória em vez de banco de dados");
  setupMemoryStorage();
}

// Função auxiliar para configurar armazenamento em memória
function setupMemoryStorage() {
  // Create dummy objects that won't be used
  pool = null;
  
  // Criar objeto db mock com métodos necessários para evitar erros
  db = {
    select: (fields: any) => {
      const mockQuery = {
        from: () => mockQuery,
        where: () => mockQuery,
        then: async (callback: any) => {
          // Se está selecionando max, retorna o valor esperado
          if (fields && fields.max && fields.max.max) {
            return callback([{ max: 0 }]);
          }
          return callback([]);
        }
      };
      return mockQuery;
    },
    insert: () => ({ 
      values: () => ({ 
        returning: () => [{ 
          id: Math.floor(Math.random() * 1000) + 1,
          userId: 1,
          title: 'Mock Task',
          type: 'todo',
          priority: 'easy',
          completed: false,
          createdAt: new Date(),
          order: 1
        }] 
      }) 
    }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [{ id: 1 }] }) }) }),
    delete: () => ({ where: () => ({ returning: () => [{ id: 1 }] }) }),
    execute: async () => ({ rows: [] }),
    fn: {
      max: (column: any) => ({ max: column })
    }
  };
  
  // Desabilitar Supabase no modo de memória
  console.log("Modo de memória - Supabase desabilitado");
  supabase = null as any;
}

export { pool, db };
