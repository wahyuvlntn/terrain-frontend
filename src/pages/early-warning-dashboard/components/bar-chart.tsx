import { COLOR, Container, Loading, ThemeContext } from '@digital-twin/components';
import { BarChartH } from '@digital-twin/icons';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { ReactNode, useContext } from 'react';

type BarChartProps = {
  title: string;
  data: { name: string; value: number }[];
  className?: string;
  color?: string;
  titleSuffixIcon?: ReactNode;
  isLoading: boolean;
};

export const BarChart = ({
  title,
  data,
  className,
  color,
  titleSuffixIcon,
  isLoading,
}: BarChartProps) => {
  const { colors } = useContext(ThemeContext);

  const option: EChartsOption = {
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
      left: '15%',
      right: '5%',
      bottom: '15%',
      top: '10%',
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLine: {
        lineStyle: {
          color: colors.neutralTextTitleHeading,
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: colors.neutralTextTitleHeading,
        fontSize: 14,
        margin: 15,
        interval: 0,
        overflow: 'truncate',
        width: 60,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Occurrence',
      nameLocation: 'middle',
      minInterval: 1,
      nameGap: 30,
      nameRotate: 90,
      nameTextStyle: {
        color: colors.neutralTextTitleHeading,
        fontSize: 18,
        fontWeight: 600,
      },
      axisLine: {
        show: true, // This enables the vertical line
        lineStyle: {
          color: colors.neutralTextTitleHeading, // Or any color you prefer
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: colors.neutralTextTitleHeading,
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
        name: '',
        type: 'bar',
        barWidth: '55%',
        data: data.map((item) => item.value),
        itemStyle: {
          color,
          borderRadius: [8, 8, 0, 0],
        },
      },
    ],
  };

  return (
    <Container
      icon={<BarChartH />}
      title={title}
      className={className}
      titleSuffixIcon={titleSuffixIcon}
    >
      <Loading isLoading={isLoading} />
      <ReactECharts
        option={option}
        style={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      />
    </Container>
  );
};
