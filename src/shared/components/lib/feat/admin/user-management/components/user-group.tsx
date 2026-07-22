/* eslint-disable simple-import-sort/imports */
import { Plus, SortAscending, SortDefault, SortDescending } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';

import { Button, Search } from '../../../../input';
import AddUserForm from './add-user-form';
import AddUserGroupForm from './add-user-group-form';
import { useUserGroup } from './user-group.hooks';
import styles from './user-group.module.scss';
import UserGroupDropdown from './user-group-dropdown';
import { Loading } from '../../../../others';

const UserGroup = (props: {
  selected: {
    type: string;
    value: string | null;
  };
  setSelected: React.Dispatch<
    React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  >;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  ascendingUg: boolean | null;
  setAscendingUg: React.Dispatch<React.SetStateAction<boolean | null>>;
  ascendingLoc: boolean | null;
  setAscendingLoc: React.Dispatch<React.SetStateAction<boolean | null>>;
}) => {
  const {
    userGroups,
    isLoading,
    openAddUserDrawer,
    setOpenAddUserDrawer,
    openAddUserGroupDrawer,
    setOpenAddUserGroupDrawer,
  } = useUserGroup(props);

  return (
    <div className={styles['content']}>
      <div className={styles['filter-and-button']}>
        <div className={styles['filter']}>
          <Search
            placeholder={t('common.search')}
            value={props.searchValue}
            onChange={(e) => props.setSearchValue(e)}
            width={235}
            background={'dark'}
          />
        </div>
        <Button
          className={styles['add-btn']}
          color={'default-secondary'}
          onClick={(e) => {
            e.stopPropagation();
            props.selected.value === null
              ? setOpenAddUserGroupDrawer(true)
              : setOpenAddUserDrawer(true);
          }}
        >
          <Plus />
          <div>{t('common.add')}</div>
        </Button>
      </div>
      <div className={styles['user-group-placeholder']}>
        <Loading isLoading={isLoading} />
        <div
          className={styles['user-group-inner-placeholder']}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles['user-group-row-header']}>
            <div>
              <div>{t('common.user_group')}</div>
              {props.ascendingUg === true && (
                <SortAscending
                  onClick={() => {
                    props.setAscendingUg(false);
                    props.setAscendingLoc(null);
                  }}
                  className={styles['sort-icon']}
                />
              )}
              {props.ascendingUg === false && (
                <SortDescending
                  onClick={() => {
                    props.setAscendingUg(null);
                    props.setAscendingLoc(null);
                  }}
                  className={styles['sort-icon']}
                />
              )}
              {props.ascendingUg === null && (
                <SortDefault
                  onClick={() => {
                    props.setAscendingUg(true);
                    props.setAscendingLoc(null);
                  }}
                  className={styles['sort-icon']}
                />
              )}
            </div>
            <div>
              <div>{t('common.location')}</div>
              {props.ascendingLoc === true && (
                <SortAscending
                  onClick={() => {
                    props.setAscendingLoc(false);
                    props.setAscendingUg(null);
                  }}
                  className={styles['sort-icon']}
                />
              )}
              {props.ascendingLoc === false && (
                <SortDescending
                  onClick={() => {
                    props.setAscendingLoc(null);
                    props.setAscendingUg(null);
                  }}
                  className={styles['sort-icon']}
                />
              )}
              {props.ascendingLoc === null && (
                <SortDefault
                  onClick={() => {
                    props.setAscendingLoc(true);
                    props.setAscendingUg(null);
                  }}
                  className={styles['sort-icon']}
                />
              )}
            </div>
          </div>
          {!isLoading
            ? /* Map the user groups to user group dropdown components */
              userGroups?.map((userGroup, key) => (
                <div key={key} className={styles['user-group']}>
                  <UserGroupDropdown
                    userGroupName={userGroup.name}
                    userGroupAlias={userGroup.alias}
                    locations={userGroup.locations}
                    selected={props.selected}
                    setSelected={props.setSelected}
                  />
                </div>
              ))
            : ''}
        </div>
      </div>
      <AddUserGroupForm
        open={openAddUserGroupDrawer}
        onClose={() => {
          setOpenAddUserDrawer(false);
          setOpenAddUserGroupDrawer(false);
        }}
      />
      <AddUserForm
        open={openAddUserDrawer}
        onClose={() => {
          setOpenAddUserDrawer(false);
          setOpenAddUserGroupDrawer(false);
        }}
        userGroupAlias={props.selected.value}
      />
    </div>
  );
};

export default UserGroup;
