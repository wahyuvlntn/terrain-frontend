/* eslint-disable simple-import-sort/imports */
import { Button, Search, Table } from '@digital-twin/components';
import styles from '../styles.module.scss';
import { SetURLSearchParams } from 'react-router-dom';
import { useNotifiedUser } from './NotifiedUser.hooks';
import { t } from '@digital-twin/utils';
import { SaveFill } from '@digital-twin/icons';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { UserGroupsType } from '../api/GetUserGroups';

interface NotifiedUserProps {
  searchParams: URLSearchParams /* searchParams */;
  setSearchParams: SetURLSearchParams /* setSearchParams */;
  refetchUserGroups: (
    options?: RefetchOptions
  ) => Promise<
    QueryObserverResult<UserGroupsType[], Error>
  > /* Refetch user groups */;
}

const NotifiedUser = ({
  searchParams,
  setSearchParams,
  refetchUserGroups,
}: NotifiedUserProps) => {
  const {
    userTableColumn /* user table column */,
    rows /* user table rows */,
    notifiedUsersQuery /* User notified data */,
    selectedUsersCount,
    handleSortColumn /* Handler for sorting table */,
    handleSubmitNotifiedUsers /* Handler for submitting notified users */,
    hasUpdatePermission /* User update permission */,
  } = useNotifiedUser(searchParams, refetchUserGroups);
  return (
    <div className={styles['notified-user']}>
      {/* Search bar */}
      <Search
        background="dark"
        width={'100%'}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        searchParamsPrefix="user-"
        placeholder="Search..."
      />
      {/* User and selected count */}
      <div className={styles['user-and-selected-count']}>
        <div>
          {notifiedUsersQuery?.length || 0} {t('common.users')}
        </div>
        <div>
          {selectedUsersCount} {t('common.selected')}
        </div>
      </div>
      {/* User table */}
      <div className={styles['user-table']}>
        <Table
          columns={userTableColumn}
          rows={rows || []}
          sortable={true}
          handleSortColumn={handleSortColumn}
        />
      </div>
      <div className={styles['save-button']}>
        {hasUpdatePermission && (
          <Button
            color="default-primary"
            icon={<SaveFill />}
            type="submit"
            onClick={handleSubmitNotifiedUsers}
          >
            {t('common.save')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default NotifiedUser;
