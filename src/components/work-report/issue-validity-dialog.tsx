import { Badge, Popup } from "@digital-twin/components";
import { Check, Instruction } from "@digital-twin/icons";
import styles from "./issue-validity-dialog.module.scss"

type SetIssueValidityDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isValid: boolean;
  isDiagnosis: boolean;
  issueName: string;
};

export const SetIssueValidityDialog = ({
  isDiagnosis,
  isValid,
  issueName,
  onClose,
  onSubmit,
  open,
}: SetIssueValidityDialogProps) => {
  const getValidityName = () => {
    if (isDiagnosis) {
      return isValid ? 'Valid' : 'Invalid';
    }
    return isValid ? 'Resolved' : 'Unresolved';
  };

  const actionName = isDiagnosis ? 'Diagnosis' : 'Repair';
  return (
    <Popup
      icon={<Instruction />}
      title={`Confirm as ${getValidityName()}`}
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      variant={'custom'}
      submitButtonLabel={'Confirm'}
      submitButtonIcon={<Check width={20} height={20} />}
      background={'none'}
    >
      <div className={styles.SetIssueValidityDialog}>
        <div className={styles.SetIssueValidityDialog__Detail}>
          <div className={styles.SetIssueValidityDialog__IssueName}>
            <span>{`• ${issueName}`}</span>
            <Badge color={isDiagnosis ? 'normal' : 'idle'}>{actionName}</Badge>
          </div>
        </div>
        <div className={styles.SetIssueValidityDialog__Message}>
          <span className={styles.SetIssueValidityDialog__Message__Title}>
            {`Are you sure you want to confirm this ${actionName.toLowerCase()} as ${getValidityName()}?`}
          </span>
        </div>
      </div>
    </Popup>
  );
};