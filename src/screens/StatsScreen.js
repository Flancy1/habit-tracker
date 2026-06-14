import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';
import { getHabits } from '../utils/storage';
import { calculateStreaks, getCurrentWeekDates, getLocalDateString } from '../utils/dateHelpers';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused();

  const [habits, setHabits] = useState([]);
  const [selectedHabitId, setSelectedHabitId] = useState('all'); // 'all' or habit ID
  const [weekDates, setWeekDates] = useState([]);

  useEffect(() => {
    if (isFocused) {
      loadHabits();
      setWeekDates(getCurrentWeekDates());
    }
  }, [isFocused]);

  const loadHabits = async () => {
    try {
      const allHabits = await getHabits();
      setHabits(allHabits);
    } catch (error) {
      console.error('Failed to load habits in stats:', error);
    }
  };

  const handleSelectHabit = (id) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedHabitId(id);
  };

  // Get active selected habit object
  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  // 1. Build calendar marked dates
  const getMarkedDates = () => {
    const marked = {};
    const today = getLocalDateString();
    
    if (selectedHabitId === 'all') {
      // Highlight dates where ANY habit was completed
      habits.forEach(habit => {
        habit.history.forEach(date => {
          marked[date] = {
            selected: true,
            selectedColor: colors.primary + '30', // soft highlight
            selectedTextColor: colors.text,
          };
        });
      });
    } else if (selectedHabit) {
      // Highlight dates for this specific habit using its custom color
      selectedHabit.history.forEach(date => {
        marked[date] = {
          selected: true,
          selectedColor: selectedHabit.color,
          selectedTextColor: '#FFF',
        };
      });
    }

    // Always highlight today with a border or marker unless already completed
    if (!marked[today]) {
      marked[today] = {
        marked: true,
        dotColor: colors.primary,
        activeOpacity: 0.8,
      };
    } else {
      marked[today] = {
        ...marked[today],
        marked: true,
        dotColor: selectedHabitId === 'all' ? colors.primary : '#FFF',
      };
    }

    return marked;
  };

  // 2. Calculate Stats Metrics
  const getMetrics = () => {
    if (selectedHabitId === 'all') {
      // Overall stats
      if (habits.length === 0) {
        return { currentStreak: 0, longestStreak: 0, completionRate: 0, totalCompletions: 0 };
      }

      let totalCompletions = 0;
      let oldestHabitDate = new Date();
      
      habits.forEach(h => {
        totalCompletions += h.history.length;
        const creationDate = new Date(h.createdAt);
        if (creationDate < oldestHabitDate) {
          oldestHabitDate = creationDate;
        }
      });

      // Average streaks across all habits
      let totalCurrentStreak = 0;
      let totalLongestStreak = 0;
      
      habits.forEach(h => {
        const { currentStreak, longestStreak } = calculateStreaks(h.history);
        totalCurrentStreak += currentStreak;
        totalLongestStreak += longestStreak;
      });

      const avgCurrentStreak = Math.round(totalCurrentStreak / habits.length);
      const avgLongestStreak = Math.round(totalLongestStreak / habits.length);

      // Average completion rate
      // Total possible points: days since creation * number of habits
      let totalPossibleCompletions = 0;
      habits.forEach(h => {
        const daysSinceCreation = Math.max(1, Math.ceil((new Date() - new Date(h.createdAt)) / (1000 * 60 * 60 * 24)));
        totalPossibleCompletions += daysSinceCreation;
      });

      const overallCompletionRate = totalPossibleCompletions > 0 
        ? Math.round((totalCompletions / totalPossibleCompletions) * 100) 
        : 0;

      return {
        currentStreak: avgCurrentStreak,
        longestStreak: avgLongestStreak,
        completionRate: overallCompletionRate,
        totalCompletions,
      };
    } else if (selectedHabit) {
      // Individual stats
      const { currentStreak, longestStreak } = calculateStreaks(selectedHabit.history);
      const totalCompletions = selectedHabit.history.length;
      
      const daysSinceCreation = Math.max(1, Math.ceil((new Date() - new Date(selectedHabit.createdAt)) / (1000 * 60 * 60 * 24)));
      const completionRate = Math.round((totalCompletions / daysSinceCreation) * 100);

      return {
        currentStreak,
        longestStreak,
        completionRate: Math.min(100, completionRate),
        totalCompletions,
      };
    }

    return { currentStreak: 0, longestStreak: 0, completionRate: 0, totalCompletions: 0 };
  };

  const metrics = getMetrics();

  // Render top selector item
  const renderHabitSelectorItem = ({ item }) => {
    const isAll = item.id === 'all';
    const isSelected = selectedHabitId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.selectorCard,
          { 
            backgroundColor: isSelected ? (isAll ? colors.primary : item.color) : colors.card,
            borderColor: isSelected ? 'transparent' : colors.border
          }
        ]}
        onPress={() => handleSelectHabit(item.id)}
        activeOpacity={0.8}
      >
        <View style={[
          styles.selectorIconBg, 
          { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : (isAll ? colors.primaryLight : `${item.color}15`) }
        ]}>
          <MaterialCommunityIcons 
            name={isAll ? 'buffer' : item.icon} 
            size={20} 
            color={isSelected ? '#FFF' : (isAll ? colors.primary : item.color)} 
          />
        </View>
        <Text 
          style={[
            styles.selectorLabel, 
            { color: isSelected ? '#FFF' : colors.text }
          ]}
          numberOfLines={1}
        >
          {isAll ? 'All Habits' : item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const selectorData = [{ id: 'all', name: 'All Habits' }, ...habits];

  // Helper to check if a week date was completed
  const isDateCompleted = (dateStr) => {
    if (selectedHabitId === 'all') {
      return habits.some(h => h.history.includes(dateStr));
    }
    return selectedHabit?.history.includes(dateStr);
  };

  const getDayName = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString(undefined, { weekday: 'narrow' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Statistics</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Horizontal Habits Selector */}
        <View style={styles.selectorWrapper}>
          <FlatList
            data={selectorData}
            renderItem={renderHabitSelectorItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorList}
          />
        </View>

        {/* Calendar Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Completion History</Text>
          <Calendar
            key={isDark ? 'dark-cal' : 'light-cal'} // Force rerender on theme switch
            theme={{
              backgroundColor: colors.card,
              calendarBackground: colors.card,
              textSectionTitleColor: colors.textSecondary,
              selectedDayBackgroundColor: selectedHabitId === 'all' ? colors.primary : (selectedHabit?.color || colors.primary),
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.textSecondary + '40',
              dotColor: colors.primary,
              selectedDotColor: '#FFFFFF',
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              indicatorColor: colors.primary,
              textDayFontWeight: '600',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 13,
              textMonthFontSize: 15,
              textDayHeaderFontSize: 11
            }}
            markedDates={getMarkedDates()}
            maxDate={getLocalDateString()}
            enableSwipeMonths
          />
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Current Streak */}
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="fire" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{metrics.currentStreak}d</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {selectedHabitId === 'all' ? 'Avg Current Streak' : 'Current Streak'}
            </Text>
          </View>

          {/* Best Streak */}
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="trophy" size={24} color="#0EA5E9" />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{metrics.longestStreak}d</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {selectedHabitId === 'all' ? 'Avg Best Streak' : 'Best Streak'}
            </Text>
          </View>

          {/* Completion Rate */}
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: '#DCFCE7' }]}>
              <MaterialCommunityIcons name="percent" size={22} color="#10B981" />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{metrics.completionRate}%</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Completion Rate</Text>
          </View>

          {/* Total Completions */}
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.metricIconBg, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={22} color="#EF4444" />
            </View>
            <Text style={[styles.metricVal, { color: colors.text }]}>{metrics.totalCompletions}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Done</Text>
          </View>
        </View>

        {/* Weekly Strip Progress */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 40 }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly Progress</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, marginBottom: 16 }]}>
            Completion check-ins for the current week
          </Text>
          
          <View style={styles.weekStrip}>
            {weekDates.map((dateStr) => {
              const completed = isDateCompleted(dateStr);
              const isToday = dateStr === getLocalDateString();
              const activeColor = selectedHabitId === 'all' ? colors.primary : (selectedHabit?.color || colors.primary);

              return (
                <View key={dateStr} style={styles.weekDayCol}>
                  <Text style={[
                    styles.weekDayLabel, 
                    { color: isToday ? colors.primary : colors.textSecondary, fontWeight: isToday ? '800' : '600' }
                  ]}>
                    {getDayName(dateStr)}
                  </Text>
                  
                  <View 
                    style={[
                      styles.weekDot, 
                      { 
                        backgroundColor: completed ? activeColor : 'transparent',
                        borderColor: completed ? 'transparent' : (isToday ? colors.primary : colors.border),
                        borderStyle: completed ? 'solid' : 'dashed',
                        borderWidth: completed ? 0 : 2
                      }
                    ]}
                  >
                    {completed ? (
                      <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                    ) : (
                      isToday && <View style={[styles.todayInnerDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  
                  <Text style={[styles.weekDateNum, { color: colors.textSecondary, fontSize: 10, marginTop: 4 }]}>
                    {dateStr.split('-')[2]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  selectorWrapper: {
    marginBottom: 20,
  },
  selectorList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    maxWidth: 160,
  },
  selectorIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: -8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  metricCard: {
    width: (width - 40) / 2 - 8,
    marginHorizontal: 4,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  metricIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  weekDayCol: {
    alignItems: 'center',
    flex: 1,
  },
  weekDayLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  weekDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
