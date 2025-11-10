import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  InputAdornment,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from '../../store/slices/employeeSlice';
import { fetchOrganizations } from '../../store/slices/organizationSlice';
import ConfirmationDialog from '../Common/ConfirmationDialog';
import { useConfirmationDialog } from '../../hooks/useConfirmationDialog';

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl?: string; // legacy support
  photoPath?: string; // new local path stored in userData/photos
  position: string;
  department: string;
  hireDate: string;
  organizationId: string;
  notes?: string;
  weeklyHours?: string; // Eingabe als Text, Speicherung als Zahl
  dailyHoursPlan?: {
    mon?: string;
    tue?: string;
    wed?: string;
    thu?: string;
    fri?: string;
    sat?: string;
    sun?: string;
  };
}

const EmployeeList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { employees, error } = useAppSelector((state: any) => state.employees);
  const { organizations } = useAppSelector((state: any) => state.organizations);

  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [searchTerm, setSearchTerm] = useState('');
  const [closeConfirmDialog, setCloseConfirmDialog] = useState(false);
  
  // Custom confirmation dialog
  const { showConfirmation, confirmationDialog } = useConfirmationDialog();
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    hireDate: '',
    organizationId: '',
    notes: '',
    weeklyHours: '',
    dailyHoursPlan: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' }
  });

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchOrganizations());
  }, [dispatch]);

  // Update formData when organizations are loaded (for new employee default)
  useEffect(() => {
    if (organizations.length > 0 && !editingEmployee && formData.organizationId === '') {
      setFormData(prev => ({
        ...prev,
        organizationId: organizations[0].id,
        notes: ''
      }));
    }
  }, [organizations, editingEmployee, formData.organizationId]);

  const getOrganizationName = (organizationId: string) => {
    if (!organizationId) {
      return 'Keine Organisation';
    }
    const org = organizations.find((o: any) => o.id === organizationId);
    return org ? org.name : 'Keine Organisation';
  };

  const getOrganizationColor = (organizationId: string) => {
    if (!organizationId) {
      return '#1976d2'; // Default blue color
    }
    const org = organizations.find((o: any) => o.id === organizationId);
    return org?.color || '#1976d2';
  };

  const handleOpenDialog = (employee?: any) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        photoUrl: employee.photoUrl || '',
        photoPath: employee.photoPath || '',
        position: employee.position || '',
        department: employee.department || '',
        hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
        organizationId: employee.organizationId || '',
        notes: employee.notes || '',
        weeklyHours: (typeof employee.weeklyHours === 'number' && !isNaN(employee.weeklyHours)) ? String(employee.weeklyHours) : '',
        dailyHoursPlan: {
          mon: employee.dailyHoursPlan?.mon != null ? String(employee.dailyHoursPlan.mon) : '',
          tue: employee.dailyHoursPlan?.tue != null ? String(employee.dailyHoursPlan.tue) : '',
          wed: employee.dailyHoursPlan?.wed != null ? String(employee.dailyHoursPlan.wed) : '',
          thu: employee.dailyHoursPlan?.thu != null ? String(employee.dailyHoursPlan.thu) : '',
          fri: employee.dailyHoursPlan?.fri != null ? String(employee.dailyHoursPlan.fri) : '',
          sat: employee.dailyHoursPlan?.sat != null ? String(employee.dailyHoursPlan.sat) : '',
          sun: employee.dailyHoursPlan?.sun != null ? String(employee.dailyHoursPlan.sun) : ''
        }
      });
    } else {
      setEditingEmployee(null);
      // Set first organization as default for new employees
      const defaultOrgId = organizations.length > 0 ? organizations[0].id : '';
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        photoUrl: '',
        photoPath: '',
        position: '',
        department: '',
        hireDate: '',
        organizationId: defaultOrgId,
        notes: '',
        weeklyHours: '',
        dailyHoursPlan: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' }
      });
    }
    setOpen(true);
  };

  const hasFormData = () => {
    return formData.firstName.trim() || formData.lastName.trim() || formData.email.trim() || 
           formData.phone.trim() || formData.position.trim() || formData.department.trim() ||
           formData.notes?.trim() || formData.weeklyHours?.trim() ||
           Object.values(formData.dailyHoursPlan || {}).some(v => (v || '').trim() !== '');
  };

  const handleCloseDialog = () => {
    if (hasFormData() && !editingEmployee) {
      setCloseConfirmDialog(true);
    } else {
      setOpen(false);
      setEditingEmployee(null);
    }
  };

  const confirmCloseDialog = () => {
    setCloseConfirmDialog(false);
    setOpen(false);
    setEditingEmployee(null);
  };

  const handleInputChange = (field: keyof EmployeeFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validierung für Pflichtfelder
      if (!formData.firstName.trim()) {
        setSnackbar({ open: true, message: 'Vorname ist erforderlich', severity: 'error' });
        return;
      }
      
      if (!formData.lastName.trim()) {
        setSnackbar({ open: true, message: 'Nachname ist erforderlich', severity: 'error' });
        return;
      }
      
      const payload: any = { ...formData };
      // Prefer photoPath over photoUrl; if photoPath exists, clear photoUrl to avoid confusion
      if (payload.photoPath) payload.photoUrl = '';
      // Parse weeklyHours (string) to number, accept comma as decimal separator
      if (typeof payload.weeklyHours === 'string' && payload.weeklyHours.trim() !== '') {
        const norm = payload.weeklyHours.replace(',', '.');
        const num = parseFloat(norm);
        if (!isNaN(num)) {
          payload.weeklyHours = num;
        } else {
          delete payload.weeklyHours;
        }
      }
      // Parse dailyHoursPlan strings to numbers; remove empty
      if (payload.dailyHoursPlan) {
        const plan = payload.dailyHoursPlan;
        const parsed: any = {};
        const keys = ['mon','tue','wed','thu','fri','sat','sun'] as const;
        keys.forEach((k) => {
          const v = (plan?.[k] || '').replace?.(',', '.') ?? '';
          const n = parseFloat(v);
          if (!isNaN(n) && isFinite(n) && n >= 0) parsed[k] = n;
        });
        if (Object.keys(parsed).length > 0) payload.dailyHoursPlan = parsed; else delete payload.dailyHoursPlan;
      }
      if (editingEmployee) {
        await dispatch(updateEmployee({ id: editingEmployee.id, data: payload })).unwrap();
        setSnackbar({ open: true, message: 'Mitarbeiter erfolgreich aktualisiert', severity: 'success' });
      } else {
        await dispatch(createEmployee(payload)).unwrap();
        setSnackbar({ open: true, message: 'Mitarbeiter erfolgreich erstellt', severity: 'success' });
      }
      
      // Refresh the employee list after successful create/update
      dispatch(fetchEmployees());
      
      // Reset form data BEFORE closing to prevent change detection
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        photoUrl: '',
        photoPath: '',
        position: '',
        department: '',
        hireDate: '',
        organizationId: '',
        notes: '',
        weeklyHours: '',
        dailyHoursPlan: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' }
      });
      setEditingEmployee(null);
      setOpen(false);
    } catch (error: any) {
      console.error('Employee save error:', error);
      setSnackbar({ open: true, message: error.message || 'Fehler beim Speichern', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmation({
      title: 'Mitarbeiter löschen',
      message: 'Möchten Sie diesen Mitarbeiter wirklich löschen?',
      type: 'warning',
      confirmText: 'Löschen',
      confirmColor: 'error'
    });
    
    if (confirmed) {
      try {
  await dispatch(deleteEmployee(id)).unwrap();
        setSnackbar({ open: true, message: 'Mitarbeiter erfolgreich gelöscht', severity: 'success' });
        
        // Refresh the employee list after successful delete
        dispatch(fetchEmployees());
      } catch (error: any) {
        console.error('Employee delete error:', error);
        setSnackbar({ open: true, message: error.message || 'Fehler beim Löschen', severity: 'error' });
      }
    }
  };

  const departments = ['Offener Bereich', 'Beratung', 'Verwaltung', 'Küche', 'Hausmeisterei'];
  const positions = ['Jugendarbeiter', 'Sozialpädagoge', 'Praktikant', 'Leitung', 'Verwaltung', 'Koch'];

  const formatDailyPlanSummary = (plan?: {
    mon?: number; tue?: number; wed?: number; thu?: number; fri?: number; sat?: number; sun?: number;
  }) => {
    if (!plan) return '—';
    const order: Array<keyof typeof plan> = ['mon','tue','wed','thu','fri','sat','sun'];
    const labels: Record<string, string> = { mon: 'Mo', tue: 'Di', wed: 'Mi', thu: 'Do', fri: 'Fr', sat: 'Sa', sun: 'So' };
    const parts = order.map((k) => {
      const v = (plan as any)[k];
      if (typeof v === 'number' && isFinite(v) && v >= 0) {
        return `${labels[k]} ${v.toLocaleString('de-DE', { maximumFractionDigits: 2 })}`;
      }
      return `${labels[k]} –`;
    });
    return parts.join(' • ');
  };

  // Gefilterte Mitarbeiterliste basierend auf Suchbegriff
  const filteredEmployees = employees.filter((employee: any) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase();
    const email = (employee.email || '').toLowerCase();
    const position = (employee.position || '').toLowerCase();
    const department = (employee.department || '').toLowerCase();
    
    return fullName.includes(searchLower) ||
           email.includes(searchLower) ||
           position.includes(searchLower) ||
           department.includes(searchLower);
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Mitarbeiter
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ mt: 1 }}
        >
          Neuer Mitarbeiter
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Suchfeld */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Mitarbeiter suchen (Name, E-Mail, Position, Bereich)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ maxWidth: 600 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Organisation</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Bereich</TableCell>
              <TableCell>Kontakt</TableCell>
              <TableCell>Eintrittsdatum</TableCell>
              <TableCell>Wochenarbeitszeit</TableCell>
              <TableCell>Tagesplan</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((employee: any) => (
              <TableRow key={employee.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar 
                      src={(employee.photoPath ? (window as any)?.electronAPI?.toFileUrl?.(employee.photoPath) : employee.photoUrl) || undefined}
                      sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}
                    >
                      {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '')}
                    </Avatar>
                    <Typography variant="subtitle2">
                      {employee.firstName} {employee.lastName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getOrganizationName(employee.organizationId)} 
                    size="small"
                    sx={{
                      backgroundColor: getOrganizationColor(employee.organizationId),
                      color: 'white',
                      fontWeight: 'bold',
                      '& .MuiChip-label': {
                        fontSize: '0.75rem'
                      }
                    }}
                  />
                </TableCell>
                <TableCell>{employee.position}</TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>
                  <Box display="flex" flexDirection="column" gap={0.5}>
                    {employee.email && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2">{employee.email}</Typography>
                      </Box>
                    )}
                    {employee.phone && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2">{employee.phone}</Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('de-DE') : '-'}
                </TableCell>
                <TableCell>
                  {typeof employee.weeklyHours === 'number' && !isNaN(employee.weeklyHours)
                    ? `${employee.weeklyHours.toString().replace('.', ',')} Std`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatDailyPlanSummary(employee.dailyHoursPlan)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(employee)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(employee.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog für Mitarbeiter erstellen/bearbeiten */}
      <Dialog 
        open={open} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        disableEscapeKeyDown={!!hasFormData()}
      >
        <DialogTitle>
          {editingEmployee ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Box display="flex" gap={2}>
              <TextField
                label="Vorname"
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                required
                fullWidth
              />
              <TextField
                label="Nachname"
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                required
                fullWidth
              />
            </Box>
            <Box display="flex" gap={2}>
              <TextField
                label="E-Mail"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                fullWidth
              />
              <TextField
                label="Telefon"
                value={formData.phone}
                onChange={handleInputChange('phone')}
                fullWidth
              />
            </Box>
            <Box display="flex" gap={2}>
              <FormControl fullWidth>
                <InputLabel>Organisation</InputLabel>
                <Select
                  value={formData.organizationId}
                  onChange={(e) => setFormData(prev => ({ ...prev, organizationId: e.target.value as string }))}
                  required
                >
                  {organizations.map((org: any) => (
                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box display="flex" gap={2}>
              <Autocomplete
                fullWidth
                freeSolo
                options={positions}
                value={formData.position}
                onChange={(_event, newValue) => {
                  setFormData(prev => ({ ...prev, position: newValue || '' }));
                }}
                onInputChange={(_event, newInputValue) => {
                  setFormData(prev => ({ ...prev, position: newInputValue }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Position"
                    placeholder="Position auswählen oder eingeben"
                  />
                )}
              />
              <Autocomplete
                fullWidth
                freeSolo
                options={departments}
                value={formData.department}
                onChange={(_event, newValue) => {
                  setFormData(prev => ({ ...prev, department: newValue || '' }));
                }}
                onInputChange={(_event, newInputValue) => {
                  setFormData(prev => ({ ...prev, department: newInputValue }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Bereich"
                    placeholder="Bereich auswählen oder eingeben"
                  />
                )}
              />
            </Box>
            {/* Wochenarbeitszeit */}
            <TextField
              label="Wochenarbeitszeit (Std)"
              value={formData.weeklyHours || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, weeklyHours: e.target.value }))}
              placeholder="z. B. 38,5"
              fullWidth
            />
            {/* Tagesarbeitszeit Plan (netto) */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Tagesarbeitszeit (Std, netto)
              </Typography>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }} gap={1.5}>
                {[
                  { key: 'mon', label: 'Mo' },
                  { key: 'tue', label: 'Di' },
                  { key: 'wed', label: 'Mi' },
                  { key: 'thu', label: 'Do' },
                  { key: 'fri', label: 'Fr' },
                  { key: 'sat', label: 'Sa' },
                  { key: 'sun', label: 'So' }
                ].map((d: any) => (
                  <TextField
                    key={d.key}
                    label={d.label}
                    value={(formData.dailyHoursPlan as any)?.[d.key] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      dailyHoursPlan: { ...(prev.dailyHoursPlan || {}), [d.key]: e.target.value }
                    }))}
                    placeholder="z. B. 7,7"
                    inputProps={{ inputMode: 'decimal' }}
                  />
                ))}
              </Box>
              {/* Summe und Abgleich */}
              {(() => {
                const vals = formData.dailyHoursPlan || {} as any;
                const toNum = (v?: string) => {
                  if (!v) return 0;
                  const n = parseFloat(v.replace(',', '.'));
                  return isNaN(n) ? 0 : n;
                };
                const sum = toNum(vals.mon) + toNum(vals.tue) + toNum(vals.wed) + toNum(vals.thu) + toNum(vals.fri) + toNum(vals.sat) + toNum(vals.sun);
                const weekly = formData.weeklyHours ? parseFloat(formData.weeklyHours.replace(',', '.')) : undefined;
                const mismatch = typeof weekly === 'number' && !isNaN(weekly) && Math.abs(sum - weekly) > 0.05;
                return (
                  <Box mt={1}>
                    <Typography variant="body2">
                      Summe: {sum.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Std{weekly != null ? ` / Soll: ${weekly.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Std` : ''}
                    </Typography>
                    {mismatch && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Die Summe der Tagesstunden weicht von der Wochenarbeitszeit ab. Das Speichern ist trotzdem möglich.
                      </Alert>
                    )}
                  </Box>
                );
              })()}
            </Box>
            <TextField
              label="Eintrittsdatum"
              type="date"
              value={formData.hireDate}
              onChange={handleInputChange('hireDate')}
              InputLabelProps={{ shrink: true }}
              fullWidth
              sx={{
                '& .MuiSvgIcon-root': { 
                  color: (theme) => theme.palette.mode === 'dark' ? 'white' : 'inherit' 
                }
              }}
            />
            {/* Foto Upload */}
            <Box display="flex" gap={2} alignItems="center">
              <Avatar 
                src={(formData.photoPath ? (window as any)?.electronAPI?.toFileUrl?.(formData.photoPath) : formData.photoUrl) || undefined}
                sx={{ width: 48, height: 48 }}
              >
                {(formData.firstName?.[0] || '') + (formData.lastName?.[0] || '')}
              </Avatar>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    try {
                      const res = await (window as any).electronAPI.importEmployeePhoto();
                      if (res && res.success) {
                        setFormData(prev => ({ ...prev, photoPath: res.path, photoUrl: '' }));
                        setSnackbar({ open: true, message: 'Foto übernommen', severity: 'success' });
                      } else if (res && res.message) {
                        setSnackbar({ open: true, message: res.message, severity: 'error' });
                      }
                    } catch (e: any) {
                      setSnackbar({ open: true, message: e.message || 'Fehler beim Foto-Upload', severity: 'error' });
                    }
                  }}
                >
                  Foto auswählen
                </Button>
                {formData.photoPath || formData.photoUrl ? (
                  <Button
                    variant="text"
                    color="secondary"
                    onClick={() => setFormData(prev => ({ ...prev, photoPath: '', photoUrl: '' }))}
                  >
                    Entfernen
                  </Button>
                ) : null}
              </Box>
            </Box>
            
            {/* Notizen-Sektion */}
            <TextField
              label="Notizen"
              value={formData.notes}
              onChange={handleInputChange('notes')}
              multiline
              rows={3}
              fullWidth
              placeholder="Zusätzliche Informationen, besondere Qualifikationen, etc."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingEmployee ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bestätigungsdialog für das Schließen */}
      <Dialog 
        open={closeConfirmDialog} 
        onClose={() => setCloseConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            padding: 2,
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          pb: 1,
          fontSize: '1.25rem',
          fontWeight: 600
        }}>
          <Box sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: '50%', 
            backgroundColor: (theme) => theme.palette.warning.main + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            ⚠️
          </Box>
          Ungespeicherte Änderungen
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography>
            Sie haben Änderungen vorgenommen, die noch nicht gespeichert wurden. 
            Möchten Sie das Formular wirklich schließen? Alle eingegebenen Daten gehen verloren.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setCloseConfirmDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={confirmCloseDialog} 
            variant="contained"
            color="warning"
            sx={{ borderRadius: 2 }}
          >
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Custom Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmationDialog.open}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        type={confirmationDialog.type}
        confirmText={confirmationDialog.confirmText}
        cancelText={confirmationDialog.cancelText}
        confirmColor={confirmationDialog.confirmColor}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={confirmationDialog.onCancel}
      />
    </Box>
  );
};

export default EmployeeList;
