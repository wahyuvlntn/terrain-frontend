/* eslint-disable simple-import-sort/imports */
import {
  Button,
  COLOR,
  Container,
  InfoTooltip,
  Loading,
  Metric,
  ThemeContext,
  useExtractFilter,
} from '@digital-twin/components';
import { BarChartH, ChevronRight } from '@digital-twin/icons';
import { formatDateTime, t } from '@digital-twin/utils';
import clsx from 'clsx';
import { TimeAxisLabelFormatterOption } from 'echarts/types/src/coord/axisCommonTypes';
import EChartsReact from 'echarts-for-react';
import { useContext, useRef, useState } from 'react';
import { InlineMath } from 'react-katex';
import {
  ImperativePanelHandle,
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { useSearchParams } from 'react-router-dom';
import {
  useKPILastUpdateData,
  useMTBFAverageData,
  useMTBFChartData,
  useMTTRAverageData,
  useMTTRChartData,
} from '../api/maintenance-performance';
import { GeneralFilterType, MaintenancePerformanceFilterType } from '../type';
import styles from './kpi.module.scss';
import KPIDetails from './kpi-details';

// Dummy data for KPI charts
const DUMMY_MTBF_CHART = {
  category: ['Equipment A', 'Equipment B', 'Equipment C', 'Equipment D', 'Equipment E'],
  values: [245, 198, 167, 142, 125],
  unit: 'hours',
};

const DUMMY_MTTR_CHART = {
  category: ['Equipment A', 'Equipment B', 'Equipment C', 'Equipment D', 'Equipment E'],
  values: [8.5, 12.3, 15.7, 18.2, 22.4],
  unit: 'hours',
};

const DUMMY_MTBF_AVERAGE = [
  {
    mtbf: '185.4',
    unit: 'hours',
  },
];

const DUMMY_MTTR_AVERAGE = [
  {
    mttr: '15.4',
    unit: 'hours',
  },
];

const DUMMY_LAST_UPDATED = new Date().toISOString();

type TGetMTBFChartOptsParams = {
  unit?: string;
  neutralTextTitleHeading: string;
  category?: string[];
  values?: number[];
  barChartColor?: string;
};
const getMTBFChartOpts = ({
  category,
  values,
  unit,
  neutralTextTitleHeading,
  barChartColor,
}: TGetMTBFChartOptsParams) => {
  const mtbfChartOptions: echarts.EChartsOption = {
    grid: {
      bottom: '15%',
      left: '15%',
      top: '5%',
      right: '10%',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      confine: true,
      backgroundColor: COLOR.backgroundDefault,
      borderColor: COLOR.borderDefault,
      textStyle: {
        color: COLOR.neutralTextTitleHeading,
      },
    },
    yAxis: {
      name: `MTBF (${unit || '-'})`,
      nameTextStyle: {
        color: neutralTextTitleHeading,
        fontSize: 14,
      },

      min: '0',
      max: (v) => v.max + 10,
      axisLine: {
        show: false,
      },
      scale: true,
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)',
          type: 'dashed',
          width: 1,
        },
      },
      axisLabel: {
        color: neutralTextTitleHeading,
        show: true,
        formatter: function (value: TimeAxisLabelFormatterOption) {
          const suffixes = ['', 'k', 'm', 'b', 't'];
          const val = value as unknown as number;

          if (val < 1000) {
            return value.toString();
          }

          const exp = Math.floor(Math.log(val) / Math.log(1000));
          const formattedValue = (val / Math.pow(1000, exp)).toFixed(1);

          return formattedValue.replace(/\.0$/, '') + suffixes[exp];
        },
      },
      nameLocation: 'middle',
      nameGap: 40,
      nameRotate: 90,
    },
    xAxis: {
      type: 'category',
      data: category || [],
      inverse: false,
      animationDuration: 300,
      animationDurationUpdate: 300,
      axisLine: { show: false },
      axisTick: {
        show: true,
        alignWithLabel: true,
        lineStyle: {
          color: neutralTextTitleHeading,
        },
      },
      axisLabel: {
        color: neutralTextTitleHeading,
        interval: 0,
        hideOverlap: true,
        overflow: 'truncate',
        width: 50,
      },
    },
    series: [
      {
        name: 'MTBF',
        type: 'bar',
        data: values || [],
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: barChartColor,
        },
      },
    ],
  };
  return mtbfChartOptions;
};

