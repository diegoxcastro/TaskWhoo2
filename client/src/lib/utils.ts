import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format percentage values for progress bars
export function formatPercentage(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// Calculate XP needed for next level using a simple formula
export function calculateXpForNextLevel(currentLevel: number): number {
  return 50 * currentLevel;
}

// Calculate reward based on task priority
export function calculateReward(priority: string): number {
  switch (priority) {
    case 'trivial': return 5;
    case 'easy': return 10;
    case 'medium': return 15;
    case 'hard': return 20;
    default: return 10;
  }
}

// Get priority class based on task priority
export function getPriorityClass(priority: string): string {
  switch (priority) {
    case 'trivial': return 'border-l-4 border-gray-400';
    case 'easy': return 'border-l-4 border-green-500';
    case 'medium': return 'border-l-4 border-amber-500';
    case 'hard': return 'border-l-4 border-red-500';
    default: return '';
  }
}

// Get priority label for display
export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'trivial': return 'Trivial';
    case 'easy': return 'Fácil';
    case 'medium': return 'Médio';
    case 'hard': return 'Difícil';
    default: return 'Desconhecido';
  }
}

// Format date for display
export function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Get weekday names in Portuguese
export function getWeekdayNames(short: boolean = false): string[] {
  return short 
    ? ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] 
    : ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
}
