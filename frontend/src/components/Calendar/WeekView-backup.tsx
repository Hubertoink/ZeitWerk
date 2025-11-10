import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  IconButton, 
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  ChevronLeft, 
  ChevronRight,
  Person as PersonIcon,
  Cancel as CancelIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setWeekDate, navigateWeek } from '../../store/slices/calendarSlice';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { fetchShiftTypes } from '../../store/slices/shiftTypeSlice';
import { fetchShifts, createShift, updateShift, deleteShift } from '../../store/slices/shiftSlice';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useSettings } from '../../contexts/SettingsContext';
import { Holiday, isHoliday, loadHolidaysForRange } from '../../utils/holidays';
import BulkCreateShiftForm from './BulkCreateShiftForm';

const WeekView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  const calendar = useAppSelector((state: any) => state.calendar);
  const { employees } = useAppSelector((state: any) => state.employees);
  const { shiftTypes } = useAppSelector((state: any) => state.shiftTypes);
  const { selectedOrganization } = useAppSelector((state: any) => state.organizations);
  const shiftsState = useAppSelector((state: any) => state.shifts);
  
  const currentDate = calendar?.weekDate ? new Date(calendar.weekDate) : new Date();
  const shifts = shiftsState?.shifts || [];

  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editShiftDialog, setEditShiftDialog] = useState({ open: false, shift: null as any });
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    newShift: any;
    existingShifts: any[];
    message: string;
  }>({ open: false, newShift: null, existingShifts: [], message: '' });
  const [bulkCreateDialog, setBulkCreateDialog] = useState({ 
    open: false, 
    employeeId: null as number | null, 
    date: null as string | null 
  });
  const [weekCopyDialog, setWeekCopyDialog] = useState({ open: false });

  useEffect(() => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const daysToShow = settings?.calendar?.weekViewDays || 7; // Fallback falls settings nicht geladen
    const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
    setWeekDays(days);

    // Lade Feiertage für die aktuelle Woche
    if (days.length > 0) {
      const firstDay = days[0];
      const lastDay = days[days.length - 1];
      
      loadHolidaysForRange(firstDay, lastDay, settings?.calendar?.holidayRegion)
        .then(holidaysData => {
          setHolidays(holidaysData);
        })
        .catch(error => {
          console.error('Fehler beim Laden der Feiertage:', error);
        });
    }
  }, [currentDate, settings?.calendar?.weekViewDays, settings?.calendar?.holidayRegion]);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchShiftTypes());
    dispatch(fetchShifts({}));
  }, [dispatch]);

  const handlePrevWeek = () => {
    dispatch(navigateWeek('prev'));
  };

  const handleNextWeek = () => {
    dispatch(navigateWeek('next'));
  };

  const handleToday = () => {
  dispatch(setWeekDate(new Date().toISOString()));
  };

  // Memoized shifts calculation for the entire week
  const weekShiftsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    
    employees.forEach((employee: any) => {
      weekDays.forEach(day => {
        const key = `${employee.id}-${day.toDateString()}`;
        const employeeShifts = shifts.filter((shift: any) => {
          const isCorrectEmployee = shift.employeeId === employee.id.toString();
          const isCorrectDay = isSameDay(new Date(shift.date), day);
          return isCorrectEmployee && isCorrectDay;
        });
        map.set(key, employeeShifts);
      });
    });
    
    return map;
  }, [shifts, employees, weekDays]);

  const getShiftsForEmployeeAndDay = useCallback((employeeId: number, day: Date) => {
    const key = `${employeeId}-${day.toDateString()}`;
    return weekShiftsMap.get(key) || [];
  }, [weekShiftsMap]);

  // Hilfsfunktion zur Konfliktprüfung
  const checkShiftConflicts = (newShiftData: any) => {
    const newShiftType = shiftTypes.find((st: any) => st.id === newShiftData.shiftTypeId);
    if (!newShiftType) return { hasConflict: false, conflicts: [] };

    // Finde existierende Schichten für diesen Mitarbeiter am gleichen Tag
    const existingShifts = shifts.filter((shift: any) => 
      (shift.employeeId || shift.employee_id)?.toString() === newShiftData.employeeId.toString() &&
      shift.date === newShiftData.date
    );

    if (existingShifts.length === 0) {
      return { hasConflict: false, conflicts: [] };
    }

    const conflicts = [];
    
    for (const existingShift of existingShifts) {
      const existingShiftType = shiftTypes.find((st: any) => 
        st.id.toString() === (existingShift.shiftTypeId || existingShift.shift_type_id)?.toString()
      );

      if (!existingShiftType) continue;

      // Zeitkonflikt-Prüfung
      const newStart = newShiftType.start_time;
      const newEnd = newShiftType.end_time;
      const existingStart = existingShiftType.start_time;
      const existingEnd = existingShiftType.end_time;

      // Einfache Zeitüberschneidung
      if (
        (newStart < existingEnd && newEnd > existingStart)
      ) {
        conflicts.push(existingShift);
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  };

  const createShiftWithData = async (shiftData: any) => {
    try {
      await dispatch(createShift(shiftData)).unwrap();
      setSnackbar({ 
        open: true, 
        message: 'Schicht erfolgreich erstellt', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Fehler beim Erstellen der Schicht:', error);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Erstellen der Schicht', 
        severity: 'error' 
      });
    }
  };

  const onShiftDrop = async (employeeId: number, date: Date, shiftTypeId: number) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    const newShiftData = {
      employeeId: employeeId.toString(),
      shiftTypeId: shiftTypeId.toString(),
      date: dateString,
      organizationId: selectedOrganization?.id?.toString() || '1'
    };

    // Prüfe auf Konflikte
    const conflictCheck = checkShiftConflicts(newShiftData);
    
    if (conflictCheck.hasConflict) {
      const conflictedShiftTypes = conflictCheck.conflicts.map((shift: any) => {
        const shiftType = shiftTypes.find((st: any) => 
          st.id.toString() === (shift.shiftTypeId || shift.shift_type_id)?.toString()
        );
        return shiftType?.name || 'Unbekannt';
      }).join(', ');

      const message = `Zeitkonflikt erkannt! Überschneidung mit: ${conflictedShiftTypes}`;
      
      setConflictDialog({
        open: true,
        newShift: newShiftData,
        existingShifts: conflictCheck.conflicts,
        message
      });
      return;
    }

    // Keine Konflikte, direkt erstellen
    await createShiftWithData(newShiftData);
  };

  const handleShiftClick = (shift: any) => {
    setEditShiftDialog({ open: true, shift });
  };

  const handleUpdateShift = async (updatedShift: any) => {
    try {
      await dispatch(updateShift(updatedShift)).unwrap();
      setEditShiftDialog({ open: false, shift: null });
      setSnackbar({ 
        open: true, 
        message: 'Schicht erfolgreich aktualisiert', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Schicht:', error);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Aktualisieren der Schicht', 
        severity: 'error' 
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    try {
      await dispatch(deleteShift(shiftId)).unwrap();
      
      // Schließe alle offenen Dialoge und setze States zurück
      setEditShiftDialog({ open: false, shift: null });
      setBulkCreateDialog({ open: false, employeeId: null, date: null });
      
      setSnackbar({ 
        open: true, 
        message: 'Schicht erfolgreich gelöscht', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Schicht:', error);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Löschen der Schicht', 
        severity: 'error' 
      });
    }
  };

  const handleBulkCreate = (employeeId: number, date: string) => {
    setBulkCreateDialog({ open: true, employeeId, date });
  };

  const handleBulkCreateSuccess = () => {
    setBulkCreateDialog({ open: false, employeeId: null, date: null });
    setSnackbar({ 
      open: true, 
      message: 'Schichten erfolgreich erstellt', 
      severity: 'success' 
    });
  };

  const getHolidayForDay = (day: Date): Holiday | null => {
    return holidays.find(holiday => isSameDay(new Date(holiday.date), day)) || null;
  };

  const copyWeek = async () => {
    try {
      const weekStart = weekDays[0];
      const nextWeekStart = addDays(weekStart, 7);
      
      const shiftsToCreate = [];
      
      for (const shift of shifts) {
        const shiftDate = new Date(shift.date);
        if (weekDays.some(day => isSameDay(shiftDate, day))) {
          const dayOffset = weekDays.findIndex(day => isSameDay(shiftDate, day));
          const newDate = addDays(nextWeekStart, dayOffset);
          
          shiftsToCreate.push({
            employeeId: shift.employeeId || shift.employee_id,
            shiftTypeId: shift.shiftTypeId || shift.shift_type_id,
            date: format(newDate, 'yyyy-MM-dd'),
            organizationId: selectedOrganization?.id?.toString() || '1'
          });
        }
      }
      
      for (const shiftData of shiftsToCreate) {
        await dispatch(createShift(shiftData)).unwrap();
      }
      
      setWeekCopyDialog({ open: false });
      setSnackbar({ 
        open: true, 
        message: `${shiftsToCreate.length} Schichten für die nächste Woche erstellt`, 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Fehler beim Kopieren der Woche:', error);
      setSnackbar({ 
        open: true, 
        message: 'Fehler beim Kopieren der Woche', 
        severity: 'error' 
      });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handlePrevWeek}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="h5" sx={{ minWidth: 200, textAlign: 'center' }}>
            {weekDays.length > 0 && (
              `${format(weekDays[0], 'dd.MM.yyyy', { locale: de })} - ${format(weekDays[weekDays.length - 1], 'dd.MM.yyyy', { locale: de })}`
            )}
          </Typography>
          <IconButton onClick={handleNextWeek}>
            <ChevronRight />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={handleToday}>
            Heute
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<CopyIcon />}
            onClick={() => setWeekCopyDialog({ open: true })}
          >
            Woche kopieren
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 200 }}>Mitarbeiter</TableCell>
              {weekDays.map((day, index) => {
                const holiday = getHolidayForDay(day);
                return (
                  <TableCell 
                    key={index} 
                    align="center" 
                    sx={{ 
                      minWidth: 120,
                      backgroundColor: holiday ? 'error.light' : 'inherit',
                      color: holiday ? 'error.contrastText' : 'inherit'
                    }}
                  >
                    <Typography variant="subtitle2">
                      {format(day, 'EEE', { locale: de })}
                    </Typography>
                    <Typography variant="body2">
                      {format(day, 'dd.MM', { locale: de })}
                    </Typography>
                    {holiday && (
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
                        {holiday.name}
                      </Typography>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((employee: any) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {employee.first_name} {employee.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {employee.position}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                {weekDays.map((day, dayIndex) => {
                  const dayShifts = getShiftsForEmployeeAndDay(employee.id, day);
                  return (
                    <TableCell 
                      key={dayIndex} 
                      align="center"
                      sx={{ 
                        verticalAlign: 'top',
                        p: 1,
                        minHeight: 80
                      }}
                    >
                      <Box 
                        sx={{ 
                          minHeight: 60,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          cursor: 'pointer'
                        }}
                        onClick={() => handleBulkCreate(employee.id, format(day, 'yyyy-MM-dd'))}
                      >
                        {dayShifts.map((shift: any) => {
                          const shiftType = shiftTypes.find((st: any) => 
                            st.id.toString() === (shift.shiftTypeId || shift.shift_type_id)?.toString()
                          );
                          
                          return (
                            <Chip
                              key={shift.id}
                              label={
                                <Box>
                                  <Typography variant="caption" sx={{ display: 'block' }}>
                                    {shiftType?.name || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                                    {shiftType?.start_time} - {shiftType?.end_time}
                                  </Typography>
                                </Box>
                              }
                              size="small"
                              sx={{
                                height: 'auto',
                                '& .MuiChip-label': {
                                  display: 'block',
                                  whiteSpace: 'normal',
                                  py: 0.5
                                },
                                backgroundColor: shiftType?.color || '#1976d2',
                                color: 'white',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShiftClick(shift);
                              }}
                              deleteIcon={<CancelIcon />}
                              onDelete={(e) => {
                                e.stopPropagation();
                                handleDeleteShift(shift.id.toString());
                              }}
                            />
                          );
                        })}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Conflict Dialog */}
      <Dialog 
        open={conflictDialog.open} 
        onClose={() => setConflictDialog(prev => ({ ...prev, open: false }))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Schichtkonflikt erkannt</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {conflictDialog.message}
          </Typography>
          {conflictDialog.existingShifts.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Existierende Schichten:
              </Typography>
              {conflictDialog.existingShifts.map((shift: any, index: number) => {
                const shiftType = shiftTypes.find((st: any) => 
                  st.id.toString() === (shift.shiftTypeId || shift.shift_type_id)?.toString()
                );
                
                return (
                  <Typography key={index} variant="body2">
                    • {shiftType?.name} ({shiftType?.start_time} - {shiftType?.end_time})
                  </Typography>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialog(prev => ({ ...prev, open: false }))}>
            Abbrechen
          </Button>
          <Button 
            variant="contained" 
            color="warning"
            onClick={async () => {
              try {
                for (const existingShift of conflictDialog.existingShifts) {
                  await dispatch(deleteShift(existingShift.id.toString())).unwrap();
                }
                await createShiftWithData(conflictDialog.newShift);
                setConflictDialog(prev => ({ ...prev, open: false }));
              } catch (error) {
                console.error('Fehler beim Ersetzen der Schichten:', error);
                setSnackbar({ 
                  open: true, 
                  message: 'Fehler beim Ersetzen der Schichten', 
                  severity: 'error' 
                });
              }
            }}
          >
            Ersetzen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Week Copy Dialog */}
      <Dialog 
        open={weekCopyDialog.open} 
        onClose={() => setWeekCopyDialog({ open: false })}
      >
        <DialogTitle>Woche kopieren</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie alle Schichten dieser Woche in die nächste Woche kopieren?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWeekCopyDialog({ open: false })}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={copyWeek}>
            Kopieren
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Shift Dialog */}
      <Dialog 
        open={editShiftDialog.open} 
        onClose={() => setEditShiftDialog({ open: false, shift: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Schicht bearbeiten</DialogTitle>
        <DialogContent>
          {editShiftDialog.shift && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="Datum"
                type="date"
                value={editShiftDialog.shift.date || ''}
                onChange={(e) => setEditShiftDialog(prev => ({
                  ...prev,
                  shift: { ...prev.shift, date: e.target.value }
                }))}
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditShiftDialog({ open: false, shift: null })}>
            Abbrechen
          </Button>
          <Button 
            variant="contained" 
            onClick={() => editShiftDialog.shift && handleUpdateShift(editShiftDialog.shift)}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Create Dialog */}
      <BulkCreateShiftForm
        open={bulkCreateDialog.open}
        onClose={() => setBulkCreateDialog({ open: false, employeeId: null, date: null })}
        employeeId={bulkCreateDialog.employeeId}
        date={bulkCreateDialog.date}
        onSuccess={handleBulkCreateSuccess}
        onShiftDrop={onShiftDrop}
      />

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WeekView;
