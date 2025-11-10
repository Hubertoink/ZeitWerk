import { format, parse, isSameDay, addDays } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

type WeekExportCell = {
  text: string;
  bg?: string; // hex color like #FF8800
  color?: string;
  bold?: boolean;
};

type WeekExportRow = WeekExportCell[];

export interface SimpleWeekExportData {
  title: string;
  organization?: string;
  weekRange: { start: Date; end: Date };
  headers: string[]; // first is "Mitarbeiter", then day labels
  rows: WeekExportRow[]; // same length as headers
}
export type SaveResult = { ok: boolean; path?: string; filename: string };
function parseTimeToMinutes(t?: string): number {
  if (!t) return 0;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0);
}

function durationWithMidnight(start?: string, end?: string): number {
  const s = parseTimeToMinutes(start);
  let e = parseTimeToMinutes(end);
  if (e === 0 && s > 0 && (end === '00:00' || end === '0:00')) e = 24 * 60;
  return Math.max(0, e - s);
}

function endDisplayWithMidnight(start?: string, end?: string): string {
  const s = parseTimeToMinutes(start);
  const e = parseTimeToMinutes(end);
  if (e === 0 && s > 0 && (end === '00:00' || end === '0:00')) return '24:00';
  return end || '';
}

// Dashboard export structures
export interface DashboardExportMetadata {
  organization: string;
  organizationId?: any;
  exportDate: string; // formatted string
  timeRange: string; // formatted string
  totalRecords?: {
    shifts: number;
    employees: number;
    shiftTypes: number;
    organizations: number;
  };
}

export interface DashboardExportData {
  metadata: DashboardExportMetadata;
  vacationPeriods?: Array<{ name?: string; startDate: string; endDate: string; affectsScheduling?: boolean; organizationId?: any }>;
  statistics?: {
    totalShifts: number;
    assignedShifts: number;
    unassignedShifts: number;
    assignmentRate: number; // percent
    employees: number;
    organizations: number;
    shiftTypes: number;
  };
  organizations?: Array<{
    id: any; name: string; description: string; address: string; contactPerson: string; phone: string; email: string;
  }>;
  employees?: Array<{
    id: any; firstName: string; lastName: string; email?: string; phone?: string; position?: string; organizationId: any; organizationName: string; hourlyRate?: number; isActive: string; weeklyHours?: number; dailyHoursPlan?: { mon?: number|string; tue?: number|string; wed?: number|string; thu?: number|string; fri?: number|string; sat?: number|string; sun?: number|string };
  }>;
  shiftTypes?: Array<{
    id: any; name: string; description: string; startTime?: string; endTime?: string; isFlexible: string; color: string; colorHex: string; displayTime: string; category?: string; countsTowardHours?: boolean;
  }>;
  shifts?: Array<{
    id: any; date: string; weekday: string; startTime?: string; endTime?: string; duration?: string; shiftTypeId: any; shiftTypeName: string; shiftTypeColor: string; shiftTypeCategory?: string; shiftTypeCountsTowardHours?: boolean; shiftTypeIsAllDay?: boolean; employeeId?: any; employeeName: string; employeePosition?: string; organizationId: any; organizationName: string; notes?: string; isAssigned: string;
  }>;
}

// Shared break rule: >9h => 45min, >6h => 30min
function applyBreaks(mins: number): number {
  return mins > 9 * 60 ? mins - 45 : (mins > 6 * 60 ? mins - 30 : mins);
}

// Build a minimal Excel-compatible HTML workbook (works in .xls) with inline styles
function buildExcelHtml(data: SimpleWeekExportData): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const head = `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; }
    th { background: #f0f0f0; text-align: center; }
    .title { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
    .meta { color: #666; margin-bottom: 12px; font-size: 13px; }
  </style>
  </head><body>`;

  const title = `<div class="title">${esc(data.title)}</div>`;
  const meta = `<div class="meta">Organisation: ${esc(data.organization || '-')}&nbsp;&nbsp;|&nbsp;&nbsp;Zeitraum: ${format(data.weekRange.start, 'dd.MM.yyyy')} - ${format(data.weekRange.end, 'dd.MM.yyyy')}</div>`;

  const thead = `<thead><tr>${data.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${data.rows.map(r => `<tr>${r.map(c => {
    const styles = [
      c.bg ? `background:${c.bg}` : '',
      c.color ? `color:${c.color}` : '',
      c.bold ? 'font-weight:bold' : ''
    ].filter(Boolean).join(';');
    return `<td style="${styles}">${esc(c.text)}</td>`;
  }).join('')}</tr>`).join('')}</tbody>`;

  const table = `<table>${thead}${tbody}</table>`;
  const foot = '</body></html>';
  return head + title + meta + table + foot;
}

function toARGB(hex: string): string {
  // Accept #RRGGBB or RRGGBB
  const h = hex.startsWith('#') ? hex.substring(1) : hex;
  return `FF${h.toUpperCase()}`; // FF alpha + RGB
}

