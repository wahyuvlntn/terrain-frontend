import { Container, InfoTooltip, Loading, useExtractFilter } from '@digital-twin/components';
import { ChevronRight, ExclamationRibbon } from '@digital-twin/icons';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useTopFrequentIssuesData } from '../api/maintenance-performance';
import { TOP_FREQUENT_ISSUES_LIMIT } from '../constant';
import { GeneralFilterType, MaintenancePerformanceFilterType } from '../type';
import FrequentIssueDetails from './frequent-issue-details';
import FrequentIssueItem from './frequent-issue-item';
import styles from './frequent-issues.module.scss';
import NoData from './no-data';

const FrequentIssues = () => {
  const {
    data,
    filter: { start, end },
    setFilter,
  } = useExtractFilter<GeneralFilterType, MaintenancePerformanceFilterType>();

  const { data: topFrequentIssues, isFetching } = useTopFrequentIssuesData({
    assetIds: data.assetIds,
    end: end,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    start: start,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setSearchParams] = useSearchParams();
  const [openDetails, setOpenDetails] = useState(false);

  const handleCloseDetails = () => {
    setFilter((prev) => {
      return { ...prev, page: 1 };
    });
    setSearchParams((prev) => {
      prev.delete('page');
      return prev;
    });
    setOpenDetails(false);
  };

  const handleOthersClick = () => {
    // Handle click event for "Others"
    console.log('Open popup details');
    setOpenDetails(true);
  };

  return (
    <>
      <Container
        className={styles['frequent-issues']}
        title="Frequent Alarms"
        icon={<ExclamationRibbon />}
        rightTopComponent={
          <div className={styles['right-top-component']}>
            <InfoTooltip
              title={'Most Frequent Alarms'}
              content={
                <>
                  <span>
                    Presents the alarms that generated the largest volume of maintenance orders
                  </span>
                  <br />
                  <span>
                    during the selected period, helping identify recurring problems and potential
                    areas for improvement.
                  </span>
                </>
              }
            />
          </div>
        }
        contentWrapperProps={{
          style: {
            overflow: 'auto',
            flexDirection: 'column',
            padding: 16,
            boxSizing: 'border-box',
          },
        }}
      >
        <div className={styles['frequent-issue-list']}>
          <Loading isLoading={isFetching} />
          {topFrequentIssues && topFrequentIssues.length > 0 ? (
            <>
              {topFrequentIssues.map((issue, index) => (
                <FrequentIssueItem
                  key={index}
                  description={'Order Count'}
                  title={issue.instructionName}
                  value={issue.occurence}
                />
              ))}
              {topFrequentIssues.length > TOP_FREQUENT_ISSUES_LIMIT && (
                <div className={styles.others} onClick={handleOthersClick}>
                  <div className={styles['title-container']}>
                    <span className={styles['title']}>Others</span>
                  </div>
                  <ChevronRight className={styles['chevron-icon']} />
                </div>
              )}
            </>
          ) : (
            <NoData />
          )}
        </div>
      </Container>
      <FrequentIssueDetails open={openDetails} onClose={handleCloseDetails} />
    </>
  );
};

export default FrequentIssues;
