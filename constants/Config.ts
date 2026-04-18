// App-wide configuration constants
export const Config = {
  APP_NAME: 'HealthySteps',
  APP_TAGLINE: 'Build Healthy Habits, One Step at a Time',

  // Mood emoji mapping
  MOOD_EMOJIS: ['😢', '😕', '😐', '🙂', '😄'] as const,
  MOOD_LABELS: ['Sangat Buruk', 'Buruk', 'Biasa', 'Baik', 'Sangat Baik'] as const,

  // Habit frequencies
  HABIT_FREQUENCIES: ['daily', 'weekly', 'custom'] as const,

  // Habit color options for user selection
  HABIT_COLORS: [
    '#10B981', // Emerald
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ] as const,

  // Default reminder time
  DEFAULT_REMINDER_HOUR: 8,
  DEFAULT_REMINDER_MINUTE: 0,

  // AI Coach (Groq)
  AI_MODEL: 'llama-3.3-70b-versatile',
  AI_MAX_TOKENS: 1024,
};
