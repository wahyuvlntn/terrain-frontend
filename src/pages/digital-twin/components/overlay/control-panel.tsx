import {
  AuthCtx,
  Badge,
  Button,
  CONDITION_COLOR,
  InfoTooltip,
  Input,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  StatusEnum,
} from '@digital-twin/components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { format } from 'date-fns';
import { KeyboardEvent, useContext, useState } from 'react';

import {
  ControlStatus,
  TwinAsset,
  TwinControl,
  TwinControlRequest,
  TwinParameter,
  writeTwinParameter,
} from '../../api/digital-twin.api';
import { formatParamValue, TWIN_QUERY } from '../../digital-twin.live';
import { useReplayControlEvents, useTwinControlRequests } from '../../digital-twin.queries';
import { useTwinNow, useTwinSource } from '../../digital-twin.source';
import styles from './overlay.module.scss';
import { timeAgo } from './overlay-utils';
import { SectionTitle } from './twin-ui';

/**
 * Two-way control of an equipment from the twin: control modes (Auto / Manual, Auto / On / Off)
 * and set points, written to the plant and confirmed by its read-back. A write is always confirmed
 * inline first; the result (applied, rejected with the reason, or not confirmed) stays on the card.
 * While a simulation is replayed the panel shows the replayed values read-only, with the control
 * actions the scenario applied instead of the plant's command history.
 */

/** A control mode with the set points it gates, or a set point on its own */
type ControlGroup = { key: string; mode?: TwinParameter; setpoints: TwinParameter[] };

const isMode = (p?: TwinParameter) => !!p?.control?.options?.length;

/** Writable parameters grouped by mode; `target` keeps the groups driving that measured parameter */
export const controlGroups = (params: TwinParameter[], target?: string): ControlGroup[] => {
  const writable = params.filter((p) => p.control);
  const modes = new Set(writable.filter(isMode).map((p) => p.alias));
  const groups: ControlGroup[] = [];
  for (const p of writable) {
    if (isMode(p)) {
      groups.push({
        key: p.alias,
        mode: p,
        setpoints: writable.filter((s) => s.control?.mode === p.alias),
      });
    } else if (!p.control?.mode || !modes.has(p.control.mode)) {
      groups.push({ key: p.alias, setpoints: [p] });
    }
  }
  if (!target) return groups;
  return groups.filter((g) => [g.mode, ...g.setpoints].some((p) => p?.control?.target === target));
};

const optionLabel = (control: TwinControl | null, value: number | null) =>
  control?.options?.find((o) => o.value === value)?.label ??
  (value === null ? '--' : String(value));

const decimals = (scale: number | null | undefined, step: number | null) => {
  if (typeof scale === 'number') return Math.min(Math.max(scale, 0), 4);
  const s = step ? String(step).split('.')[1] : '';
  return s ? s.length : 0;
};

const fmtNumber = (
  v: number | null,
  scale: number | null | undefined,
  step: number | null = null
) => (v === null ? '--' : v.toFixed(decimals(scale, step)));

/** Why a typed set point can't be sent ('' = valid) */
const setpointError = (raw: string, control: TwinControl) => {
  if (raw.trim() === '') return 'Enter a value';
  const v = Number(raw);
  if (!Number.isFinite(v)) return 'Not a number';
  if (control.min !== null && v < control.min) return `Minimum ${control.min}`;
  if (control.max !== null && v > control.max) return `Maximum ${control.max}`;
  if (control.step) {
    const n = (v - (control.min ?? 0)) / control.step;
    if (Math.abs(n - Math.round(n)) > 1e-6) return `Steps of ${control.step}`;
  }
  return '';
};

const STATUS_TEXT: Record<ControlStatus, string> = {
  PENDING: 'Waiting for the plant',
  APPLIED: 'Applied',
  REJECTED: 'Rejected',
  TIMEOUT: 'Not confirmed',
};

const STATUS_COLOR_OF: Record<ControlStatus, string> = {
  PENDING: 'var(--afdd-brand-surface-default-primary)',
  APPLIED: CONDITION_COLOR.NORMAL,
  REJECTED: CONDITION_COLOR.CRITICAL,
  TIMEOUT: CONDITION_COLOR.WARNING,
};

/** A requested value as shown to the operator: option label, or number and unit (exact: a value
 * finer than the display decimals, e.g. a rejected off-step request, is not rounded) */
