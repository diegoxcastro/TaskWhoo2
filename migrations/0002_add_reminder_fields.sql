-- Add reminder fields to task_vida table
ALTER TABLE task_vida 
ADD COLUMN reminder_time TIMESTAMP,
ADD COLUMN has_reminder BOOLEAN NOT NULL DEFAULT false;

-- Add index for better performance on reminder queries
CREATE INDEX idx_task_vida_reminder ON task_vida(has_reminder, reminder_time) WHERE has_reminder = true;