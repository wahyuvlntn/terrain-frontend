import {
  Button,
  Container,
  InfoTooltip,
  Input,
  Loading,
  Popup,
  Table,
  ToggleButton,
} from '@digital-twin/components';
import {
  DatasetGrid,
  DataThresholding,
  Edit,
  InformationCircle,
  Map as MapIcon,
  Reload,
  SaveFill,
} from '@digital-twin/icons';
import { toast } from '@digital-twin/reusables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { InsightsAccess, useFaultRules } from '../ai-insights.hook';
import styles from '../ai-insights.module.scss';
import {
  errorText,
  fmtNum,
  fmtTime,
  humanize,
  isPlainObject,
  SEVERITY_COLOR,
} from '../ai-insights.utils';
import {
  AI_INSIGHTS_QUERY,
  FaultRule,
  getFaultCatalog,
  getPointMap,
  updateRule,
} from '../api/ai-insights.api';
import { ConfirmPopup, Empty, Facts, JsonView, Pill, SectionTitle } from './shared';

const SCOPE_LABEL: Record<string, string> = {
  chiller: 'Each running chiller',
  tower: 'Each running tower',
  plant: 'Plant (CHWS-01)',
};

const showValue = (v: unknown) =>
  v === undefined
    ? '--'
    : typeof v === 'number'
      ? String(+v.toPrecision(6))
      : typeof v === 'string'
        ? v
        : JSON.stringify(v);

/** Draft text of a parameter value in the editor */
const draftOf = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));

/** Tunable parameters of a rule: the stored ones and the defaults (`_` keys are not thresholds) */
const tunableKeys = (rule: FaultRule) =>
  Object.keys({ ...rule.defaults, ...rule.params }).filter((k) => !k.startsWith('_'));

/** The value in use: stored, else the default */
const inUse = (rule: FaultRule, key: string) =>
  key in rule.params ? rule.params[key] : rule.defaults[key];

/** Parses an edited value with the type of the value it replaces */
const parseDraft = (raw: string, like: unknown): { value?: unknown; error?: string } => {
  const text = raw.trim();
  if (typeof like === 'number') {
    if (text === '' || !Number.isFinite(Number(text))) return { error: 'Enter a number' };
    return { value: Number(text) };
  }
  if (typeof like === 'boolean') {
    if (text !== 'true' && text !== 'false') return { error: 'true or false' };
    return { value: text === 'true' };
  }
  if (typeof like === 'string') return { value: raw };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: 'Invalid JSON' };
  }
};

type RuleEditorProps = { rule: FaultRule; open: boolean; onClose: () => void };

/**
 * Threshold editor of a rule (admins) in a popup: every value keeps the type of the value it
 * replaces; defaults can be restored. Only the changed parameters are sent (the backend merges
 * them into the stored ones).
 */
const RuleEditor = ({ rule, open, onClose }: RuleEditorProps) => {
  const queryClient = useQueryClient();
  const keys = tunableKeys(rule);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(keys.map((k) => [k, draftOf(inUse(rule, k))]))
  );

  const parsed = Object.fromEntries(
    keys.map((k) => [k, parseDraft(draft[k] ?? '', inUse(rule, k))])
  );
  const invalid = keys.some((k) => parsed[k].error);
  const changes = Object.fromEntries(
    keys
      .filter((k) => JSON.stringify(parsed[k].value) !== JSON.stringify(inUse(rule, k)))
      .map((k) => [k, parsed[k].value])
  );
  const changed = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => updateRule(rule.code, { params: changes }),
    meta: { toastId: 'aiInsightsRuleParams', hideToast: true },
    onSuccess: (r) => {
      toast.success(`${r.code} saved (version ${r.version ?? '--'}).`);
      onClose();
    },
    onError: (err) => toast.error(errorText(err, 'The rule could not be saved')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.rules }),
  });

  return (
    <ConfirmPopup
      open={open}
      title={`Thresholds · ${rule.code}`}
      icon={<Edit />}
      info="Changes apply from the next evaluation (every 5 minutes) and raise the rule's version."
      confirmLabel="Save"
      confirmIcon={<SaveFill />}
      busy={save.isPending}
      disabled={invalid || !changed}
      width="min(720px, 90vw)"
      onConfirm={() => save.mutate()}
      onCancel={onClose}
    >
      <div className={styles.editor}>
        <Table
          columns={[
            { key: 'name', name: 'Parameter' },
            { key: 'value', name: 'Value', width: 240 },
            { key: 'default', name: 'Default', width: 140, alignment: 'right' },
          ]}
          rowHeight={52}
          rows={keys.map((k) => ({
            id: k,
            name: <span title={k}>{humanize(k)}</span>,
            value: (
              <Input
                value={draft[k] ?? ''}
                background="dark"
                isError={!!parsed[k].error}
                title={parsed[k].error}
                disabled={save.isPending}
                inputProps={{ 'aria-label': `${humanize(k)} of ${rule.code}` }}
                onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
              />
            ),
            default: showValue(rule.defaults[k]),
          }))}
        />
      </div>
      <div className={styles.actionsRow}>
        {invalid ? <Pill color="critical">Fix the highlighted values</Pill> : null}
        <Button
          type="button"
          color="default-secondary"
          icon={<Reload />}
          disabled={save.isPending}
          onClick={() =>
            setDraft(
              Object.fromEntries(keys.map((k) => [k, draftOf(rule.defaults[k] ?? rule.params[k])]))
            )
          }
        >
          Restore defaults
        </Button>
      </div>
    </ConfirmPopup>
  );
};

