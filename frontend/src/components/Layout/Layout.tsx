import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  AppBar, 
  Toolbar, 
  Button, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText,
  ListItemIcon,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Collapse,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  AdminPanelSettings as AdminIcon,
  ChevronLeft as ChevronLeftIcon,
  ExpandLess,
  ExpandMore,
  DateRange as WeekIcon,
  CalendarViewMonth as MonthIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { fetchOrganizations, setSelectedOrganization } from '../../store/slices/organizationSlice';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useTutorial } from '../../contexts/TutorialContext';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 200; // Normale Drawer-Breite für erweiterten Modus
const collapsedDrawerWidth = 64;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { organizations, selectedOrganization } = useAppSelector((state: any) => state.organizations);
  const { mode: themeMode, toggleMode } = useTheme();
  const { settings } = useSettings();
  const { showTutorial } = useTutorial();
  const isDarkMode = themeMode === 'dark';

  // Cluster-Farben für Menü-Icons
  const getClusterColor = (id?: string) => {
    const themed = (settings?.ui?.menuIconColor || 'monochrome') === 'themed';
    if (!themed) return undefined;
    return (theme: any) => {
      // Farbzuordnung pro Cluster:
      // - Dashboard: primary
      // - Kalender (week/month): info
      // - Mitarbeiter & Organisationen: success
      // - Schichttypen: secondary
      const palette = theme.palette;
      if (id === 'dashboard') return palette.primary.main;
      if (id === 'calendar' || id === 'week-view' || id === 'month-view') return palette.info.main;
      if (id === 'employees' || id === 'organizations') return palette.success.main;
      if (id === 'shift-types') return palette.secondary.main;
      if (id === 'admin') return palette.warning.main;
      return palette.text.primary;
    };
  };
  
  const [isCollapsed, setIsCollapsed] = useState(true); // Standard: collapsed
  const [openMenus, setOpenMenus] = useState<string[]>(['calendar']); // Kalender standardmäßig offen

  useEffect(() => {
    dispatch(fetchOrganizations());
  }, [dispatch]);

  // Auto-select first organization if none is selected, but prefer saved organization
  useEffect(() => {
    if (organizations.length > 0 && !selectedOrganization) {
      // Versuche gespeicherte Organisation aus localStorage zu laden
      const savedOrgId = localStorage.getItem('selectedOrganizationId');
      let orgToSelect = organizations[0]; // Fallback auf erste Organisation
      
      if (savedOrgId) {
        const savedOrg = organizations.find((org: any) => org.id.toString() === savedOrgId);
        if (savedOrg) {
          orgToSelect = savedOrg;
        }
      }
      
      dispatch(setSelectedOrganization(orgToSelect));
    }
  }, [organizations, selectedOrganization, dispatch]);

  // Main navigation items
  const mainMenuItems = [
    { 
      text: 'Dashboard', 
      path: '/dashboard', 
      icon: <DashboardIcon />,
      id: 'dashboard'
    },
    // Kalender-Item nur im expanded Mode zeigen
    ...(isCollapsed ? [] : [{ 
      text: 'Kalender', 
      icon: <CalendarIcon />,
      id: 'calendar',
      subItems: [
        { text: 'Wochenansicht', path: '/week', icon: <WeekIcon /> },
        { text: 'Monatsansicht', path: '/month', icon: <MonthIcon /> },
      ]
    }]),
    // In collapsed Mode: Direkte Kalender-Optionen
    ...(isCollapsed ? [
      { 
        text: 'Wochenansicht', 
        path: '/week', 
        icon: <WeekIcon />,
        id: 'week-view'
      },
      { 
        text: 'Monatsansicht', 
        path: '/month', 
        icon: <MonthIcon />,
        id: 'month-view'
      }
    ] : []),
    { 
      text: 'Mitarbeiter', 
      path: '/employees', 
      icon: <PeopleIcon />,
      id: 'employees'
    },
    { 
      text: 'Organisationseinheiten', 
      path: '/organizations', 
      icon: <BusinessIcon />,
      id: 'organizations'
    },
    { 
      text: 'Schichttypen', 
      path: '/shift-types', 
      icon: <ScheduleIcon />,
      id: 'shift-types'
    },
  ];

  // Admin items - immer verfügbar in Electron-App
  const isElectronApp = typeof window !== 'undefined' && window.electronAPI;
  const isDevelopment = window.location.hostname === 'localhost' || process.env.NODE_ENV === 'development';
  
  // Admin-Panel in Electron-App oder Development-Umgebung verfügbar
  const adminItems = (isElectronApp || isDevelopment) ? [
    { 
      text: 'Admin-Panel', 
      path: '/admin', 
      icon: <AdminIcon />,
      id: 'admin'
    }
  ] : [];

  const handleLogout = () => {
    dispatch(logout());
    localStorage.setItem('isAuthenticated', 'false');
    localStorage.removeItem('authToken');
    // Reload der gesamten App um zur Login-Seite zu gelangen
    window.location.reload();
  };

  const handleOrganizationChange = (organizationId: string) => {
    const organization = organizations.find((org: any) => org.id === organizationId);
    if (organization) {
      dispatch(setSelectedOrganization(organization));
      // Speichere die Auswahl in localStorage
      localStorage.setItem('selectedOrganizationId', organizationId);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMenuClick = (item: any) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.subItems && !isCollapsed) {
      // Submenu toggle nur im expanded Mode
      setOpenMenus(prev => 
        prev.includes(item.id) 
          ? prev.filter(id => id !== item.id) 
          : [...prev, item.id]
      );
    }
    // Im collapsed Mode sind alle Items direkte Links (kein path = keine Aktion)
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{
          '& .MuiTypography-root': { color: (theme) => theme.palette.primary.contrastText },
          '& .MuiSvgIcon-root': { color: (theme) => theme.palette.primary.contrastText },
        }}>
          {/* ZeitWerk Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <img
              src="./ZeitWerk-Logo.png"
              alt="ZeitWerk Logo"
              style={{
                width: '32px',
                height: 'auto',
                marginRight: '8px',
              }}
            />
            <Typography variant="h6" noWrap component="div" sx={{ color: (theme) => theme.palette.primary.contrastText }}>
              ZeitWerk
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Organisationsauswahl */}
          <FormControl variant="outlined" size="small" sx={{ minWidth: 200, mr: 2 }}>
            <InputLabel sx={{ 
              color: (theme) => theme.palette.primary.contrastText,
              '&.Mui-focused': {
                color: (theme) => theme.palette.primary.contrastText
              }
            }}>
              Organisation
            </InputLabel>
            <Select
              value={selectedOrganization?.id || ''}
              onChange={(e) => handleOrganizationChange(e.target.value as string)}
              label="Organisation"
              sx={{ 
                color: (theme) => theme.palette.primary.contrastText,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.35)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.6)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.8)' },
                '& .MuiSvgIcon-root': { color: (theme) => theme.palette.primary.contrastText }
              }}
            >
              {organizations.map((org: any) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tutorial Button */}
          <Tooltip title="Tutorial anzeigen">
            <IconButton 
              color="inherit" 
              onClick={showTutorial}
              sx={{ 
                mr: 1,
                color: (theme) => theme.palette.primary.contrastText,
                backgroundColor: 'rgba(255,255,255,0.15)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.25)',
                }
              }}
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>

          {/* Dark Mode Toggle */}
          <Tooltip title={isDarkMode ? 'Zu Light Mode wechseln' : 'Zu Dark Mode wechseln'}>
            <IconButton 
              color="inherit" 
              onClick={toggleMode}
              sx={{ 
                mr: 1,
                color: (theme) => theme.palette.primary.contrastText,
                backgroundColor: 'rgba(255,255,255,0.15)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.25)',
                }
              }}
            >
              {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Button 
            color="inherit" 
            onClick={handleLogout}
            sx={{
              color: (theme) => theme.palette.primary.contrastText,
              backgroundColor: 'rgba(255,255,255,0.15)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.25)',
              },
              borderRadius: 1,
              px: 2
            }}
          >
            Abmelden
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: isCollapsed ? collapsedDrawerWidth : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: isCollapsed ? collapsedDrawerWidth : drawerWidth,
            boxSizing: 'border-box',
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
      >
        <Toolbar />
        
        {/* Collapse/Expand Button */}
        <Box sx={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end', p: 1 }}>
          <Tooltip title={isCollapsed ? "Sidebar erweitern" : "Sidebar reduzieren"}>
            <IconButton onClick={toggleCollapse} size="small">
              {isCollapsed ? <MenuIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        
        <Divider />
        
        {/* Main Navigation */}
        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          <List>
            {mainMenuItems.map((item) => (
              <React.Fragment key={item.id}>
                <ListItem disablePadding>
                  <Tooltip 
                    title={isCollapsed ? (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>{item.text}</Typography>
                        {item.subItems && (
                          <Box sx={{ pl: 1 }}>
                            {item.subItems.map((subItem) => (
                              <Typography 
                                key={subItem.text} 
                                variant="body2"
                                sx={{ 
                                  cursor: 'pointer', 
                                  '&:hover': { textDecoration: 'underline', backgroundColor: 'rgba(255,255,255,0.1)' },
                                  display: 'block',
                                  py: 1, // Mehr Padding für bessere Click-Targets
                                  px: 1,
                                  borderRadius: 1,
                                  minHeight: 32 // Mindesthöhe für Touch-Targets
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(subItem.path);
                                }}
                              >
                                • {subItem.text}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    ) : ""} 
                    placement="right"
                    arrow
                    PopperProps={{
                      sx: {
                        '& .MuiTooltip-tooltip': {
                          fontSize: '0.875rem',
                          maxWidth: 300,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? '#424242' : '#000'
                        }
                      }
                    }}
                  >
                    <ListItemButton
                      selected={item.path ? location.pathname === item.path : false}
                      onClick={() => handleMenuClick(item)}
                      sx={{ 
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        px: isCollapsed ? 1 : 2,
                        minHeight: isCollapsed ? 56 : 48, // Größere Click-Area im collapsed Mode
                        py: isCollapsed ? 2 : 1 // Mehr Padding für bessere Touch-Targets
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: isCollapsed ? 'auto' : 56,
                        justifyContent: 'center',
                        color: getClusterColor(item.id) || 'inherit'
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      {!isCollapsed && (
                        <>
                          <ListItemText primary={item.text} />
                          {item.subItems && (
                            openMenus.includes(item.id!) ? <ExpandLess /> : <ExpandMore />
                          )}
                        </>
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
                
                {/* Submenu items */}
                {!isCollapsed && item.subItems && (
                  <Collapse 
                    in={openMenus.includes(item.id!)} 
                    timeout="auto" 
                    unmountOnExit
                  >
                    <List component="div" disablePadding>
                      {item.subItems.map((subItem: any) => (
                        <ListItem key={subItem.text} disablePadding>
                          <ListItemButton
                            selected={location.pathname === subItem.path}
                            onClick={() => navigate(subItem.path)}
                            sx={{ pl: 4 }}
                          >
                            <ListItemIcon sx={{ 
                              minWidth: 40,
                              color: getClusterColor(subItem.id) || getClusterColor(item.id) || 'inherit'
                            }}>
                              {subItem.icon}
                            </ListItemIcon>
                            <ListItemText primary={subItem.text} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            ))}
          </List>
        </Box>
        
        {/* Admin Section at Bottom */}
        {adminItems.length > 0 && (
          <>
            <Divider />
            <List>
              {adminItems.map((item) => (
                <React.Fragment key={item.id}>
                  <ListItem disablePadding>
                    <Tooltip title={isCollapsed ? item.text : ""} placement="right">
                      <ListItemButton
                        selected={location.pathname === item.path}
                        onClick={() => navigate(item.path)}
                        sx={{ 
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                          px: isCollapsed ? 1 : 2,
                          minHeight: isCollapsed ? 56 : 48, // Größere Click-Area im collapsed Mode
                          py: isCollapsed ? 2 : 1 // Mehr Padding für bessere Touch-Targets
                        }}
                      >
                        <ListItemIcon sx={{ 
                          minWidth: isCollapsed ? 'auto' : 56,
                          justifyContent: 'center',
                          color: getClusterColor(item.id) || 'inherit'
                        }}>
                          {item.icon}
                        </ListItemIcon>
                        {!isCollapsed && (
                          <ListItemText primary={item.text} />
                        )}
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </>
        )}
      </Drawer>

      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 0.25, // Minimales padding
          marginLeft: isCollapsed ? '10px' : '10px', // Immer 10px margin
          transition: 'margin-left 0.3s ease',
          width: isCollapsed ? 'calc(100% - 74px)' : 'calc(100% - 210px)' // Dynamische Breite
        }}
      >
        <Toolbar /> {/* Normale Toolbar-Höhe für korrektes Spacing */}
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
