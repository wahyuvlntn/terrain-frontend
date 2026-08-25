import { Button, Container, Popup } from '@digital-twin/components';
import { Edit2, Instruction, Resize, TrashDelete } from '@digital-twin/icons';
import { getURLExplicit } from '@digital-twin/utils';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

import { InstructionDetailMetadata, PdfViewer, RichTextEditor } from '../../../components';
import { useInstructionDetail } from './instruction-detail.hook';
import styles from './instruction-detail.module.scss';

// type InstructionDetailLabelValuePairProps = {
//   label: string;
//   value: string;
// };

// const InstructionDetailLabelValuePair = ({
//   label,
//   value,
// }: InstructionDetailLabelValuePairProps) => {
//   return (
//     <div className={styles.InstructionDetailKeyValuePair}>
//       <span className={styles.InstructionDetailKeyValuePair__Key}>{`${label}:`}</span>
//       <span className={styles.InstructionDetailKeyValuePair__Value}>{value}</span>
//     </div>
//   );
// };

// type InstructionDetailChildContainerProps = {
//   title: string;
//   children: ReactNode;
//   className?: string;
// };

// const InstructionDetailChildContainer = ({
//   title,
//   children,
//   className,
// }: InstructionDetailChildContainerProps) => {
//   return (
//     <div className={clsx(styles.InstructionDetailChildContainer, className)}>
//       <span className={styles.InstructionDetailChildContainer__Title}>{title}</span>
//       {children}
//     </div>
//   );
// };

// type InstructionDetailMetadataProps = {
//   description: string;
//   assetNames: string[];
//   createdBy: string;
//   createdAt: string;
//   updatedAt: string | null;
//   duration: number;
// };

// export const InstructionDetailMetadata = ({
//   createdAt,
//   createdBy,
//   updatedAt,
//   assetNames,
//   duration,
//   description,
// }: InstructionDetailMetadataProps) => {
//   const formattedCreatedAt = createdAt ? format(new Date(createdAt), 'dd MMMM yyyy') : '';
//   const formattedUpdatedAt = updatedAt ? format(new Date(updatedAt), 'dd MMMM yyyy') : '-';

//   return (
//     <div className={styles.InstructionDetailMetadata}>
//       <InstructionDetailChildContainer
//         title={'Description'}
//         className={styles.InstructionDetailMetadata__DescriptionContainer}
//       >
//         <span className={styles.InstructionDetailMetadata__DescriptionLabel} title={description}>
//           {description || '-'}
//         </span>
//       </InstructionDetailChildContainer>
//       <InstructionDetailChildContainer title={'Details'}>
//         <div className={styles.InstructionDetailMetadata__DetailsContainer}>
//           <InstructionDetailLabelValuePair label={'Created by'} value={createdBy} />
//           <InstructionDetailLabelValuePair label={'Submission Date'} value={formattedCreatedAt} />
//           <InstructionDetailLabelValuePair label={'Last Updated Date'} value={formattedUpdatedAt} />
//         </div>
//       </InstructionDetailChildContainer>
//       <InstructionDetailChildContainer title={'Estimated At'}>
//         <div className={styles.InstructionDetailMetadata__Badge}>
//           <TimeEmpty />
//           <span>{`${duration} ${duration > 1 ? 'minutes' : 'minute'}`}</span>
//         </div>
//       </InstructionDetailChildContainer>
//       <InstructionDetailChildContainer
//         title={'Assigned Equipment'}
//         className={styles.EquipmentContainer}
//       >
//         <div className={styles.InstructionDetailMetadata__EquipmentContainer}>
//           {assetNames?.map((assetName) => (
//             <div key={assetName} className={styles.InstructionDetailMetadata__Badge}>
//               {assetName}
//             </div>
//           ))}
//         </div>
//       </InstructionDetailChildContainer>
//     </div>
//   );
// };

export const InstructionDetail = () => {
  const {
    instructionDetail,
    // isInstructionDetailLoading,
    handleToggleFullScreenClick,
    isFullScreen,
    handleCloseDelete,
    openDelete,
    handleOpenDelete,
    handleDeleteInstruction,
    isPendingDeleteInstruction,
    hasUpdatePermission,
    hasDeletePermission,
  } = useInstructionDetail();

  return (
    <>
      <Popup
        title={'Delete Instruction'}
        open={openDelete}
        onClose={handleCloseDelete}
        icon={<Instruction />}
        variant={'custom'}
        submitButtonLabel={'Delete'}
        submitButtonIcon={<TrashDelete />}
        submitButtonColor={'error'}
        background={'none'}
        onSubmit={handleDeleteInstruction}
        submitting={isPendingDeleteInstruction}
      >
        <span className={styles.ConfirmDialog__Label}>
          Are you sure you want to delete this instruction?
        </span>
      </Popup>
      <Container
        background={'none'}
        title={`${instructionDetail?.alarmCodeName} - ${instructionDetail?.title}`}
        rightTopComponent={
          <div className={styles.InstructionDetail__ButtonContainer}>
            {hasDeletePermission ? (
              <Button color={'error'} onClick={handleOpenDelete}>
                <TrashDelete width={20} height={20} />
                <span>Delete</span>
              </Button>
            ) : null}
            {hasUpdatePermission ? (
              <Link to={'edit'}>
                <Button>
                  <Edit2 />
                  <span>Edit</span>
                </Button>
              </Link>
            ) : null}
            <Button onClick={handleToggleFullScreenClick}>
              <Resize className={styles.InstructionDetail__ResizeBtnIcon} />
            </Button>
          </div>
        }
        className={clsx(styles.InstructionDetail, isFullScreen && styles.fullscreen)}
      >
        <div className={styles.InstructionDetail__InnerContainer}>
          <div className={styles.InstructionDetail__MainContent}>
            {instructionDetail?.isUsingPdf ? (
              <PdfViewer
                pdfUrl={
                  instructionDetail?.pdfUrl ? getURLExplicit() + instructionDetail?.pdfUrl : ''
                }
                pdfName={instructionDetail?.pdfName ?? ''}
              />
            ) : (
              <RichTextEditor defaultValues={instructionDetail?.content ?? ''} readOnly />
            )}
          </div>
          <div className={styles.InstructionDetail__Metadata}>
            <InstructionDetailMetadata
              description={instructionDetail?.description ?? ''}
              assetNames={instructionDetail?.assetNames ?? []}
              createdBy={instructionDetail?.createdBy ?? ''}
              createdAt={instructionDetail?.createdAt ?? ''}
              updatedAt={instructionDetail?.updatedAt ?? null}
              duration={instructionDetail?.duration ?? 0}
              alarmCode={instructionDetail?.alarmCodeFullName ?? ''}
            />
          </div>
        </div>
      </Container>
    </>
  );
};
