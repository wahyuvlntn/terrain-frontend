import {
  Button,
  Container,
  Dropdown,
  DropdownMultipleSelect,
  DropdownOptionCards,
  DropdownProps,
  Input,
  InputProps,
  TextBox,
  TextboxProps,
} from '@digital-twin/components';
import { ReactNode, useMemo, useState } from 'react';
import { Control, useWatch } from 'react-hook-form';

import { TAlarmCode, TInstructionType } from '../api';
import { TModel } from '../api/asset';
import styles from './detail-form.module.scss';

type DescriptionFieldProps = {
  control?: Control<any>;
  registered?: string;
  wrapperClassName?: string;
};

export const DescriptionField = ({
  control,
  registered,
  wrapperClassName,
}: DescriptionFieldProps) => {
  const descriptionValue = useWatch({
    control,
    name: registered ?? '',
    defaultValue: '',
  });

  const length = descriptionValue?.length || 0;

  return (
    <TextBox
      control={control}
      registered={registered as any}
      label="Description:"
      placeholder="Describe the instruction"
      wrapperClassName={wrapperClassName}
      detail={`${length}/160`}
    />
  );
};

type DurationFieldProps = {
  durationDropdownProps: DropdownProps<any>;
};

const DurationField = ({ durationDropdownProps }: DurationFieldProps) => {
  const [typedDuration, setTypedDuration] = useState('');
  const durationValue = useWatch({
    control: durationDropdownProps.control,
    name: durationDropdownProps.registered ?? '',
    defaultValue: '',
  });

  const durationOptions = useMemo(() => {
    const options = [...DURATIONS];
    const currentValue = durationValue;

    if (typedDuration && !options.some((o) => o.value === typedDuration)) {
      options.push({ label: typedDuration.toString(), value: typedDuration.toString() });
    }

    if (currentValue && !options.some((o) => o.value === currentValue)) {
      options.push({ label: currentValue.toString(), value: currentValue.toString() });
    }

    return options.sort((a, b) => Number(a.value) - Number(b.value));
  }, [typedDuration, durationValue]);

  const handleDurationChange = (value: string) => {
    setTypedDuration(''); // Clear the "typed" state once a selection is made
    durationDropdownProps.onChange?.(value);
  };

  return (
    <div className={styles.DurationField}>
      <span className={styles.DurationField__Label}>Estimated Time:</span>
      <div className={styles.DurationField__InputContainer}>
        <div
          className={styles.DurationField__Dropdown}
          onInput={(e) => {
            const target = e.target as HTMLInputElement;
            setTypedDuration(target.value);
          }}
        >
          <Dropdown
            {...durationDropdownProps}
            options={durationOptions}
            searchable={true}
            onChange={handleDurationChange}
            placeholder="-"
          />
        </div>
        <span>Minutes</span>
      </div>
    </div>
  );
};

type DetailFormProps = {
  alarmCodes?: TAlarmCode[];
  models?: TModel[];
  instructionTypes?: TInstructionType[];
  modelIds: number[];
  onModelIdsChange: (assetIds: number[]) => void;
  submitBtnLabel: string;
  submitBtnIcon: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  alarmCodeDropdownProps: DropdownProps<any>;
  titleInputProps: InputProps<any>;
  instructionTypeDropdownProps: DropdownProps<any>;
  durationDropdownProps: DropdownProps<any>;
  descriptionTextBoxProps: TextboxProps<any>;
  modelIdsError?: string;
};

const DURATIONS = [15, 30, 45, 60].map((duration) => ({
  label: duration.toString(),
  value: duration.toString(),
}));

export const DetailForm = ({
  instructionTypes,
  submitBtnLabel,
  submitBtnIcon,
  onSubmit,
  onCancel,
  models,
  modelIds,
  alarmCodes,
  onModelIdsChange,
  titleInputProps,
  instructionTypeDropdownProps,
  durationDropdownProps,
  descriptionTextBoxProps,
  alarmCodeDropdownProps,
  modelIdsError,
}: DetailFormProps) => {
  const modelOptions = models?.map((model) => ({
    label: model.name,
    value: model.id.toString(),
  }));
  const modelIdValues = modelIds.map((model) => model.toString());
  const handleModelIdChange = (values: string[]) => {
    onModelIdsChange(values.map((value) => Number.parseInt(value)));
  };

  return (
    <Container
      className={styles.DetailForm}
      title={'Detail'}
      background={'none'}
      contentWrapperProps={{
        style: {
          justifyContent: 'space-between',
        },
      }}
    >
      <div className={styles.DetailForm__Body}>
        <div className={styles.DetailForm__EquipmentID}>
          <DropdownMultipleSelect
            label={'Equipment Model:'}
            options={modelOptions}
            onChange={handleModelIdChange}
            value={modelIdValues}
            placeholder={'Select One or Multiple Equipment Model'}
            error={modelIdsError}
          />
          <DropdownOptionCards
            options={modelOptions}
            onChange={handleModelIdChange}
            value={modelIdValues}
          />
        </div>
        <div className={styles.DetailForm__RowContainer}>
          <Dropdown
            {...alarmCodeDropdownProps}
            wrapperClassName={styles.DetailForm__AlarmCode}
            label={'Alarm Code'}
            options={alarmCodes?.map((alarmCode) => ({
              label: alarmCode.name,
              value: alarmCode.id.toString(),
            }))}
            placeholder={'Select alarm code'}
            searchable
          />
        </div>
        <div className={styles.DetailForm__RowContainer}>
          <Input
            {...titleInputProps}
            wrapperProps={{
              className: styles.DetailForm__Title,
            }}
            label={'Title:'}
            placeholder="Enter title"
          />
        </div>
        <div className={styles.DetailForm__RowContainer}>
          <Dropdown
            {...instructionTypeDropdownProps}
            wrapperClassName={styles.DetailForm__InstructionType}
            label={'Instruction Type:'}
            options={instructionTypes?.map((instructionType) => ({
              label: instructionType.name,
              value: instructionType.id.toString(),
            }))}
            placeholder="Select instruction type"
          />
          <DurationField durationDropdownProps={durationDropdownProps} />
        </div>
        <DescriptionField
          {...descriptionTextBoxProps}
          wrapperClassName={styles.DetailForm__Description}
        />
      </div>
      <div className={styles.DetailForm__Footer}>
        <Button color={'default-secondary'} onClick={onCancel}>
          Cancel
        </Button>
        <Button className={styles.DetailForm__SubmitBtn} onClick={onSubmit}>
          {submitBtnIcon}
          <span>{submitBtnLabel}</span>
        </Button>
      </div>
    </Container>
  );
};
