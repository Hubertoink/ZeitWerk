import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Chip,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Sync as SyncIcon,
  Restore as RestoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Storage as StorageIcon,
  Backup as BackupIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface DatabasePathInfo {
  currentPath: string;
  fallbackPath: string;
  customPath: string | null;
  useCustomPath: boolean;
  autoBackup: boolean;
  lastSync: string | null;
  pathExists: boolean;
  pathSize: number;
  fallbackExists: boolean;
  fallbackSize: number;
  stats: {
    employees: number;
    shifts: number;
    shiftTypes: number;
    organizations: number;
    users: number;
    dbPath: string;
    fileSize: string;
  };
}

const DatabasePathManager: React.FC = () => {
  const [pathInfo, setPathInfo] = useState<DatabasePathInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [copyExisting, setCopyExisting] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Load database path information
  const loadPathInfo = async () => {
    try {
      setLoading(true);
      const api: any = (window as any).electronAPI;
      const info = await api.getDatabasePathInfo();
      setPathInfo(info);
    } catch (error) {
      console.error('Error loading database path info:', error);
      showSnackbar('Fehler beim Laden der Pfad-Informationen', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPathInfo();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSelectFolder = async () => {
    try {
  const api: any = (window as any).electronAPI;
  const result = await api.showDirectoryDialog();
      if (!result.canceled && result.path) {
        setSelectedPath(result.path);
        
        // Validate path
  const validation = await api.validateDatabasePath(result.path);
        if (!validation.valid) {
          showSnackbar(`Pfad ungültig: ${validation.error}`, 'error');
          return;
        }
        
        setChangeDialogOpen(true);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      showSnackbar('Fehler beim Auswählen des Ordners', 'error');
    }
  };

  const handleChangePath = async () => {
    if (!selectedPath) return;

    try {
      setLoading(true);
  const api: any = (window as any).electronAPI;
  const result = await api.setCustomDatabasePath(selectedPath, copyExisting);
      
      if (result.success) {
        showSnackbar(result.message || 'Datenbankpfad erfolgreich geändert', 'success');
        await loadPathInfo();
      } else {
        showSnackbar(result.error || 'Fehler beim Ändern des Pfads', 'error');
      }
    } catch (error) {
      console.error('Error changing database path:', error);
      showSnackbar('Fehler beim Ändern des Datenbankpfads', 'error');
    } finally {
      setLoading(false);
      setChangeDialogOpen(false);
      setSelectedPath('');
    }
  };

  const handleResetPath = async () => {
    try {
      setLoading(true);
  const api: any = (window as any).electronAPI;
  const result = await api.resetDatabasePath(true);
      
      if (result.success) {
        showSnackbar(result.message || 'Datenbankpfad zurückgesetzt', 'success');
        await loadPathInfo();
      } else {
        showSnackbar(result.error || 'Fehler beim Zurücksetzen', 'error');
      }
    } catch (error) {
      console.error('Error resetting database path:', error);
      showSnackbar('Fehler beim Zurücksetzen des Datenbankpfads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDatabases = async () => {
    try {
      setLoading(true);
  const api: any = (window as any).electronAPI;
  const result = await api.syncDatabases();
      
      if (result.success) {
        showSnackbar(result.message || 'Datenbanken synchronisiert', 'success');
        await loadPathInfo();
      } else {
        showSnackbar(result.error || 'Synchronisation fehlgeschlagen', 'error');
      }
    } catch (error) {
      console.error('Error syncing databases:', error);
      showSnackbar('Fehler bei der Synchronisation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPath = (path: string, maxLength: number = 60): string => {
    if (path.length <= maxLength) return path;
    return '...' + path.slice(-(maxLength - 3));
  };

  if (loading && !pathInfo) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StorageIcon />
            <Typography variant="h6">Datenbankpfad-Verwaltung</Typography>
          </Box>
          <LinearProgress sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <StorageIcon sx={{ fontSize: 28, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight="bold">
                Datenbankpfad-Verwaltung
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Datenbanken synchronisieren">
                <span>
                  <IconButton 
                    onClick={handleSyncDatabases} 
                    disabled={loading || !pathInfo?.useCustomPath}
                    color="primary"
                  >
                    <SyncIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Informationen anzeigen">
                <IconButton onClick={() => setDialogOpen(true)} color="info">
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {pathInfo && (
            <Grid container spacing={3}>
              {/* Current Path */}
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: pathInfo.useCustomPath ? 'success.light' : 'grey.100',
                  color: pathInfo.useCustomPath ? 'success.contrastText' : 'text.primary'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <FolderIcon />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Aktueller Datenbankpfad
                    </Typography>
                    {pathInfo.useCustomPath && (
                      <Chip 
                        label="Benutzerdefiniert" 
                        size="small" 
                        sx={{ bgcolor: 'success.dark', color: 'white' }}
                      />
                    )}
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontFamily: 'monospace', 
                      bgcolor: 'rgba(0,0,0,0.1)', 
                      p: 1, 
                      borderRadius: 1 
                    }}
                  >
                    {formatPath(pathInfo.currentPath)}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption">
                      {pathInfo.pathExists ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CheckCircleIcon sx={{ fontSize: 16 }} />
                          Verfügbar - {formatFileSize(pathInfo.pathSize)}
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <WarningIcon sx={{ fontSize: 16 }} />
                          Nicht verfügbar
                        </Box>
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<FolderOpenIcon />}
                    onClick={handleSelectFolder}
                    disabled={loading}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565c0, #1976d2)',
                      }
                    }}
                  >
                    Ordner auswählen
                  </Button>
                  
                  {pathInfo.useCustomPath && (
                    <Button
                      variant="outlined"
                      startIcon={<RestoreIcon />}
                      onClick={handleResetPath}
                      disabled={loading}
                      color="warning"
                    >
                      Zu Standard zurückkehren
                    </Button>
                  )}

                  {pathInfo.useCustomPath && pathInfo.autoBackup && (
                    <Button
                      variant="outlined"
                      startIcon={<SyncIcon />}
                      onClick={handleSyncDatabases}
                      disabled={loading}
                      color="primary"
                    >
                      Synchronisieren
                    </Button>
                  )}
                </Box>
              </Grid>

              {/* Fallback Path Info */}
              {pathInfo.useCustomPath && (
                <Grid item xs={12}>
                  <Alert 
                    severity="info" 
                    icon={<BackupIcon />}
                    sx={{ borderRadius: 2 }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      Fallback-Datenbank aktiv
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      Standard-Pfad: {formatPath(pathInfo.fallbackPath, 50)}
                    </Typography>
                    {pathInfo.lastSync && (
                      <Typography variant="caption" color="text.secondary">
                        Letzte Synchronisation: {format(new Date(pathInfo.lastSync), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </Typography>
                    )}
                  </Alert>
                </Grid>
              )}

              {/* Database Stats */}
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    Datenbank-Statistiken
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`${pathInfo.stats.employees} Mitarbeiter`} size="small" />
                    <Chip label={`${pathInfo.stats.shifts} Schichten`} size="small" />
                    <Chip label={`${pathInfo.stats.shiftTypes} Schichttypen`} size="small" />
                    <Chip label={`${pathInfo.stats.organizations} Organisationen`} size="small" />
                    <Chip label={pathInfo.stats.fileSize} size="small" color="primary" />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}

          {loading && (
            <LinearProgress sx={{ mt: 2 }} />
          )}
        </CardContent>
      </Card>

      {/* Change Path Dialog */}
      <Dialog 
        open={changeDialogOpen} 
        onClose={() => setChangeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            Datenbankpfad ändern
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              Wichtiger Hinweis
            </Typography>
            <Typography variant="body2">
              Die Datenbank wird an den neuen Ort verschoben. Eine Backup-Kopie verbleibt am ursprünglichen Ort.
            </Typography>
          </Alert>
          
          <TextField
            fullWidth
            label="Neuer Datenbankpfad"
            value={selectedPath}
            InputProps={{
              readOnly: true,
              startAdornment: <FolderIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={copyExisting}
                onChange={(e) => setCopyExisting(e.target.checked)}
              />
            }
            label="Bestehende Datenbank kopieren"
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 4, display: 'block' }}>
            Wenn aktiviert, wird die aktuelle Datenbank an den neuen Ort kopiert.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleChangePath} 
            variant="contained"
            disabled={loading}
          >
            Pfad ändern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon />
            Datenbankpfad-Informationen
          </Box>
        </DialogTitle>
        <DialogContent>
          {pathInfo && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Wie funktioniert das System?
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Robustes Fallback-System:</strong><br/>
                  • Primärer Pfad: Ihr gewählter Ordner<br/>
                  • Sekundärer Pfad: Standard-Anwendungsordner<br/>
                  • Automatische Synchronisation zwischen beiden Orten<br/>
                  • Bei Problemen: Automatischer Fallback zum Standard-Pfad
                </Typography>
              </Alert>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Aktuelle Konfiguration
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Primärer Pfad:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {pathInfo.currentPath}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Fallback-Pfad:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {pathInfo.fallbackPath}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Auto-Backup:</strong>
                  </Typography>
                  <Chip 
                    label={pathInfo.autoBackup ? 'Aktiviert' : 'Deaktiviert'} 
                    color={pathInfo.autoBackup ? 'success' : 'default'}
                    size="small"
                  />
                </Grid>

                {pathInfo.lastSync && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Letzte Synchronisation:</strong>
                    </Typography>
                    <Typography variant="body2">
                      {format(new Date(pathInfo.lastSync), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DatabasePathManager;
