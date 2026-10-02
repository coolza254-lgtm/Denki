// Daily local reminder to read the meter.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL = 'reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Returns false when the user denied notification permission. */
export async function scheduleDailyReminder(time: string): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'เตือนจดมิเตอร์',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: { title: '⚡ ได้เวลาจดมิเตอร์แล้ว', body: 'Spark รออยู่นะ! จดเลขมิเตอร์หน้าบ้านวันนี้กัน' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
  return true;
}

export async function cancelReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
