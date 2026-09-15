import { useEffect, useRef, type ReactNode } from 'react';

/* A right-edge slide-in panel with a scrim, for inspecting one record without
   leaving the list behind it — the device-level detail the domain drill-down
   opens into. Esc and a scrim click both close it; focus moves to the panel
   on open and returns to whatever opened it on close, same as the grid's own
   filter panel and kebab menus expect from a dismissable overlay. */
export function Drawer({ open, title, sub, onClose, children }: {
  open: boolean; title: string; sub?: string; onClose: () => void; children: ReactNode;
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
      <aside className="ov-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ov-drawer-head">
          <div style={{ minWidth: 0 }}>
            <div className="vw-card-title-sm">{title}</div>
            {sub && <div className="vw-card-metric-label-sub" style={{ marginTop: '2px' }}>{sub}</div>}
          </div>
          <button ref={closeBtn} className="nst-btn nst-btn--xs" onClick={onClose}>Close</button>
        </div>
        <div className="ov-drawer-body">{children}</div>
      </aside>
    </>
  );
}
