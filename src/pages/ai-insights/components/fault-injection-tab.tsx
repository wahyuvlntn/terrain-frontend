import { Button, Container, Dropdown, InfoTooltip, Loading, Table } from '@digital-twin/components';
import { Bug, Close, WarningFill } from '@digital-twin/icons';
import { toast } from '@digital-twin/reusables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { InsightsAccess, useInsightAssets } from '../ai-insights.hook';
import styles from '../ai-insights.module.scss';
import { assetTag, fmtNum, fmtTime, timeAgo, useNow, withUnit } from '../ai-insights.utils';
import {
  ActivePlantFault,
  AI_INSIGHTS_POLL,
  AI_INSIGHTS_QUERY,
  FaultCatalogEntry,
  getActivePlantFaults,
  getFaultCatalog,
  injectFault,
} from '../api/ai-insights.api';
import { ConfirmPopup, Empty, Facts, Pill } from './shared';

/**
 * An LBNL intensity as the operator reads it: a sensor bias with its sign ("+2 K", "−10 %"), a
 * valve leak or stuck position in % ("25 %"), a fouling capacity factor ("× 0.80 capacity"), the
 * on / off PI detuning ("detuned"). The value sent stays the documented one.
 */
const intensityText = (v: number | null, unit: string | null, signed = false) => {
  if (v === null) return '--';
  const sign = signed && v > 0 ? '+' : v < 0 ? '−' : '';
  const abs = Math.abs(v);
  switch (unit) {
    case 'K':
      return `${sign}${abs} K`;
    case 'fraction':
      return `${sign}${+(abs * 100).toFixed(1)} %`;
    case 'capacity factor':
      return `× ${fmtNum(v, 2)} capacity`;
    case '':
    case null:
      return v === 1 ? 'detuned' : String(v);
    default:
      return withUnit(`${sign}${abs}`, unit);
  }
};

/** Biases go both ways: their positive intensities get a sign */
const isSigned = (entry?: { intensities: number[] }) => !!entry?.intensities.some((x) => x < 0);

type Pending =
  | { action: 'inject'; entry: FaultCatalogEntry; alias: string; value: number }
  | { action: 'clear'; fault: ActivePlantFault; entry?: FaultCatalogEntry };

const ACTIVE_COLUMNS = [
  { key: 'asset', name: 'Equipment', width: 110 },
  { key: 'fault', name: 'Fault' },
  { key: 'kind', name: 'Type', width: 120 },
  { key: 'intensity', name: 'Intensity', width: 150 },
  { key: 'since', name: 'Since', width: 110 },
  { key: 'action', name: '', width: 110, alignment: 'right' as const },
];

const INJECT_INFO =
  'An injected fault changes measured values and control loops at once, raises alarms and condition changes, notifies users and can create maintenance orders. It stays until it is cleared here or its corrective order is completed. Intensities are the values documented in the LBNL fault data set.';

type FaultInjectionTabProps = { access: InsightsAccess };

/**
 * Injects documented LBNL faults into the live simulated plant (admins), to exercise the fault
 * detection, the alarms and the maintenance workflow; lists the faults active in the plant and
 * clears injected ones. Every injection and clearance is confirmed in a popup first.
 */
