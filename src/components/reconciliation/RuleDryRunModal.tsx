import { useState, useMemo } from 'react';
import type { Condition, DomainKey, Rule } from '../../data/rules';
import { DomainDot, Chip, cv } from '../ui';
import '../../styles/scanJobs.css';

interface RuleDryRunModalProps {
  open: boolean;
  rule: Rule | { name: string; domain: DomainKey; conditions: Condition[]; source?: string; target?: string; ruleType?: string } | null;
  onClose: () => void;
  onApplyLive?: () => void;
}

interface SimulatedAffectedRecord {
  id: string;
  name: string;
  deviceClass: string;
  sourceValue: string;
  targetValue: string;
  conditionMatched: string;
  outcome: 'Drift' | 'Exception' | 'Matched';
  proposedAction: string;
}

export function RuleDryRunModal({
  open,
  rule,
  onClose,
  onApplyLive
}: RuleDryRunModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [filterType, setFilterType] = useState<'All' | 'Drift' | 'Exception' | 'Matched'>('All');

  // Generate deterministic simulation statistics based on rule domain and condition count
  const simulationResults = useMemo(() => {
    if (!rule) return null;

    const domain = rule.domain;
    let totalPopulation = 2497;
    let prefix = 'RTR';

    if (domain === 'RAN') {
      totalPopulation = 8412;
      prefix = 'GNB';
    } else if (domain === 'Core') {
      totalPopulation = 1840;
      prefix = 'UPF';
    } else if (domain === 'Transport') {
      totalPopulation = 3120;
      prefix = 'TX';
    } else {
      totalPopulation = 2497;
      prefix = 'RTR';
    }

    const condCount = Math.max(1, rule.conditions?.length || 1);
    // Calculated impact metrics
    const matchRate = Math.min(0.94, 0.88 + condCount * 0.015);
    const driftRate = 0.05 + (condCount % 3) * 0.01;

    const matchedCount = Math.round(totalPopulation * matchRate);
    const driftCount = Math.round(totalPopulation * driftRate);
    const exceptionCount = totalPopulation - matchedCount - driftCount;
    const totalAffected = driftCount + exceptionCount;
    const affectedPct = ((totalAffected / totalPopulation) * 100).toFixed(1);

    // Generate sample preview rows
    const firstCond = rule.conditions?.[0];
    const condLabel = firstCond
      ? `${firstCond.sourceField || 'Identifier'} ${firstCond.operator} ${firstCond.targetField || 'Identifier'}`
      : 'Identity comparison';

    const cities = ['DEL', 'MUM', 'BLR', 'HYD', 'CCU', 'MAA', 'PUN', 'AMD'];
    const sampleRecords: SimulatedAffectedRecord[] = [
      {
        id: `IND-${cities[0]}-${prefix}-014`,
        name: `${cities[0]}-CORE-${prefix}-014`,
        deviceClass: domain === 'RAN' ? 'gNodeB' : 'Router',
        sourceValue: 'Cisco IOS-XR 7.5.2',
        targetValue: 'Cisco IOS-XR 7.3.1',
        conditionMatched: condLabel,
        outcome: 'Drift',
        proposedAction: 'Update firmware version in inventory register'
      },
      {
        id: `IND-${cities[1]}-${prefix}-028`,
        name: `${cities[1]}-AGG-${prefix}-028`,
        deviceClass: domain === 'RAN' ? 'gNodeB' : 'Router',
        sourceValue: 'SN: FOC23490218',
        targetValue: 'SN: FOC21980312',
        conditionMatched: condLabel,
        outcome: 'Drift',
        proposedAction: 'Reconcile chassis serial number'
      },
      {
        id: `IND-${cities[2]}-${prefix}-041`,
        name: `${cities[2]}-ACCESS-${prefix}-041`,
        deviceClass: domain === 'RAN' ? 'Cell Site' : 'Switch',
        sourceValue: '172.24.18.52',
        targetValue: '172.24.18.52',
        conditionMatched: condLabel,
        outcome: 'Matched',
        proposedAction: 'Mark verified · Reconciled identity'
      },
      {
        id: `IND-${cities[3]}-${prefix}-009`,
        name: `${cities[3]}-PE-${prefix}-009`,
        deviceClass: domain === 'RAN' ? 'gNodeB' : 'Router',
        sourceValue: 'Host: unresolved (timeout)',
        targetValue: 'IND-HYD-RTR-009',
        conditionMatched: condLabel,
        outcome: 'Exception',
        proposedAction: 'Raise unpolled attribute discrepancy ticket'
      },
      {
        id: `IND-${cities[4]}-${prefix}-077`,
        name: `${cities[4]}-LEAF-${prefix}-077`,
        deviceClass: domain === 'RAN' ? 'eNodeB' : 'Switch',
        sourceValue: 'Role: P-Router',
        targetValue: 'Role: PE-Router',
        conditionMatched: condLabel,
        outcome: 'Drift',
        proposedAction: 'Sync network role configuration attribute'
      },
      {
        id: `IND-${cities[5]}-${prefix}-032`,
        name: `${cities[5]}-CORE-${prefix}-032`,
        deviceClass: domain === 'RAN' ? 'gNodeB' : 'Router',
        sourceValue: 'Port: 48x10GE free: 12',
        targetValue: 'Port: 48x10GE free: 18',
        conditionMatched: condLabel,
        outcome: 'Drift',
        proposedAction: 'Update interface port availability capacity'
      },
      {
        id: `IND-${cities[6]}-${prefix}-018`,
        name: `${cities[6]}-DIST-${prefix}-018`,
        deviceClass: domain === 'RAN' ? 'Cell Site' : 'Router',
        sourceValue: 'MAC: 00:1A:2B:3C:4D:5E',
        targetValue: 'MAC: 00:1A:2B:3C:4D:99',
        conditionMatched: condLabel,
        outcome: 'Exception',
        proposedAction: 'Flag MAC address collision exception for review'
      }
    ];

    return {
      totalPopulation,
      matchedCount,
      driftCount,
      exceptionCount,
      totalAffected,
      affectedPct,
      matchPct: (matchRate * 100).toFixed(1),
      sampleRecords
    };
  }, [rule]);

  if (!open || !rule || !simulationResults) return null;

  const filteredSamples = simulationResults.sampleRecords.filter(r =>
    filterType === 'All' ? true : r.outcome === filterType
  );

  const handleSimulateRerun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 800);
  };

  return (
    <div className="job-modal-scrim" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="job-modal-panel"
        style={{ width: 'min(960px, 95vw)', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="job-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              className="job-modal-header-icon"
              style={{
                background: 'linear-gradient(135deg, var(--vw-color-emerald-500) 0%, var(--vw-color-teal-600) 100%)',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="job-modal-title">Rule Dry Run Simulation</h2>
                <DomainDot domain={rule.domain} />
                {'priority' in rule && <Chip tone="warning">{rule.priority} priority</Chip>}
              </div>
              <div className="job-modal-sub">
                Rule: <strong>{rule.name}</strong> · Impact assessment without applying mutations to Inventory or Reconciliation records
              </div>
            </div>
          </div>
          <button type="button" className="job-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="job-modal-body" style={{ padding: '24px', overflowY: 'auto' }}>
          {/* Top 4 KPI Metrics */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}
          >
            {/* KPI 1: Data Affected */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: 'linear-gradient(180deg, #fff 0%, var(--vw-color-amber-50) 100%)',
                border: '1px solid var(--vw-color-amber-200)',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)'
              }}
            >
              <div className="vw-card-metric-label" style={{ color: 'var(--vw-color-amber-800)' }}>
                Data Affected by Rule
              </div>
              <div className="vw-card-metric-xl num" style={{ color: 'var(--vw-color-amber-700)', margin: '4px 0' }}>
                {simulationResults.totalAffected.toLocaleString('en-IN')}
              </div>
              <div className="vw-card-metric-label-sub" style={{ color: 'var(--vw-color-amber-900)' }}>
                <strong>{simulationResults.affectedPct}%</strong> of total scanned population
              </div>
            </div>

            {/* KPI 2: Total Population */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: '#fff',
                border: '1px solid var(--vw-color-slate-200)'
              }}
            >
              <div className="vw-card-metric-label">Dataset Population</div>
              <div className="vw-card-metric-xl num" style={{ color: 'var(--vw-color-slate-800)', margin: '4px 0' }}>
                {simulationResults.totalPopulation.toLocaleString('en-IN')}
              </div>
              <div className="vw-card-metric-label-sub">
                Elements evaluated in {rule.domain}
              </div>
            </div>

            {/* KPI 3: Attribute Drift */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: '#fff',
                border: '1px solid var(--vw-color-slate-200)'
              }}
            >
              <div className="vw-card-metric-label">Attribute Updates / Drift</div>
              <div className="vw-card-metric-xl num" style={{ color: cv('cyan', 700), margin: '4px 0' }}>
                {simulationResults.driftCount.toLocaleString('en-IN')}
              </div>
              <div className="vw-card-metric-label-sub">
                Discrepancies to auto-resolve
              </div>
            </div>

            {/* KPI 4: Exceptions */}
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background: '#fff',
                border: '1px solid var(--vw-color-slate-200)'
              }}
            >
              <div className="vw-card-metric-label">Exceptions Flagged</div>
              <div className="vw-card-metric-xl num" style={{ color: cv('red', 700), margin: '4px 0' }}>
                {simulationResults.exceptionCount.toLocaleString('en-IN')}
              </div>
              <div className="vw-card-metric-label-sub">
                Require manual engineering review
              </div>
            </div>
          </div>

          {/* Safety & Execution Confidence Ribbon */}
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              background: 'var(--vw-color-emerald-50)',
              border: '1px solid var(--vw-color-emerald-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.125rem', color: 'var(--vw-color-emerald-600)' }}>✓</span>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--vw-color-emerald-900)' }}>
                  Dry Run Validation: Safe to Apply
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--vw-color-emerald-700)', marginLeft: '8px' }}>
                  No catastrophic overwrites detected. {simulationResults.matchPct}% of records strictly match identity criteria.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="nst-btn nst-btn--xs"
              onClick={handleSimulateRerun}
              disabled={isRunning}
              style={{ background: '#fff' }}
            >
              {isRunning ? '⟳ Simulating...' : '⟳ Re-run simulation'}
            </button>
          </div>

          {/* Conditions Evaluated */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--vw-color-slate-700)', marginBottom: '8px' }}>
              Conditions Evaluated in Simulation ({rule.conditions?.length || 1})
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {rule.conditions && rule.conditions.length > 0 ? (
                rule.conditions.map((c, i) => (
                  <div
                    key={c.id || i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      background: 'var(--vw-color-slate-100)',
                      borderRadius: '6px',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <span className="mono" style={{ fontWeight: 500 }}>{c.sourceField || 'Field'}</span>
                    <span style={{ color: 'var(--vw-color-blue-600)', fontWeight: 600 }}>{c.operator}</span>
                    <span className="mono" style={{ fontWeight: 500 }}>{c.targetField || 'Field'}</span>
                    {c.connector && <span className="mono" style={{ color: 'var(--vw-color-purple-600)', fontWeight: 700 }}>[{c.connector}]</span>}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--vw-color-slate-400)', fontSize: '0.8125rem' }}>No conditions specified</div>
              )}
            </div>
          </div>

          {/* Sample Affected Records Preview */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Sample Affected Records Preview</span>
                <span className="vw-card-metric-label-sub" style={{ marginLeft: '8px' }}>
                  Showing simulated evaluation on representative estate devices
                </span>
              </div>
              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['All', 'Drift', 'Exception', 'Matched'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: filterType === t ? 'var(--vw-color-slate-800)' : 'var(--vw-color-slate-100)',
                      color: filterType === t ? '#fff' : 'var(--vw-color-slate-600)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ border: '1px solid var(--vw-color-slate-200)', borderRadius: '8px', overflow: 'hidden' }}>
              <table className="nst-table" style={{ width: '100%', fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>Element / Identifier</th>
                    <th>Class</th>
                    <th>Source (Discovery)</th>
                    <th>Target (Inventory)</th>
                    <th>Outcome</th>
                    <th>Proposed Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSamples.map(sample => (
                    <tr key={sample.id}>
                      <td>
                        <span className="mono" style={{ fontWeight: 600 }}>{sample.id}</span>
                        <br />
                        <span className="vw-card-metric-label-sub">{sample.name}</span>
                      </td>
                      <td>{sample.deviceClass}</td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.75rem' }}>{sample.sourceValue}</span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.75rem' }}>{sample.targetValue}</span>
                      </td>
                      <td>
                        <Chip
                          tone={
                            sample.outcome === 'Matched'
                              ? 'success'
                              : sample.outcome === 'Drift'
                              ? 'warning'
                              : 'error'
                          }
                        >
                          {sample.outcome}
                        </Chip>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--vw-color-slate-700)' }}>
                          {sample.proposedAction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="job-modal-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid var(--vw-color-slate-100)',
            background: 'var(--vw-color-slate-50)'
          }}
        >
          <div className="vw-card-metric-label-sub">
            Dry run completed in <strong>3.2s</strong> · Simulation timestamp: just now
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="nst-btn nst-btn--sm" onClick={onClose}>
              Close simulation
            </button>
            {onApplyLive && (
              <button
                type="button"
                className="nst-btn nst-btn--sm nst-btn--filled"
                onClick={() => {
                  onApplyLive();
                  onClose();
                }}
                style={{
                  background: 'linear-gradient(135deg, var(--vw-color-emerald-600) 0%, var(--vw-color-teal-600) 100%)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600
                }}
              >
                Apply & run live
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
