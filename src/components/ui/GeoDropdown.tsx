import { useSearchParams, useNavigate } from 'react-router-dom';
import { currentGeo, setGeo, withSolution, type DcGeo } from '../../solution';

export interface GeoDropdownProps {
  align?: 'left' | 'right';
  showLabel?: boolean;
  className?: string;
}

export default function GeoDropdown({
  showLabel = false,
  className = ''
}: GeoDropdownProps) {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const activeGeo: DcGeo = currentGeo();

  const selectCountry = (g: DcGeo) => {
    setGeo(g);
    const sp = new URLSearchParams(searchParams);
    sp.set('geo', g);
    sp.delete('country');
    nav(withSolution(`${window.location.pathname}?${sp.toString()}`));
  };

  return (
    <div
      className={`geo-dropdown ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {showLabel && (
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vw-color-slate-500, #64748b)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Geography:
        </span>
      )}
      <select
        id="geo-select-box"
        aria-label="Select Geography"
        value={activeGeo}
        onChange={e => selectCountry(e.target.value as DcGeo)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          height: '32px',
          padding: '0 30px 0 10px',
          borderRadius: '7px',
          background: `#ffffff url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%2364748b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E") no-repeat calc(100% - 9px) center`,
          border: '1px solid var(--vw-color-slate-200, #cbd5e1)',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
          color: 'var(--vw-color-slate-800, #1e293b)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--vw-color-slate-300, #94a3b8)';
          e.currentTarget.style.background = `#f8fafc url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%23475569' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E") no-repeat calc(100% - 9px) center`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--vw-color-slate-200, #cbd5e1)';
          e.currentTarget.style.background = `#ffffff url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%2364748b' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E") no-repeat calc(100% - 9px) center`;
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--vw-color-sky-500, #0ea5e9)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.15)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--vw-color-slate-200, #cbd5e1)';
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.05)';
        }}
      >
        <option value="us">🇺🇸 United States</option>
        <option value="in">🇮🇳 India</option>
      </select>
    </div>
  );
}
