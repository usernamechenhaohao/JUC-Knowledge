import { Fragment, type ReactNode } from 'react';

function renderCodeSpans(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let buf = '';
  let k = 0;

  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1 && end > i + 1) {
        if (buf) {
          out.push(<Fragment key={`${keyPrefix}-t-${k++}`}>{buf}</Fragment>);
          buf = '';
        }
        out.push(
          <code key={`${keyPrefix}-c-${k++}`} className="inline-code">
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }

  if (buf) {
    out.push(<Fragment key={`${keyPrefix}-t-${k++}`}>{buf}</Fragment>);
  }
  return out;
}

function findBoldClose(text: string, start: number): number {
  let j = start;
  while (j < text.length) {
    if (text[j] === '`') {
      const codeEnd = text.indexOf('`', j + 1);
      if (codeEnd !== -1 && codeEnd > j + 1) {
        j = codeEnd + 1;
        continue;
      }
    }
    if (text[j] === '*' && text[j + 1] === '*') {
      return j;
    }
    j += 1;
  }
  return -1;
}

/** Renders inline `code` and **bold** spans without dangerouslySetInnerHTML. */
export function renderRichText(text: string): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  let buf = '';
  let k = 0;

  while (i < text.length) {
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1 && end > i + 1) {
        if (buf) {
          out.push(<Fragment key={`t-${k++}`}>{buf}</Fragment>);
          buf = '';
        }
        out.push(
          <code key={`c-${k++}`} className="inline-code">
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }

    if (text[i] === '*' && text[i + 1] === '*') {
      const closeIdx = findBoldClose(text, i + 2);
      if (closeIdx !== -1 && closeIdx > i + 2) {
        if (buf) {
          out.push(<Fragment key={`t-${k++}`}>{buf}</Fragment>);
          buf = '';
        }
        const boldKey = `b-${k++}`;
        const inner = text.slice(i + 2, closeIdx);
        out.push(<strong key={boldKey}>{renderCodeSpans(inner, boldKey)}</strong>);
        i = closeIdx + 2;
        continue;
      }
    }

    buf += text[i];
    i += 1;
  }

  if (buf) {
    out.push(<Fragment key={`t-${k++}`}>{buf}</Fragment>);
  }
  return out;
}