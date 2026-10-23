import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { withSolution } from '../../solution';
import type { TipHandlers } from './types';

/* Safe spare coverage is 2% of the deployed population; under 1% is critical.
   The same thresholds the tooltip and CSV export already state. */
export const SPARES_SAFE_PCT = 2;
export const SPARES_CRITICAL_PCT = 1;

type Level = 'critical' | 'low';

export interface SpareRow {
  model: string;
  deployed: number;
  spares: number;
}

/* "(ASR 920, Radio 4480)" in the card's own note names the models also on the
   EOL list — read them from the data instead of repeating them in code. */
export function eolModelsFromNote(note: string): string[] {
  const m = note.match(/\(([^)]+)\)/);
  return m ? m[1].split(',').map(s => s.trim()).filter(Boolean) : [];
}

export default function SparesRiskCard({
  title,
  subtitle,
  rows,
  note,
  colors,
  tip: _tip
}: {
  title: string;
  subtitle: string;
  rows: SpareRow[];
  note: string;
  colors: { critical: string; low: string };
  tip?: TipHandlers;
}) {
  const navigate = useNavigate();
  const eolTokens = useMemo(() => eolModelsFromNote(note), [note]);
  const items = useMemo(
    () =>
      rows.map(r => {
        const pct = r.deployed ? (r.spares / r.deployed) * 100 : 0;
        const level: Level = pct < SPARES_CRITICAL_PCT ? 'critical' : 'low';
        return {
          ...r,
          pct,
          level,
          fill: Math.min(100, (pct / SPARES_SAFE_PCT) * 100),
          eol: eolTokens.some(t => r.model.toLowerCase().includes(t.toLowerCase()))
        };
      }),
    [rows, eolTokens]
  );

  return (
    <div className="ii-card">
      <div className="ii-card-header">
        <div className="ii-card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span className="ii-card-dot" style={{ background: 'var(--vw-color-amber-500, #f59e0b)' }} />
            <div className="ii-card-title">{title}</div>
          </div>
          <span className="ii-threshold-chip" title="Spares buffer as a share of deployed population (Safe threshold ≥ 2.0%)">
            Safe threshold ≥ {SPARES_SAFE_PCT.toFixed(1)}%
          </span>
        </div>
        <p className="ii-card-sub">{subtitle}</p>
      </div>

      <div className="ii-table-wrap">
        <table className="ii-table ii-table--spares">
          <caption className="ii-sr-only">Models holding fewer spares than the safe threshold</caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: '34%' }}>Model</th>
              <th scope="col" className="is-num" style={{ width: '15%' }}>Deployed</th>
              <th scope="col" className="is-num" style={{ width: '13%' }}>Spares</th>
              <th scope="col" style={{ width: '22%' }}>Coverage</th>
              <th scope="col" style={{ width: '16%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(s => {
              const color = s.level === 'critical' ? colors.critical : colors.low;
              const ratio = `${s.pct.toFixed(1)}%`;
              return (
                <tr
                  key={s.model}
                  className="ii-spares-row is-clickable"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(withSolution(`/inventory/spares?model=${encodeURIComponent(s.model)}&from=Inventory%20insights`))}
                  title={`Drill down to spares inventory for ${s.model} (${s.spares} spares for ${s.deployed} deployed · ${ratio} coverage)`}
                >
                  <td className="ii-spares-model">{s.model}</td>
                  <td className="ii-mono is-num ii-muted" data-label="Deployed">{s.deployed.toLocaleString('en-IN')}</td>
                  <td className="ii-mono is-num ii-strong" data-label="Spares">{s.spares}</td>
                  <td data-label="Coverage">
                    <div className="ii-cov">
                      <div
                        className="ii-cov-track"
                        role="img"
                        aria-label={`${ratio} spare coverage against a ${SPARES_SAFE_PCT}% safe threshold`}
                      >
                        <span className="ii-cov-fill" style={{ width: `${s.fill}%`, background: color }} />
                        <span className="ii-cov-mark" aria-hidden="true" title="Safe threshold (2.0%)" />
                      </div>
                      <span className="ii-mono ii-cov-val" style={{ color }}>{ratio}</span>
                    </div>
                  </td>
                  <td data-label="Status">
                    <div className="ii-status-cell">
                      <span className={`ii-badge ii-badge--${s.level === 'critical' ? 'danger' : 'warning'}`}>
                        {s.level === 'critical' ? 'Critical <1%' : 'Low Buffer'}
                      </span>
                      {s.eol && <span className="ii-badge ii-badge--eol" title="Also on the EOL list: replace rather than restock">EOL</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="is-empty" style={{ textAlign: 'center', padding: '16px', color: 'var(--vw-color-slate-500, #64748b)' }}>
                  No at-risk models for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ii-note-box">
        <span className="ii-note-icon" aria-hidden="true">ℹ</span>
        <span>{note}</span>
      </div>
    </div>
  );
}
