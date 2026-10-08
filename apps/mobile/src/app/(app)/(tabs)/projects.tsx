import { useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES, type ProjectStatus } from '@stride/shared';
import { Fab } from '../../../components/fab';
import { LastUpdated, OfflineBanner } from '../../../components/network';
import { ProjectRow } from '../../../components/rows';
import {
  Button,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  SearchField,
} from '../../../components/ui';
import { useDebouncedValue } from '../../../lib/forms';
import { useProjectList } from '../../../lib/queries';
import { colors, space, type } from '../../../theme';

export default function ProjectsScreen() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = useState<ProjectStatus | undefined>();
  const list = useProjectList({
    search: debouncedSearch || undefined,
    status,
    sort: 'createdAt',
    order: 'desc',
  });
  const [refreshing, setRefreshing] = useState(false);

  const projects = list.data?.pages.flatMap((page) => page.data) ?? [];
  const total = list.data?.pages[0]?.meta.total ?? 0;
  const filtered = Boolean(debouncedSearch || status);

  async function refresh() {
    setRefreshing(true);
    try {
      await list.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.container}>
      <OfflineBanner hasData={projects.length > 0} />
      <FlatList
        data={projects}
        keyExtractor={(project) => project.id}
        renderItem={({ item }) => <ProjectRow project={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ flexGrow: 1 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchField value={search} onChangeText={setSearch} placeholder="Search projects" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <Chip label="All" selected={!status} onPress={() => setStatus(undefined)} />
              {PROJECT_STATUSES.map((value) => (
                <Chip
                  key={value}
                  label={PROJECT_STATUS_LABELS[value]}
                  selected={status === value}
                  onPress={() => setStatus(value)}
                />
              ))}
            </ScrollView>
            {list.isError && projects.length > 0 ? (
              <Notice
                tone="warning"
                message={`Couldn't refresh: ${list.error.message} Showing earlier data.`}
              />
            ) : null}
            {list.data ? (
              <View style={styles.summary}>
                <Text style={type.small}>
                  {total} {total === 1 ? 'project' : 'projects'}
                  {filtered ? ' found' : ''}
                </Text>
                <LastUpdated at={list.dataUpdatedAt} />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          list.isPending ? (
            <LoadingState label="Loading projects" />
          ) : list.isError ? (
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          ) : filtered ? (
            <EmptyState
              icon="search"
              title="No projects match"
              message="Try another name or status."
              action={
                <Button
                  label="Clear filters"
                  onPress={() => {
                    setSearch('');
                    setStatus(undefined);
                  }}
                />
              }
            />
          ) : (
            <EmptyState
              icon="folder-plus"
              title="No projects yet"
              message="Projects group related tasks and show progress."
              action={
                <Button
                  label="Create your first project"
                  icon="plus"
                  variant="primary"
                  onPress={() => router.push('/projects/new')}
                />
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
      <Fab label="New project" onPress={() => router.push('/projects/new')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: {
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  chips: { flexDirection: 'row', gap: space.sm },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginLeft: space.lg,
  },
});
