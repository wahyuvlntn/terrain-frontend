/* eslint-disable simple-import-sort/imports */
import { motion, useAnimationControls } from 'framer-motion';
import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Node for drag alarm/parameter
type NodeProps = {
  children: ReactNode;
  type: string;
  data: string;
};
export const WrapperNode = ({ children, data, type }: NodeProps) => {
  // state for rendering draggable item
  const ref = useRef<HTMLDivElement>(null);
  const [initialPos, setInitialPos] = useState<DOMRect>();
  useLayoutEffect(() => {
    setInitialPos(ref?.current?.getBoundingClientRect());
  }, []);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // drag handler
  const onDrag = (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    setCursorPos({ x: e.clientX, y: e.clientY });
  };
  const onDragEnd = async () => {
    setDragging(false);
    await controls.start({
      opacity: 0,
      scale: 0,
      transition: {
        duration: 0.15,
        ease: 'easeInOut',
      },
    });
  };
  const onDragStart = async (event: React.DragEvent) => {
    event.dataTransfer.setDragImage(new Image(), 0, 0);
    event.dataTransfer.setData(type, data);
    event.stopPropagation();
    // show overlay
    setDragging(true);
    setOffset({
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    });
    // animation stuff
    controls.set({
      opacity: 0,
      scale: 0,
      transition: {
        duration: 0,
      },
    });
    await controls.start(
      {
        opacity: 1,
        scale: 1,
      },
      {
        duration: 0.15,
      }
    );
  };

  // overlay component
  const controls = useAnimationControls();
  const overlay = dragging
    ? createPortal(
        <motion.div
          initial={{
            position: 'absolute',
            zIndex: 1000,
          }}
          style={{
            top: initialPos?.top + 'px',
            left: initialPos?.left + 'px',
            minWidth: '320px',
            height: initialPos?.height + 'px',
            x: cursorPos.x - offset.x - (initialPos?.x || 0),
            y: cursorPos.y - offset.y - (initialPos?.y || 0),
            willChange: 'transform',
            pointerEvents: 'none',
            opacity: 0.7,
          }}
        >
          <div>{children}</div>
        </motion.div>,
        document.body
      )
    : undefined;

  const onPointerDown = (e: React.MouseEvent) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const component = dragging ? children : children; // consider remove children when drag
  return (
    <div
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrag={onDrag}
      onPointerDown={onPointerDown}
      ref={ref}
      draggable
    >
      {component}
      {overlay}
    </div>
  );
};
