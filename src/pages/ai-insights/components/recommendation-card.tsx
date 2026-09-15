import { Button, COLOR, Input, LoadingCircle, Metric } from '@digital-twin/components';
import { Check, Close, OpenInNew } from '@digital-twin/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { InsightsAccess } from '../ai-insights.hook';
import styles from '../ai-insights.module.scss';
import {
  APPLY_OUTCOME,
  errorText,
  fmtNum,
  fmtTime,
  PREDICTED_META,
  timeAgo,
  timeUntil,
  useNow,
} from '../ai-insights.utils';
import {
  AI_INSIGHTS_QUERY,
  applyRecommendation,
  dismissRecommendation,
  Recommendation,
} from '../api/ai-insights.api';
import {
  applyCount,
  ConstraintView,
  constraintView,
  recommendationSteps,
  setpointRows,
  twinCompare,
  validationVerdict,
  writeText,
} from '../recommendation.utils';
import { ConstraintBullets, SetpointChart, StatusStepper, TwinBars } from './recommendation-charts';
import { RecommendationDetail } from './recommendation-detail';
import { ValidationBadge, VerdictBadge } from './recommendation-validation';
import { ConfirmPopup, Empty, Pill, SectionTitle } from './shared';

/** The digital twin's caches that show set points, commands and unit states */
const TWIN_QUERY_PREFIXES = [
  'DIGITAL_TWIN_ASSETS',
  'DIGITAL_TWIN_PARAMETERS',
  'DIGITAL_TWIN_CONTROLS',
  'DIGITAL_TWIN_OVERVIEW',
];

const KPI_MUTED = COLOR.borderLight;

type RecommendationCardProps = {
  rec: Recommendation;
  access: InsightsAccess;
};

/**
 * One optimizer recommendation as data: lifecycle stepper, KPIs (saving, plant power, kW/RT, twin
 * saving), set points current → recommended, the twin run baseline vs recommended and the
 * constraint margins. Everything else is in the details popup. Applying writes every action to
 * the live plant after a confirmation popup that lists each write.
 */