function getContrastFontARGB(hex?: string): { argb: string } {
  if (!hex) return { argb: 'FF000000' };
  const h = hex.startsWith('#') ? hex.substring(1) : hex;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // relative luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b);
  return luminance < 140 ? { argb: 'FFFFFFFF' } : { argb: 'FF000000' };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Schließzeiten-Helper
function parseLocalYMD(s?: string): Date | null {
  if (!s) return null;
  const parts = s.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => isNaN(n as number))) return null;
  const [y, m, d] = parts as [number, number, number];
  return new Date(y, m - 1, d);
}

function isVacationOn(date: Date, periods?: Array<{ startDate: string; endDate: string; affectsScheduling?: boolean; organizationId?: any }>, orgId?: any): { isVacation: boolean; affects?: boolean } {
  if (!periods || !periods.length) return { isVacation: false, affects: undefined } as any;
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hit = periods.find(p => {
    const s = parseLocalYMD(p.startDate) || new Date(p.startDate);
    const e = parseLocalYMD(p.endDate) || new Date(p.endDate);
    const start = new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
    const inRange = day >= start && day <= end;
    const orgOk = !p.organizationId || (orgId != null && p.organizationId?.toString?.() === orgId?.toString?.());
    return inRange && orgOk;
  });
  return { isVacation: !!hit, affects: hit?.affectsScheduling } as any;
}

export async function saveWeekExcel(data: SimpleWeekExportData, defaultFilename: string): Promise<SaveResult> {
    // 1) Try to use ExcelJS for a native .xlsx (no warning, better fonts/styles)
    try {
      // dynamic import to avoid hard dependency at build time (prefer browser build)
      let mod: any;
      try {
        mod = await import('exceljs/dist/exceljs.min.js');
      } catch (_) {
        mod = await import('exceljs');
      }
      const ExcelJS: any = (mod && mod.default) ? mod.default : mod;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Woche');

      const headers = data.headers;
      const colWidths = headers.map((_, i) => (i === 0 ? 24 : 18));
      ws.columns = colWidths.map(w => ({ width: w }));

      // Title row
      ws.addRow([data.title]);
      ws.mergeCells(1, 1, 1, headers.length);
      const titleCell = ws.getCell(1, 1);
      titleCell.font = { bold: true, size: 16 };

      // Meta row
      const meta = `Organisation: ${data.organization || '-'}  |  Zeitraum: ${format(data.weekRange.start, 'dd.MM.yyyy')} - ${format(data.weekRange.end, 'dd.MM.yyyy')}`;
      ws.addRow([meta]);
      ws.mergeCells(2, 1, 2, headers.length);
      const metaCell = ws.getCell(2, 1);
      metaCell.font = { size: 13 };

      // Spacer
      ws.addRow(['']);

      // Header row
      const headerRow = ws.addRow(headers);
      headerRow.font = { bold: true, size: 12 };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' } as any;
      headerRow.eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as any;
      });

      // Data rows
      for (const row of data.rows) {
        const values = row.map(c => c.text);
        const r = ws.addRow(values);
        r.height = 20; // solide Höhe für 10pt Fonts
        r.eachCell((cell: any, colNumber: number) => {
          // Wunsch: Datenzellen in Größe 10
          cell.font = { size: 10, bold: row[colNumber - 1]?.bold || false, color: row[colNumber - 1]?.color ? { argb: toARGB(row[colNumber - 1].color!) } : undefined };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center', wrapText: true } as any;
          const bg = row[colNumber - 1]?.bg;
          if (bg) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(bg) } };
            if (!row[colNumber - 1]?.color) {
              cell.font = { ...(cell.font || {}), color: { argb: 'FFFFFFFF' } };
            }
          }
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as any;
        });
      }

      const buffer = await wb.xlsx.writeBuffer();

      // Normalize to single .xlsx extension
      const filename = defaultFilename.toLowerCase().endsWith('.xlsx') ? defaultFilename : `${defaultFilename.replace(/\.(xlsx|xls)$/i, '')}.xlsx`;
      const api: any = (window as any).electronAPI;
      if (api) {
        const base64 = arrayBufferToBase64(buffer as ArrayBuffer);
        // 1) If export folder configured, write directly there
        if (api.writeExportFile && api.getExportFolder) {
          const folder = await api.getExportFolder();
          if (folder && typeof folder === 'string') {
            const res = await api.writeExportFile(filename, base64, { base64: true });
            return { ok: !!res?.success, path: res?.path, filename };
          }
        }
        // 2) Otherwise prompt user with Save As
        if (api.saveFile && api.writeFile) {
          const result = await api.saveFile({
            title: 'Wochenexport (Excel) speichern',
            defaultPath: filename,
            filters: [ { name: 'Excel-Arbeitsmappe (*.xlsx)', extensions: ['xlsx'] } ]
          });
          if (!result || result.canceled || !result.filePath) return { ok: false, filename };
          const writeRes = await api.writeFile(result.filePath, base64, { base64: true });
          return { ok: !!writeRes?.success, path: result.filePath, filename };
        }
      }

      // Browser fallback download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      return { ok: true, filename };
    } catch (e) {
      // Fallback to HTML .xls if ExcelJS not available
    }
    // 2) HTML .xls fallback (older Excel-compatible). Hinweis: Dies ist KEINE native .xlsx-Datei.
    const html = buildExcelHtml(data);
    const blobHeader = '\uFEFF';
    const content = blobHeader + html;
    const api: any = (window as any).electronAPI;
    const fallbackName = defaultFilename.replace(/\.(xlsx|xls)$/i, '') + '.xls';
    if (api) {
      // If export folder set, write directly
      if (api.writeExportFile && api.getExportFolder) {
        const folder = await api.getExportFolder();
        if (folder && typeof folder === 'string') {
          const res = await api.writeExportFile(fallbackName, content, { encoding: 'utf8' });
          return { ok: !!res?.success, path: res?.path, filename: fallbackName };
        }
      }
      if (api.saveFile && api.writeFile) {
        const result = await api.saveFile({
          title: 'Wochenexport (Excel-kompatibles .xls) speichern',
          defaultPath: fallbackName,
          filters: [ { name: 'Excel 97-2003 (*.xls)', extensions: ['xls'] } ]
        });

        if (!result || result.canceled || !result.filePath) return { ok: false, filename: fallbackName };

        const writeRes = await api.writeFile(result.filePath, content, { encoding: 'utf8' });
        if (!writeRes?.success) {
          console.error('Failed to write Excel file:', writeRes?.message);
          return { ok: false, filename: fallbackName };
        }
        return { ok: true, path: result.filePath, filename: fallbackName };
      }
    }

    // Browser fallback for HTML
    try {
      const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { ok: true, filename: fallbackName };
    } catch (err) {
      console.error('Browser fallback excel download failed', err);
      return { ok: false, filename: fallbackName };
    }
}

