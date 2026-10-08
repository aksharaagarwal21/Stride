import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  projectFormSchema,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  taskFormSchema,
  type ProjectFormValues,
  type TaskFormValues,
} from '@stride/shared';
import { applyServerErrors } from '../lib/forms';
import { useProjectOptions } from '../lib/queries';
import { colors, radius, space, type } from '../theme';
import { DateField } from './date-field';
import { Button, FormError, OptionPicker, TextField } from './ui';

const statusOptions = TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABELS[value] }));
const priorityOptions = TASK_PRIORITIES.map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));
const projectStatusOptions = PROJECT_STATUSES.map((value) => ({
  value,
  label: PROJECT_STATUS_LABELS[value],
}));

function ProjectPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const projects = useProjectOptions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = projects.data?.data.find((project) => project.id === value);
  return (
    <View style={{ gap: 6 }}>
      <Text style={type.label}>Project</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Project: ${selected?.name ?? 'not chosen'}`}
        onPress={() => setOpen(true)}
        style={[styles.picker, error ? { borderColor: colors.danger } : null]}
      >
        <Feather name="folder" size={18} color={colors.ink2} />
        <Text
          style={[type.body, { flex: 1 }, !selected && { color: colors.ink3 }]}
          numberOfLines={1}
        >
          {selected?.name ?? (projects.isPending ? 'Loading projects…' : 'Choose a project')}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.ink3} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Text style={[type.heading, { marginBottom: space.sm }]}>Choose a project</Text>
          <FlatList
            data={projects.data?.data ?? []}
            keyExtractor={(project) => project.id}
            ListEmptyComponent={
              <Text style={[type.bodyMuted, { paddingVertical: space.xl }]}>
                {projects.isError
                  ? projects.error.message
                  : 'No projects yet. Create a project first.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: item.id === value }}
                onPress={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  pressed && { backgroundColor: colors.subtle },
                ]}
              >
                <Text style={[type.body, { flex: 1 }]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.id === value ? (
                  <Feather name="check" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const TASK_FIELDS = ['projectId', 'name', 'description', 'status', 'priority', 'dueDate'] as const;

export function TaskForm({
  initial,
  chooseProject,
  submitLabel,
  requireChanges = false,
  onSubmit,
}: {
  initial: TaskFormValues;
  /** Show the project picker (new task without a fixed project). */
  chooseProject: boolean;
  submitLabel: string;
  /** Edit mode: keep the button disabled until something changes. */
  requireChanges?: boolean;
  onSubmit: (values: TaskFormValues) => Promise<unknown>;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TaskFormValues>({ resolver: zodResolver(taskFormSchema), defaultValues: initial });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      // Input stays in place; nothing is reported as saved.
      setFormError(applyServerErrors(error, setError, TASK_FIELDS));
    }
  });

  return (
    <View style={styles.form}>
      <FormError message={formError} />
      {chooseProject ? (
        <Controller
          control={control}
          name="projectId"
          render={({ field }) => (
            <ProjectPicker
              value={field.value}
              onChange={field.onChange}
              error={errors.projectId?.message}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Task name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
            placeholder="e.g. Draft the launch email"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Description (optional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.description?.message}
            placeholder="Add details or notes"
            multiline
          />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <OptionPicker
            label="Status"
            options={statusOptions}
            value={field.value}
            onChange={field.onChange}
            error={errors.status?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="priority"
        render={({ field }) => (
          <OptionPicker
            label="Priority"
            options={priorityOptions}
            value={field.value}
            onChange={field.onChange}
            error={errors.priority?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="dueDate"
        render={({ field }) => (
          <DateField
            label="Due date"
            value={field.value}
            onChange={field.onChange}
            error={errors.dueDate?.message}
          />
        )}
      />
      <Button
        label={submitLabel}
        variant="primary"
        onPress={submit}
        loading={isSubmitting}
        disabled={requireChanges && !isDirty}
      />
    </View>
  );
}

const PROJECT_FIELDS = ['name', 'description', 'status', 'startDate', 'endDate'] as const;

export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: ProjectFormValues;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<unknown>;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initial,
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, PROJECT_FIELDS));
    }
  });

  return (
    <View style={styles.form}>
      <FormError message={formError} />
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Project name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
            placeholder="e.g. Website relaunch"
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Description (optional)"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.description?.message}
            multiline
          />
        )}
      />
      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <OptionPicker
            label="Status"
            options={projectStatusOptions}
            value={field.value}
            onChange={field.onChange}
            error={errors.status?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="startDate"
        render={({ field }) => (
          <DateField
            label="Start date"
            value={field.value}
            onChange={field.onChange}
            error={errors.startDate?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="endDate"
        render={({ field }) => (
          <DateField
            label="End date"
            value={field.value}
            onChange={field.onChange}
            error={errors.endDate?.message}
          />
        )}
      />
      <Button label={submitLabel} variant="primary" onPress={submit} loading={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  picker: {
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
  error: { fontSize: 13, color: colors.danger },
  backdrop: { flex: 1, backgroundColor: 'rgba(23,32,51,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: space.xl,
    maxHeight: '70%',
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.control,
  },
});
