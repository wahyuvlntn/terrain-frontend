import { NotificationBellFill } from '@digital-twin/icons';
import { formatDate, t, translateMessageWithPredefinedKeys } from '@digital-twin/utils';
import { InfiniteData } from '@tanstack/react-query';
import { Fragment, useCallback, useEffect, useRef } from 'react';

import { COLOR } from '../../color';
import { InputDuration, Search } from '../../input';
import { getMidnightDate } from '../../layout/notification-hook';
import { Loading } from '../../others';
import { NotificationType } from './notification.api';
import { NotificationItem } from './notification-item';
import styles from './notification-list.module.scss';

type NotificationListProps = {
  notifications:
    | InfiniteData<{ notifications: NotificationType[]; isExtend: boolean }, unknown>
    | undefined;
  notifType: 'all' | 'unread';
  from: Date;
  to: Date;
  search: string;
  unreadNotificationCounts: number;
  incomingNotifications: NotificationType[];
  incomingNotifCount: number;
  uniqueDt: Date[];
  isLoading: boolean;
  handleDateChange: (startDate: Date, endDate: Date) => void;
  handleReadUnread: (notifId: number, isRead: boolean) => void;
  handleSearchChange: (value: string) => void;
  handleReadAllNotif: () => void;
  handleTypeChange: (type: 'all' | 'unread') => void;
  fetchNextPage: () => void;
};

interface SwitchReadType {
  filterView: 'all' | 'unread' | null;
  setFilterView: (type: 'all' | 'unread' | null) => void;
}
export const SwitchReadType = ({ filterView, setFilterView }: SwitchReadType) => {
  return (
    <div className={styles['view-options']}>
      <div
        className={styles['option']}
        style={{
          backgroundColor:
            filterView === 'all' ? COLOR.brandSurfaceDefaultPrimary : COLOR.backgroundLow,
          opacity: filterView === 'all' ? 1 : 0.6,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
        }}
        onClick={() => {
          setFilterView('all');
        }}
      >
        <div>{t('common.all')}</div>
      </div>
      <div
        className={styles['option']}
        style={{
          backgroundColor:
            filterView === 'unread' ? COLOR.brandSurfaceDefaultPrimary : COLOR.backgroundLow,
          opacity: filterView === 'unread' ? 1 : 0.6,
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
        }}
        onClick={() => {
          setFilterView('unread');
        }}
      >
        <div>{t('common.unread')}</div>
      </div>
    </div>
  );
};

export const NotificationList = ({
  notifications,
  from,
  to,
  incomingNotifCount,
  incomingNotifications,
  isLoading,
  notifType,
  search,
  uniqueDt,
  unreadNotificationCounts,
  handleDateChange,
  handleReadUnread,
  handleReadAllNotif,
  handleTypeChange,
  handleSearchChange,
  fetchNextPage,
}: NotificationListProps) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const mappedNotif = notifications
    ? notifications.pages.map(({ notifications }) => {
        return notifications;
      })
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toDate = new Date(to);
  toDate.setHours(0, 0, 0, 0);

  const shouldIncludeIncoming = toDate.getTime() >= today.getTime();

  const combinedNotifications =
    shouldIncludeIncoming && search === ''
      ? [...incomingNotifications, ...mappedNotif.flat(1)]
      : [...mappedNotif.flat(1)];

  // Deduplicate notifications
  const deduplicatedNotifications = combinedNotifications.reduce(
    (acc: NotificationType[], current) => {
      const x = acc.find((item) => item.id === current.id);
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    },
    []
  );

  // Set up intersection observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && !isLoading) {
        fetchNextPage();
      }
    },
    [fetchNextPage, isLoading]
  );

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver(handleObserver, option);

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observerRef.current.observe(currentRef);
    }

    return () => {
      if (observerRef.current && currentRef) {
        observerRef.current.unobserve(currentRef);
      }
    };
  }, [handleObserver]);

  return (
    <div className={styles['notification-list']}>
      <div className={styles.arrow}></div>
      <div className={styles.header}>
        <div className={styles['title-unread']}>
          <div className={styles.title}>
            <NotificationBellFill />
            <h3>{t('common.notifications')}</h3>
          </div>
          <div className={styles.unread}>
            <span
              style={{
                cursor:
                  unreadNotificationCounts + incomingNotifCount === 0 ? 'not-allowed' : 'pointer',
                color: unreadNotificationCounts + incomingNotifCount === 0 ? '#607CA0' : undefined,
              }}
              onClick={handleReadAllNotif}
              color={'red'}
            >
              {t('common.mark_all_as_read')}{' '}
            </span>
            <h4>{(unreadNotificationCounts + incomingNotifCount).toString()}</h4>
          </div>
        </div>
        <div className={styles['notif-search']}>
          <Search
            placeholder={t('common.search')}
            value={search}
            onChange={handleSearchChange}
            width={'100%'}
          />
        </div>
        <div className={styles['date-filter']}>
          {
            <InputDuration
              triggerButtonClassName={notifType === 'unread' ? styles.custom_trigger : ''}
              label={t('common.period')}
              labelPosition={'left'}
              type="daterange"
              startDate={from}
              endDate={to}
              onChange={handleDateChange}
              triggerButtonStyle={{ width: 320 }}
            />
          }
          <SwitchReadType
            filterView={notifType}
            setFilterView={(type) => handleTypeChange(type!)}
          />
        </div>
      </div>
      <div className={styles.list} style={{ pointerEvents: isLoading ? 'none' : undefined }}>
        <Loading isLoading={isLoading} />
        {uniqueDt.map((dt, index) => {
          const notificationsForDate = deduplicatedNotifications.filter(
            (notification) => +getMidnightDate(notification.timestamp) === +dt
          );

          return (
            <Fragment key={+dt + index}>
              {<span className={styles.date}>{formatDate(dt)}</span>}
              {notificationsForDate.map((notification, _notifIndex) => {
                const totalNotifications = deduplicatedNotifications.length;
                const currentGlobalIndex = deduplicatedNotifications.findIndex(
                  (n) => n.id === notification.id
                );
                const isTrigger = currentGlobalIndex === totalNotifications - 6;

                return (
                  <NotificationItem
                    key={notification.id}
                    itemRef={isTrigger ? loadMoreRef : null}
                    notifType={notifType}
                    {...notification}
                    message={translateMessageWithPredefinedKeys(notification.message)}
                    onClick={() => handleReadUnread(notification.id, notification.isRead)}
                    onLinkClick={(isRead: boolean) => {
                      if (!isRead) {
                        handleReadUnread(notification.id, notification.isRead);
                      }
                    }}
                  />
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};
