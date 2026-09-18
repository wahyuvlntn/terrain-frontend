import { Component, ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * Contains failures of the assistant (its lazy chunk failing to load, a render error) so they
 * never take down the page it floats over: the assistant just disappears until the next reload.
 * Kept outside the assistant chunk so it can wrap the lazy import.
 */
export class AssistantBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AI assistant failed', error, info.componentStack);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
