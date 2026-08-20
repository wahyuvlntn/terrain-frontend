import {
  Filter,
  FilterDrawer,
  FilterDrawerShortcuts,
  FilterDrawerToggleButton,
  FilterShortcut,
  FilterShortcutContainer,
  FilterTree,
  InputDuration,
  LastUpdated,
  LocationShortcut,
  ModelShortcut,
  ModelTree,
} from '@digital-twin/components';

import { TypeShortcut, TypeTree } from '../../components';
import {
  EarlyWarningAndDiagnosticTrend,
  EarlyWarningStatus,
  EarlyWarningType,
  ErrorCodeOccurrence,
  IssuePatternDetail,
  IssuePatternList,
  Legend,
  ParameterWarningOccurrence,
} from './components';
import { useEarlyWarningDashboard } from './early-warning-dashboard.hook';
import styles from './early-warning-dashboard.module.scss';

export const EarlyWarningDashboard = () => {
  const {
    filter: { handleFilterDataChange, ...filter },
    earlyWarningType,
    earlyWarningStatus,
    errorCodeOccurrence,
    isErrorCodeOccurenceLoading,
    parameterWarningOccurrence,
    isParameterWarningOccurenceLoading,
    earlyWarningAndDiagnosticTrend,
    isEarlyWarningAndDiagnosticTrendLoading,
    issuePatternList,
    isIssuePatternListLoading,
    handleIssuePatternClick,
    handleClose,
    issuePatternDetail,
    isIssuePatternDetailLoading,
    open,
    page,
    setPage,
    handleDateChange,
    endDt,
    startDt,
    issuePatternCharts,
    issuePatternChart,
    isIssuePatternChartLoading,
    dateRange,
    isEarlyWarningStatusLoading,
    isEarlyWarningTypeLoading,
    handleIssuePatternDetailDateChange,
  } = useEarlyWarningDashboard();

  return (
    <>
      <IssuePatternDetail
        open={open}
        isLoading={isIssuePatternDetailLoading || isIssuePatternChartLoading}
        onClose={handleClose}
        data={issuePatternDetail}
        chartData={issuePatternChart}
        start={dateRange.startDate}
        end={dateRange.endDate}
        period={dateRange.period}
        // type={isDifferentMonth ? 'year' : isDifferentWeek ? 'month' : 'week'}
        onDateChange={handleIssuePatternDetailDateChange}
      />
      <div className={styles.EarlyWarningDashboard}>
        <Filter {...filter} onDataChange={handleFilterDataChange}>
          <div className={styles.EarlyWarningDashboard__Header}>
            <div className={'ribbon-item'}>
              <Legend />
              <FilterShortcutContainer>
                <FilterDrawerToggleButton />
                <FilterShortcut>
                  <LocationShortcut />
                  <ModelShortcut />
                  <TypeShortcut />
                </FilterShortcut>
              </FilterShortcutContainer>
              <FilterDrawer>
                <FilterDrawerShortcuts>
                  <LocationShortcut />
                  <ModelShortcut />
                  <TypeShortcut />
                </FilterDrawerShortcuts>
                <FilterTree>
                  <ModelTree />
                  <TypeTree />
                </FilterTree>
              </FilterDrawer>
            </div>
            <div className="ribbon-item">
              <InputDuration onChange={handleDateChange} endDate={endDt} startDate={startDt} />
              <LastUpdated />
            </div>
          </div>
        </Filter>
        <div className={styles.EarlyWarningDashboard__Body}>
          <div className={styles.EarlyWarningDashboard__ChartRow}>
            <EarlyWarningType
              data={earlyWarningType ?? []}
              className={styles.CommonChart}
              isLoading={isEarlyWarningTypeLoading}
            />
            <EarlyWarningAndDiagnosticTrend
              isLoading={isEarlyWarningAndDiagnosticTrendLoading}
              data={earlyWarningAndDiagnosticTrend ?? []}
              className={styles.CenterChart}
            />
            <ParameterWarningOccurrence
              isLoading={isParameterWarningOccurenceLoading}
              data={parameterWarningOccurrence ?? []}
              className={styles.CommonChart}
            />
          </div>
          <div className={styles.EarlyWarningDashboard__ChartRow}>
            <EarlyWarningStatus
              data={earlyWarningStatus ?? []}
              className={styles.CommonChart}
              isLoading={isEarlyWarningStatusLoading}
            />
            <IssuePatternList
              isLoading={isIssuePatternListLoading || issuePatternCharts.some((c) => c.isFetching)}
              data={
                issuePatternList?.data?.map((item, index) => {
                  return { ...item, data: issuePatternCharts[index]?.data ?? [] };
                }) ?? []
              }
              className={styles.CenterChart}
              onClick={handleIssuePatternClick}
              page={page}
              onChangePage={setPage}
              totalPage={Math.ceil((issuePatternList?.count ?? 0) / 6)}
            />
            <ErrorCodeOccurrence
              data={errorCodeOccurrence ?? []}
              className={styles.CommonChart}
              isLoading={isErrorCodeOccurenceLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
};
