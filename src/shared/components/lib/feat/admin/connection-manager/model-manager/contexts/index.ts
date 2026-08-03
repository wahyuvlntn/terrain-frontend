// React builtins
import { createContext } from 'react';

// Schemas
import {
  BaseModelEntryType,
  MasterDataEntryType,
  ModelParameterTypeEntryType,
} from '../schemas';

export const PrjCtx = createContext<string>('');

export const BaseModelsCtx = createContext<{
  entries?: BaseModelEntryType[];
  records?: Record<
    number,
    { name: string; type_id: number; brand_id: number; series_id: number }
  >;
  isLoading: boolean;
}>({
  isLoading: false,
});

export const TypesCtx = createContext<{
  entries?: MasterDataEntryType[];
  isLoading: boolean;
}>({
  isLoading: false,
});

export const BrandsCtx = createContext<{
  entries?: MasterDataEntryType[];
  isLoading: boolean;
}>({
  isLoading: false,
});

export const SeriesCtx = createContext<{
  entries?: MasterDataEntryType[];
  isLoading: boolean;
}>({
  isLoading: false,
});

export const GainsCtx = createContext<{
  entries?: MasterDataEntryType[];
  records?: Record<number, string>;
  isLoading: boolean;
}>({
  isLoading: false,
});

export const ParameterTypesCtx = createContext<{
  entries?: ModelParameterTypeEntryType[];
  records?: Record<number, Omit<ModelParameterTypeEntryType, 'id'>>;
  isLoading: boolean;
}>({
  isLoading: false,
});
