import { ConditionEnum, StatusEnum } from '../../..';

export type TGetAssetEnergyOverviewParams = {
  start: string;
  end: string;
  status: string[] | null;
  conditions: string[] | null;
  typeIds: number[] | null;
  modelIds: number[] | null;
  assetIds: number[];
  locationIds: number[] | null;
  search: string;
  page: number;
  limit: number;
  timezoneOffset: number;
};
export type Asset<T> = {
  id: number;
  name: string;
  status: StatusEnum | null;
  statusStartTime: string | null;
  image: string | null;
  runningHours: number;
  model: string;
  type: string;
  conditionStartTime: string | null;
  condition: ConditionEnum | null;
  warningCount: number;
  criticalCount: number;
  uptime: number | null;
} & T;
export type TGetAssetEnergyOverviewReturn<T> = {
  counts: number;
  assets: Asset<T>[];
};
