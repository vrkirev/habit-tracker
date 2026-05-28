export type HabitType = 'daily' | 'volume';

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  type: HabitType;
  targetCount: number; // 1 for daily, N for volume (e.g. 4 glasses of water)
  completions: Record<string, number>; // YYYY-MM-DD -> count achieved
  streak: number;
  createdAt: string;
};

export type Challenge = {
  id: string;
  habitId: string;
  durationDays: number;
  startDate: string; // YYYY-MM-DD
  completedAt?: string; // set when user finishes all N days
};

export type NotificationSettings = {
  enabled: boolean;
  morningTime: string; // "HH:MM"
  eveningTime: string; // "HH:MM"
  rewardSoundEnabled: boolean;
};
