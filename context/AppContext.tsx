import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, Challenge, NotificationSettings, HabitType } from '../types';
import { loadHabits, saveHabits, loadChallenges, saveChallenges, loadNotificationSettings, saveNotificationSettings } from '../utils/storage';
import { computeStreak } from '../utils/streak';
import { todayStr, localDateStr } from '../utils/dates';

type AppContextType = {
  habits: Habit[];
  challenges: Challenge[];
  notificationSettings: NotificationSettings;
  isLoaded: boolean;
  addHabit: (name: string, emoji: string, type: HabitType, targetCount: number) => Habit;
  deleteHabit: (id: string) => void;
  logHabit: (id: string) => { wasCompleted: boolean; isNowComplete: boolean };
  addChallenge: (habitId: string, durationDays: number) => void;
  checkChallengeCompletions: () => Challenge | null;
  updateNotificationSettings: (s: NotificationSettings) => void;
  simulateDays: (days: number) => void;
  forceCompleteChallenge: (challengeId: string) => void;
  clearAllData: () => Promise<void>;
};

const AppContext = createContext<AppContextType | null>(null);

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    morningTime: '09:00',
    eveningTime: '20:00',
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [h, c, n] = await Promise.all([
        loadHabits(),
        loadChallenges(),
        loadNotificationSettings(),
      ]);
      setHabits(h);
      setChallenges(c);
      setNotificationSettings(n);
      setIsLoaded(true);
    })();
  }, []);

  const persistHabits = useCallback((updated: Habit[]) => {
    setHabits(updated);
    saveHabits(updated);
  }, []);

  const persistChallenges = useCallback((updated: Challenge[]) => {
    setChallenges(updated);
    saveChallenges(updated);
  }, []);

  const addHabit = useCallback(
    (name: string, emoji: string, type: HabitType, targetCount: number): Habit => {
      const habit: Habit = {
        id: Date.now().toString(),
        name,
        emoji,
        type,
        targetCount,
        completions: {},
        streak: 0,
        createdAt: new Date().toISOString(),
      };
      persistHabits([...habits, habit]);
      return habit;
    },
    [habits, persistHabits]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      persistHabits(habits.filter(h => h.id !== id));
      persistChallenges(challenges.filter(c => c.habitId !== id));
    },
    [habits, challenges, persistHabits, persistChallenges]
  );

  // Returns whether the habit crossed the "completed for today" threshold
  const logHabit = useCallback(
    (id: string): { wasCompleted: boolean; isNowComplete: boolean } => {
      const today = todayStr();
      let wasCompleted = false;
      let isNowComplete = false;

      const updated = habits.map(h => {
        if (h.id !== id) return h;
        const prev = h.completions[today] ?? 0;
        wasCompleted = prev >= h.targetCount;
        const next = wasCompleted ? 0 : prev + 1;
        isNowComplete = next >= h.targetCount;
        const newCompletions = { ...h.completions, [today]: next };
        return { ...h, completions: newCompletions, streak: computeStreak(newCompletions, h.targetCount) };
      });

      persistHabits(updated);
      return { wasCompleted, isNowComplete };
    },
    [habits, persistHabits]
  );

  const addChallenge = useCallback(
    (habitId: string, durationDays: number) => {
      const challenge: Challenge = {
        id: Date.now().toString(),
        habitId,
        durationDays,
        startDate: todayStr(),
      };
      persistChallenges([...challenges, challenge]);
    },
    [challenges, persistChallenges]
  );

  // Call after any habit log — returns a newly-completed challenge or null
  const checkChallengeCompletions = useCallback((): Challenge | null => {
    const today = todayStr();
    let justCompleted: Challenge | null = null;

    const updated = challenges.map(c => {
      if (c.completedAt) return c;
      const habit = habits.find(h => h.id === c.habitId);
      if (!habit) return c;

      // Count how many days in the challenge window are done
      let doneCount = 0;
      for (let i = 0; i < c.durationDays; i++) {
        const d = new Date(c.startDate + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        if (ds > today) break;
        if ((habit.completions[ds] ?? 0) >= habit.targetCount) doneCount++;
      }

      if (doneCount >= c.durationDays) {
        justCompleted = { ...c, completedAt: today };
        return justCompleted;
      }
      return c;
    });

    if (justCompleted) persistChallenges(updated);
    return justCompleted;
  }, [challenges, habits, persistChallenges]);

  const updateNotificationSettings = useCallback(
    (s: NotificationSettings) => {
      setNotificationSettings(s);
      saveNotificationSettings(s);
    },
    []
  );

  // Dev: mark all habits complete for the past N days
  const simulateDays = useCallback(
    (days: number) => {
      const updated = habits.map(h => {
        const newCompletions = { ...h.completions };
        for (let i = 0; i < days; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          newCompletions[localDateStr(d)] = h.targetCount;
        }
        return { ...h, completions: newCompletions, streak: computeStreak(newCompletions, h.targetCount) };
      });
      persistHabits(updated);
    },
    [habits, persistHabits]
  );

  // Dev: fill habit completions for every day of the challenge then mark it done
  const forceCompleteChallenge = useCallback(
    (challengeId: string) => {
      const challenge = challenges.find(c => c.id === challengeId);
      if (!challenge) return;
      const today = todayStr();
      const [sy, sm, sd] = challenge.startDate.split('-').map(Number);

      const updatedHabits = habits.map(h => {
        if (h.id !== challenge.habitId) return h;
        const newCompletions = { ...h.completions };
        for (let i = 0; i < challenge.durationDays; i++) {
          const d = new Date(sy, sm - 1, sd + i);
          const ds = localDateStr(d);
          newCompletions[ds] = h.targetCount;
        }
        return { ...h, completions: newCompletions, streak: computeStreak(newCompletions, h.targetCount) };
      });

      const updatedChallenges = challenges.map(c =>
        c.id === challengeId ? { ...c, completedAt: today } : c
      );

      persistHabits(updatedHabits);
      persistChallenges(updatedChallenges);
    },
    [challenges, habits, persistHabits, persistChallenges]
  );

  // Dev: wipe all app data
  const clearAllData = useCallback(async () => {
    await AsyncStorage.multiRemove(['habits_v2', 'challenges_v1', 'notif_settings_v1']);
    setHabits([]);
    setChallenges([]);
    setNotificationSettings({ enabled: false, morningTime: '09:00', eveningTime: '20:00' });
  }, []);

  return (
    <AppContext.Provider
      value={{
        habits,
        challenges,
        notificationSettings,
        isLoaded,
        addHabit,
        deleteHabit,
        logHabit,
        addChallenge,
        checkChallengeCompletions,
        updateNotificationSettings,
        simulateDays,
        forceCompleteChallenge,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
