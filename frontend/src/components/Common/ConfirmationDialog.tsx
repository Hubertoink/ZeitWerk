import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Help as HelpIcon
} from '@mui/icons-material';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'info' | 'warning' | 'error' | 'question';
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  type = 'question',
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  confirmColor = 'primary'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <InfoIcon color="info" sx={{ fontSize: 28 }} />;
      case 'warning':
        return <WarningIcon color="warning" sx={{ fontSize: 28 }} />;
      case 'error':
        return <ErrorIcon color="error" sx={{ fontSize: 28 }} />;
      case 'question':
      default:
        return <HelpIcon color="primary" sx={{ fontSize: 28 }} />;
    }
  };

  const getIconBackgroundColor = () => {
    switch (type) {
      case 'info':
        return 'rgba(2, 136, 209, 0.1)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.1)';
      case 'error':
        return 'rgba(211, 47, 47, 0.1)';
      case 'question':
      default:
        return 'rgba(103, 80, 164, 0.1)';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backdropFilter: 'blur(24px)',
          boxShadow: (theme) => theme.palette.mode === 'dark'
            ? '0 20px 60px rgba(0, 0, 0, 0.7)'
            : '0 20px 60px rgba(103, 80, 164, 0.25)',
        }
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: getIconBackgroundColor(),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {getIcon()}
            </Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          <IconButton 
            onClick={onCancel} 
            size="small"
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ 
            lineHeight: 1.6,
            ml: 8 // Align with icon + title
          }}
        >
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          sx={{
            minWidth: 100,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={confirmColor}
          sx={{
            minWidth: 100,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: (theme) => theme.palette.mode === 'dark'
              ? '0 4px 15px rgba(208, 188, 255, 0.3)'
              : '0 4px 15px rgba(103, 80, 164, 0.3)',
            '&:hover': {
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 6px 20px rgba(208, 188, 255, 0.4)'
                : '0 6px 20px rgba(103, 80, 164, 0.4)',
              transform: 'translateY(-1px)'
            }
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
