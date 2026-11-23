import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  Ban,
  Box,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Flame,
  Gauge,
  GitBranch,
  Hourglass,
  Inbox,
  Layers,
  Lock,
  Play,
  Power,
  Recycle,
  Shield,
  Skull,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Timer,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import type {
  FlowCallout,
  FlowEdge,
  FlowNode,
  FlowScene,
  FlowZone,
  Tone,
} from '../../types/lesson';

const VIEW_W = 1000;
const VIEW_H = 580;

const TONES: Tone[] = ['neutral', 'blue', 'green', 'orange', 'rose', 'violet', 'teal'];

function toneFill(tone: Tone | undefined): string {
  if (!tone || tone === 'neutral') return 'var(--sheet)';
  return `var(--${tone})`;
}

function toneStroke(tone: Tone | undefined): string {
  if (!tone || tone === 'neutral') return 'var(--edge)';
  return `var(--${tone}-stroke)`;
}

const ICONS: Record<string, typeof Zap> = {
  zap: Zap,
  cpu: Cpu,
  layers: Layers,
  queue: Inbox,
  shield: Shield,
  clock: Clock,
  timer: Timer,
  hourglass: Hourglass,
  alert: AlertTriangle,
  check: CheckCircle2,
  ban: Ban,
  skull: Skull,
  flame: Flame,
  lock: Lock,
  database: Database,
  box: Box,
  terminal: Terminal,
  play: Play,
  power: Power,
  recycle: Recycle,
  trash: Trash2,
  users: Users,
  gauge: Gauge,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  branch: GitBranch,
  inbox: ArrowDownToLine,
};

interface AnchorRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
  shape: 'box' | 'diamond' | 'pill';
}

function nodeRect(n: FlowNode): AnchorRect {
  const isDiamond = n.shape === 'diamond';
  return {
    cx: n.x,
    cy: n.y,
    w: n.w ?? (isDiamond ? 190 : 176),
    h: n.h ?? (isDiamond ? 84 : 60),
    shape: n.shape ?? 'box',
  };
}

function zoneRect(z: FlowZone): AnchorRect {
  return { cx: z.x + z.w / 2, cy: z.y + z.h / 2, w: z.w, h: z.h, shape: 'box' };
}

/** Intersection of the ray center→(tx,ty) with the shape boundary (+pad). */
function boundaryPoint(r: AnchorRect, tx: number, ty: number, pad = 3): [number, number] {
  const dx = tx - r.cx;
  const dy = ty - r.cy;
  if (dx === 0 && dy === 0) return [r.cx, r.cy];
  const hw = r.w / 2 + pad;
  const hh = r.h / 2 + pad;
  let t: number;
  if (r.shape === 'diamond') {
    t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
  } else {
    t = Math.min(
      Math.abs(dx) > 1e-6 ? hw / Math.abs(dx) : Infinity,
      Math.abs(dy) > 1e-6 ? hh / Math.abs(dy) : Infinity,
    );
  }
  return [r.cx + dx * t, r.cy + dy * t];
}

