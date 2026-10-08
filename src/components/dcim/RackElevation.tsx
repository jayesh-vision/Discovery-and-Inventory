/* Rack elevation, front and rear, one row per rack unit (U1 at the bottom).
   A full-depth chassis shows on both faces (it blocks both); a half-depth
   device only on its own face. Rack PDUs from PowerEquipment (type
   RACK_PDU, RackId = this rack) are drawn as zero-U strips on the rear. */
import type { Device, PowerEquipment, Rack } from '../../dcim/model';
import type { RackOccupancy } from '../../dcim/derive';

const TYPE_HEX: Record<string, string> = {
  SERVER: '#cbd5e1', GPU_SERVER: '#a5b4fc', STORAGE: '#fcd34d', SWITCH: '#7dd3fc', ROUTER: '#67e8f9', FIREWALL: '#fca5a5',
  PATCH_PANEL: '#e5e7eb', ODF: '#e5e7eb', KVM: '#d9f99d', OTHER: '#e2e8f0'
};

const UH = 13, W = 190, GUT = 26;

function Face({ rack, devices, face, pdus, selected, onDevice, problemIds, x0 }: {
  rack: Rack; devices: Device[]; face: 'FRONT' | 'REAR'; pdus: PowerEquipment[]; selected?: string | null;
  onDevice: (id: string) => void; problemIds: Set<string>; x0: number;
}) {
  const H = rack.heightU * UH;
  const shown = devices.filter(d => d.uStart && (d.face === face || d.fullDepth));
  return (
    <g transform={`translate(${x0} 20)`}>
      <text x={GUT + W / 2} y={-8} textAnchor="middle" fontSize={11} fill="#334155" fontWeight={600}>{face === 'FRONT' ? 'Front' : 'Rear'}</text>
      <rect x={GUT} y={0} width={W} height={H} fill="#f8fafc" stroke="#334155" strokeWidth={1.5} />
      {Array.from({ length: rack.heightU }, (_, i) => {
        const u = rack.heightU - i;
        return <g key={u}>
          <line x1={GUT} x2={GUT + W} y1={i * UH} y2={i * UH} stroke="#e2e8f0" strokeWidth={0.5} />
          {(u % 5 === 0 || u === 1) && <text x={GUT - 4} y={i * UH + UH - 3} textAnchor="end" fontSize={8} fill="#64748b">{u}</text>}
        </g>;
      })}
      {face === 'REAR' && pdus.map((p, i) => (
        <g key={p.id}>
          <rect x={i % 2 ? GUT + W - 7 : GUT + 1} y={2} width={6} height={H - 4} rx={2} fill={p.side === 'B' ? '#c4b5fd' : '#93c5fd'} stroke="#475569" strokeWidth={0.5} />
          <title>{p.name} · side {p.side}{p.ratingKw ? ` · ${p.ratingKw} kW` : ''}</title>
        </g>
      ))}
      {shown.map(d => {
        const top = (rack.heightU - (d.uStart! + Math.max(d.uHeight, 1) - 1)) * UH;
        const h = Math.max(d.uHeight, 1) * UH;
        const mine = d.face === face;
        const bad = problemIds.has(d.id);
        return (
          <g key={d.id} className="elev-dev" tabIndex={0} role="button" aria-label={`${d.name}, U${d.uStart}${d.uHeight > 1 ? `–U${d.uStart! + d.uHeight - 1}` : ''}`}
            onClick={() => onDevice(d.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDevice(d.id); } }}>
            <rect x={GUT + 9} y={top + 0.5} width={W - 18} height={h - 1} rx={2}
              fill={mine ? TYPE_HEX[d.type] ?? '#e2e8f0' : '#f1f5f9'} fillOpacity={mine ? 1 : 0.9}
              stroke={bad ? '#dc2626' : selected === d.id ? '#0284c7' : '#475569'} strokeWidth={bad || selected === d.id ? 2 : 0.6}
              strokeDasharray={mine ? undefined : '3 2'} />
            {h >= UH && <text x={GUT + 15} y={top + Math.min(h, UH) / 2 + 3.5 + (h > UH ? (h - UH) / 2 : 0)} fontSize={9} fill={mine ? '#0f172a' : '#94a3b8'}>
              {(mine ? d.name : `${d.name} (full depth)`).slice(0, 30)}
            </text>}
            <title>{d.name} · {d.type} · U{d.uStart}{d.uHeight > 1 ? `–${d.uStart! + d.uHeight - 1}` : ''} · {d.face.toLowerCase()}{d.fullDepth ? ', full depth' : ''}{d.model ? ` · ${d.vendor ?? ''} ${d.model}` : ''}</title>
          </g>
        );
      })}
    </g>
  );
}

export default function RackElevation({ occ, devices, pdus, selected, onDevice }: {
  occ: RackOccupancy; devices: Device[]; pdus: PowerEquipment[]; selected?: string | null; onDevice: (id: string) => void;
}) {
  const rack = occ.rack;
  const problemIds = new Set(occ.problems.map(p => p.deviceId));
  const inRack = devices.filter(d => d.rackId === rack.id);
  const H = rack.heightU * UH + 32;
  return (
    <div className="elev">
      <svg width={2 * (W + GUT) + 30} height={H} role="img" aria-label={`Elevation of rack ${rack.name}, ${rack.heightU}U`}>
        <Face rack={rack} devices={inRack} face="FRONT" pdus={pdus} selected={selected} onDevice={onDevice} problemIds={problemIds} x0={0} />
        <Face rack={rack} devices={inRack} face="REAR" pdus={pdus} selected={selected} onDevice={onDevice} problemIds={problemIds} x0={W + GUT + 30} />
      </svg>
    </div>
  );
}