const RULE_COLUMNS = [
  { key: 'code', name: 'Code', width: 110 },
  { key: 'name', name: 'Rule' },
  { key: 'severity', name: 'Severity', width: 110 },
  { key: 'calibrated', name: 'Thresholds', width: 130 },
  { key: 'enabled', name: 'Enabled', width: 100, alignment: 'center' as const },
];

const THRESHOLD_COLUMNS = [
  { key: 'name', name: 'Parameter' },
  { key: 'value', name: 'In use', width: 120, alignment: 'right' as const },
  { key: 'default', name: 'Default', width: 120, alignment: 'right' as const },
];

const POINT_COLUMNS = [
  { key: 'lbnl', name: 'LBNL point', width: 200 },
  { key: 'tag', name: 'Plant tag', width: 200 },
  { key: 'units', name: 'Unit (LBNL → SI)', width: 160 },
  { key: 'description', name: 'Description' },
];

/** On / off switch of a rule (admins) */
const EnableToggle = ({ rule }: { rule: FaultRule }) => {
  const queryClient = useQueryClient();
  const enable = useMutation({
    mutationFn: (enabled: boolean) => updateRule(rule.code, { enabled }),
    meta: { toastId: 'aiInsightsRuleEnable', hideToast: true },
    onSuccess: (r) => toast.success(`${r.code} ${r.enabled ? 'enabled' : 'disabled'}.`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.rules }),
  });
  // a click on the switch also selects its row (the detail shows the rule switched)
  return (
    <ToggleButton
      value={rule.enabled}
      disabled={enable.isPending}
      aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.code}`}
      onChange={(_, enabled) => enable.mutate(enabled)}
    />
  );
};

type RuleDetailProps = { rule: FaultRule; isAdmin: boolean; intensities: string[] };

/** A rule: what it detects, its signals, thresholds (editable by admins) and calibration */
const RuleDetail = ({ rule, isAdmin, intensities }: RuleDetailProps) => {
  const [editing, setEditing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const calibration = isPlainObject(rule.calibration) ? rule.calibration : null;
  const updates = calibration && isPlainObject(calibration.updates) ? calibration.updates : null;
  const paramKeys = tunableKeys(rule);

  return (
    <div className={styles.detail}>
      <div className={styles.detail__header}>
        <span className={styles.kicker}>
          {rule.code}
          {rule.lbnlFault ? ` · LBNL ${rule.lbnlFault}` : ''}
        </span>
        <h3 title={rule.name}>{rule.name}</h3>
        <div className={styles.chips}>
          {rule.severity ? (
            <Pill color={SEVERITY_COLOR[rule.severity]}>{rule.severity.toLowerCase()}</Pill>
          ) : null}
          <Pill color={rule.enabled ? 'running' : 'offline'}>
            {rule.enabled ? 'Enabled' : 'Disabled'}
          </Pill>
          <Pill color={rule.calibratedAt ? 'normal' : 'secondary'}>
            {rule.calibratedAt ? 'Calibrated' : 'Engineering defaults'}
          </Pill>
        </div>
      </div>

      <div className={styles.detail__scroll}>
        {rule.description ? <p className={styles.text}>{rule.description}</p> : null}
        <Facts
          items={[
            {
              label: 'Applies to',
              value: rule.assetScope ? (SCOPE_LABEL[rule.assetScope] ?? rule.assetScope) : '--',
            },
            { label: 'Version', value: `v${rule.version ?? 1}` },
            {
              label: 'Updated',
              value: `${fmtTime(rule.updatedAt, 'dd MMM yyyy')}${rule.updatedByName ? ` · ${rule.updatedByName}` : ''}`,
            },
            ...(intensities.length
              ? [{ label: 'LBNL intensities', value: intensities.join(', ') }]
              : []),
          ]}
        />

        {rule.signals.length ? (
          <section className={styles.stack}>
            <SectionTitle info="LBNL data set points the rule reads, mapped onto the plant's own tags.">
              Signals
            </SectionTitle>
            <div className={styles.chips}>
              {rule.signals.map((s) => (
                <Pill
                  key={`${s.lbnl}:${s.asset}:${s.param}`}
                  color="secondary"
                  title={s.lbnl ?? undefined}
                >
                  {s.asset ?? ''}
                  {s.param ? `.${s.param}` : ''}
                </Pill>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.stack}>
          <SectionTitle
            aside={
              isAdmin && paramKeys.length ? (
                <Button
                  type="button"
                  color="default-secondary"
                  icon={<Edit />}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
              ) : null
            }
          >
            Thresholds
          </SectionTitle>
          {paramKeys.length ? (
            <Table
              columns={THRESHOLD_COLUMNS}
              rows={paramKeys.map((k) => {
                const value = inUse(rule, k);
                const differs = JSON.stringify(value) !== JSON.stringify(rule.defaults[k]);
                return {
                  id: k,
                  name: <span title={k}>{humanize(k)}</span>,
                  value: differs ? <b>{showValue(value)}</b> : showValue(value),
                  default: showValue(rule.defaults[k]),
                };
              })}
            />
          ) : (
            <Empty>No parameters</Empty>
          )}
        </section>

        <section className={styles.stack}>
          <SectionTitle
            info="Thresholds calibrated on fault-free twin data, never below the engineering defaults."
            aside={
              calibration?.stats !== undefined ? (
                <Button
                  type="button"
                  color="default-secondary"
                  icon={<DatasetGrid />}
                  onClick={() => setShowStats(true)}
                >
                  Statistics
                </Button>
              ) : null
            }
          >
            Calibration
          </SectionTitle>
          {calibration ? (
            <>
              <Facts
                items={[
                  { label: 'Calibrated', value: fmtTime(rule.calibratedAt, 'dd MMM yyyy') },
                  {
                    label: 'Data',
                    value:
                      typeof calibration.hours === 'number'
                        ? `${fmtNum(calibration.hours, 0)} h`
                        : '--',
                  },
                  {
                    label: 'Limit',
                    value:
                      typeof calibration.k_sigma === 'number'
                        ? `${calibration.k_sigma} robust σ`
                        : '--',
                  },
                  {
                    label: 'Simulation',
                    value: typeof calibration.job_id === 'number' ? `#${calibration.job_id}` : '--',
                  },
                ]}
              />
              {calibration.applied === false ? (
                <Pill
                  color="warning"
                  title={typeof calibration.note === 'string' ? calibration.note : undefined}
                >
                  Not applied
                </Pill>
              ) : null}
              {updates && Object.keys(updates).length ? (
                <Table
                  columns={[
                    { key: 'name', name: 'Calibrated value' },
                    { key: 'value', name: 'Value', width: 160, alignment: 'right' },
                  ]}
                  rows={Object.entries(updates).map(([k, v]) => ({
                    id: k,
                    name: <span title={k}>{humanize(k)}</span>,
                    value: showValue(v),
                  }))}
                />
              ) : null}
            </>
          ) : (
            <Empty>Not calibrated: engineering defaults in use</Empty>
          )}
        </section>
      </div>

      {isAdmin && editing ? (
        <RuleEditor key={rule.version ?? 0} rule={rule} open onClose={() => setEditing(false)} />
      ) : null}
      <Popup
        open={showStats}
        title={`${rule.code} · calibration statistics`}
        icon={<DatasetGrid />}
        onClose={() => setShowStats(false)}
        variant="none"
        background="none"
        width="min(760px, 90vw)"
      >
        <div className={styles.reading}>
          <JsonView value={calibration?.stats ?? calibration} />
        </div>
      </Popup>
    </div>
  );
};

