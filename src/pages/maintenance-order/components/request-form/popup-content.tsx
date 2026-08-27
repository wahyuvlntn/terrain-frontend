import { Input } from '@digital-twin/components';
import { RadioButton } from '@digital-twin/reusables';
import { UseFormReturn } from 'react-hook-form';

import { MaintenanceNameAndTypeType } from '../../api/maintenance-order';
import styles from '../request-form.module.scss';
import { FormType, PopupType } from './types';

interface PopupContentProps {
  type: PopupType;
  maintenanceNameAndType?: MaintenanceNameAndTypeType;
  isRecurring: boolean;
  requestForm: UseFormReturn<FormType>;
}

export const PopupContent = ({
  type,
  maintenanceNameAndType,
  isRecurring,
  requestForm,
}: PopupContentProps) => {
  const is_recurring = requestForm.watch('is_recurring');
  return (
    <div className={styles['popup-content']}>
      {maintenanceNameAndType && (
        <div className={styles['maintenance-name-and-type']}>
          {maintenanceNameAndType?.name}, Type:{' '}
          {maintenanceNameAndType.is_corrective ? 'Corrective' : 'Preventive'}
        </div>
      )}
      {isRecurring ? (
        type === 'APPROVE' ? (
          <div className={styles['inner-content']}>
            <div>This maintenance order is part of a recurring schedule</div>
            <div>Choose how you want to apply your approval.</div>
          </div>
        ) : type === 'REJECT' ? (
          <div className={styles['inner-content']}>
            <div>This maintenance order is part of a recurring schedule</div>
            <div>Choose how you want to apply your rejection.</div>
          </div>
        ) : type === 'DELETE' ? (
          <div className={styles['inner-content']}>
            <div>This maintenance order is part of a recurring schedule</div>
            <div>Choose which orders you want to delete.</div>
          </div>
        ) : type === 'EDIT' ? (
          <div className={styles['inner-content']}>
            <div>This maintenance order is part of a recurring schedule</div>
            <div>Choose how you want to apply your changes.</div>
          </div>
        ) : type === 'SAVE_DRAFT' ? (
          <div className={styles['inner-content']}>
            <div>This maintenance order is part of a recurring schedule</div>
            <div>Choose how you want to save this as draft.</div>
          </div>
        ) : (
          ''
        )
      ) : type === 'CREATE' ? (
        'Are you sure want to create this request?'
      ) : type === 'CANCEL' ? (
        <div className={styles['inner-content']}>
          <div>Are you sure want to cancel this request?</div>
          <div className={styles['notes']}>Your request won't be saved</div>
        </div>
      ) : type === 'APPROVE' ? (
        'Are you sure want to approve this request?'
      ) : type === 'REJECT' ? (
        'Are you sure want to reject this request?'
      ) : type === 'DELETE' ? (
        <div className={styles['inner-content']}>
          <div>Are you sure want to delete this maintenance order?</div>
          <div className={styles['notes']}>This maintenance order will be permanently deleted</div>
        </div>
      ) : type === 'EDIT' || type === 'SAVE_DRAFT' ? (
        'Are you sure want to save these changes?'
      ) : (
        ''
      )}
      {isRecurring && (
        <div className={styles['radio-buttons']}>
          <RadioButton
            checked={!is_recurring}
            label="This maintenance order only"
            onClick={() => {
              requestForm.setValue('is_recurring', false);
            }}
          />
          <RadioButton
            checked={is_recurring}
            label="This and all following maintenance orders"
            onClick={() => {
              requestForm.setValue('is_recurring', true);
            }}
          />
        </div>
      )}
      {type === 'REJECT' && (
        <Input
          label="Rejection reason:"
          placeholder="Add reason for rejection (optional)"
          control={requestForm.control}
          registered="reject_reason"
        />
      )}
    </div>
  );
};
