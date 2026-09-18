import { ThemeContext } from '@digital-twin/components';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { memo, useContext, useMemo } from 'react';
import styles from '../ai-assistant.module.scss';
import { ChartPayload } from '../api/ai-assistant.api';
import { ChartTheme, sanitizeChartOption, themeChartOption } from './chart-option';

type ChartBlockProps = { chart: ChartPayload };

/** A chart from the assistant: validated, sanitised option drawn with the app theme */
export const ChartBlock = memo(({ chart }: ChartBlockProps) => {
  const { colors } = useContext(ThemeContext);

  const theme = useMemo<ChartTheme>(
    () => ({
      text: colors.neutralTextBodyNeutral,
      heading: colors.neutralTextTitleHeading,
      label: colors.neutralTextLabel,
      caption: colors.neutralTextCaption,
      axis: colors.borderDefault,
      grid: colors.borderLight,
      tooltipBackground: colors.backgroundDefault,
      tooltipBorder: colors.borderDefault,
      palette: [
        colors.accentInfoSecondary,
        colors.conditionWarningPrimary,
        colors.statusRunningPrimary,
        colors.brandSurfaceDefaultPrimary,
        colors.conditionCriticalPrimary,
        colors.pelorous500,
        colors.statusIdlePrimary,
        colors.persimmon500,
      ].filter((c): c is string => typeof c === 'string' && !!c),
    }),
    [colors]
  );

  const option = useMemo(() => {
    const safe = sanitizeChartOption(chart.option);
    return safe
      ? (themeChartOption(safe, theme, { hideTitle: !!chart.title }) as EChartsOption)
      : null;
  }, [chart.option, chart.title, theme]);

  const title = chart.title || 'Chart';

  return (
    <figure className={styles.chart}>
      {chart.title ? <figcaption>{chart.title}</figcaption> : null}
      {option ? (
        <div role="img" aria-label={title}>
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={{ height: 240, width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      ) : (
        <div className={styles.chart__empty} role="note">
          This chart could not be displayed.
        </div>
      )}
    </figure>
  );
});
ChartBlock.displayName = 'ChartBlock';
