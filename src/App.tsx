import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { AlertTriangle, FlaskConical, Loader2, ScrollText, X } from 'lucide-react';
import { TopBar, type AppMode } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { StagePanel } from './components/StagePanel';
import { InspectorPanel } from './components/InspectorPanel';
import { LabView } from './components/LabView';
import { CheatsheetView } from './components/CheatsheetView';
import { SearchModal } from './components/SearchModal';
import {
  getChapterForLesson,
  getLessonBySlug,
  getNextLesson,
} from './data/curriculum';
import { loadKnowledgeBase, type KnowledgeBase } from './data/knowledge';
import type { Lesson } from './types/lesson';

const THEME_KEY = 'juc-knowledge-theme';
const COMPLETED_KEY = 'juc-knowledge-completed';

type Theme = 'light' | 'dark';

interface Route {
  mode: AppMode;
  slug: string;
  /** 0-based step index */
  stepIndex: number;
}

function parseHash(lessons: Lesson[]): Route {
  const defaultSlug = lessons[0]?.slug ?? '';
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'lab') return { mode: 'lab', slug: defaultSlug, stepIndex: 0 };
  if (parts[0] === 'cheatsheet') return { mode: 'cheatsheet', slug: defaultSlug, stepIndex: 0 };
  const lesson = getLessonBySlug(lessons, parts[1] ?? '') ?? lessons[0];
  const rawStep = Number(parts[2]);
  const stepIndex = Number.isFinite(rawStep)
    ? Math.max(0, Math.min(lesson.steps.length - 1, rawStep - 1))
    : 0;
  return { mode: 'learn', slug: lesson.slug, stepIndex };
}

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // localStorage unavailable
  }
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.filter((s) => typeof s === 'string'));
    }
  } catch {
    // ignore corrupt storage
  }
  return new Set();
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (callback: () => void) => { ready: Promise<void> };
};

