import {
  ImagePlaceholder,
  SettingsPreferences as SettingPreferencesIcon,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { useContext } from 'react';

import { FileInput } from '../../../../../input/file-input';
import { Drawer, Input, Loading, ThemeContext } from '../../../../../../index';
import { LocationDetailsType, TreeNode } from '../api/location-manager';
import { useAddLocation } from './add-location-form.hooks';
import styles from './add-location-form.module.scss';

interface LocationFormProps {
  open: boolean;
  locationDetails: LocationDetailsType | null | undefined;
  selectedLocationNode: string | null;
  onClose: () => void;
  addLocationClickHandler: () => void;
  refetchLocation: (
    options?: RefetchOptions | undefined
  ) => Promise<QueryObserverResult<TreeNode[] | null, Error>>;
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AddLocationForm({
  open,
  selectedLocationNode,
  locationDetails,
  onClose,
  addLocationClickHandler,
  refetchLocation,
  setExpandedItems,
}: LocationFormProps) {
  const {
    colors: { backgroundLow },
  } = useContext(ThemeContext);

  const { control, handleFormSubmit, isPending, watchedLocationImage } =
    useAddLocation(
      selectedLocationNode,
      addLocationClickHandler,
      refetchLocation,
      locationDetails,
      setExpandedItems,
      open
    );

  return (
    <Drawer
      submitting={isPending}
      title={t('common.add_location')}
      icon={<SettingPreferencesIcon />}
      open={open}
      onClose={onClose}
      onSubmit={handleFormSubmit}
      background="dark"
    >
      <Loading isLoading={isPending} />
      <div className={styles['add-form-container']}>
        <Input
          readOnly
          registered="parentLocation"
          control={control}
          type={'string'}
          label={t('common.parent_location')}
          background="dark"
        />
        <Input
          registered="locationName"
          control={control}
          type={'string'}
          label={t('common.location_name')}
          background="dark"
        />
        <FileInput
          label={t('common.location_image')}
          accept="image/png,image/jpeg,image/jpg"
          control={control}
          registered="locationImage"
        />
        <span className={styles['upload-max-size']}>Max. Size (4Mb)</span>
        {watchedLocationImage && (
          <div className={styles['location-image-container']}>
            <img
              src={URL.createObjectURL(watchedLocationImage)}
              alt="image_location"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = ImagePlaceholder(backgroundLow);
              }}
            ></img>
          </div>
        )}

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
