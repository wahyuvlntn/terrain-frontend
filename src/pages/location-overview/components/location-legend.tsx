import { Legend, TooltipContent } from '@digital-twin/components';
import { t } from '@digital-twin/utils';

import { LocationCard } from './location-card';
import styles from './location-legend.module.scss';

const LocationLegend = () => {
  return (
    <Legend>
      <div className={styles.container}>
        <LocationCard
          isPreview
          handleSelectLocation={() => {}}
          availabilityTh={95}
          isLastChild
          locationId={156}
          locationImagePath=""
          locationName="Bandung Site"
          oeeLimit={75}
          performanceTh={85}
          qualityTh={85}
          totalAsset={22}
          totalCriticalAsset={2}
          totalIdleAsset={0}
          totalNormalAsset={0}
          totalOfflineAsset={34}
          totalPlannedDownAsset={2}
          totalRunningAsset={18}
          totalUnplannedDownAsset={76}
          totalWarningAsset={2}
        />
        <TooltipContent
          content={t('common.location_photo')}
          className={styles.tooltip__right}
          position={'right'}
          size={'large'}
          left={300}
          top={240}
        />
        <TooltipContent
          content={t('common.location_name')}
          className={styles.tooltip__bottom}
          position={'bottom'}
          size={'large'}
          left={320}
          top={150}
        />
        <TooltipContent
          content={t('common.equipment_count')}
          className={styles.tooltip__bottom}
          position={'bottom'}
          size={'large'}
          left={820}
          top={150}
        />
        <TooltipContent
          content={t('common.uptime')}
          position={'left'}
          size={'large'}
          left={900}
          top={250}
        />
        <TooltipContent
          content={t('common.condition_information')}
          className={styles.tooltip__top}
          position={'top'}
          size={'large'}
          left={800}
          top={510}
        />
        <TooltipContent
          content={t('common.status_information')}
          className={styles.tooltip__top}
          position={'top'}
          size={'large'}
          left={500}
          top={510}
        />
      </div>
    </Legend>
  );
};

export default LocationLegend;
