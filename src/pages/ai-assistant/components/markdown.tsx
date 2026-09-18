import { MouseEvent, memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import styles from '../ai-assistant.module.scss';

const PLUGINS = [remarkGfm];

/** an in-app link written by the assistant (e.g. /digital-twin?node=…) */
const isAppPath = (href: string) => href.startsWith('/') && !href.startsWith('//');

type MarkdownProps = { text: string; streaming?: boolean };

/**
 * Assistant text as GitHub-flavoured Markdown. Raw HTML in the text is dropped (`skipHtml`), URLs
 * go through react-markdown's safe-protocol filter, images are not loaded (their alt text is shown),
 * app paths navigate in place and other links open in a new tab without an opener.
 */
export const Markdown = memo(({ text, streaming }: MarkdownProps) => {
  const navigate = useNavigate();

  const components: Components = {
    a: ({ href, children }) => {
      if (!href) return <span>{children}</span>;
      if (isAppPath(href)) {
        return (
          <a
            href={href}
            onClick={(e: MouseEvent<HTMLAnchorElement>) => {
              if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              navigate(href);
            }}
          >
            {children}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow">
          {children}
        </a>
      );
    },
    img: ({ alt }) => (alt ? <span className={styles.md__img}>[{alt}]</span> : null),
    table: ({ children }) => (
      <div className={styles.md__table}>
        <table>{children}</table>
      </div>
    ),
  };

  return (
    <div className={styles.md} data-streaming={streaming || undefined}>
      <ReactMarkdown remarkPlugins={PLUGINS} skipHtml components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
Markdown.displayName = 'Markdown';