type RulesTabProps = { access: InsightsAccess };

/**
 * The LBNL fault detection rules as a table (admins switch them on and off) and the selected
 * rule's thresholds and calibration; the LBNL point map opens in a popup.
 */
export const RulesTab = ({ access }: RulesTabProps) => {
  const { query, rules } = useFaultRules();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const pointMap = useQuery({
    queryKey: AI_INSIGHTS_QUERY.pointMap,
    queryFn: getPointMap,
    enabled: showMap,
    staleTime: 10 * 60_000,
    meta: { toastId: 'aiInsightsPointMap' },
  });
  // the LBNL intensities of each rule's fault come with the injectable fault catalog
  const catalog = useQuery({
    queryKey: AI_INSIGHTS_QUERY.faultCatalog,
    queryFn: getFaultCatalog,
    enabled: access.canViewSimulation,
    staleTime: 10 * 60_000,
    meta: { toastId: 'aiInsightsFaultCatalog' },
  });

  const selected = rules.find((r) => r.code === selectedCode) ?? rules[0] ?? null;
  const intensities = useMemo(() => {
    const entry = catalog.data?.find((e) => e.code && e.code === selected?.code);
    return entry
      ? entry.intensities.map(
          (v) => `${v}${entry.unit && entry.unit !== 'fraction' ? ` ${entry.unit}` : ''}`
        )
      : [];
  }, [catalog.data, selected?.code]);

  const rows = rules.map((r) => ({
    id: r.code,
    code: <b>{r.code}</b>,
    name: <span title={r.name}>{r.name}</span>,
    severity: r.severity ? (
      <Pill color={SEVERITY_COLOR[r.severity]}>{r.severity.toLowerCase()}</Pill>
    ) : (
      '--'
    ),
    calibrated: (
      <Pill color={r.calibratedAt ? 'normal' : 'secondary'}>
        {r.calibratedAt ? 'Calibrated' : 'Defaults'}
      </Pill>
    ),
    enabled: access.isAdmin ? (
      <EnableToggle rule={r} />
    ) : (
      <Pill color={r.enabled ? 'running' : 'offline'}>{r.enabled ? 'On' : 'Off'}</Pill>
    ),
  }));

  return (
    <div className={styles.split}>
      <Container
        title="Fault detection rules"
        icon={<DataThresholding />}
        titleSuffixIcon={
          <InfoTooltip
            title="Fault detection rules"
            content={`Each rule translates an LBNL chiller plant fault into the plant's own tags and runs every 5 minutes on steady-state data. ${access.isAdmin ? 'Changes apply from the next evaluation.' : 'Only administrators change rules.'}`}
          />
        }
        background="none"
        className={styles.split__main}
        contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
        rightTopComponent={
          <Button
            type="button"
            color="default-secondary"
            icon={<MapIcon />}
            onClick={() => setShowMap(true)}
          >
            LBNL point map
          </Button>
        }
      >
        <div className={styles.tableArea}>
          <Loading isLoading={query.isFetching && !query.data} />
          {rules.length ? (
            <Table
              columns={RULE_COLUMNS}
              rows={rows}
              selectable
              selectVariant="highlight"
              selectedRowIds={selected ? [selected.code] : []}
              onSelectRow={(code) => setSelectedCode(code)}
              wrapperStyle={{ maxHeight: '100%' }}
            />
          ) : (
            <Empty>
              {query.isLoading
                ? 'Loading…'
                : query.isError
                  ? 'The rules could not be loaded'
                  : 'No rules configured'}
            </Empty>
          )}
        </div>
      </Container>

      <Container
        title="Rule detail"
        icon={<InformationCircle />}
        background="none"
        className={styles.split__detail}
        contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
      >
        {selected ? (
          <RuleDetail
            key={selected.code}
            rule={selected}
            isAdmin={access.isAdmin}
            intensities={intensities}
          />
        ) : (
          <Empty>Select a rule</Empty>
        )}
      </Container>

      <Popup
        open={showMap}
        title="LBNL point map"
        icon={<MapIcon />}
        informationIcon={
          <InfoTooltip
            title="LBNL point map"
            content="How the LBNL data set's point names (°F, GPM, inH2O) map onto this plant's SI tags. {n} is the unit number."
          />
        }
        onClose={() => setShowMap(false)}
        variant="none"
        background="none"
        width="min(1100px, 92vw)"
      >
        <div className={styles.reading}>
          {pointMap.data?.length ? (
            <Table
              columns={POINT_COLUMNS}
              rows={pointMap.data.map((p) => ({
                id: p.lbnlName,
                lbnl: <code>{p.lbnlName}</code>,
                tag: (
                  <code>
                    {p.assetPattern}.{p.paramAlias}
                  </code>
                ),
                units: `${p.lbnlUnit} → ${p.siUnit}`,
                description: <span title={p.description}>{p.description}</span>,
              }))}
            />
          ) : (
            <Empty>{pointMap.isLoading ? 'Loading…' : 'The point map could not be loaded'}</Empty>
          )}
        </div>
      </Popup>
    </div>
  );
};
