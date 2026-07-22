/* eslint-disable simple-import-sort/imports */
import {
  ChevronDownFill,
  ChevronRightFill,
  UserCircle,
  UserGroupFill,
} from '@digital-twin/icons';
import clsx from 'clsx';

import { COLOR } from '../../../../color';
import { useUserGroupDropdown } from './user-group-dropdown.hooks';
import styles from './user-group-dropdown.module.scss';
import { SelectedLocations } from './type';

const UserGroupDropdown = (props: {
  userGroupName: string;
  userGroupAlias: string;
  locations: SelectedLocations[];
  selected: {
    type: string;
    value: string | null;
  };
  setSelected: (
    value: React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  ) => void;
}) => {
  const { open, setOpen, users, isLoading } = useUserGroupDropdown(
    props.userGroupAlias
  );
  return (
    <>
      <div
        className={styles['user-group-row']}
        onClick={() =>
          props.setSelected({
            type: 'USER_GROUP',
            value: props.userGroupAlias,
          })
        }
      >
        <div
          className={clsx(
            styles['user-group-dropdown'],
            props.selected.type === 'USER_GROUP' &&
              props.userGroupAlias === props.selected.value &&
              styles['user-group-dropdown--active']
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          {users?.length === 0 ? (
            <svg width="24" height="24" viewBox="0 0 24 24"></svg>
          ) : open ? (
            <ChevronDownFill color={COLOR.neutralTextTitleHeading} />
          ) : (
            <ChevronRightFill color={COLOR.neutralTextTitleHeading} />
          )}
          <UserGroupFill color={COLOR.neutralTextTitleHeading} />
          <span title={props.userGroupName}>{props.userGroupName}</span>
        </div>
        <div
          onClick={() => setOpen((prev) => !prev)}
          className={clsx(
            styles['location'],
            props.selected.type === 'USER_GROUP' &&
              props.userGroupAlias === props.selected.value &&
              styles['location--active']
          )}
        >
          {/* Map the locations. If it is the last index, don't add semicolon */}
          <span>
            {props.locations.map(
              (l, index) =>
                `${l.label}${
                  index === props.locations.length - 1 ? '' : ';'
                }     `
            )}
          </span>
        </div>
      </div>
      {open &&
        (!isLoading ? (
          users?.map((user) => (
            <div
              className={styles['user-row']}
              onClick={() =>
                props.setSelected({
                  type: 'USER',
                  value: user.username,
                })
              }
            >
              <div
                className={clsx(
                  styles['user-dropdown'],
                  props.selected.type === 'USER' &&
                    user.username === props.selected.value &&
                    styles['user-dropdown--active']
                )}
              >
                <UserCircle />
                <span title={user.name}>{user.name}</span>
              </div>
              {/* <div
                style={{
                  backgroundColor:
                    props.selected.type === 'USER' &&
                    user.username === props.selected.value
                      ? COLOR.brandPrimary
                      : '',
                  color:
                    props.selected.type === 'USER' &&
                    user.username === props.selected.value
                      ? COLOR.neutralTextTitleHeading
                      : COLOR.neutralTextTitleHeading,
                  transition: 'background 0.2s ease-in-out',
                }}
                className={styles['location']}
              ></div> */}
            </div>
          ))
        ) : (
          <div>Loading...</div>
        ))}
    </>
  );
};

export default UserGroupDropdown;
