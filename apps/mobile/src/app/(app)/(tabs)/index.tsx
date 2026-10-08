import { useState } from 'react';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { formatDate, type Dashboard } from '@stride/shared';
import { LastUpdated, OfflineBanner } from '../../../components/network';
import { ProjectRow, TaskRow } from '../../../components/rows';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  type IconName,
} from '../../../components/ui';
import { useAuth } from '../../../lib/auth';
import { useDashboard } from '../../../lib/queries';
import { colors, space, type } from '../../../theme';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function Metric({
  label,
  value,
  icon,
  tint,
  bg,
}: {
  label: string;
  value: number;
  icon: IconName;
  tint: string;
  bg: string;
}) {
  return (
    <Card style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: bg }]}>
        <Feather name={icon} size={16} color={tint} />
      </View>
      <Text style={type.metric} accessibilityLabel={`${label}: ${value}`}>
        {value}
      </Text>
      <Text style={type.small} numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

function StatusBreakdown({ metrics }: { metrics: Dashboard['metrics'] }) {
  const parts = [
    { label: 'Pending', value: metrics.pendingTasks, color: colors.pendingBar },
    { label: 'In Progress', value: metrics.inProgressTasks, color: colors.primary },
    { label: 'Completed', value: metrics.completedTasks, color: colors.success },
  ];
  if (metrics.totalTasks === 0) return null;
  return (
    <Card style={styles.section}>
      <Text style={type.subheading}>Task status</Text>
      <View
        style={styles.bar}
        accessibilityLabel={parts.map((part) => `${part.label} ${part.value}`).join(', ')}
      >
        {parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <View key={part.label} style={{ flex: part.value, backgroundColor: part.color }} />
          ))}
      </View>
      <View style={styles.legend}>
        {parts.map((part) => (
          <View key={part.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: part.color }]} />
            <Text style={type.small}>
              {part.label}{' '}
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{part.value}</Text>
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function OverviewScreen() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? '';

  async function refresh() {
    setRefreshing(true);
    try {
      await dashboard.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const data = dashboard.data;
  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner hasData={Boolean(data)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={type.title} numberOfLines={2}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </Text>
          <View style={styles.headerMeta}>
            <Text style={type.bodyMuted}>{data ? formatDate(data.today) : ' '}</Text>
            <LastUpdated at={dashboard.dataUpdatedAt} />
          </View>
        </View>

        {dashboard.isPending ? (
          <LoadingState label="Loading your overview" />
        ) : !data ? (
          <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        ) : (
          <View style={{ gap: space.lg }}>
            {dashboard.isError ? (
              <Notice tone="warning" message={`Couldn't refresh: ${dashboard.error.message}`} />
            ) : null}
            <View style={styles.grid}>
              <Metric
                label="Total Projects"
                value={data.metrics.totalProjects}
                icon="folder"
                tint={colors.primary}
                bg={colors.primarySoft}
              />
              <Metric
                label="Total Tasks"
                value={data.metrics.totalTasks}
                icon="list"
                tint={colors.primary}
                bg={colors.primarySoft}
              />
              <Metric
                label="Completed Tasks"
                value={data.metrics.completedTasks}
                icon="check-circle"
                tint={colors.success}
                bg={colors.successSoft}
              />
              <Metric
                label="Pending Tasks"
                value={data.metrics.pendingTasks}
                icon="circle"
                tint={colors.ink2}
                bg={colors.neutralSoft}
              />
              <Metric
                label="Projects In Progress"
                value={data.metrics.projectsInProgress}
                icon="clock"
                tint={colors.warning}
                bg={colors.warningSoft}
              />
              <Metric
                label="Overdue Tasks"
                value={data.metrics.overdueTasks}
                icon="alert-circle"
                tint={colors.danger}
                bg={colors.dangerSoft}
              />
            </View>

            {data.metrics.totalProjects === 0 ? (
              <Card>
                <EmptyState
                  icon="folder-plus"
                  title="Start with a project"
                  message="Create a project, add its tasks, and this overview will track what is done and what is due."
                  action={
                    <Button
                      label="Create a project"
                      icon="plus"
                      variant="primary"
                      onPress={() => router.push('/projects/new')}
                    />
                  }
                />
              </Card>
            ) : (
              <>
                <StatusBreakdown metrics={data.metrics} />
                <Card style={styles.listCard}>
                  <Text style={[type.subheading, styles.cardTitle]}>Upcoming tasks</Text>
                  {data.upcomingTasks.length === 0 ? (
                    <Text style={[type.bodyMuted, styles.cardEmpty]}>
                      Nothing due — every task is completed.
                    </Text>
                  ) : (
                    data.upcomingTasks.map((task, index) => (
                      <View key={task.id} style={index > 0 ? styles.divider : undefined}>
                        <TaskRow task={task} showProject />
                      </View>
                    ))
                  )}
                </Card>
                <Card style={styles.listCard}>
                  <Text style={[type.subheading, styles.cardTitle]}>Active projects</Text>
                  {data.activeProjects.length === 0 ? (
                    <Text style={[type.bodyMuted, styles.cardEmpty]}>
                      Every project is completed.
                    </Text>
                  ) : (
                    data.activeProjects.map((project, index) => (
                      <View key={project.id} style={index > 0 ? styles.divider : undefined}>
                        <ProjectRow project={project} />
                      </View>
                    ))
                  )}
                </Card>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxxl },
  header: { marginBottom: space.lg, gap: 2 },
  headerMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  metric: { flexBasis: '47%', flexGrow: 1, padding: space.md, gap: 6 },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { padding: space.lg, gap: space.md },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  listCard: { overflow: 'hidden' },
  cardTitle: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  cardEmpty: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
