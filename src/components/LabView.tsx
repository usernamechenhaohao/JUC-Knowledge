import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Ban,
  FlaskConical,
  Inbox,
  Pause,
  Play,
  RotateCcw,
  Send,
  Timer,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  DEFAULT_CONFIG,
  PoolSimEngine,
  type DecisionKind,
  type LogKind,
  type RejectPolicy,
  type SimConfig,
  type SimSnapshot,
} from '../sim/engine';

const POLICY_OPTIONS: { value: RejectPolicy; label: string; hint: string }[] = [
  { value: 'abort', label: 'Abort', hint: '抛异常（默认）' },
  { value: 'caller', label: 'CallerRuns', hint: '调用者执行·反压' },
  { value: 'discard', label: 'Discard', hint: '静默丢弃' },
  { value: 'oldest', label: 'DiscardOldest', hint: '丢队头重试' },
];

const DECISION_STEPS: { kind: DecisionKind; label: string; sub: string }[] = [
  { kind: 'core', label: '① 核心线程', sub: 'wc < corePoolSize' },
  { kind: 'enqueue', label: '② 入队', sub: 'queue.offer()' },
  { kind: 'expand', label: '③ 扩容', sub: 'wc < maximumPoolSize' },
  { kind: 'reject', label: '④ 拒绝', sub: 'RejectedHandler' },
];

const LOG_KIND_LABEL: Record<LogKind, string> = {
  submit: '提交',
  core: '核心',
  enqueue: '入队',
  expand: '扩容',
  reject: '拒绝',
  caller: '反压',
  discard: '丢弃',
  oldest: '丢队头',
  done: '完成',
  retire: '回收',
  config: '配置',
};

interface LabSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}

