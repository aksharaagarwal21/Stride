import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

// Radix handles focus trapping, Escape, scroll locking and focus return for both overlays.

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/35 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[14px] border border-line bg-surface shadow-pop animate-pop-in focus:outline-none',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-ink-2">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  side?: 'left' | 'right';
  className?: string;
  hideHeader?: boolean;
}

/** Side drawer: task details on the right, navigation on the left for small screens. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  side = 'right',
  className,
  hideHeader,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed top-0 bottom-0 z-50 flex w-full flex-col bg-surface shadow-pop focus:outline-none',
            side === 'right'
              ? 'right-0 max-w-[480px] border-l border-line animate-slide-in'
              : 'left-0 max-w-[272px] border-r border-line',
            className,
          )}
        >
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {hideHeader ? (
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
          ) : (
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <Dialog.Title className="font-display text-base font-semibold">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close">
                  <X className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** "More actions" menu used on cards and table rows. */
export function ActionMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-44 rounded-[10px] border border-line bg-surface p-1 shadow-pop animate-pop-in"
          onClick={(event) => event.stopPropagation()}
        >
          {actions.map((action) => (
            <Menu.Item
              key={action.label}
              disabled={action.disabled}
              onSelect={action.onSelect}
              className={cn(
                'flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                action.danger
                  ? 'text-danger data-[highlighted]:bg-danger-soft'
                  : 'text-ink data-[highlighted]:bg-subtle',
              )}
            >
              {action.icon}
              {action.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
