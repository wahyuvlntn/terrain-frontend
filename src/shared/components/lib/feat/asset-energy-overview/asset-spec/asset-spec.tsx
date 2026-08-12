import { CubeFill, ImagePlaceholder } from '@digital-twin/icons';
import { getURL, t } from '@digital-twin/utils';
import clsx from 'clsx';
import { useContext } from 'react';
import { Control, FormProvider, useFormContext } from 'react-hook-form';

import { Input, Loading, Popup, Table, ThemeContext } from '../../../../index';
import { UpdateSpec } from './asset-spec.api';
import { Column, SpecType, useAspectSpec } from './asset-spec.hook';
import styles from './asset-spec.module.scss';

type SpanTooltipProps = {
  value: string;
  onDoubleClick: () => void;
  width: number;
};

const SpanTooltip = ({ value, onDoubleClick, width }: SpanTooltipProps) => {
  return (
    <span
      className={clsx(styles['editable-span'], !value && styles.block)}
      onDoubleClick={onDoubleClick}
      title={value}
      style={{
        maxWidth: width,
        width: width,
        minWidth: width,
      }}
    >
      {value}
    </span>
  );
};

type EditableSpanProps<T extends SpecType, U extends Column> = {
  editMode: boolean;
  control: Control<UpdateSpec>;
  idx: number;
  type: T;
  subType: U;
  changeEditMode: (type: T, subType: U, idx: number, edit: boolean) => void;
  onSubmit: () => void;
  width: number;
};

export const EditableSpan = <T extends SpecType, U extends Column>({
  editMode,
  control,
  idx,
  subType,
  type,
  changeEditMode,
  onSubmit,
  width,
}: EditableSpanProps<T, U>) => {
  const { getValues } = useFormContext<UpdateSpec>();

  return editMode ? (
    <Input
      control={control}
      registered={`${type}.${idx}.${subType}`}
      wrapperProps={{
        className: styles['input-wrapper'],
      }}
      inputProps={{
        onBlur: () => {
          onSubmit();
          changeEditMode(type, subType, idx, false);
        },
      }}
    />
  ) : (
    <SpanTooltip
      width={width}
      value={getValues(`${type}.${idx}.${subType}`)}
      onDoubleClick={() => changeEditMode(type, subType, idx, true)}
    />
  );
};

type AssetSpecProps = {
  open: boolean;
  onClose: () => void;
  assetId: number;
};

export const AssetSpec = ({ open, onClose, assetId }: AssetSpecProps) => {
  const {
    colors: { backgroundLowest },
  } = useContext(ThemeContext);

  const {
    name,
    image,
    editMode,
    changeEditMode,
    control,
    fieldsCritical,
    fieldsSupporting,
    methods,
    onSubmit,
    isLoading,
  } = useAspectSpec(assetId, open);

  return (
    <Popup
      width={1137}
      title={name}
      icon={<CubeFill />}
      open={open}
      onClose={onClose}
      // background={'none-without-padding'}
      onSubmit={onSubmit}
    >
      <FormProvider {...methods}>
        <div className={styles['asset-spec']}>
          <Loading isLoading={isLoading} />
          <div className={styles['left-container']}>
            <img
              src={`${getURL()}${image}`}
              alt={name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = ImagePlaceholder(backgroundLowest);
              }}
            />
            <div className={styles.description}>
              <h3>{t('common.critical_information')}</h3>
              <Table
                hideTitle
                columns={[
                  { name: 'Context', key: 'aspect' },
                  { name: 'Information', key: 'information' },
                ]}
                rows={fieldsCritical.map((field, idx) => ({
                  id: field.id,
                  aspect: (
                    <EditableSpan
                      control={control}
                      idx={idx}
                      editMode={editMode.critical.get(`${idx}-aspect`) ?? false}
                      type={'critical'}
                      subType={'aspect'}
                      changeEditMode={(type, subType, idx, edit) =>
                        changeEditMode?.(type, subType, idx, edit)
                      }
                      onSubmit={onSubmit}
                      width={200}
                    />
                  ),
                  information: (
                    <EditableSpan
                      control={control}
                      idx={idx}
                      editMode={
                        editMode.critical.get(`${idx}-information`) ?? false
                      }
                      type={'critical'}
                      subType={'information'}
                      changeEditMode={(type, subType, idx, edit) =>
                        changeEditMode?.(type, subType, idx, edit)
                      }
                      onSubmit={onSubmit}
                      width={300}
                    />
                  ),
                }))}
              />
            </div>
          </div>
          <div className={styles['right-container']}>
            <div className={styles.description}>
              <h3>Supporting Information</h3>
              <Table
                hideTitle
                columns={[
                  { name: 'Context', key: 'aspect' },
                  { name: 'Information', key: 'information' },
                ]}
                rows={fieldsSupporting.map((field, idx) => ({
                  id: field.id,
                  aspect: (
                    <EditableSpan
                      control={control}
                      idx={idx}
                      editMode={
                        editMode.supporting.get(`${idx}-aspect`) ?? false
                      }
                      type={'supporting'}
                      subType={'aspect'}
                      changeEditMode={(type, subType, idx, edit) =>
                        changeEditMode?.(type, subType, idx, edit)
                      }
                      onSubmit={onSubmit}
                      width={241}
                    />
                  ),
                  information: (
                    <EditableSpan
                      control={control}
                      idx={idx}
                      editMode={
                        editMode.supporting.get(`${idx}-information`) ?? false
                      }
                      type={'supporting'}
                      subType={'information'}
                      changeEditMode={(type, subType, idx, edit) =>
                        changeEditMode?.(type, subType, idx, edit)
                      }
                      onSubmit={onSubmit}
                      width={203}
                    />
                  ),
                }))}
              />
            </div>
          </div>
        </div>
      </FormProvider>
    </Popup>
  );
};
