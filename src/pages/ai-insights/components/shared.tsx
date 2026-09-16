import { Badge, Dropdown, InfoTooltip, Popup } from '@digital-twin/components';
import clsx from 'clsx';
import {
  ComponentProps,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import styles from '../ai-insights.module.scss';
import { assetTag, fmtNum, humanize, isPlainObject } from '../ai-insights.utils';

export { isPlainObject } from '../ai-insights.utils';

type PillColor = ComponentProps<typeof Badge>['color'];

/** Compact status badge */
export const Pill = ({
  color,
  children,
  title,
}: {
  color: PillColor;
  children: ReactNode;
  title?: string;
}) => (
  <Badge color={color} variant="pill" className={styles.pill} title={title}>
    {children}
  </Badge>
);

/** Short, centred empty / loading state */
export const Empty = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx(styles.empty, className)}>{children}</div>
);

/** Section heading inside a panel (16px semibold), with an optional explanation behind an "i" */
export const SectionTitle = ({
  children,
  info,
  aside,
}: {
  children: ReactNode;
  info?: ReactNode;
  aside?: ReactNode;
}) => (
  <div className={styles.section__title}>
    <h4>{children}</h4>
    {info ? (
      <InfoTooltip title={typeof children === 'string' ? children : 'About'} content={info} />
    ) : null}
    {aside ? <div className={styles.section__aside}>{aside}</div> : null}
  </div>
);

/** Label / value pairs in a compact grid */
export const Facts = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className={styles.facts}>
    {items.map((it) => (
      <div key={it.label}>
        <dt>{it.label}</dt>
        <dd>{it.value}</dd>
      </div>
    ))}
  </dl>
);

type ConfirmPopupProps = {
  open: boolean;
  title: string;
  icon?: ReactNode;
  /** explanation behind the "i" next to the title */
  info?: ReactNode;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  /** Confirm is disabled (invalid or unchanged input) */
  disabled?: boolean;
  width?: number | string;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
};

/**
 * Confirmation of an action in a `Popup`. Confirm is never auto-focused: the dialog body takes the
 * focus (a key press there does nothing), Enter in a field does not submit, and Esc cancels.
 */
export const ConfirmPopup = ({
  open,
  title,
  icon,
  info,
  confirmLabel,
  confirmIcon,
  tone = 'primary',
  busy,
  disabled,
  width = 560,
  onConfirm,
  onCancel,
  children,
}: ConfirmPopupProps) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  // latest callbacks without re-running the open effect (it would steal the focus while typing)
  const latest = useRef({ onCancel, busy });
  latest.current = { onCancel, busy };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || latest.current.busy) return;
      e.stopPropagation();
      latest.current.onCancel();
    };
    document.addEventListener('keydown', onKey);
    // the popup mounts through a portal: focus its body once it is there
    const timer = window.setTimeout(() => bodyRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [open]);

  return (
    <Popup
      open={open}
      title={title}
      icon={icon}
      informationIcon={info ? <InfoTooltip title={title} content={info} /> : undefined}
      variant="custom"
      submitButtonLabel={confirmLabel}
      submitButtonIcon={confirmIcon}
      submitButtonColor={tone === 'danger' ? 'error' : 'default-primary'}
      submitting={busy}
      disableSubmit={disabled}
      width={width}
      background="none"
      onSubmit={onConfirm}
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        ref={bodyRef}
        tabIndex={-1}
        className={styles.confirm}
        onKeyDown={(e: ReactKeyboardEvent<HTMLDivElement>) => {
          // Enter in a field must not submit the form: the user confirms with the button
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </Popup>
  );
};

export type FilterOption = { value: string; label: string };

/** A labelled filter dropdown; the empty value means "all" */
export const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  allLabel = 'All',
  disabled,
  className,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** label of the empty value; null leaves it out */
  allLabel?: string | null;
  disabled?: boolean;
  className?: string;
}) => (
  <Dropdown
    label={label}
    labelPosition="left"
    variant="medium"
    background="dark"
    value={value}
    disabled={disabled}
    searchable={options.length > 8}
    options={allLabel === null ? options : [{ value: '', label: allLabel }, ...options]}
    onChange={onChange}
    wrapperClassName={clsx(styles.filter, className)}
  />
);

