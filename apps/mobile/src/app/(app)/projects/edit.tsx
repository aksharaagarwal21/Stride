import { router, useLocalSearchParams } from 'expo-router';
import { FormScreen } from '../../../components/form-screen';
import { ProjectForm } from '../../../components/forms';
import { ErrorState, LoadingState } from '../../../components/ui';
import { useProject, useUpdateProject } from '../../../lib/queries';

export default function EditProjectScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const project = useProject(id);
  const updateProject = useUpdateProject();

  if (project.isPending) return <LoadingState label="Loading project" />;
  if (!project.data)
    return <ErrorState error={project.error} onRetry={() => void project.refetch()} />;

  const { name, description, status, startDate, endDate } = project.data;
  return (
    <FormScreen>
      <ProjectForm
        initial={{ name, description, status, startDate, endDate }}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await updateProject.mutateAsync({ id, input: values });
          router.back();
        }}
      />
    </FormScreen>
  );
}
