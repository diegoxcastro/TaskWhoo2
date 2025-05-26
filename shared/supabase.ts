import { createClient } from '@supabase/supabase-js';
import type { Database } from './schema';

// URL padrão para modo development - impede erros quando não há variáveis de ambiente
const FALLBACK_URL = "http://localhost:8000";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoyMDAwMDAwMDAwfQ.xxxxxxx";

// Obter as variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL_BROWSER || FALLBACK_URL;
const supabaseKey = process.env.SUPABASE_KEY || FALLBACK_KEY;

// Log para desenvolvimento
console.log("Usando Supabase no cliente com URL:", supabaseUrl.substring(0, 20) + "...");

// Criar o cliente do Supabase para uso no navegador
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Verificando conexão no carregamento
console.log('Iniciando cliente Supabase...');

// Exportar funções específicas de autenticação
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export default supabase; 