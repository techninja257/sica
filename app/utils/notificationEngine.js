import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Schedule repeating nudges within the active window.
 * Uses profile.notificationIntervalHours for interval.
 */
export const scheduleHydrationReminders = async (profile) => {
  if (!profile) return;
  await cancelAllNotifications();

  const {
    name,
    activeWindowStart,
    activeWindowEnd,
    notificationIntervalHours,
    notificationSoundEnabled = true,
  } = profile;

  const body = `Hey ${name}, time to hydrate! 💧`;
  const now = new Date();
  const start = activeWindowStart ?? 7;
  const end = activeWindowEnd ?? 21;
  const intervalHours = notificationIntervalHours ?? 2;

  let scheduled = 0;
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    for (let hour = start; hour < end; hour += intervalHours) {
      const trigger = new Date(now);
      trigger.setDate(trigger.getDate() + dayOffset);
      trigger.setHours(hour, 0, 0, 0);
      if (trigger > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Sica 💧',
            body,
            sound: notificationSoundEnabled ? 'default' : null,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger,
          },
        });
        scheduled++;
        if (scheduled >= 64) return; // expo limit
      }
    }
  }
};

export const scheduleCriticalAlert = async (profile, currentCl, goalCl) => {
  const hour = new Date().getHours();
  if (hour < 18 || currentCl / goalCl >= 0.3) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sica 🌊',
      body: `You're behind on hydration today. Drink up, ${profile.name}! 🌊`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5000),
    },
  });
};