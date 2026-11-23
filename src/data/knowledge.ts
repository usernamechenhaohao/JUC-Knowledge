import type { Chapter, CheatsheetData, Lesson } from '../types/lesson';

export interface KnowledgeBase {
  chapters: Chapter[];
  lessons: Lesson[];
  cheatsheet: CheatsheetData;
}

const KB_BASE = `${import.meta.env.BASE_URL}knowledge/`;

const TONES = ['neutral', 'blue', 'green', 'orange', 'rose', 'violet', 'teal'];
const CHAPTER_COLORS = ['sage', 'blue', 'violet', 'amber', 'coral', 'teal'];
const LEVELS = ['入门', '核心', '进阶'];
const BADGES = ['PROBLEM', 'TECHNIQUE', 'SOLUTION', 'INSIGHT', 'RECAP'];

type Json = Record<string, unknown>;

function fail(source: string, path: string, message: string): never {
  throw new Error(`知识库文件 ${source} → ${path}：${message}`);
}

function asObject(v: unknown, source: string, path: string): Json {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    fail(source, path, '应为对象');
  }
  return v as Json;
}

function asArray(v: unknown, source: string, path: string): unknown[] {
  if (!Array.isArray(v)) fail(source, path, '应为数组');
  return v;
}

function asString(v: unknown, source: string, path: string): string {
  if (typeof v !== 'string' || v.length === 0) fail(source, path, '应为非空字符串');
  return v;
}

function asNumber(v: unknown, source: string, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(source, path, '应为有限数字');
  return v;
}

function asEnum(v: unknown, allowed: string[], source: string, path: string): string {
  const s = asString(v, source, path);
  if (!allowed.includes(s)) fail(source, path, `应为 ${allowed.join(' / ')} 之一，实际为 "${s}"`);
  return s;
}

function optString(v: unknown, source: string, path: string): void {
  if (v !== undefined && typeof v !== 'string') fail(source, path, '应为字符串');
}

function optEnum(v: unknown, allowed: string[], source: string, path: string): void {
  if (v !== undefined) asEnum(v, allowed, source, path);
}

function validateScene(v: unknown, source: string, path: string): void {
  const scene = asObject(v, source, path);
  if (scene.kind !== 'flow') fail(source, `${path}.kind`, '目前仅支持 "flow"');
  const ids = new Set<string>();
  for (const [i, raw] of asArray(scene.zones ?? [], source, `${path}.zones`).entries()) {
    const z = asObject(raw, source, `${path}.zones[${i}]`);
    const id = asString(z.id, source, `${path}.zones[${i}].id`);
    if (ids.has(id)) fail(source, path, `zone id "${id}" 重复`);
    ids.add(id);
    for (const k of ['x', 'y', 'w', 'h']) asNumber(z[k], source, `${path}.zones[${i}].${k}`);
    asString(z.label, source, `${path}.zones[${i}].label`);
    optEnum(z.tone, TONES, source, `${path}.zones[${i}].tone`);
  }
  for (const [i, raw] of asArray(scene.nodes, source, `${path}.nodes`).entries()) {
    const n = asObject(raw, source, `${path}.nodes[${i}]`);
    const id = asString(n.id, source, `${path}.nodes[${i}].id`);
    if (ids.has(id)) fail(source, path, `node id "${id}" 重复`);
    ids.add(id);
    asNumber(n.x, source, `${path}.nodes[${i}].x`);
    asNumber(n.y, source, `${path}.nodes[${i}].y`);
    asString(n.label, source, `${path}.nodes[${i}].label`);
    asEnum(n.tone, TONES, source, `${path}.nodes[${i}].tone`);
    optEnum(n.shape, ['box', 'diamond', 'pill'], source, `${path}.nodes[${i}].shape`);
    optString(n.icon, source, `${path}.nodes[${i}].icon`);
  }
  for (const [i, raw] of asArray(scene.edges, source, `${path}.edges`).entries()) {
    const e = asObject(raw, source, `${path}.edges[${i}]`);
    for (const k of ['from', 'to']) {
      const ref = asString(e[k], source, `${path}.edges[${i}].${k}`);
      if (!ids.has(ref)) {
        fail(source, `${path}.edges[${i}].${k}`, `引用了不存在的节点/区域 "${ref}"`);
      }
    }
    optEnum(e.tone, TONES, source, `${path}.edges[${i}].tone`);
    optEnum(e.status, ['normal', 'active', 'error', 'dimmed'], source, `${path}.edges[${i}].status`);
  }
  for (const [i, raw] of asArray(scene.callouts ?? [], source, `${path}.callouts`).entries()) {
    const c = asObject(raw, source, `${path}.callouts[${i}]`);
    asNumber(c.x, source, `${path}.callouts[${i}].x`);
    asNumber(c.y, source, `${path}.callouts[${i}].y`);
    asString(c.text, source, `${path}.callouts[${i}].text`);
    optEnum(c.tone, TONES, source, `${path}.callouts[${i}].tone`);
  }
}

