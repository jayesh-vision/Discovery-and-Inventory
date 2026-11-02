/* ── Shared tone maps and small helpers for the Inventory Assurance screens ──
   No new visual vocabulary — these just map this feature's vocabulary onto
   the existing Chip/ColorTone palette every other screen already uses. */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChipTone, ColorTone } from '../../data/ledger';
import type { AccuracyClassification, IssueStatus, ReconciliationOutcome, RuleSeverity, RuleStatus } from '../../inventoryAccuracy/model';
import { accuracyStore } from '../../inventoryAccuracy/store';

export const SEVERITY_TONE: Record<RuleSeverity, ChipTone> = { critical: 'error', high: 'warning', medium: 'info', low: 'neutral' };
export const OUTCOME_TONE: Record<ReconciliationOutcome, ChipTone> = {
  NEW: 'info', MATCHED: 'success', MODIFIED: 'warning', MISSING: 'neutral', DUPLICATE: 'orange', CONFLICT: 'error', INVALID: 'error'
};
export const RULE_STATUS_TONE: Record<RuleStatus, ChipTone> = {
  Draft: 'neutral', Review: 'info', Approved: 'success', Active: 'success', Suspended: 'warning', Retired: 'neutral'
};
export const ISSUE_STATUS_TONE: Record<IssueStatus, ChipTone> = {
  Open: 'error', Assigned: 'info', 'In Progress': 'warning', Resolved: 'success', 'Accepted Exception': 'purple', Rejected: 'neutral'
};
export const CLASSIFICATION_TONE: Record<AccuracyClassification, ColorTone> = {
  Excellent: 'emerald', Good: 'sky', 'Needs Improvement': 'amber', Poor: 'red'
};
export const CLASSIFICATION_CHIP: Record<AccuracyClassification, ChipTone> = {
  Excellent: 'success', Good: 'info', 'Needs Improvement': 'warning', Poor: 'error'
};

export const fmtPct = (n: number) => `${n.toFixed(1)}%`;
export const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function useStoreVersion() {
  const [, setN] = useState(0);
  useEffect(() => accuracyStore.subscribe(() => setN(n => n + 1)), []);
}

/** which execution a results screen shows — the `exec` query param, or the
    most recent upload when none is chosen yet. */
export function useSelectedExecution() {
  useStoreVersion();
  const [sp, setSp] = useSearchParams();
  const executions = accuracyStore.executions();
  const id = sp.get('exec') || executions[0]?.id || '';
  const execution = executions.find(e => e.id === id);
  const setId = (next: string) => { const n = new URLSearchParams(sp); n.set('exec', next); setSp(n, { replace: true }); };
  return { executions, execution, setId };
}
