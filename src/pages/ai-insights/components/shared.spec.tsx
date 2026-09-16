import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmPopup } from './shared';

// the component barrel pulls in heavy editors; the popup is a form with a submit button, as the
// real one (navigation/popup.tsx)
vi.mock('@digital-twin/components', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Dropdown: () => null,
  InfoTooltip: () => null,
  Popup: ({
    open,
    children,
    onSubmit,
    onClose,
    submitButtonLabel,
    disableSubmit,
  }: {
    open: boolean;
    children: ReactNode;
    onSubmit?: () => void;
    onClose: () => void;
    submitButtonLabel?: string;
    disableSubmit?: boolean;
  }) =>
    open ? (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        {children}
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" disabled={disableSubmit}>
          {submitButtonLabel}
        </button>
      </form>
    ) : null,
}));

afterEach(cleanup);

const renderConfirm = () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmPopup
      open
      title="Apply recommendation #7"
      confirmLabel="Apply to plant"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <input aria-label="Note" />
    </ConfirmPopup>
  );
  return { onConfirm, onCancel };
};

describe('ConfirmPopup', () => {
  it('never focuses Confirm: the dialog body takes the focus', async () => {
    renderConfirm();
    const confirm = screen.getByRole('button', { name: /Apply to plant/ });
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(document.activeElement).not.toBe(confirm);
  });

  it('does not confirm on Enter in a field and cancels on Esc', () => {
    const { onConfirm, onCancel } = renderConfirm();
    const field = screen.getByLabelText('Note');
    const enter = fireEvent.keyDown(field, { key: 'Enter' });
    // the default action (implicit form submission) is prevented
    expect(enter).toBe(false);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('confirms with the button', () => {
    const { onConfirm } = renderConfirm();
    fireEvent.click(screen.getByRole('button', { name: /Apply to plant/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
