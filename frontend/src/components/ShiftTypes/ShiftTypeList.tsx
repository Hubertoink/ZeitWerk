import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Grid,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchShiftTypes, createShiftType, updateShiftType, deleteShiftType } from '../../store/slices/shiftTypeSlice';
import ConfirmationDialog from '../Common/ConfirmationDialog';
import { useConfirmationDialog } from '../../hooks/useConfirmationDialog';

interface ShiftTypeFormData {
  name: string;
  description: string;
  color: string;
  startTime: string;
  endTime: string;
  isFlexible: boolean;
  isAllDay: boolean;
  countsTowardHours: boolean;
}

// Helper functions for time and breaks
function parseTimeToMinutes(t?: string): number {
  if (!t || typeof t !== 'string') return 0;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  const h = parseInt(m[1], 10) || 0;
  const min = parseInt(m[2], 10) || 0;
  return h * 60 + min;
}

function applyGermanBreaks(totalMinutes: number): { breakMinutes: number; netMinutes: number } {
  let breakMinutes = 0;
  if (totalMinutes > 9 * 60) breakMinutes = 45;
  else if (totalMinutes > 6 * 60) breakMinutes = 30;
  const net = Math.max(0, totalMinutes - breakMinutes);
  return { breakMinutes, netMinutes: net };
}

