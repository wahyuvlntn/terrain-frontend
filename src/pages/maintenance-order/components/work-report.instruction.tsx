// import { Badge, Button } from '@digital-twin/components';
// import { AlertAlarm, Check, ChevronDown, ChevronUp, Instruction, List } from '@digital-twin/icons';
// import clsx from 'clsx';
// import { ReactNode, useMemo, useState } from 'react';
// import { useToggle } from 'usehooks-ts';

// import {
//   InstructionDetailMetadata,
//   PdfViewer,
//   RichTextEditor,
// } from '../../maintenance-instruction';
// import { TInstruction } from '../api/work-report';
// import styles from './work-report.instruction.module.scss';

// type MaintenanceInstructionItemProps = Omit<TInstruction, 'id' | 'typeName' | 'codeName' | 'order'>;

// const MaintenanceInstructionItem = ({
//   assetNames,
//   name,
//   createdAt,
//   createdBy,
//   description,
//   duration,
//   pdfUrl,
//   isUsingPdf,
//   content,
//   updatedAt,
//   pdfName,
// }: MaintenanceInstructionItemProps) => {
//   const [expanded, setExpanded] = useToggle(false);

//   return (
//     <div className={styles.MaintenanceInstructionItem}>
//       <div className={styles.MaintenanceInstructionItem__Header}>
//         <div className={styles.MaintenanceInstructionItem__Header__Label}>
//           <div className={styles.MaintenanceInstructionItem__Header__TitleIconContainer}>
//             <div className={styles.MaintenanceInstructionItem__Header__TitleBadgeContainer}>
//               <span className={styles.MaintenanceInstructionItem__Header__TitleLabel}>{name}</span>
//             </div>
//           </div>
//         </div>
//         {expanded ? (
//           <ChevronUp onClick={setExpanded} className={styles.BtnIcon} />
//         ) : (
//           <ChevronDown onClick={setExpanded} className={styles.BtnIcon} />
//         )}
//       </div>
//       {expanded ? (
//         <div className={styles.MaintenanceInstructionItem__Body}>
//           <div className={styles.MaintenanceInstructionItem__MainContent}>
//             {isUsingPdf ? (
//               <PdfViewer pdfUrl={pdfUrl ?? ''} pdfName={pdfName ?? ''} />
//             ) : (
//               <RichTextEditor defaultValues={content ?? ''} readOnly />
//             )}
//           </div>
//           <div className={styles.MaintenanceInstructionItem__InstructionDetailMetadata}>
//             <InstructionDetailMetadata
//               description={description}
//               assetNames={assetNames}
//               createdBy={createdBy}
//               createdAt={createdAt}
//               updatedAt={updatedAt}
//               duration={duration}
//             />
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// };

// type ValidityChevronProps = {
//   isDiagnosis: boolean;
//   isValid: boolean | null;
//   expanded: boolean;
//   onToggleExpanded: () => void;
// };

// const ValidityChevron = ({
//   isDiagnosis,
//   isValid,
//   expanded,
//   onToggleExpanded,
// }: ValidityChevronProps) => {
//   const getColor = () => {
//     if (isDiagnosis && isValid) return 'running';
//     if (isDiagnosis && isValid === false) return 'unplanned-down';
//     if (!isDiagnosis && isValid) return 'normal';
//     if (!isDiagnosis && isValid === false) return 'critical';
//     return undefined;
//   };
//   return (
//     <div className={styles.ValidityChevron}>
//       <Badge
//         className={styles.ValidityChevron__ValidityBadge}
//         color={getColor()}
//       >{`${isDiagnosis ? 'Alarm' : 'Issue'} status: ${getValidityName(isDiagnosis, isValid).validityName}`}</Badge>
//       {expanded ? (
//         <ChevronUp onClick={onToggleExpanded} className={styles.BtnIcon} />
//       ) : (
//         <ChevronDown onClick={onToggleExpanded} className={styles.BtnIcon} />
//       )}
//     </div>
//   );
// };

