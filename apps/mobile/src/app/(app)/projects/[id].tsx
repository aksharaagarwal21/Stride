import { Alert, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { formatDate, isApiError, type Project } from '@stride/shared';
import { Fab } from '../../../components/fab';
import { TaskListView } from '../../../components/task-list';
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  ProgressBar,
  ProjectStatusBadge,
} from '../../../components/ui';
import { useDeleteProject, useProject } from '../../../lib/queries';
import { colors, space, type } from '../../../theme';

function ProjectSummary({ project }: { project: Project }) {
  const deleteProject = useDeleteProject();
  const { total, completed } = project.taskCounts;

  function confirmDelete() {
    Alert.alert(
      `Delete “${project.name}”?`,
      `This permanently deletes the project and ${total === 1 ? 'its 1 task' : `all ${total} of its tasks`}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete project',
          style: 'destructive',
          onPress: () =>
            deleteProject.mutate(project.id, {
              onSuccess: () => router.back(),
              onError: (error) =>
                Alert.alert(
                  "Couldn't delete the project",
                  isApiError(error) ? error.message : 'Please try again.',
                ),
            }),
        },
      ],
    );
  }

  return (
    <Card style={styles.summary}>
      <Text style={type.heading}>{project.name}</Text>
      <ProjectStatusBadge status={project.status} />
      {project.description ? <Text style={type.bodyMuted}>{project.description}</Text> : null}
      <View style={styles.dates}>
        <View style={{ flex: 1 }}>
          <Text style={type.small}>Start date</Text>
          <Text style={styles.dateValue}>{formatDate(project.startDate)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.small}>End date</Text>
          <Text style={styles.dateValue}>{formatDate(project.endDate)}</Text>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <View style={styles.progressLine}>
          <Text style={type.small}>
            {total === 0 ? 'No tasks yet' : `${completed} of ${total} tasks done`}
          </Text>
          {total > 0 ? (
            <Text style={[type.small, { color: colors.ink, fontWeight: '700' }]}>
              {Math.round((completed / total) * 100)}%
            </Text>
          ) : null}
        </View>
        <ProgressBar completed={completed} total={total} />
      </View>
      <View style={styles.actions}>
        <Button
          label="Edit"
          icon="edit-2"
          onPress={() => router.push({ pathname: '/projects/edit', params: { id: project.id } })}
          style={{ flex: 1 }}
        />
        <Button
          label="Delete"
          icon="trash-2"
          onPress={confirmDelete}
          loading={deleteProject.isPending}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}

export default function ProjectDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const createTask = () => router.push({ pathname: '/tasks/new', params: { projectId: id } });

  if (project.isPending) return <LoadingState label="Loading project" />;
  if (!project.data)
    return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: project.data.name }} />
      <TaskListView
        projectId={id}
        onCreate={createTask}
        header={
          <View style={styles.headerWrap}>
            <ProjectSummary project={project.data} />
            <Text style={[type.heading, { marginTop: space.lg }]}>Tasks</Text>
          </View>
        }
      />
      <Fab label="New task" onPress={createTask} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: space.lg, paddingTop: space.lg },
  summary: { padding: space.lg, gap: space.md },
  dates: { flexDirection: 'row', gap: space.lg },
  dateValue: { fontSize: 15, fontWeight: '600', color: colors.ink, marginTop: 2 },
  progressLine: { flexDirection: 'row', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: space.sm },
});
