import { router, useLocalSearchParams } from 'expo-router';
import { FormScreen } from '../../../components/form-screen';
import { TaskForm } from '../../../components/forms';
import { useCreateTask } from '../../../lib/queries';

export default function NewTaskScreen() {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const createTask = useCreateTask();
  return (
    <FormScreen>
      <TaskForm
        initial={{
          projectId: projectId ?? '',
          name: '',
          description: '',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: '',
        }}
        chooseProject={!projectId}
        submitLabel="Create task"
        onSubmit={async (values) => {
          await createTask.mutateAsync(values);
          router.back();
        }}
      />
    </FormScreen>
  );
}
