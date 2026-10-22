/**
 * Cron Syntax Parser, Validator & Humanizer for Discovery Scan Jobs
 * Standard 5-field format: minute hour day-of-month month day-of-week
 */

export interface CronValidationResult {
  isValid: boolean;
  error?: string;
  errorField?: number; // 0=min, 1=hr, 2=dom, 3=mon, 4=dow
  fields?: [string, string, string, string, string];
  humanDescription: string;
  nextRunEstimate: string;
}

export interface CronPreset {
  id: string;
  label: string;
  expression: string;
  description: string;
  badge?: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { id: 'sun2am', label: 'Sunday 02:00 AM', expression: '0 2 * * 0', description: 'Weekly off-peak deep sweep', badge: 'Recommended' },
  { id: 'd2am', label: 'Daily 02:00 AM', expression: '0 2 * * *', description: 'Every night maintenance sweep' },
  { id: 'weekdays', label: 'Weekdays 02:00', expression: '0 2 * * 1-5', description: 'Mon through Fri at 02:00 AM' },
  { id: 'h6', label: 'Every 6 hours', expression: '0 */6 * * *', description: 'Runs at 00:00, 06:00, 12:00, 18:00' },
  { id: 'h1', label: 'Hourly on hour', expression: '0 * * * *', description: 'Top of every hour (00 min)' },
  { id: 'm15', label: 'Every 15 min', expression: '*/15 * * * *', description: 'Rapid polling for volatile subnets' },
  { id: 'month1st', label: '1st of Month', expression: '0 2 1 * *', description: 'Monthly audit at 02:00 AM' },
  { id: 'midnight', label: 'Daily Midnight', expression: '0 0 * * *', description: 'Every night at 00:00' }
];

