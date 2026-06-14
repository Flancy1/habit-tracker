import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Checks and requests notification permissions.
 * @returns {Promise<boolean>} True if permissions are granted.
 */
export const requestPermissions = async () => {
  if (Platform.OS === 'web') return false;
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('habit-reminders', {
        name: 'Habit Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Schedules a daily reminder notification for a habit.
 * @param {string} habitName Name of the habit
 * @param {string} timeStr Time format 'HH:MM'
 * @returns {Promise<string|null>} The notification identifier string or null if failed
 */
export const scheduleHabitReminder = async (habitName, timeStr) => {
  if (!timeStr) return null;
  
  try {
    const isGranted = await requestPermissions();
    if (!isGranted) {
      console.log('Notification permission not granted. Skipping schedule.');
      return null;
    }

    const [hourStr, minuteStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) {
      console.warn('Invalid time format passed to scheduleHabitReminder:', timeStr);
      return null;
    }

    // Schedule notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Habit Reminder ⏰",
        body: `Time to focus on your habit: "${habitName}"!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    console.log(`Successfully scheduled notification "${notificationId}" for "${habitName}" at ${timeStr}`);
    return notificationId;
  } catch (error) {
    console.error('Failed to schedule habit reminder:', error);
    return null;
  }
};

/**
 * Cancels a scheduled notification.
 * @param {string} notificationId 
 */
export const cancelHabitReminder = async (notificationId) => {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Cancelled notification: ${notificationId}`);
  } catch (error) {
    console.warn(`Failed to cancel notification ${notificationId}:`, error);
  }
};

/**
 * Re-schedules a reminder (cancelling the old one if it exists).
 * @param {string} habitName 
 * @param {string|null} oldNotificationId 
 * @param {string|null} newTimeStr 'HH:MM'
 * @returns {Promise<string|null>} The new notification identifier or null
 */
export const updateHabitReminder = async (habitName, oldNotificationId, newTimeStr) => {
  if (oldNotificationId) {
    await cancelHabitReminder(oldNotificationId);
  }
  
  if (newTimeStr) {
    return await scheduleHabitReminder(habitName, newTimeStr);
  }
  
  return null;
};
