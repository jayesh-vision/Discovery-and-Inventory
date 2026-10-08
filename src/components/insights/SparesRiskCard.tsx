import { useMemo } from 'react';
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
  tip
}: {
  title: string;
  subtitle: string;
  rows: SpareRow[];
  note: string;
  colors: { critical: string; low: string };
  tip: TipHandlers;
}) {
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
          <div className="ii-card-title">{title}</div>
          <span className="ii-threshold-chip" title="Spares as a share of the deployed population">
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
              <th scope="col">Model</th>
              <th scope="col" className="is-num">Deployed</th>
              <th scope="col" className="is-num">Spares</th>
              <th scope="col">Coverage</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(s => {
              const color = s.level === 'critical' ? colors.critical : colors.low;
              const ratio = `${s.pct.toFixed(1)}%`;
              return (
                <tr
                  key={s.model}
                  className="ii-spares-row"
                  onMouseEnter={e =>
                    tip.showTip(
                      {
                        title: s.model,
                        dotColor: color,
                        badge: ratio,
                        rows: [
                          { label: 'Deployed in network', value: s.deployed.toLocaleString('en-IN') },
                          { label: 'Spares in stock', value: `${s.spares}${s.spares === 1 ? ' spare' : ' spares'}` },
                          { label: 'Coverage ratio', value: ratio },
                          { label: 'Safe threshold', value: `≥ ${SPARES_SAFE_PCT.toFixed(1)}%` }
                        ],
                        note:
                          s.level === 'critical'
                            ? 'Critical spare parts shortage (< 1.0% buffer). Immediate order required.'
                            : 'Below recommended 2% buffer threshold. Review warehouse lead time.'
                      },
                      e
                    )
                  }
                  onMouseMove={tip.moveTip}
                  onMouseLeave={tip.hideTip}
                >
                  <td className="ii-spares-model">{s.model}</td>
                  <td className="ii-mono is-num ii-muted">{s.deployed.toLocaleString('en-IN')}</td>
                  <td className="ii-mono is-num ii-strong">{s.spares}</td>
                  <td>
                    <div className="ii-cov">
                      <div
                        className="ii-cov-track"
                        role="img"
                        aria-label={`${ratio} spare coverage against a ${SPARES_SAFE_PCT}% safe threshold`}
                      >
                        <span className="ii-cov-fill" style={{ width: `${s.fill}%`, background: color }} />
                        <span className="ii-cov-mark" aria-hidden="true" />
                      </div>
                      <span className="ii-mono ii-cov-val" style={{ color }}>{ratio}</span>
                    </div>
                  </td>
                  <td>
                    <div className="ii-status-cell">
                      <span className={`ii-badge ii-badge--${s.level === 'critical' ? 'danger' : 'warning'}`}>
                        {s.level === 'critical' ? 'Critical' : 'Below threshold'}
                      </span>
                      {s.eol && <span className="ii-badge ii-badge--eol" title="Also on the EOL list">EOL · replace, don't restock</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="is-empty">No at-risk models for this vendor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ii-note-box">{note}</div>
    </div>
  );
}
