import { ImagePlaceholder } from '@digital-twin/icons';
import { createContext } from 'react';

import { DropdownOption } from '../../../../../input';
import {
  EquipmentLicenseType,
  EquipmentModelType,
  GatewayEntryType,
  LocationNodeType,
} from '../schemas';

// Contexts
export const EquipmentModelsCtx = createContext<{
  models: EquipmentModelType[] | undefined;
  options: DropdownOption[] | undefined;
  ids: Record<string, number> | undefined;
  records:
    | Record<
        number,
        {
          name: string;
          type_id: number;
          type: string;
          brand_id: number;
          brand: string;
          series_id: number;
          series: string;
        }
      >
    | undefined;
  isLoading: boolean;
}>({
  models: undefined,
  options: undefined,
  ids: undefined,
  records: undefined,
  isLoading: false,
});

export const EquipmentLicensesCtx = createContext<{
  licenses: EquipmentLicenseType[] | undefined;
  options: DropdownOption[] | undefined;
  ids: Record<string, number> | undefined;
  records:
    | Record<
        number,
        {
          name: string;
          used: number;
          available: number;
          l_active: boolean;
          l_status: string;
        }
      >
    | undefined;
  isLoading: boolean;
}>({
  licenses: undefined,
  options: undefined,
  ids: undefined,
  records: undefined,
  isLoading: false,
});

export const EquipmentGatewaysCtx = createContext<{
  entries: GatewayEntryType[] | undefined;
  options: DropdownOption[] | undefined;
  records:
    | Record<
        string,
        {
          name: string;
          protocol_alias: string;
          protocol_name: string;
          status: boolean | null;
        }
      >
    | undefined;
  aliases: Record<string, string> | undefined;
  isLoading: boolean;
}>({
  entries: undefined,
  options: undefined,
  records: undefined,
  aliases: undefined,
  isLoading: false,
});

export const EquipmentLocationsCtx = createContext<{
  tree: LocationNodeType[] | undefined;
  childIds: Record<number, number[]> | undefined;
  isLoading: boolean;
}>({
  tree: undefined,
  childIds: undefined,
  isLoading: false,
});

export const ImagePlaceholderCtx = createContext<string>(
  ImagePlaceholder('white')
);
