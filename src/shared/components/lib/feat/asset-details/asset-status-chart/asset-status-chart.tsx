import { ConditionLamp, ProductionSubmit, StatusChart } from '@digital-twin/icons';
import { formatDurationInhm, formatStringToObjectDate, t } from '@digital-twin/utils';
import clsx from 'clsx';
import { CustomSeriesRenderItem, EChartsOption } from 'echarts';
import { format, graphic } from 'echarts/core';
import ReactECharts from 'echarts-for-react';
import { useContext } from 'react';
import {
  createSearchParams,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { COLOR } from '../../../color';
import { Badge, InfoTooltip, TooltipContent } from '../../../data';
import { extractFilterSearchParams } from '../../../layout';
import {
  CONDITION_COLOR,
  CONDITION_ICON,
  CONDITION_NAME,
  ConditionEnum,
  PRODUCTION_STATE_COLOR,
  PRODUCTION_STATE_ICON,
  ProductionStateEnum,
  STATUS_COLOR,
  STATUS_ICON,
  STATUS_NAME,
  StatusEnum,
} from '../../../mapping';
import { Loading } from '../../../others';
import { ThemeContext } from '../../admin';
import styles from './asset-status-chart.module.scss';

export interface AssetStatusChartDataPoint<T> {
  start: string;
  end: string;
  value: T;
  id?: number | null;
}

interface AssetStatusChartProps {
  status: AssetStatusChartDataPoint<StatusEnum>[];
  conditions: AssetStatusChartDataPoint<ConditionEnum>[];
  productions?: AssetStatusChartDataPoint<ProductionStateEnum>[];
  from: string;
  to: string;
  width?: string | number;
  isLoading: boolean;
  withLegend?: boolean;
  excludedStatus?: StatusEnum[];
  chartContainerClassName?: string;
  chartYAxisLabelContainerClassName?: string;
}

export const computeStatusDuration = (
  status: AssetStatusChartDataPoint<StatusEnum>[]
) =>
  status.reduce(
    (cumulated, statusPoint) => ({
      ...cumulated,
      [statusPoint.value]:
        cumulated[statusPoint.value] +
        (+new Date(statusPoint.end) - +new Date(statusPoint.start)) / 1000,
    }),
    {
      [StatusEnum.enum.RUNNING]: 0,
      [StatusEnum.enum.IDLE]: 0,
      [StatusEnum.enum['UNPLANNED DOWN']]: 0,
      [StatusEnum.enum.OFFLINE]: 0,
      [StatusEnum.enum['PLANNED DOWN']]: 0,
      [StatusEnum.enum.DOWN]: 0,
    }
  );

const computeTotalDuration = (
  status: AssetStatusChartDataPoint<StatusEnum>[],
  conditions: AssetStatusChartDataPoint<ConditionEnum>[],
  productions?: AssetStatusChartDataPoint<ProductionStateEnum>[]
) => {
  const statusTotalDuration = computeStatusDuration(status);

  const conditionTotalDuration = conditions.reduce(
    (cumulated, conditionPoint) => ({
      ...cumulated,
      [conditionPoint.value]:
        cumulated[conditionPoint.value] +
        (+new Date(conditionPoint.end) - +new Date(conditionPoint.start)) /
          1000,
    }),
    {
      [ConditionEnum.enum.NORMAL]: 0,
      [ConditionEnum.enum.WARNING]: 0,
      [ConditionEnum.enum.CRITICAL]: 0,
      [ConditionEnum.enum.OFFLINE]: 0,
    }
  );

  const productionTotalDuration = productions?.reduce(
    (cumulated, statusPoint) => ({
      ...cumulated,
      [statusPoint.value]:
        cumulated[statusPoint.value] +
        (+new Date(statusPoint.end) - +new Date(statusPoint.start)) / 1000,
    }),
    {
      [ProductionStateEnum.enum.PRODUCTION]: 0,
      [ProductionStateEnum.enum.PAUSED]: 0,
      [ProductionStateEnum.enum['NO PRODUCTION']]: 0,
    }
  );

  return {
    statusTotalDuration,
    conditionTotalDuration,
    productionTotalDuration,
  };
};

const renderChartDataPointSpan: CustomSeriesRenderItem = (params, api) => {
  const categoryIndex = api.value(0);
  const start = api.coord([api.value(1), categoryIndex]);
  const end = api.coord([api.value(2), categoryIndex]);
  const height = (api.size?.([0, 1]) as number[])[1] * 0.9;
  const rectShape = graphic.clipRectByRect(
    {
      x: start[0],
      y: start[1] - height / 2,
      width: end[0] - start[0],
      height: height,
    },
    {
      // E-Chart typedef is broken. Read more at https://github.com/apache/echarts/issues/18200
      /* eslint-disable @typescript-eslint/no-explicit-any */
      x: (params.coordSys as any).x,
      y: (params.coordSys as any).y,
      width: (params.coordSys as any).width,
      height: (params.coordSys as any).height,
      /* eslint-disable @typescript-eslint/no-explicit-any */
    }
  );
  return (
    rectShape && {
      type: 'rect',
      transition: ['shape'],
      shape: rectShape,
      style: api.style(),
    }
  );
};

interface EChartCustomDataPoint {
  name: string;
  value: [number, number, number, number, number | null | undefined];
  itemStyle: { normal: { color: string } };
}

type TPrepareDataParams = {
  status: AssetStatusChartDataPoint<StatusEnum>[];
  conditions: AssetStatusChartDataPoint<ConditionEnum>[];
  productions?: AssetStatusChartDataPoint<ProductionStateEnum>[];
  statusColors: Partial<typeof STATUS_COLOR>;
  conditionColors: typeof CONDITION_COLOR;
  productionColors?: typeof PRODUCTION_STATE_COLOR;
};
const prepareData = ({
  status,
  conditions,
  conditionColors,
  productionColors,
  statusColors,
  productions,
}: TPrepareDataParams) => {
  const data: EChartCustomDataPoint[] = [];
  status.forEach((statusPoint) => {
    const startMs = +new Date(statusPoint.start);
    const endMs = +new Date(statusPoint.end);
    data.push({
      name: statusPoint.value,
      value: [
        1 + Number(!!productions),
        startMs,
        endMs,
        endMs - startMs,
        statusPoint.id,
      ],
      itemStyle: {
        normal: {
          color: statusColors[statusPoint.value] ?? '',
        },
      },
    });
  });

  conditions.forEach((conditionPoint) => {
    const startMs = +new Date(conditionPoint.start);
    const endMs = +new Date(conditionPoint.end);
    data.push({
      name: conditionPoint.value,
      value: [
        Number(!!productions),
        startMs,
        endMs,
        endMs - startMs,
        conditionPoint.id,
      ],
      itemStyle: {
        normal: {
          color: conditionColors[conditionPoint.value],
        },
      },
    });
  });

  productions?.forEach((productionPoint) => {
    const startMs = +new Date(productionPoint.start);
    const endMs = +new Date(productionPoint.end);
    data.push({
      name: productionPoint.value,
      value: [0, startMs, endMs, endMs - startMs, productionPoint.id],
      itemStyle: {
        normal: {
          color: productionColors?.[productionPoint.value] ?? 'black',
        },
      },
    });
  });

  return data;
};

export const AssetStatusChart = ({
  status,
  conditions,
  productions,
  from,
  to,
  width,
  isLoading,
  withLegend,
  excludedStatus,
  chartContainerClassName,
  chartYAxisLabelContainerClassName,
}: AssetStatusChartProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filterParams = extractFilterSearchParams(searchParams);
  const {
    statusTotalDuration,
    conditionTotalDuration,
    productionTotalDuration,
  } = computeTotalDuration(status, conditions, productions);

  const {
    colors: {
      conditionCriticalPrimary,
      conditionWarningPrimary,
      conditionNormalPrimary,
      statusPlanned_downPrimary,
      statusOfflinePrimary,
      statusUnplanned_downPrimary,
      statusIdlePrimary,
      statusRunningPrimary,
      accentInfoPrimary,
      conditionCriticalSecondary,
      neutralTextTitleHeading,
    },
  } = useContext(ThemeContext);
  const statusColors = {
    [StatusEnum.enum.RUNNING]: statusRunningPrimary,
    [StatusEnum.enum.IDLE]: statusIdlePrimary,
    [StatusEnum.enum['UNPLANNED DOWN']]: statusUnplanned_downPrimary,
    [StatusEnum.enum.OFFLINE]: statusOfflinePrimary,
    [StatusEnum.enum['PLANNED DOWN']]: statusPlanned_downPrimary,
    [StatusEnum.enum.DOWN]: statusUnplanned_downPrimary,
  };
  const conditionColors = {
    [ConditionEnum.enum.NORMAL]: conditionNormalPrimary,
    [ConditionEnum.enum.WARNING]: conditionWarningPrimary,
    [ConditionEnum.enum.CRITICAL]: conditionCriticalPrimary,
    [ConditionEnum.enum.OFFLINE]: statusOfflinePrimary,
  };
  const productionColors = {
    [ProductionStateEnum.enum.PRODUCTION]: accentInfoPrimary,
    [ProductionStateEnum.enum.PAUSED]: conditionCriticalSecondary,
    [ProductionStateEnum.enum['NO PRODUCTION']]: statusOfflinePrimary,
  };

  const maxXAxis = +formatStringToObjectDate(to);
  const option: EChartsOption = {
    xAxis: {
      min: +formatStringToObjectDate(from),
      max: maxXAxis,
      type: 'time',
      axisTick: {
        show: true,
        inside: true,
        lineStyle: { color: neutralTextTitleHeading },
      },
      axisLabel: {
        showMaxLabel: true,
        formatter: function (value, _index) {
          return value === maxXAxis ? '24:00' : '{HH}:{mm}';
        },
      },
      axisLine: {
        show: true,
        lineStyle: { color: neutralTextTitleHeading },
      },
      offset: 10,
      splitNumber: 10,
      minorTick: {
        show: true,
        splitNumber: 2,
      },
    },
    yAxis: {
      data: [
        ...(productions ? [t('common.production')] : []),
        t('common.condition'),
        t('common.status'),
      ],
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        align: 'left',
        fontSize: 16,
        margin: 30,
        padding: [0, 0, 0, -65],
      },
    },
    textStyle: {
      color: neutralTextTitleHeading,
      fontFamily: 'Roboto',
    },
    tooltip: {
      formatter: function (params: any) {
        const bgColor =
          params.value[0] === Number(!!productions)
            ? CONDITION_COLOR[params.name as keyof typeof CONDITION_COLOR]
            : params.value[0] === 1 + Number(!!productions)
            ? STATUS_COLOR[params.name as keyof typeof STATUS_COLOR]
            : PRODUCTION_STATE_COLOR[
                params.name as keyof typeof PRODUCTION_STATE_COLOR
              ];
          
        const paramName = String(params.name);
        const newParamName = paramName === StatusEnum.enum.OFFLINE ? 'OFF_OFFLINE' : paramName;
        const labelKey = newParamName.replaceAll(' ', '_').toLowerCase();
        return `<div style="background:${bgColor};padding:4px 8px;color:${
          COLOR.neutralTextBodyLight
        };border-radius: 2px">${t(
          `common.${labelKey}`
        ).toUpperCase()} | ${format.formatTime(
          'hh:mm',
          params.value[1]
        )} - ${format.formatTime('hh:mm', params.value[2])}</div>`;
      },
      padding: 0,
      borderWidth: 0,
    },
    series: [
      {
        type: 'custom',
        renderItem: renderChartDataPointSpan,
        encode: {
          x: [1, 2],
          y: 0,
        },
        data: prepareData({
          status,
          conditions,
          productions,
          statusColors,
          conditionColors,
          productionColors,
        }),
      },
    ],
    grid: {
      top: 0,
      left: 0,
      bottom: 10,
      right: 15,
      containLabel: true,
    },
  };

  return (
    <div className={styles['asset-status-chart']} style={{ width }}>
      <Loading isLoading={isLoading} />
      <div className={clsx(styles.status, chartContainerClassName)}>
        <div
          className={clsx(
            styles['y-axis-label'],
            chartYAxisLabelContainerClassName
          )}
          style={
            productions
              ? {
                  paddingTop: 5,
                  gap: 16,
                }
              : undefined
          }
        >
          <StatusChart />
          <ConditionLamp />
          {productions ? <ProductionSubmit /> : null}
        </div>
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          onEvents={
            productions
              ? {
                  click: (params: {
                    data: { value: [number, number, number, number, number] };
                  }) => {
                    if (params?.data?.value[4])
                      navigate({
                        pathname: '/production-tracker',
                        search: `?${createSearchParams({
                          ...filterParams,
                          selectedInputId: params?.data?.value[4]?.toString(),
                        })}`,
                      });
                  },
                }
              : undefined
          }
        />
      </div>
      <div
        className={styles.summary}
        style={{
          gap: !productions ? 28 : undefined,
        }}
      >
        <div
          className={styles['list']}
          style={{
            flexDirection: !productions ? 'row' : undefined,
          }}
        >
          {withLegend ? (
            <TooltipContent
              content={'Status Legend'}
              position={'top'}
              top={75}
              size={'large'}
            />
          ) : null}
          <div className={styles.icon}>
            <StatusChart />
            <span>{`${t('common.status')}:`}</span>
          </div>
          <div className={styles['label-container']}>
            {StatusEnum.options
              .filter((status) => !excludedStatus?.includes(status))
              .map((status) => (
                <Badge
                  key={status}
                  leftIcon={STATUS_ICON[status]}
                  className={styles['status-badge']}
                  style={{
                    background: STATUS_COLOR[status],
                  }}
                >
                  {formatDurationInhm(statusTotalDuration[status])}
                </Badge>
              ))}
          </div>
          <InfoTooltip
              title={t('common.status')}
              height={'fit-content'}
              width={'fit-content'}
              content={
                <>
                  {StatusEnum.options
                    .filter((status) => !excludedStatus?.includes(status))
                    .map((status) => (
                      <Badge
                        key={status}
                        leftIcon={STATUS_ICON[status]}
                        className={styles['status-badge']}
                        style={{
                          background: STATUS_COLOR[status],
                          width: 'fit-content',
                        }}
                      >
                        {STATUS_NAME[status]}
                      </Badge>
                    ))}
                </>
              }
              contentStyle={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            />
        </div>
        <div className={styles.vr} />
        <div
          className={styles['list']}
          style={{
            flexDirection: !productions ? 'row' : undefined,
          }}
        >
          {withLegend ? (
            <TooltipContent
              content={'Condition Legend'}
              position={'top'}
              top={75}
              size={'large'}
            />
          ) : null}
          <div className={styles.icon}>
            <ConditionLamp />
            <span>{`${t('common.condition')}:`}</span>
            
          </div>
          <div className={styles['label-container']}>
            {ConditionEnum.options.map((condition) => (
              <Badge
                key={condition}
                leftIcon={CONDITION_ICON[condition]}
                className={styles['condition-badge']}
                variant={'pill'}
                style={{
                  background: CONDITION_COLOR[condition],
                }}
              >
                {formatDurationInhm(conditionTotalDuration[condition])}
              </Badge>
            ))}
          </div>
          <InfoTooltip
              title={t('common.condition')}
              height={'fit-content'}
              width={'fit-content'}
              content={
                <>
                  {ConditionEnum.options.map((condition) => (
                    <Badge
                      key={condition}
                      leftIcon={CONDITION_ICON[condition]}
                      className={styles['condition-badge']}
                      variant={'pill'}
                      style={{
                        background: CONDITION_COLOR[condition],
                        width: 'fit-content',
                      }}
                    >
                      {CONDITION_NAME[condition]}
                    </Badge>
                  ))}
                </>
              }
              contentStyle={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            />
        </div>
        {productions ? (
          <>
            <div className={styles.vr} />
            <div className={styles['list']}>
              {withLegend ? (
                <TooltipContent
                  content={'Production Legend'}
                  position={'top'}
                  top={75}
                  size={'large'}
                />
              ) : null}
              <div className={styles.icon}>
                <ProductionSubmit />
                <span>{t('common.production')}:</span>
              </div>
              <div className={styles['label-container']}>
                {ProductionStateEnum.options.map((production) => (
                  <Badge
                    key={production}
                    leftIcon={PRODUCTION_STATE_ICON[production]}
                    className={styles['status-badge']}
                    style={{
                      background: PRODUCTION_STATE_COLOR[production],
                    }}
                  >
                    {formatDurationInhm(
                      productionTotalDuration?.[production] ?? 0
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
