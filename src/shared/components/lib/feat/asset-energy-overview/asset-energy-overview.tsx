import { ArrowLeft, ExportNotes, Settings } from '@digital-twin/icons';
import { formatStringToObjectDate, getURL, TCreateExcelWorkbookParams, t } from '@digital-twin/utils';
import clsx from 'clsx';
import { ReactNode, useState } from 'react';
import { createSearchParams, Link, useSearchParams } from 'react-router-dom';
import {
  AssetCard,
  Button,
  Filter,
  FilterDrawerToggleButton,
  FilterShortcut,
  FilterShortcutContainer,
  InputDuration,
  LastUpdated,
  Loading,
  Search,
  useModal,
} from '../../..';
import { AppPagination } from '../../navigation/app-pagination';
import { RunningHourLimitPopup } from '../admin/connection-manager/model-manager';
import { FilterDrawer, FilterDrawerShortcuts, FilterTree } from '../filter';
import {
  Asset,
  TGetAssetEnergyOverviewParams,
  TGetAssetEnergyOverviewReturn,
} from './asset-energy-overview.api';
import { useAssetEnergyOverview } from './asset-energy-overview.hooks';
import styles from './asset-energy-overview.module.scss';
import { AssetSpec } from './asset-spec';

type AssetEnergyOverviewProps<T> = {
  rightRibbonItem?: ReactNode;
  queryFn: (params: TGetAssetEnergyOverviewParams) => Promise<TGetAssetEnergyOverviewReturn<T>>;
  exportFn: (
    params: Omit<TGetAssetEnergyOverviewParams, 'limit' | 'page' | 'search'>
  ) => Promise<Asset<T>[]>;
  cardImgHeight?: string | number;
  sheetsParserFn: (assets: Asset<T>[]) => Omit<TCreateExcelWorkbookParams, 'period'>;
  renderCardBadge?: (props: T) => ReactNode;
  legend: ReactNode;
  filterTreeChildren: ReactNode;
  filterShortcutChildren: ReactNode;
  typeFilterKey: string;
};
export const AssetEnergyOverview = <T extends object>({
  rightRibbonItem,
  queryFn,
  exportFn,
  sheetsParserFn,
  renderCardBadge,
  legend,
  cardImgHeight,
  filterTreeChildren,
  filterShortcutChildren,
  typeFilterKey,
}: AssetEnergyOverviewProps<T>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    assets,
    assetCounts,
    handleDateChange,
    end,
    start,
    isLoading,
    exportData,
    handlePageChange,
    handleSearchChange,
    queryString,
    locationOverviewPage,
    setFilter,
    data,
    isReady,
    handleFilterDataChange,
    isExporting,
    ...filter
  } = useAssetEnergyOverview({
    searchParams,
    setSearchParams,
    queryFn,
    exportFn,
    sheetsParserFn,
    typeFilterKey,
  });
  const [openAspect, setOpenAspect] = useState({
    open: false,
    assetId: 0,
  });

  // For set running hour limit popup
  const {
    handleClose: handleCloseRunningHourLimitPopup,
    handleOpen: handleOpenRunningHourLimitPopup,
    open: openRunningHourLimitPopup,
  } = useModal();

  return (
    <>
      <RunningHourLimitPopup
        open={openRunningHourLimitPopup}
        onClose={handleCloseRunningHourLimitPopup}
      />
      <AssetSpec
        open={openAspect.open}
        assetId={openAspect.assetId}
        onClose={() => setOpenAspect({ open: false, assetId: 0 })}
      />
      <div className={styles['asset-energy-overview']}>
        <Filter
          onDataChange={handleFilterDataChange}
          setFilter={setFilter}
          data={data}
          isReady={isReady}
          {...filter}
        >
          <div className={styles.ribbon}>
            <div className={'ribbon-item'}>
              <Link
                to={{
                  pathname: '/location-overview',
                  search: `?${createSearchParams({
                    ...queryString,
                    ...(locationOverviewPage && { page: locationOverviewPage }),
                  })}`,
                }}
              >
                <ArrowLeft className={styles.back} />
              </Link>
              {legend}

              <FilterShortcutContainer>
                <FilterDrawerToggleButton />
                <FilterShortcut>{filterShortcutChildren}</FilterShortcut>
              </FilterShortcutContainer>
              <FilterDrawer>
                <FilterDrawerShortcuts>{filterShortcutChildren}</FilterDrawerShortcuts>
                <FilterTree>{filterTreeChildren}</FilterTree>
              </FilterDrawer>
            </div>

            <div className={'ribbon-item'} style={{ overflow: 'auto' }}>
              <Search
                placeholder={'Search...'}
                width={235}
                value={filter.search}
                onChange={handleSearchChange}
              />
              <InputDuration
                startDate={formatStringToObjectDate(start)}
                endDate={formatStringToObjectDate(end)}
                onChange={handleDateChange}
              />

              {rightRibbonItem}

              <Button icon={<Settings />} onClick={handleOpenRunningHourLimitPopup}>
                Set Limit Hours
              </Button>

              <Button icon={<ExportNotes />} onClick={exportData} disabled={isExporting}>
                {t('common.export')}
              </Button>
              <LastUpdated />
            </div>
          </div>
        </Filter>
        <div className={styles.grid_container}>
          <Loading isLoading={isLoading} />
          <div className={clsx(styles.grid, assets.length <= 2 && styles['left-aligned'])}>
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                conditionStartTime={asset.conditionStartTime}
                condition={asset.condition}
                warningCount={asset.warningCount}
                criticalCount={asset.criticalCount}
                uptime={asset.uptime}
                model={asset.model}
                type={asset.type}
                id={asset.id}
                imgSize={cardImgHeight}
                name={asset.name}
                status={asset.status}
                statusStartTime={asset.statusStartTime ? new Date(asset.statusStartTime) : null}
                image={`${getURL()}${asset.image}`}
                variant={'details'}
                onImageClick={() => setOpenAspect({ open: true, assetId: asset.id })}
                badge={renderCardBadge?.({
                  ...asset,
                })}
                runningBadgePosition="right"
                runningHours={asset.runningHours}
                className={styles['asset-card']}
                rightComponentClassName={styles['asset-card-right-container']}
                conditionAlarmContainerClassName={styles['asset-card-condition-alarm-container']}
              />
            ))}
          </div>
        </div>
        <AppPagination
          page={filter.page}
          max={Math.max(Math.ceil(assetCounts / 9), 1)}
          onChange={handlePageChange}
        />
      </div>
    </>
  );
};
