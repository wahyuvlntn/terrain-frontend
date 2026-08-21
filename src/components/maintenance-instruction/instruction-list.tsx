import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { Badge, Button } from '@digital-twin/components';
import {
  AlertAlarm,
  Check,
  ChevronDown,
  ChevronUp,
  Instruction,
  List,
  SaveFill,
} from '@digital-twin/icons';
import {
  DropdownMenu,
  getActionFromKey,
  getUpdatedIndex,
  isElementInView,
  isScrollable,
  maintainScrollVisibility,
  SelectActions,
} from '@digital-twin/reusables';
import clsx from 'clsx';
import {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useToggle } from 'usehooks-ts';

import { InstructionDetailMetadata } from './instruction-detail-metadata';
import styles from './instruction-list.module.scss';
import { PdfViewer } from './pdf-viewer';
import { RichTextEditor } from './rich-text-editor';
import { TInstruction } from './type';

type MaintenanceInstructionItemProps = Omit<
  TInstruction,
  'id' | 'typeName' | 'order'
>;

const MaintenanceInstructionItem = ({
  modelNames,
  name,
  createdAt,
  createdBy,
  description,
  duration,
  pdfUrl,
  isUsingPdf,
  content,
  updatedAt,
  pdfName,
  codeName,
}: MaintenanceInstructionItemProps) => {
  const [expanded, setExpanded] = useToggle(false);

  return (
    <div className={styles.MaintenanceInstructionItem}>
      <div className={styles.MaintenanceInstructionItem__Header}>
        <div className={styles.MaintenanceInstructionItem__Header__Label}>
          <div
            className={
              styles.MaintenanceInstructionItem__Header__TitleIconContainer
            }
          >
            <div
              className={
                styles.MaintenanceInstructionItem__Header__TitleBadgeContainer
              }
            >
              <span
                className={
                  styles.MaintenanceInstructionItem__Header__TitleLabel
                }
              >
                {name}
              </span>
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp onClick={setExpanded} className={styles.BtnIcon} />
        ) : (
          <ChevronDown onClick={setExpanded} className={styles.BtnIcon} />
        )}
      </div>
      {expanded ? (
        <div className={styles.MaintenanceInstructionItem__Body}>
          <div className={styles.MaintenanceInstructionItem__MainContent}>
            {isUsingPdf ? (
              <PdfViewer pdfUrl={pdfUrl ?? ''} pdfName={pdfName ?? ''} />
            ) : (
              <RichTextEditor defaultValues={content ?? ''} readOnly />
            )}
          </div>
          <div
            className={
              styles.MaintenanceInstructionItem__InstructionDetailMetadata
            }
          >
            <InstructionDetailMetadata
              description={description}
              assetNames={modelNames}
              createdBy={createdBy}
              createdAt={createdAt}
              updatedAt={updatedAt}
              duration={duration}
              alarmCode={codeName}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

type ValidityDropdownProps = {
  isDiagnosis: boolean;
  isValid: boolean | null;
  onChange: (isValid: boolean | null) => void;
  readOnly?: boolean;
  disabled?: boolean;
  excludeNullOption?: boolean;
};

// --- Helpers ---
const boolToString = (val: boolean | null): string =>
  val === null ? 'null' : val ? 'true' : 'false';

const stringToBool = (val: string): boolean | null =>
  val === 'null' ? null : val === 'true';

export const ValidityDropdown = ({
  isDiagnosis,
  isValid,
  onChange,
  disabled,
  readOnly,
  excludeNullOption,
}: ValidityDropdownProps) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(boolToString(isValid));
  const optionEls = useRef<Map<string, HTMLDivElement>>(new Map());

  // Sync internal state with props
  useEffect(() => {
    setSelected(boolToString(isValid));
  }, [isValid]);

  const options = useMemo(
    () => {
      const baseOptions = [
        {
          value: 'true',
          label: isDiagnosis ? 'Valid' : 'Resolved',
        },
        {
          value: 'false',
          label: isDiagnosis ? 'Invalid' : 'Unresolved',
        },
      ];

      if (excludeNullOption) return baseOptions;

      return [
        ...baseOptions,
        {
          value: 'null',
          label: '-',
        },
      ];
    },
    [isDiagnosis, excludeNullOption]
  );

  const optionRecords = useMemo(
    () =>
      Object.fromEntries(
        options.map((opt, i) => [opt.value, { ...opt, index: i }])
      ),
    [options]
  );

  // --- Floating UI Hook ---
  const { floatingStyles, refs, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [
      offset(4),
      size({
        apply({ rects, elements }) {
          elements.floating.style.width = `${rects.reference.width}px`;
        },
      }),
      flip(),
    ],
    whileElementsMounted: autoUpdate,
  });

  const { getReferenceProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context),
  ]);

  // --- Action Handlers ---
  const updateMenuState = (newOpen: boolean, shouldFocus = true) => {
    if (open === newOpen) return;
    setOpen(newOpen);

    const comboEl = refs.reference.current as HTMLElement;
    if (newOpen && comboEl && !isElementInView(comboEl)) {
      comboEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (shouldFocus) comboEl?.focus();
  };

  const handleValueCommit = (newValue: string) => {
    const currentValString = boolToString(isValid);
    if (newValue !== currentValString) {
      onChange(stringToBool(newValue));
    }
  };

  const onOptionChange = (value: string) => {
    setSelected(value);
    const optionEl = optionEls.current.get(value);
    const listboxEl = refs.floating.current as HTMLElement;

    if (!listboxEl || !optionEl) return;

    if (isScrollable(listboxEl)) maintainScrollVisibility(optionEl, listboxEl);
    if (!isElementInView(optionEl)) {
      optionEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const onOptionClick = (newValue: string) => {
    onOptionChange(newValue);
    handleValueCommit(newValue);
    updateMenuState(false);
  };

  const onComboKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || disabled) return;

    const action = getActionFromKey(event, open);
    const currentIndex = optionRecords[selected]?.index ?? 0;
    const max = options.length - 1;

    switch (action) {
      case SelectActions.First:
      case SelectActions.Last:
      case SelectActions.Next:
      case SelectActions.Previous:
      case SelectActions.PageUp:
      case SelectActions.PageDown: {
        event.preventDefault();
        updateMenuState(true, false);
        const nextIndex = getUpdatedIndex(currentIndex, max, action);
        onOptionChange(options[nextIndex].value);
        break;
      }

      case SelectActions.CloseSelect:
        event.preventDefault();
        handleValueCommit(selected);
        updateMenuState(false);
        break;

      case SelectActions.Close:
        event.preventDefault();
        updateMenuState(false);
        break;

      case SelectActions.Open:
      case SelectActions.Type:
        updateMenuState(true);
        break;
    }
  };

  const onComboBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (readOnly || disabled) return;

    // Check if we are moving focus inside the dropdown
    const isFocusInside =
      refs.floating.current?.contains(event.relatedTarget as Node) ||
      (refs.reference.current as HTMLElement)?.contains(
        event.relatedTarget as Node
      );

    if (isFocusInside) return;

    handleValueCommit(selected);
    if (open) updateMenuState(false, false);
  };

  // --- UI Helpers ---
  const badgeColor = useMemo(() => {
    const val = stringToBool(selected);
    if (isDiagnosis)
      return val ? 'running' : val === false ? 'unplanned-down' : undefined;
    return val ? 'normal' : val === false ? 'critical' : undefined;
  }, [isDiagnosis, selected]);

  const label = `${isDiagnosis ? 'Alarm' : 'Issue'} status: ${getValidityName(isDiagnosis, stringToBool(selected)).validityName
    }`;

  return (
    <>
      <Badge
        ref={refs.setReference}
        {...getReferenceProps()}
        id={`${id}-combo`}
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${id}-option-${selected}` : ''}
        aria-disabled={disabled}
        aria-readonly={readOnly}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !readOnly && !disabled && updateMenuState(!open, false)}
        onBlur={onComboBlur}
        onKeyDown={onComboKeyDown}
        className={clsx(
          styles.ValidityChevron__ValidityBadge,
          disabled && styles.disabled
        )}
        color={badgeColor}
      >
        <span>{label}</span>
        <ChevronDown className={styles.BtnIcon} />
      </Badge>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            onClick={(e) => e.stopPropagation()}
            className={clsx(styles['dropdown-menu'])}
            role="listbox"
            id={`${id}-listbox`}
            tabIndex={-1}
          >
            <DropdownMenu
              id={id}
              options={options}
              onOptionClick={onOptionClick}
              onOptionMouseDown={(e: MouseEvent) =>
                !readOnly && !disabled && e.preventDefault()
              }
              setOptionRef={(val, el) => {
                if (el) optionEls.current.set(val, el);
                else optionEls.current.delete(val);
              }}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

type ValidityBadgeProps = {
  isDiagnosis: boolean;
  isValid: boolean | null;
};

export const ValidityBadge = ({ isDiagnosis, isValid }: ValidityBadgeProps) => {
  const getColor = () => {
    if (isDiagnosis && isValid) return 'running';
    if (isDiagnosis && isValid === false) return 'unplanned-down';
    if (!isDiagnosis && isValid) return 'normal';
    if (!isDiagnosis && isValid === false) return 'critical';
    return undefined;
  };

  return (
    <Badge
      className={styles.ValidityChevron__ValidityBadge}
      color={getColor()}
    >{`${isDiagnosis ? 'Alarm' : 'Issue'} status: ${getValidityName(isDiagnosis, isValid).validityName
      }`}</Badge>
  );
};

type ValidityChevronProps = {
  isDiagnosis: boolean;
  isValid: boolean | null;
  expanded: boolean;
  onToggleExpanded: () => void;
};

const ValidityChevron = ({
  isDiagnosis,
  isValid,
  expanded,
  onToggleExpanded,
}: ValidityChevronProps) => {
  return (
    <div className={styles.ValidityChevron}>
      <ValidityBadge isDiagnosis={isDiagnosis} isValid={isValid} />
      {expanded ? (
        <ChevronUp onClick={onToggleExpanded} className={styles.BtnIcon} />
      ) : (
        <ChevronDown onClick={onToggleExpanded} className={styles.BtnIcon} />
      )}
    </div>
  );
};

type ValidityDropdownWithChevronProps = {
  isDiagnosis: boolean;
  isValid: boolean | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onValidChange: (isValid: boolean | null) => void;
  disabled?: boolean;
};

const ValidityDropdownWithChevron = ({
  expanded,
  isDiagnosis,
  isValid,
  onToggleExpanded,
  onValidChange,
  disabled,
}: ValidityDropdownWithChevronProps) => {
  return (
    <div className={styles.ValidityChevron}>
      <ValidityDropdown
        isDiagnosis={isDiagnosis}
        isValid={isValid}
        onChange={onValidChange}
        disabled={disabled}
      />
      {expanded ? (
        <ChevronUp onClick={onToggleExpanded} className={styles.BtnIcon} />
      ) : (
        <ChevronDown onClick={onToggleExpanded} className={styles.BtnIcon} />
      )}
    </div>
  );
};

const getValidityName = (isDiagnosis: boolean, isValid: boolean | null) => {
  const invalidName = isDiagnosis ? 'Invalid' : 'Unresolved';
  const validName = isDiagnosis ? 'Valid' : 'Resolved';
  const getValidityName = () => {
    if (isValid === null) return '-';
    if (isValid) return validName;
    return invalidName;
  };

  return {
    invalidName,
    validName,
    validityName: getValidityName(),
  };
};

type MaintenanceInstructionTypeProps = {
  children: ReactNode;
  isDiagnosis: boolean;
  isValid: boolean | null;
  onValidChange: (isValid: boolean | null) => void;
  disablePrimaryBtn?: boolean;
  disableCancelBtn?: boolean;
  actionMessage?: {
    title: string;
    description: string;
  };
  useDropdownAsValidityInput: boolean;
  isLegend?: boolean;
  disableDropdown?: boolean;
};

const MaintenanceInstructionType = ({
  children,
  isDiagnosis,
  isValid,
  onValidChange,
  disablePrimaryBtn,
  disableCancelBtn,
  actionMessage,
  useDropdownAsValidityInput,
  isLegend = false,
  disableDropdown,
}: MaintenanceInstructionTypeProps) => {
  const [expanded, setExpanded] = useToggle(false);

  const { invalidName, validName } = getValidityName(isDiagnosis, isValid);

  const handleCancel = () => onValidChange(null);
  const handleSetValid = () => onValidChange(true);
  const handleSetInvalid = () => onValidChange(false);

  return (
    <div className={styles.MaintenanceInstructionType}>
      <div className={styles.MaintenanceInstructionType__Header}>
        <span className={styles.MaintenanceInstructionType__Title}>
          {isDiagnosis ? 'Diagnosis' : 'Repair'}
        </span>
        {useDropdownAsValidityInput ? (
          <ValidityDropdownWithChevron
            disabled={disableDropdown}
            onValidChange={onValidChange}
            expanded={expanded}
            onToggleExpanded={setExpanded}
            isDiagnosis={isDiagnosis}
            isValid={isValid}
          />
        ) : (
          <ValidityChevron
            expanded={!isLegend && expanded}
            onToggleExpanded={setExpanded}
            isDiagnosis={isDiagnosis}
            isValid={isValid}
          />
        )}
      </div>

      {!isLegend && expanded ? (
        <div className={styles.MaintenanceInstructionType__Content}>
          {children}

          {useDropdownAsValidityInput ? null : (
            <div className={styles.MaintenanceInstructionType__Footer}>
              <div
                className={
                  styles.MaintenanceInstructionType__ConfirmMsgContainer
                }
              >
                <span
                  className={
                    styles.MaintenanceInstructionType__ConfirmMsgContainer__Title
                  }
                >
                  {isDiagnosis
                    ? 'Confirm Diagnosis Result'
                    : 'Confirm Repair Outcome'}
                </span>
                <span
                  className={
                    styles.MaintenanceInstructionType__ConfirmMsgContainer__Description
                  }
                >
                  {isDiagnosis
                    ? 'Confirm whether this diagnosis is correct. This will determine if repair actions are required.'
                    : 'Confirm whether the issue has been resolved after performing the repair.'}
                </span>
              </div>
              <div className={styles.MaintenanceInstructionType__BtnContainer}>
                <div
                  className={
                    styles.MaintenanceInstructionType__PrimaryBtnContainer
                  }
                >
                  {actionMessage ? (
                    <div
                      className={
                        styles.MaintenanceInstructionType__ActionMsgContainer
                      }
                    >
                      <span
                        className={
                          styles.MaintenanceInstructionType__ActionMsgContainer__Title
                        }
                      >
                        {actionMessage.title}
                      </span>
                      <span
                        className={
                          styles.MaintenanceInstructionType__ActionMsgContainer__Description
                        }
                      >
                        {actionMessage.description}
                      </span>
                    </div>
                  ) : null}
                  <Button
                    disabled={disablePrimaryBtn ?? isValid !== null}
                    onClick={handleSetInvalid}
                    color={'error'}
                    className={clsx(!isDiagnosis && styles.BtnCritical)}
                  >{`Mark as ${invalidName}`}</Button>
                  <Button
                    onClick={handleSetValid}
                    color={'success'}
                    disabled={disablePrimaryBtn ?? isValid !== null}
                    className={clsx(!isDiagnosis && styles.BtnNormal)}
                  >
                    <Check width={20} height={20} />
                    <span>{`Mark as ${validName}`}</span>
                  </Button>
                </div>
                {isValid !== null ? (
                  <Button
                    onClick={handleCancel}
                    color={'default-secondary'}
                    disabled={disableCancelBtn}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

type MaintenanceInstructionAlarmProps = {
  codeName: string;
  children: ReactNode;
  isValid: boolean | null;
  isRepairConfirmed: boolean;
  isLegend?: boolean;
};

const MaintenanceInstructionAlarm = ({
  children,
  codeName,
  isValid,
  isRepairConfirmed,
  isLegend = false,
}: MaintenanceInstructionAlarmProps) => {
  const [expanded, setExpanded] = useToggle(false);

  return (
    <div className={styles.MaintenanceInstructionAlarm}>
      <div className={styles.MaintenanceInstructionAlarm__Header}>
        <div className={styles.MaintenanceInstructionAlarm__Title}>
          <Instruction />
          <span>{codeName}</span>
        </div>
        <ValidityChevron
          expanded={isLegend || expanded}
          onToggleExpanded={setExpanded}
          isDiagnosis={!isRepairConfirmed}
          isValid={isValid}
        />
      </div>
      {isLegend || expanded ? (
        <div className={styles.MaintenanceInstructionAlarm__Content}>
          {children}
        </div>
      ) : null}
    </div>
  );
};

const TYPE = {
  DIAGNOSIS: 'Diagnosis',
  REPAIR: 'Repair',
};

export type GroupedInstruction = {
  codeName: string;
  codeId: number;
  data: {
    typeName: string;
    typeId: number;
    isValid: boolean | null;
    data: Omit<TInstruction, 'typeName' | 'codeName' | 'order'>[];
  }[];
};

type MaintenanceInstructionListProps = {
  instructions: GroupedInstruction[];
  otherInstructions: GroupedInstruction[];
  hasOtherInstructions: boolean;
  onValidityChange: (
    isOther: boolean,
    codeId: number,
    typeId: number,
    isValid: boolean | null
  ) => void;
  estimatedTime?: string;
  showSaveBtn?: boolean;
  onSave?: () => void;
  useDropdownAsValidityInput?: boolean;
  useIconForTitle?: boolean;
  disabled?: boolean;
  isLegend?: boolean;
};

export const MaintenanceInstructionList = ({
  instructions,
  otherInstructions,
  hasOtherInstructions,
  onValidityChange,
  estimatedTime,
  onSave,
  showSaveBtn,
  useDropdownAsValidityInput,
  useIconForTitle,
  disabled,
  isLegend = false,
}: MaintenanceInstructionListProps) => {
  const [showOther, setShowOther] = useState(false);

  const activeInstructions = useMemo(
    () => (showOther ? otherInstructions : instructions),
    [showOther, instructions, otherInstructions]
  );

  // const getAlarmValidity = (codeId: number) => {
  //   const selectedInstructions = showOther ? otherInstructions : instructions;
  //   const instructionTypes = selectedInstructions.find(
  //     (instructionAlarm) => instructionAlarm.codeId === codeId
  //   )?.data;
  //   if (!instructionTypes) {
  //     return null;
  //   }
  //   const repairInstructions = instructionTypes.find(
  //     (instructionType) => instructionType.typeName === 'Repair'
  //   );
  //   if (repairInstructions?.isValid || repairInstructions?.isValid === false) {
  //     return repairInstructions.isValid;
  //   }

  //   const diagnosisInstructions = instructionTypes.find(
  //     (instructionType) => instructionType.typeName === 'Diagnosis'
  //   );
  //   if (diagnosisInstructions) {
  //     return diagnosisInstructions.isValid;
  //   }

  //   return null;
  // };

  // const getIsRepairConfirmed = (codeId: number) => {
  //   const selectedInstructions = showOther ? otherInstructions : instructions;
  //   const instructionTypes = selectedInstructions.find(
  //     (instructionAlarm) => instructionAlarm.codeId === codeId
  //   )?.data;
  //   if (!instructionTypes) {
  //     return false;
  //   }
  //   const repairInstructions = instructionTypes.find(
  //     (instructionType) => instructionType.typeName === 'Repair'
  //   );
  //   if (repairInstructions) {
  //     return repairInstructions.isValid === false || repairInstructions.isValid === true;
  //   }

  //   return false;
  // };

  // const getIsInstructionTypePrimaryBtnDisabled = (
  //   codeId: number,
  //   typeName: string,
  //   isValid: boolean | null
  // ) => {
  //   if (typeName === 'Diagnosis') return undefined;

  //   if (isValid !== null) return true;

  //   const selectedInstructions = showOther ? otherInstructions : instructions;
  //   const instructionTypes = selectedInstructions.find(
  //     (instructionAlarm) => instructionAlarm.codeId === codeId
  //   )?.data;
  //   if (!instructionTypes) {
  //     return false;
  //   }

  //   const diagnosisInstructions = instructionTypes.find(
  //     (instructionType) => instructionType.typeName === 'Diagnosis'
  //   );
  //   if (diagnosisInstructions) {
  //     return !diagnosisInstructions.isValid;
  //   }
  //   return false;
  // };

  // const getIsInstructionTypeCancelBtnDisabled = (codeId: number, typeName: string) => {
  //   if (typeName === 'Repair') return undefined;

  //   const selectedInstructions = showOther ? otherInstructions : instructions;
  //   const instructionTypes = selectedInstructions.find(
  //     (instructionAlarm) => instructionAlarm.codeId === codeId
  //   )?.data;
  //   if (!instructionTypes) {
  //     return undefined;
  //   }

  //   const repairInstructions = instructionTypes.find(
  //     (instructionType) => instructionType.typeName === 'Repair'
  //   );
  //   if (repairInstructions?.isValid || repairInstructions?.isValid === false) {
  //     return true;
  //   }
  //   return undefined;
  // };

  // const getActionMessage = (codeId: number, typeName: string, isValid: boolean | null) => {
  //   if (typeName === 'Diagnosis') {
  //     if (isValid)
  //       return {
  //         title: 'Diagnosis Status: Valid',
  //         description: 'This issue requires repair actions.',
  //       };
  //     else if (isValid === false)
  //       return {
  //         title: 'Diagnosis Status: Invalid',
  //         description: 'No repair is required for this issue.',
  //       };
  //   } else {
  //     if (isValid)
  //       return {
  //         title: 'Repair Status: Resolved',
  //         description: 'The issue has been successfully fixed.',
  //       };
  //     else if (isValid === false)
  //       return {
  //         title: 'Repair Status: Unresolved',
  //         description: 'The issue is still present after the repair.',
  //       };
  //     else {
  //       const selectedInstructions = showOther ? otherInstructions : instructions;
  //       const instructionTypes = selectedInstructions.find(
  //         (instructionAlarm) => instructionAlarm.codeId === codeId
  //       )?.data;
  //       if (!instructionTypes) {
  //         return undefined;
  //       }

  //       const diagnosisInstructions = instructionTypes.find(
  //         (instructionType) => instructionType.typeName === 'Diagnosis'
  //       );
  //       if (diagnosisInstructions?.isValid) {
  //         return undefined;
  //       }

  //       return {
  //         title: 'Repair Disabled',
  //         description: 'Repair can only be performed after the diagnosis is confirmed as valid.',
  //       };
  //     }
  //   }
  // };

  return (
    <div className={styles.MaintenanceInstructionList}>
      <div className={styles.MaintenanceInstructionList__Header}>
        {useIconForTitle ? (
          <div className={styles.MaintenanceInstructionList__TitleWithIcon}>
            <Instruction width={24} height={24} />
            <div>Maintenance Instructions</div>
          </div>
        ) : (
          <span className={styles.MaintenanceInstructionList__Title}>
            Maintenance Instructions:
          </span>
        )}
        <div
          className={
            styles.MaintenanceInstructionList__EstimatedTimeIssueSelectorContainer
          }
        >
          {estimatedTime ? (
            <span
              className={styles.MaintenanceInstructionList__EstimatedTimeLabel}
            >{`Estimated Time: ${estimatedTime}`}</span>
          ) : null}
          {showSaveBtn ? (
            <Button onClick={onSave}>
              <SaveFill width={20} height={20} />
              <span>Save</span>
            </Button>
          ) : null}

          {hasOtherInstructions ? (
            <div className={styles.MaintenanceInstructionList__IssueSelector}>
              <TabItem
                active={!showOther}
                onClick={() => setShowOther(false)}
                icon={<AlertAlarm />}
                label="Current Issues"
              />
              <TabItem
                active={showOther}
                onClick={() => {
                  if (!isLegend) setShowOther(true);
                }}
                icon={<List />}
                label="Other Possible Issues"
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.MaintenanceInstructionList__InstructionList}>
        {activeInstructions.map((group) => {
          const diagnosis = group.data.find(
            (d) => d.typeName === TYPE.DIAGNOSIS
          );
          const repair = group.data.find((d) => d.typeName === TYPE.REPAIR);

          const alarmValidity = repair?.isValid ?? diagnosis?.isValid ?? null;
          const isRepairConfirmed =
            repair?.isValid !== null && repair?.isValid !== undefined;

          return (
            <MaintenanceInstructionAlarm
              key={group.codeId}
              codeName={group.codeName}
              //isValid={getAlarmValidity(group.codeId)}
              isValid={alarmValidity}
              //isRepairConfirmed={getIsRepairConfirmed(group.codeId)}
              isRepairConfirmed={isRepairConfirmed}
              isLegend={isLegend}
            >
              {group.data.map((type) => {
                const isDiagType = type.typeName === TYPE.DIAGNOSIS;
                const isRepairType = type.typeName === TYPE.REPAIR;

                const disablePrimaryBtn = isRepairType
                  ? type.isValid !== null || !diagnosis?.isValid
                  : undefined;

                const disableCancelBtn = isDiagType
                  ? repair?.isValid !== null && repair?.isValid !== undefined
                  : undefined;

                return (
                  <MaintenanceInstructionType
                    key={type.typeId}
                    isDiagnosis={isDiagType}
                    isValid={type.isValid}
                    disablePrimaryBtn={disabled ?? disablePrimaryBtn}
                    // disablePrimaryBtn={getIsInstructionTypePrimaryBtnDisabled(
                    //   group.codeId,
                    //   type.typeName,
                    //   type.isValid
                    // )}
                    disableCancelBtn={disabled ?? disableCancelBtn}
                    // disableCancelBtn={getIsInstructionTypeCancelBtnDisabled(
                    //   group.codeId,
                    //   type.typeName
                    // )}

                    //actionMessage={getActionMessage(group.codeId, type.typeName, type.isValid)}
                    actionMessage={getInstructionMessage(type, diagnosis)}
                    onValidChange={(isValid) =>
                      onValidityChange(
                        showOther,
                        group.codeId,
                        type.typeId,
                        isValid
                      )
                    }
                    useDropdownAsValidityInput={
                      useDropdownAsValidityInput ?? false
                    }
                    isLegend={isLegend}
                    disableDropdown={disabled}
                  >
                    {type.data.map((instruction) => (
                      <MaintenanceInstructionItem
                        key={instruction.id}
                        codeName={group.codeName}
                        {...instruction}
                      />
                    ))}
                  </MaintenanceInstructionType>
                );
              })}
            </MaintenanceInstructionAlarm>
          );
        })}
      </div>
    </div>
  );
};

const TabItem = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <div
    onClick={onClick}
    className={clsx(
      styles.MaintenanceInstructionList__IssueSelectorItem,
      active && styles.active
    )}
  >
    {icon}
    <span>{label}</span>
  </div>
);

function getInstructionMessage(
  type: GroupedInstruction['data'][0],
  diagnosis?: GroupedInstruction['data'][0]
) {
  const { typeName, isValid } = type;

  if (typeName === TYPE.DIAGNOSIS) {
    if (isValid === true)
      return {
        title: 'Diagnosis Status: Valid',
        description: 'This issue requires repair actions.',
      };
    if (isValid === false)
      return {
        title: 'Diagnosis Status: Invalid',
        description: 'No repair is required for this issue.',
      };
  }

  if (typeName === TYPE.REPAIR) {
    if (isValid === true)
      return {
        title: 'Repair Status: Resolved',
        description: 'The issue has been successfully fixed.',
      };
    if (isValid === false)
      return {
        title: 'Repair Status: Unresolved',
        description: 'The issue is still present after the repair.',
      };

    if (!diagnosis?.isValid) {
      return {
        title: 'Repair Disabled',
        description:
          'Repair can only be performed after the diagnosis is confirmed as valid.',
      };
    }
  }

  return undefined;
}
