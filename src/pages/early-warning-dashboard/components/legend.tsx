import { Legend as ReusableLegend, TooltipContent } from '@digital-twin/components';

import { EarlyWarningAndDiagnosticTrend } from './early-warning-and-diagnostic-trend';
import styles from './legend.module.scss';

const EARLY_WARNING_AND_DIAGNOSITC_TREND_DATA = [
  { day: '2025-12-07', degradation: 3, compoundDegradation: 2 },
  { day: '2025-12-08', degradation: 3, compoundDegradation: 3 },
  { day: '2025-12-09', degradation: 3, compoundDegradation: 2 },
  { day: '2025-12-10', degradation: 0, compoundDegradation: 0 },
  { day: '2025-12-11', degradation: 3, compoundDegradation: 2 },
  { day: '2025-12-12', degradation: 1, compoundDegradation: 0 },
  { day: '2025-12-13', degradation: 0, compoundDegradation: 1 },
];

export const Legend = () => {
  return (
    <ReusableLegend>
      <div className={styles.EarlyWarningAndDiagnosticTrend__Container}>
        <EarlyWarningAndDiagnosticTrend
          data={EARLY_WARNING_AND_DIAGNOSITC_TREND_DATA}
          className={styles.EarlyWarningAndDiagnosticTrend__Chart}
          disableToggler
          isLoading={false}
        />
        <TooltipContent
          content={'Occurrences'}
          position={'left'}
          size={'large'}
          left={250}
          top={210}
        />
        <TooltipContent
          content={'Occurrence Date (Day/Month)'}
          position={'top'}
          size={'large'}
          left={220}
          bottom={100}
        />
      </div>
    </ReusableLegend>
  );
};
