import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Feather from '@expo/vector-icons/Feather';
import { dateOnlyToLocalDate, formatDate, localToday } from '@stride/shared';
import { colors, radius, space, type } from '../theme';

/**
 * Native date picker for "YYYY-MM-DD" values. The picker works with local Dates, so values are
 * converted with local-time helpers to avoid off-by-one days in timezones west of UTC.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const current = value ? dateOnlyToLocalDate(value) : new Date();

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(localToday(date));
        },
      });
    } else {
      setIosOpen((shown) => !shown);
    }
  }

  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not set'}`}
        accessibilityHint="Opens a date picker"
        onPress={open}
        style={({ pressed }) => [
          styles.input,
          error ? styles.inputError : null,
          pressed && { backgroundColor: colors.subtle },
        ]}
      >
        <Feather name="calendar" size={18} color={colors.ink2} />
        <Text style={[type.body, !value && { color: colors.ink3 }]}>
          {value ? formatDate(value) : 'Choose a date'}
        </Text>
      </Pressable>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={current}
          mode="date"
          display="inline"
          onChange={(_event, date) => {
            if (date) onChange(localToday(date));
            setIosOpen(false);
          }}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  input: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 13, color: colors.danger },
});
