import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Snackbar,
  Switch,
  TextField,
  Alert,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import { MoreHoriz, Delete as DeleteIcon, Info as InfoIcon, RemoveCircleOutline as RemoveCircleOutlineIcon } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { format, startOfWeek, addDays } from 'date-fns';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createShift, deleteShift, fetchShifts } from '../../store/slices/shiftSlice';

type TemplateType = 'personalized' | 'generic';

type TemplateShift = {
  dayIndex: number; // 0..6 (Mon..Sun)
  shiftTypeId: any;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  category?: string;
  countsTowardHours?: boolean;
  notes?: string;
  employeeRef?: { id: any } | null;
  organizationUnitId?: any;
};

type WeeklyTemplate = {
  id: string;
  name: string;
  description?: string;
  organizationId?: any;
  templateType: TemplateType;
  createdAt: string;
  weekScope?: number;
  entries: TemplateShift[];
};

function lsGet(): WeeklyTemplate[] {
  try {
    const raw = localStorage.getItem('zeitwerk_weekly_templates');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function lsSet(templates: WeeklyTemplate[]) {
  try { localStorage.setItem('zeitwerk_weekly_templates', JSON.stringify(templates)); } catch {}
}

export interface TemplateActionsProps {
  weekDays: Date[];
  employees: any[];
  selectedOrganization?: any;
  getShifts: (employeeId: number, day: Date) => any[];
}

const TemplateActions: React.FC<TemplateActionsProps> = ({ weekDays, employees, selectedOrganization, getShifts }) => {
  const dispatch = useAppDispatch();
  const shiftTypes = useAppSelector(state => (state as any).shiftTypes?.shiftTypes || []);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [snack, setSnack] = useState<{open: boolean; message: string; severity: 'success'|'error'|'info'}>({ open: false, message: '', severity: 'success' });

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');
  const [tplType, setTplType] = useState<TemplateType>('personalized');
  const [includeAbsences, setIncludeAbsences] = useState(true);
  const [onlyVisibleDays, setOnlyVisibleDays] = useState(true);

  // Apply dialog state (MVP: UI-only, with preview counts)
  const [applyOpen, setApplyOpen] = useState(false);
  const [targetMonday, setTargetMonday] = useState<string>(weekDays?.[0] ? format(startOfWeek(weekDays[0], { weekStartsOn: 1 }), 'yyyy-MM-dd') : format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [conflictStrategy, setConflictStrategy] = useState<'skip'|'overwrite'>('skip');
  const [applyAbsences, setApplyAbsences] = useState(true);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [entryAssignments, setEntryAssignments] = useState<Record<number, string>>({});

  // Overview dialog
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTemplate, setDetailsTemplate] = useState<WeeklyTemplate | null>(null);

  const [templates, setTemplates] = useState<WeeklyTemplate[]>(lsGet());
  const refreshTemplates = () => setTemplates(lsGet());

  const handleMenuOpen = (e: React.MouseEvent<HTMLButtonElement>) => { refreshTemplates(); setAnchorEl(e.currentTarget); };
  const handleMenuClose = () => setAnchorEl(null);

  // Build template from current week
  const buildCurrentWeekTemplate = (): WeeklyTemplate | null => {
    if (!weekDays || weekDays.length === 0) return null;
    const scope = weekDays.length;
    const useIndexes = (onlyVisibleDays && weekDays.length > 5)
      ? Array.from({ length: 5 }, (_, i) => i)
      : Array.from({ length: weekDays.length }, (_, i) => i);
    const entries: TemplateShift[] = [];
    employees.forEach(emp => {
      useIndexes.forEach((idx) => {
        const day = weekDays[idx];
        const dayShifts = getShifts(emp.id, day) || [];
        dayShifts.forEach((s: any) => {
          const category = s.shiftTypeCategory || s.category;
          if (!includeAbsences && category === 'absence') return;
          entries.push({
            dayIndex: idx,
            shiftTypeId: s.shiftTypeId || s.shift_type_id,
            startTime: s.startTime || s.start_time,
            endTime: s.endTime || s.end_time,
            isAllDay: !!s.shiftTypeIsAllDay,
            category,
            countsTowardHours: s.shiftTypeCountsTowardHours,
            notes: s.notes || '',
            employeeRef: tplType === 'personalized' ? { id: emp.id } : null,
            organizationUnitId: selectedOrganization?.id
          });
        });
      });
    });
    return {
      id: `${Date.now()}`,
      name: tplName.trim(),
      description: tplDesc.trim() || undefined,
      organizationId: selectedOrganization?.id,
      templateType: tplType,
      createdAt: new Date().toISOString(),
      weekScope: scope,
      entries
    };
  };

  const openCreate = () => { setTplName(''); setTplDesc(''); setTplType('personalized'); setIncludeAbsences(true); setOnlyVisibleDays(true); setCreateOpen(true); };
  const openApply = () => {
    // Default to currently focused week (provided via props.weekDays)
    const monday = weekDays?.[0] ? startOfWeek(weekDays[0], { weekStartsOn: 1 }) : startOfWeek(new Date(), { weekStartsOn: 1 });
    setTargetMonday(format(monday, 'yyyy-MM-dd'));
    setApplyOpen(true);
  };
  const openOverview = () => { setOverviewOpen(true); };

  const handleCreateSave = () => {
    if (!tplName.trim()) { setSnack({ open: true, message: 'Bitte Namen eingeben.', severity: 'error' }); return; }
    const tpl = buildCurrentWeekTemplate();
    if (!tpl || tpl.entries.length === 0) { setSnack({ open: true, message: 'Keine Schichten in dieser Woche zum Speichern gefunden.', severity: 'error' }); return; }
    try {
      const list = lsGet();
      list.push(tpl);
      lsSet(list);
      refreshTemplates();
      setCreateOpen(false);
      setSnack({ open: true, message: `Vorlage "${tpl.name}" gespeichert (${tpl.entries.length} Einträge).`, severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'Vorlage konnte nicht gespeichert werden.', severity: 'error' });
    }
  };

  // Recompute mapping defaults when template selection changes
  React.useEffect(() => {
    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (!tpl) { setMapping({}); return; }
    if (tpl.templateType !== 'personalized') { setMapping({}); return; }
    const uniqueSourceIds = Array.from(new Set(tpl.entries.map(e => e.employeeRef?.id).filter(Boolean)));
    const initial: Record<string, string> = {};
    uniqueSourceIds.forEach((srcId: any) => {
      const exists = employees.some(e => e.id === srcId);
      initial[String(srcId)] = exists ? String(srcId) : '';
    });
    setMapping(initial);
    setEntryAssignments({});
  }, [selectedTemplateId, templates, employees]);

  const handleApplyRun = () => {
    (async () => {
      const list = lsGet();
      const tpl = list.find(t => t.id === selectedTemplateId);
      if (!tpl) { setSnack({ open: true, message: 'Bitte eine Vorlage auswählen.', severity: 'error' }); return; }
      if (!targetMonday) { setSnack({ open: true, message: 'Bitte ein gültiges Montags-Datum wählen.', severity: 'error' }); return; }

      const monday = new Date(targetMonday);
      let created = 0;
      let skipped = 0;
      let overwritten = 0;

      // Small helpers
      const toMinutes = (t?: string) => {
        if (!t) return null;
        // Normalize 24:00 to 1440
        const parts = t.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1] || '0', 10);
        return (h === 24 ? 1440 : h * 60) + m;
      };
      const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd);

      for (let i = 0; i < tpl.entries.length; i++) {
        const entry = tpl.entries[i];
        if (!applyAbsences && entry.category === 'absence') { skipped++; continue; }
        const date = addDays(monday, entry.dayIndex);
        const dateStr = format(date, 'yyyy-MM-dd');

        // Determine employee
        const employeeId = tpl.templateType === 'personalized'
          ? (() => {
              const key = String(entry.employeeRef?.id || '');
              // Wichtig: explizit leere Zuordnung ('') muss erhalten bleiben und darf NICHT auf Original-ID zurückfallen
              if (Object.prototype.hasOwnProperty.call(mapping, key)) return mapping[key];
              return entry.employeeRef?.id;
            })()
          : entryAssignments[i] || null;
        if (!employeeId) { skipped++; continue; }
        const employeeExists = employees.some(e => e.id === employeeId);
        if (!employeeExists) { skipped++; continue; }

        // Check conflicts for this employee/day
        const existing = getShifts(employeeId, date) || [];
        const eStart = toMinutes(entry.startTime || '09:00') ?? 540;
        const eEndRaw = toMinutes(entry.endTime || '17:00') ?? 1020;
        const eEnd = Math.max(eEndRaw, eStart); // guard

        const conflicting = existing.filter((s: any) => {
          const sStart = toMinutes(s.startTime || s.start_time || '09:00') ?? 540;
          const sEndRaw = toMinutes(s.endTime || s.end_time || '17:00') ?? 1020;
          const sEnd = Math.max(sEndRaw, sStart);
          return overlaps(eStart, eEnd, sStart, sEnd);
        });

        if (conflicting.length > 0) {
          if (conflictStrategy === 'skip') { skipped++; continue; }
          if (conflictStrategy === 'overwrite') {
            for (const c of conflicting) {
              try {
                if (c.id != null) {
                  await dispatch(deleteShift(parseInt(c.id))).unwrap();
                  overwritten++;
                }
              } catch (_) {
                // ignore delete errors, still attempt to create
              }
            }
          }
        }

        const normalizeEnd = (t: string) => (t === '24:00' ? '00:00' : t);
        const startTime = entry.startTime || '09:00';
        const endTime = normalizeEnd(entry.endTime || '17:00');

        const newShift = {
          shiftTypeId: String(entry.shiftTypeId),
          employeeId: String(employeeId),
          date: dateStr,
          startTime,
          endTime,
          notes: entry.notes || '',
          organizationUnitId: String(selectedOrganization?.id || '')
        };

        try {
          await dispatch(createShift(newShift as any)).unwrap();
          created++;
        } catch (err: any) {
          skipped++;
        }
      }

      // One refresh
      await dispatch(fetchShifts({} as any));
      setApplyOpen(false);

      let msg = `Vorlage "${tpl.name}": ${created} erstellt`;
      if (skipped) msg += `, ${skipped} übersprungen`;
      if (conflictStrategy === 'overwrite' && overwritten) msg += `, ${overwritten} gelöscht`;
      setSnack({ open: true, message: msg + '.', severity: created ? 'success' : 'info' });
    })();
  };

  const handleDeleteTemplate = (id: string) => {
    const list = lsGet().filter(t => t.id !== id);
    lsSet(list);
    refreshTemplates();
    setSnack({ open: true, message: 'Vorlage gelöscht.', severity: 'success' });
  };

  // --- Mini Week Grid (Preview) ---
  const MiniWeekGrid: React.FC<{ tpl: WeeklyTemplate }> = ({ tpl }) => {
    const scope = Math.max(1, Math.min(tpl.weekScope || 7, 7));
    const dayLabels = ['Mo','Di','Mi','Do','Fr','Sa','So'].slice(0, scope);
    const entriesByDay: Array<Array<{ e: TemplateShift; idx: number }>> = Array.from({ length: scope }, () => []);
    (tpl.entries || []).forEach((e, idx) => { if (e.dayIndex < scope) entriesByDay[e.dayIndex].push({ e, idx }); });
    const endDisplay = (start?: string, end?: string) => {
      if (!start || !end) return `${start || ''}–${end || ''}`;
      if (end === '00:00' && start !== '00:00') return `${start}–24:00`;
      return `${start}–${end}`;
    };
    const nameFor = (id?: any) => {
      if (!id) return '';
      const emp = employees.find(e => e.id === id);
      if (!emp) return `#${id}`;
      const fn = emp.firstName || emp.first_name || '';
      const ln = emp.lastName || emp.last_name || '';
      return `${fn} ${ln}`.trim();
    };
    const colorFor = (e: TemplateShift): { bg: string; accent: string } => {
      const st = shiftTypes.find((t: any) => String(t.id) === String(e.shiftTypeId));
      const base = st?.color || (e.category === 'absence' ? '#9e9e9e' : '#90caf9');
      return { bg: alpha(base, 0.18), accent: base };
    };
    return (
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${scope}, 1fr)`, backgroundColor: 'action.hover' }}>
          {dayLabels.map((d, i) => (
            <Box key={i} sx={{ p: 0.5, textAlign: 'center', fontSize: '0.75rem', fontWeight: 600 }}>{d}</Box>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${scope}, 1fr)` }}>
          {entriesByDay.map((list, i) => (
            <Box key={i} sx={{ p: 0.5, borderTop: '1px solid', borderColor: 'divider', minHeight: 56 }}>
              {list.length === 0 ? (
                <Typography variant="caption" color="text.secondary">—</Typography>
              ) : (
                list.map(({ e, idx: origIdx }) => {
                  const c = colorFor(e);
                  return (
                    <Box key={origIdx} sx={{ mb: 0.5, p: 0.5, borderRadius: 1, bgcolor: c.bg, borderLeft: '3px solid', borderLeftColor: c.accent }}>
                      <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>
                        {e.isAllDay ? 'ganztägig' : endDisplay(e.startTime, e.endTime)}
                        {tpl.templateType === 'personalized' && e.employeeRef?.id ? ` · ${nameFor(e.employeeRef.id)}` : ''}
                        {e.category === 'absence' ? ' · Abwesenheit' : ''}
                      </Typography>
                    </Box>
                  );
                })
              )}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Button variant="outlined" onClick={handleMenuOpen} endIcon={<MoreHoriz />}>Vorlagen</Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleMenuClose}>
        <MenuItem onClick={() => { handleMenuClose(); openCreate(); }}>Vorlage anlegen</MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); openApply(); }}>Vorlage einfügen</MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); openOverview(); }}>Vorlagen-Übersicht</MenuItem>
      </Menu>

      {/* Create Template Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Vorlage aus aktueller Woche speichern</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Name" value={tplName} onChange={e => setTplName(e.target.value)} required fullWidth />
            <TextField label="Beschreibung" value={tplDesc} onChange={e => setTplDesc(e.target.value)} fullWidth />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Typ</Typography>
              <RadioGroup row value={tplType} onChange={(_, v) => setTplType(v as TemplateType)}>
                <FormControlLabel value="personalized" control={<Radio />} label="Mit Mitarbeiterbindung" />
                <FormControlLabel value="generic" control={<Radio />} label="Ohne Mitarbeiterbindung" />
              </RadioGroup>
            </Box>
            <FormControlLabel control={<Switch checked={includeAbsences} onChange={e => setIncludeAbsences(e.target.checked)} />} label="Abwesenheiten mit speichern" />
            <FormControlLabel control={<Switch checked={onlyVisibleDays} onChange={e => setOnlyVisibleDays(e.target.checked)} />} label="Nur Wochentage" />
            <Alert severity="info">Die Vorlage speichert Schichttyp, Zeiten und optional Mitarbeiter. Mitternacht (00:00) wird als 24:00 berücksichtigt.</Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleCreateSave}>Speichern</Button>
        </DialogActions>
      </Dialog>

      {/* Apply Template Dialog with mapping and preview */}
      <Dialog open={applyOpen} onClose={() => setApplyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Vorlage einfügen</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Vorlage"
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              helperText={templates.length ? `${templates.length} Vorlagen gespeichert` : 'Keine Vorlagen gespeichert'}
            >
              {templates.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name} · {format(new Date(t.createdAt), 'dd.MM.yyyy')}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Zielwoche (Montag)"
              type="date"
              value={targetMonday}
              onChange={e => setTargetMonday(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={(() => {
                const mon = new Date(targetMonday);
                const end = addDays(mon, Math.min(Math.max(weekDays.length - 1, 0), 6));
                return `Woche: ${format(mon, 'dd.MM.yyyy')} – ${format(end, 'dd.MM.yyyy')}`;
              })()}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Konflikte</Typography>
              <RadioGroup row value={conflictStrategy} onChange={(_, v) => setConflictStrategy(v as 'skip'|'overwrite')}>
                <FormControlLabel value="skip" control={<Radio />} label="Überspringen" />
                <FormControlLabel value="overwrite" control={<Radio />} label="Überschreiben" />
              </RadioGroup>
            </Box>
            <FormControlLabel control={<Switch checked={applyAbsences} onChange={e => setApplyAbsences(e.target.checked)} />} label="Abwesenheiten einfügen" />
            {/* Manual mapping for personalized templates */}
            {(() => {
              const tpl = templates.find(t => t.id === selectedTemplateId);
              if (!tpl || tpl.templateType !== 'personalized') return null;
              const uniqueSourceIds = Array.from(new Set(tpl.entries.map(e => e.employeeRef?.id).filter(Boolean)));
              if (uniqueSourceIds.length === 0) return null;
              return (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Mitarbeiter-Zuordnung</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Ordnen Sie die Mitarbeiter der Vorlage Ihren aktuellen Mitarbeitern zu. Nicht zugeordnete Einträge werden übersprungen.
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    {uniqueSourceIds.map((srcId: any) => {
                      const labelLeft = (() => {
                        const exists = employees.find(e => e.id === srcId);
                        if (exists) return `${exists.firstName || exists.first_name || ''} ${exists.lastName || exists.last_name || ''}`.trim() || `Mitarbeiter #${srcId}`;
                        return `Vorlagen-Mitarbeiter #${srcId}`;
                      })();
                      const srcKey = String(srcId);
                      const isUnassigned = (mapping[srcKey] ?? '') === '';
                      return (
                        <React.Fragment key={String(srcId)}>
                          <Box
                            sx={{
                              position: 'relative',
                              '&:hover .tpl-unassign-btn': { opacity: 1, pointerEvents: 'auto' }
                            }}
                          >
                            <TextField label="Vorlage" value={labelLeft} disabled fullWidth />
                            <IconButton
                              className="tpl-unassign-btn"
                              size="small"
                              onClick={() => setMapping(prev => ({ ...prev, [srcKey]: '' }))}
                              title="Zuordnung entfernen"
                              sx={{
                                position: 'absolute',
                                right: 6,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: isUnassigned ? 1 : 0,
                                pointerEvents: isUnassigned ? 'auto' : 'none',
                                transition: 'opacity 120ms ease',
                                color: 'error.main'
                              }}
                            >
                              <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Box>
                          <TextField
                            select
                            label="Zuordnen zu"
                            value={mapping[srcKey] ?? ''}
                            onChange={e => setMapping(prev => ({ ...prev, [srcKey]: e.target.value }))}
                          >
                            <MenuItem value="">
                              <em>— Nicht zuordnen —</em>
                            </MenuItem>
                            {employees.map(emp => (
                              <MenuItem key={emp.id} value={String(emp.id)}>
                                {(emp.firstName || emp.first_name || '') + ' ' + (emp.lastName || emp.last_name || '')}
                              </MenuItem>
                            ))}
                          </TextField>
                        </React.Fragment>
                      );
                    })}
                  </Box>
                </Box>
              );
            })()}

            {/* Preview grid with per-entry assignment for generics */}
            {(() => {
              const tpl = templates.find(t => t.id === selectedTemplateId);
              if (!tpl) return null;
              const scope = Math.max(1, Math.min(tpl.weekScope || 7, 7));
              const dayLabels = ['Mo','Di','Mi','Do','Fr','Sa','So'].slice(0, scope);
              const entriesByDay: Array<Array<{ e: TemplateShift; idx: number }>> = Array.from({ length: scope }, () => []);
              (tpl.entries || []).forEach((e, idx) => { if (e.dayIndex < scope) entriesByDay[e.dayIndex].push({ e, idx }); });
              const endDisplay = (start?: string, end?: string) => {
                if (!start || !end) return `${start || ''}–${end || ''}`;
                if (end === '00:00' && start !== '00:00') return `${start}–24:00`;
                return `${start}–${end}`;
              };
              const nameFor = (id?: any) => {
                if (!id) return '';
                const emp = employees.find(e => e.id === id);
                if (!emp) return `#${id}`;
                const fn = emp.firstName || emp.first_name || '';
                const ln = emp.lastName || emp.last_name || '';
                return `${fn} ${ln}`.trim();
              };
              const isGeneric = tpl.templateType !== 'personalized';
              const colorFor = (e: TemplateShift): { bg: string; accent: string } => {
                const st = shiftTypes.find((t: any) => String(t.id) === String(e.shiftTypeId));
                const base = st?.color || (e.category === 'absence' ? '#9e9e9e' : '#90caf9');
                return { bg: alpha(base, 0.18), accent: base };
              };
              return (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Vorschau</Typography>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${scope}, 1fr)`, backgroundColor: 'action.hover' }}>
                      {dayLabels.map((d, i) => (
                        <Box key={i} sx={{ p: 0.5, textAlign: 'center', fontSize: '0.75rem', fontWeight: 600 }}>{d}</Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${scope}, 1fr)` }}>
                      {entriesByDay.map((list, i) => (
                        <Box key={i} sx={{ p: 0.5, borderTop: '1px solid', borderColor: 'divider', minHeight: 56 }}>
                          {list.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          ) : (
                            list.map(({ e, idx: origIdx }) => {
                              const c = colorFor(e);
                              return (
                              <Box key={origIdx} sx={{ mb: 0.5, p: 0.5, borderRadius: 1, bgcolor: c.bg, borderLeft: '3px solid', borderLeftColor: c.accent }}>
                                <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>
                                  {e.isAllDay ? 'ganztägig' : endDisplay(e.startTime, e.endTime)}
                                  {tpl.templateType === 'personalized' && e.employeeRef?.id ? ` · ${nameFor(e.employeeRef.id)}` : ''}
                                  {e.category === 'absence' ? ' · Abwesenheit' : ''}
                                </Typography>
                                {isGeneric && e.category !== 'absence' && (
                                  <TextField
                                    select
                                    size="small"
                                    label="Zuordnen zu"
                                    value={entryAssignments[origIdx] ?? ''}
                                    onChange={ev => setEntryAssignments(prev => ({ ...prev, [origIdx]: ev.target.value }))}
                                    sx={{ mt: 0.5 }}
                                  >
                                    <MenuItem value="">
                                      <em>— Nicht zuordnen —</em>
                                    </MenuItem>
                                    {employees.map(emp => (
                                      <MenuItem key={emp.id} value={String(emp.id)}>
                                        {(emp.firstName || emp.first_name || '') + ' ' + (emp.lastName || emp.last_name || '')}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                )}
                              </Box>
                              );
                            })
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              );
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleApplyRun}>Einfügen</Button>
        </DialogActions>
      </Dialog>

      {/* Overview Dialog */}
      <Dialog open={overviewOpen} onClose={() => setOverviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Vorlagen-Übersicht</DialogTitle>
        <DialogContent>
          {templates.length === 0 ? (
            <Typography color="text.secondary">Noch keine Vorlagen gespeichert.</Typography>
          ) : (
            <List>
              {templates.map(t => (
                <ListItem key={t.id}
                  secondaryAction={
                    <Box>
                      <IconButton edge="end" aria-label="preview" onClick={() => { setDetailsTemplate(t); setDetailsOpen(true); }} sx={{ mr: 1 }}>
                        <InfoIcon />
                      </IconButton>
                      <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteTemplate(t.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }>
                  <ListItemText primary={t.name} secondary={`${format(new Date(t.createdAt), 'dd.MM.yyyy HH:mm')} · ${t.templateType} · ${t.entries.length} Einträge`} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverviewOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Template Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Vorlage – Details</DialogTitle>
        <DialogContent>
          {detailsTemplate && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="h6">{detailsTemplate.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {format(new Date(detailsTemplate.createdAt), 'dd.MM.yyyy HH:mm')} · {detailsTemplate.templateType} · {detailsTemplate.entries.length} Einträge
              </Typography>
              {!!detailsTemplate.description && (
                <Typography variant="body2" sx={{ mt: 1 }}>{detailsTemplate.description}</Typography>
              )}
              <Box sx={{ mt: 1 }}>
                <MiniWeekGrid tpl={detailsTemplate} />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.severity}>{snack.message}</Alert>
      </Snackbar>
    </>
  );
};

export default TemplateActions;
