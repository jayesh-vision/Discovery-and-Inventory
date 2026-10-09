/* Model mix and cluster cards above the GPU server list. Counts come from the
   records in scope (all data centers, or the one picked), never typed in. */
import { Card, Sub } from '../ui';
import { Head } from '../dcim/common';
import type { DcGpuCluster, DcGpuNode } from '../../data/dc';

const MODEL_COLOR: Record<string, string> = {
  'H100 SXM 80 GB': '#5b9cf5', 'H200 SXM 141 GB': '#2fb986', 'A100 SXM 80 GB': '#9b7cf0', 'B200 SXM 192 GB': '#e5484d',
  'L40S PCIe 48 GB': '#e39b3b', 'T4 PCIe 16 GB': '#94a3b8', 'Gaudi 3 OAM 128 GB': '#14b8a6', 'Max 1550 OAM 128 GB': '#d946ef'
};

export function GpuOverview({ nodes, clusters, dcLabel, scoped }: { nodes: DcGpuNode[]; clusters: DcGpuCluster[]; dcLabel: string; scoped: boolean }) {
  const mix = Object.entries(nodes.reduce<Record<string, number>>((m, n) => ((m[n.model] = (m[n.model] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  if (!nodes.length) return null;
  return (
    <div className="dcim dc-gpu-over">
      <div className="dc-box">
        <Head title="GPU models" sub={`${nodes.length.toLocaleString('en-IN')} GPU servers · ${(nodes.length * 8).toLocaleString('en-IN')} GPUs · ${dcLabel}`} />
        <div className="dc-mix" role="img" aria-label={mix.map(([m, c]) => `${m}: ${c}`).join(', ')}>
          {mix.map(([m, c]) => <i key={m} style={{ width: `${c / nodes.length * 100}%`, background: MODEL_COLOR[m] ?? '#94a3b8' }} title={`${m}: ${c}`} />)}
        </div>
        <div className="dc-legend">{mix.map(([m, c]) => <span key={m}><i style={{ background: MODEL_COLOR[m] ?? '#94a3b8' }} />{m} · {c}</span>)}</div>
      </div>
      {!scoped && clusters.length > 0 && (
        <p className="muted small" style={{ margin: 0 }}>{clusters.length} clusters across {new Set(clusters.map(c => c.dcId)).size} data centers. Pick a data center to see its clusters.</p>
      )}
      {scoped && clusters.length > 0 && (
        <div className="dc-pods">
          {clusters.map(c => {
            const ns = nodes.filter(n => n.clusterId === c.id);
            const n = (s: string) => ns.filter(x => x.state === s).length;
            return (
              <Card key={c.id} className="dc-pod">
                <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}><span className="vw-card-title-sm">{c.name}</span><span className="muted small">{c.scheduler}</span></div>
                <Sub>{c.model} · {c.nodes.length} servers · {c.nodes.length * 8} GPUs</Sub>
                <Sub>{c.fabric}</Sub>
                <Sub>{c.dcId} · {c.room} · {c.cooling === 'liquid' ? 'liquid' : 'air'}-cooled</Sub>
                <div className="dc-legend"><span>{n('in-job')} in a job</span><span>{n('idle')} idle</span>{n('burn-in') > 0 && <span>{n('burn-in')} burn-in</span>}{n('drained') + n('failed') > 0 && <span>{n('drained') + n('failed')} drained or failed</span>}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
