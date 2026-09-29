import { AnimatePresence, motion } from 'framer-motion';
import { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { default as CloseIcon } from '../../icons/CloseIcon';
import { cn } from '../../utils';

interface PopupProps extends PropsWithChildren {
  open: boolean;
  onClose: (closedBy: 'blur' | 'close-icon') => void;
  afterClose?: () => void;
  title: string;
  titlePrefix?: ReactNode;
  titleSuffix?: ReactNode;
  rightTopComponent?: ReactNode;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
}

export const Popup = ({
  children,
  open,
  onClose,
  afterClose,
  title,
  titlePrefix,
  titleSuffix,
  rightTopComponent,
  wrapperClassName,
  wrapperStyle,
}: PopupProps) => {
  return createPortal(
    <AnimatePresence onExitComplete={afterClose}>
      {open ? (
        <motion.div
          style={{ ...wrapperStyle }}
          className={cn(
            // above the page (sticky table headers, panels), below popovers (1000) and the assistant (1100)
            'fixed inset-0 z-[900] flex items-center justify-center bg-black/30 box-border h-screen w-screen',
            wrapperClassName
          )}
          onMouseDown={(e) => {
            e.stopPropagation();
            onClose('blur');
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="font-inherit text-base text-(--afdd-neutral-text-title-heading) p-5 rounded-[6px] bg-(--afdd-background-low) border border-(--look-line) flex flex-col gap-4 min-w-127.5"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="w-full flex items-center gap-4">
              <div className="flex-[1_0_0] w-0 flex items-center gap-[0.5em] text-[1.25em] font-semibold before:content-[''] before:shrink-0 before:w-1 before:h-5 before:rounded-[2px] before:bg-(--afdd-brand-surface-default-primary)">
                {titlePrefix ? (
                  <div
                    className="shrink-0 flex justify-center items-center whitespace-nowrap min-w-[1.15em]"
                    title={typeof titlePrefix === 'string' ? titlePrefix : undefined}
                  >
                    {titlePrefix}
                  </div>
                ) : null}

                <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={title}>
                  {title}
                </span>

                {titleSuffix ? (
                  <div
                    className="shrink-0 flex justify-center items-center whitespace-nowrap min-w-[1.15em]"
                    title={typeof titleSuffix === 'string' ? titleSuffix : undefined}
                  >
                    {titleSuffix}
                  </div>
                ) : null}
              </div>
              {rightTopComponent}
              <div
                className="cursor-pointer flex justify-center items-center w-5 h-5"
                onClick={() => {
                  onClose('close-icon');
                }}
              >
                <CloseIcon />
              </div>
            </div>
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};
