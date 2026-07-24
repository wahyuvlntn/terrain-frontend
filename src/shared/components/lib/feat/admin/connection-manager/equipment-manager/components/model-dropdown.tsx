import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import { useContext, useEffect, useMemo } from 'react';

import { Dropdown, Input } from '../../../../../..';
import { EquipmentModelsCtx } from '../contexts';
import { usePowerMeterTypes } from '../hooks';
import style from './model-dropdown.module.scss';

export const ModelDropdown = ({
  value,
  onChange,
  error,
  noData,
  background = 'default',
  noType,
  className,
  readOnly,
}: {
  value: number | undefined;
  onChange?: (value: number) => void;
  error?: string;
  noData?: boolean;
  background?: 'dark' | 'default';
  noType?: boolean;
  className?: string;
  readOnly?: boolean;
}) => {
  // Contexts
  const { models, options, records, ids } = useContext(EquipmentModelsCtx);

  // Get the selected model's metadata
  const { name, type, brand, series } = useMemo(() => {
    if (noData || !value || !records) {
      return { name: null, type: '---', brand: '---', series: '---' };
    }

    const metadata = records[value];

    if (!metadata) {
      return { name: null, type: '---', brand: '---', series: '---' };
    }

    return metadata;
  }, [noData, value, records]);

  // Set default value if value is still undefined
  useEffect(() => {
    if (!models || value != null || !onChange) {
      return;
    }

    if (models.length > 0) {
      setTimeout(() => {
        onChange(models[0].id);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, models]);

  const { data: powerMeterTypes } = usePowerMeterTypes();
  useMemo(() => {
    if (!powerMeterTypes) {
      return {};
    }

    return powerMeterTypes.reduce((names, { id, name }) => {
      names[id] = name;
      return names;
    }, {} as Record<number, string>);
  }, [powerMeterTypes]);

  return (
    <div className={clsx(style['model-dropdown'], className)}>
      <div className={style['model-dropdown__metadata']}>
        {!noData && onChange ? (
          <Dropdown
            label={t('common.model') + ':'}
            options={options}
            value={value?.toString()}
            onChange={
              onChange
                ? (value) => {
                    onChange(Number(value));
                  }
                : undefined
            }
            disabled={!ids}
            error={error}
            searchable
            background={background}
            readOnly={readOnly}
            wrapperClassName={style['model-dropdown__metadata__item']}
            wrapperStyles={{ width: 0 }}
          />
        ) : (
          <Input
            label={t('common.model') + ':'}
            value={name || '---'}
            wrapperProps={{
              className: style['model-dropdown__metadata__item'],
            }}
            readOnly
          />
        )}
        {noType ? null : (
          <div className={style['model-dropdown__metadata__item']}>
            <Input
              label={t('common.brand') + ':'}
              value={brand}
              readOnly
              background={background}
            />
          </div>
        )}
      </div>
      {noType ? (
        <div className={style['model-dropdown__metadata']}>
          <div className={style['model-dropdown__metadata__item']}>
            <Input
              label={t('common.brand') + ':'}
              value={brand}
              readOnly
              background={background}
            />
          </div>
        </div>
      ) : null}
      <div className={style['model-dropdown__metadata']}>
        {noType ? null : (
          <div className={style['model-dropdown__metadata__item']}>
            <Input
              label={t('common.type') + ':'}
              value={type}
              readOnly
              background={background}
            />
          </div>
        )}
        <div className={style['model-dropdown__metadata__item']}>
          <Input
            label={t('common.series') + ':'}
            value={series}
            readOnly
            background={background}
          />
        </div>
      </div>
    </div>
  );
};
