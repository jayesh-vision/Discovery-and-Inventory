export interface GeoDropdownProps {
  align?: 'left' | 'right';
  showLabel?: boolean;
  className?: string;
}

export default function GeoDropdown({
  showLabel = false,
  className = ''
}: GeoDropdownProps) {
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
        aria-label="Geography"
        value="us"
        disabled
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          height: '32px',
          padding: '0 28px 0 10px',
          borderRadius: '7px',
          background: `var(--vw-color-slate-100, #f1f5f9) url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%2394a3b8' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E") no-repeat calc(100% - 9px) center`,
          border: '1px solid var(--vw-color-slate-200, #cbd5e1)',
          boxShadow: 'none',
          color: 'var(--vw-color-slate-600, #475569)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'not-allowed',
          opacity: 0.9,
          outline: 'none'
        }}
        title="Geography: United States (Default)"
      >
        <option value="us">🇺🇸 United States</option>
      </select>
    </div>
  );
}
