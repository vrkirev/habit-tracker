import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, Challenge, NotificationSettings } from '../types';

const HABITS_KEY = 'habits_v2';
const CHALLENGES_KEY = 'challenges_v1';
const NOTIF_KEY = 'notif_settings_v1';

export const loadHabits = async (): Promise<Habit[]> => {
  try {
    const json = await AsyncStorage.getItem(HABITS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

export const saveHabits = async (habits: Habit[]): Promise<void> => {
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
};

export const loadChallenges = async (): Promise<Challenge[]> => {
  try {
    const json = await AsyncStorage.getItem(CHALLENGES_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

export const saveChallenges = async (challenges: Challenge[]): Promise<void> => {
  await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));
};

export const loadNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const json = await AsyncStorage.getItem(NOTIF_KEY);
    return json
      ? JSON.parse(json)
      : { enabled: false, morningTime: '09:00', eveningTime: '20:00', rewardSoundEnabled: true };
  } catch {
    return { enabled: false, morningTime: '09:00', eveningTime: '20:00', rewardSoundEnabled: true };
  }
};

export const saveNotificationSettings = async (s: NotificationSettings): Promise<void> => {
  await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(s));
};
