import AlarmMetric from './alarm-metric';
import AlarmOccurence from './alarm-occurence';
import { useAlarmReportView } from './alarm-report-view.hooks';
import styles from './alarm-report-view.module.scss';
import AlarmStatusChart from './alarm-status-chart';
import AlarmTable from './alarm-table';

type AlarmReportViewProps = {
  changeView: () => void;
  assets: string | null | undefined;
  mainRef: { width: number; height: number };
  startDate: string;
  endDate: string;
  period?: string;
};

export default function AlarmReportView({
  changeView,
  mainRef,
  assets,
  startDate,
  endDate,
  period,
}: AlarmReportViewProps) {
  const {
    alarmTableData,
    columnData,
    collapsibleRef,
    statusChartRef,
    abnormalChartRef,
    criticalWarningChartRef,
    maxPage,
    abnormalChartOption,
    alarmOccurenceOption,
    alarmStatusChartOption,
    totalAlarm,
    totalCriticalAlarm,
    totalWarningAlarm,
    totalAbnormalParameter,
    searchInput,
    isAlarmMetricsFetching,
    isAlarmTableFetching,
    isAbnormalChartFetching,
    isAlarmOccurenceFetching,
    isAlarmStatusChartFetching,
    columnOrder,
    searchParams,
    handleSearchInputChange,
    onPanelResizeHandler,
    resizerClickHandler,
    handleSortColumn,
    setSearchParams,
  } = useAlarmReportView({
    mainRef,
    assets,
    startDate,
    endDate,
    period,
  });

  return (
    <div className={styles['alarm-report-wrapper']}>
      <div className={styles['metrics']}>
        <AlarmMetric
          totalAlarm={totalAlarm ?? 0}
          totalAbnormalParameter={totalAbnormalParameter ?? 0}
          totalCriticalAlarm={totalCriticalAlarm ?? 0}
          totalWarningAlarm={totalWarningAlarm ?? 0}
          isFetching={isAlarmMetricsFetching}
        />
      </div>
      <div className={styles['content']}>
        <AlarmTable
          changeView={changeView}
          alarmTableData={alarmTableData}
          columnData={columnData}
          maxPage={maxPage}
          limit={16}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          searchInput={searchInput}
          handleSearchInputChange={handleSearchInputChange}
          isFetching={isAlarmTableFetching}
          isPreview={false}
          handleSortColumn={handleSortColumn}
          columnOrder={columnOrder}
        />
        <div className={styles['alarm-chart-panel']}>
          <AlarmOccurence
            isPreview={false}
            collapsibleRef={collapsibleRef}
            onPanelResizeHandler={onPanelResizeHandler}
            resizerClickHandler={resizerClickHandler}
            abnormalChartOption={abnormalChartOption}
            alarmOccurenceOption={alarmOccurenceOption}
            abnormalChartRef={abnormalChartRef}
            criticalWarningChartRef={criticalWarningChartRef}
            isFetching={isAbnormalChartFetching && isAlarmOccurenceFetching}
          />
          <AlarmStatusChart
            statusChartRef={statusChartRef}
            alarmStatusChartOption={alarmStatusChartOption}
            isFetching={isAlarmStatusChartFetching}
          />
        </div>
      </div>
    </div>
  );
}
