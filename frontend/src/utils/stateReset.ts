/**
 * State Reset Utilities
 * 
 * Diese Utilities helfen dabei, verschiedene UI- und Form-States nach kritischen Operationen
 * wie dem Löschen von Schichten zurückzusetzen, um Form-Input-Blockierungen zu verhindern.
 */

// Type für State Reset Callbacks
export type StateResetCallback = () => void;

export interface StateResetManager {
  resetCallbacks: StateResetCallback[];
  addResetCallback: (callback: StateResetCallback) => void;
  executeReset: () => void;
  clearCallbacks: () => void;
}

// Globaler State Reset Manager
let globalResetManager: StateResetManager = {
  resetCallbacks: [],
  addResetCallback: function(callback: StateResetCallback) {
    this.resetCallbacks.push(callback);
  },
  executeReset: function() {
  // Executing global state reset
    this.resetCallbacks.forEach((callback, index) => {
      try {
        callback();
  // Reset callback executed successfully
      } catch (error) {
        console.error(`❌ Reset callback ${index + 1} failed:`, error);
      }
    });
  },
  clearCallbacks: function() {
    this.resetCallbacks = [];
  }
};

/**
 * Hook für Component-spezifische Reset-Funktionalität
 */
export const useStateReset = () => {
  const registerResetCallback = (callback: StateResetCallback) => {
    globalResetManager.addResetCallback(callback);
  };

  const executeGlobalReset = () => {
    globalResetManager.executeReset();
  };

  const clearAllResetCallbacks = () => {
    globalResetManager.clearCallbacks();
  };

  return {
    registerResetCallback,
    executeGlobalReset,
    clearAllResetCallbacks
  };
};

/**
 * Standard Reset-Funktionen für häufige UI-States
 */
export const createDialogResetFunction = (
  setDialogState: (state: any) => void,
  resetState: any
) => {
  return () => {
    setDialogState(resetState);
  };
};

export const createFormResetFunction = (
  setFormData: (state: any) => void,
  initialFormData: any
) => {
  return () => {
    setFormData(initialFormData);
  };
};

/**
 * Vorgefertigte Reset-Funktionen für spezielle Komponenten
 */
export const resetWeekViewDialogs = (setters: {
  setEditShiftDialog: (state: any) => void;
  setBulkCreateDialog: (state: any) => void;
  setConflictDialog: (state: any) => void;
  setWeekCopyDialog: (state: any) => void;
}) => {
  return () => {
    setters.setEditShiftDialog({ open: false, shift: null });
    setters.setBulkCreateDialog({ open: false, employeeId: null, date: null, resetKey: Date.now() });
    setters.setConflictDialog({ open: false, newShift: null, existingShifts: [], message: '' });
    setters.setWeekCopyDialog({ open: false });
  };
};

/**
 * Debugging-Hilfe: State-Reset mit Logging
 */
export const debugStateReset = (componentName: string, resetFunction: StateResetCallback) => {
  return () => {
  // Resetting state for component
    try {
      resetFunction();
  // State reset successful
    } catch (error) {
      console.error(`❌ State reset failed for: ${componentName}`, error);
    }
  };
};

export default globalResetManager;
