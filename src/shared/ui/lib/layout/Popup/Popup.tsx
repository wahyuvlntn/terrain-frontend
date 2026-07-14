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
            'fixed inset-0 flex items-center justify-center bg-black/30 box-border h-screen w-screen',
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
            className="font-inherit text-base text-(--afdd-neutral-text-title-heading) p-4 rounded-lg bg-(--afdd-background-low) flex flex-col gap-4 min-w-127.5"
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="w-full flex items-center gap-4">
              <div className="flex-[1_0_0] w-0 flex items-center gap-[0.375em] text-[1.375em] font-semibold">
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