export const RecommendationCard = ({ rec, access }: RecommendationCardProps) => {
  const queryClient = useQueryClient();
  const now = useNow(15_000);
  const [asking, setAsking] = useState<'apply' | 'dismiss' | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [note, setNote] = useState('');
  const [failure, setFailure] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.all });
    // the twin's own caches show the new set points, the command history and unit states
    for (const prefix of TWIN_QUERY_PREFIXES) {
      queryClient.invalidateQueries({ queryKey: [prefix] });
    }
  };

  const apply = useMutation({
    mutationFn: () => applyRecommendation(rec.id),
    // the outcome shows on the card; failures also raise the app's error toast
    meta: { toastId: 'aiInsightsApply', hideToast: true },
    onSuccess: (r) => {
      // the stored apply record carries the same results as the response
      queryClient.setQueryData(AI_INSIGHTS_QUERY.recommendation(rec.id), {
        ...r.recommendation,
        applyResults: r.recommendation.applyResults ?? {
          status: null,
          byName: null,
          at: null,
          planned: r.results.length,
          results: r.results,
          restores: r.restores,
        },
      });
    },
    onError: (err) => setFailure(errorText(err, 'The recommendation could not be applied')),
    onSettled: refresh,
  });

  const dismiss = useMutation({
    mutationFn: () => dismissRecommendation(rec.id, note),
    meta: { toastId: 'aiInsightsDismiss', hideToast: true },
    onSuccess: (r) => {
      queryClient.setQueryData(AI_INSIGHTS_QUERY.recommendation(rec.id), r);
      setAsking(null);
    },
    onError: (err) => {
      setAsking(null);
      setFailure(errorText(err, 'The recommendation could not be dismissed'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.all }),
  });

  const setpoints = useMemo(() => setpointRows(rec), [rec]);
  const compare = useMemo(() => twinCompare(rec.validation), [rec.validation]);
  const constraints = useMemo(
    () => rec.constraints.map(constraintView).filter((c): c is ConstraintView => c !== null),
    [rec.constraints]
  );
  const steps = recommendationSteps(rec.status, rec.validation);
  const verdict = validationVerdict(rec.validation);

  const open =
    rec.status === 'PROPOSED' || rec.status === 'VALIDATING' || rec.status === 'VALIDATED';
  const expired = !!rec.validUntil && Date.parse(rec.validUntil) <= now;
  const busy = apply.isPending || dismiss.isPending;
  const canApply =
    rec.status === 'VALIDATED' &&
    !expired &&
    rec.actions.length > 0 &&
    access.canUpdate &&
    access.canOperate;
  // the backend decides only on validated recommendations
  const canDismiss = rec.status === 'VALIDATED' && access.canUpdate;
  const record = rec.applyResults;
  const { confirmed, planned } = applyCount(rec);

  /** why Apply is not available (button tooltip and a short badge) */
  const blocked = (() => {
    if (rec.status !== 'VALIDATED') return null;
    if (expired) return { badge: 'Expired', text: 'Run the optimizer again' };
    if (!access.canUpdate || !access.canOperate)
      return {
        badge: 'View only',
        text: 'Needs AI Insights › Update and Digital Twin › Update',
      };
    if (!rec.actions.length) return { badge: 'No changes', text: 'Nothing to write' };
    return null;
  })();

  const kw = PREDICTED_META.plant_kw;
  const eff = PREDICTED_META.kw_per_rt;
  const twinTone = !compare
    ? KPI_MUTED
    : verdict?.tone === 'critical' || (compare.savingKw ?? 0) <= 0
      ? COLOR.conditionCriticalPrimary
      : COLOR.conditionNormalPrimary;

  return (
    <div className={styles.rec}>
      <div className={styles.rec__scroll}>
        <div className={styles.rec__head}>
          <StatusStepper steps={steps} />
          <span className={styles.muted}>
            {timeAgo(rec.createdAt, now)}
            {rec.validUntil && open
              ? expired
                ? ` · expired ${timeAgo(rec.validUntil, now)}`
                : ` · expires ${timeUntil(rec.validUntil, now)}`
              : ''}
          </span>
          <ValidationBadge rec={rec} canViewSimulation={access.canViewSimulation} />
        </div>

        <div className={styles.kpis}>
          <Metric
            title="Predicted saving"
            value={rec.savingsKw !== null ? fmtNum(rec.savingsKw, 0) : '--'}
            unit={`kW${rec.savingsPct !== null ? ` · ${fmtNum(rec.savingsPct, 1)} %` : ''}`}
            borderColor={COLOR.backgroundLowest}
            containerClassName={styles.kpi}
            containerStyle={{ borderBottom: `4px solid ${COLOR.conditionNormalPrimary}` }}
          />
          <Metric
            title={`Plant power (${kw.unit})`}
            value={fmtNum(rec.recommended.predicted.plant_kw ?? rec.current.predicted.plant_kw, 0)}
            unit={
              rec.current.predicted.plant_kw !== null &&
              rec.current.predicted.plant_kw !== undefined
                ? `from ${fmtNum(rec.current.predicted.plant_kw, 0)}`
                : undefined
            }
            borderColor={COLOR.backgroundLowest}
            containerClassName={styles.kpi}
            containerStyle={{ borderBottom: `4px solid ${COLOR.brandSurfaceDefaultPrimary}` }}
          />
          <Metric
            title={`Efficiency (${eff.unit})`}
            value={fmtNum(
              rec.recommended.predicted.kw_per_rt ?? rec.current.predicted.kw_per_rt,
              3
            )}
            unit={
              rec.current.predicted.kw_per_rt !== null &&
              rec.current.predicted.kw_per_rt !== undefined
                ? `from ${fmtNum(rec.current.predicted.kw_per_rt, 3)}`
                : undefined
            }
            borderColor={COLOR.backgroundLowest}
            containerClassName={styles.kpi}
            containerStyle={{ borderBottom: `4px solid ${COLOR.brandSurfaceDefaultPrimary}` }}
          />
          <Metric
            title="Twin saving (2 h)"
            value={compare?.savingKw !== null && compare ? fmtNum(compare.savingKw, 1) : '--'}
            unit={
              compare?.savingKwh !== null && compare
                ? `kW · ${fmtNum(compare.savingKwh, 0)} kWh`
                : 'kW'
            }
            borderColor={COLOR.backgroundLowest}
            containerClassName={styles.kpi}
            containerStyle={{ borderBottom: `4px solid ${twinTone}` }}
          />
        </div>

        <div className={styles.rec__grid}>
          <section className={styles.rec__block}>
            <SectionTitle info="Each set point on the optimizer's allowed range: grey = in force now, blue = recommended. Set points that stay the same are marked “held”.">
              Set points
            </SectionTitle>
            {setpoints.length ? <SetpointChart rows={setpoints} /> : <Empty>No set points</Empty>}
            {constraints.length ? (
              <>
                <SectionTitle info="The surrogate model's prediction at the recommended set points against each plant limit (the optimizer keeps a back-off for the model error). Red = beyond the limit.">
                  Constraints
                </SectionTitle>
                <ConstraintBullets items={constraints} />
              </>
            ) : null}
          </section>

          <section className={styles.rec__block}>
            <SectionTitle
              info="The same plant state simulated for 2 hours twice on the digital twin: as it runs now (baseline) and with the recommended set points."
              aside={<VerdictBadge value={rec.validation} />}
            >
              Twin validation
            </SectionTitle>
            {compare ? (
              <TwinBars compare={compare} />
            ) : (
              <Empty>
                {rec.status === 'VALIDATING' || rec.status === 'PROPOSED'
                  ? 'Twin run in progress'
                  : 'No twin results'}
              </Empty>
            )}
          </section>
        </div>
      </div>

      <div className={styles.rec__actions}>
        <div className={styles.rec__outcome}>
          {apply.isPending ? (
            <span className={styles.progress} role="status">
              <LoadingCircle isLoading scale={0.4} />
              Writing {rec.actions.length} change{rec.actions.length === 1 ? '' : 's'}…
            </span>
          ) : failure ? (
            <Pill color="critical" title={failure}>
              {failure}
            </Pill>
          ) : record?.status ? (
            <Pill
              color={APPLY_OUTCOME[record.status].color}
              title={
                record.at
                  ? `${fmtTime(record.at)}${record.byName ? ` · ${record.byName}` : ''}`
                  : undefined
              }
            >
              {APPLY_OUTCOME[record.status].text} · {confirmed}/{planned}
            </Pill>
          ) : blocked ? (
            <Pill color="offline" title={blocked.text}>
              {blocked.badge}
            </Pill>
          ) : null}
        </div>
        <Button
          type="button"
          color="default-secondary"
          icon={<OpenInNew />}
          onClick={() => setShowDetail(true)}
        >
          Details
        </Button>
        {canDismiss ? (
          <Button
            type="button"
            color="default-secondary"
            icon={<Close />}
            disabled={busy}
            onClick={() => {
              setNote('');
              setAsking('dismiss');
            }}
          >
            Dismiss
          </Button>
        ) : null}
        {rec.status === 'VALIDATED' ? (
          <Button
            type="button"
            icon={<Check />}
            disabled={!canApply || busy}
            onClick={() => {
              setFailure(null);
              setAsking('apply');
            }}
            title={blocked?.text ?? 'Write the recommended set points to the plant'}
          >
            {record && record.status !== 'APPLIED' ? 'Apply again' : 'Apply'}
          </Button>
        ) : null}
      </div>

      <ConfirmPopup
        open={asking === 'apply'}
        title={`Apply recommendation #${rec.id}`}
        icon={<Check />}
        info="Modes switch first, then the set points. Writing stops at the first change the plant does not confirm, and modes already switched are written back."
        confirmLabel="Apply to plant"
        confirmIcon={<Check />}
        onConfirm={() => {
          setAsking(null);
          setFailure(null);
          apply.mutate();
        }}
        onCancel={() => setAsking(null)}
      >
        <span className={styles.confirm__lead}>
          {rec.actions.length} change{rec.actions.length === 1 ? '' : 's'} to the live plant:
        </span>
        <ol className={styles.confirm__items}>
          {rec.actions.map((a) => (
            <li key={`${a.asset}:${a.param}`}>{writeText(rec, a)}</li>
          ))}
        </ol>
      </ConfirmPopup>

      <ConfirmPopup
        open={asking === 'dismiss'}
        title={`Dismiss recommendation #${rec.id}`}
        icon={<Close />}
        info="Nothing is written to the plant. The note is kept with the recommendation."
        confirmLabel="Dismiss"
        confirmIcon={<Close />}
        tone="danger"
        busy={dismiss.isPending}
        onConfirm={() => {
          setFailure(null);
          dismiss.mutate();
        }}
        onCancel={() => setAsking(null)}
      >
        <Input
          label="Note (optional)"
          placeholder="Why it is not used"
          value={note}
          background="dark"
          inputProps={{ maxLength: 500 }}
          onChange={(e) => setNote(e.target.value)}
        />
      </ConfirmPopup>

      <RecommendationDetail
        rec={rec}
        open={showDetail}
        onClose={() => setShowDetail(false)}
        canViewSimulation={access.canViewSimulation}
        setpoints={setpoints}
        compare={compare}
      />
    </div>
  );
};
