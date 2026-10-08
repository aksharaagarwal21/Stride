import { router } from 'expo-router';
import { View } from 'react-native';
import { Fab } from '../../../components/fab';
import { TaskListView } from '../../../components/task-list';

export default function TasksScreen() {
  const create = () => router.push('/tasks/new');
  return (
    <View style={{ flex: 1 }}>
      <TaskListView showProject onCreate={create} />
      <Fab label="New task" onPress={create} />
    </View>
  );
}
