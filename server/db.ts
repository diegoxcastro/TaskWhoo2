import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@shared/schema';

// Log environment variables for debugging
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("USE_MEMORY_STORAGE:", process.env.USE_MEMORY_STORAGE);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);

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
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 30000, // 30 segundos de timeout
      max: 10, // máximo de conexões no pool
      idleTimeoutMillis: 60000 // quanto tempo uma conexão pode ficar ociosa
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
    
    // Configurar cliente Supabase para autenticação
    const supabaseUrl = process.env.SUPABASE_URL_BROWSER || FALLBACK_URL;
    const supabaseKey = process.env.SUPABASE_KEY || FALLBACK_KEY;
    
    supabase = createClient<Database>(supabaseUrl, supabaseKey);
    console.log("Cliente Supabase inicializado com sucesso");
    
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
    select: () => ({ from: () => ({ where: () => [] }) }),
    insert: () => ({ values: () => ({ returning: () => [{ id: 1 }] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [{ id: 1 }] }) }) }),
    delete: () => ({ where: () => ({ returning: () => [{ id: 1 }] }) }),
    execute: async () => ({ rows: [] }),
  };
  
  // Usar URL e KEY padrão para o Supabase
  supabase = createClient<Database>(FALLBACK_URL, FALLBACK_KEY);
  console.log("Cliente Supabase mock inicializado para modo de memória");
}

export { pool, db };
