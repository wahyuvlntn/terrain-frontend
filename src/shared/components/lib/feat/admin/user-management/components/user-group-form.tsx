/* eslint-disable simple-import-sort/imports */
import { Loading, PopupDelete } from '@digital-twin/components';
import {
  ChevronDownFill,
  SaveFill,
  TrashDeleteFill,
  UserGroupFill,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { Controller } from 'react-hook-form';

import { Button, Input, TextBox } from '../../../../input';
import { useUserGroupForm } from './user-group-form.hooks';
import styles from './user-group-form.module.scss';
import LocationSelector from './location-selector';
import { SelectedLocations, TreeNode } from './type';
import { useCallback, useEffect, useMemo, useState } from 'react';

const UserGroupForm = (props: {
  alias: string;
  setSelected: React.Dispatch<
    React.SetStateAction<{
      type: string;
      value: string | null;
    }>
  >;
}) => {
  const {
    openLocation,
    setOpenLocation,
    userGroupDetails,
    openPopupDelete,
    setOpenPopupDelete,
    handleDelete,
    control,
    locations,
    handleSaveLocation,
    handleSubmit,
    onSubmit,
    descWatcher,
    description,
    setDescription,
    locationTreeQuery,
    locationFieldRef,
    locationRect,
    locSearch,
    onLocSearchChange,
    isFetchingUserGroupDetails,
  } = useUserGroupForm(props.alias, props.setSelected);

  const [view, setView] = useState(true);

  useEffect(() => {
    setView(false);
  }, [JSON.stringify(userGroupDetails)]);

  useEffect(() => {
    if (!view) {
      setTimeout(() => {
        setView(true);
      }, 500);
    }
  }, [view]);

  return (
    <>
      <div className={styles['title-container']}>
        <div className={styles['title']}>
          <UserGroupFill />
          <div>{t('common.user_group_details')}</div>
        </div>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={styles['user-group-form']}
      >
        <div className={styles['forms']}>
          <div className={styles['field-group']}>
            {/* User group field */}
            <div className={styles['form-group']}>
              <div>{t('common.user_group_name')}</div>
              <Input
                control={control}
                registered="name"
                wrapperProps={{ className: styles['input'] }}
                background={'default'}
                // disabled={
                //   props.alias === 'technician' || props.alias === 'supervisor'
                // }
              />
            </div>
            {/* User group id field */}
            <div className={styles['form-group']}>
              <div>{t('common.user_group') + ' ID'}</div>
              <Input
                control={control}
                registered="alias"
                wrapperProps={{ className: styles['input'] }}
                readOnly
                background={'default'}
                // disabled={
                //   props.alias === 'technician' || props.alias === 'supervisor'
                // }
              />
            </div>
          </div>
          {/* Assigned location field */}
          {
            <div className={styles['form-group']}>
              <div>{t('common.assigned_location')}</div>
              <div
                onClick={() => {
                  setOpenLocation((prev) => !prev);
                }}
                style={{
                  display: 'flex',
                  alignSelf: 'stretch',
                  cursor: 'pointer',
                }}
                ref={locationFieldRef}
              >
                {/* Mapping the selected locations into the field */}
                <div className={styles['locations-input']}>
                  <div>
                    {locations?.map(
                      (l, index) =>
                        `${l.label}${
                          index === locations.length - 1 ? '' : ';'
                        }     `
                    )}
                  </div>
                  <ChevronDownFill width={'1.25em'} />
                </div>
              </div>
            </div>
          }
          {/* User group description field */}
          <div className={styles['form-group']}>
            <div>{t('common.description')}</div>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextBox
                  wrapperClassName={styles['input']}
                  {...field}
                  rows={5}
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= 160) {
                      setDescription(e.target.value);
                    }
                  }}
                  background={'default'}
                  // disabled={
                  //   props.alias === 'technician' || props.alias === 'supervisor'
                  // }
                />
              )}
            />
            {/* User group description length limit */}
            <div className={styles['length-limit']}>
              {descWatcher.length} / 160
            </div>
          </div>
        </div>
        <div className={styles['buttons']}>
          {/* Delete button */}
          {props.alias === 'technician' || props.alias === 'supervisor' ? (
            <div />
          ) : (
            <Button
              color="error"
              icon={<TrashDeleteFill />}
              onClick={(e) => {
                e.preventDefault();
                setOpenPopupDelete(true);
              }}
            >
              {t('common.delete')}
            </Button>
          )}
          <div className={styles['right-side']}>
            {/* Cancel button */}
            <Button
              color="default-secondary"
              onClick={(e) => {
                e.preventDefault();
                props.setSelected({
                  type: '',
                  value: null,
                });
              }}
            >
              {t('common.cancel')}
            </Button>
            {/* Save button */}
            {
              <Button color="default-primary" icon={<SaveFill />} type="submit">
                {t('common.save')}
              </Button>
            }
          </div>
        </div>
      </form>
      <PopupDelete
        entityType="User Group"
        entityName={userGroupDetails ? userGroupDetails.name : ''}
        open={openPopupDelete}
        onClose={() => setOpenPopupDelete(false)}
        onDelete={handleDelete}
      />
      {locations && locationTreeQuery.data && view && (
        <LocationSelectorWrapper
          onClose={() => {
            setOpenLocation(false);
          }}
          locations={locations}
          handleSave={handleSaveLocation}
          locationTree={locationTreeQuery.data}
          search={locSearch}
          onSearchChange={onLocSearchChange}
          isLoading={locationTreeQuery.isFetching}
          open={openLocation}
          locationRect={locationRect}
          userGroupAlias={userGroupDetails?.alias || ''}
          key={userGroupDetails?.alias || ''}
        />
      )}
    </>
  );
};

