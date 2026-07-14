import { useEffect, useState } from 'react';

export const useToggle = (defaultValue: boolean) => {
  const [value, setValue] = useState(defaultValue);

  const toggle = () => setValue((value) => !value);

  return [value, toggle] as const;
};

export const useDebounce = <T>(value: T, timeoutMs: number = 500) => {
  const [debouncedVal, setDebouncedVal] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedVal(value), timeoutMs);
    return () => clearTimeout(timeout);
  }, [value, timeoutMs]);

  return { debouncedVal };
};

export const useModal = () => {
  const [open, setOpen] = useState(false);

  return {
    open,
    handleChange: setOpen,
    handleOpen: () => setOpen(true),
    handleClose: () => setOpen(false)
  }
}
