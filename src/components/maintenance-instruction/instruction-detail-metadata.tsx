import { TimeEmpty } from '@digital-twin/icons';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { ReactNode } from 'react';

import styles from './instruction-detail-metadata.module.scss';

type InstructionDetailLabelValuePairProps = {
  label: string;
  value: string;
};

const InstructionDetailLabelValuePair = ({
  label,
  value,
}: InstructionDetailLabelValuePairProps) => {
  return (
    <div className={styles.InstructionDetailKeyValuePair}>
      <span className={styles.InstructionDetailKeyValuePair__Key}>{label}</span>
      <span className={styles.InstructionDetailKeyValuePair__Separator}>:</span>
      <span className={styles.InstructionDetailKeyValuePair__Value}>{value}</span>
    </div>
  );
};

type InstructionDetailChildContainerProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

const InstructionDetailChildContainer = ({
  title,
  children,
  className,
}: InstructionDetailChildContainerProps) => {
  return (
    <div className={clsx(styles.InstructionDetailChildContainer, className)}>
      <span className={styles.InstructionDetailChildContainer__Title}>{title}</span>
      {children}
    </div>
  );
};

type InstructionDetailMetadataProps = {
  description: string;
  assetNames: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string | null;
  duration: number;
  alarmCode: string;
};

export const InstructionDetailMetadata = ({
  createdAt,
  createdBy,
  updatedAt,
  assetNames,
  duration,
  description,
  alarmCode
}: InstructionDetailMetadataProps) => {
  const formattedCreatedAt = createdAt ? format(new Date(createdAt), 'dd MMMM yyyy') : '';
  const formattedUpdatedAt = updatedAt ? format(new Date(updatedAt), 'dd MMMM yyyy') : '-';

  return (
    <div className={styles.InstructionDetailMetadata}>
      <InstructionDetailChildContainer
        title={'Description'}
        className={styles.InstructionDetailMetadata__DescriptionContainer}
      >
        <span className={styles.InstructionDetailMetadata__DescriptionLabel} title={description}>
          {description || '-'}
        </span>
      </InstructionDetailChildContainer>
      <InstructionDetailChildContainer title={'Details'}>
        <div className={styles.InstructionDetailMetadata__DetailsContainer}>
          <InstructionDetailLabelValuePair label={'Alarm Code'} value={alarmCode} />
          <InstructionDetailLabelValuePair label={'Created by'} value={createdBy} />
          <InstructionDetailLabelValuePair label={'Submission Date'} value={formattedCreatedAt} />
          <InstructionDetailLabelValuePair label={'Last Updated Date'} value={formattedUpdatedAt} />
        </div>
      </InstructionDetailChildContainer>
      <InstructionDetailChildContainer title={'Estimated Time'}>
        <div className={styles.InstructionDetailMetadata__Badge}>
          <TimeEmpty />
          <span>{`${duration} ${duration > 1 ? 'minutes' : 'minute'}`}</span>
        </div>
      </InstructionDetailChildContainer>
      <InstructionDetailChildContainer
        title={'Assigned Equipment Model'}
        className={styles.EquipmentContainer}
      >
        <div className={styles.InstructionDetailMetadata__EquipmentContainer}>
          {assetNames?.map((assetName) => (
            <div key={assetName} className={styles.InstructionDetailMetadata__Badge}>
              {assetName}
            </div>
          ))}
        </div>
      </InstructionDetailChildContainer>
    </div>
  );
};
