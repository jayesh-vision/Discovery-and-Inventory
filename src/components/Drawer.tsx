import { useEffect, useRef, type ReactNode } from 'react';

/* A right-edge slide-in panel with a scrim, for inspecting one record without
   leaving the list behind it — the device-level detail the domain drill-down
   opens into. Esc and a scrim click both close it; focus moves to the panel
   on open and returns to whatever opened it on close, same as the grid's own
   filter panel and kebab menus expect from a dismissable overlay. */
export function Drawer({ open, title, sub, onClose, children }: {
  open: boolean; title: ReactNode; sub?: ReactNode; onClose: () => void; children: ReactNode;
}) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      lastFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="ov-scrim" onClick={onClose} />
      <aside className="ov-drawer" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="ov-drawer-head">
          <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
            <div className="vw-card-title-sm" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</div>
            {sub && <div className="vw-card-metric-label-sub" style={{ marginTop: '3px', fontSize: '0.8125rem', color: '#64748b' }}>{sub}</div>}
          </div>
          <button
            ref={closeBtn}
            type="button"
            className="ov-drawer-close-btn"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="ov-drawer-body">{children}</div>
      </aside>
    </>
  );
}
