import '@testing-library/jest-dom/vitest';

import { AuthCtx } from '@digital-twin/components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SimJob } from '../api/simulation.api';
import { JobDecision } from './job-decision';

// the shared double plus plain stand-ins of the UI kit parts the decision renders
vi.mock('@digital-twin/components', async () => {
  const { createElement } = await import('react');
  return {
    ...(await import('../../digital-twin/testing/digital-twin-components.mock')),
    Button: ({ color: _c, icon: _i, ...props }: Record<string, unknown>) =>
      createElement('button', { type: 'button', ...props }),
    Input: ({ inputProps, value, onChange, placeholder }: Record<string, object>) =>
      createElement('input', { ...inputProps, value, onChange, placeholder }),
    InfoTooltip: () => null,
  };
});
vi.mock('@digital-twin/utils', () => ({ jsRequest: vi.fn() }));

const sim = vi.hoisted(() => ({ cancelJob: vi.fn(), approveJob: vi.fn(), rejectJob: vi.fn() }));
vi.mock('../api/simulation.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/simulation.api')>()),
  ...sim,
}));

const JOB: SimJob = {
  id: 21,
  kind: 'scenario',
  title: 'Tower fan test',
  origin: 'ui',
  status: 'QUEUED',
  progress: 0,
  rationale: null,
  requestedBy: 3,
  requestedByName: 'Sarah Lim',
  approvedByName: null,
  approvedAt: null,
  createdAt: '2026-10-10T06:00:00Z',
  startedAt: null,
  finishedAt: null,
  simStart: null,
  simEnd: null,
  stepS: 60,
  recommendationId: null,
  error: null,
  variants: [],
};

const renderDecision = (job: SimJob, fullName: string, role: 'basic' | 'admin' | 'superuser') => {
  const auth = {
    userData: { fullName, role },
    hasPermission: () => true,
  } as unknown as ContextType<typeof AuthCtx>;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthCtx.Provider value={auth}>
        <JobDecision job={job} />
      </AuthCtx.Provider>
    </QueryClientProvider>
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('JobDecision cancel', () => {
  it('is offered to the requester and to administrators only', () => {
    renderDecision(JOB, 'Sarah Lim', 'basic');
    expect(screen.getByRole('button', { name: 'Cancel simulation' })).toBeInTheDocument();
    cleanup();

    renderDecision(JOB, 'Jason Teo', 'basic');
    expect(screen.queryByRole('button', { name: 'Cancel simulation' })).toBeNull();
    expect(screen.getByText(/Only Sarah Lim or an administrator can cancel/)).toBeInTheDocument();
    cleanup();

    renderDecision(JOB, 'Jason Teo', 'superuser');
    expect(screen.getByRole('button', { name: 'Cancel simulation' })).toBeInTheDocument();
  });

  it('leaves optimizer and analytics runs to administrators', () => {
    const run = { ...JOB, origin: 'optimizer' as const };
    renderDecision(run, 'Sarah Lim', 'basic');
    expect(screen.queryByRole('button', { name: 'Cancel simulation' })).toBeNull();
    expect(
      screen.getByText('Only an administrator can cancel a simulation started by the optimizer.')
    ).toBeInTheDocument();
    cleanup();

    renderDecision(run, 'Jason Teo', 'admin');
    expect(screen.getByRole('button', { name: 'Cancel simulation' })).toBeInTheDocument();
  });

  it('explains a refused cancel (403)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    sim.cancelJob.mockRejectedValue(Object.assign(new Error('forbidden'), { statusCode: 403 }));
    renderDecision(JOB, 'Sarah Lim', 'basic');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel simulation' }));
    // the confirmation replaced the button that asked; its own button confirms
    const dialog = screen.getByRole('alertdialog', { name: 'Confirm decision' });
    expect(sim.cancelJob).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel simulation' }));
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    expect(sim.cancelJob).toHaveBeenCalledWith(21);
    expect(screen.getByRole('status')).toHaveTextContent(
      /Not allowed: only the person who requested this simulation or an administrator can cancel it/
    );
  });

  it('approves only after a confirmation that Enter in the reason and Esc cannot pass', async () => {
    const proposed = { ...JOB, status: 'PROPOSED' as const, origin: 'agent' as const };
    sim.rejectJob.mockResolvedValue({ ...proposed, status: 'REJECTED' });
    renderDecision(proposed, 'Jason Teo', 'basic');

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Confirm decision' });
    // the confirmation is focused, not its Confirm button
    expect(document.activeElement).toBe(dialog);
    const reason = screen.getByLabelText('Reason for rejecting');
    fireEvent.change(reason, { target: { value: 'Audit week' } });
    const enter = fireEvent.keyDown(reason, { key: 'Enter' });
    expect(enter).toBe(false);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(sim.rejectJob).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText('Reason for rejecting'), {
      target: { value: 'Audit week' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reject' })[0]);
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
    expect(sim.rejectJob).toHaveBeenCalledWith(21, 'Audit week');
    expect(screen.getByRole('status')).toHaveTextContent('Rejected');
  });
});