function LabSlider({ label, value, min, max, step, display, onChange }: LabSliderProps) {
  return (
    <label className="lab-slider-row">
      <span className="lab-slider-head">
        <span className="lab-slider-label">{label}</span>
        <span className="lab-slider-value">{display}</span>
      </span>
      <input
        type="range"
        className="lab-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

interface StatChipProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: 'neutral' | 'blue' | 'green' | 'orange' | 'rose' | 'violet';
}

function StatChip({ icon: Icon, label, value, tone = 'neutral' }: StatChipProps) {
  return (
    <div className={`lab-stat-chip lab-stat-chip--${tone}`}>
      <Icon size={14} aria-hidden="true" />
      <span className="lab-stat-label">{label}</span>
      <span className="lab-stat-value">{value}</span>
    </div>
  );
}

export function LabView() {
  const engineRef = useRef<PoolSimEngine | null>(null);
  if (!engineRef.current) engineRef.current = new PoolSimEngine(DEFAULT_CONFIG);
  const engine = engineRef.current;

  const [config, setConfig] = useState<SimConfig>({ ...DEFAULT_CONFIG });
  const [running, setRunning] = useState(true);
  const [snap, setSnap] = useState<SimSnapshot>(() => engine.snapshot());

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      engine.tick(100);
      setSnap(engine.snapshot());
    }, 100);
    return () => window.clearInterval(id);
  }, [running, engine]);

  const patchConfig = (patch: Partial<SimConfig>) => {
    const next = { ...config, ...patch };
    if (patch.corePoolSize !== undefined && next.corePoolSize > next.maximumPoolSize) {
      next.maximumPoolSize = next.corePoolSize;
    }
    if (patch.maximumPoolSize !== undefined && next.maximumPoolSize < next.corePoolSize) {
      next.corePoolSize = next.maximumPoolSize;
    }
    engine.setConfig(next);
    setConfig(next);
    setSnap(engine.snapshot());
  };

  const doSubmit = () => {
    engine.submit('manual');
    setSnap(engine.snapshot());
  };
  const doBurst = () => {
    engine.burst(5);
    setSnap(engine.snapshot());
  };
  const doReset = () => {
    engine.reset();
    setSnap(engine.snapshot());
  };

  const decisionFresh = snap.timeMs - snap.lastDecisionAtMs < 1200;
  const { stats } = snap;
  const queueFull = snap.queue.length >= config.queueCapacity;
  const timedMode = snap.workers.length > config.corePoolSize || config.allowCoreThreadTimeOut;

  return (
    <div className="lab-root">
      <header className="lab-hero">
        <div className="lab-hero-text">
          <span className="lab-hero-eyebrow">
            <FlaskConical size={13} aria-hidden="true" /> LIVE SIMULATOR · 实时模拟
          </span>
          <h1 className="lab-hero-title">线程池实验台</h1>
          <p className="lab-hero-sub">
            亲手调节 ThreadPoolExecutor 七大参数，观察「先核心 → 再入队 → 再扩容 → 最后拒绝」的每一步决策与线程回收。
          </p>
        </div>
        <div className="lab-stats-row" role="status" aria-label="线程池实时统计">
          <StatChip icon={Send} label="已提交" value={String(stats.submitted)} tone="blue" />
          <StatChip icon={Activity} label="已完成" value={String(stats.completed)} tone="green" />
          <StatChip icon={Users} label="峰值线程" value={String(stats.largestPoolSize)} tone="violet" />
          <StatChip icon={Ban} label="拒绝" value={String(stats.rejected)} tone={stats.rejected > 0 ? 'rose' : 'neutral'} />
          <StatChip icon={Timer} label="运行" value={`${(snap.timeMs / 1000).toFixed(1)}s`} />
        </div>
      </header>

      <div className="lab-grid">
        {/* ---- Controls (permanently visible) ---- */}
        <section className="lab-controls" aria-label="线程池参数控制区">
          <h2 className="lab-panel-title">参数控制 · PARAMETERS</h2>

          <LabSlider
            label="corePoolSize 核心线程数"
            value={config.corePoolSize}
            min={0}
            max={8}
            step={1}
            display={String(config.corePoolSize)}
            onChange={(v) => patchConfig({ corePoolSize: v })}
          />
          <LabSlider
            label="maximumPoolSize 最大线程数"
            value={config.maximumPoolSize}
            min={1}
            max={12}
            step={1}
            display={String(config.maximumPoolSize)}
            onChange={(v) => patchConfig({ maximumPoolSize: v })}
          />
          <LabSlider
            label="队列容量 workQueue"
            value={config.queueCapacity}
            min={0}
            max={24}
            step={1}
            display={config.queueCapacity === 0 ? '0 (Synchronous)' : String(config.queueCapacity)}
            onChange={(v) => patchConfig({ queueCapacity: v })}
          />
          <LabSlider
            label="keepAliveTime 空闲存活"
            value={config.keepAliveMs / 1000}
            min={1}
            max={15}
            step={0.5}
            display={`${(config.keepAliveMs / 1000).toFixed(1)}s`}
            onChange={(v) => patchConfig({ keepAliveMs: v * 1000 })}
          />
          <LabSlider
            label="任务耗时 taskDuration"
            value={config.taskDurationMs / 1000}
            min={0.5}
            max={8}
            step={0.5}
            display={`${(config.taskDurationMs / 1000).toFixed(1)}s`}
            onChange={(v) => patchConfig({ taskDurationMs: v * 1000 })}
          />
          <LabSlider
            label="自动提交速率 autoRate"
            value={config.autoRate}
            min={0}
            max={8}
            step={0.2}
            display={config.autoRate === 0 ? '关闭' : `${config.autoRate.toFixed(1)} 任务/s`}
            onChange={(v) => patchConfig({ autoRate: v })}
          />

          <div className="lab-control-block">
            <span className="lab-slider-label">拒绝策略 RejectedExecutionHandler</span>
            <div className="lab-policy-grid" role="radiogroup" aria-label="拒绝策略">
              {POLICY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={config.policy === opt.value}
                  className={`lab-policy-btn lab-policy-btn--${opt.value} ${config.policy === opt.value ? 'lab-policy-btn--active' : ''}`}
                  onClick={() => patchConfig({ policy: opt.value })}
                >
                  <span className="lab-policy-name">{opt.label}</span>
                  <span className="lab-policy-hint">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="lab-toggle-row"
            role="switch"
            aria-checked={config.allowCoreThreadTimeOut}
            onClick={() => patchConfig({ allowCoreThreadTimeOut: !config.allowCoreThreadTimeOut })}
          >
            <span className="lab-toggle-text">
              <span className="lab-slider-label">allowCoreThreadTimeOut</span>
              <span className="lab-toggle-hint">核心线程也参与空闲超时回收</span>
            </span>
            <span className={`lab-switch ${config.allowCoreThreadTimeOut ? 'lab-switch--on' : ''}`}>
              <span className="lab-switch-knob" />
            </span>
          </button>

          <div className="lab-actions">
            <button type="button" className="tactile-btn tactile-btn--primary lab-action-btn" onClick={doSubmit}>
              <Send size={14} aria-hidden="true" /> 提交任务
            </button>
            <button type="button" className="tactile-btn lab-action-btn" onClick={doBurst}>
              <Zap size={14} aria-hidden="true" /> 突发 ×5
            </button>
            <button
              type="button"
              className="tactile-btn lab-action-btn"
              onClick={() => setRunning((v) => !v)}
              aria-pressed={!running}
            >
              {running ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {running ? '暂停' : '继续'}
            </button>
            <button type="button" className="tactile-btn tactile-btn--danger lab-action-btn" onClick={doReset}>
              <RotateCcw size={14} aria-hidden="true" /> 重置
            </button>
          </div>
        </section>

        {/* ---- Live stage ---- */}
        <section className="lab-stage" aria-label="线程池实时状态">
          <div className="lab-decision-strip" aria-label="execute 四级决策链">
            {DECISION_STEPS.map((d, i) => (
              <div key={d.kind} className="lab-decision-item">
                <div
                  className={`lab-decision-pill lab-decision-pill--${d.kind} ${decisionFresh && snap.lastDecision === d.kind ? 'lab-decision-pill--active' : ''}`}
                >
                  <span className="lab-decision-label">{d.label}</span>
                  <span className="lab-decision-sub">{d.sub}</span>
                </div>
                {i < DECISION_STEPS.length - 1 && <span className="lab-decision-arrow" aria-hidden="true">→</span>}
              </div>
            ))}
          </div>

          {snap.callerBusy && (
            <div className="lab-caller-banner" role="status">
              <Zap size={14} aria-hidden="true" />
              CallerRunsPolicy 反压中：提交线程正在自己执行任务，自动提交暂停…
            </div>
          )}

          <div className="lab-zone">
            <div className="lab-zone-head">
              <span className="lab-zone-title">
                <Users size={14} aria-hidden="true" /> Worker 线程
              </span>
              <span className={`lab-zone-count ${snap.workers.length >= config.maximumPoolSize ? 'lab-zone-count--full' : ''}`}>
                wc = {snap.workers.length} / max {config.maximumPoolSize}
              </span>
            </div>
            {snap.workers.length === 0 ? (
              <p className="lab-empty">暂无线程 —— 提交第一个任务，触发 addWorker()</p>
            ) : (
              <div className="lab-workers-grid">
                {snap.workers.map((w, idx) => {
                  const isCore = idx < config.corePoolSize;
                  const pct = w.task
                    ? Math.min(100, Math.max(0, (1 - w.task.remainingMs / w.task.durationMs) * 100))
                    : 0;
                  const pollRemain = Math.max(0, config.keepAliveMs - w.idleMs) / 1000;
                  return (
                    <div
                      key={w.id}
                      className={`lab-worker-card ${isCore ? 'lab-worker-card--core' : 'lab-worker-card--extra'} ${w.task ? '' : 'lab-worker-card--idle'}`}
                    >
                      <div className="lab-worker-head">
                        <span className="lab-worker-name">worker-{w.id}</span>
                        <span className={`lab-worker-tag ${isCore ? 'lab-worker-tag--core' : 'lab-worker-tag--extra'}`}>
                          {isCore ? 'CORE' : 'EXTRA'}
                        </span>
                      </div>
                      {w.task ? (
                        <>
                          <span className="lab-worker-task">task-{w.task.id} · 剩余 {(Math.max(0, w.task.remainingMs) / 1000).toFixed(1)}s</span>
                          <div className="lab-worker-progress">
                            <div className="lab-worker-progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </>
                      ) : (
                        <span className="lab-worker-idle-text">
                          {timedMode
                            ? `poll() 等待 · ${pollRemain.toFixed(1)}s 后回收`
                            : 'take() 阻塞等待任务'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lab-zone">
            <div className="lab-zone-head">
              <span className="lab-zone-title">
                <Inbox size={14} aria-hidden="true" /> 阻塞队列 workQueue
              </span>
              <span className={`lab-zone-count ${queueFull ? 'lab-zone-count--full' : ''}`}>
                {snap.queue.length} / {config.queueCapacity}
                {queueFull && config.queueCapacity > 0 ? ' · 已满' : ''}
              </span>
            </div>
            {config.queueCapacity === 0 ? (
              <p className="lab-empty">SynchronousQueue：容量 0，任务必须被线程直接接手</p>
            ) : (
              <div className="lab-queue-grid">
                {Array.from({ length: config.queueCapacity }, (_, i) => {
                  const t = snap.queue[i];
                  return (
                    <div key={i} className={`lab-queue-slot ${t ? 'lab-queue-slot--filled' : ''}`}>
                      {t ? `task-${t.id}` : i === 0 ? 'HEAD' : i === config.queueCapacity - 1 ? 'TAIL' : '·'}
                    </div>
                  );
                })}
              </div>
            )}
            {(stats.callerRuns > 0 || stats.discarded > 0) && (
              <div className="lab-overflow-row">
                {stats.callerRuns > 0 && <span className="lab-overflow-chip lab-overflow-chip--caller">CallerRuns ×{stats.callerRuns}</span>}
                {stats.discarded > 0 && <span className="lab-overflow-chip lab-overflow-chip--discard">静默丢弃 ×{stats.discarded}</span>}
              </div>
            )}
          </div>
        </section>

        {/* ---- Event log ---- */}
        <section className="lab-log-panel" aria-label="事件日志">
          <h2 className="lab-panel-title">事件日志 · EVENT LOG</h2>
          <ul className="lab-log-list">
            {snap.logs.length === 0 && <li className="lab-empty">等待事件…</li>}
            {snap.logs.map((entry) => (
              <li key={entry.id} className="lab-log-entry">
                <span className="lab-log-time">{(entry.atMs / 1000).toFixed(1)}s</span>
                <span className={`lab-log-kind lab-log-kind--${entry.kind}`}>{LOG_KIND_LABEL[entry.kind]}</span>
                <span className="lab-log-text">{entry.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}