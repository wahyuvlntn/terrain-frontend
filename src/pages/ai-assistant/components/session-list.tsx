import { Button } from '@digital-twin/components';
import { Plus, TrashDelete } from '@digital-twin/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { format } from 'date-fns';
import { KeyboardEvent, useState } from 'react';
import styles from '../ai-assistant.module.scss';
import { assistantStore, errorText } from '../ai-assistant.store';
import { ASSISTANT_QUERY, deleteSession, listSessions } from '../api/ai-assistant.api';

/** "just now", "12 min ago", "3 h ago", else the date */
const when = (iso: string | null) => {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const minutes = Math.round((Date.now() - t) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return format(t, 'dd MMM yyyy');
};

type SessionListProps = { currentId: string | null; streaming: boolean };

/** The user's conversations: open one, start a new one, delete one (after a confirmation) */
export const SessionList = ({ currentId, streaming }: SessionListProps) => {
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: sessions, isLoading } = useQuery({
    queryKey: ASSISTANT_QUERY.sessions,
    queryFn: listSessions,
    meta: { toastId: 'aiAssistantSessions' },
  });

  const remove = useMutation({
    mutationFn: deleteSession,
    meta: { toastId: 'aiAssistantDeleteSession', hideToast: true },
    onSuccess: (id) => {
      setError('');
      assistantStore.sessionDeleted(id);
    },
    onError: (e) => setError(errorText(e, 'The conversation could not be deleted.')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ASSISTANT_QUERY.sessions }),
  });

  return (
    <nav
      className={styles.sessions}
      aria-label="Conversations"
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape' && confirmId) {
          // Esc withdraws a pending delete before it closes the list
          e.stopPropagation();
          setConfirmId(null);
        }
      }}
    >
      <Button
        color="default-secondary"
        icon={<Plus aria-hidden="true" />}
        className={styles.sessions__new}
        disabled={streaming}
        title={streaming ? 'Wait for the answer (or stop it) to switch' : undefined}
        onClick={() => assistantStore.newChat()}
      >
        New conversation
      </Button>
      {error ? (
        <p className={styles.sessions__error} role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p className={styles.sessions__hint} role="status">
          Loading…
        </p>
      ) : !sessions?.length ? (
        <p className={styles.sessions__hint}>No saved conversations</p>
      ) : (
        <ul>
          {sessions.map((s) => {
            const current = s.id === currentId;
            return (
              <li key={s.id} className={clsx(current && styles['sessions__item--current'])}>
                {confirmId === s.id ? (
                  // never confirmed by the keystroke that asked: Delete is not focused
                  <div
                    className={styles['session-confirm']}
                    role="alertdialog"
                    aria-label="Confirm delete"
                  >
                    <span>Delete “{s.title}”?</span>
                    <div>
                      <Button
                        color="default-secondary"
                        className={styles['std-btn']}
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="error"
                        className={styles['std-btn']}
                        onClick={() => {
                          setConfirmId(null);
                          remove.mutate(s.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.sessions__row}>
                    <button
                      type="button"
                      className={styles.sessions__open}
                      aria-current={current ? 'true' : undefined}
                      disabled={streaming && !current}
                      onClick={() => {
                        if (!current) void assistantStore.openSession(s.id);
                        assistantStore.setShowSessions(false);
                      }}
                    >
                      <span>{s.title}</span>
                      <small>{when(s.updatedAt)}</small>
                    </button>
                    <button
                      type="button"
                      className={styles.icon}
                      aria-label={`Delete conversation “${s.title}”`}
                      title="Delete"
                      disabled={(streaming && current) || remove.isPending}
                      onClick={() => setConfirmId(s.id)}
                    >
                      <TrashDelete />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
};
