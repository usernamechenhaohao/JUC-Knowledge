// ============================================================================
// JUC-Knowledge — Single Source of Truth Schema
// Shared contract for Stage Engine, Chapter Authors, Lab and Cheatsheet
// ============================================================================

export type ChapterColor = 'sage' | 'blue' | 'violet' | 'amber' | 'coral' | 'teal';

export type LessonLevel = '入门' | '核心' | '进阶';

export type StepBadge = 'PROBLEM' | 'TECHNIQUE' | 'SOLUTION' | 'INSIGHT' | 'RECAP';

export type CalloutKind = 'idea' | 'tip' | 'warn';

export type DiffKind = 'add' | 'change' | 'remove';

export type KpiStatus = 'neutral' | 'good' | 'warn' | 'bad';

export type SourceLanguage = 'java' | 'text';

export type Tone = 'neutral' | 'blue' | 'green' | 'orange' | 'rose' | 'violet' | 'teal';

// ----------------------------------------------------------------------------
// 1. Declarative Flow Scene (normalized 0..1000 x 0..580 coordinate space)
// ----------------------------------------------------------------------------

export interface FlowNode {
  id: string;
  /** Center X in 0..1000 stage space */
  x: number;
  /** Center Y in 0..580 stage space */
  y: number;
  w?: number;
  h?: number;
  label: string;
  sublabel?: string;
  /** Lucide icon key resolved by the stage engine */
  icon?: string;
  tone: Tone;
  shape?: 'box' | 'diamond' | 'pill';
  active?: boolean;
  dimmed?: boolean;
  badge?: string;
}

export interface FlowZoneSlots {
  total: number;
  filled: number;
  tone?: Tone;
  headLabel?: string;
  tailLabel?: string;
}

export interface FlowZoneItem {
  label: string;
  sublabel?: string;
  tone?: Tone;
  state?: 'running' | 'idle' | 'poll' | 'dead';
  badge?: string;
}

export interface FlowZone {
  id: string;
  /** Top-left X / Y, width & height in stage space */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sublabel?: string;
  tone?: Tone;
  dashed?: boolean;
  slots?: FlowZoneSlots;
  items?: FlowZoneItem[];
  columns?: number;
}

export interface FlowEdge {
  id?: string;
  from: string;
  to: string;
  /** Optional intermediate waypoints */
  via?: [number, number][];
  label?: string;
  /** 0..1 position along the polyline for the label (default 0.5) */
  labelAt?: number;
  tone?: Tone;
  dashed?: boolean;
  packets?: number;
  /** Relative speed multiplier (1 = default) */
  packetSpeed?: number;
  status?: 'normal' | 'active' | 'error' | 'dimmed';
}

export interface FlowCallout {
  x: number;
  y: number;
  text: string;
  tone?: Tone;
}

export interface FlowScene {
  kind: 'flow';
  title?: string;
  nodes: FlowNode[];
  zones?: FlowZone[];
  edges: FlowEdge[];
  callouts?: FlowCallout[];
}

export type StageScene = FlowScene;

// ----------------------------------------------------------------------------
// 2. Lesson & Curriculum Structure
// ----------------------------------------------------------------------------

export interface LessonObjective {
  id: string;
  text: string;
  /** 1-based stepNumber at which this objective is checked off */
  completedAtStep: number;
}

export interface StepCallout {
  kind: CalloutKind;
  title?: string;
  text: string;
}

export interface StepDiff {
  kind: DiffKind;
  text: string;
}

export interface SourceDrawer {
  title: string;
  filePath: string;
  githubUrl: string;
  language: SourceLanguage;
  code: string;
  caption?: string;
}

export interface RecapRow {
  question: string;
  decision: string;
  because: string;
}

export interface StepKpi {
  label: string;
  value: string;
  status?: KpiStatus;
}

export interface StepLegendItem {
  color: string;
  label: string;
  dashed?: boolean;
}

export interface LessonStep {
  /** 1-based step number within the lesson */
  stepNumber: number;
  shortLabel: string;
  badge: StepBadge;
  title: string;
  /** Paragraphs supporting inline `code` and **bold** spans */
  paragraphs: string[];
  callout?: StepCallout;
  diffs?: StepDiff[];
  sourceDrawer?: SourceDrawer;
  recapTable?: RecapRow[];
  kpis: StepKpi[];
  legend?: StepLegendItem[];
  scene: FlowScene;
}

export interface Lesson {
  id: string;
  slug: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  /** 1-based index within the chapter */
  lessonIndexInChapter: number;
  totalInChapter: number;
  title: string;
  subtitle: string;
  durationMin: number;
  level: LessonLevel;
  objectives: LessonObjective[];
  steps: LessonStep[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  color: ChapterColor;
  lessons: Lesson[];
}

// ----------------------------------------------------------------------------
// 3. Cheatsheet Data Contract
// ----------------------------------------------------------------------------

export interface CheatsheetLink {
  label: string;
  lessonSlug: string;
  stepNumber?: number;
}

export interface CheatsheetParamRow {
  param: string;
  type: string;
  role: string;
  note: string;
  tone?: Tone;
}

export interface CheatsheetPolicyRow {
  name: string;
  behavior: string;
  risk: string;
  scene: string;
  tone: Tone;
}

export interface CheatsheetFactoryRow {
  factory: string;
  core: string;
  max: string;
  queue: string;
  risk: string;
}

export interface CheatsheetStateRow {
  state: string;
  meaning: string;
  transition: string;
}

export interface CheatsheetPracticeRow {
  practice: string;
  why: string;
  lessonSlug?: string;
  stepNumber?: number;
}

export interface CheatsheetData {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    stats: { label: string; value: string; tone?: Tone }[];
  };
  flowSteps: { order: number; name: string; detail: string; tone: Tone }[];
  params: CheatsheetParamRow[];
  policies: CheatsheetPolicyRow[];
  factories: CheatsheetFactoryRow[];
  states: CheatsheetStateRow[];
  sizing: { label: string; formula: string; note: string }[];
  practices: CheatsheetPracticeRow[];
  links: CheatsheetLink[];
}