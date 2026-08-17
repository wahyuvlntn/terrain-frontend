/* eslint-disable simple-import-sort/imports */
import {
  AnomalyCircleFill2 as AbnormalParameterIcon,
  AlertAlarmFill2 as AlertAlarmIcon,
  CriticalAlertFill2 as CriticalAlarmIcon,
  WarningFill2 as WarningAlarmIcon,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';

import { COLOR, Loading, Metric } from '../../../../index';
import style from './alarm-metric.module.scss';

interface AlarmMetricProps {
  totalAlarm: number;
  totalCriticalAlarm: number;
  totalWarningAlarm: number;
  totalAbnormalParameter: number;
  isFetching: boolean;
}

export default function AlarmMetricProps({
  totalAlarm,
  totalCriticalAlarm,
  totalWarningAlarm,
  totalAbnormalParameter,
  isFetching,
}: AlarmMetricProps) {
  return (
    <div className={style['alarm-metric-container']}>
      <Loading isLoading={isFetching} />
      <Metric
        containerClassName={style.metric__item}
        borderColor={COLOR.accentInfoPrimary}
        title={t('common.total_alarms')}
        value={totalAlarm.toLocaleString()}
        icon={<AlertAlarmIcon style={{ color: COLOR.foundationNeutralWhite }} />}
        containerStyle={{ flex: 1, color: COLOR.foundationNeutralWhite }}
      />
      <Metric
        containerClassName={style.metric__item}
        borderColor={COLOR.conditionCriticalPrimary}
        title={t('common.critical_alarms')}
        value={totalCriticalAlarm.toLocaleString()}
        icon={
          <CriticalAlarmIcon style={{ color: COLOR.foundationNeutralWhite }} />
        }
        containerStyle={{ flex: 1 }}
      />
      <Metric
        containerClassName={style.metric__item}
        borderColor={COLOR.conditionWarningPrimary}
        title={t('common.warning_alarms')}
        value={totalWarningAlarm.toLocaleString()}
        icon={
          <WarningAlarmIcon style={{ color: COLOR.foundationNeutralWhite }} />
        }
        containerStyle={{ flex: 1 }}
      />
      <Metric
        containerClassName={style.metric__item}
        borderColor={COLOR.conditionAbnormalPrimary}
        title={t('common.abnormal_alarms')}
        value={totalAbnormalParameter.toLocaleString()}
        icon={
          <AbnormalParameterIcon
            style={{ color: COLOR.foundationNeutralWhite }}
          />
        }
        containerStyle={{ flex: 1 }}
      />

      {/* <ParameterDisplay
        borderColor={COLOR.brandPrimary}
        className={style['parameter-display']}
      >
        <div className={style['title-container']}>Total Alarms</div>
        <div className={style['value-container']}>
          <TotalAlarmIcon style={{ color: COLOR.brandPrimary }} />
          <div>{totalAlarm.toLocaleString()}</div>
        </div>
      </ParameterDisplay> */}
      {/* <ParameterDisplay
        borderColor={COLOR.conditionCriticalSecondary}
        className={style['parameter-display']}
      >
        <div className={style['title-container']}>Critical Alarms</div>
        <div className={style['value-container']}>
          <CriticalAlarmIcon
            style={{ color: COLOR.conditionCriticalSecondary }}
          />
          <div>{totalCriticalAlarm.toLocaleString()}</div>
        </div>
      </ParameterDisplay>
      <ParameterDisplay
        borderColor={COLOR.conditionWarningSecondary}
        className={style['parameter-display']}
      >
        <div className={style['title-container']}>Warning Alarms</div>
        <div className={style['value-container']}>
          <WarningAlarmIcon
            style={{
              color: COLOR.conditionWarningSecondary,
            }}
          />
          <div>{totalWarningAlarm.toLocaleString()}</div>
        </div>
      </ParameterDisplay>
      {variant === 'epm' && (
        <ParameterDisplay
          borderColor={COLOR.conditionAbnormalPrimary}
          className={style['parameter-display']}
        >
          <div className={style['title-container']}>Abnormal Alarms</div>
          <div className={style['value-container']}>
            <AbnormalParameterIcon style={{ color: COLOR.neutralTextTitleHeading }} />
            <div>{totalAbnormalParameter.toLocaleString()}</div>
          </div>
        </ParameterDisplay>
      )} */}
    </div>
  );
}
