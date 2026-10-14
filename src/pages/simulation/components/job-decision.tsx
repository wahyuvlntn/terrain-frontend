import {
  AuthCtx,
  Button,
  InfoTooltip,
  Input,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '@digital-twin/components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { KeyboardEvent, useContext, useEffect, useRef, useState } from 'react';

import { approveJob, cancelJob, rejectJob, SIM_QUERY, SimJob } from '../api/simulation.api';
import styles from '../simulation.module.scss';
import { errorText } from './job-bits';

type Decision = 'approve' | 'reject' | 'cancel';

const CONFIRM_LABEL: Record<Decision, string> = {
  approve: 'Approve and queue',
  reject: 'Reject',
  cancel: 'Cancel simulation',
};

const DONE_TEXT: Record<Decision, string> = {
  approve: 'Approved and queued',
  reject: 'Rejected: it will not run',
  cancel: 'Cancelled: it will not run',
};

/** what a refused decision (HTTP 403) means */
const FORBIDDEN_TEXT: Record<Decision, string> = {
  approve: 'Not allowed: you cannot approve this simulation.',
  reject: 'Not allowed: you cannot reject this simulation.',
  cancel:
    'Not allowed: only the person who requested this simulation or an administrator can cancel it (only an administrator for optimizer and analytics runs).',
};

const decisionError = (err: unknown, decision: Decision) =>
  (err as { statusCode?: number } | null)?.statusCode === 403
    ? FORBIDDEN_TEXT[decision]
    : errorText(err);

/** runs started by the plant's own services: only an administrator may cancel them */
const MACHINE_ORIGINS: readonly SimJob['origin'][] = ['optimizer', 'analytics'];

/**
 * Human decisions on a job: approve or reject an AI proposal (PROPOSED), cancel a job that has not
 * started (PROPOSED / QUEUED). Like the twin's plant controls, every decision is confirmed inline
 * first: the confirmation is never focused by the keystroke that asked for it, Enter in the
 * reason field doesn't confirm, and Esc cancels. Cancel is offered to the job's requester and to
 * administrators only (optimizer and analytics runs: administrators only), as the backend allows.
 */
export const JobDecision = ({ job }: { job: SimJob }) => {
  const queryClient = useQueryClient();
  const { hasPermission, userData } = useContext(AuthCtx);
  const canDecide = hasPermission(
    PermissionGroupAliasEnum.enum.simulation,
    PermissionAliasEnum.enum.create
  );
  const isAdmin = userData?.role === 'admin' || userData?.role === 'superuser';
  // by id when the backend sends it (older backends: by name); the backend makes the real check
  const isRequester =
    userData?.id != null && job.requestedBy != null
      ? job.requestedBy === userData.id
      : !!userData?.fullName && job.requestedByName === userData.fullName;
  const machineRun = MACHINE_ORIGINS.includes(job.origin);
  const mayCancel = isAdmin || (!machineRun && isRequester);
  const [asking, setAsking] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  // the confirmation replaces the button that asked: it takes the focus (so Esc reaches it), its
  // Confirm button does not
  useEffect(() => {
    if (asking) confirmRef.current?.focus();
  }, [asking]);

  const decide = useMutation({
    mutationFn: ({ decision, note }: { decision: Decision; note: string }) => {
      if (decision === 'approve') return approveJob(job.id);
      if (decision === 'reject') return rejectJob(job.id, note);
      return cancelJob(job.id);
    },
    // the result shows inline; failures also raise the app's error toast
    meta: { toastId: 'simulationDecision', hideToast: true },
    onSuccess: (_row, { decision }) => {
      setOutcome({ ok: true, text: DONE_TEXT[decision] });
      setReason('');
    },
    onError: (err, { decision }) => setOutcome({ ok: false, text: decisionError(err, decision) }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SIM_QUERY.job(job.id) });
      queryClient.invalidateQueries({ queryKey: SIM_QUERY.jobs });
    },
  });

  const proposed = job.status === 'PROPOSED';
  const cancellable = proposed || job.status === 'QUEUED';
  if (!cancellable && !outcome) return null;
  const offerCancel = !proposed && cancellable && mayCancel;

  const disabled = !canDecide || decide.isPending;
  const noPermission = canDecide
    ? undefined
    : `${proposed ? 'Approving or rejecting' : 'Cancelling'} needs the Simulation › Create permission`;
  const ask = (decision: Decision) => {
    setOutcome(null);
    setAsking(decision);
  };
  const confirm = () => {
    if (!asking) return;
    decide.mutate({ decision: asking, note: reason });
    setAsking(null);
  };

  const question =
    asking === 'approve'
      ? `Approve #${job.id}? It runs on a copy of the plant model.`
      : asking === 'reject'
        ? `Reject #${job.id}?`
        : `Cancel #${job.id}?`;

  return (
    <div
      className={styles.decision}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !asking) return;
        e.stopPropagation();
        setAsking(null);
      }}
    >
      {asking ? (
        <div
          ref={confirmRef}
          tabIndex={-1}
          className={styles.confirm}
          role="alertdialog"
          aria-label="Confirm decision"
        >
          <span className={styles.confirm__question}>{question}</span>
          {asking === 'reject' ? (
            <div
              className={styles.confirm__reason}
              onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                // the keystroke must not also press a button of the confirmation
                if (e.key === 'Enter') e.preventDefault();
              }}
            >
              <Input
                placeholder="Reason (optional)"
                background="dark"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                inputProps={{ 'aria-label': 'Reason for rejecting', maxLength: 500 }}
              />
            </div>
          ) : null}
          <Button
            type="button"
            color={asking === 'approve' ? 'default-primary' : 'error'}
            onClick={confirm}
          >
            {CONFIRM_LABEL[asking]}
          </Button>
          <Button type="button" color="default-secondary" onClick={() => setAsking(null)}>
            Back
          </Button>
        </div>
      ) : (
        <>
          {proposed ? (
            <span className={styles.decision__lead}>
              {job.origin === 'agent' ? 'Proposed by LEVO' : 'Waiting for approval'}
              <InfoTooltip
                title="Approval"
                content="A proposed simulation runs only once a person approves it."
              />
            </span>
          ) : null}
          {decide.isPending ? (
            <span className={styles.decision__status} role="status">
              Sending…
            </span>
          ) : outcome ? (
            <span
              className={clsx(
                styles.decision__status,
                !outcome.ok && styles['decision__status--error']
              )}
              role="status"
            >
              {outcome.text}
            </span>
          ) : null}
          {cancellable ? (
            <div className={styles.decision__buttons} title={noPermission}>
              {proposed ? (
                <>
                  <Button type="button" disabled={disabled} onClick={() => ask('approve')}>
                    Approve
                  </Button>
                  <Button
                    type="button"
                    color="default-secondary"
                    disabled={disabled}
                    onClick={() => ask('reject')}
                  >
                    Reject
                  </Button>
                </>
              ) : offerCancel ? (
                <Button
                  type="button"
                  color="default-secondary"
                  disabled={disabled}
                  onClick={() => ask('cancel')}
                >
                  Cancel simulation
                </Button>
              ) : (
                <span className={styles.caption}>
                  {machineRun
                    ? `Only an administrator can cancel a simulation started by the ${job.origin}.`
                    : `Only ${job.requestedByName || 'the person who requested it'} or an administrator can cancel this simulation.`}
                </span>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
