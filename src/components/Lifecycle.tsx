import { cv } from './ui';

/* A vertical stage rail — reuses the app's own .steps/.step/.step-dot
   classes (shell.css), the same idiom the legacy VNF Lifecycle screen
   already draws its Day 0/Grow/Events/GPL rail with, so a rule's lifecycle
   looks native rather than inventing a second "progress stepper" style. */
export interface LifecycleStage { key: string; label: string; reachedAt?: string; reachedBy?: string; note?: string }

const STATE_TONE = { done: 'emerald', current: 'sky', pending: 'slate' } as const;
const STATE_GLYPH = { done: '✓', current: '●', pending: '' } as const;

export function Lifecycle({ stages, currentIndex, retiredIndex }: {
  stages: LifecycleStage[]; currentIndex: number; retiredIndex?: number;
}) {
  return (
    <div className="steps">
      {stages.map((s, i) => {
        const state = retiredIndex !== undefined && i > retiredIndex ? 'pending'
          : i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending';
        const tone = STATE_TONE[state];
        return (
          <div key={s.key} className="step">
            <span className="step-dot" style={{ background: cv(tone, 100), color: cv(tone, 700) }}>{STATE_GLYPH[state]}</span>
            <div>
              <div className="vw-value" style={{ fontWeight: state === 'pending' ? 400 : 600, color: state === 'pending' ? cv('gray', 400) : undefined }}>
                {s.label}
              </div>
              {s.reachedAt && (
                <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>
                  {s.reachedBy ? `by ${s.reachedBy} · ` : ''}{s.reachedAt}
                </div>
              )}
              {s.note && <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{s.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
