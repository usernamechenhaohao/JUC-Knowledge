import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { ChapterColor, Lesson, LessonLevel, LessonStep, StepKpi } from '../types/lesson';
import {
  STAGE_MAX_ZOOM,
  STAGE_MIN_ZOOM,
  StageCanvas,
  type StagePan,
} from './stage/StageCanvas';
import '../styles/stage.css';

const ZOOM_STEP = 0.15;

export interface StagePanelProps {
  lesson: Lesson;
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  chapterColor: ChapterColor;
  isPlaying: boolean;
  replayKey: number;
  canPrev: boolean;
  canNext: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  onSelectStep: (stepIndex: number) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

function getLevelPillClass(level: LessonLevel): string {
  switch (level) {
    case '入门':
      return 'stage-pill--level-entry';
    case '核心':
      return 'stage-pill--level-core';
    case '进阶':
      return 'stage-pill--level-advanced';
  }
}

function clampZoom(val: number): number {
  return Math.max(STAGE_MIN_ZOOM, Math.min(STAGE_MAX_ZOOM, Number(val.toFixed(2))));
}

function resolveLegendColor(raw: string): string {
  switch (raw.trim().toLowerCase()) {
    case 'green':
    case 'sage':
      return 'var(--green-stroke)';
    case 'violet':
    case 'purple':
      return 'var(--violet-stroke)';
    case 'blue':
      return 'var(--blue-stroke)';
    case 'orange':
    case 'amber':
      return 'var(--orange-stroke)';
    case 'rose':
    case 'red':
    case 'coral':
      return 'var(--rose-stroke)';
    case 'teal':
      return 'var(--teal-stroke)';
    case 'neutral':
    case 'gray':
      return 'var(--edge)';
    default:
      return raw;
  }
}

export function StagePanel({
  lesson,
  step,
  stepIndex,
  totalSteps,
  chapterColor,
  isPlaying,
  replayKey,
  canPrev,
  canNext,
  onTogglePlay,
  onReplay,
  onSelectStep,
  onPrevStep,
  onNextStep,
}: StagePanelProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<StagePan>({ x: 0, y: 0 });

  const prevKpiMapRef = useRef<Map<string, string>>(new Map());
  const prevLessonIdRef = useRef<string>(lesson.id);
  const [kpiFlashMap, setKpiFlashMap] = useState<Record<string, number>>({});

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [lesson.id]);

