import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DialogActions
} from '@mui/material';
import { format } from 'date-fns';

interface BulkCreateShiftFormProps {
  employeeId: number | null;
  initialDate: string | null;
  shiftTypes: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
  // Neuer Prop zum erzwungenen Reset
  resetKey?: string | number;
}

const BulkCreateShiftForm: React.FC<BulkCreateShiftFormProps> = ({
  employeeId,
  initialDate,
  shiftTypes,
  onSave,
  onCancel,
  resetKey
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null); // Ref für erstes Input-Feld
  const [formData, setFormData] = useState({
    employeeId: employeeId,
    shiftTypeId: '',
    startDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
    endDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    notes: ''
  });

  // Aggressive form reset when props change or resetKey changes
  useEffect(() => {
    console.log('🔄 BulkCreateShiftForm: Resetting form due to prop changes', { 
      employeeId, 
      initialDate, 
      resetKey,
      activeElement: document.activeElement?.tagName,
      activeElementValue: (document.activeElement as any)?.value
    });
    
    // Reset form state
    const newFormData = {
      employeeId: employeeId,
      shiftTypeId: '',
      startDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
      endDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      notes: ''
    };
    
    setFormData(newFormData);
    
    // Force DOM reset using form ref
    if (formRef.current) {
      formRef.current.reset();
      console.log('✅ Form reset completed');
    }
    
    // Multi-stage auto-focus strategy for reliable focus restoration
    const focusFirstInput = () => {
      console.log('🎯 Multi-stage focus attempt...');
      
      // Remove focus from any current element first
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).blur();
      }
      
      // Stage 1: Direct ref focus
      if (firstInputRef.current) {
        try {
          firstInputRef.current.focus();
          if (document.activeElement === firstInputRef.current) {
            console.log('✅ Stage 1 success: Direct ref focus');
            return;
          }
        } catch (e) {
          console.log('❌ Stage 1 failed:', e);
        }
      }
      
      // Stage 2: Query selector focus - first input in form
      try {
        const firstInput = document.querySelector('input[type="date"], input[type="text"], select') as HTMLElement;
        if (firstInput) {
          firstInput.focus();
          if (document.activeElement === firstInput) {
            console.log('✅ Stage 2 success: Query selector focus');
            return;
          }
        }
      } catch (e) {
        console.log('❌ Stage 2 failed:', e);
      }
      
      // Stage 3: Force focus with click simulation
      if (firstInputRef.current) {
        try {
          // Create and dispatch click event
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          firstInputRef.current.dispatchEvent(clickEvent);
          
          // Follow up with focus
          setTimeout(() => {
            if (firstInputRef.current) {
              firstInputRef.current.focus();
              console.log('✅ Stage 3 success: Click simulation + focus');
            }
          }, 50);
        } catch (e) {
          console.log('❌ Stage 3 failed:', e);
        }
      }
    };
    
    // Execute focus with multiple timing attempts
    setTimeout(focusFirstInput, 100);  // Quick attempt
    setTimeout(focusFirstInput, 300);  // Medium delay
    setTimeout(focusFirstInput, 500);  // Long delay for complex UI updates
    
  }, [employeeId, initialDate, resetKey]);

  // Update startTime and endTime when shiftType changes
  const handleShiftTypeChange = (shiftTypeId: string) => {
    const selectedShiftType = shiftTypes.find(st => st.id.toString() === shiftTypeId);
    
    // Always provide safe default times, even if shift type has no times
    const defaultStartTime = selectedShiftType?.startTime || '09:00';
    const defaultEndTime = selectedShiftType?.endTime || '17:00';
    
    setFormData(prev => ({
      ...prev,
      shiftTypeId,
      startTime: defaultStartTime,
      endTime: defaultEndTime
    }));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.shiftTypeId) {
      alert('Bitte wählen Sie einen Schichttyp aus.');
      return;
    }

    // Date validation
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate < startDate) {
      alert('Das Enddatum muss nach dem Startdatum liegen.');
      return;
    }

    // Time validation
    const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
    const [endHours, endMinutes] = formData.endTime.split(':').map(Number);
    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;

    if (endTimeInMinutes <= startTimeInMinutes) {
      alert('Die Endzeit muss nach der Startzeit liegen.');
      return;
    }

    onSave(formData);
    // Reset form after successful submission
    setFormData({
      employeeId: employeeId,
      shiftTypeId: '',
      startDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
      endDate: initialDate || format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '17:00',
      notes: ''
    });
  };

  return (
    <Box component="form" ref={formRef} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <FormControl fullWidth>
        <InputLabel>Schichttyp</InputLabel>
        <Select
          name="shiftTypeId"
          value={formData.shiftTypeId}
          onChange={(e) => handleShiftTypeChange(e.target.value)}
          required
        >
          {shiftTypes.map((shiftType) => (
            <MenuItem key={shiftType.id} value={shiftType.id}>
              {shiftType.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        inputRef={firstInputRef} // Ref für Auto-Focus - das ist das erste echte Input-Feld
        label="Startdatum"
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
        InputLabelProps={{ shrink: true }}
        fullWidth
        required
        onFocus={() => console.log('🎯 Start date input focused')}
        onBlur={() => console.log('🔍 Start date input blurred')}
      />

      <TextField
        label="Enddatum"
        type="date"
        value={formData.endDate}
        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
        InputLabelProps={{ shrink: true }}
        fullWidth
        required
      />

      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Startzeit"
          type="time"
          value={formData.startTime}
          onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <TextField
          label="Endzeit"
          type="time"
          value={formData.endTime}
          onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      </Box>

      <TextField
        label="Notizen"
        value={formData.notes}
        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        multiline
        rows={2}
        fullWidth
        placeholder="z.B. Urlaub, Krankheit, Sondertermin..."
      />

      <DialogActions sx={{ px: 0, pb: 0 }}>
        <Button onClick={onCancel}>Abbrechen</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!formData.shiftTypeId}>
          Schichten erstellen
        </Button>
      </DialogActions>
    </Box>
  );
};

export default BulkCreateShiftForm;
