import {
  Badge,
  Button,
  Dropdown,
  Input,
  InputProps,
  Popup,
  STATUS_COLOR,
  STATUS_NAME,
  StatusEnum,
} from '@digital-twin/components';
import {
  AddPhotoAlternative,
  ArrowRight,
  Check,
  CheckDone,
  Edit2,
  Flag2,
  Pause,
  SaveFill,
} from '@digital-twin/icons';
import { PlayArrowIcon } from '@digital-twin/reusables';
import clsx from 'clsx';
import { ReactNode, useState } from 'react';

import { ValidityBadge, ValidityDropdown } from '../../../components';
import styles from './work-report.dialogs.module.scss';

type GenericDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  maintenanceName: string;
  maintenanceTypeName: string;
  isPending: boolean;
  icon: ReactNode;
  title: string;
  messageTitle: string;
  messageDescription: ReactNode;
};

const GenericDialog = ({
  onClose,
  open,
  onSubmit,
  maintenanceName,
  maintenanceTypeName,
  isPending,
  icon,
  title,
  messageDescription,
  messageTitle,
}: GenericDialogProps) => {
  return (
    <Popup
      icon={icon}
      title={title}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      variant={'custom'}
      submitButtonLabel={'Confirm'}
      submitButtonIcon={<Check />}
      background={'none'}
      submitting={isPending}
      wrapperClassName={styles.PopupActionDialog}
    >
      <div className={styles.ActionDialog}>
        <span
          className={styles.ActionDialog__Detail}
        >{`• ${maintenanceName}, Type: ${maintenanceTypeName}`}</span>
        <div className={styles.ActionDialog__Message}>
          <span className={styles.ActionDialog__Message__Title}>{messageTitle}</span>
          <span className={styles.ActionDialog__Message__Description}>{messageDescription}</span>
        </div>
      </div>
    </Popup>
  );
};

// type SetIssueValidityDialogProps = {
//   open: boolean;
//   onClose: () => void;
//   onSubmit: () => void;
//   isValid: boolean;
//   isDiagnosis: boolean;
//   issueName: string;
// };

// export const SetIssueValidityDialog = ({
//   isDiagnosis,
//   isValid,
//   issueName,
//   onClose,
//   onSubmit,
//   open,
// }: SetIssueValidityDialogProps) => {
//   const getValidityName = () => {
//     if (isDiagnosis) {
//       return isValid ? 'Valid' : 'Invalid';
//     }
//     return isValid ? 'Resolved' : 'Unresolved';
//   };

//   const actionName = isDiagnosis ? 'Diagnosis' : 'Repair';
//   return (
//     <Popup
//       icon={<Instruction />}
//       title={`Confirm as ${getValidityName()}`}
//       open={open}
//       onClose={onClose}
//       onSubmit={onSubmit}
//       variant={'custom'}
//       submitButtonLabel={'Confirm'}
//       submitButtonIcon={<Check width={20} height={20} />}
//       background={'none'}
//     >
//       <div className={styles.ActionDialog}>
//         <div className={styles.ActionDialog__Detail}>
//           <div className={styles.SetIssueValidityDialog__IssueName}>
//             <span>{`• ${issueName}`}</span>
//             <Badge color={isDiagnosis ? 'normal' : 'idle'}>{actionName}</Badge>
//           </div>
//         </div>
//         <div className={styles.ActionDialog__Message}>
//           <span className={styles.ActionDialog__Message__Title}>
//             {`Are you sure you want to confirm this ${actionName.toLowerCase()} as ${getValidityName()}?`}
//           </span>
//         </div>
//       </div>
//     </Popup>
//   );
// };

type AttachImageDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  imageName: string[];
};

export const AttachImageDialog = ({
  onClose,
  open,
  onSubmit,
  imageName,
}: AttachImageDialogProps) => {
  return (
    <Popup
      icon={<AddPhotoAlternative />}
      title={'Attach Image'}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      variant={'custom'}
      submitButtonLabel={'Confirm'}
      submitButtonIcon={<Check />}
      background={'none'}
      wrapperClassName={styles.PopupActionDialog}
    >
      <div className={styles.ActionDialog}>
        <div className={styles.ActionDialog__Detail}>
          {imageName.map((name) => (
            <span key={name}>{`• ${name}`}</span>
          ))}
        </div>

        <div className={styles.ActionDialog__Message}>
          <span className={styles.ActionDialog__Message__Title}>
            Are you sure you want to attach this image?
          </span>
        </div>
      </div>
    </Popup>
  );
};

type CommonDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  maintenanceName: string;
  maintenanceTypeName: string;
  isPending: boolean;
};

type StartWorkDialogProps = Omit<CommonDialogProps, 'onSubmit'> & {
  newStatus: StatusEnum;
  onSubmit: (isStatusChange: boolean) => void;
  assetStatus: StatusEnum;
};

export const StartWorkDialog = ({
  onClose,
  open,
  onSubmit,
  maintenanceName,
  maintenanceTypeName,
  isPending,
  assetStatus,
  newStatus,
}: StartWorkDialogProps) => {
  const [isContinue, setIsContinue] = useState(false);
  const [isStatusChange, setIsStatusChange] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const isDown =
    assetStatus === StatusEnum.Enum['PLANNED DOWN'] ||
    assetStatus === StatusEnum.Enum['UNPLANNED DOWN'];
  const isPrepare = !isDown && !isContinue;

  const handleClose = () => {
    onClose();
    setIsContinue(false);
    setIsStatusChange(undefined);
    setError(undefined);
  };
  const handleSubmit = () => {
    if (isDown || !isPrepare) {
      onSubmit(Boolean(isStatusChange));
    } else if (isStatusChange === undefined) {
      setError('Please select the equipment status');
    } else {
      setIsContinue(true);
    }
  };

  const title = isPrepare ? 'Prepare Equipment for Work' : 'Start Work';
  const submitButtonLabel = isPrepare ? 'Continue' : 'Confirm';
  const submitButtonIcon = isPrepare ? <ArrowRight /> : <Check />;
  const mainTitle = isPrepare ? (
    <span>
      Current Equipment Status:{' '}
      <span
        style={{
          color: STATUS_COLOR[assetStatus],
        }}
      >
        {STATUS_NAME[assetStatus]}
      </span>
    </span>
  ) : (
    `• ${maintenanceName}, Type: ${maintenanceTypeName}`
  );
  const getMessageDescription = () => {
    if (isPrepare) {
      return `You may choose to change the equipment status to ${newStatus.toLowerCase()} before starting work, or continue with the current status`;
    } else if (isStatusChange) {
      return (
        <>
          The equipment will be stopped and its status will change to{' '}
          <b
            style={{
              color: STATUS_COLOR[newStatus],
            }}
          >
            {STATUS_NAME[newStatus]}
          </b>
          . The work status will move to In Progress.
        </>
      );
    }
    return (
      <>
        The order status will change to <b>In-Progress</b>.
      </>
    );
  };

  const changeStatusDropdownOptions = [
    {
      value: '1',
      label: `Set to ${STATUS_NAME[newStatus]} (Stop equipment)`,
    },
    {
      value: '0',
      label: 'Keep current status',
    },
  ];
  const handleChangeStatusDropdown = (value: string) => {
    setIsStatusChange(Number.parseInt(value));
  };

  return (
    <Popup
      icon={<PlayArrowIcon />}
      title={title}
      open={open}
      onClose={handleClose}
      onSubmit={handleSubmit}
      variant={'custom'}
      submitButtonLabel={submitButtonLabel}
      submitButtonIcon={submitButtonIcon}
      background={'none'}
      submitting={isPending}
      wrapperClassName={styles.PopupActionDialog}
    >
      <div className={styles.ActionDialog}>
        <div className={styles.ActionDialog__Detail}>{mainTitle}</div>
        <div className={styles.ActionDialog__Message}>
          {isPrepare ? null : (
            <span className={styles.ActionDialog__Message__Title}>
              Are you sure you want to start this work?
            </span>
          )}
          <span className={styles.ActionDialog__Message__Description}>
            {getMessageDescription()}
          </span>
        </div>
        {isPrepare ? (
          <div className={styles.ActionDialog__ChangeStatus}>
            <Dropdown
              label={'Change Equipment Status'}
              options={changeStatusDropdownOptions}
              placeholder={'Select Equipment Status'}
              value={isStatusChange?.toString()}
              onChange={handleChangeStatusDropdown}
              error={error}
            />
            <span className={styles.ActionDialog__ChangeStatus__Description}>
              You must stop the equipment before starting the maintenance work.
            </span>
          </div>
        ) : null}
      </div>
    </Popup>
  );
};

