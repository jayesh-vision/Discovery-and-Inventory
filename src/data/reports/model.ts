/* ── Reports: content model ─────────────────────────────────
   A report builder turns the app's canonical data into one ReportContent.
   The report page, the landing card and every export (PDF, Excel, CSV,
   Word, HTML, JSON) render the same object, so none of them can disagree —
   and because builders only read the ledger and the self-checked overview
   files, no report can disagree with Insights or Reconciliation either. */

import type { ChipTone, ColorTone } from '../ledger';

export type ReportModule = 'discovery' | 'inventory';
export const MODULE_LABEL: Record<ReportModule, string> = {
  discovery: 'Discovery and reconciliation', inventory: 'Inventory'
};

export type Audience = 'Leadership' | 'Operations' | 'Engineering' | 'Finance' | 'Planning' | 'Governance';
export const AUDIENCES: Audience[] = ['Leadership', 'Operations', 'Finance', 'Planning', 'Engineering', 'Governance'];

export type ReportState = 'Current' | 'Stale' | 'Running' | 'Failed';
export const STATE_TONE: Record<ReportState, ChipTone> = { Current: 'success', Stale: 'warning', Running: 'info', Failed: 'error' };

export interface ReportDef {
  id: string;
  module: ReportModule;
  name: string;
  /** The decision the report exists to support, in the reader's words. */
  question: string;
  audience: Audience;
  cadence: 'Daily' | 'Weekly' | 'Monthly' | 'On demand';
  schedule: string;
  distribution: string;
  state: ReportState;
  /** DD-Mon-YYYY HH:MM, the app's date convention */
  lastRun: string;
  snapshot: string;
  featured?: boolean;
  note?: string;
}

/* ── values ── */
export type Fmt = 'num' | 'pct' | 'pct2' | 'hours' | 'days' | 'usd' | 'sec' | 'kw' | 'ratio';

export const fmtNum = (v: number) => Math.round(v).toLocaleString('en-IN');
export function fmtUsd(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e5) return `$${Math.round(v / 1e3).toLocaleString('en-IN')}k`;
  return `$${Math.round(v).toLocaleString('en-IN')}`;
}
export function fmtValue(v: number, f: Fmt): string {
  switch (f) {
    case 'pct': return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
    case 'pct2': return `${v.toFixed(2)}%`;
    case 'hours': return `${v.toFixed(1)}h`;
    case 'days': return `${fmtNum(v)} d`;
    case 'usd': return fmtUsd(v);
    case 'sec': return `${v.toFixed(2)}s`;
    case 'kw': return `${v.toFixed(1)} kW`;
    case 'ratio': return `${v.toFixed(2)}×`;
    default: return fmtNum(v);
  }
}

/* ── report parts ── */
export interface Delta { text: string; better: boolean | null }

export type KpiVisual =
  | { kind: 'segments'; parts: { n: string; c: number; hex: string }[]; total: number }
  | { kind: 'cycles'; values: number[]; labels: string[] }
  | { kind: 'against'; value: number; limit: number };

export interface Kpi {
  title: string; definition: string;
  value: number; fmt: Fmt; of?: string;
  delta: Delta; tone: ColorTone; visual?: KpiVisual;
}

export interface Finding { tone: 'good' | 'warn' | 'crit' | 'info'; title: string; detail: string }

export interface Action { priority: 'P1' | 'P2' | 'P3'; action: string; owner: string; impact: string }

export interface BarRow { label: string; value: number; hex?: string; sub?: string; tag?: string }

export type Visual = { title: string; sub?: string; definition?: string; span?: 1 | 2 } & (
  | { kind: 'bars'; rows: BarRow[]; fmt: Fmt; min?: number; max?: number; target?: { value: number; label: string } }
  | { kind: 'ramp'; buckets: { label: string; count: number; hex: string; hint?: string }[] }
  | { kind: 'donut'; slices: { k: string; n: string; c: number; hex: string }[]; total: number; label: string }
  | { kind: 'stacked'; days: string[]; series: { k: string; n: string; hex: string }[]; values: number[][] }
  | { kind: 'lines'; labels: string[]; series: { n: string; hex: string; values: number[] }[]; fmt: Fmt }
  | { kind: 'projection'; historyLabels: string[]; historyValues: number[]; projectionLabels: string[]; projectionValues: number[];
      target: number; targetLabel: string; yBounds: { y0: number; y1: number }; fmt: Fmt }
  | { kind: 'heat'; rows: string[]; cols: string[]; values: number[][]; fmt: Fmt; rowHex?: string[] }
  | { kind: 'composition'; parts: { n: string; c: number; hex: string }[] }
  | { kind: 'steps'; start: number; target: number; steps: { label: string; gain: number; cum: number }[]; fmt: Fmt }
);