const LocationSelectorWrapper = ({
  onClose,
  locations,
  handleSave,
  locationTree,
  search,
  onSearchChange,
  isLoading,
  open,
  locationRect,
  userGroupAlias,
}: {
  onClose: () => void;
  locations: SelectedLocations[];
  handleSave: (locations: SelectedLocations[]) => void;
  locationTree: TreeNode[];
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  open: boolean;
  locationRect: DOMRect | null;
  userGroupAlias: string;
}) => {
  const expandLocationsWithChildren = useCallback(
    (
      selectedLocations: SelectedLocations[],
      treeData: TreeNode[]
    ): SelectedLocations[] => {
      const expandedLocations: SelectedLocations[] = [...selectedLocations];
      const expandedIds = new Set<string>(selectedLocations.map((l) => l.id));

      const addChildrenToSet = (nodes: TreeNode[]): void => {
        for (const node of nodes) {
          if (expandedIds.has(node.id) && node.children) {
            const traverseChildren = (children: TreeNode[]): void => {
              for (const child of children) {
                if (!expandedIds.has(child.id)) {
                  expandedIds.add(child.id);
                  expandedLocations.push({ id: child.id, label: child.label });
                }
                if (child.children) {
                  traverseChildren(child.children);
                }
              }
            };
            traverseChildren(node.children);
          }
          if (node.children) {
            addChildrenToSet(node.children);
          }
        }
      };

      addChildrenToSet(treeData);
      return expandedLocations;
    },
    []
  );

  const [initialLocations, setInitialLocations] = useState<SelectedLocations[]>(
    []
  );

  useEffect(() => {
    if (locationTree && locations && locations.length > 0) {
      setInitialLocations(expandLocationsWithChildren(locations, locationTree));
    }
  }, [userGroupAlias]);

  if (!locationTree || isLoading) {
    return null;
  }

  return (
    locationRect &&
    open && (
      <div
        className={styles['dropdown-wrapper']}
        style={{
          top: locationRect.top + 42,
          left: locationRect.left,
          width: locationRect.width - 16,
          height: isLoading ? 100 : 'unset',
        }}
      >
        <LocationSelector
          onClose={() => {
            onClose();
            setInitialLocations(locations);
          }}
          open={true}
          initialLocations={initialLocations}
          handleSave={handleSave}
          locationTree={locationTree}
          search={search}
          onSearchChange={onSearchChange}
        />
        <Loading isLoading={isLoading} />
      </div>
    )
  );
};

export default UserGroupForm;
