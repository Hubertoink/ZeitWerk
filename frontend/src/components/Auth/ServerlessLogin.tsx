import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import { Delete as DeleteIcon, Warning as WarningIcon, Storage as StorageIcon, UploadFile as UploadFileIcon } from '@mui/icons-material';
import { electronAPI } from '../../services/electron-api';
import { useSettings } from '../../contexts/SettingsContext';

interface LoginProps {
  onLogin?: () => void;
}

const ServerlessLogin: React.FC<LoginProps> = ({ onLogin }) => {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);

  React.useEffect(() => {
    // Load database stats on component mount
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      const stats = await electronAPI.getDatabaseStats();
      // Normalisiere unterschiedliche Feldnamen (JSON DB: fileSize als String "11.35 KB", SQLite: dbSize als Zahl in KB)
      const s: any = stats;
      const normalized = {
        ...s,
        fileSize: s.fileSize || (typeof s.dbSize === 'number' ? `${s.dbSize} KB` : undefined)
      } as any;
      setDbStats(normalized);
    } catch (error) {
      console.warn('Could not load database stats:', error);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Simulate login process for serverless version
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if we're running in Electron
      if (!electronAPI.isElectron()) {
        throw new Error('Diese App läuft nur in der Desktop-Version');
      }
      
      // Store login status (simplified for demo)
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('authToken', 'serverless-token');
      localStorage.setItem('loginTime', new Date().toISOString());
      
      // Call login callback or reload
      if (onLogin) {
        onLogin();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      setError(error.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    setError(null);
    setSuccess(null);

    try {
      const resetSuccess = await electronAPI.resetDatabase();
      
      if (resetSuccess) {
        setSuccess('Datenbank wurde erfolgreich zurückgesetzt und mit Standard-Daten initialisiert.');
        
        // Reload database stats
        setTimeout(() => {
          loadDatabaseStats();
        }, 1000);
      } else {
        throw new Error('Reset-Operation fehlgeschlagen');
      }
      
    } catch (error: any) {
      setError('Fehler beim Zurücksetzen der Datenbank: ' + error.message);
    } finally {
      setIsResetting(false);
      setResetDialogOpen(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setError(null);
      const backupPath = await electronAPI.createBackup();
      setSuccess(`Backup erstellt: ${backupPath}`);
    } catch (error: any) {
      setError('Backup-Erstellung fehlgeschlagen: ' + error.message);
    }
  };

  const handleImportBackup = async () => {
    // Create file input element for browser-based file selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) {
        setError('Keine Datei ausgewählt');
        return;
      }

      if (!file.name.toLowerCase().endsWith('.json')) {
        setError('Bitte wählen Sie eine JSON-Datei aus');
        return;
      }

      try {
        setError(null);
        setSuccess(null);
        
        // Read file content
        const fileContent = await file.text();
        const backupData = JSON.parse(fileContent);
        
        // Validate backup structure
        const requiredTables = ['employees', 'shifts', 'shiftTypes', 'organizations', 'users'];
        for (const table of requiredTables) {
          if (!Array.isArray(backupData[table])) {
            throw new Error(`Ungültige Backup-Struktur: ${table} fehlt oder ist kein Array`);
          }
        }
        
        // Import via Electron API with file content
        const result = await electronAPI.importBackupFromData(backupData);
        
        if (result.success) {
          setSuccess(result.message + (result.backupPath ? ` Aktueller Stand gesichert in: ${result.backupPath}` : ''));
          
          // Reload database stats after import
          setTimeout(() => {
            loadDatabaseStats();
          }, 1000);
        } else {
          setError(result.message || 'Import fehlgeschlagen');
        }
      } catch (error: any) {
        setError('Import fehlgeschlagen: ' + error.message);
      } finally {
        // Cleanup
        document.body.removeChild(fileInput);
      }
    };
    
    // Trigger file selection
    document.body.appendChild(fileInput);
    fileInput.click();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 2,
        p: 3,
        position: 'relative',
      }}
    >
      {/* Header with app info */}
      <Box sx={{ position: 'absolute', top: 20, left: 20 }}>
        <Chip 
          icon={<StorageIcon />}
          label="Serverless Version" 
          color="primary" 
          variant="outlined"
        />
      </Box>

      {/* Database controls - top right */}
      <Box sx={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 1 }}>
        <Tooltip title="Datenbank-Backup erstellen">
          <IconButton
            color="primary"
            onClick={handleCreateBackup}
            disabled={isLoading || isResetting}
          >
            <StorageIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Backup importieren">
          <IconButton
            color="success"
            onClick={handleImportBackup}
            disabled={isLoading || isResetting}
          >
            <UploadFileIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Datenbank zurücksetzen">
          <IconButton
            color="error"
            onClick={() => setResetDialogOpen(true)}
            disabled={isLoading || isResetting}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ZeitWerk Logo */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <img
          src="./ZeitWerk-Logo.png"
          alt="ZeitWerk Logo"
          style={{
            width: '120px',
            height: 'auto',
            marginBottom: '16px',
            filter: 'drop-shadow(0 4px 8px rgba(103, 80, 164, 0.3))',
          }}
        />
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        {settings.admin.organizationName || 'Dienstplan OKJA'}
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {settings.admin.welcomeMessage || 'Serverless Desktop-App'}
      </Typography>
      
      {settings.admin.adminUsername && (
        <Typography variant="body1" color="primary" sx={{ mb: 2, fontStyle: 'italic' }}>
          Willkommen, {settings.admin.adminUsername}!
        </Typography>
      )}

      {/* Database Stats */}
      {dbStats && (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'background.paper', 
          borderRadius: 1, 
          border: 1, 
          borderColor: 'divider',
          minWidth: 300,
          textAlign: 'center'
        }}>
          <Typography variant="subtitle2" gutterBottom>
            Datenbank-Status
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
            <Box>
              <Typography variant="h6" color="primary">{dbStats.employees}</Typography>
              <Typography variant="caption">Mitarbeiter</Typography>
            </Box>
            <Box>
              <Typography variant="h6" color="secondary">{dbStats.shiftTypes}</Typography>
              <Typography variant="caption">Schichttypen</Typography>
            </Box>
            <Box>
              <Typography variant="h6" color="success.main">{dbStats.shifts}</Typography>
              <Typography variant="caption">Schichten</Typography>
            </Box>
            <Box>
              <Typography variant="h6" color="text.secondary">{dbStats.fileSize || (dbStats.dbSize ? `${dbStats.dbSize} KB` : '—')}</Typography>
              <Typography variant="caption">DB-Größe</Typography>
            </Box>
          </Box>
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2, maxWidth: 500 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2, maxWidth: 500 }}>
          {success}
        </Alert>
      )}
      
      <Button
        variant="contained"
        size="large"
        onClick={handleLogin}
        disabled={isLoading || isResetting}
        sx={{ mt: 2, minWidth: 200 }}
      >
        {isLoading ? (
          <>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            Anmelden...
          </>
        ) : (
          'App starten'
        )}
      </Button>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
        🚀 Serverless Desktop-App<br />
        ⚡ Direkte SQLite-Datenbank<br />
        🔒 Keine Netzwerk-Abhängigkeiten
      </Typography>

      {/* Reset Database Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Datenbank zurücksetzen
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>Achtung:</strong> Diese Aktion löscht alle vorhandenen Daten unwiderruflich!
          </DialogContentText>
          
          {dbStats && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'warning.dark' : 'warning.light',
              color: (theme) => theme.palette.mode === 'dark' ? 'warning.contrastText' : 'text.primary',
              borderRadius: 1 
            }}>
              <Typography variant="body2" gutterBottom sx={{ 
                color: (theme) => theme.palette.mode === 'dark' ? 'warning.contrastText' : 'text.primary' 
              }}>
                <strong>Aktuelle Datenbank-Inhalte:</strong>
              </Typography>
              <ul style={{ 
                margin: '8px 0', 
                paddingLeft: '20px',
                color: 'inherit'
              }}>
                <li>{dbStats.employees} Mitarbeiter</li>
                <li>{dbStats.shiftTypes} Schichttypen</li>
                <li>{dbStats.shifts} geplante Schichten</li>
                <li>{dbStats.organizations} Organisationseinheiten</li>
              </ul>
            </Box>
          )}
          
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'info.dark' : 'info.light',
            color: (theme) => theme.palette.mode === 'dark' ? 'info.contrastText' : 'text.primary',
            borderRadius: 1 
          }}>
            <Typography variant="body2" sx={{ 
              color: (theme) => theme.palette.mode === 'dark' ? 'info.contrastText' : 'text.primary' 
            }}>
              <strong>Nach dem Reset werden erstellt:</strong>
            </Typography>
            <ul style={{ 
              margin: '8px 0', 
              paddingLeft: '20px',
              color: 'inherit'
            }}>
              <li>1 Demo-Organisation</li>
              <li>6 Standard-Schichttypen</li>
              <li>3 Demo-Mitarbeiter</li>
              <li>0 Beispiel-Schichten</li>
            </ul>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setResetDialogOpen(false)}
            disabled={isResetting}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleResetDatabase} 
            color="error" 
            variant="contained"
            disabled={isResetting}
            startIcon={isResetting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isResetting ? 'Wird zurückgesetzt...' : 'Ja, zurücksetzen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServerlessLogin;
