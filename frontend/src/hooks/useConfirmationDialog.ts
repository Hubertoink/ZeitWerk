import { useState, useCallback } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'question';
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

interface ConfirmationState extends ConfirmationOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

export const useConfirmationDialog = () => {
  const [dialogState, setDialogState] = useState<ConfirmationState>({
    open: false,
    title: '',
    message: '',
    type: 'question',
    confirmText: 'Bestätigen',
    cancelText: 'Abbrechen',
    confirmColor: 'primary',
    resolve: null
  });

  const showConfirmation = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title: options.title,
        message: options.message,
        type: options.type || 'question',
        confirmText: options.confirmText || 'Bestätigen',
        cancelText: options.cancelText || 'Abbrechen',
        confirmColor: options.confirmColor || 'primary',
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(true);
    }
    setDialogState(prev => ({ ...prev, open: false, resolve: null }));
  }, [dialogState.resolve]);

  const handleCancel = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(false);
    }
    setDialogState(prev => ({ ...prev, open: false, resolve: null }));
  }, [dialogState.resolve]);

  return {
    showConfirmation,
    confirmationDialog: {
      open: dialogState.open,
      title: dialogState.title,
      message: dialogState.message,
      type: dialogState.type,
      confirmText: dialogState.confirmText,
      cancelText: dialogState.cancelText,
      confirmColor: dialogState.confirmColor,
      onConfirm: handleConfirm,
      onCancel: handleCancel
    }
  };
};

export default useConfirmationDialog;
