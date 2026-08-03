/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
import { Settings } from '@digital-twin/icons';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Dropdown, Input, InputProps, ToggleButton, ToggleButtonProps } from '../../../../../input';
import { Popup } from '../../../../../navigation';
import { useModelDropdowns, useModelRunningHourLimit } from '../hooks/model';
import styles from './running-hour-limit-popup.module.scss';

type RunningHourLimitPopupProps = {
  open: boolean;
  onClose: () => void;
};

const LimitSection = ({
  title,
  inputProps,
  toggleProps,
  children,
}: {
  title: string;
  inputProps: InputProps<any>;
  toggleProps: ToggleButtonProps<any>;
  children?: React.ReactNode;
}) => (
  <div className={styles.RunningHourLimitPopup__Section}>
    <span className={styles.RunningHourLimitPopup__Section__Title}>{title}</span>
    <div className={styles.RunningHourLimitPopup__Section__DataContainer}>
      <div className={styles.RunningHourLimitPopup__Section__InputContainer}>
        <Input
          {...inputProps}
          label="Repeat Every:"
          type="number"
          wrapperProps={{
            className: styles.RunningHourLimitPopup__Section__Input,
          }}
        />
        <span className={styles.RunningHourLimitPopup__Section__Label}>Hours</span>
      </div>
      <div className={styles.ToggleBtnContainer}>
        <span className={styles.ToggleBtnContainer__Label}>Action: </span>
        <div className={styles.ToggleBtnContainer__ToggleBtn}>
          <span className={styles.ToggleBtnContainer__Label}>Send Notification</span>
          <ToggleButton {...toggleProps} wrapperStyles={{ fontSize: 32 }} />
        </div>
      </div>
    </div>
    {children}
  </div>
);

export const RunningHourLimitPopup = ({ onClose, open }: RunningHourLimitPopupProps) => {
  const [selectedModelId, setSelectedModelId] = useState<number | undefined>();

  const { data: models } = useModelDropdowns();

  useEffect(() => {
    if (selectedModelId != null || !models) {
      return;
    }
    setSelectedModelId(models[0].id);
  }, [selectedModelId, models]);

  const { control, isPending, handleSubmit } = useModelRunningHourLimit(selectedModelId);

  return (
    <Popup
      title="Set Running Hours Limit"
      icon={<Settings />}
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      disableSubmit={selectedModelId == null}
      submitting={isPending}
      background="none"
      variant="save"
    >
      <div className={styles.RunningHourLimitPopup}>
        <Dropdown
          options={models?.map((model) => ({
            label: model.name,
            value: model.id.toString(),
          }))}
          label="Equipment Model:"
          labelPosition="left"
          wrapperStyles={{ width: 400 }}
          value={selectedModelId?.toString() ?? ''}
          onChange={(value) => setSelectedModelId(parseInt(value))}
          searchable={true}
        />

        {/* Warning Section */}
        <LimitSection
          title="Warning Limit"
          inputProps={{ control, registered: 'warningHour', disabled: selectedModelId == null }}
          toggleProps={{
            control,
            registered: 'isNotifyWarning',
            disabled: selectedModelId == null,
          }}
        />

        {/* Critical Section */}
        <LimitSection
          title="Critical Limit"
          inputProps={{
            control,
            registered: 'criticalHour',
            disabled: selectedModelId == null,
          }}
          toggleProps={{
            control,
            registered: 'isNotifyCritical',
            disabled: selectedModelId == null,
          }}
        >
          {/* Extra Toggle for Critical Section only */}
          <div
            className={clsx(
              styles.ToggleBtnContainer,
              styles.RunningHourLimitPopup__Section__AutoCreateMaintenance
            )}
          >
            <div className={styles.ToggleBtnContainer__ToggleBtn}>
              <span className={styles.ToggleBtnContainer__Label}>
                Auto Create Maintenance Request
              </span>
              <ToggleButton
                {...{
                  control,
                  registered: 'isAutoCreateMaintenance',
                  disabled: selectedModelId == null,
                }}
                wrapperStyles={{ fontSize: 32 }}
              />
            </div>
          </div>
        </LimitSection>
      </div>
    </Popup>
  );
};
