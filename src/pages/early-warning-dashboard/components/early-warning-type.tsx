import { InfoTooltip, ThemeContext } from '@digital-twin/components';
import { useContext } from 'react';

import { TEarlyWarningTypeCount } from '../api';
import { DoughnutChart } from './doughnut-chart';

type EarlyWarningTypeProps = {
  data: TEarlyWarningTypeCount[];
  className?: string;
  isLoading: boolean;
};

export const EarlyWarningType = ({ data, className, isLoading }: EarlyWarningTypeProps) => {
  const { colors } = useContext(ThemeContext);
  return (
    <DoughnutChart
      isLoading={isLoading}
      title={'Early Warning Type'}
      className={className}
      color={[colors.persimmon500, '#2CB5FF', '#F9A825', '#8DD40E']}
      data={data.map((item) => ({
        ...item,
        name: item.typeName,
        value: item.count,
      }))}
      titleSuffixIcon={
        <InfoTooltip
          title={'Early Warning Type'}
          content={
            <>
              <span>Provides a breakdown of early warning categories based on</span>
              <br />
              <span>detected degradation scenarios.</span>
            </>
          }
        />
      }
    />
  );
};
