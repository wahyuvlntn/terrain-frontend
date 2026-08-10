import {
  InfoTooltip,
  Input,
  Loading,
  ParameterAreaChart,
  ParameterSetupDrawer,
} from '@digital-twin/components';
import { Search as SearchIcon, SPCChart, TableChart } from '@digital-twin/icons';
import {
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
} from '@digital-twin/reusables';
import { t } from '@digital-twin/utils';
import { useQueries } from '@tanstack/react-query';
import clsx from 'clsx';
import { useState } from 'react';

import { AppPagination } from '../../../shared/components/lib/navigation/app-pagination';
import { SPCLineChart } from '../../../components';
import { getSPCData } from '../api';
import { useHasParameterEditPermission, useParameterList } from './parameter-list.hook';
import styles from './parameter-list.module.scss';
import { SPCConfigDrawer } from './spc-config-drawer';

interface ParameterListProps {
  date: string;
}

export const ParameterList = ({ date }: ParameterListProps) => {
  const {
    handleShowRealTime,
    parametersRealTime,
    parametersSPC,
    showRealTime,
    isLoadingRealTime,
    isLoadingSPC,
    refetchInterval,
    handleSearch,
    search,
    handlePageChange,
    page,
    pageMax,
    timestampHighlight,
    handleSPCRestore,
  } = useParameterList();

  const [openSPCConfig, setOpenSPCConfig] = useState({
    open: false,
    parameterId: 0,
    parameterName: '',
  });

  const [openParameterSetup, setOpenParameterSetup] = useState({
    open: false,
    parameterId: 0,
    parameterName: '',
  });

  const { hasPermission } = useHasParameterEditPermission();

  const timezoneOffset = new Date().getTimezoneOffset();

  const spcData = useQueries({
    queries:
      parametersSPC?.parameters?.map((parameter) => {
        const parameterId = parameter.id;
        const queryKey = ['SPC', { parameterId, date, timezoneOffset }] as const;

        return {
          queryKey,
          queryFn: () =>
            getSPCData(parameterId, date, timezoneOffset).then((res) => ({
              ...res,
              id: parameterId,
            })),
          enabled: !!date && !showRealTime, // Currently false
          meta: {
            toastId: `SPC-${parameterId}`,
          },
        };
      }) ?? [],
    combine: (results) => {
      return results;
    },
  });

  return (
    <>
      {hasPermission ? (
        <>
          <SPCConfigDrawer
            onClose={() => setOpenSPCConfig((prev) => ({ ...prev, open: false }))}
            open={openSPCConfig.open}
            parameterId={openSPCConfig.parameterId}
            parameterName={openSPCConfig.parameterName}
          />
          <ParameterSetupDrawer
            onClose={() => setOpenParameterSetup((prev) => ({ ...prev, open: false }))}
            open={openParameterSetup.open}
            parameterId={openParameterSetup.parameterId}
            parameterName={openParameterSetup.parameterName}
          />
        </>
      ) : null}

      {/* the AI assistant's links scroll to and highlight `?section=parameters` / `spc` */}
      <div
        className={styles['parameter-list']}
        data-nav-section={showRealTime ? 'parameters' : 'spc'}
      >
        <div className={styles.header}>
          <TabProvider
            type="2"
            value={showRealTime ? '1' : '2'}
            onChange={(e) => handleShowRealTime(e === '1')}
            style={{ alignSelf: 'stretch' }}
          >
            <TabList className={styles['tab-list']}>
              <Tab value={'1'} className={clsx(styles.tab, showRealTime && styles.active)}>
                <TableChart />
                <h4>{t('common.parameter')}</h4>
                <InfoTooltip
                  title={t('common.parameter')}
                  content={
                    t('common.spc_info')
                    // 'Real-time and historical selected parameter values on the selected date'
                  }
                />
              </Tab>
              <Tab value="2" className={clsx(styles.tab, !showRealTime && styles.active)}>
                <SPCChart />
                <h4>SPC</h4>
                <InfoTooltip
                  title={'SPC'}
                  content={
                    t('common.spc_parameter_info')
                    // 'Control chart for the selected parameters on the selected date'
                  }
                />
              </Tab>
            </TabList>
            <TabPanel
              value={showRealTime ? '1' : '2'}
              className={clsx(styles.panel, showRealTime && styles['no-top-left-border'])}
            >
              <div className={styles.list}>
                <Loading isLoading={showRealTime ? isLoadingRealTime : isLoadingSPC} />
                {showRealTime
                  ? parametersRealTime?.parameters.map(({ id, name, unit }) => (
                      <ParameterAreaChart
                        key={id}
                        unit={unit}
                        parameterName={name}
                        onSettingClick={() =>
                          setOpenParameterSetup({
                            open: true,
                            parameterId: id,
                            parameterName: name,
                          })
                        }
                        parameterId={id}
                        date={date}
                        showEditButton={hasPermission}
                        refetchInterval={refetchInterval}
                      />
                    ))
                  : parametersSPC?.parameters.map(({ id, name, unit }) => {
                      const queryResult = spcData.find((data) => data?.data?.id === id);
                      const data = queryResult?.data;
                      const isLoading = queryResult?.isLoading;
                      return (
                        <SPCLineChart
                          key={id}
                          isLoading={isLoading}
                          data={
                            data ?? {
                              data: [],
                              markArea: [],
                              metrics: null,
                              yMax: null,
                              yMin: null,
                            }
                          }
                          unit={unit}
                          parameterName={name}
                          onSettingClick={() =>
                            setOpenSPCConfig({
                              open: true,
                              parameterId: id,
                              parameterName: name,
                            })
                          }
                          date={date}
                          showEditButton={hasPermission}
                          {...timestampHighlight}
                          onRestore={handleSPCRestore}
                        />
                      );
                    })}
              </div>
              {<AppPagination page={page} max={pageMax} onChange={handlePageChange} />}
            </TabPanel>
          </TabProvider>
          <div className={styles.search}>
            <Input
              value={search}
              onChange={(e) => {
                handleSearch(e.target.value);
              }}
              placeholder={t('common.search')}
              suffix={<SearchIcon />}
              wrapperProps={{
                style: { width: 306 },
              }}
              inputWrapperProps={{ style: { height: '40px' } }}
            />
            <InfoTooltip
              title={t('common.parameter_threshold')}
              content={
                t('common.parameter_threshold_info')
                // 'Parameter thresholds/limits set in the configuration to trigger abnormal state alarm'
              }
              width={250}
            />
          </div>
        </div>
      </div>
    </>
  );
};