function roundedPolylinePath(pts: [number, number][], radius = 10): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py);
    const l2 = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const ax = cx - ((cx - px) / (l1 || 1)) * r;
    const ay = cy - ((cy - py) / (l1 || 1)) * r;
    const bx = cx + ((nx - cx) / (l2 || 1)) * r;
    const by = cy + ((ny - cy) / (l2 || 1)) * r;
    d += ` L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${cx} ${cy} ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

function pointAlongPolyline(pts: [number, number][], frac: number): [number, number] {
  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(l);
    total += l;
  }
  let target = total * Math.max(0, Math.min(1, frac));
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const t = segs[i] > 0 ? target / segs[i] : 0;
      return [
        pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t,
      ];
    }
    target -= segs[i];
  }
  return pts[pts.length - 1];
}

function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    w += ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.62;
  }
  return w;
}

function edgeKey(e: FlowEdge): string {
  return e.id ?? `${e.from}->${e.to}`;
}

export interface FlowSvgProps {
  scene: FlowScene;
  prevScene?: FlowScene;
  enterKey: string;
  reducedMotion: boolean;
}

export function FlowSvg({ scene, prevScene, enterKey, reducedMotion }: FlowSvgProps) {
  const anchors = new Map<string, AnchorRect>();
  for (const z of scene.zones ?? []) anchors.set(z.id, zoneRect(z));
  for (const n of scene.nodes) anchors.set(n.id, nodeRect(n));

  const prevNodeIds = new Set(prevScene?.nodes.map((n) => n.id) ?? []);
  const prevZoneIds = new Set(prevScene?.zones?.map((z) => z.id) ?? []);
  const prevEdgeKeys = new Set(prevScene?.edges.map(edgeKey) ?? []);
  const hasPrev = !!prevScene;

  const renderEdge = (e: FlowEdge, idx: number) => {
    const from = anchors.get(e.from);
    const to = anchors.get(e.to);
    if (!from || !to) return null;
    const via = e.via ?? [];
    const startToward = via[0] ?? [to.cx, to.cy];
    const endToward = via.length > 0 ? via[via.length - 1] : [from.cx, from.cy];
    const start = boundaryPoint(from, startToward[0], startToward[1]);
    const end = boundaryPoint(to, endToward[0], endToward[1]);
    const pts: [number, number][] = [start, ...via, end];
    const d = roundedPolylinePath(pts);
    const status = e.status ?? 'normal';
    const stroke =
      status === 'error'
        ? 'var(--rose-stroke)'
        : e.tone
          ? toneStroke(e.tone)
          : 'var(--edge)';
    const strokeWidth = status === 'active' ? 2.4 : 1.7;
    const opacity = status === 'dimmed' ? 0.32 : 1;
    const isNew = hasPrev && !prevEdgeKeys.has(edgeKey(e));
    const markerTone = status === 'error' ? 'rose' : (e.tone ?? 'neutral');

    const labelPos = e.label ? pointAlongPolyline(pts, e.labelAt ?? 0.5) : null;
    const packetCount = reducedMotion ? 0 : (e.packets ?? 0);
    const dur = 2.6 / (e.packetSpeed ?? 1);

    return (
      <g key={`edge-${edgeKey(e)}-${idx}`} opacity={opacity}>
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={e.dashed ? '7 5' : undefined}
          pathLength={isNew && !e.dashed ? 1 : undefined}
          className={
            isNew
              ? e.dashed
                ? 'stage-edge-enter'
                : 'stage-edge-draw'
              : e.dashed && status === 'active'
                ? 'stage-dash-flow'
                : undefined
          }
          markerEnd={`url(#juc-arrow-${markerTone})`}
        />
        {labelPos && e.label && (
          <text
            x={labelPos[0]}
            y={labelPos[1] - 7}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={700}
            fill={status === 'error' ? 'var(--rose-stroke)' : 'var(--ink-2)'}
            stroke="var(--stage-bg)"
            strokeWidth={4}
            paintOrder="stroke"
            className={isNew ? 'stage-label-enter' : undefined}
          >
            {e.label}
          </text>
        )}
        {packetCount > 0 &&
          Array.from({ length: packetCount }, (_, i) => (
            <circle
              key={`pkt-${enterKey}-${i}`}
              r={4.2}
              fill={stroke}
              stroke="var(--stage-bg)"
              strokeWidth={1.4}
              className="stage-packet-enter"
            >
              <animateMotion
                dur={`${dur.toFixed(2)}s`}
                repeatCount="indefinite"
                path={d}
                begin={`${(-(i * dur) / packetCount).toFixed(2)}s`}
              />
            </circle>
          ))}
      </g>
    );
  };

  const renderNode = (n: FlowNode) => {
    const r = nodeRect(n);
    const isNew = hasPrev && !prevNodeIds.has(n.id);
    const fill = toneFill(n.tone);
    const accent = toneStroke(n.tone);
    const Icon = n.icon ? ICONS[n.icon] : undefined;
    const isDiamond = n.shape === 'diamond';
    const isPill = n.shape === 'pill';
    const rx = isPill ? r.h / 2 : 9;

    const shadowShape = isDiamond ? (
      <polygon
        points={`0,${-r.h / 2} ${r.w / 2},0 0,${r.h / 2} ${-r.w / 2},0`}
        transform="translate(2.5 3)"
        fill="var(--edge)"
        opacity={0.8}
      />
    ) : (
      <rect
        x={-r.w / 2 + 2.5}
        y={-r.h / 2 + 3}
        width={r.w}
        height={r.h}
        rx={rx}
        fill="var(--edge)"
        opacity={0.8}
      />
    );

    const mainShape = isDiamond ? (
      <polygon
        points={`0,${-r.h / 2} ${r.w / 2},0 0,${r.h / 2} ${-r.w / 2},0`}
        fill={fill}
        stroke="var(--edge)"
        strokeWidth={1.6}
      />
    ) : (
      <rect
        x={-r.w / 2}
        y={-r.h / 2}
        width={r.w}
        height={r.h}
        rx={rx}
        fill={fill}
        stroke="var(--edge)"
        strokeWidth={1.6}
      />
    );

    const pulseShape = isDiamond ? (
      <polygon
        points={`0,${-r.h / 2 - 5} ${r.w / 2 + 7},0 0,${r.h / 2 + 5} ${-r.w / 2 - 7},0`}
        fill="none"
        stroke={accent}
        strokeWidth={5}
        className="stage-active-pulse"
      />
    ) : (
      <rect
        x={-r.w / 2 - 6}
        y={-r.h / 2 - 6}
        width={r.w + 12}
        height={r.h + 12}
        rx={rx + 5}
        fill="none"
        stroke={accent}
        strokeWidth={5}
        className="stage-active-pulse"
      />
    );

    const badgeW = n.badge ? estimateTextWidth(n.badge, 9) + 14 : 0;

    return (
      <g
        key={`node-${n.id}`}
        transform={`translate(${n.x} ${n.y})`}
        opacity={n.dimmed ? 0.38 : 1}
      >
        <g className={isNew ? 'stage-node-enter' : undefined}>
          {n.active && pulseShape}
          {shadowShape}
          {mainShape}
          {Icon && !isDiamond && (
            <Icon
              x={-r.w / 2 + 9}
              y={-r.h / 2 + 8}
              size={14}
              strokeWidth={2.3}
              color={accent}
            />
          )}
          <text
            x={0}
            y={n.sublabel ? (isDiamond ? -3 : -2) : 4}
            textAnchor="middle"
            fontSize={isDiamond ? 11 : 12.5}
            fontWeight={800}
            fill="var(--ink)"
          >
            {n.label}
          </text>
          {n.sublabel && (
            <text
              x={0}
              y={isDiamond ? 14 : 15}
              textAnchor="middle"
              fontSize={9.6}
              fontWeight={600}
              fill="var(--muted)"
            >
              {n.sublabel}
            </text>
          )}
          {n.badge && (
            <g transform={`translate(${r.w / 2 - badgeW + 8} ${-r.h / 2 - 9})`}>
              <rect
                width={badgeW}
                height={17}
                rx={8.5}
                fill={accent}
                stroke="var(--edge)"
                strokeWidth={1}
              />
              <text
                x={badgeW / 2}
                y={12}
                textAnchor="middle"
                fontSize={9}
                fontWeight={800}
                fill="var(--stage-bg)"
              >
                {n.badge}
              </text>
            </g>
          )}
        </g>
      </g>
    );
  };

  const renderZone = (z: FlowZone) => {
    const isNew = hasPrev && !prevZoneIds.has(z.id);
    const accent = toneStroke(z.tone);
    const cols = z.columns ?? 2;
    const items = z.items ?? [];
    const cardGap = 8;
    const cardW = (z.w - 24 - (cols - 1) * cardGap) / cols;
    const cardH = 46;

    let slotsNode: ReactNode = null;
    if (z.slots) {
      const s = z.slots;
      const slotW = 24;
      const slotH = 28;
      const gap = 6;
      const maxPerRow = Math.max(1, Math.floor((z.w - 24 + gap) / (slotW + gap)));
      const shown = Math.min(s.total, maxPerRow * 2);
      slotsNode = (
        <g>
          {Array.from({ length: shown }, (_, i) => {
            const row = Math.floor(i / maxPerRow);
            const col = i % maxPerRow;
            const sx = z.x + 12 + col * (slotW + gap);
            const sy = z.y + 32 + row * (slotH + 6);
            const filled = i < s.filled;
            return (
              <rect
                key={`slot-${z.id}-${i}`}
                x={sx}
                y={sy}
                width={slotW}
                height={slotH}
                rx={4}
                fill={filled ? toneFill(s.tone ?? 'orange') : 'url(#juc-hatch)'}
                stroke={filled ? 'var(--edge)' : 'var(--line-strong)'}
                strokeWidth={filled ? 1.4 : 1}
              />
            );
          })}
          {s.headLabel && (
            <text
              x={z.x + 12}
              y={z.y + 32 + slotH + 14}
              fontSize={9}
              fontWeight={700}
              fill="var(--muted)"
            >
              {s.headLabel}
            </text>
          )}
          {s.tailLabel && (
            <text
              x={z.x + z.w - 12}
              y={z.y + 32 + slotH + 14}
              textAnchor="end"
              fontSize={9}
              fontWeight={700}
              fill="var(--muted)"
            >
              {s.tailLabel}
            </text>
          )}
        </g>
      );
    }

    return (
      <g key={`zone-${z.id}`} className={isNew ? 'stage-zone-enter' : undefined}>
        <rect
          x={z.x}
          y={z.y}
          width={z.w}
          height={z.h}
          rx={10}
          fill="var(--sheet)"
          fillOpacity={0.6}
          stroke={z.tone ? accent : 'var(--line-strong)'}
          strokeWidth={1.5}
          strokeDasharray={z.dashed ? '7 5' : undefined}
        />
        <circle cx={z.x + 15} cy={z.y + 16} r={4} fill={accent} stroke="var(--edge)" strokeWidth={1} />
        <text x={z.x + 26} y={z.y + 20} fontSize={11} fontWeight={800} fill="var(--ink)">
          {z.label}
        </text>
        {z.sublabel && (
          <text
            x={z.x + z.w - 12}
            y={z.y + 20}
            textAnchor="end"
            fontSize={9.4}
            fontWeight={600}
            fill="var(--muted)"
          >
            {z.sublabel}
          </text>
        )}
        {slotsNode}
        {items.map((item, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const ix = z.x + 12 + col * (cardW + cardGap);
          const iy = z.y + 32 + row * (cardH + cardGap);
          const itemAccent = toneStroke(item.tone);
          const stateLabel =
            item.state === 'running'
              ? 'RUN'
              : item.state === 'idle'
                ? 'WAIT'
                : item.state === 'poll'
                  ? 'POLL'
                  : item.state === 'dead'
                    ? 'EXIT'
                    : undefined;
          return (
            <g key={`item-${z.id}-${i}`} transform={`translate(${ix} ${iy})`}>
              <rect x={1.5} y={2} width={cardW} height={cardH} rx={6} fill="var(--edge)" opacity={0.7} />
              <rect
                width={cardW}
                height={cardH}
                rx={6}
                fill={toneFill(item.tone)}
                stroke="var(--edge)"
                strokeWidth={1.3}
              />
              {item.state === 'running' && (
                <g clipPath={`url(#juc-clip-${z.id}-${i})`}>
                  <clipPath id={`juc-clip-${z.id}-${i}`}>
                    <rect width={cardW} height={cardH} rx={6} />
                  </clipPath>
                  <rect
                    x={-16}
                    y={cardH - 7}
                    width={cardW + 32}
                    height={7}
                    fill="url(#juc-runstripe)"
                    className="stage-running-stripe"
                  />
                </g>
              )}
              <text x={9} y={18} fontSize={10.5} fontWeight={800} fill="var(--ink)">
                {item.label}
              </text>
              {item.sublabel && (
                <text x={9} y={33} fontSize={8.8} fontWeight={600} fill="var(--muted)">
                  {item.sublabel}
                </text>
              )}
              {stateLabel && (
                <text
                  x={cardW - 8}
                  y={18}
                  textAnchor="end"
                  fontSize={8.6}
                  fontWeight={800}
                  fill={itemAccent}
                >
                  {stateLabel}
                </text>
              )}
              {item.badge && (
                <text
                  x={cardW - 8}
                  y={33}
                  textAnchor="end"
                  fontSize={8.6}
                  fontWeight={700}
                  fill="var(--muted)"
                >
                  {item.badge}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  const renderCallout = (c: FlowCallout, idx: number) => {
    const w = estimateTextWidth(c.text, 10.5) + 22;
    const h = 25;
    return (
      <g key={`callout-${idx}-${c.text}`} transform={`translate(${c.x} ${c.y})`}>
        <g className="stage-label-enter">
          <rect x={1.5} y={2} width={w} height={h} rx={7} fill="var(--edge)" opacity={0.75} />
          <rect
            width={w}
            height={h}
            rx={7}
            fill={toneFill(c.tone)}
            stroke="var(--edge)"
            strokeWidth={1.3}
          />
          <text x={w / 2} y={16.5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--ink)">
            {c.text}
          </text>
        </g>
      </g>
    );
  };

  return (
    <svg
      className="stage-svg"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={scene.title ?? '线程池流程示意图'}
    >
      <defs>
        <pattern id="juc-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--stage-slot-empty)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--stage-swatch-hatch)" strokeWidth="2" />
        </pattern>
        <pattern id="juc-runstripe" width="16" height="7" patternUnits="userSpaceOnUse">
          <rect width="16" height="7" fill="var(--green-2)" />
          <path d="M -4 7 L 4 0 M 4 7 L 12 0 M 12 7 L 20 0" stroke="var(--green-stroke)" strokeWidth="3" />
        </pattern>
        <pattern id="juc-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1.2" fill="var(--grid-dot)" />
        </pattern>
        {TONES.map((t) => (
          <marker
            key={t}
            id={`juc-arrow-${t}`}
            viewBox="0 0 10 10"
            refX="8.5"
            refY="5"
            markerWidth="7.5"
            markerHeight="7.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill={toneStroke(t)} />
          </marker>
        ))}
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#juc-grid)" />
      {(scene.zones ?? []).map(renderZone)}
      {scene.edges.map(renderEdge)}
      {scene.nodes.map(renderNode)}
      {(scene.callouts ?? []).map(renderCallout)}
    </svg>
  );
}