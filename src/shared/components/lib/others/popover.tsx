/** biome-ignore-all assist/source/organizeImports: <explanation> */
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  OffsetOptions,
  Placement,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useMergeRefs,
  useRole,
} from '@floating-ui/react';
import clsx from 'clsx';
import type React from 'react';
import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useContext,
  useMemo,
  useState,
} from 'react';

import styles from './popover.module.scss';

interface PopoverOptions {
  initialOpen?: boolean;
  placement?: Placement;
  modal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  offset?: OffsetOptions;
  onOpenChangeCallback?: (open: boolean) => void;
}

export function usePopover({
  initialOpen = false,
  placement = 'bottom',
  modal,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  offset: offsetAmount = 5,
  onOpenChangeCallback
}: PopoverOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);
  const [labelId, setLabelId] = useState<string | undefined>();
  const [descriptionId, setDescriptionId] = useState<string | undefined>();

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    placement,
    open,
    onOpenChange: (open, _event, _reason) => {
      setOpen(open);
      onOpenChangeCallback?.(open);
    },
    whileElementsMounted: autoUpdate,
    strategy: 'absolute',
    middleware: [
      offset(offsetAmount),
      flip({
        crossAxis: placement.includes('-'),
        fallbackAxisSideDirection: 'end',
        padding: 5,
      }),
      shift({ padding: 5 }),
    ],
  });

  const context = data.context;

  const click = useClick(context, {
    enabled: controlledOpen == null,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const interactions = useInteractions([click, dismiss, role]);

  return useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
      modal,
      labelId,
      descriptionId,
      setLabelId,
      setDescriptionId,
    }),
    [open, setOpen, interactions, data, modal, labelId, descriptionId]
  );
}

type ContextType =
  | (ReturnType<typeof usePopover> & {
    setLabelId: React.Dispatch<React.SetStateAction<string | undefined>>;
    setDescriptionId: React.Dispatch<
      React.SetStateAction<string | undefined>
    >;
  })
  | null;

const PopoverContext = createContext<ContextType>(null);

export const usePopoverContext = () => {
  const context = useContext(PopoverContext);

  if (context == null) {
    throw new Error('Popover components must be wrapped in <Popover />');
  }

  return context;
};

export function Popover({
  children,
  modal = false,
  ...restOptions
}: {
  children: React.ReactNode;
} & PopoverOptions) {
  // This can accept any props as options, e.g. `placement`,
  // or other positioning options.
  const popover = usePopover({ modal, ...restOptions });
  return (
    <PopoverContext.Provider value={popover}>
      {children}
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const PopoverTrigger = forwardRef<
  HTMLElement,
  React.ComponentProps<'span'> & PopoverTriggerProps
>(function PopoverTrigger({ children, asChild = false, ...props }, propRef) {
  const context = usePopoverContext();
  // React 19 passes `ref` as a prop; older elements keep it on the element
  const childrenRef = isValidElement(children)
    ? ((children.props as { ref?: React.Ref<unknown> }).ref ?? (children as any).ref)
    : null;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && isValidElement(children)) {
    return cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...(children.props as Record<string, unknown>),
        'data-state': context.open ? 'open' : 'closed',
      } as React.HTMLProps<Element>)
    );
  }

  return (
    <span
      ref={ref}
      // The user can style the trigger based on the state
      data-state={context.open ? 'open' : 'closed'}
      {...context.getReferenceProps(props)}
    >
      {children}
    </span>
  );
});

export const PopoverContent = forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement>
>(function PopoverContent({ style, className, ...props }, propRef) {
  const { context: floatingContext, ...context } = usePopoverContext();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);

  const refWidth = context.elements.domReference?.getBoundingClientRect().width;

  if (!floatingContext.open) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager
        context={floatingContext}
        modal={context.modal}
        initialFocus={-1}
      >
        <div
          className={clsx(styles['popover'], className)}
          ref={ref}
          style={{
            ...context.floatingStyles,
            minWidth: refWidth + 'px',
            ...style,
          }}
          aria-labelledby={context.labelId}
          aria-describedby={context.descriptionId}
          {...context.getFloatingProps(props)}
        >
          {props.children}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
});

export const PopoverClose = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'span'>
>(function PopoverClose(props, ref) {
  const { setOpen } = usePopoverContext();
  return (
    <span
      ref={ref}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        setOpen(false);
      }}
    />
  );
});