export type TIssue = {
  codeId: number;
  codeName: string;
  typeId: number;
  typeName: string;
  isValid: boolean | null;
};

type IssueValidityProps = Omit<TIssue, 'codeId' | 'typeId'> & {
  isEditing: boolean;
  onIsValidChange: (isValid: boolean | null) => void;
  disabled?: boolean;
  excludeNullOption?: boolean;
};
const IssueValidity = ({
  codeName,
  isValid,
  typeName,
  isEditing,
  onIsValidChange,
  disabled,
  excludeNullOption,
}: IssueValidityProps) => {
  const isDiagnosis = typeName === 'Diagnosis';
  return (
    <div className={styles.IssueValidity}>
      <div className={styles.IssueValidity__LabelContainer}>
        <span>{codeName}</span>
        <Badge color={typeName === 'Diagnosis' ? 'normal' : 'warning'}>{typeName}</Badge>
      </div>
      {isEditing ? (
        <ValidityDropdown
          isDiagnosis={isDiagnosis}
          isValid={isValid}
          onChange={onIsValidChange}
          disabled={disabled}
          excludeNullOption={excludeNullOption}
        />
      ) : (
        <ValidityBadge isDiagnosis={isDiagnosis} isValid={isValid} />
      )}
    </div>
  );
};

type IssueSectionProps = {
  issues: TIssue[];
  isEditing: boolean;
  onIsValidChange: (codeId: number, typeId: number, isValid: boolean | null) => void;
  title: string;
  isCurrentIssueSection?: boolean;
};

const IssueSection = ({
  issues,
  isEditing,
  onIsValidChange,
  title,
  isCurrentIssueSection,
}: IssueSectionProps) => {
  return (
    <div className={styles.Issue}>
      <span className={styles.Issue__Title}>{title}</span>
      <div className={styles.Issue__List}>
        {issues.map((issue) => {
          const diagnosis = issues.find(
            (item) => item.codeId === issue.codeId && item.typeName === 'Diagnosis'
          );

          const disabled = issue.typeName === 'Repair' && !diagnosis?.isValid;

          return (
            <IssueValidity
              key={`${issue.codeId}-${issue.typeId}`}
              {...issue}
              isEditing={isEditing}
              onIsValidChange={(isValid) => onIsValidChange(issue.codeId, issue.typeId, isValid)}
              disabled={disabled}
              excludeNullOption={isCurrentIssueSection}
            />
          );
        })}
      </div>
    </div>
  );
};

type IssueValidityDialogProps = CommonDialogProps & {
  onIsValidChange: (
    isOther: boolean,
    codeId: number,
    typeId: number,
    isValid: boolean | null
  ) => void;
  currentIssues: TIssue[];
  otherIssues?: TIssue[];
  hasOtherIssues: boolean;
  isEditing: boolean;
  onDiscard: () => void;
  onSave: () => void;
  degradationName?: string;
  onEdit: () => void;
  icon: ReactNode;
  title: string;
  messageTitle: string;
  messageDescription: string;
};

