import {
  ImagePlaceholder,
  MapFill,
  SettingsPreferences as SettingPreferencesIcon,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { useContext } from 'react';
import { Controller } from 'react-hook-form';

import { FileInput } from '../../../../../input/file-input';
import {
  Drawer,
  Dropdown,
  Input,
  Loading,
  LocationTreeInput,
  ThemeContext,
} from '../../../../../../index';
import { LocationDetailsType, TreeNode } from '../api/location-manager';
import { useEditLocation } from './edit-location-form.hooks';
import styles from './edit-location-form.module.scss';

interface EditLocationFormProps {
  open: boolean;
  expandedItems: string[];
  locationDetails: LocationDetailsType | null | undefined;
  editLocationClickHandler: () => void;
  onClose: () => void;
  refetchLocation: (
    options?: RefetchOptions | undefined
  ) => Promise<QueryObserverResult<TreeNode[] | null, Error>>;
  selectedLocationNode: string | null;
}

export default function EditLocationForm({
  open,
  expandedItems,
  locationDetails,
  selectedLocationNode,
  editLocationClickHandler,
  onClose,
  refetchLocation,
}: EditLocationFormProps) {
  const {
    colors: { backgroundLow },
  } = useContext(ThemeContext);

  const {
    control,
    flatLocationTree,
    showLocationSelection,
    isPending,
    previewImage,
    getValues,
    handleLocationSelection,
    handleSaveLocationSelection,
    handleFormSubmit,
    setShowLocationSeletion,
  } = useEditLocation(
    locationDetails,
    refetchLocation,
    editLocationClickHandler,
    open,
    selectedLocationNode
  );

  return (
    <Drawer
      title={t('common.edit_location')}
      submitting={isPending}
      icon={<SettingPreferencesIcon />}
      open={open}
      onClose={onClose}
      onSubmit={handleFormSubmit}
      background="dark"
    >
      <Loading isLoading={isPending} />
      <div className={styles['edit-form-container']}>
        {
          <LocationTreeInput
            title={t('common.location')}
            icon={<MapFill />}
            onSave={() => {
              handleSaveLocationSelection();
              setShowLocationSeletion((prev) => !prev);
            }}
            onClose={() => {
              setShowLocationSeletion((prev) => !prev);
            }}
            locationId={locationDetails?.id}
            open={showLocationSelection}
            initialExpandedItems={expandedItems}
            initialSelectedNode={selectedLocationNode!}
            initialSelectedParent={
              getValues('parentId') ? getValues('parentId')?.toString() : '-1'
            }
            withMaster={
              locationDetails && locationDetails.parentId ? false : true
            }
          />
        }
        <Controller
          control={control}
          name={'parentId'}
          render={({ field: { onChange, value, ...field } }) => {
            return (
              <Dropdown
                searchable
                label={t('common.parent_location') + ':'}
                background="dark"
                readOnly
                options={[
                  ...flatLocationTree,
                  { value: '-1', label: t('common.location') },
                ]}
                onChange={(e) => {
                  onChange(+e);
                }}
                wrapperStyles={{ width: '100%' }}
                wrapperClassName={styles['input']}
                disabled
                onArrowClick={handleLocationSelection}
                value={value !== null ? value.toString() : undefined}
                {...field}
              />
            );
          }}
        />
        <Input
          registered="locationName"
          control={control}
          type={'string'}
          label={t('common.location_name')}
          background={'dark'}
        />
        <FileInput
          label={t('common.location_image') + ':'}
          accept="image/png"
          control={control}
          registered="locationImage"
        />
        <span className={styles['upload-max-size']}>Max. Size (4Mb)</span>
        <div className={styles['location-image-container']}>
          <img
            src={
              previewImage
                ? `data:image/png;base64,${previewImage}`
                : `${window.location.origin}${locationDetails?.locationImagePath}`
            }
            alt="location"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = ImagePlaceholder(backgroundLow);
            }}
          ></img>
        </div>

        {/* <div className={styles['threshold-config-container']}>
          <div className={styles.header}>
            <PieBarChart />
            <span>{t('common.oee_thresholds')}</span>
          </div>
          <div className={styles['oee-item']}>
            <span>{t('common.availability')}</span>
            <Input
              suffix={'%'}
              wrapperProps={{ style: { width: '100%' } }}
              control={control}
              registered="availabilityTh"
              type="number"
              background={'dark'}
            />
          </div>
          <div className={styles['oee-item']}>
            <span>{t('common.performance')}</span>
            <Input
              suffix={'%'}
              wrapperProps={{ style: { width: '100%' } }}
              control={control}
              registered="performanceTh"
              type="number"
              background={'dark'}
            />
          </div>
          <div className={styles['oee-item']}>
            <span>{t('common.quality')}</span>
            <Input
              suffix={'%'}
              wrapperProps={{ style: { width: '100%' } }}
              control={control}
              registered="qualityTh"
              type="number"
              background={'dark'}
            />
          </div>
        </div> */}
      </div>
    </Drawer>
  );
}
