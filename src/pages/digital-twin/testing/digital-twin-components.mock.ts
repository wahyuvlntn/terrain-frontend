/**
 * Test double of the parts of @digital-twin/components the twin and simulation logic use (the status /
 * condition enums and colours of src/shared/components/lib/mapping.tsx). The real barrel loads a
 * UI library that ships CSS, which vitest can't import. Keep the enum values in step with
 * mapping.tsx. Also the permission enums (the groups the twin checks) and an AuthCtx whose value
 * the tests provide, and plain stand-ins of the standard UI components (same props, plain DOM):
 * a test finds them by role, label and text as it would the real ones.
 */
import {
  ChangeEvent,
  createContext,
  createElement,
  forwardRef,
  ReactNode,
  ComponentProps as RProps,
} from 'react';
import { z } from 'zod';

export const PermissionAliasEnum = z.enum(['create', 'read', 'update', 'delete', 'approve']);
export const PermissionGroupAliasEnum = z.enum([
  'digitaltwin',
  'simulation',
  'aiassistant',
  'aiinsights',
  'production',
]);
export const AuthCtx = createContext<{
  hasPermission: (group: string, alias: string) => boolean;
}>({ hasPermission: () => false });

export const StatusEnum = z.enum([
  'RUNNING',
  'IDLE',
  'PLANNED DOWN',
  'UNPLANNED DOWN',
  'OFFLINE',
  'DOWN',
]);
export type StatusEnum = z.infer<typeof StatusEnum>;

export const ConditionEnum = z.enum(['NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE']);
export type ConditionEnum = z.infer<typeof ConditionEnum>;

export const STATUS_COLOR = Object.fromEntries(
  StatusEnum.options.map((s) => [s, `var(--status-${s})`])
) as Record<StatusEnum, string>;

export const CONDITION_COLOR = Object.fromEntries(
  ConditionEnum.options.map((c) => [c, `var(--condition-${c})`])
) as Record<ConditionEnum, string>;

export const STATUS_ICON = {} as Record<StatusEnum, ReactNode>;
export const CONDITION_ICON = {} as Record<ConditionEnum, ReactNode>;

/** every COLOR token resolves to a CSS variable named after it */
export const COLOR = new Proxy({} as Record<string, string>, {
  get: (_, key) => `var(--${String(key)})`,
});

/** the default theme's hex colours (the viewer's fallbacks): one grey for every token */
export const DEFAULT_COLOR = new Proxy({} as Record<string, string>, {
  get: () => '#808080',
});

export const ThemeContext = createContext<{ colors: Record<string, string> }>({ colors: {} });

// ------------------------------------------------------------------ standard UI stand-ins

type ButtonProps = RProps<'button'> & {
  color?: string;
  icon?: ReactNode;
  suffixIcon?: ReactNode;
  variant?: string;
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ color: _color, icon, suffixIcon, variant: _variant, isLoading: _l, children, ...p }, ref) =>
    createElement('button', { ref, type: 'button', ...p }, icon, children, suffixIcon)
);

type BadgeProps = Omit<RProps<'span'>, 'color'> & {
  color?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: string;
  fillVariant?: string;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ color, leftIcon, rightIcon, variant: _v, fillVariant: _f, children, ...p }, ref) =>
    createElement('span', { ref, 'data-color': color, ...p }, leftIcon, children, rightIcon)
);

export const InfoTooltip = ({ title }: { title?: string; content?: ReactNode }) =>
  createElement('span', { 'data-info-tooltip': title ?? '' });

export const TooltipContent = ({ title, content }: { title?: string; content?: ReactNode }) =>
  createElement('div', { role: 'tooltip' }, title, content);

export const Metric = ({
  title,
  value,
  unit,
}: {
  title: ReactNode;
  value: number | string;
  unit?: ReactNode;
  borderColor: string;
}) => createElement('div', { 'data-metric': true }, title, ' ', String(value), unit);

type InputProps = {
  type?: string;
  value?: string | number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  suffix?: ReactNode;
  prefix?: ReactNode;
  isError?: boolean;
  detail?: string;
  title?: string;
  inputProps?: RProps<'input'>;
  wrapperProps?: RProps<'div'>;
};

export const Input = ({
  type,
  value,
  onChange,
  placeholder,
  disabled,
  readOnly,
  label,
  suffix,
  prefix,
  isError,
  detail,
  title,
  inputProps,
}: InputProps) =>
  createElement(
    'div',
    null,
    prefix,
    createElement('input', {
      ...inputProps,
      type,
      value,
      onChange,
      placeholder,
      disabled,
      readOnly,
      title,
      'aria-label': inputProps?.['aria-label'] ?? label,
    }),
    suffix,
    isError && detail ? createElement('span', null, detail) : null
  );

export const Search = ({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}) =>
  createElement('input', {
    type: 'search',
    defaultValue: value,
    placeholder,
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value),
  });

export const Dropdown = ({
  value,
  onChange,
  options,
  label,
  disabled,
}: {
  value?: string;
  onChange?: (value: string) => void;
  options?: { value: string; label: string }[];
  label?: string;
  disabled?: boolean;
}) =>
  createElement(
    'select',
    {
      value,
      disabled,
      'aria-label': label,
      onChange: (e: ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value),
    },
    (options ?? []).map((o) => createElement('option', { key: o.value, value: o.value }, o.label))
  );

export const Loading = () => null;
