import { FolderOpenFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import { ComponentProps, useId, useRef } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import styles from './file-input.module.scss';

type FileInputProps<T extends FieldValues> = {
  label?: string;
  control?: Control<T>;
  registered?: Path<T>;
} & ComponentProps<'input'>;

export const FileInput = <T extends FieldValues>({
  label,
  control,
  registered,
  ...props
}: FileInputProps<T>) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles['file-input']}>
      <label className={styles['input-label']}>{label}</label>
      <div className={styles['field-button-container']}>
        {registered ? (
          <Controller
            name={registered}
            control={control}
            render={({
              field: { value, onChange, ...field },
              fieldState: { error },
            }) => (
              <>
                <div
                  className={clsx(
                    styles['input-field-error'],
                    error && styles['input-error']
                  )}
                >
                  <div className={styles['input-field-wrapper']}>
                    {value?.name}
                  </div>
                  {error && (
                    <div className={styles['input-detail']}>
                      {error.message}
                    </div>
                  )}
                </div>

                <label htmlFor={id}>
                  <FolderOpenFill />
                  <span>{t('common.browse')}</span>
                  <input
                    {...props}
                    {...field}
                    value={value?.fileName}
                    onChange={(event) => {
                      onChange(event.target.files?.[0]);
                    }}
                    id={id}
                    type={'file'}
                  />
                </label>
              </>
            )}
          />
        ) : (
          <>
            <div className={styles['input-field-wrapper']}>
              {inputRef.current?.files?.[0]?.name}
            </div>
            <label htmlFor={id}>
              <FolderOpenFill />
              <span>{t('common.browse')}</span>
              <input {...props} id={id} type={'file'} ref={inputRef} />
            </label>
          </>
        )}
      </div>
    </div>
  );
};
