import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, defaultSettings } from '../types/settings';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          // Merge with defaults to ensure all properties exist
          setSettings({ ...defaultSettings, ...parsed });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('app-settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    try {
      localStorage.removeItem('app-settings');
    } catch (error) {
      console.error('Error removing settings:', error);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
        isLoading
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Helper hooks for specific settings
export const useCalendarSettings = () => {
  const { settings } = useSettings();
  return settings.calendar;
};

export const useShiftSettings = () => {
  const { settings } = useSettings();
  return settings.shifts;
};
