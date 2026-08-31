import { Container, InfoTooltip, Loading } from '@digital-twin/components';
import { PersonnelCapacity } from '@digital-twin/icons';
import ReactECharts from 'echarts-for-react';
import { InlineMath } from 'react-katex';

import NoData from './no-data';
import { usePersonnelCapacityDistribution } from './personnel-capacity-distribution.hook';
import styles from './personnel-capacity-distribution.module.scss';

interface PersonnelCapacityDistributionProps {
  isLegend?: boolean;
}

const PersonnelCapacityDistribution = ({
  isLegend = false,
}: PersonnelCapacityDistributionProps) => {
  const { chartOption, chartRef, personnelCapacityDistribution, isFetching } =
    usePersonnelCapacityDistribution(isLegend);

  return (
    <Container
      className={styles['personnel-capacity-distribution']}
      titleProps={{
        style: {
          width: 0,
          flexGrow: 1,
        },
      }}
      title="Personnel Capacity Distribution"
      icon={<PersonnelCapacity />}
      titleSuffixIcon={
        <InfoTooltip
          title={'Personnel Capacity Distribution'}
          content={
            <>
              <span>
                Shows the distribution of personnel across utilization ranges (0–20%, 20–40%, etc.)
                within the selected
              </span>
              <br />
              <span>
                period, providing visibility into workforce balance, potential overload, and
                available capacity.
              </span>
              <br />
              <br />
              <InlineMath>
                {`Capacity(\\%) = \\left( \\frac{\\text{Actual working hours}}{\\text{Available working hours}} \\right) \\times 100\\%`}
              </InlineMath>
            </>
          }
        />
      }
    >
      <div className={styles['chart-container']}>
        <Loading isLoading={isFetching} />
        {personnelCapacityDistribution &&
        personnelCapacityDistribution.length > 0 &&
        !personnelCapacityDistribution.every((el) => el.personnelCount === 0) ? (
          <ReactECharts
            className={styles['chart']}
            ref={chartRef}
            option={chartOption}
            style={{
              height: '100%',
              width: '100%',
              overflow: 'hidden',
            }}
          />
        ) : (
          <NoData />
        )}
      </div>
    </Container>
  );
};

export default PersonnelCapacityDistribution;
