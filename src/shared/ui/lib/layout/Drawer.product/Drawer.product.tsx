import { AnimatePresence, motion } from 'framer-motion';
import React, { CSSProperties, FormEventHandler, ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { default as CloseIcon } from '../../icons/CloseIcon';
import { ButtonProduct as Button } from '../../input/Button/Button.product';
import { cn } from '../../utils';

export enum ClosedBy {
  EXTERNAL = 0,
  CANCEL = 1,
}

interface DrawerProps {
  /**
   * The content to be displayed inside the drawer.
   * @type {ReactNode}
   */
  children?: ReactNode;

  /**
   * The title of the drawer.
   * @type {string}
   */
  title: string;

  /**
   * The icon to be displayed next to the title.
   * @type {ReactNode}
   */
  icon: ReactNode;

  /**
   * Determines if the drawer is open.
   * @type {boolean}
   */
  open: boolean;

  /**
   * The custom cancel button to be displayed in the drawer footer.
   * @type {React.ReactNode}
   */
  cancelButton?: React.ReactNode;

  /**
   * The custom submit button to be displayed in the drawer footer.
   * @type {React.ReactNode}
   */
  submitButton?: React.ReactNode;

  /**
   * Whether the drawer is in a submitting state.
   * @type {boolean}
   */
  submitting?: boolean;

  /**
   * Whether the submit button is disabled.
   * @type {boolean}
   */
  disableSubmit?: boolean;

  /**
   * An optional information icon to be displayed next to the title.
   * @type {ReactNode}
   */
  informationIcon?: ReactNode;

  /**
   * Callback function called when the drawer is closed.
   */
  onClose: () => void;

  /**
   * Callback function called after the drawer has closed, receiving the reason for closure.
   * @param closedBy - The reason why the drawer was closed.
   */
  afterClose?: (closedBy: ClosedBy) => void;

  /**
   * Callback function called when the form inside the drawer is submitted.
   * @param event - The form submission event.
   */
  onSubmit?: FormEventHandler<HTMLFormElement>;

  contentClassName?: string;
  contentStyle?: CSSProperties;
  bodyClassName?: string;
  bodyStyle?: CSSProperties;
}

export const Drawer = ({
  children,
  cancelButton,
  submitButton,
  icon,
  open,
  title,
  submitting,
  disableSubmit,
  informationIcon,
  onClose,
  afterClose,
  onSubmit,
  contentClassName,
  contentStyle,
  bodyClassName,
  bodyStyle,
}: DrawerProps) => {
  const closedBy = useRef<ClosedBy | undefined>(ClosedBy.EXTERNAL);

  const closeByBlur = () => {
    closedBy.current = undefined;
    onClose();
  };

  const closeByCancel = () => {
    closedBy.current = ClosedBy.CANCEL;
    onClose();
  };

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        if (closedBy.current != null && typeof afterClose === 'function') {
          afterClose(closedBy.current);
        }

        closedBy.current = ClosedBy.EXTERNAL;
      }}
    >
      {open ? (
        <motion.div
          className="fixed inset-0 z-[850] bg-black/30 flex items-start justify-end"
          onMouseDown={closeByBlur}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={cn(
              'flex flex-col items-center gap-4.5 min-w-130.25 max-w-130.25 bg-(--afdd-background-low) border-l border-(--look-line) p-5 h-full box-border',
              contentClassName
            )}
            style={contentStyle}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween' }}
          >
            <div className="flex flex-row items-center justify-between text-(--afdd-neutral-text-title-heading) h-7 w-full">
              <div className="flex flex-row items-center gap-2 text-[20px] font-semibold [&>svg]:cursor-pointer [&>svg]:h-6 [&>svg]:w-6 before:content-[''] before:shrink-0 before:w-1 before:h-5 before:rounded-[2px] before:bg-(--afdd-brand-surface-default-primary)">
                {icon}
                <h3>{title}</h3>
                {informationIcon}
              </div>
              <CloseIcon className="cursor-pointer h-6 w-6" onClick={closeByCancel} />
            </div>
            <form
              onSubmit={onSubmit}
              className="flex flex-col items-center gap-4.5 h-full w-full overflow-hidden"
            >
              <div
                className={cn('h-full w-full rounded overflow-auto', bodyClassName)}
                style={bodyStyle}
              >
                {children}
              </div>
              <div className="flex flex-row items-center gap-3 self-end">
                {cancelButton &&
                  React.cloneElement(
                    cancelButton as React.ReactElement<{
                      onClick?: () => void;
                      disabled?: boolean;
                    }>,
                    {
                      onClick: closeByCancel,
                      disabled: submitting,
                    }
                  )}
                {submitButton ? (
                  React.cloneElement(
                    submitButton as React.ReactElement<{
                      disabled?: boolean;
                    }>,
                    {
                      disabled: disableSubmit ? true : !!submitting,
                    }
                  )
                ) : (
                  <Button type="submit" disabled={disableSubmit ? true : !!submitting}>
                    Submit
                  </Button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
};
