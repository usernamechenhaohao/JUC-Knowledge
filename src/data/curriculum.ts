import type { Chapter, Lesson } from '../types/lesson';

export function getLessonBySlug(lessons: Lesson[], slug: string): Lesson | undefined {
  return lessons.find((l) => l.slug === slug);
}

export function getChapterForLesson(chapters: Chapter[], lesson: Lesson): Chapter {
  return chapters.find((ch) => ch.id === lesson.chapterId) ?? chapters[0];
}

export function getNextLesson(lessons: Lesson[], current: Lesson): Lesson | undefined {
  const idx = lessons.findIndex((l) => l.id === current.id);
  return idx >= 0 ? lessons[idx + 1] : undefined;
}