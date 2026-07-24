import { ImagePlaceholder } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import { useContext, useId, useMemo } from 'react';

import { ThemeContext } from '../../../theme-editor';
import { ReactComponent as CloudUploadFill } from '../icons/cloud-upload-fill.svg';
import { ReactComponent as TrashDeleteFill } from '../icons/trash-delete-fill.svg';
import { EquipmentImageType } from '../schemas';
import style from './equipment-image.module.scss';

export const EquipmentImage = ({
  value,
  onChange,
  alias,
  isAdd,
  height,
  width,
  className,
  imageColor = 'dark',
}: {
  value: EquipmentImageType;
  onChange?: (value: EquipmentImageType) => void;
  alias?: string;
  isAdd?: boolean;
  height?: string | number;
  width?: string | number;
  className?: string;
  imageColor?: 'default' | 'dark';
}) => {
  // Generate id for the file input
  const id = useId();

  const {
    colors: { backgroundLowest, backgroundLow },
  } = useContext(ThemeContext);

  const placeholder = useMemo(
    () =>
      imageColor === 'default'
        ? ImagePlaceholder(backgroundLow)
        : ImagePlaceholder(backgroundLowest),
    [imageColor, backgroundLowest, backgroundLow]
  );

  return (
    <div
      className={clsx(
        style['equipment-image'],
        !isAdd && !alias && style['equipment-image--no-data'],
        className
      )}
      style={{ height, width }}
    >
      <img
        alt={alias || 'equipment_image'}
        src={((isAdd || alias) && value.path) || placeholder}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = placeholder;
        }}
      />
      {onChange ? (
        <div className={style['equipment-image__actions']}>
          <label htmlFor={id}>
            <CloudUploadFill
              className={style['equipment-image__actions__upload']}
            />
            <input
              className={style['equipment-image__actions__input-file']}
              value=""
              onChange={async (e) => {
                const file = e.target.files?.[0];

                if (file) {
                  if (
                    !['image/jpg', 'image/jpeg', 'image/png'].includes(
                      file.type
                    )
                  ) {
                    toast.info(t('accepted_formats') + ': JPG/JPEG/PNG', {
                      toastId: 'invalid_image_file',
                    });
                    return;
                  }

                  if (file.size > 4 * 1024 * 1024) {
                    toast.error(
                      t('file_size_is_too_large_maximum_size_is', '4'),
                      {
                        toastId: 'invalid_image_file',
                      }
                    );
                    return;
                  }

                  // Create an instance of a FileReader
                  const reader = new FileReader();

                  // Convert the image file to URL
                  reader.readAsDataURL(file);

                  // Wait until the process is done
                  await new Promise((resolve) => {
                    reader.addEventListener(
                      'load',
                      () => {
                        onChange({ file, path: reader.result as string });
                        resolve(null);
                      },
                      false
                    );
                  });
                }
              }}
              id={id}
              type="file"
              accept="image/jpg,image/jpeg,image/png"
            />
          </label>
          {value.path == null ? null : (
            <TrashDeleteFill
              className={style['equipment-image__actions__delete']}
              onClick={(e) => {
                e.stopPropagation();
                onChange({ path: null, file: null });
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
};
