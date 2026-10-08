import { router } from 'expo-router';
import { localToday } from '@stride/shared';
import { FormScreen } from '../../../components/form-screen';
import { ProjectForm } from '../../../components/forms';
import { useCreateProject } from '../../../lib/queries';

export default function NewProjectScreen() {
  const createProject = useCreateProject();
  return (
    <FormScreen>
      <ProjectForm
        initial={{
          name: '',
          description: '',
          status: 'NOT_STARTED',
          startDate: localToday(),
          endDate: '',
        }}
        submitLabel="Create project"
        onSubmit={async (values) => {
          const project = await createProject.mutateAsync(values);
          router.replace({ pathname: '/projects/[id]', params: { id: project.id } });
        }}
      />
    </FormScreen>
  );
}