// New: Dashboard export to native .xlsx with multiple sheets and colors
export async function saveDashboardExcel(data: DashboardExportData, defaultFilename: string): Promise<SaveResult> {
  try {
    let mod: any;
    try { mod = await import('exceljs/dist/exceljs.min.js'); } catch (_) { mod = await import('exceljs'); }
    const ExcelJS: any = (mod && mod.default) ? mod.default : mod;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ZeitWerk';
    wb.created = new Date();

    // Übersicht sheet
    const wsInfo = wb.addWorksheet('Übersicht');
    wsInfo.columns = [ { width: 28 }, { width: 60 } ];
    const title = wsInfo.addRow(['Dienstplan Export', '']);
    title.font = { bold: true, size: 16 };
    wsInfo.mergeCells(1, 1, 1, 2);

    wsInfo.addRow(['Organisation:', data.metadata.organization]);
    wsInfo.addRow(['Zeitraum:', data.metadata.timeRange]);
    wsInfo.addRow(['Exportiert am:', data.metadata.exportDate]);
    if (data.metadata.totalRecords) {
      wsInfo.addRow(['']);
      wsInfo.addRow(['Datensummen', '']).font = { bold: true } as any;
      wsInfo.mergeCells(wsInfo.lastRow.number, 1, wsInfo.lastRow.number, 2);
      wsInfo.addRow(['Schichten', String(data.metadata.totalRecords.shifts)]);
      wsInfo.addRow(['Mitarbeiter', String(data.metadata.totalRecords.employees)]);
      wsInfo.addRow(['Schichttypen', String(data.metadata.totalRecords.shiftTypes)]);
      wsInfo.addRow(['Organisationen', String(data.metadata.totalRecords.organizations)]);
    }

    if (data.statistics) {
      wsInfo.addRow(['']);
      wsInfo.addRow(['Statistiken', '']).font = { bold: true } as any;
      wsInfo.mergeCells(wsInfo.lastRow.number, 1, wsInfo.lastRow.number, 2);
      wsInfo.addRow(['Gesamte Schichten', String(data.statistics.totalShifts)]);
      // Entfernt: Besetzte Schichten, Besetzungsrate (Logik abweichend)
      wsInfo.addRow(['Offene Schichten', String(data.statistics.unassignedShifts)]);
      wsInfo.addRow(['Mitarbeiter', String(data.statistics.employees)]);
      wsInfo.addRow(['Organisationen', String(data.statistics.organizations)]);
      wsInfo.addRow(['Schichttypen', String(data.statistics.shiftTypes)]);
    }

    // Helper: sort employees like WeekView (custom per organization if configured)
    const getSortedEmployeeNames = (items: any[]) => {
      const names = Array.from(new Set(items.map(i => i.employeeName))).filter(Boolean) as string[];
      try {
        const ls = localStorage.getItem('app-settings');
        const cfg = ls ? JSON.parse(ls) : {};
        const mode = cfg?.ui?.employeeOrderMode || 'alphabetical';
        const orgName = data.metadata.organization;
        // Map orgName to orgId if possible; if not, fall back to alphabetical
        // Since we only have names here, try to resolve via data.organizations
        const org = (data.organizations || []).find(o => o.name === orgName);
        const orgId = org?.id?.toString?.();
        const order = (orgId && cfg?.ui?.employeeOrderByOrg?.[orgId]) || [];
        if (mode !== 'custom' || !orgId || !Array.isArray(order) || order.length === 0) {
          return names.sort((a, b) => a.localeCompare(b, 'de'));
        }
        // We need to translate from employee ids order -> employeeName order. Build a nameById from data.employees
        const nameById = new Map<string, string>();
        (data.employees || []).forEach(e => {
          const id = (e as any).id?.toString?.();
          const nm = `${e.firstName} ${e.lastName}`.trim();
          if (id && nm) nameById.set(id, nm);
        });
        const indexed = new Map(names.map((n, idx) => [n, idx] as const));
        const customSorted: string[] = [];
        order.forEach((id: string) => {
          const nm = nameById.get(id);
          if (nm && indexed.has(nm)) customSorted.push(nm);
        });
        // Append remaining names alphabetically
        const remaining = names.filter(n => !customSorted.includes(n)).sort((a,b)=>a.localeCompare(b,'de'));
        return [...customSorted, ...remaining];
      } catch {
        return names.sort((a, b) => a.localeCompare(b, 'de'));
      }
    };

    // Schichttypen sheet
    if (data.shiftTypes && data.shiftTypes.length) {
      const ws = wb.addWorksheet('Schichttypen');
      ws.columns = [
        { header: 'Name', width: 24 },
        { header: 'Beschreibung', width: 40 },
        { header: 'Zeiten', width: 18 },
        { header: 'Flexibel', width: 12 },
        { header: 'Farbe', width: 14 }
      ];
      ws.getRow(1).font = { bold: true };
      for (const st of data.shiftTypes) {
        const row = ws.addRow([
          st.name,
          st.description || '',
          st.displayTime,
          st.isFlexible,
          st.colorHex
        ]);
        // colorize Name cell background
        const bg = st.colorHex || st.color || '#1976d2';
        const nameCell: any = row.getCell(1);
        nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(bg) } };
        nameCell.font = { ...(nameCell.font || {}), color: getContrastFontARGB(bg) };
      }
      ws.columns.forEach((col: any) => { col.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }; });
    }

  // Schichten sheet
  // Schichten: Wochenweise gestapelt analog zum Wochenexport, mit Pausenregel und Soll (Std)
    if (data.shifts && data.shifts.length && data.metadata) {
  const ws = wb.addWorksheet('Schichten (Wochen)');
  // Helper: German weekday abbreviations
  const deWeekday = (d: Date) => format(d, 'EEE dd.MM', { locale: deLocale });

      // Group shifts by ISO week (Mon-Sun)
      const byDate = data.shifts.map(s => ({
        ...s,
        // Dashboard lieferte s.date als 'dd.MM.yyyy' → korrekt parsen
        dateObj: parse(s.date, 'dd.MM.yyyy', new Date())
      })).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

      const toMonday = (d: Date) => { const x = new Date(d); const wd = x.getDay() || 7; x.setDate(x.getDate() - (wd - 1)); x.setHours(0,0,0,0); return x; };
      const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      const weekMap = new Map<string, { start: Date; items: typeof byDate }>();
      for (const s of byDate) {
        const start = toMonday(s.dateObj);
        const k = key(start);
        const entry = weekMap.get(k) || { start, items: [] as any };
        entry.items.push(s);
        weekMap.set(k, entry);
      }
  const sortedWeeks = Array.from(weekMap.values()).sort((a,b)=>a.start.getTime()-b.start.getTime());

      let rowCursor = 1;
      const addWeekBlock = (weekStart: Date, items: typeof byDate) => {
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
        // Title
  ws.addRow(['Mitarbeiter', ...days.map(d => {
    const vac = isVacationOn(d, (data as any).vacationPeriods, data.metadata?.organizationId);
    const lbl = deWeekday(d);
    return vac.isVacation ? `${lbl} (Schließzeit${vac.affects ? '' : '·Info'})` : lbl;
  }), 'Woche (Std)', 'Soll (Std)']);
        const header = ws.getRow(rowCursor);
        header.font = { bold: true } as any;
        header.alignment = { vertical: 'middle', horizontal: 'center' } as any;
  header.eachCell((c: any) => { (c as any).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }; });

    // Build employee set sorted like WeekView
    const employees = getSortedEmployeeNames(items);

        for (const emp of employees) {
          const rowVals: any[] = [emp];
          const dayColors: (string|undefined)[] = [];
          let weeklyMinutes = 0;
          for (const d of days) {
            const dayShifts = items.filter(i => i.employeeName === emp && isSameDay(i.dateObj, d));
            if (!dayShifts.length) { rowVals.push(''); dayColors.push(undefined); continue; }
            const label = dayShifts.map(s => {
              const end = (s.endTime === '00:00' && s.startTime) ? '24:00' : (s.endTime || '');
              return s.startTime && end ? `${s.shiftTypeName} (${s.startTime}-${end})` : s.shiftTypeName;
            }).join(' \n ');
            // compute counting minutes - analog zu Wochenexport
            let hasRegularShift = false;
            let hasAllDayAbsence = false;
            let hasAllDayCountingNonAbsence = false;
            const countingMinutes = dayShifts.reduce((acc: number, s: any) => {
              const isAbsence = s.shiftTypeCategory === 'absence';
              const nonCounting = s.shiftTypeCountsTowardHours === false;
              const dur = durationWithMidnight(s.startTime, s.endTime);
              const isAllDay = s.shiftTypeIsAllDay === true || (!s.startTime && !s.endTime) || dur >= 23 * 60;
              // Prüfe auf ganztägige Abwesenheit
              if (isAbsence) {
                if (!s.startTime && !s.endTime) hasAllDayAbsence = true;
                if (dur >= 23 * 60) hasAllDayAbsence = true;
                return acc; // Abwesenheiten zählen nicht zu countingMinutes
              }
              // Ganztägige, nicht-Abwesenheits-Schicht, die zur Arbeitszeit zählt
              if (isAllDay && !nonCounting) {
                hasAllDayCountingNonAbsence = true;
                return acc;
              }
              if (nonCounting) return acc;
              if (dur > 0) hasRegularShift = true;
              return acc + dur;
            }, 0);
            let netDay = applyBreaks(countingMinutes);
            // Falls ganztägige, zählende Abdeckung (Abwesenheit oder All-Day-Typ) und keine reguläre Schicht: geplante Tagesstunden addieren
            if ((hasAllDayAbsence || hasAllDayCountingNonAbsence) && !hasRegularShift) {
              const empObj = data.employees?.find(e => `${e.firstName} ${e.lastName}`.trim() === emp.trim());
              const keyMap = ['sun','mon','tue','wed','thu','fri','sat'] as const;
              const k = keyMap[d.getDay()];
              const plan: any = empObj?.dailyHoursPlan || {};
              const v = plan?.[k];
              const h = typeof v === 'number' ? v : (v ? parseFloat(String(v).replace(',', '.')) : 0);
              const planMin = !isNaN(h) && isFinite(h) && h > 0 ? Math.round(h * 60) : 0;
              netDay += planMin;
            }
            const breakDay = Math.max(0, countingMinutes - applyBreaks(countingMinutes));
            const toHM = (mins: number) => { const h = Math.floor(mins/60); const m = mins%60; return `${h}:${String(m).padStart(2,'0')}`; };
            const annotation = countingMinutes > 0 ? `\n(Netto ${toHM(applyBreaks(countingMinutes))}; Pause ${breakDay}m)` : '';
            rowVals.push(label + annotation);
            const color = dayShifts[0].shiftTypeColor || undefined;
            dayColors.push(color);
            // sum weekly minutes with breaks
            weeklyMinutes += netDay;
          }
          const toHM = (mins: number) => { const h = Math.floor(mins/60); const m = mins%60; return `${h}:${String(m).padStart(2,'0')}`; };
          rowVals.push(toHM(weeklyMinutes));
          // Soll (Std) aus Mitarbeiter-Stammdaten, falls verfügbar
          const empObj = data.employees?.find(e => `${e.firstName} ${e.lastName}`.trim() === emp.trim());
          const targetMinutes = empObj?.weeklyHours != null ? Math.round((empObj.weeklyHours as number) * 60) : null;
          rowVals.push(targetMinutes != null ? toHM(targetMinutes) : '');
          const row = ws.addRow(rowVals);
          row.alignment = { vertical: 'top', wrapText: true } as any;
          // Colorize day cells
          dayColors.forEach((bg, idx) => {
            if (!bg) return;
            const cell: any = row.getCell(2 + idx);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(bg) } };
            const fontColor = getContrastFontARGB(bg);
            cell.font = { ...(cell.font || {}), color: fontColor };
          });
        }

        // Spacer after each week block
        ws.addRow(['']);
        rowCursor = ws.lastRow!.number + 1;
      };

      for (const w of sortedWeeks) addWeekBlock(w.start, w.items);

      // Column widths
      ws.columns = [{ width: 24 }, ...Array.from({length:7},()=>({width:24})), { width: 12 }, { width: 12 }];
    }

    // Alternative Darstellung: Eigener Reiter pro Woche (KW) im Wochenexport-Muster
    if (data.shifts && data.shifts.length && data.metadata) {
      const allShifts = data.shifts.map(s => ({
        ...s,
        dateObj: parse(s.date, 'dd.MM.yyyy', new Date())
      }));
      // Gruppieren wie oben nach Montags-Start
      const toMonday = (d: Date) => { const x = new Date(d); const wd = x.getDay() || 7; x.setDate(x.getDate() - (wd - 1)); x.setHours(0,0,0,0); return x; };
      const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  const weekMap2 = new Map<string, { start: Date; items: typeof allShifts }>();
      for (const s of allShifts) {
        const start = toMonday(s.dateObj);
        const k = key(start);
        const entry = weekMap2.get(k) || { start, items: [] as any };
        entry.items.push(s);
        weekMap2.set(k, entry);
      }
      const weeksSorted = Array.from(weekMap2.values()).sort((a,b)=>a.start.getTime()-b.start.getTime());

      for (const w of weeksSorted) {
  const weekStart = w.start;
        const sheetName = `KW ${format(weekStart, 'I')}`; // ISO-KW
        const ws = wb.addWorksheet(sheetName);

        const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        // Kopfzeile
        const header = ['Mitarbeiter', ...days.map(d => {
          const vac = isVacationOn(d, (data as any).vacationPeriods, data.metadata?.organizationId);
          const lbl = format(d, 'EEE dd.MM', { locale: deLocale });
          return vac.isVacation ? `${lbl} (Schließzeit${vac.affects ? '' : '·Info'})` : lbl;
        }), 'Woche (Std)', 'Soll (Std)'];
        ws.addRow(header).font = { bold: true } as any;
        ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' } as any;
        ws.getRow(1).eachCell((c: any) => { (c as any).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }; });

        // Mitarbeiterliste aus Schichten ableiten
  const employees = getSortedEmployeeNames(w.items);
        for (const emp of employees) {
          const rowVals: any[] = [emp];
          const dayColors: (string|undefined)[] = [];
          let weeklyMinutes = 0;
          for (const d of days) {
            const dayShifts = w.items.filter(i => i.employeeName === emp && isSameDay(i.dateObj, d));
            if (!dayShifts.length) { rowVals.push(''); dayColors.push(undefined); continue; }
            const label = dayShifts.map(s => {
              const end = (s.endTime === '00:00' && s.startTime) ? '24:00' : (s.endTime || '');
              return s.startTime && end ? `${s.shiftTypeName} (${s.startTime}-${end})` : s.shiftTypeName;
            }).join(' \n ');
            // compute minutes - analog zu Wochenexport
            let hasRegularShift = false;
            let hasAllDayAbsence = false;
            let hasAllDayCountingNonAbsence = false;
            const countingMinutes = dayShifts.reduce((acc: number, s: any) => {
              const isAbsence = s.shiftTypeCategory === 'absence';
              const nonCounting = s.shiftTypeCountsTowardHours === false;
              const dur = durationWithMidnight(s.startTime, s.endTime);
              const isAllDay = s.shiftTypeIsAllDay === true || (!s.startTime && !s.endTime) || dur >= 23 * 60;
              // Prüfe auf ganztägige Abwesenheit
              if (isAbsence) {
                if (!s.startTime && !s.endTime) hasAllDayAbsence = true;
                if (dur >= 23 * 60) hasAllDayAbsence = true;
                return acc;
              }
              if (isAllDay && !nonCounting) { hasAllDayCountingNonAbsence = true; return acc; }
              if (nonCounting) return acc;
              if (dur > 0) hasRegularShift = true;
              return acc + dur;
            }, 0);
            let netDay = applyBreaks(countingMinutes);
            // Falls ganztägige, zählende Abdeckung (Abwesenheit oder All-Day-Typ) und keine reguläre Schicht: geplante Tagesstunden addieren
            if ((hasAllDayAbsence || hasAllDayCountingNonAbsence) && !hasRegularShift) {
              const empObj = data.employees?.find(e => `${e.firstName} ${e.lastName}`.trim() === emp.trim());
              const keyMap = ['sun','mon','tue','wed','thu','fri','sat'] as const;
              const k = keyMap[d.getDay()];
              const plan: any = empObj?.dailyHoursPlan || {};
              const v = plan?.[k];
              const h = typeof v === 'number' ? v : (v ? parseFloat(String(v).replace(',', '.')) : 0);
              const planMin = !isNaN(h) && isFinite(h) && h > 0 ? Math.round(h * 60) : 0;
              netDay += planMin;
            }
            const breakDay = Math.max(0, countingMinutes - applyBreaks(countingMinutes));
            const toHM2 = (mins: number) => { const h = Math.floor(mins/60); const m = mins%60; return `${h}:${String(m).padStart(2,'0')}`; };
            const annotation = countingMinutes > 0 ? `\n(Netto ${toHM2(applyBreaks(countingMinutes))}; Pause ${breakDay}m)` : '';
            rowVals.push(label + annotation);
            const color = dayShifts[0].shiftTypeColor || undefined;
            dayColors.push(color);
            weeklyMinutes += netDay;
          }
          const toHM = (mins: number) => { const h = Math.floor(mins/60); const m = mins%60; return `${h}:${String(m).padStart(2,'0')}`; };
          rowVals.push(toHM(weeklyMinutes));
          // Soll aus Mitarbeiterdaten
          const empObj = data.employees?.find(e => `${e.firstName} ${e.lastName}`.trim() === emp.trim());
          const targetMinutes = empObj?.weeklyHours != null ? Math.round((empObj.weeklyHours as number) * 60) : null;
          rowVals.push(targetMinutes != null ? toHM(targetMinutes) : '');
          const row = ws.addRow(rowVals);
          row.alignment = { vertical: 'top', wrapText: true } as any;
          dayColors.forEach((bg, idx) => {
            if (!bg) return;
            const cell: any = row.getCell(2 + idx);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(bg) } };
            const fontColor = getContrastFontARGB(bg);
            cell.font = { ...(cell.font || {}), color: fontColor };
          });
        }

        ws.columns = [{ width: 24 }, ...Array.from({length:7},()=>({width:24})), { width: 12 }, { width: 12 }];
        // Meta in erster Zeile als Kommentar bzw. Sheet-Properties sind optional. Hier genügt der Sheet-Name.
      }
    }

    if (data.shifts && data.shifts.length) {
      const ws = wb.addWorksheet('Schichten');
      ws.columns = [
        { header: 'Datum', width: 14 },
        { header: 'Wochentag', width: 14 },
        { header: 'Start', width: 10 },
        { header: 'Ende', width: 10 },
        { header: 'Dauer', width: 10 },
        { header: 'Soll (Std)', width: 12 },
        { header: 'Schichttyp', width: 24 },
        { header: 'Mitarbeiter', width: 24 },
        { header: 'Position', width: 18 },
        { header: 'Organisation', width: 22 },
        { header: 'Notizen', width: 40 }
      ];
      ws.getRow(1).font = { bold: true };
      for (const s of data.shifts) {
        // per-shift Soll (Std) isn't well-defined; we keep weekly Soll separate. Keep blank here.
        const row = ws.addRow([
          s.date,
          s.weekday,
          s.startTime || '',
          s.endTime || '',
          s.duration || '',
          '',
          s.shiftTypeName,
          s.employeeName,
          s.employeePosition || '',
          s.organizationName,
          s.notes || ''
        ]);
        // Colorize Schichttyp cell with shiftTypeColor
        const color = s.shiftTypeColor || '#1976d2';
        const cell: any = row.getCell(6);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toARGB(color) } };
        cell.font = { ...(cell.font || {}), color: getContrastFontARGB(color), bold: true };
      }
      ws.columns.forEach((col: any, idx: number) => {
        // left align for Datum(1), Schichttyp(6), Mitarbeiter(7), Organisation(9), Notizen(10)
        const leftCols = [1, 6, 7, 9, 10];
        const align = leftCols.includes(idx + 1) ? 'left' : 'center';
        col.alignment = { vertical: 'middle', horizontal: align as any, wrapText: true };
      });
    }

    // Mitarbeiter sheet
    if (data.employees && data.employees.length) {
      const ws = wb.addWorksheet('Mitarbeiter');
      ws.columns = [
        { header: 'ID', width: 8 },
        { header: 'Vorname', width: 16 },
        { header: 'Nachname', width: 16 },
        { header: 'E-Mail', width: 26 },
        { header: 'Telefon', width: 16 },
        { header: 'Position', width: 18 },
        { header: 'Organisation', width: 22 },
        { header: 'Stundenlohn', width: 12 },
        { header: 'Aktiv', width: 8 }
      ];
      ws.getRow(1).font = { bold: true };
      for (const e of data.employees) {
        ws.addRow([
          e.id,
          e.firstName,
          e.lastName,
          e.email || '',
          e.phone || '',
          e.position || '',
          e.organizationName,
          e.hourlyRate ?? '',
          e.isActive
        ]);
      }
    }

    // Schließzeiten sheet (optional)
    if ((data as any).vacationPeriods && (data as any).vacationPeriods.length) {
      const ws = wb.addWorksheet('Schließzeiten');
      ws.columns = [
        { header: 'Name', width: 24 },
        { header: 'Start', width: 14 },
        { header: 'Ende', width: 14 },
        { header: 'Beeinflusst Planung', width: 18 },
        { header: 'Organisation-ID', width: 16 }
      ];
      ws.getRow(1).font = { bold: true };
      for (const p of (data as any).vacationPeriods) {
        ws.addRow([
          p.name || '',
          p.startDate,
          p.endDate,
          (p.affectsScheduling !== false) ? 'Ja' : 'Nein',
          p.organizationId ?? ''
        ]);
      }
    }

    // Organisationen sheet
    if (data.organizations && data.organizations.length) {
      const ws = wb.addWorksheet('Organisationen');
      ws.columns = [
        { header: 'ID', width: 8 },
        { header: 'Name', width: 24 },
        { header: 'Beschreibung', width: 40 },
        { header: 'Adresse', width: 32 },
        { header: 'Ansprechpartner', width: 22 },
        { header: 'Telefon', width: 18 },
        { header: 'E-Mail', width: 26 }
      ];
      ws.getRow(1).font = { bold: true };
      for (const o of data.organizations) {
        ws.addRow([o.id, o.name, o.description || '', o.address || '', o.contactPerson || '', o.phone || '', o.email || '']);
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const filename = defaultFilename.toLowerCase().endsWith('.xlsx') ? defaultFilename : `${defaultFilename.replace(/\.(xlsx|xls)$/i, '')}.xlsx`;
    const api: any = (window as any).electronAPI;
    if (api) {
      const base64 = arrayBufferToBase64(buffer as ArrayBuffer);
      // Try fixed export folder first
      if (api.writeExportFile && api.getExportFolder) {
        const folder = await api.getExportFolder();
        if (folder && typeof folder === 'string') {
          const res = await api.writeExportFile(filename, base64, { base64: true });
          return { ok: !!res?.success, path: res?.path, filename };
        }
      }
      // Fallback: Save As dialog
      if (api.saveFile && api.writeFile) {
        const result = await api.saveFile({
          title: 'Excel-Export speichern',
          defaultPath: filename,
          filters: [ { name: 'Excel-Arbeitsmappe (*.xlsx)', extensions: ['xlsx'] } ]
        });
        if (!result || result.canceled || !result.filePath) return { ok: false, filename };
        const writeRes = await api.writeFile(result.filePath, base64, { base64: true });
        return { ok: !!writeRes?.success, path: result.filePath, filename };
      }
    }
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    return { ok: true, filename };
  } catch (e) {
    console.error('saveDashboardExcel failed, falling back to CSV-like .xls', e);
    return { ok: false, filename: defaultFilename };
  }
}

