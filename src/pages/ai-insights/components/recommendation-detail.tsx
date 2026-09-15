import { COLOR, Popup, Table } from '@digital-twin/components';
import { SettingSuggest } from '@digital-twin/icons';
import {
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
} from '@digital-twin/reusables';
import clsx from 'clsx';
import { useState } from 'react';
import styles from '../ai-insights.module.scss';
import {
  CONDITION_META,
  CONTROL_STATUS,
  fmtNum,
  fmtTime,
  humanize,
  MODE_OPTIONS,
  modeText,
  ordered,
  PREDICTED_META,
  predictedMeta,
  RECOMMENDATION_STATUS,
  setpointMeta,
  signed,
  withUnit,
} from '../ai-insights.utils';
import type { Recommendation } from '../api/ai-insights.api';
import {
  currentOf,
  restoreText,
  resultOf,
  SetpointRow,
  TwinCompare,
  writeText,
} from '../recommendation.utils';
import { ValidationBadge, ValidationDetail } from './recommendation-validation';
import { Empty, Facts, Pill } from './shared';

const SETPOINT_COLUMNS = [
  { key: 'name', name: 'Set point' },
  { key: 'current', name: 'Current', width: 150, alignment: 'right' as const },
  { key: 'recommended', name: 'Recommended', width: 150, alignment: 'right' as const },
  { key: 'change', name: 'Change', width: 120, alignment: 'right' as const },
];

const PREDICTED_COLUMNS = [
  { key: 'name', name: 'Prediction' },
  { key: 'measured', name: 'Measured', width: 130, alignment: 'right' as const },
  { key: 'current', name: 'At current SPs', width: 140, alignment: 'right' as const },
  { key: 'recommended', name: 'Recommended', width: 140, alignment: 'right' as const },
  { key: 'change', name: 'Change', width: 110, alignment: 'right' as const },
];

type Props = {
  rec: Recommendation;
  open: boolean;
  onClose: () => void;
  canViewSimulation: boolean;
  setpoints: SetpointRow[];
  compare: TwinCompare | null;
};

/**
 * The whole recommendation in a popup: set point and mode changes, the surrogate model's
 * prediction against the measured plant, the twin run and the plant writes with their results.
 */
