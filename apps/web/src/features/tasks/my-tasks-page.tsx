import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Page } from '../../components/layout/page';
import { Button } from '../../components/ui/button';
import { TaskBrowser } from './task-browser';
import { TaskFormDialog } from './task-forms';

export function MyTasksPage() {
  const [creating, setCreating] = useState(false);
  return (
    <Page
      breadcrumbs={[{ label: 'My Tasks' }]}
      title="My Tasks"
      description="Every task across your projects."
      action={
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New task</span>
          <span className="sr-only sm:hidden">New task</span>
        </Button>
      }
    >
      <TaskBrowser showProject onCreate={() => setCreating(true)} />
      <TaskFormDialog open={creating} onOpenChange={setCreating} />
    </Page>
  );
}