/** Equipment options of a filter: the visible plant, plus equipment only known from the rows */
export const assetOptions = (
  assets: { id: number; alias: string; name: string }[],
  rows: { assetId: number; assetAlias: string | null; assetName: string | null }[]
): FilterOption[] => {
  const out = new Map<number, string>();
  for (const a of assets) out.set(a.id, assetTag(a.alias));
  for (const r of rows) {
    if (!out.has(r.assetId)) out.set(r.assetId, assetTag(r.assetAlias));
  }
  return [...out.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value: String(value), label }));
};

/**
 * Page size that fits the measured height of a table area: (height − header) / row height. The
 * area is the panel's flexible child, so the table never scrolls inside the page.
 */
export const useFitRows = (rowHeight = 40, offset = 46, min = 3) => {
  const { ref, height } = useElementHeight();
  const rows = height ? Math.max(min, Math.floor((height - offset) / rowHeight)) : min;
  return { ref, rows, height };
};

/** Measured height of an element (a panel's flexible child), kept up to date on resize */
export const useElementHeight = () => {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return { ref: setEl, height };
};

/** Client-side page of a list; the page falls back into range when the list shrinks */
/**
 * Client-side paging. `selectedIndex` (the selected item's index in `items`, -1 when absent) opens
 * the page holding it whenever the selection changes, so deep links (?fault=, ?anomaly=, ?rec=)
 * show their row even when it is not on page 1.
 */
export const usePaged = <T,>(items: T[], size: number, selectedIndex = -1) => {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const target = selectedIndex >= 0 ? Math.floor(selectedIndex / Math.max(1, size)) + 1 : 0;
  // follows the selection (and page size), not every page change
  useEffect(() => {
    if (target > 0) setPage(target);
  }, [target]);
  return {
    page: current,
    setPage,
    pageItems: items.slice((current - 1) * size, current * size),
  };
};

const scalar = (v: unknown): string => {
  if (v === null || v === undefined) return '--';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return '--';
    return Number.isInteger(v) ? fmtNum(v, 0) : String(+v.toPrecision(4));
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
};

/** A small inline line of a numeric series (evidence windows) */
const Sparkline = ({ values }: { values: number[] }) => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return null;
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const span = hi - lo || 1;
  const step = 100 / (values.length - 1);
  const points = values
    .map((v, i) =>
      Number.isFinite(v)
        ? `${(i * step).toFixed(1)},${(22 - ((v - lo) / span) * 20).toFixed(1)}`
        : null
    )
    .filter(Boolean)
    .join(' ');
  return (
    <svg className={styles.spark} viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden>
      <polyline points={points} />
    </svg>
  );
};

const MAX_ITEMS = 24;

/**
 * Generic view of a free-form JSON value (fault evidence, anomaly details, calibration
 * statistics): objects as key / value rows, numeric series as a sparkline with their range,
 * nested values indented up to a few levels.
 */
export const JsonView = ({ value, depth = 0 }: { value: unknown; depth?: number }) => {
  if (Array.isArray(value)) {
    if (!value.length) return <span className={styles.muted}>none</span>;
    if (value.every((v) => typeof v === 'number')) {
      const nums = value as number[];
      return (
        <span className={styles.json__series}>
          <Sparkline values={nums} />
          <small>
            {nums.length} values · {scalar(Math.min(...nums))} … {scalar(Math.max(...nums))}
          </small>
        </span>
      );
    }
    if (value.every((v) => !isPlainObject(v) && !Array.isArray(v))) {
      return <span>{value.slice(0, MAX_ITEMS).map(scalar).join(', ')}</span>;
    }
    if (depth >= 3) return <span className={styles.muted}>{value.length} items</span>;
    return (
      <ol className={styles.json__list}>
        {value.slice(0, MAX_ITEMS).map((v, i) => (
          // positional: a JSON array has no ids
          <li key={i}>
            <JsonView value={v} depth={depth + 1} />
          </li>
        ))}
        {value.length > MAX_ITEMS ? (
          <li className={styles.muted}>… {value.length - MAX_ITEMS} more</li>
        ) : null}
      </ol>
    );
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (!entries.length) return <span className={styles.muted}>none</span>;
    if (depth >= 3) return <span className={styles.muted}>{entries.length} fields</span>;
    return (
      <dl className={clsx(styles.json, depth > 0 && styles['json--nested'])}>
        {entries.slice(0, MAX_ITEMS * 2).map(([k, v]) => (
          <div key={k} className={styles.json__row}>
            <dt title={k}>{humanize(k)}</dt>
            <dd>
              <JsonView value={v} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>{scalar(value)}</span>;
};
