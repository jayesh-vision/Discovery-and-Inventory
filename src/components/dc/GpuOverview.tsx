/* Cluster cards above the GPU server list (once a data center is picked). Counts come from the
   records in scope (all data centers, or the one picked), never typed in. */
import { Card, Sub } from '../ui';
import type { DcGpuCluster, DcGpuNode } from '../../data/dc';

export function GpuOverview({ nodes, clusters, scoped }: { nodes: DcGpuNode[]; clusters: DcGpuCluster[]; scoped: boolean }) {
  if (!nodes.length) return null;
  return (
    <div className="dcim dc-gpu-over">
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
