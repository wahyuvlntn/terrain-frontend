import { Plus, TrashDelete, WindowList, FilterFunnel } from '@digital-twin/icons';
import {
  createTranslationKey,
  t,
  useLanguageSwitcher,
  useVerticalLimit,
} from '@digital-twin/utils';
import { Card, toast } from '@digital-twin/reusables';
import clsx from 'clsx';
import {
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SetURLSearchParams } from 'react-router-dom';

import {
  AuthCtx,
  Button,
  Container,
  Filter,
  FILTER_KEY_MODEL,
  FILTER_SEARCH_PARAMS_PARSER_MODEL,
  FilterDrawer,
  FilterDrawerShortcuts,
  FilterDrawerToggleButton,
  FilterTree,
  LicenseShortcut,
  LicenseStatusEnum,
  LicenseTree,
  Loading,
  LocationShortcut,
  ModelShortcut,
  ModelTree,
  Pagination,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  PopupDelete,
  Search,
  useGetFilter,
  useToggle,
} from '../../../../../..';
import {
  BrandShortcut,
  BrandTree,
  FILTER_KEY_BRAND,
  FILTER_SEARCH_PARAMS_PARSER_BRAND,
} from '../../../../filter/filter.brand';
import {
  FILTER_KEY_LICENSE,
  FILTER_SEARCH_PARAMS_PARSER_LICENSE,
} from '../../../../filter/filter.license';
import styles from '../../../../filter/filter.module.scss';
import {
  FILTER_KEY_SERIES,
  FILTER_SEARCH_PARAMS_PARSER_SERIES,
  SeriesShortcut,
  SeriesTree,
} from '../../../../filter/filter.series';
import { ThemeContext } from '../../../theme-editor';
import {
  EquipmentLicensesCtx,
  EquipmentLocationsCtx,
  EquipmentModelsCtx,
  ImagePlaceholderCtx,
} from '../contexts';
import { useDeleteEquipment, useEquipmentList } from '../hooks';
import { EquipmentEntryType, NormalizedEquipmentEntryType } from '../schemas';
import { AddEquipmentDrawer } from './add-equipment-drawer';
import style from './equipment-list.module.scss';
import { LicenseStatus } from './license-status';

// Constants
const ITEM_HEIGHT = 100;
const ITEM_GAP = 10;

