import { Loading } from '../../../../index';
import AlarmEventList from './alarm-event-list';
import { useAlarmEventView } from './alarm-event-view.hooks';
import styles from './alarm-event-view.module.scss';
import AlarmMetric from './alarm-metric';

type AlarmEventViewProps = {
  changeView: () => void;
  assets: string | null | undefined;
  startDate: string;
  endDate: string;
  period?: string;
};

export default function AlarmEventView({
  changeView,
  assets,
  startDate,
  endDate,
  period,
}: AlarmEventViewProps) {
  const {
    alarmEvents,
    totalAlarm,
    totalCriticalAlarm,
    totalWarningAlarm,
    totalAbnormalParameter,
    searchParams,
    searchInput,
    isAlarmMetricsFetching,
    isEventChartFetching,
    // page,
    // handlePageChange,
    setSearchParams,
    setFilter,
    handleSearchInputChange,
  } = useAlarmEventView({ assets, startDate, endDate, period });

  return (
    <div className={styles['alarm-event-wrapper']}>
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
        <div className={styles['content-wrapper']}>
          <Loading isLoading={isEventChartFetching} />
          <AlarmEventList
            isPreview={false}
            startDate={startDate}
            endDate={endDate}
            changeView={changeView}
            machineAlarmData={alarmEvents ? alarmEvents.data : null}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            handleSearchInputChange={handleSearchInputChange}
            searchInput={searchInput}
            count={alarmEvents?.count ?? 0}
            period={period}
            //TODO: remove onPageChange props since it's not used
            // onPageChange={handlePageChange}
            setFilter={setFilter}
            //TODO: remove page props since it's not used
            // page={page}
          />
        </div>
      </div>
    </div>
  );
}
