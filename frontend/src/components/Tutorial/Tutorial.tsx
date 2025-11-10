import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Slide,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  AccessTime as AccessTimeIcon,
  QueryStats as QueryStatsIcon
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { useNavigate } from 'react-router-dom';

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface TutorialStep {
  title: string;
  content: string;
  icon: React.ReactNode;
  target?: string; // CSS selector for highlighting
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Willkommen bei ZeitWerk! 🎉",
    content: "ZeitWerk ist Ihre neue Dienstplan-App für die Jugendarbeit. Lassen Sie uns gemeinsam die wichtigsten Funktionen durchgehen.",
    icon: <CheckIcon sx={{ fontSize: 48, color: 'success.main' }} />
  },
  {
    title: "Dashboard 📊",
    content: "Hier finden Sie eine Übersicht über alle wichtigen Zahlen: Mitarbeiter, Schichten und anstehende Termine. Das Dashboard ist Ihr zentraler Startpunkt.",
    icon: <DashboardIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
    target: '[href="/dashboard"]'
  },
  {
    title: "Wochenansicht 📅",
    content: "Die Wochenansicht ist das Herzstück der App. Hier können Sie Schichten planen, bearbeiten und Mitarbeiter zuweisen. Klicken Sie einfach auf eine Zelle, um eine neue Schicht zu erstellen.",
    icon: <CalendarIcon sx={{ fontSize: 48, color: 'info.main' }} />,
    target: '[href="/week"]'
  },
  {
    title: "Arbeitszeiten je Tag ⏱️",
    content: "In der Wochenansicht werden Brutto-, Pausen- und Nettozeiten pro Schicht berücksichtigt. Im Tooltip einer Schicht sehen Sie die genaue Aufschlüsselung.",
    icon: <AccessTimeIcon sx={{ fontSize: 48, color: 'info.main' }} />,
    // Wochenansicht ist die passende Ansicht
    target: '[href="/week"]'
  },
  {
    title: "Wochenstunden & Differenz 📈",
    content: "Rechts in der Wochenansicht sehen Sie die Wochenstunden je Mitarbeiter und eine farbige Differenz (Δ) zum Soll. Rot = Überzeit, Gelb = Unterzeit, Grün = im Plan.",
    icon: <QueryStatsIcon sx={{ fontSize: 48, color: 'success.main' }} />,
    target: '[href="/week"]'
  },
  {
    title: "Mitarbeiter 👥",
    content: "Verwalten Sie hier alle Mitarbeiter Ihrer Organisation. Sie können neue Mitarbeiter hinzufügen, bestehende bearbeiten und deren Informationen einsehen.",
    icon: <PeopleIcon sx={{ fontSize: 48, color: 'secondary.main' }} />,
    target: '[href="/employees"]'
  },
  {
    title: "Schichttypen ⚡",
    content: "Definieren Sie hier verschiedene Schichttypen wie Frühdienst, Spätdienst oder Abendschicht. Jeder Schichttyp hat feste Zeiten und eine eigene Farbe.",
    icon: <WorkIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
    target: '[href="/shift-types"]'
  },
  {
    title: "Einstellungen ⚙️",
    content: "Im Admin-Bereich können Sie Feiertage verwalten, die App-Einstellungen anpassen und Standard-Schichttypen erstellen.",
    icon: <SettingsIcon sx={{ fontSize: 48, color: 'error.main' }} />,
    target: '[href="/admin"]'
  },
  {
    title: "Los geht's! 🚀",
    content: "Sie sind bereit! Ihre App ist mit Beispieldaten vorbereitet. Erkunden Sie die Funktionen und passen Sie alles nach Ihren Bedürfnissen an. Viel Erfolg mit ZeitWerk!",
    icon: <CheckIcon sx={{ fontSize: 48, color: 'success.main' }} />
  }
];

