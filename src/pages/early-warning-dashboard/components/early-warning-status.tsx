import { InfoTooltip, ThemeContext } from '@digital-twin/components';
import { useContext } from 'react';

import { TEarlyWarningStatusCount } from '../api';
import { DoughnutChart } from './doughnut-chart';

type EarlyWarningStatusProps = {
  data: TEarlyWarningStatusCount[];
  className?: string;
  isLoading: boolean;
};

export const EarlyWarningStatus = ({ data, className, isLoading }: EarlyWarningStatusProps) => {
  const { colors } = useContext(ThemeContext);
  return (
    <DoughnutChart
      isLoading={isLoading}
      title={'Early Warning Status'}
      className={className}
      color={[
        colors.severityTagsStatusRequested,
        colors.severityTagsStatusRejected,
        colors.severityTagsStatusOpen,
        colors.severityTagsStatusInProgress,
        colors.severityTagsStatusDone,
        colors.severityTagsStatusClosed,
      ]}
      data={data.map((item) => ({
        ...item,
        name: item.statusName,
        value: item.count,
      }))}
      titleSuffixIcon={
        <InfoTooltip
          title={'Early Warning Status'}
          content={
            <>
              <span>Shows the distribution of early warnings by processing status,</span>
              <br />
              <span>offering a quick view of current progress and system</span>
              <br />
              <span>response.</span>
            </>
          }
        />
      }
    />
  );
};
