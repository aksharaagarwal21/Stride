import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { formatTimestamp, isApiError, type Task } from '@stride/shared';
import { FormScreen } from '../../../components/form-screen';
import { TaskForm } from '../../../components/forms';
import { Button, Card, ErrorState, LoadingState } from '../../../components/ui';
import { useDeleteTask, useTask, useUpdateTask } from '../../../lib/queries';
import { colors, space, type } from '../../../theme';

function QuickActions({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const done = task.status === 'COMPLETED';

  function confirmDelete() {
    Alert.alert(
      `Delete “${task.name}”?`,
      'This permanently deletes the task. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete task',
          style: 'destructive',
          onPress: () =>
            deleteTask.mutate(task.id, {
              onSuccess: () => router.back(),
              onError: (error) =>
                Alert.alert(
                  "Couldn't delete the task",
                  isApiError(error) ? error.message : 'Please try again.',
                ),
            }),
        },
      ],
    );
  }

  return (
    <View style={styles.actions}>
      <Button
        label={done ? 'Reopen' : 'Mark completed'}
        icon={done ? 'rotate-ccw' : 'check-circle'}
        variant={done ? 'secondary' : 'primary'}
        loading={updateTask.isPending}
        onPress={() =>
          updateTask.mutate(
            { id: task.id, input: { status: done ? 'PENDING' : 'COMPLETED' } },
            {
              onError: (error) =>
                Alert.alert(
                  "Couldn't update the task",
                  isApiError(error) ? error.message : 'Please try again.',
                ),
            },
          )
        }
        style={{ flex: 1 }}
      />
      <Button
        label="Delete"
        icon="trash-2"
        onPress={confirmDelete}
        loading={deleteTask.isPending}
      />
    </View>
  );
}

export default function TaskDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const task = useTask(id);
  const updateTask = useUpdateTask();

  if (task.isPending) return <LoadingState label="Loading task" />;
  if (!task.data) return <ErrorState error={task.error} onRetry={() => void task.refetch()} />;

  const current = task.data;
  return (
    <FormScreen>
      <Card style={styles.project}>
        <Feather name="folder" size={16} color={colors.ink2} />
        <Text
          style={[type.body, { flex: 1, color: colors.primary, fontWeight: '600' }]}
          numberOfLines={1}
          onPress={() =>
            router.push({ pathname: '/projects/[id]', params: { id: current.project.id } })
          }
          accessibilityRole="link"
        >
          {current.project.name}
        </Text>
      </Card>
      <QuickActions task={current} />
      {/* Re-mount the form when the server copy changes (e.g. after Mark completed). */}
      <TaskForm
        key={current.updatedAt}
        initial={{
          projectId: current.projectId,
          name: current.name,
          description: current.description,
          status: current.status,
          priority: current.priority,
          dueDate: current.dueDate,
        }}
        chooseProject={false}
        requireChanges
        submitLabel="Save changes"
        onSubmit={async ({ name, description, status, priority, dueDate }) => {
          await updateTask.mutateAsync({
            id: current.id,
            input: { name, description, status, priority, dueDate },
          });
          Alert.alert('Saved', 'Your changes were saved.');
        }}
      />
      <Text style={styles.meta}>
        Created {formatTimestamp(current.createdAt)} · Updated {formatTimestamp(current.updatedAt)}
      </Text>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  project: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    minHeight: 48,
  },
  actions: { flexDirection: 'row', gap: space.sm },
  meta: { fontSize: 12, color: colors.ink3, textAlign: 'center' },
});
