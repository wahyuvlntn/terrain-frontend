import { Cube } from '@digital-twin/icons';
import { Link } from 'react-router-dom';

import type { ProductionTool } from '../api/production.api';
import styles from '../production.module.scss';
import {
  E10_LABEL,
  fmtDec,
  fmtDuration,
  fmtInt,
  STATUS_BADGE,
  TOOL_TYPE_LABEL,
  toolTag,
} from '../production.utils';
import { Empty, FactorBar, Pill, useTwinLink } from './shared';

type ToolTableProps = {
  tools: ProductionTool[];
  now: number;
  /** show the "3D" links (Digital Twin › Read) */
  canViewTwin: boolean;
};

/**
 * The process tools: status (E10 state) with its duration, the lot in process and its progress,
 * chambers available, queue, the window's A / O / R / Q / OEE, throughput and scrap.
 */
export const ToolTable = ({ tools, now, canViewTwin }: ToolTableProps) => {
  const twinLink = useTwinLink();
  if (!tools.length) return <Empty>No process tools in your locations</Empty>;
  return (
    <table className={styles.toolTable}>
      <thead>
        <tr>
          <th>Tool</th>
          <th>Status</th>
          <th>Lot in process</th>
          <th className={styles.toolTable__num}>Chambers</th>
          <th className={styles.toolTable__num}>Queue</th>
          <th>Availability</th>
          <th>Operational</th>
          <th>Rate</th>
          <th>Quality</th>
          <th>OEE</th>
          <th className={styles.toolTable__num} title="Wafers completed in the last hour">
            wph
          </th>
          <th className={styles.toolTable__num}>Wafers</th>
          <th
            className={styles.toolTable__num}
            title="Wafers scrapped / reworked because of the tool"
          >
            Scrap / rework
          </th>
        </tr>
      </thead>
      <tbody>
        {tools.map((t) => {
          const since = t.statusStartTime ? now - Date.parse(t.statusStartTime) : null;
          const progress = t.lotProgress ?? 0;
          return (
            <tr key={t.id}>
              <td>
                <div className={styles.toolTable__name}>
                  <div className={styles.toolTable__tool}>
                    <b>{toolTag(t.alias)}</b>
                    <span className={styles.muted}>{TOOL_TYPE_LABEL[t.toolType]}</span>
                  </div>
                  {/* first column: the jump into the twin stays in view in the wide table */}
                  {canViewTwin ? (
                    <Link
                      to={twinLink(t.alias)}
                      className={styles.twinLink}
                      title={`Walk to ${toolTag(t.alias)} in the digital twin`}
                      aria-label={`Walk to ${toolTag(t.alias)} in the digital twin`}
                    >
                      <Cube width={18} height={18} />
                    </Link>
                  ) : null}
                </div>
              </td>
              <td>
                {t.status ? (
                  <div className={styles.toolTable__tool}>
                    <Pill color={STATUS_BADGE[t.status] ?? 'offline'} title={E10_LABEL[t.status]}>
                      {t.status.toLowerCase()}
                    </Pill>
                    <span className={styles.muted}>
                      {since !== null ? fmtDuration(since) : ''}
                      {t.alarms ? ` · ${t.alarms} alarm${t.alarms === 1 ? '' : 's'}` : ''}
                    </span>
                  </div>
                ) : (
                  '--'
                )}
              </td>
              <td>
                {t.currentLot ? (
                  <div className={styles.progress}>
                    <span>
                      {t.currentLot} <span className={styles.muted}>{t.currentStep}</span>
                    </span>
                    <div className={styles.progress__track}>
                      <div
                        className={styles.progress__fill}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <span className={styles.muted}>--</span>
                )}
              </td>
              <td className={styles.toolTable__num}>
                {t.chambersUp !== null ? `${fmtInt(t.chambersUp)} / ${t.chambersTotal}` : '--'}
              </td>
              <td className={styles.toolTable__num}>{fmtInt(t.queueLots)}</td>
              <td>
                <FactorBar value={t.availability} />
              </td>
              <td>
                <FactorBar value={t.operational} kind="oee" />
              </td>
              <td>
                <FactorBar value={t.rate} />
              </td>
              <td>
                <FactorBar value={t.quality} />
              </td>
              <td>
                <FactorBar value={t.oee} kind="oee" />
              </td>
              <td
                className={styles.toolTable__num}
                title={
                  t.avgWph !== null
                    ? `Window average ${fmtDec(t.avgWph)} wph while productive`
                    : undefined
                }
              >
                {fmtInt(t.throughputWph)}
              </td>
              <td className={styles.toolTable__num}>{fmtInt(t.wafers)}</td>
              <td className={styles.toolTable__num}>
                {fmtInt(t.scrapped)} / {fmtInt(t.reworked)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
