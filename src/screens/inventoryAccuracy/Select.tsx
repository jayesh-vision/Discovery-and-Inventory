/* ── Themed dropdown ───────────────────────────────────────────────────────
   A native <select>'s open popup is drawn by the OS/browser chrome and
   cannot be restyled with CSS — it was rendering in plain system gray
   regardless of this module's theme-black re-skin. This renders its own
   listbox (button + portaled panel, same createPortal-to-body pattern as
   ui.tsx's InfoTip) so the open state is themed too, not just the closed
   trigger. Drop-in replacement for every <select> in this module. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption { value: string; label: string }

export function Select({ value, onChange, options, placeholder = 'Select…', disabled, ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [active, setActive] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = options.find(o => o.value === value);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex(o => o.value === value)));
    listRef.current?.focus();
    const onDocDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (v: string) => { onChange(v); setOpen(false); btnRef.current?.focus(); };

  return (
    <>
      <button
        type="button" ref={btnRef} className="nst-input ia-select-trigger" disabled={disabled}
        aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={e => { if (!disabled && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(true); } }}
      >
        <span className={current ? 'ia-select-value' : 'ia-select-value ia-select-placeholder'}>{current ? current.label : placeholder}</span>
        <svg className="ia-select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <ul
          ref={listRef} role="listbox" tabIndex={-1} className="ia-select-list"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(options.length - 1, a + 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
            else if (e.key === 'Enter') { e.preventDefault(); const o = options[active]; if (o) choose(o.value); }
            else if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); }
            else if (e.key === 'Tab') { setOpen(false); }
          }}
        >
          {options.map((o, i) => (
            <li
              key={o.value} role="option" aria-selected={o.value === value}
              className={`ia-select-option${o.value === value ? ' is-selected' : ''}${i === active ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
            >
              <span>{o.label}</span>
              {o.value === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  );
}