export type CellValue = string | number | null;
export interface Column {
  key: string; header: string;
  fmt?: Fmt | 'text' | 'mono' | 'chip' | 'domain' | 'date';
  right?: boolean;
  /** value → chip tone, for fmt 'chip' */
  tones?: Partial<Record<string, ChipTone>>;
  width?: string;
}
/** An in-app destination, resolved by the screen through routes.ts'
    legacyPath() — kept as data here so this file never imports routes
    (routes imports the screens, which import this). */
export interface Link { key: string; params?: Record<string, string>; q?: string }
export interface Row { id: string; link?: Link; cells: Record<string, CellValue> }
export interface Table {
  title: string; sub: string;
  columns: Column[]; rows: Row[];
  /** column whose distinct values become quick filters */
  facet?: string;
  empty: string;
}

export interface ReportContent {
  headline: { value: number; fmt: Fmt; label: string; tone: ColorTone; trend?: number[]; better?: 'up' | 'down' };
  summary: string;
  findings: Finding[];
  kpis: Kpi[];
  visuals: Visual[];
  actions: Action[];
  table: Table;
  methodology: { term: string; definition: string }[];
}

export type ReportBuilder = () => ReportContent;

/* ── small helpers ── */
export const sum = <T,>(a: readonly T[], f: (x: T) => number) => a.reduce((acc, x) => acc + f(x), 0);
export const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : 0);
export const r1 = (v: number) => Math.round(v * 10) / 10;
export const plural = (n: number, one: string, many = `${one}s`) => `${fmtNum(n)} ${n === 1 ? one : many}`;
/* lower-cases a leading capital unless it starts an acronym ("RAN capacity" stays) */
export const lowerFirst = (t: string) => (/^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));
export function countBy<T>(a: readonly T[], key: (x: T) => string): [string, number][] {
  const m = new Map<string, number>();
  a.forEach(x => m.set(key(x), (m.get(key(x)) ?? 0) + 1));
  return [...m.entries()].sort((x, y) => y[1] - x[1]);
}

/* ChipTone → a colour ramp hex, so a chart segment reads the same colour as
   the chip beside it in a table */
export const TONE_HEX: Record<ChipTone, string> = {
  success: 'var(--vw-color-emerald-400)', info: 'var(--vw-color-sky-400)', warning: 'var(--vw-color-amber-400)',
  error: 'var(--vw-color-red-400)', neutral: 'var(--vw-color-slate-300)', purple: 'var(--vw-color-violet-400)',
  cyan: 'var(--vw-color-cyan-400)', orange: 'var(--vw-color-orange-400)', pink: 'var(--vw-color-pink-400)'
};

/* ── one cell → display text, shared by the grid, the PDF and the documents ── */
const DOMAIN_NAMES: Record<string, string> = { RAN: 'RAN', Core: 'Core', Transport: 'Transport', IPMPLS: 'IP/MPLS' };
export function cellText(v: CellValue | undefined, col: Column): string {
  if (v === null || v === undefined || v === '') return '—';
  if (col.fmt === 'domain') return DOMAIN_NAMES[String(v)] ?? String(v);
  if (typeof v === 'number' && col.fmt && !['text', 'mono', 'chip', 'domain', 'date'].includes(col.fmt)) return fmtValue(v, col.fmt as Fmt);
  return String(v);
}

/* the underlying numbers of a chart, as rows — for CSV/Excel "chart data" and for PDF tables */
export function visualData(v: Visual): { head: string[]; rows: (string | number)[][] } {
  switch (v.kind) {
    case 'bars': return { head: ['Item', 'Value', 'Detail'], rows: v.rows.map(r => [r.label, r.value, [r.sub, r.tag].filter(Boolean).join(' · ')]) };
    case 'ramp': return { head: ['Bucket', 'Count'], rows: v.buckets.map(b => [b.label, b.count]) };
    case 'donut': return { head: ['Segment', 'Count', 'Share %'], rows: v.slices.map(s => [s.n, s.c, r1(pct(s.c, v.total))]) };
    case 'composition': { const t = sum(v.parts, p => p.c); return { head: ['Segment', 'Count', 'Share %'], rows: v.parts.map(p => [p.n, p.c, r1(pct(p.c, t))]) }; }
    case 'stacked': return { head: ['Period', ...v.series.map(s => s.n)], rows: v.days.map((d, i) => [d, ...v.values[i]]) };
    case 'lines': return { head: ['Period', ...v.series.map(s => s.n)], rows: v.labels.map((l, i) => [l, ...v.series.map(s => s.values[i])]) };
    case 'projection': return {
      head: ['Day', 'Measured', 'Projected'],
      rows: [...v.historyLabels.map((l, i) => [l, v.historyValues[i], '']), ...v.projectionLabels.slice(1).map((l, i) => [l, '', v.projectionValues[i + 1]])] as (string | number)[][]
    };
    case 'heat': return { head: ['', ...v.cols], rows: v.rows.map((r, i) => [r, ...v.values[i]]) };
    case 'steps': return { head: ['Step', 'Gain (pt)', 'Result'], rows: [['Start', '', v.start], ...v.steps.map(s => [s.label, s.gain, s.cum])] };
  }
}
