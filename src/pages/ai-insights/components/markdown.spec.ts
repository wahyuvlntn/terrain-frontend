import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { linkCitations, MarkdownView } from './markdown';

afterEach(cleanup);

describe('linkCitations', () => {
  it('links single and grouped citations', () => {
    expect(linkCitations('Check the fill [1] and the nozzles [2, 3].')).toBe(
      'Check the fill [[1]](#source-1) and the nozzles [[2]](#source-2) [[3]](#source-3).'
    );
  });

  it('leaves links, references and task lists alone', () => {
    const md = 'See [1](https://example.com), [2]: def, [3][ref] and - [ ] todo';
    expect(linkCitations(md)).toBe(md);
  });
});

describe('MarkdownView', () => {
  it('never loads images and opens external links without opener, referrer or follow', () => {
    const { container } = render(
      createElement(MarkdownView, {
        children:
          'Nozzles ![basin photo](https://tracker.example/pixel.png) and ![](https://x.example/a.png). See [the manual](https://example.com/wsc.pdf).',
      })
    );
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('[basin photo]')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'the manual' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  });
});
