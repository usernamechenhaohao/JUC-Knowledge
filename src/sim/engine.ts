// ============================================================================
// ThreadPoolExecutor tick-based simulator engine.
// Mirrors execute() decision chain: core -> offer queue -> expand -> reject,
// plus getTask() take/poll retirement semantics.
// ============================================================================

export type RejectPolicy = 'abort' | 'caller' | 'discard' | 'oldest';

export type DecisionKind = 'core' | 'enqueue' | 'expand' | 'reject';

export interface SimConfig {
  corePoolSize: number;
  maximumPoolSize: number;
  queueCapacity: number;
  keepAliveMs: number;
  taskDurationMs: number;
  /** tasks per second, 0 = auto submit off */
  autoRate: number;
  policy: RejectPolicy;
  allowCoreThreadTimeOut: boolean;
}

export const DEFAULT_CONFIG: SimConfig = {
  corePoolSize: 2,
  maximumPoolSize: 4,
  queueCapacity: 4,
  keepAliveMs: 5000,
  taskDurationMs: 3000,
  autoRate: 1.2,
  policy: 'abort',
  allowCoreThreadTimeOut: false,
};

export interface SimTask {
  id: number;
  durationMs: number;
  remainingMs: number;
}

export interface SimWorker {
  id: number;
  task: SimTask | null;
  idleMs: number;
}

export type LogKind =
  | 'submit'
  | 'core'
  | 'enqueue'
  | 'expand'
  | 'reject'
  | 'caller'
  | 'discard'
  | 'oldest'
  | 'done'
  | 'retire'
  | 'config';

export interface LogEntry {
  id: number;
  atMs: number;
  kind: LogKind;
  text: string;
}

export interface SimStats {
  submitted: number;
  completed: number;
  rejected: number;
  callerRuns: number;
  discarded: number;
  largestPoolSize: number;
}

export interface SimSnapshot {
  timeMs: number;
  workers: SimWorker[];
  queue: SimTask[];
  stats: SimStats;
  logs: LogEntry[];
  lastDecision: DecisionKind | null;
  lastDecisionAtMs: number;
  callerBusy: boolean;
}

const MAX_LOGS = 60;

export class PoolSimEngine {
  config: SimConfig;
  private timeMs = 0;
  private workers: SimWorker[] = [];
  private queue: SimTask[] = [];
  private logs: LogEntry[] = [];
  private stats: SimStats = {
    submitted: 0,
    completed: 0,
    rejected: 0,
    callerRuns: 0,
    discarded: 0,
    largestPoolSize: 0,
  };
  private nextTaskId = 1;
  private nextWorkerId = 1;
  private nextLogId = 1;
  private autoAcc = 0;
  private callerBusyUntilMs = 0;
  private lastDecision: DecisionKind | null = null;
  private lastDecisionAtMs = -9999;

  constructor(config: SimConfig = DEFAULT_CONFIG) {
    this.config = { ...config };
  }

  setConfig(patch: Partial<SimConfig>): void {
    const prev = this.config;
    const next = { ...prev, ...patch };
    next.corePoolSize = Math.min(next.corePoolSize, next.maximumPoolSize);
    this.config = next;

    // setMaximumPoolSize shrink: retire surplus idle workers immediately
    while (this.workers.length > next.maximumPoolSize) {
      const idleIdx = this.workers.findIndex((w) => w.task === null);
      if (idleIdx === -1) break;
      const [w] = this.workers.splice(idleIdx, 1);
      this.log('retire', `worker-${w.id} 回收（max 调小）`);
    }
    // queue capacity shrink: drop overflow from tail (visual model)
    if (this.queue.length > next.queueCapacity) {
      const dropped = this.queue.length - next.queueCapacity;
      this.queue.splice(next.queueCapacity);
      this.stats.discarded += dropped;
      this.log('discard', `队列容量调小，溢出 ${dropped} 个任务被丢弃`);
    }
    if (patch.autoRate !== undefined && next.autoRate === 0) this.autoAcc = 0;
  }

  private log(kind: LogKind, text: string): void {
    this.logs.push({ id: this.nextLogId++, atMs: this.timeMs, kind, text });
    if (this.logs.length > MAX_LOGS) this.logs.splice(0, this.logs.length - MAX_LOGS);
  }

  private markDecision(kind: DecisionKind): void {
    this.lastDecision = kind;
    this.lastDecisionAtMs = this.timeMs;
  }

  private addWorker(task: SimTask, isCoreBranch: boolean): void {
    const worker: SimWorker = { id: this.nextWorkerId++, task, idleMs: 0 };
    this.workers.push(worker);
    this.stats.largestPoolSize = Math.max(this.stats.largestPoolSize, this.workers.length);
    if (isCoreBranch) {
      this.markDecision('core');
      this.log('core', `task-${task.id} → 新建核心 worker-${worker.id}（wc=${this.workers.length} < core=${this.config.corePoolSize}）`);
    } else {
      this.markDecision('expand');
      this.log('expand', `task-${task.id} → 队列满，扩容非核心 worker-${worker.id}（wc=${this.workers.length} ≤ max=${this.config.maximumPoolSize}）`);
    }
  }

