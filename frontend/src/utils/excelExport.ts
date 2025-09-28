import { format } from 'date-fns';

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

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function saveWeekExcel(data: SimpleWeekExportData, defaultFilename: string): Promise<boolean> {
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
      if (api?.saveFile && api?.writeFile) {
        const result = await api.saveFile({
          title: 'Wochenexport (Excel) speichern',
          defaultPath: filename,
          filters: [ { name: 'Excel-Arbeitsmappe (*.xlsx)', extensions: ['xlsx'] } ]
        });
        if (!result || result.canceled || !result.filePath) return false;
        const base64 = arrayBufferToBase64(buffer as ArrayBuffer);
        const writeRes = await api.writeFile(result.filePath, base64, { base64: true });
        return !!writeRes?.success;
      }

      // Browser fallback download
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      // Fallback to HTML .xls if ExcelJS not available
    }
    // 2) HTML .xls fallback (older Excel-compatible)
    const html = buildExcelHtml(data);
    const blobHeader = '\uFEFF';
    const content = blobHeader + html;
    const api: any = (window as any).electronAPI;
    const fallbackName = defaultFilename.replace(/\.(xlsx|xls)$/i, '') + '.xls';
    if (api?.saveFile && api?.writeFile) {
      const result = await api.saveFile({
        title: 'Wochenexport (Excel) speichern',
        defaultPath: fallbackName,
        filters: [ { name: 'Excel 97-2003 (*.xls)', extensions: ['xls'] } ]
      });

      if (!result || result.canceled || !result.filePath) return false;

      const writeRes = await api.writeFile(result.filePath, content, { encoding: 'utf8' });
      if (!writeRes?.success) {
        console.error('Failed to write Excel file:', writeRes?.message);
        return false;
      }
      return true;
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
      return true;
    } catch (err) {
      console.error('Browser fallback excel download failed', err);
      return false;
    }
}

export function buildWeekExcelFromShifts(params: {
  employees: any[];
  days: Date[];
  getShifts: (employeeId: number, day: Date) => any[];
  organizationName?: string;
}): SimpleWeekExportData {
  const { employees, days, getShifts, organizationName } = params;
  const headers = ['Mitarbeiter', ...days.map(d => `${format(d, 'EEE dd.MM', {})}`), 'Woche (Std)', 'Soll (Std)', 'Δ (Std)'];

  const rows: WeekExportRow[] = employees.map(emp => {
    const employeeName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Mitarbeiter';
    const row: WeekExportRow = [{ text: employeeName, bold: true }];
    // Compute per-day and weekly minutes (regular only), with breaks
    let weeklyMinutes = 0;
    days.forEach(day => {
      const shifts = getShifts(emp.id, day) || [];
      if (!shifts.length) { row.push({ text: '' }); return; }
      const label = shifts.map((s: any) => {
        const name = s.shiftTypeName || s.shift_type_name || 'Schicht';
        const start = s.startTime || s.start_time || '';
        const end = s.endTime || s.end_time || '';
        return start && end ? `${name} (${start}-${end})` : name;
      }).join(' \n ');
      const color = shifts[0].shiftTypeColor || '#9e9e9e';
      // Annotate per-day with net/break when there are counting shifts
      const countingMinutes = shifts.reduce((acc: number, s: any) => {
        const isAbsence = (s.shiftTypeCategory || s.category) === 'absence';
        const nonCounting = s.shiftTypeCountsTowardHours === false;
        if (isAbsence || nonCounting) return acc;
        const t = (val?: string) => {
          if (!val) return 0; const m = val.match(/^(\d{1,2}):(\d{2})$/); if (!m) return 0; return (parseInt(m[1],10)||0)*60 + (parseInt(m[2],10)||0);
        };
        const start = t(s.startTime || s.start_time);
        const end = t(s.endTime || s.end_time);
        return acc + Math.max(0, end - start);
      }, 0);
  const netDay = applyBreaks(countingMinutes);
      const breakDay = Math.max(0, countingMinutes - netDay);
      const toHM = (mins: number) => { const h = Math.floor(mins/60); const m = mins%60; return `${h}:${String(m).padStart(2,'0')}`; };
      const annotation = countingMinutes > 0 ? `\n(Netto ${toHM(netDay)}; Pause ${breakDay}m)` : '';
      row.push({ text: label + annotation, bg: color, color: '#ffffff' });
      // working minutes for that day (regular only)
      const dayMinutes = shifts.reduce((acc: number, s: any) => {
        const isAbsence = (s.shiftTypeCategory || s.category) === 'absence';
        const nonCounting = s.shiftTypeCountsTowardHours === false;
        if (isAbsence || nonCounting) return acc;
        const t = (val?: string) => {
          if (!val) return 0; const m = val.match(/^(\d{1,2}):(\d{2})$/); if (!m) return 0; return (parseInt(m[1],10)||0)*60 + (parseInt(m[2],10)||0);
        };
        const start = t(s.startTime || s.start_time);
        const end = t(s.endTime || s.end_time);
        return acc + Math.max(0, end - start);
      }, 0);
  weeklyMinutes += applyBreaks(dayMinutes);
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
