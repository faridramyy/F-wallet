// Closes a form dialog, asking first when it has unsaved changes.
// `confirm` comes from useNotifications().
export async function closeWithConfirm({ isDirty, confirm, onClose, noun }) {
  if (!isDirty) {
    onClose();
    return;
  }

  const discard = await confirm({
    title: "Discard changes?",
    description: `You have unsaved ${noun} changes. Are you sure you want to close?`,
    confirmText: "Discard changes",
    cancelText: "Keep editing",
    variant: "destructive",
  });

  if (discard) onClose();
}

// True when two plain form objects differ.
export const hasChanges = (current, initial) =>
  JSON.stringify(current) !== JSON.stringify(initial);
