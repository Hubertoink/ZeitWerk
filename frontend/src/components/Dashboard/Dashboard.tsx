import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText 
} from '@mui/material';
import { 
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Storage as StorageIcon,
  Category as CategoryIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchEmployees } from '../../store/slices/employeeSlice';
import { fetchShifts } from '../../store/slices/shiftSlice';
import { fetchShiftTypes } from '../../store/slices/shiftTypeSlice';
import { fetchOrganizations } from '../../store/slices/organizationSlice';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { employees } = useAppSelector((state: any) => state.employees);
  const { shifts } = useAppSelector((state: any) => state.shifts);
  const { shiftTypes } = useAppSelector((state: any) => state.shiftTypes);
  const { organizations } = useAppSelector((state: any) => state.organizations);
  
  const [dbStats, setDbStats] = useState<{
    fileSize: string;
    totalRecords: number;
    lastUpdate: string;
  } | null>(null);

  // Lade alle Daten beim Mount
  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchShifts({}));
    dispatch(fetchShiftTypes());
    dispatch(fetchOrganizations());
  }, [dispatch]);

  useEffect(() => {
    // Lade Datenbankstatistiken vom Electron Backend
    const loadDbStats = async () => {
      try {
        if (window.electronAPI) {
          const stats = await window.electronAPI.getDatabaseStats();
          setDbStats({
            fileSize: stats.fileSize || 'N/A',
            totalRecords: stats.totalRecords || 0,
            lastUpdate: new Date().toLocaleString('de-DE')
          });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Datenbankstatistiken:', error);
        // Fallback: Berechne Statistiken aus vorhandenen Daten
        const totalRecords = (employees?.length || 0) + 
                           (shifts?.length || 0) + 
                           (shiftTypes?.length || 0) + 
                           (organizations?.length || 0);
        setDbStats({
          fileSize: 'Berechnet...',
          totalRecords,
          lastUpdate: new Date().toLocaleString('de-DE')
        });
      }
    };

    loadDbStats();
  }, [employees, shifts, shiftTypes, organizations]);

  const getProgressColor = (count: number, max: number = 100) => {
    const percentage = (count / max) * 100;
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warning';
    return 'error';
  };

  // Berechne kommende Schichten (nächste 7 Tage)
  const getUpcomingShifts = () => {
    if (!shifts || !employees || !shiftTypes) return [];
    
    const now = new Date();
    const nextWeek = addDays(now, 7);
    
    return shifts
      .filter((shift: any) => {
        const shiftDate = new Date(shift.date);
        return isAfter(shiftDate, now) && isBefore(shiftDate, nextWeek);
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5) // Zeige nur die nächsten 5 Schichten
      .map((shift: any) => {
        const employee = employees.find((emp: any) => emp.id === shift.employeeId);
        const shiftType = shiftTypes.find((type: any) => type.id === shift.shiftTypeId);
        return {
          ...shift,
          employee,
          shiftType
        };
      });
  };

  const upcomingShifts = getUpcomingShifts();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Dashboard
      </Typography>
      
      {/* Statistik-Übersicht */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PeopleIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Mitarbeiter
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                {employees?.length || 0}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((employees?.length || 0) / 20 * 100, 100)} 
                color={getProgressColor(employees?.length || 0, 20)}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Registrierte Mitarbeiter
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ScheduleIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Schichten
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold', color: 'secondary.main' }}>
                {shifts?.length || 0}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((shifts?.length || 0) / 100 * 100, 100)} 
                color={getProgressColor(shifts?.length || 0, 100)}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Geplante Schichten
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CategoryIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Schichttypen
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold', color: 'info.main' }}>
                {shiftTypes?.length || 0}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((shiftTypes?.length || 0) / 10 * 100, 100)} 
                color={getProgressColor(shiftTypes?.length || 0, 10)}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Verfügbare Schichttypen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BusinessIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Organisationen
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 'bold', color: 'warning.main' }}>
                {organizations?.length || 0}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((organizations?.length || 0) / 5 * 100, 100)} 
                color={getProgressColor(organizations?.length || 0, 5)}
                sx={{ mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Verwaltete Organisationen
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Kommende Schichten */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon sx={{ mr: 1 }} />
                Kommende Schichten (nächste 7 Tage)
              </Typography>
              {upcomingShifts.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Keine kommenden Schichten geplant
                </Typography>
              ) : (
                <List>
                  {upcomingShifts.map((shift: any, index: number) => (
                    <ListItem 
                      key={shift.id} 
                      divider={index < upcomingShifts.length - 1}
                      sx={{ px: 0 }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: shift.shiftType?.color || 'primary.main',
                            color: 'white' 
                          }}
                        >
                          {shift.employee?.firstName?.charAt(0) || '?'}
                          {shift.employee?.lastName?.charAt(0) || '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${shift.employee?.firstName || 'Unbekannt'} ${shift.employee?.lastName || ''}`}
                        secondary={
                          <Box>
                            <Typography variant="body2" component="div">
                              {format(new Date(shift.date), 'EEEE, dd.MM.yyyy', { locale: de })}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div">
                              {shift.shiftType?.name || 'Unbekannter Typ'} • 
                              {shift.startTime} - {shift.endTime}
                            </Typography>
                          </Box>
                        }
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                      <Chip 
                        label={shift.shiftType?.name || 'Unbekannt'} 
                        size="small"
                        sx={{ 
                          bgcolor: shift.shiftType?.color || 'primary.main',
                          color: 'white' 
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Datenbankstatistiken */}
      {dbStats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Datenbank-Status
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {dbStats.fileSize}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Datenbankgröße
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                        {dbStats.totalRecords}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Gesamtdatensätze
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {dbStats.lastUpdate}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Letzte Aktualisierung
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Feature-Übersicht */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ mr: 1 }} />
                Mitarbeiterverwaltung
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Übersicht über alle registrierten Mitarbeiter in der Organisation.
                Hier können Sie Mitarbeiter verwalten und deren Status einsehen.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="Vollständig" size="small" color="success" />
                <Chip label="Multi-Tenant" size="small" color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon sx={{ mr: 1 }} />
                Schichtplanung
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Aktuelle Schichtpläne und Terminübersicht.
                Planen Sie Schichten und weisen Sie Mitarbeiter zu.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="Drag & Drop" size="small" color="success" />
                <Chip label="Konflikte" size="small" color="warning" />
                <Chip label="Kalender" size="small" color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1 }} />
                Organisationseinheiten
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Verwalten Sie verschiedene Abteilungen und Bereiche
                Ihrer Organisation mit spezifischen Einstellungen.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="Hierarchien" size="small" color="success" />
                <Chip label="Einstellungen" size="small" color="info" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
