import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { getHabits, toggleHabitDone } from '../utils/storage';
import { getLocalDateString, calculateStreaks } from '../utils/dateHelpers';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused();
  
  const [habits, setHabits] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'daily', 'weekly'
  const [todayStr, setTodayStr] = useState(getLocalDateString());

  // Reload habits when screen becomes focused or today's date changes
  useEffect(() => {
    if (isFocused) {
      loadHabits();
      setTodayStr(getLocalDateString());
    }
  }, [isFocused]);

  const loadHabits = async () => {
    try {
      const allHabits = await getHabits();
      setHabits(allHabits);
    } catch (error) {
      console.error('Failed to load habits:', error);
    }
  };

  const handleToggleHabit = async (habitId) => {
    try {
      // Optimistic state update for fluid UI response
      const updatedHabits = habits.map((habit) => {
        if (habit.id === habitId) {
          const index = habit.history.indexOf(todayStr);
          const newHistory = [...habit.history];
          if (index !== -1) {
            newHistory.splice(index, 1);
          } else {
            newHistory.push(todayStr);
          }
          return { ...habit, history: newHistory };
        }
        return habit;
      });
      setHabits(updatedHabits);

      // Perform actual storage update
      const { isCompleted } = await toggleHabitDone(habitId, todayStr);
      
      // Dynamic haptic response
      if (Platform.OS !== 'web') {
        if (isCompleted) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
      
      // Reload from storage to ensure consistency
      loadHabits();
    } catch (error) {
      console.error('Error toggling habit:', error);
      loadHabits(); // Rollback on error
    }
  };

  // Filter habits based on selected filter
  const filteredHabits = habits.filter((habit) => {
    if (filter === 'all') return true;
    return habit.frequency === filter;
  });

  // Calculate statistics for today's habits
  // For daily progress, we show habits that are active today.
  // Weekly habits are completed if they are checked today OR at least once in the current calendar week.
  // But for "Today's checklist", let's measure what fraction of the shown habits are done today.
  const totalCount = habits.length;
  const completedTodayCount = habits.filter(h => h.history.includes(todayStr)).length;
  const completionPercentage = totalCount > 0 ? Math.round((completedTodayCount / totalCount) * 100) : 0;

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 🌅';
    if (hour < 17) return 'Good Afternoon ☀️';
    return 'Good Evening 🌙';
  };

  const formatDate = () => {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString(undefined, options);
  };

  const renderHabitItem = ({ item }) => {
    const isCompletedToday = item.history.includes(todayStr);
    const { currentStreak } = calculateStreaks(item.history);
    
    // Habit colors
    const habitColor = item.color || colors.primary;
    
    return (
      <View 
        style={[
          styles.habitCard, 
          { 
            backgroundColor: colors.card,
            borderColor: isCompletedToday ? habitColor : colors.border,
            borderLeftColor: habitColor,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.cardMain}
          activeOpacity={0.7}
          onPress={() => handleToggleHabit(item.id)}
        >
          {/* Icon Container */}
          <View style={[styles.iconContainer, { backgroundColor: isCompletedToday ? habitColor : `${habitColor}15` }]}>
            <MaterialCommunityIcons 
              name={item.icon || 'star'} 
              size={24} 
              color={isCompletedToday ? '#FFF' : habitColor} 
            />
          </View>

          {/* Habit Details */}
          <View style={styles.detailsContainer}>
            <Text 
              style={[
                styles.habitName, 
                { 
                  color: colors.text,
                  textDecorationLine: isCompletedToday ? 'line-through' : 'none',
                  opacity: isCompletedToday ? 0.6 : 1
                }
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            
            <View style={styles.metaRow}>
              <Text style={[styles.frequencyText, { color: colors.textSecondary }]}>
                {item.frequency === 'daily' ? 'Daily' : 'Weekly'}
              </Text>
              
              {currentStreak > 0 && (
                <View style={styles.streakBadge}>
                  <MaterialCommunityIcons name="fire" size={14} color="#F59E0B" />
                  <Text style={[styles.streakText, { color: '#F59E0B' }]}>{currentStreak}d streak</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Checkbox */}
          <TouchableOpacity 
            style={[
              styles.checkbox, 
              { 
                borderColor: isCompletedToday ? habitColor : colors.border,
                backgroundColor: isCompletedToday ? habitColor : 'transparent' 
              }
            ]}
            onPress={() => handleToggleHabit(item.id)}
          >
            {isCompletedToday && (
              <MaterialCommunityIcons name="check" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greetingText, { color: colors.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[styles.dateText, { color: colors.text }]}>{formatDate()}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddHabit')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Daily Progress Card */}
      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.text }]}>Today's Progress</Text>
          <Text style={[styles.progressCount, { color: colors.primary }]}>
            {completedTodayCount} of {totalCount} completed
          </Text>
        </View>
        
        {/* Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: colors.divider }]}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                backgroundColor: colors.primary, 
                width: `${completionPercentage}%` 
              }
            ]} 
          />
        </View>
        
        <Text style={[styles.progressTip, { color: colors.textSecondary }]}>
          {completionPercentage === 100 
            ? 'Incredible! You crushed all habits today! 🎉' 
            : `${completionPercentage}% of daily goals met. Keep going!`}
        </Text>
      </View>

      {/* Filter Pill Selectors */}
      <View style={styles.filterRow}>
        {['all', 'daily', 'weekly'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterPill,
              { 
                backgroundColor: filter === f ? colors.primary : colors.card,
                borderColor: filter === f ? colors.primary : colors.border
              }
            ]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setFilter(f);
            }}
          >
            <Text 
              style={[
                styles.filterText, 
                { color: filter === f ? '#FFF' : colors.textSecondary }
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Habits List */}
      <FlatList
        data={filteredHabits}
        renderItem={renderHabitItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="calendar-heart" 
              size={64} 
              color={colors.textSecondary} 
              style={{ opacity: 0.5, marginBottom: 16 }}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Habits Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filter === 'all' 
                ? 'Kickstart your journey by creating your first habit.'
                : `No ${filter} habits found.`}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('AddHabit')}
              >
                <Text style={styles.emptyBtnText}>Create Habit</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  progressCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTip: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 12,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  habitCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 6,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '700',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 2,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