export const EquipmentList = ({
  selected,
  search,
  page,
  searchParams,
  setSearchParams,
  filterTypeKey,
  filterTypeShortcut,
  filterTypeTree,
}: {
  selected: string | undefined;
  search: string;
  page: number;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  filterTypeTree: ReactNode;
  filterTypeShortcut: ReactNode;
  filterTypeKey: string;
}) => {
  useLanguageSwitcher();

  // Refs
  const isAutoPaged = useRef(false);

  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.equipmentmanager,
    PermissionAliasEnum.enum.create
  );

  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.equipmentmanager,
    PermissionAliasEnum.enum.delete
  );

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    itemGap: ITEM_GAP,
  });

  // Contexts
  const { records: modelRecords } = useContext(EquipmentModelsCtx);
  const { records: licenseRecords } = useContext(EquipmentLicensesCtx);

  // For adding an equipment
  const [showAddDrawer, toggleShowAddDrawer] = useToggle(false);

  // For deleting an equipment
  const [deletedEntry, setDeletedEntry] = useState<EquipmentEntryType>();
  const [showDeleteConfirm, toggleShowDeleteConfirm] = useToggle(false);
  const deleteEquipment = useDeleteEquipment();

  // For fetching list
  const { data, isLoading } = useEquipmentList();

  // Filter
  const {
    setFilter,
    data: filterData,
    isReady,
    handleFilterDataChange,
    ...filter
  } = useGetFilter<
    {
      [FILTER_KEY_BRAND]: number;
      [FILTER_KEY_SERIES]: number;
      [FILTER_KEY_MODEL]: number;
      [FILTER_KEY_LICENSE]: string;
    },
    NonNullable<unknown>
  >({
    keys: [
      {
        key: FILTER_KEY_MODEL,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_MODEL,
      },
      {
        key: filterTypeKey,
        searchParamsParser: (data: string) => Number(data),
      },
      {
        key: FILTER_KEY_BRAND,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_BRAND,
      },
      {
        key: FILTER_KEY_SERIES,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_SERIES,
      },
      {
        key: FILTER_KEY_LICENSE,
        searchParamsParser: FILTER_SEARCH_PARAMS_PARSER_LICENSE,
      },
    ],
  });

  const {
    locationIds,
    assetIds,
    brandIds,
    licenseStatusIds,
    modelIds,
    seriesIds,
  } = filterData;
  // @ts-expect-error Element implicitly has an any type because expression of type string can't be used to index type
  const typeIds = filterData[filterTypeKey] as number[] | null;

  const { childIds } = useContext(EquipmentLocationsCtx);

  const { locations, assets, models, types, brands, series, licenseStatus } =
    useMemo(() => {
      let locations: Record<number, true> | null = null;

      if (locationIds && childIds) {
        locations = locationIds.reduce((records, id) => {
          records[id] = true;

          const childLocationIds = childIds[id];

          if (childLocationIds) {
            for (const id of childLocationIds) {
              records[id] = true;
            }
          }

          return records;
        }, {} as Record<number, true>);
      }

      let assets: Record<number, true> | null = null;

      if (assetIds) {
        assets = assetIds.reduce((records, id) => {
          records[id] = true;
          return records;
        }, {} as Record<number, true>);
      }

      let models: Record<number, true> | null = null;

      if (modelIds) {
        models = modelIds.reduce((records, id) => {
          records[id] = true;
          return records;
        }, {} as Record<number, true>);
      }

      let types: Record<number, true> | null = null;

      if (typeIds) {
        types = typeIds.reduce((records, id) => {
          records[id] = true;
          return records;
        }, {} as Record<number, true>);
      }

      let brands: Record<number, true> | null = null;

      if (brandIds) {
        brands = brandIds.reduce((records, id) => {
          records[id] = true;
          return records;
        }, {} as Record<number, true>);
      }

      let series: Record<number, true> | null = null;

      if (seriesIds) {
        series = seriesIds.reduce((records, id) => {
          records[id] = true;
          return records;
        }, {} as Record<number, true>);
      }

      let licenseStatus: boolean | null | undefined = null;

      // licenseStatusIds should be either null or array with 1 element
      if (licenseStatusIds) {
        if (licenseStatusIds.length === 0) {
          licenseStatus = undefined;
        } else
          licenseStatus = licenseStatusIds[0] === LicenseStatusEnum.Enum.ACTIVE;
      }

      return {
        locations,
        assets,
        models,
        types,
        brands,
        series,
        licenseStatus,
      };
    }, [
      locationIds,
      assetIds,
      modelIds,
      typeIds,
      brandIds,
      seriesIds,
      licenseStatusIds,
      childIds,
    ]);

  // Combine data from context, and then filter the list
  const { filtered, activeCount } = useMemo(() => {
    if (!data || !modelRecords || !licenseRecords) {
      return { filtered: undefined, activeCount: 0 };
    }

    const filtered: NormalizedEquipmentEntryType[] = [];

    let activeCount = 0;

    const default_l_active = false;
    const default_l_status = 'Not Licensed';
    const normalized_search = search.toLowerCase();

    data.forEach((entry) => {
      const metadata = modelRecords[entry.model_id];

      if (!metadata) {
        return;
      }

      let l_active = default_l_active;
      let l_status = default_l_status;

      if (entry.license_id) {
        const status = licenseRecords[entry.license_id];

        if (status) {
          l_active = status.l_active;
          l_status = status.l_status;
        }
      }

      // Filter by location
      if (
        locations &&
        !locations[entry.location_id] &&
        assets &&
        !assets[entry.id]
      ) {
        return;
      }

      // Filter by model
      if (models && !models[entry.model_id]) {
        return;
      }

      // Filter by type / source type
      if (types && !types[metadata.type_id]) {
        return;
      }

      // Filter by brand
      if (brands && !brands[metadata.brand_id]) {
        return;
      }

      // Filter by series
      if (series && !series[metadata.series_id]) {
        return;
      }

      // Filter by license status
      if (
        licenseStatus === undefined ||
        (licenseStatus !== null && l_active !== licenseStatus)
      ) {
        return;
      }

      // Filter by search
      if (
        normalized_search &&
        !entry.name.toLowerCase().includes(normalized_search) &&
        !metadata.name.toLowerCase().includes(normalized_search) &&
        !metadata.type.toLowerCase().includes(normalized_search) &&
        !metadata.brand.toLowerCase().includes(normalized_search) &&
        !metadata.series.toLowerCase().includes(normalized_search)
      ) {
        return;
      }

      filtered.push({
        ...entry,
        model: metadata.name,
        type: metadata.type,
        brand: metadata.brand,
        series: metadata.series,
        l_active,
        l_status,
      });

      if (l_active) {
        ++activeCount;
      }
    });

    return { filtered, activeCount };
  }, [
    data,
    modelRecords,
    licenseRecords,
    search,
    locations,
    assets,
    models,
    types,
    brands,
    series,
    licenseStatus,
  ]);

  // Page the filtered list
  const paged = useMemo(() => {
    if (!filtered || !limit) {
      return undefined;
    }

    return filtered.slice((page - 1) * limit, page * limit);
  }, [filtered, page, limit]);

  // Reset page when it is outside of range
  useEffect(() => {
    if (isLoading || filtered?.length == null || !limit) {
      return;
    }

    const totalPage = Math.ceil(filtered.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete('page');
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered?.length, page, limit, isLoading]);

  useEffect(() => {
    if (isAutoPaged.current || !filtered || !selected || !limit) {
      return;
    }

    isAutoPaged.current = true;

    const index = filtered.findIndex(({ alias }) => alias === selected);

    if (index !== -1) {
      const page = Math.ceil((index + 1) / limit);

      setSearchParams((prev) => {
        prev.set('page', page.toString());
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected, limit]);

  // Set default selectedId
  useEffect(() => {
    if (!filtered || filtered.length === 0 || selected || isLoading) {
      return;
    }

    setSearchParams((prev) => {
      prev.set('selected', filtered[0].alias);
      return new URLSearchParams(prev);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected, isLoading]);

  return (
    <Container
      icon={<WindowList />}
      title={t('common.equipment_list')}
      className={style['list']}
      contentWrapperProps={{ style: { background: 'transparent' } }}
      rightTopComponent={
        <div
          className={style['active-licenses']}
          title={`${t(
            'common.active_licenses'
          )}: ${activeCount.toLocaleString()} / ${(
            filtered?.length || 0
          ).toLocaleString()}`}
        >
          <span>{t('common.active_licenses')}:</span>
          <span>{`${activeCount.toLocaleString()} / ${(
            filtered?.length || 0
          ).toLocaleString()}`}</span>
        </div>
      }
      background={'none'}
    >
      <div className={style['list__header']}>
        <Search
          value={search}
          onChange={(search) => {
            setSearchParams((prev) => {
              if (search) {
                prev.set('search', search);
              } else {
                prev.delete('search');
              }
              return new URLSearchParams(prev);
            });
          }}
          placeholder={t('common.search')}
          width="100%"
          background={'dark'}
        />
        {hasCreatePermission ? (
          <Button
            icon={<Plus />}
            onClick={(e) => {
              e.stopPropagation();
              toggleShowAddDrawer();
            }}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t('common.add')}
          </Button>
        ) : null}
        <Filter
          onDataChange={handleFilterDataChange}
          setFilter={setFilter}
          data={filterData}
          isReady={isReady}
          {...filter}
        >
          <FilterDrawerToggleButton>
            <Button
              icon={<FilterFunnel />}
              color="default-secondary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {t('common.filter')}
            </Button>
          </FilterDrawerToggleButton>
          <FilterDrawer>
            <FilterDrawerShortcuts>
              <LocationShortcut />
              <ModelShortcut />
              {filterTypeShortcut}
              <BrandShortcut />
              <SeriesShortcut />
              <LicenseShortcut />
            </FilterDrawerShortcuts>
            <FilterTree>
              <ModelTree />
              {filterTypeTree}
              <BrandTree />
              <SeriesTree />
              <LicenseTree />
            </FilterTree>
          </FilterDrawer>
        </Filter>
      </div>
      <div className={style['list__body']} ref={setContainer}>
        <Loading isLoading={isLoading} />
        {paged
          ? paged.map((entry) => (
              <EquipmentCard
                key={entry.alias}
                isSelected={entry.alias === selected}
                entry={entry}
                onSelect={(entry) => {
                  setSearchParams((prev) => {
                    prev.set('selected', entry.alias);
                    return new URLSearchParams(prev);
                  });
                }}
                onDelete={(entry) => {
                  setDeletedEntry(entry);
                  toggleShowDeleteConfirm();
                }}
                showDelete={hasDeletePermission}
              />
            ))
          : null}
      </div>
      <div className={style['pagination-container']}>
        <Pagination
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          count={filtered?.length || 0}
          limit={limit || 1}
          variant="arrow"
        />
      </div>

      {hasCreatePermission ? (
        <AddEquipmentDrawer
          open={showAddDrawer}
          onClose={toggleShowAddDrawer}
        />
      ) : null}
      {hasDeletePermission ? (
        <PopupDelete
          entityType="Equipment"
          entityName={deletedEntry?.name || '---'}
          open={showDeleteConfirm}
          onClose={toggleShowDeleteConfirm}
          onDelete={() => {
            if (!deletedEntry) {
              return;
            }

            deleteEquipment.mutate(deletedEntry.alias, {
              onSuccess: () => {
                // If deleted equipment is the currently selected equipment, reset the selected equipment
                if (deletedEntry.alias === selected) {
                  setSearchParams((prev) => {
                    prev.delete('selected');
                    return new URLSearchParams(prev);
                  });
                }

                toast.success(
                  t('common.equipment_successfully_deleted', deletedEntry.name),
                  {
                    toastId: `successDeleteEquipment_${deletedEntry.alias}`,
                  }
                );

                toggleShowDeleteConfirm();
              },
            });
          }}
          deleting={deleteEquipment.isPending}
        />
      ) : null}
    </Container>
  );
};

const EquipmentCard = ({
  isSelected,
  entry,
  onSelect,
  onDelete,
  showDelete,
}: {
  isSelected: boolean;
  entry: NormalizedEquipmentEntryType;
  onSelect: (entry: EquipmentEntryType) => void;
  onDelete: (entry: EquipmentEntryType) => void;
  showDelete?: boolean;
}) => {
  const placeholder = useContext(ImagePlaceholderCtx);
  const {
    colors: { borderDefault },
  } = useContext(ThemeContext);

  return (
    <Card
      type="strip-status-thumbnail"
      stripColor={borderDefault}
      className={clsx(style['card'], isSelected && style['card--selected'])}
      isSelected={isSelected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(entry);
      }}
      contentWrapperProps={{
        style: {
          padding: 12,
        },
      }}
      thumbnailContent={
        <div className={style['card__image']}>
          <img
            alt={entry.alias}
            src={entry.image_path || placeholder}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = placeholder;
            }}
          />
        </div>
      }
    >
      <div className={style['card__body']}>
        <div className={style['card__body__header']}>
          <span
            className={style['card__body__header__name']}
            title={entry.name}
          >
            {entry.name}
          </span>
          <div className={style['card__body__header__status']}>
            <LicenseStatus
              isActive={entry.l_active}
              status={t(`common.${createTranslationKey(entry.l_status)}`)}
            />
          </div>
          {showDelete ? (
            <TrashDelete
              className={style['card__body__header__delete']}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry);
              }}
            />
          ) : null}
        </div>
        <div className={style['card__body__row']}>
          <span
            className={style['card__body__row__item']}
            title={`${t('common.model')}: ${entry.model}`}
          >{`${t('common.model')}: ${entry.model}`}</span>
          <span
            className={clsx(
              style['card__body__row__item'],
              style['card__body__row__item--right']
            )}
            title={`${t('common.brand')}: ${entry.brand}`}
          >{`${t('common.brand')}: ${entry.brand}`}</span>
        </div>
        <div className={style['card__body__row']}>
          <span
            className={style['card__body__row__item']}
            title={`${t('common.type')}: ${entry.type}`}
          >{`${t('common.type')}: ${entry.type}`}</span>
          <span
            className={clsx(
              style['card__body__row__item'],
              style['card__body__row__item--right']
            )}
            title={`${t('common.series')}: ${entry.series}`}
          >{`${t('common.series')}: ${entry.series}`}</span>
        </div>
      </div>
    </Card>
    // <div
    //   className={style['card']}
    //   onClick={(e) => {
    //     e.stopPropagation();
    //     onSelect(entry);
    //   }}
    // >
    //   <div
    //     className={clsx(
    //       style['card__background'],
    //       isSelected && style['card__background--selected']
    //     )}
    //   />
    //   <div className={style['card__image']}>
    //     <img
    //       alt={entry.alias}
    //       src={entry.image_path || placeholder}
    //       onError={(e) => {
    //         e.currentTarget.onerror = null;
    //         e.currentTarget.src = placeholder;
    //       }}
    //     />
    //   </div>
    //   <div
    //     className={clsx(
    //       style['card__separator'],
    //       isSelected && style['card__separator--selected']
    //     )}
    //   />
    //   <div className={style['card__body']}>
    //     <div className={style['card__body__header']}>
    //       <span
    //         className={style['card__body__header__name']}
    //         title={entry.name}
    //       >
    //         {entry.name}
    //       </span>
    //       <div className={style['card__body__header__status']}>
    //         <LicenseStatus isActive={entry.l_active} status={entry.l_status} />
    //       </div>
    //       {showDelete ? (
    //         <TrashDeleteFill
    //           className={style['card__body__header__delete']}
    //           onClick={(e) => {
    //             e.stopPropagation();
    //             onDelete(entry);
    //           }}
    //         />
    //       ) : null}
    //     </div>
    //     <div className={style['card__body__row']}>
    //       <span
    //         className={style['card__body__row__item']}
    //         title={`Model: ${entry.model}`}
    //       >{`Model: ${entry.model}`}</span>
    //       <span
    //         className={clsx(
    //           style['card__body__row__item'],
    //           style['card__body__row__item--right']
    //         )}
    //         title={`Brand: ${entry.brand}`}
    //       >{`Brand: ${entry.brand}`}</span>
    //     </div>
    //     <div className={style['card__body__row']}>
    //       <span
    //         className={style['card__body__row__item']}
    //         title={`Type: ${entry.type}`}
    //       >{`Type: ${entry.type}`}</span>
    //       <span
    //         className={clsx(
    //           style['card__body__row__item'],
    //           style['card__body__row__item--right']
    //         )}
    //         title={`Series: ${entry.series}`}
    //       >{`Series: ${entry.series}`}</span>
    //     </div>
    //   </div>
    // </div>
  );
};
