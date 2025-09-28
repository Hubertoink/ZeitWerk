import React, { createContext, useContext, useState, useEffect } from 'react';

interface TutorialContextType {
  isTutorialActive: boolean;
  showTutorial: () => void;
  hideTutorial: () => void;
  completeTutorial: () => void;
  isFirstTime: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

interface TutorialProviderProps {
  children: React.ReactNode;
}

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    // Vorher wurde das Tutorial automatisch geöffnet.
    // Auf Wunsch: Nicht mehr automatisch starten, nur Hinweis-Flag setzen.
    const hasSeenTutorial = localStorage.getItem('zeitwerk_tutorial_completed');
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!hasSeenTutorial && isAuthenticated) {
      setIsFirstTime(true); // Kann für einen dezenten Hinweis/Badge genutzt werden
    }
  }, []);

  const showTutorial = () => {
    setIsTutorialActive(true);
  };

  const hideTutorial = () => {
    setIsTutorialActive(false);
  };

  const completeTutorial = () => {
    localStorage.setItem('zeitwerk_tutorial_completed', 'true');
    setIsTutorialActive(false);
    setIsFirstTime(false);
  };

  const value = {
    isTutorialActive,
    showTutorial,
    hideTutorial,
    completeTutorial,
    isFirstTime
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export default TutorialContext;
