import { AlarmReport, AlarmShortcut, AlarmTree } from '@digital-twin/components';

import { FILTER_KEY_TYPE, getTypeNamesQueryKey, TypeShortcut, TypeTree } from '../../components';

export const AlarmReportAM = () => {
  return (
    <AlarmReport
      filterTypeTree={<TypeTree />}
      filterTypeShortcut={<TypeShortcut />}
      filterTypeKey={FILTER_KEY_TYPE}
      getFilterTypeNamesQueryKey={getTypeNamesQueryKey}
      alarmTypeTree={<AlarmTree />}
      alarmTypeShortcut={<AlarmShortcut />}
    />
  );
};
