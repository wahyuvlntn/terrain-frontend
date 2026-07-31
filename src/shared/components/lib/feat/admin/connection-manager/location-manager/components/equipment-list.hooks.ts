import {
  capitalizeFirstLetter,
  createTranslationKey,
  t,
  useLanguageSwitcher,
} from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DropdownOption } from '../../../../../input';
import {
  AssetDetailsType,
  Column,
  getAssetsBySelectedParent,
  getBrandsBySelectedModels,
  getLicensesBySelectedAssets,
  getModelsBySelectedLocation,
} from '../api/location-asset';

export const useEquipmentList = (editFormState: boolean) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationId = searchParams.get('location_id');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>([]);
  const [assetDropdown, setAssetDropdown] = useState<DropdownOption[]>([]);
  const [modelDropdown, setModelDropdown] = useState<DropdownOption[]>([]);
  const [brandDropdown, setBrandDropdown] = useState<DropdownOption[]>([]);
  const [licenseDropdown, setLicenseDropdown] = useState<DropdownOption[]>([]);

  const orderBy = searchParams.get('orderBy');
  const orderType = searchParams.get('orderType');
  const page = searchParams.get('page');
  const [sortedColumns, setSortedColumn] = useState<Column[]>([]);
  const { currentLanguage } = useLanguageSwitcher();

  useEffect(() => {
    setSortedColumn([
      {
        key: 'location',
        name: t('common.location'),
        alignment: 'left',
        sortState:
          orderBy && orderBy === 'location'
            ? orderType
              ? orderType === 'ASC'
              : undefined
            : undefined,
        showOrderIcon: true,
      },
      {
        key: 'equipmentID',
        name: t('common.equipment'),
        sortState:
          orderBy && orderBy === 'equipmentID'
            ? orderType
              ? orderType === 'ASC'
              : undefined
            : undefined,
        showOrderIcon: true,
      },
      {
        key: 'model',
        name: t('common.model'),
        sortState:
          orderBy && orderBy === 'model'
            ? orderType
              ? orderType === 'ASC'
              : undefined
            : undefined,
        showOrderIcon: true,
      },
      {
        key: 'brand',
        name: t('common.brand'),
        sortState:
          orderBy && orderBy === 'brand'
            ? orderType
              ? orderType === 'ASC'
              : undefined
            : undefined,
        showOrderIcon: true,
      },
      {
        key: 'series',
        name: t('common.series'),
        sortState:
          orderBy && orderBy === 'series'
            ? orderType
              ? orderType === 'ASC'
              : undefined
            : undefined,
        showOrderIcon: true,
      },
      {
        key: 'license',
        name: t('common.license'),
        alignment: 'left',
        sortState:
          orderBy && orderBy === 'license'
            ? orderType
              ? orderType === 'ASC'
              : undefined
            : undefined,
        showOrderIcon: true,
      },
    ]);
  }, [currentLanguage, orderBy, orderType]);

  const { data: assetsData } = useQuery({
    queryKey: ['getLocationAssetData', locationId] as const,
    queryFn: async (): Promise<AssetDetailsType[] | null> => {
      if (locationId === '-1') {
        return null;
      }
      return await getAssetsBySelectedParent({
        locationId: parseInt(locationId ?? '0'),
        assetIds: null,
        brands: null,
        licenses: null,
        limit: null,
        modelIds: null,
        orderId: true,
        orderBrand: null,
        orderSeries: null,
        orderLicense: null,
        orderModel: null,
        orderName: null,
        page: null,
      });
    },
    enabled: !!locationId,
    staleTime: Infinity,
    meta: {
      toastId: ['getLocationAssetData', locationId],
    },
  });

  const { data: equipmentList, refetch: refetchEquipmentList } = useQuery({
    queryKey: [
      'getLocationEquipmentList',
      locationId,
      selectedModels,
      selectedBrands,
      selectedAssets,
      selectedLicenses,
      sortedColumns,
      page,
    ] as const,
    queryFn: async (): Promise<AssetDetailsType[] | null> => {
      if (locationId === '-1') {
        return null;
      }
      if (
        !locationId ||
        !selectedAssets ||
        !selectedBrands ||
        !selectedAssets ||
        !sortedColumns
      )
        return null;

      const order_name = sortedColumns.find(
        (column) => column.key === 'location'
      );
      const order_id = sortedColumns.find(
        (column) => column.key === 'equipmentID'
      );
      const order_brand = sortedColumns.find(
        (column) => column.key === 'brand'
      );
      const order_series = sortedColumns.find(
        (column) => column.key === 'series'
      );
      const order_model = sortedColumns.find(
        (column) => column.key === 'model'
      );
      const order_license = sortedColumns.find(
        (column) => column.key === 'license'
      );

      const data = await getAssetsBySelectedParent({
        locationId: parseInt(locationId),
        modelIds: `{${selectedModels.map(Number).join(',')}}`,
        brands: `{${selectedBrands.map(String).join(',')}}`,
        assetIds: `{${selectedAssets.map(Number).join(',')}}`,
        licenses: `{${selectedLicenses.map(String).join(',')}}`,
        orderName: order_name ? order_name.sortState ?? null : null,
        orderId: order_id ? order_id.sortState ?? null : null,
        orderBrand: order_brand ? order_brand.sortState ?? null : null,
        orderSeries: order_series ? order_series.sortState ?? null : null,
        orderModel: order_model ? order_model.sortState ?? null : null,
        orderLicense: order_license ? order_license.sortState ?? null : null,
        limit: 15,
        page: page ? parseInt(page) : 1,
      });

      if (!data) return null;

      return data.map((item) => {
        return {
          id: item.assetId.toString(),
          ...item,
        };
      });
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    enabled:
      !!locationId &&
      !!selectedAssets &&
      !!selectedModels &&
      !!selectedBrands &&
      !!selectedLicenses &&
      !!sortedColumns,
    meta: {
      toastId: [
        'getLocationEquipmentList',
        locationId,
        selectedModels,
        selectedBrands,
        selectedAssets,
        selectedLicenses,
        sortedColumns,
        page,
      ],
    },
  });

  const { data: modelsData } = useQuery({
    queryKey: ['getLocationModelData', locationId] as const,
    queryFn: async (): Promise<{ modelId: number; name: string }[] | null> => {
      if (locationId === '-1') {
        return null;
      }
      return await getModelsBySelectedLocation({
        locationId: parseInt(locationId!),
      });
    },
    refetchOnWindowFocus: false,
    enabled: !!locationId,
    meta: { toastId: ['getLocationModelData', locationId] },
  });

  const { data: brandsData } = useQuery({
    queryKey: [
      'getLocationBrandData',
      locationId,
      modelDropdown,
      selectedModels,
    ] as const,
    queryFn: async (): Promise<{ brand: string }[] | null> => {
      if (locationId === '-1') {
        return null;
      }
      return await getBrandsBySelectedModels({
        modelIds: `{${selectedModels.map(Number).join(',')}}`,
      });
    },
    refetchOnWindowFocus: false,
    enabled: !!locationId && !!modelDropdown && !!selectedModels,
    meta: {
      toastId: [
        'getLocationBrandData',
        locationId,
        modelDropdown,
        selectedModels,
      ],
    },
  });

  const { data: licenseData } = useQuery({
    queryKey: ['getLocationLicenseData', locationId, selectedAssets] as const,
    queryFn: async (): Promise<{ license: string }[] | null> => {
      if (locationId === '-1') {
        return null;
      }
      return await getLicensesBySelectedAssets({
        assetIds: `{${selectedAssets.map(Number).join(',')}}`,
      });
    },
    refetchOnWindowFocus: false,
    enabled: !!locationId && !!selectedAssets,
    meta: {
      toastId: ['getLocationLicenseData', locationId, selectedAssets],
    },
  });

  useEffect(() => {
    refetchEquipmentList();
  }, [editFormState, refetchEquipmentList]);

  useEffect(() => {
    if (locationId === '-1') {
      setSelectedAssets([]);
      setAssetDropdown([]);
      return;
    }

    if (assetsData) {
      const dropdown: DropdownOption[] = assetsData.map((item) => {
        return {
          label: item.assetName.toString(),
          value: item.assetId.toString(),
        };
      });

      const initialSelectedAssets = assetsData.map((item) =>
        item.assetId.toString()
      );
      setSelectedAssets(initialSelectedAssets);
      setAssetDropdown(dropdown);
    }
  }, [assetsData, locationId]);

  useEffect(() => {
    if (locationId === '-1') {
      setSelectedModels([]);
      setModelDropdown([]);
      return;
    }
    if (modelsData) {
      const dropdown: DropdownOption[] = modelsData.map((item) => {
        return {
          label: item.name,
          value: item.modelId.toString(),
        };
      });
      const models = modelsData.map((item) => item.modelId.toString());
      setSelectedModels(models);
      setModelDropdown(dropdown);
    }
  }, [modelsData, locationId]);

  useEffect(() => {
    if (locationId === '-1') {
      setSelectedBrands([]);
      setBrandDropdown([]);
      return;
    }
    if (brandsData) {
      const dropdown: DropdownOption[] = brandsData.map((item) => {
        return {
          label: item.brand,
          value: item.brand,
        };
      });
      const selectedBrands = brandsData.map((item) => item.brand.toString());

      setSelectedBrands(selectedBrands);
      setBrandDropdown(dropdown);
    }
  }, [brandsData, locationId]);

  useEffect(() => {
    if (locationId === '-1') {
      setSelectedLicenses([]);
      setLicenseDropdown([]);
    }

    if (licenseData) {
      const dropdown: DropdownOption[] = licenseData.map((item) => {
        return {
          label: capitalizeFirstLetter(
            t(`common.${createTranslationKey(item.license)}`)
          ),
          value: capitalizeFirstLetter(item.license),
        };
      });

      const selectedLicenses = licenseData.map((item) =>
        capitalizeFirstLetter(item.license.toString())
      );
      setSelectedLicenses(selectedLicenses);
      setLicenseDropdown(dropdown);
    }
  }, [licenseData, locationId, currentLanguage]);

  useEffect(() => {
    setSearchParams((prev) => {
      prev.delete('page');
      return prev;
    });
  }, [locationId]);

  const handleModelChange = (e: string[]) => {
    setSelectedModels(e);
  };

  const handleBrandChange = (e: string[]) => {
    setSelectedBrands(e);
  };

  const handleAssetChange = (e: string[]) => {
    searchParams.delete('page');
    setSelectedAssets(e);
  };

  const handleLicenseChange = (e: string[]) => {
    setSelectedLicenses(e);
  };

  const handleSortColumn = (columnKey: string, sort: boolean | undefined) => {
    setSearchParams((searchParams) => {
      searchParams.set('orderBy', columnKey);
      if (sort === undefined) {
        searchParams.delete('orderType');
        searchParams.delete('orderBy');
      } else {
        searchParams.set('orderType', sort ? 'ASC' : 'DESC');
      }

      return searchParams;
    });
    setSortedColumn((prev) => {
      return prev.map((item) => {
        if (item.key === columnKey) {
          return { ...item, sortState: sort };
        } else {
          return { ...item, sortState: undefined };
        }
      });
    });
  };

  return {
    sortedColumns,
    selectedAssets,
    selectedBrands,
    selectedModels,
    selectedLicenses,
    licenseDropdown,
    assetDropdown,
    modelDropdown,
    brandDropdown,
    equipmentList,
    searchParams,
    setSearchParams,
    handleModelChange,
    handleBrandChange,
    handleAssetChange,
    handleSortColumn,
    handleLicenseChange,
  };
};
