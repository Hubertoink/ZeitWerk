import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/de';

import App from './App';
import { store } from './store/store';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';

// Check if we're running in Electron (preload bridge or UA fallback)
const isElectron = typeof window !== 'undefined' && (
  (window as any).electronAPI || (/Electron/i.test(navigator.userAgent || ''))
);

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const Router = isElectron ? HashRouter : BrowserRouter;

const renderApp = () => {
  const container = document.getElementById('root');
  if (!container) {
    // If the container isn't available yet, wait for DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderApp, { once: true });
      return;
    }
    // As a final fallback, retry on next microtask
    queueMicrotask(renderApp);
    return;
  }

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <Provider store={store}>
        <Router>
          <SettingsProvider>
            <CustomThemeProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
                <App />
              </LocalizationProvider>
            </CustomThemeProvider>
          </SettingsProvider>
        </Router>
      </Provider>
    </React.StrictMode>
  );
};

renderApp();
