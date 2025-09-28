import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Paper,
  
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  Stack
} from '@mui/material';
import { Snackbar, Alert } from '@mui/material';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Today as TodayIcon,
  Warning as WarningIcon,
  
  FileDownload as FileDownloadIcon,
  GetApp as GetAppIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { fetchShiftTypes } from '../../store/slices/shiftTypeSlice';
import { fetchShifts } from '../../store/slices/shiftSlice';
import { fetchOrganizations, setSelectedOrganization } from '../../store/slices/organizationSlice';
import { format, isThisWeek, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

const DashboardComponent: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Export Dialog State
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    timeRange: 'month', // week, month, quarter, year, custom
    customStartDate: format(new Date(), 'yyyy-MM-dd'),
    customEndDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    includeStatistics: true,
    includeShiftTypes: true,
    includeShifts: true,
    includeEmployees: true,
    includeOrganizations: true,
    format: 'csv' // csv, excel
  });
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info'}>({ open: false, message: '', severity: 'success' });
  
  const { employees } = useAppSelector((state: any) => state.employees);
  const { shiftTypes } = useAppSelector((state: any) => state.shiftTypes);
  const { shifts } = useAppSelector((state: any) => state.shifts);
  const { organizations, selectedOrganization } = useAppSelector((state: any) => state.organizations);

  // Debug logging removed for production cleanliness

  useEffect(() => {
    // Lade erweiterte Daten für das Dashboard (aktueller Monat)
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
  // console debug removed
    
    dispatch(fetchEmployees());
    dispatch(fetchShiftTypes());
    dispatch(fetchOrganizations());
    dispatch(fetchShifts({
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(monthEnd, 'yyyy-MM-dd')
    }));
  }, [dispatch]);

  // Auto-select first organization if none selected
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrganization) {
      dispatch(setSelectedOrganization(organizations[0]));
    }
  }, [organizations, selectedOrganization, dispatch]);

  // Debug-Ausgabe entfernt

  // Filtere Daten nach ausgewählter Organisation
  const filteredEmployees = selectedOrganization 
    ? (employees || []).filter((emp: any) => 
        emp.organizationId === selectedOrganization.id.toString() || 
        emp.organizationId === selectedOrganization.id
      )
    : (employees || []);

  const filteredShifts = selectedOrganization
    ? (shifts || []).filter((shift: any) => 
        shift.organizationId === selectedOrganization.id.toString() || 
        shift.organizationId === selectedOrganization.id
      )
    : (shifts || []);

  // Statistiken berechnen
  const todayShifts = filteredShifts.filter((shift: any) => {
    const shiftDate = new Date(shift.date);
    const today = new Date();
    return format(shiftDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  });

  const weekShifts = filteredShifts.filter((shift: any) => {
    const shiftDate = new Date(shift.date);
    return isThisWeek(shiftDate, { weekStartsOn: 1 });
  });

  // Removed unused assigned/unassigned shift calculations

  // console debug removed

  // Hilfsfunktionen
  const getEmployeeById = (id: number) => {
    return (employees || []).find((emp: any) => emp.id === id);
  };

  const getShiftTypeById = (id: number) => {
    return (shiftTypes || []).find((st: any) => st.id === id);
  };

  const getOrganizationById = (id: number) => {
    return (organizations || []).find((org: any) => org.id === id);
  };

  // Kommende Schichten (nächste 7 Tage)
  const upcomingShifts = filteredShifts
    .filter((shift: any) => {
      const shiftDate = new Date(shift.date);
      const today = new Date();
      const nextWeek = addDays(today, 7);
      return shiftDate >= today && shiftDate <= nextWeek;
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);

  // Erweiterte Excel Export Funktion
  const calculateDateRange = () => {
    const today = new Date();
    let startDate: Date, endDate: Date;
    
    switch (exportSettings.timeRange) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay() + 1); // Montag
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'custom':
        startDate = new Date(exportSettings.customStartDate);
        endDate = new Date(exportSettings.customEndDate);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    
    return { startDate, endDate };
  };

  const handleAdvancedExport = async () => {
    const { startDate, endDate } = calculateDateRange();
    
  // console debug removed
    
    // Lade ALLE notwendigen Daten für den Export
    await Promise.all([
      dispatch(fetchShifts({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      })),
      dispatch(fetchEmployees()),
      dispatch(fetchShiftTypes()),
      dispatch(fetchOrganizations())
    ]);
    
    // Warte kurz damit die Daten geladen werden
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Hole die neuesten Daten aus dem Store
    const currentState = (window as any).store?.getState();
    const latestShifts = currentState?.shifts?.shifts || shifts || [];
    const latestEmployees = currentState?.employees?.employees || employees || [];
    const latestShiftTypes = currentState?.shiftTypes?.shiftTypes || shiftTypes || [];
    
    // console debug removed
    
    // Filtere Schichten nach Zeitraum und Organisation
    const timeRangeShifts = latestShifts.filter((shift: any) => {
      const shiftDate = new Date(shift.date);
      const inTimeRange = shiftDate >= startDate && shiftDate <= endDate;
      const inOrg = !selectedOrganization || 
        shift.organizationId === selectedOrganization.id || 
        shift.organization_id === selectedOrganization.id;
      return inTimeRange && inOrg;
    });

  // console debug removed

    // Erstelle Export-Datenstruktur
    const exportData: any = {
      metadata: {
        organization: selectedOrganization?.name || 'Alle Organisationen',
        exportDate: format(new Date(), 'dd.MM.yyyy HH:mm'),
        timeRange: `${format(startDate, 'dd.MM.yyyy')} - ${format(endDate, 'dd.MM.yyyy')}`,
        totalRecords: {
          shifts: timeRangeShifts.length,
          employees: latestEmployees.length,
          shiftTypes: latestShiftTypes.length,
          organizations: (organizations || []).length
        }
      }
    };

    // Statistiken
    if (exportSettings.includeStatistics) {
      const assignedShifts = timeRangeShifts.filter((shift: any) => shift.employee_id);
      const unassignedShifts = timeRangeShifts.filter((shift: any) => !shift.employee_id);
      
      exportData.statistics = {
        totalShifts: timeRangeShifts.length,
        assignedShifts: assignedShifts.length,
        unassignedShifts: unassignedShifts.length,
        assignmentRate: timeRangeShifts.length > 0 ? Math.round((assignedShifts.length / timeRangeShifts.length) * 100) : 0,
        employees: filteredEmployees.length,
        organizations: (organizations || []).length,
        shiftTypes: (shiftTypes || []).length
      };
    }

    // Organisationen
    if (exportSettings.includeOrganizations) {
      exportData.organizations = (organizations || []).map((org: any) => ({
        id: org.id,
        name: org.name,
        description: org.description || '',
        address: org.address || '',
        contactPerson: org.contact_person || '',
        phone: org.phone || '',
        email: org.email || ''
      }));
    }

    // Mitarbeiter
    if (exportSettings.includeEmployees) {
      exportData.employees = latestEmployees.map((emp: any) => ({
        id: emp.id,
        firstName: emp.firstName || emp.first_name,
        lastName: emp.lastName || emp.last_name,
        email: emp.email,
        phone: emp.phone || '',
        position: emp.position,
        organizationId: emp.organizationId || emp.organization_id,
        organizationName: getOrganizationById(emp.organizationId || emp.organization_id)?.name || 'Unbekannt',
        hourlyRate: emp.hourlyRate || emp.hourly_rate || 0,
        isActive: (emp.isActive !== undefined ? emp.isActive : emp.is_active) ? 'Ja' : 'Nein'
      }));
    }

    // Schichttypen mit Farben
    if (exportSettings.includeShiftTypes) {
      exportData.shiftTypes = latestShiftTypes.map((st: any) => ({
        id: st.id,
        name: st.name,
        description: st.description || '',
        startTime: st.startTime || st.start_time || '',
        endTime: st.endTime || st.end_time || '',
        isFlexible: (st.isFlexible !== undefined ? st.isFlexible : st.is_flexible) ? 'Ja' : 'Nein',
        color: st.color || '#1976d2',
        colorHex: st.color || '#1976d2', // Für Excel-Formatierung
        displayTime: (st.isFlexible !== undefined ? st.isFlexible : st.is_flexible) ? 'Flexibel' : `${st.startTime || st.start_time || 'N/A'} - ${st.endTime || st.end_time || 'N/A'}`
      }));
    }

    // Schichten
    if (exportSettings.includeShifts) {
      exportData.shifts = timeRangeShifts.map((shift: any) => {
        const employee = latestEmployees.find((emp: any) => emp.id === (shift.employeeId || shift.employee_id));
        const shiftType = latestShiftTypes.find((st: any) => st.id === (shift.shiftTypeId || shift.shift_type_id));
        const organization = (organizations || []).find((org: any) => org.id === (shift.organizationId || shift.organization_id));
        
        return {
          id: shift.id,
          date: format(new Date(shift.date), 'dd.MM.yyyy'),
          weekday: format(new Date(shift.date), 'EEEE', { locale: de }),
          startTime: shift.startTime || shift.start_time,
          endTime: shift.endTime || shift.end_time,
          duration: (shift.startTime || shift.start_time) && (shift.endTime || shift.end_time) ? 
            calculateDuration(shift.startTime || shift.start_time, shift.endTime || shift.end_time) : '',
          shiftTypeId: shift.shiftTypeId || shift.shift_type_id,
          shiftTypeName: shiftType?.name || 'Unbekannt',
          shiftTypeColor: shiftType?.color || '#1976d2',
          employeeId: shift.employeeId || shift.employee_id || '',
          employeeName: employee ? `${employee.firstName || employee.first_name} ${employee.lastName || employee.last_name}` : 'Nicht besetzt',
          employeePosition: employee?.position || '',
          organizationId: shift.organizationId || shift.organization_id,
          organizationName: organization?.name || 'Unbekannt',
          notes: shift.notes || '',
          isAssigned: (shift.employeeId || shift.employee_id) ? 'Ja' : 'Nein'
        };
      });
    }

    // Generiere Export-Datei
    if (exportSettings.format === 'csv') {
      generateCSVExport(exportData);
    } else {
      generateExcelExport(exportData);
    }
    
    setExportDialogOpen(false);
  };

  // Einfacher Wochenexport (Matrix: Mitarbeiter Zeilen, Tage Spalten, Legende)
  const handleSimpleWeekExport = async () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Montag
    const dates: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });

    await Promise.all([
      dispatch(fetchShifts({
        startDate: format(dates[0], 'yyyy-MM-dd'),
        endDate: format(dates[6], 'yyyy-MM-dd')
      })),
      dispatch(fetchEmployees()),
      dispatch(fetchShiftTypes())
    ]);
    await new Promise(r => setTimeout(r, 400));

    const state = (window as any).store?.getState();
    const latestShifts = state?.shifts?.shifts || shifts || [];
    const latestEmployees = state?.employees?.employees || employees || [];
    const latestShiftTypes = state?.shiftTypes?.shiftTypes || shiftTypes || [];

    const weekShifts = latestShifts.filter((shift: any) => {
      const sd = new Date(shift.date);
      return sd >= dates[0] && sd <= dates[6] && (
        !selectedOrganization ||
        shift.organizationId === selectedOrganization.id ||
        shift.organization_id === selectedOrganization.id
      );
    });

    const shiftTypeMap: Record<string, any> = {};
    latestShiftTypes.forEach((st: any) => { shiftTypeMap[st.id] = st; });

    // Korrekte CSV-Tabellen-Struktur für Excel (deutsches Format mit Semikolon)
    const csvRows: string[][] = [];
    
    // Header-Zeile: Mitarbeiter in Spalte A, dann jedes Datum (kurz) in eigener Spalte
    const headerRow = ['Mitarbeiter', ...dates.map(d => format(d, 'dd.MM.'))];
    csvRows.push(headerRow);

    // Mitarbeiter-Zeilen
    latestEmployees.forEach((emp: any) => {
      if (selectedOrganization && (emp.organizationId || emp.organization_id) !== selectedOrganization.id) return;
      
      const name = `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() || 'Unbekannt';
      const empRow: string[] = [name];
      
      dates.forEach(d => {
        const dStr = format(d, 'yyyy-MM-dd');
        const empDayShifts = weekShifts.filter((s: any) => (s.employeeId || s.employee_id) === emp.id && s.date === dStr);
        
        if (empDayShifts.length > 0) {
          const shiftNames = empDayShifts.map((s: any) => {
            const st = shiftTypeMap[s.shiftTypeId || s.shift_type_id];
            return st?.name || 'Schicht';
          });
          empRow.push(shiftNames.join(' + '));
        } else {
          const absence = weekShifts.find((s: any) => !s.employeeId && !s.employee_id && s.date === dStr && shiftTypeMap[s.shiftTypeId || s.shift_type_id]?.category === 'absence');
          if (absence) {
            empRow.push(shiftTypeMap[absence.shiftTypeId || absence.shift_type_id]?.name || 'Abwesend');
          } else {
            empRow.push('');
          }
        }
      });
      csvRows.push(empRow);
    });

    // Leerzeile
    csvRows.push([]);
    
    // Legende
    csvRows.push(['Legende']);
    csvRows.push(['Schichttyp', 'Start', 'Ende']);
    latestShiftTypes.forEach((st: any) => {
      csvRows.push([
        st.name,
        st.startTime || st.start_time || '',
        st.endTime || st.end_time || '',
      ]);
    });

    // CSV zusammenbauen mit Semikolon und Escaping
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        if (cell == null) return '';
        const cellStr = cell.toString();
        // Escape Anführungszeichen und umschließe bei Bedarf
        if (cellStr.includes('"') || cellStr.includes(';')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(';')
    ).join('\n');

    // BOM für UTF-8 in Excel hinzufügen
    const csv = '\uFEFF' + csvContent;

    const result = await (window as any).electronAPI?.saveFile?.({
      title: 'Wochenexport (simpel) speichern',
      defaultPath: `Wochenplan_${format(dates[0], 'yyyy-MM-dd')}.csv`,
      filters: [{ name: 'CSV-Dateien', extensions: ['csv'] }]
    });
    if (result && !result.canceled && result.filePath) {
      const writeRes = await (window as any).electronAPI?.writeFile?.(result.filePath, csv);
      if (writeRes?.success) {
        setSnackbar({ open: true, message: `Wochenexport gespeichert: ${result.filePath}`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: `Fehler beim Speichern: ${writeRes?.message || 'Unbekannt'}`, severity: 'error' });
      }
    } else if (result && result.canceled) {
      setSnackbar({ open: true, message: 'Export abgebrochen', severity: 'info' });
    }
    setExportDialogOpen(false);
  };

  const calculateDuration = (startTime: string, endTime: string): string => {
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}:${diffMinutes.toString().padStart(2, '0')}h`;
    } catch {
      return '';
    }
  };

  const generateCSVExport = (data: any) => {
    const sections = [];
    
    // Metadaten
    sections.push(`EXPORT DETAILS`);
    sections.push(`Organisation: ${data.metadata.organization}`);
    sections.push(`Zeitraum: ${data.metadata.timeRange}`);
    sections.push(`Exportiert am: ${data.metadata.exportDate}`);
    sections.push('');

    // Statistiken
    if (data.statistics) {
      sections.push('STATISTIKEN');
      sections.push(`Gesamte Schichten: ${data.statistics.totalShifts}`);
      sections.push(`Besetzte Schichten: ${data.statistics.assignedShifts}`);
      sections.push(`Offene Schichten: ${data.statistics.unassignedShifts}`);
      sections.push(`Besetzungsrate: ${data.statistics.assignmentRate}%`);
      sections.push(`Mitarbeiter: ${data.statistics.employees}`);
      sections.push(`Organisationen: ${data.statistics.organizations}`);
      sections.push(`Schichttypen: ${data.statistics.shiftTypes}`);
      sections.push('');
    }

    // Organisationen
    if (data.organizations) {
      sections.push('ORGANISATIONEN');
      sections.push('ID;Name;Beschreibung;Adresse;Ansprechpartner;Telefon;E-Mail');
      data.organizations.forEach((org: any) => {
        sections.push(`${org.id};${org.name};${org.description};${org.address};${org.contactPerson};${org.phone};${org.email}`);
      });
      sections.push('');
    }

    // Mitarbeiter
    if (data.employees) {
      sections.push('MITARBEITER');
      sections.push('ID;Vorname;Nachname;E-Mail;Telefon;Position;Organisation;Stundenlohn;Aktiv');
      data.employees.forEach((emp: any) => {
        sections.push(`${emp.id};${emp.firstName};${emp.lastName};${emp.email};${emp.phone};${emp.position};${emp.organizationName};${emp.hourlyRate};${emp.isActive}`);
      });
      sections.push('');
    }

    // Schichttypen
    if (data.shiftTypes) {
      sections.push('SCHICHTTYPEN');
      sections.push('ID;Name;Beschreibung;Startzeit;Endzeit;Flexibel;Farbe');
      data.shiftTypes.forEach((st: any) => {
        sections.push(`${st.id};${st.name};${st.description};${st.startTime};${st.endTime};${st.isFlexible};${st.color}`);
      });
      sections.push('');
    }

    // Schichten
    if (data.shifts) {
      sections.push('SCHICHTEN');
      sections.push('ID;Datum;Wochentag;Startzeit;Endzeit;Dauer;Schichttyp;Farbe;Mitarbeiter;Position;Organisation;Notizen;Besetzt');
      data.shifts.forEach((shift: any) => {
        sections.push(`${shift.id};${shift.date};${shift.weekday};${shift.startTime};${shift.endTime};${shift.duration};${shift.shiftTypeName};${shift.shiftTypeColor};${shift.employeeName};${shift.employeePosition};${shift.organizationName};${shift.notes};${shift.isAssigned}`);
      });
    }

    // Download
    const csvContent = sections.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Dienstplan_Export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();
  };

  const generateExcelExport = (data: any) => {
    // Für echtes Excel könnten wir hier eine Library wie xlsx verwenden
    // Vorerst verwenden wir erweiterte CSV mit Tab-Separatoren für bessere Excel-Kompatibilität
    const sections = [];
    
    sections.push(`DIENSTPLAN EXPORT\t\t\t\t\t\t`);
    sections.push(`Organisation:\t${data.metadata.organization}\t\t\t\t\t`);
    sections.push(`Zeitraum:\t${data.metadata.timeRange}\t\t\t\t\t`);
    sections.push(`Exportiert am:\t${data.metadata.exportDate}\t\t\t\t\t`);
    sections.push('\t\t\t\t\t\t');

    if (data.statistics) {
      sections.push('STATISTIKEN\t\t\t\t\t\t');
      sections.push(`Gesamte Schichten:\t${data.statistics.totalShifts}\t\t\t\t\t`);
      sections.push(`Besetzte Schichten:\t${data.statistics.assignedShifts}\t\t\t\t\t`);
      sections.push(`Offene Schichten:\t${data.statistics.unassignedShifts}\t\t\t\t\t`);
      sections.push(`Besetzungsrate:\t${data.statistics.assignmentRate}%\t\t\t\t\t`);
      sections.push('\t\t\t\t\t\t');
    }

    if (data.shiftTypes) {
      sections.push('SCHICHTTYPEN\t\t\t\t\t\t');
      sections.push('Name\tBeschreibung\tZeiten\tFlexibel\tFarbe\tHex-Code');
      data.shiftTypes.forEach((st: any) => {
        sections.push(`${st.name}\t${st.description}\t${st.displayTime}\t${st.isFlexible}\t${st.color}\t${st.colorHex}`);
      });
      sections.push('\t\t\t\t\t\t');
    }

    if (data.shifts) {
      sections.push('SCHICHTEN\t\t\t\t\t\t\t\t\t\t\t\t');
      sections.push('Datum\tWochentag\tStartzeit\tEndzeit\tDauer\tSchichttyp\tMitarbeiter\tPosition\tOrganisation\tBesetzt\tFarbe\tNotizen');
      data.shifts.forEach((shift: any) => {
        sections.push(`${shift.date}\t${shift.weekday}\t${shift.startTime}\t${shift.endTime}\t${shift.duration}\t${shift.shiftTypeName}\t${shift.employeeName}\t${shift.employeePosition}\t${shift.organizationName}\t${shift.isAssigned}\t${shift.shiftTypeColor}\t${shift.notes}`);
      });
    }

    const tsvContent = sections.join('\n');
    const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Dienstplan_Export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xls`;
    link.click();
  };

  // Original einfache Export-Funktion (deprecated)
  const handleExcelExport = () => {
    setExportDialogOpen(true);
  };

  const currentOrg = selectedOrganization ? selectedOrganization : null;

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Dashboard
          </Typography>
          {currentOrg && (
            <Typography variant="subtitle1" color="text.secondary">
              {currentOrg.name}
            </Typography>
          )}
        </Box>
        
        <Button
          variant="outlined" 
          startIcon={<FileDownloadIcon />}
          onClick={handleExcelExport}
          sx={{ 
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'primary.50'
            }
          }}
        >
          Excel Export
        </Button>
      </Box>

      {/* Statistik-Karten */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Mitarbeiter */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Mitarbeiter
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {filteredEmployees.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Organisationen */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Organisationen
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {(organizations || []).length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'secondary.main' }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Schichten heute */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Schichten heute
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {todayShifts.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <TodayIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Schichten diese Woche */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Schichten Woche
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {weekShifts.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <ScheduleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Kommende Schichten (nächste 7 Tage) - Doppelt so breit */}
  <Grid item xs={12} md={9} lg={9} xl={10}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Kommende Schichten (nächste 7 Tage)
              </Typography>
              
              {upcomingShifts.length === 0 ? (
                <Typography color="text.secondary">
                  Keine kommenden Schichten gefunden.
                </Typography>
              ) : (
                <List>
                  {upcomingShifts.slice(0, 6).map((shift: any, index: number) => {
                    const employee = getEmployeeById(shift.employeeId || shift.employee_id);
                    const shiftType = getShiftTypeById(shift.shiftTypeId || shift.shift_type_id);
                    
                    return (
                      <React.Fragment key={shift.id}>
                        <ListItem disableGutters sx={{ py: 1.5 }}>
                          <ListItemAvatar>
                            <Avatar 
                              sx={{ 
                                bgcolor: shiftType?.color || '#1976d2',
                                color: 'white',
                                width: 40,
                                height: 40,
                                fontSize: '1rem'
                              }}
                            >
                              {employee ? (
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {employee.firstName?.[0] || employee.first_name?.[0]}{employee.lastName?.[0] || employee.last_name?.[0]}
                                </Typography>
                              ) : (
                                <WarningIcon sx={{ fontSize: 20 }} />
                              )}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', minWidth: 'fit-content' }}>
                                  {format(new Date(shift.date), 'EEEE, dd.MM.yyyy', { locale: de })}
                                </Typography>
                                <Chip 
                                  label={`${shift.startTime || shift.start_time || 'N/A'} - ${shift.endTime || shift.end_time || 'N/A'}`}
                                  size="small"
                                  sx={{
                                    bgcolor: shiftType?.color || '#1976d2',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem'
                                  }}
                                />
                                <Chip 
                                  label={shiftType?.name || 'Unbekannt'}
                                  size="small"
                                  variant="outlined"
                                  sx={{ 
                                    borderColor: shiftType?.color || '#1976d2',
                                    color: shiftType?.color || '#1976d2',
                                    fontWeight: 'bold'
                                  }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }} component="span">
                                  {employee ? 
                                    `${employee.firstName || employee.first_name || 'N/A'} ${employee.lastName || employee.last_name || 'N/A'}` : 
                                    'Nicht besetzt'
                                  }
                                  {employee?.position && (
                                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                      ({employee.position})
                                    </Typography>
                                  )}
                                </Typography>
                              </Box>
                            }
                            primaryTypographyProps={{ component: 'div' }}
                            secondaryTypographyProps={{ component: 'div' }}
                          />
                        </ListItem>
                        {index < Math.min(upcomingShifts.length, 6) - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Schichttypen Übersicht - Schmalere Spalte */}
  <Grid item xs={12} md={3} lg={3} xl={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Schichttypen
              </Typography>
              
              <List dense>
                {(shiftTypes || []).map((shiftType: any, index: number) => (
                  <React.Fragment key={shiftType.id}>
                    <ListItem disableGutters>
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: shiftType.color || '#1976d2',
                            width: 32,
                            height: 32,
                            mr: 1
                          }}
                        >
                          <ScheduleIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {shiftType.name}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {shiftType.isFlexible 
                                ? 'Flexible Zeiten' 
                                : `${shiftType.startTime || 'N/A'} - ${shiftType.endTime || 'N/A'}`
                              }
                            </Typography>
                            {shiftType.description && (
                              <Typography variant="caption" color="text.secondary">
                                {shiftType.description}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < (shiftTypes || []).length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Dialog */}
      <Dialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Erweiterte Export-Optionen
            <Button onClick={() => setExportDialogOpen(false)}>
              <CloseIcon />
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Zeitraum */}
            <FormControl fullWidth>
              <InputLabel>Zeitraum</InputLabel>
              <Select
                value={exportSettings.timeRange}
                label="Zeitraum"
                onChange={(e) => setExportSettings({
                  ...exportSettings,
                  timeRange: e.target.value
                })}
              >
                <MenuItem value="week">Diese Woche</MenuItem>
                <MenuItem value="month">Dieser Monat</MenuItem>
                <MenuItem value="quarter">Dieses Quartal</MenuItem>
                <MenuItem value="year">Dieses Jahr</MenuItem>
                <MenuItem value="custom">Benutzerdefiniert</MenuItem>
              </Select>
            </FormControl>

            {/* Custom Date Range */}
            {exportSettings.timeRange === 'custom' && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Von"
                  type="date"
                  value={exportSettings.customStartDate}
                  onChange={(e) => setExportSettings({
                    ...exportSettings,
                    customStartDate: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Bis"
                  type="date"
                  value={exportSettings.customEndDate}
                  onChange={(e) => setExportSettings({
                    ...exportSettings,
                    customEndDate: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            )}

            {/* Format */}
            <FormControl fullWidth>
              <InputLabel>Export-Format</InputLabel>
              <Select
                value={exportSettings.format}
                label="Export-Format"
                onChange={(e) => setExportSettings({
                  ...exportSettings,
                  format: e.target.value
                })}
              >
                <MenuItem value="csv">CSV (Excel-kompatibel)</MenuItem>
                <MenuItem value="excel">Excel (.xls) mit Farben</MenuItem>
              </Select>
            </FormControl>

            {/* Was exportieren */}
            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <FormLabel component="legend">
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Was soll im detaillierten Export enthalten sein?</Typography>
              </FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportSettings.includeStatistics}
                      onChange={(e) => setExportSettings({
                        ...exportSettings,
                        includeStatistics: e.target.checked
                      })}
                    />
                  }
                  label="Statistiken & Übersicht"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportSettings.includeShifts}
                      onChange={(e) => setExportSettings({
                        ...exportSettings,
                        includeShifts: e.target.checked
                      })}
                    />
                  }
                  label="Schichten (mit Farben)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportSettings.includeShiftTypes}
                      onChange={(e) => setExportSettings({
                        ...exportSettings,
                        includeShiftTypes: e.target.checked
                      })}
                    />
                  }
                  label="Schichttypen (mit Farben)"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportSettings.includeEmployees}
                      onChange={(e) => setExportSettings({
                        ...exportSettings,
                        includeEmployees: e.target.checked
                      })}
                    />
                  }
                  label="Mitarbeiter"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportSettings.includeOrganizations}
                      onChange={(e) => setExportSettings({
                        ...exportSettings,
                        includeOrganizations: e.target.checked
                      })}
                    />
                  }
                  label="Organisationen"
                />
              </FormGroup>
            </FormControl>

            {/* Info Box */}
            <Paper sx={{ p: 2, backgroundColor: 'info.light', color: 'info.contrastText' }}>
              <Typography variant="body2">
                <strong>💡 Tipp:</strong> Der Excel-Export (.xls) enthält die Farben der Schichttypen als Hex-Codes. 
                CSV-Export ist universell kompatibel und kann in Excel geöffnet werden.
                {exportSettings.format === 'excel' && (
                  <><br />🎨 Excel-Format exportiert Farben als formatierte Zellen!</>
                )}
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <Button 
              variant="contained" 
              onClick={handleSimpleWeekExport}
              startIcon={<GetAppIcon />}
              sx={{
                background: 'linear-gradient(90deg,#FF9800,#FFB74D)',
                color: '#fff',
                fontWeight: 'bold',
                textTransform: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                '&:hover': {
                  background: 'linear-gradient(90deg,#FB8C00,#FFA726)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }
              }}
            >
              Wochenexport (simpel)
            </Button>
          </Box>
          <Button onClick={() => setExportDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            variant="contained" 
            onClick={handleAdvancedExport}
            startIcon={<GetAppIcon />}
            disabled={
              !exportSettings.includeStatistics && 
              !exportSettings.includeShifts && 
              !exportSettings.includeShiftTypes && 
              !exportSettings.includeEmployees && 
              !exportSettings.includeOrganizations
            }
          >
            Export starten
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardComponent;
