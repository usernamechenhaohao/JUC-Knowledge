import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { StageScene } from '../../types/lesson';
import { FlowSvg } from './FlowSvg';

export const STAGE_MIN_ZOOM = 0.7;
export const STAGE_MAX_ZOOM = 1.8;
const MAX_PAN_OFFSET = 420;

export interface StagePan {
  x: number;
  y: number;
}

export interface StageCanvasProps {
  scene: StageScene;
  lessonId: string;
  stepIndex: number;
  isPlaying: boolean;
  replayKey: number;
  animKey: string;
  zoom: number;
  pan: StagePan;
  onZoomChange: (nextZoom: number) => void;
  onPanChange: (nextPan: StagePan) => void;
  onResetView: () => void;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export function StageCanvas({
  scene,
  lessonId,
  stepIndex,
  isPlaying,
  replayKey,
  animKey,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onResetView,
}: StageCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
    captured: boolean;
  } | null>(null);

  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const reducedMotion = usePrefersReducedMotion();

  // Track previous step's scene (StrictMode-safe state-comparison pattern)
  const [sceneTrack, setSceneTrack] = useState<{
    lessonId: string;
    stepIndex: number;
    replayKey: number;
    currScene: StageScene;
    prevScene?: StageScene;
  }>(() => ({
    lessonId,
    stepIndex,
    replayKey,
    currScene: scene,
    prevScene: undefined,
  }));

  let activePrevScene = sceneTrack.prevScene;
  if (
    lessonId !== sceneTrack.lessonId ||
    stepIndex !== sceneTrack.stepIndex ||
    replayKey !== sceneTrack.replayKey
  ) {
    const isIncremental =
      lessonId === sceneTrack.lessonId && replayKey === sceneTrack.replayKey;
    activePrevScene = isIncremental ? sceneTrack.currScene : undefined;
    setSceneTrack({
      lessonId,
      stepIndex,
      replayKey,
      currScene: scene,
      prevScene: activePrevScene,
    });
  }

  const enterKey = `${stepIndex}-${replayKey}`;
  const prevReplayKeyRef = useRef(replayKey);

  // Synchronize SVG SMIL animations (<animateMotion>) with isPlaying & reducedMotion
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const svg = el.querySelector('svg');
    if (!svg) return;

    try {
      if (prevReplayKeyRef.current !== replayKey) {
        prevReplayKeyRef.current = replayKey;
        svg.setCurrentTime?.(0);
      }
      if (!isPlaying || reducedMotion) {
        svg.pauseAnimations();
      } else {
        svg.unpauseAnimations();
      }
    } catch {
      // Ignore if SVG DOM animation controls are unavailable
    }
  }, [isPlaying, reducedMotion, animKey, replayKey]);

  // Non-passive wheel listener for cursor-anchored zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currZoom = zoomRef.current;
      const currPan = panRef.current;
      const clampedDelta = clamp(e.deltaY, -140, 140);
      const factor = Math.exp(-clampedDelta * 0.0016);
      const nextZoom = clamp(
        Number((currZoom * factor).toFixed(3)),
        STAGE_MIN_ZOOM,
        STAGE_MAX_ZOOM,
      );
      if (Math.abs(nextZoom - currZoom) < 0.001) return;

      const rect = el.getBoundingClientRect();
      const cx = e.clientX - (rect.left + rect.width / 2);
      const cy = e.clientY - (rect.top + rect.height / 2);
      const ratio = nextZoom / currZoom;

      const nextPanX = clamp(cx - (cx - currPan.x) * ratio, -MAX_PAN_OFFSET, MAX_PAN_OFFSET);
      const nextPanY = clamp(cy - (cy - currPan.y) * ratio, -MAX_PAN_OFFSET, MAX_PAN_OFFSET);

      onZoomChange(nextZoom);
      onPanChange({ x: nextPanX, y: nextPanY });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [onZoomChange, onPanChange]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Capture is deferred until real movement: capturing on pointerdown
    // suppresses native dblclick in Chromium, breaking double-click reset.
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originPanX: pan.x,
      originPanY: pan.y,
      captured: false,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.captured) {
      if (Math.hypot(dx, dy) < 4) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.captured = true;
      setIsDragging(true);
    }
    onPanChange({
      x: clamp(drag.originPanX + dx, -MAX_PAN_OFFSET, MAX_PAN_OFFSET),
      y: clamp(drag.originPanY + dy, -MAX_PAN_OFFSET, MAX_PAN_OFFSET),
    });
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className={[
        'stage-canvas-root',
        isDragging ? 'stage-canvas-root--dragging' : '',
        !isPlaying ? 'stage-canvas--paused' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onResetView}
      title="滚轮缩放，拖拽平移，双击重置视图"
    >
      <div
        key={`${lessonId}-${replayKey}`}
        className="stage-canvas-transform"
        style={{
          transform: `translate3d(${pan.x.toFixed(1)}px, ${pan.y.toFixed(1)}px, 0) scale(${zoom.toFixed(3)})`,
        }}
      >
        <FlowSvg
          scene={scene}
          prevScene={activePrevScene}
          enterKey={enterKey}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}