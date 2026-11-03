import React from 'react';
import { useNavigate } from 'react-router-dom';
import { withSolution } from '../../solution';

export interface BreadcrumbItem {
  label: string;
  to?: string | null;
  isCurrent?: boolean;
  onClick?: () => void;
  isLoading?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  'aria-label'?: string;
}

export default function Breadcrumb({
  items,
  className = '',
  separator = '>',
  'aria-label': ariaLabel = 'Breadcrumb'
}: BreadcrumbProps) {
  const nav = useNavigate();

  if (!items || items.length === 0) return null;

  return (
    <nav className={`topbar-crumbs ${className}`.trim()} aria-label={ariaLabel}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const isCurrent = item.isCurrent ?? isLast;

        return (
          <span key={i} className="topbar-seg">
            {i > 0 && (
              <span className="topbar-crumb-sep" aria-hidden="true">
                {separator}
              </span>
            )}

            {item.isLoading ? (
              <span className="topbar-crumb-skeleton" aria-hidden="true" title="Loading..." />
            ) : isCurrent || !item.to ? (
              <span
                className={isCurrent ? 'topbar-crumb-current' : 'topbar-crumb-text'}
                aria-current={isCurrent ? 'page' : undefined}
                style={isCurrent ? { pointerEvents: 'none' } : undefined}
              >
                {item.label || '...'}
              </span>
            ) : (
              <button
                type="button"
                className="topbar-crumb-link"
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else if (item.to) {
                    nav(withSolution(item.to), { state: { reset: true } });
                  }
                }}
              >
                {item.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
