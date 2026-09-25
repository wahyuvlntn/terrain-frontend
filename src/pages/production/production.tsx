import {
  AuthCtx,
  Dropdown,
  InfoTooltip,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '@digital-twin/components';
import { ChartKpi, Layers, MachineDetails, SPCChart } from '@digital-twin/icons';
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
import { KpiStrip, LotsTab, OverviewTab, QualityTab, ToolsTab } from './components';
import styles from './production.module.scss';
import { DEFAULT_WINDOW, fmtTime, WINDOWS } from './production.utils';

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

/** Hours of a window parameter (one of WINDOWS), else the default */
export const windowHours = (raw: string | null) =>
  WINDOWS.some((w) => w.value === raw) ? Number(raw) : DEFAULT_WINDOW;

/**
 * Production monitoring (`/production?tab=tools&window=168`): window selector and KPI strip, then
 * the overview (losses, OEE trend, output, WIP, tool table), tool timeline, lots and quality tabs.
 */
export const Production = () => {
  const [params, setParams] = useSearchParams();
  const hours = windowHours(params.get(WINDOW_PARAM));
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
          <h3 className={styles.ribbon__title}>FAB1 · 40 nm logic fab</h3>
          <InfoTooltip title="Production" content={PAGE_INFO} />
          {overview.data ? (
            <span className={styles.ribbon__meta}>
              {fmtTime(overview.data.window.from)} → {fmtTime(overview.data.window.to)}
            </span>
          ) : null}
        </div>
        <div className={styles.ribbon__right}>
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

      <KpiStrip data={overview.data} isError={overview.isError} />

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
              <LotsTab />
            ) : (
              <QualityTab tools={tools.data ?? []} />
            )}
          </TabPanel>
        ))}
      </TabProvider>
    </div>
  );
};