type TGetMTTRChartOptsParams = {
  unit?: string;
  neutralTextTitleHeading: string;
  category?: string[];
  values?: number[];
  barChartColor: string;
};

const getMTTRChartOpts = ({
  unit,
  neutralTextTitleHeading,
  category,
  values,
  barChartColor,
}: TGetMTTRChartOptsParams) => {
  const mttrBarChartOptions: echarts.EChartsOption = {
    grid: {
      bottom: '15%',
      left: '20%',
      top: '5%',
      right: '5%',
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      confine: true,
      backgroundColor: COLOR.backgroundDefault,
      borderColor: COLOR.borderDefault,
      textStyle: {
        color: COLOR.neutralTextTitleHeading,
      },
    },
    yAxis: {
      name: `MTTR (${unit || '-'})`,
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.3)',
          type: 'dashed',
          width: 1,
        },
      },
      axisLabel: {
        color: neutralTextTitleHeading,
        show: true,
        formatter: function (value: TimeAxisLabelFormatterOption) {
          const suffixes = ['', 'k', 'm', 'b', 't'];
          const val = value as unknown as number;

          if (val < 1000) {
            return value.toString();
          }

          const exp = Math.floor(Math.log(val) / Math.log(1000));
          const formattedValue = (val / Math.pow(1000, exp)).toFixed(1);

          return formattedValue.replace(/\.0$/, '') + suffixes[exp];
        },
      },
      nameLocation: 'middle',
      nameGap: 40,
      nameRotate: 90,
      nameTextStyle: {
        color: neutralTextTitleHeading,
        fontSize: 14,
      },
      min: '0',
      max: (v) => v.max + 10,
      axisLine: {
        show: false,
      },
      scale: true,
    },
    xAxis: {
      type: 'category',
      data: category || [],
      animationDuration: 300,
      animationDurationUpdate: 300,
      axisLine: { show: false },
      axisTick: {
        show: true,
        alignWithLabel: true,
        lineStyle: {
          color: neutralTextTitleHeading,
        },
      },
      axisLabel: {
        color: neutralTextTitleHeading,
        interval: 0,
        hideOverlap: true,
        overflow: 'truncate',
        width: 50,
      },
    },
    series: [
      {
        name: 'MTTR',
        type: 'bar',
        data: values || [],
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: barChartColor,
        },
      },
    ],
  };
  return mttrBarChartOptions;
};

interface KPIPanelProps {
  isLegend?: boolean;
}

