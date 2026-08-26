import {
  COLOR,
  InputDuration,
  Loading,
  ParameterAreaChart,
  TRefetchIntervalParameterArea,
} from '@digital-twin/components';
import {
  ChevronLeft,
  ChevronLeftFill,
  ChevronRightFill,
  CriticalAlertFill,
  WarningFill,
} from '@digital-twin/icons';
import { formatDateHTMLInput } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPCLineChart, TSpcData } from '../../../components';
import { getSPCData } from '../../asset-overview/api';
import { getAssetParameters } from '../../early-warning-and-diagnostics/api/early-warning-and-diagnostics';
import { getMaintenanceAlarmTimestamps, getParameterMessage } from '../api/maintenance-order';
import styles from './degradation-indicator.module.scss';

export const DegradationIndicator = ({
  hideTitle,
  asset_id,
  initialDate,
  maintenance_id,
}: {
  hideTitle?: boolean;
  asset_id: number;
  initialDate: string;
  maintenance_id?: number;
}) => {
  const [selectedParameter, setSelectedParameter] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  const { data: parameters = [], isFetching: isFetchingParameters } = useQuery({
    queryKey: ['getAssetParameters', asset_id] as const,
    queryFn: () => getAssetParameters(asset_id),
    enabled: !!asset_id,
    meta: {
      toastId: 'getAssetParameters',
    },
  });

  const timezoneOffset = new Date().getTimezoneOffset();

  const { data: spcData, isFetching: isFetchingSpcData } = useQuery({
    queryKey: ['getSPCData', selectedParameter, selectedDate, timezoneOffset] as const,
    queryFn: () => getSPCData(selectedParameter || 0, selectedDate, timezoneOffset),
    enabled: !!selectedParameter && !!selectedDate,
    meta: {
      toastId: 'getSPCData',
    },
  });

  const { data: parameterMessages = [], isFetching: isFetchingParameterMessages } = useQuery({
    queryKey: ['getParameterMessage', maintenance_id] as const,
    queryFn: () => getParameterMessage({ maintenance_id: maintenance_id || 0 }),
    enabled: !!maintenance_id,
    meta: {
      toastId: 'getParameterMessage',
    },
  });

  const { data: alarmTimestamps, isFetching: isFetchingAlarmTimestamps } = useQuery({
    queryKey: ['getMaintenanceAlarmTimestamps', maintenance_id] as const,
    queryFn: () => getMaintenanceAlarmTimestamps({ maintenance_id: maintenance_id || 0 }),
    enabled: !!maintenance_id,
    meta: {
      toastId: 'getMaintenanceAlarmTimestamps',
    },
  });

  useEffect(() => {
    if (parameters.length > 0) {
      setSelectedParameter(parameters[0].id);
    }
  }, [JSON.stringify(parameters), maintenance_id]);

  const refetchInterval: TRefetchIntervalParameterArea = (query) => {
    if (query.queryKey[1].date === formatDateHTMLInput(new Date(), 'datetime-local'))
      return 5 * 1000;
    return false;
  };

  const parametersRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = parametersRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = parametersRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState, parameters]);

  const scrollParameters = (direction: 'left' | 'right') => {
    if (parametersRef.current) {
      const scrollAmount = 150;
      parametersRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const selectedUnit = useMemo(() => {
    return parameters.find((param) => param.id === selectedParameter)?.unit;
  }, [selectedParameter, JSON.stringify(parameters)]);

  useEffect(() => {
    if (alarmTimestamps?.max_timestamp) {
      setSelectedDate(format(new Date(alarmTimestamps.max_timestamp), 'yyyy-MM-dd'));
    } else {
      setSelectedDate(initialDate);
    }
  }, [alarmTimestamps?.max_timestamp, initialDate]);

  console.log(selectedDate);

  return (
    selectedDate && (
      <div className={styles['degradation-indicator']}>
        <Loading
          isLoading={
            isFetchingParameters ||
            isFetchingSpcData ||
            isFetchingParameterMessages ||
            isFetchingAlarmTimestamps
          }
        />
        {!hideTitle && <div>Degradation Indicator:</div>}
        <div className={styles['container']} style={{ padding: hideTitle ? 0 : '' }}>
          <div className={styles['title']}>Detected Abnormalities:</div>
          {parameterMessages.map((item, index) => (
            <div key={index} className={styles['abnormality-section']}>
              <div className={styles['abnormality']}>
                <div className={styles['no']}>{index + 1}.</div>
                <div>{item.message || 'No message available'}</div>
              </div>
              {item.alarms.map((alarm, alarmIndex) => (
                <RenderAlarm
                  key={alarmIndex}
                  status={alarm.alarm_status as 'CRITICAL' | 'WARNING'}
                  code={alarm.alarm_code}
                  label={alarm.alarm_name}
                />
              ))}
            </div>
          ))}
          <div className={styles['parameters-section']}>
            <div className={styles['left-section']}>
              <div>Monitored Parameters:</div>
              <ChevronLeftFill
                width={24}
                height={24}
                style={{
                  flexShrink: 0,
                  cursor: canScrollLeft ? 'pointer' : 'default',
                  opacity: canScrollLeft ? 1 : 0.4,
                }}
                onClick={() => scrollParameters('left')}
              />
              <div ref={parametersRef} className={styles['parameters']}>
                {parameters.map((parameter) => (
                  <div
                    key={parameter.id}
                    className={styles['parameter']}
                    onClick={() => setSelectedParameter(parameter.id)}
                    style={{
                      background: selectedParameter === parameter.id ? COLOR.backgroundHighest : '',
                      border:
                        selectedParameter === parameter.id
                          ? `1px solid ${COLOR.brandSurfaceDefaultPrimary}`
                          : '',
                    }}
                  >
                    {parameter.name}
                  </div>
                ))}
              </div>
              <ChevronRightFill
                width={24}
                height={24}
                style={{
                  flexShrink: 0,
                  cursor: canScrollRight ? 'pointer' : 'default',
                  opacity: canScrollRight ? 1 : 0.4,
                }}
                onClick={() => scrollParameters('right')}
              />
            </div>
            {selectedDate && (
              <InputDuration
                type="date"
                onChange={(date) => {
                  setSelectedDate(format(date, 'yyyy-MM-dd'));
                }}
                triggerButtonStyle={{ width: 160 }}
                startDate={new Date(selectedDate)}
                endDate={new Date(selectedDate)}
              />
            )}
          </div>
          {spcData && (
            <>
              <div style={{ fontSize: 18, fontWeight: 600 }}>SPC</div>
              <SPCLineChart
                unit={selectedUnit || ''}
                parameterName={''}
                date={selectedDate}
                data={spcData}
                showEditButton
                wrapperStyle={{
                  padding: 0,
                  height: 170,
                  width: '99%',
                  overflow: 'hidden',
                }}
                showHeader={false}
                dataWrapperStyle={{ gap: 65 }}
                historicalWrapperStyle={{ width: 'unset', flex: '1 0 0' }}
                chartWidth="99%"
                highlightAbnormalities={true}
                highlightTimestamps={alarmTimestamps?.timestamps}
              />
            </>
          )}
          <div
            style={{
              alignSelf: 'stretch',
              height: 4,
              background: COLOR.backgroundHigh,
            }}
          ></div>
          {selectedParameter && (
            <ParameterAreaChart
              unit={selectedUnit || ''}
              parameterName={'Actual Data'}
              parameterId={selectedParameter}
              date={selectedDate}
              wrapperStyle={{
                padding: 0,
                height: 190,
                width: '99%',
                overflow: 'hidden',
              }}
              refetchInterval={refetchInterval}
              chartWidth="99%"
              highlightAbnormalities={true}
              highlightTimestamps={alarmTimestamps?.timestamps}
            />
          )}
        </div>
      </div>
    )
  );
};

const RenderAlarm = ({
  status,
  label,
  code,
}: {
  status: 'WARNING' | 'CRITICAL';
  label: string;
  code: string;
}) => {
  return (
    <div className={styles['render-alarm']}>
      <div>{status === 'WARNING' ? <WarningFill /> : <CriticalAlertFill />}</div>
      <div>{code}</div>
      <div
        style={{
          width: 12,
          height: 2,
          background: COLOR.neutralTextTitleHeading,
          marginLeft: 2,
          marginRight: 2,
        }}
      ></div>
      <div>{label}</div>
    </div>
  );
};
