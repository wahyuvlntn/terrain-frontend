import { AssetCardProps, AssetCard as ReusableAssetCard } from '@digital-twin/components';

import styles from './asset-card.module.scss';

export const AssetCard = (
  props: Omit<
    AssetCardProps,
    | 'conditionAlarmContainerClassName'
    | 'conditionBadgeClassName'
    | 'uptimeContainerClassName'
    | 'headerClassName'
    | 'rightComponentClassName'
  >
) => {
  return (
    <ReusableAssetCard
      {...props}
      conditionAlarmContainerClassName={styles['asset-card-condition-alarm-container']}
      conditionBadgeClassName={styles['asset-card-condition-badge']}
      uptimeContainerClassName={styles['asset-card-uptime-container']}
      headerClassName={styles['asset-card-header']}
      rightComponentClassName={styles['asset-card-right-container']}
      runningBadgePosition="right"
      disableLink
    />
  );
};
