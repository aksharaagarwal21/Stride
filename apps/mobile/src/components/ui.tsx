import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {
  isApiError,
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
} from '@stride/shared';
import { colors, radius, shadow, space, TOUCH, type } from '../theme';

export type IconName = ComponentProps<typeof Feather>['name'];

// ---------- Buttons ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  loading,
  disabled,
  style,
  accessibilityHint,
}: ButtonProps) {
  const inactive = disabled || loading;
  const fg =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'ghost'
        ? colors.primary
        : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Feather name={icon} size={18} color={fg} />
      ) : null}
      <Text style={[styles.buttonLabel, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  color = colors.ink2,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && { backgroundColor: colors.subtle },
        disabled && styles.disabled,
      ]}
    >
      <Feather name={icon} size={20} color={color} />
    </Pressable>
  );
}

// ---------- Form fields ----------

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  right?: ReactNode;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, right, style, multiline, onFocus, onBlur, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={type.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.ink3}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
        {right}
      </View>
      {error ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={type.small}>{hint}</Text>
      ) : null}
    </View>
  );
});

export function PasswordField(props: TextFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      right={
        <IconButton
          icon={visible ? 'eye-off' : 'eye'}
          label={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((value) => !value)}
        />
      }
    />
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={[styles.inputWrap, styles.search]}>
      <Feather name="search" size={18} color={colors.ink3} style={{ marginLeft: space.md }} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        accessibilityLabel={placeholder}
        returnKeyType="search"
        autoCorrect={false}
        style={[styles.input, { paddingLeft: space.sm }]}
      />
      {value ? <IconButton icon="x" label="Clear search" onPress={() => onChangeText('')} /> : null}
    </View>
  );
}

// ---------- Chips & option pickers ----------

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Feather name={icon} size={15} color={selected ? colors.primaryStrong : colors.ink2} />
      ) : null}
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Segmented single-choice control used for status and priority. */
export function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <View style={styles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={type.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === value }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              option.value === value && styles.chipSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipLabel, option.value === value && styles.chipLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ---------- Badges ----------

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';
const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.neutralSoft, fg: colors.ink2 },
  blue: { bg: colors.primarySoft, fg: colors.primaryStrong },
  green: { bg: colors.successSoft, fg: colors.success },
  amber: { bg: colors.warningSoft, fg: colors.warning },
  red: { bg: colors.dangerSoft, fg: colors.danger },
};

function Badge({ label, tone, plain }: { label: string; tone: Tone; plain?: boolean }) {
  const { bg, fg } = toneColors[tone];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: plain ? 'transparent' : bg, paddingHorizontal: plain ? 0 : 8 },
      ]}
    >
      <View style={[styles.badgeDot, { backgroundColor: fg }]} />
      <Text style={[styles.badgeLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

const projectTone: Record<ProjectStatus, Tone> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
};
const taskTone: Record<TaskStatus, Tone> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
};
const priorityTone: Record<TaskPriority, Tone> = { LOW: 'neutral', MEDIUM: 'amber', HIGH: 'red' };

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <Badge label={PROJECT_STATUS_LABELS[status]} tone={projectTone[status]} />
);
export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => (
  <Badge label={TASK_STATUS_LABELS[status]} tone={taskTone[status]} />
);
export const PriorityBadge = ({ priority }: { priority: TaskPriority }) => (
  <Badge label={TASK_PRIORITY_LABELS[priority]} tone={priorityTone[priority]} plain />
);

// ---------- Surfaces & states ----------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessibilityLabel={total === 0 ? 'No tasks yet' : `${completed} of ${total} tasks completed`}
    >
      <View
        style={[
          styles.progressFill,
          {
            width: `${percent}%`,
            backgroundColor: percent === 100 ? colors.success : colors.primary,
          },
        ]}
      />
    </View>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.state} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} />
      <Text style={[type.bodyMuted, { marginTop: space.sm }]}>{label}…</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Feather name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={[type.subheading, styles.center]}>{title}</Text>
      {message ? (
        <Text style={[type.bodyMuted, styles.center, { marginTop: 4 }]}>{message}</Text>
      ) : null}
      {action ? <View style={{ marginTop: space.lg }}>{action}</View> : null}
    </View>
  );
}

/** Error with Retry; offline errors get their own wording and icon. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const offline = isApiError(error) && error.isNetworkError;
  const notFound = isApiError(error) && error.status === 404;
  return (
    <View style={styles.state} accessibilityRole="alert">
      <View
        style={[
          styles.stateIcon,
          { backgroundColor: offline ? colors.warningSoft : colors.dangerSoft },
        ]}
      >
        <Feather
          name={offline ? 'wifi-off' : 'alert-triangle'}
          size={22}
          color={offline ? colors.warning : colors.danger}
        />
      </View>
      <Text style={[type.subheading, styles.center]}>
        {offline ? 'No connection' : notFound ? 'Not found' : "Couldn't load this"}
      </Text>
      <Text style={[type.bodyMuted, styles.center, { marginTop: 4 }]}>
        {notFound
          ? 'It may have been deleted, or it belongs to another account.'
          : isApiError(error)
            ? error.message
            : 'Something went wrong. Please try again.'}
      </Text>
      {onRetry && !notFound ? (
        <Button label="Retry" icon="refresh-cw" onPress={onRetry} style={{ marginTop: space.lg }} />
      ) : null}
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.formError} accessibilityRole="alert">
      <Feather name="alert-circle" size={16} color={colors.danger} />
      <Text style={[type.small, { color: colors.danger, flex: 1 }]}>{message}</Text>
    </View>
  );
}

export function Notice({ message, tone = 'info' }: { message: string; tone?: 'info' | 'warning' }) {
  const palette =
    tone === 'info'
      ? { bg: colors.primarySoft, fg: colors.primaryStrong }
      : { bg: colors.warningSoft, fg: colors.warning };
  return (
    <View
      style={[styles.formError, { backgroundColor: palette.bg, borderColor: 'transparent' }]}
      accessibilityRole="alert"
    >
      <Feather name="info" size={16} color={palette.fg} />
      <Text style={[type.small, { color: palette.fg, flex: 1 }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: { backgroundColor: colors.danger },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  iconButton: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
  },
  field: { gap: 6 },
  inputWrap: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
  },
  inputWrapMultiline: { alignItems: 'flex-start' },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, minHeight: 46, paddingHorizontal: space.md, fontSize: 15, color: colors.ink },
  inputMultiline: { minHeight: 96, paddingTop: space.md, textAlignVertical: 'top' },
  search: { flex: 1 },
  errorText: { fontSize: 13, color: colors.danger },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  option: {
    minHeight: TOUCH,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipLabel: { fontSize: 14, fontWeight: '500', color: colors.ink2 },
  chipLabelSelected: { color: colors.primaryStrong, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.subtle, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: space.xxl,
  },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  center: { textAlign: 'center' },
  formError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.control,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F5C9C9',
  },
});
