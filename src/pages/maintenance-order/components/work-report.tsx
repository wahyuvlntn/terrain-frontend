import {
  Button,
  DropdownMultiCategories,
  DropdownMultiCategoriesProps,
  DropdownOptionCards,
  ImagePaginatedPopup,
  MaintenanceStatusEnum,
  StatusEnum,
  TextBox,
  TextboxProps,
} from '@digital-twin/components';
import {
  AddPhotoAlternative,
  AutoRenew,
  CheckDone,
  ChevronDown,
  ChevronUp,
  Flag2,
  OpenInNew,
  Pause,
  PhotoAlternative,
  SaveFill,
  TrashDeleteFill,
} from '@digital-twin/icons';
import pngIcon from '@digital-twin/images/png-icon.png';
import { CircleFillIcon, PlayArrowFillIcon, PlayArrowIcon } from '@digital-twin/reusables';
import { getURL } from '@digital-twin/utils';
import { clsx } from 'clsx';
import format from 'date-fns/format';
import { ChangeEventHandler, useEffect, useState } from 'react';
import { Control, useWatch } from 'react-hook-form';

import { MaintenanceInstructionList, SetIssueValidityDialog } from '../../../components';
import { TUploadedImage } from '../api/work-report';
import { MaintenanceMetadata } from './maintenance-metadata';
import {
  AttachImageDialog,
  CloseWorkDialog,
  MarkAsDoneDialog,
  PauseWorkDialog,
  ResumeWorkDialog,
  StartWorkDialog,
} from './work-report.dialogs';
import { useWorkReport } from './work-report.hook';
import styles from './work-report.module.scss';

type ImageThumbnailProps = {
  imageUrl: string;
  onDelete: () => void;
  onOpen: () => void;
};

const ImageThumbnail = ({ imageUrl, onDelete, onOpen }: ImageThumbnailProps) => {
  return (
    <div className={styles.ImageThumbnail}>
      <img src={imageUrl} />
      <div className={styles.ImageThumbnail__BtnContainer}>
        <TrashDeleteFill onClick={onDelete} />
        <OpenInNew onClick={onOpen} />
      </div>
    </div>
  );
};

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = Math.max(decimals, 0);
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

type NoteFieldProps = {
  control?: Control<any>;
  registered?: string;
  wrapperClassName?: string;
  disabled?: boolean;
};

const NoteField = ({ control, registered, wrapperClassName, disabled }: NoteFieldProps) => {
  const noteValue = useWatch({
    control,
    name: registered ?? '',
    defaultValue: '',
  });

  const length = noteValue?.length || 0;

  return (
    <TextBox
      disabled={disabled}
      control={control}
      registered={registered as any}
      wrapperClassName={wrapperClassName}
      detail={`${length}/110`}
      placeholder="Add Note..."
    />
  );
};

type WorkUpdateProps = {
  isBtnDisabled: boolean;
  onSubmit: () => void;
  imageUrls: TUploadedImage[];
  onUploadImage: (image: File[]) => void;
  onDeleteImage: (imageLocation: string) => void;
  imageValue: { image: File; progress: number }[];
  textBoxProps: TextboxProps<any>;
  issueDropdownProps: DropdownMultiCategoriesProps;
};

