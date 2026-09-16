import clsx from 'clsx';
import { useMemo } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from '../ai-insights.module.scss';

/** `[3]` or `[1, 4]` citations; not link text (`[1](…)`), definitions (`[1]: …`) or `[1][ref]` */
const CITATION = /\[(\d{1,3}(?:\s*,\s*\d{1,3})*)\](?![(:[])/g;
const SOURCE_HREF = /^#source-(\d+)$/;

/** Turns the instruction's `[n]` citations into links the renderer opens as sources */
export const linkCitations = (md: string) =>
  md.replace(CITATION, (_, list: string) =>
    list
      .split(',')
      .map((n) => `[[${n.trim()}]](#source-${n.trim()})`)
      .join(' ')
  );

type MarkdownViewProps = {
  children: string;
  /** makes `[n]` citations clickable */
  onCite?: (n: number) => void;
  className?: string;
};

/**
 * Markdown written by the language model (GFM tables and lists). Raw HTML is not rendered, link
 * targets are sanitised by react-markdown, images are not loaded (their alt text is shown) and
 * external links open in a new tab without an opener or referrer.
 */
export const MarkdownView = ({ children, onCite, className }: MarkdownViewProps) => {
  const components = useMemo<Components>(
    () => ({
      a: ({ href, children: text }) => {
        const cite = href?.match(SOURCE_HREF);
        if (cite && onCite) {
          const n = Number(cite[1]);
          return (
            <button
              type="button"
              className={styles.md__cite}
              title={`Open source ${n}`}
              onClick={() => onCite(n)}
            >
              {text}
            </button>
          );
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {text}
          </a>
        );
      },
      // never load remote images from model output: show the alt text instead
      img: ({ alt }) => (alt ? <span className={styles.md__img}>[{alt}]</span> : null),
    }),
    [onCite]
  );

  return (
    <div className={clsx(styles.md, className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {onCite ? linkCitations(children) : children}
      </Markdown>
    </div>
  );
};
