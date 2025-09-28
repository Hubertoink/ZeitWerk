import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  IconButton,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNavigate } from 'react-router-dom';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { fetchShiftTypes } from '../../store/slices/shiftTypeSlice';
import { fetchShifts, deleteShift } from '../../store/slices/shiftSlice';
import { setCurrentDate as setCalendarCurrentDate } from '../../store/slices/calendarSlice';
import { fetchOrganizations, setSelectedOrganization } from '../../store/slices/organizationSlice';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  addMonths, 
  subMonths,
  isSameMonth,
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { de } from 'date-fns/locale';
import { Holiday, isHoliday, loadHolidaysForRange } from '../../utils/holidays';
import { VacationPeriod } from '../../types/settings';
import { useSettings } from '../../contexts/SettingsContext';

const MonthView: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const lowGpu = !!settings?.ui?.lowGpuMode;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([]);
  
  const { employees } = useAppSelector((state: any) => state.employees);
  const { shiftTypes } = useAppSelector((state: any) => state.shiftTypes);
  const { shifts } = useAppSelector((state: any) => state.shifts);
  const { organizations, selectedOrganization } = useAppSelector((state: any) => state.organizations);

  // Lade Daten beim Komponenten-Mount und Datumswechsel
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      // Erweitere den Zeitraum um den sichtbaren Kalenderbereich
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      
      console.log('MonthView: Loading data for', format(calendarStart, 'yyyy-MM-dd'), 'to', format(calendarEnd, 'yyyy-MM-dd'));
      
      await Promise.all([
        dispatch(fetchEmployees()),
        dispatch(fetchShiftTypes()),
        dispatch(fetchOrganizations()),
        dispatch(fetchShifts({
          startDate: format(calendarStart, 'yyyy-MM-dd'),
          endDate: format(calendarEnd, 'yyyy-MM-dd')
        }))
      ]);

      // Lade Feiertage für den Monat
      try {
        const holidaysData = await loadHolidaysForRange(calendarStart, calendarEnd);
        setHolidays(holidaysData);
      } catch (error) {
        console.error('Fehler beim Laden der Feiertage:', error);
      }

      // Lade Schließzeiten/Urlaubsperioden aus den Einstellungen  
      if (settings?.calendar?.vacationPeriods) {
        setVacationPeriods(settings.calendar.vacationPeriods);
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, [dispatch, currentDate]);

  // Navigation functions
  const handleGoToWeek = (date: Date) => {
    try {
      // Set clicked day as currentDate in calendar and navigate to week view
      dispatch(setCalendarCurrentDate(date.toISOString()));
      navigate('/week');
    } catch {}
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Tastatur-Navigation - nur für spezifische Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      
      // Explizit prüfen, ob wir in einem Input sind - wenn ja, komplett raus
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]') ||
          target.closest('.MuiInputBase-root') ||
          target.closest('[role="textbox"]') ||
          target.closest('[role="combobox"]') ||
          target.closest('[role="spinbutton"]')) {
        return; // Komplett raus bei jeder Art von Input
      }
      
      // Nur auf Pfeiltasten + Modifier oder spezielle Keys reagieren
      const isArrowKey = ['ArrowLeft', 'ArrowRight'].includes(event.key);
      const isSpecialKey = ['Home'].includes(event.key);
      
      if (!isArrowKey && !isSpecialKey) {
        return; // Ignoriere alle anderen Keys
      }

      // Bei Pfeiltasten nur reagieren wenn KEINE Modifier gedrückt sind
      if (isArrowKey && (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePreviousMonth();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextMonth();
          break;
        case 'Home':
          if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
            event.preventDefault();
            handleToday();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // Auto-select first organization if none selected
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrganization) {
      console.log('MonthView: Auto-selecting first organization:', organizations[0]);
      dispatch(setSelectedOrganization(organizations[0]));
    }
  }, [organizations, selectedOrganization, dispatch]);

  // Filter employees by selected organization (wie in WeekView)
  const filteredEmployees = selectedOrganization 
    ? (employees || []).filter((emp: any) => emp.organizationId === selectedOrganization.id)
    : (employees || []);

  // Debug-Ausgabe für geladene Daten
  useEffect(() => {
    console.log('MonthView: Loaded data:', {
      employees: (employees || []).length,
      filteredEmployees: filteredEmployees.length,
      shiftTypes: (shiftTypes || []).length,
      shifts: (shifts || []).length,
      organizations: (organizations || []).length,
      selectedOrganization,
      shiftsData: shifts
    });
  }, [employees, filteredEmployees, shiftTypes, shifts, organizations, selectedOrganization]);

  // Berechne Kalender-Tage (6 Wochen Grid)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  // Hilfsfunktionen
  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const allShifts = shifts || [];
    const dayShifts = allShifts.filter((shift: any) => {
      const shiftDate = new Date(shift.date);
      const shiftDateStr = format(shiftDate, 'yyyy-MM-dd');
      const dateMatch = shiftDateStr === dateStr;
      // Korrigiere Organization-Filterung - unterstütze beide Feldnamen
      const orgMatch = !selectedOrganization || 
        (shift.organizationId && shift.organizationId.toString() === selectedOrganization.id.toString()) ||
        (shift.organization_id && shift.organization_id.toString() === selectedOrganization.id.toString());
      return dateMatch && orgMatch;
    });
    
    // Debug für erste paar Tage
    if (dateStr === '2025-09-01' || dateStr === '2025-09-02') {
      console.log(`Shifts for ${dateStr}:`, dayShifts, 'from total:', allShifts.length);
    }
    
    return dayShifts;
  };

  const getEmployeeById = (id: number | string) => {
    if (!id) return null;
    const allEmployees = employees || [];
    return allEmployees.find((emp: any) => emp.id.toString() === id.toString());
  };

  const getShiftTypeById = (id: number | string) => {
    if (!id) return null;
    const allShiftTypes = shiftTypes || [];
    return allShiftTypes.find((st: any) => st.id.toString() === id.toString());
  };

  // Hilfsfunktion: Prüfe ob ein Tag in einer Schließzeit liegt
  const isVacationDay = (date: Date): VacationPeriod | null => {
    return vacationPeriods.find(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      
      // Normalisiere alle Daten auf 00:00:00 Uhrzeit zur korrekten Vergleichung
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      const isInDateRange = normalizedDate >= normalizedStartDate && normalizedDate <= normalizedEndDate;
      
      // Wenn keine Organisation für die Periode definiert ist, gilt sie für alle
      if (!period.organizationId) {
        return isInDateRange;
      }
      
      // Wenn eine Organisation definiert ist, prüfe ob sie mit der aktuell ausgewählten übereinstimmt
      return isInDateRange && period.organizationId === selectedOrganization?.id;
    }) || null;
  };

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Monatsansicht
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="outlined" onClick={handleToday}>
            Heute
          </Button>
          
          {/* Tastatur-Navigation Info */}
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'center',
            backgroundColor: 'action.hover',
            padding: 1,
            borderRadius: 1,
            ml: 1
          }}>
            <Typography variant="caption" color="text.secondary">
              Tastatur:
            </Typography>
            <Chip size="small" label="← →" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            <Typography variant="caption" color="text.secondary">
              Monat
            </Typography>
            <Chip size="small" label="Home" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            <Typography variant="caption" color="text.secondary">
              Heute
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Monats-Navigation */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton onClick={handlePreviousMonth} size="large">
            <ChevronLeft />
          </IconButton>
          
          <Typography variant="h5" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
            {format(currentDate, 'MMMM yyyy', { locale: de })}
          </Typography>
          
          <IconButton onClick={handleNextMonth} size="large">
            <ChevronRight />
          </IconButton>
        </Box>
      </Paper>

      {/* Organisation Info (wie in WeekView) */}
      {selectedOrganization && (
        <Box sx={{ mb: 2 }}>
          <Chip 
            label={`Organisation: ${selectedOrganization.name}`}
            sx={(theme) => ({
              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.main,
              color: theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.contrastText,
              fontWeight: 'bold',
              boxShadow: theme.shadows[2],
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
              }
            })}
          />
        </Box>
      )}

      {/* Info wenn keine Mitarbeiter vorhanden */}
      {filteredEmployees.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, mb: 2 }}>
          <Typography variant="h6" color="text.secondary">
            Keine Mitarbeiter gefunden
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedOrganization 
              ? `Für die Organisation "${selectedOrganization.name}" sind keine Mitarbeiter hinterlegt.`
              : 'Bitte wählen Sie eine Organisation aus oder legen Sie Mitarbeiter an.'
            }
          </Typography>
        </Box>
      )}

      {/* Kalender */}
      <Paper sx={{ p: 2 }}>
        {/* Wochentage Header */}
        <Grid container sx={{ mb: 1 }}>
          {weekDays.map((day) => (
            <Grid item xs={12/7} key={day}>
              <Box sx={{ 
                p: 1, 
                textAlign: 'center', 
                fontWeight: 'bold',
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                backgroundColor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(103, 80, 164, 0.08)',
                backdropFilter: lowGpu ? 'none' : 'blur(8px)',
                color: (theme) => theme.palette.mode === 'dark' 
                  ? theme.palette.primary.light 
                  : theme.palette.primary.main
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: (theme) => theme.palette.mode === 'dark' 
                      ? theme.palette.primary.light 
                      : theme.palette.primary.main
                  }}
                >
                  {day}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Kalender-Grid */}
        <Grid container>
          {calendarDays.map((day, index) => {
            const dayShifts = getShiftsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const vacation = isVacationDay(day);

            return (
              <Grid item xs={12/7} key={index}>
                <Card 
                  sx={{ 
                    minHeight: '140px',
                    m: 0.5,
                    backgroundColor: (theme) => 
                      vacation 
                        ? theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.1)' : '#fff3e0'
                        : isCurrentDay 
                        ? theme.palette.mode === 'dark' ? 'rgba(208, 188, 255, 0.1)' : '#e3f2fd'
                        : isCurrentMonth 
                        ? theme.palette.background.paper 
                        : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f9f9f9',
                    border: (theme) => 
                      vacation 
                        ? `2px solid ${theme.palette.warning.main}`
                        : isCurrentDay 
                        ? `2px solid ${theme.palette.primary.main}` 
                        : `1px solid ${theme.palette.divider}`,
                    opacity: isCurrentMonth ? 1 : 0.7,
                    cursor: 'pointer',
                    backdropFilter: lowGpu ? 'none' : 'blur(8px)',
                    '&:hover': {
                      backgroundColor: (theme) => 
                        vacation 
                          ? theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.15)' : '#ffecb3'
                          : isCurrentDay 
                          ? theme.palette.mode === 'dark' ? 'rgba(208, 188, 255, 0.15)' : '#e3f2fd'
                          : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5',
                      ...(lowGpu ? {} : {
                        transform: 'translateY(-1px)',
                        boxShadow: (theme) => theme.palette.mode === 'dark' 
                          ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
                          : '0 4px 12px rgba(103, 80, 164, 0.1)'
                      })
                    },
                    transition: lowGpu ? 'background-color 0.15s ease, border-color 0.15s ease' : 'all 0.2s ease-in-out'
                  }}
                  onClick={() => handleGoToWeek(day)}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    {/* Tagesnummer - IMMER oben, auch bei Schließzeiten */}
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      mb: 1 
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isCurrentDay ? 'bold' : 'normal',
                          color: (theme) => {
                            if (isCurrentDay) return theme.palette.primary.main;
                            if (!isCurrentMonth) return theme.palette.text.disabled;
                            return theme.palette.text.primary;
                          },
                          fontSize: '0.9rem',
                          zIndex: 10,
                          backgroundColor: vacation ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                          borderRadius: vacation ? 1 : 0,
                          px: vacation ? 1 : 0,
                          py: vacation ? 0.25 : 0,
                          boxShadow: vacation ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      
                      {/* Schließzeit-Icon kompakt rechts oben */}
                      {vacation && (
                        <Chip 
                          size="small"
                          label="🏖️"
                          sx={{ 
                            backgroundColor: 'warning.main',
                            color: 'white',
                            fontSize: '0.7rem',
                            height: 20,
                            minWidth: 28,
                            '& .MuiChip-label': {
                              px: 0.5
                            }
                          }}
                        />
                      )}
                    </Box>
                    
                    {/* Schließzeit-Info kompakt */}
                    {vacation && (
                      <Box sx={{ mb: 1 }}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.65rem',
                            color: 'warning.dark',
                            fontWeight: 'bold',
                            display: 'block',
                            textAlign: 'center',
                            backgroundColor: 'warning.light',
                            padding: '2px 4px',
                            borderRadius: 1,
                            lineHeight: 1.2
                          }}
                        >
                          SCHLIESSZEIT
                          <br />
                          <span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>
                            {vacation.name}
                          </span>
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Feiertag anzeigen */}
                    {(() => {
                      const holiday = isHoliday(day, holidays);
                      return holiday && !vacation ? (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.6rem',
                            color: 'error.main',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            display: 'block',
                            mb: 0.5,
                            lineHeight: 1
                          }}
                        >
                          {holiday.name}
                        </Typography>
                      ) : null;
                    })()}
                    
                    {/* Schichten für den Tag - nur wenn keine Schließzeit */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {!vacation && dayShifts && dayShifts.length > 0 ? dayShifts.slice(0, 3).map((shift: any) => {
                        const employee = getEmployeeById(shift.employeeId || shift.employee_id);
                        const shiftType = getShiftTypeById(shift.shiftTypeId || shift.shift_type_id);
                        const shiftColor = shiftType?.color || '#666';
                        
                        return (
                          <Card 
                            key={shift.id} 
                            sx={{ 
                              minHeight: 28,
                              cursor: 'pointer',
                              position: 'relative',
                              backgroundColor: shiftColor,
                              borderRadius: 2,
                              transition: lowGpu ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                              '&:hover': { 
                                zIndex: 5,
                                backgroundColor: shiftColor, // Farbe beibehalten
                                '& .delete-button': { display: 'flex' },
                                ...(lowGpu ? {} : {
                                  transform: 'scale(1.03)',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.35)'
                                })
                              }
                            }}
                          >
                            <CardContent sx={{ p: 0.5, '&:last-child': { pb: 0.5 } }} onClick={(e) => {
                              e.stopPropagation();
                              // Optional: könnte Editing öffnen wenn vorhanden
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Avatar sx={{ 
                                  width: 16, 
                                  height: 16, 
                                  fontSize: '0.6rem',
                                  bgcolor: employee ? 'rgba(255,255,255,0.8)' : 'rgba(255,0,0,0.8)',
                                  color: employee ? 'black' : 'white'
                                }}>
                                  {employee ? (
                                    `${employee.firstName?.[0] || employee.first_name?.[0] || '?'}${employee.lastName?.[0] || employee.last_name?.[0] || '?'}`
                                  ) : (
                                    <PersonIcon sx={{ fontSize: 12 }} />
                                  )}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontSize: '0.65rem', 
                                      lineHeight: 1,
                                      color: 'white',
                                      fontWeight: 'bold',
                                      display: 'block',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {(shift.startTime || shift.start_time)} - {(shift.endTime || shift.end_time)}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontSize: '0.6rem', 
                                      lineHeight: 1,
                                      color: 'rgba(255,255,255,0.9)',
                                      display: 'block',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {employee ? `${employee.firstName || employee.first_name || 'N/A'} ${employee.lastName || employee.last_name || 'N/A'}` : 'Nicht besetzt'}
                                  </Typography>
                                  {shiftType && (
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontSize: '0.55rem', 
                                        lineHeight: 1,
                                        color: 'rgba(255,255,255,0.8)',
                                        fontStyle: 'italic',
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {shiftType.name}
                                    </Typography>
                                  )}
                                </Box>
                                {/* Delete Button */}
                                <Box
                                  className="delete-button"
                                  sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: 4,
                                    transform: 'translateY(-50%)',
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    display: 'none',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'error.main',
                                    color: 'white',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'error.dark' },
                                    zIndex: 10
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Lösch-Logik via Redux
                                    dispatch(deleteShift(parseInt(shift.id))).then(() => {
                                      dispatch(fetchShifts({}));
                                    });
                                  }}
                                >
                                  <span style={{ fontSize: '0.6rem', fontWeight: 'bold' }}>×</span>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      }) : null}
                      
                      {/* Overflow-Indikator - nur wenn keine Schließzeit */}
                      {!vacation && dayShifts && dayShifts.length > 3 && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ 
                            textAlign: 'center',
                            fontSize: '0.7rem',
                            fontStyle: 'italic'
                          }}
                        >
                          +{dayShifts.length - 3} weitere
                        </Typography>
                      )}
                      
                      {/* Info für Schließzeiten */}
                      {vacation && dayShifts && dayShifts.length > 0 && (
                        <Typography 
                          variant="caption" 
                          color="warning.dark" 
                          sx={{ 
                            textAlign: 'center',
                            fontSize: '0.65rem',
                            fontStyle: 'italic',
                            backgroundColor: 'warning.light',
                            padding: '2px 4px',
                            borderRadius: 1
                          }}
                        >
                          {dayShifts.length} Schicht{dayShifts.length > 1 ? 'en' : ''} geplant
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
};

export default MonthView;