// const getValidityName = (isDiagnosis: boolean, isValid: boolean | null) => {
//   const invalidName = isDiagnosis ? 'Invalid' : 'Unresolved';
//   const validName = isDiagnosis ? 'Valid' : 'Resolved';
//   const getValidityName = () => {
//     if (isValid === null) return '-';
//     if (isValid) return validName;
//     return invalidName;
//   };

//   return {
//     invalidName,
//     validName,
//     validityName: getValidityName(),
//   };
// };

// type MaintenanceInstructionTypeProps = {
//   children: ReactNode;
//   isDiagnosis: boolean;
//   isValid: boolean | null;
//   onValidChange: (isValid: boolean | null) => void;
//   disablePrimaryBtn?: boolean;
//   disableCancelBtn?: boolean;
//   actionMessage?: {
//     title: string;
//     description: string;
//   };
// };

// const MaintenanceInstructionType = ({
//   children,
//   isDiagnosis,
//   isValid,
//   onValidChange,
//   disablePrimaryBtn,
//   disableCancelBtn,
//   actionMessage,
// }: MaintenanceInstructionTypeProps) => {
//   const [expanded, setExpanded] = useToggle(false);

//   const { invalidName, validName } = getValidityName(isDiagnosis, isValid);

//   const handleCancel = () => onValidChange(null);
//   const handleSetValid = () => onValidChange(true);
//   const handleSetInvalid = () => onValidChange(false);

//   return (
//     <div className={styles.MaintenanceInstructionType}>
//       <div className={styles.MaintenanceInstructionType__Header}>
//         <span className={styles.MaintenanceInstructionType__Title}>
//           {isDiagnosis ? 'Diagnosis' : 'Repair'}
//         </span>
//         <ValidityChevron
//           expanded={expanded}
//           onToggleExpanded={setExpanded}
//           isDiagnosis={isDiagnosis}
//           isValid={isValid}
//         />
//       </div>

//       {expanded ? (
//         <div className={styles.MaintenanceInstructionType__Content}>
//           {children}
//           <div className={styles.MaintenanceInstructionType__Footer}>
//             <div className={styles.MaintenanceInstructionType__ConfirmMsgContainer}>
//               <span className={styles.MaintenanceInstructionType__ConfirmMsgContainer__Title}>
//                 {isDiagnosis ? 'Confirm Diagnosis Result' : 'Confirm Repair Outcome'}
//               </span>
//               <span className={styles.MaintenanceInstructionType__ConfirmMsgContainer__Description}>
//                 {isDiagnosis
//                   ? 'Confirm whether this diagnosis is correct. This will determine if repair actions are required.'
//                   : 'Confirm whether the issue has been resolved after performing the repair.'}
//               </span>
//             </div>
//             <div className={styles.MaintenanceInstructionType__BtnContainer}>
//               <div className={styles.MaintenanceInstructionType__PrimaryBtnContainer}>
//                 {actionMessage ? (
//                   <div className={styles.MaintenanceInstructionType__ActionMsgContainer}>
//                     <span className={styles.MaintenanceInstructionType__ActionMsgContainer__Title}>
//                       {actionMessage.title}
//                     </span>
//                     <span
//                       className={styles.MaintenanceInstructionType__ActionMsgContainer__Description}
//                     >
//                       {actionMessage.description}
//                     </span>
//                   </div>
//                 ) : null}
//                 <Button
//                   disabled={disablePrimaryBtn ?? isValid !== null}
//                   onClick={handleSetInvalid}
//                   color={'error'}
//                   className={clsx(!isDiagnosis && styles.BtnCritical)}
//                 >{`Mark as ${invalidName}`}</Button>
//                 <Button
//                   onClick={handleSetValid}
//                   color={'success'}
//                   disabled={disablePrimaryBtn ?? isValid !== null}
//                   className={clsx(!isDiagnosis && styles.BtnNormal)}
//                 >
//                   <Check width={20} height={20} />
//                   <span>{`Mark as ${validName}`}</span>
//                 </Button>
//               </div>
//               {isValid !== null ? (
//                 <Button
//                   onClick={handleCancel}
//                   color={'default-secondary'}
//                   disabled={disableCancelBtn}
//                 >
//                   Cancel
//                 </Button>
//               ) : null}
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// };