function validateStep(v: unknown, source: string, path: string): void {
  const s = asObject(v, source, path);
  asNumber(s.stepNumber, source, `${path}.stepNumber`);
  asString(s.shortLabel, source, `${path}.shortLabel`);
  asEnum(s.badge, BADGES, source, `${path}.badge`);
  asString(s.title, source, `${path}.title`);
  for (const [i, p] of asArray(s.paragraphs, source, `${path}.paragraphs`).entries()) {
    asString(p, source, `${path}.paragraphs[${i}]`);
  }
  for (const [i, k] of asArray(s.kpis, source, `${path}.kpis`).entries()) {
    const kpi = asObject(k, source, `${path}.kpis[${i}]`);
    asString(kpi.label, source, `${path}.kpis[${i}].label`);
    asString(kpi.value, source, `${path}.kpis[${i}].value`);
  }
  if (s.callout !== undefined) {
    const c = asObject(s.callout, source, `${path}.callout`);
    asEnum(c.kind, ['idea', 'tip', 'warn'], source, `${path}.callout.kind`);
    asString(c.text, source, `${path}.callout.text`);
  }
  if (s.sourceDrawer !== undefined) {
    const d = asObject(s.sourceDrawer, source, `${path}.sourceDrawer`);
    for (const k of ['title', 'filePath', 'githubUrl', 'code']) {
      asString(d[k], source, `${path}.sourceDrawer.${k}`);
    }
    asEnum(d.language, ['java', 'text'], source, `${path}.sourceDrawer.language`);
  }
  validateScene(s.scene, source, `${path}.scene`);
}

function validateLesson(v: unknown, source: string, path: string): void {
  const l = asObject(v, source, path);
  for (const k of ['id', 'slug', 'chapterId', 'chapterTitle', 'title', 'subtitle']) {
    asString(l[k], source, `${path}.${k}`);
  }
  for (const k of ['chapterNumber', 'lessonIndexInChapter', 'totalInChapter', 'durationMin']) {
    asNumber(l[k], source, `${path}.${k}`);
  }
  asEnum(l.level, LEVELS, source, `${path}.level`);
  for (const [i, o] of asArray(l.objectives, source, `${path}.objectives`).entries()) {
    const obj = asObject(o, source, `${path}.objectives[${i}]`);
    asString(obj.id, source, `${path}.objectives[${i}].id`);
    asString(obj.text, source, `${path}.objectives[${i}].text`);
    asNumber(obj.completedAtStep, source, `${path}.objectives[${i}].completedAtStep`);
  }
  const steps = asArray(l.steps, source, `${path}.steps`);
  if (steps.length === 0) fail(source, `${path}.steps`, '至少需要 1 个步骤');
  steps.forEach((st, i) => validateStep(st, source, `${path}.steps[${i}]`));
}

function validateChapter(v: unknown, source: string): Chapter {
  const ch = asObject(v, source, '$');
  asString(ch.id, source, '$.id');
  asNumber(ch.number, source, '$.number');
  asString(ch.title, source, '$.title');
  asEnum(ch.color, CHAPTER_COLORS, source, '$.color');
  const lessons = asArray(ch.lessons, source, '$.lessons');
  if (lessons.length === 0) fail(source, '$.lessons', '至少需要 1 节课');
  lessons.forEach((l, i) => validateLesson(l, source, `$.lessons[${i}]`));
  return v as Chapter;
}

function validateCheatsheet(v: unknown, source: string): CheatsheetData {
  const d = asObject(v, source, '$');
  const hero = asObject(d.hero, source, '$.hero');
  for (const k of ['eyebrow', 'title', 'subtitle']) asString(hero[k], source, `$.hero.${k}`);
  asArray(hero.stats, source, '$.hero.stats');
  for (const k of ['flowSteps', 'params', 'policies', 'factories', 'states', 'sizing', 'practices', 'links']) {
    asArray(d[k], source, `$.${k}`);
  }
  return v as CheatsheetData;
}

async function fetchJson(relativePath: string, signal?: AbortSignal): Promise<unknown> {
  const url = `${KB_BASE}${relativePath}`;
  let res: Response;
  try {
    res = await fetch(url, { signal, cache: 'no-cache' });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error(`无法请求 ${url}（${err instanceof Error ? err.message : '网络错误'}）`);
  }
  if (!res.ok) throw new Error(`无法加载 ${url}（HTTP ${res.status}）`);
  try {
    return await res.json();
  } catch {
    throw new Error(`${url} 不是合法 JSON，请检查语法（逗号 / 引号 / 括号）`);
  }
}

export async function loadKnowledgeBase(signal?: AbortSignal): Promise<KnowledgeBase> {
  const rawManifest = asObject(await fetchJson('manifest.json', signal), 'manifest.json', '$');
  const chapterPaths = asArray(rawManifest.chapters, 'manifest.json', '$.chapters').map((p, i) =>
    asString(p, 'manifest.json', `$.chapters[${i}]`),
  );
  if (chapterPaths.length === 0) fail('manifest.json', '$.chapters', '至少需要 1 个章节文件');
  const cheatsheetPath = asString(rawManifest.cheatsheet, 'manifest.json', '$.cheatsheet');

  const [chapters, cheatsheet] = await Promise.all([
    Promise.all(
      chapterPaths.map(async (p) => validateChapter(await fetchJson(p, signal), p)),
    ),
    fetchJson(cheatsheetPath, signal).then((v) => validateCheatsheet(v, cheatsheetPath)),
  ]);

  chapters.sort((a, b) => a.number - b.number);
  const lessons = chapters.flatMap((ch) => ch.lessons);
  const slugs = new Set<string>();
  for (const l of lessons) {
    if (slugs.has(l.slug)) throw new Error(`知识库课程 slug "${l.slug}" 重复，路由将无法区分`);
    slugs.add(l.slug);
  }
  return { chapters, lessons, cheatsheet };
}