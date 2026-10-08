import { useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useDebouncedValue } from '../lib/forms';
import { useTaskList } from '../lib/queries';
import { colors, space, type } from '../theme';
import { LastUpdated, OfflineBanner } from './network';
import { TaskRow } from './rows';
import {
  DEFAULT_TASK_FILTERS,
  TaskFilterBar,
  toTaskQuery,
  type TaskFilterState,
} from './task-filters';
import { Button, EmptyState, ErrorState, LoadingState, Notice } from './ui';

interface TaskListViewProps {
  /** Restricts the list to one project (project details screen). */
  projectId?: string;
  showProject?: boolean;
  /** Rendered above the filters, scrolling with the list. */
  header?: ReactElement | null;
  onCreate?: () => void;
}

/** Searchable, filterable, infinitely scrolling task list with pull-to-refresh. */
export function TaskListView({ projectId, showProject, header, onCreate }: TaskListViewProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_TASK_FILTERS);
  const list = useTaskList({
    projectId,
    search: debouncedSearch || undefined,
    ...toTaskQuery(filters),
  });
  const [refreshing, setRefreshing] = useState(false);

  const tasks = list.data?.pages.flatMap((page) => page.data) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const filtered = Boolean(debouncedSearch || filters.status || filters.priority);

  // Pull-to-refresh refetches every loaded page from the server.
  async function refresh() {
    setRefreshing(true);
    try {
      await list.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function clearFilters() {
    setSearch('');
    setFilters(DEFAULT_TASK_FILTERS);
  }

  return (
    <View style={styles.container}>
      <OfflineBanner hasData={tasks.length > 0} />
      <FlatList
        data={tasks}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => <TaskRow task={item} showProject={showProject} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            {header}
            <TaskFilterBar
              search={search}
              onSearch={setSearch}
              filters={filters}
              onFilters={setFilters}
            />
            {list.isError && tasks.length > 0 ? (
              <View style={styles.notice}>
                <Notice
                  tone="warning"
                  message={`Couldn't refresh: ${list.error.message} Showing earlier data.`}
                />
              </View>
            ) : null}
            {list.data ? (
              <View style={styles.summary}>
                <Text style={type.small}>
                  {total} {total === 1 ? 'task' : 'tasks'}
                  {filtered ? ' found' : ''}
                </Text>
                <LastUpdated at={list.dataUpdatedAt} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.isPending ? (
            <LoadingState label="Loading tasks" />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : filtered ? (
            <EmptyState
              icon="search"
              title="No tasks match"
              message="Try another search or clear the filters."
              action={<Button label="Clear filters" onPress={clearFilters} />}
            />
          ) : (
            <EmptyState
              icon="check-square"
              title={projectId ? 'No tasks in this project yet' : 'No tasks yet'}
              message={
                projectId
                  ? 'Add the first task to start tracking progress.'
                  : 'Tasks from all your projects appear here.'
              }
              action={
                onCreate ? (
                  <Button label="New task" icon="plus" variant="primary" onPress={onCreate} />
                ) : undefined
              }
            />
          )
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: space.lg }} color={colors.primary} />
          ) : (
            <View style={{ height: 96 }} />
          )
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 64 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  notice: { paddingHorizontal: space.lg, paddingBottom: space.sm },
});