// type MaintenanceInstructionAlarmProps = {
//   codeName: string;
//   children: ReactNode;
//   isValid: boolean | null;
//   isRepairConfirmed: boolean;
// };

// const MaintenanceInstructionAlarm = ({
//   children,
//   codeName,
//   isValid,
//   isRepairConfirmed,
// }: MaintenanceInstructionAlarmProps) => {
//   const [expanded, setExpanded] = useToggle(false);

//   return (
//     <div className={styles.MaintenanceInstructionAlarm}>
//       <div className={styles.MaintenanceInstructionAlarm__Header}>
//         <div className={styles.MaintenanceInstructionAlarm__Title}>
//           <Instruction />
//           <span>{codeName}</span>
//         </div>
//         <ValidityChevron
//           expanded={expanded}
//           onToggleExpanded={setExpanded}
//           isDiagnosis={!isRepairConfirmed}
//           isValid={isValid}
//         />
//       </div>
//       {expanded ? (
//         <div className={styles.MaintenanceInstructionAlarm__Content}>{children}</div>
//       ) : null}
//     </div>
//   );
// };

// const TYPE = {
//   DIAGNOSIS: 'Diagnosis',
//   REPAIR: 'Repair',
// };

// export type GroupedInstruction = {
//   codeName: string;
//   codeId: number;
//   data: {
//     typeName: string;
//     typeId: number;
//     isValid: boolean | null;
//     data: Omit<TInstruction, 'typeName' | 'codeName' | 'order'>[];
//   }[];
// };

// type MaintenanceInstructionListProps = {
//   instructions: GroupedInstruction[];
//   otherInstructions: GroupedInstruction[];
//   hasOtherInstructions: boolean;
//   onValidityChange: (
//     isOther: boolean,
//     codeId: number,
//     typeId: number,
//     isValid: boolean | null
//   ) => void;
//   estimatedTime?: string;
// };

// export const MaintenanceInstructionList = ({
//   instructions,
//   otherInstructions,
//   hasOtherInstructions,
//   onValidityChange,
//   estimatedTime,
// }: MaintenanceInstructionListProps) => {
//   const [showOther, setShowOther] = useState(false);

//   const activeInstructions = useMemo(
//     () => (showOther ? otherInstructions : instructions),
//     [showOther, instructions, otherInstructions]
//   );

//   // const getAlarmValidity = (codeId: number) => {
//   //   const selectedInstructions = showOther ? otherInstructions : instructions;
//   //   const instructionTypes = selectedInstructions.find(
//   //     (instructionAlarm) => instructionAlarm.codeId === codeId
//   //   )?.data;
//   //   if (!instructionTypes) {
//   //     return null;
//   //   }
//   //   const repairInstructions = instructionTypes.find(
//   //     (instructionType) => instructionType.typeName === 'Repair'
//   //   );
//   //   if (repairInstructions?.isValid || repairInstructions?.isValid === false) {
//   //     return repairInstructions.isValid;
//   //   }

//   //   const diagnosisInstructions = instructionTypes.find(
//   //     (instructionType) => instructionType.typeName === 'Diagnosis'
//   //   );
//   //   if (diagnosisInstructions) {
//   //     return diagnosisInstructions.isValid;
//   //   }

//   //   return null;
//   // };

//   // const getIsRepairConfirmed = (codeId: number) => {
//   //   const selectedInstructions = showOther ? otherInstructions : instructions;
//   //   const instructionTypes = selectedInstructions.find(
//   //     (instructionAlarm) => instructionAlarm.codeId === codeId
//   //   )?.data;
//   //   if (!instructionTypes) {
//   //     return false;
//   //   }
//   //   const repairInstructions = instructionTypes.find(
//   //     (instructionType) => instructionType.typeName === 'Repair'
//   //   );
//   //   if (repairInstructions) {
//   //     return repairInstructions.isValid === false || repairInstructions.isValid === true;
//   //   }

//   //   return false;
//   // };

//   // const getIsInstructionTypePrimaryBtnDisabled = (
//   //   codeId: number,
//   //   typeName: string,
//   //   isValid: boolean | null
//   // ) => {
//   //   if (typeName === 'Diagnosis') return undefined;

