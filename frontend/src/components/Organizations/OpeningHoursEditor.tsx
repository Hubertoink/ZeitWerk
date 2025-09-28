import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  useTheme
} from '@mui/material';
import { OpeningHours, DaySchedule } from '../../utils/openingHours';

interface OpeningHoursEditorProps {
  openingHours?: OpeningHours;
  onChange: (openingHours: OpeningHours) => void;
}

const defaultDaySchedule: DaySchedule = {
  open: '09:00',
  close: '17:00',
  closed: false
};

const defaultOpeningHours: OpeningHours = {
  enabled: false,  // 🔧 Standard: Feature ist AUS
  monday: { ...defaultDaySchedule },
  tuesday: { ...defaultDaySchedule },
  wednesday: { ...defaultDaySchedule },
  thursday: { ...defaultDaySchedule },
  friday: { ...defaultDaySchedule },
  saturday: { closed: true },
  sunday: { closed: true }
};

const dayLabels = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
  saturday: 'Samstag',
  sunday: 'Sonntag'
};

const OpeningHoursEditor: React.FC<OpeningHoursEditorProps> = ({ openingHours, onChange }) => {
  const theme = useTheme();
  const [currentHours, setCurrentHours] = useState<OpeningHours>(
    openingHours || defaultOpeningHours
  );
  const [enableOpeningHours, setEnableOpeningHours] = useState<boolean>(
    openingHours?.enabled ?? false  // 🔧 Nutze enabled Flag, Standard false
  );

  // Update state when props change (wichtig für Edit-Dialog!)
  useEffect(() => {
    if (openingHours) {
      setCurrentHours(openingHours);
      setEnableOpeningHours(openingHours.enabled ?? false);  // 🔧 Nutze enabled Flag
    } else {
      setCurrentHours(defaultOpeningHours);
      setEnableOpeningHours(false);
    }
  }, [openingHours]);

  const handleDayChange = (day: keyof typeof dayLabels, field: keyof DaySchedule, value: any) => {
    const currentDaySchedule = currentHours[day] as DaySchedule;
    const newHours = {
      ...currentHours,
      [day]: {
        ...currentDaySchedule,
        [field]: value
      }
    };
    
    // Wenn geschlossen wird, setze Standardzeiten
    if (field === 'closed' && value === true) {
      (newHours as any)[day] = { closed: true };
    } else if (field === 'closed' && value === false) {
      (newHours as any)[day] = {
        open: '09:00',
        close: '17:00',
        closed: false
      };
    }
    
    setCurrentHours(newHours);
    
    // Nur senden wenn Feature aktiviert ist
    if (enableOpeningHours) {
      onChange(newHours);
    }
  };

  const handleToggleOpeningHours = (enabled: boolean) => {
    setEnableOpeningHours(enabled);
    
    if (enabled) {
      // Feature aktiviert - generiere Standard-Öffnungszeiten mit enabled: true
      const enabledHours: OpeningHours = {
        enabled: true,
        monday: { open: '14:00', close: '20:00', closed: false },
        tuesday: { open: '14:00', close: '20:00', closed: false },
        wednesday: { open: '14:00', close: '20:00', closed: false },
        thursday: { open: '14:00', close: '20:00', closed: false },
        friday: { open: '14:00', close: '22:00', closed: false },
        saturday: { closed: true },
        sunday: { closed: true }
      };
      setCurrentHours(enabledHours);
      onChange(enabledHours);
    } else {
      // Feature deaktiviert - sende explizit enabled: false mit leeren Daten
      const disabledHours: OpeningHours = {
        enabled: false,
        monday: { closed: true },
        tuesday: { closed: true },
        wednesday: { closed: true },
        thursday: { closed: true },
        friday: { closed: true },
        saturday: { closed: true },
        sunday: { closed: true }
      };
      setCurrentHours(disabledHours);
      onChange(disabledHours);
    }
  };

  const applyToWorkdays = (schedule: DaySchedule) => {
    const workdays: (keyof Omit<OpeningHours, 'enabled'>)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const newHours = { ...currentHours };
    
    workdays.forEach(day => {
      (newHours as any)[day] = { ...schedule };
    });
    
    setCurrentHours(newHours);
    if (enableOpeningHours) {
      onChange(newHours);
    }
  };

  const applyToWeekend = (schedule: DaySchedule) => {
    const weekend: (keyof Omit<OpeningHours, 'enabled'>)[] = ['saturday', 'sunday'];
    const newHours = { ...currentHours };
    
    weekend.forEach(day => {
      (newHours as any)[day] = { ...schedule };
    });
    
    setCurrentHours(newHours);
    if (enableOpeningHours) {
      onChange(newHours);
    }
  };

  return (
    <Box>
      {/* Feature Toggle */}
      <Box sx={{ 
        mb: 3, 
        p: 2, 
        bgcolor: theme.palette.mode === 'dark' ? '#3f3d41' : 'grey.50', 
        borderRadius: 1,
        border: `1px solid ${theme.palette.mode === 'dark' ? 'grey.700' : 'grey.300'}`
      }}>
        <FormControlLabel
          control={
            <Switch
              checked={enableOpeningHours}
              onChange={(e) => handleToggleOpeningHours(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography 
                variant="h6" 
                component="div"
                sx={{ 
                  color: theme.palette.mode === 'dark' ? 'grey.100' : 'grey.900',
                  fontWeight: 600
                }}
              >
                Öffnungszeiten aktivieren
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: theme.palette.mode === 'dark' ? 'grey.300' : 'grey.600',
                  mt: 0.5
                }}
              >
                {enableOpeningHours 
                  ? 'Öffnungszeiten werden in der Wochenansicht angezeigt'
                  : 'Öffnungszeiten sind deaktiviert - keine Anzeige in der Wochenansicht'
                }
              </Typography>
            </Box>
          }
        />
      </Box>

      {/* Öffnungszeiten Editor - nur wenn aktiviert */}
      {enableOpeningHours && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Öffnungszeiten verwalten
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Lassen Sie die Öffnungszeiten leer, wenn Sie keine Einschränkungen in der Schichtplanung wünschen.
          </Alert>

          {/* Quick Actions */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => applyToWorkdays({ open: '14:00', close: '20:00', closed: false })}
        >
          Standard Werktags (14:00-20:00)
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => applyToWorkdays({ closed: true })}
        >
          Werktags schließen
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => applyToWeekend({ closed: true })}
        >
          Wochenende schließen
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => applyToWeekend({ open: '10:00', close: '18:00', closed: false })}
        >
          Wochenende öffnen
        </Button>
          </Box>

          {/* Wochentage Editor */}
          <Grid container spacing={2}>
        {Object.entries(dayLabels).map(([dayKey, dayLabel]) => {
          const day = dayKey as keyof typeof dayLabels;
          const schedule = currentHours[day] as DaySchedule;
          
          return (
            <Grid item xs={12} sm={6} md={4} key={day}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    {dayLabel}
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={schedule ? !schedule.closed : false}
                        onChange={(e) => handleDayChange(day, 'closed', !e.target.checked)}
                      />
                    }
                    label="Geöffnet"
                    sx={{ mb: 2 }}
                  />
                  
                  {schedule && !schedule.closed && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <TextField
                        label="Öffnung"
                        type="time"
                        size="small"
                        value={schedule.open || '09:00'}
                        onChange={(e) => handleDayChange(day, 'open', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Schließung"
                        type="time"
                        size="small"
                        value={schedule.close || '17:00'}
                        onChange={(e) => handleDayChange(day, 'close', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                  )}
                  
                  {schedule && schedule.closed && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontStyle: 'italic',
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                        padding: '8px',
                        borderRadius: 1,
                        textAlign: 'center'
                      }}
                    >
                      Geschlossen
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
        </>
      )}
    </Box>
  );
};

export default OpeningHoursEditor;
