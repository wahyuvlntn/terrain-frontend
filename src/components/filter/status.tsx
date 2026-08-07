import { StatusEnum, StatusTree as StatusTreeReusable } from '@digital-twin/components';
import { t } from '@digital-twin/utils';

export const StatusTree = () => {
  return (
    <StatusTreeReusable
      data={{
        [StatusEnum.enum.RUNNING]: t(`common.running`),
        // [StatusEnum.enum.IDLE]: t(`common.idle`),
        [StatusEnum.enum['UNPLANNED DOWN']]: t(`common.unplanned_down`),
        [StatusEnum.enum.OFFLINE]: t(`common.offline`),
        [StatusEnum.enum['PLANNED DOWN']]: t(`common.planned_down`),
      }}
    />
  );
};
