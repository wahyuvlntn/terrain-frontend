import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { PermissionAliasEnum } from '../../index';
import { AuthCtx, PermissionGroupAliasEnum } from '../../index';
import { TGetAssetEnergyOverviewReturn } from '../asset-energy-overview.api';
import {
  Description,
  getAssetSpec,
  updateAssetSpec,
  UpdateSpec,
  updateSpecSchema,
} from './asset-spec.api';

export type SpecType = 'critical' | 'supporting';
export type Column = 'aspect' | 'information';

const CRITICAL_SPEC_LENGTH = 5;
const SUPPORTING_SPEC_LENGTH = 15;

const createDesc = (length: number, toBeReplacedAsData: Description[]) => {
  return Array.from({ length }, (_v, idx) => ({
    ...{ rowId: idx.toString(), aspect: '', information: '' },
    ...(toBeReplacedAsData[idx] || {}),
  }));
};

export const useAspectSpec = (assetId: number, open: boolean) => {
  const queryClient = useQueryClient();
  const { data, refetch, isLoading } = useQuery({
    queryFn: () => getAssetSpec(assetId),
    queryKey: ['GET_ASSET_SPEC', { assetId }],
    placeholderData: () => {
      const asset = queryClient
        .getQueriesData<TGetAssetEnergyOverviewReturn<{}>>({
          queryKey: ['ASSET_OVERVIEW'],
          type: 'active',
        })[0]?.[1]
        ?.assets?.find((asset) => asset.id === assetId);
      return asset
        ? {
            name: asset.name,
            image: asset.image,
            descriptions: {
              critical: [],
              supporting: [],
            },
          }
        : undefined;
    },
    enabled: open && !!assetId,
    meta: { toastId: 'GET_ASSET_SPEC' },
  });

  const { hasPermission } = useContext(AuthCtx);

  const [editMode, setEditMode] = useState({
    critical: new Map<string, boolean>(),
    supporting: new Map<string, boolean>(),
  });
  useEffect(() => {
    if (!data) return;

    setEditMode({
      critical: new Map(),
      supporting: new Map(),
    });
  }, [data]);
  const changeEditMode = (
    type: SpecType,
    subType: Column,
    idx: number,
    edit: boolean
  ) => {
    setEditMode((prev) => {
      if (edit) prev[type].set(`${idx}-${subType}`, true);
      else prev[type].delete(`${idx}-${subType}`);
      return {
        ...prev,
      };
    });
  };

  const methods = useForm<UpdateSpec>({
    resolver: zodResolver(updateSpecSchema),
    values: {
      assetId: assetId,
      supporting: createDesc(
        SUPPORTING_SPEC_LENGTH,
        data?.descriptions.supporting ?? []
      ),
      critical: createDesc(
        CRITICAL_SPEC_LENGTH,
        data?.descriptions.critical ?? []
      ),
    },
  });
  const { control, handleSubmit } = methods;
  const { fields: fieldsCritical } = useFieldArray({
    control,
    name: 'critical',
  });
  const { fields: fieldsSupporting } = useFieldArray({
    control,
    name: 'supporting',
  });

  const { mutate } = useMutation({
    mutationFn: (data: UpdateSpec) =>
      updateAssetSpec({
        ...data,
        critical: data.critical.filter(
          (item) => item.aspect || item.information
        ),
        supporting: data.supporting.filter(
          (item) => item.aspect || item.information
        ),
      }),
    onSuccess: () => refetch(),
    onMutate: () =>
      setEditMode({
        critical: new Map(),
        supporting: new Map(),
      }),
    meta: { toastId: 'UPDATE_ASSET_SPEC' },
  });

  const onSubmit = handleSubmit(
    (data: UpdateSpec) => mutate(data),
    (_errors, _event) => {
      // console.log({
      //   errors,
      //   event,
      // });
    }
  );

  return {
    name: data?.name ?? '',
    image: data?.image,
    fieldsCritical,
    fieldsSupporting,
    control,
    editMode,
    changeEditMode: hasPermission(
      PermissionGroupAliasEnum.enum.equipmentoverview,
      PermissionAliasEnum.enum.update
    )
      ? changeEditMode
      : undefined,
    methods,
    onSubmit,
    isLoading,
  };
};
