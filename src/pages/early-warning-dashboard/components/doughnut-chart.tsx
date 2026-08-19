import { Container, Loading, ThemeContext } from '@digital-twin/components';
import { ChartDonutFilled } from '@digital-twin/icons';
import { EChartsOption } from 'echarts';
import { ZRColor } from 'echarts/types/src/util/types';
import ReactECharts from 'echarts-for-react';
import { ReactNode, useContext } from 'react';

type DoughnutChartProps = {
  color?: ZRColor | ZRColor[];
  data: { name: string; value: number; percentage: number }[];
  className?: string;
  title: string;
  titleSuffixIcon?: ReactNode;
  isLoading: boolean;
};

export const DoughnutChart = ({
  color,
  data,
  className,
  title,
  titleSuffixIcon,
  isLoading,
}: DoughnutChartProps) => {
  const { colors } = useContext(ThemeContext);

  const option: EChartsOption = {
    color,
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'middle',
      icon: 'circle',
      itemGap: 15,
      itemStyle: {
        borderColor: colors.neutralTextTitleHeading,
        borderWidth: 1,
      },
      textStyle: {
        color: colors.neutralTextTitleHeading,
        fontSize: 14,
        fontWeight: 'bolder',
        rich: {
          name: {
            width: 100,
            fontSize: 14,
            color: colors.neutralTextTitleHeading,
            verticalAlign: 'top',
          },
          value: {
            width: 30,
            align: 'center',
            fontSize: 14,
            color: colors.neutralTextTitleHeading,
            verticalAlign: 'top',
          },
          percent: {
            width: 40,
            align: 'right',
            fontSize: 14,
            color: colors.neutralTextCaption,
            verticalAlign: 'top',
          },
        },
      },
      formatter: function (name: string) {
        const item = data.find((i) => i.name === name);
        const count = item?.value || 0;
        const percentage = item?.percentage || 0;
        // Split logic: attach numbers to the first line, then wrap the name
        if (name.length > 15) {
          const spaceIndex = name.indexOf(' ', 10);
          if (spaceIndex !== -1) {
            const firstPart = name.substring(0, spaceIndex);
            const secondPart = name.substring(spaceIndex + 1);

            // The numbers {value} and {percent} are placed BEFORE the \n
            return `{name|${firstPart}}{value|${count}}{percent|${percentage}%}\n{name|${secondPart}}`;
          }
        }

        return `{name|${name}}{value|${count}}{percent|${percentage}%}`;
      },
    },
    series: [
      {
        name: '',
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['27%', '50%'],
        avoidLabelOverlap: false,
        padAngle: 1,
        label: {
          show: false,
        },
        labelLine: {
          show: false,
        },

        data: data,
      },
    ],
  };
  return (
    <Container
      title={title}
      icon={<ChartDonutFilled />}
      className={className}
      titleSuffixIcon={titleSuffixIcon}
    >
      <Loading isLoading={isLoading} />
      <ReactECharts
        option={option}
        style={{
          height: '306px',
          width: '100%',
          overflow: 'hidden',
        }}
      />
    </Container>
  );
};
