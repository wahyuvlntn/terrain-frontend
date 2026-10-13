import {
  AuthCtx,
  Button,
  Dropdown,
  InfoTooltip,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '@digital-twin/components';
import {
  ChartKpi,
  ChevronDownFill,
  ChevronUpFill,
  Layers,
  MachineDetails,
  SPCChart,
} from '@digital-twin/icons';
import {
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
} from '@digital-twin/reusables';
import { useQuery } from '@tanstack/react-query';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { setAssistantContext } from '../ai-assistant/assistant-context';
import { getOverview, getTools, PRODUCTION_POLL, PRODUCTION_QUERY } from './api/production.api';
import { KPI_SECTIONS, KpiStrip, LotsTab, OverviewTab, QualityTab, ToolsTab } from './components';
import styles from './production.module.scss';
import { DEFAULT_WINDOW, fmtDec, fmtInt, fmtPct, fmtTime, WINDOWS } from './production.utils';

export const PRODUCTION_TABS = ['overview', 'tools', 'lots', 'quality'] as const;
export type ProductionTab = (typeof PRODUCTION_TABS)[number];

const TAB_INFO: Record<ProductionTab, { label: string; icon: ReactNode }> = {
  overview: { label: 'Overview', icon: <ChartKpi /> },
  tools: { label: 'Tools', icon: <MachineDetails /> },
  lots: { label: 'Lots', icon: <Layers /> },
  quality: { label: 'Quality', icon: <SPCChart /> },
};

const PAGE_INFO =
  'Wafer production of FAB1, a scaled 300 mm 40 nm logic fab running the full process flow of two products (MCU40 microcontroller, WSOC40 Wi-Fi / Bluetooth SoC): lot starts and outs, cycle time against plan, work in progress by area and mask layer, the 28 process tools in five bays with their SEMI E10 time states and E79 OEE, and in-line quality.';

const WINDOW_PARAM = 'window';
const TAB_PARAM = 'tab';
const KPI_KEY = 'production.kpiOpen';

/** Hours of a window parameter (one of WINDOWS), else the default */
export const windowHours = (raw: string | null) =>
  WINDOWS.some((w) => w.value === raw) ? Number(raw) : DEFAULT_WINDOW;

const isKpiSection = (section: string | null) =>
  !!section && (KPI_SECTIONS as readonly string[]).includes(section);

/** the KPI strip's open state, remembered per browser (open unless closed before) */
const readKpiOpen = () => {
  try {
    return window.localStorage.getItem(KPI_KEY) !== 'false';
  } catch {
    return true;
  }
};

const storeKpiOpen = (open: boolean) => {
  try {
    window.localStorage.setItem(KPI_KEY, String(open));
  } catch {
    // storage unavailable: the choice just isn't remembered
  }
};

/**
 * Production monitoring (`/production?tab=tools&window=168`): window selector and KPI strip (it
 * can be hidden, to give the tabs the room), then the overview (losses, OEE trend, output, WIP,
 * tool table), tool timeline, lots and quality tabs.
 */
export const Production = () => {
  const [params, setParams] = useSearchParams();
  const hours = windowHours(params.get(WINDOW_PARAM));
  // an assistant link to the strip or one of its cards opens it (and keeps it open): rendered
  // open on arrival, opened when the link is followed on the page
  const section = params.get('section');
  const [kpiOpen, setKpiOpen] = useState(() => isKpiSection(section) || readKpiOpen());
  useEffect(() => {
    if (!isKpiSection(section)) return;
    storeKpiOpen(true);
    setKpiOpen(true);
  }, [section]);
  const toggleKpis = () =>
    setKpiOpen((was) => {
      storeKpiOpen(!was);
      return !was;
    });
  const KpiChevron = kpiOpen ? ChevronUpFill : ChevronDownFill;
  const requested = params.get(TAB_PARAM) as ProductionTab | null;
  const tab: ProductionTab =
    requested && PRODUCTION_TABS.includes(requested) ? requested : 'overview';
  const { hasPermission } = useContext(AuthCtx);
  const canViewTwin = hasPermission(
    PermissionGroupAliasEnum.enum.digitaltwin,
    PermissionAliasEnum.enum.read
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const set = (key: string, value: string) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.set(key, value);
        return out;
      },
      { replace: key === WINDOW_PARAM }
    );

  const overview = useQuery({
    queryKey: PRODUCTION_QUERY.overview(hours),
    queryFn: () => getOverview(hours),
    refetchInterval: PRODUCTION_POLL.overview,
    meta: { toastId: 'productionOverview' },
  });
  // the strip's headline numbers in the ribbon while it is closed
  const kpi = overview.data?.kpi;
  const tools = useQuery({
    queryKey: PRODUCTION_QUERY.tools(hours),
    queryFn: () => getTools(hours),
    refetchInterval: PRODUCTION_POLL.tools,
    meta: { toastId: 'productionTools' },
  });

  // the AI assistant knows the page
  useEffect(() => {
    setAssistantContext({
      page: 'production',
      nodeId: undefined,
      assetAlias: undefined,
      replayJobId: undefined,
    });
    return () =>
      setAssistantContext({
        page: undefined,
        nodeId: undefined,
        assetAlias: undefined,
        replayJobId: undefined,
      });
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.ribbon}>
        <div className={styles.ribbon__left}>
          <InfoTooltip title="Production" content={PAGE_INFO} />
          {overview.data ? (
            <span className={styles.ribbon__meta}>
              {fmtTime(overview.data.window.from)} → {fmtTime(overview.data.window.to)}
            </span>
          ) : null}
          {!kpiOpen && kpi ? (
            <span className={styles.ribbon__meta}>
              {`OEE ${fmtPct(kpi.oee)} · ${fmtInt(kpi.waferOuts)} wafer outs · WIP ${fmtInt(kpi.wipLots)} lots · cycle ${fmtDec(kpi.cycleTimeDays)} days`}
            </span>
          ) : null}
        </div>
        <div className={styles.ribbon__right}>
          <Button
            color="default-secondary"
            icon={<KpiChevron aria-hidden="true" />}
            aria-expanded={kpiOpen}
            title={kpiOpen ? 'Hide the KPI cards' : 'Show the KPI cards'}
            onClick={toggleKpis}
          >
            KPIs
          </Button>
          <Dropdown
            label="Window"
            labelPosition="left"
            variant="medium"
            background="dark"
            value={String(hours)}
            options={WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
            onChange={(v) => set(WINDOW_PARAM, v)}
            wrapperClassName={styles.window}
          />
        </div>
      </div>

      {/* closed, not rendered: `.strip`'s display: grid beats [hidden], and the assistant's
          highlighter must not find a strip that isn't shown */}
      {kpiOpen ? <KpiStrip data={overview.data} isError={overview.isError} /> : null}

      <TabProvider
        value={tab}
        onChange={(v) => set(TAB_PARAM, String(v))}
        type="1"
        className={styles.tabs}
      >
        <TabList>
          {PRODUCTION_TABS.map((t) => (
            <Tab
              key={t}
              value={t}
              label={TAB_INFO[t].label}
              icon={TAB_INFO[t].icon}
              className={styles.tabs__tab}
            />
          ))}
        </TabList>
        {PRODUCTION_TABS.map((t) => (
          <TabPanel key={t} value={t} className={styles.tabs__panel}>
            {t === 'overview' ? (
              <OverviewTab
                hours={hours}
                overview={overview.data}
                overviewLoading={overview.isLoading}
                tools={tools.data ?? []}
                toolsLoading={tools.isLoading}
                now={now}
                canViewTwin={canViewTwin}
              />
            ) : t === 'tools' ? (
              <ToolsTab tools={tools.data ?? []} overview={overview.data} now={now} />
            ) : t === 'lots' ? (
              <LotsTab canViewTwin={canViewTwin} />
            ) : (
              <QualityTab tools={tools.data ?? []} />
            )}
          </TabPanel>
        ))}
      </TabProvider>
    </div>
  );
};
