import {
  Container,
  InfoTooltip,
  STATUS_COLOR,
  STATUS_ICON,
  STATUS_NAME,
  StatusEnum,
} from '@digital-twin/components';
import { Edit1 } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';

import styles from './status-card.module.scss';

interface StatusCardProps {
  running: number;
  plannedDown: number;
  unplannedDown: number;
  offline: number;
}

export const StatusCard = ({ running, unplannedDown, plannedDown, offline }: StatusCardProps) => {
  return (
    <Container
      className={styles['status-card']}
      // the AI assistant's links scroll to and highlight `?section=status`
      data-nav-section="status"
      title={t('common.status_history')}
      icon={<Edit1 />}
      contentWrapperProps={{
        style: {
          alignSelf: 'stretch',
          flex: '1 0 0',
          flexDirection: 'column',
          padding: '0px',
          justifyContent: 'space-between',
          // background: COLOR.backgroundSecondary,
        },
      }}
      titleProps={{
        style: {
          fontWeight: 600,
          fontSize: 22,
        },
      }}
      rightTopComponent={
        <div className={styles['right-top-component']}>
          <InfoTooltip
            title={t('common.status_history')}
            content={t('common.status_history_info')}
          />
          <h2>{running + unplannedDown + plannedDown + offline}</h2>
        </div>
      }
    >
      <div className={styles.body}>
        {[
          { status: StatusEnum.enum.RUNNING, value: running },
          { status: StatusEnum.enum['PLANNED DOWN'], value: plannedDown },
          { status: StatusEnum.enum['UNPLANNED DOWN'], value: unplannedDown },
          { status: StatusEnum.enum.OFFLINE, value: offline },
        ].map((item) => (
          <div
            key={item.status}
            className={styles.details}
            style={{
              background: STATUS_COLOR[item.status],
            }}
          >
            <div className={styles['details-label']}>
              <div className={styles['icon-container']}>{STATUS_ICON[item.status]}</div>
              <h3>{STATUS_NAME[item.status]}</h3>
            </div>
            <h3>{item.value}</h3>
          </div>
        ))}
      </div>
    </Container>
  );
};