const WorkUpdate = ({
  isBtnDisabled,
  onSubmit,
  onUploadImage,
  imageUrls,
  onDeleteImage,
  imageValue,
  textBoxProps,
  issueDropdownProps,
}: WorkUpdateProps) => {
  const [openImage, setOpenImage] = useState({
    open: false,
    page: 1,
  });
  const handleCloseImage = () =>
    setOpenImage({
      open: false,
      page: 1,
    });
  const handleOpenImage = (imageIndex: number) =>
    setOpenImage({
      open: true,
      page: imageIndex + 1,
    });
  const [showProgressDetail, setShowProgressDetail] = useState<boolean[]>([]);
  const [openConfirmation, setOpenConfirmation] = useState<{
    image: File[] | null;
    open: boolean;
  }>({
    image: null,
    open: false,
  });
  const handleImageChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = event.target.files;
    if (files) {
      setOpenConfirmation({ image: Array.from(files), open: true });
    }
  };
  const handleCloseConfirmation = () => {
    setOpenConfirmation({ image: null, open: false });
  };
  const handleSubmit = () => {
    if (openConfirmation.image) {
      onUploadImage(openConfirmation.image);
    }
    handleCloseConfirmation();
  };

  const hasUploadedImage = imageUrls.length > 0;

  useEffect(() => {
    setShowProgressDetail(new Array(imageValue.length).fill(false));
  }, [imageValue.length]);

  const toggleShowProgressDetail = (index: number) => {
    setShowProgressDetail((prev) => {
      const newState = [...prev];
      newState[index] = !newState[index];
      return newState;
    });
  };

  return (
    <>
      <AttachImageDialog
        imageName={openConfirmation.image ? openConfirmation.image.map((file) => file.name) : []}
        onClose={handleCloseConfirmation}
        onSubmit={handleSubmit}
        open={openConfirmation.open}
      />
      <ImagePaginatedPopup
        images={imageUrls.map((image) => ({
          src: getURL() + image.url,
          name: 'Attached Images',
        }))}
        page={openImage.page}
        open={openImage.open}
        onClose={handleCloseImage}
      />
      <div className={styles.WorkUpdate}>
        <div className={styles.WorkUpdate__Header}>
          <span className={styles.Title}>
            Work Update:<span className={styles.asterisk}>*</span>
          </span>
          <span className={styles.WorkUpdate__Header__Description}>
            Record progress, findings, and actions taken.
          </span>
        </div>
        <div className={styles.WorkUpdate__IssueDropdown}>
          <DropdownMultiCategories
            {...issueDropdownProps}
            placeholder="Select one or multiple Issues"
          />
          <DropdownOptionCards
            options={issueDropdownProps?.options?.map((option) => option.options)?.flat()}
            onChange={issueDropdownProps?.onChange}
            value={issueDropdownProps?.value}
            wrapperClassName={styles.WorkUpdate__IssueDropdown__SelectedContainer}
          />
        </div>

        <NoteField {...textBoxProps} wrapperClassName={styles.WorkUpdate__TextBox} />
        <div className={styles.WorkUpdate__Footer}>
          <div
            className={clsx(
              styles.WorkUpdate__Footer__ImageStatusLabel,
              !hasUploadedImage && styles.disabled
            )}
          >
            <PhotoAlternative opacity={0.6} />
            <span>
              {hasUploadedImage ? `${imageUrls.length} image attached` : 'No image attached.'}
            </span>
          </div>
          <div className={styles.WorkUpdate__Footer__ImageThumbnailProgressContainer}>
            {imageUrls.map((imageUrl, idx) => (
              <ImageThumbnail
                key={imageUrl.url}
                imageUrl={getURL() + imageUrl.url}
                onDelete={() => onDeleteImage(imageUrl.location)}
                onOpen={() => handleOpenImage(idx)}
              />
            ))}
            {imageValue.map(({ image, progress }, index) => (
              <div className={styles.WorkUpdate__UploadProgressContainer} key={image.name}>
                <div className={styles.WorkUpdate__UploadProgressContainer__DetailChevronContainer}>
                  <div className={styles.WorkUpdate__UploadProgressContainer__DetailContainer}>
                    {showProgressDetail ? (
                      <img
                        src={pngIcon}
                        className={styles.WorkUpdate__UploadProgressContainer__ImageIcon}
                      />
                    ) : null}

                    <div
                      className={styles.WorkUpdate__UploadProgressContainer__FileNameSizeContainer}
                    >
                      <span className={styles.WorkUpdate__UploadProgressContainer__FileName}>
                        {image.name}
                      </span>
                      {showProgressDetail[index] ? (
                        <div
                          className={
                            styles.WorkUpdate__UploadProgressContainer__FileSizeUploadingContainer
                          }
                        >
                          <div
                            className={
                              styles.WorkUpdate__UploadProgressContainer__FileSizeContainer
                            }
                          >
                            <span
                              className={styles.WorkUpdate__UploadProgressContainer__FileSizeLabel}
                            >{`${formatBytes(
                              (progress * image.size) / 100
                            )} of ${formatBytes(image.size)}`}</span>
                            <CircleFillIcon
                              className={styles.WorkUpdate__UploadProgressContainer__CircleIcon}
                            />
                          </div>
                          <div
                            className={
                              styles.WorkUpdate__UploadProgressContainer__UploadingContainer
                            }
                          >
                            <AutoRenew
                              className={styles.WorkUpdate__UploadProgressContainer__UploadIcon}
                            />
                            <span
                              className={styles.WorkUpdate__UploadProgressContainer__UploadLabel}
                            >
                              Uploading...
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {showProgressDetail[index] ? (
                    <ChevronUp
                      onClick={() => toggleShowProgressDetail(index)}
                      className={styles.WorkUpdate__UploadProgressContainer__ChevronIcon}
                    />
                  ) : (
                    <ChevronDown
                      onClick={() => toggleShowProgressDetail(index)}
                      className={styles.WorkUpdate__UploadProgressContainer__ChevronIcon}
                    />
                  )}
                </div>
                <div className={styles.WorkUpdate__UploadProgressContainer__ProgressBarFull}>
                  <div
                    className={styles.WorkUpdate__UploadProgressContainer__ProgressBarValue}
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className={styles.WorkUpdate__Footer__BtnContainer}>
            <Button
              color={'default-secondary'}
              disabled={isBtnDisabled}
              className={styles.WorkUpdate__Footer__AttachImageBtn}
            >
              <AddPhotoAlternative className={styles.WorkUpdate__Footer__BtnIcon} />
              <span>Attach Image</span>
              <input
                type={'file'}
                accept={['image/png', 'image/jpg', 'image/jpeg'].join(',')}
                value={''}
                onChange={handleImageChange}
                multiple
                className={styles.WorkUpdate__Footer__FileInput}
                disabled={isBtnDisabled}
              />
            </Button>
            <Button disabled={isBtnDisabled} onClick={onSubmit}>
              <SaveFill className={styles.WorkUpdate__Footer__BtnIcon} />
              <span>Save Update</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

type StatusActionProps = {
  status: MaintenanceStatusEnum;
  onPrimaryBtnClick: () => void;
  onDone: () => void;
  onClose: () => void;
  hasWorkUpdate: boolean;
  hasUpdatePermission: boolean;
  hasClosePermission: boolean;
};

const StatusAction = ({
  status,
  hasWorkUpdate,
  onClose,
  onDone,
  onPrimaryBtnClick,
  hasClosePermission,
  hasUpdatePermission,
}: StatusActionProps) => {
  const getPrimaryBtn = () => {
    if (
      status === MaintenanceStatusEnum.enum['In Progress'] ||
      status === MaintenanceStatusEnum.enum.Done ||
      status === MaintenanceStatusEnum.enum.Closed
    ) {
      return {
        label: 'Pause',
        icon: <Pause />,
        color: 'error' as const,
      };
    }

    if (status === MaintenanceStatusEnum.enum.Paused) {
      return {
        label: 'Resume',
        icon: <PlayArrowIcon />,
        color: 'default-primary' as const,
      };
    }

    return {
      label: 'Start',
      icon: <PlayArrowFillIcon />,
      color: 'default-primary' as const,
    };
  };

  const primaryBtn = getPrimaryBtn();
  const isPrimaryBtnEnabled =
    hasUpdatePermission &&
    (status === MaintenanceStatusEnum.enum.Open ||
      status === MaintenanceStatusEnum.enum['In Progress'] ||
      status === MaintenanceStatusEnum.enum.Paused);

  const doneBtnLabel =
    status === MaintenanceStatusEnum.enum.Done || status === MaintenanceStatusEnum.enum.Closed
      ? 'Reported'
      : 'Done';
  const isDoneBtnEnabled =
    hasUpdatePermission && status === MaintenanceStatusEnum.enum['In Progress'] && hasWorkUpdate;

  const closeBtnLabel = status === MaintenanceStatusEnum.enum.Closed ? 'Closed' : 'Close';
  const isCloseBtnEnabled = hasClosePermission && status === MaintenanceStatusEnum.enum.Done;

  const getStatusLabel = () => {
    switch (status) {
      case MaintenanceStatusEnum.enum['In Progress']:
        return 'Active';
      case MaintenanceStatusEnum.enum.Paused:
        return 'On Hold';
      case MaintenanceStatusEnum.enum.Done:
      case MaintenanceStatusEnum.enum.Closed:
        return 'Finished';
      default:
        return '';
    }
  };

  const statusLabel = getStatusLabel();

  return (
    <div className={styles.StatusActions}>
      <div className={styles.StatusActions__Header}>
        <div className={styles.StatusActions__Header__TitleContainer}>
          <span className={styles.Title}>
            Status Actions:<span className={styles.asterisk}>*</span>
          </span>
          {statusLabel ? (
            <span
              className={clsx(styles.StatusActions__Header__StatusLabel, {
                [styles.success]: statusLabel === 'Active',
                [styles.error]: statusLabel === 'On Hold',
                [styles.info]: statusLabel === 'Finished',
              })}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
        <span className={styles.StatusActions__Header__Description}>
          Press <b>Start</b> to begin your work. Make sure to add your reports. Once everything's
          fixed, press <b>Done</b> below to finish your work.
        </span>
      </div>
      <div className={styles.StatusActions_Body}>
        <Button
          className={styles.StatusActions_Body__Btn}
          color={primaryBtn.color}
          disabled={!isPrimaryBtnEnabled}
          onClick={onPrimaryBtnClick}
        >
          {primaryBtn.icon}
          <span>{primaryBtn.label}</span>
        </Button>
        <Button
          className={styles.StatusActions_Body__Btn}
          disabled={!isDoneBtnEnabled}
          onClick={onDone}
          color={'success'}
        >
          <CheckDone />
          <span>{doneBtnLabel}</span>
        </Button>
        <Button
          className={clsx(styles.StatusActions_Body__Btn, styles.StatusActions_Body__CloseBtn)}
          disabled={!isCloseBtnEnabled}
          onClick={onClose}
        >
          <Flag2 />
          <span>{closeBtnLabel}</span>
        </Button>
      </div>
    </div>
  );
};

type MaintenanceMetadataWrapperProps = {
  startedAt: string | null;
  stoppedAt: string | null;
  estimatedTimeMinute?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

const MaintenanceMetadataWrapper = ({
  estimatedTimeMinute,
  startedAt,
  stoppedAt,
  createdAt,
  updatedAt,
  createdBy,
}: MaintenanceMetadataWrapperProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const estimatedTimeHours =
    estimatedTimeMinute === undefined ? null : Math.floor(estimatedTimeMinute / 60);
  const estimatedTimeMinuteRemaining =
    estimatedTimeMinute === undefined ? null : estimatedTimeMinute % 60;
  const hoursLabel = estimatedTimeHours ? `${estimatedTimeHours} hours ` : '';
  const minutesLabel = estimatedTimeMinuteRemaining
    ? `${estimatedTimeMinuteRemaining} minutes`
    : '';
  const estimatedTime = !estimatedTimeMinute ? '-' : `${hoursLabel}${minutesLabel}`;

  if (startedAt === null) {
    return (
      <MaintenanceMetadata
        actualTime={'-'}
        actualTimeStatus={'NOT_STARTED'}
        createdAt={createdAt}
        updatedAt={updatedAt}
        createdBy={createdBy}
        estimatedTime={estimatedTime}
      />
    );
  }

  const endTime = stoppedAt ? new Date(stoppedAt) : currentTime;

  const actualTime = endTime.getTime() - new Date(startedAt).getTime();
  const actualTimeMinute = Math.floor(actualTime / (1000 * 60));
  const actualTimeHours = Math.floor(actualTimeMinute / 60);
  const actualTimeMinuteRemaining = actualTimeMinute % 60;

  const hoursString = actualTimeHours ? `${actualTimeHours} hours ` : '';
  const minutesString = actualTimeMinuteRemaining ? `${actualTimeMinuteRemaining} minutes` : '';
  const actualTimeFormatted = actualTimeMinute ? `${hoursString}${minutesString}` : '0 minutes';

  const isExceed = actualTime / (1000 * 60) <= (estimatedTimeMinute ?? 0);
  return (
    <MaintenanceMetadata
      actualTime={actualTimeFormatted}
      actualTimeStatus={isExceed ? 'ON_TIME' : 'EXCEEDED'}
      createdAt={createdAt}
      updatedAt={updatedAt}
      createdBy={createdBy}
      estimatedTime={estimatedTime}
    />
  );
};

export const WorkReport = () => {
  const {
    workReport,
    status,
    startedStoppedTs,
    handleStartOpen,
    handleResumeOpen,
    handleResumeClose,
    handlePauseClose,
    pauseOpen,
    resumeOpen,
    handleStartClose,
    handlePauseOpen,
    startOpen,
    markAsDoneOpen,
    handleMarkAsDoneOpen,
    closeOpen,
    handleCloseOpen,
    handleMarkAsDoneClose,
    handleCloseClose,
    handleSetStatusToDone,
    handleCloseWorkReport,
    handleStartWorkReport,
    handlePauseWorkReport,
    handleResumeWorkReport,
    watch,
    handleUploadImage,
    isPendingUploadImage,
    handleDeleteImage,
    uploadingImages,
    handleSubmitAddWorkUpdate,
    isPendingPauseWorkReport,
    isPendingStartWorkReport,
    isPendingCloseWorkReport,
    isPendingResumeWorkReport,
    isPendingSetStatusToDone,
    isPendingAddWorkUpdate,
    control,
    controlPauseWorkReport,
    hasClosePermission,
    hasUpdatePermission,
    assetStatus,
    handleChangeIssues,
    issueIdsError,
    maintenanceOrderId,
    currentIssues,
    otherIssues,
    handleValidityChange,
    currentInstructions,
    otherInstructions,
    handleSetValidityClose,
    setValidityOpen,
    toBeUpdateIssueValidityCodeName,
    isToBeUpdateIssueValidityDiagnosis,
    isToBeUpdateIssueValidityValid,
    handleSubmitValidityChange,
    dialogCurrentInstructions,
    dialogOtherInstructions,
    handleDialogDiscard,
    handleDialogEdit,
    handleDialogSave,
    handleDialogValidityChange,
    isDialogEdit,
  } = useWorkReport();

  const createdAt = workReport?.createdAt
    ? format(new Date(workReport?.createdAt), 'dd MMM yyyy HH:mm')
    : '';
  const updatedAt = status?.updatedAt
    ? format(new Date(status?.updatedAt), 'dd MMM yyyy HH:mm')
    : '-';

  const getPrimaryBtnAction = () => {
    if (status?.status === MaintenanceStatusEnum.enum.Open) {
      return handleStartOpen;
    }
    if (status?.status === MaintenanceStatusEnum.enum['In Progress']) {
      return handlePauseOpen;
    }
    return handleResumeOpen;
  };

  const onPrimaryBtnClick = getPrimaryBtnAction();

  const isActive =
    status?.status === MaintenanceStatusEnum.enum['In Progress'] ||
    status?.status === MaintenanceStatusEnum.enum.Paused;

  const isTextFieldBtnEnabled = isActive && !isPendingAddWorkUpdate && hasUpdatePermission;
  const isUpdateBtnEnabled = isTextFieldBtnEnabled && !isPendingUploadImage;

  const imageValue = Object.values(uploadingImages).map((image) => ({
    image: image.file,
    progress: image.progress,
  }));

  const newStatus =
    workReport?.maintenanceTypeName === 'Corrective'
      ? StatusEnum.Enum['UNPLANNED DOWN']
      : StatusEnum.Enum['PLANNED DOWN'];

  const currentIssueOptions = currentIssues
    ?.map((instruction) => ({
      label: instruction.name,
      value: instruction.id.toString(),
    }))
    ?.filter(
      (instruction, index, self) => self.findIndex((t) => t.value === instruction.value) === index
    );
  const otherIssueOptions = otherIssues
    ?.map((instruction) => ({
      label: instruction.name,
      value: instruction.id.toString(),
    }))
    ?.filter(
      (instruction, index, self) => self.findIndex((t) => t.value === instruction.value) === index
    );

  const issueOptions = workReport?.isDegradation
    ? [
        {
          category: 'Current Issue List:',
          options: currentIssueOptions,
        },
        {
          category: 'Other Possible Issue List:',
          options: otherIssueOptions,
        },
      ]
    : [
        {
          category: 'Issue List:',
          options: currentIssueOptions,
        },
      ];

  const validInstructionState =
    currentInstructions?.every((instruction) => {
      const diagnosis = instruction.data.find((d) => d.typeName === 'Diagnosis');
      const repair = instruction.data.find((d) => d.typeName === 'Repair');

      if (diagnosis?.isValid == null) return false;
      if (diagnosis.isValid && repair?.isValid == null) return false;

      return true;
    }) ?? false;

  return (
    <>
      <SetIssueValidityDialog
        open={setValidityOpen}
        onClose={handleSetValidityClose}
        isDiagnosis={isToBeUpdateIssueValidityDiagnosis}
        issueName={toBeUpdateIssueValidityCodeName ?? ''}
        isValid={isToBeUpdateIssueValidityValid}
        onSubmit={handleSubmitValidityChange}
      />
      <StartWorkDialog
        open={startOpen}
        onClose={handleStartClose}
        onSubmit={handleStartWorkReport}
        maintenanceName={workReport?.maintenanceName ?? ''}
        maintenanceTypeName={workReport?.maintenanceTypeName ?? ''}
        isPending={isPendingStartWorkReport}
        assetStatus={assetStatus ?? StatusEnum.Enum.RUNNING}
        newStatus={newStatus}
      />
      <PauseWorkDialog
        open={pauseOpen}
        onClose={handlePauseClose}
        onSubmit={handlePauseWorkReport}
        reasonInputProps={{
          control: controlPauseWorkReport,
          registered: 'reason',
        }}
        isPending={isPendingPauseWorkReport}
      />
      <ResumeWorkDialog
        open={resumeOpen}
        onClose={handleResumeClose}
        onSubmit={handleResumeWorkReport}
        isPending={isPendingResumeWorkReport}
      />
      <MarkAsDoneDialog
        open={markAsDoneOpen}
        onClose={handleMarkAsDoneClose}
        onSubmit={handleSetStatusToDone}
        maintenanceName={workReport?.maintenanceName ?? ''}
        maintenanceTypeName={workReport?.maintenanceTypeName ?? ''}
        isPending={isPendingSetStatusToDone}
        currentIssues={dialogCurrentInstructions}
        hasOtherIssues={workReport?.isDegradation ?? false}
        isEditing={isDialogEdit}
        onDiscard={handleDialogDiscard}
        onIsValidChange={handleDialogValidityChange}
        onSave={handleDialogSave}
        degradationName={workReport?.degradationName ?? ''}
        otherIssues={dialogOtherInstructions}
        onEdit={handleDialogEdit}
      />
      <CloseWorkDialog
        open={closeOpen}
        onClose={handleCloseClose}
        onSubmit={handleCloseWorkReport}
        maintenanceName={workReport?.maintenanceName ?? ''}
        maintenanceTypeName={workReport?.maintenanceTypeName ?? ''}
        isPending={isPendingCloseWorkReport}
        currentIssues={dialogCurrentInstructions}
        hasOtherIssues={workReport?.isDegradation ?? false}
        isEditing={isDialogEdit}
        onDiscard={handleDialogDiscard}
        onIsValidChange={handleDialogValidityChange}
        onSave={handleDialogSave}
        degradationName={workReport?.degradationName ?? ''}
        otherIssues={dialogOtherInstructions}
        onEdit={handleDialogEdit}
      />
      <div className={styles.WorkReport}>
        <MaintenanceMetadataWrapper
          createdAt={createdAt}
          updatedAt={updatedAt}
          createdBy={workReport?.createdBy ?? '-'}
          estimatedTimeMinute={workReport?.estimatedTimeMinute}
          startedAt={startedStoppedTs?.startedAt ?? null}
          stoppedAt={startedStoppedTs?.stoppedAt ?? null}
        />
        <div className={styles.WorkReport__Body}>
          <div className={styles.WorkReport__StatusActionsWorkUpdateContainer}>
            <StatusAction
              status={status?.status ?? MaintenanceStatusEnum.enum.Open}
              hasWorkUpdate={(status?.hasWorkUpdate && validInstructionState) ?? false}
              onPrimaryBtnClick={onPrimaryBtnClick}
              onDone={handleMarkAsDoneOpen}
              onClose={handleCloseOpen}
              hasClosePermission={hasClosePermission}
              hasUpdatePermission={hasUpdatePermission}
            />
            <WorkUpdate
              isBtnDisabled={!isUpdateBtnEnabled}
              onSubmit={handleSubmitAddWorkUpdate}
              //
              imageUrls={watch('imageUrls')}
              onUploadImage={handleUploadImage}
              onDeleteImage={handleDeleteImage}
              imageValue={imageValue}
              textBoxProps={{
                control,
                registered: 'note',
                disabled: !isTextFieldBtnEnabled,
              }}
              issueDropdownProps={{
                disabled: !isTextFieldBtnEnabled,
                options: issueOptions,
                value: watch('issueIds').map((issueId) => issueId.toString()),
                onChange: handleChangeIssues,
                error: issueIdsError?.message,
              }}
            />
          </div>
          <div className={styles.WorkReport__Separator}></div>
          <MaintenanceInstructionList
            instructions={currentInstructions}
            otherInstructions={otherInstructions}
            onValidityChange={handleValidityChange}
            hasOtherInstructions={workReport?.isDegradation ?? false}
            key={maintenanceOrderId}
            disabled={isActive ? undefined : true}
          />
        </div>
      </div>
    </>
  );
};
