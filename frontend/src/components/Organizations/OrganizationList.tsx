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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchOrganizations, createOrganization, updateOrganization, deleteOrganization } from '../../store/slices/organizationSlice';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import ConfirmationDialog from '../Common/ConfirmationDialog';
import { useConfirmationDialog } from '../../hooks/useConfirmationDialog';
import OpeningHoursEditor from './OpeningHoursEditor';
import { OpeningHours } from '../../utils/openingHours';

interface OrganizationFormData {
  name: string;
  description: string;
  parentId: string;
  color: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  openingHours?: OpeningHours;
}

const OrganizationList: React.FC = () => {
  const dispatch = useAppDispatch();
    const { organizations, error } = useAppSelector((state: any) => state.organizations);
  const { employees } = useAppSelector((state: any) => state.employees);

  const [open, setOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [dialogTab, setDialogTab] = useState(0);
  
  // Custom confirmation dialog
  const { showConfirmation, confirmationDialog } = useConfirmationDialog();
  
  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    description: '',
    parentId: '',
    color: '#1976d2',
    address: '',
    contactEmail: '',
    contactPhone: '',
    openingHours: undefined
  });

  useEffect(() => {
    dispatch(fetchOrganizations());
    dispatch(fetchEmployees());
  }, [dispatch]);

  const getEmployeeCountForOrganization = (organizationId: string) => {
    return employees.filter((emp: any) => emp.organizationId === organizationId).length;
  };

  const handleOpenDialog = (organization?: any) => {
    if (organization) {
      setEditingOrganization(organization);
      setFormData({
        name: organization.name || '',
        description: organization.description || '',
        parentId: organization.parentId || '',
        color: organization.color || '#1976d2',
        address: organization.address || '',
        contactEmail: organization.contactEmail || '',  // Korrigiert
        contactPhone: organization.contactPhone || '',   // Korrigiert
        openingHours: organization.openingHours || undefined
      });
    } else {
      setEditingOrganization(null);
      setFormData({
        name: '',
        description: '',
        parentId: '',
        color: '#1976d2',
        address: '',
        contactEmail: '',
        contactPhone: '',
        openingHours: undefined
      });
    }
    setDialogTab(0); // Reset to first tab
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingOrganization(null);
    setDialogTab(0);
  };

  const handleInputChange = (field: keyof OrganizationFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async () => {
    try {
      // Convert frontend format to API format
      const apiData = {
        name: formData.name,
        description: formData.description,
        parentId: formData.parentId || undefined, // Convert null to undefined
        color: formData.color,
        address: formData.address,
        contactEmail: formData.contactEmail,  // Korrigiert: contactEmail statt contact_email
        contactPhone: formData.contactPhone,  // Korrigiert: contactPhone statt contact_phone
        openingHours: formData.openingHours,  // Neue Öffnungszeiten
        isActive: true
      };

      if (editingOrganization) {
        await dispatch(updateOrganization({ id: editingOrganization.id, data: apiData })).unwrap();
        setSnackbar({ open: true, message: 'Organisation erfolgreich aktualisiert', severity: 'success' });
      } else {
        await dispatch(createOrganization(apiData)).unwrap();
        setSnackbar({ open: true, message: 'Organisation erfolgreich erstellt', severity: 'success' });
      }

      // Aktualisiere die Organization-Liste nach dem Speichern
      await dispatch(fetchOrganizations());
      
      // Reset form data BEFORE closing to prevent change detection
      setFormData({
        name: '',
        description: '',
        parentId: '',
        color: '#1976d2',
        address: '',
        contactEmail: '',
        contactPhone: '',
        openingHours: undefined
      });
      setEditingOrganization(null);
      setDialogTab(0);
      setOpen(false);
    } catch (error: any) {
      console.error('Organization save error:', error);
      setSnackbar({ open: true, message: error.message || 'Fehler beim Speichern', severity: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirmation({
      title: 'Organisation löschen',
      message: 'Möchten Sie diese Organisation wirklich löschen?',
      type: 'warning',
      confirmText: 'Löschen',
      confirmColor: 'error'
    });
    
    if (confirmed) {
      try {
        await dispatch(deleteOrganization(id)).unwrap();
        setSnackbar({ open: true, message: 'Organisation erfolgreich gelöscht', severity: 'success' });
      } catch (error: any) {
        console.error('Organization delete error:', error);
        setSnackbar({ open: true, message: error.message || 'Fehler beim Löschen', severity: 'error' });
      }
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Organisationseinheiten
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Neue Organisation
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Karten-Ansicht */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {organizations.map((organization: any) => (
          <Grid item xs={12} sm={6} md={4} key={organization.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BusinessIcon color="primary" />
                    <Typography variant="h6" component="h3">
                      {organization.name}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(organization)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(organization.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {organization.description || 'Keine Beschreibung'}
                </Typography>
                
                {organization.address && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    📍 {organization.address}
                  </Typography>
                )}
                
                {organization.contactEmail && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    ✉️ {organization.contactEmail}
                  </Typography>
                )}
                
                {organization.contactPhone && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    📞 {organization.contactPhone}
                  </Typography>
                )}
                
                <Box display="flex" alignItems="center" gap={1}>
                  <PeopleIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Mitarbeiter: {getEmployeeCountForOrganization(organization.id)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabellen-Ansicht */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Beschreibung</TableCell>
              <TableCell>Adresse</TableCell>
              <TableCell>Kontakt</TableCell>
              <TableCell>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {organizations.map((organization: any) => (
              <TableRow key={organization.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BusinessIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      {organization.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{organization.description || '-'}</TableCell>
                <TableCell>{organization.address || '-'}</TableCell>
                <TableCell>
                  <Box>
                    {organization.contactEmail && (
                      <Typography variant="body2">{organization.contactEmail}</Typography>
                    )}
                    {organization.contactPhone && (
                      <Typography variant="body2">{organization.contactPhone}</Typography>
                    )}
                    {!organization.contactEmail && !organization.contactPhone && '-'}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(organization)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(organization.id)}
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

      {/* Dialog für Organisation erstellen/bearbeiten */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingOrganization ? 'Organisation bearbeiten' : 'Neue Organisation'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={dialogTab} onChange={(_, newValue) => setDialogTab(newValue)}>
              <Tab icon={<BusinessIcon />} label="Grunddaten" />
              <Tab icon={<AccessTimeIcon />} label="Öffnungszeiten" />
            </Tabs>
          </Box>

          {/* Tab 0: Grunddaten */}
          {dialogTab === 0 && (
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={handleInputChange('name')}
                required
                fullWidth
                placeholder="z.B. Jugendhaus Nord, Hauptstelle, etc."
              />
              
              <TextField
                label="Beschreibung"
                value={formData.description}
                onChange={handleInputChange('description')}
                fullWidth
                multiline
                rows={3}
                placeholder="Beschreibung der Organisationseinheit..."
              />
              
              <TextField
                label="Übergeordnete Organisation (ID)"
                value={formData.parentId}
                onChange={handleInputChange('parentId')}
                fullWidth
                placeholder="Leer lassen für Hauptorganisation"
              />
              
              <TextField
                label="Adresse"
                value={formData.address}
                onChange={handleInputChange('address')}
                fullWidth
                multiline
                rows={2}
                placeholder="Straße, PLZ Ort"
              />
              
              <TextField
                label="E-Mail Kontakt"
                type="email"
                value={formData.contactEmail}
                onChange={handleInputChange('contactEmail')}
                fullWidth
                placeholder="kontakt@organisation.de"
              />
              
              <TextField
                label="Telefon Kontakt"
                type="tel"
                value={formData.contactPhone}
                onChange={handleInputChange('contactPhone')}
                fullWidth
                placeholder="+49 123 456789"
              />
              
              <Box display="flex" gap={2} alignItems="center">
                <TextField
                  label="Farbe"
                  type="color"
                  value={formData.color}
                  onChange={handleInputChange('color')}
                  sx={{ width: '100px' }}
                />
                <Typography variant="body2" color="textSecondary">
                  Wählen Sie eine Farbe für diese Organisation
                </Typography>
              </Box>
            </Box>
          )}

          {/* Tab 1: Öffnungszeiten */}
          {dialogTab === 1 && (
            <OpeningHoursEditor
              openingHours={formData.openingHours}
              onChange={(openingHours) => setFormData(prev => ({ ...prev, openingHours }))}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingOrganization ? 'Aktualisieren' : 'Erstellen'}
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

export default OrganizationList;
