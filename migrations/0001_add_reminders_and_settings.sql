-- Add reminder fields to habits table
ALTER TABLE habits 
ADD COLUMN reminder_time TIMESTAMP,
ADD COLUMN has_reminder BOOLEAN NOT NULL DEFAULT false;

-- Add reminder fields to dailies table
ALTER TABLE dailies 
ADD COLUMN reminder_time TIMESTAMP,
ADD COLUMN has_reminder BOOLEAN NOT NULL DEFAULT false;

-- Add reminder fields to todos table
ALTER TABLE todos 
ADD COLUMN reminder_time TIMESTAMP,
ADD COLUMN has_reminder BOOLEAN NOT NULL DEFAULT false;

-- Create user_settings table
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  webhook_url TEXT,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 15,
  webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Create notification_logs table
CREATE TABLE notification_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL,
  task_type task_type NOT NULL,
  reminder_time TIMESTAMP NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_habits_reminder_time ON habits(reminder_time) WHERE has_reminder = true;
CREATE INDEX idx_dailies_reminder_time ON dailies(reminder_time) WHERE has_reminder = true;
CREATE INDEX idx_todos_reminder_time ON todos(reminder_time) WHERE has_reminder = true;
CREATE INDEX idx_notification_logs_task ON notification_logs(task_id, task_type, reminder_time);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);