/* ── Weighted accuracy scoring ─────────────────────────────────────────────
   PRD formula: per rule, Rule Score = Rule Pass% × Rule Weight; Overall
   Score = Σ(Rule Score) / Σ(applicable rule weight). A rule with zero
   applicable records (nothing of its kind in this upload) is dropped from
   both sums — it neither helps nor hurts a score it had nothing to say
   about. Classification thresholds are configurable and persisted, same
   localStorage idiom as rules.ts. */
import type { AccuracyClassification, AccuracyThresholds, RuleResult } from './model';
import { DEFAULT_THRESHOLDS } from './model';

const KEY = 'ns.inventoryAccuracy.thresholds.v1';

export function loadThresholds(): AccuracyThresholds {
  try {
    if (typeof window === 'undefined') return DEFAULT_THRESHOLDS;
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) } : DEFAULT_THRESHOLDS;
  } catch { return DEFAULT_THRESHOLDS; }
}

export function saveThresholds(t: AccuracyThresholds) {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* degrade to in-tab only */ }
}

export function classify(score: number, thresholds: AccuracyThresholds = loadThresholds()): AccuracyClassification {
  if (score >= thresholds.excellent) return 'Excellent';
  if (score >= thresholds.good) return 'Good';
  if (score >= thresholds.needsImprovement) return 'Needs Improvement';
  return 'Poor';
}

export function computeScore(ruleResults: RuleResult[]): number {
  const applicable = ruleResults.filter(r => r.applicable > 0);
  if (!applicable.length) return 100;
  const totalWeight = applicable.reduce((a, r) => a + r.weight, 0);
  if (!totalWeight) return 100;
  const weighted = applicable.reduce((a, r) => a + r.passPct * r.weight, 0);
  return Math.round((weighted / totalWeight) * 10) / 10;
}