  /** execute() decision chain. Returns the branch taken. */
  submit(source: 'manual' | 'auto' | 'burst' = 'manual'): DecisionKind {
    const task: SimTask = {
      id: this.nextTaskId++,
      durationMs: this.config.taskDurationMs,
      remainingMs: this.config.taskDurationMs,
    };
    this.stats.submitted++;
    if (source !== 'auto') this.log('submit', `execute(task-${task.id}) 提交`);

    if (this.workers.length < this.config.corePoolSize) {
      this.addWorker(task, true);
      return 'core';
    }
    if (this.queue.length < this.config.queueCapacity) {
      this.queue.push(task);
      this.markDecision('enqueue');
      this.log('enqueue', `task-${task.id} → 入队等待（${this.queue.length}/${this.config.queueCapacity}）`);
      return 'enqueue';
    }
    if (this.workers.length < this.config.maximumPoolSize) {
      this.addWorker(task, false);
      return 'expand';
    }

    this.markDecision('reject');
    switch (this.config.policy) {
      case 'abort':
        this.stats.rejected++;
        this.log('reject', `task-${task.id} ✕ AbortPolicy 抛 RejectedExecutionException`);
        break;
      case 'caller':
        this.stats.callerRuns++;
        this.callerBusyUntilMs = this.timeMs + this.config.taskDurationMs;
        this.log('caller', `task-${task.id} ↺ CallerRuns：提交线程自己执行，期间暂停提交（反压）`);
        break;
      case 'discard':
        this.stats.discarded++;
        this.log('discard', `task-${task.id} ✕ DiscardPolicy 静默丢弃`);
        break;
      case 'oldest': {
        const dropped = this.queue.shift();
        this.stats.discarded++;
        this.queue.push(task);
        this.log('oldest', `task-${task.id} ↻ DiscardOldest：丢队头 task-${dropped?.id ?? '?'}，自己入队`);
        break;
      }
    }
    return 'reject';
  }

  burst(count: number): void {
    for (let i = 0; i < count; i++) this.submit('burst');
  }

  tick(dtMs: number): void {
    this.timeMs += dtMs;

    // auto submit (caller-runs backpressure suspends the submitter)
    if (this.config.autoRate > 0 && this.timeMs >= this.callerBusyUntilMs) {
      this.autoAcc += (dtMs * this.config.autoRate) / 1000;
      while (this.autoAcc >= 1) {
        this.autoAcc -= 1;
        this.submit('auto');
      }
    }

    // workers: progress running tasks, pull from queue when idle
    for (const w of this.workers) {
      if (w.task) {
        w.task.remainingMs -= dtMs;
        if (w.task.remainingMs <= 0) {
          this.stats.completed++;
          this.log('done', `worker-${w.id} ✓ task-${w.task.id} 完成`);
          w.task = null;
          w.idleMs = 0;
        }
      }
      if (!w.task && this.queue.length > 0) {
        w.task = this.queue.shift()!;
        w.idleMs = 0;
      }
    }

    // getTask(): wc > core -> poll(keepAlive); allowCoreThreadTimeOut -> all timed
    const timed = this.workers.length > this.config.corePoolSize || this.config.allowCoreThreadTimeOut;
    for (const w of this.workers) {
      if (!w.task) w.idleMs += dtMs;
    }
    if (timed) {
      for (let i = this.workers.length - 1; i >= 0; i--) {
        const w = this.workers[i];
        if (!w.task && w.idleMs >= this.config.keepAliveMs) {
          this.workers.splice(i, 1);
          this.log('retire', `worker-${w.id} poll 超时（keepAlive=${(this.config.keepAliveMs / 1000).toFixed(1)}s）→ 回收，wc=${this.workers.length}`);
        }
      }
    }
  }

  reset(): void {
    this.timeMs = 0;
    this.workers = [];
    this.queue = [];
    this.logs = [];
    this.stats = { submitted: 0, completed: 0, rejected: 0, callerRuns: 0, discarded: 0, largestPoolSize: 0 };
    this.nextTaskId = 1;
    this.nextWorkerId = 1;
    this.autoAcc = 0;
    this.callerBusyUntilMs = 0;
    this.lastDecision = null;
    this.lastDecisionAtMs = -9999;
    this.log('config', '实验台已重置');
  }

  snapshot(): SimSnapshot {
    return {
      timeMs: this.timeMs,
      workers: this.workers.map((w) => ({
        id: w.id,
        idleMs: w.idleMs,
        task: w.task ? { ...w.task } : null,
      })),
      queue: this.queue.map((t) => ({ ...t })),
      stats: { ...this.stats },
      logs: [...this.logs].reverse(),
      lastDecision: this.lastDecision,
      lastDecisionAtMs: this.lastDecisionAtMs,
      callerBusy: this.timeMs < this.callerBusyUntilMs,
    };
  }
}