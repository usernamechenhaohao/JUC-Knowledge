import {
  ArrowUpRight,
  BookOpen,
  GitBranch,
  Layers,
  ListChecks,
  ScrollText,
  ShieldAlert,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import type { CheatsheetData } from '../types/lesson';
import { renderRichText } from '../utils/inlineCode';

export interface CheatsheetViewProps {
  data: CheatsheetData;
  onNavigate: (lessonSlug: string, stepNumber?: number) => void;
}

export function CheatsheetView({ data, onNavigate }: CheatsheetViewProps) {
  const d = data;

  return (
    <div className="cheatsheet-root">
      <header className="cs-hero">
        <span className="cs-hero-eyebrow">
          <ScrollText size={13} aria-hidden="true" /> {d.hero.eyebrow}
        </span>
        <h1 className="cs-hero-title">{d.hero.title}</h1>
        <p className="cs-hero-sub">{d.hero.subtitle}</p>
        <div className="cs-hero-stats">
          {d.hero.stats.map((s) => (
            <div key={s.label} className={`cs-stat cs-stat--${s.tone ?? 'neutral'}`}>
              <span className="cs-stat-value">{s.value}</span>
              <span className="cs-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="cs-section" aria-labelledby="cs-flow">
        <h2 id="cs-flow" className="cs-section-title">
          <Workflow size={15} aria-hidden="true" /> 01 · execute() 四级决策链
        </h2>
        <div className="cs-flow-grid">
          {d.flowSteps.map((s) => (
            <div key={s.order} className={`cs-flow-card cs-tone--${s.tone}`}>
              <span className="cs-flow-order">{String(s.order).padStart(2, '0')}</span>
              <span className="cs-flow-name">{s.name}</span>
              <p className="cs-flow-detail">{renderRichText(s.detail)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cs-section" aria-labelledby="cs-params">
        <h2 id="cs-params" className="cs-section-title">
          <SlidersHorizontal size={15} aria-hidden="true" /> 02 · 构造器七大参数
        </h2>
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th>参数</th>
                <th>类型</th>
                <th>作用</th>
                <th>要点</th>
              </tr>
            </thead>
            <tbody>
              {d.params.map((p) => (
                <tr key={p.param}>
                  <td>
                    <span className={`cs-param-name cs-tone--${p.tone ?? 'neutral'}`}>{p.param}</span>
                  </td>
                  <td className="cs-mono-muted">{p.type}</td>
                  <td className="cs-strong">{p.role}</td>
                  <td>{renderRichText(p.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cs-section" aria-labelledby="cs-policies">
        <h2 id="cs-policies" className="cs-section-title">
          <ShieldAlert size={15} aria-hidden="true" /> 03 · 四种拒绝策略
        </h2>
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th>策略</th>
                <th>行为</th>
                <th>风险</th>
                <th>适用场景</th>
              </tr>
            </thead>
            <tbody>
              {d.policies.map((p) => (
                <tr key={p.name}>
                  <td>
                    <span className={`cs-param-name cs-tone--${p.tone}`}>{p.name}</span>
                  </td>
                  <td>{p.behavior}</td>
                  <td className="cs-risk">{p.risk}</td>
                  <td>{p.scene}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cs-section" aria-labelledby="cs-factories">
        <h2 id="cs-factories" className="cs-section-title">
          <Layers size={15} aria-hidden="true" /> 04 · Executors 工厂对照（禁用原因）
        </h2>
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th>工厂方法</th>
                <th>core</th>
                <th>max</th>
                <th>队列</th>
                <th>风险</th>
              </tr>
            </thead>
            <tbody>
              {d.factories.map((f) => (
                <tr key={f.factory}>
                  <td className="cs-strong">{f.factory}</td>
                  <td className="cs-mono-muted">{f.core}</td>
                  <td className="cs-mono-muted">{f.max}</td>
                  <td>{f.queue}</td>
                  <td className="cs-risk">{f.risk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cs-section" aria-labelledby="cs-states">
        <h2 id="cs-states" className="cs-section-title">
          <GitBranch size={15} aria-hidden="true" /> 05 · 线程池五种状态
        </h2>
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th>状态</th>
                <th>语义</th>
                <th>进入条件</th>
              </tr>
            </thead>
            <tbody>
              {d.states.map((s) => (
                <tr key={s.state}>
                  <td>
                    <span className="cs-state-name">{s.state}</span>
                  </td>
                  <td>{s.meaning}</td>
                  <td className="cs-mono-muted">{s.transition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cs-section" aria-labelledby="cs-sizing">
        <h2 id="cs-sizing" className="cs-section-title">
          <ListChecks size={15} aria-hidden="true" /> 06 · 线程数估算
        </h2>
        <div className="cs-sizing-grid">
          {d.sizing.map((s) => (
            <div key={s.label} className="cs-sizing-card">
              <span className="cs-sizing-label">{s.label}</span>
              <span className="cs-sizing-formula">{s.formula}</span>
              <span className="cs-sizing-note">{s.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cs-section" aria-labelledby="cs-practices">
        <h2 id="cs-practices" className="cs-section-title">
          <BookOpen size={15} aria-hidden="true" /> 07 · 生产实践清单
        </h2>
        <ul className="cs-practice-list">
          {d.practices.map((p) => (
            <li key={p.practice} className="cs-practice-item">
              <div className="cs-practice-text">
                <span className="cs-practice-name">{p.practice}</span>
                <span className="cs-practice-why">{p.why}</span>
              </div>
              {p.lessonSlug && (
                <button
                  type="button"
                  className="tactile-btn cs-practice-link"
                  onClick={() => onNavigate(p.lessonSlug!, p.stepNumber)}
                >
                  查看课程 <ArrowUpRight size={12} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="cs-section" aria-labelledby="cs-links">
        <h2 id="cs-links" className="cs-section-title">
          <ArrowUpRight size={15} aria-hidden="true" /> 深入课程
        </h2>
        <div className="cs-links-grid">
          {d.links.map((l) => (
            <button
              key={l.label}
              type="button"
              className="cs-link-card"
              onClick={() => onNavigate(l.lessonSlug, l.stepNumber)}
            >
              <span>{l.label}</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}