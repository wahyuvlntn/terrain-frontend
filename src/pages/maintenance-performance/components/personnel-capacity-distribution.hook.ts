import { COLOR, ThemeContext, useExtractFilter } from '@digital-twin/components';
import ReactECharts from 'echarts-for-react';
import { useContext, useEffect, useRef, useState } from 'react';

import { usePersonnelCapacityDistributionData } from '../api/maintenance-performance';
import { GeneralFilterType, MaintenancePerformanceFilterType } from '../type';

// Dummy data for personnel capacity distribution
const DUMMY_DATA = [
  { range: '0-20%', personnelCount: 8 },
  { range: '21-40%', personnelCount: 15 },
  { range: '41-60%', personnelCount: 23 },
  { range: '61-80%', personnelCount: 18 },
  { range: '81-100%', personnelCount: 12 },
];

export const usePersonnelCapacityDistribution = (isLegend: boolean) => {
  const {
    data,
    filter: { start, end },
  } = useExtractFilter<GeneralFilterType, MaintenancePerformanceFilterType>();

  const { data: personnelCapacityDistribution, isFetching } = usePersonnelCapacityDistributionData({
    assetIds: data.assetIds,
    end: end,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    start: start,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
  });

  const {
    colors: { conditionCriticalSecondary, neutralTextTitleHeading },
  } = useContext(ThemeContext);

  const [chartOption, setChartOption] = useState({});
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    // Use dummy data if isLegend is true, otherwise use real data
    const capacityData = isLegend ? DUMMY_DATA : personnelCapacityDistribution || [];

    const option = {
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
      grid: {
        left: '9%',
        right: '5%',
        bottom: '5%',
        top: '10%',
        containLabel: true,
      },

      xAxis: {
        type: 'category',
        data: capacityData.map((el) => el.range),
        axisLine: {
          lineStyle: {
            color: neutralTextTitleHeading,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: neutralTextTitleHeading,
          fontSize: 14,
          margin: 15,
        },
      },

      yAxis: {
        type: 'value',
        name: 'Number of Personnel',
        nameLocation: 'middle',
        minInterval: 1,
        nameGap: 30,
        nameRotate: 90,
        nameTextStyle: {
          color: neutralTextTitleHeading,
          fontSize: 18,
          fontWeight: 600,
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: neutralTextTitleHeading,
          fontSize: 14,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)',
            type: 'dashed',
          },
        },
      },

      series: [
        {
          name: 'Personnel',
          type: 'bar',
          barWidth: '55%',
          data: capacityData.map((el) => el.personnelCount),
          itemStyle: {
            color: conditionCriticalSecondary,
            borderRadius: [8, 8, 0, 0],
          },
        },
      ],
    };

    setChartOption(option);
  }, [
    personnelCapacityDistribution,
    conditionCriticalSecondary,
    neutralTextTitleHeading,
    isLegend,
  ]);

  return {
    chartOption,
    setChartOption,
    chartRef,
    personnelCapacityDistribution: isLegend ? DUMMY_DATA : personnelCapacityDistribution,
    isFetching,
  };
};
