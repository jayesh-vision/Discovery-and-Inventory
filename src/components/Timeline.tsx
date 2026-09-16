import type { ReactNode } from 'react';

/* The vertical dot-and-line activity timeline already established on
   Insights' "Reconciliation cycles" card — pulled out so Rule Details'
   Activity tab can reuse the exact same visual instead of a third
   copy-pasted version of the same inline styles. */
export interface TimelineEntry { key: string; when: string; dotHex: string; children: ReactNode }

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div>
      {entries.map((e, i) => (
        <div key={e.key} style={{ display: 'grid', gridTemplateColumns: '9rem 20px 1fr', columnGap: 'var(--vw-space-sm)', alignItems: 'flex-start', padding: '11px 0' }}>
          <span className="mono vw-card-metric-label-sub" style={{ paddingTop: '2px' }}>{e.when}</span>
          <span style={{ position: 'relative', alignSelf: 'stretch' }}>
            <span style={{ position: 'absolute', left: 6, top: 4, width: 9, height: 9, borderRadius: '50%', background: e.dotHex, boxShadow: '0 0 0 3px var(--vw-color-white)' }} />
            {i < entries.length - 1 && <span style={{ position: 'absolute', left: 10, top: 16, bottom: -22, width: 1, background: 'var(--vw-color-slate-200)' }} />}
          </span>
          <div style={{ minWidth: 0 }}>{e.children}</div>
        </div>
      ))}
    </div>
  );
}
