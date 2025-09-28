import React from 'react';
import { List, ListItem, ListItemText, ListItemIcon, Typography, Box } from '@mui/material';
import { ShiftType } from '@/types';
import { Circle } from '@mui/icons-material';

interface ShiftTypeSelectorProps {
  shiftTypes: ShiftType[];
  onSelect: (shiftType: ShiftType) => void;
  selectedShiftTypeId?: string | null;
}

const ShiftTypeSelector: React.FC<ShiftTypeSelectorProps> = ({
  shiftTypes,
  onSelect,
  selectedShiftTypeId,
}) => {
  return (
    <List dense>
      {shiftTypes.map((type) => (
        <ListItem
          key={type.id}
          button
          selected={selectedShiftTypeId === type.id}
          onClick={() => onSelect(type)}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Circle sx={{ color: type.color, fontSize: '1.2rem' }} />
          </ListItemIcon>
          <ListItemText 
                      primary={
                        <Box component="span" display="flex" alignItems="center">
                          <Typography variant="body1">{type.name}</Typography>
                        </Box>
                      }
                      secondary={type.isFlexible ? 'Flexibel' : `${type.startTime} - ${type.endTime}`}
                    />
        </ListItem>
      ))}
    </List>
  );
};

export default ShiftTypeSelector;