import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme, HABIT_COLORS } from '../context/ThemeContext';
import { addHabit, updateHabit, getHabits } from '../utils/storage';
import { scheduleHabitReminder, updateHabitReminder, cancelHabitReminder } from '../utils/notifications';
import CustomTimePicker from '../components/CustomTimePicker';

const HABIT_ICONS = [
  'run', 'weight-lifter', 'book-open-variant', 'water', 'food-apple',
  'brain', 'sleep', 'coffee', 'laptop', 'pencil',
  'currency-usd', 'pill', 'tooth-outline', 'leaf', 'music'
];

export default function AddHabitScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  
  // Check if we are in Edit Mode
  const editHabitId = route.params?.editHabitId;
  const isEditMode = !!editHabitId;

  // Form states
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(HABIT_COLORS[0].hex);
  
  // Notification states
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [originalNotificationId, setOriginalNotificationId] = useState(null);

  // If in Edit Mode, fetch and prefill the form
  useEffect(() => {
    if (isEditMode) {
      const loadHabitToEdit = async () => {
        try {
          const habits = await getHabits();
          const habit = habits.find(h => h.id === editHabitId);
          if (habit) {
            setName(habit.name);
            setFrequency(habit.frequency);
            setSelectedIcon(habit.icon);
            setSelectedColor(habit.color);
            if (habit.reminderTime) {
              setIsReminderEnabled(true);
              setReminderTime(habit.reminderTime);
              setOriginalNotificationId(habit.notificationId);
            }
          }
        } catch (error) {
          console.error('Failed to load habit for editing:', error);
          Alert.alert('Error', 'Could not load habit details.');
        }
      };
      loadHabitToEdit();
    }
  }, [editHabitId, isEditMode]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a name for your habit.');
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const desiredTime = isReminderEnabled ? reminderTime : null;
      let newNotificationId = null;

      if (isEditMode) {
        // Edit flow
        // Update notification
        if (desiredTime !== null) {
          // Time is set or changed
          newNotificationId = await updateHabitReminder(
            name, 
            originalNotificationId, 
            desiredTime
          );
        } else if (originalNotificationId) {
          // Reminder was disabled: cancel it
          await cancelHabitReminder(originalNotificationId);
        }

        await updateHabit(editHabitId, {
          name: name.trim(),
          frequency,
          icon: selectedIcon,
          color: selectedColor,
          reminderTime: desiredTime,
          notificationId: newNotificationId || (desiredTime ? originalNotificationId : null),
        });
      } else {
        // Create flow
        if (desiredTime) {
          newNotificationId = await scheduleHabitReminder(name.trim(), desiredTime);
        }

        await addHabit({
          name: name.trim(),
          frequency,
          icon: selectedIcon,
          color: selectedColor,
          reminderTime: desiredTime,
          notificationId: newNotificationId,
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving habit:', error);
      Alert.alert('Error', 'Something went wrong while saving your habit.');
    }
  };

  // Convert 24h format to 12h for UI display
  const formatTime12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${m} ${ampm}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Custom Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerBackBtn}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditMode ? 'Edit Habit' : 'New Habit'}
        </Text>
        <TouchableOpacity 
          onPress={handleSave}
          style={[styles.headerSaveBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.headerSaveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Name Input */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HABIT NAME</Text>
          <TextInput
            placeholder="e.g. Meditate, Journal, Run..."
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            style={[
              styles.input, 
              { 
                backgroundColor: colors.card, 
                color: colors.text, 
                borderColor: colors.border 
              }
            ]}
            maxLength={32}
          />
        </View>

        {/* Frequency selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FREQUENCY</Text>
          <View style={[styles.frequencyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.frequencyBtn,
                frequency === 'daily' && { backgroundColor: colors.primary }
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setFrequency('daily');
              }}
            >
              <Text 
                style={[
                  styles.frequencyBtnText, 
                  { color: frequency === 'daily' ? '#FFF' : colors.textSecondary }
                ]}
              >
                Daily
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.frequencyBtn,
                frequency === 'weekly' && { backgroundColor: colors.primary }
              ]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setFrequency('weekly');
              }}
            >
              <Text 
                style={[
                  styles.frequencyBtnText, 
                  { color: frequency === 'weekly' ? '#FFF' : colors.textSecondary }
                ]}
              >
                Weekly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Color selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCENT COLOR</Text>
          <View style={styles.colorsGrid}>
            {HABIT_COLORS.map((c) => {
              const isSelected = selectedColor === c.hex;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.colorPill,
                    { backgroundColor: c.hex },
                    isSelected && { borderColor: colors.text, borderWidth: 3 }
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setSelectedColor(c.hex);
                  }}
                >
                  {isSelected && (
                    <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Icon Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CHOOSE ICON</Text>
          <View style={[styles.iconsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {HABIT_ICONS.map((icon) => {
              const isSelected = selectedIcon === icon;
              return (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconBox,
                    isSelected && { backgroundColor: selectedColor }
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setSelectedIcon(icon);
                  }}
                >
                  <MaterialCommunityIcons 
                    name={icon} 
                    size={24} 
                    color={isSelected ? '#FFF' : colors.textSecondary} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notification Reminder */}
        <View style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderTextContainer}>
              <Text style={[styles.reminderTitle, { color: colors.text }]}>Daily Reminder</Text>
              <Text style={[styles.reminderSubtitle, { color: colors.textSecondary }]}>
                Get reminded to stay on track
              </Text>
            </View>
            <Switch
              value={isReminderEnabled}
              onValueChange={(val) => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setIsReminderEnabled(val);
              }}
              trackColor={{ false: colors.divider, true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
            />
          </View>

          {isReminderEnabled && (
            <View style={[styles.reminderTimeRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.reminderTimeLabel, { color: colors.text }]}>Time</Text>
              <TouchableOpacity
                style={[styles.timePickerBtn, { backgroundColor: colors.primaryLight }]}
                onPress={() => setIsTimePickerVisible(true)}
              >
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.timePickerText, { color: colors.primary }]}>
                  {formatTime12h(reminderTime)}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <CustomTimePicker
        visible={isTimePickerVisible}
        onClose={() => setIsTimePickerVisible(false)}
        initialTime={reminderTime}
        onSave={(time) => setReminderTime(time)}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerSaveText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  frequencyRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  frequencyBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequencyBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderTextContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderSubtitle: {
    fontSize: 12,
  },
  reminderTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  reminderTimeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  timePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timePickerText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
