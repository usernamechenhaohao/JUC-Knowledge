import { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Folder,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { Chapter } from '../types/lesson';

export interface SidebarProps {
  chapters: Chapter[];
  activeLessonSlug: string;
  completedLessons: Set<string>;
  onSelectLesson: (slug: string) => void;
  onResetProgress: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({
  chapters,
  activeLessonSlug,
  completedLessons,
  onSelectLesson,
  onResetProgress,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    let foundActive = false;
    for (const ch of chapters) {
      const hasActive = ch.lessons.some((l) => l.slug === activeLessonSlug);
      if (hasActive) foundActive = true;
      initial[ch.id] = hasActive;
    }
    if (!foundActive && chapters[0]) {
      initial[chapters[0].id] = true;
    }
    return initial;
  });

  const [progressExpanded, setProgressExpanded] = useState(false);

  useEffect(() => {
    setOpenChapters((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const ch of chapters) {
        const hasActive = ch.lessons.some((l) => l.slug === activeLessonSlug);
        if (next[ch.id] === undefined) {
          next[ch.id] = hasActive;
          changed = true;
        }
        if (hasActive && !next[ch.id]) {
          next[ch.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [chapters, activeLessonSlug]);

  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
  const completedCount = chapters.reduce(
    (acc, ch) => acc + ch.lessons.filter((l) => completedLessons.has(l.slug)).length,
    0,
  );
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const toggleLabel = collapsed ? '展开课程目录' : '折叠课程目录';
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  const toggleChapter = (chapterId: string) => {
    setOpenChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  return (
    <aside
      className={collapsed ? 'sidebar sidebar--collapsed' : 'sidebar'}
      aria-label="课程章节导航"
    >
      <div className="sidebar-header">
        {onToggleCollapsed && (
          <button
            type="button"
            className="tactile-btn sidebar-collapse-btn"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={toggleLabel}
            title={toggleLabel}
          >
            <ToggleIcon size={16} aria-hidden="true" />
          </button>
        )}
        <span className="sidebar-eyebrow">课程目录 · CURRICULUM</span>
        <span className="sidebar-count-pill">
          {chapters.length} 章 · {totalLessons} 课
        </span>
      </div>

      <nav className="sidebar-nav">
        {chapters.map((chapter) => {
          const isOpen = openChapters[chapter.id] ?? true;
          const chapterDone = chapter.lessons.filter((l) =>
            completedLessons.has(l.slug),
          ).length;
          const allDone =
            chapter.lessons.length > 0 && chapterDone === chapter.lessons.length;

          return (
            <div key={chapter.id} className="chapter-group">
              <button
                type="button"
                className="chapter-toggle"
                onClick={() => toggleChapter(chapter.id)}
                aria-expanded={isOpen}
              >
                <ChevronRight
                  size={13}
                  className={`chapter-chevron ${isOpen ? 'chapter-chevron--open' : ''}`}
                />
                {isOpen ? (
                  <FolderOpen
                    size={15}
                    className={`chapter-folder-icon ch-color--${chapter.color}`}
                  />
                ) : (
                  <Folder
                    size={15}
                    className={`chapter-folder-icon ch-color--${chapter.color}`}
                  />
                )}
                <span className="chapter-title-wrap">
                  <span className="chapter-num">
                    {String(chapter.number).padStart(2, '0')}
                  </span>
                  <span className="chapter-title" title={chapter.title}>
                    {chapter.title}
                  </span>
                </span>
                <span
                  className={`chapter-ratio ${allDone ? 'chapter-ratio--done' : ''}`}
                >
                  {chapterDone}/{chapter.lessons.length}
                </span>
              </button>

              {isOpen && (
                <div className="chapter-lessons">
                  {chapter.lessons.map((lesson) => {
                    const isActive = lesson.slug === activeLessonSlug;
                    const isDone = completedLessons.has(lesson.slug);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        className={`lesson-item ${isActive ? 'lesson-item--active' : ''}`}
                        onClick={() => onSelectLesson(lesson.slug)}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="lesson-status-icon" aria-hidden="true">
                          {isDone ? (
                            <CheckCircle2 size={14} className="lesson-done-icon" />
                          ) : (
                            <span className="lesson-dot" />
                          )}
                        </span>
                        <span className="lesson-item-body">
                          <span className="lesson-item-title">{lesson.title}</span>
                          <span className="lesson-item-meta">
                            <span>{lesson.level}</span>
                            <span>·</span>
                            <span>{lesson.durationMin} 分钟</span>
                            <span>·</span>
                            <span>{lesson.steps.length} 步</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="progress-card">
        <button
          type="button"
          className="progress-card-header"
          onClick={() => setProgressExpanded((v) => !v)}
          aria-expanded={progressExpanded}
        >
          <span className="progress-card-title-row">
            <Award size={14} />
            <span>学习进度</span>
          </span>
          <span className="progress-card-stats">
            <span>
              {completedCount}/{totalLessons} ({progressPct}%)
            </span>
            {progressExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </span>
        </button>

        <div className="progress-bar-wrap">
          <div
            className="progress-bar-track"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="课程完成进度"
          >
            <div
              className={`progress-bar-fill ${progressPct === 0 ? 'progress-bar-fill--zero' : ''}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {progressExpanded && (
          <div className="progress-details">
            {chapters.map((ch) => {
              const done = ch.lessons.filter((l) => completedLessons.has(l.slug)).length;
              return (
                <div key={ch.id} className="progress-chapter-row">
                  <span className="progress-chapter-left">
                    <span
                      className={`progress-chapter-dot ch-color--${ch.color}`}
                      aria-hidden="true"
                    />
                    <span className="progress-chapter-name">
                      {String(ch.number).padStart(2, '0')} {ch.title}
                    </span>
                  </span>
                  <span className="progress-chapter-count">
                    {done}/{ch.lessons.length}
                  </span>
                </div>
              );
            })}
            {completedCount > 0 && (
              <button
                type="button"
                className="progress-reset-btn"
                onClick={onResetProgress}
              >
                重置进度
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}