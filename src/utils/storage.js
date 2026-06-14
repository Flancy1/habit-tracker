import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString, getOffsetDateString } from './dateHelpers';

const HABITS_STORAGE_KEY = '@habit_tracker_habits';

// Generate dynamic default habits with history so streaks are visible on first load
const generateDefaultHabits = () => {
  const today = getLocalDateString();
  const yesterday = getOffsetDateString(today, -1);
  const twoDaysAgo = getOffsetDateString(today, -2);
  const threeDaysAgo = getOffsetDateString(today, -3);

  return [
    {
      id: 'default-1',
      name: 'Drink 8 Glasses Water',
      frequency: 'daily',
      icon: 'water',
      color: '#0EA5E9', // Sky blue
      reminderTime: '08:00',
      notificationId: null,
      createdAt: getOffsetDateString(today, -5),
      history: [yesterday, twoDaysAgo, threeDaysAgo], // 3-day streak yesterday
      order: 0,
    },
    {
      id: 'default-2',
      name: 'Read a Book',
      frequency: 'daily',
      icon: 'book-open-variant',
      color: '#8B5CF6', // Violet
      reminderTime: '21:00',
      notificationId: null,
      createdAt: getOffsetDateString(today, -10),
      history: [today, yesterday, twoDaysAgo], // Active 3-day streak today!
      order: 1,
    },
    {
      id: 'default-3',
      name: 'Morning Workout',
      frequency: 'weekly',
      icon: 'run',
      color: '#10B981', // Emerald
      reminderTime: '07:30',
      notificationId: null,
      createdAt: getOffsetDateString(today, -15),
      history: [yesterday],
      order: 2,
    },
  ];
};

/**
 * Gets all habits from storage.
 * If storage is empty, initializes with default habits.
 * @returns {Promise<Array>}
 */
export const getHabits = async () => {
  try {
    const data = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
    if (data !== null) {
      const parsed = JSON.parse(data);
      // Ensure they are sorted by order field
      return parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } else {
      // First run: save and return defaults
      const defaults = generateDefaultHabits();
      await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
  } catch (error) {
    console.error('Error fetching habits from storage:', error);
    return [];
  }
};

/**
 * Overwrites all habits in storage.
 * @param {Array} habits 
 */
export const saveHabits = async (habits) => {
  try {
    await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Error saving habits to storage:', error);
  }
};

/**
 * Adds a new habit.
 * @param {Object} habitData 
 * @returns {Promise<Object>} The newly created habit
 */
export const addHabit = async (habitData) => {
  try {
    const habits = await getHabits();
    const newHabit = {
      id: `habit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: habitData.name,
      frequency: habitData.frequency,
      icon: habitData.icon,
      color: habitData.color,
      reminderTime: habitData.reminderTime || null,
      notificationId: habitData.notificationId || null,
      createdAt: getLocalDateString(),
      history: [],
      order: habits.length,
    };
    
    habits.push(newHabit);
    await saveHabits(habits);
    return newHabit;
  } catch (error) {
    console.error('Error adding habit:', error);
    throw error;
  }
};

/**
 * Updates an existing habit.
 * @param {string} habitId 
 * @param {Object} updatedFields 
 * @returns {Promise<Array>} Updated list of habits
 */
export const updateHabit = async (habitId, updatedFields) => {
  try {
    const habits = await getHabits();
    const index = habits.findIndex((h) => h.id === habitId);
    if (index !== -1) {
      habits[index] = {
        ...habits[index],
        ...updatedFields,
      };
      await saveHabits(habits);
    }
    return habits;
  } catch (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
};

/**
 * Deletes a habit from storage.
 * @param {string} habitId 
 * @returns {Promise<Array>} Remaining habits
 */
export const deleteHabit = async (habitId) => {
  try {
    let habits = await getHabits();
    const habitToDelete = habits.find((h) => h.id === habitId);
    
    // We filter it out
    habits = habits.filter((h) => h.id !== habitId);
    
    // Adjust orders
    habits = habits.map((h, index) => ({
      ...h,
      order: index,
    }));

    await saveHabits(habits);
    return { remainingHabits: habits, deletedHabit: habitToDelete };
  } catch (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
};

/**
 * Toggles a date completion in a habit's history.
 * @param {string} habitId 
 * @param {string} dateStr 'YYYY-MM-DD'
 * @returns {Promise<{ habits: Array, isCompleted: boolean }>}
 */
export const toggleHabitDone = async (habitId, dateStr) => {
  try {
    const habits = await getHabits();
    const index = habits.findIndex((h) => h.id === habitId);
    let isCompleted = false;

    if (index !== -1) {
      const habit = habits[index];
      const dateIndex = habit.history.indexOf(dateStr);

      if (dateIndex !== -1) {
        // Uncheck: remove date from history
        habit.history.splice(dateIndex, 1);
        isCompleted = false;
      } else {
        // Check: add date to history
        habit.history.push(dateStr);
        isCompleted = true;
      }

      await saveHabits(habits);
    }
    return { habits, isCompleted };
  } catch (error) {
    console.error('Error toggling habit:', error);
    throw error;
  }
};

/**
 * Reorders habits.
 * @param {Array} reorderedHabits 
 */
export const reorderHabits = async (reorderedHabits) => {
  try {
    const updated = reorderedHabits.map((habit, index) => ({
      ...habit,
      order: index,
    }));
    await saveHabits(updated);
    return updated;
  } catch (error) {
    console.error('Error reordering habits:', error);
    throw error;
  }
};

/**
 * Wipes out storage to start fresh.
 */
export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(HABITS_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
};
