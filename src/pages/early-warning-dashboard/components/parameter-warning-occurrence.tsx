import { InfoTooltip, ThemeContext } from '@digital-twin/components';
import { useContext } from 'react';

import { TParameterWarningOccurrence } from '../api';
import { BarChart } from './bar-chart';

type ParameterWarningOccurrenceProps = {
  data: TParameterWarningOccurrence[];
  className?: string;
  isLoading: boolean;
};

export const ParameterWarningOccurrence = ({
  data,
  className,
  isLoading,
}: ParameterWarningOccurrenceProps) => {
  const { colors } = useContext(ThemeContext);
  return (
    <BarChart
      isLoading={isLoading}
      color={colors.conditionWarningPrimary}
      className={className}
      title={'Parameter Warning Occurrence'}
      data={data.map((item) => ({
        ...item,
        name: item.parameterName,
        value: item.count,
      }))}
      titleSuffixIcon={
        <InfoTooltip
          title={'Parameter Warning Occurrence'}
          content={
            <>
              <span>Shows how often monitored parameters trigger warning</span>
              <br />
              <span>conditions, giving insight into which parameters contribute</span>
              <br />
              <span>most to system anomalies.</span>
            </>
          }
        />
      }
    />
  );
};
