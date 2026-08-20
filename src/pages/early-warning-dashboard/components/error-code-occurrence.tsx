import { InfoTooltip, ThemeContext } from '@digital-twin/components';
import { useContext } from 'react';

import { TErrorCodeOccurrence } from '../api';
import { BarChart } from './bar-chart';

type ErrorCodeOccurrenceProps = {
  data: TErrorCodeOccurrence[];
  className?: string;
  isLoading: boolean;
};

export const ErrorCodeOccurrence = ({ data, className, isLoading }: ErrorCodeOccurrenceProps) => {
  const { colors } = useContext(ThemeContext);
  return (
    <BarChart
      isLoading={isLoading}
      color={colors.brandSurfaceDarkPrimary}
      className={className}
      title={'Error Code Occurrence'}
      data={data.map((item) => ({
        ...item,
        name: item.errorCode,
        value: item.count,
      }))}
      titleSuffixIcon={
        <InfoTooltip
          title={'Error Code Occurrence'}
          content={
            <>
              <span>Provides a summary of detected error codes and their</span>
              <br />
              <span>frequency, helping users identify the most common system</span>
              <br />
              <span>faults.</span>
            </>
          }
        />
      }
    />
  );
};
