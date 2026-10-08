import { useState, type ReactNode } from 'react';
import { errorMessage } from '../../lib/utils';
import { Button } from './button';
import { Modal } from './overlays';
import { InlineAlert } from './states';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
}

/** Destructive confirmation. Closes only after the server confirms; failures stay visible. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setError(null);
        onOpenChange(next);
      }}
      title={title}
      description={description}
    >
      <div className="flex flex-col gap-4 px-5 py-4">
        {error ? <InlineAlert>{error}</InlineAlert> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={pending}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