export const FaultInjectionTab = ({ access }: FaultInjectionTabProps) => {
  const queryClient = useQueryClient();
  const now = useNow(15_000);
  const { byAlias } = useInsightAssets(access.canViewTwin);
  const [kind, setKind] = useState('');
  const [alias, setAlias] = useState('');
  const [value, setValue] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);

  const allowed = access.isAdmin && access.canOperate;

  const catalog = useQuery({
    queryKey: AI_INSIGHTS_QUERY.faultCatalog,
    queryFn: getFaultCatalog,
    enabled: access.canViewSimulation,
    staleTime: 10 * 60_000,
    meta: { toastId: 'aiInsightsFaultCatalog' },
  });
  const active = useQuery({
    queryKey: AI_INSIGHTS_QUERY.activeFaults,
    queryFn: getActivePlantFaults,
    enabled: access.canViewTwin,
    refetchInterval: AI_INSIGHTS_POLL.activeFaults,
    meta: { toastId: 'aiInsightsActivePlantFaults' },
  });

  const entries = catalog.data ?? [];
  const byKind = useMemo(() => new Map(entries.map((e) => [e.kind, e])), [entries]);
  const entry = byKind.get(kind);

  const send = useMutation({
    mutationFn: async (p: Pending) => {
      const target = p.action === 'inject' ? p.alias : p.fault.alias;
      const assetId =
        (p.action === 'clear' ? p.fault.assetId : null) ?? byAlias.get(target)?.id ?? null;
      if (assetId === null) throw new Error(`${assetTag(target)} is not in your equipment list`);
      return await (p.action === 'inject'
        ? injectFault(assetId, p.entry.kind, p.value, 'inject')
        : injectFault(assetId, p.fault.kind, null, 'clear'));
    },
    // failures raise the app's error toast
    meta: { toastId: 'aiInsightsInjectFault', hideToast: true },
    onSuccess: (_, p) =>
      toast.success(
        p.action === 'inject'
          ? `${p.entry.label} sent to ${assetTag(p.alias)} at ${intensityText(p.value, p.entry.unit, isSigned(p.entry))}.`
          : `Clearing ${p.entry?.label ?? p.fault.kind} on ${assetTag(p.fault.alias)} sent.`
      ),
    onSettled: () => {
      setPending(null);
      queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.activeFaults });
      queryClient.invalidateQueries({ queryKey: AI_INSIGHTS_QUERY.overview });
    },
  });

  const faults = active.data ?? [];

  /** catalog entry of an active fault (injectable LBNL kinds are labelled by the backend) */
  const entryOf = (f: ActivePlantFault): FaultCatalogEntry | undefined =>
    byKind.get(f.kind) ??
    (f.label
      ? {
          kind: f.kind,
          assetKind: null,
          assets: [f.alias],
          intensities: [],
          unit: null,
          label: f.label,
          code: f.code,
        }
      : undefined);

  const rows = faults.map((f) => {
    const e = entryOf(f);
    return {
      id: `${f.alias}:${f.kind}`,
      asset: <b>{assetTag(f.alias)}</b>,
      fault: <span title={e?.label ?? f.kind}>{e?.label ?? f.kind}</span>,
      kind: e ? (
        <Pill color="warning">LBNL fault</Pill>
      ) : (
        <Pill color="secondary">Wear / trip</Pill>
      ),
      intensity: e
        ? intensityText(f.value, e.unit, isSigned(e))
        : f.sev !== null
          ? `${fmtNum(f.sev * 100, 0)} % progressed`
          : '--',
      since: f.start ? <span title={fmtTime(f.start)}>{timeAgo(f.start, now)}</span> : '--',
      action:
        e && allowed ? (
          <Button
            type="button"
            color="default-secondary"
            icon={<Close />}
            disabled={send.isPending}
            onClick={() => setPending({ action: 'clear', fault: f, entry: e })}
          >
            Clear
          </Button>
        ) : null,
    };
  });

  const pendingText =
    pending?.action === 'inject'
      ? `${pending.entry.label} on ${assetTag(pending.alias)} at ${intensityText(pending.value, pending.entry.unit, isSigned(pending.entry))}`
      : pending?.action === 'clear'
        ? `${pending.entry?.label ?? pending.fault.kind} on ${assetTag(pending.fault.alias)}`
        : '';

  return (
    <div className={styles.split}>
      <Container
        title="Inject a fault"
        icon={<Bug />}
        titleSuffixIcon={<InfoTooltip title="Fault injection" content={INJECT_INFO} />}
        background="none"
        className={styles.split__side}
        contentWrapperProps={{ style: { overflow: 'auto', gap: 16, minHeight: 0 } }}
      >
        <div className={styles.banner} role="note">
          <WarningFill />
          <b>Affects the live simulated plant</b>
        </div>
        {!allowed ? (
          <Empty>Needs an administrator with Digital Twin › Update</Empty>
        ) : !access.canViewSimulation ? (
          <Empty>The fault catalog needs Simulation › Read</Empty>
        ) : (
          <div className={styles.form}>
            <Dropdown
              label="Fault"
              value={kind}
              background="dark"
              searchable
              placeholder="Choose a fault"
              options={entries.map((e) => ({
                value: e.kind,
                label: `${e.label}${e.code ? ` (${e.code})` : ''}`,
              }))}
              onChange={(k) => {
                setKind(k);
                setAlias('');
                setValue('');
              }}
            />
            <Dropdown
              label="Equipment"
              value={alias}
              background="dark"
              placeholder="Choose the equipment"
              disabled={!entry}
              options={(entry?.assets ?? []).map((a) => ({
                value: a,
                label: `${assetTag(a)}${byAlias.get(a) ? '' : ' (not visible)'}`,
              }))}
              onChange={setAlias}
            />
            <Dropdown
              label="Intensity"
              value={value}
              background="dark"
              placeholder="Choose an intensity"
              disabled={!entry}
              options={(entry?.intensities ?? []).map((v) => ({
                value: String(v),
                label: intensityText(v, entry?.unit ?? null, isSigned(entry)),
              }))}
              onChange={setValue}
            />
            {entry ? (
              <Facts
                items={[
                  { label: 'Detected by', value: entry.code ?? '--' },
                  { label: 'Equipment kind', value: entry.assetKind ?? '--' },
                ]}
              />
            ) : null}
            <div className={styles.actionsRow}>
              <Button
                type="button"
                color="error"
                icon={<Bug />}
                disabled={!entry || !alias || value === '' || send.isPending || !byAlias.get(alias)}
                isLoading={send.isPending && pending?.action === 'inject'}
                onClick={() => {
                  if (entry && alias && value !== '') {
                    setPending({ action: 'inject', entry, alias, value: Number(value) });
                  }
                }}
              >
                Inject…
              </Button>
            </div>
          </div>
        )}
      </Container>

      <Container
        title="Active plant faults"
        icon={<WarningFill />}
        titleSuffixIcon={
          <InfoTooltip
            title="Active plant faults"
            content="LBNL faults stay until they are cleared here or their corrective order is completed. Wear / trip entries are the plant's own degradations; they clear through maintenance orders."
          />
        }
        background="none"
        className={styles.split__main}
        contentWrapperProps={{ style: { overflow: 'hidden', gap: 12, minHeight: 0 } }}
      >
        <div className={styles.tableArea}>
          <Loading isLoading={active.isFetching && !active.data} />
          {!access.canViewTwin ? (
            <Empty>Needs Digital Twin › Read</Empty>
          ) : faults.length ? (
            <Table columns={ACTIVE_COLUMNS} rows={rows} wrapperStyle={{ maxHeight: '100%' }} />
          ) : (
            <Empty>{active.isLoading ? 'Loading…' : 'No faults active in the plant'}</Empty>
          )}
        </div>
      </Container>

      <ConfirmPopup
        open={!!pending}
        title={pending?.action === 'clear' ? 'Clear fault' : 'Inject fault'}
        icon={pending?.action === 'clear' ? <Close /> : <Bug />}
        info={pending?.action === 'clear' ? undefined : INJECT_INFO}
        confirmLabel={pending?.action === 'clear' ? 'Clear fault' : 'Inject fault'}
        confirmIcon={pending?.action === 'clear' ? <Close /> : <Bug />}
        tone={pending?.action === 'clear' ? 'primary' : 'danger'}
        busy={send.isPending}
        onConfirm={() => {
          if (pending) send.mutate(pending);
        }}
        onCancel={() => setPending(null)}
      >
        <span className={styles.confirm__lead}>
          {pending?.action === 'clear'
            ? 'The plant returns to normal behaviour:'
            : 'The live plant changes immediately:'}
        </span>
        <b>{pendingText}</b>
      </ConfirmPopup>
    </div>
  );
};
