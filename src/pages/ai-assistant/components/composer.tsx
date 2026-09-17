import { Badge, Button } from '@digital-twin/components';
import { SendFill, StopFill } from '@digital-twin/icons';
import { forwardRef, KeyboardEvent, useId, useLayoutEffect, useRef, useState } from 'react';

import styles from '../ai-assistant.module.scss';
import { assistantStore } from '../ai-assistant.store';

const MAX_LENGTH = 4000;
const MAX_HEIGHT = 160;

/** the unsent text survives the panel closing and remounts of the layout */
let draftCache = '';

type ComposerProps = {
  streaming: boolean;
  /** no message can be sent (a conversation is loading) */
  disabled: boolean;
  /** what the question is sent with ("Digital twin · CH_01") */
  contextLabel: string;
};

/**
 * The question box: Enter sends, Shift+Enter starts a new line; while an answer streams the send
 * button becomes Stop.
 */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(
  ({ streaming, disabled, contextLabel }, forwardedRef) => {
    const [draft, setDraft] = useState(draftCache);
    const local = useRef<HTMLTextAreaElement | null>(null);
    const hintId = useId();

    const update = (text: string) => {
      draftCache = text;
      setDraft(text);
    };

    // grow with the text up to MAX_HEIGHT, then scroll
    // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the text changes
    useLayoutEffect(() => {
      const el = local.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    }, [draft]);

    const canSend = !streaming && !disabled && !!draft.trim();

    const submit = () => {
      if (!canSend) return;
      if (assistantStore.send(draft)) update('');
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter that commits an IME composition is not a send (Safari reports it as keyCode 229
      // after the composition has already ended)
      if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) {
        return;
      }
      e.preventDefault();
      submit();
    };

    return (
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {contextLabel ? (
          <Badge
            color="secondary"
            className={styles.composer__context}
            id={hintId}
            title={`The question is sent with this context: ${contextLabel}`}
          >
            {contextLabel}
          </Badge>
        ) : null}
        <div className={styles.composer__row}>
          <textarea
            ref={(el) => {
              local.current = el;
              if (typeof forwardedRef === 'function') forwardedRef(el);
              else if (forwardedRef) forwardedRef.current = el;
            }}
            rows={1}
            maxLength={MAX_LENGTH}
            value={draft}
            placeholder="Ask about the plant, alarms, maintenance or a what-if…"
            aria-label="Message to the AI assistant"
            aria-describedby={contextLabel ? hintId : undefined}
            disabled={disabled}
            onChange={(e) => update(e.target.value)}
            onKeyDown={onKeyDown}
          />
          {/* one element for Send and Stop, never `disabled`: a focused button that is replaced
              or disabled drops the focus to the page (and Esc no longer reaches the panel) */}
          <Button
            type={streaming ? 'button' : 'submit'}
            color={streaming ? 'error' : 'default-primary'}
            icon={streaming ? <StopFill /> : <SendFill />}
            className={styles.composer__btn}
            aria-disabled={!streaming && !canSend ? true : undefined}
            onClick={
              streaming
                ? (e) => {
                    // Stop only stops: the re-render it causes turns this button into the submit
                    // button before the click's default action runs, which would send a draft
                    // typed while the answer streamed
                    e.preventDefault();
                    assistantStore.stop();
                  }
                : undefined
            }
            aria-label={streaming ? 'Stop the answer' : 'Send'}
            title={streaming ? 'Stop' : 'Send (Enter)'}
          />
        </div>
      </form>
    );
  }
);
Composer.displayName = 'Composer';
