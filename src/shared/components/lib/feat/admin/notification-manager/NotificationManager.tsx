import MailingServerConfiguration from './components/MailingServerConfiguration';
import UserGroup from './components/UserGroup';
import UserGroupNotifSettings from './components/UserGroupNotifSettings';
import { useNotificationManager } from './NotificationManager.hooks';
import styles from './styles.module.scss';

const NotificationManager = () => {
  const {
    notificationAlias /* Notification alias */,
    searchParams /* searchParams */,
    setSearchParams /* setSearchParams */,
    userGroupsQuery /* User group data */,
    isFetchingUserGroups /* Fetching state user group data */,
    refetchUserGroups /* Refetch user groups */,
    selectedGroupName /* Currently selected user group name */,
  } = useNotificationManager();
  return (
    <div className={styles['notification-manager']}>
      {/* Mailing Server Configuration */}
      <MailingServerConfiguration notificationAlias={notificationAlias} />
      {/* User Group */}
      <UserGroup
        notificationAlias={notificationAlias}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        userGroupsQuery={userGroupsQuery}
        isFetchingUserGroups={isFetchingUserGroups}
      />
      {/* User Group Notification Settings */}
      <UserGroupNotifSettings
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        notificationAlias={notificationAlias}
        refetchUserGroups={refetchUserGroups}
        selectedGroupName={selectedGroupName}
      />
    </div>
  );
};

export default NotificationManager;
