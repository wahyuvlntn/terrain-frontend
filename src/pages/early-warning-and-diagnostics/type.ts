import { FILTER_KEY_MODEL, FILTER_KEY_SEVERITY } from '@digital-twin/components';

export type GeneralFilterType = {
  [FILTER_KEY_MODEL]: string;
  [FILTER_KEY_SEVERITY]: number;
};

export type EarlyWarningFilterType = {
  search: string | null;
  page: string | null;
  selected: string | null;
  start: string | null;
  end: string | null;
  compound: string | null;
  degradation: string | null;
};