export const CRON_FIELD_GUIDES = [
  { index: 0, label: 'Minute', range: '0–59', example: '0, 15, */15' },
  { index: 1, label: 'Hour', range: '0–23', example: '2, 0, */6' },
  { index: 2, label: 'Day of Month', range: '1–31', example: '*, 1, 15, L' },
  { index: 3, label: 'Month', range: '1–12', example: '*, 1-12, JAN-DEC' },
  { index: 4, label: 'Day of Week', range: '0–7 (0=Sun)', example: '0, 1-5, SUN-SAT' }
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DOW_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

function format12Hour(hour: number, minute: number): string {
  const h = hour % 24;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const padM = String(minute).padStart(2, '0');
  const pad24 = `${String(h).padStart(2, '0')}:${padM}`;
  return `${String(displayH).padStart(2, '0')}:${padM} ${period} (${pad24} UTC)`;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function validateIntegerRange(raw: string, min: number, max: number, fieldName: string): string | null {
  if (!/^\d+$/.test(raw)) {
    return `${fieldName} contains invalid token "${raw}". Expected a number between ${min} and ${max}.`;
  }
  const n = parseInt(raw, 10);
  if (n < min || n > max) {
    return `${fieldName} value ${n} is out of bounds (allowed range: ${min}–${max}).`;
  }
  return null;
}

function validateCronField(
  val: string,
  min: number,
  max: number,
  fieldName: string,
  allowExtras?: string[]
): string | null {
  if (!val || val.trim() === '') {
    return `${fieldName} cannot be empty.`;
  }

  const v = val.trim();

  // Asterisk
  if (v === '*') return null;

  // Extra allowed symbols (e.g. 'L')
  if (allowExtras && allowExtras.includes(v.toUpperCase())) return null;

  // Step pattern: */step or n-m/step
  if (v.startsWith('*/')) {
    const stepStr = v.slice(2);
    if (!/^\d+$/.test(stepStr)) {
      return `${fieldName} step "${v}" is invalid. Expected format like "*/15".`;
    }
    const step = parseInt(stepStr, 10);
    if (step < 1 || step > max) {
      return `${fieldName} step ${step} is out of range (1–${max}).`;
    }
    return null;
  }

  // Comma-separated list: 1,2,3 or 1-5,10
  if (v.includes(',')) {
    const parts = v.split(',');
    for (const part of parts) {
      const err = validateCronField(part, min, max, fieldName, allowExtras);
      if (err) return err;
    }
    return null;
  }

  // Range pattern: 1-5
  if (v.includes('-')) {
    const [startStr, endStr, ...rest] = v.split('-');
    if (rest.length > 0) {
      return `${fieldName} range "${v}" is malformed.`;
    }
    const startErr = validateIntegerRange(startStr, min, max, `${fieldName} range start`);
    if (startErr) return startErr;
    const endErr = validateIntegerRange(endStr, min, max, `${fieldName} range end`);
    if (endErr) return endErr;

    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (start > end) {
      return `${fieldName} range "${v}" is inverted (${start} > ${end}).`;
    }
    return null;
  }

  // Single integer
  return validateIntegerRange(v, min, max, fieldName);
}

function validateMonthField(val: string): string | null {
  const v = val.trim();
  if (v === '*') return null;

  // Step
  if (v.startsWith('*/')) {
    const step = parseInt(v.slice(2), 10);
    if (isNaN(step) || step < 1 || step > 12) {
      return `Month step "${v}" is out of range (1–12).`;
    }
    return null;
  }

  // Comma
  if (v.includes(',')) {
    for (const p of v.split(',')) {
      const err = validateMonthField(p);
      if (err) return err;
    }
    return null;
  }

  // Named month
  const lower = v.toLowerCase();
  if (MONTH_MAP[lower] !== undefined) return null;

  return validateCronField(v, 1, 12, 'Month');
}

function validateDowField(val: string): string | null {
  const v = val.trim();
  if (v === '*') return null;

  // Step
  if (v.startsWith('*/')) {
    const step = parseInt(v.slice(2), 10);
    if (isNaN(step) || step < 1 || step > 7) {
      return `Day of week step "${v}" is out of range (1–7).`;
    }
    return null;
  }

  // Comma
  if (v.includes(',')) {
    for (const p of v.split(',')) {
      const err = validateDowField(p);
      if (err) return err;
    }
    return null;
  }

  // Range
  if (v.includes('-')) {
    const [s, e] = v.split('-');
    const sNorm = DOW_MAP[s.toLowerCase()] !== undefined ? String(DOW_MAP[s.toLowerCase()]) : s;
    const eNorm = DOW_MAP[e.toLowerCase()] !== undefined ? String(DOW_MAP[e.toLowerCase()]) : e;
    return validateCronField(`${sNorm}-${eNorm}`, 0, 7, 'Day of week');
  }

  // Named day
  const lower = v.toLowerCase();
  if (DOW_MAP[lower] !== undefined) return null;

  return validateCronField(v, 0, 7, 'Day of week');
}

/**
 * Generates an operator-friendly plain English description of the cron schedule.
 */
function formatCronToEnglish(min: string, hr: string, dom: string, mon: string, dow: string): string {
  // Case 1: Every minute
  if (min === '*' && hr === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'Runs every minute of every day';
  }

  // Case 2: Every N minutes
  if (min.startsWith('*/') && hr === '*' && dom === '*' && mon === '*' && dow === '*') {
    const step = min.slice(2);
    return `Runs every ${step} minutes across all hours`;
  }

  // Case 3: Hourly at minute 0
  if (min === '0' && hr === '*' && dom === '*' && mon === '*' && dow === '*') {
    return 'Runs every hour on the hour (minute :00)';
  }

  // Case 4: Every N hours
  if (min === '0' && hr.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
    const step = hr.slice(2);
    return `Runs every ${step} hours on the hour`;
  }

  // Case 5: Exact single time: min + hr are numbers
  if (/^\d+$/.test(min) && /^\d+$/.test(hr)) {
    const mNum = parseInt(min, 10);
    const hNum = parseInt(hr, 10);
    const timeStr = format12Hour(hNum, mNum);

    // 5a. Daily: * * *
    if (dom === '*' && mon === '*' && dow === '*') {
      return `Runs daily at ${timeStr}`;
    }

    // 5b. Weekly: specific weekday(s)
    if (dom === '*' && mon === '*' && dow !== '*') {
      if (dow === '0' || dow === '7' || dow.toLowerCase() === 'sun') {
        return `Runs every Sunday at ${timeStr}`;
      }
      if (dow === '1-5' || dow.toLowerCase() === 'mon-fri') {
        return `Runs every weekday (Monday through Friday) at ${timeStr}`;
      }
      if (dow === '0,6' || dow === '6,0' || dow.toLowerCase() === 'sat,sun') {
        return `Runs every weekend (Saturday and Sunday) at ${timeStr}`;
      }
      if (/^\d+$/.test(dow)) {
        const dNum = parseInt(dow, 10);
        const dName = DOW_NAMES[dNum] || `Day ${dNum}`;
        return `Runs every ${dName} at ${timeStr}`;
      }
      return `Runs on day(s) ${dow} of the week at ${timeStr}`;
    }

    // 5c. Monthly: specific day of month
    if (dom !== '*' && mon === '*' && dow === '*') {
      if (/^\d+$/.test(dom)) {
        const dNum = parseInt(dom, 10);
        return `Runs on the ${getOrdinal(dNum)} of every month at ${timeStr}`;
      }
      if (dom.toUpperCase() === 'L') {
        return `Runs on the last day of every month at ${timeStr}`;
      }
      return `Runs on day ${dom} of every month at ${timeStr}`;
    }

    // 5d. Annually: specific month + day
    if (dom !== '*' && mon !== '*' && dow === '*') {
      const monName = /^\d+$/.test(mon) ? MONTH_NAMES[parseInt(mon, 10) - 1] : mon.toUpperCase();
      const domText = /^\d+$/.test(dom) ? getOrdinal(parseInt(dom, 10)) : dom;
      return `Runs annually on ${monName} ${domText} at ${timeStr}`;
    }
  }

  // Fallback: structured phrase
  const parts: string[] = [];

  // Minutes & Hours
  if (/^\d+$/.test(min) && /^\d+$/.test(hr)) {
    parts.push(`at ${format12Hour(parseInt(hr, 10), parseInt(min, 10))}`);
  } else {
    parts.push(`at minute ${min}`);
    if (hr !== '*') parts.push(`past hour ${hr}`);
  }

  // Days of month
  if (dom !== '*') {
    parts.push(/^\d+$/.test(dom) ? `on the ${getOrdinal(parseInt(dom, 10))}` : `on day ${dom}`);
  }

  // Month
  if (mon !== '*') {
    parts.push(`in month ${mon}`);
  }

  // Day of week
  if (dow !== '*') {
    parts.push(`only on ${dow}`);
  }

  return `Runs ${parts.join(' ')}`;
}

/**
 * Estimates the next run preview based on cron components
 */
function estimateNextRunFromCron(min: string, hr: string, dom: string, _mon: string, dow: string): string {
  // If every N min
  if (min.startsWith('*/') && hr === '*') {
    return `in ~${min.slice(2)} mins`;
  }
  // If hourly
  if (min === '0' && hr === '*') {
    return 'at top of next hour';
  }
  // If exact hour & minute
  if (/^\d+$/.test(min) && /^\d+$/.test(hr)) {
    const m = parseInt(min, 10);
    const h = parseInt(hr, 10);
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeDisplay = `${pad(h)}:${pad(m)}`;

    // Weekly Sunday
    if (dow === '0' || dow === '7') {
      return `next Sunday at ${timeDisplay} UTC`;
    }
    // Weekdays
    if (dow === '1-5') {
      return `next weekday at ${timeDisplay} UTC`;
    }
    // Monthly 1st
    if (dom === '1') {
      return `1st of next month at ${timeDisplay} UTC`;
    }
    // Daily
    return `tomorrow at ${timeDisplay} UTC`;
  }

  return 'as scheduled';
}

/**
 * Main validator and parser entry point
 */
export function validateAndParseCron(expr: string): CronValidationResult {
  const trimmed = expr.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Cron expression cannot be empty. Specify 5 space-separated fields or select a preset below.',
      humanDescription: 'No schedule specified',
      nextRunEstimate: 'Not scheduled'
    };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    const count = parts.length;
    const exampleStr = '0 2 * * 0';
    return {
      isValid: false,
      error: `Expected 5 fields (minute, hour, day-of-month, month, day-of-week), but found ${count} field${count === 1 ? '' : 's'}. Example: "${exampleStr}"`,
      fields: count === 5 ? (parts as [string, string, string, string, string]) : undefined,
      humanDescription: 'Invalid cron format — missing or extra fields',
      nextRunEstimate: 'Invalid schedule'
    };
  }

  const [min, hr, dom, mon, dow] = parts;

  // Validate Field 0: Minute
  const minErr = validateCronField(min, 0, 59, 'Minute (field 1)');
  if (minErr) {
    return {
      isValid: false,
      error: minErr,
      errorField: 0,
      fields: parts as [string, string, string, string, string],
      humanDescription: 'Invalid minute syntax',
      nextRunEstimate: 'Invalid schedule'
    };
  }

  // Validate Field 1: Hour
  const hrErr = validateCronField(hr, 0, 23, 'Hour (field 2)');
  if (hrErr) {
    return {
      isValid: false,
      error: hrErr,
      errorField: 1,
      fields: parts as [string, string, string, string, string],
      humanDescription: 'Invalid hour syntax',
      nextRunEstimate: 'Invalid schedule'
    };
  }

  // Validate Field 2: Day of Month
  const domErr = validateCronField(dom, 1, 31, 'Day of month (field 3)', ['L']);
  if (domErr) {
    return {
      isValid: false,
      error: domErr,
      errorField: 2,
      fields: parts as [string, string, string, string, string],
      humanDescription: 'Invalid day of month syntax',
      nextRunEstimate: 'Invalid schedule'
    };
  }

  // Validate Field 3: Month
  const monErr = validateMonthField(mon);
  if (monErr) {
    return {
      isValid: false,
      error: monErr,
      errorField: 3,
      fields: parts as [string, string, string, string, string],
      humanDescription: 'Invalid month syntax',
      nextRunEstimate: 'Invalid schedule'
    };
  }

  // Validate Field 4: Day of Week
  const dowErr = validateDowField(dow);
  if (dowErr) {
    return {
      isValid: false,
      error: dowErr,
      errorField: 4,
      fields: parts as [string, string, string, string, string],
      humanDescription: 'Invalid day of week syntax',
      nextRunEstimate: 'Invalid schedule'
    };
  }

  // All valid!
  const human = formatCronToEnglish(min, hr, dom, mon, dow);
  const next = estimateNextRunFromCron(min, hr, dom, mon, dow);

  return {
    isValid: true,
    fields: parts as [string, string, string, string, string],
    humanDescription: human,
    nextRunEstimate: next
  };
}
