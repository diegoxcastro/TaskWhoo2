-- Script de inicialização do banco de dados TaskWho
-- Este script será executado quando o container PostgreSQL for iniciado

-- O banco habittracker já é criado automaticamente pelo Docker
-- através da variável POSTGRES_DB

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar enums
CREATE TYPE task_type AS ENUM ('habit', 'daily', 'todo');
CREATE TYPE task_priority AS ENUM ('trivial', 'easy', 'medium', 'hard');
CREATE TYPE habit_direction AS ENUM ('positive', 'negative', 'both');

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    avatar TEXT,
    auth_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela principal task_vida
CREATE TABLE IF NOT EXISTS task_vida (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    notes TEXT,
    type task_type NOT NULL,
    priority task_priority NOT NULL DEFAULT 'easy',
    completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP,
    repeat BOOLEAN[] NOT NULL DEFAULT '{true,true,true,true,true,true,true}',
    direction habit_direction,
    positive BOOLEAN,
    negative BOOLEAN,
    counter_up INTEGER DEFAULT 0,
    counter_down INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    strength INTEGER DEFAULT 0,
    last_completed TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- Criar tabela de hábitos
CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    priority task_priority NOT NULL DEFAULT 'easy',
    direction habit_direction NOT NULL DEFAULT 'both',
    strength INTEGER NOT NULL DEFAULT 0,
    positive BOOLEAN NOT NULL DEFAULT TRUE,
    negative BOOLEAN NOT NULL DEFAULT TRUE,
    counter_up INTEGER NOT NULL DEFAULT 0,
    counter_down INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de tarefas diárias
CREATE TABLE IF NOT EXISTS dailies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    priority task_priority NOT NULL DEFAULT 'easy',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    streak INTEGER NOT NULL DEFAULT 0,
    repeat JSONB NOT NULL DEFAULT '[true,true,true,true,true,true,true]',
    icon TEXT DEFAULT 'CheckCircle',
    created_at TIMESTAMP DEFAULT NOW(),
    last_completed TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- Criar tabela de todos
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT,
    priority task_priority NOT NULL DEFAULT 'easy',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- Criar tabela de logs de atividade
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_type task_type NOT NULL,
    task_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    value INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_task_vida_user_id ON task_vida(user_id);
CREATE INDEX IF NOT EXISTS idx_task_vida_type ON task_vida(type);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_dailies_user_id ON dailies(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_type ON activity_logs(task_type);

-- Inserir usuário padrão para testes
INSERT INTO users (username, password, avatar) 
VALUES ('awake', '$2b$10$K8BpM4vIgKHUaP5RVHxOHOqP5RVHxOHOqP5RVHxOHOqP5RVHxOHOq', NULL)
ON CONFLICT (username) DO NOTHING;

COMMIT;