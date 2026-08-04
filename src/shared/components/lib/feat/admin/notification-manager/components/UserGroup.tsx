/* eslint-disable simple-import-sort/imports */
import { COLOR, Container, Dropdown, Loading, Search } from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import styles from '../styles.module.scss';
import { useUserGroup } from './UserGroup.hooks';
import UserGroupCard from './UserGroupCard';
import { SetURLSearchParams } from 'react-router-dom';
import { UserGroupsType } from '../api/GetUserGroups';
import { UserGroupFill } from '@digital-twin/icons';

interface UserGroupProps {
  notificationAlias: string /* Notification alias */;
  searchParams: URLSearchParams /* searchParams */;
  setSearchParams: SetURLSearchParams /* setSearchParams */;
  userGroupsQuery: UserGroupsType[] | undefined /* User group data */;
  isFetchingUserGroups: boolean /* Fetching state user group data */;
}

const UserGroup = ({
  searchParams,
  setSearchParams,
  userGroupsQuery,
  isFetchingUserGroups,
}: UserGroupProps) => {
  const {
    locationOptions /* Options for location selection dropdown */,
    dropdownLocationValue /* Location dropdown value */,
    handleLocationChange,
  } = useUserGroup(searchParams, setSearchParams, userGroupsQuery);
  return (
    <Container
      title={
        t('common.user_group')
        // 'Mailing Server Configuration'
      }
      icon={<UserGroupFill style={{ width: 24, height: 24 }} />}
      className={styles['user-group']}
      contentWrapperProps={{
        style: {
          backgroundColor: COLOR.backgroundLow,
        },
      }}
    >
      <div className={styles['user-group-content']}>
        {/* Search bar and location filter */}
        <div className={styles['search-and-filter']}>
          <Search
            wrapperClassName={styles['search']}
            background="dark"
            placeholder="Search..."
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
          <Dropdown
            wrapperStyles={{ width: 146 }}
            background="dark"
            options={locationOptions}
            value={dropdownLocationValue}
            onChange={handleLocationChange}
          />
        </div>
        <div className={styles['user-groups']}>
          <Loading isLoading={isFetchingUserGroups} />
          {/* Map the user groups to UserGroupCard component */}
          {userGroupsQuery?.map((ug) => (
            <UserGroupCard
              name={ug.name}
              category_count={ug.category_count}
              user_count={ug.user_count}
              locations={ug.locations}
              alias={ug.alias}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
            />
          ))}
        </div>
      </div>
    </Container>
  );
};

export default UserGroup;