//   //   if (isValid !== null) return true;

//   //   const selectedInstructions = showOther ? otherInstructions : instructions;
//   //   const instructionTypes = selectedInstructions.find(
//   //     (instructionAlarm) => instructionAlarm.codeId === codeId
//   //   )?.data;
//   //   if (!instructionTypes) {
//   //     return false;
//   //   }

//   //   const diagnosisInstructions = instructionTypes.find(
//   //     (instructionType) => instructionType.typeName === 'Diagnosis'
//   //   );
//   //   if (diagnosisInstructions) {
//   //     return !diagnosisInstructions.isValid;
//   //   }
//   //   return false;
//   // };

//   // const getIsInstructionTypeCancelBtnDisabled = (codeId: number, typeName: string) => {
//   //   if (typeName === 'Repair') return undefined;

//   //   const selectedInstructions = showOther ? otherInstructions : instructions;
//   //   const instructionTypes = selectedInstructions.find(
//   //     (instructionAlarm) => instructionAlarm.codeId === codeId
//   //   )?.data;
//   //   if (!instructionTypes) {
//   //     return undefined;
//   //   }

//   //   const repairInstructions = instructionTypes.find(
//   //     (instructionType) => instructionType.typeName === 'Repair'
//   //   );
//   //   if (repairInstructions?.isValid || repairInstructions?.isValid === false) {
//   //     return true;
//   //   }
//   //   return undefined;
//   // };

//   // const getActionMessage = (codeId: number, typeName: string, isValid: boolean | null) => {
//   //   if (typeName === 'Diagnosis') {
//   //     if (isValid)
//   //       return {
//   //         title: 'Diagnosis Status: Valid',
//   //         description: 'This issue requires repair actions.',
//   //       };
//   //     else if (isValid === false)
//   //       return {
//   //         title: 'Diagnosis Status: Invalid',
//   //         description: 'No repair is required for this issue.',
//   //       };
//   //   } else {
//   //     if (isValid)
//   //       return {
//   //         title: 'Repair Status: Resolved',
//   //         description: 'The issue has been successfully fixed.',
//   //       };
//   //     else if (isValid === false)
//   //       return {
//   //         title: 'Repair Status: Unresolved',
//   //         description: 'The issue is still present after the repair.',
//   //       };
//   //     else {
//   //       const selectedInstructions = showOther ? otherInstructions : instructions;
//   //       const instructionTypes = selectedInstructions.find(
//   //         (instructionAlarm) => instructionAlarm.codeId === codeId
//   //       )?.data;
//   //       if (!instructionTypes) {
//   //         return undefined;
//   //       }

//   //       const diagnosisInstructions = instructionTypes.find(
//   //         (instructionType) => instructionType.typeName === 'Diagnosis'
//   //       );
//   //       if (diagnosisInstructions?.isValid) {
//   //         return undefined;
//   //       }

//   //       return {
//   //         title: 'Repair Disabled',
//   //         description: 'Repair can only be performed after the diagnosis is confirmed as valid.',
//   //       };
//   //     }
//   //   }
//   // };

//   return (
//     <div className={styles.MaintenanceInstructionList}>
//       <div className={styles.MaintenanceInstructionList__Header}>
//         <span className={styles.MaintenanceInstructionList__Title}>Maintenance Instructions:</span>
//         <div className={styles.MaintenanceInstructionList__EstimatedTimeIssueSelectorContainer}>
//           {estimatedTime ? <span className={styles.MaintenanceInstructionList__EstimatedTimeLabel}>{`Estimated Time: ${estimatedTime}`}</span> : null}
//           {hasOtherInstructions ? (
//             <div className={styles.MaintenanceInstructionList__IssueSelector}>
//               <TabItem
//                 active={!showOther}
//                 onClick={() => setShowOther(false)}
//                 icon={<AlertAlarm />}
//                 label="Current Issues"
//               />
//               <TabItem
//                 active={showOther}
//                 onClick={() => setShowOther(true)}
//                 icon={<List />}
//                 label="Other Possible Issues"
//               />
//             </div>
//           ) : null}
//         </div>
//       </div>
//       <div className={styles.MaintenanceInstructionList__InstructionList}>
//         {activeInstructions.map((group) => {
//           const diagnosis = group.data.find((d) => d.typeName === TYPE.DIAGNOSIS);
//           const repair = group.data.find((d) => d.typeName === TYPE.REPAIR);

