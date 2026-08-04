/* eslint-disable simple-import-sort/imports */
import { t } from '@digital-twin/utils';
import styles from '../styles.module.scss';
import { NotificationsActive, UserFill } from '@digital-twin/icons';
import { SetURLSearchParams } from 'react-router-dom';
import { useUserGroupCard } from './UserGroupCard.hooks';
import { COLOR } from '@digital-twin/components';

interface UserGroupCardProps {
  name: string;
  category_count: number;
  user_count: number;
  locations: string;
  alias: string;
  searchParams: URLSearchParams /* searchParams */;
  setSearchParams: SetURLSearchParams /* setSearchParams */;
}

const UserGroupCard = ({
  name,
  category_count,
  user_count,
  locations,
  alias,
  searchParams,
  setSearchParams,
}: UserGroupCardProps) => {
  const {
    handleCardClick /* Event handler when the card is clicked */,
    isSelected /* State that defines whether the card is selected or not */,
  } = useUserGroupCard(alias, searchParams, setSearchParams);
  return (
    <div
      className={styles['user-group-card']}
      onClick={handleCardClick}
      style={{
        /* Change border and background when selected */
        border: isSelected
          ? `2px solid ${COLOR.brandBorderDefaultPrimary}`
          : '',
        backgroundColor: isSelected ? `${COLOR.backgroundHigh}` : '',
      }}
    >
      <div
        className={styles['card-content']}
        style={{
          /* Change padding when selected */
          padding: isSelected ? '14px' : '',
          paddingTop: isSelected ? '6px' : '',
          paddingRight: isSelected ? '6px' : '',
        }}
      >
        <div className={styles['header']}>
          <div className={styles['name']}>{name}</div>
          <div className={styles['counts']}>
            <div className={styles['count-box']}>
              <NotificationsActive width={24} height={24} />
              <div>{category_count}</div>
            </div>
            <div className={styles['count-box']}>
              <UserFill width={24} height={24} />
              <div>{user_count}</div>
            </div>
          </div>
        </div>
        <div className={styles['location']} title={locations}>
          <span>{t('common.assigned_location') + ': '}</span>
          {locations}
        </div>
      </div>
    </div>
  );
};

export default UserGroupCard;
