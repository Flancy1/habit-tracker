import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
  Platform
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

import { useTheme } from '../context/ThemeContext';
import { getHabits, deleteHabit, reorderHabits, clearAllData } from '../utils/storage';
import { cancelHabitReminder } from '../utils/notifications';

export default function SettingsScreen({ navigation }) {
  const { colors, toggleTheme, isDark } = useTheme();
  const isFocused = useIsFocused();

  const [habits, setHabits] = useState([]);

  useEffect(() => {
    if (isFocused) {
      loadHabits();
    }
  }, [isFocused]);

  const loadHabits = async () => {
    try {
      const allHabits = await getHabits();
      setHabits(allHabits);
    } catch (error) {
      console.error('Failed to load habits in settings:', error);
    }
  };

  // Move a habit up in the list
  const handleMoveUp = async (index) => {
    if (index === 0) return;
    
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const updated = [...habits];
    // Swap items
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    
    setHabits(updated);
    await reorderHabits(updated);
  };

  // Move a habit down in the list
  const handleMoveDown = async (index) => {
    if (index === habits.length - 1) return;
    
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const updated = [...habits];
    // Swap items
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    
    setHabits(updated);
    await reorderHabits(updated);
  };

  const handleDeleteHabit = (habitId, habitName) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const performDelete = async () => {
      try {
        const { deletedHabit, remainingHabits } = await deleteHabit(habitId);
        
        // Cancel notification if scheduled
        if (deletedHabit?.notificationId) {
          await cancelHabitReminder(deletedHabit.notificationId);
        }
        
        setHabits(remainingHabits);
        
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error('Failed to delete habit:', error);
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(`Are you sure you want to delete "${habitName}"?`);
      if (confirmDelete) performDelete();
    } else {
      Alert.alert(
        'Delete Habit',
        `Are you sure you want to delete "${habitName}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const handleClearAll = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const performClear = async () => {
      try {
        await clearAllData();
        
        // Cancel all notifications
        if (Platform.OS !== 'web') {
          await Notifications.cancelAllScheduledNotificationsAsync();
        }
        
        setHabits([]);
        
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        Alert.alert('Cleared', 'All habit data has been reset to defaults.');
        loadHabits(); // reload defaults
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    };

    if (Platform.OS === 'web') {
      const confirmClear = window.confirm('Are you sure you want to clear all data? This resets the app.');
      if (confirmClear) performClear();
    } else {
      Alert.alert(
        'Reset App Data',
        'Are you sure you want to wipe all habits and history? This resets the app to its default state.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: performClear },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Preference Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <MaterialCommunityIcons name="theme-light-dark" size={22} color={colors.primary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  toggleTheme();
                }}
                trackColor={{ false: colors.divider, true: colors.primary }}
                thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
              />
            </View>
          </View>
        </View>

        {/* Habit Management Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MANAGE HABITS ({habits.length})</Text>
          
          {habits.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>No habits to manage.</Text>
            </View>
          ) : (
            <View style={styles.habitsListContainer}>
              {habits.map((item, index) => {
                const habitColor = item.color || colors.primary;
                const isFirst = index === 0;
                const isLast = index === habits.length - 1;

                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.habitItemRow, 
                      { 
                        backgroundColor: colors.card, 
                        borderColor: colors.border,
                        borderLeftColor: habitColor,
                        borderLeftWidth: 5
                      }
                    ]}
                  >
                    {/* Icon and Title */}
                    <View style={styles.habitMeta}>
                      <MaterialCommunityIcons name={item.icon} size={20} color={habitColor} style={{ marginRight: 10 }} />
                      <Text style={[styles.habitName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    {/* Controls */}
                    <View style={styles.controlsRow}>
                      {/* Reordering */}
                      <TouchableOpacity
                        onPress={() => handleMoveUp(index)}
                        disabled={isFirst}
                        style={[styles.controlBtn, isFirst && { opacity: 0.2 }]}
                      >
                        <MaterialCommunityIcons name="arrow-up" size={18} color={colors.text} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => handleMoveDown(index)}
                        disabled={isLast}
                        style={[styles.controlBtn, isLast && { opacity: 0.2 }]}
                      >
                        <MaterialCommunityIcons name="arrow-down" size={18} color={colors.text} />
                      </TouchableOpacity>

                      {/* Edit */}
                      <TouchableOpacity
                        onPress={() => navigation.navigate('AddHabit', { editHabitId: item.id })}
                        style={styles.controlBtn}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>

                      {/* Delete */}
                      <TouchableOpacity
                        onPress={() => handleDeleteHabit(item.id, item.name)}
                        style={styles.controlBtn}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Danger Zone Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>DANGER ZONE</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.danger + '30' }]}>
            <TouchableOpacity 
              style={styles.dangerRow} 
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <View style={styles.settingLabelContainer}>
                <MaterialCommunityIcons name="alert-octagon-outline" size={22} color={colors.danger} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.dangerLabel, { color: colors.danger }]}>Clear All App Data</Text>
                  <Text style={[styles.dangerSub, { color: colors.textSecondary }]}>
                    Wipe database and reset reminders
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
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
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  habitsListContainer: {
    gap: 8,
  },
  habitItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  dangerSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