const IssueValidityDialog = ({
  onClose,
  open,
  onSubmit,
  maintenanceName,
  maintenanceTypeName,
  isPending,
  currentIssues,
  hasOtherIssues,
  onIsValidChange,
  otherIssues,
  isEditing,
  onDiscard,
  onSave,
  degradationName,
  onEdit,
  icon,
  title,
  messageTitle,
  messageDescription,
}: IssueValidityDialogProps) => {
  return (
    <Popup
      icon={icon}
      title={title}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      variant={'custom'}
      submitButtonLabel={'Confirm'}
      submitButtonIcon={<Check />}
      disableSubmit={isEditing}
      background={'none'}
      submitting={isPending}
      wrapperClassName={styles.PopupActionDialog}
      rightTopComponent={
        isEditing ? (
          <div className={styles.TopBtnContainer}>
            <div className={styles.TopBtnContainer__DiscardSave}>
              <Button onClick={onDiscard} color={'default-secondary'}>
                Discard
              </Button>
              <Button onClick={onSave}>
                <SaveFill width={20} height={20} />
                <span>Save</span>
              </Button>
            </div>
            <Button className={styles.TopBtnContainer__EditingLabel}>
              <Edit2 />
              <span>Editing</span>
            </Button>
          </div>
        ) : (
          <Button onClick={onEdit} color={'default-secondary'}>
            <Edit2 />
            <span>Edit</span>
          </Button>
        )
      }
    >
      <div className={clsx(styles.ActionDialog, styles.IssueValidityDialog)}>
        <div className={styles.ActionDialog__Detail}>
          <div className={styles.MaintenanceDegradationContainer}>
            <span>{`• ${maintenanceName}, Type: ${maintenanceTypeName}`}</span>
            {degradationName ? (
              <span className={styles.DegradationBadge}>{degradationName}</span>
            ) : null}
          </div>
        </div>
        <IssueSection
          title={'Current Issues'}
          isEditing={isEditing}
          issues={currentIssues}
          onIsValidChange={(codeId, typeId, isValid) =>
            onIsValidChange(false, codeId, typeId, isValid)
          }
          isCurrentIssueSection
        />
        {hasOtherIssues ? (
          <IssueSection
            title={'Other Possible Issues'}
            isEditing={isEditing}
            issues={otherIssues ?? []}
            onIsValidChange={(codeId, typeId, isValid) =>
              onIsValidChange(true, codeId, typeId, isValid)
            }
          />
        ) : null}
        <div className={styles.ActionDialog__Message}>
          <span className={styles.ActionDialog__Message__Title}>{messageTitle}</span>
          <span className={styles.ActionDialog__Message__Description}>{messageDescription}</span>
        </div>
      </div>
    </Popup>
  );
};

export const MarkAsDoneDialog = (
  props: Omit<IssueValidityDialogProps, 'icon' | 'title' | 'messageTitle' | 'messageDescription'>
) => {
  return (
    <IssueValidityDialog
      {...props}
      icon={<CheckDone />}
      title={'Mark as Done'}
      messageTitle={'Are you sure you want to mark this work as done?'}
      messageDescription={'Please confirm the checks performed during this work.'}
    />
  );
};

export const CloseWorkDialog = (
  props: Omit<IssueValidityDialogProps, 'icon' | 'title' | 'messageTitle' | 'messageDescription'>
) => {
  return (
    <IssueValidityDialog
      {...props}
      icon={<Flag2 />}
      title={'Close Work'}
      messageTitle={'Are you sure you want to close this work?'}
      messageDescription={'Once closed, the order status will be changed to Closed.'}
    />
  );
};

type PauseWorkDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  // reason: string;
  // onReasonChange: (reason: string) => void;
  isPending: boolean;
  reasonInputProps: InputProps<any>;
};

export const PauseWorkDialog = ({
  onClose,
  open,
  onSubmit,
  // reason,
  // onReasonChange,
  isPending,
  reasonInputProps,
}: PauseWorkDialogProps) => {
  return (
    <Popup
      icon={<Pause />}
      title={'Pause Work'}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      variant={'custom'}
      submitButtonLabel={'Confirm'}
      submitButtonIcon={<Check />}
      submitButtonColor={'error'}
      background={'none'}
      submitting={isPending}
      wrapperClassName={styles.PopupActionDialog}
    >
      <div className={styles.ActionDialog}>
        <Input
          {...reasonInputProps}
          label={'Reason'}
          // value={reason}
          // onChange={(event) => onReasonChange(event.target.value)}
          placeholder={'Add reason'}
        />
        <div className={styles.ActionDialog__Message}>
          <span className={styles.ActionDialog__Message__Description}>
            Your work status will change to <b>On Hold</b>.
          </span>
        </div>
      </div>
    </Popup>
  );
};

type ResumeWorkDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
};

export const ResumeWorkDialog = ({ onClose, open, onSubmit, isPending }: ResumeWorkDialogProps) => {
  return (
    <Popup
      icon={<PlayArrowIcon />}
      title={'Resume Work'}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      variant={'custom'}
      submitButtonLabel={'Confirm'}
      submitButtonIcon={<Check />}
      background={'none'}
      submitting={isPending}
      wrapperClassName={styles.PopupActionDialog}
    >
      <div className={styles.ActionDialog}>
        <div className={styles.ActionDialog__Message}>
          <span className={styles.ActionDialog__Message__Title}>
            Are you sure you want to resume your work?
          </span>
          <span className={styles.ActionDialog__Message__Description}>
            Your work status will change to <b>Active</b>.
          </span>
        </div>
      </div>
    </Popup>
  );
};