function minutesToHM(mins: number): string {
  const n = Math.max(0, mins);
  const h = Math.floor(n / 60);
  const m = n % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

const ShiftTypeList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { shiftTypes, error } = useAppSelector(state => state.shiftTypes);
  // const { user } = useAppSelector(state => state.auth);

  const [open, setOpen] = useState(false);
  const [editingShiftType, setEditingShiftType] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Custom confirmation dialog
  const { showConfirmation, confirmationDialog } = useConfirmationDialog();
  
  // Ref für Auto-Focus auf erstes Eingabefeld
  const firstInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ShiftTypeFormData>({
    name: '',
    description: '',
    color: '#1976d2',
    startTime: '09:00',
    endTime: '17:00',
    isFlexible: false,
    isAllDay: false,
    countsTowardHours: true
  });

  useEffect(() => {
    dispatch(fetchShiftTypes());
  }, [dispatch]);

  const handleOpenDialog = (shiftType?: any) => {
    if (shiftType) {
      setEditingShiftType(shiftType);
      setFormData({
        name: shiftType.name || '',
        description: shiftType.description || '',
        color: shiftType.color || '#1976d2',
        startTime: shiftType.startTime || '09:00',
        endTime: shiftType.endTime || '17:00',
        isFlexible: shiftType.isFlexible || false,
        isAllDay: shiftType.isAllDay || false,
        countsTowardHours: shiftType.countsTowardHours !== undefined ? shiftType.countsTowardHours : (shiftType.category === 'absence' ? false : true)
      });
    } else {
      setEditingShiftType(null);
      setFormData({
        name: '',
        description: '',
        color: '#1976d2',
        startTime: '09:00',
        endTime: '17:00',
        isFlexible: false,
        isAllDay: false,
        countsTowardHours: true
      });
    }
    setOpen(true);
    
    // Aggressive Auto-Focus nach Dialog-Öffnung
    setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      } else {
        // Fallback: Focus auf erstes verfügbares Input-Element
        const firstInput = document.querySelector('input[type="text"], textarea') as HTMLElement;
        firstInput?.focus();
      }
    }, 100);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingShiftType(null);
  };

  const handleInputChange = (field: keyof ShiftTypeFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSwitchChange = (field: keyof ShiftTypeFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const checked = event.target.checked;
    setFormData(prev => {
      let next = { ...prev, [field]: checked } as ShiftTypeFormData;
      if (field === 'isAllDay') {
        next = {
          ...next,
          startTime: '00:00',
          endTime: '23:59',
          isFlexible: false,
          countsTowardHours: checked ? false : prev.countsTowardHours
        };
      }
      if (field === 'isFlexible' && checked) {
        // Flexible Schichten definieren Zeiten beim Erstellen; entkoppel von AllDay
        next = { ...next, isAllDay: false };
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      // Validierung: Name ist erforderlich
      if (!formData.name || !formData.name.trim()) {
        setSnackbar({ open: true, message: 'Name ist erforderlich', severity: 'error' });
        return;
      }

      // Convert frontend format to the correct API format
      const apiData = {
        name: formData.name.trim(),
        description: formData.description,
        color: formData.color,
        startTime: (formData.isAllDay || formData.isFlexible) ? '00:00' : formData.startTime,
        endTime: (formData.isAllDay || formData.isFlexible) ? '23:59' : formData.endTime,
        isFlexible: formData.isFlexible,
        isAllDay: formData.isAllDay,
        countsTowardHours: formData.countsTowardHours,
        organizationId: '1', // Richtig: organizationId statt organizationUnitId
        category: 'regular' as const, // Standard-Kategorie
        priority: 1, // Standard-Priorität
        isActive: true
      };

      if (editingShiftType) {
        await dispatch(updateShiftType({ id: editingShiftType.id, data: apiData })).unwrap();
        setSnackbar({ open: true, message: 'Schichttyp erfolgreich aktualisiert', severity: 'success' });
      } else {
        await dispatch(createShiftType(apiData)).unwrap();
        setSnackbar({ open: true, message: 'Schichttyp erfolgreich erstellt', severity: 'success' });
      }
      
      // Reset form data BEFORE closing to prevent change detection
      setFormData({
        name: '',
        description: '',
        color: '#1976d2',
        startTime: '09:00',
        endTime: '17:00',
        isFlexible: false,
        isAllDay: false,
        countsTowardHours: true
      });
      setEditingShiftType(null);
      setOpen(false);
    } catch (error: any) {
      console.error('ShiftType save error:', error);
      setSnackbar({ open: true, message: error.message || 'Fehler beim Speichern', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmation({
      title: 'Schichttyp löschen',
      message: 'Möchten Sie diesen Schichttyp wirklich löschen?',
      type: 'warning',
      confirmText: 'Löschen',
      confirmColor: 'error'
    });
    
    if (confirmed) {
      try {
        await dispatch(deleteShiftType(id)).unwrap();
        setSnackbar({ open: true, message: 'Schichttyp erfolgreich gelöscht', severity: 'success' });
      } catch (error: any) {
        setSnackbar({ open: true, message: error.message || 'Fehler beim Löschen', severity: 'error' });
      }
    }
  };

  const predefinedColors = [
    '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', 
    '#d32f2f', '#0288d1', '#388e3c', '#f57c00'
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Schichttypen
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Neuer Schichttyp
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Karten-Ansicht für bessere Übersicht */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {shiftTypes.map((shiftType) => (
          <Grid item xs={12} sm={6} md={4} key={shiftType.id}>
            <Card sx={{ 
              height: '100%',
              // Hervorhebung für Urlaub/Krankheit
              ...((['Urlaub', 'Krankheit'].includes(shiftType.name)) && {
                border: '2px solid',
                borderColor: shiftType.name === 'Urlaub' ? '#4CAF50' : '#F44336',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                }
              })
            }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Chip 
                    label={
                      ['Urlaub', 'Krankheit'].includes(shiftType.name) 
                        ? `🔒 ${shiftType.name}` 
                        : shiftType.name
                    }
                    sx={(theme) => ({ 
                      backgroundColor: shiftType.color,
                      color: theme.palette.getContrastText(shiftType.color),
                      fontWeight: 'bold'
                    })}
                  />
                  <Box>
                    {/* Urlaub und Krankheit können nicht bearbeitet werden */}
                    {!['Urlaub', 'Krankheit'].includes(shiftType.name) && (
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(shiftType)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {/* Urlaub und Krankheit können nicht gelöscht werden */}
                    {!['Urlaub', 'Krankheit'].includes(shiftType.name) && (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(shiftType.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {shiftType.description || 'Keine Beschreibung'}
                </Typography>
                
                <Box display="flex" alignItems="center" gap={1}>
                  <TimeIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {shiftType.isAllDay ? 'Ganztägig' : (shiftType.isFlexible 
                      ? 'Flexible Zeiten' 
                      : `${shiftType.startTime || 'N/A'} - ${shiftType.endTime || 'N/A'}`)}
                  </Typography>
                </Box>
                {/* Break/Net info for fixed-time non-all-day types */}
                {!shiftType.isAllDay && !shiftType.isFlexible && (shiftType.startTime && shiftType.endTime) && (
                  (() => {
                    const s = parseTimeToMinutes(shiftType.startTime);
                    const e = parseTimeToMinutes(shiftType.endTime);
                    const gross = Math.max(0, e - s);
                    const { breakMinutes, netMinutes } = applyGermanBreaks(gross);
                    return (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Pause: {breakMinutes} Min · Netto: {minutesToHM(netMinutes)}
                      </Typography>
                    );
                  })()
                )}
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {shiftType.isAllDay && (
                    <Chip
                      size="small"
                      label="Ganztägig"
                      color="info"
                      variant="filled"
                      sx={(theme) => ({
                        bgcolor: theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.main,
                        color: theme.palette.getContrastText(
                          theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.main
                        ),
                        fontWeight: 600
                      })}
                    />
                  )}
                  {shiftType.countsTowardHours === false && (
                    <Chip
                      size="small"
                      label="Zählt nicht zur Arbeitszeit"
                      color="warning"
                      variant="filled"
                      sx={(theme) => ({
                        bgcolor: theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.warning.main,
                        color: theme.palette.getContrastText(
                          theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.warning.main
                        ),
                        fontWeight: 600
                      })}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabellen-Ansicht */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Beschreibung</TableCell>
              <TableCell>Farbe</TableCell>
              <TableCell>Arbeitszeiten</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shiftTypes.map((shiftType) => (
              <TableRow key={shiftType.id}>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {shiftType.name}
                  </Typography>
                </TableCell>
                <TableCell>{shiftType.description || '-'}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        backgroundColor: shiftType.color,
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                      }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <TimeIcon fontSize="small" color="action" />
                    {shiftType.isAllDay ? 'Ganztägig' : (shiftType.isFlexible 
                      ? 'Flexible Zeiten' 
                      : `${shiftType.startTime || 'N/A'} - ${shiftType.endTime || 'N/A'}`)}
                  </Box>
                  {!shiftType.isAllDay && !shiftType.isFlexible && (shiftType.startTime && shiftType.endTime) && (
                    (() => {
                      const s = parseTimeToMinutes(shiftType.startTime);
                      const e = parseTimeToMinutes(shiftType.endTime);
                      const gross = Math.max(0, e - s);
                      const { breakMinutes, netMinutes } = applyGermanBreaks(gross);
                      return (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Pause: {breakMinutes} Min · Netto: {minutesToHM(netMinutes)}
                        </Typography>
                      );
                    })()
                  )}
                  <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {shiftType.isAllDay && (
                      <Chip
                        size="small"
                        label="Ganztägig"
                        color="info"
                        variant="filled"
                        sx={(theme) => ({
                          bgcolor: theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.main,
                          color: theme.palette.getContrastText(
                            theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.main
                          ),
                          fontWeight: 600
                        })}
                      />
                    )}
                    {shiftType.countsTowardHours === false && (
                      <Chip
                        size="small"
                        label="Zählt nicht zur Arbeitszeit"
                        color="warning"
                        variant="filled"
                        sx={(theme) => ({
                          bgcolor: theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.warning.main,
                          color: theme.palette.getContrastText(
                            theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.warning.main
                          ),
                          fontWeight: 600
                        })}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    {/* Urlaub und Krankheit können nicht bearbeitet werden */}
                    {!['Urlaub', 'Krankheit'].includes(shiftType.name) && (
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(shiftType)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {/* Urlaub und Krankheit können nicht gelöscht werden */}
                    {!['Urlaub', 'Krankheit'].includes(shiftType.name) && (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(shiftType.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog für Schichttyp erstellen/bearbeiten */}
      <Dialog 
        open={open} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        // Fokus-Management für Dialog
        disableAutoFocus={false}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
      >
        <DialogTitle>
          {editingShiftType ? 'Schichttyp bearbeiten' : 'Neuer Schichttyp'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              inputRef={firstInputRef} // Ref für Auto-Focus
              autoFocus // Material-UI AutoFocus
              label="Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              required
              fullWidth
              placeholder="z.B. Frühdienst, Spätdienst, Nachtdienst"
            />
            
            <TextField
              label="Beschreibung"
              value={formData.description}
              onChange={handleInputChange('description')}
              fullWidth
              multiline
              rows={2}
              placeholder="Beschreibung des Schichttyps..."
            />
            
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Farbe
              </Typography>
              <Box display="flex" gap={1} mb={2}>
                {predefinedColors.map(color => (
                  <Box
                    key={color}
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: color,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: formData.color === color ? '3px solid #000' : '1px solid #ccc',
                      '&:hover': { transform: 'scale(1.1)' }
                    }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </Box>
              <TextField
                label="Benutzerdefinierte Farbe"
                type="color"
                value={formData.color}
                onChange={handleInputChange('color')}
                fullWidth
                sx={{ '& input': { height: '40px' } }}
              />
            </Box>
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isFlexible}
                  onChange={handleSwitchChange('isFlexible')}
                />
              }
              label="Flexible Schicht (Zeiten werden bei der Schichterstellung festgelegt)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isAllDay}
                  onChange={handleSwitchChange('isAllDay')}
                />
              }
              label="Ganztägig (zählt nicht zur Arbeitszeit)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.countsTowardHours}
                  onChange={handleSwitchChange('countsTowardHours')}
                  disabled={formData.isAllDay || (editingShiftType && (editingShiftType.name === 'Urlaub' || editingShiftType.name === 'Krankheit'))}
                />
              }
              label="Zählt zur Arbeitszeit"
            />
            
            {!formData.isFlexible && !formData.isAllDay && (
              <Box display="flex" gap={2}>
                <TextField
                  label="Startzeit"
                  type="time"
                  value={formData.startTime}
                  onChange={handleInputChange('startTime')}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Endzeit"
                  type="time"
                  value={formData.endTime}
                  onChange={handleInputChange('endTime')}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            {/* Live summary of gross/break/net when fixed times */}
            {!formData.isFlexible && !formData.isAllDay && (
              (() => {
                const start = parseTimeToMinutes(formData.startTime);
                const end = parseTimeToMinutes(formData.endTime);
                const gross = Math.max(0, end - start);
                const { breakMinutes, netMinutes } = applyGermanBreaks(gross);
                return (
                  <Box sx={{
                    mt: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    gap: 2,
                    flexWrap: 'wrap'
                  }}>
                    <Typography variant="caption">Brutto: {minutesToHM(gross)} Std</Typography>
                    <Typography variant="caption">Pause: {breakMinutes} Min</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>Netto: {minutesToHM(netMinutes)} Std</Typography>
                  </Box>
                );
              })()
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingShiftType ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Custom Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmationDialog.open}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        type={confirmationDialog.type}
        confirmText={confirmationDialog.confirmText}
        cancelText={confirmationDialog.cancelText}
        confirmColor={confirmationDialog.confirmColor}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={confirmationDialog.onCancel}
      />
    </Box>
  );
};

export default ShiftTypeList;
