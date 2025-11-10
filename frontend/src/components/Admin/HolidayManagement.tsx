import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack
} from '@mui/material';
import {
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import apiService from '../../services/api-service';
import { invalidateHolidayCache } from '../../utils/holidays';
import { useSettings } from '../../contexts/SettingsContext';

// Deutsche Bundesländer
const GERMAN_STATES: Record<string, string> = {
  'ALL': 'Alle Bundesländer',
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen'
};

interface HolidayCacheInfo {
  state: string;
  last_updated: string;
  cached_from_year: number;
  cached_to_year: number;
  total_holidays: number;
}

interface StoredHoliday {
  id?: number;
  date: string;
  name: string;
  state?: string | null;
  type?: string;
}

const HolidayManagement: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [selectedState, setSelectedState] = useState<string>(() => settings?.calendar?.holidayRegion || 'ALL');
  const [fromYear, setFromYear] = useState<number>(new Date().getFullYear());
  const [toYear, setToYear] = useState<number>(new Date().getFullYear() + 2);
  const [cacheInfo, setCacheInfo] = useState<HolidayCacheInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [holidayPreview, setHolidayPreview] = useState<StoredHoliday[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ open: false, title: '', message: '', action: () => {} });

  useEffect(() => {
    loadCacheInfo();
  }, []);

  useEffect(() => {
    const configuredState = settings?.calendar?.holidayRegion;
    if (configuredState && configuredState !== selectedState) {
      setSelectedState(configuredState);
    }
  }, [settings?.calendar?.holidayRegion, selectedState]);

  const validateYearRange = () => {
    if (fromYear > toYear) {
      setError('Das Startjahr muss kleiner oder gleich dem Endjahr sein');
      return false;
    }

    const yearCount = toYear - fromYear + 1;
    if (yearCount > 5) {
      setError('Maximal 5 Jahre können auf einmal geladen werden');
      return false;
    }

    return true;
  };

  const loadCacheInfo = async () => {
    try {
      const info = await apiService.getHolidayCacheInfo();
      setCacheInfo(Array.isArray(info) ? info : []);
    } catch (error) {
      console.error('Failed to load cache info:', error);
      setCacheInfo([]);
    }
  };

  const loadHolidayPreview = async (silent = false) => {
    if (!silent && !validateYearRange()) {
      return;
    }

    if (!silent) {
      setPreviewError(null);
    }

    setPreviewLoading(true);

    try {
      const filters: { state?: string; startDate?: string; endDate?: string } = {
        startDate: `${fromYear}-01-01`,
        endDate: `${toYear}-12-31`
      };

      if (selectedState) {
        filters.state = selectedState;
      }

      const holidays = await apiService.getHolidays(filters);
      const normalized = Array.isArray(holidays) ? holidays : [];
      setHolidayPreview(normalized);

      if (!silent) {
        setPreviewError(normalized.length === 0 ? 'Keine gespeicherten Feiertage für diesen Bereich gefunden.' : null);
      }
    } catch (error: any) {
      const message = error?.message || 'Unbekannter Fehler beim Laden der gespeicherten Feiertage.';
      setPreviewError(`❌ ${message}`);
      setHolidayPreview([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleLoadHolidays = async () => {
    if (!validateYearRange()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setLoadingMessage(`Lade Feiertage für ${GERMAN_STATES[selectedState]} (${fromYear}-${toYear})...`);

    try {
      const result = await apiService.loadHolidaysFromAPI(selectedState, fromYear, toYear);
      
      if (result.success) {
        setSuccess(`✅ ${result.count} Feiertage erfolgreich geladen für ${GERMAN_STATES[selectedState]} (${result.fromYear}-${result.toYear})`);
        invalidateHolidayCache(selectedState, {
          startDate: `${fromYear}-01-01`,
          endDate: `${toYear}-12-31`
        });
        if (selectedState !== 'ALL' && settings.calendar.holidayRegion !== selectedState) {
          updateSettings({
            ...settings,
            calendar: {
              ...settings.calendar,
              holidayRegion: selectedState
            }
          });
        }
        await loadCacheInfo(); // Refresh cache info
        await loadHolidayPreview(true);
      } else {
        setError(`❌ Fehler beim Laden: ${result.error}`);
      }
    } catch (error: any) {
      setError(`❌ Fehler beim Laden der Feiertage: ${error.message}`);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleClearCache = (state?: string) => {
    const stateLabel = state ? GERMAN_STATES[state] || state : 'alle Bundesländer';
    
    setConfirmDialog({
      open: true,
      title: 'Feiertage-Cache leeren',
      message: `Möchten Sie wirklich alle gespeicherten Feiertage für ${stateLabel} löschen?`,
      action: async () => {
        setLoading(true);
        setLoadingMessage('Leere Feiertage-Cache...');
        
        try {
          const result = await apiService.clearHolidayCache(state);
          if (result.success) {
            setSuccess(`✅ ${result.deletedCount} Feiertage gelöscht`);
            invalidateHolidayCache(state);
            await loadCacheInfo();
            await loadHolidayPreview(true);
          }
        } catch (error: any) {
          setError(`❌ Fehler beim Löschen: ${error.message}`);
        } finally {
          setLoading(false);
          setLoadingMessage('');
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      }
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (info: HolidayCacheInfo) => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    if (info.cached_to_year >= nextYear) {
      return 'success';
    } else if (info.cached_to_year >= currentYear) {
      return 'warning';
    } else {
      return 'error';
    }
  };

  const getStatusText = (info: HolidayCacheInfo) => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    if (info.cached_to_year >= nextYear) {
      return 'Aktuell';
    } else if (info.cached_to_year >= currentYear) {
      return 'Bald veraltet';
    } else {
      return 'Veraltet';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <CalendarIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Feiertage-Verwaltung
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Verwalten Sie die Feiertage für die Kalender-Ansichten. Laden Sie Feiertage aus der offiziellen deutschen API 
        und speichern Sie diese lokal für bessere Performance.
      </Typography>

      {/* Status Overview */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📊 Cache-Status Übersicht
        </Typography>
        
        {cacheInfo.length === 0 ? (
          <Alert severity="info">
            Noch keine Feiertage geladen. Verwenden Sie die Funktion unten, um Feiertage zu laden.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {cacheInfo.map((info) => (
              <Grid item xs={12} md={6} lg={4} key={info.state}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {GERMAN_STATES[info.state] || info.state}
                      </Typography>
                      <Chip 
                        label={getStatusText(info)} 
                        color={getStatusColor(info)}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary">
                      {info.cached_from_year} - {info.cached_to_year} ({info.total_holidays} Feiertage)
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary">
                      Zuletzt aktualisiert: {formatDate(info.last_updated)}
                    </Typography>
                    
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleClearCache(info.state)}
                        color="error"
                        variant="outlined"
                      >
                        Löschen
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Load Holidays Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          📥 Neue Feiertage laden
        </Typography>

  <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Bundesland</InputLabel>
              <Select
                value={selectedState}
                label="Bundesland"
                onChange={(e) => setSelectedState(e.target.value)}
                disabled={loading}
              >
                {Object.entries(GERMAN_STATES).map(([code, name]) => (
                  <MenuItem key={code} value={code}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Von Jahr</InputLabel>
              <Select
                value={fromYear}
                label="Von Jahr"
                onChange={(e) => setFromYear(Number(e.target.value))}
                disabled={loading}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Bis Jahr</InputLabel>
              <Select
                value={toYear}
                label="Bis Jahr"
                onChange={(e) => setToYear(Number(e.target.value))}
                disabled={loading}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <DownloadIcon />}
                onClick={handleLoadHolidays}
                disabled={loading}
                fullWidth
              >
                {loading ? 'Lade…' : 'Feiertage laden'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<VisibilityIcon />}
                onClick={() => loadHolidayPreview()}
                disabled={loading || previewLoading}
                fullWidth
              >
                Geladene Feiertage anzeigen
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {loading && loadingMessage && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {loadingMessage}
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </Paper>

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Preview of stored holidays */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Gespeicherte Feiertage ({GERMAN_STATES[selectedState]})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Zeitraum: {fromYear} – {toYear}
          </Typography>
        </Box>

        {previewLoading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
          </Box>
        )}

        {previewError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {previewError}
          </Alert>
        )}

        {!previewLoading && holidayPreview.length === 0 && !previewError && (
          <Typography variant="body2" color="text.secondary">
            Noch keine Feiertage geladen. Nutzen Sie „Geladene Feiertage anzeigen“, um die gespeicherten Daten einzusehen.
          </Typography>
        )}

        {holidayPreview.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Datum</TableCell>
                  <TableCell>Feiertag</TableCell>
                  <TableCell>Bundesland</TableCell>
                  <TableCell>Typ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {holidayPreview.map((holiday) => (
                  <TableRow key={`${holiday.date}-${holiday.name}-${holiday.state || 'NATIONAL'}`}>
                    <TableCell>{new Date(holiday.date).toLocaleDateString('de-DE')}</TableCell>
                    <TableCell>{holiday.name}</TableCell>
                    <TableCell>
                      {holiday.state && holiday.state !== 'ALL' ? (GERMAN_STATES[holiday.state] || holiday.state) : 'Bundesweit'}
                    </TableCell>
                    <TableCell>{holiday.type || 'public'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => loadHolidayPreview()}
            disabled={loading || previewLoading}
          >
            Geladene Feiertage anzeigen
          </Button>
        </Box>
      </Paper>

      {/* Actions */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          🛠️ Weitere Aktionen
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCacheInfo}
            disabled={loading}
          >
            Status aktualisieren
          </Button>
          
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleClearCache()}
            disabled={loading}
          >
            Alle Feiertage löschen
          </Button>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Abbrechen
          </Button>
          <Button onClick={confirmDialog.action} color="error" variant="contained">
            Bestätigen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HolidayManagement;
