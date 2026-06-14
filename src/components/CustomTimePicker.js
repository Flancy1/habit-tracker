import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const CustomTimePicker = ({ visible, onClose, onSave, initialTime }) => {
  const { colors } = useTheme();
  
  // Split initialTime 'HH:MM' into hours and minutes
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);

  useEffect(() => {
    if (initialTime) {
      const [hStr, mStr] = initialTime.split(':');
      let h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      
      if (!isNaN(h) && !isNaN(m)) {
        setIsPM(h >= 12);
        if (h === 0) {
          setHour(12);
        } else if (h > 12) {
          setHour(h - 12);
        } else {
          setHour(h);
        }
        setMinute(m);
      }
    } else {
      // Defaults
      setHour(8);
      setMinute(0);
      setIsPM(false);
    }
  }, [initialTime, visible]);

  const incrementHour = () => {
    setHour((prev) => (prev === 12 ? 1 : prev + 1));
  };

  const decrementHour = () => {
    setHour((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const incrementMinute = () => {
    setMinute((prev) => (prev === 55 ? 0 : prev + 5)); // Increment by 5 mins
  };

  const decrementMinute = () => {
    setMinute((prev) => (prev === 0 ? 55 : prev - 5)); // Decrement by 5 mins
  };

  const toggleAmPm = () => {
    setIsPM((prev) => !prev);
  };

  const handleSave = () => {
    // Convert back to 24h string 'HH:MM'
    let h24 = hour;
    if (isPM) {
      if (hour !== 12) h24 = hour + 12;
    } else {
      if (hour === 12) h24 = 0;
    }
    const formattedHour = String(h24).padStart(2, '0');
    const formattedMinute = String(minute).padStart(2, '0');
    onSave(`${formattedHour}:${formattedMinute}`);
    onClose();
  };

  // Human readable label for UI
  const formatDisplayTime = () => {
    const padMin = String(minute).padStart(2, '0');
    return `${hour}:${padMin} ${isPM ? 'PM' : 'AM'}`;
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Set Reminder Time</Text>
          
          <Text style={[styles.displayTime, { color: colors.primary }]}>
            {formatDisplayTime()}
          </Text>

          <View style={styles.selectorsRow}>
            {/* Hour column */}
            <View style={styles.controlColumn}>
              <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>HOUR</Text>
              <TouchableOpacity onPress={incrementHour} style={[styles.btn, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name="chevron-up" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.valueText, { color: colors.text }]}>
                {String(hour).padStart(2, '0')}
              </Text>
              <TouchableOpacity onPress={decrementHour} style={[styles.btn, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.separator, { color: colors.text }]}>:</Text>

            {/* Minute column */}
            <View style={styles.controlColumn}>
              <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>MIN</Text>
              <TouchableOpacity onPress={incrementMinute} style={[styles.btn, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name="chevron-up" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.valueText, { color: colors.text }]}>
                {String(minute).padStart(2, '0')}
              </Text>
              <TouchableOpacity onPress={decrementMinute} style={[styles.btn, { backgroundColor: colors.primaryLight }]}>
                <MaterialCommunityIcons name="chevron-down" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* AM/PM column */}
            <View style={styles.controlColumn}>
              <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>AM/PM</Text>
              <TouchableOpacity onPress={toggleAmPm} style={[styles.amPmBtn, { backgroundColor: colors.primaryLight, height: 96 }]}>
                <Text style={[styles.amPmText, { color: colors.primary }]}>{isPM ? 'PM' : 'AM'}</Text>
                <MaterialCommunityIcons name="swap-vertical" size={16} color={colors.primary} style={{ marginTop: 4 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.actionBtn, styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.actionBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.saveBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  displayTime: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: 1,
  },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  controlColumn: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  columnLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  separator: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: 18,
  },
  btn: {
    width: 44,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  amPmBtn: {
    width: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 22,
    fontWeight: '700',
    marginVertical: 12,
  },
  amPmText: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
export default CustomTimePicker;
