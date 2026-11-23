import type { MouseEvent } from 'react';
import {
  BookOpen,
  Code2,
  ExternalLink,
  FlaskConical,
  Menu,
  Moon,
  ScrollText,
  Search,
  Sun,
} from 'lucide-react';

export type AppMode = 'learn' | 'lab' | 'cheatsheet';

export interface TopBarProps {
  mode: AppMode;
  theme: 'light' | 'dark';
  onChangeMode: (mode: AppMode) => void;
  onOpenSearch: () => void;
  onToggleTheme: (event: MouseEvent<HTMLButtonElement>) => void;
  onOpenMobileDrawer: () => void;
  onGoHome: () => void;
}

export function TopBar({
  mode,
  theme,
  onChangeMode,
  onOpenSearch,
  onToggleTheme,
  onOpenMobileDrawer,
  onGoHome,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="tactile-btn mobile-menu-btn"
          onClick={onOpenMobileDrawer}
          aria-label="打开课程目录"
          title="打开课程目录"
        >
          <Menu size={16} />
        </button>

        <button
          type="button"
          className="brand-link"
          onClick={onGoHome}
          aria-label="JUC-Knowledge，返回第一课"
          title="返回第一课"
        >
          <span className="brand-mark" aria-hidden="true">
            J
          </span>
          <span className="brand-text">
            <span className="brand-title">JUC-Knowledge</span>
            <span className="brand-sub">Java 并发交互式可视化</span>
          </span>
        </button>

        <span className="topbar-divider" aria-hidden="true" />

        <nav className="mode-tabs" aria-label="视图模式">
          <button
            type="button"
            className={`mode-tab ${mode === 'learn' ? 'mode-tab--active' : ''}`}
            onClick={() => onChangeMode('learn')}
            aria-current={mode === 'learn' ? 'page' : undefined}
          >
            <BookOpen size={14} />
            <span>
              <span className="mode-tab-en">Learn </span>课程
            </span>
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'lab' ? 'mode-tab--active' : ''}`}
            onClick={() => onChangeMode('lab')}
            aria-current={mode === 'lab' ? 'page' : undefined}
          >
            <FlaskConical size={14} />
            <span>
              <span className="mode-tab-en">Lab </span>实验台
            </span>
          </button>
          <button
            type="button"
            className={`mode-tab ${mode === 'cheatsheet' ? 'mode-tab--active' : ''}`}
            onClick={() => onChangeMode('cheatsheet')}
            aria-current={mode === 'cheatsheet' ? 'page' : undefined}
          >
            <ScrollText size={14} />
            <span>
              <span className="mode-tab-en">Cheatsheet </span>速查表
            </span>
          </button>
        </nav>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="search-trigger"
          onClick={onOpenSearch}
          aria-label="搜索课程与概念"
        >
          <Search size={14} />
          <span className="search-trigger-label">搜索课程与概念…</span>
          <span className="search-trigger-kbd" aria-hidden="true">
            <kbd className="kbd">Ctrl</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </button>

        <button
          type="button"
          className="tactile-btn theme-toggle-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? '切换为浅色草图纸主题' : '切换为深色浓缩咖啡主题'}
          title={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <a
          className="topbar-pill topbar-pill--link"
          href="https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/concurrent/ThreadPoolExecutor.java"
          target="_blank"
          rel="noopener noreferrer"
          title="查看 OpenJDK ThreadPoolExecutor 源码"
        >
          <Code2 size={13} />
          <span>OpenJDK 源码</span>
          <ExternalLink size={11} />
        </a>
      </div>
    </header>
  );
}