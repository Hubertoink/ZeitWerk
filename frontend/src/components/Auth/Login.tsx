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
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';

interface LoginProps {
  onLogin?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Simuliere Login-Vorgang
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Speichere Login-Status und Demo-Token
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('authToken', 'demo-token');
      
      // Rufe Callback auf oder lade Seite neu
      if (onLogin) {
        onLogin();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      setError('Anmeldung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    setIsResetting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Datenbankreset fehlgeschlagen');
      }

      const result = await response.json();
      setSuccess('Datenbank wurde erfolgreich zurückgesetzt und mit Standard-Daten initialisiert.');
      
    } catch (error: any) {
      setError('Fehler beim Zurücksetzen der Datenbank: ' + error.message);
    } finally {
      setIsResetting(false);
      setResetDialogOpen(false);
    }
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
      {/* Reset Button - oben rechts */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
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
        ZeitWerk
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Jugendarbeit - Schichtplanung
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2, maxWidth: 400 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mt: 2, maxWidth: 400 }}>
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
          'Anmelden (Demo)'
        )}
      </Button>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
        Demo-Login aktiviert<br />
        Automatische Erstellung von Test-Daten beim ersten Login
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
          <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Folgende Daten werden gelöscht:</strong>
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Alle Mitarbeiter</li>
              <li>Alle Organisationseinheiten</li>
              <li>Alle Schichttypen</li>
              <li>Alle geplanten Schichten</li>
            </ul>
            <Typography variant="body2">
              Nach dem Reset werden Standard-Beispieldaten erstellt.
            </Typography>
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

export default Login;
