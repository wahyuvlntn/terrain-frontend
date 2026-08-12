import { SettingsPreferences, WarningAlarm, WarningFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';

import {
  ClosedBy,
  COLOR,
  Drawer,
  Dropdown,
  DropdownOption,
  InfoTooltip,
  Input,
  ToggleButton,
} from '../../../../index';
import { ThresholdGreaterThanList, ThresholdLessThanList } from '../../type';
import { useParameterSetupDrawer } from './parameter-setup-drawer.hook';
import styles from './parameter-setup-drawer.module.scss';

interface ParameterSetupDrawerProps {
  onClose: () => void;
  open: boolean;
  parameterId: number;
  parameterName: string;
}

export const ParameterSetupDrawer = ({
  parameterName,
  parameterId,
  onClose,
  open,
}: ParameterSetupDrawerProps) => {
  const { isPending, control, handleFormSubmit, handleReset } =
    useParameterSetupDrawer(parameterId, onClose);

  const renderLimitSection = (
    title: string,
    key: `${'warning' | 'critical'}${'Upper' | 'Lower'}Limit`,
    thresholdTypeOptions: DropdownOption[]
  ) => (
    <div className={styles.container}>
      <div className={styles['container-header']}>
        <div className={styles.title}>
          {key.includes('critical') ? (
            <WarningAlarm
              style={{
                color: COLOR.conditionCriticalPrimary,
                width: '15px',
                height: '15px',
              }}
            />
          ) : (
            <WarningFill
              style={{
                color: COLOR.conditionWarningPrimary,
                width: '20px',
                height: '20px',
              }}
            />
          )}
          <h4>{title}</h4>
        </div>
        <ToggleButton
          label={t('common.enable')}
          control={control}
          registered={`${key}Enabled`}
        />
      </div>
      <div className={styles['input-container']}>
        <Input
          readOnly
          value={t('common.value')}
          labelStyle={{
            height: 18.34,
          }}
          wrapperProps={{
            className: styles.input,
          }}
        />
        <Dropdown
          options={thresholdTypeOptions}
          control={control}
          registered={`${key}ThresholdType`}
        />
        <Input
          control={control}
          registered={key}
          type={'number'}
          labelStyle={{
            height: 18.34,
          }}
          wrapperProps={{
            className: styles.input,
          }}
        />
      </div>
    </div>
  );

  return (
    <Drawer
      title={t('common.parameter_limit_configuration')}
      icon={<SettingsPreferences />}
      open={open}
      onClose={onClose}
      onSubmit={handleFormSubmit}
      submitting={isPending}
      afterClose={(closeBy: ClosedBy) => {
        if (closeBy === 1) {
          handleReset();
        }
      }}
      informationIcon={
        <InfoTooltip
          title={t('common.parameter_limit_configuration')}
          content={
            t('common.parameter_limit_configuration_info')
            // 'Parameter warning and critical thresholds/limits configuration'
          }
          height={'fit-content'}
        />
      }
    >
      <div className={styles['parameter-setup-drawer']}>
        <h3>{parameterName}</h3>
        {renderLimitSection(
          t('common.upper_critical_limit'),
          'criticalUpperLimit',
          ThresholdGreaterThanList
        )}
        {renderLimitSection(
          t('common.upper_warning_limit'),
          'warningUpperLimit',
          ThresholdGreaterThanList
        )}
        {renderLimitSection(
          t('common.lower_warning_limit'),
          'warningLowerLimit',
          ThresholdLessThanList
        )}
        {renderLimitSection(
          t('common.lower_critical_limit'),
          'criticalLowerLimit',
          ThresholdLessThanList
        )}
      </div>
    </Drawer>
  );
};
