import { COLOR, ThemeContext, useExtractFilter } from '@digital-twin/components';
import { getDataZoomHandler } from '@digital-twin/utils';
import { format, subDays } from 'date-fns';
import ReactECharts from 'echarts-for-react';
import { useContext, useEffect, useRef, useState } from 'react';

import { useMaintenanceOrderTrendData } from '../api/maintenance-performance';
import { GeneralFilterType, MaintenancePerformanceFilterType } from '../type';

// Generate dummy data for the last 30 days
const generateDummyData = () => {
  const today = new Date();
  const dummyData = [];

  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    dummyData.push({
      day: format(date, 'yyyy-MM-dd'),
      preventiveCount: Math.floor(Math.random() * 15) + 5,
      correctiveCount: Math.floor(Math.random() * 10) + 3,
    });
  }

  return dummyData;
};

const DUMMY_DATA = generateDummyData();

export const useMaintenanceOrderTrend = (isLegend: boolean) => {
  const {
    data,
    filter: { start, end },
  } = useExtractFilter<GeneralFilterType, MaintenancePerformanceFilterType>();

  const {
    colors: {
      conditionCriticalSecondary,
      brandSurfaceDarkSecondary,
      neutralTextTitleHeading,
      neutralTextCaption,
      backgroundDefault,
      brandBorderDefaultPrimary,
      backgroundHighest,
      borderDefault,
    },
  } = useContext(ThemeContext);

  const { data: maintenanceOrderTrend, isFetching } = useMaintenanceOrderTrendData({
    assetIds: data.assetIds,
    end: end,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    start: start,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
  });

  const [chartOption, setChartOption] = useState({});
  const chartRef = useRef<ReactECharts>(null);

  useEffect(() => {
    // Use dummy data if isLegend is true, otherwise use real data
    const trendData = isLegend ? DUMMY_DATA : maintenanceOrderTrend || [];
    const dates = trendData.map((v) => v.day);

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        confine: true,
        backgroundColor: backgroundDefault,
        borderColor: brandBorderDefaultPrimary,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        textStyle: {
          color: COLOR.neutralTextTitleHeading,
        },
        formatter: function (params: unknown) {
          //@ts-expect-error unknown type
          const date = format(new Date(params[0].axisValue), 'dd MMM yyyy');

          // Calculate totals
          let preventiveCount = 0;
          let correctiveCount = 0;
          let totalCount = 0;

          //@ts-expect-error unknown type
          params.forEach((item) => {
            if (item.seriesName === 'Preventive') {
              preventiveCount = item.value;
            } else if (item.seriesName === 'Corrective') {
              correctiveCount = item.value;
            }
          });

          totalCount = preventiveCount + correctiveCount;

          return `
        <div style="font-family: system-ui, -apple-system, sans-serif; width:200px; height:130px;">
          <div style="font-size: 16px; font-weight: 600; color: ${neutralTextTitleHeading}; margin-bottom: 4px;">
            Trend
          </div>
          <div style="display:flex; justify-content: space-between;font-size: 14px; color: ${neutralTextCaption}; margin-bottom: 6px;">
            <span>Timestamp</span>
            <span>${date}</span>
          </div>
          <div style="font-size: 14px; color: ${neutralTextTitleHeading}; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 400;">Order Count</span>
            <span style="font-weight: 600; font-size: 16px;">${totalCount}</span>
          </div>
          <div style="font-size: 14px; color: ${neutralTextTitleHeading}; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10.9999 0C11.2761 0 11.5001 0.224008 11.5001 0.500149V1.0003H12.0002C13.1047 1.00044 14 1.89558 14 3.00006V6.96278H12.9997V4.49967H1.0003V12.0002C1.00045 12.5523 1.44768 12.9996 1.99976 12.9997H6.1055V14H1.99976C0.895393 13.9999 0.000146966 13.1046 0 12.0002V3.00006C0 1.89557 0.895302 1.00043 1.99976 1.0003H2.49991V0.500149C2.49991 0.224008 2.72392 0 3.00006 0C3.27617 3.65235e-05 3.50021 0.22403 3.50021 0.500149V1.0003H10.4998V0.500149C10.4998 0.224018 10.7238 1.63316e-05 10.9999 0Z" fill="currentColor"/>
              <path d="M10.0311 11.4587H10.7448V12.1724H10.0311V11.4587ZM10.0311 8.60388H10.7448V10.745H10.0311V8.60388ZM10.3844 6.81962C8.41454 6.81962 6.81941 8.41832 6.81941 10.3881C6.81941 12.358 8.41454 13.9566 10.3844 13.9566C12.3577 13.9566 13.9564 12.358 13.9564 10.3881C13.9564 8.41832 12.3577 6.81962 10.3844 6.81962ZM10.3879 13.2429C8.81064 13.2429 7.53312 11.9654 7.53312 10.3881C7.53312 8.81085 8.81064 7.53333 10.3879 7.53333C11.9652 7.53333 13.2427 8.81085 13.2427 10.3881C13.2427 11.9654 11.9652 13.2429 10.3879 13.2429Z" fill="currentColor"/>
              </svg>
              <span>Preventive</span>
            </span>
            <span style="font-weight: 600; font-size: 14px;">${preventiveCount}</span>
          </div>
          <div style="font-size: 14px; color: ${neutralTextTitleHeading}; display: flex; justify-content: space-between; align-items: center;">
            <span style="display: flex; align-items: center; gap: 6px;">
             <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.6092 13.6H5.22354C5.05458 13.6 4.91266 13.4776 4.88563 13.3144L4.63557 11.5124C4.2098 11.3424 3.84486 11.1112 3.49343 10.8392L1.81063 11.526C1.66195 11.5804 1.47947 11.526 1.39838 11.3764L0.0467269 9.0236C0.00536345 8.95354 -0.00921867 8.87071 0.00570746 8.79061C0.0206336 8.71051 0.0640459 8.63863 0.127826 8.5884L1.55381 7.4596C1.52678 7.242 1.50651 7.0244 1.50651 6.8C1.50651 6.5756 1.52678 6.3512 1.55381 6.12L0.127826 5.0116C0.0640459 4.96137 0.0206336 4.88949 0.00570746 4.80939C-0.00921867 4.72929 0.00536345 4.64646 0.0467269 4.5764L1.39838 2.2236C1.47947 2.074 1.66195 2.0128 1.81063 2.074L3.49343 2.754C3.84486 2.4888 4.2098 2.2576 4.63557 2.0876L4.88563 0.2856C4.91266 0.1224 5.05458 0 5.22354 0H7.92683C8.09579 0 8.23771 0.1224 8.26475 0.2856L8.5148 2.0876C8.94057 2.2576 9.30551 2.4888 9.65694 2.754L11.3397 2.074C11.4884 2.0128 11.6709 2.074 11.752 2.2236L13.1036 4.5764C13.1847 4.726 13.151 4.9096 13.0225 5.0116L11.5966 6.12C11.6236 6.3512 11.6439 6.5756 11.6439 6.8V6.9292C11.306 6.8476 10.968 6.8 10.6301 6.8C10.0084 6.8 9.42716 6.9428 8.90002 7.1944C8.9203 7.0652 8.94057 6.936 8.94057 6.8C8.94057 5.4876 7.87953 4.42 6.57519 4.42C5.27085 4.42 4.2098 5.4876 4.2098 6.8C4.2098 8.1124 5.27085 9.18 6.57519 9.18C6.71035 9.18 6.83876 9.1596 6.96716 9.1392C6.62417 9.86338 6.5021 10.6736 6.61637 11.4675C6.73064 12.2614 7.07612 13.0035 7.6092 13.6Z" fill="currentColor"/>
            <path d="M10.4861 12.0085H11.1806V12.7029H10.4861V12.0085ZM10.4861 9.23069H11.1806V11.314H10.4861V9.23069ZM10.8299 7.49457C8.91319 7.49457 7.36111 9.05013 7.36111 10.9668C7.36111 12.8835 8.91319 14.439 10.8299 14.439C12.75 14.439 14.3056 12.8835 14.3056 10.9668C14.3056 9.05013 12.75 7.49457 10.8299 7.49457ZM10.8333 13.7446C9.29861 13.7446 8.05556 12.5015 8.05556 10.9668C8.05556 9.43207 9.29861 8.18902 10.8333 8.18902C12.3681 8.18902 13.6111 9.43207 13.6111 10.9668C13.6111 12.5015 12.3681 13.7446 10.8333 13.7446Z" fill="currentColor"/>
            </svg>
              <span>Corrective</span>
            </span>
            <span style="font-weight: 600; font-size: 14px;">${correctiveCount}</span>
          </div>
        </div>
      `;
        },
      },

      // dataZoom: [
      //   {
      //     id: 'dataZoomX',
      //     type: 'inside',
      //     xAxisIndex: [0],
      //     filterMode: 'filter',
      //     start: 0,
      //     end: dates.length > 21 ? (21 / dates.length) * 100 : 100,
      //     maxSpan: dates.length > 21 ? (21 / dates.length) * 100 : 100,
      //     minSpan: dates.length > 21 ? (21 / dates.length) * 100 : 100,
      //   },
      // ],
      dataZoom: getDataZoomHandler({
        bottomPadding: '5%',
        maxValue: 21,
        minValue: 0,
        show: trendData.length > 21 ? true : false,
        colors: {
          primary: backgroundHighest,
          secondary: borderDefault,
        },
      }),

      grid: {
        left: '3%',
        right: '4%',
        bottom: trendData.length > 21 ? '8%' : '3%',
        top: '7%',
        containLabel: true,
        show: false,
      },

      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: neutralTextTitleHeading,
          },
        },
        axisTick: {
          alignWithLabel: true,
          lineStyle: { color: neutralTextTitleHeading },
          interval: 0,
        },
        axisLabel: {
          color: neutralTextTitleHeading,
          fontSize: 12,
          //@ts-expect-error unknown type
          formatter: function (value) {
            return format(new Date(value), 'dd/MM');
          },
        },
      },

      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: {
          color: neutralTextTitleHeading,
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)',
            type: 'dashed',
          },
        },
      },

      series: [
        {
          name: 'Corrective',
          type: 'bar',
          stack: 'total',
          barWidth: '32px',
          data: trendData.map((val) => {
            if (val.preventiveCount === 0) {
              return {
                value: val.correctiveCount,
                itemStyle: { borderRadius: [6, 6, 0, 0] },
              };
            }
            return val.correctiveCount;
          }),
          itemStyle: {
            color: conditionCriticalSecondary,
          },
        },
        {
          name: 'Preventive',
          type: 'bar',
          stack: 'total',
          barWidth: '32px',
          itemStyle: {
            color: brandSurfaceDarkSecondary,
            borderRadius: [6, 6, 0, 0],
          },
          data: trendData.map((val) => {
            return val.preventiveCount;
          }),
        },
      ],
    };

    setChartOption(option);
  }, [
    backgroundHighest,
    borderDefault,
    maintenanceOrderTrend,
    brandSurfaceDarkSecondary,
    conditionCriticalSecondary,
    neutralTextTitleHeading,
    backgroundDefault,
    brandBorderDefaultPrimary,
    neutralTextCaption,
    isLegend,
  ]);

  return {
    maintenanceOrderTrend: isLegend ? DUMMY_DATA : maintenanceOrderTrend,
    chartOption,
    setChartOption,
    chartRef,
    isFetching: isLegend ? false : isFetching,
  };
};
