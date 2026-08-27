import {
  FILTER_KEY_MAINTENANCE_STATUS,
  FILTER_KEY_MAINTENANCE_TYPE,
  FILTER_KEY_PRIORITY,
  FILTER_KEY_SEVERITY,
  FILTER_KEY_TECHNICIAN,
} from '@digital-twin/components';

export type GeneralFilterType = {
  [FILTER_KEY_MAINTENANCE_STATUS]: string;
  [FILTER_KEY_SEVERITY]: number;
  [FILTER_KEY_PRIORITY]: number;
  [FILTER_KEY_MAINTENANCE_TYPE]: number;
  [FILTER_KEY_TECHNICIAN]: string;
};

export type MaintenanceOrderFilterType = {
  view: 'calendar' | 'list' | null;
  search: string | null;
  page: string | null;
  tab: 'details' | 'work-report' | 'progress' | null;
  selected: string | null;
  selectedName: string | null;
  selectedStatus:
    | 'REQUESTED'
    | 'IN_PROGRESS'
    | 'DONE'
    | 'REJECTED'
    | 'OPEN'
    | 'CLOSED'
    | 'PAUSED'
    | null;
  selectedIsCorrective: string | null;
  add: string | null;
  start: string | null;
  end: string | null;
};
