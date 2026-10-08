import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type SortOrder,
  type TaskPriority,
  type TaskSortField,
  type TaskStatus,
} from '@stride/shared';
import { colors, radius, space, type } from '../theme';
import { Button, Chip, SearchField } from './ui';

export interface TaskFilterState {
  status?: TaskStatus;
  priority?: TaskPriority;
  sort: `${TaskSortField}:${SortOrder}`;
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = { sort: 'dueDate:asc' };

const SORTS: { value: TaskFilterState['sort']; label: string }[] = [
  { value: 'dueDate:asc', label: 'Due soonest' },
  { value: 'dueDate:desc', label: 'Due latest' },
  { value: 'priority:desc', label: 'Highest priority' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'createdAt:desc', label: 'Newest' },
];

/** Compact bottom sheet holding every task filter; status also has quick chips on screen. */
function FilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: TaskFilterState;
  onApply: (value: TaskFilterState) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setDraft(value)}
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close filters" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.handle} />
        <Text style={type.heading}>Filter tasks</Text>
        <ScrollView contentContainerStyle={{ gap: space.xl, paddingVertical: space.lg }}>
          <View style={styles.group}>
            <Text style={type.label}>Status</Text>
            <View style={styles.chips}>
              <Chip
                label="Any"
                selected={!draft.status}
                onPress={() => setDraft({ ...draft, status: undefined })}
              />
              {TASK_STATUSES.map((status) => (
                <Chip
                  key={status}
                  label={TASK_STATUS_LABELS[status]}
                  selected={draft.status === status}
                  onPress={() => setDraft({ ...draft, status })}
                />
              ))}
            </View>
          </View>
          <View style={styles.group}>
            <Text style={type.label}>Priority</Text>
            <View style={styles.chips}>
              <Chip
                label="Any"
                selected={!draft.priority}
                onPress={() => setDraft({ ...draft, priority: undefined })}
              />
              {TASK_PRIORITIES.map((priority) => (
                <Chip
                  key={priority}
                  label={TASK_PRIORITY_LABELS[priority]}
                  selected={draft.priority === priority}
                  onPress={() => setDraft({ ...draft, priority })}
                />
              ))}
            </View>
          </View>
          <View style={styles.group}>
            <Text style={type.label}>Sort by</Text>
            <View style={styles.chips}>
              {SORTS.map((sort) => (
                <Chip
                  key={sort.value}
                  label={sort.label}
                  selected={draft.sort === sort.value}
                  onPress={() => setDraft({ ...draft, sort: sort.value })}
                />
              ))}
            </View>
          </View>
        </ScrollView>
        <View style={styles.actions}>
          <Button
            label="Reset"
            onPress={() => setDraft(DEFAULT_TASK_FILTERS)}
            style={{ flex: 1 }}
          />
          <Button
            label="Show tasks"
            variant="primary"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
            style={{ flex: 2 }}
          />
        </View>
      </View>
    </Modal>
  );
}

/** Search box, filter button, quick status chips and active-filter summary for task lists. */
export function TaskFilterBar({
  search,
  onSearch,
  filters,
  onFilters,
}: {
  search: string;
  onSearch: (value: string) => void;
  filters: TaskFilterState;
  onFilters: (value: TaskFilterState) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount =
    (filters.priority ? 1 : 0) + (filters.sort !== DEFAULT_TASK_FILTERS.sort ? 1 : 0);
  return (
    <View style={styles.bar}>
      <View style={styles.searchRow}>
        <SearchField value={search} onChangeText={onSearch} placeholder="Search tasks" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Filters${activeCount ? `, ${activeCount} active` : ''}`}
          onPress={() => setSheetOpen(true)}
          style={({ pressed }) => [
            styles.filterButton,
            activeCount > 0 && styles.filterButtonActive,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.filterLabel, activeCount > 0 && { color: colors.primaryStrong }]}>
            Filters{activeCount ? ` · ${activeCount}` : ''}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          label="All"
          selected={!filters.status}
          onPress={() => onFilters({ ...filters, status: undefined })}
        />
        {TASK_STATUSES.map((status) => (
          <Chip
            key={status}
            label={TASK_STATUS_LABELS[status]}
            selected={filters.status === status}
            onPress={() => onFilters({ ...filters, status })}
          />
        ))}
        {filters.priority ? (
          <Chip
            icon="x"
            label={`${TASK_PRIORITY_LABELS[filters.priority]} priority`}
            selected
            onPress={() => onFilters({ ...filters, priority: undefined })}
          />
        ) : null}
      </ScrollView>
      <FilterSheet
        visible={sheetOpen}
        value={filters}
        onApply={onFilters}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

export function toTaskQuery(filters: TaskFilterState) {
  const [sort, order] = filters.sort.split(':') as [TaskSortField, SortOrder];
  return { status: filters.status, priority: filters.priority, sort, order };
}

const styles = StyleSheet.create({
  bar: {
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  searchRow: { flexDirection: 'row', gap: space.sm },
  filterButton: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  filterButtonActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(23,32,51,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: space.md,
  },
  group: { gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm },
});
