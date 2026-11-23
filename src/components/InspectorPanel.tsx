import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Code2,
  Copy,
  ExternalLink,
  FlaskConical,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import type { CalloutKind, Lesson, LessonStep, StepBadge } from '../types/lesson';
import { renderRichText } from '../utils/inlineCode';

export interface InspectorPanelProps {
  lesson: Lesson;
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  nextLesson?: Lesson;
  canPrev: boolean;
  canNext: boolean;
  onPrevStep: () => void;
  onNextStep: () => void;
  onSelectStep: (stepIndex: number) => void;
  onSelectLesson: (slug: string) => void;
  onOpenCheatsheet: () => void;
  onOpenLab: () => void;
}

const BADGE_LABELS: Record<StepBadge, string> = {
  PROBLEM: 'PROBLEM · 问题痛点',
  TECHNIQUE: 'TECHNIQUE · 核心机制',
  SOLUTION: 'SOLUTION · 最佳实践',
  INSIGHT: 'INSIGHT · 设计洞察',
  RECAP: 'RECAP · 总结决策',
};

const CALLOUT_DEFAULTS: Record<CalloutKind, string> = {
  idea: '核心洞察',
  tip: '源码提示',
  warn: '关键边界',
};

export function InspectorPanel({
  lesson,
  step,
  stepIndex,
  totalSteps,
  nextLesson,
  canPrev,
  canNext,
  onPrevStep,
  onNextStep,
  onSelectStep,
  onSelectLesson,
  onOpenCheatsheet,
  onOpenLab,
}: InspectorPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [objectivesOpen, setObjectivesOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDrawerOpen(false);
    setCopied(false);
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [lesson.slug, stepIndex]);

  const isFinalStep = stepIndex === totalSteps - 1;
  const nextStep = canNext ? lesson.steps[stepIndex + 1] : undefined;

  const completedObjectives = lesson.objectives.filter(
    (obj) => step.stepNumber >= obj.completedAtStep,
  ).length;
  const allObjectivesDone =
    lesson.objectives.length > 0 && completedObjectives === lesson.objectives.length;

  const handleCopyCode = async () => {
    if (!step.sourceDrawer) return;
    try {
      await navigator.clipboard.writeText(step.sourceDrawer.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permissions may be restricted
    }
  };

  const renderCalloutIcon = (kind: CalloutKind) => {
    if (kind === 'warn') return <AlertTriangle size={14} />;
    if (kind === 'tip') return <Sparkles size={14} />;
    return <Lightbulb size={14} />;
  };

  return (
    <aside className="inspector-panel" aria-label="步骤详解与学习收获">
      <div className="inspector-top">
        <div className="inspector-meta-row">
          <span className={`step-badge step-badge--${step.badge}`}>
            {BADGE_LABELS[step.badge]}
          </span>
          <span className="inspector-step-counter">
            STEP {step.stepNumber} / {totalSteps}
          </span>
          <span className="inspector-level-tag">{lesson.level}</span>
        </div>

        <div className="inspector-step-dots" role="tablist" aria-label="步骤切换">
          {lesson.steps.map((s, idx) => {
            const isActive = idx === stepIndex;
            const isVisited = idx < stepIndex;
            return (
              <button
                key={s.stepNumber}
                type="button"
                role="tab"
                aria-selected={isActive}
                title={`第 ${s.stepNumber} 步：${s.shortLabel}`}
                aria-label={`跳到第 ${s.stepNumber} 步：${s.shortLabel}`}
                className={`inspector-step-dot ${
                  isActive
                    ? 'inspector-step-dot--active'
                    : isVisited
                      ? 'inspector-step-dot--visited'
                      : ''
                }`}
                onClick={() => onSelectStep(idx)}
              />
            );
          })}
        </div>
      </div>

      <div className="inspector-body" ref={bodyRef}>
        <div key={`${lesson.slug}-${stepIndex}`} className="inspector-body-content">
          <h2 className="inspector-step-title">{step.title}</h2>

          <div className="inspector-paragraphs">
            {step.paragraphs.map((paragraph, idx) => (
              <p key={idx} className="inspector-paragraph">
                {renderRichText(paragraph)}
              </p>
            ))}
          </div>

          {step.callout && (
            <div className={`callout-box callout-box--${step.callout.kind}`}>
              <div className="callout-header">
                {renderCalloutIcon(step.callout.kind)}
                <span>{step.callout.title ?? CALLOUT_DEFAULTS[step.callout.kind]}</span>
              </div>
              <p className="callout-text">{renderRichText(step.callout.text)}</p>
            </div>
          )}

          {step.diffs && step.diffs.length > 0 && (
            <div className="diffs-card">
              <div className="diffs-title">本步变化 · STATE DIFF</div>
              <ul className="diffs-list">
                {step.diffs.map((diff, idx) => {
                  const sign =
                    diff.kind === 'add' ? '+' : diff.kind === 'remove' ? '−' : '~';
                  return (
                    <li key={idx} className="diff-row">
                      <span className={`diff-sign diff-sign--${diff.kind}`} aria-hidden="true">
                        {sign}
                      </span>
                      <span>{renderRichText(diff.text)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {step.sourceDrawer && (
            <div className="source-drawer">
              <button
                type="button"
                className="source-drawer-trigger"
                onClick={() => setDrawerOpen((v) => !v)}
                aria-expanded={drawerOpen}
              >
                <span className="source-drawer-left">
                  <Code2 size={14} />
                  <span className="source-drawer-title">
                    JDK 源码 · {step.sourceDrawer.title}
                  </span>
                  <span className="source-drawer-lang">{step.sourceDrawer.language}</span>
                </span>
                {drawerOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              <div
                className={`source-drawer-collapse ${
                  drawerOpen ? 'source-drawer-collapse--open' : ''
                }`}
              >
                <div className="source-drawer-inner">
                  <div className="source-drawer-toolbar">
                    <span
                      className="source-drawer-filepath"
                      title={step.sourceDrawer.filePath}
                    >
                      {step.sourceDrawer.filePath}
                    </span>
                    <div className="source-drawer-actions">
                      <button
                        type="button"
                        className="source-mini-btn"
                        onClick={handleCopyCode}
                      >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                        <span>{copied ? '已复制' : '复制'}</span>
                      </button>
                      <a
                        className="source-mini-btn"
                        href={step.sourceDrawer.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>GitHub</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>

                  <pre className="source-drawer-code">
                    <code>{step.sourceDrawer.code}</code>
                  </pre>

                  {step.sourceDrawer.caption && (
                    <p className="source-drawer-caption">
                      {renderRichText(step.sourceDrawer.caption)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step.recapTable && step.recapTable.length > 0 && (
            <div className="recap-table-wrap">
              <div className="recap-table-head">本课关键决策 · DECISION RECAP</div>
              <div className="recap-rows">
                {step.recapTable.map((row, idx) => (
                  <div key={idx} className="recap-row">
                    <div className="recap-question">Q: {renderRichText(row.question)}</div>
                    <div className="recap-decision">→ {renderRichText(row.decision)}</div>
                    <div className="recap-because">{renderRichText(row.because)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isFinalStep && (
            <div className="next-lesson-card">
              <span className="next-lesson-eyebrow">
                {nextLesson
                  ? `下一课预告 · 第 ${String(nextLesson.chapterNumber).padStart(2, '0')} 章`
                  : '全课程收官 · POOL MASTERED'}
              </span>
              <h3 className="next-lesson-title">
                {nextLesson ? nextLesson.title : '已学完线程池全部交互课程'}
              </h3>
              <p className="next-lesson-sub">
                {nextLesson
                  ? nextLesson.subtitle
                  : '前往实验台实时调参验证执行流程，或打开速查表总览七大参数与拒绝策略。'}
              </p>
              {nextLesson ? (
                <button
                  type="button"
                  className="tactile-btn tactile-btn--primary next-lesson-cta"
                  onClick={() => onSelectLesson(nextLesson.slug)}
                >
                  <span>继续学习下一课</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="tactile-btn tactile-btn--primary next-lesson-cta"
                  onClick={onOpenLab}
                >
                  <FlaskConical size={14} />
                  <span>打开线程池实验台</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="inspector-nav">
        <div className="inspector-nav-buttons">
          <button
            type="button"
            className="tactile-btn inspector-nav-btn"
            onClick={onPrevStep}
            disabled={!canPrev}
          >
            <ArrowLeft size={14} style={{ flexShrink: 0 }} />
            <span>上一步</span>
          </button>

          {canNext ? (
            <button
              type="button"
              className="tactile-btn tactile-btn--primary inspector-nav-btn"
              onClick={onNextStep}
              title={nextStep ? `下一步：${nextStep.shortLabel}` : '下一步'}
            >
              <span className="inspector-nav-btn-label">
                {nextStep ? `下一步：${nextStep.shortLabel}` : '下一步'}
              </span>
              <ArrowRight size={14} style={{ flexShrink: 0 }} />
            </button>
          ) : nextLesson ? (
            <button
              type="button"
              className="tactile-btn tactile-btn--primary inspector-nav-btn"
              onClick={() => onSelectLesson(nextLesson.slug)}
              title={`下一课：${nextLesson.title}`}
            >
              <span className="inspector-nav-btn-label">下一课</span>
              <ArrowRight size={14} style={{ flexShrink: 0 }} />
            </button>
          ) : (
            <button
              type="button"
              className="tactile-btn tactile-btn--primary inspector-nav-btn"
              onClick={onOpenCheatsheet}
            >
              <span className="inspector-nav-btn-label">看速查表</span>
              <ArrowRight size={14} style={{ flexShrink: 0 }} />
            </button>
          )}
        </div>

        <div className="inspector-shortcuts" aria-hidden="true">
          <span className="shortcut-hint">
            <kbd className="kbd">←</kbd>
            <kbd className="kbd">→</kbd> 切步
          </span>
          <span className="shortcut-hint">
            <kbd className="kbd">Space</kbd> 播放
          </span>
          <span className="shortcut-hint">
            <kbd className="kbd">R</kbd> 重播
          </span>
        </div>
      </div>

      <div className="objectives-section">
        <button
          type="button"
          className="objectives-header"
          onClick={() => setObjectivesOpen((v) => !v)}
          aria-expanded={objectivesOpen}
        >
          <span className="objectives-title-group">
            <span>本课收获 · YOU&apos;LL LEARN</span>
            <span
              className={`objectives-badge ${
                allObjectivesDone ? 'objectives-badge--all' : ''
              }`}
            >
              {completedObjectives}/{lesson.objectives.length}
            </span>
          </span>
          {objectivesOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        {objectivesOpen && (
          <ul className="objectives-list">
            {lesson.objectives.map((objective) => {
              const isDone = step.stepNumber >= objective.completedAtStep;
              return (
                <li
                  key={objective.id}
                  className={`objective-item ${isDone ? 'objective-item--done' : ''}`}
                >
                  <span className="objective-box" aria-hidden="true">
                    {isDone && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span>{renderRichText(objective.text)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}