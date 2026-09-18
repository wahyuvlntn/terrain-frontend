import { Component, ErrorInfo, ReactNode } from 'react';

import styles from '../ai-assistant.module.scss';

type Props = {
  children: ReactNode;
  /** a new value (the block was updated, e.g. while it streams) renders the block again */
  resetKey: unknown;
};
type State = { failed: boolean; resetKey: unknown };

/**
 * Contains a part of an answer that fails to render (a chart echarts rejects, an unexpected
 * payload): it shows a short note in its place instead of taking down the whole conversation.
 */
export class BlockBoundary extends Component<Props, State> {
  override state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { failed: false, resetKey: props.resetKey };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AI assistant: a message block failed to render', error, info.componentStack);
  }

  override render() {
    return this.state.failed ? (
      <p className={styles.msg__note} role="note">
        This part of the answer could not be displayed.
      </p>
    ) : (
      this.props.children
    );
  }
}