const requestValue = (r: TwinControlRequest, value: number | null, param?: TwinParameter) => {
  if (param?.control?.options?.length) return optionLabel(param.control, value);
  const shown = fmtNumber(value, r.scale);
  const text = value !== null && Number(shown) !== value ? String(value) : shown;
  return `${text}${r.unit ? ` ${r.unit}` : ''}`;
};

type Pending = { param: TwinParameter; value: number; text: string };
type Outcome = { alias: string; status: ControlStatus | 'ERROR'; text: string };

const OUTCOME_BADGE = {
  PENDING: 'primary',
  APPLIED: 'normal',
  REJECTED: 'critical',
  TIMEOUT: 'warning',
  ERROR: 'critical',
} as const;

const outcomeBadge = (o: Outcome) => OUTCOME_BADGE[o.status];

type ControlPanelProps = {
  asset: TwinAsset;
  params?: TwinParameter[];
  /** only the controls driving this measured parameter (instrument dashboard) */
  target?: string;
  /** how many recent commands to list (0 = none) */
  historyRows?: number;
};

export const ControlPanel = ({ asset, params, target, historyRows = 5 }: ControlPanelProps) => {
  const queryClient = useQueryClient();
  /** replaying a simulation: nothing is written to the plant */
  const replay = !!useTwinSource().replay;
  const now = useTwinNow(1000);
  const { hasPermission } = useContext(AuthCtx);
  const canControl = hasPermission(
    PermissionGroupAliasEnum.enum.digitaltwin,
    PermissionAliasEnum.enum.update
  );
  const tag = asset.alias.replace('_', '-');
  const groups = controlGroups(params ?? [], target);
  const aliases = new Set(groups.flatMap((g) => [g.mode, ...g.setpoints]).map((p) => p?.alias));
  const byAlias = new Map((params ?? []).map((p) => [p.alias, p]));

  /** draft text of each set point input (absent = shows the live value) */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** the write awaiting the operator's confirmation */
  const [confirm, setConfirm] = useState<Pending | null>(null);
  /** the last result per group */
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});

  // entering or leaving a replay drops a pending confirmation and the typed set points: they were
  // asked against other values (the live plant or the replayed one) and must not come back
  const [replaySeen, setReplaySeen] = useState(replay);
  if (replaySeen !== replay) {
    setReplaySeen(replay);
    setConfirm(null);
    setDrafts({});
  }

  const requests = useTwinControlRequests(asset.id, historyRows > 0 && groups.length > 0);
  const replayed = useReplayControlEvents(asset.alias, replay && groups.length ? historyRows : 0);

  const write = useMutation({
    mutationFn: ({ param, value }: Pending) => writeTwinParameter(param.id, value),
    // the result shows inline on the card; only failures also raise the app's error toast
    meta: { toastId: 'digitalTwinWrite', hideToast: true },
    onSuccess: (r, { param }) => {
      setOutcomes((o) => ({
        ...o,
        [groupKey(param)]: {
          alias: param.alias,
          status: r.status,
          text:
            r.status === 'APPLIED'
              ? `${param.name}: ${requestValue(r, r.value, param)} confirmed by the plant`
              : (r.reason ?? STATUS_TEXT[r.status]),
        },
      }));
      if (r.status === 'APPLIED') {
        setDrafts(({ [param.alias]: _, ...rest }) => rest);
      }
    },
    onError: (err, { param }) =>
      setOutcomes((o) => ({
        ...o,
        [groupKey(param)]: {
          alias: param.alias,
          status: 'ERROR',
          text: err instanceof Error && err.message ? err.message : 'The command could not be sent',
        },
      })),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TWIN_QUERY.parameters(asset.id) });
      queryClient.invalidateQueries({ queryKey: TWIN_QUERY.controls(asset.id) });
      queryClient.invalidateQueries({ queryKey: ['DIGITAL_TWIN_OVERVIEW'] });
      queryClient.invalidateQueries({ queryKey: TWIN_QUERY.assets });
    },
  });

  /** group of a parameter, by alias (the parameter objects are replaced on every refresh) */
  const groupKey = (p: TwinParameter) =>
    groups.find((g) => g.mode?.alias === p.alias || g.setpoints.some((s) => s.alias === p.alias))
      ?.key ?? p.alias;

  if (!groups.length) return null;

  const offline = !asset.status || asset.status === StatusEnum.enum.OFFLINE;
  const disabled = replay || !canControl || offline || write.isPending;

  const ask = (param: TwinParameter, value: number) => {
    const current = typeof param.value === 'number' ? param.value : null;
    const text = isMode(param)
      ? `Switch ${param.name} of ${tag} to ${optionLabel(param.control, value)}?`
      : `Set ${param.name} of ${tag}: ${fmtNumber(current, param.scale, param.control?.step)} → ${fmtNumber(
          value,
          param.scale,
          param.control?.step
        )} ${param.unit}?`;
    setConfirm({ param, value, text });
  };

  const send = () => {
    if (!confirm || replay) return;
    setOutcomes(({ [groupKey(confirm.param)]: _, ...rest }) => rest);
    write.mutate(confirm);
    setConfirm(null);
  };

  const history = (requests ?? []).filter((r) => aliases.has(r.alias)).slice(0, historyRows);

  /** drop the confirmation of a parameter whose input changed or was reset */
  const dropConfirm = (alias: string) =>
    setConfirm((c) => (c && c.param.alias === alias ? null : c));

  /** the notice that explains why the controls are disabled (details behind the info icon) */
  const notice = replay
    ? {
        label: 'Replay · read-only',
        color: 'abnormal' as const,
        info: "The values are the simulated plant's at the playhead. Nothing is written to the plant.",
      }
    : !canControl
      ? {
          label: 'View only',
          color: 'secondary' as const,
          info: 'Operating the plant needs the Digital Twin › Update permission.',
        }
      : offline
        ? {
            label: 'No communication',
            color: 'offline' as const,
            info: `${tag} is not reporting: commands are disabled.`,
          }
        : null;

  return (
    // Esc anywhere in the panel (a mode button, the dialog) cancels a pending confirmation
    <div
      className={styles.ctl}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !confirm) return;
        e.stopPropagation();
        setConfirm(null);
      }}
    >
      {notice ? (
        <div className={styles.ctl__notice}>
          <Badge color={notice.color} className={styles.badge}>
            {notice.label}
          </Badge>
          <InfoTooltip title={notice.label} content={notice.info} />
        </div>
      ) : null}

      {groups.map((g) => {
        const modeValue = typeof g.mode?.value === 'number' ? g.mode.value : null;
        const auto = !!g.mode && modeValue === 0;
        const pending =
          write.isPending && write.variables ? groupKey(write.variables.param) === g.key : false;
        // a confirmation asked before a replay started is not offered during it
        const asking = confirm && !replay && groupKey(confirm.param) === g.key ? confirm : null;
        // results of live writes belong to the live plant, not to the replayed one
        const outcome = replay ? undefined : outcomes[g.key];
        const manualLabel = g.mode?.control?.options?.find((o) => o.value !== 0)?.label ?? 'Manual';
        return (
          <div key={g.key} className={styles.ctl__group}>
            {g.mode ? (
              <div className={styles.ctl__row}>
                <span className={styles.ctl__label}>
                  <b>{g.mode.name}</b>
                </span>
                <div
                  className={styles.ctl__seg}
                  role="radiogroup"
                  aria-label={`${g.mode.name} of ${tag}`}
                >
                  {g.mode.control?.options?.map((o) => {
                    const active = o.value === modeValue;
                    return (
                      <Button
                        key={o.value}
                        role="radio"
                        aria-checked={active}
                        color={active ? 'default-primary' : 'default-secondary'}
                        className={styles['ctl__seg-btn']}
                        disabled={disabled}
                        onClick={() => !active && g.mode && ask(g.mode, o.value)}
                      >
                        {o.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {g.setpoints.map((p) => {
              const control = p.control as TwinControl;
              const live = typeof p.value === 'number' ? p.value : null;
              // a replay shows the replayed value, never a draft typed for the live plant
              const draft = replay ? undefined : drafts[p.alias];
              const raw = draft ?? fmtNumber(live, p.scale, control.step);
              const error = draft === undefined ? '' : setpointError(raw, control);
              const locked = auto;
              const edited = draft !== undefined;
              const range = `${control.min ?? '–'} to ${control.max ?? '–'} ${p.unit}`.trim();
              const submit = () => {
                if (edited && !disabled && !locked && !setpointError(raw, control)) {
                  ask(p, Number(raw));
                }
              };
              return (
                <div key={p.alias} className={styles.ctl__row}>
                  <span className={styles.ctl__label}>
                    <b>
                      {p.name}
                      <InfoTooltip
                        title={p.name}
                        content={`${range}${control.step ? `, steps of ${control.step}` : ''}.${
                          locked
                            ? ` Set by the controller while ${g.mode?.name ?? 'the mode'} is Auto: switch to ${manualLabel} to set it.`
                            : ''
                        }`}
                      />
                    </b>
                    <span>
                      {live === null ? '--' : `${formatParamValue(p)} ${p.unit}`.trim()}
                      {locked ? ' · Auto' : ''}
                    </span>
                  </span>
                  <div className={styles.ctl__input}>
                    <Input
                      type="number"
                      value={raw}
                      suffix={p.unit || undefined}
                      disabled={disabled || locked}
                      isError={!!error}
                      detail={error}
                      title={error || range}
                      background="dark"
                      wrapperProps={{ className: styles.ctl__field }}
                      inputProps={{
                        'aria-label': `New ${p.name} of ${tag}`,
                        'aria-invalid': !!error,
                        inputMode: 'decimal',
                        min: control.min ?? undefined,
                        max: control.max ?? undefined,
                        step: control.step ?? 'any',
                        onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') {
                            // the keystroke must not also press a button of the confirmation
                            e.preventDefault();
                            submit();
                          }
                          if (e.key === 'Escape') {
                            e.stopPropagation();
                            dropConfirm(p.alias);
                            setDrafts(({ [p.alias]: _, ...rest }) => rest);
                          }
                        },
                      }}
                      onChange={(e) => {
                        // the confirmation shows the value asked for: editing withdraws it
                        dropConfirm(p.alias);
                        setDrafts((d) => ({ ...d, [p.alias]: e.target.value }));
                      }}
                    />
                    <Button
                      className={styles.ctl__set}
                      disabled={disabled || locked || !!error || !edited}
                      onClick={submit}
                    >
                      Set
                    </Button>
                  </div>
                </div>
              );
            })}
            {asking ? (
              // a command is never sent by the keystroke that asked for it: Confirm is not focused,
              // the operator clicks it (or tabs to it); Esc cancels
              <div
                className={styles.ctl__confirm}
                role="alertdialog"
                aria-label="Confirm command"
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') return;
                  e.stopPropagation();
                  setConfirm(null);
                }}
              >
                <span>{asking.text}</span>
                <div>
                  <Button
                    color="default-secondary"
                    className={styles.btn}
                    onClick={() => setConfirm(null)}
                  >
                    Cancel
                  </Button>
                  <Button className={styles.btn} onClick={send}>
                    Confirm
                  </Button>
                </div>
              </div>
            ) : pending ? (
              <div className={styles.ctl__status} role="status">
                <i className={styles.ctl__busy} aria-hidden="true" />
                <span>Waiting for {tag} to confirm…</span>
              </div>
            ) : outcome ? (
              <div className={styles.ctl__status} role="status">
                <Badge color={outcomeBadge(outcome)} className={styles.badge}>
                  {outcome.status === 'ERROR' ? 'Failed' : STATUS_TEXT[outcome.status]}
                </Badge>
                <span>{outcome.text}</span>
              </div>
            ) : null}
          </div>
        );
      })}

      {replay && replayed.length ? (
        <section className={styles.section}>
          <SectionTitle title="Scenario actions" />
          <ul
            className={clsx(styles.list, styles.ctl__history)}
            aria-label="Scenario control actions"
          >
            {replayed.map((e) => (
              <li key={e.id}>
                <i style={{ background: STATUS_COLOR_OF.APPLIED }} />
                <div className={styles.list__body}>
                  <strong>{e.message || `${e.code ?? 'Control'} → ${e.value ?? '--'}`}</strong>
                </div>
                <time title={format(e.at, 'dd MMM yyyy HH:mm:ss')}>{timeAgo(e.ts, now)}</time>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!replay && historyRows > 0 && history.length ? (
        <section className={styles.section}>
          <SectionTitle title="Recent commands" />
          <ul className={clsx(styles.list, styles.ctl__history)} aria-label="Recent commands">
            {history.map((r) => {
              const param = byAlias.get(r.alias);
              return (
                <li key={r.id}>
                  <i style={{ background: STATUS_COLOR_OF[r.status] }} />
                  <div className={styles.list__body}>
                    <strong>
                      {r.name}: {requestValue(r, r.oldValue, param)} →{' '}
                      {requestValue(r, r.value, param)}
                    </strong>
                    <span title={r.reason ?? undefined}>
                      {STATUS_TEXT[r.status]} · {r.userName || r.username || 'unknown user'}
                      {r.reason && r.status !== 'APPLIED' ? ` · ${r.reason}` : ''}
                    </span>
                  </div>
                  <time title={format(Date.parse(r.requestedAt), 'dd MMM yyyy HH:mm:ss')}>
                    {timeAgo(r.requestedAt, now)}
                  </time>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
};
