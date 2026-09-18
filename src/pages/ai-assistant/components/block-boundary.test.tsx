import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlockBoundary } from './block-boundary';

const Broken = (): ReactElement => {
  throw new Error('setOption failed');
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BlockBoundary', () => {
  it('replaces a block that fails to render with a note, and retries when the block changes', () => {
    // React and the boundary log the caught error
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      <div>
        <BlockBoundary resetKey={1}>
          <Broken />
        </BlockBoundary>
        <BlockBoundary resetKey={1}>
          <p>The rest of the answer</p>
        </BlockBoundary>
      </div>
    );
    expect(screen.getByRole('note')).toHaveTextContent(
      'This part of the answer could not be displayed.'
    );
    expect(screen.getByText('The rest of the answer')).toBeInTheDocument();

    // the same block stays replaced; an updated one renders again
    rerender(
      <div>
        <BlockBoundary resetKey={1}>
          <p>Fixed</p>
        </BlockBoundary>
      </div>
    );
    expect(screen.queryByText('Fixed')).toBeNull();
    rerender(
      <div>
        <BlockBoundary resetKey={2}>
          <p>Fixed</p>
        </BlockBoundary>
      </div>
    );
    expect(screen.getByText('Fixed')).toBeInTheDocument();
    expect(screen.queryByRole('note')).toBeNull();
  });
});
