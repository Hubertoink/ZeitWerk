import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import ServerlessLogin from './components/Auth/ServerlessLogin';
import { useAppDispatch } from './store/hooks';

// Lazy Loading für große Komponenten
const DashboardComponent = React.lazy(() => import('./components/Dashboard/DashboardComponent'));
const WeekView = React.lazy(() => import('./components/Calendar/WeekView'));
const MonthView = React.lazy(() => import('./components/Calendar/MonthView'));
const EmployeeList = React.lazy(() => import('./components/Employees/EmployeeList'));
const OrganizationList = React.lazy(() => import('./components/Organizations/OrganizationList'));
const ShiftTypeList = React.lazy(() => import('./components/ShiftTypes/ShiftTypeList'));
const AdminPanel = React.lazy(() => import('./components/Admin/AdminPanel'));

// Loading-Komponente
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '50vh' 
    }}
  >
    <CircularProgress />
  </Box>
);
import { fetchShiftTypes } from './store/slices/shiftTypeSlice';
import { fetchOrganizations } from './store/slices/organizationSlice';
import { fetchEmployees } from './store/slices/employeeSlice';
import { useSettings } from './contexts/SettingsContext';
import { TutorialProvider, useTutorial } from './contexts/TutorialContext';
import { repairCopiedShiftsInconsistencies } from './utils/migrations';
import { fetchShifts } from './store/slices/shiftSlice';
import Tutorial from './components/Tutorial/Tutorial';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings } = useSettings();
  const { isTutorialActive, hideTutorial, completeTutorial } = useTutorial();
  
  // Prüfe localStorage für Authentifizierung
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  // First-run Guard: Beim allerersten Start erzwingen wir den Login/Startbildschirm
  React.useEffect(() => {
    try {
      const firstRunFlag = localStorage.getItem('app-first-run-done');
      if (!firstRunFlag) {
        // Markiere, dass wir den ersten Start behandelt haben
        localStorage.setItem('app-first-run-done', 'true');
        // Stelle sicher, dass kein alter Auth-Status durchschlüpft
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authToken');
      }
    } catch {}
  }, []);
  
  // Prüfe ob wir in Electron laufen
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  // Temporär: Stelle sicher, dass das Token gesetzt ist
  React.useEffect(() => {
    if (isAuthenticated && !localStorage.getItem('authToken')) {
      localStorage.setItem('authToken', 'demo-token');
    }
  }, [isAuthenticated]);

  // Lade grundlegende Daten beim App-Start
  React.useEffect(() => {
    if (isAuthenticated) {
      // Lade alle wichtigen Daten parallel
      dispatch(fetchShiftTypes());
      dispatch(fetchOrganizations());  
      dispatch(fetchEmployees());
    }
  }, [isAuthenticated, dispatch]);

  // One-time migration to fix previously copied shifts with wrong organizationId
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const key = 'zw_mig_fix_org_2025_10';
    try {
      if (localStorage.getItem(key)) return;
    } catch {}
    (async () => {
      try {
        const res = await repairCopiedShiftsInconsistencies();
        if (res.fixed > 0) {
          // Refresh shifts so MonthView/exports reflect repaired data
          dispatch(fetchShifts({}));
        }
      } catch (e) {
        // non-fatal
      } finally {
        try { localStorage.setItem(key, '1'); } catch {}
      }
    })();
  }, [isAuthenticated, dispatch]);

  const handleLogin = () => {
    // Beim Login den Token sofort setzen
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authToken', 'demo-token');
    window.location.reload();
  };

  // Für Demo-Zwecke: Immer auf Login-Seite, außer wenn explizit angemeldet
  if (!isAuthenticated) {
    // Verwende ServerlessLogin in Electron, sonst normalen Login
    return isElectron ? 
      <ServerlessLogin onLogin={handleLogin} /> : 
      <Login onLogin={handleLogin} />;
  }

  // Determine default route based on defaultView setting
  const defaultRoute = React.useMemo(() => {
  const defaultView = settings?.ui?.defaultView || 'week';
    
    switch (defaultView) {
      case 'dashboard':
        return '/dashboard';
      case 'month':
        return '/month';
      case 'week':
      default:
        return '/week';
    }
  }, [settings?.ui?.defaultView]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to={defaultRoute} replace />} />
              <Route path="/dashboard" element={<DashboardComponent />} />
              <Route path="/week" element={<WeekView />} />
              <Route path="/month" element={<MonthView />} />
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/organizations" element={<OrganizationList />} />
              <Route path="/shift-types" element={<ShiftTypeList />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </Suspense>
        </Layout>
        
        {/* Tutorial Dialog */}
        <Tutorial 
          open={isTutorialActive} 
          onClose={hideTutorial} 
          onComplete={completeTutorial} 
        />
      </Box>
    </DndProvider>
  );
};

const App: React.FC = () => {
  return (
    <TutorialProvider>
      <AppContent />
    </TutorialProvider>
  );
};

export default App;
