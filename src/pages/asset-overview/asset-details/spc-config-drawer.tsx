/* eslint-disable simple-import-sort/imports */
import { Button, DateTimePicker, Drawer, InfoTooltip, Input } from '@digital-twin/components';
import { SettingsPreferences } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { format } from 'date-fns';
import { useSPCConfigDrawer } from './spc-config-drawer.hook';
import styles from './spc-config-drawer.module.scss';

interface SPCConfigDrawerProps {
  onClose: () => void;
  open: boolean;
  parameterId: number;
  parameterName: string;
}

export const SPCConfigDrawer = ({
  onClose,
  open,
  parameterId,
  parameterName,
}: SPCConfigDrawerProps) => {
  const {
    isPending,
    control,
    handleFormSubmit,
    controlCalculate,
    handleSubmitCalculate,
    reference,
    isPendingCalculate,
  } = useSPCConfigDrawer(parameterId, onClose);

  const maxTime = format(new Date(), 'yyyy-MM-dd');
  return (
    <Drawer
      title={t('common.parameter_control_chart_configuration')}
      icon={<SettingsPreferences />}
      open={open}
      onClose={onClose}
      onSubmit={handleFormSubmit}
      submitting={isPending}
      informationIcon={
        <InfoTooltip
          title={t('common.parameter_control_chart_configuration')}
          content={t('common.parameter_control_chart_configuration_info')}
          height={'fit-content'}
        />
      }
    >
      <div className={styles['spc-config-drawer']}>
        <h3>{parameterName}</h3>
        <div className={styles.container}>
          <div className={styles.title}>
            <h4>Control Limit</h4>
            <InfoTooltip
              title={t('common.spc_setup')}
              content={t('common.spc_setup_info')}
              height={'fit-content'}
            />
          </div>
          <div className={styles['input-container']}>
            <div className={styles['spec-limit']}>
              <Input
                control={control}
                registered={'lsl'}
                type={'number'}
                label={'LSL:'}
                wrapperProps={{ style: { width: '100%' } }}
                placeholder="Value"
                inputProps={{
                  step: 'any',
                }}
              />
              <Input
                control={control}
                registered={'usl'}
                type={'number'}
                label={'USL:'}
                wrapperProps={{ style: { width: '100%' } }}
                placeholder="Value"
                inputProps={{
                  step: 'any',
                }}
              />
            </div>
            <div className={styles['spec-limit']}>
              <Input
                control={control}
                registered={'lcl'}
                type={'number'}
                label={'LCL:'}
                wrapperProps={{ style: { width: '100%' } }}
                placeholder="Value"
                inputProps={{
                  step: 'any',
                }}
              />
              <Input
                control={control}
                registered={'ucl'}
                type={'number'}
                label={'UCL'}
                wrapperProps={{ style: { width: '100%' } }}
                placeholder="Value"
                inputProps={{
                  step: 'any',
                }}
              />
            </div>
            <div className={styles['spec-limit']}>
              <Input
                control={control}
                registered={'centerLine'}
                type={'number'}
                label={'Centerline:'}
                wrapperProps={{ style: { width: '100%' } }}
                placeholder="Value"
                inputProps={{
                  step: 'any',
                }}
              />
              <Input
                control={control}
                registered={'sigma'}
                type={'number'}
                label={'Sigma'}
                wrapperProps={{ style: { width: '100%' } }}
                placeholder="Value"
                inputProps={{
                  step: 'any',
                }}
              />
            </div>
          </div>
          <div className={styles.hr} />
          <div className={styles.title}>
            <h4>Centerline & Sigma Reference Calculator</h4>
            <InfoTooltip />
          </div>
          <div className={styles['input-container']}>
            <div className={styles['spec-limit']}>
              <DateTimePicker
                type="datetime-local"
                max={maxTime}
                placeholder="Select Date"
                label={'Start Time:'}
                control={controlCalculate}
                registered={'startDate'}
                wrapperClassName={styles.datepicker}
              />
              <DateTimePicker
                type="datetime-local"
                max={maxTime}
                placeholder="Select Date"
                label={'End Time:'}
                control={controlCalculate}
                registered={'endDate'}
                wrapperClassName={styles.datepicker}
              />
            </div>
            <Button
              className={styles.calc_btn}
              onClick={handleSubmitCalculate}
              disabled={isPendingCalculate}
            >
              Calculate
            </Button>
            <div className={styles['spec-limit']}>
              <Input
                type={'number'}
                label={'LCL:'}
                wrapperProps={{ style: { width: '100%' } }}
                value={reference.lcl}
                readOnly
                placeholder="Value"
              />
              <Input
                type={'number'}
                label={'UCL:'}
                wrapperProps={{ style: { width: '100%' } }}
                value={reference.ucl}
                readOnly
                placeholder="Value"
              />
            </div>
            <div className={styles['spec-limit']}>
              <Input
                type={'number'}
                label={'Centerline Reference:'}
                wrapperProps={{ style: { width: '100%' } }}
                value={reference.centerline}
                readOnly
                placeholder="Value"
              />
              <Input
                type={'number'}
                label={'Sigma Reference:'}
                wrapperProps={{ style: { width: '100%' } }}
                value={reference.sigma}
                readOnly
                placeholder="Value"
              />
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