//           const alarmValidity = repair?.isValid ?? diagnosis?.isValid ?? null;
//           const isRepairConfirmed = repair?.isValid !== null && repair?.isValid !== undefined;

//           return (
//             <MaintenanceInstructionAlarm
//               key={group.codeId}
//               codeName={group.codeName}
//               //isValid={getAlarmValidity(group.codeId)}
//               isValid={alarmValidity}
//               //isRepairConfirmed={getIsRepairConfirmed(group.codeId)}
//               isRepairConfirmed={isRepairConfirmed}
//             >
//               {group.data.map((type) => {
//                 const isDiagType = type.typeName === TYPE.DIAGNOSIS;
//                 const isRepairType = type.typeName === TYPE.REPAIR;

//                 const disablePrimaryBtn = isRepairType
//                   ? type.isValid !== null || !diagnosis?.isValid
//                   : undefined;

//                 const disableCancelBtn = isDiagType
//                   ? repair?.isValid !== null && repair?.isValid !== undefined
//                   : undefined;

//                 return (
//                   <MaintenanceInstructionType
//                     key={type.typeId}
//                     isDiagnosis={isDiagType}
//                     isValid={type.isValid}
//                     disablePrimaryBtn={disablePrimaryBtn}
//                     // disablePrimaryBtn={getIsInstructionTypePrimaryBtnDisabled(
//                     //   group.codeId,
//                     //   type.typeName,
//                     //   type.isValid
//                     // )}
//                     disableCancelBtn={disableCancelBtn}
//                     // disableCancelBtn={getIsInstructionTypeCancelBtnDisabled(
//                     //   group.codeId,
//                     //   type.typeName
//                     // )}

//                     //actionMessage={getActionMessage(group.codeId, type.typeName, type.isValid)}
//                     actionMessage={getInstructionMessage(type, diagnosis)}
//                     onValidChange={(isValid) =>
//                       onValidityChange(showOther, group.codeId, type.typeId, isValid)
//                     }
//                   >
//                     {type.data.map((instruction) => (
//                       <MaintenanceInstructionItem key={instruction.id} {...instruction} />
//                     ))}
//                   </MaintenanceInstructionType>
//                 );
//               })}
//             </MaintenanceInstructionAlarm>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// const TabItem = ({
//   active,
//   onClick,
//   icon,
//   label,
// }: {
//   active: boolean;
//   onClick: () => void;
//   icon: React.ReactNode;
//   label: string;
// }) => (
//   <div
//     onClick={onClick}
//     className={clsx(styles.MaintenanceInstructionList__IssueSelectorItem, active && styles.active)}
//   >
//     {icon}
//     <span>{label}</span>
//   </div>
// );

// function getInstructionMessage(
//   type: GroupedInstruction['data'][0],
//   diagnosis?: GroupedInstruction['data'][0]
// ) {
//   const { typeName, isValid } = type;

//   if (typeName === TYPE.DIAGNOSIS) {
//     if (isValid === true)
//       return {
//         title: 'Diagnosis Status: Valid',
//         description: 'This issue requires repair actions.',
//       };
//     if (isValid === false)
//       return {
//         title: 'Diagnosis Status: Invalid',
//         description: 'No repair is required for this issue.',
//       };
//   }

//   if (typeName === TYPE.REPAIR) {
//     if (isValid === true)
//       return {
//         title: 'Repair Status: Resolved',
//         description: 'The issue has been successfully fixed.',
//       };
//     if (isValid === false)
//       return {
//         title: 'Repair Status: Unresolved',
//         description: 'The issue is still present after the repair.',
//       };

//     if (!diagnosis?.isValid) {
//       return {
//         title: 'Repair Disabled',
//         description: 'Repair can only be performed after the diagnosis is confirmed as valid.',
//       };
//     }
//   }

//   return undefined;
// }
