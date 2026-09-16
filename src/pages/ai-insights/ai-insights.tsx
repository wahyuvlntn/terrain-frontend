import {
  AlertAlarm,
  AnomalyCircle,
  Bug,
  DataThresholding,
  Library,
  SettingSuggest,
} from '@digital-twin/icons';
import {
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
} from '@digital-twin/reusables';
import { useQuery } from '@tanstack/react-query';
import { ReactNode, useMemo } from 'react';
import {
  INSIGHT_TABS,
  InsightTab,
  useInsightsAccess,
  useInsightsNavigation,
} from './ai-insights.hook';
import styles from './ai-insights.module.scss';
import { AI_INSIGHTS_POLL, AI_INSIGHTS_QUERY, getAiOverview } from './api/ai-insights.api';
import {
  AnomaliesTab,
  DocumentsTab,
  FaultInjectionTab,
  FaultsTab,
  OverviewStrip,
  RecommendationsTab,
  RulesTab,
} from './components';

const TAB_INFO: Record<InsightTab, { label: string; icon: ReactNode; adminOnly?: boolean }> = {
  recommendations: { label: 'Recommendations', icon: <SettingSuggest /> },
  faults: { label: 'Faults', icon: <AlertAlarm /> },
  anomalies: { label: 'Anomalies', icon: <AnomalyCircle /> },
  documents: { label: 'Documents', icon: <Library /> },
  rules: { label: 'Rules', icon: <DataThresholding /> },
  injection: { label: 'Fault injection', icon: <Bug />, adminOnly: true },
};

/**
 * AI Insights of the CUB chiller plant: an overview strip, then tabs for the optimizer's set point
 * recommendations, the LBNL fault detections with their RAG maintenance instructions, sensor
 * anomalies, the document library, the fault detection rules and (administrators) live fault
 * injection. The page never scrolls: every tab fits its panels to the remaining height.
 */
export const AiInsights = () => {
  const access = useInsightsAccess();
  const tabs = useMemo(
    () => INSIGHT_TABS.filter((t) => !TAB_INFO[t].adminOnly || access.isAdmin),
    [access.isAdmin]
  );
  const { tab, openTab, selectedId, select } = useInsightsNavigation(tabs);

  const overview = useQuery({
    queryKey: AI_INSIGHTS_QUERY.overview,
    queryFn: getAiOverview,
    refetchInterval: AI_INSIGHTS_POLL.overview,
    meta: { toastId: 'aiInsightsOverview' },
  });

  return (
    <div className={styles.page}>
      <OverviewStrip data={overview.data} isError={overview.isError} onOpen={openTab} />

      <TabProvider
        value={tab}
        onChange={(v) => openTab(v as InsightTab)}
        type="1"
        className={styles.tabs}
      >
        <TabList className={styles.tabs__list}>
          {tabs.map((t) => (
            <Tab
              key={t}
              value={t}
              label={TAB_INFO[t].label}
              icon={TAB_INFO[t].icon}
              className={styles.tabs__tab}
            />
          ))}
        </TabList>
        {tabs.map((t) => (
          <TabPanel key={t} value={t} className={styles.tabs__panel}>
            {t === 'recommendations' ? (
              <RecommendationsTab
                access={access}
                overview={overview.data}
                selectedId={selectedId}
                onSelect={select}
              />
            ) : t === 'faults' ? (
              <FaultsTab access={access} selectedId={selectedId} onSelect={select} />
            ) : t === 'anomalies' ? (
              <AnomaliesTab access={access} selectedId={selectedId} onSelect={select} />
            ) : t === 'documents' ? (
              <DocumentsTab access={access} />
            ) : t === 'rules' ? (
              <RulesTab access={access} />
            ) : (
              <FaultInjectionTab access={access} />
            )}
          </TabPanel>
        ))}
      </TabProvider>
    </div>
  );
};
