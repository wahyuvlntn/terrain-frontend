/* eslint-disable simple-import-sort/imports */
import { COLOR, Container } from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import styles from '../styles.module.scss';
import {
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProduct as Tab,
  TabProvider,
} from '@digital-twin/reusables';
import { useUserGroupNotifSettings } from './UserGroupNotifSettings.hooks';
import { SetURLSearchParams } from 'react-router-dom';
import {
  NotificationSettingsFill,
  ThreePFill,
  UserGroupFill,
} from '@digital-twin/icons';
import CategoryTab from './CategoryTab';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { UserGroupsType } from '../api/GetUserGroups';
import NotifiedUser from './NotifiedUser';

interface UserGroupNotifSettingsProps {
  searchParams: URLSearchParams /* searchParams */;
  setSearchParams: SetURLSearchParams /* setSearchParams */;
  notificationAlias: string /* Notification alias */;
  refetchUserGroups: (
    options?: RefetchOptions
  ) => Promise<
    QueryObserverResult<UserGroupsType[], Error>
  > /* Refetch user groups */;
  selectedGroupName: string /* Currently selected user group name */;
}

const UserGroupNotifSettings = ({
  searchParams,
  setSearchParams,
  notificationAlias,
  refetchUserGroups,
  selectedGroupName,
}: UserGroupNotifSettingsProps) => {
  const {
    tabValue /* Selected tab id in settings container */,
    handletTabChange /* Tab change handler */,
  } = useUserGroupNotifSettings(searchParams, setSearchParams);
  return (
    <Container
      title={
        selectedGroupName
        // 'Mailing Server Configuration'
      }
      icon={<UserGroupFill style={{ width: 24, height: 24 }} />}
      className={styles['user-group-notif-settings']}
      contentWrapperProps={{
        style: {
          backgroundColor: COLOR.backgroundLow,
        },
      }}
    >
      <TabProvider
        value={tabValue}
        className={styles['tab-provider']}
        onChange={handletTabChange}
      >
        <TabList className={styles['tab-list']}>
          <Tab
            className={styles['tab']}
            value="category"
            icon={<NotificationSettingsFill />}
            label={t('common.category')}
          />
          <Tab
            className={styles['tab']}
            value="notified_user"
            icon={<ThreePFill />}
            label={t('common.notified_user')}
          />
        </TabList>
        {/* Tab category */}
        <TabPanel
          value="category"
          style={{
            display: 'flex',
            height: '100%',
            paddingTop: '16px',
            background: COLOR.backgroundDefault,
            borderTopRightRadius: '8px',
          }}
        >
          <CategoryTab
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            notificationAlias={notificationAlias}
            refetchUserGroups={refetchUserGroups}
          />
        </TabPanel>
        {/* Tab notified users */}
        <TabPanel
          value="notified_user"
          style={{ display: 'flex', height: '100%', padding: 0 }}
        >
          <NotifiedUser
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            refetchUserGroups={refetchUserGroups}
          />
        </TabPanel>
      </TabProvider>
    </Container>
  );
};

export default UserGroupNotifSettings;
