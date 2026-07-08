import {
  autoUpdate,
  flip,
  offset,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { useState } from 'react';

type TUseDropdownMultipleSelectParams = {
  disabled?: boolean;
  readOnly?: boolean;
};

export const useDropdownMultipleSelect = ({
  readOnly,
  disabled,
}: TUseDropdownMultipleSelectParams) => {
  // States
  const [isOpen, setIsOpen] = useState(false);

  // For floating listbox
  const { floatingStyles, refs, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      // Adjust listbox width to same as the floating reference
      size({
        apply({ rects, elements }) {
          elements.floating.style.width = `${rects.reference.width.toString()}px`;
          elements.floating.style.zIndex = '10';
        },
      }),
      // Flip on edges
      flip(),
    ],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context, {
    enabled: !readOnly && !disabled,
    toggle: true,
  });
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps } = useInteractions([click, dismiss, role]);

  return {
    floatingStyles,
    refs,
    getReferenceProps,
    isOpen,
    setIsOpen,
  };
};
