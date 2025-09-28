import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Backup as BackupIcon,
  Storage as StorageIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api-service';
import { statsService } from '../../services/api';
import { useAppDispatch } from '../../store/hooks';
import { fetchShiftTypes } from '../../store/slices/shiftTypeSlice';
import { fetchOrganizations } from '../../store/slices/organizationSlice';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { fetchShifts } from '../../store/slices/shiftSlice';
import AdminSettings from './AdminSettings';
import HolidayManagement from './HolidayManagement';
import DatabasePathManager from './DatabasePathManager';
import { AppSettings } from '../../types/settings';

interface AdminPanelProps {
  onDataReset?: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onDataReset }) => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState(0);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  React.useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // For now, create simple stats from the API
      const employees = await apiService.getEmployees();
      const shifts = await apiService.getShifts();
      const shiftTypes = await apiService.getShiftTypes();
      const organizations = await apiService.getOrganizations();
      
      const data = {
        employees: employees.length,
        shifts: shifts.length,
        shiftTypes: shiftTypes.length,
        organizations: organizations.length
      };
      
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCreateStandardShiftTypes = async () => {
    setLoading(true);
    try {
      
      const standardShiftTypeNames = ['Frühschicht', 'Spätschicht', 'Abendschicht', 'Urlaub', 'Krankheit', 'Tagdienst'];

      // Get existing shift types to check what's already there
      const existingShiftTypes = await apiService.getShiftTypes();
      
      const existingNames = existingShiftTypes.map(st => st.name?.toLowerCase?.() || '').filter(Boolean);
      const missingTypes = standardShiftTypeNames.filter(name => 
        !existingNames.includes(name.toLowerCase())
      );


      if (missingTypes.length === 0) {
        setSnackbar({
          open: true,
          message: 'Alle Standard-Schichttypen sind bereits vorhanden! ✅',
          severity: 'info'
        });
        return;
      }

      // Define standard shift types
      const standardShiftTypes = [
        { name: 'Frühschicht', startTime: '06:00', endTime: '14:00', color: '#4CAF50', category: 'regular' as const, priority: 1 },
        { name: 'Spätschicht', startTime: '14:00', endTime: '22:00', color: '#2196F3', category: 'regular' as const, priority: 1 },
        { name: 'Abendschicht', startTime: '18:00', endTime: '23:59', color: '#9C27B0', category: 'regular' as const, priority: 1 },
        { name: 'Urlaub', startTime: '00:00', endTime: '23:59', color: '#4CAF50', category: 'absence' as const, priority: 10 },
        { name: 'Krankheit', startTime: '00:00', endTime: '23:59', color: '#F44336', category: 'absence' as const, priority: 10 },
        { name: 'Tagdienst', startTime: '09:00', endTime: '17:00', color: '#FF9800', category: 'regular' as const, priority: 1 }
      ];

      let createdCount = 0;
      for (const shiftType of standardShiftTypes) {
        if (missingTypes.includes(shiftType.name)) {
          await apiService.createShiftType({
            ...shiftType,
            organizationId: null, // Global shift types
            isActive: true
          });
          createdCount++;
        }
      }

  // Created missing standard shift types
      
      // Reload shift types
      await dispatch(fetchShiftTypes());
      await loadStats();
      
      setSnackbar({
        open: true,
        message: `${createdCount} fehlende Standard-Schichttypen erfolgreich erstellt!`,
        severity: 'success'
      });
      
    } catch (error) {
      console.error('❌ Error creating standard shift types:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Erstellen der Standard-Schichttypen: ' + (error as Error).message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
  // Starting database reset
      await statsService.resetDatabase();
  // Database reset completed
      
      // Reload all data in Redux stores
  // Reloading all data
      await Promise.all([
        dispatch(fetchShiftTypes()),
        dispatch(fetchOrganizations()),
        dispatch(fetchEmployees()),
        dispatch(fetchShifts({}))
      ]);
  // All data reloaded
      
      setSnackbar({
        open: true,
        message: 'Datenbank erfolgreich zurückgesetzt und alle Daten neu geladen!',
        severity: 'success'
      });
      
      // Refresh stats
      await loadStats();
      
      // Notify parent component
      if (onDataReset) {
        onDataReset();
      }
      
    } catch (error: any) {
      console.error('❌ Reset failed:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Zurücksetzen: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setResetDialogOpen(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
  // Starting backup
  await statsService.createBackup();
  // Backup created
      
      setSnackbar({
        open: true,
        message: 'Backup erfolgreich erstellt!',
        severity: 'success'
      });
    } catch (error: any) {
      console.error('❌ Backup failed:', error);
      setSnackbar({
        open: true,
        message: `Fehler beim Backup: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setBackupDialogOpen(false);
    }
  };

  // Admin panel is now visible in production as well

  const handleSettingsChange = (_newSettings: AppSettings) => {
    // Settings updated
    setSnackbar({
      open: true,
      message: 'Einstellungen erfolgreich gespeichert!',
      severity: 'success'
    });
  };

  const renderDataManagement = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Datenbank-Verwaltung
      </Typography>

      <Grid container spacing={3}>
        {/* Database Path Manager */}
        <Grid item xs={12}>
          <DatabasePathManager />
        </Grid>

        {/* Stats Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Datenbank-Statistiken
              </Typography>
              {stats && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  <Chip label={`${stats.employees} Mitarbeiter`} color="primary" />
                  <Chip label={`${stats.shifts} Schichten`} color="secondary" />
                  <Chip label={`${stats.shiftTypes} Schichttypen`} color="info" />
                  <Chip label={`${stats.organizations || 'N/A'} Organisationen`} color="success" />
                  {stats.fileSize && (
                    <Chip label={`${stats.fileSize}`} variant="outlined" />
                  )}
                </Box>
              )}
              <Button
                onClick={loadStats}
                startIcon={<RefreshIcon />}
                sx={{ mt: 2 }}
                size="small"
              >
                Aktualisieren
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Actions Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Datenbank-Aktionen
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<StorageIcon />}
                  onClick={handleCreateStandardShiftTypes}
                  disabled={loading}
                >
                  Standard-Schichttypen erstellen
                </Button>
                
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<RefreshIcon />}
                  onClick={() => setResetDialogOpen(true)}
                  disabled={loading}
                >
                  Datenbank zurücksetzen
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<BackupIcon />}
                  onClick={() => setBackupDialogOpen(true)}
                  disabled={loading}
                >
                  Backup erstellen
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        <AdminIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Admin-Bereich
      </Typography>

      <Paper>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SettingsIcon />} label="App-Einstellungen" />
          <Tab icon={<StorageIcon />} label="Datenbank-Verwaltung" />
          <Tab icon={<CalendarIcon />} label="Feiertage-Verwaltung" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && <AdminSettings onSettingsChange={handleSettingsChange} />}
          {activeTab === 1 && renderDataManagement()}
          {activeTab === 2 && <HolidayManagement />}
        </Box>
      </Paper>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Datenbank zurücksetzen</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie alle aktuellen Daten löschen und neue Testdaten laden?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Achtung:</strong> Alle aktuellen Daten gehen verloren! Diese Aktion kann nicht rückgängig gemacht werden.
          </Alert>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Nach dem Reset werden folgende Testdaten erstellt:
          </Typography>
          <ul>
            <li>1 Organisationen (Jugendhaus Demo)</li>
            <li>3 Mitarbeiter</li>
            <li>9 Schichttypen (inkl. spezialisierte Typen)</li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleReset} color="warning" disabled={loading}>
            {loading ? 'Wird zurückgesetzt...' : 'Zurücksetzen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Backup erstellen</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Ein Backup der aktuellen Datenbank wird erstellt. Das Backup enthält:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <Typography component="li">📋 Alle Mitarbeiter und deren Daten</Typography>
            <Typography component="li">🗓️ Alle Schichten und Schichtpläne</Typography>
            <Typography component="li">⚙️ Alle Schichttypen und Organisationen</Typography>
            <Typography component="li">👥 Benutzer und Einstellungen</Typography>
          </Typography>
          <Typography sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
            💡 Das Backup wird als JSON-Datei heruntergeladen und kann später über "Testdaten zurücksetzen" wiederhergestellt werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleBackup} color="primary" disabled={loading}>
            {loading ? 'Erstelle Backup...' : 'Backup erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPanel;