export function buildWeekExcelFromShifts(params: {
  employees: any[];
  days: Date[];
  getShifts: (employeeId: number, day: Date) => any[];
  organizationName?: string;
  vacationPeriods?: Array<{ startDate: string; endDate: string; affectsScheduling?: boolean; organizationId?: any }>;
  organizationId?: any;
}): SimpleWeekExportData {
  const { employees, days, getShifts, organizationName, vacationPeriods, organizationId } = params;
  const headers = ['Mitarbeiter', ...days.map(d => {
    const vac = isVacationOn(d, vacationPeriods, organizationId);
    const lbl = `${format(d, 'EEE dd.MM', { locale: deLocale })}`;
    return vac.isVacation ? `${lbl} (Schließzeit${vac.affects ? '' : '·Info'})` : lbl;
  }), 'Woche (Std)', 'Soll (Std)', 'Δ (Std)'];

  const rows: WeekExportRow[] = employees.map(emp => {
    const employeeName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Mitarbeiter';
    const row: WeekExportRow = [{ text: employeeName, bold: true }];
    // Compute per-day and weekly minutes
    let weeklyMinutes = 0;
    days.forEach(day => {
  const shifts = getShifts(emp.id, day) || [];
      if (!shifts.length) { row.push({ text: '' }); return; }
      const label = shifts.map((s: any) => {
        const name = s.shiftTypeName || s.shift_type_name || 'Schicht';
        const start = s.startTime || s.start_time || '';
        const endRaw = s.endTime || s.end_time || '';
        const end = endDisplayWithMidnight(start, endRaw);
        return start && end ? `${name} (${start}-${end})` : name;
      }).join(' \n ');
      const color = shifts[0].shiftTypeColor || '#9e9e9e';
      // Annotate per-day with net/break when there are counting shifts
      const countingMinutes = shifts.reduce((acc: number, s: any) => {
        const isAbsence = (s.shiftTypeCategory || s.category) === 'absence';
        const nonCounting = s.shiftTypeCountsTowardHours === false;
        if (isAbsence || nonCounting) return acc;
        const dur = durationWithMidnight(s.startTime || s.start_time, s.endTime || s.end_time);
        return acc + dur;
      }, 0);
      const netDay = applyBreaks(countingMinutes);
      const breakDay = Math.max(0, countingMinutes - netDay);
      const toHM = (mins: number) => { const h = Math.floor(mins/60); const m = mins%60; return `${h}:${String(m).padStart(2,'0')}`; };
      const annotation = countingMinutes > 0 ? `\n(Netto ${toHM(netDay)}; Pause ${breakDay}m)` : '';
      row.push({ text: label + annotation, bg: color, color: '#ffffff' });
  // Optional: could mark Schließzeit days in the label. For classic week export, we keep styling minimal here.
      // working minutes for that day
      let regularMinutes = 0;
      let hasRegularShift = false;
      let hasAllDayAbsence = false;
      shifts.forEach((s: any) => {
        const isAbsence = (s.shiftTypeCategory || s.category) === 'absence';
        const nonCounting = s.shiftTypeCountsTowardHours === false;
        const dur = durationWithMidnight(s.startTime || s.start_time, s.endTime || s.end_time);
        if (isAbsence) {
          // Heuristik: all-day wenn >= 23h oder Zeiten fehlen
          if (!s.startTime && !s.endTime) hasAllDayAbsence = true;
          if (dur >= 23 * 60) hasAllDayAbsence = true;
          return;
        }
        if (nonCounting) return;
        if (dur > 0) { regularMinutes += dur; hasRegularShift = true; }
      });
      // Netto aus regulären Schichten (mit Pausen)
      let dayNet = applyBreaks(regularMinutes);
      // Falls ganztägige Abwesenheit und keine reguläre Schicht: geplante Tagesstunden addieren (netto)
      if (hasAllDayAbsence && !hasRegularShift) {
        const keyMap = ['sun','mon','tue','wed','thu','fri','sat'] as const;
        const k = keyMap[day.getDay()];
        const plan = (emp as any)?.dailyHoursPlan || {};
        const h = typeof plan[k] === 'number' ? plan[k] : (plan[k] ? parseFloat(String(plan[k])) : 0);
        const planMin = !isNaN(h) && isFinite(h) && h > 0 ? Math.round(h * 60) : 0;
        dayNet += planMin;
      }
      weeklyMinutes += dayNet;
    });
    const toHM = (mins: number) => {
      const sign = mins < 0 ? '-' : ''; const n = Math.abs(mins); const h = Math.floor(n/60); const m = n % 60; return `${sign}${h}:${String(m).padStart(2,'0')}`;
    };
    const weeklyHM = toHM(weeklyMinutes);
    const targetMinutes = (typeof emp.weeklyHours === 'number' && !isNaN(emp.weeklyHours)) ? Math.round(emp.weeklyHours * 60) : null;
    const targetHM = targetMinutes != null ? toHM(targetMinutes) : '';
    const diffHM = targetMinutes != null ? toHM(weeklyMinutes - targetMinutes) : '';
    row.push({ text: weeklyHM });
    row.push({ text: targetHM });
    row.push({ text: diffHM });
    return row;
  });

  return {
    title: 'Dienstplan Wochenexport',
    organization: organizationName,
    weekRange: { start: days[0], end: days[days.length - 1] },
    headers,
    rows
  };
}
