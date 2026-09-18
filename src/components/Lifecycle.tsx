import { cv } from './ui';

/* A horizontal stage rail, one column per stage connected by a line — fills
   the width a wide page actually has instead of trailing down one narrow
   left-hand column (the vertical .steps/.step idiom used to render this,
   but that class pair is also the legacy VNF Lifecycle screen's own rail
   (app-views.js) and can't be restyled here without changing that screen
   too, so this reuses only .step-dot as-is for the circle and defines its
   own new, RuleDetails-only classes for the row/connector layout). */
export interface LifecycleStage { key: string; label: string; reachedAt?: string; reachedBy?: string; note?: string }

const STATE_TONE = { done: 'emerald', current: 'sky', pending: 'slate' } as const;
const STATE_GLYPH = { done: '✓', current: '●', pending: '' } as const;

export function Lifecycle({ stages, currentIndex, retiredIndex }: {
  stages: LifecycleStage[]; currentIndex: number; retiredIndex?: number;
}) {
  return (
    <div className="rul-lc-rail">
      {stages.map((s, i) => {
        const state = retiredIndex !== undefined && i > retiredIndex ? 'pending'
          : i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending';
        const tone = STATE_TONE[state];
        return (
          <div key={s.key} className="rul-lc-stage">
            <div className="rul-lc-node-row">
              <span className="step-dot" style={{ background: cv(tone, 100), color: cv(tone, 700), flexShrink: 0 }}>{STATE_GLYPH[state]}</span>
              {i < stages.length - 1 && <span className="rul-lc-line" style={{ background: i < currentIndex ? cv('emerald', 300) : 'var(--vw-color-slate-200)' }} />}
            </div>
            <div className="vw-value" style={{ marginTop: '10px', fontWeight: state === 'pending' ? 400 : 600, color: state === 'pending' ? cv('gray', 400) : undefined }}>
              {s.label}
            </div>
            {s.reachedAt && (
              <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
                {s.reachedBy ? `by ${s.reachedBy} · ` : ''}{s.reachedAt}
              </div>
            )}
            {s.note && <div className="vw-card-metric-label-sub" style={{ marginTop: '4px' }}>{s.note}</div>}
          </div>
        );
      })}
    </div>
  );
}