interface TutorialProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ open, onClose, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();
  const navigate = useNavigate();

  // Navigate to relevant route on step change and then highlight target
  useEffect(() => {
    if (!open) return;
    const step = tutorialSteps[activeStep];
    let path: string | null = null;
    if (step.target) {
      const match = step.target.match(/\[href=\"([^\"]+)\"\]/);
      if (match) path = match[1];
    }

    // Default routing for certain step titles
    if (!path) {
      if (/Wochenansicht|Arbeitszeiten|Wochenstunden/i.test(step.title)) path = '/week';
      if (/Dashboard/i.test(step.title)) path = '/dashboard';
      if (/Mitarbeiter/i.test(step.title)) path = '/employees';
      if (/Schichttypen/i.test(step.title)) path = '/shift-types';
      if (/Einstellungen/i.test(step.title)) path = '/admin';
    }

    if (path) {
      navigate(path, { replace: false });
    }

    // Slight delay to allow DOM to render before highlighting
    const timer = setTimeout(() => {
      if (step.target) {
        const el = document.querySelector(step.target!);
        if (el) el.classList.add('tutorial-highlight');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    };
  }, [activeStep, open, navigate]);

  // Add CSS for highlighting
  useEffect(() => {
    if (open) {
      const style = document.createElement('style');
      style.textContent = `
        .tutorial-highlight {
          outline: 3px solid ${theme.palette.primary.main} !important;
          outline-offset: 2px !important;
          border-radius: 8px !important;
          background-color: ${alpha(theme.palette.primary.main, 0.1)} !important;
          transition: all 0.3s ease !important;
          animation: pulse 2s infinite !important;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 ${alpha(theme.palette.primary.main, 0.7)}; }
          70% { box-shadow: 0 0 0 10px ${alpha(theme.palette.primary.main, 0)}; }
          100% { box-shadow: 0 0 0 0 ${alpha(theme.palette.primary.main, 0)}; }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
        // Clean up any remaining highlights
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
          el.classList.remove('tutorial-highlight');
        });
      };
    }
  }, [open, theme.palette.primary.main]);

  const handleNext = () => {
    if (activeStep < tutorialSteps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const handleComplete = () => {
    onComplete();
    onClose();
    setActiveStep(0);
  };

  const handleSkip = () => {
    onClose();
    setActiveStep(0);
  };

  const currentStep = tutorialSteps[activeStep];

  return (
    <Dialog
      open={open}
      onClose={handleSkip}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          // In Light Mode klare Lesbarkeit: weniger Transparenz, heller Hintergrund
          background: theme.palette.mode === 'light'
            ? theme.palette.background.paper
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {currentStep.icon}
          <Typography variant="h5" component="div" fontWeight="bold">
            {currentStep.title}
          </Typography>
        </Box>
        <IconButton onClick={handleSkip} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {/* Progress Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {tutorialSteps.map((_, index) => (
            <Step key={index}>
              <StepLabel />
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            // In Light Mode opak für bessere Lesbarkeit; in Dark leicht transparent
            backgroundColor: theme.palette.mode === 'light' 
              ? theme.palette.background.paper 
              : alpha(theme.palette.background.paper, 0.85),
            border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'light' ? 0.2 : 0.1)}`,
            borderRadius: 2
          }}
        >
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.6 }}>
            {currentStep.content}
          </Typography>
        </Paper>

        {/* Step Counter */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Schritt {activeStep + 1} von {tutorialSteps.length}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
        <Button 
          onClick={handleSkip} 
          color="inherit"
          sx={{ textTransform: 'none' }}
        >
          Tutorial überspringen
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            onClick={handleBack} 
            disabled={activeStep === 0}
            startIcon={<BackIcon />}
            sx={{ textTransform: 'none' }}
          >
            Zurück
          </Button>
          
          <Button 
            onClick={handleNext}
            variant="contained"
            endIcon={activeStep === tutorialSteps.length - 1 ? <CheckIcon /> : <NextIcon />}
            sx={{ textTransform: 'none', minWidth: 120 }}
          >
            {activeStep === tutorialSteps.length - 1 ? 'Fertig!' : 'Weiter'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default Tutorial;
