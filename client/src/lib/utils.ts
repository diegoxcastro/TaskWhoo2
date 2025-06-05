import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format percentage values for progress bars
export function formatPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// Get priority class based on task priority
export function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'trivial': return 'text-gray-500 bg-gray-100';
    case 'easy': return 'text-green-700 bg-green-100';
    case 'medium': return 'text-yellow-700 bg-yellow-100';
    case 'hard': return 'text-red-700 bg-red-100';
    default: return 'text-gray-500 bg-gray-100';
  }
}

// Get priority icon based on task priority
export function getPriorityIcon(priority: string): string {
  switch (priority) {
    case 'trivial': return '⚪';
    case 'easy': return '🟢';
    case 'medium': return '🟡';
    case 'hard': return '🔴';
    default: return '⚪';
  }
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Format date and time for display
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Check if a date is today
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

// Check if a date is overdue
export function isOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

// Check if a reminder is overdue
export function isReminderOverdue(reminderTime: Date | string): boolean {
  const reminder = typeof reminderTime === 'string' ? new Date(reminderTime) : reminderTime;
  const now = new Date();
  return reminder < now;
}

// Get overdue class for tasks with overdue reminders
export function getOverdueClass(hasReminder: boolean, reminderTime?: Date | string | null): string {
  if (!hasReminder || !reminderTime) return '';
  return isReminderOverdue(reminderTime) ? 'bg-red-50 border-red-200' : '';
}

// Sort tasks by reminder time (overdue first, then by time)
export function sortTasksByReminderTime<T extends { hasReminder?: boolean; reminderTime?: Date | string | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // Tasks without reminders go to the end
    if (!a.hasReminder || !a.reminderTime) return 1;
    if (!b.hasReminder || !b.reminderTime) return -1;
    
    const aTime = typeof a.reminderTime === 'string' ? new Date(a.reminderTime) : a.reminderTime;
    const bTime = typeof b.reminderTime === 'string' ? new Date(b.reminderTime) : b.reminderTime;
    const now = new Date();
    
    const aOverdue = aTime < now;
    const bOverdue = bTime < now;
    
    // Overdue tasks first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // Then sort by time
    return aTime.getTime() - bTime.getTime();
  });
}
