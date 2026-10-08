import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import {
  describeDue,
  formatShortDate,
  isApiError,
  localToday,
  type Project,
  type Task,
} from '@stride/shared';
import { useUpdateTask } from '../lib/queries';
import { colors, space, type } from '../theme';
import { PriorityBadge, ProgressBar, ProjectStatusBadge, TaskStatusBadge } from './ui';

export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, today: string) {
  return task.status !== 'COMPLETED' && task.dueDate < today;
}

/** Saves Completed ↔ Pending on the server, then the list refreshes from the response. */
export function CompleteToggle({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const done = task.status === 'COMPLETED';
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done, busy: updateTask.isPending }}
      accessibilityLabel={done ? `Reopen ${task.name}` : `Mark ${task.name} as completed`}
      disabled={updateTask.isPending}
      hitSlop={10}
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
      style={styles.toggleHit}
    >
      <View style={[styles.toggle, done && styles.toggleDone]}>
        {updateTask.isPending ? (
          <ActivityIndicator size="small" color={done ? '#fff' : colors.ink3} />
        ) : done ? (
          <Feather name="check" size={15} color="#fff" />
        ) : null}
      </View>
    </Pressable>
  );
}

export function TaskRow({ task, showProject }: { task: Task; showProject?: boolean }) {
  const today = localToday();
  const overdue = isOverdue(task, today);
  const done = task.status === 'COMPLETED';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${task.name}, ${task.status.replace('_', ' ').toLowerCase()}, ${describeDue(task.dueDate, today)}`}
      accessibilityHint="Opens task details"
      onPress={() => router.push({ pathname: '/tasks/[id]', params: { id: task.id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.subtle }]}
    >
      <CompleteToggle task={task} />
      <View style={styles.rowBody}>
        <Text style={[type.body, styles.taskName, done && styles.done]} numberOfLines={2}>
          {task.name}
        </Text>
        {showProject ? (
          <Text style={type.small} numberOfLines={1}>
            {task.project.name}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <TaskStatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <View style={styles.due}>
            {overdue ? <Feather name="alert-circle" size={13} color={colors.danger} /> : null}
            <Text style={[styles.dueText, overdue && { color: colors.danger, fontWeight: '600' }]}>
              {done ? formatShortDate(task.dueDate, today) : describeDue(task.dueDate, today)}
            </Text>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.ink3} />
    </Pressable>
  );
}

export function ProjectRow({ project }: { project: Project }) {
  const today = localToday();
  const { total, completed } = project.taskCounts;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${project.name}, ${total === 0 ? 'no tasks yet' : `${completed} of ${total} tasks done`}`}
      accessibilityHint="Opens project details"
      onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })}
      style={({ pressed }) => [
        styles.row,
        styles.projectRow,
        pressed && { backgroundColor: colors.subtle },
      ]}
    >
      <View style={styles.rowBody}>
        <View style={styles.titleLine}>
          <Text style={[type.subheading, { flexShrink: 1 }]} numberOfLines={2}>
            {project.name}
          </Text>
        </View>
        <View style={styles.meta}>
          <ProjectStatusBadge status={project.status} />
          <View style={styles.due}>
            <Feather name="calendar" size={13} color={colors.ink3} />
            <Text style={styles.dueText}>
              {formatShortDate(project.startDate, today)} –{' '}
              {formatShortDate(project.endDate, today)}
            </Text>
          </View>
        </View>
        <View style={styles.progressLine}>
          <Text style={type.small}>
            {total === 0 ? 'No tasks yet' : `${completed} of ${total} tasks done`}
          </Text>
          {total > 0 ? (
            <Text style={[type.small, styles.percent]}>
              {Math.round((completed / total) * 100)}%
            </Text>
          ) : null}
        </View>
        <ProgressBar completed={completed} total={total} />
      </View>
      <Feather name="chevron-right" size={18} color={colors.ink3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.surface,
    minHeight: 64,
  },
  projectRow: { paddingVertical: space.lg },
  rowBody: { flex: 1, gap: 6 },
  taskName: { fontWeight: '500' },
  done: { color: colors.ink2, textDecorationLine: 'line-through' },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.md,
    rowGap: 4,
  },
  due: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: { fontSize: 12, color: colors.ink2, fontVariant: ['tabular-nums'] },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  progressLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  percent: { color: colors.ink, fontWeight: '600' },
  toggleHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  toggle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDone: { backgroundColor: colors.success, borderColor: colors.success },
});