function AppShell({ kb }: { kb: KnowledgeBase }) {
  const CHAPTERS = kb.chapters;
  const ALL_LESSONS = kb.lessons;
  const DEFAULT_SLUG = ALL_LESSONS[0]?.slug ?? '';

  const [route, setRoute] = useState<Route>(() => parseHash(ALL_LESSONS));
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(() => loadCompleted());
  const [isPlaying, setIsPlaying] = useState(true);
  const [replayKey, setReplayKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const lesson = getLessonBySlug(ALL_LESSONS, route.slug) ?? ALL_LESSONS[0];
  const chapter = getChapterForLesson(CHAPTERS, lesson);
  const stepIndex = Math.min(route.stepIndex, lesson.steps.length - 1);
  const step = lesson.steps[stepIndex];
  const totalSteps = lesson.steps.length;
  const nextLesson = getNextLesson(ALL_LESSONS, lesson);

  // ---- Hash routing ----
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(ALL_LESSONS));
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) {
      window.location.replace(`#/learn/${DEFAULT_SLUG}/1`);
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [ALL_LESSONS]);

  const navigate = useCallback((hash: string) => {
    if (window.location.hash === hash) {
      setRoute(parseHash(ALL_LESSONS));
    } else {
      window.location.hash = hash;
    }
  }, [ALL_LESSONS]);

  const gotoLesson = useCallback(
    (slug: string, stepNumber?: number) => {
      navigate(`#/learn/${slug}/${stepNumber ?? 1}`);
      setMobileDrawerOpen(false);
    },
    [navigate],
  );

  const gotoStep = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, idx));
      navigate(`#/learn/${lesson.slug}/${clamped + 1}`);
    },
    [navigate, lesson.slug, totalSteps],
  );

  const changeMode = useCallback(
    (mode: AppMode) => {
      if (mode === 'learn') navigate(`#/learn/${lesson.slug}/${stepIndex + 1}`);
      else navigate(`#/${mode}`);
      setMobileDrawerOpen(false);
    },
    [navigate, lesson.slug, stepIndex],
  );

  // ---- Completion tracking ----
  useEffect(() => {
    if (route.mode !== 'learn') return;
    if (stepIndex !== totalSteps - 1) return;
    setCompletedLessons((prev) => {
      if (prev.has(lesson.slug)) return prev;
      const next = new Set(prev);
      next.add(lesson.slug);
      try {
        localStorage.setItem(COMPLETED_KEY, JSON.stringify([...next]));
      } catch {
        // storage unavailable
      }
      return next;
    });
  }, [route.mode, stepIndex, totalSteps, lesson.slug]);

  const resetProgress = useCallback(() => {
    if (!window.confirm('确定重置全部学习进度？')) return;
    setCompletedLessons(new Set());
    try {
      localStorage.removeItem(COMPLETED_KEY);
    } catch {
      // storage unavailable
    }
  }, []);

  // ---- Playback ----
  const togglePlay = useCallback(() => setIsPlaying((v) => !v), []);
  const replay = useCallback(() => {
    setReplayKey((k) => k + 1);
    setIsPlaying(true);
  }, []);

  // ---- Theme with circular view-transition wipe ----
  const toggleTheme = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const next: Theme = theme === 'light' ? 'dark' : 'light';
      const apply = () => {
        setTheme(next);
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          // storage unavailable
        }
      };

      const doc = document as ViewTransitionDoc;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!doc.startViewTransition || reduced) {
        apply();
        return;
      }

      const x = event.clientX || window.innerWidth - 40;
      const y = event.clientY || 30;
      const transition = doc.startViewTransition(apply);
      transition.ready.then(() => {
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 480,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      });
    },
    [theme],
  );

  // ---- Global keyboard shortcuts ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
        return;
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileDrawerOpen(false);
        return;
      }
      if (searchOpen || route.mode !== 'learn') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        gotoStep(stepIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        gotoStep(stepIndex - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        replay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [searchOpen, route.mode, stepIndex, gotoStep, togglePlay, replay]);

  // Reset playback state when switching lessons
  useEffect(() => {
    setIsPlaying(true);
  }, [lesson.slug]);

  const sidebarProps = {
    chapters: CHAPTERS,
    activeLessonSlug: lesson.slug,
    completedLessons,
    onSelectLesson: gotoLesson,
    onResetProgress: resetProgress,
  };

  return (
    <div className="app-shell">
      <TopBar
        mode={route.mode}
        theme={theme}
        onChangeMode={changeMode}
        onOpenSearch={() => setSearchOpen(true)}
        onToggleTheme={toggleTheme}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        onGoHome={() => gotoLesson(DEFAULT_SLUG, 1)}
      />

      {route.mode === 'learn' && (
        <div
          className={`workspace-grid ${sidebarCollapsed ? 'workspace-grid--sidebar-collapsed' : ''}`}
        >
          <Sidebar
            {...sidebarProps}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          />
          <main className="stage-slot">
            <StagePanel
              lesson={lesson}
              step={step}
              stepIndex={stepIndex}
              totalSteps={totalSteps}
              chapterColor={chapter.color}
              isPlaying={isPlaying}
              replayKey={replayKey}
              canPrev={stepIndex > 0}
              canNext={stepIndex < totalSteps - 1}
              onTogglePlay={togglePlay}
              onReplay={replay}
              onSelectStep={gotoStep}
              onPrevStep={() => gotoStep(stepIndex - 1)}
              onNextStep={() => gotoStep(stepIndex + 1)}
            />
          </main>
          <InspectorPanel
            lesson={lesson}
            step={step}
            stepIndex={stepIndex}
            totalSteps={totalSteps}
            nextLesson={nextLesson}
            canPrev={stepIndex > 0}
            canNext={stepIndex < totalSteps - 1}
            onPrevStep={() => gotoStep(stepIndex - 1)}
            onNextStep={() => gotoStep(stepIndex + 1)}
            onSelectStep={gotoStep}
            onSelectLesson={(slug) => gotoLesson(slug, 1)}
            onOpenCheatsheet={() => changeMode('cheatsheet')}
            onOpenLab={() => changeMode('lab')}
          />
        </div>
      )}

      {route.mode === 'lab' && (
        <div className="lab-scroll-container">
          <LabView />
        </div>
      )}

      {route.mode === 'cheatsheet' && (
        <div className="cheatsheet-scroll-container">
          <CheatsheetView data={kb.cheatsheet} onNavigate={gotoLesson} />
        </div>
      )}

      {mobileDrawerOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
          role="presentation"
        >
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="课程目录"
          >
            <div className="mobile-drawer-top">
              <span className="sidebar-eyebrow">JUC-Knowledge · 课程目录</span>
              <button
                type="button"
                className="tactile-btn"
                style={{ width: 30, height: 30, padding: 0 }}
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="关闭目录"
              >
                <X size={15} />
              </button>
            </div>
            <div className="mobile-drawer-content">
              <Sidebar {...sidebarProps} />
            </div>
            <div className="mobile-drawer-links">
              <button
                type="button"
                className="tactile-btn"
                style={{ padding: '5px 11px', fontSize: 11.5 }}
                onClick={() => changeMode('lab')}
              >
                <FlaskConical size={13} /> 线程池实验台
              </button>
              <button
                type="button"
                className="tactile-btn"
                style={{ padding: '5px 11px', fontSize: 11.5 }}
                onClick={() => changeMode('cheatsheet')}
              >
                <ScrollText size={13} /> 速查表
              </button>
            </div>
          </div>
        </div>
      )}

      <SearchModal
        open={searchOpen}
        lessons={ALL_LESSONS}
        onClose={() => setSearchOpen(false)}
        onSelect={gotoLesson}
      />
    </div>
  );
}

export default function App() {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [kbError, setKbError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setKbError(null);
    loadKnowledgeBase(controller.signal)
      .then((data) => setKb(data))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setKbError(err instanceof Error ? err.message : String(err));
      });
    return () => controller.abort();
  }, [retryKey]);

  if (kbError) {
    return (
      <div className="kb-status-screen">
        <div className="kb-status-card kb-status-card--error" role="alert">
          <AlertTriangle size={22} aria-hidden="true" />
          <h1 className="kb-status-title">知识库加载失败</h1>
          <p className="kb-status-detail">{kbError}</p>
          <p className="kb-status-hint">
            请检查 public/knowledge/ 下的 manifest.json 与章节 JSON 文件。
          </p>
          <button
            type="button"
            className="tactile-btn"
            onClick={() => setRetryKey((k) => k + 1)}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!kb) {
    return (
      <div className="kb-status-screen">
        <div className="kb-status-card" role="status">
          <Loader2 size={22} className="kb-spinner" aria-hidden="true" />
          <h1 className="kb-status-title">正在加载知识库…</h1>
          <p className="kb-status-detail">读取 knowledge/manifest.json 与课程数据</p>
        </div>
      </div>
    );
  }

  return <AppShell kb={kb} />;
}