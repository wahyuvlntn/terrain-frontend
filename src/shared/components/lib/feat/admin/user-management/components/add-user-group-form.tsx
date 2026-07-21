/* eslint-disable simple-import-sort/imports */
import { Drawer, Input, Loading, TextBox } from '@digital-twin/components';
import { ChevronDownFill, SettingsPreferences } from '@digital-twin/icons';
import { Controller } from 'react-hook-form';

import { t } from '@digital-twin/utils';
import { useAddUserGroupForm } from './add-user-group-form.hooks';
import styles from './add-user-group-form.module.scss';
import LocationSelector from './location-selector';

const AddUserGroupForm = (props: { open: boolean; onClose: () => void }) => {
  const {
    openLocation,
    setOpenLocation,
    locations,
    locationTreeQuery,
    control,
    onSubmit,
    handleSubmit,
    description,
    setDescription,
    descWatcher,
    handleSaveLocation,
    locationRect,
    locationFieldRef,
    onLocSearchChange,
    locSearch,
  } = useAddUserGroupForm(props.onClose, props.open);

  return (
    <Drawer
      title={t('common.add_user_group')}
      open={props.open}
      icon={<SettingsPreferences />}
      onClose={props.onClose}
      onSubmit={handleSubmit(onSubmit)}
      variant="add"
      background="dark"
    >
      <div
        className={styles['add-user-group']}
        onClick={() => {
          setOpenLocation(false);
        }}
      >
        <div className={styles['field-group']}>
          {/* User group name input */}
          <div className={styles['form-group']}>
            <div>{t('common.user_group_name')}</div>
            <Input
              control={control}
              registered="name"
              wrapperProps={{ className: styles['input'] }}
              background={'default'}
            />
          </div>
          {/* User group alias (or user group ID from user's POV) input */}
          <div className={styles['form-group']}>
            <div>{t('common.user_group') + ' ID'}</div>
            <Input
              control={control}
              registered="alias"
              wrapperProps={{ className: styles['input'] }}
              background={'default'}
            />
          </div>
        </div>
        {/* Assigned location field */}
        <div className={styles['form-group']}>
          <div>{t('common.assigned_location')}</div>
          <div
            onClick={(e) => {
              e.stopPropagation();
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
                {locations.map(
                  (l, index) =>
                    `${l.label}${
                      index === locations.length - 1 ? '' : ';'
                    }     `
                )}
              </div>
              <ChevronDownFill width={'1.25em'} />
            </div>
          </div>
          {/* Location selector popup */}
        </div>
        {/* User group description */}
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
                /* Allow to change the field when the length doesn't exceed the limit. */
                onChange={(e) => {
                  if (e.target.value.length <= 160) {
                    setDescription(e.target.value);
                  }
                }}
                background={'default'}
              />
            )}
          />
          {/* Length limit of user group's description */}
          <div className={styles['length-limit']}>
            {descWatcher.length} / 160
          </div>
        </div>
      </div>
      {openLocation && locationRect && (
        <div
          className={styles['dropdown-wrapper']}
          style={{
            top: locationRect.top + 42,
            // left: 32,
            width: locationRect.width - 16,
            height: locationTreeQuery.isFetching ? 100 : 'unset',
          }}
        >
          {locationTreeQuery.data && !locationTreeQuery.isFetching && (
            <LocationSelector
              onClose={() => {
                setOpenLocation(false);
              }}
              open={true}
              initialLocations={locations}
              handleSave={handleSaveLocation}
              locationTree={locationTreeQuery.data}
              search={locSearch}
              onSearchChange={onLocSearchChange}
            />
          )}
          <Loading isLoading={locationTreeQuery.isFetching} />
        </div>
      )}
    </Drawer>
  );
};

export default AddUserGroupForm;
