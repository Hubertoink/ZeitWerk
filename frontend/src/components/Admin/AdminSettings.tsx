import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Tab,
  Tabs,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  RestoreFromTrash as ResetIcon,
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { de } from 'date-fns/locale';
import { format } from 'date-fns';
import { 
  AppSettings, 
  VacationPeriod, 
  BreakTimeRule, 
  defaultSettings,
  germanStates
} from '../../types/settings';
import { useSettings } from '../../contexts/SettingsContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchOrganizations } from '../../store/slices/organizationSlice';

interface AdminSettingsProps {
  onSettingsChange?: (settings: AppSettings) => void;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ onSettingsChange }) => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Redux für Organisationen
  const dispatch = useAppDispatch();
  const { organizations } = useAppSelector((state: any) => state.organizations);

  // Lade Organisationen beim Mount
  useEffect(() => {
    dispatch(fetchOrganizations());
  }, [dispatch]);

  // Early return if settings not loaded yet
  if (!settings) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Typography>Lade Einstellungen...</Typography>
      </Box>
    );
  }
  
  // Dialog States
  const [vacationDialog, setVacationDialog] = useState(false);
  const [breakDialog, setBreakDialog] = useState(false);
  
  // Form States
  const [newVacation, setNewVacation] = useState<Partial<VacationPeriod>>({
    startDate: format(new Date(), 'yyyy-MM-dd'), // Standardwert: heute
    endDate: format(new Date(), 'yyyy-MM-dd')    // Standardwert: heute
  });
  const [vacationErrors, setVacationErrors] = useState<{
    name?: string;
    startDate?: string;
    endDate?: string;
    range?: string;
  }>({});
  const [newBreakRule, setNewBreakRule] = useState<Partial<BreakTimeRule>>({});
  const [restartRequired, setRestartRequired] = useState(false);

  const handleSettingChange = (category: keyof AppSettings, key: string, value: any) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value
      }
    };
    updateSettings(newSettings);
  };

  // Helper function for admin settings
  const updateSetting = (category: keyof AppSettings, key: string, value: any) => {
    handleSettingChange(category, key, value);
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      // Settings are already saved via updateSettings
      onSettingsChange?.(settings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
    }
  };

  // Schichtplanung-Tab wurde entfernt. Falls noch intern referenziert, noop-Renderer.
  const renderShiftSettings = () => <></>;

  const handleResetSettings = () => {
    updateSettings(defaultSettings);
    onSettingsChange?.(defaultSettings);
  };

  const addVacationPeriod = () => {
  const errors: typeof vacationErrors = {};
  const trimmedName = newVacation.name?.trim() ?? '';

    if (!trimmedName) {
      errors.name = 'Bitte geben Sie einen Namen ein.';
    }

    if (!newVacation.startDate) {
      errors.startDate = 'Bitte wählen Sie ein Startdatum.';
    }

    if (!newVacation.endDate) {
      errors.endDate = 'Bitte wählen Sie ein Enddatum.';
    }

    const startDate = newVacation.startDate ? new Date(newVacation.startDate) : undefined;
    const endDate = newVacation.endDate ? new Date(newVacation.endDate) : undefined;

    if (startDate && isNaN(startDate.getTime())) {
      errors.startDate = 'Ungültiges Startdatum. Bitte korrigieren Sie die Eingabe.';
    }

    if (endDate && isNaN(endDate.getTime())) {
      errors.endDate = 'Ungültiges Enddatum. Bitte korrigieren Sie die Eingabe.';
    }

    if (startDate && endDate && startDate > endDate) {
      errors.range = 'Das Startdatum muss vor dem Enddatum liegen.';
    }

    if (Object.keys(errors).length > 0) {
      setVacationErrors(errors);
      return;
    }

    setVacationErrors({});

    try {
      const vacation: VacationPeriod = {
        id: Date.now().toString(),
  name: trimmedName,
        startDate: format(startDate!, 'yyyy-MM-dd'),
        endDate: format(endDate!, 'yyyy-MM-dd'),
        description: newVacation.description?.trim() || '',
  // Respect the switch: default to true only if undefined, else use provided boolean
  affectsScheduling: newVacation.affectsScheduling === undefined ? true : !!newVacation.affectsScheduling,
        organizationId: newVacation.organizationId || undefined
      };
      
      const newSettings = {
        ...settings,
        calendar: {
          ...settings.calendar,
          vacationPeriods: [...settings.calendar.vacationPeriods, vacation]
        }
      };
      updateSettings(newSettings);
      
      setNewVacation({
        startDate: format(new Date(), 'yyyy-MM-dd'), // Reset mit Standardwerten
        endDate: format(new Date(), 'yyyy-MM-dd')
      });
      setVacationDialog(false);
    } catch (error) {
      console.error('Error adding vacation period:', error);
      alert('Fehler beim Hinzufügen der Urlaubsperiode.');
    }
  };

  const addBreakRule = () => {
    if (newBreakRule.name && newBreakRule.minWorkHours && newBreakRule.breakDuration) {
      const breakRule: BreakTimeRule = {
        id: Date.now().toString(),
        name: newBreakRule.name,
        minWorkHours: newBreakRule.minWorkHours,
        breakDuration: newBreakRule.breakDuration,
        isPaid: newBreakRule.isPaid || false,
        isAutomatic: newBreakRule.isAutomatic || true
      };
      
      const newSettings = {
        ...settings,
        shifts: {
          ...settings.shifts,
          breakTimes: [...settings.shifts.breakTimes, breakRule]
        }
      };
      updateSettings(newSettings);
      
      setNewBreakRule({});
      setBreakDialog(false);
    }
  };

  const removeItem = (category: keyof AppSettings, arrayKey: string, id: string) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [arrayKey]: (settings[category] as any)[arrayKey].filter((item: any) => item.id !== id)
      }
    };
    updateSettings(newSettings);
  };

  const renderCalendarSettings = () => (
    <Grid container spacing={3}>
      {/* Wochenansicht */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Wochenansicht Konfiguration
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Anzahl Tage in Wochenansicht</InputLabel>
              <Select
                value={settings.calendar.weekView}
                label="Anzahl Tage in Wochenansicht"
                onChange={(e) => {
                  const value = e.target.value as 5 | 6 | 7;
                  // Update both weekView and weekViewDays for compatibility
                  const newSettings = {
                    ...settings,
                    calendar: {
                      ...settings.calendar,
                      weekView: value,
                      weekViewDays: value
                    }
                  };
                  updateSettings(newSettings);
                }}
              >
                <MenuItem value={5}>5 Tage (Mo-Fr)</MenuItem>
                <MenuItem value={6}>6 Tage (Mo-Sa)</MenuItem>
                <MenuItem value={7}>7 Tage (Mo-So)</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Bestimmt wie viele Tage in der Wochenansicht angezeigt werden.
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Feiertag-Region */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Feiertag-Konfiguration
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Bundesland für Feiertage</InputLabel>
              <Select
                value={settings.calendar.holidayRegion}
                label="Bundesland für Feiertage"
                onChange={(e) => {
                  const newSettings = {
                    ...settings,
                    calendar: {
                      ...settings.calendar,
                      holidayRegion: e.target.value as string
                    }
                  };
                  updateSettings(newSettings);
                }}
              >
                {germanStates.map((state) => (
                  <MenuItem key={state.value} value={state.value}>
                    {state.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Bestimmt welche Feiertage im Kalender angezeigt werden. 
              Bereits geladene Feiertage anderer Bundesländer bleiben gespeichert.
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Urlaubsperioden */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ 
                color: '#1976d2',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                📅 Urlaubsperioden / Schließzeiten
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setVacationDialog(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Neue Periode
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              {settings.calendar.vacationPeriods.map(period => (
                <Grid item xs={12} md={6} key={period.id}>
                  <Paper sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    background: (theme) => theme.palette.mode === 'dark' 
                      ? 'linear-gradient(145deg, #1e1e1e, #2d2d2d)'
                      : 'linear-gradient(145deg, #fdfdff, #f8fafe)',
                    border: (theme) => theme.palette.mode === 'dark'
                      ? '1px solid rgba(25, 118, 210, 0.2)'
                      : '1px solid rgba(25, 118, 210, 0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: (theme) => theme.palette.mode === 'dark'
                        ? '0 8px 24px rgba(0,0,0,0.4)'
                        : '0 8px 24px rgba(0,0,0,0.12)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ 
                          color: '#1976d2',
                          mb: 1
                        }}>
                          📅 {period.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{
                          fontWeight: 500,
                          mb: 1
                        }}>
                          {format(new Date(period.startDate), 'dd.MM.yyyy')} - {format(new Date(period.endDate), 'dd.MM.yyyy')}
                        </Typography>
                        {period.description && (
                          <Typography variant="body2" sx={{ 
                            mt: 1,
                            p: 1.5,
                            backgroundColor: (theme) => theme.palette.mode === 'dark'
                              ? 'rgba(25, 118, 210, 0.15)'
                              : 'rgba(25, 118, 210, 0.04)',
                            borderRadius: 1,
                            border: (theme) => theme.palette.mode === 'dark'
                              ? '1px solid rgba(25, 118, 210, 0.3)'
                              : '1px solid rgba(25, 118, 210, 0.08)',
                            color: (theme) => theme.palette.mode === 'dark'
                              ? theme.palette.text.primary
                              : 'inherit'
                          }}>
                            {period.description}
                          </Typography>
                        )}
                        {period.organizationId && (
                          <Typography variant="body2" color="primary" sx={{ 
                            mt: 1,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}>
                            🏢 {organizations.find((org: any) => org.id === period.organizationId)?.name || 'Unbekannte Organisation'}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                          <Chip 
                            label={period.affectsScheduling ? "🔄 Beeinflusst Planung" : "ℹ️ Nur Info"} 
                            size="small" 
                            sx={{
                              backgroundColor: period.affectsScheduling ? '#fff3e0' : '#f5f5f5',
                              color: period.affectsScheduling ? '#f57c00' : '#666',
                              fontWeight: 600,
                              borderRadius: 2
                            }}
                          />
                          {!period.organizationId && (
                            <Chip 
                              label="🌐 Alle Organisationen" 
                              size="small" 
                              sx={{
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                                fontWeight: 600,
                                borderRadius: 2
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                      <IconButton 
                        size="small"
                        onClick={() => removeItem('calendar', 'vacationPeriods', period.id)}
                        sx={{
                          color: '#f44336',
                          backgroundColor: 'rgba(244, 67, 54, 0.08)',
                          '&:hover': {
                            backgroundColor: 'rgba(244, 67, 54, 0.16)',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderUiThemeSettings = () => (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Theme Presets (Light)
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Light Theme Preset</InputLabel>
              <Select
                label="Light Theme Preset"
                value={settings.ui.themePresetLight || 'standard'}
                onChange={(e) => updateSetting('ui', 'themePresetLight', e.target.value)}
              >
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="pastel-dreamland">Pastel Dreamland Adventure</MenuItem>
                <MenuItem value="rustic-charm">Rustic Charm</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Theme Presets (Dark)
            </Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>Dark Theme Preset</InputLabel>
              <Select
                label="Dark Theme Preset"
                value={settings.ui.themePresetDark || 'standard'}
                onChange={(e) => updateSetting('ui', 'themePresetDark', e.target.value)}
              >
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="vintage-charm">Vintage Charm</MenuItem>
                <MenuItem value="cherry-blossom">Cherry Blossom</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Ehemaliger Inhalt von Schichtplanung entfernt.

  const renderUISettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Navigation
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Standardansicht nach Login</InputLabel>
              <Select
                value={settings.ui.defaultView}
                label="Standardansicht nach Login"
                onChange={(e) => handleSettingChange('ui', 'defaultView', e.target.value)}
              >
                <MenuItem value="dashboard">Dashboard</MenuItem>
                <MenuItem value="week">Wochenansicht</MenuItem>
                <MenuItem value="month">Monatsansicht</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Bestimmt welche Seite nach dem Login standardmäßig angezeigt wird.
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Datenaufbewahrung
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={!!settings.shifts.autoDeleteOldShifts}
                  onChange={(e) => handleSettingChange('shifts', 'autoDeleteOldShifts', e.target.checked)}
                />
              }
              label="Alte Schichten automatisch löschen"
            />
            <FormControl
              fullWidth
              margin="normal"
              disabled={!settings.shifts.autoDeleteOldShifts}
            >
              <InputLabel>Aufbewahrungsdauer</InputLabel>
              <Select
                value={settings.shifts.autoDeleteAfterMonths ?? 6}
                label="Aufbewahrungsdauer"
                onChange={(e) => handleSettingChange('shifts', 'autoDeleteAfterMonths', Number(e.target.value))}
              >
                <MenuItem value={3}>3 Monate</MenuItem>
                <MenuItem value={6}>6 Monate</MenuItem>
                <MenuItem value={9}>9 Monate</MenuItem>
                <MenuItem value={12}>12 Monate</MenuItem>
                <MenuItem value={18}>18 Monate</MenuItem>
                <MenuItem value={24}>24 Monate</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Löscht beim App-Start automatisch Schichten, deren Datum älter als die gewählte Aufbewahrungsdauer ist.
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Leistung & Grafik
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={(settings.ui.menuIconColor || 'monochrome') === 'themed'}
                  onChange={(e) => {
                    const value = e.target.checked ? 'themed' : 'monochrome';
                    handleSettingChange('ui', 'menuIconColor', value);
                  }}
                />
              }
              label="Menü-Icons in Themenfarben einfärben"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Schaltet zwischen monochromen Icons und farbigen Icons basierend auf dem aktuellen Theme um.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <FormControlLabel
              control={
                <Switch
                  checked={settings.ui.lowGpuMode !== false}
                  onChange={async (e) => {
                    const enabled = e.target.checked;
                    handleSettingChange('ui', 'lowGpuMode', enabled);
                    // Persist to main process settings for early startup use
                    try {
                      const api: any = (window as any).electronAPI;
                      if (api?.appSettings?.set) {
                        await api.appSettings.set({ ui: { lowGpuMode: enabled } });
                      }
                    } catch (err) {
                      console.warn('Low-GPU setting persist failed:', err);
                    }
                    setRestartRequired(true);
                  }}
                />
              }
              label="Low-GPU Modus (Hardwarebeschleunigung aus)"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Reduziert GPU-Nutzung und kann auf älteren/virtuellen Systemen Stabilität verbessern. Änderung erfordert Neustart.
            </Typography>

            {restartRequired && (
              <Alert severity="info" sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box flex={1}>Low-GPU Einstellung aktualisiert. Bitte die App neu starten damit die Änderung wirksam wird.</Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={async () => {
                    try {
                      const api: any = (window as any).electronAPI;
                      if (api?.relaunchApp) {
                        await api.relaunchApp();
                      }
                    } catch (e) {
                      console.warn('Relaunch failed:', e);
                    }
                  }}
                >
                  Jetzt neu starten
                </Button>
              </Alert>
            )}
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Theme-Umschaltung:</strong> Verwenden Sie den Dark/Light Mode Toggle in der oberen rechten Ecke.<br/>
                <strong>Schriftgröße:</strong> Diese Funktion wurde entfernt - wir verwenden die Standard-Schriftgrößen.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAdminSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Administrator & Organisation
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Admin-Benutzername"
                  value={settings.admin.adminUsername}
                  onChange={(e) => updateSetting('admin', 'adminUsername', e.target.value)}
                  helperText="Wird im Login-Bildschirm angezeigt"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Organisation / Unternehmen"
                  value={settings.admin.organizationName}
                  onChange={(e) => updateSetting('admin', 'organizationName', e.target.value)}
                  helperText="Name Ihrer Organisation"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Willkommensnachricht"
                  value={settings.admin.welcomeMessage}
                  onChange={(e) => updateSetting('admin', 'welcomeMessage', e.target.value)}
                  helperText="Diese Nachricht wird beim Login angezeigt"
                />
              </Grid>
            </Grid>
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Admin-Einstellungen:</strong><br/>
                • <strong>Benutzername:</strong> Wird zur Begrüßung im Login verwendet<br/>
                • <strong>Organisation:</strong> Erscheint in Kopfzeilen und Berichten<br/>
                • <strong>Willkommensnachricht:</strong> Personalisierte Begrüßung beim Login
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={de}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Admin Einstellungen
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ResetIcon />}
              onClick={handleResetSettings}
            >
              Zurücksetzen
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
            >
              {saveStatus === 'saving' ? 'Speichern...' : 'Speichern'}
            </Button>
          </Box>
        </Box>

        {saveStatus === 'saved' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Einstellungen erfolgreich gespeichert!
          </Alert>
        )}

        {saveStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Fehler beim Speichern der Einstellungen.
          </Alert>
        )}

        <Paper>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab icon={<CalendarIcon />} label="Wochen- & Urlaubsplanung" />
            {/* Schichtplanung entfernt (TVöD-konforme Pausenberechnung ist fix) */}
            <Tab icon={<SettingsIcon />} label="App-Einstellungen" />
            <Tab icon={<PersonIcon />} label="Admin-Einstellungen" />
          </Tabs>

          <Box sx={{ p: 3 }}>
            {activeTab === 0 && renderCalendarSettings()}
            {/* Indexe angepasst: ehemals 2 -> 1, ehemals 3 -> 2 */}
            {activeTab === 1 && (
              <Box>
                {renderUISettings()}
                {renderUiThemeSettings()}
              </Box>
            )}
            {activeTab === 2 && renderAdminSettings()}
          </Box>
        </Paper>

        {/* Vacation Dialog */}
        <Dialog 
          open={vacationDialog} 
          onClose={() => setVacationDialog(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: (theme) => theme.palette.mode === 'dark' 
                ? 'linear-gradient(145deg, #1e1e1e, #2d2d2d)'
                : 'linear-gradient(145deg, #fdfdff, #f8fafe)',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(0,0,0,0.1)'
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 1,
            background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
            color: 'white',
            borderRadius: '12px 12px 0 0',
            mb: 2
          }}>
            <Box display="flex" alignItems="center" gap={2}>
              <CalendarIcon />
              Neue Urlaubsperiode hinzufügen
            </Box>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              variant="outlined"
              value={newVacation.name || ''}
              onChange={(e) => {
                setVacationErrors(prev => ({ ...prev, name: undefined }));
                setNewVacation(prev => ({ ...prev, name: e.target.value }));
              }}
              error={Boolean(vacationErrors.name)}
              helperText={vacationErrors.name}
            />
            <DatePicker
              label="Startdatum"
              value={newVacation.startDate ? (() => {
                try {
                  return new Date(newVacation.startDate);
                } catch (error) {
                  console.warn('Invalid start date:', newVacation.startDate);
                  return null;
                }
              })() : null}
              onChange={(date) => {
                try {
                  setVacationErrors(prev => ({ ...prev, startDate: undefined, range: undefined }));
                  setNewVacation(prev => ({ 
                    ...prev, 
                    startDate: date ? format(date, 'yyyy-MM-dd') : undefined 
                  }));
                } catch (error) {
                  console.warn('Error setting start date:', error);
                }
              }}
              slotProps={{ 
                textField: { 
                  fullWidth: true, 
                  margin: 'dense',
                  error: Boolean(vacationErrors.startDate),
                  helperText: vacationErrors.startDate
                } 
              }}
            />
            <DatePicker
              label="Enddatum"
              value={newVacation.endDate ? (() => {
                try {
                  return new Date(newVacation.endDate);
                } catch (error) {
                  console.warn('Invalid end date:', newVacation.endDate);
                  return null;
                }
              })() : null}
              onChange={(date) => {
                try {
                  setVacationErrors(prev => ({ ...prev, endDate: undefined, range: undefined }));
                  setNewVacation(prev => ({ 
                    ...prev, 
                    endDate: date ? format(date, 'yyyy-MM-dd') : undefined 
                  }));
                } catch (error) {
                  console.warn('Error setting end date:', error);
                }
              }}
              slotProps={{ 
                textField: { 
                  fullWidth: true, 
                  margin: 'dense',
                  error: Boolean(vacationErrors.endDate),
                  helperText: vacationErrors.endDate
                } 
              }}
            />
            {vacationErrors.range && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {vacationErrors.range}
              </Alert>
            )}
            <FormControl fullWidth margin="dense">
              <InputLabel>Organisation (optional)</InputLabel>
              <Select
                value={newVacation.organizationId || ''}
                onChange={(e) => setNewVacation(prev => ({ ...prev, organizationId: e.target.value || undefined }))}
                label="Organisation (optional)"
              >
                <MenuItem value="">
                  <em>Alle Organisationen</em>
                </MenuItem>
                {organizations.map((org: any) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Beschreibung (optional)"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={newVacation.description || ''}
              onChange={(e) => setNewVacation(prev => ({ ...prev, description: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newVacation.affectsScheduling !== false}
                  onChange={(e) => setNewVacation(prev => ({ ...prev, affectsScheduling: e.target.checked }))}
                />
              }
              label="Beeinflusst Schichtplanung"
            />
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            pb: 3, 
            pt: 2,
            gap: 2
          }}>
            <Button 
              onClick={() => setVacationDialog(false)}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                px: 3
              }}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={addVacationPeriod} 
              variant="contained"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0, #1976d2)'
                }
              }}
            >
              Hinzufügen
            </Button>
          </DialogActions>
        </Dialog>

        {/* Break Rule Dialog */}
        <Dialog 
          open={breakDialog} 
          onClose={() => setBreakDialog(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: (theme) => theme.palette.mode === 'dark' 
                ? 'linear-gradient(145deg, #1e1e1e, #2d2d2d)'
                : 'linear-gradient(145deg, #fdfdff, #f8fafe)',
              boxShadow: (theme) => theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(0,0,0,0.1)'
            }
          }}
        >
          <DialogTitle sx={{ 
            pb: 1,
            background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
            color: 'white',
            borderRadius: '12px 12px 0 0',
            mb: 2
          }}>
            <Box display="flex" alignItems="center" gap={2}>
              <ScheduleIcon />
              Neue Pausenregel hinzufügen
            </Box>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              variant="outlined"
              value={newBreakRule.name || ''}
              onChange={(e) => setNewBreakRule(prev => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              margin="dense"
              label="Mindest-Arbeitszeit (Stunden)"
              type="number"
              fullWidth
              variant="outlined"
              value={newBreakRule.minWorkHours || ''}
              onChange={(e) => setNewBreakRule(prev => ({ ...prev, minWorkHours: parseFloat(e.target.value) }))}
              InputProps={{ inputProps: { min: 0, max: 24, step: 0.5 } }}
            />
            <TextField
              margin="dense"
              label="Pausendauer (Minuten)"
              type="number"
              fullWidth
              variant="outlined"
              value={newBreakRule.breakDuration || ''}
              onChange={(e) => setNewBreakRule(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }))}
              InputProps={{ inputProps: { min: 0, max: 120 } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newBreakRule.isPaid || false}
                  onChange={(e) => setNewBreakRule(prev => ({ ...prev, isPaid: e.target.checked }))}
                />
              }
              label="Bezahlte Pause"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={newBreakRule.isAutomatic !== false}
                  onChange={(e) => setNewBreakRule(prev => ({ ...prev, isAutomatic: e.target.checked }))}
                />
              }
              label="Automatisch berechnen"
            />
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            pb: 3, 
            pt: 2,
            gap: 2
          }}>
            <Button 
              onClick={() => setBreakDialog(false)}
              variant="outlined"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                px: 3
              }}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={addBreakRule} 
              variant="contained"
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0, #1976d2)'
                }
              }}
            >
              Hinzufügen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AdminSettings;