  useEffect(() => {
    const isNewLesson = prevLessonIdRef.current !== lesson.id;
    const prevMap = isNewLesson ? new Map<string, string>() : prevKpiMapRef.current;
    const changedLabels: string[] = [];

    for (const kpi of step.kpis) {
      const prevVal = prevMap.get(kpi.label);
      if (!isNewLesson && prevMap.size > 0 && prevVal !== kpi.value) {
        changedLabels.push(kpi.label);
      }
    }

    const nextMap = new Map<string, string>();
    for (const kpi of step.kpis) {
      nextMap.set(kpi.label, kpi.value);
    }
    prevKpiMapRef.current = nextMap;
    prevLessonIdRef.current = lesson.id;

    if (changedLabels.length > 0) {
      setKpiFlashMap((curr) => {
        const updated = { ...curr };
        for (const label of changedLabels) {
          updated[label] = (updated[label] ?? 0) + 1;
        }
        return updated;
      });
    } else if (isNewLesson) {
      setKpiFlashMap({});
    }
  }, [lesson.id, stepIndex, step.kpis]);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => clampZoom(z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => clampZoom(z - ZOOM_STEP));
  }, []);

  const chapterNumStr = String(lesson.chapterNumber).padStart(2, '0');
  const zoomPercent = Math.round(zoom * 100);
  const isViewModified = zoomPercent !== 100 || Math.abs(pan.x) > 1 || Math.abs(pan.y) > 1;
  const legendItems = step.legend ?? [];
  const figTag = `FIG.${lesson.chapterNumber}.${lesson.lessonIndexInChapter}-${step.stepNumber}`;

  return (
    <section className="stage-panel" aria-label="线程池演示舞台">
      <header className="stage-header">
        <div className="stage-header-main">
          <div className={`stage-breadcrumb ch-color--${chapterColor}`}>
            <span className="stage-breadcrumb-dot" aria-hidden="true" />
            <span className="stage-breadcrumb-chapter">
              {chapterNumStr}. {lesson.chapterTitle}
            </span>
            <span className="stage-breadcrumb-sep" aria-hidden="true">
              /
            </span>
            <span>
              第 {lesson.lessonIndexInChapter} 课，共 {lesson.totalInChapter} 课
            </span>
          </div>
          <h1 className="stage-title" title={lesson.title}>
            {lesson.title}
          </h1>
          <p className="stage-subtitle" title={lesson.subtitle}>
            {lesson.subtitle}
          </p>
        </div>

        <div className="stage-meta-pills" aria-label="课程属性">
          <span className="stage-pill stage-pill--duration">
            <Clock size={12} strokeWidth={2.2} aria-hidden="true" />
            {lesson.durationMin} 分钟
          </span>
          <span className={`stage-pill ${getLevelPillClass(lesson.level)}`}>
            <Sparkles size={12} strokeWidth={2.2} aria-hidden="true" />
            {lesson.level}
          </span>
          <span className="stage-pill stage-pill--steps">
            <Layers size={12} strokeWidth={2.2} aria-hidden="true" />
            {totalSteps} 步
          </span>
        </div>
      </header>

      <div className="stage-card">
        <div className="stage-hud">
          <div className="stage-kpis" aria-label="关键指标">
            {step.kpis.map((kpi: StepKpi, idx: number) => {
              const status = kpi.status ?? 'neutral';
              const flashGen = kpiFlashMap[kpi.label] ?? 0;
              const isFlashing = flashGen > 0;
              return (
                <div
                  key={`${kpi.label}-${idx}-${flashGen}`}
                  className={`kpi-chip kpi-chip--${status}${isFlashing ? ' kpi-chip--flash' : ''}`}
                  title={`${kpi.label}: ${kpi.value}`}
                >
                  <span className="kpi-label">{kpi.label}</span>
                  <span
                    key={`${kpi.value}-${flashGen}`}
                    className={`kpi-value${isFlashing ? ' kpi-value--in' : ''}`}
                  >
                    {kpi.value}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="stage-controls">
            <button
              type="button"
              className="tactile-btn stage-ctrl-btn"
              onClick={onReplay}
              title="重放本步动画 (R)"
              aria-label="重放本步动画"
            >
              <RotateCcw size={13} strokeWidth={2.2} aria-hidden="true" />
              <span>重放</span>
              <kbd className="kbd">R</kbd>
            </button>

            <button
              type="button"
              className={`tactile-btn stage-ctrl-btn${isPlaying ? ' stage-ctrl-btn--playing' : ''}`}
              onClick={onTogglePlay}
              title={isPlaying ? '暂停动画 (Space)' : '播放动画 (Space)'}
              aria-label={isPlaying ? '暂停动画' : '播放动画'}
              aria-pressed={isPlaying}
            >
              {isPlaying ? (
                <Pause size={13} strokeWidth={2.3} aria-hidden="true" />
              ) : (
                <Play size={13} strokeWidth={2.3} aria-hidden="true" />
              )}
              <span>{isPlaying ? '暂停' : '播放'}</span>
              <kbd className="kbd">Space</kbd>
            </button>

            <div className="stage-zoom-group" role="group" aria-label="舞台缩放控制">
              <button
                type="button"
                className="stage-zoom-btn"
                onClick={handleZoomOut}
                disabled={zoom <= STAGE_MIN_ZOOM + 0.005}
                title="缩小舞台"
                aria-label="缩小舞台"
              >
                <Minus size={12} strokeWidth={2.4} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`stage-zoom-btn stage-zoom-readout${isViewModified ? ' stage-zoom-readout--modified' : ''}`}
                onClick={handleResetView}
                title="点击重置缩放与平移 (100%)"
                aria-label={`当前缩放 ${zoomPercent}%，点击重置为 100%`}
              >
                {zoomPercent}%
              </button>
              <button
                type="button"
                className="stage-zoom-btn"
                onClick={handleZoomIn}
                disabled={zoom >= STAGE_MAX_ZOOM - 0.005}
                title="放大舞台"
                aria-label="放大舞台"
              >
                <Plus size={12} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="stage-viewport">
          <StageCanvas
            scene={step.scene}
            lessonId={lesson.id}
            stepIndex={stepIndex}
            isPlaying={isPlaying}
            replayKey={replayKey}
            animKey={`${lesson.id}-${stepIndex}`}
            zoom={zoom}
            pan={pan}
            onZoomChange={setZoom}
            onPanChange={setPan}
            onResetView={handleResetView}
          />
        </div>

        <div className="stage-footer-strip">
          {legendItems.length > 0 ? (
            <div className="stage-legend" aria-label="图例">
              {legendItems.map((item, idx) => {
                const resolvedColor = resolveLegendColor(item.color);
                return (
                  <span key={`${item.label}-${idx}`} className="stage-legend-item">
                    {item.dashed ? (
                      <span
                        className="stage-legend-dash"
                        style={{ color: resolvedColor }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className="stage-legend-dot"
                        style={{ backgroundColor: resolvedColor }}
                        aria-hidden="true"
                      />
                    )}
                    <span>{item.label}</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <div aria-hidden="true" />
          )}

          <div className="stage-blueprint-stamp">
            <span className="stage-blueprint-fig">{figTag}</span>
            {step.scene.title && (
              <span className="stage-blueprint-title" title={step.scene.title}>
                {step.scene.title}
              </span>
            )}
          </div>
        </div>
      </div>

      <nav className="stage-timeline-card" aria-label="本课步骤导航">
        <div className="timeline-header">
          <div className="timeline-heading">
            <span>本课步骤</span>
            <span className="timeline-heading-en">IN THIS LESSON</span>
          </div>

          <div className="timeline-header-right">
            <button
              type="button"
              className="timeline-nudge-btn"
              onClick={onPrevStep}
              disabled={!canPrev}
              title="上一步 (←)"
              aria-label="上一步"
            >
              <ChevronLeft size={13} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <span className="timeline-step-counter">
              步骤 {stepIndex + 1} / {totalSteps}
            </span>
            <button
              type="button"
              className="timeline-nudge-btn"
              onClick={onNextStep}
              disabled={!canNext}
              title="下一步 (→)"
              aria-label="下一步"
            >
              <ChevronRight size={13} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="timeline-track-scroll">
          <div className="timeline-track" role="list">
            {lesson.steps.map((s, idx) => {
              const isActive = idx === stepIndex;
              const isDone = idx < stepIndex;
              const nodeClass = [
                'timeline-node',
                isActive ? 'timeline-node--active' : '',
                isDone ? 'timeline-node--done' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={`${lesson.id}-step-${s.stepNumber}-${idx}`}
                  type="button"
                  role="listitem"
                  className={nodeClass}
                  onClick={() => onSelectStep(idx)}
                  aria-current={isActive ? 'step' : undefined}
                  title={`步骤 ${s.stepNumber}: ${s.shortLabel} — ${s.title}`}
                >
                  <span className="timeline-circle">{s.stepNumber}</span>
                  <span className="timeline-label">{s.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </section>
  );
}