import {
  ClipboardCheck,
  CloseDownErrorCircle,
  CriticalAlertFill,
  EventBusy,
  Maintenance,
  Off,
  OffFill,
  PauseFill,
  PlayFill,
  ProductionReport,
  SuccessNormalCheckCircle2Fill,
  TimeEmpty,
  Uptime,
  WarningFill,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { z } from 'zod';

import { COLOR } from './color';

export const StatusEnum = z.enum([
  'RUNNING',
  'IDLE',
  'PLANNED DOWN',
  'UNPLANNED DOWN',
  'OFFLINE',
  'DOWN',
]);
export type StatusEnum = z.infer<typeof StatusEnum>;
z.enum(['INCIDENT REPORT', 'METER READING', 'ISSUE TICKET', 'SAFETY REPORT']);

export const ConditionEnum = z.enum(['NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE']);
export type ConditionEnum = z.infer<typeof ConditionEnum>;

export const ProductionStateEnum = z.enum(['PRODUCTION', 'PAUSED', 'NO PRODUCTION']);
export type ProductionStateEnum = z.infer<typeof ProductionStateEnum>;

export const AlarmEnum = z.enum(['WARNING', 'CRITICAL', 'NORMAL']);
export type AlarmEnum = z.infer<typeof AlarmEnum>;

export const AlarmTypeEnum = z.enum(['ALARM', 'ABNORMAL']);
export const ProductionEnum = z.enum(['PRODUCTION', 'DEFECT']);

export const LicenseStatusEnum = z.enum(['ACTIVE', 'INACTIVE']);
export type LicenseStatusEnum = z.infer<typeof LicenseStatusEnum>;

export const MaintenanceStatusEnum = z.enum([
  'Requested',
  'Rejected',
  'Open',
  'In Progress',
  'Done',
  'Closed',
  'Paused',
]);
export type MaintenanceStatusEnum = z.infer<typeof MaintenanceStatusEnum>;

export const InstructionTypeEnum = z.enum(['Diagnostic', 'Repair', 'Severity']);
export type InstructionTypeEnum = z.infer<typeof InstructionTypeEnum>;

export const STATUS_ICON = {
  [StatusEnum.enum.RUNNING]: <Uptime />,
  [StatusEnum.enum.IDLE]: <TimeEmpty />,
  [StatusEnum.enum['UNPLANNED DOWN']]: <CloseDownErrorCircle />,
  [StatusEnum.enum.OFFLINE]: <Off />,
  [StatusEnum.enum['PLANNED DOWN']]: <Maintenance />,
  [StatusEnum.enum.DOWN]: <CloseDownErrorCircle />,
};

export const CONDITION_ICON = {
  [ConditionEnum.enum.NORMAL]: <SuccessNormalCheckCircle2Fill />,
  [ConditionEnum.enum.WARNING]: <WarningFill />,
  [ConditionEnum.enum.CRITICAL]: <CriticalAlertFill />,
  [ConditionEnum.enum.OFFLINE]: <OffFill />,
};

export const PRODUCTION_STATE_ICON = {
  [ProductionStateEnum.enum.PRODUCTION]: <PlayFill />,
  [ProductionStateEnum.enum.PAUSED]: <PauseFill />,
  [ProductionStateEnum.enum['NO PRODUCTION']]: <EventBusy />,
};

export const ALARM_ICON = {
  [AlarmEnum.enum.WARNING]: <WarningFill />,
  [AlarmEnum.enum.CRITICAL]: <CriticalAlertFill />,
};

export const PRODUCTION_ICON = {
  [ProductionEnum.enum.PRODUCTION]: <ProductionReport color={COLOR.accentInfoPrimary} />,
  [ProductionEnum.enum.DEFECT]: <ClipboardCheck color={COLOR.conditionCriticalPrimary} />,
};

export const STATUS_COLOR = {
  [StatusEnum.enum.RUNNING]: COLOR.statusRunningPrimary,
  [StatusEnum.enum.IDLE]: COLOR.statusIdlePrimary,
  [StatusEnum.enum['UNPLANNED DOWN']]: COLOR.statusUnplanned_downPrimary,
  [StatusEnum.enum.OFFLINE]: COLOR.statusOfflinePrimary,
  [StatusEnum.enum['PLANNED DOWN']]: COLOR.statusPlanned_downPrimary,
  [StatusEnum.enum.DOWN]: COLOR.statusUnplanned_downPrimary,
};

export const CONDITION_COLOR = {
  [ConditionEnum.enum.NORMAL]: COLOR.conditionNormalPrimary,
  [ConditionEnum.enum.WARNING]: COLOR.conditionWarningPrimary,
  [ConditionEnum.enum.CRITICAL]: COLOR.conditionCriticalPrimary,
  [ConditionEnum.enum.OFFLINE]: COLOR.statusOfflinePrimary,
};

export const PRODUCTION_STATE_COLOR = {
  [ProductionStateEnum.enum.PRODUCTION]: COLOR.accentInfoPrimary,
  [ProductionStateEnum.enum.PAUSED]: COLOR.conditionCriticalSecondary,
  [ProductionStateEnum.enum['NO PRODUCTION']]: COLOR.statusOfflinePrimary,
};

export const ALARM_COLOR = {
  [AlarmEnum.enum.NORMAL]: COLOR.conditionNormalPrimary,
  [AlarmEnum.enum.WARNING]: COLOR.conditionWarningSecondary,
  [ConditionEnum.enum.CRITICAL]: COLOR.conditionCriticalSecondary,
};

export const MAINTENANCE_STATUS_COLOR = {
  [MaintenanceStatusEnum.enum.Requested]: COLOR.severityTagsStatusRequested,
  [MaintenanceStatusEnum.enum.Rejected]: COLOR.severityTagsStatusRejected,
  [MaintenanceStatusEnum.enum.Open]: COLOR.severityTagsStatusOpen,
  [MaintenanceStatusEnum.enum['In Progress']]: COLOR.severityTagsStatusInProgress,
  [MaintenanceStatusEnum.enum.Done]: COLOR.severityTagsStatusDone,
  [MaintenanceStatusEnum.enum.Closed]: COLOR.severityTagsStatusClosed,
  [MaintenanceStatusEnum.enum.Paused]: COLOR.severityTagsStatusPaused,
};

export const STATUS_NAME = {
  [StatusEnum.enum.RUNNING]: t(`common.running`),
  [StatusEnum.enum.IDLE]: t(`common.idle`),
  [StatusEnum.enum['UNPLANNED DOWN']]: t(`common.unplanned_down`),
  [StatusEnum.enum.OFFLINE]: t(`common.off_offline`),
  [StatusEnum.enum['PLANNED DOWN']]: t(`common.planned_down`),
  [StatusEnum.enum.DOWN]: t(`common.down`),
};

export const CONDITION_NAME = {
  [ConditionEnum.enum.NORMAL]: t(`common.normal`),
  [ConditionEnum.enum.WARNING]: t(`common.warning`),
  [ConditionEnum.enum.CRITICAL]: t(`common.critical`),
  [ConditionEnum.enum.OFFLINE]: t(`common.off_offline`),
};

export const PRODUCTION_STATE_NAME = {
  [ProductionStateEnum.enum.PRODUCTION]: t(`common.production`),
  [ProductionStateEnum.enum.PAUSED]: t(`common.paused`),
  [ProductionStateEnum.enum['NO PRODUCTION']]: t(`common.no_production`),
};

export const ALARM_TYPE_NAME = {
  [AlarmTypeEnum.enum.ALARM]: t(`common.alarm`),
  [AlarmTypeEnum.enum.ABNORMAL]: t(`common.abnormal`),
};

export const LICENSE_STATUS_NAME = {
  [LicenseStatusEnum.enum.ACTIVE]: t(`common.active`),
  [LicenseStatusEnum.enum.INACTIVE]: t(`common.inactive`),
};

export const INSTRUCTION_TYPE_NAME = {
  [InstructionTypeEnum.Enum.Diagnostic]: 'Diagnostic',
  [InstructionTypeEnum.Enum.Repair]: 'Repair',
  [InstructionTypeEnum.Enum.Severity]: 'Severity',
}

// function to trigger update constant object based on current language
export const updateObjectMapping = () => {
  STATUS_NAME[StatusEnum.enum.RUNNING] = t(`common.running`);
  STATUS_NAME[StatusEnum.enum.IDLE] = t(`common.idle`);
  STATUS_NAME[StatusEnum.enum['UNPLANNED DOWN']] = t(`common.unplanned_down`);
  STATUS_NAME[StatusEnum.enum.OFFLINE] = t(`common.off_offline`);
  STATUS_NAME[StatusEnum.enum['PLANNED DOWN']] = t(`common.planned_down`);
  STATUS_NAME[StatusEnum.enum.DOWN] = t(`common.down`);

  CONDITION_NAME[ConditionEnum.enum.NORMAL] = t(`common.normal`);
  CONDITION_NAME[ConditionEnum.enum.WARNING] = t(`common.warning`);
  CONDITION_NAME[ConditionEnum.enum.CRITICAL] = t(`common.critical`);
  CONDITION_NAME[ConditionEnum.enum.OFFLINE] = t(`common.off_offline`);

  PRODUCTION_STATE_NAME[ProductionStateEnum.enum.PRODUCTION] = t(`common.production`);
  PRODUCTION_STATE_NAME[ProductionStateEnum.enum.PAUSED] = t(`common.paused`);
  PRODUCTION_STATE_NAME[ProductionStateEnum.enum['NO PRODUCTION']] = t(`common.no_production`);

  ALARM_TYPE_NAME[AlarmTypeEnum.enum.ALARM] = t(`common.alarm`);
  ALARM_TYPE_NAME[AlarmTypeEnum.enum.ABNORMAL] = t(`common.abnormal`);

  LICENSE_STATUS_NAME[LicenseStatusEnum.enum.ACTIVE] = t(`common.active`);
  LICENSE_STATUS_NAME[LicenseStatusEnum.enum.INACTIVE] = t(`common.inactive`);
};
