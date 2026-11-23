import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CornerDownLeft, Search, X } from 'lucide-react';
import type { Lesson } from '../types/lesson';

interface SearchEntry {
  key: string;
  lessonSlug: string;
  stepNumber?: number;
  kind: 'lesson' | 'step';
  label: string;
  context: string;
  haystack: string;
}

function buildIndex(lessons: Lesson[]): SearchEntry[] {
  return lessons.flatMap((lesson) => {
    const lessonEntry: SearchEntry = {
      key: `lesson-${lesson.slug}`,
      lessonSlug: lesson.slug,
      kind: 'lesson',
      label: lesson.title,
      context: `第 ${lesson.chapterNumber} 章 · ${lesson.chapterTitle} · ${lesson.steps.length} 步`,
      haystack: `${lesson.title} ${lesson.subtitle} ${lesson.chapterTitle}`.toLowerCase(),
    };
    const stepEntries: SearchEntry[] = lesson.steps.map((step) => ({
      key: `step-${lesson.slug}-${step.stepNumber}`,
      lessonSlug: lesson.slug,
      stepNumber: step.stepNumber,
      kind: 'step',
      label: step.title,
      context: `${lesson.title} · 第 ${step.stepNumber} 步 · ${step.shortLabel}`,
      haystack: `${step.title} ${step.shortLabel} ${step.paragraphs.join(' ')}`.toLowerCase(),
    }));
    return [lessonEntry, ...stepEntries];
  });
}

export interface SearchModalProps {
  open: boolean;
  lessons: Lesson[];
  onClose: () => void;
  onSelect: (lessonSlug: string, stepNumber?: number) => void;
}

export function SearchModal({ open, lessons, onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const index = useMemo(() => buildIndex(lessons), [lessons]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.filter((e) => e.kind === 'lesson');
    return index.filter((e) => e.haystack.includes(q)).slice(0, 12);
  }, [query, index]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  const pick = (entry: SearchEntry) => {
    onSelect(entry.lessonSlug, entry.stepNumber);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = results[activeIdx];
      if (entry) pick(entry);
    }
  };

  return (
    <div className="search-overlay" onClick={onClose} role="presentation">
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="搜索课程与步骤"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="search-input-row">
          <Search size={16} className="search-input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="搜索课程、步骤、关键词… 如「拒绝策略」「keepAlive」"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索关键词"
          />
          <button type="button" className="search-close-btn" onClick={onClose} aria-label="关闭搜索">
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <ul className="search-results" ref={listRef} role="listbox" aria-label="搜索结果">
          {results.length === 0 && (
            <li className="search-empty">没有匹配「{query}」的内容</li>
          )}
          {results.map((entry, i) => (
            <li key={entry.key} role="option" aria-selected={i === activeIdx}>
              <button
                type="button"
                className={`search-result-item ${i === activeIdx ? 'search-result-item--active' : ''}`}
                onClick={() => pick(entry)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span className={`search-result-kind search-result-kind--${entry.kind}`}>
                  {entry.kind === 'lesson' ? <BookOpen size={12} aria-hidden="true" /> : `${entry.stepNumber}`}
                </span>
                <span className="search-result-body">
                  <span className="search-result-label">{entry.label}</span>
                  <span className="search-result-context">{entry.context}</span>
                </span>
                {i === activeIdx && <CornerDownLeft size={13} className="search-result-enter" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>

        <div className="search-footer">
          <span className="search-hint"><span className="kbd">↑</span><span className="kbd">↓</span> 选择</span>
          <span className="search-hint"><span className="kbd">Enter</span> 跳转</span>
          <span className="search-hint"><span className="kbd">Esc</span> 关闭</span>
        </div>
      </div>
    </div>
  );
}