export const RecommendationDetail = ({
  rec,
  open,
  onClose,
  canViewSimulation,
  setpoints,
  compare,
}: Props) => {
  const [tab, setTab] = useState('setpoints');
  const modeActions = rec.actions.filter((a) => MODE_OPTIONS[a.param]);

  // ------------------------------------------------------------- tables
  const setpointTable = [
    ...setpoints.map((r) => {
      const show = (v: number | null) => withUnit(fmtNum(v, r.digits), r.unit);
      return {
        id: r.key,
        name: r.label,
        current: show(r.current),
        recommended: <b>{show(r.recommended)}</b>,
        change:
          r.changed && r.current !== null && r.recommended !== null
            ? withUnit(signed(r.recommended - r.current, r.digits), r.unit)
            : '—',
      };
    }),
    ...modeActions.map((a) => ({
      id: `mode:${a.param}`,
      name: setpointMeta(a.param).label,
      current: currentOf(rec, a) ?? '--',
      recommended: <b>{modeText(a.param, a.value)}</b>,
      change: 'mode',
    })),
  ];

  const predictedKeys = ordered(
    [...Object.keys(rec.current.predicted), ...Object.keys(rec.recommended.predicted)],
    PREDICTED_META
  );
  const measured = rec.conditions.measured;
  const predictedTable = predictedKeys.map((k) => {
    const meta = predictedMeta(k);
    const from = rec.current.predicted[k];
    const to = rec.recommended.predicted[k];
    const delta = from !== undefined && to !== undefined ? to - from : null;
    const better =
      delta === null || !meta.better || Math.abs(delta) < 1e-9
        ? null
        : (meta.better === 'lower') === delta < 0;
    const show = (v: number | undefined) => withUnit(fmtNum(v, meta.digits), meta.unit);
    return {
      id: k,
      name: meta.label,
      measured: show(measured[k]),
      current: show(from),
      recommended: show(to),
      change:
        delta === null ? (
          ''
        ) : (
          <span
            style={{
              color:
                better === null
                  ? undefined
                  : better
                    ? COLOR.conditionNormalPrimary
                    : COLOR.conditionWarningPrimary,
            }}
          >
            {withUnit(signed(delta, meta.digits), meta.unit)}
          </span>
        ),
    };
  });

  const conditionFacts = [
    ...ordered(Object.keys(rec.conditions.values), CONDITION_META).map((k) => {
      const meta = CONDITION_META[k];
      const v = rec.conditions.values[k];
      return {
        label: meta?.label ?? humanize(k),
        value: meta
          ? `${withUnit(fmtNum(v * (meta.scale ?? 1), meta.digits), meta.unit)}${k === 'cooling_load_kw' ? ` (${fmtNum(v / 3.517, 0)} RT)` : ''}`
          : String(+v.toPrecision(4)),
      };
    }),
    ...Object.keys(rec.conditions.modes).map((k) => ({
      label: setpointMeta(k).label,
      value: modeText(k, rec.conditions.modes[k]),
    })),
  ];

  // --------------------------------------------------------------- writes
  const record = rec.applyResults;
  const status = RECOMMENDATION_STATUS[rec.status];

  return (
    <Popup
      open={open}
      title={`Recommendation #${rec.id}`}
      icon={<SettingSuggest />}
      onClose={onClose}
      variant="none"
      background="none"
      width="min(960px, 90vw)"
      rightTopComponent={<ValidationBadge rec={rec} canViewSimulation={canViewSimulation} />}
    >
      <TabProvider value={tab} onChange={setTab} type="1" className={styles.popupTabs}>
        <TabList className={styles.tabs__list}>
          <Tab value="setpoints" label="Set points" className={styles.tabs__tab} />
          <Tab value="model" label="Model" className={styles.tabs__tab} />
          <Tab value="twin" label="Twin run" className={styles.tabs__tab} />
          <Tab value="writes" label="Plant writes" className={styles.tabs__tab} />
        </TabList>

        <TabPanel value="setpoints" className={styles.popupTabs__panel}>
          {setpointTable.length ? (
            <Table columns={SETPOINT_COLUMNS} rows={setpointTable} />
          ) : (
            <Empty>No set points in this recommendation</Empty>
          )}
        </TabPanel>

        <TabPanel value="model" className={styles.popupTabs__panel}>
          {conditionFacts.length ? <Facts items={conditionFacts} /> : null}
          {predictedTable.length ? (
            <Table
              columns={
                predictedKeys.some((k) => measured[k] !== undefined)
                  ? PREDICTED_COLUMNS
                  : PREDICTED_COLUMNS.filter((c) => c.key !== 'measured')
              }
              rows={predictedTable}
            />
          ) : (
            <Empty>No model prediction stored</Empty>
          )}
        </TabPanel>

        <TabPanel value="twin" className={styles.popupTabs__panel}>
          <ValidationDetail value={rec.validation} compare={compare} />
        </TabPanel>

        <TabPanel value="writes" className={styles.popupTabs__panel}>
          {record ? (
            <span className={styles.muted}>
              Last apply {record.at ? fmtTime(record.at) : ''}
              {record.byName ? ` by ${record.byName}` : ''}
            </span>
          ) : null}
          {rec.actions.length ? (
            <ol className={styles.writes}>
              {rec.actions.map((a) => {
                const r = resultOf(rec, a);
                const rs = r ? CONTROL_STATUS[r.status] : null;
                const state = !record
                  ? 'todo'
                  : r?.status === 'APPLIED'
                    ? 'done'
                    : r
                      ? 'error'
                      : 'stopped';
                return (
                  <li
                    key={`${a.asset}:${a.param}`}
                    className={clsx(styles.write, styles[`write--${state}`])}
                  >
                    <span>{writeText(rec, a)}</span>
                    {rs && r ? (
                      <span className={styles.write__result}>
                        <Pill color={rs.color} title={r.reason ?? undefined}>
                          {rs.text}
                        </Pill>
                        {r.restored !== null ? (
                          <Pill color={r.restored ? 'secondary' : 'warning'}>
                            {r.restored ? 'Written back' : 'Not written back'}
                          </Pill>
                        ) : null}
                      </span>
                    ) : record && record.status !== 'APPLIED' ? (
                      <Pill color="offline">Not sent</Pill>
                    ) : null}
                  </li>
                );
              })}
              {record?.restores.map((r, i) => {
                const rs = CONTROL_STATUS[r.status];
                return (
                  // positional: the write-backs of one apply, in the order they were written
                  <li key={`restore:${i}`} className={clsx(styles.write, styles['write--restore'])}>
                    <span>{restoreText(r)}</span>
                    <Pill color={rs.color} title={r.reason ?? undefined}>
                      {rs.text}
                    </Pill>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Empty>Nothing to write: the plant already runs at these set points</Empty>
          )}
          {rec.decidedAt ? (
            <Facts
              items={[
                {
                  label: status.text,
                  value: `${fmtTime(rec.decidedAt)}${rec.decidedByName ? ` · ${rec.decidedByName}` : ''}`,
                },
                ...(rec.decisionNote ? [{ label: 'Note', value: rec.decisionNote }] : []),
              ]}
            />
          ) : null}
        </TabPanel>
      </TabProvider>
    </Popup>
  );
};
