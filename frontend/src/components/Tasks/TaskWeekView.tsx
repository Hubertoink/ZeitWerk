import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronLeft,
  ChevronRight,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  DeleteOutline as DeleteOutlineIcon,
  FileDownload as FileDownloadIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { useSettings } from '../../contexts/SettingsContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { navigateWeek, setWeekDate } from '../../store/slices/calendarSlice';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { createTask, deleteTask, fetchTasks, updateTask } from '../../store/slices/taskSlice';
import { createTaskType, deleteTaskType, fetchTaskTypes } from '../../store/slices/taskTypeSlice';
import { buildWeekExcelFromTasks, saveWeekExcel } from '../../utils/excelExport';

function parseLocalEmployeeDate(value?: string): Date | null {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function isEmployeeActiveOnDate(employee: any, date: Date): boolean {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hireDate = parseLocalEmployeeDate(employee?.hireDate);
  const exitDate = parseLocalEmployeeDate(employee?.exitDate);

  if (hireDate && day < hireDate) return false;
  if (exitDate && day > exitDate) return false;

  return true;
}

function getEmployeeInactiveReason(employee: any, date: Date): string | null {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hireDate = parseLocalEmployeeDate(employee?.hireDate);
  const exitDate = parseLocalEmployeeDate(employee?.exitDate);

  if (hireDate && day < hireDate) return 'Noch nicht eingetreten';
  if (exitDate && day > exitDate) return 'Bereits ausgetreten';

  return null;
}

const TaskWeekView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings, updateSettings } = useSettings();
  const calendar = useAppSelector((state: any) => state.calendar);
  const { employees } = useAppSelector((state: any) => state.employees);
  const { selectedOrganization } = useAppSelector((state: any) => state.organizations);
  const { taskTypes } = useAppSelector((state: any) => state.taskTypes);
  const { tasks } = useAppSelector((state: any) => state.tasks);

  const currentDate = calendar?.weekDate ? new Date(calendar.weekDate) : new Date();

  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [copyBuffer, setCopyBuffer] = useState<any | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info'
  });
  const [createTaskDialog, setCreateTaskDialog] = useState({
    open: false,
    employeeId: null as number | null,
    employeeName: '',
    day: null as Date | null,
    taskType: null as any,
    time: '',
    notes: ''
  });
  const [editTaskDialog, setEditTaskDialog] = useState({ open: false, task: null as any });
  const [taskTypeDialog, setTaskTypeDialog] = useState({
    open: false,
    name: '',
    color: '#5C6BC0',
    description: ''
  });
  const [taskTypeDeleteMode, setTaskTypeDeleteMode] = useState(false);
  const [employeeSelectionDialogOpen, setEmployeeSelectionDialogOpen] = useState(false);
  const [draftVisibleEmployeeIds, setDraftVisibleEmployeeIds] = useState<string[]>([]);

  useEffect(() => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const daysToShow = Number(settings?.calendar?.weekViewDays) || 7;

    setWeekDays(Array.from({ length: daysToShow }, (_, index) => addDays(startDate, index)));
  }, [currentDate, settings?.calendar?.weekViewDays]);

  useEffect(() => {
    if (!employees || employees.length === 0) {
      dispatch(fetchEmployees());
    }

    dispatch(fetchTaskTypes());
    dispatch(fetchTasks({}));
  }, [dispatch, employees]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        dispatch(navigateWeek('prev'));
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        dispatch(navigateWeek('next'));
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        dispatch(setWeekDate(new Date().toISOString()));
        return;
      }

      if (event.key === 'Escape') {
        setCreateTaskDialog({ open: false, employeeId: null, employeeName: '', day: null, taskType: null, time: '', notes: '' });
        setEditTaskDialog({ open: false, task: null });
        setTaskTypeDialog({ open: false, name: '', color: '#5C6BC0', description: '' });
        setTaskTypeDeleteMode(false);
        setCopyBuffer(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  const selectedOrgId = selectedOrganization?.id?.toString?.() || '';

  const baseEmployees = useMemo(() => {
    const scopedEmployees = selectedOrganization
      ? employees.filter((employee: any) => employee.organizationId === selectedOrganization.id)
      : employees;

    return scopedEmployees.filter((employee: any) => weekDays.some((day) => isEmployeeActiveOnDate(employee, day)));
  }, [employees, selectedOrganization, weekDays]);

  const visibleEmployeeIdsForOrg = useMemo(() => {
    const map = settings?.ui?.employeeVisibilityByOrg || {};
    return selectedOrgId && Array.isArray(map[selectedOrgId]) ? map[selectedOrgId] : null;
  }, [selectedOrgId, settings?.ui?.employeeVisibilityByOrg]);

  const sortedEmployees = useMemo(() => {
    const filteredEmployees = visibleEmployeeIdsForOrg
      ? baseEmployees.filter((employee: any) => visibleEmployeeIdsForOrg.includes(employee.id?.toString?.() || ''))
      : baseEmployees;

    return filteredEmployees
      .sort((left: any, right: any) => {
        const leftName = `${left.firstName || ''} ${left.lastName || ''}`.trim().toLowerCase();
        const rightName = `${right.firstName || ''} ${right.lastName || ''}`.trim().toLowerCase();
        return leftName.localeCompare(rightName, 'de');
      });
  }, [baseEmployees, visibleEmployeeIdsForOrg]);

  const visibleTaskTypes = useMemo(() => {
    const organizationId = selectedOrganization?.id?.toString?.();

    return taskTypes.filter((taskType: any) => {
      if (taskType?.isActive === false) return false;
      if (!organizationId) return true;

      const taskTypeOrganizationId = taskType.organizationId?.toString?.() || '';
      return !taskTypeOrganizationId || taskTypeOrganizationId === organizationId;
    });
  }, [selectedOrganization?.id, taskTypes]);

  const visibleTasks = useMemo(() => {
    const organizationId = selectedOrganization?.id?.toString?.() || '';

    return tasks.filter((task: any) => {
      if (!organizationId) return true;

      const taskOrganizationId = task.organizationId?.toString?.() || '';
      return !taskOrganizationId || taskOrganizationId === organizationId;
    });
  }, [selectedOrganization?.id, tasks]);

  const taskMap = useMemo(() => {
    const map = new Map<string, any[]>();

    sortedEmployees.forEach((employee: any) => {
      weekDays.forEach((day) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const cellKey = `${employee.id}-${dateKey}`;
        const cellTasks = visibleTasks.filter((task: any) => {
          return task.employeeId?.toString?.() === employee.id.toString() && task.date === dateKey;
        }).sort((left: any, right: any) => {
          const leftTime = left.time || '99:99';
          const rightTime = right.time || '99:99';
          return leftTime.localeCompare(rightTime, 'de');
        });

        map.set(cellKey, cellTasks);
      });
    });

    return map;
  }, [sortedEmployees, visibleTasks, weekDays]);

  const getTasksForEmployeeAndDay = useCallback((employeeId: number, day: Date) => {
    return taskMap.get(`${employeeId}-${format(day, 'yyyy-MM-dd')}`) || [];
  }, [taskMap]);

  const hasDuplicateTask = useCallback((taskTypeId: string, employeeId: string, date: string, ignoreTaskId?: string) => {
    return visibleTasks.some((task: any) => {
      if (ignoreTaskId && task.id?.toString?.() === ignoreTaskId.toString()) {
        return false;
      }

      return task.taskTypeId?.toString?.() === taskTypeId.toString() &&
        task.employeeId?.toString?.() === employeeId.toString() &&
        task.date === date;
    });
  }, [visibleTasks]);

  const refreshTasks = useCallback(() => {
    dispatch(fetchTasks({}));
  }, [dispatch]);

  const openCreateTaskDialog = useCallback((taskType: any, employee: any, day: Date) => {
    setCreateTaskDialog({
      open: true,
      employeeId: employee.id,
      employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      day,
      taskType,
      time: '',
      notes: taskType.description || ''
    });
  }, []);

  const handleCreateTask = useCallback(async (taskType: any, employeeId: number, day: Date, options: { notes?: string; time?: string } = {}) => {
    const employee = employees.find((entry: any) => entry.id?.toString?.() === employeeId.toString());
    const organizationId = (selectedOrganization?.id ?? employee?.organizationId)?.toString?.();
    const date = format(day, 'yyyy-MM-dd');

    if (!organizationId) {
      setSnackbar({ open: true, message: 'Keine Organisation ausgewählt.', severity: 'error' });
      return false;
    }

    if (hasDuplicateTask(taskType.id.toString(), employeeId.toString(), date)) {
      setSnackbar({ open: true, message: 'Diese Aufgabe ist dort bereits zugeteilt.', severity: 'error' });
      return false;
    }

    try {
      await dispatch(createTask({
        taskTypeId: taskType.id.toString(),
        employeeId: employeeId.toString(),
        date,
        time: options.time || '',
        notes: options.notes || taskType.description || '',
        organizationId
      })).unwrap();

      refreshTasks();
      setSnackbar({ open: true, message: 'Aufgabe zugeteilt', severity: 'success' });
      return true;
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.message || 'Aufgabe konnte nicht erstellt werden',
        severity: 'error'
      });
      return false;
    }
  }, [dispatch, employees, hasDuplicateTask, refreshTasks, selectedOrganization]);

  const handleMoveTask = useCallback(async (task: any, employeeId: number, day: Date) => {
    const employee = employees.find((entry: any) => entry.id?.toString?.() === employeeId.toString());
    const organizationId = (selectedOrganization?.id ?? employee?.organizationId ?? task.organizationId)?.toString?.();
    const date = format(day, 'yyyy-MM-dd');

    if (!organizationId) {
      setSnackbar({ open: true, message: 'Keine Organisation ausgewählt.', severity: 'error' });
      return;
    }

    if (hasDuplicateTask(task.taskTypeId, employeeId.toString(), date, task.id)) {
      setSnackbar({ open: true, message: 'Die Aufgabe existiert dort bereits.', severity: 'error' });
      return;
    }

    try {
      await dispatch(updateTask({
        id: parseInt(task.id, 10),
        data: {
          employeeId: employeeId.toString(),
          date,
          organizationId
        }
      })).unwrap();

      refreshTasks();
      setSnackbar({ open: true, message: 'Aufgabe verschoben', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.message || 'Aufgabe konnte nicht verschoben werden',
        severity: 'error'
      });
    }
  }, [dispatch, employees, hasDuplicateTask, refreshTasks, selectedOrganization]);

  const handleCopyTask = useCallback(async (task: any, employeeId: number, day: Date) => {
    const taskType = visibleTaskTypes.find((entry: any) => entry.id?.toString?.() === task.taskTypeId?.toString?.());

    if (!taskType) {
      setSnackbar({ open: true, message: 'Aufgabentyp nicht gefunden', severity: 'error' });
      return;
    }

    await handleCreateTask(taskType, employeeId, day, { notes: task.notes || '', time: task.time || '' });
  }, [handleCreateTask, visibleTaskTypes]);

  const handleDeleteTask = useCallback(async (taskId: string | number) => {
    try {
      await dispatch(deleteTask(parseInt(taskId.toString(), 10))).unwrap();
      refreshTasks();
      setSnackbar({ open: true, message: 'Aufgabe gelöscht', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.message || 'Aufgabe konnte nicht gelöscht werden',
        severity: 'error'
      });
    }
  }, [dispatch, refreshTasks]);

  const handleSaveTaskNotes = useCallback(async () => {
    if (!editTaskDialog.task) return;

    try {
      await dispatch(updateTask({
        id: parseInt(editTaskDialog.task.id, 10),
        data: {
          time: editTaskDialog.task.time || '',
          notes: editTaskDialog.task.notes || ''
        }
      })).unwrap();

      refreshTasks();
      setEditTaskDialog({ open: false, task: null });
      setSnackbar({ open: true, message: 'Aufgabe aktualisiert', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.message || 'Aufgabe konnte nicht gespeichert werden',
        severity: 'error'
      });
    }
  }, [dispatch, editTaskDialog.task, refreshTasks]);

  const handleExcelWeekExport = useCallback(async () => {
    try {
      if (!weekDays.length) return;

      const data = buildWeekExcelFromTasks({
        employees: sortedEmployees,
        days: weekDays,
        getTasks: getTasksForEmployeeAndDay,
        organizationName: selectedOrganization?.name
      });

      const defaultName = `Aufgabenplan_${format(weekDays[0], 'yyyy-MM-dd')}.xlsx`;
      const result = await saveWeekExcel(data, defaultName);
      setSnackbar({
        open: true,
        message: result.ok
          ? (result.path ? `Gespeichert unter: ${result.path}` : 'Aufgabenexport gespeichert')
          : 'Export abgebrochen oder fehlgeschlagen',
        severity: result.ok ? 'success' : 'error'
      });
    } catch (error) {
      console.error('Task week export error:', error);
      setSnackbar({ open: true, message: 'Fehler beim Export', severity: 'error' });
    }
  }, [getTasksForEmployeeAndDay, selectedOrganization?.name, sortedEmployees, weekDays]);

  const handleConfirmCreateTask = useCallback(async () => {
    if (!createTaskDialog.taskType || !createTaskDialog.day || createTaskDialog.employeeId === null) {
      return;
    }

    const created = await handleCreateTask(createTaskDialog.taskType, createTaskDialog.employeeId, createTaskDialog.day, {
      time: createTaskDialog.time,
      notes: createTaskDialog.notes
    });

    if (created) {
      setCreateTaskDialog({ open: false, employeeId: null, employeeName: '', day: null, taskType: null, time: '', notes: '' });
    }
  }, [createTaskDialog, handleCreateTask]);

  const handleCreateTaskType = useCallback(async () => {
    if (!taskTypeDialog.name.trim()) {
      setSnackbar({ open: true, message: 'Bitte einen Namen für den Aufgabentyp eingeben.', severity: 'error' });
      return;
    }

    const organizationId = selectedOrganization?.id?.toString?.();
    if (!organizationId) {
      setSnackbar({ open: true, message: 'Bitte zuerst eine Organisation auswählen.', severity: 'error' });
      return;
    }

    try {
      await dispatch(createTaskType({
        name: taskTypeDialog.name.trim(),
        color: taskTypeDialog.color,
        description: taskTypeDialog.description.trim(),
        organizationId,
        isActive: true
      })).unwrap();

      dispatch(fetchTaskTypes());
      setTaskTypeDialog({ open: false, name: '', color: '#5C6BC0', description: '' });
      setSnackbar({ open: true, message: 'Aufgabentyp erstellt', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.message || 'Aufgabentyp konnte nicht erstellt werden',
        severity: 'error'
      });
    }
  }, [dispatch, selectedOrganization, taskTypeDialog]);

  const handleDeleteTaskType = useCallback(async (taskType: any) => {
    const assignedTaskCount = visibleTasks.filter((task: any) => task.taskTypeId?.toString?.() === taskType.id?.toString?.()).length;

    if (assignedTaskCount > 0) {
      setSnackbar({
        open: true,
        message: `"${taskType.name}" kann nicht gelöscht werden, solange noch ${assignedTaskCount} Aufgabe(n) zugewiesen sind.`,
        severity: 'error'
      });
      return;
    }

    try {
      await dispatch(deleteTaskType(taskType.id.toString())).unwrap();
      dispatch(fetchTaskTypes());
      setSnackbar({ open: true, message: 'Aufgabentyp gelöscht', severity: 'success' });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error?.message || 'Aufgabentyp konnte nicht gelöscht werden',
        severity: 'error'
      });
    }
  }, [dispatch, visibleTasks]);

  const toggleTaskTypeDeleteMode = useCallback(() => {
    setTaskTypeDeleteMode((prev) => {
      const next = !prev;
      setSnackbar({
        open: true,
        message: next
          ? 'Löschmodus aktiv: Aufgabentyp anklicken, um ihn zu löschen.'
          : 'Löschmodus beendet.',
        severity: 'info'
      });
      return next;
    });
  }, []);

  const openEmployeeSelectionDialog = useCallback(() => {
    setDraftVisibleEmployeeIds(
      visibleEmployeeIdsForOrg || baseEmployees.map((employee: any) => employee.id?.toString?.() || '')
    );
    setEmployeeSelectionDialogOpen(true);
  }, [baseEmployees, visibleEmployeeIdsForOrg]);

  const toggleDraftEmployeeVisibility = useCallback((employeeId: string) => {
    setDraftVisibleEmployeeIds((prev) => prev.includes(employeeId)
      ? prev.filter((id) => id !== employeeId)
      : [...prev, employeeId]);
  }, []);

  const persistEmployeeVisibility = useCallback(() => {
    try {
      if (!selectedOrgId) {
        setEmployeeSelectionDialogOpen(false);
        return;
      }

      const allEmployeeIds = baseEmployees.map((employee: any) => employee.id?.toString?.() || '');
      const nextMap = { ...(settings?.ui?.employeeVisibilityByOrg || {}) } as Record<string, string[]>;
      const normalizedDraft = allEmployeeIds.filter((id: string) => draftVisibleEmployeeIds.includes(id));

      if (normalizedDraft.length === allEmployeeIds.length) {
        delete nextMap[selectedOrgId];
      } else {
        nextMap[selectedOrgId] = normalizedDraft;
      }

      updateSettings({
        ...settings,
        ui: {
          ...settings.ui,
          employeeVisibilityByOrg: nextMap
        }
      });

      setEmployeeSelectionDialogOpen(false);
      setSnackbar({ open: true, message: 'Mitarbeiterauswahl gespeichert', severity: 'success' });
    } catch (error) {
      console.error('Persist task employee visibility failed', error);
      setSnackbar({ open: true, message: 'Fehler beim Speichern der Mitarbeiterauswahl', severity: 'error' });
    }
  }, [baseEmployees, draftVisibleEmployeeIds, selectedOrgId, settings, updateSettings]);

  return (
    <Box sx={{ px: 3, pt: 3, pb: 0, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" component="h1">Aufgabenansicht</Typography>
          <Typography variant="body2" color="text.secondary">
            Aufgaben per Drag & Drop auf Mitarbeiter und Wochentage verteilen.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Tooltip title="Sichtbare Mitarbeiter auswählen">
            <IconButton
              onClick={openEmployeeSelectionDialog}
              color={visibleEmployeeIdsForOrg ? 'primary' : 'default'}
              sx={{ border: '1px solid', borderColor: visibleEmployeeIdsForOrg ? 'primary.main' : 'divider' }}
            >
              <GroupIcon />
            </IconButton>
          </Tooltip>
          {baseEmployees.length > 0 && (
            <Chip
              size="small"
              label={`${sortedEmployees.length}/${baseEmployees.length} Mitarbeiter`}
              color={visibleEmployeeIdsForOrg ? 'primary' : 'default'}
              variant={visibleEmployeeIdsForOrg ? 'filled' : 'outlined'}
            />
          )}
          <Tooltip title={taskTypeDeleteMode ? 'Löschmodus beenden' : 'Löschmodus für Aufgabentypen'}>
            <IconButton
              onClick={toggleTaskTypeDeleteMode}
              color={taskTypeDeleteMode ? 'error' : 'default'}
              sx={{
                border: '1px solid',
                borderColor: taskTypeDeleteMode ? 'error.main' : 'divider',
                bgcolor: taskTypeDeleteMode ? 'error.main' : 'transparent',
                color: taskTypeDeleteMode ? 'error.contrastText' : 'text.primary',
                '&:hover': {
                  bgcolor: taskTypeDeleteMode ? 'error.dark' : 'action.hover'
                }
              }}
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExcelWeekExport}
            disabled={!weekDays.length || sortedEmployees.length === 0}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setTaskTypeDialog({ open: true, name: '', color: '#5C6BC0', description: '' })}
          >
            Aufgabentyp
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {visibleTaskTypes.map((taskType: any) => (
          <Chip
            key={taskType.id}
            label={taskType.name}
            title={taskType.description || taskType.name}
            size="small"
            draggable={!taskTypeDeleteMode}
            onDelete={taskTypeDeleteMode ? () => handleDeleteTaskType(taskType) : undefined}
            onClick={taskTypeDeleteMode ? () => handleDeleteTaskType(taskType) : undefined}
            onDragStart={taskTypeDeleteMode ? undefined : (event) => {
              event.dataTransfer.setData('taskType', JSON.stringify(taskType));
            }}
            sx={(theme) => ({
              '@keyframes task-type-wiggle': {
                '0%': { transform: 'translateX(-1px) rotate(-1.3deg)' },
                '100%': { transform: 'translateX(1px) rotate(1.3deg)' }
              },
              backgroundColor: taskType.color,
              color: theme.palette.getContrastText(taskType.color),
              fontWeight: 700,
              cursor: taskTypeDeleteMode ? 'pointer' : 'grab',
              animation: taskTypeDeleteMode ? 'task-type-wiggle 0.16s ease-in-out infinite alternate' : 'none',
              transformOrigin: 'center bottom',
              '&:active': {
                cursor: taskTypeDeleteMode ? 'pointer' : 'grabbing'
              },
              '& .MuiChip-deleteIcon': {
                color: theme.palette.getContrastText(taskType.color),
                opacity: taskTypeDeleteMode ? 0.9 : 0
              },
              '&:hover': {
                filter: taskTypeDeleteMode ? 'brightness(0.96)' : 'none'
              }
            })}
          />
        ))}
        {visibleTaskTypes.length === 0 && (
          <Alert severity="info" sx={{ py: 0 }}>
            Noch keine Aufgabentypen vorhanden. Legen Sie zuerst einen Aufgabentyp an.
          </Alert>
        )}
      </Box>

      {selectedOrganization && (
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`Organisation: ${selectedOrganization.name}`} color="primary" sx={{ fontWeight: 700 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => dispatch(navigateWeek('prev'))} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography variant="subtitle1" sx={{ minWidth: 220, textAlign: 'center' }}>
              {weekDays.length > 0
                ? `${format(weekDays[0], 'dd.MM.yyyy', { locale: de })} - ${format(weekDays[weekDays.length - 1], 'dd.MM.yyyy', { locale: de })}`
                : format(currentDate, 'dd.MM.yyyy', { locale: de })}
            </Typography>
            <IconButton onClick={() => dispatch(navigateWeek('next'))} size="small">
              <ChevronRight />
            </IconButton>
            <Button variant="outlined" size="small" onClick={() => dispatch(setWeekDate(new Date().toISOString()))}>
              Heute
            </Button>
          </Box>
        </Box>
      )}

      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100dvh - 260px)', overflowY: 'auto', overflowX: 'hidden' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 220, fontWeight: 'bold' }}>Mitarbeiter</TableCell>
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());

                return (
                  <TableCell
                    key={day.toISOString()}
                    align="center"
                    sx={{
                      minWidth: 150,
                      fontWeight: 'bold',
                      backgroundColor: isToday ? 'primary.main' : 'background.paper',
                      color: isToday ? 'primary.contrastText' : 'text.primary'
                    }}
                  >
                    <Typography variant="subtitle2">
                      {`${format(day, 'EEE', { locale: de }).replace(/\.$/, '')} ${format(day, 'dd.MM')}`}
                    </Typography>
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedEmployees.map((employee: any) => (
              <TableRow key={employee.id}>
                <TableCell sx={{ verticalAlign: 'top', borderRight: '1px solid', borderRightColor: 'divider' }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar
                      src={(employee.photoPath ? (window as any)?.electronAPI?.toFileUrl?.(employee.photoPath) : employee.photoUrl) || undefined}
                      sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}
                    >
                      {(employee.photoPath || employee.photoUrl) ? null : <PersonIcon fontSize="small" />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">{employee.firstName} {employee.lastName}</Typography>
                      <Typography variant="caption" color="text.secondary">{employee.position || 'Mitarbeiter'}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                {weekDays.map((day) => {
                  const employeeTasks = getTasksForEmployeeAndDay(employee.id, day);
                  const isActive = isEmployeeActiveOnDate(employee, day);
                  const inactiveReason = isActive ? null : getEmployeeInactiveReason(employee, day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <TableCell
                      key={`${employee.id}-${day.toISOString()}`}
                      sx={{
                        verticalAlign: 'top',
                        height: 96,
                        p: 1,
                        backgroundColor: !isActive ? 'action.disabledBackground' : isToday ? 'action.selected' : 'inherit',
                        opacity: !isActive ? 0.75 : 1,
                        cursor: isActive ? 'pointer' : 'not-allowed'
                      }}
                      onDragOver={isActive ? (event) => event.preventDefault() : undefined}
                      onDrop={isActive ? async (event) => {
                        event.preventDefault();

                        const copyData = event.dataTransfer.getData('copyTask');
                        if (copyData) {
                          const payload = JSON.parse(copyData);
                          const sourceTask = visibleTasks.find((entry: any) => entry.id?.toString?.() === payload.id?.toString?.());
                          if (sourceTask) {
                            await handleCopyTask(sourceTask, employee.id, day);
                          }
                          return;
                        }

                        const moveData = event.dataTransfer.getData('existingTask');
                        if (moveData) {
                          const payload = JSON.parse(moveData);
                          const sourceTask = visibleTasks.find((entry: any) => entry.id?.toString?.() === payload.id?.toString?.());
                          if (sourceTask) {
                            await handleMoveTask(sourceTask, employee.id, day);
                          }
                          return;
                        }

                        const taskTypeData = event.dataTransfer.getData('taskType');
                        if (taskTypeData) {
                          const taskType = JSON.parse(taskTypeData);
                          openCreateTaskDialog(taskType, employee, day);
                        }
                      } : undefined}
                      onClick={isActive ? async () => {
                        if (!copyBuffer) return;
                        await handleCopyTask(copyBuffer, employee.id, day);
                        setCopyBuffer(null);
                      } : undefined}
                    >
                      {!isActive && inactiveReason && (
                        <Alert severity="info" sx={{ py: 0, mb: 0.5 }}>
                          {inactiveReason}
                        </Alert>
                      )}

                      {employeeTasks.map((task: any) => (
                        <Tooltip
                          key={task.id}
                          title={[
                            task.taskTypeName || 'Aufgabe',
                            task.time ? `${task.time} Uhr` : '',
                            task.notes || ''
                          ].filter(Boolean).join(' | ')}
                          arrow
                        >
                          <Card
                            sx={(theme) => ({
                              mb: 0.5,
                              position: 'relative',
                              cursor: 'grab',
                              backgroundColor: task.taskTypeColor || '#90A4AE',
                              color: theme.palette.getContrastText(task.taskTypeColor || '#90A4AE'),
                              '&:hover .task-action': {
                                display: 'flex'
                              }
                            })}
                            draggable
                            onDragStart={(event) => {
                              const payload = JSON.stringify({ id: task.id });
                              if (event.ctrlKey || event.metaKey) {
                                event.dataTransfer.setData('copyTask', payload);
                              } else {
                                event.dataTransfer.setData('existingTask', payload);
                              }
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditTaskDialog({ open: true, task: { ...task } });
                            }}
                          >
                            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, pr: 5 }}>
                                {task.taskTypeName || 'Aufgabe'}
                              </Typography>
                              {task.time && (
                                <Typography variant="caption" sx={{ display: 'block', opacity: 0.95, pr: 5 }}>
                                  {task.time} Uhr
                                </Typography>
                              )}
                              {task.notes && (
                                <Typography variant="caption" sx={{ display: 'block', opacity: 0.9, pr: 5 }}>
                                  {task.notes}
                                </Typography>
                              )}

                              <IconButton
                                className="task-action"
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 28,
                                  width: 22,
                                  height: 22,
                                  display: 'none',
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  '&:hover': { bgcolor: 'primary.dark' }
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCopyBuffer(task);
                                  setSnackbar({
                                    open: true,
                                    message: 'Kopiermodus aktiv: Zielzelle anklicken oder per Drag & Drop kopieren.',
                                    severity: 'info'
                                  });
                                }}
                              >
                                <CopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                              <IconButton
                                className="task-action"
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 4,
                                  width: 22,
                                  height: 22,
                                  display: 'none',
                                  bgcolor: 'error.main',
                                  color: 'white',
                                  '&:hover': { bgcolor: 'error.dark' }
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                              >
                                <CloseIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </CardContent>
                          </Card>
                        </Tooltip>
                      ))}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {sortedEmployees.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">Keine Mitarbeiter gefunden</Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedOrganization
              ? `Für die Organisation "${selectedOrganization.name}" sind keine Mitarbeiter hinterlegt.`
              : 'Bitte wählen Sie eine Organisation aus oder legen Sie Mitarbeiter an.'}
          </Typography>
        </Box>
      )}

      <Dialog
        open={createTaskDialog.open}
        onClose={() => setCreateTaskDialog({ open: false, employeeId: null, employeeName: '', day: null, taskType: null, time: '', notes: '' })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Aufgabe zuweisen</DialogTitle>
        <DialogContent>
          {createTaskDialog.taskType && createTaskDialog.day && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Aufgabentyp"
                value={createTaskDialog.taskType.name || ''}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <TextField
                label="Mitarbeiter"
                value={createTaskDialog.employeeName}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <TextField
                label="Datum"
                value={format(createTaskDialog.day, 'dd.MM.yyyy', { locale: de })}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <TextField
                label="Uhrzeit"
                type="time"
                value={createTaskDialog.time}
                onChange={(event) => setCreateTaskDialog((prev) => ({ ...prev, time: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Notiz / Beschreibung"
                value={createTaskDialog.notes}
                onChange={(event) => setCreateTaskDialog((prev) => ({ ...prev, notes: event.target.value }))}
                fullWidth
                multiline
                minRows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTaskDialog({ open: false, employeeId: null, employeeName: '', day: null, taskType: null, time: '', notes: '' })}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirmCreateTask} variant="contained">Anlegen</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editTaskDialog.open} onClose={() => setEditTaskDialog({ open: false, task: null })} fullWidth maxWidth="sm">
        <DialogTitle>Aufgabe bearbeiten</DialogTitle>
        <DialogContent>
          {editTaskDialog.task && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Aufgabentyp"
                value={editTaskDialog.task.taskTypeName || ''}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <TextField
                label="Uhrzeit"
                type="time"
                value={editTaskDialog.task.time || ''}
                onChange={(event) => setEditTaskDialog((prev) => ({
                  ...prev,
                  task: { ...prev.task, time: event.target.value }
                }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Notiz / Beschreibung"
                value={editTaskDialog.task.notes || ''}
                onChange={(event) => setEditTaskDialog((prev) => ({
                  ...prev,
                  task: { ...prev.task, notes: event.target.value }
                }))}
                fullWidth
                multiline
                minRows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTaskDialog({ open: false, task: null })}>Abbrechen</Button>
          <Button onClick={handleSaveTaskNotes} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={taskTypeDialog.open} onClose={() => setTaskTypeDialog({ open: false, name: '', color: '#5C6BC0', description: '' })} fullWidth maxWidth="sm">
        <DialogTitle>Aufgabentyp anlegen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Name"
              value={taskTypeDialog.name}
              onChange={(event) => setTaskTypeDialog((prev) => ({ ...prev, name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Farbe"
              type="color"
              value={taskTypeDialog.color}
              onChange={(event) => setTaskTypeDialog((prev) => ({ ...prev, color: event.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Beschreibung"
              value={taskTypeDialog.description}
              onChange={(event) => setTaskTypeDialog((prev) => ({ ...prev, description: event.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskTypeDialog({ open: false, name: '', color: '#5C6BC0', description: '' })}>Abbrechen</Button>
          <Button onClick={handleCreateTaskType} variant="contained">Anlegen</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={employeeSelectionDialogOpen} onClose={() => setEmployeeSelectionDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Mitarbeiter im Aufgabenplan anzeigen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Wählen Sie aus, welche Mitarbeiter im Aufgabenplan angezeigt werden.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                onClick={() => setDraftVisibleEmployeeIds(baseEmployees.map((employee: any) => employee.id?.toString?.() || ''))}
              >
                Alle
              </Button>
              <Button size="small" onClick={() => setDraftVisibleEmployeeIds([])}>
                Keine
              </Button>
            </Box>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <FormGroup>
            {baseEmployees.map((employee: any) => {
              const employeeId = employee.id?.toString?.() || '';
              const label = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Mitarbeiter';
              return (
                <FormControlLabel
                  key={employeeId}
                  control={
                    <Checkbox
                      checked={draftVisibleEmployeeIds.includes(employeeId)}
                      onChange={() => toggleDraftEmployeeVisibility(employeeId)}
                    />
                  }
                  label={`${label}${employee.position ? ` (${employee.position})` : ''}`}
                />
              );
            })}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeSelectionDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={persistEmployeeVisibility} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskWeekView;