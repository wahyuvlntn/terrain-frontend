import { ArrowLeft, Export } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { format } from 'date-fns';
import React, { ReactNode, useState } from 'react';
import { createSearchParams, Link, useSearchParams } from 'react-router-dom';

import {
  Button,
  ExportParamModal,
  FilterItem,
  FilterShortcut,
  InputDuration,
  LastUpdated,
  TGetLocationAssetNames,
} from '../../..';
import styles from './asset-details.module.scss';

type AssetDetailsProps = {
  assetName: string;
  excludedSearchParams?: string[];
  assetLegendComponent: ReactNode;
  onExport: (selectedParams: number[]) => void;
  date: string;
  handleChangeDate: (date: string) => void;
  leftComponent: ReactNode;
  rightComponent: ReactNode;
  leftComponentWidth?: string | number;
  modelName: string;
  locationNames: TGetLocationAssetNames[];
  typeName: string;
};
export const AssetDetails = ({
  assetName,
  excludedSearchParams,
  assetLegendComponent,
  onExport,
  date,
  handleChangeDate,
  rightComponent,
  leftComponent,
  leftComponentWidth,
  locationNames,
  modelName,
  typeName,
}: AssetDetailsProps) => {
  const [searchParams] = useSearchParams();
  const [openExport, setOpenExport] = useState(false);

  const queryString: { [key: string]: string | string[] } = {};
  for (const entry of searchParams.entries()) {
    const key = entry[0];
    if (
      key !== 'parameter-search' &&
      key !== 'alarm-page' &&
      !key.includes('real-time') &&
      (excludedSearchParams ?? []).every((e) => !key.includes(e))
    ) {
      const data = queryString[key];
      const value = entry[1];

      if (data) queryString[key] = [...data, value];
      else queryString[key] = [value];
    }
  }

  return (
    <>
      <ExportParamModal
        open={openExport}
        onClose={() => setOpenExport(false)}
        assetName={assetName}
        date={date}
        onExport={(params) => onExport(params)}
      />
      <div className={styles['asset-details']}>
        <div className={styles.ribbon}>
          <div className={styles.container}>
            <Link
              to={{
                pathname: '..',
                search: `?${createSearchParams({
                  ...queryString,
                })}`,
              }}
            >
              <ArrowLeft className={styles.back} />
            </Link>
            {assetLegendComponent}
            <FilterShortcut width={522}>
              {locationNames
                .filter((filter) => filter.data.length)
                .map((filter) => (
                  <FilterItem
                    key={
                      filter.isLocation +
                      filter.data.map((item) => item.id).join(',')
                    }
                    name={`${
                      filter.isLocation ? '' : `${t('common.equipment')}: `
                    }${filter.data.map((item) => item.name).join(',')}`}
                  />
                ))}
              <FilterItem name={`${t('common.model')}: ${modelName}`} />
              <FilterItem name={`${t('common.type')}: ${typeName}`} />
            </FilterShortcut>
          </div>
          <div className={styles.container}>
            <InputDuration
              type="date"
              triggerButtonStyle={{ width: 150 }}
              startDate={new Date(date + 'T00:00:00')}
              endDate={new Date(date + 'T00:00:00')}
              onChange={(startDate: Date) =>
                handleChangeDate(format(startDate, 'yyyy-MM-dd'))
              }
            />
            <Button icon={<Export />} onClick={() => setOpenExport(true)}>
              {t('common.export')}
            </Button>
            <LastUpdated />
          </div>
        </div>
        <div className={styles.body}>
          <div
            className={styles['content-container']}
            style={{
              width: leftComponentWidth,
            }}
          >
            {leftComponent}
          </div>
          <div className={styles['content-container']}>{rightComponent}</div>
        </div>
      </div>
    </>
  );
};
