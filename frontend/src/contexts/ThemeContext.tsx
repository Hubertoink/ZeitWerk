import React, { createContext, useContext, useState } from 'react';
import { createTheme, ThemeProvider, Theme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { useSettings } from './SettingsContext';

interface ThemeContextType {
  theme: Theme;
  mode: 'light' | 'dark';
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  // Load theme mode from localStorage on initialization
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const savedMode = localStorage.getItem('theme-mode');
    return (savedMode === 'dark' || savedMode === 'light') ? savedMode : 'light';
  });
  const [lowGpu/*, setLowGpu*/] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('app-settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        return !!parsed?.ui?.lowGpuMode;
      }
    } catch {}
    return false; // default
  });

  const toggleMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      // Save to localStorage
      localStorage.setItem('theme-mode', newMode);
      return newMode;
    });
  };

  // Build CSS values depending on lowGpu mode (strip heavy effects)
  const blurSmall = lowGpu ? 'none' : 'blur(10px)';
  const blurMed = lowGpu ? 'none' : 'blur(12px)';
  const blurLg = lowGpu ? 'none' : 'blur(20px)';
  const blurXl = lowGpu ? 'none' : 'blur(24px)';
  const gradient = (c1: string, c2: string) => lowGpu ? c1 : `linear-gradient(135deg, ${c1}, ${c2})`;

  // Palette presets
  const lightPresets: Record<string, { primary: string; secondary: string; background?: string; text?: string }> = {
    standard: { primary: '#6750A4', secondary: '#625B71' },
    'pastel-dreamland': { primary: '#cdb4db', secondary: '#ffafcc', background: '#fffcf2', text: '#1D1B20' },
    'rustic-charm': { primary: '#eb5e28', secondary: '#403d39', background: '#fffcf2', text: '#252422' },
  };
  const darkPresets: Record<string, { primary: string; secondary: string; background?: string; text?: string }> = {
    standard: { primary: '#D0BCFF', secondary: '#CCC2DC' },
    'vintage-charm': { primary: '#efd6ac', secondary: '#c44900', background: '#04151f', text: '#E6E1E5' },
    'cherry-blossom': { primary: '#ea638c', secondary: '#89023e', background: '#1b2021', text: '#E6E1E5' },
  };

  const lightPresetKey = settings?.ui?.themePresetLight || 'standard';
  const darkPresetKey = settings?.ui?.themePresetDark || 'standard';
  const lp = lightPresets[lightPresetKey] || lightPresets.standard;
  const dp = darkPresets[darkPresetKey] || darkPresets.standard;

  const theme = createTheme({
    palette: {
      mode,
      ...(mode === 'light' ? {
        // Material Design 3 Light Theme (with preset overrides)
        primary: {
          main: lp.primary,
          light: '#D0BCFF',
          dark: '#4F378B',
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: lp.secondary,
          light: '#E8DEF8',
          dark: '#4A4458',
          contrastText: '#FFFFFF',
        },
        error: {
          main: '#BA1A1A',
          light: '#FFDAD6',
          dark: '#93000A',
          contrastText: '#FFFFFF',
        },
        warning: {
          main: '#7D5260',
          light: '#FFD8E4',
          dark: '#633B48',
          contrastText: '#FFFFFF',
        },
        info: {
          main: '#7D5260',
          light: '#FFD8E4',
          dark: '#633B48',
          contrastText: '#FFFFFF',
        },
        success: {
          main: '#006E1C',
          light: '#B8F397',
          dark: '#004F0F',
          contrastText: '#FFFFFF',
        },
        background: {
          default: lp.background || '#FEFBFF',
          paper: lp.background || '#FEF7FF',
        },
        text: {
          primary: lp.text || '#1D1B20',
          secondary: '#49454F',
        },
        grey: {
          50: '#F7F2FA',
          100: '#F2EDF7',
          200: '#E6E1E5',
          300: '#CAC4D0',
          400: '#938F99',
          500: '#79747E',
          600: '#605D66',
          700: '#49454F',
          800: '#322F37',
          900: '#1D1B20',
        },
      } : {
        // Material Design 3 Dark Theme (with preset overrides)
        primary: {
          main: dp.primary,
          light: '#EADDFF',
          dark: '#4F378B',
          contrastText: '#371E73',
        },
        secondary: {
          main: dp.secondary,
          light: '#E8DEF8',
          dark: '#4A4458',
          contrastText: '#332D41',
        },
        error: {
          main: '#FFB4AB',
          light: '#FFDAD6',
          dark: '#93000A',
          contrastText: '#690005',
        },
        warning: {
          main: '#EFB8C8',
          light: '#FFD8E4',
          dark: '#633B48',
          contrastText: '#492532',
        },
        info: {
          main: '#EFB8C8',
          light: '#FFD8E4',
          dark: '#633B48',
          contrastText: '#492532',
        },
        success: {
          main: '#9DD58C',
          light: '#B8F397',
          dark: '#004F0F',
          contrastText: '#00390B',
        },
        background: {
          default: dp.background || '#141218',
          paper: dp.background || '#1D1B20',
        },
        text: {
          primary: dp.text || '#E6E1E5',
          secondary: '#CAC4D0',
        },
        grey: {
          50: '#1D1B20',
          100: '#322F37',
          200: '#49454F',
          300: '#605D66',
          400: '#79747E',
          500: '#938F99',
          600: '#CAC4D0',
          700: '#E6E1E5',
          800: '#F2EDF7',
          900: '#F7F2FA',
        },
      }),
    },
    
    // Global CSS overrides (e.g., themed scrollbars)
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => {
          const isDark = mode === 'dark';
          const track = isDark ? theme.palette.grey[100] : theme.palette.grey[200];
          const thumb = isDark ? theme.palette.grey[300] : theme.palette.grey[400];
          const thumbHover = isDark ? theme.palette.grey[400] : theme.palette.grey[500];
          return {
            html: {
              scrollbarWidth: 'thin',
              scrollbarColor: `${thumb} ${track}`,
            },
            body: {
              scrollbarWidth: 'thin',
              scrollbarColor: `${thumb} ${track}`,
              // Avoid layout shift when scrollbar appears
              scrollbarGutter: 'stable',
            },
            '::-webkit-scrollbar': {
              width: 10,
              height: 10,
            },
            '::-webkit-scrollbar-track': {
              backgroundColor: track,
              borderRadius: 8,
            },
            '::-webkit-scrollbar-thumb': {
              backgroundColor: thumb,
              borderRadius: 8,
              border: '2px solid transparent',
              backgroundClip: 'content-box',
            },
            '::-webkit-scrollbar-thumb:hover': {
              backgroundColor: thumbHover,
            },
            '::-webkit-scrollbar-corner': {
              backgroundColor: track,
            },
          };
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#FEFBFF',
            borderBottom: mode === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.12)' 
              : '1px solid rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#FEFBFF',
            borderRight: mode === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.12)' 
              : '1px solid rgba(0, 0, 0, 0.12)',
          },
        },
      },
      // Card with optional glassmorphism (disabled in lowGpu)
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: mode === 'dark' 
              ? (lowGpu ? '#1D1B20' : 'rgba(29, 27, 32, 0.8)') 
              : (lowGpu ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)'),
            backdropFilter: blurLg,
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: theme.spacing(2),
            transition: 'all 0.3s ease-in-out',
            boxShadow: mode === 'dark'
              ? '0 4px 20px rgba(0, 0, 0, 0.4)'
              : '0 4px 20px rgba(103, 80, 164, 0.1)',
            '&:hover': {
              backgroundColor: mode === 'dark' 
                ? (lowGpu ? '#1D1B20' : 'rgba(29, 27, 32, 0.9)') 
                : (lowGpu ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)'),
              transform: 'translateY(-2px)',
              boxShadow: mode === 'dark'
                ? '0 8px 30px rgba(0, 0, 0, 0.5)'
                : '0 8px 32px rgba(103, 80, 164, 0.15)',
              border: mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.2)'
                : '1px solid rgba(255, 255, 255, 0.5)',
            },
          }),
        },
      },
      // Dialog with optional glassmorphism (disabled in lowGpu)
      MuiDialog: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundColor: mode === 'dark' 
              ? (lowGpu ? '#1D1B20' : 'rgba(29, 27, 32, 0.85)') 
              : (lowGpu ? '#FEFBFF' : 'rgba(254, 251, 255, 0.85)'),
            backdropFilter: blurXl,
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: theme.spacing(3),
            boxShadow: mode === 'dark'
              ? '0 20px 60px rgba(0, 0, 0, 0.7)'
              : '0 20px 60px rgba(103, 80, 164, 0.25)',
          }),
        },
      },
      // Modal Backdrop (no blur in lowGpu)
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' 
              ? 'rgba(0, 0, 0, 0.6)' 
              : 'rgba(103, 80, 164, 0.3)',
            backdropFilter: lowGpu ? 'none' : 'blur(8px)',
          },
        },
      },
      // TextField with optional glassmorphism
      MuiTextField: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiOutlinedInput-root': {
              backgroundColor: mode === 'dark' 
                ? (lowGpu ? 'rgba(255,255,255,0.03)' : 'rgba(255, 255, 255, 0.05)') 
                : (lowGpu ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'),
              backdropFilter: blurMed,
              borderRadius: theme.spacing(1.5),
              transition: 'all 0.3s ease-in-out',
              '& fieldset': {
                borderColor: mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.23)'
                  : 'rgba(103, 80, 164, 0.3)',
                borderWidth: '1px',
              },
              '&:hover fieldset': {
                borderColor: mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.4)'
                  : 'rgba(103, 80, 164, 0.5)',
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                borderWidth: '2px',
              },
              '&.Mui-focused': lowGpu ? {} : {
                backgroundColor: mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(255, 255, 255, 0.9)',
                boxShadow: mode === 'dark'
                  ? '0 4px 20px rgba(208, 188, 255, 0.15)'
                  : '0 4px 20px rgba(103, 80, 164, 0.15)',
              },
              // Bessere Textfarbe für Dark Mode
              '& .MuiInputBase-input': {
                color: mode === 'dark' ? '#E6E1E5' : '#1D1B20',
              },
            },
            '& .MuiInputLabel-root': {
              color: mode === 'dark' ? '#CAC4D0' : '#49454F',
              '&.Mui-focused': {
                color: theme.palette.primary.main,
              },
            },
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: ({ theme, ownerState }) => ({
            borderRadius: theme.spacing(1.5),
            textTransform: 'none',
            fontWeight: 600,
            padding: theme.spacing(1, 3),
            transition: 'all 0.3s ease-in-out',
            backdropFilter: blurSmall,
            ...(ownerState.variant === 'contained' && {
              background: gradient(theme.palette.primary.main, theme.palette.primary.dark),
              boxShadow: `0 4px 15px rgba(103, 80, 164, 0.3)`,
              '&:hover': {
                background: gradient(theme.palette.primary.dark, theme.palette.primary.main),
                boxShadow: `0 6px 20px rgba(103, 80, 164, 0.4)`,
                transform: 'translateY(-2px)',
              },
            }),
            ...(ownerState.variant === 'outlined' && {
              backgroundColor: mode === 'dark' 
                ? (lowGpu ? 'rgba(255,255,255,0.03)' : 'rgba(255, 255, 255, 0.05)') 
                : (lowGpu ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'),
              backdropFilter: blurSmall,
              borderColor: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(103, 80, 164, 0.2)',
              '&:hover': {
                backgroundColor: mode === 'dark' 
                  ? (lowGpu ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255, 0.08)') 
                  : (lowGpu ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'),
                transform: 'translateY(-1px)',
              },
            }),
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' 
              ? (lowGpu ? '#1D1B20' : 'rgba(29, 27, 32, 0.8)') 
              : (lowGpu ? '#FEFBFF' : 'rgba(254, 247, 255, 0.8)'),
            backdropFilter: blurSmall,
            border: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: mode === 'dark'
              ? '0 4px 12px rgba(0, 0, 0, 0.3)'
              : '0 4px 12px rgba(103, 80, 164, 0.1)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ ownerState, theme }) => {
            const isThemed = ownerState.color && ownerState.color !== 'default';
            return {
              // Behalte den Glas-Effekt nur für Chips ohne Farb-Prop
              ...(!isThemed && {
                backgroundColor: mode === 'dark' 
                  ? (lowGpu ? 'rgba(255,255,255,0.05)' : 'rgba(255, 255, 255, 0.08)') 
                  : (lowGpu ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'),
                backdropFilter: blurSmall,
                border: mode === 'dark'
                  ? '1px solid rgba(255, 255, 255, 0.23)'
                  : '1px solid rgba(103, 80, 164, 0.2)',
              }),
              // Stelle sicher, dass der Text bei farbigen Chips lesbar ist
              ...(isThemed && {
                color: theme.palette[ownerState.color as 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'].contrastText,
              }),
            };
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.12)'
              : '1px solid rgba(0, 0, 0, 0.12)',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.23)'
                : 'rgba(103, 80, 164, 0.23)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark'
                ? 'rgba(255, 255, 255, 0.4)'
                : 'rgba(103, 80, 164, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? '#D0BCFF' : '#6750A4',
            },
          },
        },
      },
      // Select-spezifische Styles für bessere Sichtbarkeit
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            '& .MuiSelect-icon': {
              color: mode === 'dark' ? '#E6E1E5' : '#1D1B20',
            },
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1D1B20' : '#FEFBFF',
            color: mode === 'dark' ? '#E6E1E5' : '#1D1B20',
            '&:hover': {
              backgroundColor: mode === 'dark' 
                ? 'rgba(208, 188, 255, 0.08)' 
                : 'rgba(103, 80, 164, 0.08)',
            },
            '&.Mui-selected': {
              backgroundColor: mode === 'dark' 
                ? 'rgba(208, 188, 255, 0.12)' 
                : 'rgba(103, 80, 164, 0.12)',
              '&:hover': {
                backgroundColor: mode === 'dark' 
                  ? 'rgba(208, 188, 255, 0.16)' 
                  : 'rgba(103, 80, 164, 0.16)',
              },
            },
          },
        },
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 600 },
      h2: { fontWeight: 600 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
  });

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
