import { useEffect } from 'react';

import { ReactComponent as AlarmReport } from '../../assets/Alarm Report.svg';
import { ReactComponent as LocationOverview } from '../../assets/Location Overview.svg';
import { ReactComponent as OperatorFeedback } from '../../assets/Operator Feedback.svg';
import { ReactComponent as ProductionPerformance } from '../../assets/Production Performance Mobile.svg';
import styles from './preview-mobile.module.scss';

type PreviewMobileProps = {
  onLoad: () => void;
};
const PreviewMobile = ({ onLoad }: PreviewMobileProps) => {
  useEffect(() => {
    onLoad();
  }, []);

  return (
    <div className={styles['preview-mobile-content']}>
      <LocationOverview />
      <AlarmReport />
      <ProductionPerformance />
      <OperatorFeedback />
    </div>
  );
};

export default PreviewMobile;
