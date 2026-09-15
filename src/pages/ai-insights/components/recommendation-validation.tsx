import { Table } from '@digital-twin/components';
import { Link } from 'react-router-dom';
import styles from '../ai-insights.module.scss';
import {
  fmtNum,
  humanize,
  isPlainObject,
  jobStatusColor,
  num,
  predictedMeta,
  signed,
  withUnit,
} from '../ai-insights.utils';
import type { Recommendation } from '../api/ai-insights.api';
import { TWIN_KPIS, TwinCompare, validationVerdict } from '../recommendation.utils';
import { Empty, JsonView, Pill } from './shared';

/** Twin validation state of a recommendation, with a link to its simulation job */
export const ValidationBadge = ({
  rec,
  canViewSimulation,
  showLink = true,
}: {
  rec: Recommendation;
  canViewSimulation: boolean;
  showLink?: boolean;
}) => {
  const job =
    rec.validationJob ?? (rec.validationJobId ? { id: rec.validationJobId, status: '' } : null);
  let pill: { text: string; color: ReturnType<typeof jobStatusColor> };
  switch (rec.status) {
    case 'PROPOSED':
      pill = { text: 'Not validated', color: 'secondary' };
      break;
    case 'VALIDATING':
      pill = {
        text: `Twin run${job?.status ? ` ${humanize(job.status.toLowerCase()).toLowerCase()}` : ''}`,
        color: 'primary',
      };
      break;
    case 'VALIDATED':
    case 'APPLIED':
      pill = { text: 'Twin confirmed', color: 'normal' };
      break;
    case 'REJECTED':
      pill = { text: 'Twin did not confirm', color: 'critical' };
      break;
    default:
      pill = job?.status
        ? { text: `Twin job ${job.status.toLowerCase()}`, color: jobStatusColor(job.status) }
        : { text: 'No twin run', color: 'offline' };
  }
  return (
    <span className={styles.validation}>
      <Pill color={pill.color}>{pill.text}</Pill>
      {showLink && job && canViewSimulation ? (
        <Link
          to={`/simulation?job=${job.id}`}
          className={styles.link}
          title="Open the validation run in Simulation"
        >
          Job #{job.id}
        </Link>
      ) : null}
    </span>
  );
};

/** Constraint verdict of the twin run as a badge ("All met", "Same as baseline", "Violated") */
export const VerdictBadge = ({ value }: { value: unknown }) => {
  const verdict = validationVerdict(value);
  if (!verdict) return null;
  return (
    <Pill color={verdict.tone} title={verdict.detail ?? undefined}>
      Constraints: {verdict.text}
    </Pill>
  );
};

/** A constraint violation of a twin run (`{constraint, label, minutes, longest_min, worst}`) */
const violationText = (v: unknown) => {
  if (!isPlainObject(v)) return String(v);
  const key = v.constraint ?? v.name;
  const minutes = num(v.minutes);
  const longest = num(v.longest_min);
  const worst = num(v.worst);
  return [
    typeof v.label === 'string'
      ? v.label
      : typeof key === 'string'
        ? predictedMeta(key).label
        : 'Constraint',
    minutes ? `${fmtNum(minutes, 0)} min` : '',
    longest && longest !== minutes ? `longest ${fmtNum(longest, 0)} min` : '',
    worst !== null ? `worst ${String(+worst.toPrecision(4))}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

const TWIN_COLUMNS = [
  { key: 'kpi', name: 'Twin run (2 h)' },
  { key: 'baseline', name: 'Baseline', width: 140, alignment: 'right' as const },
  { key: 'recommended', name: 'Recommended', width: 140, alignment: 'right' as const },
  { key: 'change', name: 'Change', width: 120, alignment: 'right' as const },
];

/**
 * The twin validation in full (detail popup): KPIs of both variants, the constraint verdict and
 * the violations of the recommended and of the baseline run. Unknown shapes are shown as they are.
 */
export const ValidationDetail = ({
  value,
  compare,
}: {
  value: unknown;
  compare: TwinCompare | null;
}) => {
  if (value === null) return <Empty>Not validated on the twin yet</Empty>;
  if (!isPlainObject(value)) return <JsonView value={value} />;
  const violations = Array.isArray(value.violations) ? value.violations : [];
  const existing = Array.isArray(value.baseline_violations) ? value.baseline_violations : [];
  const failure = [value.error, value.expired_reason].filter(
    (n): n is string => typeof n === 'string' && n.trim() !== ''
  );
  const kpis = compare
    ? TWIN_KPIS.filter(
        (k) => compare.baseline[k.key] !== null || compare.recommended[k.key] !== null
      )
    : [];

  return (
    <div className={styles.stack}>
      <div className={styles.chips}>
        <VerdictBadge value={value} />
        {compare?.savingKw !== null && compare?.savingKw !== undefined ? (
          <Pill color={compare.savingKw > 0 ? 'normal' : 'critical'}>
            Twin saving {withUnit(fmtNum(compare.savingKw, 1), 'kW')}
            {compare.savingKwh !== null ? ` · ${fmtNum(compare.savingKwh, 0)} kWh` : ''}
          </Pill>
        ) : null}
        {failure.map((f) => (
          <Pill key={f} color="critical">
            {f}
          </Pill>
        ))}
      </div>
      {kpis.length && compare ? (
        <Table
          columns={TWIN_COLUMNS}
          rows={kpis.map((k) => {
            const b = compare.baseline[k.key];
            const r = compare.recommended[k.key];
            return {
              id: k.key,
              kpi: k.label,
              baseline: withUnit(fmtNum(b, k.digits), k.unit),
              recommended: withUnit(fmtNum(r, k.digits), k.unit),
              change: b !== null && r !== null ? withUnit(signed(r - b, k.digits), k.unit) : '--',
            };
          })}
        />
      ) : null}
      {violations.length ? (
        <div className={styles.stack}>
          <h4 className={styles.subhead}>Caused by the recommendation</h4>
          <ul className={styles.dots}>
            {violations.map((v, i) => (
              // positional: violations have no ids and keep the analysis order
              <li key={i} className={styles['dots--critical']}>
                {violationText(v)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {existing.length ? (
        <div className={styles.stack}>
          <h4 className={styles.subhead}>Also in the baseline run</h4>
          <ul className={styles.dots}>
            {existing.map((v, i) => (
              // positional: violations have no ids and keep the analysis order
              <li key={i} className={styles['dots--warning']}>
                {violationText(v)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
