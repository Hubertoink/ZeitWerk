/**
 * Focus Manager für Electron + React Apps
 * Löst das Problem mit Focus-Loss nach bestimmten Aktionen
 */

export class FocusManager {
  private static instance: FocusManager;
  // Removed unused fields to satisfy lint rules

  static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  /**
   * Aggressives Auto-Focus mit mehreren Fallback-Strategien
   */
  public restoreFocus(targetSelector?: string, delay: number = 100): void {
    const focusAction = () => {
  // Attempting focus restoration
      
      // Strategy 1: Target selector
      if (targetSelector) {
        const target = document.querySelector(targetSelector) as HTMLElement;
        if (target && this.attemptFocus(target)) {
          // Focus restored via target selector
          return;
        }
      }
      
      // Strategy 2: First input field
      const firstInput = document.querySelector('input[type="text"], input[type="date"], input[type="time"], textarea, select') as HTMLElement;
      if (firstInput && this.attemptFocus(firstInput)) {
  // Focus restored to first input field
        return;
      }
      
      // Strategy 3: Any focusable element
      const focusable = document.querySelector('button, [tabindex]:not([tabindex="-1"]), a[href]') as HTMLElement;
      if (focusable && this.attemptFocus(focusable)) {
  // Focus restored to focusable element
        return;
      }
      
      // Strategy 4: Body as last resort
      document.body.focus();
  // Fallback: Focus set to body
    };

    setTimeout(focusAction, delay);
  }

  /**
   * Versucht ein Element zu fokussieren mit verschiedenen Methoden
   */
  private attemptFocus(element: HTMLElement): boolean {
    try {
      // Method 1: Direct focus
      element.focus();
      if (document.activeElement === element) {
        return true;
      }
      
      // Method 2: Click simulation + focus
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(clickEvent);
      
      setTimeout(() => {
        element.focus();
      }, 10);
      
      return document.activeElement === element;
    } catch (e) {
      console.warn('Focus attempt failed:', e);
      return false;
    }
  }

  /**
   * Focus-Recovery nach Delete-Operationen
   */
  public focusAfterDelete(delay: number = 150): void {
    setTimeout(() => {
  // Post-delete focus recovery
      
      // Versuche zunächst existierende Input-Felder
      const activeInput = document.querySelector('input:not([disabled]), textarea:not([disabled]), select:not([disabled])') as HTMLElement;
      if (activeInput) {
        this.attemptFocus(activeInput);
  // Focus restored to existing input field
        return;
      }
      
      // Fallback auf Body für nächste Interaktion
      document.body.focus();
  // Fallback: Focus set to body for next interaction
    }, delay);
  }

  /**
   * Focus-Setup für Dialog-Öffnung
   */
  public focusOnDialogOpen(inputRef?: React.RefObject<HTMLInputElement>, delay: number = 100): void {
    setTimeout(() => {
      if (inputRef?.current) {
  // Dialog focus: Using provided ref
        this.attemptFocus(inputRef.current);
        return;
      }
      
      // Fallback auf erstes Input-Element im Dialog
      const dialogInput = document.querySelector('[role="dialog"] input[type="text"], [role="dialog"] input[type="date"], [role="dialog"] textarea') as HTMLElement;
      if (dialogInput) {
  // Dialog focus: Using first dialog input
        this.attemptFocus(dialogInput);
        return;
      }
      
  // Dialog focus: No suitable input found
    }, delay);
  }

  /**
   * Electron-spezifische Focus-Recovery
   */
  public recoverElectronFocus(): void {
    if (window.electronAPI) {
  // Electron focus recovery
      
      // Versuche das Hauptfenster zu fokussieren
      setTimeout(() => {
        if (window.electronAPI) {
          // Falls verfügbar, verwende Electron-API um Fenster zu fokussieren
          try {
            window.focus();
            // Electron window focused
          } catch (e) {
            console.warn('Electron focus failed:', e);
          }
        }
        
        // Danach Focus auf ersten Input
        this.restoreFocus();
      }, 50);
    }
  }

  /**
   * Überwacht Focus-Verluste und stellt sie automatisch wieder her
   */
  public enableAutoRecovery(): () => void {
    let focusLossTimer: NodeJS.Timeout;
    
    const handleFocusOut = () => {
      focusLossTimer = setTimeout(() => {
        if (document.activeElement === document.body) {
          // Focus loss detected, attempting recovery
          this.restoreFocus();
        }
      }, 1000); // Warte 1 Sekunde bevor Recovery-Versuch
    };
    
    const handleFocusIn = () => {
      if (focusLossTimer) {
        clearTimeout(focusLossTimer);
      }
    };
    
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('focusin', handleFocusIn);
    
    // Return cleanup function to allow unsubscribing
    return () => {
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('focusin', handleFocusIn);
      if (focusLossTimer) {
        clearTimeout(focusLossTimer);
      }
    };
  }
}

// Default export für einfache Verwendung
export const focusManager = FocusManager.getInstance();

// Helper functions für direkte Verwendung
export const restoreFocus = (targetSelector?: string, delay?: number) => 
  focusManager.restoreFocus(targetSelector, delay);

export const focusAfterDelete = (delay?: number) => 
  focusManager.focusAfterDelete(delay);

export const focusOnDialogOpen = (inputRef?: React.RefObject<HTMLInputElement>, delay?: number) => 
  focusManager.focusOnDialogOpen(inputRef, delay);

export const recoverElectronFocus = () => 
  focusManager.recoverElectronFocus();