const KPIPanel = ({ isLegend = false }: KPIPanelProps) => {
  const {
    data,
    filter: { start, end },
    setFilter,
  } = useExtractFilter<GeneralFilterType, MaintenancePerformanceFilterType>();

  const { data: mtbfChart, isFetching: mtbfChartLoading } = useMTBFChartData({
    assetIds: data.assetIds,
    end: end,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    start: start,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
  });

  const { data: mttrChart, isFetching: mttrChartLoading } = useMTTRChartData({
    assetIds: data.assetIds,
    end: end,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    start: start,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
  });

  const { data: mtbfAverage, isFetching: mtbfAverageLoading } = useMTBFAverageData({
    assetIds: data.assetIds,
    end: end,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    start: start,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
  });

  const { data: mttrAverage, isFetching: mttrAverageLoading } = useMTTRAverageData({
    assetIds: data.assetIds,
    end: end,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    start: start,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
  });

  const { data: kpiLastUpdated } = useKPILastUpdateData();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setSearchParams] = useSearchParams();

  // Use dummy data if isLegend is true
  const actualMtbfAverage = isLegend ? DUMMY_MTBF_AVERAGE : mtbfAverage;
  const actualMttrAverage = isLegend ? DUMMY_MTTR_AVERAGE : mttrAverage;
  const actualMtbfChart = isLegend ? DUMMY_MTBF_CHART : mtbfChart;
  const actualMttrChart = isLegend ? DUMMY_MTTR_CHART : mttrChart;
  const actualLastUpdated = isLegend ? DUMMY_LAST_UPDATED : kpiLastUpdated?.last_updated;

  const { lastUpdated, mtbf, mtbfChartData, mttr, mttrChartData } = {
    mtbf: {
      unit: actualMtbfAverage && actualMtbfAverage.length > 0 ? actualMtbfAverage[0].unit : 'hours',
      value: actualMtbfAverage && actualMtbfAverage.length > 0 ? actualMtbfAverage[0].mtbf : '5',
    },
    mttr: {
      unit: actualMttrAverage && actualMttrAverage.length > 0 ? actualMttrAverage[0].unit : 'hours',
      value: actualMttrAverage && actualMttrAverage.length > 0 ? actualMttrAverage[0].mttr : '5',
    },
    mttrChartData: {
      category: actualMttrChart?.category,
      values: actualMttrChart?.values,
      unit: actualMttrChart?.unit,
    },
    mtbfChartData: {
      category: actualMtbfChart?.category,
      values: actualMtbfChart?.values,
      unit: actualMtbfChart?.unit,
    },
    lastUpdated: actualLastUpdated || '',
  };

  const collapsibleRef = useRef<ImperativePanelHandle>(null);
  const mtbfChartRef = useRef<EChartsReact>(null);
  const mttrChartRef = useRef<EChartsReact>(null);

  const resizerClickHandler = () => {
    const widthPercentage = collapsibleRef.current?.getSize();
    if (widthPercentage === 100 || widthPercentage === 0) {
      collapsibleRef.current?.resize(50);
    }
  };

  const onPanelResizeHandler = () => {
    const widthPercentage = collapsibleRef.current?.getSize();
    if (mtbfChartRef.current && mttrChartRef.current) {
      mtbfChartRef.current.getEchartsInstance().resize();
      mttrChartRef.current.getEchartsInstance().resize();
    }
    if (widthPercentage) {
      if (widthPercentage >= 80) {
        collapsibleRef.current?.resize(100);
      } else if (widthPercentage <= 20) {
        collapsibleRef.current?.resize(0);
      }
    }
  };

  const handleMetricClick = (metric: string) => {
    if (metric === 'mtbf') {
      collapsibleRef.current?.resize(100);
    } else {
      collapsibleRef.current?.resize(0);
    }
  };

  const {
    colors: { neutralTextTitleHeading, brandSurfaceDarkSecondary, conditionCriticalSecondary },
  } = useContext(ThemeContext);

  const [openDetails, setOpenDetails] = useState(false);

  const handleCloseDetails = () => {
    setFilter((prev) => {
      return { ...prev, page: 1 };
    });
    setSearchParams((prev) => {
      prev.delete('page');
      return prev;
    });
    setOpenDetails(false);
  };

  return (
    <>
      <Container
        className={clsx(styles['content-kpi'])}
        icon={<BarChartH />}
        title="Equipment MTBF & MTTR"
        rightTopComponent={
          <div className={styles['right-top-component']}>
            <InfoTooltip
              title={'Top 5 Equipment MTBF & MTTR'}
              contentStyle={{
                whiteSpace: 'pre-line',
              }}
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <span>{'Reliability Metrics: \n'}</span>
                    <span>{t('common.mtbf') + '\n'}</span>
                    <InlineMath
                      math={
                        'MTBF = \\frac{\\text{Total operating time between failures}}{\\text{Number of failures}}'
                      }
                    />
                  </div>
                  <div>
                    <span>{t('common.mttr') + '\n'}</span>
                    <InlineMath
                      math={
                        'MTTR = \\frac{\\text{Total repair time}}{\\text{Number of repair events}}'
                      }
                    />
                  </div>
                </div>
              }
              height={'fit-content'}
            />
            <div className={styles['details']}>
              <span className={styles['last-updated-title']}>Last Updated:</span>
              <span className={styles['last-updated-value']}>
                {lastUpdated ? formatDateTime(new Date(lastUpdated)) : '-'}
              </span>
              <Button
                onClick={() => {
                  if (!isLegend) {
                    setOpenDetails(true);
                  }
                }}
                color="default-secondary"
                suffixIcon={<ChevronRight />}
              >
                View Details
              </Button>
            </div>
          </div>
        }
        contentWrapperProps={{
          style: {
            alignSelf: 'stretch',
            flex: '1 0 0',
            overflow: 'auto',
            flexDirection: 'column',
            gap: '21px',
            background: 'unset',
          },
        }}
        titleProps={{
          style: {
            fontWeight: 600,
            fontSize: 22,
          },
        }}
        style={{
          overflow: 'hidden',
        }}
      >
        <div className={styles['card-row']}>
          <span onClick={() => handleMetricClick('mtbf')}>
            <Loading isLoading={isLegend ? false : mtbfAverageLoading} />
            <Metric
              containerClassName={clsx(styles['metric-container'])}
              value={mtbf.value || '-'}
              unit={t(`common.${mtbf.unit}`)}
              title={<span className={styles['metric-title']}>{t('common.average_mtbf')}</span>}
              borderColor={COLOR.brandSurfaceDarkSecondary}
            />
          </span>
          <span onClick={() => handleMetricClick('mttr')}>
            <Loading isLoading={isLegend ? false : mttrAverageLoading} />
            <Metric
              containerClassName={clsx(styles['metric-container'])}
              value={mttr.value || '-'}
              unit={t(`common.${mttr.unit}`)}
              title={<span className={styles['metric-title']}>{t('common.average_mttr')}</span>}
              borderColor={COLOR.conditionCriticalSecondary}
            />
          </span>
        </div>
        <PanelGroup className={styles['chart-container']} direction="horizontal">
          <Panel
            className={styles['chart-panel']}
            ref={collapsibleRef}
            onResize={onPanelResizeHandler}
            collapsible={true}
            collapsedSize={0}
          >
            <Loading isLoading={isLegend ? false : mtbfChartLoading} />
            <EChartsReact
              ref={mtbfChartRef}
              style={{
                height: '100%',
                width: '100%',
              }}
              option={getMTBFChartOpts({
                category: mtbfChartData.category,
                neutralTextTitleHeading,
                values: mtbfChartData.values,
                unit: t(`common.${mtbfChartData.unit}`),
                barChartColor: brandSurfaceDarkSecondary,
              })}
            />
          </Panel>
          <PanelResizeHandle onClick={resizerClickHandler} className={styles['divider']}>
            <div className={styles['divider-handle']}></div>
          </PanelResizeHandle>
          <Panel className={styles['chart-panel']} collapsedSize={0}>
            <Loading isLoading={isLegend ? false : mttrChartLoading} />
            <EChartsReact
              ref={mttrChartRef}
              style={{
                height: '100%',
                width: '100%',
              }}
              option={getMTTRChartOpts({
                category: mttrChartData.category,
                neutralTextTitleHeading,
                unit: t(`common.${mttrChartData.unit}`),
                values: mttrChartData.values,
                barChartColor: conditionCriticalSecondary,
              })}
            />
          </Panel>
        </PanelGroup>
      </Container>
      <KPIDetails onClose={handleCloseDetails} open={openDetails} />
    </>
  );
};

export default KPIPanel;
