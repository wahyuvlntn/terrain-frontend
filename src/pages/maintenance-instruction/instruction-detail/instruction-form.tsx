import { Button, FileInputPopup, InfoTooltip, Popup } from '@digital-twin/components';
import {
  ArrowLeft,
  Check,
  CloseDownErrorCircleFill,
  Instruction,
  Plus,
  SaveFill,
} from '@digital-twin/icons';
import { ImportNotesIcon } from '@digital-twin/reusables';
import { getURLExplicit } from '@digital-twin/utils';
import { Controller } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { PdfViewer, RichTextEditor } from '../../../components';
import { DetailForm } from './detail-form';
import { useInstructionForm } from './instruction-form.hook';
import styles from './instruction-form.module.scss';

type InstructionFormProps = {
  isCreate: boolean;
};

const InstructionFormTooltip = ({ isCreate }: InstructionFormProps) => {
  return (
    <InfoTooltip
      contentStyle={{
        maxWidth: 733,
      }}
      title={isCreate ? 'Add New Instruction' : 'Edit Instruction'}
      content={
        'Create a new maintenance instruction or update an existing one. Enter the title, type, duration, target equipment, and short description in the Detail panel, then write the step-by-step procedure in the editor.'
      }
    />
  );
};

export const InstructionForm = () => {
  const {
    handleSubmitUpdate,
    handleSubmitCreate,
    instructionDetail,
    isInstructionDetailLoading,
    handleOpenImportPdf,
    handleCloseImportPdf,
    isCreate,
    isOpenImportPdf,
    isPendingUploadPdf,
    isPendingUploadMedia,
    pdfValue,
    handlePdfChange,
    handleSubmitPdf,
    instructionTypes,
    createOpen,
    handleCancelClose,
    handleCancelOpen,
    handleCreateClose,
    handleCreateOpen,
    handleUpdateClose,
    handleUpdateOpen,
    cancelOpen,
    updateOpen,
    models,
    alarmCodes,
    handleCancel,
    handleUploadMedia,
    isPendingCreateInstruction,
    isPendingUpdateInstruction,
    watch,
    setValue,
    control,
    modelIdsError,
  } = useInstructionForm();

  const isUsingPdf = watch('isUsingPdf');
  const pdfUrl = watch('pdfUrl');
  const pdfName = watch('pdfName');
  const modelIds = watch('modelIds');
  const handleModelIdsChange = (modelIds: number[]) => {
    setValue('modelIds', modelIds);
  };

  return (
    <>
      <Popup
        title={'Confirm Cancellation'}
        open={cancelOpen}
        onClose={handleCancelClose}
        icon={<CloseDownErrorCircleFill />}
        variant={'custom'}
        submitButtonLabel={'Confirm'}
        submitButtonIcon={<Check />}
        background={'none'}
        onSubmit={handleCancel}
        wrapperClassName={styles.Popup}
      >
        <span className={styles.ConfirmDialog__Label}>
          Are you sure you want to cancel this action? All changes will be permanently discarded.
        </span>
      </Popup>
      <Popup
        title={'Update Instruction'}
        open={updateOpen}
        onClose={handleUpdateClose}
        icon={<Instruction />}
        variant={'custom'}
        submitButtonLabel={'Save'}
        submitButtonIcon={<SaveFill />}
        background={'none'}
        onSubmit={handleSubmitUpdate}
        submitting={isPendingUpdateInstruction}
        wrapperClassName={styles.Popup}
      >
        <span className={styles.ConfirmDialog__Label}>
          Are you sure you want to save and update this instruction?
        </span>
      </Popup>
      <Popup
        title={'Create Instruction'}
        open={createOpen}
        onClose={handleCreateClose}
        icon={<Instruction />}
        variant={'custom'}
        submitButtonLabel={'Create'}
        submitButtonIcon={<Plus />}
        background={'none'}
        onSubmit={handleSubmitCreate}
        submitting={isPendingCreateInstruction}
        wrapperClassName={styles.Popup}
      >
        <span className={styles.ConfirmDialog__Label}>
          Are you sure you want to create and submit this instruction?
        </span>
      </Popup>
      <FileInputPopup
        title={'Import File'}
        supportedFileTypes={['.pdf']}
        uploadButtonLabel={'Import'}
        open={isOpenImportPdf}
        onClose={handleCloseImportPdf}
        onSubmit={handleSubmitPdf}
        icon={<ImportNotesIcon />}
        isPending={isPendingUploadPdf}
        acceptMimeTypes={['application/pdf']}
        value={pdfValue}
        onChange={handlePdfChange}
        wrapperClassName={styles.Popup}
      />
      <div className={styles.InstructionForm}>
        <div className={styles.InstructionForm__Header}>
          <div className={styles.InstructionForm__PrevNavigationLegendContainer}>
            <div className={styles.InstructionForm__PrevNavigation}>
              <Link to={'..'}>
                <ArrowLeft className={styles.InstructionForm__PrevBtn} />
              </Link>
              <span className={styles.InstructionForm__PageLabel}>
                {isCreate
                  ? 'Add New Instruction'
                  : `${instructionDetail?.alarmCodeName} - ${instructionDetail?.instructionTypeName} ${instructionDetail?.title}`}
              </span>
              <InstructionFormTooltip isCreate={isCreate} />
            </div>
          </div>

          <Button onClick={handleOpenImportPdf}>
            <ImportNotesIcon className={styles.InstructionForm__ImportBtnIcon} />
            <span>Import</span>
          </Button>
        </div>
        <div className={styles.InstructionForm__Body}>
          <div className={styles.InstructionForm__MainContent}>
            {isUsingPdf ? (
              <div className={styles.InstructionForm__PdfViewerContainer}>
                <span className={styles.InstructionForm__ContainerHeader}>Preview</span>
                <PdfViewer
                  pdfUrl={pdfUrl ? getURLExplicit() + pdfUrl : ''}
                  pdfName={pdfName ?? ''}
                />
              </div>
            ) : (
              <div className={styles.InstructionForm__RichTextEditorOuterContainer}>
                <div className={styles.InstructionForm__RichTextEditorInnerContainer}>
                  <span className={styles.InstructionForm__ContainerHeader}>Edit</span>
                  <Controller
                    render={({ field }) => (
                      <RichTextEditor
                        toolbarClassName={styles.InstructionForm__RichTextEditorToolbar}
                        defaultValues={field.value ?? ''}
                        onBlur={field.onChange}
                        imageUploadHandler={handleUploadMedia}
                        videoUploadHandler={handleUploadMedia}
                        isLoading={isPendingUploadMedia}
                      />
                    )}
                    name={'content'}
                    control={control}
                  />
                </div>
              </div>
            )}
          </div>
          <div className={styles.InstructionForm__Metadata}>
            <DetailForm
              alarmCodeDropdownProps={{
                control,
                registered: 'alarmCodeId',
              }}
              titleInputProps={{
                control,
                registered: 'title',
              }}
              instructionTypeDropdownProps={{
                control,
                registered: 'instructionTypeId',
              }}
              durationDropdownProps={{
                control,
                registered: 'duration',
              }}
              descriptionTextBoxProps={{
                control,
                registered: 'description',
              }}
              modelIds={modelIds}
              alarmCodes={alarmCodes}
              onModelIdsChange={handleModelIdsChange}
              submitBtnLabel={isCreate ? 'Create' : 'Save'}
              submitBtnIcon={isCreate ? <Plus /> : <SaveFill />}
              instructionTypes={instructionTypes}
              onCancel={handleCancelOpen}
              onSubmit={isCreate ? handleCreateOpen : handleUpdateOpen}
              models={models}
              modelIdsError={modelIdsError?.message}
            />
          </div>
        </div>
      </div>
    </>
  );
};
