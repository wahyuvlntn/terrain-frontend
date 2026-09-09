import { Close } from '@digital-twin/icons';
import clsx from 'clsx';
import { MutableRefObject, ReactNode, useEffect, useRef, useState } from 'react';

import { TwinViewer } from '../../viewer/twin-viewer';
import styles from './overlay.module.scss';

type TwinOverlayProps = {
  viewerRef: MutableRefObject<TwinViewer | null>;
  /** node the card points at */
  nodeId: string;
  onClose: () => void;
  children: ReactNode;
};

const EDGE = 12;
const TOOLBAR = 56;

/**
 * Floating HTML card over the 3D view (not a 3D object). It docks to the side away from the
 * selected object and draws a leader line to it that follows the camera every frame. The card
 * fits the view: it grows with its content up to the view's height, then the dashboard's active
 * tab scrolls.
 */
export const TwinOverlay = ({ viewerRef, nodeId, onClose, children }: TwinOverlayProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPolylineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [side, setSide] = useState<'right' | 'left'>('right');
  const sideRef = useRef(side);
  sideRef.current = side;

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-subscribe after the card flips sides so the leader is redrawn without a camera move
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const update = () => {
      const card = cardRef.current;
      const line = lineRef.current;
      const dot = dotRef.current;
      const host = card?.parentElement;
      if (!card || !line || !dot || !host) return;
      const anchor = viewer.projectNode(nodeId);
      const hostRect = host.getBoundingClientRect();
      const r = card.getBoundingClientRect();
      const left = r.left - hostRect.left;
      const right = left + r.width;
      const top = r.top - hostRect.top;
      if (!anchor || !anchor.visible) {
        line.setAttribute('visibility', 'hidden');
        dot.setAttribute('visibility', 'hidden');
        return;
      }
      // keep the card on the side away from the object; only move when the other side
      // actually leaves the object visible (a narrow view may have room on neither side)
      const w = hostRect.width;
      const clearOnRight = anchor.x < w - r.width - TOOLBAR - 40;
      const clearOnLeft = anchor.x > r.width + EDGE + 40;
      if (sideRef.current === 'right' && !clearOnRight && clearOnLeft) setSide('left');
      else if (sideRef.current === 'left' && !clearOnLeft && clearOnRight) setSide('right');
      const fromX = sideRef.current === 'right' ? left : right;
      const fromY = Math.min(Math.max(anchor.y, top + 28), top + r.height - 28);
      const elbowX = fromX + (sideRef.current === 'right' ? -24 : 24);
      line.setAttribute('points', `${fromX},${fromY} ${elbowX},${fromY} ${anchor.x},${anchor.y}`);
      line.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', String(anchor.x));
      dot.setAttribute('cy', String(anchor.y));
      dot.setAttribute('visibility', 'visible');
    };
    const unsubscribe = viewer.addRenderListener(update);
    const ro = new ResizeObserver(update);
    if (cardRef.current) ro.observe(cardRef.current);
    update();
    return () => {
      unsubscribe();
      ro.disconnect();
    };
  }, [viewerRef, nodeId, side]);

  return (
    <>
      <svg className={styles['twin-overlay__leader']} aria-hidden="true">
        <polyline ref={lineRef} visibility="hidden" />
        <circle ref={dotRef} r="4" visibility="hidden" />
      </svg>
      <div
        ref={cardRef}
        className={clsx(styles['twin-overlay'], styles[`twin-overlay--${side}`])}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles['twin-overlay__close']}
          aria-label="Close dashboard"
          onClick={onClose}
        >
          <Close />
        </button>
        {children}
      </div>
    </>
  );
};
