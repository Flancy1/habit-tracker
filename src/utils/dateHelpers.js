/**
 * Formats a Date object as a local YYYY-MM-DD string.
 * @param {Date} date 
 * @returns {string} 'YYYY-MM-DD'
 */
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Gets a YYYY-MM-DD string offset from a base date by a number of days.
 * Noon is used to avoid timezone/daylight saving shifts.
 * @param {string} baseDateStr 'YYYY-MM-DD'
 * @param {number} offset 
 * @returns {string} 'YYYY-MM-DD'
 */
export const getOffsetDateString = (baseDateStr, offset) => {
  const date = new Date(baseDateStr + 'T12:00:00');
  date.setDate(date.getDate() + offset);
  return getLocalDateString(date);
};

/**
 * Returns YYYY-MM-DD dates for the current week (Monday to Sunday).
 * @returns {string[]} ['YYYY-MM-DD', ...]
 */
export const getCurrentWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  // Distance to Monday:
  // If Sunday (0), we go back 6 days.
  // If Monday (1), we go back 0 days.
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - distanceToMonday);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(getLocalDateString(d));
  }
  return weekDates;
};

/**
 * Calculates current and longest streak from a list of completed YYYY-MM-DD dates.
 * @param {string[]} history ['YYYY-MM-DD', ...]
 * @returns {{ currentStreak: number, longestStreak: number }}
 */
export const calculateStreaks = (history) => {
  if (!history || history.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Remove duplicates and sort descending (newest first)
  const uniqueHistory = Array.from(new Set(history)).sort((a, b) => b.localeCompare(a));
  const todayStr = getLocalDateString();
  const yesterdayStr = getOffsetDateString(todayStr, -1);

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let checkDateStr = todayStr;

  // If today isn't completed, start checking from yesterday.
  // If today is completed, we start checking from today.
  // If neither today nor yesterday is completed, current streak is 0.
  if (uniqueHistory.includes(todayStr)) {
    currentStreak = 1;
    checkDateStr = yesterdayStr;
    while (uniqueHistory.includes(checkDateStr)) {
      currentStreak++;
      checkDateStr = getOffsetDateString(checkDateStr, -1);
    }
  } else if (uniqueHistory.includes(yesterdayStr)) {
    currentStreak = 1;
    checkDateStr = getOffsetDateString(yesterdayStr, -1);
    while (uniqueHistory.includes(checkDateStr)) {
      currentStreak++;
      checkDateStr = getOffsetDateString(checkDateStr, -1);
    }
  } else {
    currentStreak = 0;
  }

  // 2. Calculate Longest Streak
  // Sort ascending (oldest first) for consecutive streak calculation
  const sortedAsc = [...uniqueHistory].sort((a, b) => a.localeCompare(b));
  let longestStreak = 0;
  let currentRun = 0;
  let previousDateStr = null;

  for (const dateStr of sortedAsc) {
    if (previousDateStr === null) {
      currentRun = 1;
    } else {
      const nextExpected = getOffsetDateString(previousDateStr, 1);
      if (dateStr === nextExpected) {
        currentRun++;
      } else {
        if (currentRun > longestStreak) {
          longestStreak = currentRun;
        }
        currentRun = 1;
      }
    }
    previousDateStr = dateStr;
  }

  if (currentRun > longestStreak) {
    longestStreak = currentRun;
  }

  return { currentStreak, longestStreak };
};
