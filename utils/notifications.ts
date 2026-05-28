import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Habit } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestPermissions = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleReminders = async (
  habits: Habit[],
  morningTime: string,
  eveningTime: string
): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (habits.length === 0) return;

  const [mH, mM] = morningTime.split(':').map(Number);
  const [eH, eM] = eveningTime.split(':').map(Number);
  const firstName = habits[0]?.name ?? 'your habit';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ready to start? 🌅',
      body: `Time to work on ${firstName}. Let's keep your streak going!`,
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: mH,
      minute: mM,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Don't forget today's habits 🔔",
      body: "Have you completed your habits today? Check in now!",
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: eH,
      minute: eM,
    },
  });
};

export const cancelAllReminders = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
